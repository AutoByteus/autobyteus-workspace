# Design Spec — Agent Input Delivery Simplification

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (design round on the approved SR-003 requirements).
- SR-005 (2026-10-10): base moved to `origin/personal@46e94fdea`, on branch `codex/agent-input-delivery-simplification-v2`. The design is unchanged. File rename since the design base: `agent-collaboration/execution/task/root-task-agent-resource-scope.ts` → `root-task-execution-resource-scope.ts` (`c395e24a5`), with the same `closed()` code. Read every reference to the old name as the new one. All other design-referenced paths are unchanged (see investigation "Re-bootstrap and problem recheck"). R-1: the `FlatTeamAgentExecutionHandle` fence stays, for the reason recorded in the investigation Q5 row.
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-003, approved 2026-10-08. The user delegated the remaining choices to the designer: "You only do the one you think that's reasonable … which will do make the code cleaner"; "You help me to choose … And after that, you will continue." The designer's choices were presented in the conversation before continuing.
- Behavior-defining supplements and their approval references: none.
- Design status: `Ready`.
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/investigation-notes.md` (see "Architecture Investigation Findings").
- Authorities read (design reading gate, 2026-10-08):
  - `.claude/skills/solution-designer/references/architecture-design.md`;
  - `.claude/skills/solution-designer/design-principles.md`;
  - repository `DESIGN.md` (`/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/DESIGN.md`).

  `design-examples.md` was not needed.
- Project design-principle conflicts or discrepancies: none.
  - `DESIGN.md` rule 4 ("preserve guarantees, not machinery") and rule 5 ("remove unnecessary work before adding complexity") directly support this design.
  - The data-migration guideline is not triggered: no persisted shape changes.

## Current-State Read

Teammate delivery (`send_message_to(recipient_address)`, handoffs, same-root `send_message_to(target_agent_run_id)`) runs through the shared `RootCommunicationEngine`, which delegates to one adapter per root kind:

- `StandaloneRootCommunicationAdapter` and `AgentOrgCommunicationAdapter` are line-for-line copies. Their only differences are the history-file envelope, the conflict/failure code prefix and the persistence coordinator they call. Four of their methods only forward injected functions.
- The Team root wraps the same engine in `TeamCommunicationService` (an extra `accepting` flag and the `TEAM_RUN_NOT_ACCEPTING_MESSAGES` pre-check), `TeamCommunicationAdapter`, and a one-shot append plan (`team-communication-message-append-plan.ts`). The plan holds the stricter protocol: the duplicate/open check runs **inside** the root history lock. Standalone and Org check **before** taking the lock.
- Each root persistence coordinator has its own message-commit method:
  - standalone `commitCommunication`, Org `commitCommunication`, Team `commitReservedMessageAppend`;
  - one protocol (lock → write → cancel / latch / finalize);
  - two result styles: indeterminate is thrown in standalone/Org, returned in Team.
- Each root also keeps its own copy of the message envelope (`messages`), refreshed by a `replaceMessages` callback after each commit, next to the engine's own list. That is two owners of the same list.
- OBS-003 defect (reproduced by probe):
  - The engine wraps `reservation.commit()`/`release()` with `assertDeliveryAllowed`, and that runs **after** the durable write, inside the coordinator's post-durability finalize.
  - If the Task closes during the write, the throw becomes a root persistence fail-stop. Fail-stop closes admission and **terminates the whole root** (all three roots: `enterFailStop` → `queueMicrotask(terminate)`).
  - The same happens if the recipient AgentRun stops accepting input during the write. Its reservation commit throws: the fence is closed, or the entry was dropped by a runtime failure or the shutdown fence.
- Dead code:
  - `InterAgentMessageRouter` (no production caller);
  - `TaskAgentExecutionRegistry.reserveInput` (no caller).
- `AgentRunInputAdmissionState.admit()` repeats `reserve()`'s validation before calling it.
- Docs claim `postUserMessage` is the only admission path.

Constraints to respect:
- `AgentRun` input semantics stay unchanged (REQ-002/003). Both entry points are kept.
- Per-root observable outcomes and persisted formats stay unchanged (REQ-008/013).
- The `TeamRun` boundary stays.
- Address resolution is out of scope.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
- Size rationale and supporting evidence:
  - Five subsystems change:
    - `agent-collaboration/execution/communication` (engine, port);
    - `standalone-agent-run-root` (root, coordinator, adapter removal);
    - `agent-org-execution` (root, coordinator, adapter removal);
    - `agent-team-execution` + `services/team-communication` (root, coordinator, delivery, service/adapter/plan removal);
    - `agent-execution/input` (admission validation).
  - Plus dead-code removal (`InterAgentMessageRouter`, a registry method), about 10 test files moved or retargeted, and 7 module docs.
  - About 15 source files change, 5 are deleted and 1 is added.
- Architectural risk: `High`.
- Risk rationale and supporting evidence:
  - The change moves ownership of the history commit protocol from three adapters into the shared engine.
  - It changes the coordinator contract on all three roots' persistence boundaries.
  - It changes post-durability failure semantics (REQ-012: closure no longer fail-stops) in concurrency-sensitive code: lock ordering, reservation lifecycle, Task-closure race.
  - It changes root-state ownership (the message list owner).
  - Blast radius: every agent-to-agent message in every root.
- Escalation trigger if implementation or validation discovers new impact:
  - any persisted-byte difference;
  - any change in a caller-visible code or message, or in event order per root;
  - a need to touch `AgentRun` admission semantics or the `TeamRun` seam;
  - any further post-durability failure kind that is neither "recipient closed" nor a genuine local publication failure.

  Any of these returns a `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `standalone-root-communication-adapter.ts`, `agent-org-communication-adapter.ts`, root constructors | Line-for-line copies; forwarders only | D-1: delete both; roots pass a port object | None |
