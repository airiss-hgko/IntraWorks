import ExcelJS from "exceljs";
import path from "path";

async function main() {
  const file = path.resolve(
    process.cwd(),
    "docs/3-H.소프트웨어 버전 및 배포관리(최종)_26.04.14.xlsx"
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  console.log("=== Sheets ===");
  wb.worksheets.forEach((ws) => {
    console.log(`- "${ws.name}" (rows=${ws.rowCount}, cols=${ws.columnCount})`);
  });

  const target =
    wb.worksheets.find((ws) => ws.name.includes("SW버전") || ws.name.includes("배포관리")) ||
    wb.worksheets[0];

  console.log(`\n=== Sheet: "${target.name}" ===`);
  const maxRow = Math.min(target.rowCount, 60);
  for (let r = 1; r <= maxRow; r++) {
    const row = target.getRow(r);
    const vals: string[] = [];
    for (let c = 1; c <= target.columnCount; c++) {
      const cell = row.getCell(c);
      let v: unknown = cell.value;
      if (v && typeof v === "object" && "richText" in (v as object)) {
        v = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
      } else if (v && typeof v === "object" && "text" in (v as object)) {
        v = (v as { text: string }).text;
      } else if (v instanceof Date) {
        v = v.toISOString().slice(0, 10);
      }
      vals.push(v == null ? "" : String(v));
    }
    if (vals.some((v) => v.trim() !== "")) {
      console.log(`R${r}: ${JSON.stringify(vals)}`);
    }
  }

  if (target.rowCount > 60) {
    console.log(`\n... (${target.rowCount - 60} more rows)`);
  }

  const merges = (target as unknown as { _merges?: Record<string, unknown> })._merges;
  if (merges) {
    console.log("\n=== Merged ranges ===");
    console.log(Object.keys(merges).slice(0, 30).join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
