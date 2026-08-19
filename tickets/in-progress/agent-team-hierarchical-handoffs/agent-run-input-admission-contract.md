# AgentRun Input Admission And Active-Turn Contract

## Artifact Authority

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-run-input-admission-contract.md`
- Artifact type: intended-behavior and design supplement.
- Solution revision: `SR-028` (SR-026 input ownership preserved; SR-027 dependency/capability evidence retained; Claude interrupt spine corrected).
- Trigger: `CRR-086`, `CR-F-048`, and `API-F-025`.
- Related behavior, requirement, and acceptance IDs: `BEH-020`, `BEH-021`, `R-057`, `R-058`, `AC-052`, and `AC-053`.
- Status: `Refined — SR-028 ready for complete architecture re-review`.
- Approval applicability: this supplement closes a downstream Design Impact in already approved ordinary Agent input delivery. It adds no new user-facing tool, address, persistence, provider, or compatibility capability.
- Relationship to the core package: `requirements.md` owns the verifiable behavior; `investigation-notes.md` owns current-path evidence; `design-spec.md` owns the cumulative architecture. This supplement is the focused authority for AgentRun input admission, active-turn selection, sequencing, provider translation, and pending-input settlement.

## 1. Problem And Preserved Intent

Every supported input surface eventually targets one concrete `AgentRun`: standalone browser input, exact-run input, Team member input, `send_message_to`, task-peer communication, application orchestration, external channels, compaction, and skill improvement. The shared boundary currently does not decide what happens when that run already has an active turn. Instead:

- `AgentRun.postUserMessage()` invokes the backend even when `AgentTurnLifecycleState.beginCommand()` refuses a new command token;
- Codex serializes inside `CodexThread` and selects `turn/steer` when a turn is active;
- Claude rejects the same ordinary input while `activeTurnId` is present;
- AutoByteus accepts the message into its own runtime turn-start queue; and
- `AgentRunCommandRegistry` separately rejects a distinct browser/external command while another command is in flight.

The product-visible policy is therefore distributed. `API-F-025` proves the consequence through a supported path: a task-Team Agent sends a valid reverse reply to the exact still-active Claude AgentRun, but the provider-local active-turn guard rejects it.

The preserved product intent is:

1. an active, exact AgentRun remains a valid ordinary input recipient;
2. each input is admitted, ordered, forwarded, and settled once by one provider-independent owner;
3. Codex's established, live-proven same-turn steer behavior remains available;
4. runtimes without same-turn append receive the input in a later turn instead of rejecting it; and
5. Team routing, canonical addresses, task ownership, communication projection, and provider event semantics do not acquire retries or alternate routes.

## 2. Governing Decision

`AgentRun` owns one non-persisted `AgentRunInputAdmissionState`. It is the sole authority for:

- whether a user input is admitted;
- the exact public meaning and timing of `AgentOperationResult.accepted`;
- FIFO order for admitted inputs;
- at-most-once provider dispatch for each admitted input;
- choosing start-now, append-to-active-turn, or wait-for-next-turn;
- associating a forwarded input with a canonical turn;
- draining after terminal turn facts; and
- settling not-yet-forwarded input on interruption, runtime failure, or termination.

Provider backends declare mechanics only. They do not inspect their own active state and choose product behavior. The narrow provider capability is:

```ts
type AgentRunBackendInputCapabilities = Readonly<{
  activeTurnAppend: "supported" | "unsupported";
}>;

type AgentRunBackendInputDispatch =
  | Readonly<{
      kind: "start_turn";
      message: AgentInputUserMessage;
    }>
  | Readonly<{
      kind: "append_to_active_turn";
      turnId: string;
      message: AgentInputUserMessage;
    }>;

type AgentRunBackendInputDispatchResult = Readonly<{
  forwarded: boolean;
  code?: string;
  message?: string;
  turnId: string | null;
  platformAgentRunId?: string | null;
}>;
```

The backend accepts one explicit dispatch intent. It shall not silently convert append to start, start to append, rejection to a queue, or one provider operation to another.

The AgentRun facade remains one method with a narrow internal option rather than exposing its state:

```ts
type AgentRunInputOptions = Readonly<{
  lifecycleObserver?: AgentRunInputLifecycleObserver;
}>;

