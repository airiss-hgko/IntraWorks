import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// GET /api/export/excel — 장비 목록 Excel 내보내기
export async function GET() {
  const devices = await prisma.device.findMany({
    orderBy: { id: "asc" },
    include: {
      deployHistory: {
        orderBy: { deployDate: "desc" },
        take: 1,
      },
    },
  });

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: 장비 목록
  const deviceSheet = workbook.addWorksheet("장비 목록");
  deviceSheet.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "제품명", key: "productName", width: 20 },
    { header: "모델명", key: "modelName", width: 15 },
    { header: "S/N", key: "serialNumber", width: 20 },
    { header: "장비 ID", key: "deviceId", width: 15 },
    { header: "상태", key: "status", width: 10 },
    { header: "판매 국가", key: "customerCountry", width: 12 },
    { header: "고객명", key: "customerName", width: 20 },
    { header: "SW 버전", key: "currentSwVersion", width: 15 },
    { header: "AI 버전", key: "currentAiVersion", width: 15 },
    { header: "PLC 버전", key: "currentPlcVersion", width: 20 },
    { header: "비고", key: "notes", width: 30 },
  ];

  // Header style
  deviceSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  devices.forEach((device, index) => {
    const row = deviceSheet.addRow({
      no: index + 1,
      productName: device.productName,
      modelName: device.modelName,
      serialNumber: device.serialNumber,
      deviceId: device.deviceId,
      status: device.status,
      customerCountry: device.customerCountry || "",
      customerName: device.customerName || "",
      currentSwVersion: device.currentSwVersion || "",
      currentAiVersion: device.currentAiVersion || "",
      currentPlcVersion: device.currentPlcVersion || "",
      notes: device.notes || "",
    });

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Sheet 2: 배포 이력
  const deploys = await prisma.deployHistory.findMany({
    orderBy: { deployDate: "desc" },
    include: {
      device: {
        select: { productName: true, modelName: true, serialNumber: true },
      },
    },
  });

  const deploySheet = workbook.addWorksheet("배포 이력");
  deploySheet.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "배포일", key: "deployDate", width: 14 },
    { header: "장비명", key: "productName", width: 20 },
    { header: "모델", key: "modelName", width: 15 },
    { header: "S/N", key: "serialNumber", width: 20 },
    { header: "유형", key: "deployType", width: 12 },
    { header: "SW 버전", key: "swVersion", width: 15 },
    { header: "AI 버전", key: "aiVersion", width: 15 },
    { header: "PLC 버전", key: "plcVersion", width: 20 },
    { header: "담당자", key: "deployer", width: 12 },
    { header: "수신자", key: "receiver", width: 12 },
    { header: "설명", key: "description", width: 30 },
  ];

  deploySheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  deploys.forEach((deploy, index) => {
    const row = deploySheet.addRow({
      no: index + 1,
      deployDate: new Date(deploy.deployDate).toLocaleDateString("ko-KR"),
      productName: deploy.device.productName,
      modelName: deploy.device.modelName,
      serialNumber: deploy.device.serialNumber,
      deployType: deploy.deployType || "",
      swVersion: deploy.swVersion || "",
      aiVersion: deploy.aiVersion || "",
      plcVersion: deploy.plcVersion || "",
      deployer: deploy.deployer || "",
      receiver: deploy.receiver || "",
      description: deploy.description || "",
    });

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  const filename = encodeURIComponent(
    `IntraWorks_장비관리_${new Date().toISOString().split("T")[0]}.xlsx`
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
