"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface RowAction {
  row: number;
  action: "create" | "skip" | "error";
  serialNumber: string | null;
  deployDate: string | null;
  message: string;
}

const actionBadge: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  skip: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  error: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};
const actionLabel: Record<string, string> = { create: "신규", skip: "건너뜀", error: "오류" };

export function DeployImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [actions, setActions] = useState<RowAction[] | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; failed: number; failures: { row: number; message: string }[] } | null>(null);

  async function onPreview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true); setError(null); setResult(null); setActions(null); setMissingHeaders([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/deploys/import?preview=1", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "분석 실패"); return; }
      setActions(data.actions || []);
      setMissingHeaders(data.missingHeaders || []);
    } finally { setBusy(false); }
  }

  async function onApply() {
    if (!file || busy) return;
    if (missingHeaders.length > 0) { setError(`필수 헤더 누락: ${missingHeaders.join(", ")}`); return; }
    const willApply = (actions || []).filter((a) => a.action === "create").length;
    if (willApply === 0) { setError("적용할 행이 없습니다."); return; }
    if (!confirm(`${willApply}건을 적용합니다. 계속하시겠습니까?`)) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/deploys/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "import 실패"); return; }
      setResult(data); router.refresh();
    } finally { setBusy(false); }
  }

  const counts = (actions || []).reduce(
    (s, a) => ({ ...s, [a.action]: (s[a.action] || 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <p className="font-semibold">엑셀 헤더 안내</p>
        <p className="mt-1">
          1행을 헤더로 사용. 인식되는 컬럼:
          <span className="ml-1 font-mono">S/N, 배포일, SW버전, AI버전, PLC버전, 유형, 담당자, 수신자, 설치처, 내용</span>
        </p>
        <p className="mt-1">필수: <span className="font-mono">S/N, 배포일</span>. SW 버전이 등록 릴리스에 있으면 자동 연결됩니다.</p>
      </div>

      <form onSubmit={onPreview} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <input
          type="file"
          accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setActions(null); setResult(null); setError(null); }}
          className="flex-1 text-sm text-[var(--foreground)]"
        />
        <button type="submit" disabled={!file || busy}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50">
          {busy ? "분석 중…" : "미리보기"}
        </button>
      </form>

      {missingHeaders.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          필수 헤더 누락: <span className="font-mono">{missingHeaders.join(", ")}</span>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          완료 — 신규 {result.created}건 · 실패 {result.failed}건
          {result.failures.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {result.failures.map((f, i) => <li key={i}>row {f.row}: {f.message}</li>)}
            </ul>
          )}
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
            <div className="text-sm text-[var(--foreground)]">
              총 <span className="font-semibold">{actions.length}</span>건
              <span className="ml-3 text-xs text-[var(--muted-foreground)]">
                신규 {counts.create || 0} · 오류 {counts.error || 0}
              </span>
            </div>
            <button type="button" onClick={onApply}
              disabled={busy || actions.every((a) => a.action !== "create")}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50">
              {busy ? "적용 중…" : "적용"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Row</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">작업</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">S/N</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">배포일</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {actions.map((a) => (
                  <tr key={a.row}>
                    <td className="px-3 py-1.5 text-xs text-[var(--muted-foreground)]">{a.row}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${actionBadge[a.action]}`}>
                        {actionLabel[a.action]}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-[var(--foreground)]">{a.serialNumber || "-"}</td>
                    <td className="px-3 py-1.5 text-[var(--foreground)]">{a.deployDate ? a.deployDate.slice(0, 10) : "-"}</td>
                    <td className="px-3 py-1.5 text-xs text-[var(--muted-foreground)]">{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
