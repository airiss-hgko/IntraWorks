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
        className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
      >
        {isDeprecated ? "폐기 해제" : "폐기 처리"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
      >
        삭제
      </button>
    </div>
  );
}
