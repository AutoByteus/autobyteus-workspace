# Design Spec

## Current-State Read

The native tool protocol has a clear call/result contract, but the lifecycle currently has a gap between recording a model-emitted `PendingToolInvocationEvent` and producing the matching `ToolResultEvent`. `AgentTurnRunner` emits the pending event before `ToolPhase.run`; `ToolPhase` then awaits preprocessing, preparation, approval/external result, or native tool execution. Several of those awaits have no wall-clock bound. If the promise never settles, the raw trace contains a call but no result and the turn never reaches `ToolContinuationReadyEvent` or normal settlement.

The captured Article Writing Team run proves this gap: `generate_image` call `call_3f8b340038294116a197625f` is the final raw-trace event, with no result/error event. The trace does not prove whether dispatch, client creation, provider generation, or media transfer began. The persisted working-context snapshot contains the assistant tool call without a matching tool-result message. On restart, `WorkingContextSnapshotBootstrapper` invokes strict snapshot validation before protocol repair; the incomplete protocol therefore fails bootstrap, which emits `AgentErrorEvent` and prevents the team from accepting a follow-up.

Existing code already has the correct conceptual repair capability in `memory-manager-tool-protocol-safety.ts` and `working-context-tool-protocol-repairer.ts`, but the repair currently runs after strict snapshot validation and represents synthetic recovery as an interruption-content result without a terminal `tool_error` raw-trace result. The design extends this existing owner rather than introducing a parallel memory-repair subsystem.

## Intended Change

Make terminal tool results and logical-agent recoverability explicit invariants:

1. Every registered native tool invocation receives exactly one terminal `ToolResultEvent` when it completes, fails, is explicitly interrupted, or is reconciled after execution-unit interruption. No universal wall-clock deadline is imposed on every tool call.
2. The touched media capability has an explicit bounded-operation policy, and its child `AbortSignal` is propagated to providers and transfers where supported. This ticket does not add a universal runtime timeout or redesign unrelated execution behavior.
3. A persisted call without a result is repaired cause-independently. Recovery preserves the original call and arguments, appends one matching terminal tool-error result, repairs the working context, and records an idempotent recovery marker.
4. Snapshot bootstrap performs envelope/deserialization and protocol repair before strict post-repair validation. A repairable incomplete tool protocol therefore does not become `AgentError`.
5. Tool failures remain visible as tool errors, while the logical agent returns to `IDLE`/ready after the failed turn or recovery. `AgentErrorEvent` is reserved for genuinely unrecoverable bootstrap/runtime state, not a recoverable missing tool result.

## Architecture Finding Resolutions

### ARCH-DES-001 — Media duration policy without a universal tool timeout

**Owner.** The common runtime owns cancellation propagation, but it does not own a universal wall-clock timeout. `MediaGenerationService` owns the duration policy for the synchronous media capability in this ticket; unrelated capability policy is outside scope.

- A bounded external operation, specifically synchronous image-provider generation and media transfer in this ticket, uses a capability-owned deadline. That deadline bounds the external media operation, not the logical agent or arbitrary business work.
- Unrelated behavior is preserved and is outside this ticket; no runtime-wide watchdog or new capability contract is introduced here.

**ToolPhase behavior.** `ToolPhase` starts no generic timer. It preserves the normal tool-result path for success, provider rejection, explicit cancellation, and dispatch/preparation errors. It links the turn abort signal to a child operation signal and ensures one terminal result when the operation settles or is interrupted. If the process or worker stops before settlement, persisted orphan repair is the terminalization path on the next bootstrap.

**Synchronous media policy.** `MediaGenerationService` is the mandatory duration-policy owner for synchronous `generate_image`; this capability is never unbounded. It resolves `MEDIA_OPERATION_TIMEOUT_MS` from explicit internal media operation options -> server setting `MEDIA_OPERATION_TIMEOUT_MS` -> `DEFAULT_MEDIA_OPERATION_TIMEOUT_MS = 300_000` milliseconds. Values are normalized to an integer in the inclusive range `10_000..3_600_000` milliseconds; invalid values fall back to the next level and emit one configuration diagnostic. The timer starts immediately before media model resolution/provider initialization and covers provider generation, returned-media transfer, and cleanup required before media settlement. It is cleared on success, provider rejection, or explicit cancellation. This policy is not exposed as `AgentConfig.toolExecutionTimeoutMs` and is not applied to unrelated tools.

The media service passes the remaining media deadline and child `AbortSignal` to provider/download transports where supported. If the media promise does not settle before the media deadline, the service revokes its lease, observes late settlement, and returns one ordinary terminal media tool error. This is a capability-owned synchronous bound, not a logical-agent watchdog.

**Scope boundary.** This ticket does not change unrelated execution behavior; it only ensures that no universal runtime timeout is added while implementing the bounded media policy.

### ARCH-DES-002 — Raw-trace-first convergent persistence protocol

The raw trace is the canonical append-only evidence authority; the v5 working-context snapshot is a derived LLM projection. No cross-store transaction is assumed. Repair uses an explicit convergent protocol:

1. Build a deterministic repair plan sorted by `(turnId, toolCallId)`.
2. Re-read the raw trace interaction index. For each identity, skip repair if a terminal raw `tool_result` already exists.
3. Append the canonical synthetic raw `tool_result` with `toolResult: null`, `toolError`, original `toolName`, `toolCallId`, `toolArgs`, source event `WorkingContextToolProtocolRecovery`, and correlation `native-tool-recovery:${turnId}:${toolCallId}`. The append is flushed before proceeding; duplicate identity/correlation is treated as already committed.
4. Rebuild/repair the working context using the raw terminal result facts, then write the v5 snapshot through its existing temp-file-and-rename store path. The snapshot write happens only after all planned raw results are durable.
5. If the process crashes after raw append but before snapshot replacement, the next bootstrap sees the canonical raw result and converges the snapshot to it without appending another raw result.
6. If the process crashes before raw append, the old snapshot remains the source to inspect and the next run retries the same identity. If a partial JSONL tail is found, the raw-trace reader truncates/quarantines only the incomplete final record before rebuilding the interaction index; it does not discard complete prior records.
7. If snapshot replacement fails after raw commit, bootstrap remains in recoverable `BOOTSTRAPPING`/recovery retry rather than claiming ready with an unpersisted projection. After bounded retries, only a storage failure—not the missing tool result—may cross the `AgentErrorEvent` boundary.

