# DEL-01 post-integration checks (delivery, 2026-10-31)

State: ticket branch `codex/cross-runtime-resume` after merging `origin/personal` @ `a977b2c1bc` (merge, no conflicts; 24 incoming commits: Docker node in-place update, Nodes page "Update to <version>", release scripts, macOS runner; overlap with this ticket only in `autobyteus-web/docs/settings.md` and `autobyteus-web/package.json`, both merged cleanly).

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Focused server suites (R2-API-01 command) | `env -i … pnpm exec vitest run tests/agent-work-journal tests/unit/runtime-handover-notices tests/unit/agent-memory tests/unit/standalone-agent-run-root tests/unit/run-history tests/unit/agent-execution tests/unit/memory-search tests/unit/api/graphql/types/agent-run.test.ts tests/architecture --no-watch` | `Test Files  256 passed \| 5 skipped (261)`, `Tests  2406 passed \| 8 skipped (2414)` (identical to R2-API-01) |
| Library memory suite | `pnpm exec vitest run tests/unit/memory --no-watch` (autobyteus-ts) | `Test Files  43 passed (43)`, `Tests  330 passed (330)` (identical) |
| Server build | `pnpm build` (autobyteus-server-ts) | exit 0, bootstrap smoke passed |
| Built-server switch cases and recent-run projection | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts --no-watch` | `Test Files  2 passed (2)`, `Tests  17 passed (17)` (RS-01…RS-08 and 9 projection tests) |
| Web typecheck and guards | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | PASS (production errors 0; test-file baseline 298 unchanged); all guards pass |
| Web specs of the changed components, store and services | `pnpm exec vitest run components/run-settings components/workspace/config components/conversation stores/__tests__/existingRunConfigStore.spec.ts services/runConfigEditing --no-watch` | `Test Files  32 passed (32)`, `Tests  225 passed (225)` |
| Browser journey on the integrated state (R2-API-12) | `env -i … ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs node tests/e2e/runtime-switch-probe.mjs --output-dir <tmp>` | `RSW-01 Pass`; screenshots reviewed: after the reload the chat shows the native message and reply, "AGENT RUNTIME CHANGED: Agent runtime changed from AutoByteus (…) to Antigravity CLI (…)", the user's `ECHO_INPUT`, and the new agent's turn that received the hand-over (names no runtime or model) |
| Secret Gate, hygiene, licensing | `scripts/check_secrets.sh origin/personal..HEAD`; `check_repository_artifact_hygiene.py`; `check_licensing.py` | recorded in the release/deployment report |