| Code | `team-communication-*` files, `root-team-run.ts:144-153` | Team wrapper layers and stricter in-lock plan | D-1/D-2: Team uses the same port; plan generalized into the engine | None |
| Code | three persistence coordinators | One protocol, two result styles | D-3: one `commitMessageAppend` contract | None |
| Probe | `probes/task-close-during-delivery.probe.ts` | Closure during the write ⇒ fail-stop ⇒ root terminate | D-4: post-durability closure is a rejection, not a fail-stop | Team/Org by code reading (same shape) |
| Code | `root-task-agent-resource-scope.ts:134`, `send-message-to-dispatcher.ts:85-91` | Closure surfaces to the sender as a thrown `TaskDelegationError` | D-4: same outcome after durability | None |
| Code | root `messages` fields and readers | Duplicate list owner | D-5: engine owns the list | None |
| Code/Test | `InterAgentMessageRouter` usages | Dead | D-6: remove; retarget the test | None |
| Code | `agent-run-input-admission-state.ts:75-100` | Duplicate validation | D-7: `admit()` = reserve + commit + release only | None |

## Intended Change

1. **D-1, one teammate-delivery owner.** `RootCommunicationEngine` owns the whole path from resolved recipient to released input, including the history-commit protocol now spread over three adapters. Each root passes a small `RootCommunicationPort` object with only its real differences:
   - recipient input builder;
   - recipient routing (`reserveRecipientInput`);
   - history commit (its coordinator);
   - committed-message events/presentation;
   - rejection codes and messages;
   - open/identity/scope checks.

   The adapter classes and the Team service/adapter/plan are deleted.
2. **D-2, one commit protocol, the stricter one.** The engine builds a one-shot `RootMessageAppend`. Inside the root's history lock it:
   - checks open, duplicate and Task scope;
   - computes the next message list;
   - after durability: updates the list, commits the reservation, publishes, releases.

   This generalizes the Team append plan to all roots.
3. **D-3, one coordinator contract.** Each persistence coordinator exposes `commitMessageAppend(append)` with the same result type. Each keeps its own lock, file envelope/validation, store and fail-stop latch. Indeterminate finalization is always thrown, as standalone/Org do today.
4. **D-4, REQ-012 fix.** Closure discovered after the durable write is a normal outcome, not a fail-stop:
   - The history record stays (it is durable) and the history event is published.
   - The recipient input is not committed, presented or released.
   - Task-scope closure rethrows the same `TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED")` the sender gets today when the Task closes just before the save.
   - A recipient AgentRun that stopped accepting input returns `{ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT" }`.
   - Only a throw from local list update or publication remains a genuine post-durability failure (fail-stop, as today).
5. **D-5, one owner of the message list.** The engine's list is authoritative. Roots read `engine.getMessages()` for snapshots, package creation and projection; the `replaceMessages`/`replaceSnapshot` callbacks and root `messages` fields go.
6. **D-6, dead code removed.** `InterAgentMessageRouter` (and singleton getter) and `TaskAgentExecutionRegistry.reserveInput`. The router's Claude active-turn-append test is retargeted to the real teammate path.
7. **D-7, validation once.** `AgentRunInputAdmissionState.admit()` keeps only reserve + commit + release; `reserve()` holds the checks.
8. **D-8, docs** describe both `AgentRun` entry points and when each is used, the one delivery owner, the global router's purpose, and the real teammate path.

