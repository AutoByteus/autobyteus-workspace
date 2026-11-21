# DEL-01 post-integration checks (delivery, 2026-11-21)

State: `codex/agy-journal-reads-and-e2e-flake` after merging `origin/personal` @ `fbe714f8bb` (merge `9f7d4289c6`, no conflicts; 17 incoming commits: the iOS demo operation coverage fix, the beta.4 release records, one `TESTING.md` line, web demo and mobile build scripts). Overlap: `TESTING.md` only; the two edits coexist.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Journal, e2e-helper and memory-search unit suites | `env -i … pnpm exec vitest run tests/agent-work-journal tests/unit/e2e-helpers tests/unit/memory-search --no-watch` | `Test Files  26 passed \| 1 skipped (27)`, `Tests  288 passed \| 2 skipped (290)` (identical to API/E2E) |
| The three scripted-Antigravity files, solo, once each | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/<file>.e2e.test.ts --no-watch` for `work-journal-agy-read-file-spill-scripted-agy`, `work-journal-agy-schema-reads-scripted-agy`, `work-journal-neutral-vocabulary-scripted-agy` | `Tests  1 passed (1)` each; load average about 65; no hook timeout and no discovery timeout |
| The two earlier files, solo, four more runs each | same command | 8 of 8 `Tests  1 passed (1)` at load average 58-65; no `Hook timed out`, no `discovery timed out` |
| Fresh-start build (TESTING.md) | not required | no build input changed (server `src/` and tests, `TESTING.md`, a module doc) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |

Context for the last rows: before this ticket, on 2026-11-19 at load above 210 and again above 40, the two earlier files failed 2 of 5 and 1 of 4 solo runs (`Hook timed out in 10000ms` or `AgyDiscoveryError`). With the hook timeout owned by the helper they passed 10 of 10 together (the first pass of each, plus these eight) at load 58-65. The load is lower than the 210 of the earlier failures, so this supports the hook-timeout fix but is not a like-for-like comparison, and it says nothing about the discovery timeout (FU-3: its cause is not established).
