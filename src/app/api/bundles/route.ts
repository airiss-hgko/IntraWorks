import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractSystemCounters,
  summarizeIntensity,
  isJsonFile,
  isImageFile,
} from "@/lib/bundle-parser";

// GET /api/bundles — 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceIdParam = searchParams.get("deviceId");
  const where: Record<string, unknown> = {};
  if (deviceIdParam) where.deviceId = parseInt(deviceIdParam);

  const bundles = await prisma.deploymentBundle.findMany({
    where,
    include: {
      device: { select: { id: true, productName: true, modelName: true, serialNumber: true, deviceId: true } },
      _count: { select: { files: true } },
    },
    orderBy: [{ bundleDate: "desc" }, { id: "desc" }],
  });
  return NextResponse.json({ bundles });
}

// POST /api/bundles — 번들 일괄 등록
// 입력 (JSON):
// {
//   bundles: [
//     {
//       deviceId: number,                // 매칭된 Device.id
//       bundleDate: "YYYY-MM-DD",
//       basePath: string | null,
//       uploadedBy: string | null,
//       overwrite: boolean,              // true면 기존 번들 삭제 후 새로 생성
//       files: [
//         { category: "Config"|"DM",
//           fileName: string,
//           relativePath: string,
//           size: number,
//           contentBase64: string }      // 파일 내용 base64
//       ]
//     }
//   ]
// }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bundles: Array<{
      deviceId: number;
      bundleDate: string;
      basePath?: string | null;
      uploadedBy?: string | null;
      overwrite?: boolean;
      files: Array<{
        category: "Config" | "DM";
        fileName: string;
        relativePath: string;
        size: number;
        contentBase64: string;
      }>;
    }> = body.bundles || [];

    if (bundles.length === 0) {
      return NextResponse.json({ error: "등록할 번들이 없습니다." }, { status: 400 });
    }

    const created: Array<{ id: number; deviceId: number; bundleDate: string }> = [];

    for (const b of bundles) {
      const date = new Date(b.bundleDate);

      // 기존 번들 처리
      const existing = await prisma.deploymentBundle.findUnique({
        where: { deviceId_bundleDate: { deviceId: b.deviceId, bundleDate: date } },
      });
      if (existing) {
        if (!b.overwrite) {
          continue; // skip
        }
        await prisma.deploymentBundle.delete({ where: { id: existing.id } });
      }

      // 파일들에서 메타 추출
      let counters: ReturnType<typeof extractSystemCounters> = {};
      let intensity: ReturnType<typeof summarizeIntensity> = {};

      const fileRecords: Array<{
        category: string;
        fileName: string;
        relativePath: string;
        fileSize: number;
        contentType: string | null;
        contentJson: unknown;
        contentBinary: Buffer | null;
      }> = [];

      for (const f of b.files) {
        const buf = Buffer.from(f.contentBase64, "base64");
        let contentJson: unknown = null;
        let contentBinary: Buffer | null = null;
        let contentType: string | null = null;

        if (isJsonFile(f.fileName)) {
          const text = buf.toString("utf-8");
          try {
            contentJson = JSON.parse(text);
          } catch {
            // 파싱 실패 시 raw 텍스트는 무시
          }
          contentType = "application/json";

          // SystemConfig.json (또는 StatusReport System 섹션) 카운터
          if (/SystemConfig\.json$/i.test(f.fileName) && contentJson) {
            counters = { ...counters, ...extractSystemCounters(contentJson) };
          } else if (/StatusReport.*\.json$/i.test(f.fileName) && contentJson) {
            const c = extractSystemCounters(contentJson);
            // 빈 값만 채움 (SystemConfig 우선)
            counters = { ...c, ...counters };
          }

          // Config.DM.json 인텐시티 요약
          if (/Config\.DM\.json$/i.test(f.fileName) && contentJson) {
            intensity = summarizeIntensity(contentJson);
          }
        } else if (isImageFile(f.fileName)) {
          contentBinary = buf;
          contentType =
            /\.png$/i.test(f.fileName) ? "image/png" :
            /\.jpe?g$/i.test(f.fileName) ? "image/jpeg" :
            /\.webp$/i.test(f.fileName) ? "image/webp" :
            "application/octet-stream";
        } else {
          // Thumbs.db 등 무시
          continue;
        }

        fileRecords.push({
          category: f.category,
          fileName: f.fileName,
          relativePath: f.relativePath,
          fileSize: buf.length,
          contentType,
          contentJson,
          contentBinary,
        });
      }

      const bundle = await prisma.deploymentBundle.create({
        data: {
          deviceId: b.deviceId,
          bundleDate: date,
          basePath: b.basePath || null,
          source: "upload",
          uploadedBy: b.uploadedBy || null,
          ...counters,
          ...intensity,
          files: {
            create: fileRecords.map((r) => ({
              category: r.category,
              fileName: r.fileName,
              relativePath: r.relativePath,
              fileSize: r.fileSize,
              contentType: r.contentType,
              contentJson: r.contentJson === null ? undefined : (r.contentJson as object),
              contentBinary: r.contentBinary,
            })),
          },
        },
      });

      // 같은 장비 + bundleDate ±3일 이내 배포 자동 매칭
      const from = new Date(date);
      from.setDate(from.getDate() - 3);
      const to = new Date(date);
      to.setDate(to.getDate() + 3);
      const candidate = await prisma.deployHistory.findFirst({
        where: {
          deviceId: b.deviceId,
          deployDate: { gte: from, lte: to },
          bundle: null,
        },
        orderBy: { deployDate: "desc" },
      });
      if (candidate) {
        await prisma.deploymentBundle.update({
          where: { id: bundle.id },
          data: { deployId: candidate.id },
        });
      }

      created.push({ id: bundle.id, deviceId: b.deviceId, bundleDate: b.bundleDate });
    }

    return NextResponse.json({ created }, { status: 201 });
  } catch (e) {
    console.error("[bundles POST]", e);
    return NextResponse.json({ error: "번들 등록에 실패했습니다." }, { status: 500 });
  }
}
