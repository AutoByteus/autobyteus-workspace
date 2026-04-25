# Design Spec

## Current-State Read

The reported failure is not caused by missing persisted team history. The backend already has recovery owners:

- `TeamRunService.resolveTeamRun(teamRunId)` returns an active team run or restores from persisted team metadata.
- `AgentRunService.resolveAgentRun(runId)` returns an active agent run or restores from persisted agent metadata.

The current WebSocket streaming layer bypasses those owners:

- `AgentTeamStreamHandler.connect(...)` calls active-only `TeamRunService.getTeamRun(...)`. If the run was stopped/terminated and removed from `AgentTeamRunManager.activeRuns`, it sends `ERROR { code: TEAM_NOT_FOUND, message: "Team run '<id>' not found" }` and closes `4004`.
- `AgentTeamStreamHandler.handleSendMessage(...)` also resolves commands through active-only `getTeamRun(...)` and silently logs when the active run is gone.
- `AgentStreamHandler.connect(...)` and `handleSendMessage(...)` repeat the same active-only shape for single-agent runs through `AgentRunService.getAgentRun(...)`.

Frontend team send already has an explicit GraphQL restore branch, but it is cache-dependent (`teamResumeConfigByTeamRunId[teamRunId]?.isActive === false`). That cache can be stale/absent after local stop/termination. Also, `agentTeamRunStore.terminateTeamRun(...)` lacks single-agent parity: it does not mark the team history/resume config inactive or refresh history after successful backend termination.

The target design must therefore fix the authoritative backend stream boundary, while also tightening frontend team termination state so the UI aligns with backend stopped/inactive state.

## Intended Change

Use restore-capable runtime service boundaries for conversation stream opening and follow-up user-message sends:

- Team stream connect/send uses `TeamRunService.resolveTeamRun(...)` when opening a selected conversation or posting a user message.
- Single-agent stream connect/send uses `AgentRunService.resolveAgentRun(...)` for the same recoverable paths.
- Missing/unrecoverable runs still emit the existing not-found stream error and close `4004`.
- Stop-generation and tool approval commands remain active-run-only and must not restore a stopped run just to stop or approve.
- Frontend team termination marks team run-history state inactive and refreshes history after successful backend termination, matching single-agent termination behavior.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace active-only connect/send lookup for recoverable conversation paths with restore-capable service resolution. Do not keep a dual active-only fallback for stopped-but-recoverable runs.
- Treat removal as first-class design work: the old behavior `stream connect -> active map lookup -> not found` is removed for recoverable connect/send paths.
- Decision rule: the design does not depend on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team member follow-up send from frontend | Restored `TeamRun.postMessage(...)` to target member | `TeamRunService` for recovery, `AgentTeamStreamHandler` for stream/session command dispatch | Core reported bug path. |
| DS-002 | Primary End-to-End | Single-agent follow-up send from frontend | Restored `AgentRun.postUserMessage(...)` | `AgentRunService` for recovery, `AgentStreamHandler` for stream/session command dispatch | Required parity because the same active-only bug shape exists for individual agents. |
| DS-003 | Primary End-to-End | Frontend team terminate action | Team history/read model marked inactive and refreshed | `agentTeamRunStore` for frontend team lifecycle orchestration | Prevents stale frontend active state after team stop/terminate. |
| DS-004 | Return-Event | Restored runtime emits status/events | Frontend conversation/status updates | Stream handler subscription + frontend streaming handlers | Ensures restored run state becomes visible after recovery. |
| DS-005 | Bounded Local | WebSocket session command handling | Bound subscription to current/restored runtime subject | Stream handler session binding | Prevents stale sessions from staying attached to a dead runtime object. |

## Primary Execution Spine(s)

