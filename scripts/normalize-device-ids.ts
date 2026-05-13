/**
 * Device.deviceId 를 "{모델코드}{시리얼끝3자리}" 형식으로 정규화.
 *
 * 규칙:
 *   modelCode = modelName.replace(/^AIXAC-RX/, '').replace(/^AIXAC-/, '')
 *   lastDigits = serialNumber 끝의 "-NNN"  (예: XSDA-DJ08-003 → "003")
 *   deviceId = modelCode + lastDigits
 *
 * 예: AIXAC-RX6040DA + XSDA-DJ08-003 → 6040DA003
 *     AIXAC-RX100100DA + XSDX-DA10-002 → 100100DA002
 *     XIS-B + XSIB-BJ10-001 → XIS-B001
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/normalize-device-ids.ts            # dry-run
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/normalize-device-ids.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function deriveDeviceId(modelName: string, serialNumber: string): string | null {
  const code = modelName.replace(/^AIXAC-RX/, "").replace(/^AIXAC-/, "");
  const m = serialNumber.match(/-(\d+)$/);
  if (!m) return null;
  return `${code}${m[1]}`;
}

(async () => {
  console.log(`[normalize-device-ids] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const all = await p.device.findMany({
    select: { id: true, modelName: true, serialNumber: true, deviceId: true },
    orderBy: [{ modelName: "asc" }, { serialNumber: "asc" }],
  });

  const updates: Array<{ id: number; from: string; to: string }> = [];
  const seen = new Map<string, string>(); // deviceId → S/N (충돌 검사)
  const skipped: string[] = [];

  for (const d of all) {
    const next = deriveDeviceId(d.modelName, d.serialNumber);
    if (!next) {
      skipped.push(`  ⚠ ${d.serialNumber} — 시리얼 형식 인식 실패`);
      continue;
    }
    if (seen.has(next)) {
      skipped.push(`  ⚠ ${d.serialNumber} → "${next}" 충돌 (이미 ${seen.get(next)})`);
      continue;
    }
    seen.set(next, d.serialNumber);
    if (next !== d.deviceId) updates.push({ id: d.id, from: d.deviceId, to: next });
  }

  console.log(`  대상 ${updates.length}대 / 전체 ${all.length}대`);
  for (const u of updates) {
    console.log(`    ${u.from.padEnd(18)} → ${u.to}`);
  }
  if (skipped.length) {
    console.log("\n  스킵:");
    for (const s of skipped) console.log(s);
  }

  if (!APPLY) {
    console.log("\n[DRY-RUN] --apply 옵션을 붙여 실제 적용하세요.");
    await p.$disconnect();
    return;
  }

  // 충돌 가능성 회피: 트랜잭션으로 임시 prefix 후 본 값으로 두 단계
  await p.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.device.update({ where: { id: u.id }, data: { deviceId: `__tmp_${u.id}` } });
    }
    for (const u of updates) {
      await tx.device.update({ where: { id: u.id }, data: { deviceId: u.to } });
    }
  });

  console.log(`\n[APPLY] ${updates.length}건 정규화 완료.`);
  await p.$disconnect();
})();
