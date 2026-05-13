"use client";

import { useRouter } from "next/navigation";

interface Candidate {
  id: number;
  bundleDate: string;
  deviceId: string;
  modelName: string;
  serialNumber: string;
}

interface Props {
  currentId: number;
  candidates: Candidate[];
}

function shortModel(m: string) {
  return m.replace(/^AIXAC-RX/, "");
}

export function CompareSelector({ currentId, candidates }: Props) {
  const router = useRouter();
  if (candidates.length === 0) return null;

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value;
        if (v) router.push(`/bundles/${currentId}/compare?to=${v}`);
      }}
      className="h-9 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
    >
      <option value="">다른 번들과 비교…</option>
      {candidates.map((c) => (
        <option key={c.id} value={c.id}>
          {c.deviceId} ({shortModel(c.modelName)}) — {c.bundleDate.slice(0, 10)}
        </option>
      ))}
    </select>
  );
}
