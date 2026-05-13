import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BundleUploader } from "@/components/bundles/bundle-uploader";

export default async function NewBundlePage() {
  const devices = await prisma.device.findMany({
    select: { id: true, deviceId: true, productName: true, modelName: true, serialNumber: true },
    orderBy: { deviceId: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bundles"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          배포 번들
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">폴더 업로드</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          캡처 PC 폴더(<code className="rounded bg-[var(--muted)] px-1 py-0.5 text-xs">D:\10. 배포\…</code>)를 업로드해 한 번에 여러 번들을 등록합니다.
        </p>
      </div>
      <BundleUploader devices={devices} />
    </div>
  );
}
