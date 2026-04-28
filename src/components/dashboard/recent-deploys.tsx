import type { DeployHistory, Device } from "@prisma/client";
import Link from "next/link";
import { deployTypeAccent } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";

interface RecentDeploysProps {
  deploys: (DeployHistory & { device: Device })[];
}

const versionChipStyles: Record<"SW" | "AI" | "PLC", string> = {
  SW: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800",
  AI: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
  PLC: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800",
};

function VersionChip({ label, value }: { label: "SW" | "AI" | "PLC"; value: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${versionChipStyles[label]}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

export function RecentDeploys({ deploys }: RecentDeploysProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            최근 배포 이력
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            최근 5건의 배포 기록을 보여줍니다.
          </p>
        </div>
        <Link
          href="/deploys"
          className="rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20"
        >
          전체 보기
        </Link>
      </div>

      {deploys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-[var(--muted-foreground)]">등록된 배포 이력이 없습니다.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {deploys.map((deploy) => {
            const versions: { label: "SW" | "AI" | "PLC"; value: string }[] = [];
            if (deploy.swVersion) versions.push({ label: "SW", value: deploy.swVersion });
            if (deploy.aiVersion) versions.push({ label: "AI", value: deploy.aiVersion });
            if (deploy.plcVersion) versions.push({ label: "PLC", value: deploy.plcVersion });

            return (
              <div
                key={deploy.id}
                className="flex items-center px-6 py-4 transition-colors hover:bg-[var(--muted)]/50"
              >
                {/* Timeline dot */}
                <div className="mr-4 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/devices/${deploy.device.id}`}
                      className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                    >
                      {deploy.device.modelName}
                    </Link>
                    <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                      {deploy.device.serialNumber}
                    </span>
                  </div>

                  {versions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {versions.map((v) => (
                        <VersionChip key={v.label} label={v.label} value={v.value} />
                      ))}
                    </div>
                  )}

                  {deploy.description && (
                    <p className="mt-1.5 text-xs text-[var(--muted-foreground)] truncate" title={deploy.description}>
                      {deploy.description}
                    </p>
                  )}
                </div>

                {/* Right: date + type */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatDate(deploy.deployDate)}
                  </p>
                  {deploy.deployType && (
                    <p
                      className={`mt-1 text-xs font-medium ${
                        deployTypeAccent[deploy.deployType] || "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {deploy.deployType}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