- DS-001: `AgentUserInputTextArea -> activeContextStore.send -> agentTeamRunStore.sendMessageToFocusedMember -> TeamStreamingService/WebSocket -> AgentTeamStreamHandler -> TeamRunService.resolveTeamRun -> AgentTeamRunManager.restoreTeamRun -> TeamRun.postMessage(target member)`
- DS-002: `AgentUserInputTextArea -> activeContextStore.send -> agentRunStore.sendUserInputAndSubscribe -> AgentStreamingService/WebSocket -> AgentStreamHandler -> AgentRunService.resolveAgentRun -> AgentRunManager.restoreAgentRun -> AgentRun.postUserMessage`
- DS-003: `Team terminate UI -> agentTeamRunStore.terminateTeamRun -> GraphQL terminateAgentTeamRun -> TeamRunService.terminateTeamRun -> runHistoryStore.markTeamAsInactive/refreshTreeQuietly`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A team-member follow-up message opens or reuses the team WebSocket. The stream handler resolves the team run through `TeamRunService`; if only persisted metadata exists, the service restores the runtime. The handler binds the session to the restored `TeamRun` and posts the user message to the selected member. | Frontend focused member, team stream session, `TeamRunService`, `TeamRun`, target member | `TeamRunService` for materialization; `AgentTeamStreamHandler` for session/transport | Context attachment partitioning/finalization, status snapshots, metadata refresh debounce. |
| DS-002 | A single-agent follow-up message opens or reuses the agent WebSocket. The stream handler resolves through `AgentRunService`; if inactive but persisted, the service restores. The handler binds the session and posts the user message. | Frontend active agent, agent stream session, `AgentRunService`, `AgentRun` | `AgentRunService` for materialization; `AgentStreamHandler` for session/transport | Context attachment partitioning, event mapping, live message broadcaster. |
| DS-003 | Team termination should leave frontend state consistent with backend termination. After the backend confirms termination, the store marks the team inactive in run history and refreshes quietly. | Team terminate action, backend terminate mutation, run-history read model | `agentTeamRunStore` | Local context status updates and stream disconnect. |
| DS-004 | Restored runtime events flow through the same subscription and frontend handlers as active-run events, updating statuses/conversation instead of showing stale offline state. | Runtime event source, stream handler subscription, frontend event handlers | Stream handlers and frontend streaming services | Event mapping and status normalization. |
| DS-005 | A WebSocket session must bind to the current runtime subject, and if a user-message command finds the subject inactive, it may restore and rebind before posting. | Session manager, subscription maps, runtime subject | Stream handler | Unsubscriber cleanup and broadcaster registration. |

## Spine Actors / Main-Line Nodes

- `activeContextStore`: user action facade choosing agent vs team send/stop.
- `agentTeamRunStore` / `agentRunStore`: frontend lifecycle/send orchestration.
- `TeamStreamingService` / `AgentStreamingService`: browser WebSocket facades.
- `AgentTeamStreamHandler` / `AgentStreamHandler`: backend WebSocket session and command owners.
- `TeamRunService` / `AgentRunService`: authoritative runtime materialization and restore owners.
- `AgentTeamRunManager` / `AgentRunManager`: active runtime registry and backend factory delegate.
- `TeamRun` / `AgentRun`: domain runtime subjects receiving user messages.

## Ownership Map

- `TeamRunService` owns team run create/restore/resolve/terminate and history updates associated with runtime materialization.
- `AgentRunService` owns individual agent run create/restore/resolve/terminate and history updates associated with runtime materialization.
- `AgentTeamStreamHandler` owns WebSocket session lifecycle, team event subscription/rebinding, client command parsing, and transport error emission. It must not own metadata restore details.
- `AgentStreamHandler` owns the equivalent single-agent stream/session concerns. It must not own metadata restore details.
- `agentTeamRunStore` owns frontend team lifecycle state and send orchestration; it may request restore and update frontend read models, but must not synthesize backend runtime existence.
- `runHistoryStore` owns frontend run-history read model active/inactive flags.

