# DEL-01 post-integration checks (delivery, 2026-11-08)

State: `codex/switch-back-eexist` @ `0e9ee03045`. `origin/personal` @ `31aa11b241` had no commits beyond the ticket's base (`git rev-list --count HEAD..origin/personal` is 0), so no merge was needed and the checks below are on the integrated state.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Antigravity unit folder | `env -i … pnpm exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | `Test Files  21 passed \| 4 skipped (25)`, `Tests  324 passed \| 6 skipped (330)` |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Built-server switch-back cases, the other switch suites and the delegated-copy model change, in one run | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-switch-back-built-server.e2e.test.ts …/runtime-switch-native-built-server.e2e.test.ts …/runtime-switch-members-built-server.e2e.test.ts …/runtime-switch-members-extended-built-server.e2e.test.ts tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch` | `Test Files  5 passed (5)`, `Tests  31 passed (31)` (SB-01..03, RS-01..09, MS-01..05, EX-01..05, DCM-001..009). DCM-009, which failed once in API/E2E's first combined run (FU-1), passed in this combined run |
| Fresh-start build (TESTING.md) | not required | no build input changed (server `src/` and tests, `TESTING.md` only) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |
