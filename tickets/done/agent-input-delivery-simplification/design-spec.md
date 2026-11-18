# Design Spec — Agent Input Delivery Simplification (SR-007, on `origin/personal@0216c6fb14`)

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (new design for the current code; supersedes SR-004, archived at `history/design-spec.sr-005.md`).
- Approved requirements baseline: `requirements-doc.md` SR-006, **explicitly approved by the user on 2026-10-24** ("…Then let's do it. … then you can go ahead", after the self-validation; see the requirements Document Status). It was first approved by the Solution Designer within the direction the same day.
  - Approved 2026-10-24 by the Solution Designer within the Task's direction (skill step 2), on the user-approved SR-003/SR-005 intent.
  - Decisions DEC-003, DEC-004 and DEC-005 are made by the Solution Designer.
  - Reference: the Solution Designer's message to the user on 2026-10-24.
- Behavior-defining supplements: none.
- Design status: `Ready`.
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/investigation-notes.md`, sections "Complete re-investigation" (RI-1..RI-8) and "Third check on `0216c6fb14`".
- Authorities read (2026-10-24):
  - `references/architecture-design.md`;
  - `references/design-principles.md` (updated: Principles 1–15, structural triggers);
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/DESIGN.md` (rules 1–10; project design documents);
  - `docs/design-cases.md` (Cases 1–7);
  - `autobyteus-server-ts/docs/design/collaboration_model.md` (§ 3 Run Storage Shape, CM-9, § 5);
  - `GLOSSARY.md`.

  `references/design-examples.md` was not needed beyond the project's design cases.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

All paths are under `autobyteus-server-ts/src/`. "Read" means established by reading code; "Reproduced" means by running the probe.

- **One engine, three protocol copies.** `RootCommunicationEngine` (`agent-collaboration/execution/communication/root-communication-engine.ts`, 243 lines) owns the message list `current`, the checks, the message ID, the holding of the recipient's slot (`reserveAndCommit`, `:184-210`) and the remote steps. The save-then-deliver protocol is not in the engine. It is written in:
  - `StandaloneRootCommunicationAdapter.commitAppend` and `.commitSentToRemote` (`standalone-agent-run-root/services/standalone-root-communication-adapter.ts:39-103`);
  - `AgentOrgCommunicationAdapter`, the same two methods: a line-for-line copy, differing only in names, envelope and conflict codes (Read: normalized diff);
  - `TeamCommunicationAdapter.commitPlan` (`services/team-communication/team-communication-adapter.ts:84-119`) together with `team-communication-message-append-plan.ts` (112 lines).
- **Drift between the copies (Read):**
  - Team checks open/duplicate **inside** the root lock (`prepareAgainstCurrent`); standalone/Org check **before** `commitCommunication` takes it (`standalone-root-communication-adapter.ts:70-72`).
  - The indeterminate write is thrown by standalone/Org (`latchAndThrow`, `standalone-root-persistence-coordinator.ts:162-167`) and returned by the Team coordinator, then thrown by its adapter (`team-communication-adapter.ts:117-118`).
- **Dead data (Read):** every adapter builds a whole-history `nextMessages` envelope per message (standalone `:74-79`, Org the same, Team plan). No coordinator reads it; it is declared only at `standalone-root-persistence-coordinator.ts:110`, `agent-org-run-persistence-coordinator.ts:95` and `team-run-persistence-contract.ts:56`. The persisted write is `store.appendMessage(dir, rootRunId, message, logOwners)` (append-only logs, CM-9).
- **Two message-list owners (Read):** each root keeps a mirror (`standalone-agent-run-root.ts:94`, `agent-org-run.ts:70`, `root-team-run.ts:84`), updated by a `replaceMessages`/`replaceSnapshot` callback in the same synchronous step that sets the engine's `current`. Readers of the mirror:
  - package creation: `standalone-root-builder.ts:108`;
  - live package snapshots: standalone `:419`, Org `:341`, Team `:401`;
  - views: `agent-org-run-manager.ts:151`, `team-communication-projection-service.ts:70`.
- **Team facade (Read):** `TeamCommunicationService` (57 lines) keeps its own `accepting` flag next to the engine's `closeAdmission`, and the adapter's `isOpen()` reads that same flag. Its only own outcome is `TEAM_RUN_NOT_ACCEPTING_MESSAGES` with `ROOT_NOT_ACTIVE_MESSAGE`. Its other methods forward (`getSnapshot`, `remoteSendEngine`, `acceptFromRemote`, `deliver`).
- **The REQ-012 defect** (Reproduced on standalone; Read for Team and Org):
  - The engine's guarded commit re-checks Task scope (`root-communication-engine.ts:198`).
  - It runs inside the coordinator's post-durability `finalize*`, which fail-stops on any throw (`standalone-root-persistence-coordinator.ts:170-178`, the Org coordinator `:113`, the Team coordinator).
  - Fail-stop terminates the root (`standalone-agent-run-root.ts:506-513`, `root-team-run.ts:411-418`, `agent-org-run.ts:451`).
- **Two outcomes for one closure (Read):**
  - Before the slot is held, closure is a returned refusal (`refuseOutsideTaskScope`, `:224-231`).
  - After the slot is held, it is thrown (`:200`). `TaskDelegationError` is not a `CollaborationContractError`, so `send-message-to-dispatcher.ts:89-93` rethrows it and the agent sees MCP `-32603`.
- **Dead code (Read):**
  - `agent-team-execution/services/inter-agent-message-router.ts`: only its own test imports it;
  - `TaskAgentExecutionRegistry.reserveInput` (`agent-team-execution/local/registries/task-agent-execution-registry.ts:227`): no caller;
  - the duplicate checks in `AgentRunInputAdmissionState.admit()` (`agent-execution/input/agent-run-input-admission-state.ts:75-95`).
