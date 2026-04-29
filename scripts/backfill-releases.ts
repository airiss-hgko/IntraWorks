/**
 * 기존 DeployHistory 행에서 (component, version, modelName) 유니크 조합을 추출해
 * tb_release 행을 생성하고, DeployHistory의 swReleaseId/aiReleaseId/plcReleaseId FK를 채운다.
 *
 * 사용법:
 *   npx ts-node --compiler-options '{"module":"CommonJS","target":"es2017"}' scripts/backfill-releases.ts            # dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS","target":"es2017"}' scripts/backfill-releases.ts --apply
 *
 * 안전성:
 * - 기존 swVersion/aiVersion/plcVersion 문자열 컬럼은 건드리지 않음 (호환 유지)
 * - 이미 같은 (component, version, modelName) 릴리스가 있으면 재사용
 * - 같은 배포 행에 이미 FK가 채워져 있으면 덮어쓰지 않음
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

type Component = "SW" | "AI" | "PLC";

interface ReleaseKey {
  component: Component;
  version: string;
  modelName: string | null;
}

function keyStr(k: ReleaseKey): string {
  return `${k.component}|${k.version}|${k.modelName ?? ""}`;
}

async function findOrCreateRelease(
  k: ReleaseKey,
  cache: Map<string, number>,
  earliestDate: Date | null,
): Promise<number> {
  const cached = cache.get(keyStr(k));
  if (cached) return cached;

  const existing = await prisma.release.findFirst({
    where: {
      component: k.component,
      version: k.version,
      modelName: k.modelName,
    },
  });
  if (existing) {
    cache.set(keyStr(k), existing.id);
    return existing.id;
  }

  if (!APPLY) {
    cache.set(keyStr(k), -1);
    return -1;
  }

  const created = await prisma.release.create({
    data: {
      component: k.component,
      version: k.version,
      modelName: k.modelName,
      buildDate: earliestDate,
      releaseType: "정식",
      changelog: "(백필 자동 생성 — 변경요약은 추후 수동 입력)",
    },
  });
  cache.set(keyStr(k), created.id);
  return created.id;
}

async function main() {
  console.log(`\n[backfill-releases] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const deploys = await prisma.deployHistory.findMany({
    include: { device: { select: { modelName: true } } },
    orderBy: { deployDate: "asc" },
  });
  console.log(`  배포 이력 ${deploys.length}건 로드`);

  const cache = new Map<string, number>();
  let createdCount = 0;
  let updatedCount = 0;
  const seenKeys = new Set<string>();

  for (const d of deploys) {
    const updates: { swReleaseId?: number; aiReleaseId?: number; plcReleaseId?: number } = {};

    const trios: { comp: Component; version: string | null; field: "swReleaseId" | "aiReleaseId" | "plcReleaseId"; current: number | null }[] = [
      { comp: "SW",  version: d.swVersion,  field: "swReleaseId",  current: d.swReleaseId },
      { comp: "AI",  version: d.aiVersion,  field: "aiReleaseId",  current: d.aiReleaseId },
      { comp: "PLC", version: d.plcVersion, field: "plcReleaseId", current: d.plcReleaseId },
    ];

    for (const t of trios) {
      if (!t.version || !t.version.trim()) continue;
      if (t.current) continue; // 이미 FK 채워져 있으면 패스

      const k: ReleaseKey = {
        component: t.comp,
        version: t.version.trim(),
        modelName: d.device?.modelName ?? null,
      };

      const ks = keyStr(k);
      const wasNew = !seenKeys.has(ks);
      seenKeys.add(ks);

      const id = await findOrCreateRelease(k, cache, d.deployDate);
      if (id > 0) updates[t.field] = id;
      if (wasNew && APPLY) createdCount++;
      else if (wasNew) createdCount++;
    }

    if (Object.keys(updates).length === 0) continue;

    if (APPLY) {
      await prisma.deployHistory.update({ where: { id: d.id }, data: updates });
    }
    updatedCount++;
  }

  console.log(`  생성될 릴리스 (unique 조합): ${seenKeys.size}건`);
  console.log(`  연결될 배포 이력: ${updatedCount}건`);

  if (!APPLY) {
    console.log(`\n[DRY-RUN] 실제 적용하려면 --apply 옵션을 붙여서 다시 실행하세요.`);
  } else {
    console.log(`\n[APPLY] 백필 완료.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
