import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConfigDetailClient } from "@/components/configs/config-detail-client";

interface PageProps {
  params: { id: string };
}

export default async function ConfigDetailPage({ params }: PageProps) {
  const config = await prisma.configSnapshot.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      device: {
        select: { id: true, productName: true, modelName: true, serialNumber: true, deviceId: true },
      },
    },
  });

  if (!config) notFound();

  // Get other configs for same device (for compare dropdown)
  const otherConfigs = await prisma.configSnapshot.findMany({
    where: { deviceId: config.deviceId, id: { not: config.id } },
    select: { id: true, capturedAt: true, triggerType: true, configVersion: true },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });

  // Get configs from other devices (for cross-device compare)
  const otherDeviceConfigs = await prisma.configSnapshot.findMany({
    where: { deviceId: { not: config.deviceId } },
    select: {
      id: true,
      capturedAt: true,
      triggerType: true,
      device: { select: { productName: true, serialNumber: true } },
    },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });

  const parsedJson = JSON.parse(config.snapshotJson);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/configs"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Config 목록
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">
            {config.device.productName} Config
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {config.device.serialNumber} &middot; {config.triggerType} &middot; {new Date(config.capturedAt).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/devices/${config.device.id}`}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            장비 상세
          </Link>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <MetaCard label="Config Version" value={`v${config.configVersion || "-"}`} />
        <MetaCard label="SW Version" value={config.swVersion || "-"} />
        <MetaCard label="소스" value={config.triggerType || "-"} />
        <MetaCard label="캡처일" value={new Date(config.capturedAt).toLocaleString("ko-KR")} />
      </div>

      {/* Client component for JSON viewer + compare */}
      <ConfigDetailClient
        configId={config.id}
        parsedJson={parsedJson}
        otherConfigs={otherConfigs.map((c) => ({
          id: c.id,
          label: `${new Date(c.capturedAt).toLocaleDateString("ko-KR")} (${c.triggerType || "unknown"})`,
        }))}
        otherDeviceConfigs={otherDeviceConfigs.map((c) => ({
          id: c.id,
          label: `${c.device.productName} ${c.device.serialNumber} - ${new Date(c.capturedAt).toLocaleDateString("ko-KR")}`,
        }))}
      />
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}
