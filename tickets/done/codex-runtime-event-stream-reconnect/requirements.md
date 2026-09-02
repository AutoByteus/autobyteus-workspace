# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — approved by the user on 2026-09-02.

## Goal / Problem Statement

Correct the Codex App Server integration bug in which AutoByteus treats a retryable Codex provider-stream error as the terminal failure of the active turn. In the reported run, Codex recovered, executed the request, produced a final answer, and completed, while AutoByteus cleared the active turn, rejected the continuing Codex events, and left the conversation showing only retry error cards. The product must preserve a retrying turn and continue rendering its authoritative output, while retaining genuinely terminal error behavior.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | A native Codex `error` notification for an active turn is always treated as terminal, even when Codex declares `willRetry: true`. AutoByteus marks the run errored and clears the active turn. | A Codex error with `willRetry: true` is a turn-scoped diagnostic. The same turn remains running and eligible to emit subsequent reasoning, tool, text, usage, and completion events. | Retry count, backoff, fallback transport, and provider execution remain owned by Codex. AutoByteus does not resubmit or duplicate the turn. | `REQ-001`, `REQ-002`, `REQ-003`; `AC-001`, `AC-002`, `AC-003` |
| `BEH-002` | Events emitted by Codex after the false terminal classification are rejected as belonging to no active turn, so the conversation and application replay trace omit real work and the final answer. | After one or more retry diagnostics, subsequent events for the same turn continue through the normal live stream and replay trace; the user sees the later tool/activity updates, assistant content, and final idle/completed state. | Each tool execution keeps its authoritative success, failure, or denial result. A retry diagnostic may remain visible as diagnostic history, but it must not replace or suppress the continuing response. | `REQ-002`, `REQ-003`, `REQ-005`; `AC-001`, `AC-002`, `AC-003`, `AC-006` |
| `BEH-003` | A non-retryable Codex turn error is classified as terminal and clears the matching active turn. An error for an older turn does not clear a newer active turn. | This terminal behavior remains unchanged when Codex declares `willRetry: false`; only the matching turn may be terminalized. | Runtime-global failures, explicit failed thread status, normal successful completion, and the existing generic diagnostic/terminal lifecycle contract remain unchanged. | `REQ-004`, `REQ-005`; `AC-004`, `AC-005`, `AC-006` |

## Investigation Findings

- The screenshot run is `codex_45ce1b9e80ea42db869dc86615d51fc3`, backed by Codex thread `01a038c4-03c6-7a83-80cb-10a99331ae18` and model `gpt-5.6-sol`.
- On 2026-09-02, turn `01a061ea-d7b6-7123-99c5-a19070bfa97e` received five response-WebSocket retry diagnostics between 11:39:40 and 11:40:00 UTC. Codex then continued over HTTP, executed two commands successfully, emitted a final answer at 11:40:42, and completed the turn.
- AutoByteus's replay trace contains only that turn's user input. The server rejected later Codex item/message events with `CODEX_SEGMENT_TURN_INACTIVE` after the adapter had cleared the active turn.
- The installed Codex CLI `0.152.1` protocol defines native `ErrorNotification` with required `willRetry`, `threadId`, and `turnId` fields. AutoByteus currently ignores `willRetry` and forces all turn-associated Codex error notifications to terminal.
- Common AgentRun lifecycle and frontend handlers already preserve a turn for canonical `error_effect: "diagnostic"`; no generic browser/server WebSocket recovery defect was found.
- The failed `run_bash` card visible among older Activity records is not the cause of this divergence. The reported turn's own successful execution is proven independently by the Codex rollout.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md` | Investigation evidence: exact run identity, retry/completion timeline, upstream protocol contract, and localized fault path | `REQ-001`, `REQ-002`, `REQ-003` | `AC-001`, `AC-002`, `AC-003` | `Complete`; approval `N/A` | Supports the factual basis; defines no intended behavior beyond this requirements doc. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `No`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: The Codex notification handler is already the correct owner for translating native notification terminality into AutoByteus lifecycle semantics, but its `error` branch discards the authoritative `willRetry` signal. Downstream AgentRun and frontend boundaries already implement the required diagnostic behavior.
- Requirement or scope impact: Keep the change within Codex notification classification and Codex event-boundary cleanup, with focused coverage. No new cross-runtime abstraction or frontend recovery mechanism is authorized.