postUserMessage(
  message: AgentInputUserMessage,
  options?: AgentRunInputOptions,
): Promise<AgentOperationResult>;
```

Ordinary delivery callers omit the option. The command bridge and completion-driven internal runners attach an observer before admission so no synchronous provider event can race observer registration. No caller receives an admission-entry ID, queue handle, state object, or backend reference.

## 3. Public Acceptance Contract

`AgentOperationResult.accepted` means exactly:

> The live recipient `AgentRun` validated the input and accepted sole responsibility for one FIFO, at-most-once forwarding attempt.

It does **not** mean that a provider has completed the turn, that the model has read or acted on the input, or that the turn completed successfully.

The result contract is:

- Valid input admitted while the run is accepting input returns `{accepted:true, ...}` after the entry is committed to the live AgentRun queue. AgentRun supplies no new success code; the operation owner preserves its established code/message (for example `send_message_to` retains `DELIVERED`). `postUserMessage()` schedules the owner drain and does not await provider dispatch before resolving this admission result.
- The result includes a non-null `turnId` only when that same entry is atomically the FIFO head and is claimed as `append_to_active_turn` for the exact current turn. Idle-start, pending-start, queued-behind-another-entry, anonymous-turn, and next-turn admissions return `turnId:null`; their actual association is reported later only through the entry-bound internal lifecycle.
- Invalid typed input returns `{accepted:false, code:"AGENT_RUN_INPUT_INVALID", ...}` without a queue entry; existing caller-owned syntax/content validation remains earlier and retains its codes.
- Input arriving after quiescing/offline/accepted termination begins returns `{accepted:false, code:"AGENT_RUN_NOT_ACCEPTING_INPUT", ...}` without a queue entry.
- Syntax, recipient, topology, exact-run-not-found, task-eligibility, and provider-tool errors that occur before the AgentRun boundary retain their existing operation-owned codes.
- Provider dispatch success or failure after admission is an internal input-lifecycle fact. It does not rewrite the already-returned admission result and does not cause collaboration retry or duplicate communication.

This timing is intentional. A peer's `send_message_to` must not wait for the recipient's current turn to finish: doing so can deadlock two Agents whose active turns are waiting on the same collaboration exchange. It matches the existing AutoByteus semantic that a message is accepted when its live runtime queue owns it.

Accepted Team delivery publishes `COMMUNICATION` and `MEMBER_INPUT` once from the admission result. Later forwarding, turn association, completion, interruption, or failure shall not republish the delivery.

## 4. FIFO And Exactly-Once Invariants

“Exactly once” in this boundary means exactly one terminal disposition and at most one backend dispatch attempt per accepted in-memory admission entry. It does not claim distributed exactly-once delivery, persist the queue, or introduce a second deduplication registry.

The invariants are:

1. `AgentRunInputAdmissionState` assigns a private monotonically increasing sequence to each accepted entry.
2. Entries are considered for dispatch only in sequence order.
3. At most one provider dispatch invocation is in flight for a run.
4. The head entry is dispatched once as either `start_turn` or `append_to_active_turn`.
5. A provider rejection/throw terminates that entry as failed; it is never retried, requeued, or converted to the other dispatch kind.
6. After that terminal disposition, the next entry may be considered if the run still accepts input.
7. A canonical turn terminal settles all forwarded inputs associated with that turn, then allows the next waiting next-turn entry to drain.
8. Existing outer `message_id`/`dedupe_key` owners retain request replay behavior. AgentRun does not create a second persisted message ID or dedupe cache.

The private sequence is runtime coordination, not an Agent address, task identity, public DTO, or persisted field.

## 5. Active-Turn Policy

The one AgentRun policy is:

| Canonical lifecycle at the queue head | Backend capability | AgentRun decision |
| --- | --- | --- |
| no active or pending turn | either | dispatch `start_turn` |
| exact identified active turn | `supported` | dispatch `append_to_active_turn` with that exact turn ID |
| exact identified active turn | `unsupported` | retain the head until that turn is terminal, then dispatch `start_turn` |
| anonymous active turn | either | retain the head until terminal; never guess an append turn ID |
| a start dispatch is pending identity | either | retain later entries until the start is accepted/rejected and canonical lifecycle identifies or terminates it |
| quiescing/offline/terminated | either | reject new input; do not dispatch retained input |

Provider matrix:

| Runtime | Declared append capability | Explicit backend mechanics |
| --- | --- | --- |
| Codex App Server | `supported` | `start_turn -> turn/start`; `append_to_active_turn -> turn/steer(expectedTurnId)` |
| Claude Agent SDK | `unsupported` | `start_turn -> one Claude session turn`; no public active-turn rejection policy |
| AutoByteus | `unsupported` | `start_turn -> runtime user-message submission` only after AgentRun observes no active/pending turn |

Codex steering is retained because current live coverage proves it as supported behavior: a second input is accepted under the same canonical turn ID and both user traces persist under that turn. The provider declares the mechanism; AgentRun selects its use. Claude and AutoByteus use the same AgentRun next-turn rule rather than independent provider queues or rejection branches.

SR-027 independently verified this Claude row against exact current `@anthropic-ai/claude-agent-sdk@0.3.231`. Its public streaming-input messages may declare `priority:"now"|"next"|"later"`, but they contain no exact active turn ID or expected-turn precondition. An isolated live `now` probe interrupted/aborted current work; `next` queued a later provider turn. Neither is `append_to_active_turn`. AutoByteus therefore continues to call Claude only through one-string `query()` for an explicit later `start_turn`; it does not adopt `streamInput`, SDK priority scheduling, provider command lifecycle, or a second Claude input queue. The exact dependency and first-turn MCP contract is authoritative in `claude-agent-sdk-upgrade-contract.md`.

## 6. Internal Input-Lifecycle Contract

The queue entry may carry one in-process observer supplied by the existing command bridge. The observer is attached to that entry; it does not need a second global ID or parse raw Agent events.

```ts
type AgentRunInputLifecycle =
  | Readonly<{ kind: "admitted" }>
  | Readonly<{ kind: "forwarded"; dispatchKind: "start_turn" | "append_to_active_turn"; turnId: string | null }>
  | Readonly<{ kind: "turn_associated"; turnId: string }>
  | Readonly<{ kind: "completed"; turnId: string | null }>
  | Readonly<{ kind: "interrupted"; turnId: string | null }>
  | Readonly<{ kind: "failed"; code: string; message: string; turnId: string | null }>
  | Readonly<{ kind: "cancelled"; code: "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD" }>;

