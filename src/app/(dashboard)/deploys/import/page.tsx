import Link from "next/link";
import { DeployImport } from "@/components/deploys/deploy-import";

export default function DeployImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/deploys" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          배포 이력
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">배포 이력 일괄 등록</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          엑셀 파일(.xlsx)로 여러 배포 이력을 한 번에 등록합니다.
        </p>
      </div>
      <DeployImport />
    </div>
  );
}