Not changed:
- `AgentRun.postUserMessage`/`reserveUserMessage` semantics;
- the `TeamRun`/`TeamRunBackend` seam, registries, `FlatTeamExecutionManager`, `FlatTeamAgentExecutionHandle`, `ConfiguredAgentExecutionHandle`;
- address resolution;
- result shapes;
- `GlobalAgentRunMessageRouter` behaviour.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-002/003/004; AC-001..AC-004 | Every input | Two entry points; duplicate validation (inv. Q1/Q2, P2) | Validation once; semantics preserved | `AgentRun` unchanged except `admit()` (DS-004) |
| BEH-002 | Contract | REQ-002/003; AC-003 | Compaction recovery REQ-014/015, SR029 | inv. Q1 | Preserved | Unchanged |
| BEH-003 | Contract | REQ-005 withdrawn; AC-005 | Callers | Two shapes | Preserved | Unchanged |
| BEH-004 | User/System | REQ-007/008/013/014; AC-007/008/013 | `send_message_to`, handoffs | inv. Q4 | One delivery owner; per-root outcomes preserved | DS-001, DS-002 |
| BEH-005 | System | REQ-009; AC-008/009 | Run-ID messaging | inv. Q3 | Global router kept; dead router removed | DS-003 (unchanged path) |
| BEH-006 | System | REQ-006; AC-006/010 | First input, closure, shutdown | inv. Q5 | Preserved | Unchanged |
| BEH-007 | Operational | REQ-011; AC-011 | Docs | Doc rows | Docs updated | — |
| BEH-008 | System | REQ-012; AC-012 | Task DONE/CANCELLED, or the recipient stopping, during a history write | Probe OBS-003 | No fail-stop; closure outcome as before the write | DS-002 (post-durability step) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/task-close-during-delivery.probe.ts` | OBS-003 reproduction | REQ-012, AC-012 | Basis for D-4; template for the new per-root tests | Evidence |
| `followup-cleanup-ticket-brief.md` | Origin brief | All | Context; weak premises dropped (see requirements "Not Pursued") | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` plus one `Bug Fix` (REQ-012).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - **Repeated coordination:** the history-commit protocol is written three times and drifted (in-lock vs before-lock check; thrown vs returned indeterminate).
  - **Empty indirection:** standalone/Org adapter forwarders; `TeamCommunicationService` and `TeamCommunicationAdapter` mostly forward; dead `InterAgentMessageRouter`; unused `TaskAgentExecutionRegistry.reserveInput`.
  - **Duplicate state owner:** the message list is held by both the engine and each root.
  - **Missing invariant:** a recipient-closed outcome after durability is treated as a fatal local failure.
  - Considered and ruled out:
    - authoritative-boundary bypass on the Team side: the `TeamRun` seam is the authoritative Team boundary, so the brief's suggested hop removal there is rejected;
    - shared-structure looseness in result types: REQ-005 withdrawn.
- Root cause classification: `Duplicated Policy Or Coordination` (primary); `Missing Invariant` (REQ-012).
- Refactor needed now: `Yes`.
- Evidence: investigation notes Q4 table and Architecture Investigation Findings; probe.
- Design response: D-1..D-7.
- Refactor rationale: the drift has already produced a real root-teardown defect. Writing the protocol once is the smallest way to fix it once for all roots.
- Intentional deferrals and residual risk:
  - Standalone/Org address-resolution near-duplication (`deliverToAddress`/`deliverToRunId`/`isLive*`) is not touched (out of scope).
  - `TeamRun` keeps three input methods.
  - Both are non-blocking separate-ticket candidates.

## Terminology

- **Port:** the per-root object `RootCommunicationEngine` receives (`RootCommunicationPort`).
- **Append:** one one-shot `RootMessageAppend` the engine hands to a coordinator for one message.
- **Closure after durability:** the sender/recipient Task scope closed, or the recipient AgentRun stopped accepting input, between the durable history write and the reservation commit.

## Section Fill Order

Followed. Sections without applicable content are marked `N/A`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope:
  - both root adapter classes;
  - the Team service, adapter and append-plan file;
  - the three coordinator message-commit methods (replaced by one contract name and type);
  - root `messages` fields and `replaceMessages` callbacks;
  - `InterAgentMessageRouter`;
  - `TaskAgentExecutionRegistry.reserveInput`;
  - duplicate validation in `admit()`.
- No wrappers, aliases or dual paths.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: three message-history files (standalone `{schemaVersion:1, subjectKind:"agent", hostRunId, messages}`, Org `{schemaVersion:1, subjectKind:"agent_org", orgRunId, messages}`, Team `{schemaVersion:1, rootTeamRunId, messages}`); raw traces (`sourceEvent`, `message_id`, `dedupe_key`).
- Relevant change: none to shapes. Envelope construction moves from the adapters into each coordinator, which uses the same validators.
- Normal reader/writer behavior: unchanged stores and validators.
- Required semantics and invariants: append-only list, unique `messageId`, saved-before-eligible.
- Constraints: none.
- Decision: `Not Affected`.
- Rationale: the same bytes are written by the same stores; only the call site that builds the envelope moves.
- Supported ACs: AC-007, AC-013.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-004 | Agent tool call `send_message_to(recipient_address)` / handoff | Recipient AgentRun processes the input; sender gets a result | `RootCommunicationEngine` (delivery), root (resolution), AgentRun (processing) | The unified teammate path |
| DS-002 | Bounded Local | BEH-004, BEH-008 | Engine holds a reservation | Released input or rejection | `RootCommunicationEngine` + root persistence coordinator (lock) | Commit protocol and the REQ-012 fix |
| DS-003 | Primary End-to-End | BEH-005 | `send_message_to(target_agent_run_id)` | Same root: joins DS-001; other root: live-only post | `GlobalAgentRunMessageRouter` | Kept, documented |
| DS-004 | Bounded Local | BEH-001 | `AgentRun.postUserMessage` / `reserveUserMessage` | Admission entry | `AgentRunInputAdmissionState` | Validation once |

## Primary Execution Spine(s)