type AgentRunInputLifecycleObserver = (fact: AgentRunInputLifecycle) => void;
```

The observer is internal and non-authoritative outside AgentRun. It is not an `AgentRunEvent`, Team event, WebSocket DTO, persisted history record, or provider callback protocol.

`AgentRunCommandCoordinator` uses this observer to update its existing command record. It no longer subscribes once per command to raw AgentRun events or infers which turn belongs to which command. Multiple distinct commands may be admitted; the registry retains `message_id`/`dedupe_key` replay protection but removes the different-command `RUN_COMMAND_IN_PROGRESS` policy. The status projection may choose the forwarded record first and otherwise the oldest admitted record for presentation, but that read model does not control admission or dispatch.

The existing command/memory observer that records an accepted user trace moves to the `forwarded` fact. Queue admission alone must not persist a provider user trace; a trace is recorded only once the provider accepts the explicit dispatch.

The target command record states are `STARTING` (activation), `ADMITTED` (owned by the AgentRun FIFO), `FORWARDED`, and terminal `COMPLETED | FAILED | REJECTED | CANCELLED`. Distinct admitted records may coexist. Duplicate lookup preserves the existing message-ID/dedupe-key outcome: `ADMITTED` and `FORWARDED` are duplicate-in-progress; terminal records return their corresponding duplicate terminal ACK. `RUN_COMMAND_IN_PROGRESS` is removed from `AgentRunCommandErrorCode`; cancellation uses `AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD`. Provisioning/cleanup asks whether any record is outstanding rather than assuming a singular current record.

## 7. State And Ordering Boundary

The input state and `AgentTurnLifecycleState` are complementary, not competing:

- `AgentTurnLifecycleState` remains the sole authority for active/pending/retired turn facts and Agent status.
- `AgentRunInputAdmissionState` owns only input entries, FIFO sequencing, explicit dispatch selection, and entry-to-turn association.
- Admission reads the lifecycle state under the existing `AgentRunEventDispatchQueue`; it does not copy a second `activeTurnId`.
- `beginCommand()` is invoked only when AgentRun claims a `start_turn` dispatch. Appending to an existing turn does not pretend to begin another turn or emit an initializing status.
- Backend invocation occurs outside the serialized event-queue critical section. Selection/claim and result application re-enter that same queue, so provider I/O cannot deadlock source-event publication.
- After a canonical event batch advances turn lifecycle and listeners receive the ordered event, AgentRun re-enters the admission drain. Thus `TURN_COMPLETED`/`TURN_INTERRUPTED` is visible before the next start is forwarded.

No provider-local input tail, Team-route retry, command-registry busy gate, or browser queue may compete with this state.

### Source-event-before-result ordering

A provider may synchronously emit `TURN_STARTED` before its dispatch promise resolves (Claude does this today). AgentRun therefore claims the FIFO head and registers its observer before leaving the serialized boundary. During the outstanding call:

1. an `append_to_active_turn` claim already owns the exact target turn ID;
2. a `start_turn` claim may record one canonical `TURN_STARTED` turn ID as `observedTurnId` while remaining unforwarded;
3. a canonical terminal for the append claim's exact turn or the start claim's observed turn may likewise be retained as an ordered fact if the provider result has not returned;
4. the successful dispatch result re-enters the queue, must have a null or equal turn ID, then emits `forwarded`, `turn_associated`, and any already-observed terminal disposition in that order; and
5. a conflicting result ID or a rejected result after an observed start is a provider-protocol invariant failure. AgentRun does not retry, invent a second turn, or roll back canonical events; it records one sanitized internal failure and settles the entry once against the observed canonical lifecycle.

Thus the provider call may race its own events, but no event can race entry creation/observer registration, and the next FIFO head cannot dispatch before the current claim is settled.

## 8. Case Data-Flow Spines

### INP-001 — Idle input starts a turn

```text
Caller surface
  -> exact AgentRun.postUserMessage
  -> AgentRunInputAdmissionState validates and admits sequence N
  -> AgentRun selects start_turn from canonical idle state
  -> explicit AgentRunBackend dispatch
  -> provider accepts one start
  -> AgentRun applies forwarded/turn association
  -> canonical provider events flow through the existing AgentRun pipeline/listeners
