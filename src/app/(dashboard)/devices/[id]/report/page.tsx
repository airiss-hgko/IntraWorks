import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { PrintTrigger } from "@/components/devices/print-trigger";
import { PrintButtonClient } from "@/components/devices/print-button-client";

// 인쇄/PDF 전용 — 브라우저 print → "PDF로 저장" 으로 PDF 출력.
// /devices/[id]/report?print=1 로 열면 자동으로 인쇄 다이얼로그 띄움.

interface PageProps {
  params: { id: string };
  searchParams: { print?: string };
}

export default async function DeviceReportPage({ params, searchParams }: PageProps) {
  const id = parseInt(params.id);
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      deployHistory: {
        orderBy: { deployDate: "desc" },
        take: 5,
        include: {
          swRelease: { select: { version: true, buildDate: true } },
        },
      },
      maintenanceLogs: {
        orderBy: [{ status: "asc" }, { performedAt: "desc" }],
      },
      deploymentBundles: {
        orderBy: { bundleDate: "desc" },
        take: 1,
        include: {
          files: {
            select: { fileName: true, contentJson: true },
          },
        },
      },
    },
  });
  if (!device) notFound();

  const latestBundle = device.deploymentBundles[0];
  const dmConfigJson = latestBundle?.files.find((f) => /Config\.DM\.json$/i.test(f.fileName))?.contentJson as
    | Array<{ DetectorIndex?: number; Modules?: Array<{ High?: number; Low?: number }> }>
    | undefined;

  // DM 요약 (수직/수평 등)
  const dmSummary =
    dmConfigJson && Array.isArray(dmConfigJson)
      ? dmConfigJson.map((det) => {
          const idx = typeof det.DetectorIndex === "number" ? det.DetectorIndex : 0;
          const label = idx === 0 ? "수직" : idx === 1 ? "수평" : `Detector ${idx}`;
          const mods = det.Modules ?? [];
          const high = mods.map((m) => m.High).filter((v): v is number => typeof v === "number");
          const low = mods.map((m) => m.Low).filter((v): v is number => typeof v === "number");
          const avg = (a: number[]) => (a.length ? +(a.reduce((s, n) => s + n, 0) / a.length).toFixed(1) : 0);
          return {
            label,
            modules: mods.length,
            avgHigh: avg(high),
            avgLow: avg(low),
            rangeHigh: high.length ? `${Math.min(...high)} ~ ${Math.max(...high)}` : "-",
            rangeLow: low.length ? `${Math.min(...low)} ~ ${Math.max(...low)}` : "-",
          };
        })
      : [];

  const autoPrint = searchParams.print === "1";
  const today = formatDate(new Date());

  return (
    <>
      {autoPrint && <PrintTrigger />}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: white !important; }
          /* dashboard layout 의 사이드바·헤더 숨김 */
          aside, header { display: none !important; }
          /* lg:ml-64 등 layout 마진 제거 */
          body div.lg\\:ml-64, body div[class*="ml-"] { margin-left: 0 !important; }
          main { overflow: visible !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; max-width: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #d4d4d8 !important; break-inside: avoid; }
          .print-section { break-inside: avoid; }
          a { color: inherit !important; text-decoration: none !important; }
        }
        .print-page { color: #18181b; background: white; }
      `}</style>
      <div className="print-page mx-auto max-w-3xl space-y-5 p-6">
        {/* 인쇄 버튼 (인쇄 시 자동 숨김) */}
        <div className="no-print flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            인쇄 또는 "PDF로 저장"으로 출력하세요. 좌측 사이드바·헤더는 인쇄 시 자동 숨김 처리됩니다.
          </p>
          <PrintButtonClient />
        </div>

        {/* 표지 */}
        <header className="print-section border-b border-zinc-300 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">IntraWorks 장비 리포트</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            {device.deviceId} <span className="font-normal text-zinc-500">·</span> {device.modelName}
          </h1>
          <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-zinc-700">
            <div>S/N: <span className="font-mono">{device.serialNumber}</span></div>
            <div>상태: {device.status}</div>
            <div>고객: {device.customerName || "-"} {device.customerCountry ? `(${device.customerCountry})` : ""}</div>
            <div>설치처: {device.installLocation || "-"}</div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">발행일: {today}</p>
        </header>

        {/* 현재 버전 */}
        <section className="print-section print-card rounded-lg border border-zinc-300 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-zinc-900">현재 버전</h2>
          <table className="w-full text-sm">
            <tbody>
              <Row k="SW 버전" v={device.currentSwVersion} mono />
              <Row k="AI 버전" v={device.currentAiVersion} mono />
              <Row k="PLC 버전" v={device.currentPlcVersion} mono />
              <Row k="최근 배포일" v={device.lastDeployDate ? formatDate(device.lastDeployDate) : "-"} />
              <Row k="최근 유지보수" v={device.lastMaintenanceDate ? formatDate(device.lastMaintenanceDate) : "-"} />
              <Row k="다음 캘리브레이션" v={device.nextCalibrationDue ? formatDate(device.nextCalibrationDue) : "-"} />
            </tbody>
          </table>
        </section>

        {/* 최근 배포 이력 */}
        <section className="print-section print-card rounded-lg border border-zinc-300 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-zinc-900">
            최근 배포 이력 <span className="text-xs font-normal text-zinc-500">(최대 5건)</span>
          </h2>
          {device.deployHistory.length === 0 ? (
            <p className="text-sm text-zinc-500">기록 없음</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <Th>배포일</Th>
                  <Th>SW</Th>
                  <Th>AI</Th>
                  <Th>PLC</Th>
                  <Th>유형</Th>
                  <Th>담당</Th>
                  <Th>내용</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {device.deployHistory.map((d) => (
                  <tr key={d.id}>
                    <Td>{formatDate(d.deployDate)}</Td>
                    <Td mono>{d.swVersion || "-"}</Td>
                    <Td mono>{d.aiVersion || "-"}</Td>
                    <Td mono>{d.plcVersion || "-"}</Td>
                    <Td>{d.deployType || "-"}</Td>
                    <Td>{d.deployer || "-"}</Td>
                    <Td>{d.description || "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 최신 번들 요약 */}
        {latestBundle && (
          <section className="print-section print-card rounded-lg border border-zinc-300 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold text-zinc-900">
              최신 번들 요약 <span className="text-xs font-normal text-zinc-500">· {formatDate(latestBundle.bundleDate)}</span>
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <Row k="이미지 수" v={latestBundle.imageCount?.toLocaleString() ?? "-"} />
                <Row k="소스 ON 횟수" v={latestBundle.sourceOnCount?.toLocaleString() ?? "-"} />
                <Row k="시스템 가동" v={latestBundle.totalSystemTime ?? "-"} />
                <Row k="소스 가동" v={latestBundle.totalSourceTime ?? "-"} />
                <Row k="마지막 캘리브레이션" v={latestBundle.lastCalibrationDate ? formatDate(latestBundle.lastCalibrationDate) : "-"} />
              </tbody>
            </table>

            {dmSummary.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-zinc-700">DM 설정 요약</p>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <Th>구분</Th>
                      <Th>모듈</Th>
                      <Th>High 평균</Th>
                      <Th>High 범위</Th>
                      <Th>Low 평균</Th>
                      <Th>Low 범위</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {dmSummary.map((d, i) => (
                      <tr key={i}>
                        <Td>{d.label}</Td>
                        <Td>{d.modules}</Td>
                        <Td>{d.avgHigh}</Td>
                        <Td>{d.rangeHigh}</Td>
                        <Td>{d.avgLow}</Td>
                        <Td>{d.rangeLow}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 유지보수 이력 */}
        <section className="print-section print-card rounded-lg border border-zinc-300 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-zinc-900">
            유지보수 이력 <span className="text-xs font-normal text-zinc-500">(전체)</span>
          </h2>
          {device.maintenanceLogs.length === 0 ? (
            <p className="text-sm text-zinc-500">기록 없음</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <Th>상태</Th>
                  <Th>유형</Th>
                  <Th>수행일</Th>
                  <Th>수행자</Th>
                  <Th>다음 예정</Th>
                  <Th>비용(원)</Th>
                  <Th>내용</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {device.maintenanceLogs.map((l) => (
                  <tr key={l.id}>
                    <Td>{l.status}</Td>
                    <Td>{l.maintenanceType}</Td>
                    <Td>{formatDate(l.performedAt)}</Td>
                    <Td>{l.performedBy || "-"}</Td>
                    <Td>{l.nextDueDate ? formatDate(l.nextDueDate) : "-"}</Td>
                    <Td>{l.cost != null ? l.cost.toLocaleString() : "-"}</Td>
                    <Td>{l.description || "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 비고 */}
        {device.notes && (
          <section className="print-section print-card rounded-lg border border-zinc-300 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold text-zinc-900">비고</h2>
            <p className="whitespace-pre-line text-sm text-zinc-700">{device.notes}</p>
          </section>
        )}

        <footer className="border-t border-zinc-200 pt-3 text-center text-[10px] text-zinc-500">
          IntraWorks · 사내 통합 관리 시스템 · {today}
        </footer>
      </div>
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="w-40 py-1 text-xs text-zinc-500">{k}</td>
      <td className={`py-1 text-zinc-900 ${mono ? "font-mono text-xs" : "text-sm"}`}>{v || "-"}</td>
    </tr>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-2 py-1.5 align-top text-zinc-800 ${mono ? "font-mono text-xs" : "text-sm"}`}>{children}</td>;
}
