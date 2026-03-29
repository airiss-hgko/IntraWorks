// SW 버전: X.X.X.X (4-part numeric)
const SW_REGEX = /^\d+\.\d+\.\d+\.\d+$/;

// AI 버전: X.X.X (3-part numeric)
const AI_REGEX = /^\d+\.\d+\.\d+$/;

// PLC 버전: RX.v.X.X.X.X (prefix + 4-part numeric)
const PLC_REGEX = /^RX\.v\.\d+\.\d+\.\d+\.\d+$/;

export type VersionType = "SW" | "AI" | "PLC";

export function validateVersion(
  version: string,
  type: VersionType
): { valid: boolean; message?: string } {
  if (!version || version === "-") {
    return { valid: true };
  }

  switch (type) {
    case "SW":
      if (!SW_REGEX.test(version)) {
        return {
          valid: false,
          message: "SW 버전 형식: X.X.X.X (예: 1.0.0.1)",
        };
      }
      break;
    case "AI":
      if (!AI_REGEX.test(version)) {
        return {
          valid: false,
          message: "AI 버전 형식: X.X.X (예: 1.0.0)",
        };
      }
      break;
    case "PLC":
      if (!PLC_REGEX.test(version)) {
        return {
          valid: false,
          message: "PLC 버전 형식: RX.v.X.X.X.X (예: RX.v.1.0.0.1)",
        };
      }
      break;
  }

  return { valid: true };
}

/** Parse numeric parts from a version string for comparison */
function parseNumericParts(version: string): number[] {
  return version.replace(/^RX\.v\./, "").split(".").map(Number);
}

/**
 * Compare two versions. Returns:
 *  1 if a > b (upgrade)
 *  0 if a == b (same)
 * -1 if a < b (downgrade)
 */
export function compareVersions(a: string, b: string): number {
  const partsA = parseNumericParts(a);
  const partsB = parseNumericParts(b);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * Check if deploying newVersion over currentVersion is a downgrade.
 * Returns true if it's a downgrade.
 */
export function isDowngrade(
  currentVersion: string | null,
  newVersion: string | null
): boolean {
  if (!currentVersion || !newVersion) return false;
  if (currentVersion === "-" || newVersion === "-") return false;
  return compareVersions(newVersion, currentVersion) < 0;
}