- DS-001: `Agent tool (send_message_to) -> SendMessageToDispatcher -> member collaboration context -> Root delivery (resolve recipient, live lease) -> RootCommunicationEngine.deliver -> port.reserveRecipientInput -> (registry | TeamRun) -> member handle -> AgentRun.reserveUserMessage -> port.commitMessageAppend (root coordinator, history lock + durable write) -> engine commits reservation -> publish + present -> release -> AgentRun dispatch`
- DS-003: `Agent tool -> SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> (same root: root.deliverExactAgentMessage -> DS-001) | (other root: grant check -> AgentRun.postUserMessage -> inter-agent event)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The root resolves who the address means and takes the live lease. The engine validates the delivery, builds the immutable message record and the recipient input, and holds a reservation in the recipient's queue. It then asks the root to save the message under its history lock. Only after the save does the recipient input become eligible, at which point the history event and recipient presentation are published. | Root delivery, engine, coordinator, AgentRun | Engine (delivery sequencing) | Recipient input builder, recipient routing, events/presentation (root port) |
| DS-002 | `deliver` creates one `RootMessageAppend` and calls `port.commitMessageAppend(append)`. The coordinator, inside its lock: calls `append.prepare()` (open/duplicate/scope checks against the engine list → next list or conflict) → builds and validates its file envelope → writes. If not renamed, it calls `append.cancelBeforeDurability()` and returns `not_committed`. If indeterminate, it latches and throws. If durable, it calls `append.commitAfterDurability()`, which: sets the engine list → publishes the history event → tries the reservation commit (scope check + AgentRun commit) → on success presents and releases → on closure records the closure. The engine then maps the result: accepted / conflict / history-failed / closure. | Engine, coordinator | Engine (append) inside coordinator lock | Fail-stop latch (coordinator) |
| DS-003 | Unchanged; documented. | Router | Router | Grant registry |
| DS-004 | `admit()` = `reserve()` (the only validation) + commit + release. | Admission state | Admission state | — |

## Spine Actors / Main-Line Nodes

Root message delivery (per root, unchanged) → `RootCommunicationEngine` → root persistence coordinator → `AgentRun`.

## Ownership Map

- `RootCommunicationEngine` owns:
  - delivery validation and the accepted-message record;
  - the authoritative message list;
  - the reservation lifecycle (cancel/commit/release);
  - the append protocol semantics (prepare checks, post-durability sequence, closure classification);
  - result mapping;
  - admission closing.
- `RootCommunicationPort` (per root, a plain object built in the root constructor) is a thin boundary. It supplies root facts and side effects only and owns no sequencing.
- Persistence coordinators own the history lock, the file envelope/validation, the durable write, the fail-stop latch, and the finalize-after-durability wrapper.
- `AgentRun` owns input admission (unchanged).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Per-root port object | `RootCommunicationEngine` | Inject root-specific facts and effects | Sequencing, conflict policy, closure policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `standalone-agent-run-root/services/standalone-root-communication-adapter.ts` | Copy plus forwarders | Engine + standalone port object in `standalone-agent-run-root.ts` | In This Change | |
| `agent-org-execution/services/agent-org-communication-adapter.ts` | Copy plus forwarders | Engine + Org port object in `agent-org-run.ts` | In This Change | |
| `services/team-communication/team-communication-service.ts` | Facade: pre-check, flag, snapshot | Engine (notAccepting data, `closeAdmission`, `getMessages`) | In This Change | |
| `services/team-communication/team-communication-adapter.ts` | Forwarders + commit mapping | Team port object in `root-team-run.ts` | In This Change | Team recipient builder mapping moves to `inter-agent-message-runtime-builders.ts` |
| `services/team-communication/team-communication-message-append-plan.ts` | Team-only copy of the append protocol | Engine-owned append (`root-message-append.ts`) | In This Change | |
| Coordinator methods `commitCommunication` (standalone, Org), `commitReservedMessageAppend` (Team), and types `PreparedTeamMessageAppend`, `PreparedTeamMessageCommit`, `TeamMessageCommitResult`, `TeamMessageAppendRejectionCode` | Three variants of one contract | `commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult>` on each coordinator | In This Change | |
| Root `messages` fields, `replaceMessages`/`replaceSnapshot` callbacks | Duplicate list owner | `engine.getMessages()` + per-root envelope function | In This Change | Keep each root's correlation assertion on the root ID |
| Engine release-time `assertDeliveryAllowed` | No await between commit and release | Commit-time check | In This Change | |
| `agent-team-execution/services/inter-agent-message-router.ts` | Dead | Real path (DS-001) | In This Change | Retarget its test; update the architecture-test allow-list |
| `TaskAgentExecutionRegistry.reserveInput` | Unused | `FlatTeamExecutionManager` → handle (existing) | In This Change | |
| Duplicate checks in `AgentRunInputAdmissionState.admit()` | Repeats `reserve()` | `reserve()` | In This Change | |

## Return Or Event Spine(s) (If Applicable)

After commit: `engine -> port.publishMessage(message)` (history event) `-> port.presentRecipientInput(message, input)` (recipient conversation) `-> reservation release -> AgentRun drain`. Order per root is preserved:
- standalone/Org: `{kind:"communication"}` then presentation;
- Team: `COMMUNICATION` then `MEMBER_INPUT`.

In the REQ-012 closure case only `publishMessage` runs.

## Bounded Local / Internal Spines (If Applicable)

DS-002, parent owner `RootCommunicationEngine` (executed inside the coordinator lock):

`deliver -> append(sealed) -> coordinator lock -> append.prepare [open? duplicate? scope?] -> envelope+validate -> write -> (not_renamed: cancelBeforeDurability) | (indeterminate: latch, throw; engine cancels if still reserved) | (durable: commitAfterDurability [set list -> publishMessage -> scope check + reservation.commit -> (ok: present, release) | (closed: record closure, cancel quietly)]) -> engine maps the result`

Why it matters: this is the protocol that had three copies. The REQ-012 fix lives at the `reservation.commit` step.

Append states: `sealed → prepared → (cancelled | committed | closed_after_durability)`. `abandon()` (called by the engine when the coordinator throws before running the append, e.g. already fail-stopped) cancels the reservation only if still `sealed`/`prepared`. This is the existing Team `disposeAfterRootFailStop` and standalone/Org `!reservationCommitted` cleanup, unified.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Recipient input builder (generic: `root-communication-runtime-builder.ts`; Team: `inter-agent-message-runtime-builders.ts`) | DS-001 | Engine via port | Content, metadata, IDs | Persisted IDs differ per root | Engine would encode Team-specific IDs |
| Recipient routing (`reserveRecipientInput`) | DS-001 | Engine via port | Find the recipient handle and reserve | Host/registry/Team topology differs | — |
| History event + presentation | DS-001/002 | Engine via port | Root event contracts | Event shapes differ | — |
| Coordinator fail-stop latch | DS-002 | Coordinator | Root integrity on indeterminate writes | Existing invariant | — |

## Ownership Boundaries

- Root delivery services (`StandaloneRootMessageDelivery`, `AgentOrgRunMessageDelivery`, `TeamRunMessageDelivery`) call `engine.deliver(...)` only.
- The engine calls only its port; the port calls root internals and coordinators.
- Coordinators call only the append they are given; they never touch reservations directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RootCommunicationEngine.deliver` | Append protocol, reservation lifecycle, message list | Root delivery services | Root code committing/cancelling reservations or editing the list directly | Extend the port |
| Coordinator `commitMessageAppend` | Lock, envelope, store, latch | Engine (through the port) | Engine writing files; root calling the store for messages | — |
| `TeamRun` (unchanged) | Flat manager, handles | Team port `reserveRecipientInput` | Port reaching `FlatTeamExecutionManager` directly | — |

