import { prisma } from "@/lib/prisma";
import { StatCards } from "@/components/dashboard/stat-cards";
import { RecentDeploys } from "@/components/dashboard/recent-deploys";
import { Charts } from "@/components/dashboard/charts";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { computeAlerts } from "@/lib/dashboard-alerts";

async function getDashboardData() {
  const [
    totalDevices,
    soldDevices,
    storedDevices,
    recentDeploys,
    devicesByModel,
    devicesByCountry,
  ] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: "판매완료" } }),
    prisma.device.count({ where: { status: "보관" } }),
    prisma.deployHistory.findMany({
      take: 5,
      orderBy: { deployDate: "desc" },
      include: { device: true },
    }),
    prisma.device.groupBy({
      by: ["modelName"],
      _count: { modelName: true },
    }),
    prisma.device.groupBy({
      by: ["customerCountry"],
      _count: { customerCountry: true },
    }),
  ]);

  return {
    stats: {
      total: totalDevices,
      sold: soldDevices,
      stored: storedDevices,
      // "기타" — 판매완료/보관이 아닌 모든 상태 (수리중·장비이전·폐기 등)
      other: totalDevices - soldDevices - storedDevices,
    },
    recentDeploys,
    devicesByModel: devicesByModel.map((d) => ({
      // 차트 X축은 "AIXAC-RX" 접두사 제거 (예: "AIXAC-RX6040DA" → "6040DA", "XIS-B" 는 그대로)
      name: d.modelName.replace(/^AIXAC-RX/, ""),
      count: d._count.modelName,
    })),
    devicesByCountry: devicesByCountry
      .filter((d) => d.customerCountry)
      .map((d) => ({
        name: d.customerCountry!,
        count: d._count.customerCountry,
      })),
  };
}

export default async function DashboardPage() {
  const [data, alerts] = await Promise.all([getDashboardData(), computeAlerts()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          X-ray 스캐너 장비 현황을 한눈에 확인하세요.
        </p>
      </div>

      <StatCards stats={data.stats} />

      <AlertsPanel groups={alerts.groups} total={alerts.total} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Charts
            title="모델별 장비 현황"
            data={data.devicesByModel}
            type="bar"
          />
        </div>
        <Charts
          title="국가별 분포"
          data={data.devicesByCountry}
          type="pie"
        />
      </div>

      <RecentDeploys deploys={data.recentDeploys} />
    </div>
  );
}
