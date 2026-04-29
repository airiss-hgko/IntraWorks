import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/releases/[id] — 릴리스 상세 + 이 릴리스로 배포된 장비 목록
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      swDeploys: {
        include: { device: { select: { id: true, serialNumber: true, deviceId: true, modelName: true, customerName: true } } },
        orderBy: { deployDate: "desc" },
      },
      aiDeploys: {
        include: { device: { select: { id: true, serialNumber: true, deviceId: true, modelName: true, customerName: true } } },
        orderBy: { deployDate: "desc" },
      },
      plcDeploys: {
        include: { device: { select: { id: true, serialNumber: true, deviceId: true, modelName: true, customerName: true } } },
        orderBy: { deployDate: "desc" },
      },
    },
  });

  if (!release) {
    return NextResponse.json({ error: "릴리스를 찾을 수 없습니다." }, { status: 404 });
  }

  // component 별로 한 번에 deploys 합치기 (UI에서 단일 리스트로 노출)
  const deploys =
    release.component === "SW" ? release.swDeploys :
    release.component === "AI" ? release.aiDeploys :
    release.plcDeploys;

  return NextResponse.json({ release, deploys });
}

// PUT /api/releases/[id] — 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const id = parseInt(params.id);

    const data: Record<string, unknown> = {};
    const fields = [
      "version", "modelName", "builder", "artifactName", "artifactPath",
      "artifactSha256", "changelog", "releaseType", "isDeprecated",
    ];
    for (const f of fields) {
      if (f in body) data[f] = body[f];
    }
    if ("buildDate" in body) {
      data.buildDate = body.buildDate ? new Date(body.buildDate) : null;
    }
    // component는 변경 금지 (FK 정합성 보호)

    const release = await prisma.release.update({ where: { id }, data });
    return NextResponse.json(release);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "릴리스를 찾을 수 없습니다." }, { status: 404 });
    }
    if (code === "P2002") {
      return NextResponse.json(
        { error: "이미 등록된 (component, version, model) 조합입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "릴리스 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/releases/[id] — 삭제 (배포 이력의 FK는 SET NULL)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.release.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "릴리스 삭제에 실패했습니다." }, { status: 500 });
  }
}
