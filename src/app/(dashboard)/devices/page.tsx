import { prisma } from "@/lib/prisma";
import { DeviceTable } from "@/components/devices/device-table";
import { DeviceFilters } from "@/components/devices/device-filters";
import Link from "next/link";

interface PageProps {
  searchParams: {
    search?: string;
    model?: string;
    status?: string;
    country?: string;
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

export default async function DevicesPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const model = searchParams.model || "";
  const status = searchParams.status || "";
  const country = searchParams.country || "";
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

  const [devices, total, models, countries] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: { [sortKey]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.device.count({ where }),
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          전체 <span className="font-medium text-[var(--foreground)]">{total}</span>대의 X-ray 스캐너 장비
        </p>
        <Link
          href="/devices/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
          장비 등록
        </Link>
      </div>

      <DeviceFilters
        models={models.map((m) => m.modelName)}
        countries={countries.map((c) => c.customerCountry!)}
        currentFilters={{ search, model, status, country }}
      />

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
        const baseQs = `&search=${search}&model=${model}&status=${status}&country=${country}${sortQs}`;
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
