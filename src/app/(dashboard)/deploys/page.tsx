import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeployFilters } from "@/components/deploys/deploy-filters";
import {
  DeployGroupedTable,
  type DeployRow,
} from "@/components/deploys/deploy-grouped-table";
import {
  categorizeSite,
  SITE_CATEGORY_ORDER,
  type SiteCategory,
} from "@/lib/site-category";

interface PageProps {
  searchParams: {
    search?: string;
    model?: string;
    deployType?: string;
    cat?: string;
  };
}

const ALL_TABS: ("전체" | SiteCategory)[] = ["전체", ...SITE_CATEGORY_ORDER];

function isSiteCategory(v: string): v is SiteCategory {
  return (SITE_CATEGORY_ORDER as string[]).includes(v);
}

export default async function DeploysPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const model = searchParams.model || "";
  const deployType = searchParams.deployType || "";
  const catParam = searchParams.cat || "전체";
  const activeCat: "전체" | SiteCategory =
    catParam === "전체" || isSiteCategory(catParam) ? catParam : "전체";

  // 검색/모델/유형 필터는 DB level
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { device: { serialNumber: { contains: search, mode: "insensitive" } } },
      { device: { productName: { contains: search, mode: "insensitive" } } },
      { deployer: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { installLocation: { contains: search, mode: "insensitive" } },
    ];
  }
  if (model) {
    where.device = { ...((where.device as object) || {}), modelName: model };
  }
  if (deployType) {
    where.deployType = deployType;
  }

  const [allDeploys, models, types] = await Promise.all([
    prisma.deployHistory.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            productName: true,
            modelName: true,
            serialNumber: true,
            customerCountry: true,
          },
        },
      },
      orderBy: { deployDate: "desc" },
    }),
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

  // 카테고리별 카운트
  const counts: Record<string, number> = { 전체: allDeploys.length };
  for (const c of SITE_CATEGORY_ORDER) counts[c] = 0;
  for (const d of allDeploys) {
    counts[categorizeSite(d.installLocation, d.device.customerCountry)]++;
  }

  const visibleDeploys: DeployRow[] =
    activeCat === "전체"
      ? allDeploys
      : allDeploys.filter(
          (d) =>
            categorizeSite(d.installLocation, d.device.customerCountry) ===
            activeCat
        );

  function tabHref(cat: string) {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (model) p.set("model", model);
    if (deployType) p.set("deployType", deployType);
    if (cat !== "전체") p.set("cat", cat);
    const qs = p.toString();
    return `/deploys${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          전체{" "}
          <span className="font-medium text-[var(--foreground)]">
            {allDeploys.length}
          </span>
          건의 배포 기록
        </p>
        <Link
          href="/deploys/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          배포 등록
        </Link>
      </div>

      <DeployFilters
        models={models.map((m) => m.modelName)}
        deployTypes={types.map((t) => t.deployType!).filter(Boolean)}
        currentFilters={{ search, model, deployType }}
      />

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="배포 이력 분류"
        className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]"
      >
        {ALL_TABS.map((tab) => {
          const isActive = activeCat === tab;
          const count = counts[tab] ?? 0;
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              role="tab"
              aria-selected={isActive}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 ${
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab}
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {count}
              </span>
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--primary)]" />
              )}
            </Link>
          );
        })}
      </div>

      <DeployGroupedTable deploys={visibleDeploys} category={activeCat} />
    </div>
  );
}
