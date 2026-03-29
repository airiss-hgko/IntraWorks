import type { Device } from "@prisma/client";
import Link from "next/link";

interface DeviceTableProps {
  devices: Device[];
}

const statusStyles: Record<string, string> = {
  판매완료:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  보관:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  수리중:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
  폐기:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

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

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--card)]">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                제품명
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                모델
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                S/N
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                상태
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                판매처
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                SW
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                AI
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                PLC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {devices.map((device) => (
              <tr
                key={device.id}
                className="group transition-colors hover:bg-[var(--muted)]/50"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/devices/${device.id}`}
                    className="text-sm font-semibold text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300"
                  >
                    {device.productName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                  {device.modelName}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-md bg-[var(--muted)] px-2 py-1 font-mono text-xs text-[var(--foreground)]">
                    {device.serialNumber}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      statusStyles[device.status] || "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {device.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                  {device.customerCountry && device.customerName
                    ? `${device.customerCountry} ${device.customerName}`
                    : device.customerCountry || "-"}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                  {device.currentSwVersion || "-"}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                  {device.currentAiVersion || "-"}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                  {device.currentPlcVersion || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
