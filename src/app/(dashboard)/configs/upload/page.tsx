import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ConfigUpload } from "@/components/configs/config-upload";

interface PageProps {
  searchParams: { deviceId?: string };
}

export default async function ConfigUploadPage({ searchParams }: PageProps) {
  const devices = await prisma.device.findMany({
    select: { id: true, productName: true, serialNumber: true, deviceId: true },
    orderBy: { productName: "asc" },
  });

  const preselectedDeviceId = searchParams.deviceId
    ? parseInt(searchParams.deviceId)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configs"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Config 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">Config 업로드</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Config.local.json 또는 StatusReport JSON 파일을 업로드합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <ConfigUpload devices={devices} preselectedDeviceId={preselectedDeviceId} />
      </div>
    </div>
  );
}
