import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mask sensitive fields in config JSON
function maskSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["password", "secret", "token", "apikey"];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      result[key] = "***";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = maskSensitiveFields(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" ? maskSensitiveFields(item as Record<string, unknown>) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// GET /api/configs — Config 스냅샷 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const search = searchParams.get("search");
  const triggerType = searchParams.get("triggerType");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (deviceId) where.deviceId = parseInt(deviceId);
  if (triggerType) where.triggerType = triggerType;
  if (search) {
    where.OR = [
      { device: { serialNumber: { contains: search, mode: "insensitive" } } },
      { device: { productName: { contains: search, mode: "insensitive" } } },
      { source: { contains: search, mode: "insensitive" } },
    ];
  }

  const [configs, total] = await Promise.all([
    prisma.configSnapshot.findMany({
      where,
      select: {
        id: true,
        deviceId: true,
        configVersion: true,
        swVersion: true,
        triggerType: true,
        source: true,
        capturedAt: true,
        uploadedAt: true,
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
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.configSnapshot.count({ where }),
  ]);

  return NextResponse.json({
    configs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/configs — Config 업로드
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.deviceId) {
      return NextResponse.json({ error: "장비를 선택해주세요." }, { status: 400 });
    }
    if (!body.snapshotJson) {
      return NextResponse.json({ error: "Config JSON 데이터가 필요합니다." }, { status: 400 });
    }

    // Validate JSON
    let configData: Record<string, unknown>;
    try {
      configData = typeof body.snapshotJson === "string"
        ? JSON.parse(body.snapshotJson)
        : body.snapshotJson;
    } catch {
      return NextResponse.json({ error: "유효한 JSON 형식이 아닙니다." }, { status: 400 });
    }

    // Check device exists
    const device = await prisma.device.findUnique({
      where: { id: body.deviceId },
    });
    if (!device) {
      return NextResponse.json({ error: "장비를 찾을 수 없습니다." }, { status: 404 });
    }

    // Detect file type: StatusReport vs Config.local.json
    let snapshotData: Record<string, unknown>;
    let swVersion: string | null = null;
    let configVersion: number | null = null;
    let source = body.source || "ManualUpload";
    let capturedAt = body.capturedAt ? new Date(body.capturedAt) : new Date();

    if ("CurrentConfig" in configData && "ExportDate" in configData) {
      // StatusReport format
      source = "StatusReport";
      snapshotData = maskSensitiveFields(configData["CurrentConfig"] as Record<string, unknown>);
      const versions = configData["SoftwareVersions"] as Record<string, string> | undefined;
      if (versions?.SW) swVersion = versions.SW;
      configVersion = (configData["ConfigVersion"] as number) || null;
      capturedAt = new Date(configData["ExportDate"] as string);
    } else {
      // Config.local.json format
      source = "ConfigFile";
      snapshotData = maskSensitiveFields(configData);
      configVersion = (configData["ConfigVersion"] as number) || null;
    }

    const config = await prisma.configSnapshot.create({
      data: {
        deviceId: body.deviceId,
        configVersion,
        swVersion,
        snapshotJson: JSON.stringify(snapshotData),
        triggerType: body.triggerType || source,
        source,
        capturedAt,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Config 업로드에 실패했습니다." }, { status: 500 });
  }
}
