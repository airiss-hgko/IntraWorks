// 배포 번들 폴더 파싱 헬퍼.
// 입력: 파일 경로 목록 (브라우저 webkitRelativePath 또는 그 변형)
// 출력: 인식된 번들 묶음 [{deviceId, date, files[]}]

export interface RawFile {
  path: string;       // 폴더 트리 내 상대 경로
  fileName: string;
  size: number;
}

export type BundleCategory = "Config" | "DM" | "Calibration";

export interface ParsedFile {
  category: BundleCategory;
  fileName: string;
  relativePath: string;       // bundle 내 상대 경로 ("Config/Config.local.json")
  size: number;
  origPath: string;           // 원본 path (업로드 매칭용)
}

export interface ParsedBundle {
  deviceCode: string;         // 폴더에서 추출한 deviceId 후보 (예: "6040DA004")
  bundleDate: string;         // ISO date (YYYY-MM-DD)
  files: ParsedFile[];
}

const DATE_RE = /^(\d{4})(\d{2})(\d{2})$/;

function parseFolderDate(folder: string): string | null {
  const m = folder.match(DATE_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function categorize(folderName: string): BundleCategory | null {
  const lower = folderName.toLowerCase();
  if (lower === "config") return "Config";
  if (lower === "dm setting" || lower === "dmsetting") return "DM";
  // Offset/Gain/Background 등 캘리브레이션 데이터를 받는 폴더 (향후 캡처 시작될 때를 위해)
  if (lower === "calibration" || lower === "offsetgain" || lower === "intensity") return "Calibration";
  return null;
}

/** 번들 파일 목록에 캘리브레이션(Offset/Gain/Background) 데이터가 포함되어 있는지 */
export function hasCalibrationData(files: { category: string; fileName: string }[]): boolean {
  return files.some(
    (f) =>
      f.category === "Calibration" ||
      /\b(offset|gain|background|calibration)\b/i.test(f.fileName)
  );
}

/**
 * 입력된 파일 목록을 (deviceCode, date) 단위로 묶어 번들 후보를 반환한다.
 * 인식 패턴: ".../{deviceCode}/{YYYYMMDD}/{Config|DM Setting}/{fileName}"
 * - 인식 못 한 파일은 무시 (Logs, 설치파일 등)
 */
export function parseFiles(files: RawFile[]): ParsedBundle[] {
  const groups = new Map<string, ParsedBundle>();

  for (const f of files) {
    const segments = f.path.split(/[\\/]/).filter(Boolean);
    if (segments.length < 4) continue;

    // 마지막 4개 세그먼트가 (deviceCode/date/category/fileName) 라고 가정하고
    // 그 위치를 뒤에서부터 찾음
    for (let i = segments.length - 4; i >= 0; i--) {
      const [deviceCode, dateSeg, catSeg, ...rest] = segments.slice(i);
      const date = parseFolderDate(dateSeg);
      const category = categorize(catSeg);
      if (!date || !category) continue;
      // deviceCode는 영숫자 + 길이 5~30 정도
      if (!/^[A-Za-z0-9_-]{4,30}$/.test(deviceCode)) continue;

      const fileName = rest.join("/");
      if (!fileName) continue;

      const key = `${deviceCode}|${date}`;
      let bundle = groups.get(key);
      if (!bundle) {
        bundle = { deviceCode, bundleDate: date, files: [] };
        groups.set(key, bundle);
      }
      bundle.files.push({
        category,
        fileName,
        relativePath: `${catSeg}/${fileName}`,
        size: f.size,
        origPath: f.path,
      });
      break;
    }
  }

  // 정렬: 날짜 내림차순, 같은 날짜는 deviceCode
  return Array.from(groups.values()).sort((a, b) => {
    if (a.bundleDate !== b.bundleDate) return a.bundleDate < b.bundleDate ? 1 : -1;
    return a.deviceCode.localeCompare(b.deviceCode);
  });
}

/**
 * SystemConfig.json (또는 StatusReport 의 System 섹션) 에서 카운터 추출.
 */
export function extractSystemCounters(jsonObj: unknown): {
  imageCount?: number;
  totalSystemTime?: string;
  totalSourceTime?: string;
  sourceOnCount?: number;
  lastCalibrationDate?: Date;
} {
  if (!jsonObj || typeof jsonObj !== "object") return {};
  const root = jsonObj as Record<string, unknown>;
  const sys = (root.System ?? root) as Record<string, unknown>;

  const out: ReturnType<typeof extractSystemCounters> = {};
  if (typeof sys.ImageCount === "number") out.imageCount = sys.ImageCount;
  if (typeof sys.TotalSystemTime === "string") out.totalSystemTime = sys.TotalSystemTime;
  if (typeof sys.TotalSourceTime === "string") out.totalSourceTime = sys.TotalSourceTime;
  if (typeof sys.SourceOnCount === "number") out.sourceOnCount = sys.SourceOnCount;
  if (typeof sys.LastCalibrationDate === "string") {
    const d = new Date(sys.LastCalibrationDate);
    if (!isNaN(d.getTime())) out.lastCalibrationDate = d;
  }
  return out;
}

/**
 * Config.DM.json — [{ DetectorIndex, Modules: [{ High, Low }, ...] }, ...]
 * 인텐시티 평균/최소/최대 요약 계산.
 */
export function summarizeIntensity(jsonObj: unknown): {
  intensityDetectors?: number;
  intensityModules?: number;
  intensityAvgHigh?: number;
  intensityAvgLow?: number;
  intensityMinHigh?: number;
  intensityMaxHigh?: number;
  intensityMinLow?: number;
  intensityMaxLow?: number;
} {
  if (!Array.isArray(jsonObj) || jsonObj.length === 0) return {};

  const detectors = jsonObj as Array<{ DetectorIndex?: number; Modules?: Array<{ High?: number; Low?: number }> }>;
  const allHigh: number[] = [];
  const allLow: number[] = [];
  let modulesPerDet = 0;

  for (const d of detectors) {
    if (!Array.isArray(d?.Modules)) continue;
    if (modulesPerDet === 0) modulesPerDet = d.Modules.length;
    for (const m of d.Modules) {
      if (typeof m.High === "number") allHigh.push(m.High);
      if (typeof m.Low === "number") allLow.push(m.Low);
    }
  }

  if (allHigh.length === 0 && allLow.length === 0) return {};

  const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;
  return {
    intensityDetectors: detectors.length,
    intensityModules: modulesPerDet,
    intensityAvgHigh: allHigh.length ? +avg(allHigh).toFixed(2) : undefined,
    intensityAvgLow: allLow.length ? +avg(allLow).toFixed(2) : undefined,
    intensityMinHigh: allHigh.length ? Math.min(...allHigh) : undefined,
    intensityMaxHigh: allHigh.length ? Math.max(...allHigh) : undefined,
    intensityMinLow: allLow.length ? Math.min(...allLow) : undefined,
    intensityMaxLow: allLow.length ? Math.max(...allLow) : undefined,
  };
}

export function isJsonFile(name: string): boolean {
  return /\.json$/i.test(name);
}

export function isImageFile(name: string): boolean {
  return /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(name);
}
