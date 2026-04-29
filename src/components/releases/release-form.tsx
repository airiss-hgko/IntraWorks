"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface Props {
  models: string[];
  defaults?: {
    component?: string;
    version?: string;
    modelName?: string;
  };
}

export function ReleaseForm({ models, defaults }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      component: fd.get("component"),
      version: String(fd.get("version") || "").trim(),
      modelName: String(fd.get("modelName") || "").trim() || null,
      buildDate: fd.get("buildDate") || null,
      builder: String(fd.get("builder") || "").trim() || null,
      artifactName: String(fd.get("artifactName") || "").trim() || null,
      artifactPath: String(fd.get("artifactPath") || "").trim() || null,
      artifactSha256: String(fd.get("artifactSha256") || "").trim() || null,
      releaseType: fd.get("releaseType") || "정식",
      changelog: String(fd.get("changelog") || "") || null,
      isDeprecated: fd.get("isDeprecated") === "on",
    };

    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다.");
        return;
      }
      router.push(`/releases/${data.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="컴포넌트 *">
          <select name="component" required defaultValue={defaults?.component || "SW"} className={inputCls}>
            <option value="SW">SW</option>
            <option value="AI">AI</option>
            <option value="PLC">PLC</option>
          </select>
        </Field>
        <Field label="버전 *" hint='예: "2.0.0.0"'>
          <input name="version" required defaultValue={defaults?.version || ""} placeholder="2.0.0.0" className={`${inputCls} font-mono`} />
        </Field>
        <Field label="모델" hint="비우면 공통(모든 모델 대상)">
          <select name="modelName" defaultValue={defaults?.modelName || ""} className={inputCls}>
            <option value="">공통 (모든 모델)</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="유형">
          <select name="releaseType" defaultValue="정식" className={inputCls}>
            <option value="정식">정식</option>
            <option value="베타">베타</option>
            <option value="긴급패치">긴급패치</option>
          </select>
        </Field>
        <Field label="빌드일">
          <input name="buildDate" type="date" className={inputCls} />
        </Field>
        <Field label="빌드자">
          <input name="builder" placeholder="홍길동" className={inputCls} />
        </Field>
        <Field label="산출물 파일명" hint='예: "AIXAC.RX.SW.DA-2.0.0.0.zip"'>
          <input name="artifactName" placeholder="AIXAC.RX.SW.DA-2.0.0.0.zip" className={`${inputCls} font-mono`} />
        </Field>
        <Field label="저장 경로" hint="사내 파일서버 경로 또는 URL">
          <input name="artifactPath" placeholder="\\\\server\\releases\\sw\\2.0.0.0\\" className={`${inputCls} font-mono`} />
        </Field>
        <Field label="SHA256" hint="선택 — 무결성 검증용" span={2}>
          <input name="artifactSha256" placeholder="64자 hex" className={`${inputCls} font-mono`} maxLength={64} />
        </Field>
      </div>

      <Field label="변경요약" hint="마크다운 가능. 한국어로 고객/현장에 전달할 수 있게 작성하세요.">
        <textarea
          name="changelog"
          rows={10}
          placeholder={"## 2.0.0.0 (2026-02-10)\n- AI 모델 v1.0.3 통합\n- PLC 통신 타임아웃 5s → 10s\n- 듀얼뷰 좌/우 동기화 버그 수정"}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-sm text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none"
        />
      </Field>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <input type="checkbox" name="isDeprecated" className="h-4 w-4 rounded border-[var(--border)]" />
        폐기 처리 (기본 목록에서 숨김)
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "등록 중…" : "등록"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children, span = 1 }: { label: string; hint?: string; children: React.ReactNode; span?: 1 | 2 }) {
  const cls = span === 2 ? "md:col-span-2" : "";
  return (
    <div className={cls}>
      <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
