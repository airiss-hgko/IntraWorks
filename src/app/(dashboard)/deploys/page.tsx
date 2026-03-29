import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeployFilters } from "@/components/deploys/deploy-filters";

interface PageProps {
  searchParams: {
    search?: string;
    model?: string;
    deployType?: string;
    page?: string;
  };
}

const typeStyles: Record<string, string> = {
  신규설치:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  업데이트:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  유지보수:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  긴급패치:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
};

export default async function DeploysPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const model = searchParams.model || "";
  const deployType = searchParams.deployType || "";
  const page = parseInt(searchParams.page || "1");
  const limit = 20;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { device: { serialNumber: { contains: search, mode: "insensitive" } } },
      { device: { productName: { contains: search, mode: "insensitive" } } },
      { deployer: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (model) {
    where.device = { ...((where.device as object) || {}), modelName: model };
  }
  if (deployType) {
    where.deployType = deployType;
  }

  const [deploys, total, models, types] = await Promise.all([
    prisma.deployHistory.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            productName: true,
            modelName: true,
            serialNumber: true,
          },
        },
      },
      orderBy: { deployDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deployHistory.count({ where }),
    prisma.device.findMany({
      select: { modelName: true },
      distinct: ["modelName"],
      orderBy: { modelName: "asc" },
    }),
    prisma.deployHistory.findMany({
      select: { deployType: true },
      distinct: ["deployType"],
      where: { deployType: { not: null } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            배포 이력
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            장비 소프트웨어 배포 이력을 조회하고 관리합니다.
          </p>
        </div>
        <Link
          href="/deploys/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
          배포 등록
        </Link>
      </div>

      <DeployFilters
        models={models.map((m) => m.modelName)}
        deployTypes={types.map((t) => t.deployType!).filter(Boolean)}
        currentFilters={{ search, model, deployType }}
      />

      {/* Table */}
      {deploys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted-foreground)]" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--muted-foreground)]">
            배포 이력이 없습니다.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    배포일
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    장비
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    모델
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    유형
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    SW
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    AI
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    PLC
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    담당자
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    설명
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {deploys.map((deploy) => (
                  <tr
                    key={deploy.id}
                    className="group transition-colors hover:bg-[var(--muted)]/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--foreground)]">
                      {new Date(deploy.deployDate).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/devices/${deploy.device.id}`}
                        className="text-sm font-semibold text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300"
                      >
                        {deploy.device.productName}
                      </Link>
                      <span className="ml-2 rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                        {deploy.device.serialNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                      {deploy.device.modelName}
                    </td>
                    <td className="px-6 py-4">
                      {deploy.deployType && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            typeStyles[deploy.deployType] || "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {deploy.deployType}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                      {deploy.swVersion || "-"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                      {deploy.aiVersion || "-"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                      {deploy.plcVersion || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">
                      {deploy.deployer || "-"}
                    </td>
                    <td className="max-w-[200px] truncate px-6 py-4 text-sm text-[var(--muted-foreground)]" title={deploy.description || ""}>
                      {deploy.description || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination — always show count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          전체 <span className="font-medium text-[var(--foreground)]">{total}</span>건
          {total > 0 && (
            <> ({(page - 1) * limit + 1}-{Math.min(page * limit, total)})</>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={`/deploys?page=${page - 1}&search=${search}&model=${model}&deployType=${deployType}`}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
              >
                이전
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/deploys?page=${p}&search=${search}&model=${model}&deployType=${deployType}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={`/deploys?page=${page + 1}&search=${search}&model=${model}&deployType=${deployType}`}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
              >
                다음
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
