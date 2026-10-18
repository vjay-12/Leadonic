/** Indian phone numbers: "077088 96226", "+91 87788 58303", "8778858303" -> 10 digits */
export function normalizePhone(raw: unknown): string | null {
  if (raw == null) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? d : null;
}

/** One key per lead. Phone if we have it, otherwise title + address. */
export function makeDedupeKey(
  title: string,
  address: string | null | undefined,
  phoneNormalized: string | null
): string {
  if (phoneNormalized) return `p:${phoneNormalized}`;
  return `t:${title.trim().toLowerCase()}|${(address ?? "").trim().toLowerCase()}`;
}

/** One key per school: "p:" + phone, or "t:" + lower(name) + "|" + lower(area) when there is no phone */
export function makeSchoolDedupeKey(
  name: string,
  area: string | null | undefined,
  phoneNormalized: string | null
): string {
  if (phoneNormalized) return `p:${phoneNormalized}`;
  return `t:${name.trim().toLowerCase()}|${(area ?? "").trim().toLowerCase()}`;
}

export function parseBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return null;
}

export function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Excel header -> lead field. Normalize headers first:
// trim, lowercase, replace spaces and hyphens with "_".
export const HEADER_TO_FIELD: Record<string, string> = {
  title: "title",
  name: "title",
  phone: "phone",
  emails: "emails",
  email: "emails",
  website: "website",
  category: "mapsCategory", // scraper's Google Maps category, NOT our Category
  address: "address",
  review_rating: "reviewRating",
  review_count: "reviewCount",
  has_website: "hasWebsite",
  needs_website: "needsWebsite",
  erp_match: "erpMatch",
  needs_erp: "needsErp",
  priority_score: "priorityScore",
  priority: "priority",
};
