"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface DeviceLite {
  id: number;
  productName: string;
  modelName: string;
  serialNumber: string;
}

interface MaintenanceLite {
  id: number;
  deviceId: number;
  maintenanceType: string;
  status: string;
  performedBy: string | null;
  performedAt: Date | string;
  description: string | null;
  cost: number | null;
  nextDueDate: Date | string | null;
  attachments: unknown;
}

interface Props {
  devices: DeviceLite[];
  fixedDeviceId?: number; // 장비 상세 탭에서 사용할 때
  initial?: MaintenanceLite | null;
  onClose: () => void;
}

const TYPES = ["캘리브레이션", "소스교체", "검출기교체", "SW업데이트", "점검", "기타"];
const STATUSES = ["완료", "예정", "진행중", "취소"];

function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function MaintenanceForm({ devices, fixedDeviceId, initial, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 첨부파일은 단순 [{name, path}] 배열 — 클라이언트에서 그냥 행 추가/삭제
  type Attachment = { name: string; path: string };
  const initialAttachments: Attachment[] = Array.isArray(initial?.attachments)
    ? (initial!.attachments as Attachment[])
    : [];
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);

  const isEdit = !!initial;
  const inputCls =
    "h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      deviceId: fixedDeviceId ?? Number(fd.get("deviceId")),
      maintenanceType: fd.get("maintenanceType"),
      status: fd.get("status") || "완료",
      performedBy: String(fd.get("performedBy") || "").trim() || null,
      performedAt: fd.get("performedAt"),
      description: String(fd.get("description") || "") || null,
      cost: fd.get("cost") || null,
      nextDueDate: fd.get("nextDueDate") || null,
      attachments: attachments.filter((a) => a.path.trim()).length > 0
        ? attachments.filter((a) => a.path.trim())
        : null,
    };

    try {
      const url = isEdit ? `/api/maintenance/${initial!.id}` : "/api/maintenance";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!isEdit || busy) return;
    if (!confirm("이 유지보수 기록을 삭제하시겠습니까?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/maintenance/${initial!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!fixedDeviceId && (
          <Field label="장비 *" span={2}>
            <select name="deviceId" required defaultValue={initial?.deviceId || ""} className={inputCls}>
              <option value="">장비 선택…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.productName} ({d.modelName}) — {d.serialNumber}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="유형 *">
          <select name="maintenanceType" required defaultValue={initial?.maintenanceType || "점검"} className={inputCls}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="상태">
          <select name="status" defaultValue={initial?.status || "완료"} className={inputCls}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="수행일 *">
          <input
            name="performedAt"
            type="date"
            required
            defaultValue={toDateInput(initial?.performedAt) || new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </Field>

        <Field label="수행자">
          <input name="performedBy" defaultValue={initial?.performedBy || ""} placeholder="홍길동" className={inputCls} />
        </Field>

        <Field label="다음 예정일" hint="캘리브레이션 다음 일정 등">
          <input
            name="nextDueDate"
            type="date"
            defaultValue={toDateInput(initial?.nextDueDate)}
            className={inputCls}
          />
        </Field>

        <Field label="비용 (원)" hint="부품비 / 외주비, 선택">
          <input
            name="cost"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.cost ?? ""}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="수행 내용">
        <textarea
          name="description"
          rows={4}
          defaultValue={initial?.description || ""}
          placeholder="작업 내용, 발견된 이상, 조치 사항 등"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none"
        />
      </Field>

      <Field label="첨부파일" hint="사내 파일서버 경로 또는 URL (이름 + 경로)">
        <div className="space-y-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={a.name}
                onChange={(e) => {
                  const next = [...attachments];
                  next[i] = { ...next[i], name: e.target.value };
                  setAttachments(next);
                }}
                placeholder="이름 (예: 캘리브레이션 리포트.pdf)"
                className={`${inputCls} flex-1`}
              />
              <input
                value={a.path}
                onChange={(e) => {
                  const next = [...attachments];
                  next[i] = { ...next[i], path: e.target.value };
                  setAttachments(next);
                }}
                placeholder="\\\\server\\maintenance\\..."
                className={`${inputCls} flex-[2] font-mono`}
              />
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAttachments([...attachments, { name: "", path: "" }])}
            className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            + 첨부 추가
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              삭제
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "저장 중…" : isEdit ? "수정" : "등록"}
          </button>
        </div>
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
