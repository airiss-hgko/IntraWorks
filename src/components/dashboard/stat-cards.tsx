import { statAccent } from "@/lib/status-colors";

interface StatCardsProps {
  stats: {
    total: number;
    sold: number;
    stored: number;
    repairing: number;
  };
}

const cards = [
  {
    key: "total" as const,
    label: "전체 장비",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
    accent: statAccent.blue,
  },
  {
    key: "sold" as const,
    label: "판매/완료",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    accent: statAccent.emerald,
  },
  {
    key: "stored" as const,
    label: "보관중",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    accent: statAccent.amber,
  },
  {
    key: "repairing" as const,
    label: "수리중",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    accent: statAccent.red,
  },
];

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div>
            <p className="mb-1 text-sm font-medium text-[var(--muted-foreground)]">
              {card.label}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--foreground)]">
                {stats[card.key]}
              </span>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">대</span>
            </div>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${card.accent.bg}`}
          >
            <span className={card.accent.fg}>{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
