/**
 * Device.modelName 정규화 — 명판 기준 "AIXAC-RX..." 형식으로 통일.
 * (XIS-B 처럼 RX 가 아닌 모델은 그대로 둔다)
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/normalize-model-names.ts            # dry-run
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/normalize-model-names.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function normalize(modelName: string): string {
  // 이미 AIXAC- 접두사 있으면 그대로
  if (modelName.startsWith("AIXAC-")) return modelName;
  // RX 로 시작하면 AIXAC- 접두사 추가
  if (modelName.startsWith("RX")) return `AIXAC-${modelName}`;
  // 그 외(XIS-B 등)는 그대로
  return modelName;
}

(async () => {
  console.log(`[normalize-model-names] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const all = await p.device.findMany({
    select: { id: true, deviceId: true, modelName: true, productName: true },
  });
  const targets = all.filter((d) => normalize(d.modelName) !== d.modelName);
  console.log(`  대상 ${targets.length}대 / 전체 ${all.length}대`);
  for (const d of targets) {
    console.log(`    ${d.deviceId}  modelName: "${d.modelName}" → "${normalize(d.modelName)}"`);
  }

  if (!APPLY) {
    console.log("\n[DRY-RUN] --apply 옵션을 붙여서 실제 적용하세요.");
    await p.$disconnect();
    return;
  }

  for (const d of targets) {
    await p.device.update({ where: { id: d.id }, data: { modelName: normalize(d.modelName) } });
  }
  console.log(`\n[APPLY] ${targets.length}건 정규화 완료.`);
  await p.$disconnect();
})();
