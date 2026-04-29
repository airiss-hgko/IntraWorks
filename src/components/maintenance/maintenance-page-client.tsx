"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaintenanceModal } from "./maintenance-modal";
import { formatDate } from "@/lib/format";

interface DeviceLite {
  id: number;
  productName: string;
  modelName: string;
  serialNumber: string;
}

interface LogRow {
  id: number;
  deviceId: number;
  maintenanceType: string;
  status: string;
  performedBy: string | null;
  performedAt: string;
  description: string | null;
  cost: number | null;
  nextDueDate: string | null;
  attachments: unknown;
  device: { id: number; productName: string; modelName: string; serialNumber: string };
}

interface Props {
  devices: DeviceLite[];
  logs: LogRow[];
  filters: {
    type: string;
    status: string;
    deviceId: string;
    search: string;
    from: string;
    to: string;
  };
  types: string[];
  statuses: string[];
}

const statusBadge: Record<string, string> = {
  예정: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  진행중: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  완료: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  취소: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const typeBadge: Record<string, string> = {
  캘리브레이션: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  소스교체: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  검출기교체: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  SW업데이트: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  점검: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  기타: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function MaintenancePageClient({ devices, logs, filters, types, statuses }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LogRow | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(log: LogRow) {
    setEditing(log);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
  }

  const inputCls =
    "h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">유지보수</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            캘리브레이션·소스교체·점검 등 장비 유지보수 이력을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          유지보수 등록
        </button>
      </div>

      {/* 필터 */}
      <form className="flex flex-wrap items-center gap-2" method="get">
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="설명, 수행자, S/N 검색…"
          className={`${inputCls} min-w-[220px] flex-1`}
        />
        <select name="type" defaultValue={filters.type} className={inputCls}>
          <option value="">모든 유형</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="status" defaultValue={filters.status} className={inputCls}>
          <option value="">모든 상태</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="deviceId" defaultValue={filters.deviceId} className={inputCls}>
          <option value="">모든 장비</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.productName} — {d.serialNumber}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filters.from} className={inputCls} />
        <span className="text-[var(--muted-foreground)]">~</span>
        <input type="date" name="to" defaultValue={filters.to} className={inputCls} />
        <button
          type="submit"
          className="h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          적용
        </button>
      </form>

      {/* 목록 */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">유지보수 기록이 없습니다.</p>
          <button onClick={openNew} className="mt-2 text-sm text-[var(--primary)] hover:underline">
            첫 기록 등록하기
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">유지보수 이력</caption>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">상태</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">유형</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">장비</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">수행일</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">수행자</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">다음 예정일</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">비용</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">내용</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="group transition-colors hover:bg-[var(--muted)]/50">
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[log.status] || "bg-[var(--muted)]"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadge[log.maintenanceType] || "bg-[var(--muted)]"}`}>
                        {log.maintenanceType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Link href={`/devices/${log.device.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                        {log.device.productName}
                      </Link>
                      <span className="ml-2 rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                        {log.device.serialNumber}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground)]">
                      {formatDate(log.performedAt)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-[var(--foreground)]">{log.performedBy || "-"}</td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground)]">
                      {log.nextDueDate ? formatDate(log.nextDueDate) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground)]">
                      {log.cost != null ? log.cost.toLocaleString() + "원" : "-"}
                    </td>
                    <td className="max-w-[16rem] truncate px-6 py-3.5 text-sm text-[var(--muted-foreground)]" title={log.description || ""}>
                      {log.description || "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => openEdit(log)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--accent)]"
                      >
                        편집
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-[var(--muted-foreground)]">
        전체 <span className="font-medium text-[var(--foreground)]">{logs.length}</span>건
      </p>

      <MaintenanceModal
        open={open}
        onClose={close}
        devices={devices}
        initial={editing}
      />
    </div>
  );
}
