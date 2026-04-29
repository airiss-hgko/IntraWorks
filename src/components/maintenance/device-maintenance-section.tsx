"use client";

import { useState } from "react";
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
}

interface Props {
  device: DeviceLite;
  logs: LogRow[];
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

export function DeviceMaintenanceSection({ device, logs }: Props) {
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

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">유지보수 이력</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            이 장비의 {logs.length}건의 유지보수 기록
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
          유지보수 등록
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">유지보수 이력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">상태</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">유형</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">수행일</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">수행자</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">다음 예정일</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">비용</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">내용</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-[var(--muted)]/50">
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
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground)]">{formatDate(log.performedAt)}</td>
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
      )}

      <MaintenanceModal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        devices={[device]}
        fixedDeviceId={device.id}
        initial={editing}
      />
    </div>
  );
}
