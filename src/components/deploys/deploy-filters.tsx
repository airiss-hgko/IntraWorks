"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface DeployFiltersProps {
  models: string[];
  deployTypes: string[];
  currentFilters: {
    search: string;
    model: string;
    deployType: string;
  };
}

export function DeployFilters({
  models,
  deployTypes,
  currentFilters,
}: DeployFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.search);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/deploys?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", search);
  };

  const resetFilters = () => {
    setSearch("");
    router.push("/deploys");
  };

  const hasActiveFilters =
    currentFilters.search ||
    currentFilters.model ||
    currentFilters.deployType;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="장비명, S/N, 담당자 검색..."
            className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentFilters.model}
            onChange={(e) => updateFilter("model", e.target.value)}
            className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">모델 전체</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={currentFilters.deployType}
            onChange={(e) => updateFilter("deployType", e.target.value)}
            className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm transition-shadow focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">유형 전체</option>
            {deployTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
