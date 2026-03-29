"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeployActionsProps {
  deployId: number;
  description: string | null;
  deployer: string | null;
  deployType: string | null;
}

export function DeployActions({ deployId, description, deployer, deployType }: DeployActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: description || "",
    deployer: deployer || "",
    deployType: deployType || "",
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

  const handleDelete = async () => {
    if (!confirm("이 배포 이력을 삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/deploys/${deployId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex gap-2">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="설명"
            className="flex-1 rounded-md border border-[var(--input)] bg-[var(--background)] px-2 py-1 text-sm focus:border-[var(--ring)] focus:outline-none"
          />
          <input
            value={form.deployer}
            onChange={(e) => setForm({ ...form, deployer: e.target.value })}
            placeholder="담당자"
            className="w-20 rounded-md border border-[var(--input)] bg-[var(--background)] px-2 py-1 text-sm focus:border-[var(--ring)] focus:outline-none"
          />
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
        onClick={() => setEditing(true)}
        className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        title="수정"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:opacity-50"
        title="삭제"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
