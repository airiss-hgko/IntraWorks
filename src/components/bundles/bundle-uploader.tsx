"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseFiles, type ParsedBundle, type RawFile } from "@/lib/bundle-parser";

type MatchInfo = {
  deviceId: number | null;
  deviceLabel: string | null;
  existingBundleId: number | null;
  manualSelection?: boolean;     // 사용자가 수동으로 골랐는지
};

interface PreviewItem {
  bundle: ParsedBundle;
  match: MatchInfo;
  selected: boolean;
  overwrite: boolean;
}

interface DeviceLite {
  id: number;
  deviceId: string;
  productName: string;
  modelName: string;
  serialNumber: string;
}

// File 객체에 webkitRelativePath 가 있을 수 있음
type FileWithPath = File & { webkitRelativePath?: string };

export function BundleUploader({ devices }: { devices: DeviceLite[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploader, setUploader] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setScanning(true);
    try {
      const files: File[] = Array.from(fileList);
      setAllFiles(files);

      const raws: RawFile[] = files.map((f) => {
        const wf = f as FileWithPath;
        return {
          path: wf.webkitRelativePath || f.name,
          fileName: f.name,
          size: f.size,
        };
      });

      const parsed = parseFiles(raws);

      if (parsed.length === 0) {
        setError("인식된 번들이 없습니다. 폴더 구조를 확인해주세요. (예: {장비ID}/{YYYYMMDD}/Config 또는 DM Setting)");
        setItems([]);
        return;
      }

      // 매칭 조회
      const res = await fetch("/api/bundles/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parsed.map((p) => ({ deviceCode: p.deviceCode, bundleDate: p.bundleDate })),
        }),
      });
      const data = await res.json();
      const matches: Record<string, MatchInfo> = data.matches || {};

      const next: PreviewItem[] = parsed.map((p) => {
        const k = `${p.deviceCode}|${p.bundleDate}`;
        const m: MatchInfo = matches[k] || { deviceId: null, deviceLabel: null, existingBundleId: null };
        return {
          bundle: p,
          match: m,
          selected: m.deviceId !== null, // 매칭된 것만 기본 체크
          overwrite: !!m.existingBundleId,
        };
      });
      setItems(next);
    } finally {
      setScanning(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadOne(item: PreviewItem): Promise<{ ok: boolean; error?: string }> {
    if (!item.match.deviceId) return { ok: false, error: "장비 매칭 없음" };

    // 이 번들에 속한 File 객체들을 origPath 기준으로 찾기
    const filesPayload: Array<{
      category: "Config" | "DM";
      fileName: string;
      relativePath: string;
      size: number;
      contentBase64: string;
    }> = [];

    for (const f of item.bundle.files) {
      const fileObj = allFiles.find((af) => {
        const p = (af as FileWithPath).webkitRelativePath || af.name;
        return p === f.origPath;
      });
      if (!fileObj) continue;
      // Thumbs.db 같은 잡파일은 parseFiles 에서 이미 잡혀 있지만 한번 더 거름
      if (/^Thumbs\.db$/i.test(f.fileName)) continue;
      const base64 = await fileToBase64(fileObj);
      filesPayload.push({
        category: f.category,
        fileName: f.fileName,
        relativePath: f.relativePath,
        size: f.size,
        contentBase64: base64,
      });
    }

    if (filesPayload.length === 0) return { ok: false, error: "유효한 파일 없음" };

    const res = await fetch("/api/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundles: [
          {
            deviceId: item.match.deviceId,
            bundleDate: item.bundle.bundleDate,
            uploadedBy: uploader.trim() || null,
            overwrite: item.overwrite,
            files: filesPayload,
          },
        ],
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  }

  async function handleUpload() {
    setError(null);
    const queue = items.filter((i) => i.selected && i.match.deviceId);
    if (queue.length === 0) {
      setError("업로드할 번들이 없습니다. 매칭된 장비가 있는 번들을 선택해주세요.");
      return;
    }
    setUploading(true);
    setProgress({ current: 0, total: queue.length });

    const failed: { item: PreviewItem; error: string }[] = [];

    for (let i = 0; i < queue.length; i++) {
      const it = queue[i];
      const r = await uploadOne(it);
      if (!r.ok) failed.push({ item: it, error: r.error || "알 수 없는 오류" });
      setProgress({ current: i + 1, total: queue.length });
    }

    setUploading(false);
    setProgress(null);

    if (failed.length === 0) {
      router.push("/bundles");
      router.refresh();
    } else {
      setError(
        `${queue.length - failed.length}건 성공 / ${failed.length}건 실패:\n` +
          failed.map((f) => `- ${f.item.bundle.deviceCode} ${f.item.bundle.bundleDate}: ${f.error}`).join("\n")
      );
    }
  }

  function toggleSelect(idx: number) {
    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p)));
  }
  function toggleOverwrite(idx: number) {
    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, overwrite: !p.overwrite } : p)));
  }
  async function setManualDevice(idx: number, deviceIdStr: string) {
    const did = deviceIdStr ? parseInt(deviceIdStr) : null;
    let info: MatchInfo;
    if (did === null) {
      info = { deviceId: null, deviceLabel: null, existingBundleId: null };
    } else {
      const dev = devices.find((d) => d.id === did);
      // 같은 (device, date) 기존 번들 확인
      let existingBundleId: number | null = null;
      try {
        const res = await fetch("/api/bundles/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ deviceCode: dev?.deviceId || "", bundleDate: items[idx].bundle.bundleDate }],
          }),
        });
        const data = await res.json();
        // 서버 매칭이 우리가 고른 device와 같다면 existingBundleId 사용
        const k = `${dev?.deviceId}|${items[idx].bundle.bundleDate}`;
        const m = data.matches?.[k];
        if (m && m.deviceId === did) existingBundleId = m.existingBundleId ?? null;
      } catch {
        // ignore
      }
      info = {
        deviceId: did,
        deviceLabel: dev ? `${dev.productName} (${dev.serialNumber})` : null,
        existingBundleId,
        manualSelection: true,
      };
    }
    setItems((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, match: info, selected: !!info.deviceId, overwrite: !!info.existingBundleId } : p))
    );
  }
  function selectAllMatched() {
    setItems((prev) => prev.map((p) => ({ ...p, selected: !!p.match.deviceId })));
  }
  function unselectAll() {
    setItems((prev) => prev.map((p) => ({ ...p, selected: false })));
  }

  const matchedCount = items.filter((i) => i.match.deviceId).length;
  const selectedCount = items.filter((i) => i.selected && i.match.deviceId).length;

  return (
    <div className="space-y-6">
      {/* 폴더 선택 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">1. 폴더 선택</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              <code className="rounded bg-[var(--muted)] px-1 py-0.5 text-xs">{"{장비ID}/{YYYYMMDD}/{Config|DM Setting}/..."}</code>{" "}
              구조의 폴더를 선택하세요. 단일 번들·장비 폴더·모델 폴더·루트 통째 모두 가능합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              // @ts-expect-error webkitdirectory 는 표준 타입에 없음
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="bundle-folder-input"
            />
            <label
              htmlFor="bundle-folder-input"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:opacity-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              폴더 선택
            </label>
          </div>
        </div>
        {scanning && (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">스캔 중…</p>
        )}
      </div>

      {/* 미리보기 */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">2. 미리보기</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                인식된 번들 <span className="font-medium text-[var(--foreground)]">{items.length}</span>개 ·
                매칭됨 <span className="font-medium text-[var(--foreground)]">{matchedCount}</span> ·
                선택됨 <span className="font-medium text-[var(--foreground)]">{selectedCount}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                placeholder="등록자 (선택)"
                className="h-9 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
              />
              <button
                type="button"
                onClick={selectAllMatched}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]"
              >
                매칭된 항목 전체 선택
              </button>
              <button
                type="button"
                onClick={unselectAll}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]"
              >
                전체 해제
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  <th className="w-12 px-6 py-3"></th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">장비ID</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">매칭 장비</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">번들 일자</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">파일 (Config / DM)</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((it, idx) => {
                  const cfg = it.bundle.files.filter((f) => f.category === "Config").length;
                  const dm = it.bundle.files.filter((f) => f.category === "DM").length;
                  const matched = !!it.match.deviceId;
                  const exists = !!it.match.existingBundleId;
                  return (
                    <tr key={idx} className={!matched ? "opacity-60" : ""}>
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          checked={it.selected}
                          disabled={!matched}
                          onChange={() => toggleSelect(idx)}
                          className="h-4 w-4 rounded border-[var(--border)]"
                        />
                      </td>
                      <td className="px-6 py-3 font-mono text-sm text-[var(--foreground)]">{it.bundle.deviceCode}</td>
                      <td className="px-6 py-3 text-sm text-[var(--foreground)]">
                        {matched && !it.match.manualSelection ? (
                          <span className="inline-flex items-center gap-2">
                            <span>{it.match.deviceLabel}</span>
                            <button
                              type="button"
                              onClick={() => setManualDevice(idx, "")}
                              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
                              title="다른 장비로 변경"
                            >
                              변경
                            </button>
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {!matched && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                                자동 매칭 실패 — 수동 선택
                              </span>
                            )}
                            <select
                              value={it.match.deviceId ?? ""}
                              onChange={(e) => setManualDevice(idx, e.target.value)}
                              className="h-9 rounded-lg border border-[var(--input)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                            >
                              <option value="">장비 선택…</option>
                              {devices.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.deviceId} · {d.productName} ({d.serialNumber})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--foreground)]">{it.bundle.bundleDate}</td>
                      <td className="px-6 py-3 text-sm text-[var(--muted-foreground)]">
                        Config <span className="font-medium text-[var(--foreground)]">{cfg}</span> / DM{" "}
                        <span className="font-medium text-[var(--foreground)]">{dm}</span>
                      </td>
                      <td className="px-6 py-3">
                        {exists ? (
                          <label className="inline-flex items-center gap-2 text-xs text-[var(--foreground)]">
                            <input
                              type="checkbox"
                              checked={it.overwrite}
                              onChange={() => toggleOverwrite(idx)}
                              className="h-4 w-4 rounded border-[var(--border)]"
                            />
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              이미 등록됨 — 덮어쓰기
                            </span>
                          </label>
                        ) : matched ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            신규
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
            {progress && (
              <span className="text-sm text-[var(--muted-foreground)]">
                업로드 중… {progress.current} / {progress.total}
              </span>
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || selectedCount === 0}
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "업로드 중…" : `선택된 ${selectedCount}개 등록`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
