"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./theme-toggle";

const pageNames: Record<string, string> = {
  "/": "대시보드",
  "/devices": "장비 관리",
  "/deploys": "배포 이력",
  "/configs": "Config 관리",
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pageName =
    Object.entries(pageNames).find(([path]) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )?.[1] || "IntraWorks";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b-2 border-[var(--border)] bg-[var(--card)] px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="네비게이션 메뉴 열기"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {pageName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Excel download button */}
        <a
          href="/api/export/excel"
          className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          aria-label="Excel 파일 내보내기"
          title="Excel 내보내기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">Excel</span>
        </a>

        <ThemeToggle />

        {/* Divider */}
        <div className="h-6 w-px bg-[var(--border)]" />

        {/* User account dropdown */}
        {session?.user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="사용자 메뉴"
              className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--accent)]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                {session.user.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-none text-[var(--foreground)]">
                  {session.user.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  관리자
                </p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`hidden text-[var(--muted-foreground)] transition-transform md:block ${menuOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {session.user.email || "관리자"}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--destructive)] transition-colors hover:bg-[var(--accent)]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
