# IMP-08 Rendered agent form switch and detail (frontend self-validation)

- Command: `node tickets/in-progress/agent-semantic-memory/probes/semantic-memory-ui-probe.mjs --output-dir=tickets/in-progress/agent-semantic-memory/evidence/ui-probe-3` (folder renamed to `IMP-08-ui-probe` afterwards), with `pnpm` → `corepack pnpm` on `PATH`
- Commit: web code as committed in `0fa12575c` (the run used that working tree; the server `dist` was built from `785ff7c95` by `codegen:local`)
- Environment: Linux 6.12 container, Node v22.23.3, headless Chromium (`/usr/bin/chromium`), viewport 1440×1000, probe-owned backend (`autobyteus-server-ts/dist/app.js`, fresh temp data root, one registered package `probe-agents` with `probe-operator`) and Nuxt dev on free ports; temp root removed afterwards
- Date: 2026-11-10
- Result: `result.json` → `"result": "Pass"`, cases UI-01/UI-02/UI-03 Pass, `browserErrors: []`, cleanup frontend/backend terminated, tempRoot removed
- Screenshots: UI-01a..d (own agent: detail Off, form off/on, detail On with folder), UI-02a..c (package agent: detail On, form with "Personal" + "Reset to the package's setting", after reset unchecked), UI-03a/b (zh-CN 语义记忆)
