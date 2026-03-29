import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/configs/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const config = await prisma.configSnapshot.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      device: {
        select: {
          id: true,
          productName: true,
          modelName: true,
          serialNumber: true,
          deviceId: true,
        },
      },
    },
  });

  if (!config) {
    return NextResponse.json({ error: "Config를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(config);
}

// DELETE /api/configs/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.configSnapshot.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Config 삭제에 실패했습니다." }, { status: 500 });
  }
}
