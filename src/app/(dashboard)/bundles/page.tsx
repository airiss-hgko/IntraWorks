import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { BundleUploaderEditable } from "@/components/bundles/bundle-uploader-editable";

interface PageProps {
  searchParams: { search?: string; deviceId?: string; model?: string };
}

export default async function BundlesPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const deviceIdParam = searchParams.deviceId || "";
  const modelParam = searchParams.model || "";

  const where: Record<string, unknown> = {};
  if (deviceIdParam) where.deviceId = parseInt(deviceIdParam);
  if (modelParam) where.device = { modelName: modelParam };
  if (search) {
    const searchOr = [
      { device: { serialNumber: { contains: search, mode: "insensitive" } } },
      { device: { modelName: { contains: search, mode: "insensitive" } } },
      { device: { productName: { contains: search, mode: "insensitive" } } },
    ];
    where.OR = searchOr;
  }

  const [bundles, devices, modelGroups] = await Promise.all([
    prisma.deploymentBundle.findMany({
      where,
      include: {
        device: { select: { id: true, productName: true, modelName: true, serialNumber: true, deviceId: true } },
        _count: { select: { files: true } },
      },
      orderBy: [{ bundleDate: "desc" }, { id: "desc" }],
    }),
    prisma.device.findMany({
      select: { id: true, modelName: true, serialNumber: true },
      orderBy: [{ modelName: "asc" }, { serialNumber: "asc" }],
    }),
    prisma.device.findMany({
      select: { modelName: true },
      distinct: ["modelName"],
      orderBy: { modelName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">배포 번들</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            납품 시 캡처한 Config / DM Setting 폴더 묶음.
          </p>
        </div>
        <Link
          href="/bundles/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          폴더 업로드
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <form className="flex flex-col gap-3 p-4 md:flex-row md:items-center" method="get">
          <div className="relative w-full md:w-80">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="모델, S/N, 제품명 검색…"
              className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] py-2 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <select
            name="model"
            defaultValue={modelParam}
            className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">모델 전체</option>
            {modelGroups.map((m) => (
              <option key={m.modelName} value={m.modelName}>{m.modelName}</option>
            ))}
          </select>
          <select
            name="deviceId"
            defaultValue={deviceIdParam}
            className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">장비 전체</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.modelName} ({d.serialNumber})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:opacity-90 md:ml-auto"
          >
            적용
          </button>
        </form>
      </div>

      {bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">등록된 번들이 없습니다.</p>
          <Link href="/bundles/new" className="mt-2 text-sm text-[var(--primary)] hover:underline">
            첫 폴더 업로드하기
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">배포 번들 목록</caption>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">번들 일자</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">모델</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">장비</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">시스템 가동</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">소스 ON</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">등록자</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {bundles.map((b) => (
                  <tr key={b.id} className="group transition-colors hover:bg-[var(--muted)]/50">
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm font-medium text-[var(--foreground)]">
                      <Link href={`/bundles/${b.id}`} className="text-[var(--primary)] hover:underline">
                        {formatDate(b.bundleDate)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground)]">
                      {b.device.modelName}
                    </td>
                    <td className="px-6 py-3.5">
                      <Link href={`/devices/${b.device.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                        {b.device.deviceId}
                      </Link>
                      <span className="ml-2 rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                        {b.device.serialNumber}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs text-[var(--foreground)]">
                      {b.totalSystemTime || "-"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-[var(--foreground)]">
                      {b.sourceOnCount != null ? b.sourceOnCount.toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-[var(--foreground)]">
                      <BundleUploaderEditable bundleId={b.id} value={b.uploadedBy} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/bundles/${b.id}`} className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--accent)]">
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

      <p className="text-sm text-[var(--muted-foreground)]">
        전체 <span className="font-medium text-[var(--foreground)]">{bundles.length}</span>건
      </p>
    </div>
  );
}
