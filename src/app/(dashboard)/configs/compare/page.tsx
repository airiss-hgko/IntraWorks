import { Suspense } from "react";
import { ConfigCompareClient } from "@/components/configs/config-compare-client";

export default function ConfigComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      }
    >
      <ConfigCompareClient />
    </Suspense>
  );
}