- **File size constraint (Read, `wc -l`):** `standalone-agent-run-root.ts` 515 and `root-team-run.ts` 538 lines are already over the 500-line limit; `agent-org-run.ts` is 453. This change must not add lines to them.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
- Size rationale:
  - The change moves the history-append protocol of three roots into the shared engine.
  - It changes the coordinator contract of all three persistence coordinators.
  - It removes the Team facade and the root message mirrors.
  - It touches 4 subsystems: `agent-collaboration/execution/communication`, `standalone-agent-run-root`, `agent-org-execution`, `agent-team-execution` plus `services/team-communication`; plus `agent-execution/input`.
  - About 20 source files are modified, removed or added, and about 10 test files change. Docs: 5 modules.
- Architectural risk: `High`.
- Risk rationale:
  - shared-contract change on three persistence boundaries;
  - post-durability failure semantics (REQ-012), in concurrency-sensitive code (lock, held slot, Task-closure race);
  - an ownership move (message list, append protocol);
  - blast radius: every teammate and remote message in every root.
- Escalation trigger (return `Design Impact`):
  - any persisted-byte difference;
  - a change in any caller-visible code, message or event order other than REQ-012/DEC-005;
  - needing to touch `AgentRun` admission semantics, the `TeamRun` seam or address resolution;
  - a root file growing past its current size;
  - a post-durability failure kind that is neither "Task closed", "recipient stopped" nor a genuine local publication failure.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probe (Reproduced) | `probes/req-012-task-close-during-append.repro.test.ts`; log `probes/req-012-repro-run-0216c6fb14.log` | Closure during the append ⇒ fail-stop, later writes refused, sender gets an indeterminate error | D-4 | Team/Org only Read; covered by V-4 tests per root |
| Read | the three adapters, Team plan, three coordinators | One protocol written three times, two styles, dead `nextMessages` | D-1, D-2, D-3, D-7 | None |
| Read | root mirrors and their readers (above) | Mirror equals the engine list at all times | D-5 | None |
| Read | `team-communication-service.ts` | Facade plus a duplicate `accepting` flag | D-6 | None |
| Read | `send-message-to-dispatcher.ts:89-93`, `collaboration-contract-error.ts:43-50`, `task-delegation-command.ts:65` | A thrown `TaskDelegationError` reaches the agent as `-32603` | D-4, DEC-005 | None |
| Read | `wc -l` root files | Two root files are over the size limit | Per-root port files (D-2) | None |

## Intended Change

1. **D-1, the engine owns the whole append protocol** for all three entry forms (same-root `deliver`, `acceptFromRemote`, `commitSentToRemote`). It builds one `RootMessageAppend` per message (new `root-message-append.ts`) and hands it to the root's coordinator through the port.
2. **D-2, one small port per root** (`RootCommunicationPort`) supplies only the root's facts and effects (see Interface Boundary Mapping). It replaces the adapter classes. Each root's port lives in its own small file, so the over-limit root files do not grow.
3. **D-3, one coordinator contract.** Each persistence coordinator exposes `commitMessageAppend(append): Promise<RootMessageAppendResult>`:
   - lock;
   - package creation where it exists today;
   - `append.prepare()`;
   - `store.appendMessage(...)`;
   - then `cancelBeforeDurability` on `not_renamed`, latch-and-throw on an indeterminate result, or `finalize(append.commitAfterDurability)`.

   Each keeps its own lock, store, latch and error types and texts. The three old methods and the dead `nextMessages` fields are removed.
4. **D-4, the REQ-012 fix and one closure outcome (DEC-005).** Every Task-scope closure on the teammate path returns today's refusal `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED", message}`, whether it is found before the slot is held, under the lock, or after the durable write. After durability:
   - closure keeps the record, publishes it to the root view as a saved record, drops the slot and does not present or release;
   - a recipient that stopped accepting input gives `AGENT_RUN_NOT_ACCEPTING_INPUT`;
   - only a throw from list update, publish or present remains a genuine post-durability failure (fail-stop, as today).
5. **D-5, the engine is the only owner of the message list.** The root mirrors and the `replaceMessages`/`replaceSnapshot` callbacks go. Readers get the root's envelope built from `engine.getMessages()`.
6. **D-6, the Team facade is removed.** `RootTeamRun` builds the engine with the Team port. `TeamRunMessageDelivery` and `RemoteMessageSend` use the engine. `TEAM_RUN_NOT_ACCEPTING_MESSAGES` becomes the Team port's `notAccepting` rejection.
7. **D-7, dead code removed:**
   - `InterAgentMessageRouter`, with its test's assertion retargeted to the real path;
   - `TaskAgentExecutionRegistry.reserveInput`;
   - `nextMessages`;
   - the Team coordinator's root-mismatch branch, which can never run (each port is bound to its own coordinator);
   - the Team append-plan types.
8. **D-8, validation once:** `admit()` keeps only reserve + commit + release.
9. **D-9, docs** describe the real path: both `AgentRun` entry points and when each is used, and the one append owner (REQ-011).

Not changed:
- `AgentRun.postUserMessage`/`reserveUserMessage` semantics;
- `ConfiguredAgentExecutionHandle`, `FlatTeamAgentExecutionHandle`, `TeamRun`/`TeamRunBackend`, the registries (apart from the dead method);
- address resolution in the root message deliveries;
- `RemoteRunLinks`, `RemoteMessageSend` sequencing (design case 1 shape kept);
- `GlobalAgentRunMessageRouter`;
- stores and log formats.

## Change Scope (Mandatory)

- In scope:
  - UC-001 (validation once);
  - UC-003 (one delivery implementation, including remote receive and the sender record of a remote send);
  - UC-004 (dead code);
  - UC-006 (docs);
  - UC-007 (REQ-012).

  Areas: the communication engine and its port/append; the three root ports; the three persistence coordinators' message-commit method; the root message mirrors; the Team facade; `agent-run-input-admission-state.ts`; dead files and methods; module docs.
