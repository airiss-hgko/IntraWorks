"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface Props {
  defaults?: {
    version?: string;
  };
}

const CHANGELOG_TEMPLATE = `## 추가
-

## 변경
-

## 수정
-

## 제거
-
`;

export function ReleaseForm({ defaults }: Props) {
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
      component: "SW",
      version: String(fd.get("version") || "").trim(),
      modelName: null,
      buildDate: fd.get("buildDate") || null, // = 릴리스일자
      builder: String(fd.get("builder") || "").trim() || null,
      artifactName: String(fd.get("artifactName") || "").trim() || null,
      artifactPath: String(fd.get("artifactPath") || "").trim() || null,
      artifactSha256: String(fd.get("artifactSha256") || "").trim() || null,
      releaseType: fd.get("releaseType") || "정식",
      changelog: String(fd.get("changelog") || "") || null,
      isDeprecated: fd.get("isDeprecated") === "on",
      jiraDevKey: String(fd.get("jiraDevKey") || "").trim() || null,
      jiraQmKey: String(fd.get("jiraQmKey") || "").trim() || null,
      jiraFixVersion: String(fd.get("jiraFixVersion") || "").trim() || null,
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
    "h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20";

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="SW 버전 *" hint='예: "2.0.0.0"'>
          <input name="version" required defaultValue={defaults?.version || ""} placeholder="2.0.0.0" className={`${inputCls} font-mono`} />
        </Field>
        <Field label="유형">
          <select name="releaseType" defaultValue="정식" className={inputCls}>
            <option value="정식">정식</option>
            <option value="베타">베타</option>
            <option value="긴급패치">긴급패치</option>
          </select>
        </Field>
        <Field label="릴리스일자">
          <input name="buildDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </Field>
        <Field label="담당자">
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

      <Field label="변경요약" hint="추가 / 변경 / 수정 / 제거 형식으로 작성. 마크다운 가능.">
        <textarea
          name="changelog"
          rows={14}
          defaultValue={CHANGELOG_TEMPLATE}
          className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] p-3 font-mono text-sm text-[var(--foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      </Field>

      {/* Jira 연결 (Two-Project: 개발 + 품질/납품 분리 운영) */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Jira 연결</p>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          개발 프로젝트와 품질/납품 프로젝트 키를 입력하세요. 상세 화면에서 Jira로 바로 이동할 수 있습니다.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="개발 프로젝트 키" hint='예: "DA6040"'>
            <input name="jiraDevKey" placeholder="DA6040" className={`${inputCls} font-mono`} />
          </Field>
          <Field label="품질/납품 프로젝트 키" hint='예: "DA6040-QM"'>
            <input name="jiraQmKey" placeholder="DA6040-QM" className={`${inputCls} font-mono`} />
          </Field>
          <Field label="fixVersion (선택)" hint="입력 시 해당 버전 티켓 필터 링크 자동 생성">
            <input name="jiraFixVersion" placeholder="AIXAC.D.v.2.0.0.0" className={`${inputCls} font-mono`} />
          </Field>
        </div>
      </div>

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
