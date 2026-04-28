import type { Device } from "@prisma/client";
import Link from "next/link";
import { deviceStatusStyles, NEUTRAL_BADGE } from "@/lib/status-colors";

interface DeviceTableProps {
  devices: Device[];
  sort: string;
  dir: "asc" | "desc";
  currentQuery: {
    search: string;
    model: string;
    status: string;
    country: string;
  };
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  query: DeviceTableProps["currentQuery"];
  align?: "left" | "right";
  className?: string;
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  query,
  align = "left",
  className = "",
}: SortableHeaderProps) {
  const active = currentSort === sortKey;
  const nextDir = active && currentDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams({
    ...(query.search ? { search: query.search } : {}),
    ...(query.model ? { model: query.model } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.country ? { country: query.country } : {}),
    sort: sortKey,
    dir: nextDir,
  });
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={`/devices?${params.toString()}`}
        className={`group/sort inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)] ${
          active ? "text-[var(--foreground)]" : ""
        }`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px] leading-none">
          {active ? (currentDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function StaticHeader({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </th>
  );
}

export function DeviceTable({ devices, sort, dir, currentQuery }: DeviceTableProps) {
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
          <caption className="sr-only">등록된 X-ray 스캐너 장비 목록</caption>
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--muted)]/80 backdrop-blur supports-[backdrop-filter]:bg-[var(--muted)]/60">
            <tr className="border-b border-[var(--border)]">
              <SortableHeader label="모델 / 제품명" sortKey="modelName" currentSort={sort} currentDir={dir} query={currentQuery} />
              <SortableHeader label="S/N" sortKey="serialNumber" currentSort={sort} currentDir={dir} query={currentQuery} />
              <SortableHeader label="상태" sortKey="status" currentSort={sort} currentDir={dir} query={currentQuery} />
              <SortableHeader label="판매처" sortKey="customerCountry" currentSort={sort} currentDir={dir} query={currentQuery} />
              <SortableHeader label="SW 버전" sortKey="currentSwVersion" currentSort={sort} currentDir={dir} query={currentQuery} />
              <SortableHeader label="최근 배포" sortKey="lastDeployDate" currentSort={sort} currentDir={dir} query={currentQuery} align="right" />
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
                <td className="px-4 py-2.5 align-middle">
                  <Link
                    href={`/devices/${device.id}`}
                    className="block text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    {device.modelName}
                  </Link>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {device.productName}
                  </div>
                </td>

                <td className="px-4 py-2.5 align-middle">
                  <span className="inline-block whitespace-nowrap rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-xs text-[var(--foreground)]">
                    {device.serialNumber}
                  </span>
                </td>

                <td className="px-4 py-2.5 align-middle">
                  <span
                    className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      deviceStatusStyles[device.status] || NEUTRAL_BADGE
                    }`}
                  >
                    {device.status}
                  </span>
                </td>

                <td className="px-4 py-2.5 align-middle">
                  {device.customerCountry || device.customerName ? (
                    <div className="flex min-w-0 items-center gap-2">
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

                <td className="px-4 py-2.5 align-middle font-mono text-xs text-[var(--foreground)] whitespace-nowrap">
                  {device.currentSwVersion || "-"}
                </td>

                <td className="px-4 py-2.5 text-right align-middle text-xs text-[var(--muted-foreground)] whitespace-nowrap">
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
