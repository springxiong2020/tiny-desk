export const PROBLEMS_URL = "https://img.springxiong.cn/leetcode-hot100.json";
export interface Problem {
  id: number;
  title: string;
  difficulty: "简单" | "中等" | "困难";
  url: string;
}
export function validateProblems(input: unknown): Problem[] {
  if (!Array.isArray(input) || input.length !== 100)
    throw new Error("题库需包含 100 道题");
  const problems = input.map((value) => {
    if (!value || typeof value !== "object") throw new Error("题目格式无效");
    const p = value as Record<string, unknown>;
    if (
      !Number.isSafeInteger(p.id) ||
      Number(p.id) < 1 ||
      typeof p.title !== "string" ||
      !p.title.trim() ||
      !["简单", "中等", "困难"].includes(String(p.difficulty)) ||
      typeof p.url !== "string"
    )
      throw new Error("题目字段无效");
    const url = new URL(p.url);
    if (url.protocol !== "https:" && url.protocol !== "http:")
      throw new Error("题目链接无效");
    return {
      id: Number(p.id),
      title: p.title,
      difficulty: p.difficulty as Problem["difficulty"],
      url: url.href,
    };
  });
  if (new Set(problems.map((p) => p.id)).size !== 100)
    throw new Error("题库中存在重复题号");
  return problems;
}
export async function fetchProblems(
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<Problem[]> {
  const response = await request(PROBLEMS_URL, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("题库请求失败");
  return validateProblems(await response.json());
}
export const STORAGE_KEY = "tiny-desk:leetcode:v1";
export interface RecordEntry {
  completed: boolean;
  time: number;
}
export interface PracticeState {
  version: 1;
  round: number;
  order: number[];
  records: Record<string, RecordEntry>;
  daysOffset: number;
}

export function shuffle(order: number[]): number[] {
  const result = [...order];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function freshState(problems: Problem[], round = 1): PracticeState {
  return {
    version: 1,
    round,
    order: shuffle(problems.map((p) => p.id)),
    records: {},
    daysOffset: 0,
  };
}
export function validateState(
  input: unknown,
  problems?: Problem[],
): PracticeState {
  if (!input || typeof input !== "object")
    throw new Error("文件内容不是有效的刷题数据");
  const data = input as Record<string, unknown>;
  // Accept the previous HTML tool's four storage keys as well as the versioned format.
  const legacy = "lc_current_batch" in data;
  if (!legacy && data.version !== 1) throw new Error("不支持此数据版本");
  const round = legacy ? data.lc_current_batch : data.round;
  const order = legacy ? data.lc_batch_questions : data.order;
  const records = legacy ? data.lc_finished_records : data.records;
  const offset = legacy
    ? Number(data.lc_used_days_offset ?? 0)
    : data.daysOffset;
  if (
    !Number.isSafeInteger(round) ||
    Number(round) < 1 ||
    !Array.isArray(order) ||
    order.length !== 100 ||
    new Set(order).size !== 100 ||
    order.some((id) => !Number.isSafeInteger(id) || id < 1) ||
    (problems !== undefined &&
      order.some((id) => !problems.some((p) => p.id === id)))
  )
    throw new Error("轮次或题序无效，需要完整且不重复的 100 道题");
  if (
    !records ||
    typeof records !== "object" ||
    Array.isArray(records) ||
    !Number.isSafeInteger(offset)
  )
    throw new Error("完成记录或用时偏移无效");
  const clean: Record<string, RecordEntry> = {};
  for (const [id, value] of Object.entries(records)) {
    if (
      !(order as number[]).includes(Number(id)) ||
      String(Number(id)) !== id ||
      !value ||
      typeof value !== "object"
    )
      throw new Error("完成记录包含无效题号");
    const entry = value as RecordEntry;
    if (
      typeof entry.completed !== "boolean" ||
      !Number.isFinite(entry.time) ||
      entry.time <= 0 ||
      entry.time > 8640000000000000
    )
      throw new Error("完成时间无效");
    clean[id] = { completed: entry.completed, time: entry.time };
  }
  return {
    version: 1,
    round: Number(round),
    order: [...order],
    records: clean,
    daysOffset: Number(offset),
  };
}
export function finishedCount(state: PracticeState) {
  return Object.values(state.records).filter((r) => r.completed).length;
}
export function totalCount(state: PracticeState) {
  return 100;
}
export function currentProblem(state: PracticeState, problems: Problem[]) {
  return problems.find(
    (p) => p.id === state.order.find((id) => !state.records[id]?.completed),
  );
}
export function elapsedDays(
  state: PracticeState,
  now = Date.now(),
): number | null {
  const times = Object.values(state.records)
    .filter((r) => r.completed)
    .map((r) => r.time);
  if (!times.length) return null;
  const day = (time: number) => {
    const d = new Date(time);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  return Math.max(
    1,
    Math.round((day(now) - day(Math.min(...times))) / 86400000) +
      1 +
      state.daysOffset,
  );
}