- Derived consumers of the message list (Principle 11, design case 3):

  | Consumer | Today reads | Decision |
  | --- | --- | --- |
  | Standalone package creation (`standalone-root-builder.ts:108` → coordinator `getMessages`) | root mirror | Read `root.getCommunicationSnapshot()`, now built from `engine.getMessages()` |
  | Standalone live snapshot (`standalone-agent-run-root.ts:419`) | mirror | The same envelope from the engine |
  | Org history view (`agent-org-run-manager.ts:151`) and Org snapshot (`agent-org-run.ts:341`) | mirror | The same, via `getCommunicationSnapshot()` |
  | Team Communication tab (`team-communication-projection-service.ts:70`) and Team snapshot (`root-team-run.ts:401`) | mirror | The same, via `getCommunicationSnapshot()` |
  | Root-view stream (`publishToRootView`) | published per message | Unchanged order; also published for a record kept by a REQ-012 closure, so the live view matches the stored log after a reload |
  | Recipient conversation (`presentRecipientInput`) | presented per message | Unchanged; not presented on closure |
  | Package-state validators (`validateCollaborationCommunicationMessageArray`) | engine | Unchanged |
- Deliberately left alone:
  - address resolution (`standalone-root-message-delivery.ts`, `agent-org-run-message-delivery.ts`, `team-run-message-delivery.ts` apart from the facade swap): out of scope (FU-001);
  - `assignToExistingCopy`'s `deliverWork` callback into root delivery (`root-task-execution-lifecycle.ts:148`): an existing Task-lifecycle shape, not the append protocol;
  - the two `AgentRun` entry points, result shapes, handle states and save-first history: not pursued (requirements);
  - `RemoteMessageSend` order (design case 1).
- Follow-ups: FU-001, FU-002, FU-003, FU-004 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC | Trigger | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-002/003/004; AC-001..004 | Any input | `admit()` repeats `reserve()` (RI-4) | Validation once; semantics preserved | DS-005 |
| BEH-002 | Contract | REQ-002/003; AC-003 | Compaction recovery | Unchanged (RI-6) | Preserved | Unchanged |
| BEH-004 | User/System | REQ-007/008/013/014; AC-007/008/013 | `send_message_to`, handoff, remote message | RI-1, RI-2 | One append owner; per-root outcomes preserved | DS-001, DS-002, DS-003, DS-004 |
| BEH-005 | System | REQ-009; AC-008/009 | Run-ID messaging | RI-3 | Global router kept; dead router removed | Unchanged path |
| BEH-006 | System | REQ-006; AC-006/010 | First input to a member | Unchanged | Preserved | Unchanged |
| BEH-007 | Operational | REQ-011; AC-011 | Docs | RI-7 | Docs updated | — |
| BEH-008 | System | REQ-012; AC-012 | Task DONE/CANCELLED or recipient stop during an append | RI-5 (Reproduced) | No fail-stop; refusal as before the save | DS-004 post-durability step |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probes/req-012-task-close-during-append.repro.test.ts` | Failing reproduction of OBS-003 | REQ-012, AC-012 | Implementation starts from it failing | Evidence |
| `follow-ups.md` | Problems outside this ticket | FU-001..FU-004 | Left alone deliberately | Current |
| v2 candidate `codex/agent-input-delivery-simplification-v2` @ `08a70d783f` | Earlier, unmerged implementation | — | Test ideas only: per-root baseline contract, TDR race E2E, the `dropSlot` lesson (CR-001). Not a code source: it targets whole-file writes and the pre-remote engine. | Reference |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` plus one `Bug Fix` (REQ-012).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - **Repeated coordination** (Principle 13): the append protocol exists in 3 owners and 5 methods (RI-2).
  - **Empty indirection** (13): `TeamCommunicationService`; forwarding adapter methods.
  - **Several kinds or forms** (1): three entry forms and three root kinds; each is traced in the entry-form table below.
  - **Derived data** (11): the message list is held twice; its readers are listed in Change Scope.
  - **Shared-structure tightness** (11): dead `nextMessages`.
  - **Behavior by absence** (13): a closure becomes a fail-stop because a post-durability throw "counts as" a local publication failure. The fix makes closure an explicit result.
  - Ruled out:
    - authoritative boundary (3): the `TeamRun` seam is the Team boundary and stays;
    - split sequence (2, 13): the engine calls each mechanism itself; the coordinator only runs the append it is given under its lock, which is the persistence owner's job;
    - vocabulary drift (15): "port" and "append" are new terms, defined below; no existing word gains a second meaning.
- Root cause classification: `Duplicated Policy Or Coordination` (primary); `Missing Invariant` (REQ-012).
- Refactor needed now: `Yes`.
- Evidence: RI-1..RI-5; the probe.
- Design response: D-1..D-8.
- Refactor rationale: the copies have drifted, and the post-durability step has no single owner to put the closure rule in. Writing the protocol once is the smallest way to fix it once for all roots and entry forms.
- Deferrals and residual risk: FU-001..FU-004. None blocks an in-scope AC.

### Entry forms traced (Principle 1, design case 2)

| Entry form | Root kinds | Checks before the slot | Under the lock (`prepare`) | After durability | Root-view publish | Recipient present |
| --- | --- | --- | --- | --- | --- | --- |
| `deliver` (same root: by address, by run ID, `assignToExistingCopy` work) | standalone, Team, Org | open (port `notAccepting`), current, self, Task scope (refusal), content | open, duplicate, Task scope (refusal) | Task scope + slot commit; closure ⇒ refusal | Yes | Yes |
| `acceptFromRemote` | standalone, Team, Org | open, current, IDs, Task scope (refusal), content | open, duplicate, Task scope | the same as `deliver` | **No** (today) | Yes |
| `commitSentToRemote` (after the peer accepted) | standalone, Team, Org | (in `prepareRemoteSend`) | open, duplicate; **no** Task scope (today: "no second Task check") | list update only, no slot | **No** | **No** |

`commitSentToRemote` keeps today's rule: a not-committed or thrown append leaves the result accepted, with a warning naming the message (`root-communication-engine.ts:149-166`).

## Terminology

- **Port:** the per-root object the engine receives (`RootCommunicationPort`). It supplies root facts and effects, and owns no sequencing.
- **Append:** one `RootMessageAppend`, built by the engine for one message and run once by the root's persistence coordinator under its lock.
- **Closure after durability:** the Task scope closed, or the recipient run stopped accepting input, between the durable log append and the slot commit.
- `GLOSSARY.md` and Collaboration Model § 1 are consulted. "Port" and "append" are code-internal terms, not domain words, so no glossary entry is added.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths and files in this scope: see the Removal / Decommission Plan.
- Compatibility wrappers, dual paths or legacy fallbacks kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject:
  - the append-only message logs: the coordinating log and task-agent logs (`<base>_active.jsonl` plus sealed parts, CM-9);
  - the initial log written at package creation;
  - raw traces (`sourceEvent`, `message_id`, `dedupe_key`).