If a public facade or entry wrapper exists, `TeamStreamingService` and `AgentStreamingService` are thin browser transport facades. They are not runtime materialization owners.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamStreamingService.connect/sendMessage` | `AgentTeamStreamHandler` + `TeamRunService` | Browser transport wrapper for team streams | Backend restore policy or fake team active state. |
| `AgentStreamingService.connect/sendMessage` | `AgentStreamHandler` + `AgentRunService` | Browser transport wrapper for agent streams | Backend restore policy or fake agent active state. |
| GraphQL `restoreAgentTeamRun` / `restoreAgentRun` mutations | `TeamRunService` / `AgentRunService` | Explicit frontend restore request when resume config is known inactive | Replacement for backend stream-side recovery. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Active-only `getTeamRun(...)` lookup as the team stream connect gate | It wrongly treats recoverable stopped runs as missing | `TeamRunService.resolveTeamRun(...)` from `agent-team-stream-handler.ts` | In This Change | Preserve not-found only when resolve returns null. |
| Active-only `getAgentRun(...)` lookup as the agent stream connect gate | Same stale-runtime failure can affect single agents | `AgentRunService.resolveAgentRun(...)` from `agent-stream-handler.ts` | In This Change | Preserve not-found only when resolve returns null. |
| Active-only user-message resolution after stream session loses runtime subject | It can drop follow-up sends when the run was inactive but recoverable | Command-specific recoverable send resolution and session rebind | In This Change | Only for `SEND_MESSAGE`, not stop/tool commands. |
| Frontend team termination with no run-history inactive update | Leaves stale active state and can skip explicit restore | `runHistoryStore.markTeamAsInactive(...)` + quiet refresh | In This Change | Mirror single-agent `terminateRun(...)` behavior. |

## Return Or Event Spine(s) (If Applicable)

- DS-004: `Restored TeamRun/AgentRun -> subscribeToEvents callback -> stream event mapper -> WebSocket ServerMessage -> TeamStreamingService/AgentStreamingService -> frontend handlers -> conversation/status state`

This return spine must use the same event subscription maps already in the stream handlers. Recovery should rebind the session to the restored runtime subject before user-message posting so subsequent runtime events are routed to the existing UI conversation.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentTeamStreamHandler`
  - `Client message -> parse -> command classification -> resolve active/restored subject when allowed -> bind/rebind session -> execute command -> record activity`
  - Matters because restore must be command-aware: user message may restore; stop/tool approval must stay active-only.
- Parent owner: `AgentStreamHandler`
  - Same local command loop shape for individual agent runs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context file/image attachment partitioning | DS-001, DS-002 | Frontend send stores | Convert finalized UI attachments into stream payload arrays | Message payload transport concern | Would clutter backend runtime recovery with UI attachment detail. |
| Metadata/history activity recording | DS-001, DS-002 | `TeamRunService` / `AgentRunService` | Record restored/activity state after restore and successful post | Keeps history consistent | If stream handler writes restore metadata directly, it bypasses lifecycle owner. |
| Stream event mapping | DS-004 | Stream handlers | Convert runtime events to websocket messages | Transport event contract | If restore service maps transport events, lifecycle ownership blurs. |
| Reconnect/non-retryable close behavior | DS-001, DS-002 | Frontend `WebSocketClient` | Prevent retry loops for true not-found close codes | Transport resilience | Runtime restore policy should not live in browser reconnect code. |
| Frontend history refresh | DS-003 | `runHistoryStore` | Keep tree/resume flags current | UI read model consistency | Backend stream handler should not manage frontend cache. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Restore stopped persisted team run | `agent-team-execution` / `TeamRunService.resolveTeamRun` | Reuse | Already owns metadata restore and history update | N/A |
| Restore stopped persisted single-agent run | `agent-execution` / `AgentRunService.resolveAgentRun` | Reuse | Already owns metadata restore and history update | N/A |
| Stream session binding | `services/agent-streaming` | Extend | Existing stream handlers already own session/subscription maps | N/A |
| Frontend team active-state update | `runHistoryStore` + `agentTeamRunStore` | Extend | Existing `markTeamAsInactive` already exists and agent store has parity model | N/A |
| Validation | Existing Vitest unit suites | Extend | Existing tests cover stream handlers and frontend stores | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend agent/team execution | Runtime create/restore/resolve/terminate and history lifecycle writes | DS-001, DS-002 | `TeamRunService`, `AgentRunService` | Reuse | No new restore owner. |
| Backend agent streaming | WebSocket session, stream subscription, client command dispatch | DS-001, DS-002, DS-004, DS-005 | `AgentTeamStreamHandler`, `AgentStreamHandler` | Extend | Use service resolve boundaries. |
| Frontend workspace/team run store | UI send/terminate orchestration | DS-001, DS-003 | `agentTeamRunStore`, `agentRunStore` | Extend | Add team inactive parity. |
| Frontend run history | Active/inactive UI read model and quiet refresh | DS-003 | `runHistoryStore` | Reuse | `markTeamAsInactive` already exists. |
| Tests | Regression coverage | All | Existing Vitest suites | Extend | Add focused unit tests; API/E2E later can add realistic coverage. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Backend agent streaming | Team WebSocket stream handler | Resolve/restored team run on connect and user-message send; bind/rebind session | Existing team stream/session owner | Reuses `TeamRunService.resolveTeamRun`. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Backend agent streaming | Agent WebSocket stream handler | Resolve/restored agent run on connect and user-message send; bind/rebind session | Existing agent stream/session owner | Reuses `AgentRunService.resolveAgentRun`. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team lifecycle | Team run store | Mark team inactive/refresh history after successful termination | Existing frontend team lifecycle owner | Reuses `runHistoryStore.markTeamAsInactive`. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Tests | Team stream unit tests | Regression for recover-on-connect/send and true not-found | Existing test suite | N/A |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts` | Tests | Agent stream unit tests | Regression for recover-on-connect and true not-found | Existing test suite | N/A |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Tests | Frontend team store test | Termination marks inactive/refreshes | Existing test suite | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Recoverable stream run resolution for team vs agent | None for this change | N/A | Team and agent subjects have different service types and identity names; duplication is small and clearer than a generic mixed-subject resolver | N/A | N/A | A generic resolver that hides whether the subject is a team run or agent run. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| No new shared structure | Yes | Yes | Low | Keep explicit team/agent service calls. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Backend agent streaming | `AgentTeamStreamHandler` | Team WebSocket connect/session/user-message command resolution through `TeamRunService.resolveTeamRun`; active-only stop/tool commands | Existing team stream boundary | Existing `TeamRunService` and `TeamRun` types. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Backend agent streaming | `AgentStreamHandler` | Agent WebSocket connect/session/user-message command resolution through `AgentRunService.resolveAgentRun`; active-only stop/tool commands | Existing agent stream boundary | Existing `AgentRunService` and `AgentRun` types. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team lifecycle | `agentTeamRunStore` | Successful team termination updates run-history inactive state and refreshes | Existing frontend team lifecycle boundary | Existing `runHistoryStore` methods. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Tests | Team stream regression suite | Resolve-on-connect/send and missing-team negative tests | Existing suite | N/A |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts` | Tests | Agent stream regression suite | Resolve-on-connect and missing-agent negative tests | Existing suite | N/A |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Tests | Frontend team store regression suite | Termination inactive-state parity | Existing suite | N/A |

