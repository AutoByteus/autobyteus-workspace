# Design Spec

## Current-State Read

The frontend keeps the same visible run/team context after interrupt. `AgentStreamingService` and `TeamStreamingService` send `STOP_GENERATION` and later `SEND_MESSAGE` over the same WebSocket run id/team run id. Backend stream handlers route those commands to the same `AgentRun`/`TeamRun`, and Claude team members ultimately use the same `ClaudeSession` implementation as standalone Claude runs.

Inside `ClaudeSession`, a fresh run starts with a local placeholder `sessionId` equal to `runId`. When Claude SDK stream chunks arrive, `resolveClaudeStreamChunkSessionId(...)` extracts the provider `session_id`, and `ClaudeSession.adoptResolvedSessionId(...)` stores it. However, `ClaudeSession.executeTurn(...)` only passes a resume id to `ClaudeSdkClient.startQueryTurn(...)` when `hasCompletedTurn` is true. An interrupted turn is intentionally not marked completed, so an interrupted first/incomplete turn that already adopted a real provider session id still starts the next SDK query with `sessionId: null`, which maps to no SDK `resume` and creates a fresh Claude conversation.

Current ownership boundaries are otherwise healthy:

- `ClaudeSession` owns provider session identity, active turn state, interruption, and query execution.
- `ClaudeSdkClient` is the adapter that maps a non-null runtime `sessionId` to SDK `options.resume`.
- WebSocket handlers and frontend services are transport/command boundaries and should not decide provider resume semantics.

## Intended Change

Change the Claude runtime continuation invariant from “a previous turn completed” to “a real Claude provider session id is available.” After an interrupted turn has adopted a provider `session_id`, the next same-session turn must pass that id to the SDK resume path. The local placeholder `runId` must never be sent as a provider resume id.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, a missing invariant in the existing Claude session owner.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: `ClaudeSession.executeTurn(...)` gates SDK resume on `hasCompletedTurn`, but `ClaudeSession.adoptResolvedSessionId(...)` can resolve a provider session id before completion; focused repro showed follow-up `sessionId` was null after interrupt despite an adopted provider session id.
- Design response: Add a provider-session-resume predicate inside `ClaudeSession`, use it for `startQueryTurn`, and test interrupted-session continuity.
- Refactor rationale: The existing owner, boundary, API shape, and file placement are correct. Only the local invariant and tests need tightening.
- Intentional deferrals and residual risk, if any: Restore-after-interrupt metadata freshness for standalone runs is noted as a possible follow-up if API/E2E exposes it; it is not required for same-active-session interrupt/follow-up continuity.

## Terminology

- `Provider session id`: the real Claude SDK `session_id` emitted by SDK chunks or loaded from persisted platform metadata.
- `Placeholder session id`: the local Autobyteus `runId` used before any provider `session_id` is known.
- `Resumable Claude session`: a Claude session whose `sessionId` is a non-empty provider id, not the local placeholder.

## Design Reading Order

1. Follow the interrupt/follow-up data-flow spine.
2. Inspect `ClaudeSession` as the governing owner.
3. Apply the resume-id predicate.
4. Verify through unit plus fake-SDK API/E2E/integration coverage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission the old `hasCompletedTurn`-only resume decision for Claude turns.
- No dual behavior: interrupted provider-session resumes must not remain an optional/fallback mode.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Frontend same-run follow-up after interrupt | Claude SDK `query(...)` starts with `resume: providerSessionId` | `ClaudeSession` | This is the user-visible bug path. |
| DS-002 | Return-Event | Claude SDK chunk with `session_id` | Runtime/team context now exposes provider session id | `ClaudeSession` | This makes an interrupted incomplete turn resumable. |
| DS-003 | Bounded Local | Active turn interrupt request | Active query closed, turn settled, `TURN_INTERRUPTED` emitted | `ClaudeSession` | Ensures follow-up is only accepted after active turn state is clear. |
| DS-004 | Primary End-to-End | Restore/history-open with persisted provider id | Claude SDK `query(...)` resumes restored provider session | `ClaudeSessionManager` + `ClaudeSession` | Existing behavior must not regress. |

