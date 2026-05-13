import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const rows = await p.device.groupBy({ by: ["modelName"], _count: { _all: true } });
  rows.sort((a, b) => a.modelName.localeCompare(b.modelName));
  console.log("DB modelName distinct:");
  for (const r of rows) console.log(`  "${r.modelName}" — ${r._count._all}대`);
  await p.$disconnect();
})();
