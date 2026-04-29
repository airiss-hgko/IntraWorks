import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { ReleaseActions } from "@/components/releases/release-actions";

interface PageProps {
  params: { id: string };
}

const componentBadge: Record<string, string> = {
  SW: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  AI: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  PLC: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export default async function ReleaseDetailPage({ params }: PageProps) {
  const id = parseInt(params.id);
  const release = await prisma.release.findUnique({ where: { id } });
  if (!release) notFound();

  const deploysSelect = {
    id: true,
    deployDate: true,
    deployer: true,
    description: true,
    installLocation: true,
    device: { select: { id: true, serialNumber: true, deviceId: true, modelName: true, customerName: true } },
  } as const;

  const deploys =
    release.component === "SW"
      ? await prisma.deployHistory.findMany({ where: { swReleaseId: id }, select: deploysSelect, orderBy: { deployDate: "desc" } })
      : release.component === "AI"
      ? await prisma.deployHistory.findMany({ where: { aiReleaseId: id }, select: deploysSelect, orderBy: { deployDate: "desc" } })
      : await prisma.deployHistory.findMany({ where: { plcReleaseId: id }, select: deploysSelect, orderBy: { deployDate: "desc" } });

  return (
    <div className="space-y-6">
      {/* 상단 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/releases"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            릴리스 목록
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${componentBadge[release.component] || "bg-[var(--muted)]"}`}>
              {release.component}
            </span>
            <h1 className="font-mono text-2xl font-bold text-[var(--foreground)]">{release.version}</h1>
            {release.modelName && (
              <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-sm text-[var(--muted-foreground)]">
                {release.modelName}
              </span>
            )}
            {release.isDeprecated && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                폐기됨
              </span>
            )}
          </div>
        </div>
        <ReleaseActions releaseId={release.id} isDeprecated={release.isDeprecated} />
      </div>

      {/* 메타 정보 */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:grid-cols-4">
        <Field label="유형" value={release.releaseType || "-"} />
        <Field label="모델" value={release.modelName || "공통"} />
        <Field label="빌드일" value={release.buildDate ? formatDate(release.buildDate) : "-"} />
        <Field label="빌드자" value={release.builder || "-"} />
        <Field label="산출물 파일명" value={release.artifactName || "-"} mono />
        <Field label="저장 경로" value={release.artifactPath || "-"} mono span={3} />
        <Field label="SHA256" value={release.artifactSha256 || "-"} mono span={4} />
      </div>

      {/* 변경요약 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">변경요약</h2>
        {release.changelog ? (
          <pre className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">{release.changelog}</pre>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">등록된 변경요약이 없습니다.</p>
        )}
      </div>

      {/* 배포된 장비 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            이 릴리스로 배포된 장비
            <span className="ml-2 rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">{deploys.length}건</span>
          </h2>
        </div>
        {deploys.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">아직 이 릴리스로 배포된 장비가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">배포일</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">장비 (S/N)</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">모델</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">설치처</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">담당</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {deploys.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--muted)]/50">
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--foreground)]">{formatDate(d.deployDate)}</td>
                    <td className="px-6 py-3">
                      <Link href={`/devices/${d.device.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                        {d.device.serialNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--foreground)]">{d.device.modelName}</td>
                    <td className="px-6 py-3 text-sm text-[var(--foreground)]">{d.installLocation || d.device.customerName || "-"}</td>
                    <td className="px-6 py-3 text-sm text-[var(--foreground)]">{d.deployer || "-"}</td>
                    <td className="px-6 py-3 text-sm text-[var(--muted-foreground)]">{d.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono, span = 1 }: { label: string; value: string; mono?: boolean; span?: 1 | 2 | 3 | 4 }) {
  const colSpan = span === 4 ? "md:col-span-4" : span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  return (
    <div className={colSpan}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</dt>
      <dd className={`mt-1 break-all text-sm ${mono ? "font-mono" : ""} text-[var(--foreground)]`}>{value}</dd>
    </div>
  );
}
