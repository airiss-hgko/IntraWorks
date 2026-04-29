import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAINTENANCE_TYPES = ["캘리브레이션", "소스교체", "검출기교체", "SW업데이트", "점검", "기타"];
const STATUSES = ["예정", "진행중", "완료", "취소"];

// GET /api/maintenance/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const log = await prisma.maintenanceLog.findUnique({
    where: { id: parseInt(params.id) },
    include: { device: { select: { id: true, productName: true, modelName: true, serialNumber: true } } },
  });
  if (!log) return NextResponse.json({ error: "유지보수 기록을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(log);
}

// PATCH /api/maintenance/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if ("maintenanceType" in body) {
      if (!MAINTENANCE_TYPES.includes(body.maintenanceType)) {
        return NextResponse.json({ error: "잘못된 유지보수 유형입니다." }, { status: 400 });
      }
      data.maintenanceType = body.maintenanceType;
    }
    if ("status" in body) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
      }
      data.status = body.status;
    }
    if ("performedBy" in body) data.performedBy = body.performedBy?.trim() || null;
    if ("performedAt" in body) data.performedAt = new Date(body.performedAt);
    if ("description" in body) data.description = body.description || null;
    if ("cost" in body) data.cost = body.cost != null && body.cost !== "" ? parseInt(body.cost) : null;
    if ("attachments" in body) data.attachments = body.attachments ?? null;
    if ("nextDueDate" in body) data.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;

    const log = await prisma.maintenanceLog.update({ where: { id }, data });
    return NextResponse.json(log);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "유지보수 기록을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: "유지보수 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/maintenance/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.maintenanceLog.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "유지보수 삭제에 실패했습니다." }, { status: 500 });
  }
}
