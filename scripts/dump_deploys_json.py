"""Dump deploys from sheet '배포이력관리' as JSON for the TS importer."""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PATH = "docs/3-H.소프트웨어 버전 및 배포관리(최종)_26.04.14.xlsx"
OUT = "scripts/deploys.json"

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
for row_el in sh_root.find("x:sheetData", NS).findall("x:row", NS):
    r_idx = int(row_el.get("r"))
    cells = {}
    for c in row_el.findall("x:c", NS):
        ref = c.get("r")
        col_idx = col_letters_to_idx(re.match(r"([A-Z]+)", ref).group(1))
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
    rows.append({"r": r_idx, "cells": cells})

# Headers at R2; data from R3 onward
data = []
for row in rows:
    if row["r"] < 3:
        continue
    c = row["cells"]
    sn = (c.get(5, "") or "").strip()
    if not sn:
        continue
    data.append({
        "no": (c.get(1, "") or "").strip(),
        "productName": (c.get(2, "") or "").strip(),
        "modelName": (c.get(3, "") or "").strip(),
        "lotNumber": (c.get(4, "") or "").strip() or None,
        "serialNumber": sn,
        "installLocationRaw": (c.get(6, "") or "").strip(),
        "swVersion": (c.get(7, "") or "").strip() or None,
        "aiVersion": (c.get(8, "") or "").strip() or None,
        "plcVersion": (c.get(9, "") or "").strip() or None,
        "deployDateRaw": (c.get(10, "") or "").strip(),
        "deployer": (c.get(11, "") or "").strip() or None,
        "description": (c.get(12, "") or "").strip() or None,
    })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"Wrote {len(data)} deploys to {OUT}", file=sys.stderr)
