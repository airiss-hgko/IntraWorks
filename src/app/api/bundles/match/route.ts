import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/bundles/match
// 입력: { items: [{ deviceCode, bundleDate }, ...] }
// 출력: { matches: { [key]: { deviceId, exists } } }
//   - deviceId: deviceCode 와 매칭되는 Device.id (없으면 null)
//   - exists: 같은 (deviceId, bundleDate) 번들이 이미 있으면 true
export async function POST(request: NextRequest) {
  const body = await request.json();
  const items: { deviceCode: string; bundleDate: string }[] = body.items || [];
  if (items.length === 0) return NextResponse.json({ matches: {} });

  const codes = Array.from(new Set(items.map((i) => i.deviceCode)));
  const devices = await prisma.device.findMany({
    where: { deviceId: { in: codes } },
    select: { id: true, deviceId: true, productName: true, modelName: true, serialNumber: true },
  });
  const byCode = new Map(devices.map((d) => [d.deviceId, d]));

  // 각 (device, date) 조합이 이미 존재하는지 확인
  const existing = await prisma.deploymentBundle.findMany({
    where: {
      OR: items
        .map((i) => {
          const dev = byCode.get(i.deviceCode);
          if (!dev) return null;
          return { deviceId: dev.id, bundleDate: new Date(i.bundleDate) };
        })
        .filter(Boolean) as { deviceId: number; bundleDate: Date }[],
    },
    select: { id: true, deviceId: true, bundleDate: true },
  });
  const existingKey = new Set(
    existing.map((e) => `${e.deviceId}|${e.bundleDate.toISOString().slice(0, 10)}`)
  );

  const matches: Record<string, {
    deviceId: number | null;
    deviceLabel: string | null;
    existingBundleId: number | null;
  }> = {};

  for (const it of items) {
    const dev = byCode.get(it.deviceCode);
    const k = `${it.deviceCode}|${it.bundleDate}`;
    if (!dev) {
      matches[k] = { deviceId: null, deviceLabel: null, existingBundleId: null };
      continue;
    }
    const existingMatch = existing.find(
      (e) => e.deviceId === dev.id && e.bundleDate.toISOString().slice(0, 10) === it.bundleDate
    );
    matches[k] = {
      deviceId: dev.id,
      deviceLabel: `${dev.productName} (${dev.serialNumber})`,
      existingBundleId: existingMatch?.id ?? null,
    };
  }

  return NextResponse.json({ matches });
}