The canonical terminal raw result is the single durable authority. A correlation marker may be retained as an operational note, but it is not a second completion representation. A multi-call repair can partially commit raw results; subsequent repair is convergent and completes only the remaining identities. This protocol is one-to-one and idempotent by compound identity.

### ARCH-DES-003 — Operation-owned media staging and publication gate

`MediaGenerationService` creates a per-invocation `MediaOperationLease` before provider execution. The lease contains a random operation token, `(turnId, toolInvocationId)`, final requested path, unique staging path, the mandatory media deadline plus optional transport-deadline metadata, and state (`active`, `revoked`, `published`, `abandoned`). All generated bytes are written to the unique staging path, never directly to the requested final path.

- The lease is revoked immediately on child-signal abort, provider/transport failure, explicit cancellation, or service return.
- Download and provider completion may continue late if a provider ignores cancellation, but late completion can only write its own staging path. Before publication, the service performs a compare-and-set check that the lease is still active and is the current owner for the final path. A revoked/non-current lease deletes its staging file and cannot publish.
- A retry creates a new token and supersedes the old owner for the same final path. The latest active retry may atomically replace the final path according to the existing output contract; a stale retry cannot overwrite it.
- Publication is an atomic rename from staging to final path. Existing valid output is not deleted before the new lease wins publication. A failed or abandoned staging cleanup is bounded by `5_000` milliseconds, logged as cleanup diagnostic, and left under an invocation-specific orphan name for later cleanup rather than blocking the agent.
- Provider/client cleanup follows the owning transport contract and always has a late-rejection observer. Cleanup failure never prevents the guard from returning its terminal tool error after cancellation or provider failure.
- `downloadFileFromUrl` accepts the child signal and optional transport controls, aborts the HTTP stream and write stream where possible, and removes only the current staging file on failure.

This makes late provider completion safe even when cancellation is unsupported: it may waste provider work, but it cannot publish stale or contradictory media.

### ARCH-DES-004 — Concrete recoverable lifecycle/status contract

Add explicit recoverable lifecycle events rather than using terminal `AgentErrorEvent` for recoverable failures:

- `AgentTurnRecoveredEvent(turnId, reason, recoveredToolInvocationIds)` is a lifecycle event whose status derivation is `IDLE` and whose notifier payload is diagnostic/recoverable.
- `AgentRuntimeRecoveredEvent(reason)` is emitted when a worker is restarted successfully after a recoverable worker/runtime fault; its status derivation is `IDLE`/ready.
- `AgentErrorEvent` remains terminal only for strict post-repair snapshot corruption, persistent storage read/write failure after recovery attempts, invalid runtime configuration that prevents construction, or a worker restart/recovery failure. It is not emitted for a provider/transport error, ordinary tool error, orphan repair, explicit interruption, or a recoverable turn exception.

Authoritative transitions:

| Scenario | Authoritative events | Active-turn handling | Status / follow-up outcome |
| --- | --- | --- | --- |
| Live provider/transport error or explicit cancellation | `ToolResultEvent(error)` -> normal tool-result lifecycle; if the LLM cannot continue, `AgentTurnRecoveredEvent` | Complete the invocation batch; clear it after result processing; attach error to history | Normal LLM continuation if available; otherwise `IDLE`; queued/new user input accepted |
| Orphan repair during bootstrap | `BootstrapStartedEvent` -> repair diagnostics -> `BootstrapCompletedEvent(true)` -> `AgentReadyEvent` | No in-memory active turn exists after restart; repaired persisted turn is closed by the synthetic result | `IDLE`/ready; next user input accepted |
| Explicit user interruption | Existing `AgentInterruptRequestedEvent` -> `AgentTurnInterruptedEvent` | Interrupt turn; finalize all unmatched calls as synthetic interruption errors; clear active turn in observer | `IDLE`; next user input accepted |
| Recoverable turn/worker runtime exception | `AgentTurnRecoveredEvent` or `AgentRuntimeRecoveredEvent` | Repair unmatched current-turn calls; settle the turn with outcome `recovered`; clear active turn | `IDLE`; next user input accepted |
| Unrecoverable corruption/storage/runtime failure | `AgentErrorEvent` after recovery attempts and evidence-preserving diagnostic | Quarantine/retain affected state; do not fabricate a successful result | Terminal Error is allowed only here; user receives actionable repair/restart path |

`AgentTurnRunner` catches non-interruption errors through a recovery classifier. Recoverable errors invoke memory protocol repair, emit `AgentTurnRecoveredEvent`, and return a `recovered` turn outcome. `AgentWorker.observeTurnSettlement` clears the settled active turn for `completed`, `interrupted`, `recovered`, and recoverable `failed` outcomes, wakes runtime dispatchability, and never leaves a recoverable turn occupying the active slot. `AgentStatusDeriver` maps `AgentTurnRecoveredEvent` and `AgentRuntimeRecoveredEvent` to `IDLE`; it must not preserve `ERROR` for those events. `AgentRuntime.handleWorkerCompletion` attempts one fresh worker lifecycle after recovering the active turn; only failed restart/recovery crosses to `AgentErrorEvent`.

### ARCH-DES-005 — Canonical artifact consistency

The mandatory persisted-data section and all target file mappings use the same authoritative rules as ARCH-DES-002 and ARCH-DES-004. There is no cross-store transaction claim: raw terminal-result append/flush precedes derived v5 snapshot replacement, and a crash between those stores is repaired by the next convergent bootstrap. The raw terminal result is authoritative; the recovery marker is supplemental only. Exact-once suppression uses the compound `(turnId, toolCallId)` identity; correlation IDs identify the same repair operation but are not an alternative completion key.