## Recommendations

- Treat the upstream `willRetry` boolean as the authoritative terminality signal for native Codex turn error notifications.
- Preserve the active turn and in-flight reasoning/tool correlation for retryable diagnostics; reserve turn failure and correlation cleanup for non-retryable errors.
- Exercise the full adapter sequence—retry diagnostic followed by continuing item/message events and completion—rather than testing error-payload mapping alone.
- Retain existing generic transport, UI, and persistence contracts; they already support the required diagnostic event shape.

## Scope Classification (`Small`/`Medium`/`Large`)

`Small`: investigation crossed runtime, server, and frontend evidence, but the proven defect and required production change are localized to the Codex adapter's native error classification and terminal cleanup behavior, plus focused tests.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: An active Codex App Server turn emits one or more native errors with `willRetry: true`, then continues with reasoning, tools, assistant content, and successful completion.
- `UC-002`: An active Codex App Server turn emits a native error with `willRetry: false` and terminates as an error.
- `UC-003`: A Codex error for an older/retired turn arrives while a newer turn is active.
- `UC-004`: A normally successful Codex turn and its individual successful/failed tool events traverse the existing pipeline without a provider retry diagnostic.

### Out of Scope

- Changing Codex/OpenAI provider reliability, retry limits, retry backoff, transport fallback, authentication, or model behavior.
- Changing, hiding, deduplicating, or restyling the existing retry diagnostic cards; this ticket changes their lifecycle effect, not their presentation.
- Redesigning AutoByteus browser-to-server WebSocket reconnect/replay behavior; evidence shows that connection was attached and the visible retry text came from Codex's provider stream.
- Changing tool execution semantics or converting a real tool failure into success.
- Backfilling assistant/tool events that were already discarded from pre-fix application replay traces, including the reported turn. Existing retained data must remain readable, but historical repair is a separate requirement.
- Generalizing this correction to Claude, AutoByteus, or other runtime adapters without evidence of the same native contract defect.

### Preserved Behavior Boundary

- Preserve the successful and terminal paths described by `BEH-003`, `REQ-004`, `REQ-005`, and `AC-004` through `AC-006`.
- Preserve single-submission identity: observer or provider retry behavior must never start a second runtime turn for the same accepted user command.
- Preserve per-tool outcome fidelity and established common AgentRun/frontend diagnostic behavior.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- `REQ-001`: For a native Codex turn `error` notification, AutoByteus must use the notification's authoritative `willRetry` boolean to classify the event: `true` is turn-scoped diagnostic; `false` is turn-scoped terminal.
- `REQ-002`: A retryable diagnostic must preserve the exact active turn identity and running lifecycle. It must not mark the turn failed, clear the active turn, close/terminalize in-flight reasoning, or discard in-flight tool correlation merely because the diagnostic occurred.
- `REQ-003`: A retryable diagnostic and all later valid events for that same turn must traverse the existing AgentRun stream and application-owned replay trace. The client may render the diagnostic, but must remain able to render subsequent activity/content and the authoritative final state.
- `REQ-004`: A non-retryable native Codex turn error must retain the current terminal behavior for the matching active turn: mark it failed, clear turn-scoped pending correlation, publish a terminal error, and expose the run's error state. It must not clear a different active turn.
- `REQ-005`: Normal turn completion, explicit failed thread status, runtime-global client/process failure, command identity/deduplication, token usage, per-tool outcome, and non-Codex runtime behavior must remain unchanged.
- `REQ-006`: The correction must use the existing Codex notification/event conversion boundary and common canonical diagnostic contract; it must not introduce a parallel reconnect or projection path.

## Acceptance Criteria

