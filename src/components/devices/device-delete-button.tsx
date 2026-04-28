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
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
      >
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
