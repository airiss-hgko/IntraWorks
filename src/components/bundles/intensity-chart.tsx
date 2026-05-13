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
} from "recharts";

interface DetectorData {
  DetectorIndex?: number;
  Modules?: Array<{ High?: number; Low?: number }>;
}

interface Props {
  data: DetectorData[];
}

function detectorLabel(idx: number) {
  if (idx === 0) return "수직 (Vertical)";
  if (idx === 1) return "수평 (Horizontal)";
  return `Detector ${idx}`;
}

export function IntensityChart({ data }: Props) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center text-sm text-[var(--muted-foreground)]">
        Config.DM.json 이 없거나 인식되지 않았습니다.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((det) => {
        const idx = typeof det.DetectorIndex === "number" ? det.DetectorIndex : 0;
        const modules = Array.isArray(det.Modules) ? det.Modules : [];
        const rows = modules.map((m, i) => ({
          module: i,
          High: typeof m.High === "number" ? m.High : null,
          Low: typeof m.Low === "number" ? m.Low : null,
        }));
        return (
          <div key={idx} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              {detectorLabel(idx)}{" "}
              <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">모듈 {rows.length}개</span>
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="module"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    label={{ value: "Module", position: "insideBottom", offset: -2, fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="High" fill="#3b82f6" />
                  <Bar dataKey="Low" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
