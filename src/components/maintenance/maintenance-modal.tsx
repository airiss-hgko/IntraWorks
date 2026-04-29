"use client";

import { useEffect } from "react";
import { MaintenanceForm } from "./maintenance-form";

interface DeviceLite {
  id: number;
  productName: string;
  modelName: string;
  serialNumber: string;
}

interface MaintenanceLite {
  id: number;
  deviceId: number;
  maintenanceType: string;
  status: string;
  performedBy: string | null;
  performedAt: Date | string;
  description: string | null;
  cost: number | null;
  nextDueDate: Date | string | null;
  attachments: unknown;
}

interface Props {
  open: boolean;
  onClose: () => void;
  devices: DeviceLite[];
  fixedDeviceId?: number;
  initial?: MaintenanceLite | null;
  title?: string;
}

export function MaintenanceModal({ open, onClose, devices, fixedDeviceId, initial, title }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="maintenance-modal-title" className="text-lg font-bold text-[var(--foreground)]">
            {title || (initial ? "유지보수 수정" : "유지보수 등록")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <MaintenanceForm
          devices={devices}
          fixedDeviceId={fixedDeviceId}
          initial={initial}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
