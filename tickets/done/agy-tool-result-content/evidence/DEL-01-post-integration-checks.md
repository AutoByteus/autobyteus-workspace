# DEL-01 post-integration checks (delivery, 2026-11-23)

State: `codex/agy-tool-result-content` @ `b27c672940`. `origin/personal` @ `1f761bc8db` had no commits beyond the ticket's base (`git rev-list --count HEAD..origin/personal` is 0), so no merge was needed and the checks below are on the integrated state.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Antigravity backend and journal unit suites | `env -i … pnpm exec vitest run tests/unit/agent-execution/backends/antigravity tests/agent-work-journal --no-watch` | `Test Files  44 passed \| 5 skipped (49)`, `Tests  648 passed \| 8 skipped (656)` (identical to API/E2E) |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Scripted-Antigravity e2e files, solo, once each, load average about 42 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/<file>.e2e.test.ts --no-watch` | `agy-native-tool-result-content-scripted-agy` 4 passed; `agy-native-tool-arguments-transport` 4 passed; `work-journal-agy-schema-reads-scripted-agy` 1 passed; `work-journal-agy-read-file-spill-scripted-agy` 1 passed; no hook or discovery timeout |
| Live real-`agy` case | not rerun by delivery | API/E2E ran it twice on the host login (`API-03-live-agy-results.log`: LN-01..05 pass); it spends the user's `agy` quota and adds conversations to the user's history, so delivery relies on its log |
| Fresh-start build (TESTING.md) | not required | no build input changed (server `src/` and tests, module docs) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |
