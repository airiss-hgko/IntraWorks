import { prisma } from "@/lib/prisma";
import { StatCards } from "@/components/dashboard/stat-cards";
import { RecentDeploys } from "@/components/dashboard/recent-deploys";
import { Charts } from "@/components/dashboard/charts";

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
      repairing: totalDevices - soldDevices - storedDevices,
    },
    recentDeploys,
    devicesByModel: devicesByModel.map((d) => ({
      name: d.modelName,
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
  const data = await getDashboardData();

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