## Dependency Rules

- Allowed directions:
  - `agent-collaboration/execution/communication` must not import any root subsystem.
  - Roots import the engine and the port/append types.
  - Coordinators import only the `RootMessageAppend`/`RootMessageAppendResult` types from `agent-collaboration/execution/communication`.
- Forbidden:
  - the engine importing coordinator or root types;
  - the Team root importing generic standalone/Org code;
  - any caller using `reservation.commit()` outside the engine for teammate delivery.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RootCommunicationEngine.deliver(input: RootCommunicationDeliveryInput)` | One teammate message | Full delivery; returns `AgentOperationResult` or throws a scope error | Sender/receiver `CollaborationMemberExecutionIdentity` | Unchanged signature |
| `RootCommunicationEngine.getMessages()` / `closeAdmission()` | Message list / admission | Authoritative list; stop admission | — | Roots build envelopes from `getMessages()` |
| `RootCommunicationPort` | Root facts and effects | See the example below | root identity | Replaces `RootCommunicationAdapter` |
| `<Coordinator>.commitMessageAppend(append)` | One history write | Lock, prepare, write, finalize | — | Same on all three coordinators |
| `RootMessageAppend` | One append | `prepare()`, `cancelBeforeDurability()`, `commitAfterDurability()` | — | Built only by the engine |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `deliver` | Yes | Yes | Low | — |
| `RootCommunicationPort` | Yes (root specifics) | Yes | Low | — |
| `commitMessageAppend` | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Port | `RootCommunicationAdapter` → `RootCommunicationPort` | Yes | Low (it is no longer a class) | Rename file `root-communication-adapter.ts` → `root-communication-port.ts` |
| Append | `RootMessageAppend` | Yes | Low | New file `root-message-append.ts` |
| Coordinator method | `commitMessageAppend` | Yes | Low | Same name on all three |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Append protocol | Team append plan | Extend (generalize into the engine area) | Already the stricter, correct form | — |
| Recipient builders | Existing builder files | Reuse | Persisted IDs | — |
| Fail-stop | Coordinator finalize/latch | Reuse | Existing invariant | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/communication` | Engine, port type, append, generic builder | DS-001/002 | Engine | Extend | |
| `standalone-agent-run-root` | Standalone port object, coordinator method | DS-001/002 | Root | Modify | Adapter deleted |
| `agent-org-execution` | Org port object, coordinator method | DS-001/002 | Root | Modify | Adapter deleted |
| `agent-team-execution` (+ `services/team-communication`) | Team port object, coordinator method, Team builder mapping | DS-001/002 | Root | Modify | Service/adapter/plan deleted |
| `agent-execution/input` | Admission validation | DS-004 | Admission state | Modify | |

## Draft File Responsibility Mapping

