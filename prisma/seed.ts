import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. 초기 관리자 계정 생성
  const adminPassword = await hash("admin1234", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      displayName: "관리자",
      role: "admin",
    },
  });
  console.log(`✅ Admin user created: ${admin.username}`);

  // 2. 장비 데이터 (엑셀 기반)
  const devices = [
    { productName: "AIXAC-RX6040S", modelName: "RX6040S", lotNumber: "CG22", serialNumber: "XSSA-CG22-001", deviceId: "6040S001", status: "판매완료", customerName: "TeleRadio Engineering", customerCountry: "Singapore", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040S", modelName: "RX6040S", lotNumber: "CG22", serialNumber: "XSSA-CG22-002", deviceId: "6040S002", status: "판매완료", customerName: "TeleRadio Engineering", customerCountry: "Singapore", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040SA", modelName: "RX6040SA", lotNumber: "CU27", serialNumber: "XSSA-CU27-001", deviceId: "6040SA001", status: "판매완료", customerName: "ShenYau", customerCountry: "Taiwan", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040SA", modelName: "RX6040SA", lotNumber: "CU27", serialNumber: "XSSA-CU27-002", deviceId: "6040SA002", status: "판매완료", customerName: "ShenYau", customerCountry: "Taiwan", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040SA", modelName: "RX6040SA", lotNumber: "DB20", serialNumber: "XSSA-DB20-001", deviceId: "6040SA003", status: "판매완료", customerName: "ShenYau", customerCountry: "Taiwan", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040SA", modelName: "RX6040SA", lotNumber: "DB20", serialNumber: "XSSA-DB20-002", deviceId: "6040SA004", status: "판매완료", customerName: "Xonar", customerCountry: "USA", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040SA", modelName: "RX6040SA", lotNumber: "DB20", serialNumber: "XSSA-DB20-003", deviceId: "6040SA005", status: "판매완료", customerName: null, customerCountry: "Korea", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX5030SA", modelName: "RX5030SA", lotNumber: "CC12", serialNumber: "XSSA-CC12-001", deviceId: "5030SA001", status: "판매완료", customerName: "우정국", customerCountry: "Korea", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX5030SA", modelName: "RX5030SA", lotNumber: "CC12", serialNumber: "XSSA-CC12-002", deviceId: "5030SA002", status: "판매완료", customerName: "구치소", customerCountry: "Korea", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040DA", modelName: "RX6040DA", lotNumber: "DJ08", serialNumber: "XSDA-DJ08-001", deviceId: "6040DA001", status: "판매완료", customerName: "KTL", customerCountry: "Korea", currentSwVersion: "2.0.0.0", currentAiVersion: null, currentPlcVersion: "RX.v.5.3.2.0" },
    { productName: "AIXAC-RX6040DA", modelName: "RX6040DA", lotNumber: "DJ08", serialNumber: "XSDA-DJ08-002", deviceId: "6040DA002", status: "판매완료", customerName: "항공보안인증", customerCountry: "Korea", currentSwVersion: "2.0.0.0", currentAiVersion: null, currentPlcVersion: "RX.v.5.3.2.0" },
    { productName: "AIXAC-RX6040DA", modelName: "RX6040DA", lotNumber: "DJ08", serialNumber: "XSDA-DJ08-003", deviceId: "6040DA003", status: "판매완료", customerName: "대전TF", customerCountry: "Korea", currentSwVersion: "2.0.0.0", currentAiVersion: null, currentPlcVersion: "RX.v.5.3.2.0" },
    { productName: "AIXAC-RX7555SA", modelName: "RX7555SA", lotNumber: "EE20", serialNumber: "XSSA-EE20-001", deviceId: "7555SA001", status: "보관", customerName: null, customerCountry: "Korea", currentSwVersion: null, currentAiVersion: null, currentPlcVersion: null },
    { productName: "AIXAC-RX7555SA", modelName: "RX7555SA", lotNumber: "EE20", serialNumber: "XSSA-EE20-002", deviceId: "7555SA002", status: "보관", customerName: null, customerCountry: "Korea", currentSwVersion: null, currentAiVersion: null, currentPlcVersion: null },
    { productName: "AIXAC-RX6040MD", modelName: "RX6040MD", lotNumber: "MD01", serialNumber: "XSMD-MD01-001", deviceId: "6040MD001", status: "판매완료", customerName: null, customerCountry: "Korea", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "AIXAC-RX6040MD", modelName: "RX6040MD", lotNumber: "MD01", serialNumber: "XSMD-MD01-002", deviceId: "6040MD002", status: "판매완료", customerName: null, customerCountry: "Korea", currentSwVersion: "1.0.4.3", currentAiVersion: "1.0.3", currentPlcVersion: "RX.v.3.2.1.0" },
    { productName: "XIS-B", modelName: "XIS-B", lotNumber: null, serialNumber: "XISB-001", deviceId: "XISB001", status: "보관", customerName: null, customerCountry: "Korea", currentSwVersion: null, currentAiVersion: null, currentPlcVersion: null },
    { productName: "XIS-B", modelName: "XIS-B", lotNumber: null, serialNumber: "XISB-002", deviceId: "XISB002", status: "보관", customerName: null, customerCountry: "Korea", currentSwVersion: null, currentAiVersion: null, currentPlcVersion: null },
  ];

  for (const device of devices) {
    await prisma.device.upsert({
      where: { serialNumber: device.serialNumber },
      update: {},
      create: device,
    });
  }
  console.log(`✅ ${devices.length} devices seeded`);

  // 3. 배포 이력 데이터 (엑셀 기반)
  const deployHistories = [
    { serialNumber: "XSSA-CG22-001", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-06-15"), deployType: "신규설치", description: "싱가포르 TeleRadio 1호기 납품" },
    { serialNumber: "XSSA-CG22-002", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-06-15"), deployType: "신규설치", description: "싱가포르 TeleRadio 2호기 납품" },
    { serialNumber: "XSSA-CU27-001", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-08-20"), deployType: "신규설치", description: "대만 ShenYau 1호기 납품" },
    { serialNumber: "XSSA-CU27-002", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-08-20"), deployType: "신규설치", description: "대만 ShenYau 2호기 납품" },
    { serialNumber: "XSSA-DB20-001", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-12-20"), deployType: "신규설치", description: "대만 ShenYau 3호기 납품" },
    { serialNumber: "XSSA-DB20-002", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-10-10"), deployType: "신규설치", description: "미국 Xonar 납품" },
    { serialNumber: "XSSA-CC12-001", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-09-01"), deployType: "신규설치", description: "우정국 납품" },
    { serialNumber: "XSSA-CC12-002", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-09-15"), deployType: "신규설치", description: "구치소 납품" },
    { serialNumber: "XSDA-DJ08-001", swVersion: "2.0.0.0", aiVersion: null, plcVersion: "RX.v.5.3.2.0", deployDate: new Date("2026-01-15"), deployType: "신규설치", description: "KTL 인증용" },
    { serialNumber: "XSDA-DJ08-002", swVersion: "2.0.0.0", aiVersion: null, plcVersion: "RX.v.5.3.2.0", deployDate: new Date("2026-02-01"), deployType: "신규설치", description: "항공보안인증" },
    { serialNumber: "XSDA-DJ08-003", swVersion: "2.0.0.0", aiVersion: null, plcVersion: "RX.v.5.3.2.0", deployDate: new Date("2026-02-12"), deployType: "신규설치", description: "대전TF 납품" },
    { serialNumber: "XSMD-MD01-001", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-11-01"), deployType: "신규설치", description: "의료용 1호기" },
    { serialNumber: "XSMD-MD01-002", swVersion: "1.0.4.3", aiVersion: "1.0.3", plcVersion: "RX.v.3.2.1.0", deployDate: new Date("2025-11-15"), deployType: "신규설치", description: "의료용 2호기" },
  ];

  for (const deploy of deployHistories) {
    const device = await prisma.device.findUnique({
      where: { serialNumber: deploy.serialNumber },
    });
    if (device) {
      await prisma.deployHistory.create({
        data: {
          deviceId: device.id,
          swVersion: deploy.swVersion,
          aiVersion: deploy.aiVersion,
          plcVersion: deploy.plcVersion,
          deployDate: deploy.deployDate,
          deployType: deploy.deployType,
          description: deploy.description,
        },
      });
    }
  }
  console.log(`✅ ${deployHistories.length} deploy histories seeded`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
