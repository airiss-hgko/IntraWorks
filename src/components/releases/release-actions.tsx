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
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.03] transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/[0.03] dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {isDeprecated ? "폐기 해제" : "폐기 처리"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-red-950/[0.03] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 hover:shadow-[0_2px_4px_rgba(220,38,38,0.08)] disabled:opacity-50 dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-400 dark:ring-red-500/[0.05] dark:hover:border-red-800/60 dark:hover:bg-red-950/20"
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