## Primary Execution Spine(s)

- DS-001: `Frontend Chat Input -> Agent/Team WebSocket Handler -> AgentRun/TeamRun -> ClaudeSession.sendTurn -> ClaudeSession.executeTurn -> ClaudeSdkClient.startQueryTurn -> Claude SDK query(resume)`
- DS-004: `History/Restore Request -> AgentRunService/TeamRunService -> ClaudeSessionManager.restoreRunSession -> ClaudeSession.sendTurn -> ClaudeSdkClient.startQueryTurn -> Claude SDK query(resume)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | After interrupt has settled, the follow-up send reaches the same active Claude session. The session chooses a resume id based on whether a real provider session id is known, not on whether the previous turn completed. | Frontend command, stream handler, run/team run, Claude session, SDK client | `ClaudeSession` | WebSocket serialization, message cache, tool approval cleanup |
| DS-002 | During any SDK stream, chunks with `session_id` update the session from placeholder to provider id. That identity is the authority for future resume. | SDK chunk, normalizer, Claude session state, runtime context | `ClaudeSession` | Message cache migration, team member context metadata refresh |
| DS-003 | Interrupt aborts/closes the active query, clears active turn state after settlement, and emits idle status without marking the turn completed. | Active turn execution, abort controller, SDK query, runtime event | `ClaudeSession` | Tool approval cleanup, query map cleanup |
| DS-004 | Restored runs/member runs hydrate a provider session id from metadata and use it for the next SDK turn. | Metadata, run manager, session manager, Claude session, SDK client | `ClaudeSessionManager` for restore, `ClaudeSession` for turn execution | Workspace/agent bootstrap |

## Spine Actors / Main-Line Nodes

- Frontend command surface: sends stop and follow-up commands to the same run/team stream.
- Stream handler: resolves active/restored run/team and delegates commands.
- `AgentRun` / `TeamRun`: runtime command facade.
- `ClaudeSession`: authoritative provider session and active turn lifecycle owner.
- `ClaudeSdkClient`: SDK adapter that turns runtime `sessionId` into SDK `resume`.
- Claude SDK: external provider runtime that persists/resumes conversation history.

## Ownership Map

- `ClaudeSession` owns:
  - local placeholder vs provider session identity;
  - active turn lifecycle;
  - interruption settlement;
  - whether a turn should resume a provider session;
  - local message cache migration when provider id is adopted.
- `ClaudeSessionManager` owns creating/restoring `ClaudeSession` instances and initializing placeholder/provider ids.
- `ClaudeSdkClient` owns SDK option shape only; it must not infer Autobyteus run-state semantics.
- Frontend and WebSocket handlers own transport and command routing only.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamingService` / `TeamStreamingService` | Backend stream handlers + runtime owners | Browser command facade | Provider resume semantics |
| `AgentRun.postUserMessage` | Runtime backend / `ClaudeSession` | Common runtime command API | Provider-specific session decisions |
| `ClaudeSdkClient.startQueryTurn` | `ClaudeSession` provides correct runtime input | SDK adapter boundary | Distinguishing placeholder vs provider ids |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `hasCompletedTurn`-only resume guard in `ClaudeSession.executeTurn` | Completion is not the correct criterion for resuming interrupted sessions. | `ClaudeSession` provider-session resume predicate | In This Change | `hasCompletedTurn` itself can remain for lifecycle/restore semantics; only its role as sole resume gate is removed. |
| Temporary or ad hoc repro scripts | Durable tests replace investigation probes. | Unit/e2e/integration test files | In This Change | Do not commit temporary `/tmp` repro. |

## Return Or Event Spine(s) (If Applicable)

