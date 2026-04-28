import { prisma } from "@/lib/prisma";
import { DeviceTable } from "@/components/devices/device-table";
import { DeviceFilters } from "@/components/devices/device-filters";
import Link from "next/link";
import {
  categorizeDevice,
  SITE_CATEGORY_ORDER,
  type SiteCategory,
} from "@/lib/site-category";

interface PageProps {
  searchParams: {
    search?: string;
    model?: string;
    status?: string;
    country?: string;
    cat?: string;
    page?: string;
    sort?: string;
    dir?: string;
  };
}

const SORTABLE: Record<string, string> = {
  modelName: "modelName",
  serialNumber: "serialNumber",
  status: "status",
  customerCountry: "customerCountry",
  currentSwVersion: "currentSwVersion",
  lastDeployDate: "lastDeployDate",
};

const ALL_TABS: ("전체" | SiteCategory)[] = ["전체", ...SITE_CATEGORY_ORDER];

function isSiteCategory(v: string): v is SiteCategory {
  return (SITE_CATEGORY_ORDER as string[]).includes(v);
}

export default async function DevicesPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const model = searchParams.model || "";
  const status = searchParams.status || "";
  const country = searchParams.country || "";
  const catParam = searchParams.cat || "전체";
  const activeCat: "전체" | SiteCategory =
    catParam === "전체" || isSiteCategory(catParam) ? catParam : "전체";
  const page = parseInt(searchParams.page || "1");
  const sortKey = SORTABLE[searchParams.sort || ""] || "id";
  const sortDir = searchParams.dir === "desc" ? "desc" : "asc";
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: "insensitive" } },
      { deviceId: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (model) where.modelName = model;
  if (status) where.status = status;
  if (country) where.customerCountry = country;

  // 카테고리 분류는 정규식이라 JS 단계에서 수행 — 전체 페치 후 필터/페이지네이션
  const [allMatched, models, countries] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: { [sortKey]: sortDir },
    }),
    prisma.device.findMany({
      select: { modelName: true },
      distinct: ["modelName"],
      orderBy: { modelName: "asc" },
    }),
    prisma.device.findMany({
      select: { customerCountry: true },
      distinct: ["customerCountry"],
      where: { customerCountry: { not: null } },
      orderBy: { customerCountry: "asc" },
    }),
  ]);

  // 카테고리 카운트
  const counts: Record<string, number> = { 전체: allMatched.length };
  for (const c of SITE_CATEGORY_ORDER) counts[c] = 0;
  for (const d of allMatched) {
    counts[
      categorizeDevice({
        customerName: d.customerName,
        installLocation: d.installLocation,
        customerCountry: d.customerCountry,
      })
    ]++;
  }

  const filtered =
    activeCat === "전체"
      ? allMatched
      : allMatched.filter(
          (d) =>
            categorizeDevice({
              customerName: d.customerName,
              installLocation: d.installLocation,
              customerCountry: d.customerCountry,
            }) === activeCat
        );

  const total = filtered.length;
  const devices = filtered.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(total / limit);

  function tabHref(cat: string) {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (model) p.set("model", model);
    if (status) p.set("status", status);
    if (country) p.set("country", country);
    if (searchParams.sort) {
      p.set("sort", searchParams.sort);
      p.set("dir", sortDir);
    }
    if (cat !== "전체") p.set("cat", cat);
    const qs = p.toString();
    return `/devices${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          전체{" "}
          <span className="font-medium text-[var(--foreground)]">{allMatched.length}</span>
          대의 X-ray 스캐너 장비
        </p>
        <Link
          href="/devices/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          장비 등록
        </Link>
      </div>

      <DeviceFilters
        models={models.map((m) => m.modelName)}
        countries={countries.map((c) => c.customerCountry!)}
        currentFilters={{ search, model, status, country }}
      />

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="장비 분류"
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

      <DeviceTable
        devices={devices}
        sort={searchParams.sort || ""}
        dir={sortDir}
        currentQuery={{ search, model, status, country }}
      />

      {/* Pagination */}
      {(totalPages > 1 || total > 0) && (() => {
        const sortQs = searchParams.sort
          ? `&sort=${searchParams.sort}&dir=${sortDir}`
          : "";
        const catQs = activeCat !== "전체" ? `&cat=${activeCat}` : "";
        const baseQs = `&search=${search}&model=${model}&status=${status}&country=${country}${catQs}${sortQs}`;
        return (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              {total > 0 && (
                <>
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
                </>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {page > 1 && (
                  <Link
                    href={`/devices?page=${page - 1}${baseQs}`}
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
                  >
                    이전
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/devices?page=${p}${baseQs}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 ${
                      p === page
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link
                    href={`/devices?page=${page + 1}${baseQs}`}
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
                  >
                    다음
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
