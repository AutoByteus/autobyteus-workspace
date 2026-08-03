# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/design-spec.md`
- Supplemental Task Artifacts: None
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: None
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (Round 1 result updated after `CRR-002`; ticket-scoped result is `Pass` with repository-health caveats)
- Current Investigation Round: `1`
- Trigger: `code_reviewer` passed commit `fa0fd927a` / `CRR-001` and requested coverage investigation, dependency preparation, and executable TypeScript/Vitest/API/E2E validation.
- Prior Investigation Reviewed: None; this is the initial API/E2E investigation.
- Latest Authoritative Investigation: This file, Round 1.

## Current Requirement And Design Basis

The approved change is a clean-cut removal of the native `autobyteus-ts` ToDo
capability. The four local model-facing tools (`create_todo_list`, `add_todo`,
`get_todo_list`, and `update_todo_status`), their model/schema/barrel surface,
the transient `AgentRuntimeState.todoList` owner, the native notifier/event and
stream payload path, and the single AutoByteus converter mapping must be absent.
Generic file and skill tooling, `ToolCategory.TASK_MANAGEMENT`, server task
delegation, and the server/Codex/web-owned `TODO_LIST_UPDATE` contract must
remain available. The persisted-data decision is `Not Affected`: native ToDo
state was in-memory only, so no migration or compatibility reader is expected.