- DS-002: `Claude SDK chunk(session_id) -> resolveClaudeStreamChunkSessionId -> ClaudeSession.adoptResolvedSessionId -> runtimeContext.sessionId/provider id -> future getPlatformAgentRunId/resume predicate`
- Runtime event return path remains: `ClaudeSession.emitRuntimeEvent -> ClaudeSessionEventConverter -> AgentRun/TeamRun event listeners -> WebSocket message -> frontend conversation/status handlers`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSession`
- Interrupt local spine: `interrupt() -> interruptActiveTurn -> clear pending approvals -> abort controller -> close active query -> wait settledTask -> emit TURN_INTERRUPTED -> clear active turn/query state`
- Why it matters: follow-up sends are rejected while `activeTurnId` exists; the resume fix must not allow overlapping turns or bypass interrupt settlement.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Message cache migration | DS-002 | `ClaudeSession` | Move cached messages from placeholder id to provider id after adoption | Keeps history lookup coherent | Duplicated or stale local history |
| Tool approval cleanup | DS-003 | `ClaudeSession` | Deny/clear pending approvals on interrupt | Prevents blocked tool futures and unwanted execution | Active turn may never settle |
| SDK option mapping | DS-001, DS-004 | `ClaudeSdkClient` | Convert runtime `sessionId` to SDK `resume` | Keeps provider API shape isolated | Runtime owner would know SDK object internals |
| WebSocket serialization | DS-001 | Stream handlers | Transport frontend commands/events | Browser boundary | Provider policy leaking into frontend |
| Fake-SDK validation harness | DS-001, DS-003 | Tests | Deterministically simulate session id adoption and interrupt | Avoids live Claude flakiness | CI would depend on external model behavior |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider session resume decision | Claude backend session subsystem | Extend | `ClaudeSession` already owns session identity and turn execution. | N/A |
| SDK `resume` option | Claude runtime-management client | Reuse | `ClaudeSdkClient` already maps `sessionId` to `resume`. | N/A |
| Regression validation | Existing Vitest unit/e2e/integration suites | Extend | Existing tests cover Claude session and runtime paths. | N/A |
| Frontend send/stop routing | Existing streaming services/stores | Reuse unchanged | Investigation found no frontend root cause. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude session backend | Provider id state, active turn lifecycle, resume eligibility | DS-001, DS-002, DS-003, DS-004 | `ClaudeSession` | Extend | Primary code change. |
| Claude SDK client adapter | SDK option shape | DS-001, DS-004 | `ClaudeSession` | Reuse | No change expected. |
| Agent/team stream services | WebSocket command routing | DS-001 | `AgentRun`, `TeamRun` | Reuse | Covered by tests only if fake-SDK e2e is added. |
| Test suites | Regression proof | All | Implementation/API-E2E | Extend | Add deterministic tests. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude session backend | `ClaudeSession` | Add provider-session resume predicate and use it when starting SDK query turns. | Existing provider session/turn owner. | Existing context fields only. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Test suite | Claude session unit tests | Add interrupted adopted-session follow-up test and placeholder no-resume guard if needed. | Existing unit coverage for this class. | Test helpers already present. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-interrupt-resume.e2e.test.ts` or existing runtime e2e file | Test suite | API/E2E runtime path | Fake Claude SDK WebSocket scenario for `STOP_GENERATION` then `SEND_MESSAGE` resume. | Exercises user path beyond unit owner. | Can reuse e2e helpers/patterns. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Provider-session resume predicate | None; keep private in `ClaudeSession` | Claude session backend | Not repeated yet. | Yes | Yes | A generic helper detached from the session owner |
| Fake SDK query harness | Optional local test helper inside the test file | Test suite | Only needed by one scenario initially. | Yes | Yes | Production code or global test utility before repetition exists |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeAgentRunContext.sessionId` | Yes if treated as placeholder-or-provider current id | N/A | Medium | Use a private predicate to distinguish provider id from placeholder. |
| `ClaudeAgentRunContext.hasCompletedTurn` | Yes for lifecycle completion, not resume authority | N/A | Medium | Stop using it as sole resume gate. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude session backend | `ClaudeSession` | Compute provider resume id and pass it to `startQueryTurn`. | One owner for session state + query lifecycle. | Existing state fields. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Tests | Claude session unit behavior | Regression tests for interrupted adopted-session resume and placeholder no-resume. | Existing class-level test file. | Existing helper patterns. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-interrupt-resume.e2e.test.ts` (or equivalent existing e2e runtime file) | Tests | API/WebSocket path validation | Deterministic fake-SDK interrupt/follow-up scenario. | Keeps user-path validation separate from unit details. | Existing e2e setup patterns. |