The lifecycle design requires concrete event and owner changes, not optional events: `agent-events.ts` defines `AgentTurnRecoveredEvent` and `AgentRuntimeRecoveredEvent`; `agent-turn-runner.ts` classifies recoverable turn failures and emits the turn event; `agent-worker.ts` clears active turns and performs the bounded worker recovery attempt; and `status-deriver.ts` maps both recovered events to `IDLE`/ready. These files and responsibilities are explicit in the final mapping below.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Terminal native tool completion/reconciliation; REQ-001, REQ-003, REQ-009; AC-001, AC-002, AC-009 | LLM emits a native tool call or execution unit is interrupted | Captured raw trace ends at `PendingToolInvocationEvent` for `generate_image` with no result | Preserve an active call until it settles or is interrupted; synthesize a terminal error on explicit cancellation/failure or orphan reconciliation | DS-001, DS-003, DS-004 |
| BEH-002 | User | Tool failure must not poison run; REQ-003, REQ-004; AC-003, AC-004 | User submits a follow-up after tool failure/recovery | Later `continue` rejected because restore/runtime remains Error/non-idle | Complete the tool protocol, settle the turn, derive ready/idle, and accept the next user event | DS-001, DS-003 |
| BEH-003 | Contract | Preserve media contract, mandatory media bound, and propagate cancellation; REQ-001, REQ-002, REQ-005; AC-001, AC-005, AC-006, AC-007 | Native `generate_image`/media tool execution | `MediaAutobyteusTool` drops `ToolExecutionOptions`; media clients/download have no operation control or mandatory completion bound | Forward signal/options through manifest/service/client/transfer; enforce `MEDIA_OPERATION_TIMEOUT_MS` in `MediaGenerationService`; preserve input schema and `{ file_path }` | DS-002 |
| BEH-004 | Operational | Truthful provider/transport failure; REQ-003, REQ-006; AC-002, AC-006 | Provider/model/transfer rejects or is explicitly cancelled | Synchronous errors can become tool errors; a missing result has no terminal result | Normalize provider/transport failures into terminal tool errors without imposing a universal tool deadline | DS-001, DS-002, DS-003 |
| BEH-005 | System | Lifetime-oriented logical-agent recoverability; REQ-008; AC-008 | Worker interruption, restart, or recoverable runtime fault | Bootstrap strict validation failure emits terminal `AgentErrorEvent` for a repairable pending call | Reconcile failed execution unit, preserve agent identity/conversation, derive ready/idle, and accept continuation | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Approval applicability |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/bible-study-trace-probe.md` | Retained cross-run evidence showing that ordinary `edit_file` failures have explicit terminal tool results, while the Article Writing case is an orphaned invocation | Evidence only; no separate intended-behavior approval required |

The user screenshots and primary Article Writing traces remain evidence recorded in `investigation-notes.md`.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement with an immediate bug-fix slice.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: `PendingToolInvocationEvent` has no guaranteed terminal counterpart; `ToolPhase` only relies on explicit turn interruption; media wrapper drops the already-existing signal; snapshot bootstrap validates an incomplete protocol before the existing repair owner can repair it; `AgentErrorEvent` is used for a recoverable restore failure.
- Design response: Establish one terminalization/recovery boundary for success/failure/cancellation/reconciliation, reuse the memory protocol safety owner for persisted repair, propagate child cancellation, and define the bounded media operation without a universal wall-clock timeout.
- Refactor rationale: A global timeout could break unrelated work, while a media-specific transport/cancellation boundary plus generic orphan repair addresses the observed failure without imposing duration policy on unrelated tools.
- Intentional deferrals and residual risk, if any: Exact diagnosis of why the captured call stopped is observationally deferred; the repair must not depend on it. Full provider cancellation guarantees vary by SDK, so explicit cancellation and late-settlement suppression remain necessary where cancellation is unsupported.

## Terminology

- **Native tool call:** A model-emitted tool invocation recorded in the working context/raw trace and expected to have one matching tool result.
- **Terminal tool result:** The single success, ordinary error, denial, interruption, provider failure, or synthetic recovery result paired by `(turnId, toolCallId)`.
- **Orphaned call:** A persisted native tool call with no matching terminal tool result.
- **Synthetic tool error:** A truthful, cause-independent terminal result inserted by recovery, with `result: null` and a non-empty `tool_error`.
- **Logical agent:** The durable conversational identity and run state that must outlive disposable turns, workers, providers, and tool executions.

## Design Reading Order

The design follows the required order: verified current state and intent; behavior/path map; health and persistence decisions; execution and return spines; ownership/boundaries; subsystem allocation; final files/folders; sequence, tradeoffs, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace operation-marker-only synthetic interruption handling with a terminal tool-error result that is recorded in the canonical raw-trace lifecycle and working context. Retain only one recovery owner and one idempotence rule.
- Obsolete path: snapshot bootstrap validating the full strict protocol before invoking repair. It is not retained as a dual path; it is reordered into envelope validation -> repair -> strict validation.
- Obsolete behavior: treating an inserted synthetic result as `tool_error: null` while leaving the raw trace interaction pending. The repaired interaction must be terminal and error-classified.
- No compatibility wrapper or dual execution path is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Agent raw traces (`raw_traces_active.jsonl`/trace corpus) and strict v5 working-context snapshots under each agent memory directory. A representative current shape is an assistant `ToolCallPayload` for `generate_image` with no following `ToolResultPayload`.
- Relevant code-model, serialization, semantic, or physical-store change: Add a normal v5 `ToolResultPayload` with `tool_result: null` and `tool_error`, and append a normal raw `tool_result` trace plus an idempotent recovery marker. No schema version changes.
- Normal reader/writer behavior and representative evidence: `WorkingContextSnapshotSerializer` already serializes/deserializes tool calls/results; `MemoryManager.ingestToolResults` already writes canonical result traces and working-context tool messages; `buildToolInteractions` already classifies a call with a result error as terminal Error.
- Required semantics and invariants under direct use: Original call ID, turn ID, tool name, arguments, and prior evidence remain unchanged; the repaired pair must be accepted by the current LLM tool protocol and be visible as a failure, not success.
- Physical-store, privacy/security, disposal, rebuild, and operational constraints: Use the existing memory managers in a raw-first convergent sequence: append and flush the canonical raw terminal result first, then replace the derived v5 snapshot through its temp-file-and-rename path. Do not claim a cross-store transaction. Preserve the original call and generated files; do not log secrets; suppress duplicate repair solely by compound `(turnId, toolCallId)` identity. A correlation ID may identify the repair operation for diagnostics but is not an alternative completion key.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Existing v5 readers and writers support the repaired shape. A migration would add downtime and risk without semantic benefit; repair is a small idempotent runtime write that preserves the historical call and restores usability.
- Acceptance criteria or design constraints supported by this decision: REQ-003, REQ-004, REQ-009; AC-003, AC-008, AC-009.

### Migration Plan

N/A — no schema migration is required.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004 | LLM native tool call | Next user message accepted | Agent runtime tool lifecycle | Ensures every call has one terminal result and the logical agent remains usable |
| DS-002 | Primary End-to-End | BEH-003, BEH-004 | Media tool invocation | `{ file_path }` or terminal tool error | MediaGenerationService plus provider adapters | Propagates cancellation and normalizes provider/transfer outcomes |
| DS-003 | Return-Event | BEH-002, BEH-005 | Orphaned persisted call | Repaired snapshot/raw trace and ready agent | Memory protocol safety + bootstrap lifecycle | Repairs current and future missing-result states without diagnosing cause |

## Primary Execution Spine(s)

`LLM response -> PendingToolInvocationEvent/raw call -> ToolPhase terminalizer -> tool execution/provider -> ToolResultEvent -> memory/result pipeline -> ToolContinuationReadyEvent -> LLM`

`Runtime restore -> safe snapshot envelope -> orphan repair -> strict post-repair validation -> AgentReadyEvent -> user message`



## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The LLM emits a call. The runtime records it, executes it under the owning tool policy, and guarantees one result when it completes, fails, is interrupted, or is later reconciled. The result enters memory and the continuation builder before the next LLM request. A result error is ordinary tool history, not agent death. | LLM phase, AgentTurnRunner, ToolPhase, ToolResultPipeline, MemoryManager | Agent runtime/tool lifecycle | Status notifications, logs, provider diagnostics |
| DS-002 | The media tool wrapper forwards the child operation signal to `MediaGenerationService`. The service resolves paths/model, starts the mandatory `MEDIA_OPERATION_TIMEOUT_MS` budget, calls the provider, writes the returned media, and cleans up. Provider and transfer operations observe cancellation and capability-owned transport controls; the runtime does not impose a generic deadline. | MediaAutobyteusTool, media manifest, MediaGenerationService, image client, download utility | MediaGenerationService for media sequencing and bound; ToolPhase for terminal cancellation/error path | API keys, model settings, partial-file cleanup |
| DS-003 | On restore, the bootstrapper reads a structurally parseable snapshot without requiring complete tool protocol. It asks memory protocol safety to find unmatched calls, appends one terminal synthetic error result for each, persists the repaired state, then runs strict validation. Bootstrap succeeds and emits ready. | Snapshot store/serializer, MemoryManager, tool protocol repairer, AgentWorker bootstrap | MemoryManager tool-protocol safety | Corrupt snapshot quarantine, repair diagnostics, idempotence |
| DS-004 | A child controller links turn cancellation to the tool operation. On explicit interruption, the guard aborts the child signal, observes late settlement, and returns one synthetic interruption result when needed. | ToolPhase, ToolExecutionGuard, ToolResultEvent | ToolPhase | Late side effects, notifier deduplication |

## Spine Actors / Main-Line Nodes

- `AgentTurnRunner`: loops through LLM and tool phases; must only advance after terminal result events.
- `ToolPhase`: sequences invocations and is the authoritative live terminalizer boundary.
- `ToolExecutionGuard`: composes cancellation, observes late settlement, and produces a synthetic result for explicit interruption or an owned terminalization failure; it does not impose a universal duration.
- `MemoryManager`: owns canonical raw-trace and working-context tool-result persistence.
- `WorkingContextToolProtocolSafety`: derives and applies one-to-one orphan repairs.
- `WorkingContextSnapshotBootstrapper`: restores parseable state, repairs protocol, then validates.
- `MediaGenerationService`: owns media provider/path/write/cleanup sequencing.
- Multimedia clients/download transport: honor the operation signal and stop or safely detach.

## Ownership Map

- `AgentTurnRunner` owns turn sequencing and the rule that tool continuation cannot be built until all results exist. It does not own provider duration policy.
- `ToolPhase` owns live per-invocation terminalization and must return one `ToolResultEvent` for every invocation that settles or is explicitly interrupted.
- `ToolExecutionGuard` owns cancellation composition, interruption diagnostics, late-settlement observation, and result deduplication. It must not own memory persistence or business-duration policy.
- `MemoryManager` owns durable tool call/result traces and working-context projection.
- `WorkingContextToolProtocolSafety` owns matching by `(turnId, toolCallId)`, synthetic result generation, repair idempotence, and recovery markers.
- `WorkingContextSnapshotBootstrapper` owns restore ordering and invokes the memory safety boundary before strict validation.
- `AgentWorker` owns bootstrap lifecycle, active-turn clearing, recovery retry, and status transitions. It emits ready after successful repair and reserves `AgentErrorEvent` for the explicit unrecoverable boundary defined in ARCH-DES-004.
- `MediaGenerationService` owns media operation sequencing; the public media wrapper remains a thin boundary and must not own recovery policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MediaAutobyteusTool._execute` | `MediaGenerationService` and `ToolPhase` | Adapts BaseTool context/options to the server-owned media manifest | Persistence, runtime recovery, provider-specific policy |
| `WorkingContextSnapshotRestoreStep` | `WorkingContextSnapshotBootstrapper` + `MemoryManager` | Integrates restore into bootstrap steps | Its own alternate repair algorithm or direct raw-file mutation |
| `AgentRuntime.submitEvent` | `AgentWorker` | Public event ingress | Bypassing active-turn terminalization or mutating snapshots |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Snapshot strict-validation-before-repair ordering | Rejects repairable incomplete tool protocols before the repair owner runs | `WorkingContextSnapshotBootstrapper` safe-parse -> repair -> strict validate | In This Change | Clean-cut ordering change, not a compatibility branch |
| Operation-marker-only synthetic interruption as the terminal representation | Leaves raw interaction pending and lacks `tool_error` | `MemoryManager.ingestToolResults` with canonical synthetic error + recovery correlation | In This Change | Keep a marker only as supplemental diagnostic if needed |
| Media wrapper’s dropped execution options | Prevents cancellation propagation | `MediaAutobyteusTool` -> manifest -> `MediaGenerationService` options | In This Change | Public tool schema unchanged |
| Provider/download media transport that drops cancellation | Prevents explicit interruption and can leave cleanup unmanaged | operation signal/options in shared multimedia clients and download utility | In This Change | Preserve provider adapters, extend their options |
| Agent-level Error for recoverable turn/tool failures | Makes valid logical agent unusable | terminal tool error + recovered/idle lifecycle path | In This Change | Reserve Error for genuinely unrecoverable state |

