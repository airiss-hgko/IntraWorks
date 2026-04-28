// 배포 이력 설치처 분류 룰. 신규 분류가 필요해지면 이 파일만 수정.

export type SiteCategory = "우정국" | "교정시설" | "시험·인증기관" | "해외" | "기타";

export const SITE_CATEGORY_ORDER: SiteCategory[] = [
  "우정국",
  "교정시설",
  "시험·인증기관",
  "해외",
  "기타",
];

const FOREIGN_COUNTRIES = [
  "대만", "미국", "싱가폴", "싱가포르", "필리핀", "일본", "중국", "베트남",
  "태국", "인도네시아", "말레이시아", "인도", "독일", "프랑스", "영국",
  "호주", "캐나다", "멕시코", "브라질", "아랍에미리트", "사우디아라비아",
];

function matchCategory(s: string): SiteCategory | null {
  if (/우정국|우체국|우편/.test(s)) return "우정국";
  if (/구치소|교도소/.test(s)) return "교정시설";
  if (/^KTL\b|항공보안인증/.test(s)) return "시험·인증기관";
  for (const c of FOREIGN_COUNTRIES) {
    if (s.startsWith(c)) return "해외";
  }
  return null;
}

export function categorizeSite(
  site: string | null | undefined,
  customerCountry?: string | null
): SiteCategory {
  const s = (site || "").trim();
  if (s) {
    const m = matchCategory(s);
    if (m) return m;
  }
  // device 의 customerCountry 로 fallback
  const c = (customerCountry || "").trim();
  if (c && c !== "대한민국" && FOREIGN_COUNTRIES.includes(c)) return "해외";
  return "기타";
}

// 장비 단위 분류: customerName, installLocation, customerCountry 모두 고려
export function categorizeDevice(input: {
  customerName?: string | null;
  installLocation?: string | null;
  customerCountry?: string | null;
}): SiteCategory {
  const sources = [input.installLocation, input.customerName]
    .map((v) => (v || "").trim())
    .filter(Boolean);
  for (const s of sources) {
    const m = matchCategory(s);
    if (m) return m;
  }
  const c = (input.customerCountry || "").trim();
  if (c && c !== "대한민국" && FOREIGN_COUNTRIES.includes(c)) return "해외";
  return "기타";
}

// 카테고리 내에서 그룹 헤더로 묶을 키
// 우정국(광화문) → "광화문", 울산 구치소 → "울산 구치소", 대만(...) → "대만"
export function siteGroupKey(
  site: string | null | undefined,
  category: SiteCategory,
  customerCountry?: string | null
): string {
  const s = (site || "").trim();
  if (!s) return customerCountry || "미지정";

  if (category === "우정국") {
    const m = s.match(/우정국\(([^)]+)\)/);
    return m ? `우정국 · ${m[1].trim()}` : s;
  }
  if (category === "교정시설") {
    const m = s.match(/^(\S+)\s*(구치소|교도소)/);
    return m ? `${m[1]} ${m[2]}` : s;
  }
  if (category === "해외") {
    const m = s.match(/^([^(\s]+)/);
    return m ? m[1].trim() : s;
  }
  if (category === "시험·인증기관") {
    const m = s.match(/^([^(]+)/);
    return m ? m[1].trim() : s;
  }
  return s;
}
