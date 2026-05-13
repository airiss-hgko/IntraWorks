"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  releaseId: number;
  isDeprecated: boolean;
}

export function ReleaseActions({ releaseId, isDeprecated }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleDeprecated() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/releases/${releaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeprecated: !isDeprecated }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "상태 변경에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirm("정말 삭제하시겠습니까?\n이 릴리스를 참조하는 배포 이력의 연결은 해제됩니다(배포 기록 자체는 유지).")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/releases/${releaseId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      router.push("/releases");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleDeprecated}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        {isDeprecated ? "폐기 해제" : "폐기 처리"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        삭제
      </button>
    </div>
  );
}
