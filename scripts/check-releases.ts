import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const all = await p.release.findMany({
    where: { component: "SW" },
    orderBy: [{ version: "asc" }, { modelName: "asc" }],
    include: { _count: { select: { swDeploys: true } } },
  });
  console.log(`SW 릴리스 ${all.length}건:`);
  for (const r of all) {
    console.log(
      `  #${r.id}  ${r.version.padEnd(12)}  model=${(r.modelName || "공통").padEnd(20)}  ` +
      `type=${r.releaseType || "-"}  builder=${r.builder || "-"}  artifact=${r.artifactName || "-"}  배포=${r._count.swDeploys}대`
    );
  }
  // version별 그룹화
  const byVer = new Map<string, typeof all>();
  for (const r of all) {
    if (!byVer.has(r.version)) byVer.set(r.version, []);
    byVer.get(r.version)!.push(r);
  }
  console.log(`\n버전별 그룹: ${byVer.size}개 unique version`);
  for (const [v, rs] of byVer) {
    if (rs.length > 1) console.log(`  ${v} — ${rs.length}건 (모델: ${rs.map((r) => r.modelName || "공통").join(", ")})`);
  }
  await p.$disconnect();
})();
