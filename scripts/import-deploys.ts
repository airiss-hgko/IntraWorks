/**
 * Wipe DeployHistory and re-import from scripts/deploys.json (배포이력관리 시트).
 *
 * Run:
 *   python scripts/dump_deploys_json.py
 *   npx ts-node --compiler-options '{"module":"CommonJS","target":"es2017"}' scripts/import-deploys.ts            # dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS","target":"es2017"}' scripts/import-deploys.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function excelSerialToDate(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

function parseDateCell(raw: string): Date | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return excelSerialToDate(parseFloat(v));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function inferDeployType(description: string | null, idx: number): string {
  const d = (description || "").trim();
  if (/초기/i.test(d)) return "신규설치";
  if (/긴급/i.test(d)) return "긴급패치";
  if (/유지|보수/i.test(d)) return "유지보수";
  // 첫 배포는 신규설치, 그 외는 업데이트로 기본
  return idx === 0 ? "신규설치" : "업데이트";
}

interface RawRow {
  no: string;
  productName: string;
  modelName: string;
  lotNumber: string | null;
  serialNumber: string;
  installLocationRaw: string;
  swVersion: string | null;
  aiVersion: string | null;
  plcVersion: string | null;
  deployDateRaw: string;
  deployer: string | null;
  description: string | null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const jsonPath = path.resolve(process.cwd(), "scripts/deploys.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("scripts/deploys.json not found. Run: python scripts/dump_deploys_json.py");
    process.exit(1);
  }
  const raw: RawRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // device serial -> id 매핑
  const devices = await prisma.device.findMany({ select: { id: true, serialNumber: true } });
  const snToId = new Map<string, number>();
  for (const d of devices) snToId.set(d.serialNumber.trim(), d.id);

  // device별 등장 순서 카운트 (deployType 추론용)
  const orderByDevice = new Map<string, number>();

  const records: Array<{
    deviceId: number;
    swVersion: string | null;
    aiVersion: string | null;
    plcVersion: string | null;
    deployDate: Date;
    deployer: string | null;
    deployType: string;
    installLocation: string | null;
    description: string | null;
  }> = [];
  const skipped: { sn: string; reason: string }[] = [];

  for (const r of raw) {
    const sn = r.serialNumber.trim();
    const deviceId = snToId.get(sn);
    if (!deviceId) {
      skipped.push({ sn, reason: "device not found in DB" });
      continue;
    }
    const date = parseDateCell(r.deployDateRaw);
    if (!date) {
      skipped.push({ sn, reason: `bad date: ${r.deployDateRaw}` });
      continue;
    }
    const idx = orderByDevice.get(sn) ?? 0;
    orderByDevice.set(sn, idx + 1);

    records.push({
      deviceId,
      swVersion: r.swVersion,
      aiVersion: r.aiVersion,
      plcVersion: r.plcVersion,
      deployDate: date,
      deployer: r.deployer,
      deployType: inferDeployType(r.description, idx),
      installLocation: r.installLocationRaw.replace(/\n/g, " ").trim() || null,
      description: r.description,
    });
  }

  console.log(`Parsed ${records.length} records (${skipped.length} skipped) from ${raw.length} rows.\n`);
  if (skipped.length) {
    console.log("Skipped rows:");
    for (const s of skipped) console.log(`  ${s.sn}: ${s.reason}`);
    console.log();
  }
  console.log("Sample (first 3):");
  console.log(JSON.stringify(records.slice(0, 3), null, 2));

  if (!apply) {
    console.log(`\n[DRY-RUN] would wipe DeployHistory then insert ${records.length} records.`);
    console.log(`Run with --apply to execute.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\nWiping existing DeployHistory...`);
  const r1 = await prisma.deployHistory.deleteMany({});
  console.log(`  deleted: ${r1.count}`);

  console.log(`\nInserting ${records.length} records...`);
  for (const rec of records) {
    await prisma.deployHistory.create({ data: rec });
  }
  console.log(`✅ Done. ${records.length} records inserted.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