See the final mapping (no material changes between draft and final).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Append protocol (3 copies) | `agent-collaboration/execution/communication/root-message-append.ts` | Communication | One protocol | Yes (no root-ID self-check, no file envelope) | Yes (one result type) | A persistence abstraction (the coordinator still owns the file) |
| Commit result (thrown vs returned) | Same file: `RootMessageAppendResult` | Communication | One contract | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RootMessageAppend` | Yes | Yes | Low | `prepare()` returns `{ kind: "append"; messages } \| { kind: "conflict" }` and may throw a scope error |
| `RootMessageAppendResult` | Yes | Yes | Low | `{ outcome: "committed" } \| { outcome: "conflict" } \| { outcome: "not_committed"; cause: Error }`; indeterminate is thrown |
| `RootCommunicationPort.rejections` | Yes | Yes | Low | `{ notAccepting: {code,message}; commitConflict: {code,message}; historyCommitFailedCode: string }` |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-collaboration/execution/communication/root-communication-engine.ts` | Communication | Engine | Delivery validation, record, reservation, append creation, result mapping, list ownership | One owner of DS-001 | Uses append, port |
| `src/agent-collaboration/execution/communication/root-message-append.ts` (new) | Communication | Engine (internal) | One-shot append state machine and its result type | One protocol | — |
| `src/agent-collaboration/execution/communication/root-communication-port.ts` (renamed from `-adapter.ts`) | Communication | Port type | `RootCommunicationDeliveryInput`, `RootCommunicationPort` | Types only | — |
| `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` | Standalone | Root | Builds its port object; envelope from `engine.getMessages()` | Existing root | Port |
| `src/standalone-agent-run-root/services/standalone-root-persistence-coordinator.ts` | Standalone | Coordinator | `commitMessageAppend` (lock, envelope `subjectKind:"agent"`, write, latch, finalize) | Existing | Append |
| `src/standalone-agent-run-root/services/standalone-root-builder.ts` | Standalone | Builder | `getMessages` reads the root snapshot (unchanged call) | Existing | — |
| `src/agent-org-execution/domain/agent-org-run.ts` | Org | Root | Port object; envelope from engine | Existing | Port |
| `src/agent-org-execution/services/agent-org-run-persistence-coordinator.ts` | Org | Coordinator | `commitMessageAppend` (envelope `subjectKind:"agent_org"`) | Existing | Append |
| `src/agent-team-execution/domain/root-team-run.ts` | Team | Root | Builds the engine and Team port (`notAccepting` = `TEAM_RUN_NOT_ACCEPTING_MESSAGES`, codes `TEAM_MESSAGE_*`, Team builder, `requireContainingTeamRun → reserveDirectAgentInput`, events `COMMUNICATION`/`MEMBER_INPUT`); envelope from engine | Existing | Port |
| `src/agent-team-execution/services/team-run-persistence-coordinator.ts` | Team | Coordinator | `commitMessageAppend` (envelope `{schemaVersion, rootTeamRunId}`, `validateTeamCommunicationMessagesV1Payload`, throws `TeamRunPersistenceFinalizationIndeterminateError`) | Existing | Append |
| `src/agent-team-execution/services/team-run-persistence-contract.ts` | Team | Types | Remove Team message-append types | Existing | — |
| `src/agent-team-execution/services/team-run-message-delivery.ts` | Team | Delivery | Calls `engine.deliver` with mapped intent fields | Existing | — |
| `src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Team | Builder | Add the Team recipient-input mapping formerly in the Team adapter | Existing builder home | — |
| `src/agent-execution/input/agent-run-input-admission-state.ts` | Agent execution | Admission | `admit()` without duplicate checks | Existing | — |
| `src/agent-team-execution/local/registries/task-agent-execution-registry.ts` | Team | Registry | Remove `reserveInput` | Existing | — |
| Deleted: 2 adapters, Team service/adapter/plan, `inter-agent-message-router.ts` | — | — | — | — | — |

Exact Team builder mapping moved verbatim from `TeamCommunicationAdapter.buildRecipientInput` (`buildDeliveryEndpointForParticipant` for sender/recipient, same fields).

## Applied Patterns (If Any)

- **Strategy via port object:** the root supplies its specifics to one engine.
- **State machine:** the one-shot append (sealed/prepared/committed/cancelled/closed).

## Target Subsystem / Folder / File Mapping

No new folders. Files as in the final mapping. The new `root-message-append.ts` sits beside the engine in `agent-collaboration/execution/communication/`.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-collaboration/execution/communication` | Main-Line Domain-Control | Yes | Low | Engine and its owned types |
| `services/team-communication` | Mixed Justified | Yes | Low | Keeps store/schema/projection; delivery wrappers removed |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Port shape (types only, illustrative):

