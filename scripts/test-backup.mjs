import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const box = {
    exports: {},
    window: { matchMedia: () => ({ matches: false }) },
    document: { documentElement: { dataset: {} }, querySelector: () => null },
    localStorage: { getItem: () => null },
    require: (name) =>
      name.startsWith(".")
        ? load(path.resolve(path.dirname(file), `${name}.ts`))
        : require(name),
  };
  cache.set(file, box.exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  vm.runInNewContext(outputText, box);
  return box.exports;
}
const app = fileURLToPath(new URL("../src/app/", import.meta.url));
const { createBackup, validateBackup, restoreBackup } = load(
  path.join(app, "backup.ts"),
);
const { STORAGE_KEY: todoKey, defaults } = load(
  path.join(app, "../modules/todo/todo.ts"),
);
const { STORAGE_KEY: sitesKey } = load(
  path.join(app, "../modules/sites/sites.ts"),
);
const { STORAGE_KEY: leetcodeKey } = load(
  path.join(app, "../modules/leetcode/leetcode.ts"),
);
const { THEME_STORAGE_KEY: themeKey } = load(path.join(app, "theme.ts"));
const key = {
  todo: todoKey,
  sites: sitesKey,
  leetcode: leetcodeKey,
  theme: themeKey,
};
class MemoryStorage {
  data = new Map();
  writes = 0;
  failAt = new Set();
  getItem(name) {
    return this.data.get(name) ?? null;
  }
  change(name, value) {
    if (this.failAt.has(++this.writes)) throw new Error("QuotaExceededError");
    if (value === null) this.data.delete(name);
    else this.data.set(name, value);
  }
  setItem(name, value) {
    this.change(name, value);
  }
  removeItem(name) {
    this.change(name, null);
  }
}
const source = new MemoryStorage();
const taskData = defaults();
taskData.tasks.push({
  id: 1,
  title: "保留备注与重复规则",
  description: "说明",
  notes: "备份内容",
  groupId: "default",
  priority: "high",
  dueDate: "2026-11-08",
  recurring: "daily",
  completed: false,
  completedAt: null,
  lastCompletedAt: null,
  createdAt: "2026-11-07T10:00:00Z",
  order: 0,
});
source.setItem(key.todo, JSON.stringify(taskData));
source.setItem(
  key.sites,
  JSON.stringify({
    version: 1,
    visits: { site1: 3 },
    pinned: ["site1"],
    visitedOnly: true,
    dark: false,
  }),
);
source.setItem(
  key.leetcode,
  JSON.stringify({
    version: 1,
    round: 2,
    order: Array.from({ length: 100 }, (_, i) => i + 1),
    records: { 1: { completed: true, time: 1794000000000 } },
    daysOffset: 3,
  }),
);
source.setItem(key.theme, "dark");
source.setItem("unrelated", "leave me alone");
const backup = createBackup(source, "dark", "1.0.0");
const serialized = JSON.stringify(backup);
const target = new MemoryStorage();
target.setItem("unrelated", "keep this");
restoreBackup(JSON.parse(serialized), target);
for (const name of [key.todo, key.sites, key.leetcode])
  assert.deepEqual(
    JSON.parse(target.getItem(name)),
    JSON.parse(source.getItem(name)),
  );
assert.equal(target.getItem(key.theme), "dark");
assert.equal(target.getItem("unrelated"), "keep this");
assert.equal(
  JSON.stringify(validateBackup(JSON.parse(serialized))),
  serialized,
);

// Unused tools stay absent, rather than creating artificial tasks or a question order.
const empty = createBackup(new MemoryStorage(), "light", "1.0.0");
assert.equal(empty.data.todo, null);
restoreBackup(empty, target);
for (const name of [key.todo, key.sites, key.leetcode])
  assert.equal(target.getItem(name), null);
assert.equal(target.getItem(key.theme), "light");
assert.equal(target.getItem("unrelated"), "keep this");

// Invalid sections, incomplete files and standalone tool backups cannot mutate storage.
const before = [...target.data];
for (const modify of [
  (b) => {
    b.version = 99;
  },
  (b) => {
    b.app = "other";
  },
  (b) => {
    delete b.data.todo;
  },
  (b) => {
    b.data.theme = "unknown";
  },
  (b) => {
    b.exportedAt = "invalid";
  },
  (b) => {
    b.data.todo.tasks[0].groupId = "missing";
  },
  (b) => {
    b.data.sites.visits.site1 = -1;
  },
  (b) => {
    b.data.leetcode.order = [1];
  },
]) {
  const invalid = JSON.parse(serialized);
  modify(invalid);
  assert.throws(() => restoreBackup(invalid, target));
  assert.deepEqual([...target.data], before);
}
assert.throws(() => validateBackup(taskData));
assert.throws(() => validateBackup(null));

// Every possible write failure must restore exact original strings, including null keys.
for (const failAt of [1, 2, 3, 4]) {
  const storage = new MemoryStorage();
  storage.data.set(key.todo, "original formatting is preserved");
  storage.data.set(key.theme, "light");
  storage.data.set("unrelated", "untouched");
  const original = [...storage.data].sort();
  storage.failAt.add(failAt);
  assert.throws(() => restoreBackup(backup, storage), /原记录已恢复/);
  assert.deepEqual([...storage.data].sort(), original);
}
// Failure while removing unused-tool data also rolls back the removals.
const clearFailure = new MemoryStorage();
for (const [name, value] of source.data) clearFailure.data.set(name, value);
clearFailure.failAt.add(3);
assert.throws(() => restoreBackup(empty, clearFailure), /原记录已恢复/);
assert.deepEqual([...clearFailure.data].sort(), [...source.data].sort());
const rollbackFailure = new MemoryStorage();
rollbackFailure.failAt = new Set([2, 3]);
assert.throws(
  () => restoreBackup(backup, rollbackFailure),
  /部分原记录未能恢复/,
);
const unreadable = new MemoryStorage();
unreadable.data.set(key.todo, "{broken json");
assert.throws(() => createBackup(unreadable, "light", "1.0.0"));
const invalidRecord = new MemoryStorage();
invalidRecord.data.set(key.sites, JSON.stringify({ version: 1 }));
assert.throws(() => createBackup(invalidRecord, "light", "1.0.0"));
const blocked = {
  getItem() {
    throw new Error("Storage disabled");
  },
  setItem() {
    assert.fail("must not write");
  },
  removeItem() {
    assert.fail("must not remove");
  },
};
assert.throws(() => restoreBackup(backup, blocked));
assert.throws(() => createBackup(blocked, "light", "1.0.0"));
console.log(
  "Backup: full round trip, empty tools, schema rejection, exact rollback for every write, failed rollback reporting and corrupt/blocked storage checks passed.",
);