## Ownership Boundaries

- `TeamRunService` and `AgentRunService` are authoritative public boundaries for runtime materialization. The stream handlers must call these boundaries when a recoverable conversation path needs a runtime subject.
- `AgentTeamRunManager` and `AgentRunManager` remain internal active-registry/factory mechanisms behind the service boundary. Stream handlers must not depend on manager internals.
- Stream handlers are authoritative for WebSocket sessions, not persisted metadata restore. They may decide *when* a command permits recovery, but the services decide *how* recovery happens.
- Frontend stores may update UI state and call restore/terminate mutations, but backend services remain the source of truth for whether a run can be materialized.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunService.resolveTeamRun` | `AgentTeamRunManager.getTeamRun/restoreTeamRun`, metadata mapper, history services | `AgentTeamStreamHandler` connect/send recovery, application/external runtime callers | Stream handler treating `getTeamRun` null as not-found for recoverable run | Extend `TeamRunService`, not stream handler metadata reads. |
| `AgentRunService.resolveAgentRun` | `AgentRunManager.getActiveRun/restoreAgentRun`, metadata store, history service | `AgentStreamHandler` connect/send recovery | Stream handler treating `getAgentRun` null as not-found for recoverable run | Extend `AgentRunService`, not stream handler metadata reads. |
| `runHistoryStore.markTeamAsInactive` | Frontend team read-model mutation details | `agentTeamRunStore.terminateTeamRun` | Team lifecycle store mutating tree/resume maps manually | Add/adjust runHistoryStore API. |

## Dependency Rules

Allowed:

- `AgentTeamStreamHandler -> TeamRunService.resolveTeamRun/getTeamRun/recordRunActivity`.
- `AgentStreamHandler -> AgentRunService.resolveAgentRun/getAgentRun/recordRunActivity`.
- `agentTeamRunStore -> runHistoryStore.markTeamAsInactive/refreshTreeQuietly` after backend termination.
- Tests may mock the service boundaries.

Forbidden:

- Stream handlers reading team/agent metadata stores directly to restore.
- Stream handlers depending on both a service recovery boundary and manager/metadata internals for the same recovery decision.
- Frontend creating fake active runtime state as a substitute for backend restore success.
- Stop/tool commands restoring inactive runs solely because a stream session exists.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamRunService.resolveTeamRun(teamRunId)` | Team run | Return active or restored team run, or null | `teamRunId: string` | Use for team stream connect and user-message recovery. |
| `AgentRunService.resolveAgentRun(runId)` | Agent run | Return active or restored agent run, or null | `runId: string` | Use for agent stream connect and user-message recovery. |
| `TeamRunService.getTeamRun(teamRunId)` | Team run active registry query | Return active team run only | `teamRunId: string` | Still valid for active-only stop/tool command checks. |
| `AgentRunService.getAgentRun(runId)` | Agent run active registry query | Return active agent run only | `runId: string` | Still valid for active-only stop/tool command checks. |
| `AgentTeamStreamHandler.connect(connection, teamRunId)` | Team stream session | Resolve/bind session and send connected/status or not-found | `teamRunId: string` | Async restore allowed. |
| `AgentStreamHandler.connect(connection, runId)` | Agent stream session | Resolve/bind session and send connected/status or not-found | `runId: string` | Async restore allowed. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveTeamRun(teamRunId)` | Yes | Yes | Low | Use only for team run ids. |
| `resolveAgentRun(runId)` | Yes | Yes | Low | Use only for standalone agent run ids. |
| `connect(connection, teamRunId)` | Yes | Yes | Low | Preserve subject-specific team handler. |
| `connect(connection, runId)` | Yes | Yes | Low | Preserve subject-specific agent handler. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team recovery service method | `resolveTeamRun` | Yes | Low | Use as-is. |
| Agent recovery service method | `resolveAgentRun` | Yes | Low | Use as-is. |
| Active-only lookup | `getTeamRun` / `getAgentRun` | Yes | Medium if used for recovery | Restrict to active-only commands. |
| Team stream handler | `AgentTeamStreamHandler` | Yes | Low | Use as-is. |
| Agent stream handler | `AgentStreamHandler` | Yes | Low | Use as-is. |

## Applied Patterns (If Any)

- Facade/Boundary: Stream handlers remain transport/session boundaries; service classes remain lifecycle/recovery boundaries.
- Registry: Existing managers keep active runtime registries behind service boundaries.
- Command dispatch: Existing stream `handleMessage` command dispatch remains, with command-specific recovery policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | File | Team stream handler | Restore-capable connect/send resolution and session rebinding | Existing team WebSocket owner | Metadata restore implementation details. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | File | Agent stream handler | Restore-capable connect/send resolution and session rebinding | Existing agent WebSocket owner | Metadata restore implementation details. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File | Frontend team run store | Team terminate state parity | Existing frontend team lifecycle store | Manual history tree mutation outside `runHistoryStore` APIs. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | File | Team stream tests | Backend team stream regression coverage | Existing unit test location | Browser/UI assertions. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts` | File | Agent stream tests | Backend agent stream regression coverage | Existing unit test location | Team-specific assertions. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | File | Frontend store tests | Team terminate state parity coverage | Existing frontend store test location | Backend runtime restore mocking beyond store boundary. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/services/agent-streaming` | Transport plus stream-session control | Yes | Low | Stream handlers may call lifecycle service boundaries but do not own persistence. |
| `src/agent-team-execution/services` | Main-line domain-control | Yes | Low | Existing team lifecycle/recovery owner. |
| `src/agent-execution/services` | Main-line domain-control | Yes | Low | Existing agent lifecycle/recovery owner. |
| `autobyteus-web/stores` | Frontend state orchestration | Yes | Low | Team store already orchestrates frontend lifecycle actions. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Team stream connect | `connect -> await teamRunService.resolveTeamRun(id) -> bind session -> CONNECTED` | `connect -> teamRunService.getTeamRun(id) -> TEAM_NOT_FOUND` | Shows the exact reported bug replacement. |
| User-message recovery | `SEND_MESSAGE -> resolveTeamRun/resolveAgentRun -> rebind -> post message` | `SEND_MESSAGE -> active map lookup -> log and drop` | Follow-up chat must recover, not disappear. |
| Stop/tool active-only commands | `STOP_GENERATION -> getTeamRun/getAgentRun -> interrupt if active` | `STOP_GENERATION -> restore -> interrupt` | Avoids restoring a stopped run just to stop it. |
| Frontend team termination | `terminate success -> markTeamAsInactive -> refreshTreeQuietly` | `terminate -> local status only, stale resume config remains active` | Keeps UI state aligned with backend inactive state. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep active-only stream connect and add frontend retry after `TEAM_NOT_FOUND` | Could avoid backend change | Rejected | Backend stream connect/send must use authoritative restore service directly. |
| Add frontend fake active team context after stop | Might hide error visually | Rejected | Restore must occur in backend `TeamRunService`; frontend only observes/requests. |
| Generic mixed agent/team resolver helper | Could reduce duplicated handler code | Rejected | Team and agent identities/services differ; explicit subject-specific calls are clearer. |
| Restore for every command type | Simpler handler implementation | Rejected | Stop/tool commands must remain active-only to avoid surprising runtime materialization. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Browser UI layer: `AgentUserInputTextArea`, active context facade.
- Frontend orchestration layer: `agentRunStore`, `agentTeamRunStore`, `runHistoryStore`.
- Browser transport layer: `AgentStreamingService`, `TeamStreamingService`, `WebSocketClient`.
- Backend transport/session layer: `AgentStreamHandler`, `AgentTeamStreamHandler`.
- Backend lifecycle/recovery layer: `AgentRunService`, `TeamRunService`.
- Runtime registry/factory layer: `AgentRunManager`, `AgentTeamRunManager` and runtime backend factories.

The stream layer must call the lifecycle/recovery layer, not the lifecycle layer's internal registry mechanics.

## Migration / Refactor Sequence

1. Backend team stream handler:
   - Add async restore-capable run resolution for `connect(...)` using `TeamRunService.resolveTeamRun(...)`.
   - Update session bind/rebind path so an already-resolved `TeamRun` can be subscribed without a second active-only lookup.
   - Update `SEND_MESSAGE` path to recover/rebind before `postMessage(...)` when the active subject is absent.
   - Keep stop-generation and tool approval active-only.
2. Backend single-agent stream handler:
   - Add equivalent async restore-capable run resolution using `AgentRunService.resolveAgentRun(...)` for connect and `SEND_MESSAGE`.
   - Keep stop-generation and tool approval active-only.
3. Frontend team store:
   - After successful non-temporary `terminateAgentTeamRun`, call `runHistoryStore.markTeamAsInactive(teamRunId)` and `void runHistoryStore.refreshTreeQuietly()`.
   - If implementation already reads mutation response, treat `success: false` as a failed termination instead of marking inactive.
4. Tests:
   - Update stream-handler service mocks to include `resolveTeamRun` / `resolveAgentRun`.
   - Add team/agent recover-on-connect tests and true missing-run negative tests.
   - Add recover-on-send/rebind tests where practical.
   - Add frontend team termination inactive-state parity test.
5. Run targeted verification before handoff:
   - Backend: `pnpm -C autobyteus-server-ts test -- tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts` or repository-supported equivalent.
   - Frontend: `pnpm -C autobyteus-web test:nuxt -- stores/__tests__/agentTeamRunStore.spec.ts` or repository-supported equivalent.

## Key Tradeoffs

- Backend stream-side recovery is more robust than relying only on frontend cache, because the backend is the only authoritative source of active-vs-restorable runtime state.
- Keeping stop/tool commands active-only avoids surprising side effects but means a tool approval against a stopped run still no-ops/logs; that is intentional because only user-message continuation should resume.
- Explicit team/agent handler changes duplicate a small amount of logic but preserve clear identity boundaries and avoid a generic mixed-subject abstraction.

## Risks

- Restore can be expensive or fail for runtime-specific reasons; stream handlers must preserve clear not-found behavior when service resolution returns null.
- Existing tests may assume `getTeamRun`/`getAgentRun` calls on connect; update expectations to the service recovery boundary.
- If a runtime is in the middle of shutdown, a follow-up send could race with termination. The service boundary should remain the place to handle such race behavior; do not special-case in frontend.

## Guidance For Implementation

- Prefer small, direct changes inside existing files. Do not create new helper modules unless a real repeated owned structure appears during implementation.
- Preserve existing `CONNECTED`, status snapshot, and event message shapes.
- Preserve close code `4004` and `TEAM_NOT_FOUND`/`AGENT_NOT_FOUND` for unresolved missing runs.
- For team `SEND_MESSAGE`, resolve/rebind before `postMessage(...)` and then keep existing `recordRunActivity(...)` behavior after accepted posts.
- For single-agent `SEND_MESSAGE`, resolve/rebind before `postUserMessage(...)` and then keep existing `recordRunActivity(...)` behavior after accepted posts.
- Do not move restore logic into frontend streaming services or WebSocket transport.
