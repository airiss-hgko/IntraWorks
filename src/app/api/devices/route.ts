import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/devices — 장비 목록 (검색/필터/페이지네이션)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const model = searchParams.get("model") || "";
  const status = searchParams.get("status") || "";
  const country = searchParams.get("country") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: "insensitive" } },
      { deviceId: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (model) where.modelName = model;
  if (status) where.status = status;
  if (country) where.customerCountry = country;

  const [devices, total] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.device.count({ where }),
  ]);

  return NextResponse.json({
    devices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/devices — 장비 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 필수 필드 검증
    const required = ["productName", "modelName", "serialNumber", "deviceId", "status"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `필수 항목을 입력해주세요: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const device = await prisma.device.create({ data: body });
    return NextResponse.json(device, { status: 201 });
  } catch (error: unknown) {
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
      { error: "장비 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
