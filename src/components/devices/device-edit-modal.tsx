"use client";

import { useEffect, useState } from "react";
import { DeviceForm } from "./device-form";

interface DeviceProp {
  id: number;
  productName: string;
  modelName: string;
  serialNumber: string;
  deviceId: string;
  status: string;
  customerCountry: string | null;
  customerName: string | null;
  currentSwVersion: string | null;
  currentAiVersion: string | null;
  currentPlcVersion: string | null;
  notes: string | null;
}

export function DeviceEditModal({ device }: { device: DeviceProp }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        수정
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-edit-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="my-4 w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 id="device-edit-title" className="text-lg font-bold text-[var(--foreground)]">
                  장비 수정
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {device.modelName} · {device.serialNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <DeviceForm device={device} />
          </div>
        </div>
      )}
    </>
  );
}
