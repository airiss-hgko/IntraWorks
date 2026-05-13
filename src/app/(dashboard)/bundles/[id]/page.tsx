import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { BundleUploaderEditable } from "@/components/bundles/bundle-uploader-editable";
import { CompareSelector } from "@/components/bundles/compare-selector";

interface PageProps { params: { id: string } }

interface DmModuleSummary {
  label: string;       // "수직" / "수평" / "Detector 2"
  detectorIndex: number;
  modules: number;
  avgHigh: number;
  avgLow: number;
  minHigh: number;
  maxHigh: number;
  minLow: number;
  maxLow: number;
}

function detectorLabel(idx: number): string {
  if (idx === 0) return "수직 (Vertical)";
  if (idx === 1) return "수평 (Horizontal)";
  return `Detector ${idx}`;
}

function summarizeDmPerDetector(data: unknown): DmModuleSummary[] {
  if (!Array.isArray(data)) return [];
  const out: DmModuleSummary[] = [];
  for (const det of data as Array<{ DetectorIndex?: number; Modules?: Array<{ High?: number; Low?: number }> }>) {
    if (!Array.isArray(det?.Modules)) continue;
    const high = det.Modules.map((m) => m.High).filter((v): v is number => typeof v === "number");
    const low = det.Modules.map((m) => m.Low).filter((v): v is number => typeof v === "number");
    if (high.length === 0 && low.length === 0) continue;
    const idx = typeof det.DetectorIndex === "number" ? det.DetectorIndex : out.length;
    out.push({
      label: detectorLabel(idx),
      detectorIndex: idx,
      modules: Math.max(high.length, low.length),
      avgHigh: +(high.reduce((s, n) => s + n, 0) / Math.max(high.length, 1)).toFixed(2),
      avgLow: +(low.reduce((s, n) => s + n, 0) / Math.max(low.length, 1)).toFixed(2),
      minHigh: high.length ? Math.min(...high) : 0,
      maxHigh: high.length ? Math.max(...high) : 0,
      minLow: low.length ? Math.min(...low) : 0,
      maxLow: low.length ? Math.max(...low) : 0,
    });
  }
  return out;
}

