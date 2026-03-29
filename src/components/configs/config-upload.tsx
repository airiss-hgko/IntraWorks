"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Device {
  id: number;
  productName: string;
  serialNumber: string;
  deviceId: string;
}

interface ConfigUploadProps {
  devices: Device[];
  preselectedDeviceId?: number;
}

interface ParsedFile {
  fileName: string;
  isStatusReport: boolean;
  configVersion: number | null;
  deviceInfo: { deviceId?: string; deviceName?: string; serialNumber?: string } | null;
  swVersion: string | null;
  raw: Record<string, unknown>;
}

export function ConfigUpload({ devices, preselectedDeviceId }: ConfigUploadProps) {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState<number | "">(preselectedDeviceId || "");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parseFile = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".json")) {
      setError("JSON 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("파일 크기가 너무 큽니다 (최대 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const isStatusReport = "CurrentConfig" in json && "ExportDate" in json;

        const result: ParsedFile = {
          fileName: file.name,
          isStatusReport,
          configVersion: json.ConfigVersion || null,
          deviceInfo: null,
          swVersion: null,
          raw: json,
        };

        if (isStatusReport) {
          result.deviceInfo = json.DeviceInfo || null;
          result.swVersion = json.SoftwareVersions?.SW || null;
          // Try to auto-match device
          if (json.DeviceInfo?.SerialNumber) {
            const match = devices.find(
              (d) => d.serialNumber === json.DeviceInfo.SerialNumber || d.deviceId === json.DeviceInfo.DeviceId
            );
            if (match && !deviceId) setDeviceId(match.id);
          }
        } else if (json.Device?.SerialNumber) {
          result.deviceInfo = {
            deviceId: json.Device.DeviceId,
            deviceName: json.Device.DeviceName,
            serialNumber: json.Device.SerialNumber,
          };
          const match = devices.find(
            (d) => d.serialNumber === json.Device.SerialNumber || d.deviceId === json.Device.DeviceId
          );
          if (match && !deviceId) setDeviceId(match.id);
        }

        setParsed(result);
      } catch {
        setError("유효한 JSON 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  }, [devices, deviceId]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleSubmit = async () => {
    if (!deviceId || !parsed) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          snapshotJson: parsed.raw,
          triggerType: parsed.isStatusReport ? "StatusReport" : "ConfigFile",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "업로드에 실패했습니다.");
        return;
      }

      router.push("/configs");
      router.refresh();
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Device selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          장비 선택 <span className="text-[var(--destructive)]">*</span>
        </label>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value ? parseInt(e.target.value) : "")}
          className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2.5 text-sm focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        >
          <option value="">장비를 선택하세요</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.productName} ({d.serialNumber})
            </option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : parsed
            ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-900/10"
            : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
        }`}
      >
        {parsed ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 dark:text-emerald-400" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">{parsed.fileName}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {parsed.isStatusReport ? "StatusReport" : "Config.local.json"}
              {parsed.configVersion && ` | Config v${parsed.configVersion}`}
              {parsed.swVersion && ` | SW ${parsed.swVersion}`}
            </p>
            {parsed.deviceInfo && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {parsed.deviceInfo.deviceName} ({parsed.deviceInfo.serialNumber})
              </p>
            )}
            <button
              onClick={() => setParsed(null)}
              className="mt-3 text-xs text-[var(--primary)] hover:underline"
            >
              다른 파일 선택
            </button>
          </div>
        ) : (
          <>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-[var(--muted-foreground)]" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-medium text-[var(--foreground)]">
              JSON 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Config.local.json 또는 StatusReport JSON (최대 5MB)
            </p>
          </>
        )}

        <input
          type="file"
          accept=".json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!deviceId || !parsed || loading}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "업로드 중..." : "업로드"}
        </button>
      </div>
    </div>
  );
}