```

The public call returns the admission result. Provider rejection produces one internal failed disposition and no retry.

### INP-002 — Codex input appends to an exact active turn

```text
Caller
  -> AgentRun FIFO head
  -> AgentTurnLifecycleState = IDENTIFIED(turn-A)
  -> backend capability = append supported
  -> AgentRun selects append_to_active_turn(turn-A)
  -> Codex backend maps exactly to turn/steer(expectedTurnId=turn-A)
  -> forwarded input associates with turn-A
  -> turn-A terminal settles every associated input once
```

`CodexThread` does not inspect `activeTurnId` to choose start versus steer and does not own an input submission tail. A steer failure is not retried as a new turn.

### INP-003 — Claude/AutoByteus input waits for the next turn

```text
Caller
  -> exact active AgentRun
  -> FIFO admits sequence N and immediately returns accepted
  -> active turn remains unchanged; provider receives nothing yet
  -> canonical active-turn terminal enters AgentRun queue
  -> admission owner selects start_turn for sequence N
  -> Claude/AutoByteus backend starts exactly one later turn
  -> forwarding/turn association/terminal settle N once
```

This is the governing path for API-F-025. `student_two` receives an accepted tool result without waiting for `student_one`'s current turn. The reverse reply is projected once, and `student_one` consumes it in the next Claude turn after its current turn terminates.

### INP-004 — Several inputs arrive while one turn is active

```text
inputs N, N+1, N+2
  -> one AgentRun FIFO in admission order
  -> at most one explicit provider dispatch at a time
  -> Codex may append each head sequentially to the same exact active turn
     OR next-turn-only runtime starts N after terminal, waits for N's terminal, then starts N+1
  -> every entry reaches exactly one completed/failed/interrupted/cancelled disposition
```

The command registry may expose several records but does not reorder or reject them as “run busy.”

### INP-005 — Browser/external command activation and observation

```text
browser or external input
  -> AgentRunCommandCoordinator validates message_id/dedupe_key
  -> existing run activation single-flight resolves one exact AgentRun
  -> command registers one per-submission lifecycle observer
  -> AgentRun admits/orders/dispatches
  -> typed lifecycle facts update the command record
  -> ACK/status projection reads that record
