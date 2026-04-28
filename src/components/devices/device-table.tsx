import type { Device } from "@prisma/client";
import Link from "next/link";
import { deviceStatusStyles, NEUTRAL_BADGE } from "@/lib/status-colors";

interface DeviceTableProps {
  devices: Device[];
}

export function DeviceTable({ devices }: DeviceTableProps) {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted-foreground)]" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-[var(--muted-foreground)]">
          등록된 장비가 없습니다.
        </p>
      </div>
    );
  }

  const th =
    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">등록된 X-ray 스캐너 장비 목록</caption>
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <th className={th}>모델 / 제품명</th>
              <th className={th}>S/N</th>
              <th className={th}>상태</th>
              <th className={th}>판매처</th>
              <th className={th}>버전 (SW / AI / PLC)</th>
              <th className={th + " text-right"}>최근 배포</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {devices.map((device, idx) => (
              <tr
                key={device.id}
                className={`group transition-colors hover:bg-[var(--accent)]/40 ${
                  idx % 2 === 1 ? "bg-[var(--muted)]/20" : ""
                }`}
              >
                {/* 모델 / 제품명 */}
                <td className="px-4 py-3 align-middle">
                  <Link
                    href={`/devices/${device.id}`}
                    className="block text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    {device.modelName}
                  </Link>
                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {device.productName}
                  </div>
                </td>

                {/* S/N */}
                <td className="px-4 py-3 align-middle">
                  <span className="inline-block whitespace-nowrap rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-xs text-[var(--foreground)]">
                    {device.serialNumber}
                  </span>
                </td>

                {/* 상태 */}
                <td className="px-4 py-3 align-middle">
                  <span
                    className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      deviceStatusStyles[device.status] || NEUTRAL_BADGE
                    }`}
                  >
                    {device.status}
                  </span>
                </td>

                {/* 판매처 */}
                <td className="px-4 py-3 align-middle">
                  {device.customerCountry || device.customerName ? (
                    <div className="flex items-center gap-2 min-w-0">
                      {device.customerCountry && (
                        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                          {device.customerCountry}
                        </span>
                      )}
                      {device.customerName && (
                        <span
                          className="truncate text-sm text-[var(--foreground)]"
                          title={device.customerName}
                        >
                          {device.customerName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--muted-foreground)]">-</span>
                  )}
                </td>

                {/* 버전 — 한 셀에 SW/AI/PLC 라벨링하여 표시 */}
                <td className="px-4 py-3 align-middle">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[11px] leading-tight">
                    <dt className="text-[var(--muted-foreground)]">SW</dt>
                    <dd className="truncate text-[var(--foreground)]" title={device.currentSwVersion || ""}>
                      {device.currentSwVersion || "-"}
                    </dd>
                    <dt className="text-[var(--muted-foreground)]">AI</dt>
                    <dd className="truncate text-[var(--foreground)]" title={device.currentAiVersion || ""}>
                      {device.currentAiVersion || "-"}
                    </dd>
                    <dt className="text-[var(--muted-foreground)]">PLC</dt>
                    <dd className="truncate text-[var(--foreground)]" title={device.currentPlcVersion || ""}>
                      {device.currentPlcVersion || "-"}
                    </dd>
                  </dl>
                </td>

                {/* 최근 배포일 */}
                <td className="px-4 py-3 text-right align-middle text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                  {device.lastDeployDate
                    ? new Date(device.lastDeployDate).toLocaleDateString("ko-KR")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
