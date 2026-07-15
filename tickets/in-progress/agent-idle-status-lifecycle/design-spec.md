# Agent Idle Status Lifecycle Design Spec

## Current-State Read

The supported runtime adapters already translate provider-specific lifecycle into the canonical agent event contract:

- Codex: `turn/started` / `turn/completed`, with `CodexThread.activeTurnId` and explicit `AGENT_STATUS` events.
- Claude: session-owned `TURN_STARTED` / `TURN_COMPLETED` / `TURN_INTERRUPTED`, with an active turn ID and explicit `AGENT_STATUS` events.
- AutoByteus: native stream turn boundaries and status events; the adapter also repairs stale provider status while a turn is active.

The default event pipeline then invokes `LifecycleStatusEventProcessor`. That shared processor was originally a bounded stale-error recovery owner, but commit `902274e5a` broadened its rule so ordinary segment, tool, todo, inter-agent, and system-task activity can independently derive `running`. It remembers the last status by run ID but does not remember the current/retired turn identity. A delayed tool result from a completed Codex turn therefore appends a new `AGENT_STATUS running` after the legitimate completion/idle status.

`AgentRun.observeBackendEvent()` compounds the ownership problem by treating `statusHint` on non-status events as another canonical status source. `AgentRun.statusOverride` then dominates the runtime backend snapshot. Mixed team handles, fresh team-member snapshots, and WebSocket status messages propagate that value. Frontend status code faithfully applies and renders that stale backend value, so it does not create the reported `idle -> running` transition. However, `AgentStreamingService` also invokes a legacy uncorrelated `error -> running` repair for ordinary activity; that second lifecycle owner conflicts with exact-turn backend recovery and must be removed as part of the same ownership correction.

The production evidence, exact affected run IDs/timestamps, deterministic current-source probe, and full current spine are recorded in [`investigation-notes.md`](./investigation-notes.md) and [`production-trace-evidence.md`](./production-trace-evidence.md). The approved behavioral authority is [`requirements.md`](./requirements.md).

## Intended Change

Keep provider/runtime lifecycle as the primary authority while making the shared fallback deterministic and turn-correlated:

1. Serialize event-pipeline processing and final listener dispatch per run, while retaining parallelism across different runs.
2. Replace the append-only lifecycle-status processor with a lifecycle-status reconciliation transformer. It owns a per-runtime-context turn state machine and returns the accepted canonical output sequence, so rejected source statuses never reach `AgentRun` or any listener.
3. Derive `running` only from an accepted `TURN_STARTED` boundary, an accepted canonical active status, or bounded recovery activity correlated to the currently open turn after `error`.
4. Derive `idle` only from a matching `TURN_COMPLETED`/`TURN_INTERRUPTED` boundary when an explicit idle status is absent.
5. Preserve ordinary delayed activity events unchanged but never use them to open/reopen a turn.
6. Make `AGENT_STATUS` the only backend-event shape that updates `AgentRun.statusOverride`; remove parallel inference from non-status `statusHint` values.
7. Give each accepted command an explicit association state, buffer only lifecycle/turn-terminal evidence while identity is pending, ignore diagnostics for settlement, and settle only after association is armed or explicit runtime-global failure arrives.
8. Tighten each runtime's active-turn mutation so a mismatched older completion cannot clear a newer active turn.
9. Classify errors at their native origin by both correlation (`turn`/`runtime`) and effect (`diagnostic`/`terminal`), attach a turn ID before native state is cleared, and grant lifecycle/command authority only to matching turn-terminal or runtime-global evidence.
10. Remove the frontend's activity-triggered `error -> running` repair so ordinary streamed activity remains presentation content and only canonical backend `AGENT_STATUS` or existing explicit snapshot/command-overlay inputs can change frontend lifecycle state.

