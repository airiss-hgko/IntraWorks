import Link from "next/link";
import { ReleaseForm } from "@/components/releases/release-form";

interface PageProps {
  searchParams: { version?: string };
}

export default async function NewReleasePage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/releases"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          릴리스 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[var(--foreground)]">릴리스 등록</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          SW 버전업한 빌드를 카탈로그에 등록합니다. 배포 등록 시 자동완성으로 선택할 수 있습니다.
        </p>
      </div>

      <ReleaseForm defaults={{ version: searchParams.version }} />
    </div>
  );
}
