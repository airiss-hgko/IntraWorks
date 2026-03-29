import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface DiffEntry {
  path: string;
  type: "added" | "removed" | "changed";
  valueA?: JsonValue;
  valueB?: JsonValue;
}

function deepDiff(
  a: Record<string, JsonValue>,
  b: Record<string, JsonValue>,
  prefix = ""
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const valA = a[key];
    const valB = b[key];

    if (!(key in a)) {
      diffs.push({ path, type: "added", valueB: valB });
    } else if (!(key in b)) {
      diffs.push({ path, type: "removed", valueA: valA });
    } else if (
      valA && valB &&
      typeof valA === "object" && typeof valB === "object" &&
      !Array.isArray(valA) && !Array.isArray(valB)
    ) {
      diffs.push(
        ...deepDiff(
          valA as Record<string, JsonValue>,
          valB as Record<string, JsonValue>,
          path
        )
      );
    } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      diffs.push({ path, type: "changed", valueA: valA, valueB: valB });
    }
  }

  return diffs;
}

// GET /api/configs/compare?a=ID&b=ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idA = searchParams.get("a");
  const idB = searchParams.get("b");

  if (!idA || !idB) {
    return NextResponse.json(
      { error: "비교할 두 Config ID (a, b)가 필요합니다." },
      { status: 400 }
    );
  }

  const [configA, configB] = await Promise.all([
    prisma.configSnapshot.findUnique({
      where: { id: parseInt(idA) },
      include: {
        device: {
          select: { productName: true, serialNumber: true, modelName: true },
        },
      },
    }),
    prisma.configSnapshot.findUnique({
      where: { id: parseInt(idB) },
      include: {
        device: {
          select: { productName: true, serialNumber: true, modelName: true },
        },
      },
    }),
  ]);

  if (!configA || !configB) {
    return NextResponse.json(
      { error: "비교할 Config를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const jsonA = JSON.parse(configA.snapshotJson) as Record<string, JsonValue>;
  const jsonB = JSON.parse(configB.snapshotJson) as Record<string, JsonValue>;
  const diffs = deepDiff(jsonA, jsonB);

  return NextResponse.json({
    configA: { ...configA, snapshotJson: jsonA },
    configB: { ...configB, snapshotJson: jsonB },
    diffs,
    totalDiffs: diffs.length,
  });
}
