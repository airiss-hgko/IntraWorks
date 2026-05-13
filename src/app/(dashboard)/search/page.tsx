import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/format";

interface PageProps {
  searchParams: { q?: string };
}

const RESULT_LIMIT_PER_GROUP = 30;

export default async function SearchPage({ searchParams }: PageProps) {
  const q = (searchParams.q || "").trim();

  if (!q) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--foreground)]">통합 검색</h1>
        <p className="text-sm text-[var(--muted-foreground)]">상단 검색창에 키워드를 입력하세요.</p>
      </div>
    );
  }

  const ci = { contains: q, mode: "insensitive" as const };

  const [devices, releases, deploys, bundles, maintenance] = await Promise.all([
    prisma.device.findMany({
      where: {
        OR: [
          { deviceId: ci },
          { serialNumber: ci },
          { productName: ci },
          { modelName: ci },
          { customerName: ci },
          { customerCountry: ci },
          { installLocation: ci },
          { currentSwVersion: ci },
          { currentAiVersion: ci },
          { currentPlcVersion: ci },
          { notes: ci },
        ],
      },
      orderBy: { id: "asc" },
      take: RESULT_LIMIT_PER_GROUP,
    }),
    prisma.release.findMany({
      where: {
        component: "SW",
        OR: [
          { version: ci },
          { artifactName: ci },
          { changelog: ci },
          { builder: ci },
          { jiraDevKey: ci },
          { jiraQmKey: ci },
          { jiraFixVersion: ci },
        ],
      },
      orderBy: [{ buildDate: "desc" }, { id: "desc" }],
      take: RESULT_LIMIT_PER_GROUP,
    }),
    prisma.deployHistory.findMany({
      where: {
        OR: [
          { swVersion: ci },
          { aiVersion: ci },
          { plcVersion: ci },
          { deployer: ci },
          { receiver: ci },
          { description: ci },
          { installLocation: ci },
          { device: { serialNumber: ci } },
          { device: { deviceId: ci } },
        ],
      },
      include: { device: { select: { id: true, deviceId: true, modelName: true, serialNumber: true } } },
      orderBy: { deployDate: "desc" },
      take: RESULT_LIMIT_PER_GROUP,
    }),
    prisma.deploymentBundle.findMany({
      where: {
        OR: [
          { device: { deviceId: ci } },
          { device: { serialNumber: ci } },
          { device: { modelName: ci } },
          { uploadedBy: ci },
          { notes: ci },
        ],
      },
      include: { device: { select: { id: true, deviceId: true, modelName: true, serialNumber: true } } },
      orderBy: { bundleDate: "desc" },
      take: RESULT_LIMIT_PER_GROUP,
    }),
    prisma.maintenanceLog.findMany({
      where: {
        OR: [
          { description: ci },
          { performedBy: ci },
          { maintenanceType: ci },
          { device: { deviceId: ci } },
          { device: { serialNumber: ci } },
        ],
      },
      include: { device: { select: { id: true, deviceId: true, modelName: true, serialNumber: true } } },
      orderBy: { performedAt: "desc" },
      take: RESULT_LIMIT_PER_GROUP,
    }),
  ]);

  const totalCount =
    devices.length + releases.length + deploys.length + bundles.length + maintenance.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">검색 결과</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          &quot;<span className="font-mono text-[var(--foreground)]">{q}</span>&quot; 결과 {totalCount}건 (각 카테고리 최대 {RESULT_LIMIT_PER_GROUP}건)
        </p>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center text-sm text-[var(--muted-foreground)]">
          일치하는 결과가 없습니다.
        </div>
      ) : (
        <>
          <Group title="장비" count={devices.length}>
            {devices.map((d) => (
              <ResultRow
                key={d.id}
                href={`/devices/${d.id}`}
                title={`${d.deviceId} · ${d.modelName}`}
                meta={`${d.serialNumber}${d.customerName ? ` · ${d.customerName}` : ""}${d.customerCountry ? ` (${d.customerCountry})` : ""}`}
                aside={d.status}
              />
            ))}
          </Group>

          <Group title="릴리스" count={releases.length}>
            {releases.map((r) => (
              <ResultRow
                key={r.id}
                href={`/releases/${r.id}`}
                title={r.version}
                meta={`${r.releaseType || "정식"}${r.buildDate ? ` · ${formatDate(r.buildDate)}` : ""}${r.builder ? ` · ${r.builder}` : ""}`}
                aside={r.isDeprecated ? "폐기" : undefined}
                mono
              />
            ))}
          </Group>

          <Group title="배포 이력" count={deploys.length}>
            {deploys.map((d) => (
              <ResultRow
                key={d.id}
                href={`/devices/${d.device.id}`}
                title={`${d.device.deviceId} · ${formatDate(d.deployDate)}`}
                meta={[d.swVersion && `SW ${d.swVersion}`, d.deployer, d.installLocation, d.description]
                  .filter(Boolean)
                  .join(" · ")}
                aside={d.deployType || undefined}
                mono
              />
            ))}
          </Group>

          <Group title="배포 번들" count={bundles.length}>
            {bundles.map((b) => (
              <ResultRow
                key={b.id}
                href={`/bundles/${b.id}`}
                title={`${b.device.deviceId} · ${formatDate(b.bundleDate)}`}
                meta={`${b.device.modelName} (${b.device.serialNumber})${b.uploadedBy ? ` · ${b.uploadedBy}` : ""}`}
              />
            ))}
          </Group>

          <Group title="유지보수" count={maintenance.length}>
            {maintenance.map((m) => (
              <ResultRow
                key={m.id}
                href={`/devices/${m.device.id}`}
                title={`${m.device.deviceId} · ${m.maintenanceType}`}
                meta={`${formatDate(m.performedAt)}${m.performedBy ? ` · ${m.performedBy}` : ""}${m.description ? ` · ${m.description}` : ""}`}
                aside={m.status}
              />
            ))}
          </Group>
        </>
      )}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">{count}</span>
      </div>
      <ul className="divide-y divide-[var(--border)]">{children}</ul>
    </section>
  );
}

function ResultRow({
  href, title, meta, aside, mono,
}: { href: string; title: string; meta?: string; aside?: string; mono?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-[var(--muted)]/40">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium text-[var(--primary)] ${mono ? "font-mono" : ""}`}>{title}</p>
          {meta && <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{meta}</p>}
        </div>
        {aside && (
          <span className="shrink-0 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            {aside}
          </span>
        )}
      </Link>
    </li>
  );
}
