"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JsonTreeViewer } from "./json-tree-viewer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ConfigDetailClientProps {
  configId: number;
  parsedJson: Record<string, unknown>;
  otherConfigs: { id: number; label: string }[];
  otherDeviceConfigs: { id: number; label: string }[];
}

export function ConfigDetailClient({
  configId,
  parsedJson,
  otherConfigs,
  otherDeviceConfigs,
}: ConfigDetailClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [compareId, setCompareId] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCompare = () => {
    if (compareId) {
      router.push(`/configs/compare?a=${configId}&b=${compareId}`);
    }
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/configs/${configId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        router.push("/configs");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(parsedJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `config-snapshot-${configId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="JSON 키/값 검색..."
            aria-label="JSON 키/값 검색"
            className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] py-2 pl-9 pr-4 text-sm focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Compare selector */}
          <select
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            aria-label="비교할 Config 선택"
            className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-xs focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">비교 대상 선택</option>
            {otherConfigs.length > 0 && (
              <optgroup label="같은 장비">
                {otherConfigs.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            )}
            {otherDeviceConfigs.length > 0 && (
              <optgroup label="다른 장비">
                {otherDeviceConfigs.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={handleCompare}
            disabled={!compareId}
            className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            비교
          </button>

          <div className="h-6 w-px bg-[var(--border)]" />

          <button
            onClick={handleDownload}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            JSON 다운로드
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Config 스냅샷 삭제"
        description="이 Config 스냅샷을 삭제하시겠습니까?"
        confirmLabel="삭제"
        destructive
        loading={deleting}
        onConfirm={performDelete}
        onCancel={() => !deleting && setConfirmOpen(false)}
      />

      {/* JSON Tree */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <JsonTreeViewer
          data={parsedJson as Record<string, never>}
          searchQuery={search}
          defaultExpanded={false}
        />
      </div>
    </>
  );
}
