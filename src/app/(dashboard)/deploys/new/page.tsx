import { prisma } from "@/lib/prisma";
import { DeployForm } from "@/components/deploys/deploy-form";
import Link from "next/link";

interface PageProps {
  searchParams: {
    deviceId?: string;
  };
}

export default async function NewDeployPage({ searchParams }: PageProps) {
  const devices = await prisma.device.findMany({
    select: {
      id: true,
      productName: true,
      modelName: true,
      serialNumber: true,
      currentSwVersion: true,
      currentAiVersion: true,
      currentPlcVersion: true,
    },
    orderBy: { productName: "asc" },
  });

  const preselectedDeviceId = searchParams.deviceId
    ? parseInt(searchParams.deviceId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/deploys"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          &larr; 배포 이력
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          배포 등록
        </h1>
      </div>

      <DeployForm
        devices={devices}
        preselectedDeviceId={preselectedDeviceId}
      />
    </div>
  );
}
