import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/deploys/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deploy = await prisma.deployHistory.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      device: {
        select: {
          productName: true,
          modelName: true,
          serialNumber: true,
        },
      },
    },
  });

  if (!deploy) {
    return NextResponse.json(
      { error: "배포 이력을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(deploy);
}

// PATCH /api/deploys/[id] — 배포 이력 수정 (설명, 담당자 등)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updateData: Record<string, string | null> = {};

    if ("description" in body) updateData.description = body.description || null;
    if ("deployer" in body) updateData.deployer = body.deployer || null;
    if ("deployType" in body) updateData.deployType = body.deployType || null;

    const deploy = await prisma.deployHistory.update({
      where: { id: parseInt(params.id) },
      data: updateData,
    });

    return NextResponse.json(deploy);
  } catch {
    return NextResponse.json(
      { error: "배포 이력 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/deploys/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.deployHistory.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "배포 이력 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
