"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface ReleaseLite {
  id: number;
  component: string; // SW | AI | PLC
  version: string;
  modelName: string | null;
}

interface DeployFormProps {
  devices: {
    id: number;
    productName: string;
    modelName: string;
    serialNumber: string;
    currentSwVersion: string | null;
    currentAiVersion: string | null;
    currentPlcVersion: string | null;
  }[];
  releases: ReleaseLite[];
  preselectedDeviceId?: number;
}

const deployTypes = ["신규설치", "업데이트", "유지보수", "긴급패치"];

function findRelease(
  releases: ReleaseLite[],
  component: "SW" | "AI" | "PLC",
  version: string,
  modelName: string | null
): ReleaseLite | null {
  if (!version) return null;
  const exact = releases.find(
    (r) => r.component === component && r.version === version && r.modelName === modelName
  );
  if (exact) return exact;
  return (
    releases.find(
      (r) => r.component === component && r.version === version && r.modelName === null
    ) || null
  );
}

export function DeployForm({ devices, releases, preselectedDeviceId }: DeployFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | "">(
    preselectedDeviceId || ""
  );
  const [swVersion, setSwVersion] = useState("");
  const [aiVersion, setAiVersion] = useState("");
  const [plcVersion, setPlcVersion] = useState("");
  const [downgradeWarning, setDowngradeWarning] = useState<string[] | null>(
    null
  );
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(
    null
  );

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const modelName = selectedDevice?.modelName ?? null;

  const matchedSwRelease = useMemo(
    () => findRelease(releases, "SW", swVersion.trim(), modelName),
    [releases, swVersion, modelName]
  );
  const matchedAiRelease = useMemo(
    () => findRelease(releases, "AI", aiVersion.trim(), modelName),
    [releases, aiVersion, modelName]
  );
  const matchedPlcRelease = useMemo(
    () => findRelease(releases, "PLC", plcVersion.trim(), modelName),
    [releases, plcVersion, modelName]
  );

  const swOptions = useMemo(
    () =>
      Array.from(
        new Set(
          releases
            .filter((r) => r.component === "SW" && (r.modelName === modelName || r.modelName === null))
            .map((r) => r.version)
        )
      ),
    [releases, modelName]
  );
  const aiOptions = useMemo(
    () =>
      Array.from(
        new Set(
          releases
            .filter((r) => r.component === "AI" && (r.modelName === modelName || r.modelName === null))
            .map((r) => r.version)
        )
      ),
    [releases, modelName]
  );
  const plcOptions = useMemo(
    () =>
      Array.from(
        new Set(
          releases
            .filter((r) => r.component === "PLC" && (r.modelName === modelName || r.modelName === null))
            .map((r) => r.version)
        )
      ),
    [releases, modelName]
  );

  const submitDeploy = async (
    body: Record<string, unknown>,
    force = false
  ) => {
    const res = await fetch("/api/deploys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, forceDowngrade: force }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.requireConfirmation && data.downgrades) {
        setDowngradeWarning(data.downgrades);
        setPendingBody(body);
        return;
      }
      throw new Error(data.error || "등록에 실패했습니다.");
    }

    router.push(`/devices/${body.deviceId}`);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDowngradeWarning(null);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      deviceId: selectedDeviceId,
      deployDate: formData.get("deployDate") as string,
      deployType: formData.get("deployType") as string,
      swVersion: swVersion.trim() || null,
      aiVersion: aiVersion.trim() || null,
      plcVersion: plcVersion.trim() || null,
      swReleaseId: matchedSwRelease?.id ?? null,
      aiReleaseId: matchedAiRelease?.id ?? null,
      plcReleaseId: matchedPlcRelease?.id ?? null,
      deployer: (formData.get("deployer") as string) || null,
      receiver: (formData.get("receiver") as string) || null,
      description: (formData.get("description") as string) || null,
    };

    try {
      await submitDeploy(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceDowngrade = async () => {
    if (!pendingBody) return;
    setLoading(true);
    setError("");
    setDowngradeWarning(null);
    try {
      await submitDeploy(pendingBody, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby={[error ? "deploy-form-error" : null, downgradeWarning ? "deploy-form-warning" : null].filter(Boolean).join(" ") || undefined}
      className="space-y-6"
    >
      {error && (
        <div id="deploy-form-error" role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {downgradeWarning && (
        <div id="deploy-form-warning" role="alert" aria-live="assertive" className="rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <p className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-400">
            다운그레이드가 감지되었습니다:
          </p>
          <ul className="mb-3 list-inside list-disc text-sm text-yellow-700 dark:text-yellow-400">
            {downgradeWarning.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleForceDowngrade}
              disabled={loading}
              className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              강제 배포
            </button>
            <button
              type="button"
              onClick={() => {
                setDowngradeWarning(null);
                setPendingBody(null);
              }}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 장비 선택 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          장비 선택
        </h2>
        <div>
          <label htmlFor="deviceId" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
            장비 <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="deviceId"
            value={selectedDeviceId}
            onChange={(e) =>
              setSelectedDeviceId(
                e.target.value ? parseInt(e.target.value) : ""
              )
            }
            required
            aria-required="true"
            className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="">장비를 선택하세요</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.productName} ({d.modelName}) - {d.serialNumber}
              </option>
            ))}
          </select>
        </div>

        {selectedDevice && (
          <div className="mt-3 rounded-md bg-[var(--muted)] p-3">
            <p className="text-xs text-[var(--muted-foreground)]">현재 버전</p>
            <div className="mt-1 flex gap-4 text-sm font-mono">
              <span>SW: {selectedDevice.currentSwVersion || "-"}</span>
              <span>AI: {selectedDevice.currentAiVersion || "-"}</span>
              <span>PLC: {selectedDevice.currentPlcVersion || "-"}</span>
            </div>
          </div>
        )}
      </div>

      {/* 배포 정보 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          배포 정보
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deployDate" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              배포일 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="deployDate"
              name="deployDate"
              type="date"
              required
              aria-required="true"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="deployType" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              배포 유형
            </label>
            <select
              id="deployType"
              name="deployType"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">선택</option>
              {deployTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="deployer" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              담당자
            </label>
            <input
              id="deployer"
              name="deployer"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="receiver" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              수신자
            </label>
            <input
              id="receiver"
              name="receiver"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 버전 정보 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
          배포 버전
        </h2>
        <p className="mb-4 text-xs text-[var(--muted-foreground)]">
          최소 하나의 버전을 입력해주세요. 등록된 릴리스는 자동완성됩니다.
        </p>
        <datalist id="sw-release-versions">
          {swOptions.map((v) => (<option key={v} value={v} />))}
        </datalist>
        <datalist id="ai-release-versions">
          {aiOptions.map((v) => (<option key={v} value={v} />))}
        </datalist>
        <datalist id="plc-release-versions">
          {plcOptions.map((v) => (<option key={v} value={v} />))}
        </datalist>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <VersionField
            id="swVersion"
            label="SW 버전"
            placeholder="X.X.X.X"
            list="sw-release-versions"
            value={swVersion}
            onChange={setSwVersion}
            matched={matchedSwRelease}
            component="SW"
            modelName={modelName}
          />
          <VersionField
            id="aiVersion"
            label="AI 버전"
            placeholder="X.X.X"
            list="ai-release-versions"
            value={aiVersion}
            onChange={setAiVersion}
            matched={matchedAiRelease}
            component="AI"
            modelName={modelName}
          />
          <VersionField
            id="plcVersion"
            label="PLC 버전"
            placeholder="RX.v.X.X.X.X"
            list="plc-release-versions"
            value={plcVersion}
            onChange={setPlcVersion}
            matched={matchedPlcRelease}
            component="PLC"
            modelName={modelName}
          />
        </div>
      </div>

      {/* 설명 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <label htmlFor="description" className="mb-4 block text-lg font-semibold text-[var(--foreground)]">
          설명
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-[var(--primary)] px-6 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "등록 중..." : "배포 등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-[var(--border)] px-6 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
        >
          취소
        </button>
      </div>
    </form>
  );
}

interface VersionFieldProps {
  id: string;
  label: string;
  placeholder: string;
  list: string;
  value: string;
  onChange: (v: string) => void;
  matched: ReleaseLite | null;
  component: "SW" | "AI" | "PLC";
  modelName: string | null;
}

function VersionField({
  id,
  label,
  placeholder,
  list,
  value,
  onChange,
  matched,
  component,
  modelName,
}: VersionFieldProps) {
  const trimmed = value.trim();
  const newReleaseHref = `/releases/new?component=${component}&version=${encodeURIComponent(trimmed)}${modelName ? `&model=${encodeURIComponent(modelName)}` : ""}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        list={list}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
      />
      <div className="mt-1 min-h-[18px] text-xs">
        {!trimmed ? null : matched ? (
          <Link
            href={`/releases/${matched.id}`}
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400"
            target="_blank"
            rel="noreferrer"
          >
            ✓ 릴리스 #{matched.id} 매칭됨{matched.modelName === null ? " (공통)" : ""}
          </Link>
        ) : (
          <Link
            href={newReleaseHref}
            className="inline-flex items-center gap-1 text-amber-700 hover:underline dark:text-amber-400"
            target="_blank"
            rel="noreferrer"
          >
            ⚠ 미등록 버전 — 릴리스 등록하기
          </Link>
        )}
      </div>
    </div>
  );
}