## Return Or Event Spine(s) (If Applicable)

### DS-001 normal/error return

`ToolPhase -> ToolResultEvent(success or error) -> ToolResultPipeline -> MemoryManager.ingestToolResults -> ToolResultContinuationBuilder -> ToolContinuationReadyEvent -> LLM`

The error result contains the original invocation ID/name/arguments, `result: null`, and a non-empty error. The continuation builder treats it as a completed tool protocol, allowing the model to decide whether to retry, skip, or explain.

### DS-003 recovery return

`Raw call without result + working-context ToolCallPayload -> repair plan -> canonical ToolResultPayload + raw tool_result(error) -> persisted snapshot -> AgentReadyEvent -> queued/new user message`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ToolPhase`.
- Chain: `invocation -> child AbortController -> preprocess/prepare/approval/external/native execute -> normal result OR provider/error/abort synthetic result -> late-settlement observer cleanup`.
- Why it matters: It makes the terminal-result invariant local and testable without imposing a business-duration deadline on every tool; restart repair covers calls interrupted before a result is persisted.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Status derivation | DS-001, DS-003 | AgentWorker/runtime | Map terminal/recovered events to ready/idle and preserve diagnostic visibility | UI/runtime state | Turning every tool error into AgentError blocks continuation |
| Raw trace correlation | DS-003 | MemoryManager | Correlate recovery result to `(turnId, toolCallId)` and suppress duplicates | Durable evidence/idempotence | Duplicate results or still-pending interactions |
| Provider cancellation | DS-002 | Client adapters | Translate signal to SDK/HTTP cancellation | Resource control | Late requests and side effects |
| Partial artifact cleanup | DS-002 | MediaPathResolver/download utility | Remove only partial current transfer output | Avoid corruption | Deleting prior valid artifacts or leaving corrupt output |
| Diagnostics | DS-001, DS-002, DS-003 | Notifier/logging | Report provider/cancellation/recovery outcomes without secrets | Operational debugging | Leaking prompt/API data or confusing UI status |
| Snapshot integrity | DS-003 | Serializer/bootstrapper | Validate repaired current shape | Safe persistence | Accepting unrelated corruption as recoverable |

## Ownership Boundaries

The authoritative live boundary is `ToolPhase`: it is the only owner allowed to turn an invocation into a terminal `ToolResultEvent`. Individual tools may return/reject, but they cannot leave the phase without a result. The authoritative durable boundary is `MemoryManager` protocol safety: it is the only owner allowed to append synthetic terminal results and repair working context. `WorkingContextSnapshotBootstrapper` coordinates the ordering but never edits raw files directly. Media clients remain provider adapters behind `MediaGenerationService`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ToolPhase.run` | Per-invocation guard, child signal, interruption result, late settlement | `AgentTurnRunner` | Calling `toolInstance.execute` from a turn runner or returning a pending invocation directly | Extend guard/options, not callers |
| `MemoryManager.repairUnmatchedNativeToolCalls` | Matching, canonical raw-first commit, synthetic result construction, snapshot convergence | Bootstrapper, interruption/recovery paths | Direct snapshot JSON mutation or separate raw/snapshot writes by callers | Add one durable repair operation with raw-trace-first convergence |
| `WorkingContextSnapshotBootstrapper.bootstrap` | Safe parse, repair-before-strict-validation ordering | `WorkingContextSnapshotRestoreStep` | Calling strict serializer validation before repair | Add safe envelope validation and post-repair strict validation |
| `MediaGenerationService` | Model/path/provider/staging/publication/cleanup sequencing | Media manifest and MCP adapter | Provider clients writing directly to agent workspace or publishing without lease | Add `MediaOperationLease` and atomic publication boundary |