```ts
// root-communication-port.ts
export type RootCommunicationRejection = Readonly<{ code: string; message: string }>;
export type RootCommunicationPort = Readonly<{
  root: RootExecutionIdentity;
  initialMessages: readonly CollaborationCommunicationMessageV1[];
  rejections: Readonly<{
    notAccepting: RootCommunicationRejection;      // standalone/Org: COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES; Team: TEAM_RUN_NOT_ACCEPTING_MESSAGES
    commitConflict: RootCommunicationRejection;    // AGENT_ROOT_/AGENT_ORG_/TEAM_MESSAGE_COMMIT_CONFLICT, current messages
    historyCommitFailedCode: string;               // AGENT_ROOT_/AGENT_ORG_/TEAM_MESSAGE_HISTORY_COMMIT_FAILED (message = cause.message)
  }>;
  isOpen(): boolean;
  isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean;
  assertDeliveryAllowed(sender: CollaborationMemberExecutionIdentity, receiver: CollaborationMemberExecutionIdentity): void;
  buildRecipientInput(input: { delivery: RootCommunicationDeliveryInput; message: CollaborationCommunicationMessageV1 }): AgentInputUserMessage;
  reserveRecipientInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult>;
  commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult>;
  publishMessage(message: CollaborationCommunicationMessageV1): void;
  presentRecipientInput(message: CollaborationCommunicationMessageV1, input: AgentInputUserMessage): void;
}>;
```

Coordinator method (standalone shown; Org and Team differ only in envelope, validator, store and error type):

```ts
commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult> {
  return this.withLock(async () => {
    const prepared = append.prepare();                       // may throw a scope error: nothing written
    if (prepared.kind === "conflict") return { outcome: "conflict" };
    const next = validateStandaloneRootMessagesV1({ schemaVersion: 1, subjectKind: "agent",
      hostRunId: this.options.hostRunId, messages: prepared.messages }, this.options.hostRunId);
    const result = await this.options.store.writeMessages(this.options.collaborationDir, next);
    if (result.outcome === "not_renamed") { append.cancelBeforeDurability(); return { outcome: "not_committed", cause: result.cause }; }
    if (result.outcome === "renamed_finalization_indeterminate") this.latchAndThrow(result);
    this.finalize("communication_messages", () => append.commitAfterDurability());
    return { outcome: "committed" };
  });
}
```

Post-durability step inside the engine's append (REQ-012):

```ts
commitAfterDurability: () => {
  setMessages(next);                       // genuine failure here → fail-stop (unchanged)
  port.publishMessage(message);
  try { assertAllowed(); committed = reservation.commit(); }
  catch (error) { closure = error; cancelQuietly(reservation); return; }   // no throw → no fail-stop
  try { port.presentRecipientInput(message, input); } finally { committed.release(); }
}
// after the coordinator returns "committed":
//   closure is a TaskDelegationError/CollaborationContractError → rethrow it (same as a closure just before the write)
//   other closure (AgentRun stopped accepting) → { accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message }
```

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Root specifics | Root constructor passes a port object | Subclassing the engine per root, or keeping adapter classes that forward | Removes copies without a framework |
| Fix placement | Closure classified in the single append | Patching each coordinator's finalize | One fix, all roots |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `commitCommunication`/`commitReservedMessageAppend` as aliases | Fewer test edits | Rejected | One method name and type; tests updated |
| Keep `TeamCommunicationService` as a facade | Stable Team call site | Rejected | `TeamRunMessageDelivery` calls the engine |
| Keep root `messages` mirrors | Fewer edits | Rejected | Engine list is authoritative |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **D-7:** `admit()` validation, plus its unit test expectations if any.
2. **D-6:** delete `InterAgentMessageRouter` and retarget its Claude test to `reserveUserMessage` → commit → release on the same fixture; update the architecture-test allow-list; delete `TaskAgentExecutionRegistry.reserveInput`.
3. **Append and port:** add `root-message-append.ts`; rename the port file and type; rewrite the engine (DS-002 including REQ-012). Release no longer re-checks scope.
4. **Coordinators:** add `commitMessageAppend` to all three; remove the old methods and Team append types.
5. **Roots:**
   - standalone and Org build port objects and drop `messages` mirrors; delete both adapter classes;
   - Team builds the engine and port in `root-team-run.ts`, maps `TeamRunMessageDelivery` onto `engine.deliver`, moves the Team builder mapping, and deletes the service, adapter and plan files.
6. **Tests:**
   - engine-level suite running all three root ports, covering: accepted, duplicate conflict, history write failure, closed-before-reserve, closed-under-lock, **closed-after-durability (REQ-012)**, recipient-stopped-after-durability, indeterminate write + abandon, event order;
   - port the Team service/plan tests;
   - update root suites that referenced the deleted classes or methods.
7. **Docs (D-8).**

## Key Tradeoffs

- **Port object vs adapter classes.** Plain objects are less ceremony; type-checking stays via `RootCommunicationPort`.
- **Check under the lock for all roots.** Slightly longer lock hold; removes a race the standalone/Org copies had.
- **History record kept on closure after durability.** A compensating delete would add another write and its own failure mode. The record is truthful: the message was sent while the Task closed.

## Risks

- Event-order drift per root: mitigated by event-order assertions in the engine suite.
- Code/message drift: rejections are carried as data and asserted per root.
- Test churn across root suites: mechanical.

## Guidance For Implementation

- Do not touch `AgentRun.postUserMessage`/`reserveUserMessage` semantics, `ConfiguredAgentExecutionHandle`, `TeamRun`, registries (except the dead method), address resolution or `GlobalAgentRunMessageRouter`.
- Keep per-root codes and messages byte-identical. Copy them from the deleted files into port `rejections`.
- Keep the Team recipient builder output byte-identical (`message_id`/`dedupe_key`).
- REQ-012 tests must use real coordinators (as the probe does) for each root kind and assert:
  - no fail-stop;
  - a later write succeeds;
  - the history contains the message;
  - the recipient input is not released;
  - the sender sees the Task-closed error.
