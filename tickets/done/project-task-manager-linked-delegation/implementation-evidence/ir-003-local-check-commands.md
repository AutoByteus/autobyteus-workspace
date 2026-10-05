# IR-003 local implementation check commands

Working directory for every command below:
`/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`

Only unit/build/typecheck/narrow owned-child checks ran; not API/E2E or real-provider/desktop sign-off. Vitest uses its test-owned database; new Project and child fixtures use disposable mkdtemp roots. No running user app/profile or shared checkout was a target.

## Current build / typecheck / core unit

```sh
pnpm -C autobyteus-ts build
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
pnpm -C autobyteus-ts exec vitest run tests/unit/agent/factory/agent-factory.test.ts --no-watch
git diff --check
```

Exit0 for each. Logs: `ir-003-core-build-final.log`, `ir-003-production-typecheck-final.log` (empty diagnostic output; exit0 observed from the command), `ir-003-core-factory-unit-final.log` (13/13), current tool diff-check receipt. Rebuilt core before the final server selection so server imports see the changed factory, not stale dist.

## Final focused server selection

```sh
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/agent-collaboration \
 tests/unit/agent-execution/agent-run-manager.test.ts \
 tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts \
 tests/unit/agent-execution/agent-run-resource-manager.test.ts \
 tests/unit/agent-execution/services \
 tests/unit/agent-org-execution \
 tests/unit/agent-run-collaboration \
 tests/unit/projects \
 tests/unit/runtime-management/claude \
 tests/unit/runtime-management/codex/client \
 tests/unit/agent-execution/backends/codex/thread \
 tests/unit/agent-execution/backends/codex/backend \
 tests/unit/agent-execution/backends/claude \
 tests/unit/agent-execution/backends/antigravity \
 tests/unit/agent-execution/backends/acp \
 tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts \
 tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts \
 tests/unit/agent-team-execution/flat-team-execution-factory.test.ts \
 tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts \
 tests/unit/agent-team-execution/task-agent-execution-registry-memory.test.ts \
 tests/unit/agent-team-execution/team-root-agent-initiated-collaborators.test.ts \
 tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts \
 tests/unit/agent-team-execution/task-agent-execution-registry-liveness.test.ts \
 tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts \
 tests/unit/agent-tools/task-delegation \
 tests/unit/agent-tools/project-tasks \
 tests/unit/built-in-agents \
 tests/unit/run-history/store \
 tests/unit/application-platform/application-provider-credential-readiness-adapter.test.ts \
 tests/unit/server-runtime-app-data-migration-gate.test.ts \
 tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts \
 tests/unit/agent-execution/root-recovery-command.test.ts --no-watch
```

`ir-003-focused-final.log`: exit0, **120 passed / 3 skipped files; 1102 passed / 5 skipped tests**. Opt-in AGY provider live tests were skipped, not passed. New independent component/MCP test file was added afterwards; no later production changes.

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts --no-watch
```

`ir-003-component-mcp-unit.log`: exit0, **8 files / 60 tests passed**. Initial log retains an import-depth fixture error; corrected and rerun. These are separate command totals, not a deduplicated whole-repository total.

## Important witnesses within those selections

- Pinned SDK `0.3.280` public hook + actual test-owned Node protocol peer: EOF exit/IO and failed stop → same real PID/child SIGKILL retry → actual signal exit/all stream close → idempotent release/no respawn. No model request or production Claude CLI/provider authentication. Controlled signal failure is injected on the real app-owned child, not an invented SDK private field.
- Process-owner controlled tests: full EOF/TERM/KILL deadlines, split UTF8 diagnostic drain, exit without IO close is not success, failed spawn needs Node close, post-spawn setup failure retains actual child, Query throw and late closed hook. Opening/client tests cover lazy options cancellation, initialization observation, launch/resume/stderr/debug controls. This does not establish vendor sessionStore-deferred mode as product reachable.
- All-three-tag neutral dispatch races use actual test-owned Project authority and root lifecycle; adapters/provider preparation are controlled. Separate three-subject tests use actual current tree parsers, platform mutators, ownership indexes and adapter cleanup boundaries, including non-routable retained hosts and A/B/borrowed isolation. Neither substitutes for three concrete provider-backed root journeys.
- Project array exact write/read-zero-write/collection omission/critical failure/delete/restart/observed commit, actual lifetime service closure/reopen/retry. Existing Studio and standalone-host startup boundary unit controls run (13 and 17 tests respectively).

## Other attempts — not current acceptance

`ir-003-current-unit-audit2.log` is an earlier broad unit attempt: **52 failed / 560 passed / 3 skipped files, 136 failed / 4119 passed / 6 skipped tests, 4 unhandled errors**. Many in-scope changed-contract fixtures were subsequently corrected and rerun in the passing final selection. This audit was not rerun in full; no full-unit pass or current broad total is claimed.

`ir-003-stores-startup-unit.log`: **4 failed / 51 passed files; 6 failed / 349 passed tests**. Released migration tests are unchanged. Failures include registry adjacency expectation (intervening released migration), old tree-diagnostic text expectation, and disposable token-usage DB fixture lacking `claude_sdk_usage_state_json`. Origin/acceptance classification is not certified from lack of a source diff; no executable same-base baseline was run. Released migration/classifier/ledger sources and tests remain untouched.

```sh
git diff --exit-code -- autobyteus-server-ts/src/server-runtime.ts autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts autobyteus-server-ts/src/app-data-migrations
```

Exit0; `ir-003-unchanged-startup-migrations.diff` empty. No ticket converter/import/registration or new Project startup gate exists. Upstream released migration behavior was not changed to obtain a green result.

Historical IR-001/IR-002 probes and 34-test/typecheck results remain historical obstruction/partial checks only. Earlier IR-003 focused logs retain failed attempts and repairs; use `*-final` and the current component log for the selected current results.
