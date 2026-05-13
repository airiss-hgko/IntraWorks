// 대시보드 "점검 필요" 알림 계산 — 데이터 품질·이상 감지용.
// 실시간 모니터링이 아니라, 납품/유지보수 시 들어온 데이터를 검토해서
// "지금 누가 봐줘야 하는 항목"을 끌어올린다.

import { prisma } from "@/lib/prisma";

const INTENSITY_DELTA_PERCENT = 20; // 모델 평균 대비 ±20% 이상이면 이상치
const STALE_MONTHS = 6;             // 판매완료 후 마지막 배포로부터 N개월 이상이면 "장기 미갱신"

export type AlertSeverity = "info" | "warn" | "high";

export interface AlertItem {
  category:
    | "missing_bundle"           // 번들 한 번도 캡처 안 됨
    | "missing_deploy"           // 배포 이력 없는데 판매완료
    | "unregistered_release"     // 깔린 SW 버전이 릴리스 카탈로그에 없음
    | "stale_deploy"             // 마지막 배포로부터 6개월+
    | "intensity_anomaly";       // 같은 모델 평균 대비 인텐시티 크게 벗어남
  severity: AlertSeverity;
  title: string;
  detail?: string;
  href?: string;                 // 클릭 시 이동할 경로
}

export interface AlertGroup {
  category: AlertItem["category"];
  label: string;
  items: AlertItem[];
}

const CATEGORY_LABEL: Record<AlertItem["category"], string> = {
  missing_bundle: "번들 없음",
  missing_deploy: "배포 이력 없음 (판매완료)",
  unregistered_release: "미등록 SW 버전 사용 중",
  stale_deploy: `마지막 배포 후 ${STALE_MONTHS}개월+`,
  intensity_anomaly: `DM 설정 이상치 (모델 평균 대비 ±${INTENSITY_DELTA_PERCENT}%↑)`,
};

function shortModel(m: string) {
  return m.replace(/^AIXAC-RX/, "");
}

