import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/format";

interface PageProps {
  searchParams: {
    component?: string;
    model?: string;
    type?: string;
    search?: string;
    includeDeprecated?: string;
  };
}

const COMPONENT_TABS = ["전체", "SW", "AI", "PLC"] as const;

const componentBadge: Record<string, string> = {
  SW: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  AI: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  PLC: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const typeBadge: Record<string, string> = {
  정식: "bg-[var(--muted)] text-[var(--foreground)]",
  베타: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  긴급패치: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default async function ReleasesPage({ searchParams }: PageProps) {
  const componentParam = searchParams.component || "전체";
  const model = searchParams.model || "";
  const type = searchParams.type || "";
  const search = searchParams.search || "";
  const includeDeprecated = searchParams.includeDeprecated === "true";

  const where: Record<string, unknown> = {};
  if (componentParam !== "전체") where.component = componentParam;
  if (model) where.modelName = model;
  if (type) where.releaseType = type;
  if (!includeDeprecated) where.isDeprecated = false;
  if (search) {
    where.OR = [
      { version: { contains: search, mode: "insensitive" } },
      { artifactName: { contains: search, mode: "insensitive" } },
      { changelog: { contains: search, mode: "insensitive" } },
    ];
  }

  const [releases, models, counts] = await Promise.all([
    prisma.release.findMany({
      where,
      orderBy: [{ buildDate: "desc" }, { id: "desc" }],
      include: {
        _count: { select: { swDeploys: true, aiDeploys: true, plcDeploys: true } },
      },
    }),
    prisma.device.findMany({
      select: { modelName: true },
      distinct: ["modelName"],
      orderBy: { modelName: "asc" },
    }),
    prisma.release.groupBy({
      by: ["component"],
      _count: { _all: true },
      where: includeDeprecated ? {} : { isDeprecated: false },
    }),
  ]);

  const totalCount = counts.reduce((s, c) => s + c._count._all, 0);
  const countByComp: Record<string, number> = { 전체: totalCount };
  for (const c of counts) countByComp[c.component] = c._count._all;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">릴리스</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            SW / AI / PLC 빌드 산출물 카탈로그. 각 버전이 정확히 어떤 빌드인지 추적합니다.
          </p>
        </div>
        <Link
          href="/releases/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          릴리스 등록
        </Link>
      </div>

      {/* 컴포넌트 탭 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-px">
        {COMPONENT_TABS.map((tab) => {
          const active = componentParam === tab;
          const params = new URLSearchParams();
          if (tab !== "전체") params.set("component", tab);
          if (model) params.set("model", model);
          if (type) params.set("type", type);
          if (search) params.set("search", search);
          if (includeDeprecated) params.set("includeDeprecated", "true");
          const qs = params.toString();
          return (
            <Link
              key={tab}
              href={`/releases${qs ? `?${qs}` : ""}`}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab}
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                {countByComp[tab] ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 필터 */}
      <form className="flex flex-wrap items-center gap-2" method="get">
        {componentParam !== "전체" && <input type="hidden" name="component" value={componentParam} />}
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="버전, 산출물명, 변경요약 검색…"
          className="h-10 min-w-[240px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none"
        />
        <select
          name="model"
          defaultValue={model}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        >
          <option value="">모든 모델</option>
          {models.map((m) => (
            <option key={m.modelName} value={m.modelName}>{m.modelName}</option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={type}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        >
          <option value="">모든 유형</option>
          <option value="정식">정식</option>
          <option value="베타">베타</option>
          <option value="긴급패치">긴급패치</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            name="includeDeprecated"
            value="true"
            defaultChecked={includeDeprecated}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          폐기 포함
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          적용
        </button>
      </form>

      {/* 목록 */}
      {releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">등록된 릴리스가 없습니다.</p>
          <Link href="/releases/new" className="mt-2 text-sm text-[var(--primary)] hover:underline">
            첫 릴리스 등록하기
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">릴리스 목록</caption>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">컴포넌트</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">버전</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">모델</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">유형</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">빌드일</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">빌드자</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">산출물</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">배포된 장비</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {releases.map((r) => {
                  const deployCount =
                    r.component === "SW" ? r._count.swDeploys :
                    r.component === "AI" ? r._count.aiDeploys :
                    r._count.plcDeploys;
                  return (
                    <tr key={r.id} className={`group transition-colors hover:bg-[var(--muted)]/50 ${r.isDeprecated ? "opacity-60" : ""}`}>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${componentBadge[r.component] || "bg-[var(--muted)]"}`}>
                          {r.component}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/releases/${r.id}`} className="font-mono text-sm font-semibold text-[var(--primary)] hover:underline">
                          {r.version}
                        </Link>
                        {r.isDeprecated && (
                          <span className="ml-2 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--muted-foreground)]">
                            폐기
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                        {r.modelName || <span className="text-[var(--muted-foreground)]">공통</span>}
                      </td>
                      <td className="px-6 py-4">
                        {r.releaseType ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadge[r.releaseType] || "bg-[var(--muted)]"}`}>
                            {r.releaseType}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--foreground)]">
                        {r.buildDate ? formatDate(r.buildDate) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                        {r.builder || "-"}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]" title={r.artifactPath || ""}>
                        {r.artifactName ? (
                          <span className="block max-w-[280px] truncate">{r.artifactName}</span>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                        <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs">{deployCount}대</span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/releases/${r.id}`}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--accent)]"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-[var(--muted-foreground)]">
        전체 <span className="font-medium text-[var(--foreground)]">{releases.length}</span>건
      </p>
    </div>
  );
}
