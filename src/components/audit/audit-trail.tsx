import { prisma } from "@/lib/prisma";

interface Props {
  tableName: string;          // e.g. "tb_device"
  recordId: number;
  limit?: number;
}

const actionStyles: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  UPDATE: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  DELETE: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const actionLabel: Record<string, string> = {
  CREATE: "등록",
  UPDATE: "수정",
  DELETE: "삭제",
};

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function fmt(d: Date): string {
  return dateFmt.format(d);
}

function shortValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}

/** old/new 객체에서 실제로 변경된 필드만 골라 반환 */
function diffFields(
  oldV: Record<string, unknown> | null,
  newV: Record<string, unknown> | null
): Array<{ field: string; from: unknown; to: unknown }> {
  const out: Array<{ field: string; from: unknown; to: unknown }> = [];
  if (!oldV && !newV) return out;
  const keys = new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})]);
  const SKIP = new Set(["createdAt", "updatedAt"]);
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    const a = oldV?.[k];
    const b = newV?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    out.push({ field: k, from: a, to: b });
  }
  return out;
}

export async function AuditTrail({ tableName, recordId, limit = 50 }: Props) {
  const logs = await prisma.auditLog.findMany({
    where: { tableName, recordId },
    include: { user: { select: { displayName: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center text-sm text-[var(--muted-foreground)]">
        기록된 변경 이력이 없습니다.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
      {logs.map((log) => {
        const fields = diffFields(
          log.oldValues as Record<string, unknown> | null,
          log.newValues as Record<string, unknown> | null
        );
        return (
          <li key={log.id} className="bg-[var(--card)] p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${actionStyles[log.action] || "bg-[var(--muted)]"}`}>
                {actionLabel[log.action] || log.action}
              </span>
              <span className="text-[var(--muted-foreground)]">{fmt(log.createdAt)}</span>
              {log.user && (
                <span className="text-[var(--foreground)]">· {log.user.displayName || log.user.username}</span>
              )}
              {log.ipAddress && <span className="text-[var(--muted-foreground)]">· {log.ipAddress}</span>}
            </div>
            {log.action === "UPDATE" && fields.length > 0 && (
              <table className="mt-2 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-1 pr-3 font-semibold text-[var(--muted-foreground)]">필드</th>
                    <th className="py-1 pr-3 font-semibold text-[var(--muted-foreground)]">이전</th>
                    <th className="py-1 font-semibold text-[var(--muted-foreground)]">이후</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {fields.map((f) => (
                    <tr key={f.field}>
                      <td className="py-1 pr-3 font-mono text-[var(--foreground)]">{f.field}</td>
                      <td className="py-1 pr-3 font-mono text-[var(--muted-foreground)]">{shortValue(f.from)}</td>
                      <td className="py-1 font-mono text-[var(--foreground)]">{shortValue(f.to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {log.action === "CREATE" && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">신규 레코드 등록</p>
            )}
            {log.action === "DELETE" && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">레코드 삭제</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
