# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/api-e2e-coverage-investigation.md`
- Current Execution Round: 2
- Trigger: User requested higher-confidence real E2E coverage after Round 1 API/E2E pass, specifically asking to create and run a real E2E test if no such test existed.
- Prior Round Reviewed: Round 1 in this same report; it passed with reviewed durable tests plus a temporary runtime-boundary probe, but explicitly did not run a full live standalone GraphQL/WebSocket Codex E2E.
- Latest Authoritative Round: Round 2, this file.

Round rules:

- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass for `send-message-global-run-routing` | N/A | No | Pass | No | Existing reviewed durable coverage plus temporary runtime-boundary probe and static inspection passed. No repository-resident durable coverage was added in Round 1. |
| 2 | User requested real E2E coverage for higher confidence | N/A; Round 1 had no unresolved failures | No | Pass | Yes | Added and executed a durable live Codex standalone GraphQL/WebSocket E2E for exact-run global direct routing and active-only rejection. Because durable coverage changed after code review, this round returns to `code_reviewer`. |

## Execution Basis

Execution followed the latest coverage investigation decisions in `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/api-e2e-coverage-investigation.md`.

The approved behavior under test was:

- selector-first `send_message_to` with `recipient_name` as team route and `target_agent_run_id` as global exact active-run route;
- active-only direct lookup via `AgentRunManager.getActiveRun`;
- direct target input and direct `INTER_AGENT_MESSAGE` event with no `team_run_id`/Team Communication projection;
- configured standalone AutoByteus/Codex/Claude exposure and handler path;
- grant-enforced Skill Self-Evolver outcome behavior;
- no legacy address-directory/team-claim/lazy/recoverable public exact-run route.

Round 2 specifically added a live Codex standalone E2E because the user requested real E2E proof beyond the Round 1 temporary runtime-boundary probe.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Round 2 investigation updated the Round 1 no-additional-durable-coverage decision before adding the E2E file. The new planned durable artifact was `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts` | Still Valid | Executed in Round 1 | Parser/selector/reference validation tests passed in focused suite. |
| `tests/unit/agent-tools/team-communication/send-message-to.test.ts` | Still Valid | Executed in Round 1 and focused Round 2 regression | AutoByteus wrapper team/global split tests passed. |
| `tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Still Valid | Executed in Round 1 and focused Round 2 regression | Active delivery, inactive rejection, no projection fields, grants, and target-inactive summary passed. |
| `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Still Valid | Executed in Round 1 | Configured AutoByteus exposure/instructions tests passed. |
| `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Still Valid | Executed in Round 1 and focused Round 2 regression | Standalone Codex dynamic tool exposure tests passed. |
| `tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Still Valid | Executed in Round 1 | Team/exact-run Codex bootstrap guidance tests passed. |
| `tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts` | Still Valid | Executed in Round 1 and focused Round 2 regression | Codex schema test passed. |
| `tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts` | Still Valid | Executed in Round 1 | Claude handler dispatch/validation lifecycle tests passed. |
| `tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts` | Still Valid | Executed in Round 1 | Claude schema test passed. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Still Valid | Executed in Round 1 | Claude tool gating tests passed. |
| `tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts` | Still Valid | Executed in Round 1 | Claude MCP send-message server test passed. |
| `tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Still Valid | Executed in Round 1 | Active exact-run/team selector guidance tests passed. |
| `tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts` | Still Valid | Executed in Round 1 and focused Round 2 regression | Team projection processor tests passed; direct events without `team_run_id` derive no Team Communication events. |
| `tests/self-evolution/single-agent-evolver-strategy.test.ts` | Still Valid | Executed in Round 1 | Helper prompt/metadata/not-attempted outcome tests passed. |
| `tests/self-evolution/self-evolution-service.integration.test.ts` | Still Valid | Executed in Round 1 | Stale-target start rejection and record behavior tests passed. |
| `tests/self-evolution/self-evolution-record-lifecycle.test.ts` | Still Valid | Executed in Round 1 | Helper-authored outcome suppresses duplicate generic notification. |
| Existing heavy real-runtime team E2E files using `recipient_name` | Still Valid | Inventory retained; not run this round | Retained as valid E2E inventory for team route and Team Communication projection behavior. |
| Existing internal team/task-agent exact-run tests | Out Of Scope | Not run specifically for this ticket | Task-delegation internals remain separate from public `send_message_to(target_agent_run_id)` semantics. |
| New `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Add Durable Coverage | Implemented and executed in Round 2 | Live Codex standalone GraphQL/WebSocket E2E passed with `RUN_CODEX_E2E=1`. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Evidence:

