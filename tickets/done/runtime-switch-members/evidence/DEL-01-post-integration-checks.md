# DEL-01 post-integration checks (delivery, 2026-11-02)

State: `codex/runtime-switch-members` @ `8843594310`. `origin/personal` @ `c952758a81` had not advanced beyond the ticket's base (0 commits behind), so no merge was needed; the checks below are on the branch head, which equals the integrated state.

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
| Full server unit suite | `env -i … pnpm test:unit` | see the release/deployment report |