export default async function BundleDetailPage({ params }: PageProps) {
  const id = parseInt(params.id);
  const bundle = await prisma.deploymentBundle.findUnique({
    where: { id },
    include: {
      device: { select: { id: true, productName: true, modelName: true, serialNumber: true, deviceId: true, customerName: true } },
      deploy: {
        select: {
          id: true, deployDate: true, deployer: true, swVersion: true, aiVersion: true, plcVersion: true,
          swRelease: { select: { id: true, version: true } },
        },
      },
      files: {
        orderBy: [{ category: "asc" }, { fileName: "asc" }],
      },
    },
  });
  if (!bundle) notFound();

  const configFiles = bundle.files.filter((f) => f.category === "Config");
  const dmFiles = bundle.files.filter((f) => f.category === "DM");
  const dmImages = dmFiles.filter((f) => f.contentType?.startsWith("image/"));
  const dmJsons = dmFiles.filter((f) => !f.contentType?.startsWith("image/"));

  // Config.DM.json 에서 detector 별 요약 계산
  const dmConfigFile = dmJsons.find((f) => /Config\.DM\.json$/i.test(f.fileName));
  const dmSummary = dmConfigFile?.contentJson ? summarizeDmPerDetector(dmConfigFile.contentJson) : [];

  // 비교 후보: 같은 장비의 다른 번들 + 같은 모델의 다른 장비 최신 번들
  const compareCandidates = await prisma.deploymentBundle.findMany({
    where: {
      id: { not: bundle.id },
      OR: [
        { deviceId: bundle.device.id },
        { device: { modelName: bundle.device.modelName } },
      ],
    },
    select: {
      id: true,
      bundleDate: true,
      device: { select: { id: true, deviceId: true, modelName: true, serialNumber: true } },
    },
    orderBy: [{ deviceId: "asc" }, { bundleDate: "desc" }],
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bundles" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            배포 번들
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {bundle.device.deviceId} <span className="text-[var(--muted-foreground)]">·</span> {formatDate(bundle.bundleDate)}
            </h1>
            <Link
              href={`/devices/${bundle.device.id}`}
              className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            >
              {bundle.device.productName} ({bundle.device.serialNumber})
            </Link>
            {bundle.deploy && (
              <Link
                href={`/deploys`}
                className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              >
                연결된 배포: SW {bundle.deploy.swVersion || "-"}
                {bundle.deploy.swRelease && (
                  <span className="ml-1 opacity-70">(릴리스 #{bundle.deploy.swRelease.id})</span>
                )}
              </Link>
            )}
          </div>
        </div>
        <CompareSelector currentId={bundle.id} candidates={compareCandidates.map((c) => ({
          id: c.id,
          bundleDate: c.bundleDate.toISOString(),
          deviceId: c.device.deviceId,
          modelName: c.device.modelName,
          serialNumber: c.device.serialNumber,
        }))} />
      </div>

      {/* 메타 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">시스템 카운터</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="이미지 수" value={bundle.imageCount?.toLocaleString() ?? "-"} />
            <Field label="소스 ON 횟수" value={bundle.sourceOnCount?.toLocaleString() ?? "-"} />
            <Field label="시스템 가동" value={bundle.totalSystemTime || "-"} />
            <Field label="소스 가동" value={bundle.totalSourceTime || "-"} />
            <Field label="마지막 캘리브레이션" value={bundle.lastCalibrationDate ? formatDate(bundle.lastCalibrationDate) : "-"} span={2} />
            <Field label="등록자" value={<BundleUploaderEditable bundleId={bundle.id} value={bundle.uploadedBy} />} span={2} />
          </dl>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">DM 설정 요약</h2>
          {dmSummary.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Config.DM.json 이 없거나 인식되지 않았습니다.</p>
          ) : (
            <div className="space-y-4">
              {dmSummary.map((d) => (
                <div key={d.detectorIndex} className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
                  <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{d.label}</p>
                  <dl className="grid grid-cols-2 gap-2 text-xs text-[var(--foreground)]">
                    <div><dt className="text-[var(--muted-foreground)]">모듈 수</dt><dd className="font-medium">{d.modules}</dd></div>
                    <div><dt className="text-[var(--muted-foreground)]">High 평균</dt><dd className="font-medium">{d.avgHigh}</dd></div>
                    <div><dt className="text-[var(--muted-foreground)]">High 범위</dt><dd className="font-medium">{d.minHigh} ~ {d.maxHigh}</dd></div>
                    <div><dt className="text-[var(--muted-foreground)]">Low 평균</dt><dd className="font-medium">{d.avgLow}</dd></div>
                    <div className="col-span-2"><dt className="text-[var(--muted-foreground)]">Low 범위</dt><dd className="font-medium">{d.minLow} ~ {d.maxLow}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Config 파일 */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <h2 className="border-b border-[var(--border)] px-6 py-4 text-base font-semibold text-[var(--foreground)]">
          Config <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">{configFiles.length}개</span>
        </h2>
        {configFiles.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">없음</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {configFiles.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="font-mono text-sm text-[var(--foreground)]">{f.fileName}</p>
                  <p className="font-mono text-xs text-[var(--muted-foreground)]">{f.relativePath} · {(f.fileSize ?? 0).toLocaleString()} bytes</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/bundles/${bundle.id}/files/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--accent)]"
                  >
                    미리보기
                  </a>
                  <a
                    href={`/api/bundles/${bundle.id}/files/${f.id}?download=1`}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
                  >
                    다운로드
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* DM Setting */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <h2 className="border-b border-[var(--border)] px-6 py-4 text-base font-semibold text-[var(--foreground)]">
          DM Setting <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">{dmFiles.length}개</span>
        </h2>
        {dmFiles.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">없음</p>
        ) : (
          <div className="space-y-6 p-6">
            {dmJsons.length > 0 && (
              <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {dmJsons.map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-mono text-sm text-[var(--foreground)]">{f.fileName}</p>
                      <p className="font-mono text-xs text-[var(--muted-foreground)]">{(f.fileSize ?? 0).toLocaleString()} bytes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`/api/bundles/${bundle.id}/files/${f.id}`} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--accent)]">미리보기</a>
                      <a href={`/api/bundles/${bundle.id}/files/${f.id}?download=1`} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]">다운로드</a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {dmImages.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">이미지 ({dmImages.length}장)</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {dmImages.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/bundles/${bundle.id}/files/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/bundles/${bundle.id}/files/${f.id}`}
                        alt={f.fileName}
                        loading="lazy"
                        className="aspect-square w-full object-contain transition-transform group-hover:scale-105"
                      />
                      <p className="truncate border-t border-[var(--border)] px-2 py-1 font-mono text-[10px] text-[var(--muted-foreground)]" title={f.fileName}>
                        {f.fileName}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, span = 1 }: { label: string; value: React.ReactNode; span?: 1 | 2 }) {
  const cls = span === 2 ? "col-span-2" : "";
  return (
    <div className={cls}>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