- Static scan found no `AgentTeamRunManager`, `TeamMessageRecipientResolver`, recovery cache, metadata-only, restore, `ensureReady`, or claim dependency in `src/agent-communication`, `src/agent-tools/agent-communication`, or provider `agent-communication` adapters.
- Static scan found no `team_run_id`, `teamRunId`, `reference_file_entries`, `TEAM_COMMUNICATION_MESSAGE`, or Team Communication projection references in `global-agent-run-message-runtime-builders.ts` or `global-agent-run-message-router.ts`.
- Static scan found no superseded `GlobalAgentRunAddressDirectory`; only the public contract text mentions that inactive/preallocated/recoverable/lazy-startable ids are rejected.
- The new Round 2 E2E asserts the active direct event omits `team_run_id`, `teamRunId`, and `reference_file_entries`, and that the same exact run id is rejected after the target run is terminated.

## Execution Surfaces / Modes

- Static source inspection for forbidden route dependencies and direct-event projection fields.
- TypeScript source build check.
- Full server build/smoke check for built-in agent assets, including Skill Self-Evolver config.
- Focused durable Vitest suite across parser, router, AutoByteus/Codex/Claude adapters, team route, event processor, and self-evolution.
- Temporary runtime-boundary Vitest probe in Round 1 using actual runtime tool handlers/registrations and a mocked active `AgentRunManager.getActiveRun` target.
- New durable live Codex standalone GraphQL/WebSocket E2E in Round 2.

## Platform / Runtime Targets

- Platform: macOS/Darwin local development worktree.
- Node/Vitest runtime through repository `pnpm` scripts.
- Round 2 live runtime: Codex app-server runtime through repository GraphQL schema and agent WebSocket registration, with the local `codex` binary and `RUN_CODEX_E2E=1`.
- Runtime surfaces exercised across both rounds: AutoByteus local tool wrapper, Codex dynamic tool registration/standalone runtime, Claude MCP/tool-call handler, shared dispatcher/router, Team Communication event processor, self-evolution services.

## Lifecycle / Upgrade / Restart / Migration Checks

