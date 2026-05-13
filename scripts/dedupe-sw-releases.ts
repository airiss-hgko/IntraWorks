/**
 * SW 릴리스 중복 병합 — 같은 version을 가진 모델별 릴리스를 modelName=null 1건으로 통합.
 *
 * 동작:
 *  1. SW 릴리스를 version 단위로 그룹화
 *  2. 각 그룹에서 "대표 릴리스" 1개 선정 (modelName=null > 가장 작은 id)
 *  3. 같은 그룹의 다른 릴리스를 참조하는 DeployHistory.swReleaseId를 대표 릴리스로 변경
 *  4. 대표 릴리스의 modelName을 null로 통일 + changelog/builder/artifact 정보 보존
 *  5. 다른 릴리스 삭제
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/dedupe-sw-releases.ts            # dry-run
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\",\"target\":\"es2017\"}" scripts/dedupe-sw-releases.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");

(async () => {
  console.log(`[dedupe-sw-releases] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const all = await p.release.findMany({
    where: { component: "SW" },
    orderBy: [{ id: "asc" }],
  });
  console.log(`  SW 릴리스 ${all.length}건 로드`);

  // version 별 그룹
  const byVersion = new Map<string, typeof all>();
  for (const r of all) {
    if (!byVersion.has(r.version)) byVersion.set(r.version, []);
    byVersion.get(r.version)!.push(r);
  }

  let mergedGroups = 0;
  let updatedReleases = 0;
  let updatedDeploys = 0;
  let deletedReleases = 0;

  for (const [version, group] of byVersion) {
    // 대표 선정: 이미 modelName=null이 있으면 그것, 아니면 가장 작은 id
    const representative =
      group.find((r) => r.modelName === null) ?? group.reduce((a, b) => (a.id < b.id ? a : b));
    const others = group.filter((r) => r.id !== representative.id);

    if (others.length === 0 && representative.modelName === null) continue; // 이미 정상
    mergedGroups++;

    console.log(
      `  [${version}] 대표=#${representative.id} (model=${representative.modelName || "null"}), 병합대상 ${others.length}건` +
        (others.length ? ` → [${others.map((r) => `#${r.id}/${r.modelName || "null"}`).join(", ")}]` : "")
    );

    if (!APPLY) continue;

    // changelog / builder / artifact 가 비어있으면 다른 릴리스에서 가져오기
    const data: Record<string, unknown> = {};
    if (representative.modelName !== null) data.modelName = null;
    if (!representative.changelog) {
      const src = others.find((r) => r.changelog);
      if (src) data.changelog = src.changelog;
    }
    if (!representative.builder) {
      const src = others.find((r) => r.builder);
      if (src) data.builder = src.builder;
    }
    if (!representative.buildDate) {
      const src = others.find((r) => r.buildDate);
      if (src) data.buildDate = src.buildDate;
    }
    if (!representative.artifactName) {
      const src = others.find((r) => r.artifactName);
      if (src) data.artifactName = src.artifactName;
    }
    if (!representative.artifactPath) {
      const src = others.find((r) => r.artifactPath);
      if (src) data.artifactPath = src.artifactPath;
    }

    if (Object.keys(data).length > 0) {
      await p.release.update({ where: { id: representative.id }, data });
      updatedReleases++;
    }

    if (others.length > 0) {
      const otherIds = others.map((r) => r.id);
      // DeployHistory FK 재연결
      const updRes = await p.deployHistory.updateMany({
        where: { swReleaseId: { in: otherIds } },
        data: { swReleaseId: representative.id },
      });
      updatedDeploys += updRes.count;
      // 다른 릴리스 삭제
      const delRes = await p.release.deleteMany({ where: { id: { in: otherIds } } });
      deletedReleases += delRes.count;
    }
  }

  console.log(`\n[${APPLY ? "APPLY" : "DRY-RUN"}] 결과`);
  console.log(`  병합 처리된 그룹: ${mergedGroups}`);
  console.log(`  대표 릴리스 수정: ${updatedReleases}`);
  console.log(`  DeployHistory FK 재연결: ${updatedDeploys}건`);
  console.log(`  삭제된 릴리스: ${deletedReleases}건`);
  if (!APPLY) console.log(`\n실제 적용하려면 --apply 옵션을 붙여서 다시 실행하세요.`);

  await p.$disconnect();
})();
