import Link from "next/link";
import { deployTypeStyles, NEUTRAL_BADGE } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";
import {
  categorizeSite,
  siteGroupKey,
  type SiteCategory,
} from "@/lib/site-category";

export interface DeployRow {
  id: number;
  deployDate: Date;
  deployType: string | null;
  swVersion: string | null;
  aiVersion: string | null;
  plcVersion: string | null;
  deployer: string | null;
  installLocation: string | null;
  description: string | null;
  device: {
    id: number;
    productName: string;
    modelName: string;
    serialNumber: string;
    customerCountry: string | null;
  };
}

interface Props {
  deploys: DeployRow[];
  category: SiteCategory | "전체";
}

export function DeployGroupedTable({ deploys, category }: Props) {
  if (deploys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
          <svg
            width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5"
            className="text-[var(--muted-foreground)]"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-[var(--muted-foreground)]">
          이 분류에 해당하는 배포 이력이 없습니다.
        </p>
      </div>
    );
  }

  // 그룹핑: installLocation 기준 (카테고리에 따라 정규화)
  const groupsMap = new Map<string, DeployRow[]>();
  for (const d of deploys) {
    const cat =
      category === "전체"
        ? categorizeSite(d.installLocation, d.device.customerCountry)
        : category;
    const key = siteGroupKey(d.installLocation, cat, d.device.customerCountry);
    const arr = groupsMap.get(key) || [];
    arr.push(d);
    groupsMap.set(key, arr);
  }

  // 각 그룹 안에서 최신순 정렬, 그룹은 최신 배포일 desc
  const groups = Array.from(groupsMap.entries()).map(([key, items]) => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.deployDate).getTime() - new Date(a.deployDate).getTime()
    );
    return { key, items: sorted, latest: sorted[0].deployDate };
  });
  groups.sort(
    (a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime()
  );

  const th =
    "px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)] whitespace-nowrap";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-md ring-1 ring-black/5 dark:ring-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">설치처별 배포 이력</caption>
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
            <tr className="border-b-2 border-[var(--border)]">
              <th className={th}>배포일</th>
              <th className={th}>장비 (S/N)</th>
              <th className={th}>유형</th>
              <th className={th}>SW</th>
              <th className={th}>담당자 / AI / PLC</th>
              <th className={th}>설치처(원본)</th>
              <th className={th}>설명</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {groups.map((g, gIdx) => (
              <GroupBlock
                key={g.key}
                groupKey={g.key}
                items={g.items}
                isFirst={gIdx === 0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupBlock({
  groupKey,
  items,
  isFirst,
}: {
  groupKey: string;
  items: DeployRow[];
  isFirst: boolean;
}) {
  return (
    <>
      <tr
        className={`bg-blue-50/70 dark:bg-blue-950/30 ${
          isFirst ? "" : "border-t-4 border-[var(--background)]"
        }`}
      >
        <td
          colSpan={7}
          className="px-4 py-2.5 text-sm font-bold tracking-tight text-[var(--foreground)]"
        >
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            {groupKey}
            <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
              {items.length}건
            </span>
          </span>
        </td>
      </tr>
      {items.map((d, idx) => (
        <tr
          key={d.id}
          className={`transition-colors hover:bg-[var(--accent)]/60 ${
            idx % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-800/30" : "bg-[var(--card)]"
          }`}
        >
          <td className="px-4 py-2.5 align-middle text-sm text-[var(--foreground)] whitespace-nowrap">
            {formatDate(d.deployDate)}
          </td>
          <td className="px-4 py-2.5 align-middle">
            <Link
              href={`/devices/${d.device.id}`}
              className="block text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {d.device.modelName}
            </Link>
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {d.device.serialNumber}
            </span>
          </td>
          <td className="px-4 py-2.5 align-middle">
            {d.deployType ? (
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  deployTypeStyles[d.deployType] || NEUTRAL_BADGE
                }`}
              >
                {d.deployType}
              </span>
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">-</span>
            )}
          </td>
          <td className="px-4 py-2.5 align-middle font-mono text-xs text-[var(--foreground)] whitespace-nowrap">
            {d.swVersion || "-"}
          </td>
          <td className="px-4 py-2.5 align-middle text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--foreground)]">
                {d.deployer || <span className="text-[var(--muted-foreground)]">-</span>}
              </span>
              <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                AI {d.aiVersion || "-"} · PLC {d.plcVersion || "-"}
              </span>
            </div>
          </td>
          <td
            className="px-4 py-2.5 align-middle text-xs text-[var(--muted-foreground)] truncate"
            title={d.installLocation || ""}
          >
            {d.installLocation || "-"}
          </td>
          <td
            className="px-4 py-2.5 align-middle text-xs text-[var(--muted-foreground)] truncate"
            title={d.description || ""}
          >
            {d.description || "-"}
          </td>
        </tr>
      ))}
    </>
  );
}