- Change: none to shapes. The same `store.appendMessage(dir, rootRunId, message, logOwners)` and `writeMessages`/`writeTree` calls, with the same arguments and log-owner order (`messageLogOwners`, receiver's first), are now made from inside `commitMessageAppend`.
- Readers and writers: unchanged stores.
- Decision: `Not Affected`.
- Rationale: the same bytes are written by the same calls; only their call site moves.
- Supports: AC-007, AC-013, V-2.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-004 | Agent `send_message_to` / handoff | Recipient runs the input; sender gets a result | Root message delivery (resolution), then `RootCommunicationEngine` (delivery) | Same-root teammate path |
| DS-002 | Primary | BEH-004 | Peer node delivers a message for a local agent | Recipient runs it; the peer gets a result | Root message delivery (link check, wake), then the engine | Remote receive |
| DS-003 | Primary | BEH-004 | Local agent messages a linked remote run | Sender log records it | Root message delivery (`RemoteMessageSend` order, unchanged) | Remote send record |
| DS-004 | Bounded local | BEH-004, BEH-008 | Engine holds an append | Released input, refusal, or fail-stop | Engine, inside the coordinator's lock | The one append protocol and the REQ-012 fix |
| DS-005 | Bounded local | BEH-001 | `AgentRun` input | Admission entry | `AgentRunInputAdmissionState` | Validation once |

## Primary Execution Spine(s)

- **DS-001:** `send_message_to tool → SendMessageToDispatcher → <root> message delivery (resolve recipient, live lease) → RootCommunicationEngine.deliver (checks, message ID) → port.reserveRecipientInput (TeamRun / registry → member handle → AgentRun.reserveUserMessage) → port.commitMessageAppend(append) [coordinator lock → append.prepare → store.appendMessage → finalize(append.commitAfterDurability)] → engine result → dispatcher → agent`
- **DS-002:** `peer channel → <root> message delivery (link check, wake) → RootCommunicationEngine.acceptFromRemote → (as DS-001 from reserveRecipientInput, no root-view publish) → result to peer`
- **DS-003:** `<root> message delivery → RemoteMessageSend: endpoint rule → engine.prepareRemoteSend → RemoteRunLinks.deliver → engine.commitSentToRemote → port.commitMessageAppend(append without receiver)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The root finds who the address means and takes the live lease. The engine checks and builds the message, holds the recipient's slot, then has the root's coordinator save it under the lock and run the post-save steps. | Root message delivery, engine, coordinator, AgentRun | Engine (delivery sequencing) | Port: recipient input builder, routing, log owners, publish, present |
| DS-002 | The same as DS-001 after the root's link check, with the remote run as the sender and no publish to the root view. | The same | Engine | The same |
| DS-003 | Unchanged order (design case 1). Only the final record goes through the one append. | RemoteMessageSend, engine | Root message delivery | RemoteRunLinks |
| DS-004 | See Bounded Local Spines. | Engine, coordinator | Engine | Coordinator latch |
| DS-005 | `admit()` = `reserve()` (the only validation) + commit + release. | Admission state | Admission state | — |

## Spine Actors / Main-Line Nodes

Root message delivery (per root, unchanged) → `RootCommunicationEngine` → root persistence coordinator → `AgentRun`.

## Ownership Map

- `RootCommunicationEngine` owns:
  - the message list (the only owner);
  - checks and message IDs;
  - the slot lifecycle (hold, cancel, commit, release);
  - the append protocol semantics (in-lock checks, the post-durability order, closure classification);
  - result mapping;
  - admission closing.
- `RootCommunicationPort` (one file per root) supplies root facts and effects; it owns no sequencing.
- The persistence coordinators own the lock, package creation, the store call, the fail-stop latch and the `finalize` wrapper. They run the append they are given and never touch the slot.
- `AgentRun` owns input admission (unchanged).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Why It Exists | Must Not Own |
| --- | --- | --- | --- |
| Per-root port | Engine | Inject root facts and effects | Sequencing, conflict policy, closure policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Evidence Nothing Else Reaches It |
| --- | --- | --- | --- |
| `standalone-agent-run-root/services/standalone-root-communication-adapter.ts` | Protocol copy plus forwarders | `standalone-root-communication-port.ts` + engine append | Only constructed in `standalone-agent-run-root.ts:218` |
| `agent-org-execution/services/agent-org-communication-adapter.ts` | Copy | `agent-org-communication-port.ts` + engine | Only constructed in `agent-org-run.ts` |
| `services/team-communication/team-communication-service.ts` | Facade with a duplicate flag | Engine + Team port; `TEAM_RUN_NOT_ACCEPTING_MESSAGES` as port data | Users: `root-team-run.ts`, `team-run-message-delivery.ts` (grep) |
| `services/team-communication/team-communication-adapter.ts` | Protocol copy plus forwarders | `team-communication-port.ts` | Only constructed by the service |
| `services/team-communication/team-communication-message-append-plan.ts` | Team-only protocol copy | `root-message-append.ts` | Only used by the adapter |
| Coordinator methods `commitCommunication` (standalone, Org) and `commitReservedMessageAppend` (Team); types `PreparedTeamMessageAppend`, `TeamMessageCommitResult` and their siblings in `team-run-persistence-contract.ts` | Three variants of one contract | `commitMessageAppend(append)` | Callers are the adapters above |
| `nextMessages` fields | Never read since `f6bf477c3f` | — | RI-2 grep |
| Team coordinator root-mismatch branch (`team-run-persistence-coordinator.ts:107-114`) | Never runs: the engine passes the append only to its own root's port | — | Read; the port is built per root |
| Root mirrors (`messages` fields) and `replaceMessages`/`replaceSnapshot` callbacks | Second owner of the list | `engine.getMessages()` | Readers listed in Change Scope |
| Engine guarded commit/release wrapper and the post-reserve pre-lock check (`root-communication-engine.ts:196-200`) | The check moves under the lock and to the post-durability step; release follows commit with no await in between | `RootMessageAppend` | Read |
| `agent-team-execution/services/inter-agent-message-router.ts` | Dead | Real path | Only its test and the architecture allow-list reference it |
| `TaskAgentExecutionRegistry.reserveInput` | No caller | — | `flat-team-execution-manager.ts:114` calls the handle's own method |
| Duplicate checks in `admit()` | Repeat `reserve()` | `reserve()` | Read |

## Return Or Event Spine(s) (If Applicable)

Per message after a successful commit, in today's order:
- standalone/Org: `publish` (if root view), then `presentCommittedMessage`, then release;
- Team: `COMMUNICATION` (if root view), then `MEMBER_INPUT`, then release.

On a REQ-012 closure: publish only.

## Bounded Local / Internal Spines (If Applicable)

DS-004, parent owner `RootCommunicationEngine`, run inside the coordinator's lock:

```text
engine: build append(message, receiver | null)
coordinator.commitMessageAppend(append):
  lock
  → [package creation, standalone only (AR3-NB-002), unchanged]
  → append.prepare():
       not open or duplicate ID      ⇒ drop slot; "conflict"        (port.rejections.commitConflict)
       receiver and scope closed      ⇒ drop slot; "refused"         (TASK_AGENT_RESOURCE_CLOSED refusal)
       else                           ⇒ "append" with append.logOwners
  → store.appendMessage(dir, rootRunId, message, logOwners)
       not_renamed   ⇒ append.cancelBeforeDurability() (drop slot); "not_committed"
       indeterminate ⇒ latch; throw (each coordinator's own error type and text)
       durable       ⇒ finalize(append.commitAfterDurability)
append.commitAfterDurability():
  setMessages(next)
  if receiver:
     scope check, then slot.commit()
        closed (Task scope)        ⇒ publish to the root view; drop slot; record closure "task_closed"; return
        slot.commit() refused      ⇒ publish to the root view; drop slot; record closure "recipient_stopped"; return
  publish to the root view (when this entry form publishes)
  present to the recipient (when a receiver exists)   } a throw here propagates: fail-stop, as today
  release the slot (in a finally, as today)
engine maps: committed → accepted | conflict → port rejection | refused / task_closed → TASK_AGENT_RESOURCE_CLOSED refusal
             | recipient_stopped → AGENT_RUN_NOT_ACCEPTING_INPUT | not_committed → port.historyCommitFailedCode
             | thrown → abandon() (drop the slot if not committed), rethrow
```

- **Dropping the slot** has one rule (`dropSlot`, the v2 CR-001 lesson): cancel the slot if it is still held. A slot the recipient already dropped is not an error, and the drop never replaces the outcome.
- **Append states:** `sealed → prepared → (cancelled | refused | committed | closed_after_durability)`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| Recipient input builder (generic `root-communication-runtime-builder.ts`; Team `inter-agent-message-runtime-builders.ts`; remote `buildRemoteCommunicationInputMessage`) | DS-001/002 | Engine via port | Content, metadata, IDs (unchanged builders) |
| Recipient routing (`reserveRecipientInput`) | DS-001/002 | Engine via port | Unchanged routing per root |
| Log owners (`messageLogOwners(message, messageLogOwnerOf)`) | DS-004 | Engine via port | Unchanged resolution, moved into the port |
| Root-view publish and recipient presentation | DS-004 | Engine via port | Unchanged event contracts |
| Fail-stop latch | DS-004 | Coordinator | Unchanged |

## Ownership Boundaries

- Root message deliveries call only `engine.deliver`, `engine.acceptFromRemote` and the `RemoteMessageSend` steps.
- The engine calls only its port.
- Coordinators call only the append they are given.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `RootCommunicationEngine` | Append protocol, slot lifecycle, message list | Root message deliveries, `RemoteMessageSend`, roots (`getMessages`, `closeAdmission`) | Root code holding or committing a slot, or editing the list |
| Coordinator `commitMessageAppend` | Lock, store, latch | Engine via port | Engine or root calling the store for a message |
| `TeamRun` (unchanged) | Flat manager, handles | Team port `reserveRecipientInput` | Port reaching `FlatTeamExecutionManager` directly |

## Dependency Rules

- `agent-collaboration/execution/communication` imports no root subsystem.
- Ports import the engine's port/append types and their own root's coordinator and builders.
- Coordinators import only `RootMessageAppend`/`RootMessageAppendResult` from the communication module.
- Forbidden:
  - the engine importing coordinator or root types;
  - any teammate-path code committing a slot outside the engine.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Notes |
| --- | --- | --- | --- |
| `RootCommunicationEngine.deliver / acceptFromRemote / prepareRemoteSend / commitSentToRemote` | One message | Delivery | Signatures unchanged |
| `RootCommunicationEngine.getMessages() / closeAdmission()` | List, admission | The only list owner | Unchanged |
| `RootCommunicationPort` | Root facts | See the example below | Replaces `RootCommunicationAdapter` (`root-communication-adapter.ts` becomes `root-communication-port.ts`) |
| `<Coordinator>.commitMessageAppend(append)` | One log append | Lock, prepare, write, finalize | The same on all three coordinators |
| `RootMessageAppend` | One append | `prepare`, `cancelBeforeDurability`, `commitAfterDurability`, `message`, `logOwners` | Built only by the engine |

## Interface Boundary Check

Each interface has one subject; identities are explicit (run IDs, member identities). No ambiguous selector.

## Main Domain Subject Naming Check

The names follow the existing vocabulary (`message`, `log`, `slot`/`reservation`, `root view`). No version numbers in names (DESIGN.md rule 8).

## Existing Capability / Subsystem Reuse Check

The design reuses the existing engine, stores, coordinators' locks and latches, recipient builders, `messageLogOwners` and `RemoteMessageSend`. It adds no new subsystem.

## Subsystem / Capability-Area Allocation

- Communication module: engine, port type, append.
- Each root subsystem: its port file and coordinator method.
- Team: the port moves next to its builders.

## Draft File Responsibility Mapping

See the final mapping below.

## Reusable Owned Structures Check

`RootMessageAppend` is the one shared structure; its receiver part is optional for the remote-send record.

## Shared Structure / Data Model Tightness Check

- `nextMessages` is removed.
- The append has no root ID, because the port binds the root.
- `rejections` is root data with three fields (`notAccepting`, `commitConflict`, `historyCommitFailedCode`), each with one meaning.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `agent-collaboration/execution/communication/root-message-append.ts` | **Add**: the append and its state rules (DS-004) |
| `agent-collaboration/execution/communication/root-communication-port.ts` | **Rename/Move** from `root-communication-adapter.ts`: the port type and `RootCommunicationDeliveryInput` |
| `agent-collaboration/execution/communication/root-communication-engine.ts` | **Modify**: build appends; remove the guarded wrapper and the post-reserve pre-lock check; map results; port `notAccepting` |
| `standalone-agent-run-root/services/standalone-root-communication-port.ts` | **Add**, replacing the adapter: a facts-only port factory |
| `agent-org-execution/services/agent-org-communication-port.ts` | **Add**, replacing the adapter |
| `services/team-communication/team-communication-port.ts` | **Add**, replacing the adapter and service |
| `standalone-agent-run-root/services/standalone-root-persistence-coordinator.ts`, `agent-org-execution/services/agent-org-run-persistence-coordinator.ts`, `agent-team-execution/services/team-run-persistence-coordinator.ts`, `team-run-persistence-contract.ts` | **Modify**: `commitMessageAppend`; remove the old methods, types, `nextMessages` and the mismatch branch |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `agent-org-execution/domain/agent-org-run.ts`, `agent-team-execution/domain/root-team-run.ts` | **Modify** (must not grow): build the engine with the port factory; remove the mirrors and callbacks; snapshots from the engine |
| `agent-team-execution/services/team-run-message-delivery.ts` | **Modify**: depend on the engine |
| `standalone-agent-run-root/services/standalone-root-builder.ts`, `agent-org-execution/services/agent-org-run-manager.ts`, `services/team-communication/team-communication-projection-service.ts` | **Modify** only if needed (they already call `getCommunicationSnapshot()`) |
| The adapters, the Team service and append plan, `inter-agent-message-router.ts` | **Remove** |
| `agent-team-execution/local/registries/task-agent-execution-registry.ts`, `agent-execution/input/agent-run-input-admission-state.ts` | **Modify** (removals) |
| `tests/architecture/agent-provider-composition-boundaries.test.ts` | **Modify**: drop the allow-list entry |

## Applied Patterns (If Any)

A one-shot command object (the append) executed by its persistence owner.

## Target Subsystem / Folder / File Mapping

The existing folders are kept. The new port files sit beside the files they replace.

## Folder Boundary Check

No new folders. Each port sits in its root's `services/`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

```ts
// root-communication-port.ts (facts and effects only)
export interface RootCommunicationPort {
  readonly root: RootExecutionIdentity;
  readonly initialMessages: readonly CollaborationCommunicationMessage[];
  readonly rejections: Readonly<{
    deliverNotAccepting: Readonly<{ code: string; message: string }>; // `deliver` only (C-1). Team: TEAM_RUN_NOT_ACCEPTING_MESSAGES
    commitConflict: Readonly<{ code: string; message: string }>; // AGENT_ROOT_/AGENT_ORG_/TEAM_MESSAGE_COMMIT_CONFLICT
    historyCommitFailedCode: string;                             // *_MESSAGE_HISTORY_COMMIT_FAILED
  }>;
  isOpen(): boolean;
  isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean;
  assertDeliveryAllowed(senderAgentRunId: string, receiverAgentRunId: string): void;
  buildRecipientInput(input: { delivery: RootCommunicationDeliveryInput; message: CollaborationCommunicationMessage }): AgentInputUserMessage;
  reserveRecipientInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult>;
  logOwnersOf(message: CollaborationCommunicationMessage): readonly StoredMessageLogOwner[];
  commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult>;
  publishToRootView(message: CollaborationCommunicationMessage): void;
  presentRecipientInput(message: CollaborationCommunicationMessage, input: AgentInputUserMessage): void;
}
```

Bad shape, which this design avoids: moving each root's port into the root class. That would grow `standalone-agent-run-root.ts` (515 lines) and `root-team-run.ts` (538 lines) past their current size.

The conflict messages must be copied byte-for-byte:
- standalone "Message append conflicts with the current Agent root state.";
- Org "Message append conflicts with current AgentOrg state.";
- Team "Message append conflicts with current root state."

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Reason |
| --- | --- | --- |
| Keep the adapters as deprecated wrappers | Rejected | A dual path |
| Keep the root mirrors for the existing readers | Rejected | A second list owner; the readers switch to the engine |
| Keep the thrown closure form after the slot is held | Rejected | DEC-005 |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Baseline contract first (V-1, V-2, V-3).** On clean `0216c6fb14`, before any source change, record the following for each root kind and each entry form:
   - accepted results;
   - every rejection code and message;
   - event order;
   - the exact log lines and log-owner placement;
   - the recipient input's `message_id`/`dedupe_key`/`sourceEvent`.

   Use a frozen clock (`messageId` hashes `createdAt`). Also run the full server suite and save the result.
2. Copy `probes/req-012-task-close-during-append.repro.test.ts` into the server tests and confirm that it fails.
3. D-8, `admit()`; D-7, the dead code: retarget the router test's Claude active-turn assertion to `reserveUserMessage` → commit → release, and drop the allow-list entry.
4. Add `root-message-append.ts` and the port type; rewrite the engine.
5. Coordinators: `commitMessageAppend`; remove the old methods, types, `nextMessages` and the mismatch branch.
6. Ports per root; swap the roots onto the ports; remove the mirrors; remove the Team service, adapter and plan; `TeamRunMessageDelivery` onto the engine.
7. Tests:
   - the reproduction turns green, per root kind with real coordinators (V-4), including the counterpart where a throw from publish/present still fail-stops;
   - the baseline contract stays green;
   - port the Team service/plan tests;
   - update the root suites.
8. Docs (D-9).
9. Full suite: the same results as the baseline, with any difference named.

## Key Tradeoffs

- **Port files vs inlining into roots:** separate files keep the over-limit root files from growing.
- **Publishing a closure's record to the root view:** the live view matches the stored log after a reload. The alternative hides a stored message until reload.
- **Check under the lock for every root:** a slightly longer lock hold, and it removes a race the standalone/Org copies had.

## Risks

- Event-order or code drift per root: mitigated by the V-3 baseline contract.
- The remote entry forms' special rules (no root-view publish, no second Task check on send record, accepted-with-warning): mitigated by the entry-form table and per-form baseline cases.
- Test churn across root suites.

## Guidance For Implementation

- Reproduction to start from: `probes/req-012-task-close-during-append.repro.test.ts`. Copy it to `autobyteus-server-ts/tests/probes/` and run `pnpm exec vitest run tests/probes/req-012-task-close-during-append.repro.test.ts --no-watch`. It fails today, and the fix must turn it green. Then make it a durable per-root test.
- Verification gates:
  - **V-1:** full server suite on the clean base and after the change; name any difference.
  - **V-2:** persisted log lines and IDs per root and entry form, against baseline values recorded before the change, with a frozen clock.
  - **V-3:** codes, messages and event order per root and entry form, plus each coordinator's indeterminate error text.
  - **V-4:** REQ-012 per root with real coordinators: no fail-stop, a later write succeeds, the record is kept and published, the input is not released, the sender gets the refusal. Plus the genuine-failure counterpart.
  - **API/E2E:** a real teammate message, a Task-closure race and a remote message per root through the server.
- Do not touch `AgentRun` semantics, member handles, `TeamRun`, address resolution, `RemoteMessageSend` order or the stores.
- Do not let `standalone-agent-run-root.ts`, `root-team-run.ts` or `agent-org-run.ts` grow.
- Existing tests that construct the removed units and move to the new API, keeping their assertions:
  - `tests/unit/agent-collaboration/communication-commit-path.test.ts` (per-root commit path; also a natural home for V-2/V-3);
  - `tests/unit/remote-collaboration/remote-message-view-sequence.test.ts` (remote messages and the root view, per root);
  - `tests/unit/services/team-communication/team-communication-service.test.ts` and `team-communication-message-append-plan-current.test.ts`;
  - `tests/unit/agent-org-execution/agent-org-communication-presentation.test.ts`;
  - `tests/unit/agent-team-execution/root-team-run-termination.test.ts`;
  - `tests/unit/application-orchestration/application-team-input-root-dispatch.test.ts`;
  - `tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts` (retarget, D-7).
- The reproduction is written against today's `StandaloneRootCommunicationAdapter`. When the adapter is replaced, port the test to the standalone port and coordinator and keep its four assertions.

---

## Self-Validation Against The Code And The Design Principles (2026-10-24)

The user asked for this: "validate yourself if it's working, we didn't break any business, … conforms the design principles, … your refactoring will make it simpler".
- Method: design case 5. Every "unchanged" claim was compared with the cited code, rule by rule, for each root kind and each entry form (design case 2).
- How established: Read, unless marked otherwise. The REQ-012 defect is Reproduced.

### A. Business behavior: is anything broken?

| # | Behavior | Today (code) | After the design | Verdict |
| --- | --- | --- | --- | --- |
| A1 | Event order, same-root `deliver` | Standalone/Org: `commitMessages` + `replaceMessages` → `reservation.commit` → `publish` (if root view) → `presentCommittedMessage` → `release` (`standalone-root-communication-adapter.ts:87-96`). Team: `replaceCurrent` → `commit` → `COMMUNICATION` → `MEMBER_INPUT` → `release` (append plan `:75-97`) | The same order in `commitAfterDurability` | Preserved |
| A2 | `acceptFromRemote` | The same as A1 with `publishToRootView=false` (`root-communication-engine.ts:180`) | `publishToRootView=false` kept per entry form | Preserved |
| A3 | `commitSentToRemote` | In-lock open + duplicate check, list update only, no slot, no events; failure ⇒ accepted with a warning (`:142-157`) | An append without a receiver; no Task check; the engine's warning path unchanged | Preserved |
| A4 | Not-accepting codes | Team `deliver`: `TEAM_RUN_NOT_ACCEPTING_MESSAGES` (service pre-check). Team `acceptFromRemote` and `prepareRemoteSend`: generic `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES` (they skip the service). Standalone/Org: generic on all forms. All use `ROOT_NOT_ACTIVE_MESSAGE`. | **Corrected (C-1):** the port's `deliverNotAccepting` rejection is used by `deliver` only. The other forms keep the generic refusal. | Preserved after the correction |
| A5 | Conflict codes and texts | Standalone `AGENT_ROOT_MESSAGE_COMMIT_CONFLICT` "Message append conflicts with the current Agent root state."; Org `AGENT_ORG_…` "…current AgentOrg state."; Team `TEAM_MESSAGE_COMMIT_CONFLICT` "…current root state." | Carried byte-for-byte as port data | Preserved (V-3) |
| A6 | History-write failure | `AGENT_ROOT_/AGENT_ORG_/TEAM_MESSAGE_HISTORY_COMMIT_FAILED` with the cause message; slot cancelled | The same via `historyCommitFailedCode` | Preserved |
| A7 | Indeterminate write | Standalone/Org throw `RootTaskPersistenceFinalizationIndeterminateError`; Team throws `Error("Team message finalization is indeterminate at '<stage>'.")` (`team-communication-adapter.ts:117-118`); latch in each | Each coordinator keeps its own type and text; the engine `abandon()`s the slot | Preserved (V-3) |
| A8 | Persisted bytes | `store.appendMessage(dir, rootRunId, message, messageLogOwners(...))`; package creation writes `getMessages()` and the tree first (`standalone-root-persistence-coordinator.ts:117-135`) | The same calls and arguments; `getMessages()` now reads the engine, which at that moment holds exactly what the mirror held (both update after durability) | Preserved (V-2) |
| A9 | Message-list readers | Mirror is set in the same synchronous step as `engine.current` (adapter `:88-89`; Team `replaceCurrent`) | Readers get the envelope built from `engine.getMessages()` | Equal values at all times |
| A10 | Root identity checks | Constructor checks the loaded messages' root ID (`standalone-agent-run-root.ts:139`, Team `assertRootCorrelation`); Team re-asserts on every commit (`root-team-run.ts:527-537`) | **(C-4)** The constructor checks stay, on the loaded input. The per-commit re-assert goes: the envelope is now always built from the root's own ID, so it cannot disagree. | Preserved |
| A11 | Team admission | The service flag is read by the adapter's `isOpen()` and flips only with `closeAdmission`, together with the engine flag (`team-communication-service.ts:13-27`) | **(C-4)** The engine's own flag carries it. The Team port's `isOpen()` is `true`, with a comment saying why (RR-004: not `isAdmitting()`). | Preserved |
| A12 | `admit()` | Repeats `reserve()`'s two checks with identical codes and messages (`agent-run-input-admission-state.ts:80-118`) | `reserve()` alone runs them | Preserved: the same result for every input |
| A13 | Dead code removal | Router: only its own test imports it. Registry method: no caller. `nextMessages`: never read. Team mismatch branch: unreachable (port bound to its own coordinator). | Removed; the router test's Claude assertion is retargeted | Nothing reachable changes |
| A14 | REQ-012 (the approved change) | Closure after durability ⇒ fail-stop ⇒ root terminated (**Reproduced**) | Refusal; the root keeps working | Intended change |
| A15 | Closure after the slot is held, before the lock | Thrown ⇒ the agent sees `-32603` | **DEC-005:** the same refusal as before the slot | Intended change (approved decision) |
| A16 | Duplicate remote delivery (a peer retry carries the same message ID) | Standalone/Org check duplicates **before** the lock, so two concurrent identical `acceptFromRemote` calls could both pass and both append. Team checks in-lock. | The in-lock check for every root | Removes a race; approved form (REQ-008) |

### B. Corrections made by this validation

- **C-1** (A4): one generic not-accepting rejection would have changed Team `acceptFromRemote`/`prepareRemoteSend` codes. Now the port has `deliverNotAccepting` (Team: `TEAM_RUN_NOT_ACCEPTING_MESSAGES`; standalone/Org: the generic one) for `deliver` only.
- **C-2:** the closure mapping at every check uses the engine's existing refusal set (`DELIVERY_REFUSAL_CODES`: `TASK_AGENT_RESOURCE_CLOSED` and `TASK_AGENT_RESOURCE_CONFLICT`, `root-communication-engine.ts:23`), with the error's own message. Any other throw from the scope check stays a genuine failure. Without this, a post-durability `CONFLICT` would have been handled differently from the pre-check.
- **C-3:** the "recipient stopped" refusal uses the existing admission text: `{accepted:false, code:"AGENT_RUN_NOT_ACCEPTING_INPUT", message:"AgentRun is not accepting input."}`. `reservation.commit()` can fail only when the entry is gone; double commit cannot happen, because the engine commits once (`agent-run-input-reservation.ts:18-20`).
- **C-4** (A10, A11): the root identity checks and the Team admission flag are handled explicitly, as above.

The interface example earlier in this spec is superseded on one field: `rejections.notAccepting` → `rejections.deliverNotAccepting`, used by `deliver` only.

### C. Does it conform to the design principles, and is it simpler?

| Principle | Check | Result |
| --- | --- | --- |
| 1 Production reality | Each root kind and entry form traced (table A, entry-form table); claims cited | Pass, after C-1 |
| 2 Spines | DS-001..DS-005 named; one owner per node | Pass |
| 3 Ownership | Engine: sequence and list; port: facts; coordinator: lock and durability | Pass |
| 7 No dead code | Router, registry method, `nextMessages`, unreachable branch, duplicate checks: removed with evidence; elsewhere → FU-001 | Pass |
| 8 Clean cut | No wrappers or dual paths; the adapters are deleted | Pass |
| 11 One owner per fact | The message list owned only by the engine; readers listed | Pass |
| 12 File size | Root files shrink (mirror code removed); new code goes in new small files | Pass (constraint in Guidance) |
| 13 One owner per sequence | The engine defines the append's steps. The coordinator provides the lock and the durability point and calls `commitAfterDurability` there. That is the existing notification hook all three coordinators already use for tree mutations (`commitTreeMutation`), not a second sequence owner. | Pass |
| 13 Behavior by absence | Closure is an explicit result, not "counts as" a crash | Pass |
| 15 Vocabulary | "port" and "append" are code-internal terms defined in Terminology; no domain word changes | Pass |
| DESIGN.md 4–5 | Preserves guarantees; removes work (no per-message `nextMessages` build) before adding anything | Pass |
| DESIGN.md 7–9 | No persisted change; no version-named files; no cross-version compatibility code | Pass |

Simpler, measured with `wc -l` on `0216c6fb14`:
- **Removed:** 584 lines of adapter, facade, plan, router and port-type source, plus three old coordinator methods and the mirrors.
- **Added:** the append and three facts-only ports, estimated at about 300 lines.
- **Net:** about 250–300 fewer lines.
- **Protocol copies:** from 3 owners and 5 methods to 1.

### Verdict

The design is correct against the code after corrections C-1..C-4. It breaks no business behavior: the only changes are the approved REQ-012 fix and DEC-005, and it removes one race (A16). It conforms to the design principles and makes the code simpler. V-1..V-4 prove it executably during implementation.


### Post-review factual corrections (ARCH-REV-003, 2026-10-24)

- AR3-NB-002: package creation (the first message writes the messages log and the tree, then records the catalog flag) exists **only in the standalone coordinator** (`standalone-root-persistence-coordinator.ts:52-69, 88-91`). The Org and Team coordinators do not create packages. Read every "standalone/Org" mention of package creation in this spec as "standalone only". The design is unchanged.
- AR3-NB-005: the approval basis now cites the user's explicit approval of 2026-10-24.
