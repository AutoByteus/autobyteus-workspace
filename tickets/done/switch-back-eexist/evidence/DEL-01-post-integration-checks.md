# DEL-01 post-integration checks (delivery, 2026-11-08)

State: `codex/switch-back-eexist` after merging `origin/personal` @ `34ea6e36bb` (merge `25ff4fdd74`, no conflicts). The first pass of these checks (on `0e9ee03045`, when `personal` was at `31aa11b241` with nothing new) gave the same results; `personal` then advanced by 38 commits (autobyteus-437 node authentication, Docker launcher scripts, beta v1.5.12-beta.9 records, DESIGN.md and TESTING.md edits). Overlapping files: `TESTING.md` (merged without conflict; rule 10 stays unique) and `runtime-switch-native-built-server.e2e.test.ts`. The checks below were run again on the merged state.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Antigravity unit folder | `env -i … pnpm exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | `Test Files  21 passed \| 4 skipped (25)`, `Tests  324 passed \| 6 skipped (330)` |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Built-server switch-back cases, the other switch suites and the delegated-copy model change, in one run | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-switch-back-built-server.e2e.test.ts …/runtime-switch-native-built-server.e2e.test.ts …/runtime-switch-members-built-server.e2e.test.ts …/runtime-switch-members-extended-built-server.e2e.test.ts tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch` | `Test Files  5 passed (5)`, `Tests  31 passed (31)` (SB-01..03, RS-01..09, MS-01..05, EX-01..05, DCM-001..009). DCM-009, which failed once in API/E2E's first combined run (FU-1), passed in this combined run |
| Fresh-start build (TESTING.md) | not required | no build input changed (server `src/` and tests, `TESTING.md` only) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |
