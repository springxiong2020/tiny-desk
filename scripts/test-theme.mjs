import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync(
  new URL("../src/app/theme.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const key = "tiny-desk:theme:v1";
function boot({ saved, dark = false, blocked = false } = {}) {
  const storage = new Map(saved === undefined ? [] : [[key, saved]]);
  const root = { dataset: {} };
  const meta = {};
  const box = {
    exports: {},
    require,
    window: { matchMedia: () => ({ matches: dark }) },
    document: {
      documentElement: root,
      querySelector: () => ({
        setAttribute: (name, value) => {
          meta[name] = value;
        },
      }),
    },
    localStorage: {
      getItem: (name) => {
        if (blocked) throw new Error("Storage disabled");
        return storage.get(name) ?? null;
      },
      setItem: (name, value) => {
        if (blocked) throw new Error("Storage disabled");
        storage.set(name, value);
      },
    },
  };
  vm.runInNewContext(outputText, box);
  return { ...box.exports, root, meta, storage };
}
// First visit follows system settings; a saved choice takes precedence after reload.
assert.equal(boot().theme.value, "light");
assert.equal(boot({ dark: true }).theme.value, "dark");
assert.equal(boot({ saved: "light", dark: true }).theme.value, "light");
assert.equal(boot({ saved: "dark" }).theme.value, "dark");
assert.equal(boot({ saved: "invalid", dark: true }).theme.value, "dark");
const app = boot();
app.toggleTheme();
assert.equal(app.theme.value, "dark");
assert.equal(app.root.dataset.theme, "dark");
assert.equal(app.meta.content, "#202225");
assert.equal(boot({ saved: app.storage.get(key) }).theme.value, "dark");
app.toggleTheme();
assert.equal(app.root.dataset.theme, "light");
assert.equal(app.meta.content, "#f3f6fa");
assert.equal(app.storage.get(key), "light");
// Storage denial must not prevent opening the app or using the toggle.
const privateSession = boot({ blocked: true });
assert.doesNotThrow(() => privateSession.toggleTheme());
assert.equal(privateSession.root.dataset.theme, "dark");
// Unified restore updates the shared theme without performing another storage write.
const restored = boot({ blocked: true });
assert.doesNotThrow(() => restored.applyRestoredTheme("dark"));
assert.equal(restored.theme.value, "dark");
assert.equal(restored.root.dataset.theme, "dark");
assert.equal(restored.meta.content, "#202225");
console.log(
  "Theme: system default, saved override, invalid preference, persistence, document color and blocked storage checks passed.",
);
