import xml.etree.ElementTree as ET
import re
import zipfile

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PATH = "docs/3-H.소프트웨어 버전 및 배포관리(최종)_26.04.14.xlsx"

with zipfile.ZipFile(PATH) as z:
    with z.open("xl/sharedStrings.xml") as f:
        ss_root = ET.parse(f).getroot()
    with z.open("xl/worksheets/sheet2.xml") as f:
        sh_root = ET.parse(f).getroot()

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

def col_letter_to_index(letters):
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n

sheetData = sh_root.find("x:sheetData", NS)
rows = []
max_col = 0
for row_el in sheetData.findall("x:row", NS):
    r_idx = int(row_el.get("r"))
    cells = {}
    for c in row_el.findall("x:c", NS):
        ref = c.get("r")
        col_letters = re.match(r"([A-Z]+)", ref).group(1)
        col_idx = col_letter_to_index(col_letters)
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

import json
out = []
out.append(f"Total rows={len(rows)}, max_col={max_col}")
for r_idx, cells in rows[:60]:
    row_vals = [cells.get(c, "") for c in range(1, max_col + 1)]
    if any(v.strip() for v in row_vals):
        out.append(f"R{r_idx}: {json.dumps(row_vals, ensure_ascii=False)}")
with open("d:/tmp/sheet2_dump.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("written to /tmp/sheet2_dump.txt")

merges = sh_root.find("x:mergeCells", NS)
if merges is not None:
    print("\n=== merges ===")
    for m in merges.findall("x:mergeCell", NS)[:40]:
        print(m.get("ref"))
