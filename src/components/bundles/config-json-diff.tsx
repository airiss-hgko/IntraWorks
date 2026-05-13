"use client";

import { useState } from "react";
import { diffJson, summarize, type DiffStatus } from "@/lib/json-diff";

interface Props {
  left: unknown;
  right: unknown;
  leftLabel?: string;
  rightLabel?: string;
}

const statusClass: Record<DiffStatus, string> = {
  added: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  removed: "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  changed: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  same: "",
};

const statusBadge: Record<DiffStatus, string> = {
  added: "추가",
  removed: "제거",
  changed: "변경",
  same: "동일",
};

function renderValue(v: unknown): string {
  if (v === undefined) return "";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function ConfigJsonDiff({ left, right, leftLabel = "좌", rightLabel = "우" }: Props) {
  const entries = diffJson(left, right);
  const summary = summarize(entries);
  const [showSame, setShowSame] = useState(false);

  const visible = showSame ? entries : entries.filter((e) => e.status !== "same");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          변경 {summary.changed}
        </span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          추가 {summary.added}
        </span>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          제거 {summary.removed}
        </span>
        <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-[var(--muted-foreground)]">동일 {summary.same}</span>
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} className="h-3.5 w-3.5 rounded border-[var(--border)]" />
          동일 항목 표시
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center text-sm text-[var(--muted-foreground)]">
          변경 사항이 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[var(--muted)]/40">
              <tr>
                <th className="w-16 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">상태</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">경로</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{leftLabel}</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{rightLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map((e, i) => (
                <tr key={i} className={statusClass[e.status]}>
                  <td className="px-3 py-1.5 align-top">{statusBadge[e.status]}</td>
                  <td className="break-all px-3 py-1.5 align-top">{e.path}</td>
                  <td className="break-all px-3 py-1.5 align-top">{e.status === "added" ? "" : renderValue(e.left)}</td>
                  <td className="break-all px-3 py-1.5 align-top">{e.status === "removed" ? "" : renderValue(e.right)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
