# Stage 7 Executable Validation (API/E2E)

Use this document for Stage 7 executable validation implementation and execution.
Stage 7 can cover API, browser/UI, native desktop/UI, CLI, process/lifecycle, integration, or other executable scenarios when those are the real boundaries being proven.
Do not use this file for unit/integration tracking; that belongs in `implementation.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

## Validation Round Meta

- Current Validation Round: `1`
- Trigger Stage: `6`
- Prior Round Reviewed: `None`
- Latest Authoritative Round: `1`

## Testing Scope

- Ticket: `remove-assistant-chunk-legacy-path`
- Scope classification: `Small`
- Workflow state source: `tickets/done/remove-assistant-chunk-legacy-path/workflow-state.md`
- Requirements source: `tickets/done/remove-assistant-chunk-legacy-path/requirements.md`
- Call stack source: `tickets/done/remove-assistant-chunk-legacy-path/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`
- Interface/system shape in scope: `CLI` / `Worker/Process` / `Distributed Sync`
- Platform/runtime targets: local workspace packages `autobyteus-ts`, `autobyteus-server-ts`, and the in-repo `autobyteus-web` protocol surface
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - segment-only unit tests in `autobyteus-ts/tests/unit/...`
  - segment-only server converter and websocket tests in `autobyteus-server-ts/tests/...`
- Temporary validation methods or setup to use only if needed:
  - repo-wide `rg` audit for removed symbols and frontend/websocket contract references
- Cleanup expectation for temporary validation:
  - no temporary files were created; shell-only audit commands leave nothing behind

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | Targeted runtime, CLI, server, and websocket validation passed on the final cleanup tree. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | No production call site of `notifyAgentDataAssistantChunk(...)` remains | AV-001 | Passed | 2026-04-08 |
| AC-002 | R-002 | Segment events are the only live incremental assistant stream path in `autobyteus-ts` | AV-002 | Passed | 2026-04-08 |
| AC-003 | R-003 | Server/websocket behavior stays segment-only and active `.ts` tests validate it | AV-003 | Passed | 2026-04-08 |
| AC-004 | R-004 | In-scope chunk-only code/tests are removed or rewritten | AV-002, AV-003, AV-004 | Passed | 2026-04-08 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `autobyteus-ts` runtime + CLI consumers | AV-002 | Passed | Reviewed the segment-only path from notifier/event stream through CLI/team rendering and speaking-state updates. |
| DS-002 | Primary End-to-End | `autobyteus-server-ts` websocket bridge | AV-003 | Passed | Reviewed the converter-to-websocket path and confirmed active websocket tests expect `SEGMENT_CONTENT`, not `ASSISTANT_CHUNK`. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001 | R-001 | UC-001 | CLI | workspace repo audit | None | Prove the removed notifier and chunk symbols no longer exist in active source/test/frontend paths | No match remains for `ASSISTANT_CHUNK`, `AGENT_DATA_ASSISTANT_CHUNK`, `AssistantChunkData`, `createAssistantChunkData`, `notifyAgentDataAssistantChunk`, or `streamAssistantChunks` | `autobyteus-ts/tests/unit/events/event-types.test.ts`, `autobyteus-ts/tests/unit/agent/events/notifiers.test.ts` | `rg` audit across in-scope packages | `rg -n "ASSISTANT_CHUNK|AGENT_DATA_ASSISTANT_CHUNK|AssistantChunkData|createAssistantChunkData|notifyAgentDataAssistantChunk|streamAssistantChunks" autobyteus-ts/src autobyteus-ts/tests autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web || true` | Passed |
| AV-002 | DS-001 | Requirement | AC-002, AC-004 | R-002, R-004 | UC-001, UC-002 | Integration | `autobyteus-ts` package | None | Prove runtime/CLI streaming only uses segment events plus completion and no chunk fallback remains | Targeted `autobyteus-ts` suite passes with segment-only expectations | `autobyteus-ts/tests/unit/events/event-types.test.ts`, `autobyteus-ts/tests/unit/agent/events/notifiers.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/events/stream-events.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/reexports.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/streams/agent-event-stream.test.ts`, `autobyteus-ts/tests/unit/cli/agent-team-state-store.test.ts`, `autobyteus-ts/tests/unit/agent-team/streaming/agent-event-bridge.test.ts`, `autobyteus-ts/tests/unit/agent-team/streaming/agent-team-event-notifier.test.ts` | None | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-assistant-chunk-legacy-path/autobyteus-ts exec vitest run tests/unit/events/event-types.test.ts tests/unit/agent/events/notifiers.test.ts tests/unit/agent/streaming/events/stream-event-payloads.test.ts tests/unit/agent/streaming/events/stream-events.test.ts tests/unit/agent/streaming/reexports.test.ts tests/unit/agent/streaming/streams/agent-event-stream.test.ts tests/unit/cli/agent-team-state-store.test.ts tests/unit/agent-team/streaming/agent-event-bridge.test.ts tests/unit/agent-team/streaming/agent-team-event-notifier.test.ts` | Passed |
| AV-003 | DS-002 | Requirement | AC-003, AC-004 | R-003, R-004 | UC-003 | Integration | `autobyteus-server-ts` package | None | Prove the server-side converter/websocket contract remains segment-only and active `.ts` coverage stays authoritative | Targeted server converter and websocket tests pass; `vitest.config.ts` includes only `tests/**/*.test.ts` | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts`, `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | None | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-assistant-chunk-legacy-path/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts --no-watch` | Passed |
| AV-004 | DS-001, DS-002 | Design-Risk | AC-004 | R-004 | UC-001, UC-002, UC-003 | CLI | workspace diff audit | None | Prove the cleanup did not leave dormant compatibility wrappers or dead chunk-only branches in the changed scope | Net diff stays subtractive in source and the removed symbol audit is clean | Updated source/tests in `autobyteus-ts` and `autobyteus-server-ts` | `git diff --stat` review plus zero-hit symbol audit | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-assistant-chunk-legacy-path diff --stat` and the AV-001 `rg` command | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/events/event-types.test.ts` | API Test | Yes | AV-001, AV-002 | Removed stale chunk assertions and aligned the enum coverage to current event types. |
| `autobyteus-ts/tests/unit/agent/events/notifiers.test.ts` | API Test | Yes | AV-001, AV-002 | Removed chunk notifier expectations. |
| `autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/events/stream-events.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/reexports.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/streams/agent-event-stream.test.ts` | API Test | Yes | AV-002 | Rebased streaming coverage on segment events plus final responses. |
| `autobyteus-ts/tests/unit/cli/agent-team-state-store.test.ts`, `autobyteus-ts/tests/unit/agent-team/streaming/agent-event-bridge.test.ts`, `autobyteus-ts/tests/unit/agent-team/streaming/agent-team-event-notifier.test.ts` | API Test | Yes | AV-002 | Updated team/CLI rebroadcast coverage to segment events. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts` | API Test | Yes | AV-003 | Removes the dead chunk-drop assertion and keeps unknown-segment rejection coverage. |
| `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | API Test | Yes | AV-003 | Active websocket coverage already asserted `SEGMENT_CONTENT`; it was rerun to confirm the final tree. |
| `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.js` | Fixture | Yes | AV-004 | Stale excluded duplicate was updated in-scope so it no longer advertises the removed chunk protocol. |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| `rg` symbol audit across `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web` | AC-001 and AC-004 are absence checks that unit tests alone do not prove | AV-001, AV-004 | No | N/A |
| `git diff --stat` changed-scope audit | Confirms the cleanup remained subtractive and did not reintroduce a compatibility wrapper elsewhere in scope | AV-004 | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First validation round. |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-04-08 | N/A | None | No | N/A | N/A | No | No | No | No | N/A | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): `pnpm install --frozen-lockfile` was required once in the fresh worktree before running the targeted suites; no remaining execution blocker exists.
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `N/A`
- Compensating automated evidence: zero-hit symbol audit plus targeted runtime/server suites on the final tree
- Residual risk notes: out-of-repo consumers could still compile against the removed exports if they exist, but no in-repo evidence of such a dependency was found and the ticket boundary explicitly treats in-repo ownership as authoritative.
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

## Stage 7 Gate Decision

- Latest authoritative round: `1`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - `autobyteus-web` stayed clean with no `ASSISTANT_CHUNK` protocol reference.
  - Active server executable coverage remains the `.ts` Vitest surface because `autobyteus-server-ts/vitest.config.ts` includes only `tests/**/*.test.ts`.