No frontend presentation behavior, public status vocabulary, persistence schema, or status colors change. The frontend source does change by deleting legacy lifecycle inference; no frontend turn state, timer, or replacement heuristic is introduced. Canonical `ERROR` payloads gain additive `error_scope`, `error_effect`, and, for turn-correlated errors, `turn_id` fields so correlation and terminal authority are independent; existing code/message fields and delayed diagnostic delivery remain unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | R-001, R-002, R-008; AC-001, AC-008 | Accepted startup plus canonical runtime turn start | Runtime adapters already emit boundaries/status; broad shared activity derivation competes with them | Preserve backend authority; only a start boundary or explicit active status establishes running | Provider adapter -> per-run queue -> lifecycle transformer -> canonical status (DS-001, DS-005) |
| BEH-002 | System | R-003–R-005, R-011; AC-001–AC-003, AC-011, AC-012 | Matching current-turn completion/interruption | Reported late same-turn tool results resurrect running after completion | Matching terminal closes current turn; old/duplicate/late activity is lifecycle-idempotent | Runtime boundary -> state machine -> idle; later activity delivered without status transition (DS-001, DS-005) |
| BEH-003 | Operational | R-005, R-007; AC-002, AC-006, AC-007, AC-010 | Live event propagation and fresh snapshot | `AgentRun.statusOverride` makes wrong derived status authoritative; frontend activity repair can also diverge live error recovery from reconnect | Only canonical status events update backend/frontend lifecycle; delayed content remains visible without changing status | AgentRun -> mixed team -> WebSocket canonical status/content split -> frontend (DS-002, DS-003) |
| BEH-004 | User/System | R-006, R-010, R-011; AC-004, AC-011 | New accepted command opens B; diagnostic work may occur; B may complete or genuinely fail | Current correlation is partly status/hint based; errors can lose B, and several AutoByteus error publishers continue normally | Diagnostics remain content-only; only matching lifecycle terminal, `TURN_TERMINAL(B)`, or explicit runtime-global failure settles B; old A never does | Publisher outcome -> effect-aware canonical error/lifecycle -> command coordinator (DS-001, DS-004, DS-005) |
| BEH-005 | Contract | R-001, R-009; AC-005 | Runtime termination/disposal | Existing direct offline status is distinct from idle | Preserve offline terminal runtime semantics and clear active lifecycle state for the runtime context | AgentRun termination -> explicit offline -> snapshots/UI (DS-006) |
| BEH-006 | User | R-007; AC-006 | Focused header/team tree consume canonical status | UI colors/labels are correct, but legacy activity dispatch can change error to running without canonical status | Preserve presentation/colors; delete activity lifecycle inference so only canonical status/snapshot/explicit overlay inputs change the displayed lifecycle | Status WebSocket/snapshot -> frontend canonical status owner -> existing visuals (DS-002, DS-003) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/production-trace-evidence.md` | Retain exact production timestamps, turn IDs, runtime/model metadata, control comparison, and source causal chain | R-002–R-008, R-011; AC-001–AC-012 | Establishes why ordinary activity cannot be a lifecycle opener and supplies the required Codex regression sequence | Complete / `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with a bounded lifecycle refactor.
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`; a secondary `Duplicated Policy Or Coordination` issue exists because the lifecycle processor, `AgentRun.statusHint` inference, and frontend activity repair can each author lifecycle state.
- Refactor needed now: `Yes`.
- Evidence: Production traces/probe establish stale-running. Round-3 source recheck shows AutoByteus ToolPhase, handled LLM response/stream/compaction, and response-processor errors continue to `TURN_COMPLETED`, while only the non-interruption `AgentTurnRunner` catch returns a failed outcome. Round-4 source recheck shows `AgentStreamingService.dispatchMessage` classifies segment/tool/todo/inter-agent/system-task/turn-start messages as live activity and calls `applyLiveRuntimeActivityProjectionRepair`, which changes any live frontend error to running without turn identity.
- Design response: Keep one shared backend lifecycle normalization/fallback owner, make it a turn-aware reconciliation transformer that filters rejected status transitions before dispatch, serialize its per-run input/output, make downstream run/command state consume accepted canonical status plus effect-aware terminal evidence, and remove the frontend activity-to-lifecycle repair so presentation consumes that canonical result without a competing recovery policy.
- Refactor rationale: A Codex-only patch leaves the shared lifecycle defect. A scope-only error contract grants terminal authority to recoverable diagnostics, so outcome classification must remain at each native publisher. Retaining the frontend repair would still let delayed A activity override a canonical error live and disagree with reconnect, so its clean-cut removal is required even though public UI presentation remains unchanged.
- Architecture rework status: AR-001 and AR-002 are resolved. Architecture round 4 identified AR-003: the backend contract is coherent, but the frontend activity repair bypasses it. The revised contract below removes that legacy inference, maps the affected frontend files/tests, and proves legitimate exact-B recovery only through canonical backend `AGENT_STATUS running`. The architecture review report remains unchanged as the gate record.
- Intentional deferrals and residual risk: Public `AgentStatusPayload` remains turn-agnostic. An identified command therefore never uses turn-agnostic `idle`/`error` status as turn-completion evidence; a genuinely anonymous command uses status-only settlement only after positive anonymous active evidence. Adding a public `turn_id` to status payloads is unnecessary for this scope. Retired turn IDs remain in memory for the lifetime of one runtime context to guarantee idempotency; the state is held through a `WeakMap` so terminated/restored contexts are collectible.

## Terminology

- **Current active turn:** A discriminated internal value: `NONE`, `IDENTIFIED(turnId)`, or `ANONYMOUS(openedBy)`. It is the sole turn permitted to affect a live run's active-to-idle lifecycle transition.
- **Retired turn:** A completed, interrupted, or superseded turn identity. Later events for it remain displayable but are lifecycle no-ops.
- **Anonymous turn:** Conservative internal state opened by an ID-less `TURN_STARTED` or an accepted explicit `running` snapshot when no identified turn is active. An anonymous terminal may close only an anonymous current turn; it cannot close an identified current turn.
- **Canonical status event:** An accepted `AgentRunEventType.AGENT_STATUS` returned by the shared reconciliation transformer. Rejected source statuses are absent from processed output. Accepted status is the only backend event allowed to update `AgentRun.statusOverride`.
- **Boundary fallback:** Shared derivation of running/idle from `TURN_STARTED`/matching terminal when the runtime batch omits an explicit status event.
- **Explicit status snapshot:** A valid public `AGENT_STATUS` value emitted by a runtime adapter. It is turn-agnostic; therefore it may reconcile anonymous/no-turn state but cannot silently close an identified active turn except `offline`, which is runtime-global.
- **Pending command identity:** The interval after `SEND_MESSAGE` handoff begins but before the accepted result and observed start evidence have established whether the command is identified or genuinely anonymous. No turn-terminal evidence may settle in this state; explicit runtime-global failure may fail the exact current command.
- **Canonical error evidence:** A valid `ERROR` event resolved as `TURN_DIAGNOSTIC(turnId)`, `TURN_TERMINAL(turnId)`, or `RUNTIME_GLOBAL`. Correlation scope never implies failure effect; unscoped/malformed errors are non-canonical diagnostic content.
- **Frontend canonical status input:** A live `AGENT_STATUS` handled through `handleAgentStatus`/`applyLiveAgentStatusEvent`, a member/history snapshot, or an existing explicit command/subscription overlay. Ordinary segment/tool/todo/inter-agent/system-task/turn-boundary activity is content, never a frontend lifecycle input.

## Design Reading Order

1. Start with the behavior/production-path map to connect the approved lifecycle semantics to the affected live paths.
2. Read the health assessment, legacy-removal policy, and state-transition decision to understand why this is a shared backend refactor plus removal of a competing frontend inference, rather than a Codex-only or UI-presentation patch.
3. Use the spine inventory, narratives, and ownership sections as the authoritative control-flow and responsibility model.
4. Use the interface, file, and folder mappings to implement the design without recreating lifecycle policy in adapters or consumers.
5. Finish with the examples, sequencing, risks, and implementation guidance for regression and rollout constraints.

## Explicit Status And Mixed-Batch Transition Contract (AR-001)

`AgentTurnLifecycleState` contains exactly:

- `activeTurn: NONE | IDENTIFIED(turnId) | ANONYMOUS(openedBy: "boundary" | "explicit_running")`;
- `retiredTurnIds: Set<string>` for identified completed, interrupted, superseded, or otherwise terminal IDs;
- `lastStatus: AgentApiStatus | null`.

Runtime adapters continue to canonicalize provider statuses into the five-value public `AgentStatusPayload` before this boundary. The state machine uses an exhaustive switch over those five values—without a second provider-token policy—and observes source events in their existing array order.

### Boundary And Activity State Effects

| Incoming Event | `NONE` | `ANONYMOUS` | `IDENTIFIED(B)` | Retired-ID / Status Effect |
| --- | --- | --- | --- | --- |
| `TURN_STARTED(A)` with non-retired ID | Open `IDENTIFIED(A)` and set `running` | Replace anonymous with `IDENTIFIED(A)` and set `running` | Duplicate `A=B` is an idempotent no-op; newer `A!=B` retires B, opens A, and sets `running` | A start for an already-retired ID is ignored for lifecycle |
| ID-less `TURN_STARTED` | Open `ANONYMOUS(boundary)` and set `running` | Idempotently retain anonymous/running | Ignore; an uncorrelated anonymous start cannot supersede B | Retired IDs unchanged |
| Terminal `TURN_COMPLETED(A)` / `TURN_INTERRUPTED(A)` | Add A to retired; no status change | Add A to retired; anonymous remains active because identities do not match | If `A=B`, retire/clear B and set `idle`; if `A!=B`, add A to retired and leave B/status unchanged | Duplicate terminals are idempotent |
| ID-less terminal | No-op | Clear anonymous and set `idle` | No-op; it cannot close B | Retired IDs unchanged |
| Canonical `ERROR` | Apply the correlation/effect table below; diagnostics never change lifecycle, while valid terminal evidence may set `error` | Diagnostics never change lifecycle; identified terminal evidence cannot be assumed to identify anonymous active work | Only matching `TURN_TERMINAL(B)` or runtime-global evidence can affect status; `TURN_DIAGNOSTIC(B)` cannot | All error content remains outward; only terminal/global authority changes lifecycle |
| Ordinary activity | No lifecycle effect | No lifecycle effect | No effect except exact activity(B) may change `error -> running` | Activity for none/anonymous/retired/mismatched IDs never opens or recovers lifecycle |

An identified start is allowed to supersede another identified active turn because it is positive newer active evidence; the displaced ID is retired first. An anonymous start is deliberately weaker and cannot supersede an identified turn.

### Explicit `AGENT_STATUS` State Effects

| Explicit Status | `NONE` | `ANONYMOUS` | `IDENTIFIED(B)` | Retired IDs | Effective / Output Rule |
| --- | --- | --- | --- | --- | --- |
| `running` | Open `ANONYMOUS(explicit_running)`; set `running` | Retain anonymous; set `running` | Retain B; set `running` | Preserve | Accepted active snapshot. It never invents an identified ID. |
| `idle` | Remain none; set `idle` | Clear anonymous; set `idle` | Reject as uncorrelated with B; preserve B and its prior effective status | Preserve | A matching terminal earlier in the same batch has already cleared B, so the companion idle is then accepted. If B remains active, the idle event is removed from processed output. |
| `initializing` | Remain none; set `initializing` | Reject while anonymous is active; preserve the prior effective status | Reject while B is active; preserve B/status | Preserve | Initializing is accepted only when no turn is active. A contradictory source event is removed from processed output. |
| `error` | Remain none; accept only as a status-only runtime snapshot or companion of accepted terminal/global evidence | Retain anonymous only for a status-only snapshot; a runtime-global companion clears it | Retain B only for a status-only current snapshot; matching turn-terminal/global companions clear it under the error table | Preserve | A companion follows the preceding error's correlation **and effect**. Diagnostic, mismatched, and invalid companions are removed. A status-only error never settles a command and may recover only through exact current-turn evidence. |
| `offline` | Remain none; set `offline` | Clear anonymous; set `offline` | Retire/clear B; set `offline` | Preserve and add B when applicable | Runtime-global authority. Later ordinary/terminal activity cannot reopen; a later authoritative start/live status may do so only if that runtime context is legitimately reused. |

This deliberately resolves the apparent tension between status-only providers and turn correlation: turn-agnostic `running` may establish anonymous activity, but turn-agnostic `idle`/`initializing` cannot close an identified turn. Runtime adapters must produce their explicit status from the post-mutation current native snapshot; they must not copy an old turn's terminal status over a newer native active turn.

### Canonical Output, Batch Ordering, Deduplication, And Derived Placement

The target owner is `LifecycleStatusEventTransformer`, implementing `AgentRunEventTransformer`, not the current append-only processor interface. It receives the whole adapter batch and returns a replacement array before any processor or listener runs.

1. Each adapter that emits a boundary/error and its snapshot in one batch must emit `boundary-or-ERROR` first and `AGENT_STATUS` second. Tests make this an adapter contract. Reversed companion order is removed from runtime adapters rather than repaired in consumers.
2. The per-run dispatch queue serializes the entire `transformers -> processors -> listener dispatch` operation. The transformer evaluates every source event exactly once in array order, but it owns the output decision for each status event.
3. Every non-`AGENT_STATUS` event—including delayed tool/segment content and mismatched `ERROR(A)` diagnostic content—is copied to processed output unchanged and in the same relative order. Raw traces are upstream evidence and are never rewritten.
4. An explicit status accepted by the state table remains in its original relative position. A rejected or contradictory explicit status is **omitted** from processed output; it is never sent to `AgentRun`, command observers, team projections, WebSockets, or UI consumers.
5. Duplicate boundaries and explicit statuses are idempotent state observations. Accepted explicit duplicates may remain as source notifications, but the transformer never creates another derived duplicate.
6. The transformer tracks batch-entry status, final accepted state/status, and the last accepted outward status. After filtering source statuses, it appends **zero or one** derived `AGENT_STATUS` at the end:
   - append none when the final accepted outward status already equals final state;
   - append final state when an accepted boundary/error/recovery changed it without a matching accepted explicit status;
   - append none for a rejected status that caused no state change—the prior canonical status remains authoritative and no outward oscillation occurs.
7. A derived event retains the existing payload contract and `can_interrupt: false`; accepted source status payloads, including valid `can_interrupt`, remain unchanged.
8. The default pipeline registers this transformer first, before token enrichment and all processors. The old `LifecycleStatusEventProcessor` file/registration is removed, so no append-only bypass remains.

| Ordered Adapter Batch | State Before | Processed Output Status Sequence | Final State |
| --- | --- | --- | --- |
| `TURN_STARTED(A), status(running)` | none/idle | `running` once (accepted companion) | identified A / running |
| `TURN_COMPLETED(A), status(idle)` | identified A / running | `idle` once (accepted companion) | none / idle, A retired |
| `TURN_COMPLETED(A), status(running)` | identified B / running, A != B | `running` source may remain as an idempotent snapshot; never idle | identified B / running, A retired |
| `TURN_COMPLETED(A), status(idle)` | identified B / running, A != B | **No status output**; source idle is filtered and prior running remains | identified B / running, A retired |
| `status(running), TURN_COMPLETED(A)` | identified A / running | source `running`, then one derived `idle` | none / idle, A retired |
| `status(idle), TURN_STARTED(B)` | none / idle | source `idle`, then one derived `running` | identified B / running |
| `TURN_DIAGNOSTIC(B), status(error)` | identified B / running | **No status output**; diagnostic content remains | identified B / running |
| `TURN_TERMINAL(A), status(error)` | identified B / running, A != B | **No status output**; ERROR(A) content remains | identified B / running, A retired |
| `TURN_TERMINAL(B), status(error), late activity(B)` | identified B / running | accepted `error` once; late B activity remains content-only | none / error, B retired |
| `RUNTIME_GLOBAL, status(error)` | any | accepted `error` once | none / error; identified active turn retired |
| `status(offline), late activity(A)` | any | accepted `offline` once | none / offline; activity remains output |

## Canonical Error Correlation And Failure-Authority Contract (AR-002 Round-3 Seam)

Canonical `ERROR` always remains deliverable content, but correlation and failure authority are separate facts. `error_scope` says which runtime subject the content belongs to; `error_effect` says whether that event is merely diagnostic or is authoritative terminal failure evidence. Neither a turn ID nor the `ERROR` event name alone grants lifecycle/command authority.

| Resolved Variant | Required Payload | Correlation Meaning | Lifecycle / Command Authority |
| --- | --- | --- | --- |
| `TURN_DIAGNOSTIC(turnId)` | Existing error fields plus `error_scope: "turn"`, `error_effect: "diagnostic"`, and non-blank `turn_id` | Diagnostic content produced while exactly one turn was active | None. Preserve content; do not mutate lifecycle, buffer for settlement, or settle a command. |
| `TURN_TERMINAL(turnId)` | Existing error fields plus `error_scope: "turn"`, `error_effect: "terminal"`, and non-blank `turn_id` | Exactly that turn ended unsuccessfully | Matching current turn becomes terminal error and matching identified command fails exactly once. |
| `RUNTIME_GLOBAL` | Existing error fields plus `error_scope: "runtime"`, `error_effect: "terminal"`; `turn_id` absent | The live runtime/session as a whole cannot continue | Clear active lifecycle and fail the exact current in-flight command in any association state. |
| Non-canonical invalid/unscoped diagnostic | Missing/unknown scope/effect, runtime+diagnostic, terminal/diagnostic contradiction, or turn scope without a valid ID | Backward/raw diagnostic content only | None. Supported publishers must not create it on a new path. |

`AgentRunErrorEvidence` in `agent-run-error-evidence.ts` is the three valid variants above. `resolveAgentRunErrorEvidence(event)` validates the cross-field union, reuses `resolveAgentRunEventTurnId`, and returns `null` for invalid/unscoped input. It never derives `error_effect` from `error_scope`, event arrival, active lifecycle, status payload, or the current command.

### Error State, Output, And Settlement Effects

| Error Evidence | Lifecycle State Before | Lifecycle / Processed-Output Result | Command Result For Current B |
| --- | --- | --- | --- |
| `TURN_DIAGNOSTIC(B)` | Any state, including `IDENTIFIED(B)` | Keep `ERROR(B)` content; no lifecycle transition or derived status. If an error status companion is present, filter it. B remains running when it was running. | Ignore; do not buffer/replay or settle. |
| `TURN_DIAGNOSTIC(A)`, A != B | `IDENTIFIED(B)` | Keep diagnostic content; keep B/current status unchanged; filter any diagnostic error companion. | Ignore before or after result capture. |
| `TURN_TERMINAL(B)` | `IDENTIFIED(B)` | Retire/clear B, set `error`; keep content and accept/derive one error status. Later activity(B) is content-only because B is retired. | `IDENTIFIED(B)` fails exactly once. |
| `TURN_TERMINAL(A)`, A != B | `IDENTIFIED(B)` | Keep B/current status unchanged; keep `ERROR(A)` content but filter its error companion and derive nothing. Retire A. | Ignore before or after B result capture. |
| `TURN_TERMINAL(A)` | A is already retired | Keep content only; no lifecycle/status change. | Ignore. |
| `TURN_TERMINAL(A)` | `NONE` and A is not retired | Retire A and set `error` without inventing an active turn; keep content and accept/derive one error status. | Pending association buffers this terminal evidence and fails only if accepted result identifies A; identified different B ignores it. |
| `TURN_TERMINAL(A)` | `ANONYMOUS` | Keep anonymous/current status unchanged; keep content only. Terminal identity alone cannot be assumed to identify the anonymous turn. | Do not settle without a prior correlated identified start/result. |
| `RUNTIME_GLOBAL` | Any | Retire/clear identified active turn (or clear anonymous), set `error`, keep content and accept/derive one error status. | Fail the exact current in-flight command, including pending/awaiting states, with existing `RUNTIME_REJECTED` semantics. |
| Invalid/unscoped (`resolver -> null`) | Any | Keep content only; filter an immediately associated error companion and do not derive status. | Never settle. |
| Status-only `AGENT_STATUS error` | None/anonymous/identified | Apply the explicit-status table as a runtime snapshot when it is not paired with rejected evidence. It may retain identified B for bounded exact-B recovery. | Never settle; status carries neither terminal effect nor error identity. |

This preserves R-010 without conflating diagnostics with lifecycle failure: a status-only current runtime snapshot may place active B in `error` and later exact activity(B) may recover it, but `TURN_DIAGNOSTIC(B)` leaves running unchanged. `TURN_TERMINAL(B)` retires B and is not recoverable by late B activity. Runtime-global failure also clears active identity.

### Adapter Classification, Capture, And Ordering

1. The native owner classifies **actual control-flow outcome**, not the method/event name: continuing/caught/reported work is diagnostic; a turn runner outcome that ends as failed is turn-terminal; session/process/client loss is runtime-global.
2. Every error captures correlation before native active state is cleared. Turn diagnostic/terminal variants attach the known native turn ID; runtime-global has none.
3. Before terminal mutation, the runtime compares a supplied/captured error ID with current native active ID. Delayed terminal `ERROR(A)` while B is current must not clear B or set the native snapshot to error.
4. A diagnostic emits `ERROR` content only with `statusHint: null`. It must not clear native active state or synthesize `AGENT_STATUS error`. If an upstream provider supplies a diagnostic status companion, the lifecycle transformer filters it.
5. A turn-terminal/global error emits `ERROR` first and its post-mutation `AGENT_STATUS error` second when both are in one batch. Separate AutoByteus stream notifications preserve the same order through the per-run dispatch queue.
6. Converter-only fallback must not guess. Missing effect/scope/identity resolves to `null` and remains non-authoritative content until the owning publisher is fixed.

| Runtime | Diagnostic Mapping | Turn-Terminal Mapping | Runtime-Global Mapping / Native Guard |
| --- | --- | --- | --- |
| Claude | Any provider message explicitly known to be caught while the same turn continues is turn-diagnostic | `ClaudeSession.sendTurn` catch ends its local synthetic B and emits `TURN_TERMINAL(B)` before clearing | Session/process/transport loss outside one turn is global; `claude-session.ts` guards mismatch and the converter preserves error-first ordering |
| Codex | A provider notification explicitly documented/observed to continue current B is turn-diagnostic | Turn failure notification/status that ends current B captures provider/current ID and emits `TURN_TERMINAL(B)` | App-server/client closed and unrecoverable thread/session loss are global; notification handler/thread guard supplied A against current B before mutation |
| AutoByteus | The publisher inventory below maps caught/continued errors to `TURN_DIAGNOSTIC(B)` | Only the supported `AgentTurnRunner` non-interruption catch returns `failed` and publishes `TURN_TERMINAL(B)` | Runtime/client/stream loss publishers use global; server converter mutates turn state only for terminal/global variants |

### AutoByteus Publisher Outcome Inventory

The notifier becomes a clean-cut structured API: `notifyAgentErrorOutputGeneration({ source, message, details?, classification })`, where `classification` is `{ scope: "turn", effect: "diagnostic" | "terminal", turnId }` or `{ scope: "runtime", effect: "terminal" }`. No default effect and no positional optional correlation are allowed.

| Current Publisher | Established Control-Flow Outcome | Target Classification | Lifecycle / Command Result |
| --- | --- | --- | --- |
| `AgentTurnRunner` non-interruption catch | Applies `AgentErrorEvent`, returns `{ kind: "failed", turnId }`, and does not emit `TURN_COMPLETED` | `TURN_TERMINAL(B)` | Retire B, project error, fail command B exactly once |
| `LlmPhase.pre_llm_check` | Emits detail then throws; the outer runner catch is the sole terminal authority | `TURN_DIAGNOSTIC(B)` for the inner detail; outer runner separately emits `TURN_TERMINAL(B)` | Diagnostic is content-only; terminal event performs one failure transition |
| `LlmPhase.prepareRequest` `CompactionPreparationError` | Returns final `isError` response; runner publishes response and `TURN_COMPLETED(B)` | `TURN_DIAGNOSTIC(B)` | B stays running until normal completion, then idle; command completes rather than fails |
| `LlmPhase.stream` handled error | Finalizes failed response, returns final `isError`, then runner publishes `TURN_COMPLETED(B)` | `TURN_DIAGNOSTIC(B)` | Same as prepareRequest |
| `LlmPhase.immediateCompaction` catch | Reports error and continues to tool/final outcome | `TURN_DIAGNOSTIC(B)` | No lifecycle/command effect |
| `ToolPhase` tool-not-found / execution exception / preparation exception | Returns error `ToolResultEvent`; result is processed and fed into continued B | `TURN_DIAGNOSTIC(B)` | Error content/tool result remain visible; B and command remain active |
| `ToolPhase` external result with `message.error` | Logs diagnostic and continues result processing for B | `TURN_DIAGNOSTIC(B)` | No lifecycle/command effect |
| `LLMResponsePipeline` processor catch | Reports error, continues other processing, emits assistant complete, then `TURN_COMPLETED(B)` | `TURN_DIAGNOSTIC(B)` | B completes normally |

Tool-invocation preprocessing errors that only return `ToolResultEvent` and do not call the error notifier require no new `ERROR` classification; their existing tool-result identity remains unchanged. `AgentWorker.runTurn` outer defensive catch is not used to invent another terminal publisher: architecture review MP-003 found no supported path around `AgentTurnRunner` outcome handling.

The SDK `ErrorEventData` parser carries additive `error_scope`, `error_effect`, and conditional `turn_id`. New notifier calls must provide a valid structured classification. Older/unscoped serialized content remains readable and resolves to non-authoritative diagnostic content; this is data readability, not a legacy lifecycle path.

## Command Turn Association And Settlement Contract (AR-002)

The command registry record gains a discriminated internal association instead of using `turnId: null` for two meanings:

| Association State | Meaning | Permitted Settlement |
| --- | --- | --- |
| `PENDING_IDENTITY` | Handoff started; accepted result/turn identity not reconciled yet | No turn-terminal settlement; sequence lifecycle and `TURN_TERMINAL` evidence for replay. Diagnostics are ignored for settlement. A current `RUNTIME_GLOBAL` error/offline may fail immediately. |
| `IDENTIFIED(turnId)` | Accepted result supplied an ID, or an accepted no-ID result was paired with an identified post-handoff start | Only matching lifecycle terminal or `TURN_TERMINAL` for that ID; diagnostics never settle; current `RUNTIME_GLOBAL` error/offline may fail |
| `AWAITING_ANONYMOUS_START` | Result accepted with no ID, but no positive anonymous active evidence exists yet | No turn-terminal/status-only settlement; diagnostics never settle; current `RUNTIME_GLOBAL` error/offline may fail |
| `ANONYMOUS_ARMED(armedAtSequence)` | Result accepted with no ID and a post-handoff ID-less `TURN_STARTED` or accepted explicit `running` snapshot established anonymous activity | Only a later ID-less terminal or accepted status-only idle after arming may complete; only `TURN_TERMINAL` with an already correlated ID or runtime-global error/offline may fail; diagnostics never settle |

`turnId` remains on the record for the public acknowledgement when the association is identified. Association state is internal and in-memory; it adds no transport or persistence schema.

### Association / Arming Sequence

1. `registry.begin` creates `PENDING_IDENTITY`. The coordinator subscribes before forwarding, as today, but the observer owns a monotonically increasing local evidence sequence and cannot settle `TURN_TERMINAL` while pending.
2. After `messageHandoffStarted=true`, the observer records only compact lifecycle evidence needed for later reconciliation: identified/anonymous starts, identified/anonymous terminals, valid explicit statuses, and resolved `TURN_TERMINAL` evidence. Diagnostics and ordinary activity are not buffered. Status-only idle/error before positive active evidence is never a completion/failure candidate.
3. On **every** callback, the observer reloads `registry.getRecord(runId, messageId)` and verifies that exact record is still the current in-flight command. It never closes over the original immutable record as correlation truth. It resolves errors through the shared provider-neutral helper, not ad hoc payload reads.
4. When `postUserMessage` returns accepted:
   - result ID B -> atomically set `IDENTIFIED(B)`, then replay buffered evidence in sequence; accept only lifecycle terminal(B), `TURN_TERMINAL(B)`, or a previously observed runtime-global failure;
   - no result ID plus an observed identified start B -> set `IDENTIFIED(B)`, then replay only B evidence;
   - no result ID plus anonymous start/running evidence -> set `ANONYMOUS_ARMED` at that active evidence sequence, then replay only later anonymous terminal/accepted idle evidence;
   - no result ID and no active evidence -> set `AWAITING_ANONYMOUS_START`; later active evidence arms it.
5. If a result ID and an observed start ID disagree, the result ID is authoritative for this command; the other start and all lifecycle-terminal/turn-terminal evidence for its ID are ignored as older/unrelated. An already-identified association is never overwritten by a different event ID. Neither diagnostic nor terminal error identity alone establishes or upgrades an anonymous association.
6. `RUNTIME_GLOBAL` error/offline is authoritative for the current runtime. After verifying the record is still current, the observer may fail a pending, awaiting, anonymous, or identified command immediately; a later accepted-result callback must see the terminal record and must not resurrect or overwrite it.
7. Buffered evidence is discarded immediately after reconciliation/settlement. The observer unsubscribes on terminal command state or synchronous rejection/failure.

### Settlement And Overlay Rules

| Current Association | Incoming Evidence | Result |
| --- | --- | --- |
| Pending / awaiting anonymous start | Idle/terminal/status-only error without accepted active association | Ignore for settlement and keep overlay/command in flight |
| Any association | `TURN_DIAGNOSTIC(A or B)` | Deliver content only; never buffer, clear overlay, mutate association, or settle |
| Pending | `TURN_TERMINAL(A)` | Buffer; after accepted result, fail only if its identified ID is A |
| Identified B | `TURN_COMPLETED/INTERRUPTED(A)` or `TURN_TERMINAL(A)`, A != B, before or after result capture | Ignore; B remains in flight |
| Identified B | Turn-agnostic `status(idle/error)` | Do not settle; it cannot be correlated to B |
| Identified B | Matching terminal(B) | Complete B exactly once |
| Identified B | `TURN_TERMINAL(B)` | Fail B exactly once with existing runtime rejection/error mapping |
| Anonymous armed at sequence N | ID-less terminal or accepted idle at sequence > N | Complete once, then unsubscribe |
| Anonymous armed | Status-only error, `TURN_DIAGNOSTIC`, or `TURN_TERMINAL` without a previously correlated identified start | Do not fail; scope cannot safely identify this anonymous command |
| Anonymous armed | Identified `TURN_STARTED(B)` | Upgrade atomically to identified B; subsequent lifecycle-terminal/turn-terminal settlement requires B |
| Any current association | `RUNTIME_GLOBAL` error or runtime-global `offline` | Mark command `FAILED` with existing `RUNTIME_REJECTED` semantics/message, clear overlay, and unsubscribe |

The initializing overlay is cleared only when the command is positively associated/armed (matching identified start/result or anonymous active evidence), not by arbitrary post-handoff status. On matching/global failure it is cleared by the terminal command transition. This preserves truthful startup UI and prevents delayed A evidence from replacing B's overlay.

Required arrival-order regressions:

- `handoff(B) -> delayed terminal/status(A) -> TURN_STARTED(B) -> accepted result(turnId=B) -> delayed terminal/status(A) -> terminal(B)` keeps B in flight through both A deliveries and settles exactly once at terminal(B).
- `handoff(B) -> TURN_TERMINAL(A)/status(error) -> TURN_STARTED(B) -> accepted result(B) -> TURN_TERMINAL(A)/status(error) -> TURN_TERMINAL(B)/status(error)` keeps B running/in flight through both A deliveries, never exposes their error status, and fails exactly once on B.
- `handoff(B) -> TURN_STARTED(B) -> TURN_TERMINAL(B)` before the accepted result returns buffers terminal evidence; result(B) then associates and fails B exactly once.
- `handoff(B) -> TURN_DIAGNOSTIC(B) -> tool result/continued response -> TURN_COMPLETED(B)` keeps lifecycle/command running through the diagnostic and completes B once at its matching terminal.
- `handoff(B) -> RUNTIME_GLOBAL error` fails the current pending record immediately; a delayed successful handoff result cannot resurrect it.

## Frontend Canonical-Status Consumption Contract (AR-003)

The frontend remains a projection boundary, not a second lifecycle reconciler. Backend exact-turn knowledge is intentionally not copied into the browser. `AgentStreamingService.dispatchMessage` continues to route every content/activity event to its existing handler, but it must not mutate `context.state.currentStatus` merely because such an event arrived.

| Frontend Input / Path | Target Status Effect | Preserved Non-Status Effect | Governing Rule |
| --- | --- | --- | --- |
| Live `AGENT_STATUS` (source or backend-derived) | Apply the canonical value through `handleAgentStatus` -> `applyLiveAgentStatusEvent` | Preserve current completion/interrupt/sending behavior | Sole live streamed lifecycle input |
| Team/member/history snapshot | Apply through the existing snapshot functions | Preserve route/history hydration | Reconnect must reproduce backend truth |
| Accepted command acknowledgement or existing command/subscription placeholder | Preserve the current explicit initializing/running overlay behavior | Preserve sending/interrupt UX | An explicit command/runtime projection is not ordinary activity inference |
| `TURN_STARTED`, segment, tool, todo, inter-agent, system-task, or other ordinary activity message | **No lifecycle mutation**, regardless of current `offline/initializing/idle/running/error` | Run the existing content/tool/todo/activity handler unchanged | Arrival, recency, and message type carry no frontend turn authority |
| `ERROR` content without a separate canonical `AGENT_STATUS` | No lifecycle mutation | Render/store the diagnostic/error segment as today | Error content alone is not a frontend status transition |

Exact-B recovery remains live and immediate through the canonical backend path: while B is the active identified turn in status-only error, exact activity(B) reaches `LifecycleStatusEventTransformer`; the transformer emits the unchanged activity followed by canonical `AGENT_STATUS running`; the frontend keeps error during the activity handler and changes to running only when that explicit status event is handled. In contrast, delayed/mismatched/retired activity(A), diagnostic content, and activity after terminal/global failure produce no running status and therefore cannot recover the frontend.

The clean-cut frontend change is:

1. Delete `LIVE_RUNTIME_ACTIVITY_MESSAGE_TYPES` and `isLiveRuntimeActivityMessage` from `AgentStreamingService.ts`.
2. Delete the import and call to `applyLiveRuntimeActivityProjectionRepair`; keep activity dispatch and conversation timestamp updates unchanged.
3. Delete `applyLiveRuntimeActivityProjectionRepair` from `agentRuntimeStatusState.ts`; retain canonical live-status, snapshot, placeholder, and terminal-cleanup functions.
4. Replace old tests that expect activity-driven `error -> running` with service-level no-mutation coverage across the current activity categories, including delayed mismatched/retired/post-terminal/global-failure activity, plus an explicit `AGENT_STATUS running` recovery test. Remove helper-only repair tests rather than preserving an unused compatibility export.

No frontend turn ID store, retired-ID set, timer, event reorderer, or adapter-specific branch is permitted. Public labels, colors, status enum, protocol payloads, and activity rendering stay unchanged.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove broad ordinary-activity lifecycle derivation, remove non-status `statusHint` inference from `AgentRun`, remove uncorrelated terminal-hint command settlement, and remove frontend activity-triggered `error -> running` inference (`LIVE_RUNTIME_ACTIVITY_MESSAGE_TYPES`, `isLiveRuntimeActivityMessage`, and `applyLiveRuntimeActivityProjectionRepair`).
- No compatibility alias, runtime-specific exception list, quiet timer, or frontend dual path will be retained.
- Existing event/status names are not legacy and remain unchanged; only their invalid transition policy is replaced.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Team/agent run metadata and raw traces under `.autobyteus/server-data/memory`; the matched team has six member metadata nodes. Live lifecycle override/processor state exists only in process memory.
- Relevant code-model, serialization, semantic, or physical-store change: Internal live transition semantics and in-memory turn-correlation state change. Live AutoByteus/canonical `ERROR` payloads gain additive scope/effect/ID fields, but no persisted store schema or reader format changes; older unscoped traces remain readable diagnostic content.
- Normal reader/writer behavior and representative evidence: Active projection services read `AgentRun.getStatusSnapshot()`; mixed handles decorate it with route/path identity; inactive historical metadata projects offline. Actual team metadata contains runtime/member identity but no persisted stale status field.
- Required semantics and invariants under direct use: Preserve run/member identity, raw traces, transcript/activity events, termination metadata, and restoration behavior.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None; process restart creates fresh runtime contexts/state. No maintenance window or file rewrite.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: Existing files are version-agnostic for this change. Rewriting history would add I/O/corruption risk without changing the live in-memory producer that caused the bug.
- Acceptance criteria or design constraints supported by this decision: R-005, R-007, R-009; AC-005, AC-007, AC-010.

### Migration Plan

N/A — decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004 | Provider/runtime notification | Canonical ordered `AgentRunEvent` stream and effective run snapshot | Per-run event dispatch queue + lifecycle-status transformer | Keeps diagnostic content separate from terminal lifecycle projection |
| DS-002 | Return-Event | BEH-003, BEH-006 | Canonical agent status plus independent activity/content events | Mixed-team live event and frontend status/activity consumers | AgentRun + mixed-team/stream boundaries + frontend canonical status reducer | Proves delayed content survives while only canonical status changes lifecycle |
| DS-003 | Primary End-to-End | BEH-003, BEH-006 | WebSocket connect or fresh status query | Focused header/team tree status | Existing status snapshot services | Prevents reconnect from restoring stale running |
| DS-004 | Primary End-to-End | BEH-004 | User/team command acceptance | Correlated command completion/failure record | AgentRunCommandCoordinator | Prevents old terminal/error events from settling a newer command |
| DS-005 | Bounded Local | BEH-001, BEH-002, BEH-004 | Ordered canonical event batch | Updated per-context turn state plus zero/one derived status transition | Agent turn lifecycle state machine inside lifecycle-status transformer | Implements the approved deterministic transition table |
| DS-006 | Return-Event | BEH-005 | Runtime termination/disposal | Explicit offline snapshot/event and collectible lifecycle context | AgentRun termination + context-lifetime state | Preserves idle/offline distinction and cleanup |

## Primary Execution Spine(s)

### DS-001 — Runtime event to canonical lifecycle

`Provider/runtime event -> runtime-specific adapter -> per-run AgentRunEventDispatchQueue -> default AgentRunEventPipeline -> LifecycleStatusEventTransformer/turn state -> canonical AGENT_STATUS -> AgentRun.statusOverride`

### DS-003 — Reconnect/fresh snapshot

`Agent/team WebSocket connection or status query -> status snapshot service -> AgentRun/MixedAgentMemberHandle snapshot -> WebSocket payload -> frontend central status owner -> header/tree visuals`

### DS-004 — Reusable command lifecycle

`SEND_MESSAGE -> registry PENDING_IDENTITY -> runtime handoff + sequenced lifecycle/terminal-error observation -> accepted-result/start association -> IDENTIFIED(B) or ANONYMOUS_ARMED -> matching lifecycle terminal / TURN_TERMINAL(B) / RUNTIME_GLOBAL settlement -> terminal command record`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each adapter preserves turn correlation and classifies diagnostic versus terminal effect from actual control flow. A run-keyed queue processes batches in order. The lifecycle transformer delivers diagnostics without status, applies only terminal/global error authority, filters unsafe statuses, and derives valid fallback; `AgentRun` accepts canonical status only. | Runtime turn, error evidence, agent event batch/status | Runtime error owner + event queue + lifecycle transformer | Runtime translation, listener errors |
| DS-002 | `AgentRun` listeners receive activity unchanged plus any canonical status. Mixed handles add member identity and team streaming maps it. Frontend activity handlers update content only; `handleAgentStatus`/`applyLiveAgentStatusEvent` alone applies streamed lifecycle. | Agent run, team member, live UI context | AgentRun, mixed-team handle, and frontend canonical status reducer | Team aggregation, transport serialization |
| DS-003 | Fresh snapshots read the corrected `AgentRun.statusOverride`/backend status, and the frontend applies that snapshot directly, so reconnect and history-open surfaces converge with live canonical status and need no activity repair. | Run snapshot, member snapshot | Existing projection/snapshot services + frontend snapshot reducer | Route/path decoration |
| DS-004 | The command begins pending identity, ignores diagnostics, buffers only eligible lifecycle/turn-terminal evidence, reloads the latest record per callback, and becomes identified or positively armed anonymous after result/start reconciliation. It settles only on matching terminal effect or explicit runtime-global evidence. | Command record, association state, terminal error evidence | AgentRunCommandCoordinator + command registry | Startup overlay, evidence compaction, dedupe |
| DS-005 | The state machine normalizes `turnId`/`turn_id`, applies source events in order, filters rejected explicit statuses before canonical listeners, and appends at most one valid fallback status. | Per-context turn lifecycle state | LifecycleStatusEventTransformer | WeakMap lifetime, payload identity normalization |
| DS-006 | Termination continues to emit explicit offline. Runtime-context-keyed lifecycle state becomes collectible and cannot leak into a restored runtime context with the same public run ID. | Runtime context, offline status | AgentRun/runtime context lifetime | GC/lifecycle cleanup |

## Spine Actors / Main-Line Nodes

- Runtime-specific lifecycle owner (`CodexThread`, `ClaudeSession`, AutoByteus stream converter state).
- Runtime-specific event adapter.
- `AgentRunEventDispatchQueue`.
- `AgentRunEventPipeline`.
- `LifecycleStatusEventTransformer` with `AgentTurnLifecycleState`.
- `AgentRun` canonical status snapshot.
- `AgentRunCommandCoordinator` plus `AgentRunCommandRegistry` for pending/identified/anonymous command correlation.
- Existing mixed-team member handle and stream/snapshot consumers.
- Frontend `handleAgentStatus`/`applyLiveAgentStatusEvent` canonical live-status owner, separate from activity handlers.

## Ownership Map

- Runtime lifecycle/error publishers own native active-turn mutation plus correlation/effect classification from actual control-flow outcome; they must not clear B for diagnostics or mismatched terminal A.
- Runtime adapters own provider-to-canonical translation, preservation of error correlation/effect, diagnostic content-only conversion, and boundary-or-terminal-error-first/status-second ordering; they do not own UI lifecycle or command policy.
- `AgentRunEventDispatchQueue` owns per-run ordering of pipeline processing and final listener dispatch; it owns no status transitions.
- `LifecycleStatusEventTransformer` owns canonical status acceptance/filtering, fallback/recovery transition policy, and its internal turn state machine.
- `AgentRun` owns the public effective snapshot and local command-start/termination overrides; backend event updates come only from `AGENT_STATUS`.
- `AgentRunCommandCoordinator` owns evidence observation/reconciliation and settlement; `AgentRunCommandRegistry` owns the latest immutable command record plus its atomic association transitions. A callback must reload that record rather than use the begin-time object.
- Mixed-team and frontend boundaries remain projections/consumers. Frontend streamed lifecycle changes only through canonical `AGENT_STATUS`; activity handlers must not infer running/idle/error recovery from arrival, silence, or message type.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `dispatchProcessedAgentRunEvents(...)` | `AgentRunEventDispatchQueue` + default pipeline | Common backend entry for processed event delivery | Provider status policy or per-runtime exceptions |
| `AgentRun.getStatusSnapshot()` | Canonical override plus backend snapshot | Public run status boundary | Generic activity inference |
| `MixedAgentMemberHandle.getStatusSnapshot()` | Underlying AgentRun snapshot + command overlay | Adds team member identity | Independent busy/idle lifecycle |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Current append-only `LifecycleStatusEventProcessor` and its pipeline registration | It cannot remove a rejected source status before canonical listeners | `LifecycleStatusEventTransformer` registered before all processors | In This Change | Delete the old class/file/registration; do not run both paths |
| Broad `ACTIVE_LIFECYCLE_EVENT_TYPES` ordinary-activity rule | It causes completed turns to reopen | Turn-boundary/active-turn state machine in lifecycle transformer | In This Change | Ordinary activity remains delivered |
| Segment-only `running` unit expectation | Encodes invalid lifecycle authority | Boundary and exact late-tool regression tests | In This Change | No stale test compatibility |
| `AgentRun.resolveStatusFromEvent()` ACTIVE/IDLE/ERROR hint inference | Duplicates shared canonical status ownership | Explicit `AGENT_STATUS` emitted/preserved by pipeline | In This Change | Local command/termination explicit events remain |
| Uncorrelated `statusHint === IDLE` command completion and nullable-ID ambiguity | Can settle the wrong command during or after handoff | Explicit pending/identified/awaiting-anonymous/armed-anonymous association contract | In This Change | Identified commands reject turn-agnostic idle/error; offline remains runtime-global |
| AutoByteus boolean-only `hasActiveTurn` | Cannot reject mismatched old terminal/error identity | Turn-ID-aware adapter state | In This Change | No public API change |
| Turn-agnostic and scope-only/blanket-terminal error publication | Cannot distinguish diagnostic B, terminal B, delayed A, and runtime-global loss | Structured correlation/effect/ID classified by actual publisher outcome | In This Change | Unscoped historical/raw diagnostics remain content-only, never lifecycle/command authority |
| `LIVE_RUNTIME_ACTIVITY_MESSAGE_TYPES`, `isLiveRuntimeActivityMessage`, and `applyLiveRuntimeActivityProjectionRepair` | Uncorrelated frontend activity can undo a canonical backend error and diverge live from reconnect | Canonical backend exact-B recovery emitted as `AGENT_STATUS running`, consumed by existing frontend status handler | In This Change | Delete imports/calls/export and old activity-repair expectations; keep activity rendering |

## Return Or Event Spine(s) (If Applicable)

- DS-002 status: `Canonical AGENT_STATUS -> AgentRun listener -> MixedAgentMemberHandle -> TeamRunEvent -> WebSocket mapper -> handleAgentStatus/applyLiveAgentStatusEvent -> status visuals`.
- DS-002 content: `Canonical non-status activity -> same transport -> existing frontend activity handler -> transcript/tool/todo/activity projection`, with no lifecycle write.
- DS-006: `terminate -> explicit AGENT_STATUS offline -> AgentRun snapshot/team aggregation/frontend -> runtime context released`.

## Bounded Local / Internal Spines (If Applicable)

### DS-005 inside `LifecycleStatusEventTransformer`

- Parent owner: shared lifecycle-status transformer.
- Chain: `ordered event batch -> normalize turn plus error correlation/effect -> preserve diagnostics -> apply only terminal/global error authority -> apply boundary/status/activity transition -> omit rejected statuses -> append at most one fallback -> replacement batch`.
- Why it matters: This is the actual deterministic state machine. It must remain inside one owner rather than being recreated in adapters, `AgentRun`, team code, or UI code.

### Per-run dispatch ordering inside `AgentRunEventDispatchQueue`

- Parent owner: processed event dispatch boundary.
- Chain: `enqueue(runId, batch task) -> await prior same-run tail -> pipeline process -> listener dispatch -> delete drained tail`.
- Why it matters: State updates and emitted statuses must have the same order. Different run IDs remain concurrent.

### Command association inside `AgentRunCommandCoordinator`

- Parent owner: command coordinator and its registry.
- Chain: `begin pending -> subscribe/handoff -> ignore diagnostic errors -> sequence lifecycle/turn-terminal evidence without pending settlement -> reconcile accepted result/start -> arm identified/anonymous association -> replay matching terminal evidence or accept explicit global failure -> settle once`.
- Why it matters: Runtime callbacks may arrive before `postUserMessage` returns its turn ID. The pending gate prevents stale A terminal/status from acting on B, while bounded replay preserves a legitimate fast B completion that arrived before result capture.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Turn ID normalization | DS-004, DS-005 | Lifecycle transformer and command coordinator | Resolve canonical ID from `turnId` or `turn_id` | Existing adapters use both shapes | Duplicated parsing/drift |
| Error correlation/effect normalization | DS-001, DS-004, DS-005 | Runtime publishers, lifecycle transformer, command coordinator | Resolve diagnostic, turn-terminal, runtime-global, or `null` without inference | Same tight evidence drives projection/settlement while diagnostics remain content | Recoverable diagnostic can fail B, or true failure can leak |
| Command pending-evidence accumulator | DS-004 | Command coordinator | Sequence lifecycle/status/turn-terminal evidence until association is armed; never diagnostics | Callbacks can precede accepted result ID | Old event settles new command or fast completion/failure is lost |
| Runtime-context lifetime | DS-005, DS-006 | Lifecycle state | Key state by context in `WeakMap` | Avoid same-run restore contamination/manual global cleanup | Run-ID map leak/stale state |
| Listener error isolation | DS-001 | Dispatch queue | Preserve current per-listener error handling and queue progress | One listener must not poison later events | Queue deadlock |
| Team identity decoration | DS-002, DS-003 | Mixed handle | Preserve member path/route fields | Nested team routing/display | Lifecycle owner coupled to team topology |
| Delayed activity presentation | DS-002 | Existing transcript/activity handlers | Deliver source event unchanged | User still needs tool output | Status fix suppresses content |
| Frontend activity presentation | DS-002 | Existing activity handlers | Preserve segment/tool/todo/inter-agent/system-task content without writing lifecycle | Content and lifecycle are separate outputs of the canonical stream | Activity arrival becomes a second lifecycle authority |

## Ownership Boundaries

Runtime publishers decide correlation and diagnostic-versus-terminal effect from actual continuation/outcome while native identity is available. Runtime owners mutate current-turn state only for authoritative terminal/global evidence. The shared lifecycle transformer preserves all error content, applies only valid terminal authority, filters rejected statuses, and returns the replacement canonical batch. `AgentRun` consumes only that sequence. Team/frontend layers remain projections: frontend activity handlers own content only, while the existing canonical status/snapshot functions own lifecycle projection.

Turn and canonical error-evidence normalization are agent-execution domain concerns, not Codex helpers. The turn helper accepts only an `AgentRunEvent`/payload and returns one normalized string or `null`; the error helper validates the canonical correlation/effect union. Neither inspects provider-native nested structures or guesses from the current command.

Per-run serialization wraps pipeline processing and dispatch as one unit. Backends must call the common dispatch boundary and must not invoke the pipeline and listeners separately. Command correlation is intentionally downstream of that ordered canonical stream but owns a separate handoff-time association gate; it must never infer association from output silence.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `dispatchProcessedAgentRunEvents` | Run-keyed promise tail and pipeline invocation | AutoByteus, Codex, Claude backends | Backend directly calls default pipeline then listeners | Extend dispatch input, not adapter-local queues |
| `LifecycleStatusEventTransformer.transform` | WeakMap state, active-turn union, retired IDs, error correlation/effect and explicit-status/mixed-batch output policy | Default event pipeline | Append-only processor or adapter/team/UI calls state store directly | Extend transformer-owned transition input/output, not listener correction |
| `AgentRun.getStatusSnapshot` | Explicit status override + backend fallback | Status projections, mixed handles | Consumer reinterprets recent activity | Fix canonical producer |
| `handleAgentStatus` / `applyLiveAgentStatusEvent` | Frontend live canonical status projection | `AgentStreamingService` only for `AGENT_STATUS`/ack status payloads | Activity dispatch or handler directly changes `currentStatus` | Fix/emit canonical backend status; do not add frontend turn inference |
| `AgentRunCommandCoordinator.postUserMessage` | Registry association, pending evidence, overlay, correlated settlement | Command transports | Callback uses begin-time nullable record, infers missing error correlation/effect, or settles turn-terminal evidence while pending | Extend coordinator/registry association methods |
| `AgentExternalEventNotifier.notifyAgentErrorOutputGeneration` | Structured AutoByteus error publication | Turn runner, LLM/tool phases, response pipeline | Positional call omits effect or caller labels every turn-correlated diagnostic terminal | Require discriminated classification object and compile-time exhaustive call-site updates |

## Dependency Rules

- Runtime adapters may depend on runtime-native ID resolvers and canonical event types; they must preserve canonical turn identity in boundary/activity payloads and classify error correlation plus actual control-flow effect at the native publisher.
- The shared lifecycle transformer and command coordinator may depend on `AgentRunEvent`, `AgentStatusPayload`, the domain turn-ID helper, and the provider-neutral error-evidence helper; neither may import Codex/Claude/AutoByteus classes.
- Runtime boundary/error/status batches must be boundary-or-authoritative-error first and snapshot second. Diagnostics never cause native mutation/status. Terminal owners capture ID/effect before mutation, guard mismatched IDs, and compute post-mutation status. They must not emit stale old-turn idle/error over B.
- `AgentRun` may consume canonical `AGENT_STATUS`; it must not duplicate activity/boundary inference.
- Command coordinator may use shared turn/error resolvers and registry association methods; it must not query provider-specific runtime contexts, settle a turn-terminal event while association is pending, infer missing error correlation/effect from current B, or treat nullable `turnId` as anonymous by itself. Explicit runtime-global evidence may fail the current record in any association state.
- Command callbacks must reload the latest registry record before correlation. Begin-time records are immutable snapshots, not live association state.
- Dispatch queue may call the pipeline and listeners only; it must not inspect lifecycle event types.
- Team/frontend consumers must not infer idle/running/error recovery from output silence, timers, activity arrival/recency, tool results, turn-boundary receipt, or response text. Frontend activity dispatch must not call any status mutator; legitimate exact-B recovery arrives as canonical backend `AGENT_STATUS running`.
- No runtime-specific late-event blacklist and no compatibility branch retaining segment-only running are allowed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveAgentRunEventTurnId(event)` | Canonical agent event turn | Normalize event payload turn identity | `turnId` or `turn_id` non-empty string | No provider-native nested parsing |
| `resolveAgentRunErrorEvidence(event)` | Canonical error evidence | Validate scope/effect and return turn-diagnostic, turn-terminal, runtime-global, or `null` | `ERROR` payload `error_scope` + `error_effect` + conditional turn ID | Never infer from active lifecycle/command state |
| `notifyAgentErrorOutputGeneration(notification)` | AutoByteus error publication | Serialize content plus explicit correlation/effect classification | Discriminated structured notification; turn variants require ID, runtime variant is terminal | No positional/default effect; publisher outcome owns classification |
| `AgentRunEventDispatchQueue.enqueue(runId, work)` | Per-run event batch order | Serialize work for one run and clean drained tail | Canonical run ID | Different runs execute concurrently |
| `AgentTurnLifecycleState.observe(events)` (internal shape) | One runtime context's turn lifecycle | Apply the complete boundary/explicit-status table and return final accepted status plus derivation need | Canonical ordered event batch + normalized turn IDs + active-turn union | Not exported outside lifecycle subsystem |
| `LifecycleStatusEventTransformer.transform(input)` | Canonical lifecycle output | Preserve every non-status event, omit rejected statuses, keep accepted statuses, and derive at most one required fallback | `AgentRunEventTransformerInput` with `AgentRunContext` identity | Replacement array is final before all processors/listeners |
| `AgentRun.getStatusSnapshot()` | Effective run lifecycle | Return canonical public snapshot | Run instance | Only explicit status updates override |
| `applyLiveAgentStatusEvent(context, payload)` | Frontend live lifecycle projection | Apply canonical `AGENT_STATUS` payload to context state | Agent context + public status payload | Called only for canonical status/ack status, never ordinary activity |
| `AgentStreamingService.dispatchMessage(message, context)` | Frontend stream routing | Route status to status handler and all non-status messages to content/activity handlers | Parsed `ServerMessage` + attached context | Must not classify activity as lifecycle; no frontend turn state |
| Registry association methods | One accepted command association | Atomically move pending -> identified / awaiting anonymous -> armed anonymous | run ID + message ID + discriminated association | Never overwrite identified ID with a different event ID |
| Command coordinator event observer | One accepted command | Sequence/reconcile evidence and settle matching armed or explicit runtime-global evidence | current registry record + event sequence + normalized turn/error evidence/status | Reload record on every callback; pending turn-terminal evidence cannot settle |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Turn ID resolver | Yes | Yes | Low | Add focused camel/snake/blank tests |
| Error evidence resolver | Yes | Yes | Low | Exhaustively validate diagnostic/turn-terminal/runtime-global/null variants; never use arrival-time current turn |
| AutoByteus error notifier | Yes | Yes | Low | Structured discriminated input makes every publisher choose effect explicitly |
| Dispatch queue | Yes | Yes | Low | Auto-delete drained run tail |
| Lifecycle transformer | Yes | Yes | Low | Enforce full explicit-status/mixed-batch/error table and listener-visible filtering |
| AgentRun snapshot | Yes | Yes | Low | Remove hint inference |
| Frontend canonical status reducer | Yes | Yes | Low | Retain explicit status application; remove activity repair |
| Frontend stream dispatcher | Yes | Yes | Low after cleanup | Route by protocol type without a cross-cutting activity-to-status pre-hook |
| Registry association | Yes | Yes | Low | Use discriminated states, not nullable-ID meaning |
| Command observer | Yes | Yes | Low after refactor | Reload latest record, sequence/replay only eligible evidence |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared turn state | `AgentTurnLifecycleState` | Yes | Low | Keep internal to lifecycle-status folder |
| Ordered dispatch | `AgentRunEventDispatchQueue` | Yes | Low | Do not call it a generic manager |
| Shared status fallback | `LifecycleStatusEventTransformer` | Yes | Low | Use the transformer name because whole-batch replacement—not append-only processing—is required |
| Canonical turn identity helper | `resolveAgentRunEventTurnId` | Yes | Low | Place under agent-execution domain |
| Canonical error evidence | `AgentRunErrorEvidence` / `resolveAgentRunErrorEvidence` | Yes | Low | Keep provider-neutral and separate from public status payload |
| AutoByteus publisher classification | `AgentErrorNotificationClassification` | Yes | Low | Discriminated SDK type; no boolean `isTerminal` plus nullable ID |
| Command association | `AgentRunCommandTurnAssociation` | Yes | Low | Discriminated type in existing command types; do not add a second command registry |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical lifecycle fallback | Agent execution event processors/lifecycle-status | Extend | Existing lifecycle subsystem remains the owner, but its append-only processor interface is replaced | N/A |
| Per-run processed event ordering | `dispatch-processed-agent-run-events` boundary | Extend | All three backends already use it | N/A |
| Turn ID normalization | Agent execution domain event contract | Create New | Reused by transformer and command coordinator; provider helpers are too specific | Runtime-specific resolvers parse provider wire shapes |
| Error correlation/effect normalization | Agent execution domain event contract | Create New | Lifecycle projection and command settlement consume one provider-neutral union while diagnostics remain content-only | Runtime owners still classify provider-native cause before clearing identity |
| AutoByteus error publication | Existing notifier + `ErrorEventData` stream contract | Extend | Existing boundary carries all current publishers; strengthen it with required classification rather than create parallel notifier paths | N/A |
| Effective snapshot | `AgentRun` | Extend | Existing public owner | N/A |
| Command settlement | AgentRunCommandCoordinator + AgentRunCommandRegistry | Extend | Existing observer/immutable-record owners; add explicit association transitions | N/A |
| UI status presentation and live projection | Existing frontend status subsystem | Reuse | Preserve colors/labels and canonical status/snapshot reducers; remove its obsolete activity recovery branch | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution domain | Canonical event turn identity and canonical error-evidence union | DS-001, DS-004, DS-005 | Transformer/coordinator/runtime adapters | Extend | Two focused helper/type files; no provider imports |
| Agent execution events | Per-run processing/dispatch order | DS-001 | All runtime backends | Extend | Queue remains internal |
| Lifecycle-status transformer | Turn state and reconciliation/fallback/recovery policy | DS-001, DS-005, DS-006 | Canonical lifecycle | Replace/refactor | Remove append-only processor and broad activity rule |
| Runtime publishers/adapters | Classify actual diagnostic/terminal outcome, preserve identity/effect, and mutate native active state only for authority | DS-001, DS-004 | Runtime snapshots and command evidence | Extend | No UI/command-settlement rules |
| AgentRun domain | Effective canonical snapshot | DS-001–DS-003, DS-006 | Status consumers | Refactor | Explicit status only |
| Command services | Pending evidence, association arming, correlated settlement | DS-004 | Command coordinator + registry | Extend | Known ID is authoritative; anonymous needs positive active evidence |
| Frontend status | Render/apply canonical values; keep activity presentation lifecycle-neutral | DS-002, DS-003 | User surfaces | Refactor | Delete legacy repair helper/call and replace stale expectations with canonical-status/no-activity-mutation regressions |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `domain/agent-run-event-turn-id.ts` | Agent execution domain | Canonical event identity | Normalize camel/snake turn ID | Shared by two owners | AgentRunEvent |
| `domain/agent-run-error-evidence.ts` | Agent execution domain | Canonical error identity | Validate turn-diagnostic/turn-terminal/runtime-global evidence and reject invalid as `null` | Shared by lifecycle and command owners | Turn ID helper + AgentRunEvent |
| `events/agent-run-event-dispatch-queue.ts` | Agent execution events | Ordering owner | Per-run promise-tail queue | Independent of lifecycle policy | No |
| `events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Lifecycle-status | Internal state machine | Active union, retired IDs, full explicit-status/batch transitions | Keeps transformer readable/testable | Turn ID helper |
| `events/processors/lifecycle-status/lifecycle-status-event-transformer.ts` | Lifecycle-status | Transformer boundary | Event classification, rejected-status filtering, and fallback creation | Whole-batch replacement belongs before append-only processors | Internal state + error resolver |
| Existing Claude/Codex/AutoByteus runtime lifecycle/error files | Runtime adapters | Native lifecycle/error origin | Matching terminal guards and diagnostic/turn-terminal/global publication | Runtime-specific cause and native ID exist only here | Turn/error IDs |
| Existing AgentRun/command type/registry/coordinator files | Domain/service owners | Snapshot/command boundaries | Remove duplicate inference; add discriminated association, error-aware pending reconciliation, and settlement | Existing responsibilities | Turn/error resolvers |
| AutoByteus SDK error payload/notifier/turn-phase call sites | AutoByteus runtime producer | Error origin contract | Add scope/effect/ID and map each caller from its established continuation/outcome | Only the publisher knows whether it continues or returns failed | Existing ErrorEventData |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Frontend stream routing | Protocol dispatch boundary | Remove live-activity type set/predicate and status-repair pre-hook; preserve every handler dispatch | Stream routing belongs here; lifecycle policy does not | Existing handlers/protocol |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Frontend status projection | Canonical status/snapshot state | Remove activity repair export; retain explicit status/snapshot/placeholder/cleanup functions | Status mutations remain centralized without activity inference | AgentStatus normalization |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `turnId`/`turn_id` normalization | `agent-run-event-turn-id.ts` | Agent execution domain | Transformer and coordinator require identical identity | Yes | Yes | Provider-wire parser |
| Canonical error classification | `agent-run-error-evidence.ts` | Agent execution domain | Transformer and coordinator require identical diagnostic/turn-terminal/global/null semantics | Yes | Yes | Provider-native classifier or command-current inference |
| AutoByteus publisher classification | `notifiers.ts` exported structured input | AutoByteus agent events | All inventoried call sites must make the same valid correlation/effect choice | Yes | Yes | Optional terminal flag/default effect |
| Per-context lifecycle record | `agent-turn-lifecycle-state.ts` | Lifecycle-status | Transformer needs isolated deterministic state logic | Yes | Yes | Public runtime/session model |
| Nullable command turn meaning | `agent-run-command-types.ts` + registry transitions | Command services | Pending, identified, and anonymous are semantically distinct | Yes | Yes | Public transport enum or provider-specific state |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentTurnLifecycleState` (`activeTurn` discriminated union, `retiredTurnIds`, `lastStatus`) | Yes | Yes | Low | Do not add transcript/tool state; test every explicit public status |
| Turn ID resolver result (`string \| null`) | Yes | Yes | Low | Keep normalization at one boundary |
| `AgentRunErrorEvidence` (`TURN_DIAGNOSTIC(turnId)` / `TURN_TERMINAL(turnId)` / `RUNTIME_GLOBAL`); resolver may return `null` | Yes | Yes | Low | Correlation and effect are independent validated fields; invalid content is diagnostic-only |
| `AgentErrorNotificationClassification` (`turn+diagnostic` / `turn+terminal` / `runtime+terminal`) | Yes | Yes | Low | Discriminated union makes runtime diagnostic and missing-effect calls unrepresentable |
| Existing `AgentStatusPayload` | Yes | Yes | Low | Do not add turn fields for this task |
| `AgentRunCommandTurnAssociation` (`PENDING_IDENTITY` / `IDENTIFIED` / `AWAITING_ANONYMOUS_START` / `ANONYMOUS_ARMED`) | Yes | Yes | Low | Keep internal; `turnId` is populated only for identified association |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event-turn-id.ts` | Agent execution domain | Canonical event identity | Export `resolveAgentRunEventTurnId` | Small reusable domain normalization | AgentRunEvent |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-error-evidence.ts` | Agent execution domain | Canonical error evidence | Export tight diagnostic/turn-terminal/runtime-global union and strict resolver | One provider-neutral correlation/effect contract | Turn ID resolver + AgentRunEvent |
| `.../events/agent-run-event-dispatch-queue.ts` | Agent execution events | Per-run order | Queue pipeline+dispatch tasks and delete drained tails | One ordering concern | Promise tail pattern |
| `.../events/dispatch-processed-agent-run-events.ts` | Agent execution events | Thin dispatch facade | Enqueue the entire existing pipeline+listener operation | Existing common entry | Dispatch queue |
| `.../events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Lifecycle-status | Internal state machine | Active union/retired transitions, all explicit statuses, mismatch handling, and recovery eligibility | Nontrivial pure lifecycle concern | Turn ID resolver/status type |
| `.../events/processors/lifecycle-status/lifecycle-status-event-transformer.ts` | Lifecycle-status | Transformer boundary | Ordered observation, WeakMap state, non-status preservation, rejected-status omission, zero/one final fallback | Replacement owner remains concise and can replace arrays | Internal state + error resolver |
| `.../events/default-agent-run-event-pipeline.ts` | Agent execution events | Pipeline composition | Register lifecycle transformer first and remove old processor registration | Composition only | Existing processors |
| `.../domain/agent-run.ts` | Agent run domain | Effective snapshot | Observe only `AGENT_STATUS`; preserve local explicit startup/termination | Removes duplicate policy | Status payload |
| `.../services/agent-run-command-types.ts` | Command services | Association shape | Add internal discriminated command-turn association to record | Makes null-ID ambiguity impossible | Existing command record |
| `.../services/agent-run-command-registry.ts` | Command services | Latest association owner | Atomic association transitions; expose current record per callback | Existing immutable record owner | Command association type |
| `.../services/agent-run-command-coordinator.ts` | Command services | Evidence/settlement owner | Sequence pending lifecycle/turn-terminal evidence, ignore diagnostics, reconcile result/start, reload current record, settle matching terminal/global evidence | Existing command owner | Registry + turn/error resolvers |
| `.../backends/claude/session/claude-session.ts` | Claude runtime | Native lifecycle/error owner | Capture local turn ID before failure mutation; guard delayed A while B; classify session-global failures | Cause and synthetic ID are available here | Canonical error fields |
| `.../backends/claude/events/claude-session-event-converter.ts` | Claude adapter | Canonical batch conversion | Preserve correlation/effect fields; diagnostic is content-only; emit terminal/global `ERROR` before post-mutation status | Existing Claude event boundary | Session event |
| `.../backends/codex/thread/codex-thread-notification-handler.ts` + `codex-thread.ts` | Codex runtime | Native lifecycle/error owner | Capture wire/current turn ID before clear, guard mismatch, and mark client/thread-global failures | Native state and provider notifications meet here | Canonical error fields |
| `.../backends/codex/events/codex-thread-event-converter.ts` + `codex-thread-lifecycle-event-converter.ts` | Codex adapter | Canonical batch conversion | Classify diagnostic/turn-terminal/global; emit authoritative ERROR first; synthesize effect-aware ERROR for error status-change source | Existing Codex conversion boundary | Thread event/error resolver output |
| `.../backends/autobyteus/events/autobyteus-stream-event-converter.ts` | AutoByteus adapter | Native active turn/error guard | Replace boolean state with turn-aware state; preserve effect; diagnostic uses null hint/no mutation; terminal/global mutates; mismatch is rejected | Existing stream repair owner | Canonical payload turn/error ID |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | AutoByteus SDK stream contract | Error payload | Add validated `error_scope`, `error_effect`, and conditional `turn_id` to `ErrorEventData` | Existing error payload owner | Provider/server policy |
| `autobyteus-ts/src/agent/events/notifiers.ts` | AutoByteus SDK notifier | Error publication | Require one structured classification object with no default effect | Existing error notifier owner | Current-command inference |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | AutoByteus turn outcome | Terminal authority | Publish `TURN_TERMINAL(B)` only in non-interruption catch returning `failed`; inner precheck detail remains diagnostic | Sole supported failed-turn outcome owner | Phase-specific diagnostic policy |
| `autobyteus-ts/src/agent/loop/{llm-phase,tool-phase}.ts` + `agent/pipelines/llm-response-pipeline.ts` | AutoByteus in-turn work | Diagnostic publishers | Publish `TURN_DIAGNOSTIC(B)` for every inventoried caught/continued path | Actual control flow continues/finishes with TURN_COMPLETED | Lifecycle/command mutation |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Frontend stream routing | Content/status dispatch separation | Remove activity set/predicate, repair import, and pre-dispatch repair call; keep timestamp and handler routing | Existing protocol facade is the correct cleanup site | Existing message handlers |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Frontend status projection | Canonical status state mutations | Delete `applyLiveRuntimeActivityProjectionRepair`; retain live status/snapshot/placeholder/cleanup APIs | Makes lifecycle input explicit | `AgentStatus` normalization |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Frontend stream regression | Service behavior | Replace error-clearing expectation with no lifecycle mutation for current activity categories/mismatched-retired-terminal scenarios and canonical `AGENT_STATUS running` recovery | Tests the real dispatch path | Service fixtures |
| `autobyteus-web/services/runStatus/__tests__/agentRuntimeStatusState.spec.ts` | Frontend status unit regression | Status reducer contract | Remove helper repair tests; retain/expand canonical status/snapshot assertions | No unused helper compatibility | Existing context builder |

## Applied Patterns (If Any)

- **State machine:** Internal to `LifecycleStatusEventTransformer`; implements the approved deterministic transition contract.
- **Per-key promise queue:** Internal to processed event dispatch; serializes same-run batches without blocking other runs.
- **Association gate:** Internal command-record state prevents settlement until accepted-result/start evidence arms an identified or anonymous command.
- **Discriminated effect classification:** SDK publisher input and server evidence union separate diagnostic correlation from terminal authority without nullable/boolean combinations.
- **Adapter:** Existing runtime converters continue to translate provider-native lifecycle to canonical events.
- **WeakMap context ownership:** Lifecycle state is scoped to the runtime context object so restored contexts do not inherit stale state.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event-turn-id.ts` | File | Agent event domain | Canonical event turn ID normalization | Shared event identity | Provider wire traversal/status policy |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-error-evidence.ts` | File | Agent error domain | Validate diagnostic/turn-terminal/runtime-global evidence; return `null` for invalid | Shared lifecycle/command semantics | Provider-native cause inference |
| `autobyteus-server-ts/src/agent-execution/events/agent-run-event-dispatch-queue.ts` | File | Event dispatch ordering | Per-run ordered task execution | Next to dispatch facade/pipeline | Lifecycle rules |
| `autobyteus-server-ts/src/agent-execution/events/dispatch-processed-agent-run-events.ts` | File | Thin event facade | Use queue around pipeline+dispatch | Current common backend boundary | Provider branches |
| `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | File | Lifecycle-status internal | Deterministic turn transition state | Existing lifecycle folder | WebSocket/team/UI logic |
| `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.ts` | File | Lifecycle fallback boundary | Replace the batch with delayed content intact, rejected statuses removed, and only approved canonical status | Existing owner | Broad activity-as-start set |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-types.ts` | File | Command association schema | Discriminated internal association state | Existing command contract location | Provider-specific state/public enum |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-registry.ts` | File | Command association owner | Atomic current-record transitions | Existing registry owner | Event buffering/runtime queries |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` | File | Command evidence/settlement | Pending evidence reconciliation, matching armed settlement, and explicit global failure | Existing coordinator owner | Lifecycle state-machine/provider error classification duplication |
| Claude/Codex runtime and converter files named above | File | Respective native/adapter owners | Classify diagnostic/turn-terminal/global from outcome, capture before clear, guard mismatch, emit authoritative error-first | Provider cause, effect, and current ID are local | Command settlement logic |
| AutoByteus server converter plus SDK payload/notifier/turn-phase files named above | File | Native stream contract and adapter owners | Carry explicit error correlation/effect end to end and map each publisher by outcome | Origin must be attached before serialization | Arrival-time current-command inference |
| Server tests mirroring source folders | File | Durable regression coverage | Exact production sequence, ordering, all-runtime boundaries, snapshots/commands | Existing test layout | Live credentials |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | File | Frontend protocol dispatch | Route content/activity without lifecycle repair; route canonical status normally | Existing stream facade | Turn-correlation state/status heuristics |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | File | Frontend status projection | Canonical status/snapshot/explicit overlay utilities only | Existing status owner | Activity-triggered recovery |
| `autobyteus-web/services/{agentStreaming,runStatus}/__tests__/*.spec.ts` focused files named above | File | Durable frontend regression | Prove activity neutrality and canonical status recovery | Existing colocated test layout | Backend transformer emulation/frontend turn state |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | Focused turn-ID and error-evidence helpers only |
| `agent-execution/events` | Main-Line Domain-Control | Yes | Low | Queue and pipeline/dispatch belong together |
| `events/processors/lifecycle-status` | Bounded Local | Yes | Low | State extracted because lifecycle logic is nontrivial |
| Runtime backend folders | Persistence-Provider/Adapter | Yes | Low | Native state edits remain runtime-local |
| `autobyteus-ts/src/agent/{streaming/events,events,loop,pipelines}` | Main-Line Domain-Control/Adapter | Yes | Low | Existing error payload/notifier/origin call sites gain correlation/effect propagation with terminal authority only at outcome owner |
| `autobyteus-web/services/{agentStreaming,runStatus}` | Transport/presentation | Yes | Low | Remove the cross-boundary activity-to-status hook; retain stream routing and canonical status reducer in their existing owners |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Completed-turn activity | `start(A) -> complete(A) -> toolResult(A)` yields statuses `running -> idle`; tool result is delivered with no status | Any tool result derives running | Exact production regression |
| Newer turn protection | `start(A) -> complete(A) -> start(B) -> late complete/activity(A)` remains running for B | Latest-arriving terminal/activity wins | Explains turn identity/retirement |
| Missing explicit status | `TURN_STARTED(A)` alone derives running; matching `TURN_COMPLETED(A)` alone derives idle | Segment text alone derives running | Preserves AutoByteus boundary fallback |
| Companion explicit status | `TURN_STARTED(A), status(running)` yields no derived duplicate; `status(running), terminal(A)` appends one final idle | Batch-wide “any explicit means derive nothing” | Makes mixed batches deterministic |
| Mismatched status/boundary | With B active, `terminal(A), status(idle)` preserves B and emits no status; listeners remain continuously running | Dispatch idle and append running correction later | Enforces R-011 without an outward status oscillation |
| Error recovery | Status-only current snapshot `error while A open -> matching activity(A)` may derive running | Any diagnostic or activity for no/retired turn clears error | Preserves bounded R-010 without treating diagnostic content as failure |
| Recoverable tool diagnostic | `TURN_DIAGNOSTIC(B) -> error ToolResult -> B continues -> TURN_COMPLETED(B)` stays running then idle and completes command | Treat turn correlation as terminal effect | Exact supported MP-002 path |
| Recoverable response/compaction diagnostic | Processor/compaction error is content-only; assistant complete and `TURN_COMPLETED(B)` remain authoritative | Project lifecycle error before normal completion | Covers caught continuation paths |
| Scoped old terminal error | With B active, `TURN_TERMINAL(A), status(error)` preserves content but emits no error status and does not settle B | Attribute old A to current B | Makes delayed failure monotonic and command-safe |
| Matching turn-terminal error | `TURN_TERMINAL(B), status(error)` retires B and fails identified command B once | Let late activity recover a terminal failure or let status-only error settle | Closes genuine failed-turn path |
| Runtime-global error | Explicit client/session loss clears active lifecycle, emits error, and fails the exact current record even while pending | Guess global from missing turn ID | Keeps global authority explicit |
| Dispatch ordering | Same-run batch 2 waits for batch 1 pipeline+listeners; run X and Y proceed concurrently | Fire-and-forget same-run async pipeline calls | Prevents state/output reordering |
| Status ownership | `AgentRun` updates override on `AGENT_STATUS` only | `AgentRun` separately interprets every hint | Removes duplicate policy |
| Pending command identity | `handoff(B) -> terminal(A) -> result(B)` buffers then rejects A; B remains in flight | Null turn ID immediately enables idle fallback | Closes the supported handoff race |
| Anonymous command | accepted no-ID plus anonymous start arms fallback; only a later anonymous terminal/status settles | Accepted no-ID alone makes every idle eligible | Bounds unavoidable turn-agnostic fallback |
| Frontend delayed activity after failure | `AGENT_STATUS error -> delayed activity(A)` renders activity and remains error live; reconnect snapshot is also error | Activity arrival changes frontend error to running | Prevents live/reconnect disagreement and respects retired/mismatched A |
| Frontend exact-B recovery | `activity(B) -> backend-derived AGENT_STATUS running` changes frontend only on the status event | Frontend guesses B/current from activity | Preserves bounded recovery without browser turn machinery |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep segment/tool activity running except Codex late results | Small apparent patch | Rejected | Shared turn-aware rule for all runtimes |
| Add timeout to settle quiet agents | User-visible heuristic | Rejected | Authoritative matching terminal boundary |
| Frontend changes running to idle after final text | Fast visual workaround | Rejected | Correct backend canonical status/snapshot |
| Keep AgentRun hint inference as fallback | Fear of missing status events | Rejected | Lifecycle transformer must emit canonical status for boundary/error fallback |
| Dual old/new processor behavior by runtime | Limit rollout risk | Rejected | One canonical shared state machine; runtime adapters only translate/native-state guard |
| Default every turn-correlated `ERROR` to terminal | Simplifies notifier migration | Rejected | Required diagnostic/turn-terminal/global discriminated classification at the publisher |
| Keep frontend `error -> running` activity repair as a fallback | Appears to recover stale live errors quickly | Rejected | Backend exact-B transformer emits canonical `AGENT_STATUS running`; remove helper/set/predicate and activity-repair tests |

## Derived Layering (If Useful)

`Provider runtime lifecycle -> provider adapter -> ordered canonical event processing -> lifecycle state/fallback -> AgentRun canonical snapshot -> team/transport projections -> frontend canonical status reducer -> status presentation`

This layering is descriptive only. The authoritative boundaries are the runtime lifecycle/error owner, processed-event dispatch facade, lifecycle transformer, command coordinator, and `AgentRun` snapshot.

## Change / Refactor Sequence

1. Add the turn-ID resolver and `AgentRunErrorEvidence` union/resolver with tests for all three valid variants, scope/effect/ID cross-field invalidity, and the prohibition on inferring effect or current B.
2. Add `AgentTurnLifecycleState` tests covering identified/anonymous/retired boundaries, every public status, supersession, duplicates, offline, content-only diagnostics, matching/mismatched turn-terminal failure, runtime-global failure, and status-only exact-turn recovery.
3. Implement `LifecycleStatusEventTransformer` first, test whole-batch filtering/ordering, then atomically remove `LifecycleStatusEventProcessor`, its registration, broad activity set, and append-correction expectations. No pipeline may register both.
4. Add listener-sequence and `AgentRun.statusOverride` tests for old-A/current-B terminal+idle/error/initializing contradictions and for diagnostic(B)+erroneous error companion, proving rejected statuses never become observable while all non-status content remains ordered.
5. Add `AgentRunEventDispatchQueue`; wrap pipeline plus final listener dispatch in the common facade; test same-run serialization, cross-run concurrency, failure continuation, and cleanup.
6. Change `AgentRun` backend observation to update override only from `AGENT_STATUS`; prove non-status diagnostics/hints cannot mutate snapshots.
7. Update Claude and Codex owners to classify diagnostic/turn-terminal/runtime-global from actual outcome, capture ID/effect before terminal mutation, reject delayed terminal A while B is current, and emit authoritative ERROR before post-mutation status. Cover Codex error status-change conversion.
8. Replace the AutoByteus notifier's positional API with the structured classification input; extend `ErrorEventData`; update every inventoried caller exactly as the publisher table specifies. Test recoverable tool error, prepare/stream response, immediate compaction, response-processor continuation, precheck diagnostic followed by outer terminal, and genuine `AgentTurnRunner` failed outcome. Update server conversion so diagnostics never clear active state/status and terminal/global variants do.
9. Add discriminated command association and atomic registry methods. Commands begin `PENDING_IDENTITY`; no nullable-ID fallback remains.
10. Refactor `AgentRunCommandCoordinator` to ignore diagnostics, buffer only eligible lifecycle/turn-terminal evidence, reload current record, reconcile result/start, and settle matching terminal/global evidence. Test delayed terminal A before/after B capture, fast turn-terminal B before result, recoverable diagnostic B then completion, global failure while pending, result-after-global no resurrection, mismatch, and anonymous arming.
11. Run server unit/integration coverage for lifecycle transformer, pipeline/dispatch, all runtimes, AgentRun, command services, mixed-team snapshots, and WebSockets; run AutoByteus SDK tests for the complete publisher inventory and serialized fields.
12. Remove `LIVE_RUNTIME_ACTIVITY_MESSAGE_TYPES`, `isLiveRuntimeActivityMessage`, and `applyLiveRuntimeActivityProjectionRepair` plus their imports/calls. Update the two focused frontend suites to prove every current activity category preserves lifecycle, mismatched/retired/post-terminal/global-failure activity cannot recover error, explicit canonical `AGENT_STATUS running` performs exact-B recovery, and live/reconnect projections remain aligned. Run the broader frontend status/streaming/team-row suites to prove presentation/colors/contracts are unchanged.
13. Remove obsolete helpers/assertions and verify no old lifecycle processor, broad backend activity opener, frontend activity-to-status hook, AgentRun hint path, unclassified supported error publisher, scope-implies-terminal branch, nullable command fallback, or begin-time observer closure remains.

## Key Tradeoffs

- **Turn state in shared transformer versus publishers/adapters only:** Shared state is required for filtering/fallback; native publishers still own actual continuation/outcome and therefore diagnostic-versus-terminal classification. Responsibilities remain distinct: origin truth/effect versus provider-neutral reconciliation.
- **Retired ID set versus timeout/window:** Retaining IDs for the runtime-context lifetime provides deterministic idempotency without a quiet-time guess. WeakMap context ownership prevents cross-restore/global retention.
- **Queue versus relying on JavaScript callback order:** Callback invocation order does not guarantee completion/dispatch order when pipeline work awaits asynchronous processors. A per-run queue makes state mutation and outward delivery deterministic with limited scope.
- **No public status turn ID:** Avoids unnecessary status-schema expansion. Boundary/error evidence carries identity and explicit effect, while status remains a snapshot rather than a turn record.
- **Filter rejected status instead of correction-after-dispatch:** Replacement-array transformation is a larger internal change than append-only processing, but it is the only way to keep sequential listeners and snapshots monotonic. Non-status diagnostic/content events remain untouched.
- **Reject turn-agnostic idle over identified activity:** This can preserve running when a faulty provider omits the matching terminal, but it is the only choice consistent with R-011. Runtime adapters must emit the matching boundary; the transformer removes an uncorrelated snapshot rather than exposing it and correcting later.
- **Explicit correlation and effect versus scope-only fallback:** The SDK/runtime changes are broader than adding a turn ID, but scope cannot say whether B continues. Structured diagnostic/turn-terminal/global classification prevents both delayed-A failure and recoverable-diagnostic failure. Old incomplete content is diagnostic-only.
- **One structured notifier versus parallel diagnostic/failure methods:** A required discriminated notification object keeps one delivery boundary while making invalid combinations unrepresentable. Parallel methods would duplicate serialization and permit drift; positional/default effect would recreate the bug.
- **Pending evidence replay versus settling immediately:** A small lifecycle/turn-terminal accumulator preserves fast completion/failure before result capture. Diagnostics and ordinary activity are never buffered because they have no settlement authority.
- **Anonymous fallback versus forcing public IDs:** Supported AutoByteus commands may return no result ID. Positive anonymous active evidence plus sequence arming bounds status-only fallback without changing the transport contract; identified runtimes receive strictly stronger matching.
- **Frontend cleanup without frontend lifecycle machinery:** Backend correction remains the sole exact-turn authority across live/snapshot/standalone/team paths. Deleting the uncorrelated activity repair is required to consume that truth consistently; adding browser turn IDs, timers, or replacement heuristics is rejected.

## Risks

- A supported boundary missing turn identity and a turn-agnostic idle status cannot safely close an identified current turn. A matching identified terminal (or runtime-global offline) is required; tests must codify this conservative rule and adapters must preserve IDs when available.
- A turn-agnostic explicit idle/initializing event can be contradictory while an identified turn is active. The transformer removes it before processors/listeners; listener-sequence and snapshot tests must prove there is no transient state.
- A publisher that classifies from event name rather than actual control-flow outcome can fail B on a recoverable tool/response/compaction diagnostic. The AutoByteus inventory and exhaustive notifier call-site search are implementation gates.
- A runtime owner that clears native identity before classifying a terminal error can make B failure uncorrelatable. Capture-before-clear and authoritative-error-first/status-second tests are required per runtime; diagnostics must not mutate at all.
- Missing scope/effect must never be interpreted as terminal/global. Such events remain diagnostic-only and may expose a publisher missed by the audit.
- `LlmPhase.pre_llm_check` intentionally produces diagnostic detail before the outer runner's sole terminal event. Tests must prove only the latter changes lifecycle/command and failure is recorded once.
- A runtime adapter may currently emit an activity payload without turn identity. That content remains deliverable; it simply cannot perform lifecycle recovery/opening.
- Queue failures must not permanently poison a run's tail. The queue must continue after a rejected task while returning the original failure to that caller and cleaning drained entries.
- Retired turn IDs grow with a long-lived runtime context. This is accepted for deterministic semantics and is bounded by runtime-context lifetime; implementation should store only normalized IDs and no event payloads.
- Removing `AgentRun` hint inference can expose a backend path that bypasses the default pipeline. Source audit indicates all supported backends use `dispatchProcessedAgentRunEvents`; tests must enforce this assumption.
- AutoByteus team rebroadcast uses cached converters per member; converter state tests must cover the team path to avoid restoring stateless behavior.
- An anonymous runtime cannot distinguish a truly delayed anonymous terminal from the current anonymous turn after arming. The design minimizes this unavoidable ambiguity by requiring accepted no-ID result plus positive active evidence and by rejecting all pre-arm terminal/status evidence; no such ambiguity is permitted for identified commands.
- Removing the frontend repair can expose a backend path that fails to emit canonical exact-B recovery. That is intentional evidence of a producer defect, not a reason to restore browser inference. All supported backends use the default transformer/dispatch boundary, and focused live-status plus reconnect tests must prove convergence.
- An ordinary activity handler could later reintroduce a direct `currentStatus` write. Service-level coverage across the current activity type set and a source audit for activity-repair symbols/status writes are implementation gates.

## Guidance For Implementation

- Process source events in their original order; do not use batch-wide `some(active) ? running : some(idle)` precedence. Build a replacement array, copy every non-status event, omit rejected statuses, and emit at most one final derived fallback.
- Normalize turn identity through `resolveAgentRunEventTurnId` and the complete error union through `resolveAgentRunErrorEvidence`; never infer ID, scope, or effect from lifecycle/status/current command.
- Maintain at most one active turn through the discriminated union. A new identified non-retired start supersedes/retires the prior active ID; an anonymous start cannot supersede an identified turn. Matching terminal retires and clears it. Retired IDs never become active again within that runtime context.
- For missing IDs, use an explicit anonymous marker internally; do not equate `null` with every identified turn. Apply every explicit status exactly as specified in the AR-001 table.
- Ordinary activity must always remain in the output event stream. It may derive recovery only when last status is error and its normalized turn ID matches the current active identified turn.
- Explicit `running` opens/retains anonymous only when no identified turn exists; idle/initializing cannot close identified B. Diagnostics never mutate. Matching turn-terminal and runtime-global error retire/clear B; status-only error may retain B for bounded exact-turn recovery. WeakMap ownership handles collection.
- Derived status events retain the existing public payload and `can_interrupt: false` fallback semantics.
- Require boundary-or-authoritative-error-first/status-second ordering. A diagnostic has no status companion. Compare last accepted outward status with final state for zero/one derivation.
- Keep runtime-specific changes to actual effect classification, matching active mutation, and identity/effect preservation. Do not duplicate shared retired/status filtering or command policy in adapters.
- In command coordination, never treat `turnId === null` as anonymous, and never buffer/settle diagnostics. Reload the record per callback, keep pending turn-terminal evidence non-settling, arm anonymous only after accepted no-ID result plus active evidence, and allow only explicit runtime-global evidence to fail before association.
- Preserve team member route/path decoration, frontend protocol payloads, public status vocabulary, colors, and activity rendering. In `AgentStreamingService`, ordinary activity updates timestamps/content only; only `AGENT_STATUS`/ack status goes through `handleAgentStatus`. Delete—not deprecate—`applyLiveRuntimeActivityProjectionRepair` and its type set/predicate.
- Minimum durable regression set:
  - exact reported `start(A)/idle/late tool(A)` final idle;
  - `start(A)/complete(A)/start(B)/late terminal or activity(A)` final running B;
  - duplicate boundaries idempotent;
  - all five explicit statuses against none/anonymous/identified state;
  - boundary-first companion status dedupe and mismatched old-boundary/status filtering, with listener sequence and `AgentRun` snapshot never observing rejected idle/error/initializing;
  - boundary-only fallback running/idle;
  - segment/tool activity without an open turn produces no status;
  - status-only error with active B retains exact-B bounded recovery but never settles a command;
  - `TURN_DIAGNOSTIC(B)` from tool error followed by error ToolResult/continued LLM and `TURN_COMPLETED(B)` stays running then idle and completes command B;
  - prepare/stream error response, immediate-compaction error, and response-processor error diagnostics remain content-only through matching completion;
  - genuine `AgentTurnRunner` failed outcome emits `TURN_TERMINAL(B)`, retires B, projects error, and fails command B exactly once; inner precheck diagnostic does not add a second settlement;
  - delayed `TURN_TERMINAL(A), status(error)` while B is current preserves content but exposes no error status and never settles B, before and after result-ID capture;
  - explicit runtime-global error clears lifecycle/fails the exact current command in pending and identified states; delayed accepted result cannot resurrect it;
  - invalid/unscoped error remains diagnostic-only and cannot mutate lifecycle or commands;
  - same-run async dispatch order and cross-run parallelism;
  - AgentRun ignores non-status hints;
  - command B not completed/failed by lifecycle terminal/status/turn-terminal A before or after B result-ID capture;
  - fast lifecycle terminal/turn-terminal B before result capture is replayed only after B association; diagnostics are not replayed;
  - accepted no-ID command remains unarmed until anonymous active evidence, then accepts only later eligible completion;
  - Claude, Codex, and AutoByteus diagnostic/turn-terminal/runtime-global mappings plus standalone and mixed-team snapshots converge;
  - delayed activity is still emitted to normal consumers;
  - frontend segment/tool/todo/inter-agent/system-task/turn-start activity never changes lifecycle from error (or any other status), while handlers still receive/render it;
  - explicit canonical backend `AGENT_STATUS running` changes frontend error to running for legitimate exact-B recovery;
  - mismatched/retired activity and terminal/global error followed by delayed A/B activity remain error live and after reconnect; no `applyLiveRuntimeActivityProjectionRepair`, live-activity status set/predicate, or import/call remains.
