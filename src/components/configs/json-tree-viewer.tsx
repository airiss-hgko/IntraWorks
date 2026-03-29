"use client";

import { useState } from "react";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonTreeViewerProps {
  data: Record<string, JsonValue>;
  searchQuery?: string;
  defaultExpanded?: boolean;
}

export function JsonTreeViewer({ data, searchQuery = "", defaultExpanded = true }: JsonTreeViewerProps) {
  return (
    <div className="font-mono text-sm">
      <JsonNode data={data} depth={0} searchQuery={searchQuery.toLowerCase()} defaultExpanded={defaultExpanded} />
    </div>
  );
}

function JsonNode({
  data,
  depth,
  searchQuery,
  defaultExpanded,
  label,
}: {
  data: JsonValue;
  depth: number;
  searchQuery: string;
  defaultExpanded: boolean;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2 ? true : defaultExpanded);

  if (data === null) {
    return (
      <span className="text-[var(--muted-foreground)]">null</span>
    );
  }

  if (typeof data !== "object") {
    const strVal = String(data);
    const isMatch = searchQuery && strVal.toLowerCase().includes(searchQuery);
    const labelMatch = searchQuery && label?.toLowerCase().includes(searchQuery);

    let valueClass = "text-emerald-600 dark:text-emerald-400"; // string
    if (typeof data === "number") valueClass = "text-blue-600 dark:text-blue-400";
    if (typeof data === "boolean") valueClass = "text-amber-600 dark:text-amber-400";

    return (
      <span className={`${valueClass} ${isMatch || labelMatch ? "rounded bg-yellow-200/50 px-0.5 dark:bg-yellow-900/30" : ""}`}>
        {typeof data === "string" ? `"${data}"` : String(data)}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray
    ? data.map((v, i) => [String(i), v] as [string, JsonValue])
    : Object.entries(data) as [string, JsonValue][];
  const isEmpty = entries.length === 0;

  if (isEmpty) {
    return <span className="text-[var(--muted-foreground)]">{isArray ? "[]" : "{}"}</span>;
  }

  const hasSearchMatch = searchQuery && JSON.stringify(data).toLowerCase().includes(searchQuery);
  const labelMatch = searchQuery && label?.toLowerCase().includes(searchQuery);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] ${
          hasSearchMatch || labelMatch ? "bg-yellow-100/50 dark:bg-yellow-900/20" : ""
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-xs">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>

      {expanded && (
        <div className="ml-4 border-l border-[var(--border)] pl-3">
          {entries.map(([key, value]) => {
            const keyMatch = searchQuery && key.toLowerCase().includes(searchQuery);
            return (
              <div key={key} className="py-0.5">
                <span className={`font-medium text-[var(--foreground)] ${keyMatch ? "rounded bg-yellow-200/50 px-0.5 dark:bg-yellow-900/30" : ""}`}>
                  {isArray ? `[${key}]` : key}
                </span>
                <span className="text-[var(--muted-foreground)]">: </span>
                <JsonNode
                  data={value}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  defaultExpanded={defaultExpanded}
                  label={key}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
