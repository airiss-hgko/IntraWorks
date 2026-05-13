"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeviceDeleteButton({ deviceId }: { deviceId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const performDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제에 실패했습니다.");
      }
      setOpen(false);
      router.push("/devices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-red-950/[0.03] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 hover:shadow-[0_2px_4px_rgba(220,38,38,0.08)] disabled:opacity-50 dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-400 dark:ring-red-500/[0.05] dark:hover:border-red-800/60 dark:hover:bg-red-950/20"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        삭제
      </button>
      <ConfirmDialog
        open={open}
        title="장비 삭제"
        description={error || "정말 이 장비를 삭제하시겠습니까? 관련 배포 이력과 Config 스냅샷이 함께 삭제됩니다."}
        confirmLabel="삭제"
        destructive
        loading={loading}
        onConfirm={performDelete}
        onCancel={() => {
          if (!loading) {
            setOpen(false);
            setError("");
          }
        }}
      />
    </>
  );
}