```

Run activation remains an outer provisioning concern. Once the run exists, only AgentRun orders input. Concurrent callers waiting for the same activation enter the AgentRun boundary normally; neither activation nor registry selects active-turn behavior.

### INP-006 — Interrupt

```text
interrupt request
  -> exact AgentRun/backend interrupt for the canonical active turn
  -> admitted waiting entries remain FIFO-owned
  -> TURN_INTERRUPTED enters the canonical AgentRun queue
  -> associated forwarded inputs settle interrupted; none is replayed
  -> next waiting next-turn entry drains after the terminal fact
```

An interrupt request or its acceptance alone does not drain the queue; the canonical terminal fact does. Rejected interruption leaves admission state unchanged.

### INP-007 — Accepted termination

```text
terminate request
  -> AgentRun marks input admission quiescing under the serialized boundary
  -> new inputs reject
  -> any already-claimed provider dispatch settles once
  -> backend terminate
  -> accepted termination cancels every not-yet-forwarded entry once
  -> lifecycle/segment/input state releases and run becomes offline
```

Cancellation uses `AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD`. Previously forwarded inputs are not replayed. Public admission results already returned for queued entries are not rewritten; internal command records receive the terminal cancellation fact.

### INP-008 — Rejected termination

```text
quiesce -> backend terminate rejects/throws while run remains active
  -> AgentRun reopens admission
  -> retained entries preserve their sequence
  -> drain resumes from the original head
```

There is no silent loss and no duplicate provider call.

### INP-009 — Restore and runtime-terminal failure

```text
restore
  -> AgentRun reconciles provider lifecycle snapshot
  -> new non-persisted input state starts empty
  -> new input appends only when the restored exact active turn plus capability permits;
     otherwise it waits for terminal

runtime-global terminal error/offline
  -> AgentRun quiesces input
  -> forwarded entries for the failed turn settle failed
  -> every claimed or not-yet-forwarded entry settles failed once with sanitized runtime evidence and turnId:null when unassociated
  -> no automatic retry or restored inbox
```

The queue is intentionally not persisted. Cross-process inboxes, inactive-run resurrection, and crash recovery remain outside Ticket 1.

## 9. Return And Event Spines

### INP-R1 — Public admission result

```text
AgentRun admission decision
  -> AgentOperationResult
  -> exact-run / Team member / application / external caller
  -> operation-owned ACK or Team COMMUNICATION + MEMBER_INPUT
```

Provider adapters cannot construct the public admission result. Pre-AgentRun routing and validation errors remain operation-owned.

### INP-R2 — Internal forwarding lifecycle

```text
AgentRun provider dispatch result + canonical turn events
  -> per-entry AgentRunInputLifecycle observer
  -> command registry/status and memory-forwarding observer
