"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeviceFormProps {
  device?: {
    id: number;
    productName: string;
    modelName: string;
    serialNumber: string;
    deviceId: string;
    status: string;
    customerCountry: string | null;
    customerName: string | null;
    currentSwVersion: string | null;
    currentAiVersion: string | null;
    currentPlcVersion: string | null;
    notes: string | null;
  };
}

const statuses = ["판매완료", "보관", "수리중", "폐기"];
const models = ["RX6040S", "RX6040SA", "RX5030SA", "RX6040DA", "RX7555SA", "RX6040MD", "XIS-B"];

export function DeviceForm({ device }: DeviceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!device;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body: Record<string, string | null> = {
      productName: formData.get("productName") as string,
      modelName: formData.get("modelName") as string,
      serialNumber: formData.get("serialNumber") as string,
      deviceId: formData.get("deviceId") as string,
      status: formData.get("status") as string,
      customerCountry: (formData.get("customerCountry") as string) || null,
      customerName: (formData.get("customerName") as string) || null,
      currentSwVersion: (formData.get("currentSwVersion") as string) || null,
      currentAiVersion: (formData.get("currentAiVersion") as string) || null,
      currentPlcVersion: (formData.get("currentPlcVersion") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    try {
      const url = isEdit ? `/api/devices/${device.id}` : "/api/devices";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "요청에 실패했습니다.");
      }

      const saved = await res.json();
      router.push(`/devices/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
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

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          기본 정보
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              name="productName"
              defaultValue={device?.productName || ""}
              required
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              모델명 <span className="text-red-500">*</span>
            </label>
            <select
              name="modelName"
              defaultValue={device?.modelName || ""}
              required
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">선택</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              S/N <span className="text-red-500">*</span>
            </label>
            <input
              name="serialNumber"
              defaultValue={device?.serialNumber || ""}
              required
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              장비 ID <span className="text-red-500">*</span>
            </label>
            <input
              name="deviceId"
              defaultValue={device?.deviceId || ""}
              required
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              상태 <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              defaultValue={device?.status || "보관"}
              required
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          판매 정보
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              판매 국가
            </label>
            <input
              name="customerCountry"
              defaultValue={device?.customerCountry || ""}
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              고객명
            </label>
            <input
              name="customerName"
              defaultValue={device?.customerName || ""}
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          버전 정보
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              SW 버전
            </label>
            <input
              name="currentSwVersion"
              defaultValue={device?.currentSwVersion || ""}
              placeholder="X.X.X.X"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              AI 버전
            </label>
            <input
              name="currentAiVersion"
              defaultValue={device?.currentAiVersion || ""}
              placeholder="X.X.X"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              PLC 버전
            </label>
            <input
              name="currentPlcVersion"
              defaultValue={device?.currentPlcVersion || ""}
              placeholder="RX.v.X.X.X.X"
              className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          비고
        </h2>
        <textarea
          name="notes"
          defaultValue={device?.notes || ""}
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
          {loading ? "저장 중..." : isEdit ? "수정" : "등록"}
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