export async function computeAlerts(): Promise<{ groups: AlertGroup[]; total: number }> {
  const items: AlertItem[] = [];

  const devices = await prisma.device.findMany({
    select: {
      id: true,
      deviceId: true,
      modelName: true,
      serialNumber: true,
      status: true,
      currentSwVersion: true,
      _count: { select: { deployHistory: true, deploymentBundles: true } },
      deployHistory: { select: { deployDate: true }, orderBy: { deployDate: "desc" }, take: 1 },
    },
  });

  // 미등록 SW 버전 lookup용 — 현재 운영 중인 SW 릴리스 버전 집합
  const releases = await prisma.release.findMany({
    where: { component: "SW" },
    select: { version: true },
  });
  const releaseVersions = new Set(releases.map((r) => r.version));

  // 인텐시티 모델별 통계
  const bundles = await prisma.deploymentBundle.findMany({
    select: {
      id: true,
      deviceId: true,
      bundleDate: true,
      intensityAvgHigh: true,
      device: { select: { id: true, deviceId: true, modelName: true } },
    },
    orderBy: { bundleDate: "desc" },
  });

  // 각 장비의 최신 번들만
  const latestBundlePerDevice = new Map<number, (typeof bundles)[number]>();
  for (const b of bundles) {
    if (!latestBundlePerDevice.has(b.deviceId)) latestBundlePerDevice.set(b.deviceId, b);
  }
  // 모델별 High 평균 (최신 번들들로 계산)
  const modelStats = new Map<string, number[]>();
  for (const b of latestBundlePerDevice.values()) {
    if (b.intensityAvgHigh == null) continue;
    const key = b.device.modelName;
    if (!modelStats.has(key)) modelStats.set(key, []);
    modelStats.get(key)!.push(b.intensityAvgHigh);
  }
  const modelMean = new Map<string, number>();
  for (const [k, arr] of modelStats) {
    if (arr.length === 0) continue;
    modelMean.set(k, arr.reduce((s, n) => s + n, 0) / arr.length);
  }

  // 1) 번들 없음 — 판매완료/장비이전 장비만 (보관 중인 장비는 무시)
  for (const d of devices) {
    if (d._count.deploymentBundles > 0) continue;
    if (d.status === "보관" || d.status === "폐기") continue;
    items.push({
      category: "missing_bundle",
      severity: "warn",
      title: `${d.deviceId} (${shortModel(d.modelName)})`,
      detail: `S/N ${d.serialNumber} · ${d.status} · 번들 0건`,
      href: `/devices/${d.id}`,
    });
  }

  // 2) 배포 이력 없음 (판매완료인데)
  for (const d of devices) {
    if (d.status !== "판매완료") continue;
    if (d._count.deployHistory > 0) continue;
    items.push({
      category: "missing_deploy",
      severity: "warn",
      title: `${d.deviceId} (${shortModel(d.modelName)})`,
      detail: `S/N ${d.serialNumber} · 판매완료 · 배포 0건`,
      href: `/devices/${d.id}`,
    });
  }

  // 3) 미등록 SW 버전
  for (const d of devices) {
    if (!d.currentSwVersion) continue;
    if (releaseVersions.has(d.currentSwVersion)) continue;
    items.push({
      category: "unregistered_release",
      severity: "info",
      title: `${d.deviceId} — ${d.currentSwVersion}`,
      detail: `${shortModel(d.modelName)} · 릴리스 카탈로그에 없음`,
      href: `/releases/new?version=${encodeURIComponent(d.currentSwVersion)}`,
    });
  }

  // 4) 장기 미갱신 (판매완료, 마지막 배포 N개월+)
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - STALE_MONTHS);
  for (const d of devices) {
    if (d.status !== "판매완료") continue;
    const last = d.deployHistory[0]?.deployDate;
    if (!last) continue; // 배포 0건은 위에서 잡힘
    if (last >= cutoff) continue;
    items.push({
      category: "stale_deploy",
      severity: "info",
      title: `${d.deviceId} (${shortModel(d.modelName)})`,
      detail: `마지막 배포: ${last.toISOString().slice(0, 10)}`,
      href: `/devices/${d.id}`,
    });
  }

  // 5) 인텐시티 이상치 — 같은 모델 평균 대비 ±20% 이상
  for (const b of latestBundlePerDevice.values()) {
    if (b.intensityAvgHigh == null) continue;
    const mean = modelMean.get(b.device.modelName);
    if (mean == null || mean === 0) continue;
    const deltaPct = Math.abs((b.intensityAvgHigh - mean) / mean) * 100;
    if (deltaPct < INTENSITY_DELTA_PERCENT) continue;
    items.push({
      category: "intensity_anomaly",
      severity: "high",
      title: `${b.device.deviceId} (${shortModel(b.device.modelName)})`,
      detail: `최근 번들 High 평균 ${b.intensityAvgHigh.toFixed(1)} · 모델 평균 ${mean.toFixed(1)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(0)}%)`,
      href: `/bundles/${b.id}`,
    });
  }

  // 그룹핑
  const groupsByCat = new Map<AlertItem["category"], AlertItem[]>();
  for (const it of items) {
    if (!groupsByCat.has(it.category)) groupsByCat.set(it.category, []);
    groupsByCat.get(it.category)!.push(it);
  }

  // 출력 순서 (severity 영향력 큰 것 우선)
  const order: AlertItem["category"][] = [
    "intensity_anomaly",
    "missing_bundle",
    "missing_deploy",
    "unregistered_release",
    "stale_deploy",
  ];

  const groups: AlertGroup[] = [];
  for (const cat of order) {
    const arr = groupsByCat.get(cat);
    if (!arr || arr.length === 0) continue;
    groups.push({ category: cat, label: CATEGORY_LABEL[cat], items: arr });
  }

  return { groups, total: items.length };
}
