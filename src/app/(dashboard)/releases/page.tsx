import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/format";

interface PageProps {
  searchParams: {
    type?: string;
    search?: string;
    includeDeprecated?: string;
  };
}

const typeBadge: Record<string, string> = {
  정식: "bg-[var(--muted)] text-[var(--foreground)]",
  베타: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  긴급패치: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default async function ReleasesPage({ searchParams }: PageProps) {
  const type = searchParams.type || "";
  const search = searchParams.search || "";
  const includeDeprecated = searchParams.includeDeprecated === "true";

  // SW 릴리스만 노출
  const where: Record<string, unknown> = { component: "SW" };
  if (type) where.releaseType = type;
  if (!includeDeprecated) where.isDeprecated = false;
  if (search) {
    where.OR = [
      { version: { contains: search, mode: "insensitive" } },
      { artifactName: { contains: search, mode: "insensitive" } },
      { changelog: { contains: search, mode: "insensitive" } },
    ];
  }

  const releases = await prisma.release.findMany({
    where,
    orderBy: [{ buildDate: "desc" }, { id: "desc" }],
    include: {
      _count: { select: { swDeploys: true } },
      swDeploys: {
        select: { device: { select: { modelName: true } } },
      },
    },
  });

  // 각 릴리스가 배포된 모델 목록 (중복 제거)
  function deployedModels(r: (typeof releases)[number]): string[] {
    const set = new Set<string>();
    for (const d of r.swDeploys) {
      if (d.device?.modelName) set.add(d.device.modelName.replace(/^AIXAC-RX/, ""));
    }
    return Array.from(set).sort();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">릴리스</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            SW 버전업 카탈로그. 각 버전의 변경 내역과 배포된 장비를 추적합니다.
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

      {/* 필터 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <form className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center" method="get">
          <div className="relative w-full md:w-80">
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="버전, 산출물명, 변경요약 검색…"
              className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] py-2 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <select
            name="type"
            defaultValue={type}
            className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">유형 전체</option>
            <option value="정식">정식</option>
            <option value="베타">베타</option>
            <option value="긴급패치">긴급패치</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
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
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90 md:ml-auto"
          >
            적용
          </button>
        </form>
      </div>

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
              <caption className="sr-only">SW 릴리스 목록</caption>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">버전</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">유형</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">릴리스일자</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">배포된 모델</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">배포된 장비</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {releases.map((r) => {
                  const models = deployedModels(r);
                  return (
                    <tr key={r.id} className={`group transition-colors hover:bg-[var(--muted)]/50 ${r.isDeprecated ? "opacity-60" : ""}`}>
                      <td className="px-6 py-4">
                        <Link href={`/releases/${r.id}`} className="font-mono text-sm font-semibold text-[var(--primary)] hover:underline">
                          {r.version}
                        </Link>
                        {(r.jiraDevKey || r.jiraQmKey) && (
                          <span
                            className="ml-2 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            title="Jira 연결됨"
                          >
                            Jira
                          </span>
                        )}
                        {r.isDeprecated && (
                          <span className="ml-2 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--muted-foreground)]">
                            폐기
                          </span>
                        )}
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
                      <td className="px-6 py-4">
                        {models.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {models.map((m) => (
                              <span key={m} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                        <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs">{r._count.swDeploys}대</span>
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
