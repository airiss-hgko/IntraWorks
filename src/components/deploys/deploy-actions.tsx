"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeployActionsProps {
  deployId: number;
  deployDate: Date | string;
  deployType: string | null;
  swVersion: string | null;
  aiVersion: string | null;
  plcVersion: string | null;
  deployer: string | null;
  description: string | null;
}

const deployTypes = ["신규설치", "업데이트", "유지보수", "긴급패치"];

function toDateInputValue(value: Date | string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DeployActions({
  deployId,
  deployDate,
  deployType,
  swVersion,
  aiVersion,
  plcVersion,
  deployer,
  description,
}: DeployActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    deployDate: toDateInputValue(deployDate),
    deployType: deployType || "",
    swVersion: swVersion || "",
    aiVersion: aiVersion || "",
    plcVersion: plcVersion || "",
    deployer: deployer || "",
    description: description || "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deploys/${deployId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const performDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deploys/${deployId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    const inputCls =
      "w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-2 py-1 text-sm focus:border-[var(--ring)] focus:outline-none";
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">배포일</span>
            <input
              type="date"
              value={form.deployDate}
              onChange={(e) => setForm({ ...form, deployDate: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">유형</span>
            <select
              value={form.deployType}
              onChange={(e) => setForm({ ...form, deployType: e.target.value })}
              className={inputCls}
            >
              <option value="">-</option>
              {deployTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">SW</span>
            <input
              value={form.swVersion}
              onChange={(e) => setForm({ ...form, swVersion: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">AI</span>
            <input
              value={form.aiVersion}
              onChange={(e) => setForm({ ...form, aiVersion: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">PLC</span>
            <input
              value={form.plcVersion}
              onChange={(e) => setForm({ ...form, plcVersion: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">담당자</span>
            <input
              value={form.deployer}
              onChange={(e) => setForm({ ...form, deployer: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2 md:col-span-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">설명</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            저장
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="배포 이력 수정"
        title="수정"
        className="inline-flex h-9 w-9 items-center justify-center rounded text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        aria-label="배포 이력 삭제"
        title="삭제"
        className="inline-flex h-9 w-9 items-center justify-center rounded text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="배포 이력 삭제"
        description="이 배포 이력을 삭제하시겠습니까?"
        confirmLabel="삭제"
        destructive
        loading={loading}
        onConfirm={performDelete}
        onCancel={() => !loading && setConfirmOpen(false)}
      />
    </div>
  );
}
