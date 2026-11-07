import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { version } from "./package.json";

export default defineConfig({
  plugins: [vue()],
  root: "./",
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
