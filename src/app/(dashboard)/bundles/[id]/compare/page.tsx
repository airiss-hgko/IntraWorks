import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { ConfigJsonDiff } from "@/components/bundles/config-json-diff";
import { IntensityDiffChart } from "@/components/bundles/intensity-diff-chart";

interface PageProps {
  params: { id: string };
  searchParams: { to?: string };
}

async function loadBundle(id: number) {
  return prisma.deploymentBundle.findUnique({
    where: { id },
    include: {
      device: { select: { id: true, deviceId: true, modelName: true, serialNumber: true, productName: true } },
      files: {
        orderBy: [{ category: "asc" }, { fileName: "asc" }],
      },
    },
  });
}

function findConfigLocal(files: { fileName: string; contentJson: unknown }[]) {
  return files.find((f) => /Config\.local\.json$/i.test(f.fileName))?.contentJson ?? null;
}
function findSystemConfig(files: { fileName: string; contentJson: unknown }[]) {
  return files.find((f) => /SystemConfig\.json$/i.test(f.fileName))?.contentJson ?? null;
}
function findConfigDm(files: { fileName: string; contentJson: unknown }[]) {
  return files.find((f) => /Config\.DM\.json$/i.test(f.fileName))?.contentJson ?? null;
}

export default async function BundleComparePage({ params, searchParams }: PageProps) {
  const leftId = parseInt(params.id);
  const rightId = parseInt(searchParams.to || "");
  if (!rightId || isNaN(rightId)) notFound();

  const [left, right] = await Promise.all([loadBundle(leftId), loadBundle(rightId)]);
  if (!left || !right) notFound();

  const leftLabel = `${left.device.deviceId} · ${formatDate(left.bundleDate)}`;
  const rightLabel = `${right.device.deviceId} · ${formatDate(right.bundleDate)}`;

  const leftConfigLocal = findConfigLocal(left.files);
  const rightConfigLocal = findConfigLocal(right.files);
  const leftSysCfg = findSystemConfig(left.files);
  const rightSysCfg = findSystemConfig(right.files);
  const leftDm = findConfigDm(left.files);
  const rightDm = findConfigDm(right.files);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/bundles/${left.id}`} className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          번들 상세
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">번들 비교</h1>
      </div>

      {/* 헤더 카드 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BundleHead bundle={left} title="좌" />
        <BundleHead bundle={right} title="우" />
      </div>

      {/* 시스템 카운터 diff */}
      <Section title="시스템 카운터">
        <CounterCompare left={left} right={right} />
      </Section>

      {/* DM 설정 변화량 */}
      <Section title="DM 설정 변화량 (좌 − 우)" subtitle="Config.DM.json 모듈 단위. 0보다 크면 좌가 더 큼. (DM 설정은 보통 잘 안 바뀜)">
        <IntensityDiffChart
          left={leftDm as never[] | null}
          right={rightDm as never[] | null}
        />
      </Section>

      {/* Config.local.json diff */}
      <Section title="Config.local.json diff">
        {leftConfigLocal && rightConfigLocal ? (
          <ConfigJsonDiff left={leftConfigLocal} right={rightConfigLocal} leftLabel={leftLabel} rightLabel={rightLabel} />
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center text-sm text-[var(--muted-foreground)]">
            Config.local.json 이 한 쪽 또는 양쪽에 없습니다.
          </p>
        )}
      </Section>

      {/* SystemConfig.json diff (보조) */}
      <Section title="SystemConfig.json diff" subtitle="시스템 카운터 원본">
        {leftSysCfg && rightSysCfg ? (
          <ConfigJsonDiff left={leftSysCfg} right={rightSysCfg} leftLabel={leftLabel} rightLabel={rightLabel} />
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center text-sm text-[var(--muted-foreground)]">
            SystemConfig.json 이 한 쪽 또는 양쪽에 없습니다.
          </p>
        )}
      </Section>
    </div>
  );
}

function BundleHead({ bundle, title }: { bundle: Awaited<ReturnType<typeof loadBundle>>; title: string }) {
  if (!bundle) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{title}</p>
      <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
        {bundle.device.deviceId} <span className="text-sm font-normal text-[var(--muted-foreground)]">· {formatDate(bundle.bundleDate)}</span>
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        {bundle.device.modelName} · {bundle.device.serialNumber}
      </p>
      <Link href={`/bundles/${bundle.id}`} className="mt-2 inline-block text-xs text-[var(--primary)] hover:underline">
        번들 상세 →
      </Link>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

type Bun = NonNullable<Awaited<ReturnType<typeof loadBundle>>>;

function CounterCompare({ left, right }: { left: Bun; right: Bun }) {
  const rows: Array<{ label: string; l: string | number | null; r: string | number | null; delta?: string }> = [
    { label: "이미지 수", l: left.imageCount, r: right.imageCount, delta: deltaNum(left.imageCount, right.imageCount) },
    { label: "소스 ON 횟수", l: left.sourceOnCount, r: right.sourceOnCount, delta: deltaNum(left.sourceOnCount, right.sourceOnCount) },
    { label: "시스템 가동", l: left.totalSystemTime, r: right.totalSystemTime },
    { label: "소스 가동", l: left.totalSourceTime, r: right.totalSourceTime },
    { label: "마지막 캘리브레이션", l: left.lastCalibrationDate ? formatDate(left.lastCalibrationDate) : null, r: right.lastCalibrationDate ? formatDate(right.lastCalibrationDate) : null },
  ];
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[var(--border)]">
          <th className="px-3 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">항목</th>
          <th className="px-3 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">좌</th>
          <th className="px-3 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">우</th>
          <th className="px-3 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">차이 (좌−우)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="px-3 py-2 text-[var(--muted-foreground)]">{r.label}</td>
            <td className="px-3 py-2 font-medium text-[var(--foreground)]">{r.l ?? "-"}</td>
            <td className="px-3 py-2 font-medium text-[var(--foreground)]">{r.r ?? "-"}</td>
            <td className="px-3 py-2 font-mono text-xs text-[var(--foreground)]">{r.delta ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function deltaNum(a: number | null, b: number | null): string | undefined {
  if (a == null || b == null) return undefined;
  const d = a - b;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toLocaleString()}`;
}
