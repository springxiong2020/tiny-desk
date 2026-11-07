import { readonly, ref } from "vue";

export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "tiny-desk:theme:v1";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Use the system theme when browser storage is unavailable. */
  }
  return systemTheme.matches ? "dark" : "light";
}
const current = ref<Theme>(readTheme());
function applyTheme() {
  document.documentElement.dataset.theme = current.value;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", current.value === "dark" ? "#202225" : "#f3f6fa");
}
applyTheme();
export const theme = readonly(current);
export function toggleTheme() {
  current.value = current.value === "dark" ? "light" : "dark";
  applyTheme();
  try {
    localStorage.setItem(THEME_STORAGE_KEY, current.value);
  } catch {
    /* The selected theme still works for the current session. */
  }
}

// Unified import has already persisted the preference; update the current UI without writing again.
export function applyRestoredTheme(value: Theme) {
  current.value = value;
  applyTheme();
}