- Prisma test database migrations were applied/reset automatically by Vitest setup during focused test runs.
- `pnpm -C autobyteus-server-ts build:full` ran `clean-build-output.mjs`, TypeScript build, managed messaging asset copy, and built-in agent bootstrap smoke check successfully in Round 1.
- Round 2 E2E created standalone target/sender runs, opened WebSocket sessions, terminated the target run, and verified active-only rejection against the same exact id after termination.
- No installer/updater/restart/migration scenario is in scope beyond test database migration setup and agent-run lifecycle exercised by the E2E.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Criteria | Execution Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| DUR-001 | REQ-001/REQ-002/AC-001 parser contract | Durable Vitest parser tests | Pass | Round 1 focused suite: 15 files / 64 tests passed. |
| DUR-002 | REQ-003/REQ-011/AC-002/AC-011 `recipient_name` team route | AutoByteus wrapper and member instruction durable tests; Team Communication processor test | Pass | Round 1 focused suite passed; processor test passed; Round 2 focused regression included wrapper and processor tests. |
| DUR-003 | REQ-006/REQ-007/AC-003/AC-009/AC-010 active-only exact ids | Global router durable tests, temporary runtime probe, and Round 2 live Codex E2E | Pass | Router rejects null `getActiveRun`; temp probe showed standalone handlers return inactive failure; live E2E rejected same run id after target termination. |
| DUR-004 | REQ-009/REQ-010/AC-007/AC-008 direct event/no projection | Global router durable tests, processor test, temporary probe, and Round 2 live Codex E2E | Pass | Direct events emitted without `team_run_id`; Team Communication processor derived `[]`; live target socket received `INTER_AGENT_MESSAGE` with no Team Communication projection payload. |
| DUR-005 | REQ-012/REQ-013/AC-004/AC-005/AC-006 runtime exposure | AutoByteus factory, Codex bootstrap/spec, Claude session/MCP/schema/handler durable tests, temp probe, and Round 2 live Codex E2E | Pass | Focused suites passed; temp probe executed actual AutoByteus/Codex/Claude handlers; live E2E proved configured standalone Codex can call `send_message_to` through GraphQL/WebSocket. |
| DUR-006 | REQ-015/REQ-016/AC-012/AC-013 grants | Global router durable tests | Pass | Wrong target/path, accepted send, exhausted grant, inactive target usage summary passed in Round 1. |
| DUR-007 | REQ-017 through REQ-022/AC-014 through AC-018 self-evolution | Self-evolution strategy/service/record lifecycle tests plus build smoke | Pass | Round 1 focused suite and `build:full` passed. |
| STAT-001 | REQ-008/REQ-023/no legacy route | Static scans and build | Pass | No forbidden dependencies or new direct route compatibility owner found; build passed; `git diff --check` passed after Round 2. |
| E2E-001 | REQ-004 through REQ-010, REQ-012, REQ-013; AC-005, AC-007, AC-011, AC-020 live configured standalone Codex exact-run route | New durable live GraphQL/WebSocket Codex standalone E2E | Pass | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts --reporter verbose` passed: 1 file / 1 test. |

## Test Scope

In scope:

- Shared parser and dispatcher.
- Global direct exact-run route.
- Runtime adapter tool exposure/handler dispatch for AutoByteus/Codex/Claude.
- Live standalone Codex GraphQL/WebSocket tool invocation for exact-run direct delivery and inactive rejection.
- Team `recipient_name` preservation and Team Communication projection boundary.
- Skill Self-Evolver live start, grant/outcome, and duplicate-notification suppression.
- Build/smoke for built-in agent assets.

Out of scope:

- Live external LLM E2E for AutoByteus and Claude standalone variants; their deterministic exposure/handler surfaces passed, and the live Codex E2E exercises the shared dispatcher/router/API boundary.
- Distributed/cross-process routing, offline inbox, global message UI history, multi-tenant ACL.
- Task-delegation lifecycle semantics outside public `send_message_to` routing.

## Execution Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing`
- Branch: `codex/send-message-global-run-routing`
- Package manager: `pnpm`
- Test database: Vitest setup reset SQLite database at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db` during test runs.
- Round 1 temporary probe file: `autobyteus-server-ts/tests/.tmp/send-message-global-runtime-probe.test.ts`, created for execution and removed afterward.
- Round 2 durable E2E file: `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`.
- Round 2 E2E gate: skipped unless `codex --version` succeeds and `RUN_CODEX_E2E=1` is set; API/E2E executed it with that flag enabled.

## Tests Implemented Or Updated

Repository-resident durable coverage added by API/E2E in Round 2:

- `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`

The new E2E verifies:

- a target standalone Codex run and sender standalone Codex run can be created through GraphQL;
- the sender agent definition exposes `send_message_to` through configured `toolNames`;
- the sender calls `send_message_to` with exact JSON arguments including `target_agent_run_id`;
- the sender WebSocket observes `SEGMENT_START`, `TOOL_EXECUTION_STARTED`, and `TOOL_EXECUTION_SUCCEEDED` for `send_message_to`;
- the target WebSocket observes an `INTER_AGENT_MESSAGE` with exact sender run id, target run id, content, and message type;
- the direct event lacks `team_run_id`, `teamRunId`, and `reference_file_entries` and no `TEAM_COMMUNICATION_MESSAGE` appears for that turn;
- after target termination, the same exact target id causes sender-side `TOOL_EXECUTION_FAILED` containing `Exact AgentRun target '<id>' is not active.`

Implementation-added or updated durable tests validated in Round 1 are listed in the prior Round 1 report content and summarized in the durable coverage decision table above.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage identified. | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`
- Paths removed: N/A
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` — this Round 2 handoff returns to `code_reviewer` for coverage-code re-review before delivery.
- Post-API/E2E coverage code review artifact: Pending from `code_reviewer`.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/api-e2e-execution-coverage-report.md`
- New durable E2E: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`

## Temporary Execution Methods / Scaffolding

Round 1 temporary probe file created and removed:

- `autobyteus-server-ts/tests/.tmp/send-message-global-runtime-probe.test.ts`

Round 1 probe assertions:

- AutoByteus bound standalone tool delivered through singleton dispatcher/router to active exact target.
- Codex dynamic tool registration handler delivered through singleton dispatcher/router to active exact target.
- Claude tool-call handler delivered through singleton dispatcher/router to active exact target and emitted lifecycle events.
- Target `postUserMessage` was called three times and three direct `INTER_AGENT_MESSAGE` events were emitted.
- Each direct event lacked `team_run_id` and `reference_file_entries`.
- Feeding those direct events to `TeamCommunicationMessageProcessor` produced no derived Team Communication events.
- With `AgentRunManager.getActiveRun` returning `null`, AutoByteus/Codex/Claude handlers returned target-not-active failures.

Round 2 added no temporary execution scaffolding; the live Codex standalone GraphQL/WebSocket E2E remains durable repository coverage.

## Dependencies Mocked Or Emulated

- Round 1 temporary runtime probe spied `AgentRunManager.getActiveRun` to return a mocked active target `AgentRun` or `null`.
- Durable unit tests use repository mocks/stubs for runtime providers and self-evolution dependencies as already reviewed by code reviewer.
- Round 2 E2E did not mock the Codex sender/target runtime path: it used GraphQL schema mutations, registered agent WebSockets, the local `codex` binary, configured agent definitions, and real tool lifecycle events.
- Round 2 still runs in local test infrastructure with temp app data/workspace directories rather than a deployed multi-node environment.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | N/A | N/A | Round 1 had no unresolved failures. Round 2 added new E2E coverage due to user confidence request, not due to a prior failure. |

## Scenarios Checked

Commands executed from `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing`:

Round 1:

1. Static inspection and coverage inventory commands:
   - `git diff --name-status origin/personal -- autobyteus-server-ts/tests`
   - `git ls-files --others --exclude-standard autobyteus-server-ts/tests`
   - `rg` scans for old shared paths, superseded address-directory/team-claim terms, forbidden direct-route dependencies, and projection fields.
2. `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
3. Focused durable suite:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-communication/global-agent-run-message-router.test.ts tests/unit/agent-tools/team-communication/send-message-to.test.ts tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts tests/self-evolution/self-evolution-record-lifecycle.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts`
4. `pnpm -C autobyteus-server-ts build:full`
5. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts`
6. Temporary runtime-boundary probe:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/.tmp/send-message-global-runtime-probe.test.ts --reporter verbose`
7. Cleanup checks:
   - `git diff --check`
   - temporary probe removal check.

Round 2:

1. Formatted the new E2E file:
   - `pnpm -C autobyteus-server-ts exec prettier --write tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`
2. Live Codex standalone E2E:
   - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts --reporter verbose`
