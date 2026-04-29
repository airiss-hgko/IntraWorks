import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/releases — 릴리스 목록 (필터: component / model / type / 검색)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const component = searchParams.get("component") || ""; // SW | AI | PLC
  const model = searchParams.get("model") || "";
  const type = searchParams.get("type") || "";
  const search = searchParams.get("search") || "";
  const includeDeprecated = searchParams.get("includeDeprecated") === "true";

  const where: Record<string, unknown> = {};
  if (component) where.component = component;
  if (model) where.modelName = model;
  if (type) where.releaseType = type;
  if (!includeDeprecated) where.isDeprecated = false;
  if (search) {
    where.OR = [
      { version: { contains: search, mode: "insensitive" } },
      { artifactName: { contains: search, mode: "insensitive" } },
      { changelog: { contains: search, mode: "insensitive" } },
    ];
  }

  const releases = await prisma.release.findMany({
    where,
    orderBy: [{ component: "asc" }, { buildDate: "desc" }, { id: "desc" }],
    include: {
      _count: {
        select: { swDeploys: true, aiDeploys: true, plcDeploys: true },
      },
    },
  });

  return NextResponse.json({ releases });
}

// POST /api/releases — 릴리스 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const required = ["component", "version"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `필수 항목을 입력해주세요: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    if (!["SW", "AI", "PLC"].includes(body.component)) {
      return NextResponse.json(
        { error: "component는 SW / AI / PLC 중 하나여야 합니다." },
        { status: 400 }
      );
    }

    const release = await prisma.release.create({
      data: {
        component: body.component,
        version: String(body.version).trim(),
        modelName: body.modelName?.trim() || null,
        buildDate: body.buildDate ? new Date(body.buildDate) : null,
        builder: body.builder?.trim() || null,
        artifactName: body.artifactName?.trim() || null,
        artifactPath: body.artifactPath?.trim() || null,
        artifactSha256: body.artifactSha256?.trim() || null,
        changelog: body.changelog || null,
        releaseType: body.releaseType || "정식",
        isDeprecated: !!body.isDeprecated,
      },
    });
    return NextResponse.json(release, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 등록된 (component, version, model) 조합입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "릴리스 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
