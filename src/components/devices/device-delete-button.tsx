"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeviceDeleteButton({ deviceId }: { deviceId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("정말 이 장비를 삭제하시겠습니까?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      router.push("/devices");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
    >
      {loading ? "삭제 중..." : "삭제"}
    </button>
  );
}
