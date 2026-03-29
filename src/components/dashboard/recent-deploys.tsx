import type { DeployHistory, Device } from "@prisma/client";
import Link from "next/link";

interface RecentDeploysProps {
  deploys: (DeployHistory & { device: Device })[];
}

const typeColors: Record<string, string> = {
  신규설치: "text-blue-600 dark:text-blue-400",
  업데이트: "text-emerald-600 dark:text-emerald-400",
  유지보수: "text-amber-600 dark:text-amber-400",
  긴급패치: "text-rose-600 dark:text-rose-400",
};

export function RecentDeploys({ deploys }: RecentDeploysProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            최근 배포 이력
          </h3>
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
            const versionParts: string[] = [];
            if (deploy.swVersion) versionParts.push(`SW ${deploy.swVersion}`);
            if (deploy.aiVersion) versionParts.push(`AI ${deploy.aiVersion}`);
            if (deploy.plcVersion) versionParts.push(`PLC ${deploy.plcVersion}`);

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
                      {deploy.device.productName}
                    </Link>
                    <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                      {deploy.device.serialNumber}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {versionParts.join("  ")}
                    {deploy.description && (
                      <>
                        {" | "}
                        {deploy.description}
                      </>
                    )}
                  </p>
                </div>

                {/* Right: date + type */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {new Date(deploy.deployDate).toLocaleDateString("ko-KR")}
                  </p>
                  {deploy.deployType && (
                    <p
                      className={`mt-1 text-xs font-medium ${
                        typeColors[deploy.deployType] || "text-[var(--muted-foreground)]"
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
