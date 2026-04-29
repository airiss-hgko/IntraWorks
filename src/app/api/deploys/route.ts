import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateVersion, isDowngrade } from "@/lib/version";

// GET /api/deploys — 배포 이력 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (deviceId) where.deviceId = parseInt(deviceId);

  const [deploys, total] = await Promise.all([
    prisma.deployHistory.findMany({
      where,
      include: {
        device: {
          select: {
            productName: true,
            modelName: true,
            serialNumber: true,
          },
        },
      },
      orderBy: { deployDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deployHistory.count({ where }),
  ]);

  return NextResponse.json({
    deploys,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/deploys — 배포 등록 + 장비 버전 자동 갱신
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 필수 필드 검증
    if (!body.deviceId) {
      return NextResponse.json(
        { error: "장비를 선택해주세요." },
        { status: 400 }
      );
    }
    if (!body.deployDate) {
      return NextResponse.json(
        { error: "배포일을 입력해주세요." },
        { status: 400 }
      );
    }
    if (!body.swVersion && !body.aiVersion && !body.plcVersion) {
      return NextResponse.json(
        { error: "최소 하나의 버전을 입력해주세요." },
        { status: 400 }
      );
    }

    // 버전 형식 검증
    if (body.swVersion) {
      const result = validateVersion(body.swVersion, "SW");
      if (!result.valid) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
    }
    if (body.aiVersion) {
      const result = validateVersion(body.aiVersion, "AI");
      if (!result.valid) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
    }
    if (body.plcVersion) {
      const result = validateVersion(body.plcVersion, "PLC");
      if (!result.valid) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
    }

    // 장비 존재 확인
    const device = await prisma.device.findUnique({
      where: { id: body.deviceId },
    });
    if (!device) {
      return NextResponse.json(
        { error: "장비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 다운그레이드 경고 (force가 아니면 거부)
    const downgrades: string[] = [];
    if (body.swVersion && isDowngrade(device.currentSwVersion, body.swVersion)) {
      downgrades.push(`SW: ${device.currentSwVersion} → ${body.swVersion}`);
    }
    if (body.aiVersion && isDowngrade(device.currentAiVersion, body.aiVersion)) {
      downgrades.push(`AI: ${device.currentAiVersion} → ${body.aiVersion}`);
    }
    if (body.plcVersion && isDowngrade(device.currentPlcVersion, body.plcVersion)) {
      downgrades.push(`PLC: ${device.currentPlcVersion} → ${body.plcVersion}`);
    }

    if (downgrades.length > 0 && !body.forceDowngrade) {
      return NextResponse.json(
        {
          error: "다운그레이드가 감지되었습니다.",
          downgrades,
          requireConfirmation: true,
        },
        { status: 409 }
      );
    }

    // 릴리스 자동 매칭: 클라이언트가 ID를 직접 보냈으면 그걸 우선, 아니면 (component, version, modelName) 으로 자동 lookup
    async function resolveReleaseId(
      explicit: number | null | undefined,
      component: "SW" | "AI" | "PLC",
      version: string | null
    ): Promise<number | null> {
      if (typeof explicit === "number" && explicit > 0) return explicit;
      if (!version) return null;
      // modelName 우선 매칭 → 없으면 공통(modelName=null) 매칭
      const r =
        (await prisma.release.findFirst({
          where: { component, version, modelName: device.modelName },
        })) ||
        (await prisma.release.findFirst({
          where: { component, version, modelName: null },
        }));
      return r?.id ?? null;
    }

    const swReleaseId = await resolveReleaseId(body.swReleaseId, "SW", body.swVersion);
    const aiReleaseId = await resolveReleaseId(body.aiReleaseId, "AI", body.aiVersion);
    const plcReleaseId = await resolveReleaseId(body.plcReleaseId, "PLC", body.plcVersion);

    // 트랜잭션: 배포 이력 생성 + 장비 버전 갱신
    const result = await prisma.$transaction(async (tx) => {
      const deploy = await tx.deployHistory.create({
        data: {
          deviceId: body.deviceId,
          swVersion: body.swVersion || null,
          aiVersion: body.aiVersion || null,
          plcVersion: body.plcVersion || null,
          swReleaseId,
          aiReleaseId,
          plcReleaseId,
          deployDate: new Date(body.deployDate),
          deployer: body.deployer || null,
          receiver: body.receiver || null,
          deployType: body.deployType || null,
          description: body.description || null,
        },
      });

      // 장비 현재 버전 갱신
      const updateData: Record<string, string> = {};
      if (body.swVersion) updateData.currentSwVersion = body.swVersion;
      if (body.aiVersion) updateData.currentAiVersion = body.aiVersion;
      if (body.plcVersion) updateData.currentPlcVersion = body.plcVersion;

      if (Object.keys(updateData).length > 0) {
        await tx.device.update({
          where: { id: body.deviceId },
          data: updateData,
        });
      }

      return deploy;
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "배포 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