3. Typecheck and focused route regression:
   - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit && pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-communication/global-agent-run-message-router.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts tests/unit/agent-tools/team-communication/send-message-to.test.ts tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts`
4. Cleanup/check:
   - `git diff --check`

## Passed

Round 1:

- Static inspection passed: no forbidden direct route dependencies or direct projection fields found.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` passed.
- Focused durable Vitest suite passed: `15` test files / `64` tests.
- `pnpm -C autobyteus-server-ts build:full` passed, including built-in agents bootstrap smoke check.
- Team Communication event processor Vitest passed: `1` test file / `3` tests.
- Temporary runtime-boundary probe passed: `1` temporary test file / `2` tests.
- `git diff --check` passed.
- Temporary probe file was removed after execution.

Round 2:

- New live Codex standalone E2E passed: `1` test file / `1` test, duration approximately `22.50s`, test body approximately `15.60s`.
- Round 2 typecheck passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
- Round 2 focused regression passed: `5` test files / `28` tests.
- Final `git diff --check` passed.

## Failed

None.

## Not Tested / Out Of Scope

- Live standalone AutoByteus and Claude GraphQL/WebSocket model-driven E2E were not added in Round 2. Their deterministic configured exposure/handler paths were covered in Round 1; the live Codex E2E exercises the shared `send_message_to` dispatcher/router/API/WebSocket semantics with an actual model/tool invocation.
- Multi-tenant ACL, distributed routing, offline inbox, direct global message UI/history, and task-delegation lifecycle semantics are out of scope by requirements.

## Blocked

None.

## Cleanup Performed

- Removed temporary probe file `autobyteus-server-ts/tests/.tmp/send-message-global-runtime-probe.test.ts` in Round 1.
- Round 2 E2E cleans up WebSockets, Fastify apps, agent runs, temp app data dir, and temp workspace roots in `finally`/`afterAll`.
- Verified `git diff --check` passes after Round 2.
- No temporary API/E2E scaffolding remains; the new E2E file is intentionally durable coverage.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No failure classification applies because validation passed and no reroute trigger was observed.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Round 2 closes the main confidence gap the user identified: it is no longer only handler-level proof. There is now a repository-resident E2E that creates real standalone Codex runs, has the sender call `send_message_to`, observes sender tool lifecycle events, observes direct target delivery on the target WebSocket, and proves the same exact run id fails after target termination.
- Direct global messages were proven not to project Team Communication by durable router/processor tests, temporary probe assertions, and the new live E2E assertion that the target turn contains no `TEAM_COMMUNICATION_MESSAGE` and no team projection fields.
- Public exact-run inactive behavior was proven through router durable tests, runtime-boundary handler probe, and live E2E target termination followed by tool failure.
- Because API/E2E added repository-resident durable coverage after the initial code review, workflow requires returning this cumulative package to `code_reviewer` for a narrow coverage-code re-review before delivery resumes.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E Round 2 passed for `send-message-global-run-routing` with added real Codex standalone GraphQL/WebSocket E2E coverage. Return to `code_reviewer` before delivery because durable coverage changed after initial code review.
