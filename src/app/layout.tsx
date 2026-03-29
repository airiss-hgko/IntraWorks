import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntraWorks — 사내 통합 관리 시스템",
  description: "X-ray 스캐너 장비 및 소프트웨어 버전 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <AuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
