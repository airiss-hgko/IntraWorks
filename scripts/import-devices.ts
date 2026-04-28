/**
 * Wipe Device + DeployHistory (and dependent rows) and re-import devices
 * from scripts/devices.json (produced by scripts/dump_devices_json.py).
 *
 * Run:
 *   python scripts/dump_devices_json.py
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-devices.ts            # dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-devices.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const FOREIGN_COUNTRIES = [
  "대만", "미국", "싱가폴", "싱가포르", "필리핀", "일본", "중국", "베트남",
  "태국", "인도네시아", "말레이시아", "인도", "독일", "프랑스", "영국",
  "호주", "캐나다", "멕시코", "브라질", "아랍에미리트", "사우디아라비아",
];

function excelSerialToDate(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

function splitCustomer(raw: string): { country: string | null; name: string | null } {
  const v = (raw || "").trim();
  if (!v) return { country: null, name: null };
  const m = v.match(/^(\S+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { country: m[1].trim(), name: m[2].trim() };
  for (const c of FOREIGN_COUNTRIES) {
    if (v === c) return { country: c, name: null };
    if (v.startsWith(c)) {
      const rest = v.slice(c.length).trim();
      return { country: c, name: rest || null };
    }
  }
  return { country: "대한민국", name: v };
}

function normalizeStatus(raw: string): string {
  return (raw || "").trim() || "보관";
}

function parseDateCell(raw: string): Date | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return excelSerialToDate(parseFloat(v));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

interface RawRow {
  no: string;
  productName: string;
  modelName: string;
  lotNumber: string | null;
  serialNumber: string;
  status: string;
  customerRaw: string;
  swVersion: string | null;
  aiVersion: string | null;
  plcVersion: string | null;
  lastDeployDateRaw: string;
  notes: string | null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const jsonPath = path.resolve(process.cwd(), "scripts/devices.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("scripts/devices.json not found. Run: python scripts/dump_devices_json.py");
    process.exit(1);
  }
  const raw: RawRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  const devices = raw.map((r) => {
    const c = splitCustomer(r.customerRaw);
    return {
      productName: r.productName,
      modelName: r.modelName,
      lotNumber: r.lotNumber,
      serialNumber: r.serialNumber,
      deviceId: r.serialNumber, // == S/N (deviceId column is redundant; consider dropping later)
      status: normalizeStatus(r.status),
      customerName: c.name,
      customerCountry: c.country,
      currentSwVersion: r.swVersion,
      currentAiVersion: r.aiVersion,
      currentPlcVersion: r.plcVersion,
      lastDeployDate: parseDateCell(r.lastDeployDateRaw),
      notes: r.notes,
    };
  });

  console.log(`Parsed ${devices.length} devices.\n`);
  console.log("Preview (first 3):");
  console.log(JSON.stringify(devices.slice(0, 3), null, 2));
  console.log("\nLast 2:");
  console.log(JSON.stringify(devices.slice(-2), null, 2));

  // Country/customer split summary
  console.log("\n=== Customer split summary ===");
  for (const d of devices) {
    console.log(
      `  ${d.serialNumber.padEnd(22)} country="${d.customerCountry ?? ""}"  name="${d.customerName ?? ""}"`
    );
  }

  // Duplicate S/N check
  const snCount = new Map<string, number>();
  for (const d of devices) snCount.set(d.serialNumber, (snCount.get(d.serialNumber) || 0) + 1);
  const dups = Array.from(snCount.entries()).filter(([, n]) => n > 1);
  if (dups.length) {
    console.error("\n❌ Duplicate S/N:", dups);
    process.exit(1);
  }

  if (!apply) {
    console.log(`\n[DRY-RUN] would wipe DeployHistory + ConfigSnapshot + MaintenanceLog + Device,`);
    console.log(`[DRY-RUN] then insert ${devices.length} devices.`);
    console.log(`Run with --apply to execute.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\nWiping existing data...`);
  const r1 = await prisma.deployHistory.deleteMany({});
  const r2 = await prisma.configSnapshot.deleteMany({});
  const r3 = await prisma.maintenanceLog.deleteMany({});
  const r4 = await prisma.device.deleteMany({});
  console.log(
    `  deleted: deployHistory=${r1.count}, configSnapshot=${r2.count}, maintenanceLog=${r3.count}, device=${r4.count}`
  );

  console.log(`\nInserting ${devices.length} devices...`);
  for (const d of devices) {
    await prisma.device.create({ data: d });
  }
  console.log(`✅ Done. ${devices.length} devices inserted.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
