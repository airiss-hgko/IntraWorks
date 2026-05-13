import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExcel, parseDateCell, type ColumnSpec } from "@/lib/excel-import";

type Key =
  | "serialNumber" | "deployDate" | "swVersion" | "aiVersion" | "plcVersion"
  | "deployType" | "deployer" | "receiver" | "installLocation" | "description";

const COLUMNS: ColumnSpec<Key>[] = [
  { key: "serialNumber",    labels: ["S/N", "시리얼", "시리얼번호", "serialNumber"], required: true },
  { key: "deployDate",      labels: ["배포일", "배포 날짜", "배포일자", "deployDate"], required: true,
    transform: (v) => parseDateCell(v) },
  { key: "swVersion",       labels: ["SW버전", "S/W버전", "SW", "swVersion"] },
  { key: "aiVersion",       labels: ["AI버전", "AI", "aiVersion"] },
  { key: "plcVersion",      labels: ["PLC버전", "PLC", "plcVersion"] },
  { key: "deployType",      labels: ["유형", "배포유형", "업데이트 유형", "deployType"] },
  { key: "deployer",        labels: ["담당자", "배포자", "deployer"] },
  { key: "receiver",        labels: ["수신자", "수령자", "receiver"] },
  { key: "installLocation", labels: ["설치처", "설치 장소", "installLocation"] },
  { key: "description",     labels: ["내용", "설명", "변경 사유", "변경 사유 및 내용", "description"] },
];

interface RowAction {
  row: number;
  action: "create" | "skip" | "error";
  serialNumber: string | null;
  deployDate: string | null;
  message: string;
  values: Record<string, unknown>;
}

async function buildActions(buffer: Buffer): Promise<{ actions: RowAction[]; missingHeaders: string[] }> {
  const parsed = await parseExcel<Key>(buffer, COLUMNS);
  const missing = COLUMNS.filter((c) => c.required && parsed.headers[c.key] === null).map((c) => c.key);
  const actions: RowAction[] = [];

  const sns = parsed.rows.map((r) => (r.values.serialNumber ?? "") as string).filter(Boolean);
  const devices = sns.length
    ? await prisma.device.findMany({ where: { serialNumber: { in: sns } }, select: { id: true, serialNumber: true } })
    : [];
  const bySn = new Map(devices.map((d) => [d.serialNumber, d]));

  for (const r of parsed.rows) {
    const sn = (r.values.serialNumber ?? "") as string;
    const deployDate = r.values.deployDate as Date | null;
    if (r.errors.length > 0) {
      actions.push({ row: r.row, action: "error", serialNumber: sn || null, deployDate: null, message: r.errors.join(", "), values: r.values });
      continue;
    }
    if (!bySn.has(sn)) {
      actions.push({ row: r.row, action: "error", serialNumber: sn, deployDate: deployDate?.toISOString() ?? null,
        message: `매칭되는 장비 없음 (${sn})`, values: r.values });
      continue;
    }
    if (!deployDate) {
      actions.push({ row: r.row, action: "error", serialNumber: sn, deployDate: null, message: "배포일 형식 오류", values: r.values });
      continue;
    }
    actions.push({
      row: r.row, action: "create",
      serialNumber: sn, deployDate: deployDate.toISOString(),
      message: "신규 배포 이력",
      values: r.values,
    });
  }

  return { actions, missingHeaders: missing };
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isPreview = url.searchParams.get("preview") === "1";

    const fd = await request.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "엑셀 파일을 첨부해주세요." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    const { actions, missingHeaders } = await buildActions(buffer);

    if (isPreview) {
      return NextResponse.json({ actions, missingHeaders });
    }
    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `필수 헤더 누락: ${missingHeaders.join(", ")}` }, { status: 400 });
    }

    // S/N → deviceId 매핑 (재조회)
    const sns = Array.from(new Set(actions.filter((a) => a.action === "create").map((a) => a.serialNumber!).filter(Boolean)));
    const devices = sns.length
      ? await prisma.device.findMany({ where: { serialNumber: { in: sns } }, select: { id: true, serialNumber: true, modelName: true } })
      : [];
    const bySn = new Map(devices.map((d) => [d.serialNumber, d]));

    let created = 0, failed = 0;
    const failures: Array<{ row: number; message: string }> = [];

    for (const a of actions) {
      if (a.action !== "create") continue;
      const dev = bySn.get(a.serialNumber!);
      if (!dev) {
        failures.push({ row: a.row, message: "장비 매칭 실패" });
        failed++;
        continue;
      }
      const v = a.values as Record<string, unknown>;
      try {
        // SW 버전이 등록된 릴리스에 있으면 자동 연결
        const swVersion = (v.swVersion as string) || null;
        let swReleaseId: number | null = null;
        if (swVersion) {
          const rel = await prisma.release.findFirst({
            where: { component: "SW", version: swVersion, modelName: null },
            select: { id: true },
          });
          swReleaseId = rel?.id ?? null;
        }
        await prisma.deployHistory.create({
          data: {
            deviceId: dev.id,
            deployDate: new Date(a.deployDate!),
            swVersion,
            aiVersion: (v.aiVersion as string) || null,
            plcVersion: (v.plcVersion as string) || null,
            deployType: (v.deployType as string) || null,
            deployer: (v.deployer as string) || null,
            receiver: (v.receiver as string) || null,
            installLocation: (v.installLocation as string) || null,
            description: (v.description as string) || null,
            swReleaseId,
          },
        });
        // Device.currentSwVersion 갱신
        if (swVersion) {
          await prisma.device.update({
            where: { id: dev.id },
            data: { currentSwVersion: swVersion, lastDeployDate: new Date(a.deployDate!) },
          });
        }
        created++;
      } catch (e: unknown) {
        failed++;
        failures.push({ row: a.row, message: (e as Error)?.message || "unknown" });
      }
    }

    return NextResponse.json({ created, failed, failures });
  } catch (e) {
    console.error("[deploys/import]", e);
    return NextResponse.json({ error: "import에 실패했습니다." }, { status: 500 });
  }
}
