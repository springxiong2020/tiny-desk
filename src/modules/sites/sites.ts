export interface Category {
  id: string;
  name: string;
}
export interface Site {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  category: string;
}
export interface Catalog {
  categories: Category[];
  sites: Site[];
}
export interface Preferences {
  version: 1;
  visits: Record<string, number>;
  pinned: string[];
  visitedOnly: boolean;
  dark: boolean;
}
export const STORAGE_KEY = "tiny-desk:sites:v1";
export const ENDPOINT =
  "https://api.springxiong.cn/self-hub/open/mine/websites";
export const defaults = (): Preferences => ({
  version: 1,
  visits: {},
  pinned: [],
  visitedOnly: false,
  dark: false,
});
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("数据格式无效");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function identity(value: unknown): string {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !String(value).trim() ||
    ["__proto__", "constructor", "prototype"].includes(String(value))
  )
    throw new Error("目录包含无效标识");
  return String(value);
}
export function safeUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function normalizeCatalog(input: unknown): Catalog {
  const data = object(input);
  if (!Array.isArray(data.categories) || !Array.isArray(data.sites))
    throw new Error("目录格式无效");
  const categories = data.categories.map((value) => {
    const c = object(value);
    const id = identity(c.value ?? c.id);
    const name = text(c.label ?? c.name);
    if (!name || id === "all") throw new Error("分类格式无效");
    return { id, name };
  });
  if (new Set(categories.map((c) => c.id)).size !== categories.length)
    throw new Error("分类标识重复");
  const sites = data.sites.map((value) => {
    const s = object(value),
      href = safeUrl(s.href ?? s.url),
      name = text(s.name),
      category = identity(s.category);
    if (!href || !name || !categories.some((c) => c.id === category))
      throw new Error("网站地址或分类无效");
    const rawIcon = text(s.icon);
    const icon =
      rawIcon.startsWith("./favicon/") && /^\.\/favicon\/[\w.-]+$/.test(rawIcon)
        ? `sites/${rawIcon.slice(2)}`
        : safeUrl(rawIcon);
    return {
      id: identity(s.id),
      name,
      href,
      category,
      description: text(s.description) || text(s.title),
      icon,
    };
  });
  if (new Set(sites.map((s) => s.id)).size !== sites.length)
    throw new Error("网站标识重复");
  return { categories, sites };
}
export function validatePreferences(input: unknown): Preferences {
  const data = object(input),
    legacy = "site_visit_counts" in data;
  if (!legacy && data.version !== 1) throw new Error("不支持此备份版本");
  const rawVisits = object(legacy ? data.site_visit_counts : data.visits);
  const visits: Record<string, number> = {};
  for (const [id, count] of Object.entries(rawVisits)) {
    identity(id);
    if (!Number.isSafeInteger(count) || Number(count) < 0)
      throw new Error("访问次数必须为非负整数");
    visits[id] = Number(count);
  }
  const pinned = legacy ? [] : data.pinned;
  if (!Array.isArray(pinned) || pinned.some((id) => typeof id !== "string"))
    throw new Error("置顶记录无效");
  pinned.forEach(identity);
  const visitedOnly = legacy
    ? data.site_all_filter === "visited"
    : data.visitedOnly;
  const dark = legacy
    ? data.site_dark_mode === true || data.site_dark_mode === "true"
    : data.dark;
  if (typeof visitedOnly !== "boolean" || typeof dark !== "boolean")
    throw new Error("显示偏好无效");
  return {
    version: 1,
    visits,
    pinned: [...new Set(pinned)],
    visitedOnly,
    dark,
  };
}
export function selectSites(
  catalog: Catalog,
  prefs: Preferences,
  category: string,
  query: string,
): Site[] {
  const keyword = query.trim().toLocaleLowerCase();
  const categories = new Map(catalog.categories.map((c, i) => [c.id, i]));
  return catalog.sites
    .filter(
      (s) =>
        (category === "all" || s.category === category) &&
        (category !== "all" ||
          !prefs.visitedOnly ||
          (prefs.visits[s.id] ?? 0) > 0) &&
        (!keyword ||
          [s.name, s.description, s.href].some((v) =>
            v.toLocaleLowerCase().includes(keyword),
          )),
    )
    .sort(
      (a, b) =>
        Number(prefs.pinned.includes(b.id)) -
          Number(prefs.pinned.includes(a.id)) ||
        (prefs.visits[b.id] ?? 0) - (prefs.visits[a.id] ?? 0) ||
        (categories.get(a.category) ?? 999) -
          (categories.get(b.category) ?? 999),
    );
}
