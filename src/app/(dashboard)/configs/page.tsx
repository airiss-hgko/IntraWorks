import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ConfigFilters } from "@/components/configs/config-filters";
import { configSourceStyles } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";

interface PageProps {
  searchParams: {
    search?: string;
    deviceId?: string;
    triggerType?: string;
    page?: string;
  };
}

export default async function ConfigsPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const deviceId = searchParams.deviceId || "";
  const triggerType = searchParams.triggerType || "";
  const page = parseInt(searchParams.page || "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (deviceId) where.deviceId = parseInt(deviceId);
  if (triggerType) where.triggerType = triggerType;
  if (search) {
    where.OR = [
      { device: { serialNumber: { contains: search, mode: "insensitive" } } },
      { device: { productName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [configs, total, devices, types] = await Promise.all([
    prisma.configSnapshot.findMany({
      where,
      include: {
        device: {
          select: { id: true, productName: true, modelName: true, serialNumber: true },
        },
      },
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.configSnapshot.count({ where }),
    prisma.device.findMany({
      select: { id: true, productName: true, serialNumber: true },
      orderBy: { productName: "asc" },
    }),
    prisma.configSnapshot.findMany({
      select: { triggerType: true },
      distinct: ["triggerType"],
      where: { triggerType: { not: null } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Config 관리</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            장비별 설정 파일(Config)을 업로드하고 비교합니다.
          </p>
        </div>
        <Link
          href="/configs/upload"
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Config 업로드
        </Link>
      </div>

      <ConfigFilters
        devices={devices}
        triggerTypes={types.map((t) => t.triggerType!).filter(Boolean)}
        currentFilters={{ search, deviceId, triggerType }}
      />

      {configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted-foreground)]" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--muted-foreground)]">
            업로드된 Config가 없습니다.
          </p>
          <Link href="/configs/upload" className="mt-2 text-sm text-[var(--primary)] hover:underline">
            Config 업로드하기
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Config 파일 목록</caption>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">장비</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">모델</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">소스</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Config Ver.</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">SW</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">캡처일</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">업로드일</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {configs.map((config) => (
                  <tr key={config.id} className="group transition-colors hover:bg-[var(--muted)]/50">
                    <td className="px-6 py-4">
                      <Link href={`/configs/${config.id}`} className="text-sm font-semibold text-[var(--primary)] hover:underline">
                        {config.device.productName}
                      </Link>
                      <span className="ml-2 rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                        {config.device.serialNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--foreground)]">{config.device.modelName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${configSourceStyles[config.triggerType || ""] || "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                        {config.triggerType || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                      v{config.configVersion || "-"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--muted-foreground)]">
                      {config.swVersion || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--foreground)]">
                      {formatDate(config.capturedAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted-foreground)]">
                      {formatDate(config.uploadedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/configs/${config.id}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--accent)]"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          전체 <span className="font-medium text-[var(--foreground)]">{total}</span>건
          {total > 0 && (<> ({(page - 1) * limit + 1}-{Math.min(page * limit, total)})</>)}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/configs?page=${p}&search=${search}&deviceId=${deviceId}&triggerType=${triggerType}`}
                aria-current={p === page ? "page" : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 ${
                  p === page ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
