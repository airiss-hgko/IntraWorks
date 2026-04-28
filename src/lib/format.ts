// Shared, memoized formatters. Reusing a single Intl.DateTimeFormat
// avoids creating one per row in tables.

const koDate = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return koDate.format(d);
}
