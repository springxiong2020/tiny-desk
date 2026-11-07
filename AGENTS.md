# Repository Guidelines

## Project Structure & Module Organization

Tiny Desk is a Vue 3 and TypeScript workspace built with Vite. `src/main.ts` initializes the app, and `src/App.vue` provides its root component. Shared routing, theme, and backup logic lives in `src/app/`; the application shell lives in `src/components/layout/`. Feature folders under `src/modules/` contain Vue pages, TypeScript logic, and feature CSS for todos, saved sites, LeetCode practice, and backups. Global styles are in `src/styles/main.css`, static assets in `public/`, and regression scripts in `scripts/`. Build output goes to `dist/` and should remain untracked.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server, listening on all interfaces.
- `npm run build`: run strict Vue/TypeScript checks with `vue-tsc -b`, then build production assets.
- `npm run preview`: serve the production build locally.
- `npm run test:todo`, `npm run test:sites`, `npm run test:leetcode`, `npm run test:theme`, and `npm run test:backup`: run the corresponding regression scripts. There is no aggregate `npm test` command.

## Coding Style & Naming Conventions

Follow existing two-space indentation, double-quoted JavaScript/TypeScript strings, and semicolons. Use Vue single-file components with `<script setup lang="ts">`. Name components in PascalCase, such as `TodoPage.vue`; use lowercase feature filenames such as `todo.ts` and `todo.css`. Use camelCase for functions and variables, PascalCase for types, and uppercase snake case for storage constants. Keep reusable logic in TypeScript modules beside the feature UI. No ESLint or Prettier configuration is currently provided.

## Testing Guidelines

Tests are standalone Node scripts using `node:assert/strict`, with TypeScript transpilation and VM execution where needed. Name new scripts `scripts/test-<feature>.mjs` and expose them through package scripts. Cover validation failures, state transitions, persistence, and backup compatibility when changing those behaviors. Run affected scripts and `npm run build` before submitting; manually check UI changes in the browser. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent commits use short, lowercase subjects such as `todo`, `sites`, and `logo`; no formal commit convention is established. Prefer concise, descriptive subjects explaining the change. Pull requests should describe the behavior changed, link relevant issues, list validation commands, and include screenshots for visible UI changes. Call out storage schema or backup compatibility changes explicitly.
