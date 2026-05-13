"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

interface DetectorData {
  DetectorIndex?: number;
  Modules?: Array<{ High?: number; Low?: number }>;
}

interface Props {
  left: DetectorData[] | null;
  right: DetectorData[] | null;
}

function detectorLabel(idx: number) {
  if (idx === 0) return "수직 (Vertical)";
  if (idx === 1) return "수평 (Horizontal)";
  return `Detector ${idx}`;
}

function modulesOf(arr: DetectorData[] | null, idx: number) {
  if (!Array.isArray(arr)) return [];
  const d = arr.find((d) => d?.DetectorIndex === idx);
  return Array.isArray(d?.Modules) ? d!.Modules : [];
}

export function IntensityDiffChart({ left, right }: Props) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center text-sm text-[var(--muted-foreground)]">
        두 번들 중 한 쪽에 Config.DM.json 이 없어 변화량을 계산할 수 없습니다.
      </p>
    );
  }

  // 좌/우에 있는 detector 인덱스 합집합
  const idxSet = new Set<number>();
  for (const d of left) if (typeof d.DetectorIndex === "number") idxSet.add(d.DetectorIndex);
  for (const d of right) if (typeof d.DetectorIndex === "number") idxSet.add(d.DetectorIndex);
  const idxs = Array.from(idxSet).sort();

  return (
    <div className="space-y-6">
      {idxs.map((idx) => {
        const lm = modulesOf(left, idx);
        const rm = modulesOf(right, idx);
        const n = Math.max(lm.length, rm.length);
        const rows = Array.from({ length: n }, (_, i) => {
          const lh = lm[i]?.High;
          const rh = rm[i]?.High;
          const ll = lm[i]?.Low;
          const rl = rm[i]?.Low;
          return {
            module: i,
            // (좌 - 우) 변화량 — 양수면 좌가 더 큼
            HighDelta: typeof lh === "number" && typeof rh === "number" ? lh - rh : null,
            LowDelta: typeof ll === "number" && typeof rl === "number" ? ll - rl : null,
          };
        });

        return (
          <div key={idx} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              {detectorLabel(idx)} — 변화량 (좌 − 우)
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="module" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="HighDelta" name="High Δ" fill="#3b82f6" />
                  <Bar dataKey="LowDelta" name="Low Δ" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
