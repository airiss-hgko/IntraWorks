import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeviceForm } from "@/components/devices/device-form";
import { DeviceDeleteButton } from "@/components/devices/device-delete-button";
import { DeployActions } from "@/components/deploys/deploy-actions";
import { DeviceMaintenanceSection } from "@/components/maintenance/device-maintenance-section";
import { deviceStatusStyles, deployTypeStyles, NEUTRAL_BADGE } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";

interface PageProps {
  params: { id: string };
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const device = await prisma.device.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      deployHistory: {
        orderBy: { deployDate: "desc" },
        include: {
          swRelease: { select: { id: true } },
          aiRelease: { select: { id: true } },
          plcRelease: { select: { id: true } },
        },
      },
    },
  });

  if (!device) {
    notFound();
  }

  // 현재 버전에 매칭되는 릴리스 lookup (modelName 우선 → 공통 fallback)
  async function lookupRelease(component: "SW" | "AI" | "PLC", version: string | null) {
    if (!version) return null;
    return (
      (await prisma.release.findFirst({
        where: { component, version, modelName: device.modelName },
        select: { id: true },
      })) ||
      (await prisma.release.findFirst({
        where: { component, version, modelName: null },
        select: { id: true },
      }))
    );
  }
  const [currentSwRelease, currentAiRelease, currentPlcRelease, maintenanceLogs] = await Promise.all([
    lookupRelease("SW", device.currentSwVersion),
    lookupRelease("AI", device.currentAiVersion),
    lookupRelease("PLC", device.currentPlcVersion),
    prisma.maintenanceLog.findMany({
      where: { deviceId: device.id },
      orderBy: [{ status: "asc" }, { performedAt: "desc" }],
    }),
  ]);

  const maintenanceRows = maintenanceLogs.map((l) => ({
    ...l,
    performedAt: l.performedAt.toISOString(),
    nextDueDate: l.nextDueDate ? l.nextDueDate.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Title */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/devices"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            장비 목록
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {device.productName}
            </h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                deviceStatusStyles[device.status] || NEUTRAL_BADGE
              }`}
            >
              {device.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {device.modelName} &middot; {device.serialNumber}
          </p>
        </div>
        <DeviceDeleteButton deviceId={device.id} />
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Basic Info */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" /><path d="M12 17v4" />
            </svg>
            장비 정보
          </h2>
          <dl className="space-y-3">
            <InfoRow label="장비 ID" value={device.deviceId} mono />
            <InfoRow label="S/N" value={device.serialNumber} mono />
            <InfoRow label="모델" value={device.modelName} />
            <InfoRow label="상태" value={device.status} />
          </dl>
        </div>

        {/* Sales Info */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            판매 정보
          </h2>
          <dl className="space-y-3">
            <InfoRow label="판매 국가" value={device.customerCountry || "-"} />
            <InfoRow label="고객명" value={device.customerName || "-"} />
            <InfoRow label="비고" value={device.notes || "-"} />
          </dl>
        </div>

        {/* Version Info */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            현재 버전
          </h2>
          <dl className="space-y-3">
            <VersionRow label="SW 버전" value={device.currentSwVersion} releaseId={currentSwRelease?.id ?? null} />
            <VersionRow label="AI 버전" value={device.currentAiVersion} releaseId={currentAiRelease?.id ?? null} />
            <VersionRow label="PLC 버전" value={device.currentPlcVersion} releaseId={currentPlcRelease?.id ?? null} />
          </dl>
        </div>
      </div>

      {/* Deploy History */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              배포 이력
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              이 장비에 대한 {device.deployHistory.length}건의 배포 기록
            </p>
          </div>
          <Link
            href={`/deploys/new?deviceId=${device.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
            배포 등록
          </Link>
        </div>

        {device.deployHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-[var(--muted-foreground)]">
              배포 이력이 없습니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">장비 배포 이력</caption>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    배포일
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    유형
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    SW
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    AI
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    PLC
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    담당자
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    설명
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {device.deployHistory.map((deploy) => (
                  <tr
                    key={deploy.id}
                    className="transition-colors hover:bg-[var(--muted)]/50"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground)]">
                      {formatDate(deploy.deployDate)}
                    </td>
                    <td className="px-6 py-3.5">
                      {deploy.deployType ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${deployTypeStyles[deploy.deployType] || "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                          {deploy.deployType}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <VersionCell version={deploy.swVersion} releaseId={deploy.swRelease?.id ?? null} />
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <VersionCell version={deploy.aiVersion} releaseId={deploy.aiRelease?.id ?? null} />
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <VersionCell version={deploy.plcVersion} releaseId={deploy.plcRelease?.id ?? null} />
                    </td>
                    <td className="px-6 py-3.5 text-sm text-[var(--muted-foreground)]">
                      {deploy.deployer || "-"}
                    </td>
                    <td className="max-w-[12rem] truncate px-6 py-3.5 text-sm text-[var(--muted-foreground)] md:max-w-[18rem]" title={deploy.description || ""}>
                      {deploy.description || "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      <DeployActions
                        deployId={deploy.id}
                        deployDate={deploy.deployDate}
                        deployType={deploy.deployType}
                        swVersion={deploy.swVersion}
                        aiVersion={deploy.aiVersion}
                        plcVersion={deploy.plcVersion}
                        deployer={deploy.deployer}
                        description={deploy.description}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Maintenance */}
      <DeviceMaintenanceSection
        device={{
          id: device.id,
          productName: device.productName,
          modelName: device.modelName,
          serialNumber: device.serialNumber,
        }}
        logs={maintenanceRows}
      />

      {/* Edit Form */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            장비 수정
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            장비 정보를 수정합니다.
          </p>
        </div>
        <div className="p-6">
          <DeviceForm device={device} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-[var(--muted-foreground)]">{label}</dt>
      <dd
        className={`text-sm font-medium text-[var(--foreground)] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function VersionRow({
  label,
  value,
  releaseId,
}: {
  label: string;
  value: string | null;
  releaseId: number | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-[var(--muted-foreground)]">{label}</dt>
      <dd className="font-mono text-sm font-medium text-[var(--foreground)]">
        {value ? (
          releaseId ? (
            <Link
              href={`/releases/${releaseId}`}
              className="text-[var(--primary)] hover:underline"
              title="릴리스 노트 보기"
            >
              {value}
            </Link>
          ) : (
            <span title="등록되지 않은 버전">{value}</span>
          )
        ) : (
          "-"
        )}
      </dd>
    </div>
  );
}

function VersionCell({ version, releaseId }: { version: string | null; releaseId: number | null }) {
  if (!version) return <span className="text-[var(--muted-foreground)]">-</span>;
  if (releaseId) {
    return (
      <Link
        href={`/releases/${releaseId}`}
        className="text-[var(--primary)] hover:underline"
        title="릴리스 노트 보기"
      >
        {version}
      </Link>
    );
  }
  return <span className="text-[var(--muted-foreground)]" title="등록되지 않은 버전">{version}</span>;
}
