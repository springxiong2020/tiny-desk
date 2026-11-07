import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/modules/sites/sites.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
);
const sandbox = { exports: {}, URL };
vm.runInNewContext(outputText, sandbox);
const {
  normalizeCatalog,
  defaults,
  selectSites,
  validatePreferences,
  safeUrl,
} = sandbox.exports;
const sample = normalizeCatalog({
  categories: [
    { id: 1, value: "dev", label: "开发工具" },
    { id: 2, value: "ai", label: "人工智能" },
  ],
  sites: [
    {
      id: 1,
      name: "Vue",
      description: "框架",
      href: "https://vuejs.org",
      category: "dev",
    },
    {
      id: 2,
      name: "ChatGPT",
      title: "AI assistant",
      href: "https://chatgpt.com",
      category: "ai",
    },
    { id: 3, name: "Vite", href: "https://vite.dev", category: "dev" },
  ],
});
assert.equal(normalizeCatalog({ categories: [], sites: [] }).sites.length, 0);
const prefs = defaults();
assert.deepEqual(
  Array.from(selectSites(sample, prefs, "all", ""), (s) => s.id),
  ["1", "3", "2"],
);
prefs.visits = { 2: 5, 3: 2 };
assert.deepEqual(
  Array.from(selectSites(sample, prefs, "all", ""), (s) => s.id),
  ["2", "3", "1"],
);
prefs.pinned = ["1"];
assert.equal(selectSites(sample, prefs, "all", "")[0].id, "1");
assert.equal(selectSites(sample, prefs, "dev", " VUEJS ")[0].id, "1");
assert.equal(selectSites(sample, prefs, "all", "框架")[0].id, "1");
assert.equal(selectSites(sample, prefs, "all", "AI ASSISTANT")[0].id, "2");
prefs.visitedOnly = true;
assert.equal(selectSites(sample, prefs, "all", "").length, 2);
assert.equal(selectSites(sample, prefs, "dev", "").length, 2); // old filter only applies to all
assert.equal(selectSites(sample, prefs, "all", "not-found").length, 0);
assert.equal(
  validatePreferences(JSON.parse(JSON.stringify(prefs))).pinned[0],
  "1",
);
const legacy = validatePreferences({
  site_visit_counts: { 1: 8 },
  site_all_filter: "visited",
  site_dark_mode: "true",
});
assert.equal(legacy.visits["1"], 8);
assert.equal(legacy.visitedOnly, true);
assert.equal(legacy.dark, true);
assert.throws(() => validatePreferences({ ...prefs, visits: { 1: -1 } }));
assert.throws(() => validatePreferences({ ...prefs, version: 2 }));
assert.throws(() =>
  normalizeCatalog({
    categories: sample.categories,
    sites: [
      { id: 1, name: "bad", url: "javascript:alert(1)", category: "dev" },
    ],
  }),
);
assert.throws(() =>
  normalizeCatalog({
    categories: sample.categories,
    sites: [
      { id: 1, name: "bad", url: "https://example.com", category: "missing" },
    ],
  }),
);
assert.equal(safeUrl("javascript:alert(1)"), "");
assert.equal(safeUrl("data:image/svg+xml,bad"), "");
console.log(
  `Sites: API schema, category/search/visited filters, stable sort, pins, migration and invalid data checks passed.`,
);
