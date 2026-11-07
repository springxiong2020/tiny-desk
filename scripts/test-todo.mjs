import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = fs.readFileSync(
  new URL("../src/modules/todo/todo.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const box = { exports: {} };
vm.runInNewContext(outputText, box);
const {
  defaults,
  validateData,
  nextDate,
  toggleTask,
  removeGroup,
  selectTasks,
  reorder,
} = box.exports;
const task = (id, extra = {}) => ({
  id,
  title: `任务 ${id}`,
  description: "描述",
  notes: "重要备注",
  groupId: "default",
  priority: "medium",
  dueDate: null,
  recurring: null,
  completed: false,
  completedAt: null,
  createdAt: "2026-11-07T10:00:00Z",
  order: id,
  ...extra,
});
const original = {
  ...defaults(),
  tasks: [
    task(1),
    task(2, { priority: "high", dueDate: "2026-11-08" }),
    task(3, { priority: "low" }),
  ],
};
assert.equal(
  validateData(JSON.parse(JSON.stringify(original))).tasks.length,
  3,
);
const { version, ...legacy } = original;
assert.equal(validateData(legacy).version, 1);
assert.equal(nextDate("2026-01-31", "monthly"), "2026-02-28");
assert.equal(nextDate("2024-01-31", "monthly"), "2024-02-29");
assert.equal(nextDate("2026-11-06", "weekdays"), "2026-11-09");
assert.equal(nextDate("2026-11-08", "weekends"), "2026-11-14");
assert.equal(nextDate("2026-11-07", "weekly"), "2026-11-14");
assert.equal(nextDate("2026-12-31", "daily"), "2027-01-01");
let finished = toggleTask(original, 1, "2026-11-07T12:00:00Z");
assert.equal(finished.tasks[0].completed, true);
assert.equal(original.tasks[0].completed, false);
assert.equal(toggleTask(finished, 1).tasks[0].completed, false);
const recurring = {
  ...defaults(),
  tasks: [task(1, { dueDate: "2026-11-06", recurring: "weekdays" })],
};
const extended = toggleTask(recurring, 1, "2026-11-07T12:00:00Z").tasks[0];
assert.equal(extended.dueDate, "2026-11-09");
assert.equal(extended.completed, false);
assert.ok(extended.lastCompletedAt);
assert.deepEqual(
  Array.from(
    selectTasks(original, "all", "", "all", "order", true),
    (t) => t.id,
  ),
  [2, 1, 3],
);
assert.equal(
  selectTasks(original, "all", "重要备注", "high", "dueDate", true).length,
  1,
);
assert.equal(selectTasks(finished, "all", "", "all", "order", false).length, 2);
const ordered = reorder(original, 1, 2);
assert.equal(ordered.tasks[0].priority, "high");
assert.ok(ordered.tasks[0].order < ordered.tasks[1].order);
const down = reorder(original, 2, 1, true);
assert.equal(down.tasks[1].priority, "medium");
assert.ok(down.tasks[1].order > down.tasks[0].order);
const grouped = {
  ...original,
  groups: [
    ...original.groups,
    { id: "work", name: "工作", color: "#245ddd", icon: "fa-folder" },
  ],
  tasks: [task(1, { groupId: "work" })],
};
assert.equal(removeGroup(grouped, "work").tasks[0].groupId, "default");
assert.throws(() => removeGroup(original, "default"));
assert.throws(() =>
  validateData({ ...original, tasks: [task(1, { groupId: "missing" })] }),
);
assert.throws(() =>
  validateData({ ...original, tasks: [task(1, { dueDate: "2026-02-30" })] }),
);
assert.throws(() => validateData({ ...original, tasks: [task(1), task(1)] }));
assert.throws(() => validateData({ ...original, version: 2 }));
console.log(
  "Todo: legacy backup validation, task completion, recurring dates, filtering, priority ordering, bidirectional movement, group migration and invalid data checks passed.",
);
