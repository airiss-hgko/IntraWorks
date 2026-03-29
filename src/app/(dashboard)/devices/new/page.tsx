import { DeviceForm } from "@/components/devices/device-form";
import Link from "next/link";

export default function NewDevicePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/devices"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          &larr; 장비 목록
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          장비 등록
        </h1>
      </div>

      <DeviceForm />
    </div>
  );
}
