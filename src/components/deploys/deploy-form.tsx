"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  preselectedDeviceId?: number;
}

const deployTypes = ["신규설치", "업데이트", "유지보수", "긴급패치"];

export function DeployForm({ devices, preselectedDeviceId }: DeployFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | "">(
    preselectedDeviceId || ""
  );
  const [downgradeWarning, setDowngradeWarning] = useState<string[] | null>(
    null
  );
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(
    null
  );

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

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
      swVersion: (formData.get("swVersion") as string) || null,
      aiVersion: (formData.get("aiVersion") as string) || null,
      plcVersion: (formData.get("plcVersion") as string) || null,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {downgradeWarning && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
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
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
            장비 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) =>
              setSelectedDeviceId(
                e.target.value ? parseInt(e.target.value) : ""
              )
            }
            required
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
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              배포일 <span className="text-red-500">*</span>
            </label>
            <input
              name="deployDate"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              배포 유형
            </label>
            <select
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
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              담당자
            </label>
            <input
              name="deployer"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              수신자
            </label>
            <input
              name="receiver"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 버전 정보 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          배포 버전
        </h2>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          최소 하나의 버전을 입력해주세요.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              SW 버전
            </label>
            <input
              name="swVersion"
              placeholder="X.X.X.X"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              AI 버전
            </label>
            <input
              name="aiVersion"
              placeholder="X.X.X"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              PLC 버전
            </label>
            <input
              name="plcVersion"
              placeholder="RX.v.X.X.X.X"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* 설명 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          설명
        </h2>
        <textarea
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
