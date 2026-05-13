import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const rows = await p.device.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("Status별 분포:");
  for (const r of rows) console.log(`  "${r.status}" — ${r._count._all}대`);
  await p.$disconnect();
})();