```

This path is in-process only. It creates no second public stream or durable history representation.

## 10. Caller Inventory

Every current input caller continues to end at the same AgentRun boundary:

| Caller | Target behavior |
| --- | --- |
| Team `InterAgentMessageRouter` / mixed member handle | Resolve exact run, admit once, publish accepted Team communication/member input once; no retry |
| global exact-run message router | Preserve exact-run lookup and pre-run codes, then use AgentRun admission |
| standalone browser and external channel command coordinator | Retain command identity/dedupe/activation, consume typed admission lifecycle, remove busy policy/raw-event inference |
| application orchestration | Return from its input command after AgentRun admission; attach the established application/Agent failure observation where later dispatch failure must surface; no provider branch or retry |
| compaction runner | Register its output collector plus per-entry lifecycle observer before admission; provider-dispatch failure/cancellation rejects the run promptly, while canonical output/terminal still owns successful completion |
| skill-improvement session | Register its completion watcher plus per-entry lifecycle observer before admission; dispatch failure/cancellation settles the request instead of waiting for timeout; canonical output/terminal still owns successful completion |
| Team member direct user input | Exact member handle ends at AgentRun admission; publish member input once and remove caller-owned active-run initializing/error policy |

No caller may call a provider session/thread/runtime directly to bypass the queue.

## 11. File And Responsibility Mapping

| Change | Target file or area | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-server-ts/src/agent-execution/input/agent-run-input-contract.ts` | Closed backend capability/dispatch, lifecycle-observer, and stable rejection-code types; public success still uses existing `AgentOperationResult` |
| Add | `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` | Private FIFO entries, sequence, state transitions, dispatch selection, turn association, quiesce/cancel/reopen |
| Modify | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Own the state; make every input enter it; coordinate two-phase dispatch with the existing event queue; return public admission result; notify internal lifecycle/forwarding observers |
| Modify | `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` and AgentRun event dispatch seam | Expose canonical turn facts to the owner and trigger drain after ordered terminal processing; begin a command only for `start_turn` |
| Modify | `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts` | Replace generic provider-selected `postUserMessage` with declared capability plus explicit dispatch command |
| Modify | Codex backend and `thread/codex-thread.ts` | Map explicit start/append to `turn/start`/`turn/steer`; remove `inputSubmissionTail` and active-state selection |
| Modify | Claude backend and `session/claude-session.ts` | Expose start-only mechanics; remove public active-input policy; keep only a defensive impossible-state assertion inside the explicit start primitive |
| Modify/verify | Claude package/client/Agent Tools MCP boundary | Apply the exact SR-027 compatible dependency set; retain one-string query/resume/full-env/selected-executable behavior; set `alwaysLoad:true` only on the intrinsic Agent Tools MCP entry; expose no SDK queue policy |
| Modify | AutoByteus backend | Expose start-only mechanics; server does not rely on the runtime's internal queue for cross-provider policy |
| Modify | `agent-run-command-coordinator.ts`, registry/types/status projection, and run activation seam | Permit multiple distinct command records, preserve message replay identity, consume per-entry typed lifecycle, remove busy rejection and per-command raw-event inference, share activation single-flight |
| Modify | AgentRun command/memory observer | Record input only after provider forwarding, not queue admission |
| Modify | mixed Agent member handle and pre-run status overlay seam | Publish temporary initializing only for genuine pre-materialization activation; after the exact run exists, do not manufacture initializing/error around queued input; publish member input once from admission |
| Modify | application orchestration, compaction runner/collector, and skill-improvement session/watcher | Register any required internal lifecycle observer before admission; distinguish admitted from forwarded/completed and settle dispatch failure/cancellation without provider branches |
| Verify | Team/global routers, other external/browser callers | Depend only on AgentRun; preserve operation-specific mapping and exactly-once public projection |

`agent-execution/input/` is justified because the concern is a bounded AgentRun capability with multiple types/state transitions and provider/command consumers. It is not a generic `common`, `manager`, or cross-domain helper folder.

## 12. Removal Inventory

The target removes:

- the path where `AgentTurnLifecycleState.beginCommand()` returns `null` but `AgentRun` still calls a generic provider method;
- provider-owned start-versus-active-input selection;
- Codex `inputSubmissionTail` as a second sequencing owner;
- Claude's active-turn rejection as product policy;
- reliance on AutoByteus runtime queueing as the server's cross-provider policy;
- `RUN_COMMAND_IN_PROGRESS` rejection for a different input to the same live run;
- singular-in-flight assumptions in command lookup/status projection;
- per-command subscription to raw `TURN_STARTED`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, status, and error events for input association;
- caller-owned active-run `initializing`/`error` manufacture around ordinary mixed-member input; the accepted pre-materialization overlay remains activation-only;
- any Claude-only queue, collaboration-layer retry, provider-specific Team route, start/append fallback, or duplicate communication; and
- any current-runtime alias/compatibility branch introduced for the cut.

Provider primitives may retain defensive assertions that an explicit command is mechanically valid, but those assertions are not reachable selection policy and cannot enqueue, retry, or change dispatch kind.

## 13. Persisted-Data Decision

`Not Affected`.

`AgentRunInputAdmissionState`, private sequence, pending entries, and lifecycle observers are live-process state. They are not added to TeamRun metadata, AgentRun history, task records, communication records, token usage, frontend execution identity, or application SDK contracts. A restored AgentRun begins with an empty input queue and reconciles only the provider's established lifecycle snapshot.

No migration, compatibility reader, dual writer, inbox recovery, or application-data handling is authorized.

## 14. Verification Contract

### Focused source and unit seams

