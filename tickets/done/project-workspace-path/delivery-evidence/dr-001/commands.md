# Delivery-owned Commands — DR-001

CWD for all commands: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`.
`E=$PWD/tickets/in-progress/project-workspace-path/delivery-evidence/dr-001`.
No API-owned ledger/report modified; no live model, credential import, default-profile server or installed app used. Builds serialized; checked source is integrated HEAD `8448cd18af3fb08b13cb8d47291c9ba89794b9d3`.

| Exact command | Result / evidence |
| --- | --- |
| `git fetch origin personal` | exit0; origin/personal af50bdd4056b9341e53494ad393b6283136a00ed |
| `git rev-list --left-right --count HEAD...origin/personal` (before merge) | 10 ticket commits / 3 remote commits |
| `git merge --no-edit origin/personal` | exit0; conflict-free ort merge8448cd18a; `integration.txt` retains parents/base/version delta |
| `pnpm -C autobyteus-server-ts prebuild` | exit0; prebuild.log |
| `pnpm -C autobyteus-server-ts build` | exit0; build.log, tsc/assets/sanitized bootstrap |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts tests/e2e/projects/project-mutation-node-locality.e2e.test.ts --no-watch` | exit0; 2files/9tests; project-boundaries.log |
| `pnpm -C autobyteus-web exec nuxt prepare` | exit0; nuxt-prepare.log |
| `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir="$E/browser-1"` | exit0; 16/16, zero page errors; browser-1.log + browser-1/result.json |
| `git diff --check -- TESTING.md autobyteus-server-ts/docs/modules/projects.md autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | exit0; docs source check |
| `git diff --check 5316a0cad HEAD -- autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web TESTING.md` | exit0; historical raw logs intentionally excluded |
| `pnpm --silent isolated-app list` | exit0; isolated-app-list.json, no desktop instance started by Delivery |

`build-and-source-receipt.json` records runtime and source/test SHA256. Six API-test hashes unchanged; only TESTING prose is delivery-edited. Browser PT-E2E-003 screenshot was visually inspected after DOM/API/disk assertions passed; no frontend defect found.

Cleanup validation asserts all16 cases Pass, browserErrors empty, reported ports released and exact fixture root absent; removes only the two untracked application SDK dist outputs made by this build, after confirming no tracked files in them. `cleanup.json` records paths/ownership. Core/server dist and Nuxt/node_modules caches were already present and remain ignored prerequisites. **Run normal prebuild/build again before built-process reruns.**

No failed/interrupted build/test attempt in DR-001; all results retained as executed. Build warnings/log whitespace are preserved verbatim. No production frontend bundle, packaged app, live provider or explicit user testing was performed.