## Dependency Rules

- `AgentTurnRunner` depends on `ToolPhase` and result pipeline; it must not depend on media clients or memory-file format details.
- `ToolPhase` may depend on runtime interruption primitives and `ToolResultEvent`, but not on `MemoryManager` persistence implementation.
- `MemoryManager` owns durable repair; bootstrapper calls it and does not reimplement matching.
- Media service may depend on multimedia client contracts and path resolver; provider adapters must not depend on agent runtime state.
- Shared multimedia clients accept an operation signal/options but must not create agent status events.
- No caller may bypass the terminalizer by invoking a tool directly during a turn.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ToolPhase.run(invocations, context, turn, notifier)` | Live native tool batch | Returns one terminal `ToolResultEvent` for settled/interrupted invocations | Invocation ID plus active turn ID | Explicit interruption included; no universal timeout |
| `ToolExecutionGuard.run(invocation, operation)` | One live invocation | Child signal, late settlement, synthetic interruption result | `(turnId, toolInvocationId)` | No persistence or business-duration policy |
| `MemoryManager.repairUnmatchedNativeToolCalls(...)` | Persisted tool protocol | One-to-one orphan detection, raw-first commit, snapshot convergence | `(turnId, toolCallId)` | Idempotent; raw trace is canonical |
| `WorkingContextSnapshotBootstrapper.bootstrap(...)` | Snapshot restore | Parse -> repair -> strict validate -> install | Agent ID plus snapshot schema | No direct file edits |
| `MediaGenerationService.generateImage(context,input,options?)` | Media operation | Provider + staging + publication with signal and lease | Agent context plus operation options | Public input/result unchanged |
| `downloadFileFromUrl(url,path,options?)` | Media transfer | Abortable/bounded transfer into operation staging and partial cleanup | Source URL plus staging path | Transport utility |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolExecutionGuard` | Yes | Yes | Low | Keep invocation ID and turn ID in diagnostics/result |
| `MemoryManager.repairUnmatchedNativeToolCalls` | Yes | Yes | Low | Match compound identity, never tool name alone |
| `MediaGenerationService` | Yes | N/A | Low | Keep model/path/provider sequencing here |
| Snapshot bootstrap | Yes | Yes | Low | Validate agent ID and schema envelope before repair |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Live invocation guard | `ToolExecutionGuard` | Yes | Low | Use consistently for cancellation and terminal result; do not add a universal deadline |
| Persisted repair owner | `WorkingContextToolProtocolSafety` / explicit repair method | Yes | Low | Extend existing owner rather than add a second recovery service |
| Synthetic result | `SyntheticToolErrorResult` (internal shape/factory) | Yes | Low | Keep distinct from success result |
| Long-lived run | Logical agent | Yes | Low | Do not equate `AgentErrorEvent` with tool error |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live tool terminalization | `autobyteus-ts/agent/loop/ToolPhase` | Extend | Owns invocation sequencing and already builds error results | N/A |
| Persisted orphan repair | Memory tool-protocol safety | Extend | Already repairs incomplete working-context protocols and writes recovery markers | N/A |
| Snapshot restore | Working-context restore/bootstrap | Extend | Owns strict v5 restore lifecycle | N/A |
| Media cancellation | Multimedia client contracts and download utility | Extend | Existing provider adapters and transport owners are correct | N/A |
| Media operation duration | Media capability configuration | Extend | Keep the mandatory deadline with `MediaGenerationService`; keep runtime cancellation generic | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime/tool loop | Cancellation, terminal result, ready/idle recovery | DS-001, DS-004 | ToolPhase, AgentWorker | Extend | Recovery events provide policy without a universal timeout |
| Memory/protocol safety | Persisted call/result pairing and idempotent repair | DS-003 | MemoryManager | Extend | Current v5 shape remains usable |
| Snapshot/bootstrap | Repair ordering and post-repair validation | DS-003 | Bootstrapper | Extend | Prevent false bootstrap Error |
| Multimedia | Signal propagation, staging/publication lease, transfer and cleanup bounds | DS-002 | MediaGenerationService, clients | Extend | Public media schema unchanged |
| Agent lifecycle/status | Recoverable outcomes, ready/idle derivation, worker restart boundary | DS-001, DS-003 | AgentTurnRunner, AgentWorker, AgentStatusDeriver | Extend | AgentErrorEvent reserved for unrecoverable conditions |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/tool-execution-guard.ts` | Agent runtime/tool loop | `ToolPhase` | Child abort/late settlement/terminal interruption result | Isolates cancellation mechanics | `ToolResultEvent`, `ToolInvocation` |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent runtime/tool loop | ToolPhase | Apply guard to complete invocation | Existing sequence owner | Guard |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | Memory/protocol safety | Repairer | Produce terminal synthetic error repairs | One matching algorithm | Tool identity |
| `autobyteus-ts/src/memory/memory-manager-tool-protocol-safety.ts` | Memory/protocol safety | MemoryManager | Persist repair and idempotence | Existing memory boundary | Repairer |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Snapshot/bootstrap | Bootstrapper | Repair before strict validation | Restore ordering belongs here | Memory API |
| `autobyteus-ts/src/agent/events/agent-events.ts`, `status/*`, `runtime/agent-worker.ts`, `loop/agent-turn-runner.ts` | Agent lifecycle | Runtime status | Concrete recovered events, classifier, active-turn clearing, and worker retry | Existing event/status model | Provider/persistence details |
| `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts`, `media-operation-lease.ts` | Multimedia | Media service | Signal propagation, mandatory media bound, staging/publication lease, atomic publish, 5-second cleanup bound | Existing media owner | Global agent recovery |
| `autobyteus-server-ts/src/agent-tools/media/media-autobyteus-tools.ts` / manifest | Multimedia boundary | Thin wrapper/manifest | Forward options | Existing adapter pair | BaseTool options |
| `autobyteus-ts/src/multimedia/*` and `utils/download-utils.ts` | Multimedia transport | Provider/transfer adapters | Abortable request/stream | Existing transport owners | Operation options |
| Unit test files adjacent to each owner | Test subsystem | Owning module | Deterministic success/hang/repair cases | Tests remain near contracts | Shared fakes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `(turnId, toolCallId)` matching | Existing `tool-call-identity.ts` | Memory/protocol safety | Same identity governs raw traces, repairs, and duplicate suppression | Yes | Yes | Tool-name-only selector |
| Operation signal/capability options | `tool-execution-guard.ts` / multimedia operation options | Runtime/multimedia | Same cancellation intent crosses boundaries | Yes | Yes | A universal timeout object |
| Synthetic tool-error construction | Internal repair/result factory | Runtime/memory | Live and persisted recovery need same message/error semantics | Yes | Yes | Fabricated success or generic free-form message without ID |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolCallIdentity` | Yes | Yes | Low | Use for all matching |
| `ToolExecutionOptions` plus media operation options | Yes | Yes | Low | Keep cancellation runtime-owned; media duration policy remains with `MediaGenerationService` |
| `ToolResultEvent` synthetic error | Yes | Yes | Low | `result=null`, `error` non-empty, original IDs/args retained |
| v5 snapshot `ToolResultPayload` | Yes | Yes | Low | Use existing serializer shape, no new schema |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/tool-execution-guard.ts` | Agent runtime/tool loop | ToolPhase boundary | Cancellation, late settlement, one synthetic interruption result | Local algorithm is independently testable | `ToolInvocation`, `ToolResultEvent` |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent runtime/tool loop | ToolPhase | Invoke guard and preserve normal per-tool diagnostics | Main sequence remains visible | Guard |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | Memory/protocol safety | Repair plan owner | Match orphan calls and build error result messages | Pure repair logic is testable without disk | `ToolCallIdentity` |
| `autobyteus-ts/src/memory/memory-manager-tool-protocol-safety.ts` | Memory/protocol safety | Durable repair boundary | Ingest terminal results, append correlation, persist context | Durable side effects stay in MemoryManager | Repair plan |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Snapshot/bootstrap | Restore boundary | Safe parse -> repair -> strict validation | Ordering is a restore concern | MemoryManager API |
| `autobyteus-ts/src/agent/runtime/agent-worker.ts`, `agent-turn-runner.ts`, `status/status-deriver.ts`, `events/agent-events.ts` | Agent lifecycle | Worker/status/turn | Recoverable event outcomes, active-turn clearing, worker restart attempt, explicit AgentError boundary | Lifecycle changes stay centralized | Provider and persistence details |
| `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts`, `media-operation-lease.ts` | Multimedia | Media service | Signal propagation, mandatory media bound, staging/publication, bounded cleanup | Media sequencing stays owned | Agent status/persistence |
| `autobyteus-server-ts/src/agent-tools/media/media-autobyteus-tools.ts` and `media-tool-manifest.ts` | Multimedia boundary | Thin adapter | Forward `ToolExecutionOptions.signal` | No policy duplication | BaseTool options |
| `autobyteus-ts/src/multimedia/image/*`, audio/video base/client files, `utils/download-utils.ts` | Multimedia transport | Provider/transfer adapters | Signal-aware calls and stream cancellation | Transport-specific details remain local | Shared operation options |

## Applied Patterns (If Any)

- **Terminal-result normalization:** Existing `ToolPhase` error-result construction is extended so provider, cancellation, dispatch, and interruption failures use the same result pipeline as ordinary tool errors.
- **Repair-before-strict-validation:** Parse enough to identify a repairable state, repair it through the owning protocol boundary, then apply strict current-state validation.
- **Idempotent durable repair:** Compound tool identity and a recovery correlation prevent repeated startup from appending duplicate results.
- **Child cancellation scope:** A per-invocation controller links turn cancellation to provider/media work without replacing the parent turn scope or imposing business-duration policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/tool-execution-guard.ts` | Module | ToolPhase/runtime | Cancellation-aware invocation terminalization and synthetic result | Main-line runtime control | Memory-file mutation or provider logic |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Module | ToolPhase | Apply guard across full invocation path | Existing main-line owner | Per-provider timeout branches |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | Module | Protocol safety | Pure orphan repair plan | Existing protocol subsystem | UI/status behavior |
| `autobyteus-ts/src/memory/memory-manager-tool-protocol-safety.ts` | Module | MemoryManager | Durable terminal result and marker | Existing persistence boundary | Direct filesystem calls |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Module | Snapshot restore | Repair ordering | Correct lifecycle boundary | Duplicate repair algorithm |
| `autobyteus-ts/src/agent/events/agent-events.ts` | Module | Agent lifecycle events | Define required `AgentTurnRecoveredEvent` and `AgentRuntimeRecoveredEvent` | Recovered event contracts have one concrete owner | Tool/provider details |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Module | Turn lifecycle | Classify recoverable turn failures, repair unmatched calls, and emit `AgentTurnRecoveredEvent` | Turn recovery belongs with turn sequencing | Worker restart policy |
| `autobyteus-ts/src/agent/runtime/agent-worker.ts` | Module | Worker lifecycle | Clear active turns, wake dispatchability, and perform one bounded worker recovery attempt | Worker owns disposable execution-unit recovery | Provider/tool details |
| `autobyteus-ts/src/agent/status/status-deriver.ts` | Module | Status derivation | Map recovered events to `IDLE`/ready and reserve `ERROR` for unrecoverable outcomes | Status interpretation stays centralized | Recovery side effects |
| `autobyteus-server-ts/src/agent-tools/media/` | Existing folder/modules | Media boundary | Signal propagation through service/wrapper/manifest | Existing owner and compact capability area | Global agent recovery |
| `autobyteus-ts/src/multimedia/` and `src/utils/download-utils.ts` | Existing folders/modules | Provider/transfer | Abortable transport | Correct lower-level owners | Agent status/persistence |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop` | Main-Line Domain-Control | Yes | Low | Guard belongs beside ToolPhase |
| `autobyteus-ts/src/memory` | Persistence-Provider | Yes | Low | Repair stays with protocol/memory owner |
| `autobyteus-ts/src/memory/restore` | Persistence-Provider | Yes | Low | Bootstrap ordering stays isolated |
| `autobyteus-server-ts/src/agent-tools/media` | Main-Line Domain-Control | Yes | Low | Existing media boundary remains compact |
| `autobyteus-ts/src/multimedia`/`utils` | Transport | Yes | Low | Provider and transfer concerns remain adapter-owned |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why the Example Matters |
| --- | --- | --- | --- |
| Missing result | `ToolCall(id=call-1) -> ToolResult(id=call-1, result=null, error="generate_image failed: operation did not complete or was interrupted.")` | Add a free-standing system note and leave the call pending | The LLM protocol requires a matching result identity |
| Repair ordering | `parse envelope -> deserialize -> repair -> persist -> strict validate` | `strict validate -> fail bootstrap -> never repair` | Directly fixes the captured restart failure |
| Live cancellation | `ToolPhase guard -> child abort -> one synthetic ToolResultEvent` | `Promise.race` timeout around every tool | Unrelated execution must not be confused with a failed invocation |
| Idempotence | Key by `(turnId, toolCallId)` and terminal raw result/correlation | Append another error on every restart | Repeated restarts must not corrupt conversation history |
| Agent status | Tool card/error diagnostic plus `AgentIdleEvent`/ready | `AgentErrorEvent` for every tool/provider failure | Tool failure is not logical-agent death |
| Persistence convergence | Raw terminal result flushed first, then v5 snapshot replacement; next bootstrap rebuilds the snapshot from raw authority | Write snapshot first or treat a marker-only note as completion | A crash between stores converges without duplicate or missing terminal results |
| Late media completion | Unique staging path + active lease token + atomic rename to final path | Late provider writes directly to the requested final path | A timed-out retry cannot overwrite a newer retry or prior valid output |
| Recoverable runtime failure | `ToolResultEvent(error) -> AgentTurnRecoveredEvent -> AgentIdleEvent/cleared active turn` | Catch path emits terminal `AgentErrorEvent` and leaves active turn occupied | Follow-up messages remain dispatchable |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep strict validation first and add a special image-only fallback | Smallest apparent patch | Rejected | Generic parse/repair/validate ordering for all native calls |
| Keep operation-marker-only synthetic recovery and infer terminal state later | Existing helper already writes markers | Rejected | Canonical terminal raw result with `tool_error` and idempotent correlation |
| Retry the original provider call automatically on restore | Could recover image output | Rejected | Mark completion status unknown; let the next model/user instruction decide whether to retry |
| Maintain media-specific and generic separate terminalizers | Limits cross-cutting changes | Rejected | Common ToolPhase terminalizer; media only adds signal-aware transport |
| Continue accepting old pending calls as a dual protocol | Avoids editing snapshots | Rejected | Repair existing v5 state directly; no dual-shape runtime |

## Derived Layering (If Useful)

`Agent lifecycle ingress -> ToolPhase terminalization -> tool/media service -> provider transport` with `MemoryManager protocol safety` as the durable off-spine boundary and `Snapshot bootstrap` as its lifecycle entry. Status/notifier output observes terminal results but does not decide recoverability.

## Change / Refactor Sequence

1. Add deterministic identity/error helpers and tests for one-to-one synthetic tool-error construction.
2. Change memory protocol repair to use raw-trace-first convergence: durable terminal raw result, then snapshot projection, compound-identity idempotence, partial-write retry, and multiple-call convergence.
3. Change snapshot bootstrap to safe-parse and repair before strict v5 validation; add tests for the captured shape, repeated bootstrap, partial raw/snapshot progress, and unrelated corruption.
4. Add a live `ToolExecutionGuard` around the `ToolPhase` invocation path for child cancellation, explicit interruption, one terminal result, and late-settlement observation; do not start a generic wall-clock timer.
5. Define and implement `AgentTurnRecoveredEvent`/`AgentRuntimeRecoveredEvent`, `recovered` turn outcomes, active-turn clearing, queued follow-up acceptance, and the explicit `AgentErrorEvent` boundary; test each lifecycle matrix row.
6. Add `MediaOperationLease` staging/publication ownership, atomic final rename, latest-retry token precedence, transport cleanup controls, and late-provider rejection/publication tests.
7. Forward operation options from `MediaAutobyteusTool` through manifest/service and extend provider/download transports to observe signal and capability-owned controls; keep public media schemas unchanged.
8. Run implementation-scoped unit/build checks, then route through code review and API/E2E coverage investigation. The original missing-result cause remains an observability follow-up, not a prerequisite for recovery.

## Key Tradeoffs

- A common cancellation/repair boundary is broader than an image-only patch but does not impose a runtime-wide duration. It repairs calls left incomplete by interruption or server restart without changing unrelated execution behavior.
- A synthetic error may cause the next LLM turn to retry or skip the tool; this is preferable to claiming success or blocking the user indefinitely.
- Provider cancellation is best effort. The guard guarantees agent progress; operation-owned staging and the publication lease prevent an uncooperative provider from publishing stale output.
- Repairing persisted state changes the snapshot/raw trace, but raw-trace-first convergence preserves original evidence and uses the existing schema, avoiding migration complexity and cross-store ambiguity.
- Reserving `AgentErrorEvent` for unrecoverable conditions changes status semantics; tool failures remain visible through tool lifecycle/error diagnostics, while recovered events explicitly derive `IDLE` and clear the active turn.

## Risks

- A provider that ignores cancellation may complete after the user or worker has moved on; media output publication must be guarded by operation ownership/temp-file strategy so late success cannot overwrite a newer retry.
- Cross-store repair is not transactional: raw terminal-result append/flush is authoritative, v5 snapshot replacement follows, and a crash between stores must converge on the next bootstrap without duplicate compound identities or reintroduced pending status. The snapshot store itself continues to use its temp-file-and-rename write path.
- Existing status consumers may assume `AgentErrorEvent` is terminal; update status derivation/notifier contracts and test the UI-visible path.
- Repairing a snapshot with unrelated corruption must not silently accept invalid state; only incomplete tool protocol is auto-repaired, then strict validation still gates bootstrap.

## Guidance For Implementation

- Use `(turnId, toolCallId)` everywhere; never match by tool name alone.
- Make the synthetic error deterministic and explicit: `Tool '${toolName}' failed: operation did not complete or was interrupted before a result was recorded.` Include the original invocation ID in diagnostics, not secrets or full prompt text.
- Persist a canonical `tool_result` raw trace with `tool_error` first, flush it, then replace the snapshot. A raw terminal result is the canonical durable authority; an operation-boundary marker may supplement it but cannot replace it.
- Run protocol repair before `WorkingContextSnapshotSerializer.validate`’s strict finalizer check. Add a narrow safe-envelope validation method rather than weakening strict post-repair validation.
- Ensure `ToolPhase` returns one result for provider/dispatch/cancellation/interruption paths that settle. Do not add a universal timer before preprocessing; preserve unrelated tool behavior outside this ticket. Explicit user interruption remains a distinct interruption outcome, and the next user message must be accepted after settlement or orphan repair.
- Implement `AgentTurnRecoveredEvent`/`AgentRuntimeRecoveredEvent` status derivation to `IDLE`, clear the active turn for recovered outcomes, wake runtime dispatchability, and reserve `AgentErrorEvent` for failed recovery/storage/corruption boundaries only.
- Use operation-owned staging and a compare-and-set lease before publishing media. Never let a late provider write directly to the requested final path. Apply only capability-owned transport/cleanup controls and observe late rejections.
- Forward `ToolExecutionOptions.signal` from `MediaAutobyteusTool._execute`; add optional operation options to the media manifest/service/client methods without changing public tool schemas.
- Attach rejection observers to detached late promises. Never allow cancellation or shutdown recovery to produce an unhandled rejection.