1. AgentRun idle start, exact active append, next-turn wait, anonymous-turn wait, FIFO, one provider call, provider rejection, and later drain.
2. Accepted-result timing proves active next-turn admission resolves before the current turn completes, carries `turnId:null`, adds no AgentRun success code, and preserves the caller operation's established success code/message. A non-null admission `turnId` appears only when that exact FIFO entry is atomically claimed for append; idle/pending/queued admissions remain null until internal association.
3. Codex declares append support and receives only explicit start/append commands; live steer retains the same exact turn ID and two user traces.
4. Claude and AutoByteus declare append unsupported and receive no provider call until canonical terminal; each then starts one later turn.
   The Claude control uses exact SDK `0.3.231` and proves no `streamInput` or `priority` submission occurs in the product path.
5. Append rejection is not retried as start; start rejection is not requeued.
6. Interrupt retains waiting entries and drains only after canonical interrupted terminal; forwarded append entries are not replayed.
7. Accepted termination quiesces, rejects new input, waits for a claimed call, cancels waiting entries once, and clears state. Rejected termination reopens and preserves order.
8. Runtime-global failure settles retained/forwarded entries once without retry.
9. Command registry admits several distinct message IDs, preserves duplicate replay semantics, consumes typed per-entry lifecycle, and has no raw-event association or `RUN_COMMAND_IN_PROGRESS` policy.
10. Memory recording occurs on provider forwarding once, never at queue admission and never twice for an append.
11. A provider test emits `TURN_STARTED` (and a fast terminal control) synchronously before the dispatch promise resolves; observer registration wins, result/event turn IDs agree, lifecycle facts remain ordered, and the next head does not dispatch early. Conflict/reject-after-start is one sanitized invariant failure with no retry.
12. Compaction/skill completion-driven callers fail promptly on dispatch failure/cancellation instead of timing out; successful completion remains canonical-output/terminal-owned. Mixed active-member input emits no caller-manufactured initializing status.
13. Source/AST scan finds no provider active-state policy branch, provider input tail/queue added by the server, collaboration retry, direct provider bypass, caller-owned active-run status policy, or second AgentRun input state.

### Real producer and API/E2E seams

1. Re-run the exact API-F-025 Nested Classroom Claude task-peer reverse reply: the reply is admitted while `student_one` is active, projected once, starts one later Claude turn, and the task submits/reviews successfully.
2. Run the same task-peer path in AutoByteus and prove one later-turn consumption without duplicate communication.
3. Run the Codex path and prove AgentRun selects exact active-turn append, one `turn/steer` occurs, the canonical turn ID is unchanged, and no second turn is fabricated.
4. Exercise several ordered inputs to each runtime and prove FIFO from AgentRun admission to provider invocation and transcript/memory order.
5. Exercise interrupt and terminate with admitted waiting input through standalone and Team boundaries; prove the exact lifecycle/status/ACK result and no duplicate message.
6. Preserve the established imported-package, credential isolation, operational-database, protected-stack, cleanup, and no-skip constraints in `nested-classroom-live-validation-contract.md`.
7. Retain redacted isolated latest-SDK controls showing `priority:"now"` interrupts and `priority:"next"` queues later, while the real API-F-025 product row remains AgentRun-FIFO-owned.

## 15. Forbidden Shortcuts

- Do not fix API-F-025 with a Claude-only wait loop or scheduler.
- Do not always steer merely because Codex can; AgentRun must select from an explicit exact active turn and declared capability.
- Do not make provider adapters inspect active state to choose start/append/queue.
- Do not return `accepted:true` to mean provider completion or block that result on provider dispatch.
- Do not block a peer's tool call until a next-turn-only recipient finishes its current turn.
- Do not retry or fall back from append to start, start to append, or one provider route to another.
- Do not add a Team, collaboration, browser, application, or command-registry input queue.
- Do not substitute the Claude SDK's streaming-input queue, priorities, command lifecycle, or interrupt receipt for the AgentRun-owned FIFO/lifecycle.
- Do not infer command-turn association by racing raw runtime events.
- Do not persist the queue or introduce inbox migration/compatibility behavior.
- Do not republish Team communication/member input when forwarding or terminal facts arrive.

## 16. Design-Health Conclusion

- Change posture: bug correction plus bounded runtime refactor.
- Root cause: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`.
- Refactor required now: yes.
- Governing owner: the exact `AgentRun` input boundary.
- Why this is proportionate: the real product path already converges on AgentRun, the three providers already expose the necessary start/steer/queue mechanics, and one small run-local state replaces provider and command-layer policy without changing addressing, Team task ownership, durable identity, public topology, or migration.
