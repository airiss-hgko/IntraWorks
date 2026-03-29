"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface DeviceInfo {
  productName: string;
  serialNumber: string;
  modelName: string;
}

interface ConfigInfo {
  id: number;
  configVersion: number | null;
  swVersion: string | null;
  triggerType: string | null;
  capturedAt: string;
  device: DeviceInfo;
  snapshotJson: Record<string, unknown>;
}

interface DiffEntry {
  path: string;
  type: "added" | "removed" | "changed";
  valueA?: unknown;
  valueB?: unknown;
}

interface CompareResult {
  configA: ConfigInfo;
  configB: ConfigInfo;
  diffs: DiffEntry[];
  totalDiffs: number;
}

export function ConfigCompareClient() {
  const searchParams = useSearchParams();
  const idA = searchParams.get("a");
  const idB = searchParams.get("b");

  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!idA || !idB) {
      setError("비교할 두 Config ID가 필요합니다.");
      setLoading(false);
      return;
    }

    fetch(`/api/configs/compare?a=${idA}&b=${idB}`)
      .then((res) => {
        if (!res.ok) throw new Error("비교 데이터를 불러올 수 없습니다.");
        return res.json();
      })
      .then((result) => setData(result))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idA, idB]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link href="/configs" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Config 목록
        </Link>
        <div className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-8 text-center text-sm text-[var(--destructive)]">
          {error || "데이터를 불러올 수 없습니다."}
        </div>
      </div>
    );
  }

  const { configA, configB, diffs } = data;

  const diffMap = new Map<string, DiffEntry>();
  diffs.forEach((d) => diffMap.set(d.path, d));

  const filteredDiffs = search
    ? diffs.filter((d) => d.path.toLowerCase().includes(search.toLowerCase()))
    : diffs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/configs"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Config 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">Config 비교</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          두 Config 스냅샷의 차이점을 비교합니다.
        </p>
      </div>

      {/* Compare headers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ConfigCard config={configA} label="A" color="blue" />
        <ConfigCard config={configB} label="B" color="emerald" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-sm font-medium text-[var(--primary)]">
            {diffs.length}건의 차이
          </span>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={showOnlyDiffs}
              onChange={(e) => setShowOnlyDiffs(e.target.checked)}
              className="rounded border-[var(--input)]"
            />
            차이점만 보기
          </label>
        </div>
        <div className="relative w-full sm:w-64">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="경로 검색..."
            className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] py-2 pl-9 pr-4 text-sm focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </div>
      </div>

      {/* Diff table */}
      {diffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600 dark:text-emerald-400" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">차이점이 없습니다</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">두 Config가 동일합니다.</p>
        </div>
      ) : showOnlyDiffs ? (
        <DiffOnlyView diffs={filteredDiffs} />
      ) : (
        <SideBySideView configA={configA} configB={configB} diffMap={diffMap} search={search} />
      )}
    </div>
  );
}

function ConfigCard({ config, label, color }: { config: ConfigInfo; label: string; color: string }) {
  const colorClasses = color === "blue"
    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${colorClasses}`}>
          {label}
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {config.device.productName}
            <span className="ml-2 font-mono text-xs font-normal text-[var(--muted-foreground)]">
              {config.device.serialNumber}
            </span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {config.triggerType || "-"} &middot; v{config.configVersion || "-"} &middot; {new Date(config.capturedAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>
    </div>
  );
}

function DiffOnlyView({ diffs }: { diffs: DiffEntry[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">경로</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">변경 유형</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Config A</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Config B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {diffs.map((diff) => (
              <tr key={diff.path} className={getDiffRowClass(diff.type)}>
                <td className="px-6 py-3 font-mono text-xs text-[var(--foreground)]">{diff.path}</td>
                <td className="px-6 py-3">
                  <DiffTypeBadge type={diff.type} />
                </td>
                <td className="max-w-xs truncate px-6 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                  {diff.type !== "added" ? formatValue(diff.valueA) : "-"}
                </td>
                <td className="max-w-xs truncate px-6 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                  {diff.type !== "removed" ? formatValue(diff.valueB) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SideBySideView({
  configA,
  configB,
  diffMap,
  search,
}: {
  configA: ConfigInfo;
  configB: ConfigInfo;
  diffMap: Map<string, DiffEntry>;
  search: string;
}) {
  const allPaths = collectPaths(configA.snapshotJson);
  const pathsB = collectPaths(configB.snapshotJson);
  pathsB.forEach((p) => { if (!allPaths.includes(p)) allPaths.push(p); });

  const filtered = search
    ? allPaths.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : allPaths;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">경로</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Config A</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Config B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((path) => {
              const diff = diffMap.get(path);
              const valA = getNestedValue(configA.snapshotJson, path);
              const valB = getNestedValue(configB.snapshotJson, path);

              if (typeof valA === "object" && valA !== null && !Array.isArray(valA)) return null;
              if (typeof valB === "object" && valB !== null && !Array.isArray(valB)) return null;

              return (
                <tr key={path} className={diff ? getDiffRowClass(diff.type) : ""}>
                  <td className="px-6 py-2 font-mono text-xs text-[var(--foreground)]">{path}</td>
                  <td className={`px-6 py-2 font-mono text-xs ${diff?.type === "removed" ? "font-medium text-red-600 dark:text-red-400" : diff?.type === "changed" ? "font-medium text-amber-600 dark:text-amber-400" : "text-[var(--muted-foreground)]"}`}>
                    {valA !== undefined ? formatValue(valA) : "-"}
                  </td>
                  <td className={`px-6 py-2 font-mono text-xs ${diff?.type === "added" ? "font-medium text-emerald-600 dark:text-emerald-400" : diff?.type === "changed" ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-[var(--muted-foreground)]"}`}>
                    {valB !== undefined ? formatValue(valB) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiffTypeBadge({ type }: { type: DiffEntry["type"] }) {
  const classes = {
    added: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    removed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    changed: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  };
  const labels = { added: "추가", removed: "삭제", changed: "변경" };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${classes[type]}`}>
      {labels[type]}
    </span>
  );
}

function getDiffRowClass(type: DiffEntry["type"]) {
  switch (type) {
    case "added": return "bg-emerald-50/50 dark:bg-emerald-900/10";
    case "removed": return "bg-red-50/50 dark:bg-red-900/10";
    case "changed": return "bg-amber-50/50 dark:bg-amber-900/10";
    default: return "";
  }
}

function formatValue(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "-";
  if (typeof val === "string") return `"${val}"`;
  if (typeof val === "boolean") return val ? "true" : "false";
  if (Array.isArray(val)) return JSON.stringify(val);
  return String(val);
}

function collectPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      paths.push(...collectPaths(val as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
