import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bundles/:id/files/:fileId
// 쿼리: ?download=1 → attachment, 그 외 → inline
// 이미지면 contentBinary, JSON이면 contentJson 또는 raw 텍스트로 반환
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  const file = await prisma.deploymentBundleFile.findFirst({
    where: { id: parseInt(params.fileId), bundleId: parseInt(params.id) },
  });
  if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  if (file.contentBinary) {
    return new NextResponse(file.contentBinary, {
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Length": String(file.contentBinary.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  if (file.contentJson !== null && file.contentJson !== undefined) {
    const text = JSON.stringify(file.contentJson, null, 2);
    return new NextResponse(text, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.fileName)}"`,
      },
    });
  }

  return NextResponse.json({ error: "파일 내용이 비어 있습니다." }, { status: 404 });
}
