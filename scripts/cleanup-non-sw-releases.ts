/**
 * AI/PLC 릴리스 데이터 정리 — 릴리스는 SW만 추적하기로 결정.
 * 기존 백필로 자동 생성된 AI/PLC 릴리스를 삭제하고,
 * DeployHistory.aiReleaseId / plcReleaseId 는 ON DELETE SET NULL 로 자동 해제됨.
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/cleanup-non-sw-releases.ts            # dry-run
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/cleanup-non-sw-releases.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`\n[cleanup-non-sw-releases] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const targets = await prisma.release.findMany({
    where: { component: { in: ["AI", "PLC"] } },
    select: { id: true, component: true, version: true },
  });
  console.log(`  삭제 대상 릴리스: ${targets.length}건`);
  for (const r of targets) console.log(`    - #${r.id} ${r.component} ${r.version}`);

  if (!APPLY) {
    console.log(`\n[DRY-RUN] 실제 적용하려면 --apply 옵션을 붙여서 다시 실행하세요.`);
    return;
  }

  const result = await prisma.release.deleteMany({
    where: { component: { in: ["AI", "PLC"] } },
  });
  console.log(`\n[APPLY] ${result.count}건 삭제 완료. DeployHistory의 ai/plc release FK는 SET NULL 되었습니다.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
