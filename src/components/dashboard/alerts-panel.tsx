import Link from "next/link";
import type { AlertGroup, AlertSeverity } from "@/lib/dashboard-alerts";

const sevStyles: Record<AlertSeverity, string> = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
  warn: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50",
};

const sevIcon: Record<AlertSeverity, JSX.Element> = {
  high: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  warn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

interface Props {
  groups: AlertGroup[];
  total: number;
}

export function AlertsPanel({ groups, total }: Props) {
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">점검 필요 항목 없음</h2>
            <p className="text-sm text-[var(--muted-foreground)]">모든 장비의 데이터가 깨끗합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">점검 필요</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            납품·유지보수 데이터를 검토하면서 발견된 항목 ({total}건)
          </p>
        </div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {groups.map((g) => (
          <details key={g.category} className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-3.5 hover:bg-[var(--muted)]/40">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${sevStyles[g.items[0].severity]}`}>
                  {sevIcon[g.items[0].severity]}
                </span>
                <span className="text-sm font-medium text-[var(--foreground)]">{g.label}</span>
                <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                  {g.items.length}
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)] transition-transform group-open:rotate-180">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <ul className="divide-y divide-[var(--border)] bg-[var(--muted)]/20">
              {g.items.map((it, idx) => {
                const Body = (
                  <div className="flex items-start justify-between gap-4 px-10 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{it.title}</p>
                      {it.detail && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{it.detail}</p>}
                    </div>
                    {it.href && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0 text-[var(--muted-foreground)]">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </div>
                );
                return (
                  <li key={idx}>
                    {it.href ? (
                      <Link href={it.href} className="block hover:bg-[var(--muted)]/40">
                        {Body}
                      </Link>
                    ) : (
                      Body
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