- Run the full server suite, plus DTL, task lifecycle, Org publication and compaction suites (AC-014).

---

## SR-005 Self-Validation Against The Design Principles (2026-10-10)

The user asked for this check: "refactoring should be making code better but should not break existing functionalities". Applied `design-principles.md` and the repository `DESIGN.md` ("Before accepting a design" checklist) to the SR-004 design and to the handed-over commit `3e78b455e`, which was read for evidence only and is not a source review. Re-checked on base `origin/personal@46e94fdea`.

### Does it make the code better? (DESIGN.md rules 4–5; principles: removal, ownership, structural triggers)

| Check | Result |
| --- | --- |
| Removes work before adding complexity | Yes. Net deletion: two adapter classes, the Team service, adapter and plan, three coordinator variants, the duplicate list owners, a dead router, a dead method, and duplicate validation. The additions are one port type and one append file. |
| One owner per concern | Yes. The engine owns sequencing; ports own only root facts; coordinators own lock, envelope and latch. No caller touches reservations outside the engine. |
| No empty indirection added | The port is a plain object with no sequencing, and the `TeamRun` seam is kept because it carries every Team operation. |
| No speculative machinery | No caches, retries or new state. The append has 5 states that mirror the existing Team plan. |
| No compatibility wrappers or dual paths | Yes; there are no aliases. |

### Does it keep existing behaviour? (principle 1, DESIGN.md rule 4, REQ-002/003/008/013)

Each preservation risk was checked against the code:

| Risk | Evidence | Verdict |
| --- | --- | --- |
| Team indeterminate write: "returned" → "thrown" | Today the Team adapter already throws (`team-communication-adapter.ts:100`), so callers see the same throw | Preserved. Keep the error text identical (RR-001). |
| Message list owner moves to the engine | The engine is already seeded from `initialMessages` at construction and restore (`root-communication-engine.ts:20`, and the same in `3e78b455e`) | Preserved |
| Event order | Today: `replaceMessages → reservation.commit → publish → present → release`. New: `setMessages → publish → assertDeliveryAllowed + commit → present → release`. The input is not runnable before release, and the commit emits nothing. | Observable order preserved (history event, then presentation, then release). It differs only in the approved REQ-012 closure case, where the history event is published for the saved record. |
| Release-time scope re-check removed | Present and release run synchronously after commit, with no await in between | No window opens; preserved |
| Check under the lock for standalone/Org | Team already does this; standalone/Org checked before the lock (`standalone-root-communication-adapter.ts:47-49`) | Approved in REQ-008 (product-invisible, removes a race) |
| Not-accepting codes per root | The engine returns `port.rejections.notAccepting`; Team keeps `TEAM_RUN_NOT_ACCEPTING_MESSAGES` | Preserved, if the rejections are copied byte-for-byte |
| Closure classification | In `root-message-append.ts`, any throw from `assertDeliveryAllowed` or `reservation.commit()` after durability is a closure. `reservation.commit()` throws only when the entry can no longer be committed (`agent-run-input-reservation.ts:18-20`), i.e. the recipient stopped or dropped it. A throw from presentation still fail-stops, as today. | Matches REQ-012. Code review must confirm that no other throw is absorbed. |

### Verification required to prove nothing broke (DESIGN.md rule 6; these add to "Guidance For Implementation")

V-1 to V-3 are implementation-owned. V-4 is owned by API/E2E.

1. **V-1, baseline comparison.** Before changing code, run the full server suite on clean `46e94fdea` and save the result. After the change, the same suites must pass. Any failure must either also fail on the baseline (listed by name) or be fixed. This replaces the handover's unsaved "fails on base too" claim.
2. **V-2, persisted bytes per root (AC-013).** For one accepted teammate message in each of the standalone, Team and Org roots, assert the exact history-file content and the recipient input's `message_id`/`dedupe_key`/`sourceEvent`. Compare against values recorded from the baseline code, not values recomputed by the new code.
3. **V-3, the codes, messages and order callers see, per root.** Cover:
   - accepted, duplicate conflict, history write failure, root not accepting, and recipient not accepting before the reservation: each must have the same code and message text as the baseline;
   - the event order assertion per root;
   - the Team indeterminate error text.
4. **V-4, REQ-012 and its counterpart, per root, with real coordinators** (as the design already requires):
   - a Task closing after durability → no fail-stop, a later write succeeds, the record is kept, the input is not released, and the sender gets `TASK_AGENT_RESOURCE_CLOSED`;
   - a throw from presentation after durability → the root still fail-stops.
   - API/E2E also exercises a real teammate message in each root kind through the server (existing DTL and Org publication suites, plus a send-message round per root).

### Verdict

The design meets the principles. It removes the duplication that already caused one defect, adds no machinery, and keeps every behaviour callers can see, except the approved REQ-012 fix. Implementation must prove V-1..V-4 before code review. Classification stays Large / High.
