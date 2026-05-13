// 두 JSON 객체를 평탄화한 후 (key, leftValue, rightValue) 차이 목록 반환.
// 단순·가벼움. 객체와 배열 모두 평탄화.

export type DiffStatus = "added" | "removed" | "changed" | "same";

export interface DiffEntry {
  path: string;
  status: DiffStatus;
  left: unknown;
  right: unknown;
}

function flatten(obj: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    out[prefix || "(root)"] = obj;
    return out;
  }
  if (typeof obj !== "object") {
    out[prefix || "(root)"] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) out[prefix] = "[]";
    else obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) {
    out[prefix] = "{}";
    return out;
  }
  for (const [k, v] of entries) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

export function diffJson(left: unknown, right: unknown): DiffEntry[] {
  const l = flatten(left);
  const r = flatten(right);
  const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
  const out: DiffEntry[] = [];
  for (const k of keys) {
    const lv = l[k];
    const rv = r[k];
    const has_l = k in l;
    const has_r = k in r;
    let status: DiffStatus = "same";
    if (!has_l && has_r) status = "added";
    else if (has_l && !has_r) status = "removed";
    else if (JSON.stringify(lv) !== JSON.stringify(rv)) status = "changed";
    out.push({ path: k, status, left: lv, right: rv });
  }
  // 변경된 것만 위로
  out.sort((a, b) => {
    const order: Record<DiffStatus, number> = { changed: 0, added: 1, removed: 2, same: 3 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.path.localeCompare(b.path);
  });
  return out;
}

export function summarize(entries: DiffEntry[]) {
  let added = 0, removed = 0, changed = 0, same = 0;
  for (const e of entries) {
    if (e.status === "added") added++;
    else if (e.status === "removed") removed++;
    else if (e.status === "changed") changed++;
    else same++;
  }
  return { added, removed, changed, same, total: entries.length };
}
