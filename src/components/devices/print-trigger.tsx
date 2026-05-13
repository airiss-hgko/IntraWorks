"use client";

import { useEffect } from "react";

// /report?print=1 로 진입 시 자동으로 인쇄 다이얼로그 띄움.
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, []);
  return null;
}
