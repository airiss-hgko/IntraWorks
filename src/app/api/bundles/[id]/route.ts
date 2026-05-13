import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const bundle = await prisma.deploymentBundle.findUnique({
    where: { id },
    include: {
      device: { select: { id: true, productName: true, modelName: true, serialNumber: true, deviceId: true, customerName: true } },
      deploy: {
        select: {
          id: true, deployDate: true, deployer: true, swVersion: true, aiVersion: true, plcVersion: true,
          swRelease: { select: { id: true, version: true } },
        },
      },
      files: {
        select: {
          id: true, category: true, fileName: true, relativePath: true,
          fileSize: true, contentType: true, contentJson: true,
          // contentBinary는 목록 조회 시 제외 (별도 엔드포인트로)
        },
        orderBy: [{ category: "asc" }, { fileName: "asc" }],
      },
    },
  });
  if (!bundle) return NextResponse.json({ error: "번들을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(bundle);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if ("uploadedBy" in body) data.uploadedBy = (body.uploadedBy ?? "").toString().trim() || null;
    if ("notes" in body) data.notes = body.notes || null;
    const updated = await prisma.deploymentBundle.update({
      where: { id: parseInt(params.id) },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "번들을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.deploymentBundle.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