- `AC-001`: Given an active Codex turn, when the adapter receives a native error for that turn with `willRetry: true`, the emitted canonical error has the exact turn id, `error_scope: "turn"`, and `error_effect: "diagnostic"`; the run remains running and the active turn id remains unchanged.
- `AC-002`: Given the sequence `turn started -> retryable error -> later reasoning/tool/assistant events -> turn completed` for one turn, the later events are admitted and projected in order, no later same-turn segment is rejected because the turn became inactive, and the final status becomes idle/completed rather than error.
- `AC-003`: A retryable diagnostic does not force-close an open reasoning block or erase ordered-tool/pending-tool correlation. A tool started before or after the diagnostic can still complete with its correct invocation, name, arguments, result, and status.
- `AC-004`: Given a native error with `willRetry: false` for the active turn, the adapter emits a turn-scoped terminal error, clears that active turn, performs existing terminal correlation cleanup, and exposes error status through the existing stream/UI lifecycle.
- `AC-005`: Given a non-retryable error or late completion for turn A while turn B is active, turn B remains active and running; the old boundary cannot terminalize or complete B.
- `AC-006`: Existing normal-success behavior, explicit failed-thread-status behavior, runtime-global failure behavior, token usage, and individual tool success/failure presentation remain covered and unchanged. No frontend WebSocket recovery code or non-Codex adapter behavior changes are required for this fix.
- `AC-007`: Existing stored run traces and view projections remain readable without schema migration or rewrite. New retry diagnostics and later same-turn events use the existing trace/event schemas. The implementation does not claim to reconstruct events already missing from pre-fix application traces.

## Constraints / Dependencies

- The installed/reported production contract is Codex CLI `0.152.1` v2 `ErrorNotification`, where `willRetry`, `threadId`, and `turnId` are required.
- AutoByteus event admission requires an active exact turn identity for governed Codex item/message events; retryable errors therefore cannot clear that identity.
- Existing common AgentRun lifecycle, WebSocket mapping, frontend projection, and replay persistence already distinguish `diagnostic` from `terminal` errors and should be reused.
- Repository implementation and validation must occur in the dedicated task worktree on branch `codex/codex-runtime-event-stream-reconnect`.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Application-owned run event traces under `~/.autobyteus/server-data/memory/agents/<run-id>/raw_traces*.jsonl` and the normal run-view projection derived from them.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing traces as-is. Persist future diagnostic and continuing events through the existing schema and writer.
- Unacceptable data loss or corruption: Deleting/reordering existing history, duplicating a user turn, or dropping post-diagnostic events from a newly processed turn.
- Relevant availability, maintenance-window, or rollout constraints: No storage migration or maintenance window. The fix is prospective; previously discarded events are not automatically recoverable from the application replay trace.
- Related requirement and acceptance-criteria IDs: `REQ-002`, `REQ-003`, `REQ-005`; `AC-002`, `AC-006`, `AC-007`.

## Assumptions

- The native Codex `willRetry` boolean remains the supported terminality contract for the currently integrated v2 app-server protocol.
- The existing canonical diagnostic payload contract remains stable during implementation.
- No evidence indicates that the browser/server WebSocket or the visible failed tool card caused the reported turn divergence.

## Risks / Open Questions

- Retry diagnostics may still look visually severe because presentation redesign is out of scope; they will, however, stop falsely terminalizing the run and suppressing the response.
- A future incompatible Codex protocol change could require regenerated/updated adapter contracts; current scope targets the installed supported `0.152.1` contract.
- The reported turn's final content exists in the Codex rollout but not in AutoByteus's normal application trace; this ticket intentionally does not add a one-off or general historical backfill mechanism.

## Requirement-To-Use-Case Coverage

- `REQ-001`: `UC-001`, `UC-002`
- `REQ-002`: `UC-001`
- `REQ-003`: `UC-001`
- `REQ-004`: `UC-002`, `UC-003`
- `REQ-005`: `UC-003`, `UC-004`
- `REQ-006`: `UC-001`, `UC-002`, `UC-004`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`: Native retry classification and preserved active lifecycle.
- `AC-002`: End-to-end adapter continuation after transient provider retries.
- `AC-003`: Reasoning/tool correlation remains intact across a diagnostic.
- `AC-004`: Genuine terminal error path remains terminal.
- `AC-005`: Late old-turn boundaries cannot corrupt a newer turn.
- `AC-006`: Regression boundary for existing runtime/event behavior.
- `AC-007`: Existing and newly written replay data remain compatible without migration or historical repair claims.

## Approval Status

Approved by the user on 2026-09-02. The evidence supplement remains approval `N/A` because it records evidence rather than intended behavior.
