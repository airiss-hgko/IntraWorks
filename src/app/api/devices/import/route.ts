import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExcel, type ColumnSpec } from "@/lib/excel-import";

type Key =
  | "productName" | "modelName" | "serialNumber" | "deviceId" | "status"
  | "customerCountry" | "customerName" | "installLocation"
  | "currentSwVersion" | "currentAiVersion" | "currentPlcVersion" | "notes";

const COLUMNS: ColumnSpec<Key>[] = [
  { key: "productName",       labels: ["제품명", "productName"] },
  { key: "modelName",         labels: ["모델명", "modelName"], required: true },
  { key: "serialNumber",      labels: ["S/N", "시리얼", "시리얼번호", "serialNumber"], required: true },
  { key: "deviceId",          labels: ["장비ID", "장비 ID", "deviceId"] },
  { key: "status",            labels: ["상태", "status"] },
  { key: "customerCountry",   labels: ["국가", "판매 국가", "customerCountry"] },
  { key: "customerName",      labels: ["고객명", "판매처", "customerName"] },
  { key: "installLocation",   labels: ["설치처", "설치 장소", "installLocation"] },
  { key: "currentSwVersion",  labels: ["SW버전", "S/W버전", "SW", "currentSwVersion"] },
  { key: "currentAiVersion",  labels: ["AI버전", "AI", "currentAiVersion"] },
  { key: "currentPlcVersion", labels: ["PLC버전", "PLC", "currentPlcVersion"] },
  { key: "notes",             labels: ["비고", "notes"] },
];

const STATUSES = new Set(["판매완료", "보관", "수리중", "폐기", "장비이전"]);

function deriveDeviceId(modelName: string, serialNumber: string): string {
  const code = modelName.replace(/^AIXAC-RX/, "").replace(/^AIXAC-/, "");
  const m = serialNumber.match(/-(\d+)$/);
  if (!m) return `${code}_${serialNumber}`;
  return `${code}${m[1]}`;
}

interface RowAction {
  row: number;
  action: "create" | "update" | "skip" | "error";
  serialNumber: string | null;
  modelName: string | null;
  deviceId: string | null;
  message: string;
  values: Record<string, unknown>;
}

async function buildActions(buffer: Buffer): Promise<{ actions: RowAction[]; missingHeaders: string[] }> {
  const parsed = await parseExcel<Key>(buffer, COLUMNS);
  const missing = COLUMNS.filter((c) => c.required && parsed.headers[c.key] === null).map((c) => c.key);
  const actions: RowAction[] = [];

  // 기존 장비를 S/N 기준으로 한 번에 조회
  const sns = parsed.rows.map((r) => (r.values.serialNumber ?? "") as string).filter(Boolean);
  const existing = sns.length
    ? await prisma.device.findMany({
        where: { serialNumber: { in: sns } },
        select: { id: true, serialNumber: true },
      })
    : [];
  const existingBySn = new Map(existing.map((e) => [e.serialNumber, e]));

  for (const r of parsed.rows) {
    const sn = (r.values.serialNumber ?? "") as string;
    const model = (r.values.modelName ?? "") as string;
    if (r.errors.length > 0) {
      actions.push({
        row: r.row, action: "error",
        serialNumber: sn || null, modelName: model || null, deviceId: null,
        message: r.errors.join(", "),
        values: r.values,
      });
      continue;
    }
    const status = ((r.values.status ?? "") as string) || "보관";
    if (!STATUSES.has(status)) {
      actions.push({
        row: r.row, action: "error",
        serialNumber: sn, modelName: model, deviceId: null,
        message: `잘못된 상태값 "${status}"`,
        values: r.values,
      });
      continue;
    }

    const deviceId = ((r.values.deviceId ?? "") as string) || deriveDeviceId(model, sn);

    if (existingBySn.has(sn)) {
      actions.push({
        row: r.row, action: "update",
        serialNumber: sn, modelName: model, deviceId,
        message: "기존 장비 — 수정",
        values: { ...r.values, status, deviceId },
      });
    } else {
      actions.push({
        row: r.row, action: "create",
        serialNumber: sn, modelName: model, deviceId,
        message: "신규 등록",
        values: { ...r.values, status, deviceId },
      });
    }
  }

  return { actions, missingHeaders: missing };
}

// POST /api/devices/import?preview=1 — 파일 받아 미리보기 반환
// POST /api/devices/import         — 실제 import (multipart with actions JSON)
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
      return NextResponse.json(
        { error: `필수 헤더 누락: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    // 적용: 행마다 트랜잭션 X (행 별 독립). 실패해도 다음 행 계속.
    let created = 0, updated = 0, failed = 0;
    const failures: Array<{ row: number; message: string }> = [];

    for (const a of actions) {
      if (a.action === "error" || a.action === "skip") continue;
      const v = a.values as Record<string, string | null>;
      const data = {
        productName: v.productName || "X-ray Scanner",
        modelName: v.modelName as string,
        serialNumber: v.serialNumber as string,
        deviceId: a.deviceId!,
        status: (v.status as string) || "보관",
        customerCountry: v.customerCountry || null,
        customerName: v.customerName || null,
        installLocation: v.installLocation || null,
        currentSwVersion: v.currentSwVersion || null,
        currentAiVersion: v.currentAiVersion || null,
        currentPlcVersion: v.currentPlcVersion || null,
        notes: v.notes || null,
      };
      try {
        if (a.action === "create") {
          await prisma.device.create({ data });
          created++;
        } else if (a.action === "update") {
          await prisma.device.update({ where: { serialNumber: data.serialNumber }, data });
          updated++;
        }
      } catch (e: unknown) {
        failed++;
        failures.push({ row: a.row, message: (e as Error)?.message || "unknown error" });
      }
    }

    return NextResponse.json({ created, updated, failed, failures });
  } catch (e) {
    console.error("[devices/import]", e);
    return NextResponse.json({ error: "import에 실패했습니다." }, { status: 500 });
  }
}
