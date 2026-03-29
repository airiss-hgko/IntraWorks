"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4"];

interface ChartsProps {
  title: string;
  data: { name: string; count: number }[];
  type: "bar" | "pie";
}

export function Charts({ title, data, type }: ChartsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";
  const cursorFill = isDark ? "#1e293b" : "#f8fafc";

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--muted-foreground)]">데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h3>
      </div>

      {type === "bar" ? (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: tickColor, fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 12 }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: cursorFill }}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  fontSize: "13px",
                  color: isDark ? "#e2e8f0" : "#0f172a",
                }}
              />
              <Bar dataKey="count" name="장비 수" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* Donut chart */}
          <div className="relative">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    fontSize: "13px",
                    color: isDark ? "#e2e8f0" : "#0f172a",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-[var(--foreground)]">{total}</span>
              <span className="text-xs text-[var(--muted-foreground)]">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {data.map((d, index) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-[var(--muted-foreground)]">
                  {d.name} ({d.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