The implementation handoff and `CRR-001` report confirm that the source change
matches the requirements and reviewed design, adds focused negative registry
coverage, removes obsolete native tests, and was ready for executable checks.
Round 1 installed the frozen workspace dependencies and completed the scoped
validation, with the two repository-wide failures recorded below.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / native local registry and schema | Removed | `REQ-001`, `AC-001`, `AC-002`; `design-spec.md` DS-001 | Execute the new negative registry/schema test and `autobyteus-ts` type/build checks. |
| `BEH-002` / native runtime state, notifier, event and stream | Removed | `REQ-002`, `AC-002`, `AC-003`; DS-002 | Execute remaining event/payload/stream tests and source absence searches; no native producer journey remains to exercise. |
| `BEH-003` / AutoByteus adapter and backend-owned TODO boundary | Narrowed / Preserved | `REQ-003`, `AC-004`; DS-003 | Execute remaining AutoByteus converter tests and a temporary built mapper/Codex boundary probe; run preserved web TODO handler/service coverage. |
| `BEH-004` / file, skill, category and server task delegation | Preserved | `REQ-004`, `AC-005`; DS-001/DS-003 | Execute focused file/skill/task-delegation tests and relevant server E2E checks. |
| `BEH-005` / active native documentation | Changed | `REQ-005`, `AC-006` | Source/document search confirms active `autobyteus-ts` docs no longer advertise native tools/events; web/backend TODO docs remain intentionally present. |
| `REQ-006` / persisted data | Preserved outcome (`Not Affected`) | `REQ-006`, `AC-007`; design persisted-data decision | Inspect state/bootstrap/memory persistence references and verify no migration or compatibility machinery was introduced. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Native local tool registry, runtime state, notifier and stream internals in `autobyteus-ts`; native slice is removed rather than behaviorally replaced. | Focused unit tests, source search, package type/build. | External consumers importing intentionally removed exports. | None beyond build/package checks; breaking surface is delivery risk. |
| API / transport / contract | Yes, narrow | AutoByteus adapter loses one native enum mapping; server `AgentRunEventType.TODO_LIST_UPDATE` and WebSocket mapping remain. | AutoByteus converter unit tests, server build, source inspection, temporary built mapper probe. | Full live backend-to-WebSocket Codex delivery is not directly changed and is not needed to prove this removal. | Targeted server E2E only if repository evidence exposes a relevant deterministic route. |
| Frontend component / state | No implementation change | Web ToDo handler/store/panel and protocol are preserved. | Existing `todoHandler.spec.ts` and `AgentStreamingService.spec.ts`; source search. | No frontend diff means no new rendering risk from this change. | No browser run required unless repository checks expose a regression. |
| Browser integration / user journey | No | No browser-facing behavior is changed for server-owned TODO events; native AutoByteus TODO progress was intentionally removed upstream. | Web unit coverage and unchanged source contract. | A live Codex user journey remains outside this removal’s changed boundary. | Not required; browser would not exercise the removed native package path. |
| Authentication / session / permissions | No | No auth/session/permission code changed. | Not applicable. | None material to this change. | None. |
| Desktop renderer / web-equivalent UI | No | No renderer source changed. | Existing web tests only. | None material to this change. | None. |
| Desktop shell / Electron-specific integration | No | No Electron/preload/IPC/package path changed. | Not applicable. | None material to this change. | None. |
| Process / lifecycle | No, except compile/startup import graph | Removing a native enum/import can affect package build and server startup module resolution. | `autobyteus-ts` and server type/build checks; focused server tests. | Long-running production startup is not necessary if build/import checks pass. | Optional built-server smoke; use if build succeeds cheaply. |
| Persisted-data transition | No | `ToDoList` was transient runtime state only; server/web TODO events are transient backend-owned messages. | Source search and design/handoff persisted-data checks. | No native stored data can be exercised because none exists. | None; migration is explicitly out of scope. |
| Worker / queue / distributed coordination | No | No worker/queue/distributed path changed. | Not applicable. | None material to this change. | None. |
| External integration | No | No provider or external integration changed. | Not applicable. | None material to this change. | None. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools`
- Project type and runtime stack: pnpm 10.28.2 TypeScript monorepo; Node.js `v22.23.1`; Vitest in `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`; Prisma-backed server tests; Nuxt/Vue web tests.
- Conflicting, missing, or unclear project instructions: No material conflict. The closest component instructions are `autobyteus-server-ts/AGENTS.md` and `autobyteus-web/AGENTS.md`; package READMEs and root README define setup/build/test commands. Dependencies were installed successfully with the frozen lockfile before execution. The web package additionally required `nuxt prepare` to generate the ignored `.nuxt` test configuration before its focused Vitest command could run.
- Required environment variables or secrets available: `N/A` for focused package/unit checks. Server test setup creates an isolated SQLite database at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db` and supplies `DATABASE_URL`; no provider credentials are needed for the planned focused checks. Live external-provider E2E is not required.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/README.md` | Monorepo setup/build/E2E authority | Run `pnpm install`; package builds use workspace filters; root `test:e2e` delegates to server E2E; full-stack/browser development is separate from deterministic tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-server-ts/AGENTS.md` | Server test command authority | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; focused single-file and integration examples are documented. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-server-ts/README.md` | Server install/env/build/test authority | `pnpm install` from root; server build prepares shared packages and Prisma; test DB is isolated; live Codex tests require `RUN_CODEX_E2E=1`, which is not needed here. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-web/AGENTS.md` | Web test command authority | Use `pnpm test:nuxt -- --run ...` for one-shot web tests; Electron tests are separate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-web/ARCHITECTURE.md` | Web testing strategy | Colocated Vitest tests; browser/Electron validation is for changed web/shell behavior, neither of which is changed here. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/package.json` and `vitest.config.ts` | Native package scripts/config | `build` cleans `dist`, runs `tsc -p tsconfig.build.json`, and verifies runtime dependencies; Vitest uses Node and `tests/setup.ts`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-server-ts/package.json` and `vitest.config.ts` | Server scripts/config | `typecheck`, `build`, and `test` are available; server Vitest runs with fork pool and Prisma global setup. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-web/package.json` and Vitest configs | Web scripts/config | `test:nuxt` and `test:electron` are distinct; only focused Nuxt streaming tests are relevant. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | Worktree root | `pnpm install --frozen-lockfile` | Installs all workspace packages according to `pnpm-lock.yaml`; optional native dependencies may run approved install scripts. | `pnpm exec vitest --version`, package `tsc --version`, and `test -d node_modules`. | No process; retain dependencies in task worktree. |
| `autobyteus-ts` compile/tests | `autobyteus-ts` or root | `pnpm --filter autobyteus-ts build`; focused `pnpm -C autobyteus-ts exec vitest run ...` | No service or external credentials. | Build completes and Vitest reports test counts. | Build script cleans/recreates `autobyteus-ts/dist`; no service cleanup. |
| Server compile/tests | Worktree root / `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts build`; focused Vitest/E2E commands. | Server tests use isolated SQLite and Prisma global setup. | Prisma reset completes; Vitest exits 0. | Remove only test-owned `autobyteus-server-ts/tests/.tmp` if created; no shared processes. |
| Web streaming tests | `autobyteus-web` | `pnpm test:nuxt -- --run <focused files>` from package directory or filtered root equivalent. | Nuxt test environment; no server required for handler/service unit coverage. | Vitest exits 0. | No process/data cleanup. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server unit/E2E database | `tests/setup/prisma-global-setup.ts` and `.env.test` | SQLite under the assigned worktree only; no production database. | Remove test-owned `autobyteus-server-ts/tests/.tmp` after execution if present. |
| Web handler context | Existing test-local Pinia/context fixture in `todoHandler.spec.ts` and streaming tests | No identity or auth; in-memory test state. | Process-local only. |
| Live API/Codex identity | None required | No external credentials or live provider is needed because the changed behavior is package-local removal and the backend-owned TODO contract is unchanged. | N/A. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data section; `implementation-handoff.md` Persisted Data section; `REQ-006` / `AC-007`.
- Representative existing-data setup and required behavior: None. `ToDoList` existed only as an in-memory `AgentRuntimeState` field and was not serialized or restored.
- Evidence executed: source search for `todoList` and native model references across state/bootstrap/memory paths, type/build checks, and diff inspection for absent migrations/aliases; all changed-boundary absence checks passed.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/tests/unit/tools/native-todo-tools-removed.test.ts` | Removed four names are absent from `registerTools()` while retained file tools register and schema composition ignores removed names. | `AC-001`, `AC-005`, DS-001 | Still Valid | Added by implementation and passed code review; direct boundary assertion. | Execute unchanged. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/tests/unit/tools/legacy-task-tools-removed.test.ts` | Other obsolete model-facing task names remain absent. | `REQ-004`, `AC-005`; preserved adjacent task boundary | Still Valid | Moved/updated in implementation to remain a negative registry regression. | Execute unchanged. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/tests/unit/tools/file/exact-file-tools-removed.test.ts` | Generic retained file tools and schema composition remain available while unrelated removed exact-file names stay absent. | `REQ-004`, `AC-005`; DS-001 | Still Valid | Existing direct registry/schema coverage; implementation only removed a legacy assertion row. | Execute unchanged. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/tests/unit/tools/tool-category.test.ts` | `ToolCategory.TASK_MANAGEMENT` remains defined. | `REQ-004`, `AC-005` | Still Valid | Source/test remains unchanged and directly asserts category. | Execute unchanged. |
| `/Users/normy/autobyteus_org/autobyteus-ts/tests/unit/agent/context/agent-runtime-state.test.ts` | Runtime state defaults and lifecycle behavior remain valid after removing `todoList`. | `REQ-002`, `AC-002`; DS-002 | Needs Update (already updated) | Implementation removed only the obsolete field expectation; remaining state tests are current. | Execute updated file; no further edit. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts` | Remaining stream payload classes/factories continue to parse and construct. | `REQ-002`, `AC-003`; DS-002 | Needs Update (already updated) | Native ToDo payload cases were removed; remaining payload coverage is current. | Execute updated file; no further edit. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-ts/tests/unit/events/event-types.test.ts` | Remaining internal event strings exist and native/legacy task events are absent. | `REQ-002`, `AC-003`; DS-002 | Needs Update (already updated) | Assertion now expects the current 28-event set without the removed native event. | Execute updated file; no further edit. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts` | Remaining native stream events map to server events and preserve lifecycle/status semantics. | `REQ-003`, `AC-004`; DS-002/DS-003 | Needs Update (already updated) | The obsolete native mapping row was removed; all remaining rows are direct adapter coverage. | Execute updated file. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-web/services/agentStreaming/handlers/__tests__/todoHandler.spec.ts` | Backend `TODO_LIST_UPDATE` payload maps into the web ToDo store. | `REQ-003`, `AC-004`; DS-003 | Still Valid | Unchanged web boundary test directly covers handler/store contract. | Execute focused web test. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Web streaming service treats TODO activity as ordinary progress and retains lifecycle behavior. | `REQ-003`, `AC-004`; DS-003 | Still Valid | Existing `TODO_LIST_UPDATE` case remains in the event matrix. | Execute focused web test. |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Server event-to-message mapping regression suite. | `REQ-003`, `AC-004`; DS-003 | Still Valid | File remains in the authoritative server suite; no native enum import is involved. | Execute as supporting coverage; temporary probe checks TODO row directly because this file has no dedicated TODO case. |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-converter.test.ts` | Codex converter preserves plan/progress boundaries while handling reasoning. | `REQ-003`, `AC-004`; DS-003 | Still Valid | Existing test matrix includes `ITEM_PLAN_DELTA` and `TURN_TASK_PROGRESS_UPDATED` as preserved/no-effect reasoning boundaries. | Execute; temporary built probe covers direct TODO event production. |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Server-owned task delegation lifecycle remains intact. | `REQ-004`, `AC-005` | Still Valid | Unchanged server-owned task delegation integration path. | Execute focused if setup cost permits; include in server E2E/integration plan. |
| Deleted native ToDo model/schema/tool tests under `autobyteus-ts/tests/unit/task-management/**` | Asserted obsolete native tool/model behavior. | `REQ-001`, `REQ-002`, `AC-002`, `AC-003`; DS-002 | Stale / Remove | Approved design explicitly decommissions the entire native slice; replacement absence is covered by the new registry test and source/build checks. | No restoration; record deletions as intentional. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Deleted native tool tests (`add-todo`, `create-todo-list`, `get-todo-list`, `update-todo-status`) | Native tool classes execute and mutate `ToDoList`. | The four tools and their owner are intentionally removed, with no compatibility aliases. | `REQ-001`, `REQ-002`, `AC-001`–`AC-003`; `design-spec.md` DS-002 and removal plan. | `native-todo-tools-removed.test.ts`, source absence search, package build. | There is no current native behavior to execute; file/skill replacement is owned by existing tools and out of new native test scope. |
| Deleted `todo.ts`, `todo-list.ts`, `todo-definition.test.ts`, `todo-list.test.ts` and task-management barrels | Native model/schema construction and exports remain supported. | No native reader/writer/consumer remains and external breakage is intentional. | `REQ-001`, `REQ-002`, `AC-002`, `AC-007`; persisted outcome `Not Affected`. | Negative registry/export/source checks and TypeScript compile. | No migration or compatibility coverage is allowed. |
| Removed native payload cases from stream payload tests | Native `ToDoListUpdateData` factory/class exists. | Native event payload path is decommissioned end-to-end. | `REQ-002`, `AC-003`; DS-002. | Remaining payload factory tests, event enum absence assertions, server converter remaining-row tests. | No replacement native event should exist; backend-owned TODO is a separate server contract. |

## Durable Coverage To Add

None at the API/E2E stage. The implementation commit already added the focused
negative registry test. Adding a new repository-resident server TODO mapper or
Codex converter test would be optional scope expansion and would require a
return through `code_reviewer`; a temporary built probe is sufficient for this
removal validation.

## Durable Coverage To Update

None in this stage. The implementation’s test updates are already reviewed and
are inventoried above; API/E2E will execute them without modifying durable test
code.

## Durable Coverage To Remove

None in this stage. The obsolete native tests were removed in the reviewed
implementation commit and are recorded above with their replacement/no-
replacement rationale.

## Repository Coverage Execution Plan And Results

Execution completed for Round 1 after the mandatory coverage investigation was
written. The implementation commit's reviewed coverage was executed as-is; no
repository-resident coverage code was added, updated, or removed by this role.
The two failed command families remain recorded as red command outcomes, but
`CRR-002` confirmed both are independent repository-health baselines. No rerun,
durable coverage edit, source fix, or implementation re-review is warranted.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | Worktree root | Workspace dependency/setup readiness. | **Pass** — all 11 workspace projects resolved; lockfile remained current; 1717 packages installed. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/api-e2e-install.log` |
| 2 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/native-todo-tools-removed.test.ts tests/unit/tools/legacy-task-tools-removed.test.ts tests/unit/tools/file/exact-file-tools-removed.test.ts tests/unit/tools/tool-category.test.ts tests/unit/events/event-types.test.ts tests/unit/agent/context/agent-runtime-state.test.ts tests/unit/agent/streaming/events/stream-event-payloads.test.ts` | `autobyteus-ts`, Node Vitest config | Native absence, registry/schema continuity, category, runtime and remaining payload/event behavior. | **Pass** — 7 files, 32 tests. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/autobyteus-ts-focused-vitest.log` |
| 3 | `pnpm --filter autobyteus-ts build` | Worktree root | Native package source/build/declaration integrity and stale `dist` cleanup. | **Pass** — TypeScript build and runtime dependency verification completed. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/autobyteus-ts-build.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-converter.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts --no-watch` | `autobyteus-server-ts`, Prisma Vitest setup | Remaining AutoByteus adapter mappings, server message mapper, Codex event boundary, and tool exposure. | **Pass** — 4 files, 96 tests. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-focused-vitest.log` |
| 5 | `pnpm -C autobyteus-server-ts typecheck` | Server package; pretypecheck prepares shared packages | Cross-package TypeScript paths and absence of removed native enum/imports. | **Fail (confirmed baseline)** — repository `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for test files outside `rootDir`. `CRR-002` reproduced the same failure on clean base `ba6ebc2a2fbf56f17ee6bbb965f3f153307db3d2`; source-only typecheck and server build pass. No rerun or ticket fix is warranted. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-typecheck.log` |
| 6 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Server source-only build configuration | Source-only TypeScript integrity without the repository test/include configuration. | **Pass** — exit 0 with no diagnostics; corroborates the implementation source typechecks. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-build-typecheck.log` |
| 7 | `pnpm -C autobyteus-server-ts build` | Server package; Prisma generate and shared builds per package script | Integrated package build and runtime import graph. | **Pass** — server build, Prisma generation, built-in-agent bootstrap smoke, and sanitized built-module smoke completed. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-build.log` |
| 8 | `pnpm test:e2e -- --run ...` (initial planned root-script form) | Root package script | Intended preserved file/skill/task-delegation E2E selection. | **Interrupted / superseded** — root script hardcodes `tests/e2e`, so the extra `--run` selection did not select the requested files and began the broad suite. No assertion failure from the changed boundary was observed. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-preserved-e2e-root-script-interrupted.log` |
| 9 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts tests/e2e/skills/skills-graphql.e2e.test.ts tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-watch` | Server package, isolated SQLite E2E setup | Preserved file/skill/server task-delegation API journeys. | **Pass** — 2 files passed, 7 tests passed; 1 file and 2 tests skipped by their own conditions. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-preserved-e2e.log` |
| 10 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts --no-watch` | Server package, isolated SQLite setup | Server-owned task delegation lifecycle and settlement. | **Pass** — 1 file, 6 tests, including delegation, submission/review, idle settlement, reference policy, child work, and team ingress. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-task-delegation-integration.log` |
| 11 | `pnpm -C autobyteus-web test:nuxt -- --run ...` (initial package-script form) | Web package | Intended focused TODO handler/streaming selection. | **Interrupted / superseded** — package script argument handling caused a broad run; the process was stopped before using its result. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/web-todo-vitest-initial-attempt-interrupted.log` |
| 12 | `pnpm -C autobyteus-web exec nuxt prepare` | Web package | Generate required Nuxt test config. | **Pass** — generated ignored `.nuxt` configuration; output was cleaned after execution. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/web-nuxt-prepare.log` |
| 13 | `pnpm -C autobyteus-web exec vitest --config ./vitest.config.mts run services/agentStreaming/handlers/__tests__/todoHandler.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Web package, direct Vitest config | Preserved backend-owned TODO handler and streaming contract. | **Pass** — 2 files, 30 tests. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/web-todo-vitest.log` |
| 14 | Temporary `node --input-type=module` probe against built server output | Worktree root after server build | Directly exercise Codex turn progress -> server TODO event and server TODO event -> WebSocket message mapping without adding durable coverage. | **Pass** — preserved `TODO_LIST_UPDATE` type and payload through both boundaries. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/backend-todo-boundary-probe.log` |
| 15 | Active-source/docs/diff searches with `rg` and `git diff --check` | Worktree root | Absence of native names, preservation of server/web names, no migration/alias/fallback, and whitespace integrity. | **Pass** — active native source is clear; intentional negative-test names are the only test references; preserved boundaries remain; `git diff --check` passed. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/absence-preservation-search.log` |
| 16 | `pnpm -C autobyteus-ts exec vitest run` | `autobyteus-ts`, full repository Vitest | Broad repository regression signal. | **Fail (confirmed baseline/environment)** — 24 failed files, 423 passed, 8 skipped; 71 failed tests, 2014 passed, 18 skipped, and 2 errors. Failures are concentrated in unavailable external providers/services, missing `/opt/homebrew/bin/uv`, refused local media host, parser/tool integration expectations, and other unrelated integration/unit areas. `CRR-002` reproduced the unchanged parser failures on clean base and confirmed an empty changed-path intersection. No rerun, durable coverage edit, source fix, or implementation re-review is warranted. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/autobyteus-ts-full-vitest.log` |
| 17 | Temporary-resource cleanup | Assigned worktree | Remove test-owned SQLite, generated Nuxt config, and test-created fixture/config directories without touching tracked implementation. | **Pass** — cleanup removed server test `.tmp`, web `.nuxt`/`.nuxtrc`, and 33 native-package fixture/config directories; dependency/build outputs remain ignored generated state. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/api-e2e-cleanup.log` |

### Execution Failure-Origin Notes

- `CRR-002` confirmed the canonical server `typecheck` failure as an
  unchanged repository configuration baseline. `autobyteus-server-ts/tsconfig.json`
  still has `rootDir: "src"` with `include: ["src", "tests"]`; the same TS6059
  failure reproduces on clean base `ba6ebc2a2fbf56f17ee6bbb965f3f153307db3d2`.
  Source-only `tsconfig.build.json --noEmit` and the complete server build pass.
  Optional config maintenance belongs outside this ticket; no rerun or source
  fix is warranted.
- `CRR-002` confirmed the full `autobyteus-ts` Vitest result as environment /
  repository-baseline health. Provider/local-service failures cite unavailable
  credentials or services, LM Studio/Ollama, missing `/opt/homebrew/bin/uv`,
  local media/MCP conditions, and unchanged parser/tool assertions. The
  potentially source-adjacent parser test reproduces the same four failures on
  clean base, and normalized failure-file intersection with implementation-
  changed paths is empty. No full-base rerun is proportionate; no durable
  coverage edit, source fix, or implementation re-review is warranted.
- The root E2E and web package-script attempts were command-selection issues,
  not product failures. Their direct package Vitest replacements are the
  authoritative targeted results and passed.
- The command-level failures remain visible in the evidence table and do not
  become claims that those commands pass. They no longer block ticket-scoped
  delivery because their origins are confirmed independent of commit
  `fa0fd927a`.

## Post-Repository Confidence Scorecard (Mandatory)

Scores below are evidence-backed after Round 1 execution. The overall score is
informational and does not convert the failed command families into a clean
pass.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Focused native absence tests, source search, builds, preserved server/web tests, and direct boundary probe cover AC-001 through AC-007. | Deliberately removed public imports may affect external consumers. | Delivery communication; no compatibility alias is intended. |
| Changed-boundary execution directness | 98% | Exact native registry/state/event/payload tests and package build pass; removed source names are absent. | No external consumer compile fixture. | None needed for this repository change. |
| Cross-boundary integration realism and mock gap | 94% | Server focused suite, built Codex->server->WebSocket probe, preserved server E2E, task-delegation integration, and web handler/stream tests pass. | No live provider/browser journey; backend/web TODO contract was unchanged. | Only a live provider run could improve this, and it is outside scope. |
| Environment, configuration, identity, and fixture fidelity | 93% | Frozen-lockfile install passed; Prisma isolated SQLite E2E and web Nuxt preparation passed; cleanup completed; CRR-002 confirmed the red server typecheck configuration is unchanged from clean base. | External provider/service availability is incomplete; optional server typecheck config maintenance remains outside scope. | Separate environment with providers or independent repository maintenance. |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Focused lifecycle/converter/runtime coverage and task-delegation lifecycle passed; CRR-002 confirmed broad-suite failures are baseline/environment and unchanged parser failures reproduce on clean base. | Full repository suite remains non-green in this environment; external consumers and unavailable services are not exercised. | Optional repository-health maintenance or an environment with providers. |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend/renderer/shell implementation changed; web contract tests are sufficient for preserved behavior. | A full live Codex UI journey remains outside the changed boundary. | None required for this removal. |
| Durable regression coverage quality and relevance | 95% | Implementation's reviewed negative registry coverage plus current event/converter/server/web suites directly map to requirements. | No new durable test for an unchanged server TODO mapper row. | None; temporary built probe supplied extra evidence without repository edits. |

- Overall post-repository confidence before failure-origin review: `93.7%`.
- Updated ticket-scoped confidence after `CRR-002`: `94.5%` across applicable
  categories (95 + 98 + 94 + 93 + 92 + 95 divided by 6; N/A excluded).
  This review evidence raises confidence in failure-origin classification; it
  does not make the two red repository commands pass.
- Every critical acceptance criterion directly proven: `Yes` for the changed
  native removal and preserved server/web boundaries. This is not a claim that
  the repository-wide server typecheck or full native command passes.
- Any applicable category below 90%: `No` after `CRR-002`; repository-health
  caveats remain explicitly recorded.
- Default clean-confidence target of 95% met: `No`; external consumers and
  non-required live services remain outside the evidence.
- Material residual risks: intentionally removed public exports may require
  downstream migration; external provider/live service coverage is unavailable;
  the repository server typecheck script has a confirmed TS6059 configuration
  baseline; the full native suite remains non-green under this environment.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` for browser, live provider, or desktop execution.
- Selected execution mode: Repository-focused Vitest, TypeScript/build checks,
  targeted server E2E/integration, preserved web Vitest, source/diff searches,
  and the temporary built boundary probe were executed. No browser or live
  provider run would materially exercise the removed native package surface.
- Specific confidence gap or residual risk addressed: Direct checks prove the
  exact removal and preserved backend/web boundaries; the full-suite and
  server-typecheck failures are separate repository execution signals routed
  for review.
- Why the selected mode materially improves confidence: It proves absence at
  registry/schema/source/build boundaries and preserves the server/web TODO
  contract without requiring an unrelated live model/provider.
- Expected confidence after selected validation: `94.5%` ticket-scoped after
  `CRR-002`; below the 95% clean target because repository-health and external
  service caveats remain. The red commands are not claimed to pass.
- Browser-specific decision and rationale: Not required. No web/renderer code
  changed; web unit tests directly exercise the preserved TODO handler/stream
  dispatch, and browser execution cannot prove the removed native package
  surface.
- If `Not Required`, evidence proving the real changed boundary: `autobyteus-ts`
  focused Vitest/build/search, AutoByteus converter tests, source-only server
  typecheck/build, direct built Codex/server TODO probe, targeted preserved
  file/skill/task E2E/integration, and web streaming tests.
- If `Blocked`: Not blocked. The focused and integration checks ran; the failed
  repository-wide commands have confirmed baseline/environment origins via
  `CRR-002`; no rerun or implementation action is required.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron/Nuxt exists in `autobyteus-web`, but no Electron or renderer files changed.
- Relevant README or development instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/ARCHITECTURE.md`, and package scripts.
- Web-equivalent behavior: Preserved web `TODO_LIST_UPDATE` handler/store/stream dispatch, covered by focused Nuxt tests.
- Shell-specific or lifecycle behavior: None changed or required.
- Chosen validation approach and why it fits the project: No desktop execution; run the focused web unit tests only.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: External consumers and a live provider-driven Codex journey are not proven; they are outside the changed native package boundary and remain documented residual risk.

## Live Environment And Fixture Plan

Broader live/browser validation was not run. Targeted server E2E used the
project's deterministic test-owned SQLite and existing fixtures. No test
identity, provider credential, or shared process was needed. Temporary test
resources were removed after execution; the install and generated build
outputs remain ignored task-worktree state.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `API-BOUNDARY-001` | After `autobyteus-server-ts` build, import built `convertCodexTurnEvent` with `TURN_TASK_PROGRESS_UPDATED`, then pass its `AgentRunEventType.TODO_LIST_UPDATE` output to built `AgentRunEventMessageMapper`. Assert `ServerMessageType.TODO_LIST_UPDATE` and payload preservation. | Preserved server-owned Codex TODO production and transport mapping remain independent of removed native enum mapping. Output preserved `turnId` and todo payload. | The implementation does not change this server/Codex contract; existing unit/web coverage plus source ownership is durable enough, and a one-off direct probe avoids adding a new test file/reroute for unchanged code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| External consumers importing removed native classes/enums/barrels | No external consumer fixture is available; breakage is intentional. | Downstream packages may require migration. | Delivery must call out the breaking public surface; no compatibility alias. |
| Full live Codex provider-to-browser TODO journey | Requires external provider/auth and exercises unchanged backend-owned paths. | Live integration could regress independently. | Not a blocker for this removal; run only if repository checks expose a contract failure. |
| Electron shell execution | No shell-specific code changed. | None material to this change. | None. |
| Clean full `autobyteus-ts` suite | Broad run failed with 24 files/71 tests and 2 errors across unrelated provider, local-service, parser, MCP, media, and expectation areas; `CRR-002` confirmed the unchanged parser failures on clean base and empty changed-path intersection. | Cannot claim a globally green repository; no implementation defect or rerun is warranted. | Optional repository-health follow-up outside this ticket. |
| Canonical server package `typecheck` | Repository config reports TS6059 because `tests` is included outside `rootDir: src`; same failure reproduces on clean base; source-only build typecheck and server build pass. | Whole-package script remains red as optional repository maintenance. | No ticket change or rerun; repository owners may track config maintenance separately. |

## Ambiguities Or Reroute Triggers

`CRR-002` resolved the only execution-origin ambiguities. No implementation
reroute remains.

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `pnpm -C autobyteus-server-ts typecheck` fails with TS6059 because the package config includes `tests` outside `rootDir: src`; the same failure reproduces on clean base. | **Confirmed repository configuration baseline** | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/code-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/server-typecheck.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/code-review-base-comparison.log` | N/A for this ticket; optional repository maintenance |
| Full `autobyteus-ts` Vitest fails 24 files/71 tests/2 errors; unchanged parser failures reproduce on clean base and normalized changed-path intersection is empty. | **Confirmed environment/repository baseline** | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/code-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/autobyteus-ts-full-vitest.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/test-results/code-review-base-comparison.log` | N/A for this ticket; optional repository health follow-up |
| Initial root E2E and web package-script forms did not honor focused selection. | **Resolved execution-command issue** | Interrupted logs plus direct authoritative reruns; no source finding. | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed for Round 1.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` in this stage; reviewed implementation coverage was executed as-is.
- Post-repository confidence: `93.7%` before failure-origin review; updated ticket-scoped confidence `94.5%` after `CRR-002` confirmed the red command origins.
- Broader validation decision: `Not Required`; no browser/live/desktop run would materially exercise this removal boundary.
- Reroute Required Before Validation Execution: `No` — execution is complete.
- Reroute Required Before Final Delivery Handoff: `No` — `CRR-002` confirmed `API-008` and `API-009` as baseline/environment repository-health conditions with no implementation or durable-coverage action required.
- Ticket-scoped result: **`Pass with residual repository-health caveats`**. This is not a claim that the canonical server typecheck or full native Vitest command passes.
- Recommended Recipient: `delivery_engineer` for integrated-state refresh, documentation/no-impact handling, and final delivery preparation.
- Notes: Canonical result and revision artifacts are `api-e2e-execution-coverage-report.md` and `api-e2e-revision-record.md`; all evidence logs and `CRR-002` are retained under `test-results/` and the worktree root.
