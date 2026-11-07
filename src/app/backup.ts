import {
  STORAGE_KEY as TODO_KEY,
  validateData,
  type TodoData,
} from "../modules/todo/todo";
import {
  STORAGE_KEY as SITES_KEY,
  validatePreferences,
  type Preferences,
} from "../modules/sites/sites";
import {
  STORAGE_KEY as LEETCODE_KEY,
  validateState,
  type PracticeState,
} from "../modules/leetcode/leetcode";
import { THEME_STORAGE_KEY, type Theme } from "./theme";

export interface WorkspaceBackup {
  app: "tiny-desk";
  version: 1;
  appVersion: string;
  exportedAt: string;
  data: {
    todo: TodoData | null;
    sites: Preferences | null;
    leetcode: PracticeState | null;
    theme: Theme;
  };
}
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

type BackupStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const entries = [
  ["todo", TODO_KEY],
  ["sites", SITES_KEY],
  ["leetcode", LEETCODE_KEY],
  ["theme", THEME_STORAGE_KEY],
] as const;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("备份格式无效");
  return value as Record<string, unknown>;
}

// Validate every section before touching storage; null explicitly means an unused tool.
export function validateBackup(input: unknown): WorkspaceBackup {
  const file = object(input);
  if (file.app !== "tiny-desk" || file.version !== 1)
    throw new Error(
      "请选择小桌的全量备份文件；单个工具的备份请在对应工具中导入",
    );
  if (
    typeof file.appVersion !== "string" ||
    !file.appVersion.trim() ||
    typeof file.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(file.exportedAt))
  )
    throw new Error("备份版本信息或导出时间无效");
  const data = object(file.data);
  if (
    !["todo", "sites", "leetcode", "theme"].every((key) =>
      Object.hasOwn(data, key),
    )
  )
    throw new Error("备份缺少工具数据或主题设置，未导入任何内容");
  if (data.theme !== "light" && data.theme !== "dark")
    throw new Error("备份中的主题设置无效");
  return {
    app: "tiny-desk",
    version: 1,
    appVersion: file.appVersion,
    exportedAt: file.exportedAt,
    data: {
      todo: data.todo === null ? null : validateData(data.todo),
      sites: data.sites === null ? null : validatePreferences(data.sites),
      leetcode: data.leetcode === null ? null : validateState(data.leetcode),
      theme: data.theme,
    },
  };
}

export function createBackup(
  storage: BackupStorage,
  theme: Theme,
  appVersion: string,
): WorkspaceBackup {
  const read = (key: string) => {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  };
  // Do not silently omit unreadable records from a supposedly complete backup.
  return validateBackup({
    app: "tiny-desk",
    version: 1,
    appVersion,
    exportedAt: new Date().toISOString(),
    data: {
      todo: read(TODO_KEY),
      sites: read(SITES_KEY),
      leetcode: read(LEETCODE_KEY),
      theme,
    },
  });
}

export function restoreBackup(
  input: unknown,
  storage: BackupStorage,
): WorkspaceBackup {
  const backup = validateBackup(input);
  let previous: (readonly [string, string | null])[];
  try {
    previous = entries.map(([, key]) => [key, storage.getItem(key)] as const);
  } catch {
    throw new Error("无法读取当前记录，未导入任何内容。请检查浏览器存储权限");
  }
  const pending = entries.map(([section, key]) => {
    const value = backup.data[section];
    return [
      key,
      value === null
        ? null
        : section === "theme"
          ? String(value)
          : JSON.stringify(value),
    ] as const;
  });
  const changed: number[] = [];
  try {
    for (const [index, [key, raw]] of pending.entries()) {
      if (raw === previous[index]![1]) continue;
      changed.push(index);
      if (raw === null) storage.removeItem(key);
      else storage.setItem(key, raw);
    }
  } catch {
    // localStorage has no transactions: restore the exact original strings on failure.
    let rollbackFailed = false;
    for (const index of changed.reverse()) {
      const [key, raw] = previous[index]!;
      try {
        if (storage.getItem(key) === raw) continue;
        if (raw === null) storage.removeItem(key);
        else storage.setItem(key, raw);
      } catch {
        rollbackFailed = true;
      }
    }
    throw new Error(
      rollbackFailed
        ? "导入失败，部分原记录未能恢复。请保留备份文件，检查浏览器存储权限和空间后重新导入"
        : "导入失败，原记录已恢复。请检查浏览器存储权限和可用空间后重试",
    );
  }
  return backup;
}
