import { prisma } from "@/lib/prisma";
import { MaintenancePageClient } from "@/components/maintenance/maintenance-page-client";

interface PageProps {
  searchParams: {
    type?: string;
    status?: string;
    deviceId?: string;
    search?: string;
    from?: string;
    to?: string;
  };
}

const TYPES = ["캘리브레이션", "소스교체", "검출기교체", "SW업데이트", "점검", "기타"];
const STATUSES = ["예정", "진행중", "완료", "취소"];

export default async function MaintenancePage({ searchParams }: PageProps) {
  const filters = {
    type: searchParams.type || "",
    status: searchParams.status || "",
    deviceId: searchParams.deviceId || "",
    search: searchParams.search || "",
    from: searchParams.from || "",
    to: searchParams.to || "",
  };

  const where: Record<string, unknown> = {};
  if (filters.type) where.maintenanceType = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.deviceId) where.deviceId = parseInt(filters.deviceId);
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.gte = new Date(filters.from);
    if (filters.to) range.lte = new Date(filters.to);
    where.performedAt = range;
  }
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { performedBy: { contains: filters.search, mode: "insensitive" } },
      { device: { serialNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [logs, devices] = await Promise.all([
    prisma.maintenanceLog.findMany({
      where,
      include: {
        device: { select: { id: true, productName: true, modelName: true, serialNumber: true } },
      },
      orderBy: [{ status: "asc" }, { performedAt: "desc" }],
    }),
    prisma.device.findMany({
      select: { id: true, productName: true, modelName: true, serialNumber: true },
      orderBy: { productName: "asc" },
    }),
  ]);

  // Date 객체를 ISO 문자열로 변환해 클라이언트로 안전하게 전달
  const logRows = logs.map((l) => ({
    ...l,
    performedAt: l.performedAt.toISOString(),
    nextDueDate: l.nextDueDate ? l.nextDueDate.toISOString() : null,
  }));

  return (
    <MaintenancePageClient
      devices={devices}
      logs={logRows}
      filters={filters}
      types={TYPES}
      statuses={STATUSES}
    />
  );
}
