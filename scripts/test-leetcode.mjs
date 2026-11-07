import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
// Synthetic test data only; the application always fetches its actual catalog.
const problems = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  title: `测试题 ${i + 1}`,
  difficulty: "简单",
  url: `https://leetcode.cn/problems/test-${i + 1}/`,
}));
const source = fs.readFileSync(
  new URL("../src/modules/leetcode/leetcode.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2022,
  },
});
const sandbox = { exports: {}, URL };
vm.runInNewContext(outputText, sandbox);
const {
  fetchProblems,
  validateProblems,
  freshState,
  validateState,
  currentProblem,
  finishedCount,
  shuffle,
  elapsedDays,
} = sandbox.exports;
const state = freshState(problems);
assert.equal(problems.length, 100);
assert.equal(new Set(state.order).size, 100);
assert.deepEqual(
  [...state.order].sort((a, b) => a - b),
  problems.map((p) => p.id).sort((a, b) => a - b),
);
assert.equal(finishedCount(state), 0);
assert.equal(elapsedDays(state), null);
const original = [...state.order];
const first = currentProblem(state, problems);
state.records[first.id] = {
  completed: true,
  time: new Date(2026, 10, 6, 23, 59).getTime(),
};
assert.equal(finishedCount(state), 1);
assert.notEqual(currentProblem(state, problems).id, first.id);
assert.equal(elapsedDays(state, new Date(2026, 10, 7, 0, 1).getTime()), 2);
const reshuffled = shuffle(state.order);
assert.deepEqual([...state.order], original);
assert.equal(finishedCount({ ...state, order: reshuffled }), 1);
const legacy = {
  lc_current_batch: 3,
  lc_batch_questions: state.order,
  lc_finished_records: state.records,
  lc_used_days_offset: "4",
};
assert.equal(validateState(legacy, problems).round, 3);
assert.equal(validateState(legacy, problems).daysOffset, 4);
assert.equal(
  validateState(JSON.parse(JSON.stringify(state)), problems).records[first.id]
    .completed,
  true,
);
assert.throws(() => validateState({ ...state, order: Array(100).fill(1) }));
assert.throws(() =>
  validateState({ ...state, records: { 9999: { completed: true, time: 1 } } }),
);
assert.throws(() =>
  validateState({ ...state, records: { 1: { completed: true, time: -1 } } }),
);
assert.throws(() => validateState({ ...state, version: 99 }));
for (const id of state.order)
  state.records[id] = { completed: true, time: Date.now() };
assert.equal(finishedCount(state), 100);
assert.equal(currentProblem(state, problems), undefined);
const next = freshState(problems, state.round + 1);
assert.equal(next.round, 2);
assert.equal(finishedCount(next), 0);
assert.equal(new Set(next.order).size, 100);
console.log(
  "LeetCode: 100 unique problems, queue progression, shuffle preservation, natural days, migration validation, full round and next round passed.",
);

assert.equal(validateProblems(problems).length, 100);
assert.throws(() => validateProblems([]));
assert.throws(() => validateProblems(problems.map(() => problems[0])));
assert.throws(() =>
  validateProblems(problems.map((p) => ({ ...p, url: "javascript:alert(1)" }))),
);
assert.throws(() =>
  validateState(
    state,
    problems.map((p) => ({ ...p, id: p.id + 1000 })),
  ),
);
assert.equal(validateState(state).round, state.round); // Home summary needs no network.
const controller = new AbortController();
let requestCount = 0;
const fetched = await fetchProblems(controller.signal, async (url, options) => {
  requestCount++;
  assert.equal(url, "https://img.springxiong.cn/leetcode-hot100.json");
  assert.equal(options.signal, controller.signal);
  assert.equal(options.credentials, "omit");
  return { ok: true, json: async () => problems };
});
assert.equal(fetched.length, 100);
assert.equal(requestCount, 1);
await assert.rejects(
  fetchProblems(controller.signal, async () => ({ ok: false })),
);
await assert.rejects(
  fetchProblems(controller.signal, async () => ({
    ok: true,
    json: async () => ({ data: [] }),
  })),
);
await assert.rejects(
  fetchProblems(controller.signal, async () => {
    throw new Error("Network unavailable");
  }),
);
console.log(
  "Remote catalog: schema validation, request URL, successful fetch, HTTP/network/invalid payload failures and saved-catalog mismatch checks passed.",
);
