import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAINTENANCE_TYPES = [
  "캘리브레이션",
  "소스교체",
  "검출기교체",
  "SW업데이트",
  "점검",
  "기타",
];
const STATUSES = ["예정", "진행중", "완료", "취소"];

// GET /api/maintenance — 목록 (필터: type / status / deviceId / 기간)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const deviceIdParam = searchParams.get("deviceId") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (type) where.maintenanceType = type;
  if (status) where.status = status;
  if (deviceIdParam) where.deviceId = parseInt(deviceIdParam);
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.performedAt = range;
  }
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { performedBy: { contains: search, mode: "insensitive" } },
      { device: { serialNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  const logs = await prisma.maintenanceLog.findMany({
    where,
    include: {
      device: {
        select: { id: true, productName: true, modelName: true, serialNumber: true },
      },
    },
    // "예정" 상태는 위로 → 그 다음 최근 수행일 순
    orderBy: [{ status: "asc" }, { performedAt: "desc" }],
  });

  return NextResponse.json({ logs });
}

// POST /api/maintenance — 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const required = ["deviceId", "maintenanceType", "performedAt"];
    const missing = required.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `필수 항목을 입력해주세요: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    if (!MAINTENANCE_TYPES.includes(body.maintenanceType)) {
      return NextResponse.json({ error: "잘못된 유지보수 유형입니다." }, { status: 400 });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
    }

    const log = await prisma.maintenanceLog.create({
      data: {
        deviceId: parseInt(body.deviceId),
        maintenanceType: body.maintenanceType,
        status: body.status || "완료",
        performedBy: body.performedBy?.trim() || null,
        performedAt: new Date(body.performedAt),
        description: body.description || null,
        cost: body.cost != null && body.cost !== "" ? parseInt(body.cost) : null,
        attachments: body.attachments ?? null,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
      },
    });

    // 완료 상태이고 캘리브레이션이면 Device.lastMaintenanceDate 갱신
    if (log.status === "완료") {
      const updateData: Record<string, Date | null> = { lastMaintenanceDate: log.performedAt };
      if (log.maintenanceType === "캘리브레이션" && log.nextDueDate) {
        updateData.nextCalibrationDue = log.nextDueDate;
      }
      await prisma.device.update({
        where: { id: log.deviceId },
        data: updateData,
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: "유지보수 등록에 실패했습니다." }, { status: 500 });
  }
}
