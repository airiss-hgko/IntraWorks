// Excel 일괄 import 헬퍼.
// exceljs로 시트 첫 워크시트의 헤더 행을 인식하고 행 단위 객체로 변환.
// 헤더 매칭은 후보 라벨 배열을 받아 첫 일치 컬럼을 사용한다 (한/영 혼용 허용).

import ExcelJS from "exceljs";

export interface ColumnSpec<K extends string = string> {
  key: K;
  labels: string[];      // 한/영 헤더 라벨 후보
  required?: boolean;
  /** 셀 값 변환. 기본은 trim된 문자열 */
  transform?: (raw: unknown) => unknown;
}

export interface ParsedRow<K extends string = string> {
  row: number;            // 시트 row index (헤더 다음 1부터)
  values: Record<K, unknown>;
  errors: string[];
}

export interface ParsedSheet<K extends string = string> {
  total: number;
  headers: Record<K, number | null>;   // key → 컬럼 인덱스 (없으면 null)
  rows: ParsedRow<K>[];
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    // ExcelJS rich/hyperlink/formula 결과
    const obj = v as { text?: string; result?: unknown };
    if (typeof obj.text === "string") return obj.text.trim();
    if (obj.result !== undefined) return cellToString(obj.result);
    return JSON.stringify(v);
  }
  return String(v);
}

function normalizeHeader(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export async function parseExcel<K extends string>(
  buffer: ArrayBuffer | Buffer,
  cols: ColumnSpec<K>[]
): Promise<ParsedSheet<K>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) {
    return { total: 0, headers: Object.fromEntries(cols.map((c) => [c.key, null])) as Record<K, number | null>, rows: [] };
  }

  // 1행을 헤더로 가정
  const headerRow = ws.getRow(1);
  const headers: Record<K, number | null> = Object.fromEntries(cols.map((c) => [c.key, null])) as Record<K, number | null>;
  headerRow.eachCell((cell, colNumber) => {
    const text = normalizeHeader(cellToString(cell.value));
    for (const c of cols) {
      if (headers[c.key] !== null) continue;
      if (c.labels.some((l) => normalizeHeader(l) === text)) {
        headers[c.key] = colNumber;
      }
    }
  });

  const rows: ParsedRow<K>[] = [];
  const lastRow = ws.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    const values = {} as Record<K, unknown>;
    const errors: string[] = [];
    let allEmpty = true;
    for (const c of cols) {
      const colIdx = headers[c.key];
      const raw = colIdx ? row.getCell(colIdx).value : null;
      const str = cellToString(raw);
      if (str !== "") allEmpty = false;
      const transformed = c.transform ? c.transform(raw) : str || null;
      values[c.key] = transformed;
      if (c.required && (transformed === null || transformed === "" || transformed === undefined)) {
        errors.push(`${c.key} 필수`);
      }
    }
    if (allEmpty) continue;
    rows.push({ row: r, values, errors });
  }

  return { total: rows.length, headers, rows };
}

export function excelSerialToDate(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

export function parseDateCell(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number") return excelSerialToDate(raw);
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToDate(parseFloat(s));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
