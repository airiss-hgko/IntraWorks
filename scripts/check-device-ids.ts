import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const rows = await p.device.findMany({
    select: { modelName: true, serialNumber: true, deviceId: true },
    orderBy: [{ modelName: "asc" }, { serialNumber: "asc" }],
  });
  console.log(`총 ${rows.length}대:`);
  console.log(`${"modelName".padEnd(22)} ${"S/N".padEnd(20)} deviceId`);
  for (const r of rows) {
    const same = r.serialNumber === r.deviceId ? "  ← 동일" : "";
    console.log(`${r.modelName.padEnd(22)} ${r.serialNumber.padEnd(20)} ${r.deviceId}${same}`);
  }
  await p.$disconnect();
})();
