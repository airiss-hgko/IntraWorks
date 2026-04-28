// Semantic color tokens for status/type badges. Centralizing here keeps
// dark-mode pairs consistent and limits churn when palette changes.

const PALETTE = {
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  gray: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
} as const;

export const NEUTRAL_BADGE = PALETTE.gray;

export const deviceStatusStyles: Record<string, string> = {
  판매완료: PALETTE.emerald,
  보관: PALETTE.slate,
  수리중: PALETTE.rose,
  폐기: PALETTE.gray,
  장비이전: PALETTE.amber,
};

export const deployTypeStyles: Record<string, string> = {
  신규설치: PALETTE.blue,
  업데이트: PALETTE.emerald,
  유지보수: PALETTE.amber,
  긴급패치: PALETTE.rose,
};

export const configSourceStyles: Record<string, string> = {
  StatusReport: PALETTE.blue,
  ConfigFile: PALETTE.emerald,
  ManualUpload: PALETTE.amber,
};

// Icon/accent variants (foreground + soft background only)
const ACCENT = {
  blue: { fg: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  emerald: { fg: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  amber: { fg: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  red: { fg: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
} as const;

export const statAccent = ACCENT;

// Foreground-only color for deploy type labels (e.g. recent activity feed)
export const deployTypeAccent: Record<string, string> = {
  신규설치: ACCENT.blue.fg,
  업데이트: ACCENT.emerald.fg,
  유지보수: ACCENT.amber.fg,
  긴급패치: ACCENT.red.fg,
};

// Chart colors — kept as hex so recharts can consume them directly.
// Dark variants are picked at render time via theme hook.
export const chartColors = {
  light: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
  dark: ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee"],
};