## Ownership Boundaries

`ClaudeSession` is the authoritative boundary for Claude provider session identity. Callers above it must not inspect `hasCompletedTurn`, provider id, or SDK `resume` directly. `ClaudeSdkClient` must receive already-normalized runtime intent (`sessionId` or null) and only translate it to SDK options. Frontend and WebSocket layers must stay unaware of provider-session details.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSession.sendTurn` / `executeTurn` | Provider id predicate, active turn state, message cache, SDK query creation | `ClaudeAgentRunBackend`, `AgentRun`, `ClaudeTeamManager` | Callers passing SDK `resume` or checking `hasCompletedTurn` themselves | Add/adjust `ClaudeSession` methods, not caller policy |
| `ClaudeSdkClient.startQueryTurn` | SDK `query` option object | `ClaudeSession` | Direct SDK imports in session callers | Extend adapter input if SDK option shape changes |
| Stream handlers | WebSocket parse/route/serialize | Frontend stores/services | Provider-specific resume policy in frontend payload | Expose backend command results/events if needed |

## Dependency Rules

- `ClaudeSession` may depend on `ClaudeSdkClient` and Claude runtime normalizers.
- `ClaudeSdkClient` must not depend on `ClaudeSession` or Autobyteus run lifecycle semantics.
- Team and single-agent managers may depend on `AgentRun` and runtime backend facades, not Claude session internals.
- Frontend code must not send provider session ids or decide SDK resume behavior.
- Tests may inject fake SDK clients/modules through existing testing seams.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ClaudeSession.sendTurn(message)` | Claude session turn | Start a new user turn in current provider session when resumable | Autobyteus run context internal state | No new public parameter. |
| `ClaudeSdkClient.startQueryTurn({ sessionId })` | SDK query turn | Build `query({ options: { resume }})` when non-null | Real provider session id or null | Should continue not receiving placeholders. |
| WebSocket `SEND_MESSAGE` | Runtime command | Submit user content to current run/team | Run id/team run id in URL; target member name in payload | Unchanged. |
| WebSocket `STOP_GENERATION` | Runtime command | Interrupt current active run/team | Run id/team run id in URL | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeSession.sendTurn` | Yes | Yes internal | Low | No change. |
| `ClaudeSdkClient.startQueryTurn.sessionId` | Yes | Medium | Medium | Ensure caller only passes provider id; optional future rename could clarify but not needed now. |
| WebSocket `SEND_MESSAGE` | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Claude session | `ClaudeSession` | Yes | Low | Keep. |
| Completion flag | `hasCompletedTurn` | Yes for completion, not resume | Medium | Do not use as resume authority. |
| New private predicate | e.g. `getProviderSessionIdForResume` or `resolveProviderSessionIdForResume` | Yes | Low | Name by provider-session concern, not generic “canResume”. |

## Applied Patterns (If Any)

- State-machine/lifecycle guard inside `ClaudeSession`: active turn state and session identity remain inside one owner.
- Adapter pattern remains in `ClaudeSdkClient`: SDK option translation stays behind a boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | File | `ClaudeSession` | Provider session resume predicate and query start input | Existing session lifecycle owner | Frontend/UI policy or SDK module loading |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | File | Unit tests | Direct regression for resume id after interrupt | Existing Claude session tests | Live SDK credentials |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-interrupt-resume.e2e.test.ts` | File | E2E/runtime tests | WebSocket/GraphQL path with fake SDK | Existing runtime e2e area | Flaky live-only assertions as required coverage |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/claude/session` | Main-Line Domain-Control | Yes | Low | Session lifecycle and provider identity already live here. |
| `runtime-management/claude/client` | Persistence-Provider / Adapter | Yes | Low | SDK client remains a provider adapter. |
| `tests/e2e/runtime` | Transport/runtime validation | Yes | Low | User path validation belongs here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Resume predicate | `const resumeSessionId = this.resolveProviderSessionIdForResume(); await sdk.startQueryTurn({ sessionId: resumeSessionId, ... })` where the helper returns `null` for `sessionId === runId`. | `sessionId: this.hasCompletedTurn ? this.sessionId : null` | Shows the invariant shift from completion to provider id availability. |
| Placeholder protection | Fresh run first turn: `runId = run-1`, `sessionId = run-1` -> pass `null`. Interrupted after adoption: `sessionId = claude-session-1` -> pass `claude-session-1`. | Always passing `this.sessionId`, which would send `runId` placeholders to SDK `resume`. | Prevents invalid provider resume ids. |
| Boundary shape | Frontend sends only `STOP_GENERATION`/`SEND_MESSAGE`; backend session chooses resume id. | Frontend sends `claudeSessionId` in message payload. | Avoids leaking provider internals into UI state. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep interrupted incomplete turns as fresh Claude sessions | Matches current behavior and avoids touching resume predicate | Rejected | Always resume when a provider session id is known. |
| Add a frontend flag to request resume after interrupt | Could patch user-visible path externally | Rejected | `ClaudeSession` already owns provider session identity and must enforce the invariant. |
| Pass placeholder run id as SDK resume when no provider id exists | Simple but invalid/ambiguous | Rejected | Return `null` until a real provider session id exists. |

## Derived Layering (If Useful)

- UI/transport layer: frontend services and WebSocket handlers route commands.
- Runtime command layer: `AgentRun`/`TeamRun` facades route to backend.
- Claude session domain-control layer: `ClaudeSession` owns turn and session identity.
- Provider adapter layer: `ClaudeSdkClient` maps runtime input to SDK `query` options.

## Migration / Refactor Sequence

1. Add a private helper in `ClaudeSession` that returns the real provider session id for resume, or `null` when the current id is missing or equals `runId`.
2. Replace the `hasCompletedTurn`-only `sessionId` argument in `executeTurn(...)` with that helper.
3. Add/update unit tests:
   - interrupted turn adopts provider session id, then follow-up passes that id;
   - no provider id means no placeholder resume;
   - existing completed-turn and restore tests remain green.
4. Add deterministic API/E2E or integration validation with a fake Claude SDK query:
   - first fake query emits `session_id`, then blocks;
   - WebSocket sends `STOP_GENERATION`;
   - follow-up `SEND_MESSAGE` starts second fake query;
   - assert second query received `resume`/session id and emits context-retention marker only when resumed.
5. Run targeted tests and representative non-Claude interrupt/send checks.

## Key Tradeoffs

- Minimal local invariant fix avoids unnecessary runtime refactor and keeps provider policy in the correct owner.
- Comparing `sessionId` to `runId` uses the current placeholder convention; this is acceptable because `ClaudeSessionManager.createRunSession` explicitly sets the placeholder this way.
- Fake-SDK API/E2E coverage is less realistic than live Claude but stable and CI-safe; live-gated Claude E2E can remain optional.

## Risks

- If Claude SDK changes session id emission timing or field names, the existing normalizer may need updates; current local typings and code support `session_id`.
- If an interrupt happens before any provider session id exists, the system cannot provider-resume; implementation must avoid false placeholder resumes.
- Global SDK singleton injection for E2E must be reset to avoid cross-test contamination.

## Guidance For Implementation

- Keep the production code change in `ClaudeSession`; avoid frontend changes unless validation disproves current investigation.
- Prefer a helper name that encodes the identity distinction, for example `resolveProviderSessionIdForResume()`.
- Do not rename or remove `hasCompletedTurn` unless necessary; just stop using it as the sole resume gate.
- For the E2E/fake SDK test, use existing `ClaudeSdkClient.setCachedModuleForTesting(...)` seam or inject a `ClaudeSessionManager` with fake `sdkClient` where the chosen test layer allows it. Reset the fake after the test.
- The test should fail on current code by observing the second SDK query receives no resume id after an interrupted adopted-session first turn.
