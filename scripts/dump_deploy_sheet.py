"""Inspect the '배포이력관리' sheet (sheet4) for grouping analysis."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PATH = "docs/3-H.소프트웨어 버전 및 배포관리(최종)_26.04.14.xlsx"

with zipfile.ZipFile(PATH) as z:
    ss_root = ET.parse(z.open("xl/sharedStrings.xml")).getroot()
    sh_root = ET.parse(z.open("xl/worksheets/sheet4.xml")).getroot()

shared = []
for si in ss_root.findall("x:si", NS):
    parts = []
    t = si.find("x:t", NS)
    if t is not None and t.text:
        parts.append(t.text)
    for r in si.findall("x:r", NS):
        rt = r.find("x:t", NS)
        if rt is not None and rt.text:
            parts.append(rt.text)
    shared.append("".join(parts))

def col_letters_to_idx(s):
    n = 0
    for ch in s:
        n = n * 26 + (ord(ch) - 64)
    return n

rows = []
max_col = 0
for row_el in sh_root.find("x:sheetData", NS).findall("x:row", NS):
    r_idx = int(row_el.get("r"))
    cells = {}
    for c in row_el.findall("x:c", NS):
        ref = c.get("r")
        col_idx = col_letters_to_idx(re.match(r"([A-Z]+)", ref).group(1))
        max_col = max(max_col, col_idx)
        t = c.get("t")
        v_el = c.find("x:v", NS)
        is_el = c.find("x:is", NS)
        val = ""
        if t == "s" and v_el is not None:
            val = shared[int(v_el.text)]
        elif t == "inlineStr" and is_el is not None:
            t_el = is_el.find("x:t", NS)
            if t_el is not None and t_el.text:
                val = t_el.text
        elif v_el is not None:
            val = v_el.text or ""
        cells[col_idx] = val
    rows.append((r_idx, cells))

out = [f"Total rows={len(rows)}, max_col={max_col}"]
for r_idx, cells in rows[:60]:
    row_vals = [cells.get(c, "") for c in range(1, max_col + 1)]
    if any(v.strip() for v in row_vals):
        out.append(f"R{r_idx}: {json.dumps(row_vals, ensure_ascii=False)}")

with open("d:/tmp/deploy_sheet_dump.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("written")
