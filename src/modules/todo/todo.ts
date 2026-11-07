export const STORAGE_KEY = "tiny-desk:todo:v1";
export const priorities = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};
export const recurrences = {
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
  weekdays: "工作日",
  weekends: "周末",
};
export interface Group {
  id: string;
  name: string;
  color: string;
  icon: string;
}
export interface Task {
  id: number;
  title: string;
  description: string;
  notes: string;
  groupId: string;
  priority: keyof typeof priorities;
  dueDate: string | null;
  recurring: keyof typeof recurrences | null;
  completed: boolean;
  completedAt: string | null;
  lastCompletedAt?: string | null;
  createdAt: string;
  order: number;
}
export interface TodoData {
  version: 1;
  groups: Group[];
  tasks: Task[];
}
export const defaults = (): TodoData => ({
  version: 1,
  groups: [
    { id: "default", name: "默认", color: "#245ddd", icon: "fa-list-check" },
  ],
  tasks: [],
});
export function today() {
  const d = new Date();
  return formatDate(d);
}
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(`${value}T12:00:00`);
  return Number.isFinite(d.getTime()) && formatDate(d) === value;
}
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("备份格式无效");
  return value as Record<string, unknown>;
}
function text(value: unknown, required = false): string {
  if (value == null && !required) return "";
  if (typeof value !== "string" || (required && !value.trim()))
    throw new Error("名称或文本格式无效");
  return value;
}
function timestamp(value: unknown, optional = false): string | null {
  if (optional && value == null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new Error("任务时间格式无效");
  return value;
}
export function validateData(input: unknown): TodoData {
  const d = obj(input);
  if (d.version !== undefined && d.version !== 1)
    throw new Error("不支持此备份版本");
  if (!Array.isArray(d.groups) || !d.groups.length || !Array.isArray(d.tasks))
    throw new Error("备份需包含至少一个分组和任务数组");
  const groups = d.groups.map((v) => {
    const g = obj(v);
    const id = text(g.id, true),
      name = text(g.name, true),
      color = text(g.color);
    if (id === "all" || !/^#[\da-f]{6}$/i.test(color))
      throw new Error("分组标识或颜色无效");
    return { id, name, color, icon: text(g.icon) };
  });
  if (new Set(groups.map((g) => g.id)).size !== groups.length)
    throw new Error("分组标识重复");
  const tasks = d.tasks.map((v) => {
    const t = obj(v);
    if (
      !Number.isSafeInteger(t.id) ||
      Number(t.id) < 1 ||
      !groups.some((g) => g.id === t.groupId) ||
      !Object.hasOwn(priorities, String(t.priority)) ||
      typeof t.completed !== "boolean" ||
      !Number.isFinite(t.order)
    )
      throw new Error("任务标识、分组、优先级或排序无效");
    if (t.dueDate != null && !validDate(t.dueDate))
      throw new Error("任务截止日期无效");
    if (t.recurring != null && !Object.hasOwn(recurrences, String(t.recurring)))
      throw new Error("重复规则无效");
    return {
      id: Number(t.id),
      title: text(t.title, true),
      description: text(t.description),
      notes: text(t.notes),
      groupId: String(t.groupId),
      priority: t.priority as Task["priority"],
      dueDate: (t.dueDate as string | null) ?? null,
      recurring: (t.recurring as Task["recurring"]) ?? null,
      completed: t.completed,
      completedAt: timestamp(t.completedAt, true),
      lastCompletedAt: timestamp(t.lastCompletedAt, true),
      createdAt: timestamp(t.createdAt)!,
      order: Number(t.order),
    };
  });
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length)
    throw new Error("任务标识重复");
  return { version: 1, groups, tasks };
}
export function nextDate(
  value: string,
  recurring: NonNullable<Task["recurring"]>,
): string {
  const d = new Date(`${value}T12:00:00`);
  if (recurring === "monthly") {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  } else if (recurring === "weekly") d.setDate(d.getDate() + 7);
  else {
    do {
      d.setDate(d.getDate() + 1);
    } while (
      recurring === "weekdays"
        ? [0, 6].includes(d.getDay())
        : recurring === "weekends"
          ? ![0, 6].includes(d.getDay())
          : false
    );
  }
  return formatDate(d);
}
export function toggleTask(
  data: TodoData,
  id: number,
  now = new Date().toISOString(),
): TodoData {
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id !== id
        ? t
        : t.completed
          ? { ...t, completed: false, completedAt: null }
          : t.recurring
            ? {
                ...t,
                dueDate: nextDate(t.dueDate ?? today(), t.recurring),
                lastCompletedAt: now,
                completed: false,
                completedAt: null,
              }
            : { ...t, completed: true, completedAt: now },
    ),
  };
}
export function removeGroup(data: TodoData, id: string): TodoData {
  if (data.groups.length <= 1) throw new Error("至少保留一个分组");
  const groups = data.groups.filter((g) => g.id !== id);
  return {
    ...data,
    groups,
    tasks: data.tasks.map((t) =>
      t.groupId === id ? { ...t, groupId: groups[0]!.id } : t,
    ),
  };
}
export function selectTasks(
  data: TodoData,
  group: string,
  query: string,
  priority: string,
  sort: string,
  showCompleted: boolean,
): Task[] {
  const weights = { high: 0, medium: 1, low: 2 },
    q = query.trim().toLowerCase();
  return data.tasks
    .filter(
      (t) =>
        (group === "all" || t.groupId === group) &&
        (priority === "all" || t.priority === priority) &&
        (showCompleted || !t.completed) &&
        (!q ||
          [t.title, t.description, t.notes].some((s) =>
            s.toLowerCase().includes(q),
          )),
    )
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.completed
          ? (Date.parse(b.completedAt ?? "") || 0) -
            (Date.parse(a.completedAt ?? "") || 0)
          : sort === "dueDate"
            ? (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
              a.order - b.order
            : sort === "createdAt"
              ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
              : weights[a.priority] - weights[b.priority] || a.order - b.order),
    );
}
export function reorder(
  data: TodoData,
  source: number,
  target: number,
  after = false,
): TodoData {
  const from = data.tasks.find((t) => t.id === source),
    to = data.tasks.find((t) => t.id === target);
  if (!from || !to || from.completed || to.completed || source === target)
    return data;
  const ordered = data.tasks
      .filter((t) => !t.completed)
      .sort((a, b) => a.order - b.order),
    result = ordered.filter((t) => t.id !== source);
  result.splice(
    result.findIndex((t) => t.id === target) + (after ? 1 : 0),
    0,
    from,
  );
  const positions = new Map(result.map((t, i) => [t.id, i]));
  return {
    ...data,
    tasks: data.tasks.map((t) => ({
      ...t,
      order: positions.get(t.id) ?? t.order,
      priority: t.id === source ? to.priority : t.priority,
    })),
  };
}
