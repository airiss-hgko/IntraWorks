"use client";

import { useEffect, useState } from "react";

export interface LightboxImage {
  id: number;
  fileName: string;
  url: string;       // 표시용 URL
  fileSize?: number;
}

interface Props {
  images: LightboxImage[];
}

/**
 * 이미지 갤러리 + 라이트박스. 썸네일은 lazy load,
 * 클릭하면 모달에서 큰 이미지 + 좌우 키보드/버튼 이동.
 */
export function ImageLightbox({ images }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
      else if (e.key === "ArrowRight") setOpenIdx((i) => (i === null ? null : (i + 1) % images.length));
      else if (e.key === "ArrowLeft") setOpenIdx((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIdx, images.length]);

  if (images.length === 0) return null;
  const current = openIdx !== null ? images[openIdx] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenIdx(idx)}
            aria-label={`이미지 확대: ${img.fileName}`}
            className="group block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.fileName}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            />
            <p className="truncate border-t border-[var(--border)] px-2 py-1 font-mono text-[10px] text-[var(--muted-foreground)]" title={img.fileName}>
              {img.fileName}
            </p>
          </button>
        ))}
      </div>

      {current !== null && openIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`이미지 확대 보기: ${current.fileName}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenIdx(null);
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between gap-3 text-white">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm">{current.fileName}</p>
              <p className="text-xs text-white/60">
                {openIdx + 1} / {images.length}
                {current.fileSize ? ` · ${current.fileSize.toLocaleString()} bytes` : ""}
              </p>
            </div>
            <a
              href={current.url}
              download={current.fileName}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              다운로드
            </a>
            <button
              type="button"
              onClick={() => setOpenIdx(null)}
              aria-label="닫기"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* 이미지 */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setOpenIdx((openIdx - 1 + images.length) % images.length)}
                aria-label="이전 이미지"
                className="absolute left-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.fileName}
              className="max-h-full max-w-full object-contain"
            />
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setOpenIdx((openIdx + 1) % images.length)}
                aria-label="다음 이미지"
                className="absolute right-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>

          <p className="text-center text-xs text-white/50">←/→ 이동 · Esc 닫기</p>
        </div>
      )}
    </>
  );
}
