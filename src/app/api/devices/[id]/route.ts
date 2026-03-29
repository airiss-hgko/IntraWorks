import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/devices/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const device = await prisma.device.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      deployHistory: { orderBy: { deployDate: "desc" } },
    },
  });

  if (!device) {
    return NextResponse.json(
      { error: "장비를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(device);
}

// PUT /api/devices/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const device = await prisma.device.update({
      where: { id: parseInt(params.id) },
      data: body,
    });
    return NextResponse.json(device);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "장비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 등록된 S/N 또는 장비ID입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "장비 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/devices/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.device.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "장비 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
