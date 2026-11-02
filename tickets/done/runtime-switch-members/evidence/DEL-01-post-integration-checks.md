# DEL-01 post-integration checks (delivery, 2026-11-02)

State: `codex/runtime-switch-members` after merging `origin/personal` @ `f7c71405e9` (merge `b8ef588aa5`, no conflicts). The first pass of these checks ran on `8843594310` when the base had not advanced; the base then advanced by autobyteus-97 (a delegated copy runs in its Task's Project folder: collaboration, copy admission, `run-execution-tree-shared-records.ts` and project services), so the server checks were run again on the merged state (second column).

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Tracked `dist/` of the two stream-contract packages | `pnpm build` in `autobyteus-collaboration-stream-contracts` and `autobyteus-team-stream-contracts`, then `git status --short` of both folders | empty: the committed output equals a fresh build of the committed sources |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Built-server switch cases (members, extended, the earlier standalone ticket's) | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts …-extended-built-server.e2e.test.ts runtime-switch-native-built-server.e2e.test.ts --no-watch` | `Test Files  3 passed (3)`, `Tests  17 passed (17)` |
| Web typecheck and guards | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`; `guard:localization-boundary` | PASS (production errors 0; test baseline 99 unchanged) |
| Generated GraphQL current (AC-009) | `pnpm -C autobyteus-web codegen:check` | `autobyteus-web/generated/graphql.ts is current.` |
| Old names gone (AC-009) | `grep` for `updateStoppedTeamRunModelConfigs`, `UpdateStoppedTeamRunModelConfigs`, `modelPatches` over ts, vue, md, mjs outside tickets and `dist/` | no hits |
| Web specs | `pnpm exec vitest run components stores services composables --no-watch` | `Test Files  540 passed (540)`, `Tests  4152 passed (4152)` |

## Rerun on the merged state (`b8ef588aa5`)

| Check | Result |
| --- | --- |
| Server typecheck, build | exit 0; bootstrap smoke passed |
| Built-server cases: members, extended, the standalone switch, plus autobyteus-97's `delegated-copy-project-folder` and the earlier `delegated-copy-model-change` E2E | `Test Files  5 passed (5)`, `Tests  34 passed (34)` |
| Web typecheck, `codegen:check` | PASS (production errors 0; baseline 99 unchanged); `generated/graphql.ts is current.` (no web file came from the incoming commits) |
| Full server unit suite (first pass on `8843594310`) | `Test Files  922 passed \| 5 skipped (927)`, `Tests  7865 passed \| 9 skipped (7874)` |
| Full server unit suite (merged state) | `Test Files  1 failed \| 924 passed \| 5 skipped (930)`, `Tests  1 failed \| 7879 passed \| 9 skipped (7889)`; the one failure is `tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts > starts a registered root that is missing as FOLDER_MISSING and arms it when it appears` (`Timed out waiting for the monitor.`) |

The watcher failure: run alone three times it failed once and passed twice (`19 passed | 1 failed`, then `20 passed`, `20 passed`). Neither this branch nor the incoming commits touch `src/agent-package-definitions` or that test, and it passed in the first pass on the same code. It is a timing-sensitive file-watcher test that flakes under load. I did not isolate the cause (TESTING.md Rule 9: not read as proven benign); recorded as FU-C3 for the Solution Designer.
