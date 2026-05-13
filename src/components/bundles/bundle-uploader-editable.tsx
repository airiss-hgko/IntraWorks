"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  bundleId: number;
  value: string | null;
}

export function BundleUploaderEditable({ bundleId, value }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bundles/${bundleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadedBy: v }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "저장 실패");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setV(value || "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <span>{value || <span className="text-[var(--muted-foreground)]">(없음)</span>}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
        >
          편집
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") cancel();
        }}
        placeholder="홍길동"
        className="h-8 rounded-md border border-[var(--input)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
      >
        저장
      </button>
      <button
        type="button"
        onClick={cancel}
        className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]"
      >
        취소
      </button>
    </span>
  );
}
