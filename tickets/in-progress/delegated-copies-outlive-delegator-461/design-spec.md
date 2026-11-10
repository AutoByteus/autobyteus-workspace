# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (superseded by the user's direction of SR-004; see below)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-003` (scope: standalone Agent runs). Approved by the Solution Designer within the direction, with DEC-001 (wake) and DEC-009 (two steps) decided by the user on 2026-11-10 in the Solution Designer's conversation.
- Behavior-defining supplements and their approval references: none
- User approval of the design, when the direction requires it: not given; the user chose the structural change instead (SR-004) (the Task: "Design first; the user approves the direction before the build")
- Design status: `Needs Revision` — **not to be built.** On 2026-11-10 the user decided (requirements DEC-010) to correct the structure in this ticket: local delegated runs become independent runs linked to their delegator. This spec keeps the hosting and changes only what Stop covers; it stays as the record of SR-003 until the new design replaces it. Its evidence rows remain valid.
- Canonical investigation-notes path: `tickets/in-progress/delegated-copies-outlive-delegator-461/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`, `autobyteus-server-ts/docs/design/collaboration_model.md`, `docs/design-cases.md` (headings; cases 4, 5, 7 and 10 apply), `GLOSSARY.md` (searched for the words used here) — 2026-11-10. `references/design-examples.md`: not used.
- Project design-principle conflicts with the general principles, or discrepancies: none.

## Current-State Read

A collaboration-eligible standalone Agent run has one `StandaloneAgentRunRoot` (the coordinating run's in-process record). It owns the run's own agent through `StandaloneHostAgentHandle` (the **host**), hosts every local delegated copy in `RootAgentExecutionRegistry` and `RootTeamExecutionDirectory`, and keeps links to remote copies.

- The user's Stop: GraphQL `terminateAgentRun` → `AgentRunService.terminateAgentRun` (`agent-run-service.ts:129-146`) → `StandaloneAgentRunRootManager.stopRoot` (`standalone-agent-run-root-manager.ts:246-261`) → `root.stop()` (`standalone-agent-run-root.ts:436-440`): `terminate()` fences and finishes every copy and unloads the root, then `host.terminate()`.
- The root already works with its host offline (a host crash): the root stays, copies keep running, and a copy's message to the host makes it ready first (`standalone-root-message-delivery.ts:300-315`, `wakeAndRun` → `readyHost`).
- "The root is loaded" and "the run's own agent runs" are separate facts on the server (`getActive(hostRunId)` versus `AgentRunManager.getActiveRun`), but four readers treat a loaded root as a running run or start the host for it:
  1. the collaboration stream's connect calls `root.ensureHostReady()` (`agent-collaboration-stream-handler.ts:59-64`) and reports `is_active: root.isHostLive()` in its snapshot (line 89), while the GraphQL read of the same view reports `is_active: true` for any loaded root (`standalone-agent-run-root-manager.ts:318`): **one field, two meanings** (design case 7);
  2. `DelegatedLaunchSelectionService.update` refuses the run's own settings with `RUN_ACTIVE` whenever a root is loaded (`delegated-launch-selection-service.ts:83-88`);
  3. `StandaloneRunLiveness.releaseForHistory` ends a loaded root, stopping its copies, before archive or delete (`standalone-run-liveness.ts:48-58`);
  4. `RestartResumer.resumeOne` skips every recorded run whose root's history row is `terminated` (`restart-resumer.ts:109-118`).
- The web client assumes Stop ends every copy: `agentRunStore.terminateRun` calls `beginHostTermination` (`agentRunCollaborationStore.ts:256-304`), which detaches the collaboration stream before the command and marks every child terminal on success; `syncHost` follows the stream only while the host runs (`agentRunCollaborationStore.ts:310-320`, `useAgentRunCollaborationSync.ts`).
- A copy's Stop icon and status come from the collaboration context's child states, not from the host (`delegatedCopyLiveness.ts`), and the history poll refreshes child states of listed runs whose view is active (`refreshListedStatuses`).

No structural problem beyond these: the owner that must change (the root and its manager) exists and is the right one.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 18 source files in existing owners: the standalone root and its manager, the standalone ports and `AgentRunService`, the collaboration stream handler, the history liveness gate and its three callers' messages, the settings save service, the restart resumer; in the web client three stores, one actions file and three composables. One small new file (the end listeners, extracted). No new subsystem, API route, stored shape or migration.
- Architectural risk: `High`
- Risk rationale and supporting evidence: a lifecycle change on a guarded path (the root's lifetime is separated from its own agent's on a user Stop; a root now lives until archive, delete or shutdown); the meaning of the collaboration view's `is_active` is made single across two producers and the client; a history gate gets a new refusal; restart resume's filter changes.
- Escalation trigger if implementation or validation discovers new impact: a reader of "root loaded" or of `is_active` not listed in this spec; any need for a stored fact; any change needed in Team or Org roots; a runtime whose stopped host cannot be restored by a copy's message.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code (`Read`) | `standalone-agent-run-root.ts:436-480` | `stop()` = `terminate()` + `host.terminate()`; `terminate()` alone is shutdown and fail-stop | D-1: a host-only Stop beside the full end | None |
| Code (`Read`) | `standalone-host-agent-handle.ts:42-56` | `ensureReady()` restores a stopped host; `terminate()` waits for an in-flight activation | D-1, D-2: Stop and wake use the handle as it is | None |
| Code (`Read`) | `standalone-root-message-delivery.ts:289-315` | A message to the host readies it first, for local and remote senders | D-2: wake needs no new code | Per-runtime restore not re-run (existing path) |
| Code (`Read`) | `standalone-agent-run-root-manager.ts:246-293` | `stopRoot`, `endRoot`, `onRunEnded`/`notifyEnded`; 516 lines | D-1, D-5; file-size handling | None |
| Code (`Read`) | `standalone-agent-run-root.ts:134,148,153` | `options.delegatedFrom` marks a run a peer started | D-1: peer-started runs keep the full Stop | None |
| Code (`Read`) | `agent-run-service.ts:129-146`; `standalone-run-ports.ts:16-33` | The Stop result's `rootEnded` decides "host already dead, root ended → record terminated" | D-1: result field renamed to what it now means | None |
| Code (`Read`) | `agent-collaboration-stream-handler.ts:59-64,89,148`; `standalone-agent-run-root-manager.ts:312-330` | Connect starts the host; `is_active` differs between stream and GraphQL | D-3 | None |
| Code (`Read`) | `delegated-launch-selection-service.ts:76-170`; `docs/modules/standalone_agent_run_root.md` ("A registered root does not block the edit of a stopped host (only a live host does: `RUN_ACTIVE`)") | The combined Save refuses own settings on a loaded root; the host's own save already checks the host | D-4 | The host save's refusal for a live host is taken from the module doc; the implementation's test proves it |
| Code (`Read`) | `standalone-run-liveness.ts:40-60`; `agent-run-history-catalog-service.ts:296,315,372`; `root-agent-execution-registry.ts:66-70` | The history gate ends a loaded root; `hasOpenExecutionWork()` is true while a copy is initializing or running | D-5 | None |
| Code (`Read`) | `restart-resumer.ts:105-135`; `restart-resume-composition.ts:27-34`; `busy-run-recorder.ts`; `active-collaboration-root-directory.ts` `placeOf` | A `terminated` root skips every entry; a loaded root's busy copies are recorded with place `delegated` | D-6 | None |
| Code (`Read`) | `agentRunCollaborationStore.ts:122-143,205-237,256-320,369-402`; `agentRunCollaborationStreamingService.ts:214-258`; `agentRunCollaborationContext.ts:228-234`; `useAgentRunCollaborationSync.ts`; `agentRunStore.ts:414-480`; `delegatedCopyLiveness.ts` | See Current-State Read | D-7 | Team and Org stores not touched |
| Test run (`Reproduced`) | investigation notes, Runtime findings | Today's Stop contract passes on the base | Tests to change first | — |
| Code (`Read`) | `wc -l`: root 521, manager 516, `agentRunStore.ts` 506 | Over the 500-line limit before this ticket | Change Scope: these files do not grow | — |

## Intended Change

The user's Stop of a standalone Agent run stops the run's own agent and leaves its root loaded, so its copies keep running and a copy's message wakes the stopped agent through the path that already exists. Every reader that treated "root loaded" as "run running" gets an explicit rule.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-008 for standalone Agent runs. Areas: `standalone-agent-run-root` (root, manager, one extracted file), `agent-execution` (ports, `AgentRunService`), `services/agent-streaming` (the Agent-root stream handler), `run-history` (liveness gate and its messages, the settings save service), `restart-resume` (resumer), the web client's `agentRunStore`, `agentRunCollaborationStore`, `useAgentRunCollaborationSync`, and the standalone archive/delete actions with their toast owner (D-8); the docs named in Guidance.
- Derived consumers, when a stored or shared structure changes: the Agent-root view's `is_active` (wire field, shape unchanged; one meaning from now on: "the run's root is loaded, its children's states are live"). Readers and decisions:
  - stream snapshot producer: now `root.isActive()` (was the host's state);
  - GraphQL `agentRunCollaboration`: unchanged (already the root's state);
  - `agentRunCollaborationStatuses.isActive`: unchanged (already the root's state);
  - client `AgentRunCollaborationContext.isActive`/`phase`, `agentRunCollaborationStreamingService` (settles ready on an active snapshot), `refreshListedStatuses`, `ensureChildHydrated` (`liveToolAuthority`), `resolveWorkspace(root, is_active)`, `resolveTeamStatus(statuses, isActive)`, the remote-run registration: all mean "children are live" and stay; the implementation confirms each with a search for `is_active` and `.isActive` on the collaboration context.
- Deliberately left alone: Team and Org roots and their client stores (FU-001); `RootTaskExecutionLifecycle` and the copies' idle shutdown, wake, user Stop and Task closure (they keep working because the root stays loaded); server shutdown (`stopAll`); remote collaboration; the Task side; stored shapes.
- Follow-ups: FU-001 (Team and Org runs), FU-002 (two files over the size limit before this ticket).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-009 / AC-001, AC-012, AC-013 | Stop on a standalone Agent run | Stops copies, then the host; unloads the root | Stops the host only; the root stays | DS-001 |
| BEH-003 | System | REQ-003 / AC-002, AC-003 | A copy's `send_message_to` to its delegator | A not-running host is made ready first | Unchanged path, now reached after a user Stop | DS-002 |
| BEH-004, BEH-005 | User / Contract | REQ-005 / AC-004, AC-005 | Stop on a copy; Task closed | Need a loaded root | Preserved; the root is loaded after Stop | DS-001 (state after it) |
| BEH-009 | User | REQ-004 / AC-007 | Opening a run's copies | Stream connect starts the host | Connect never starts the host | DS-003 |
| BEH-001 (settings) | User | REQ-006 / AC-010 | Save in a stopped run's settings | Refused while a root is loaded | The host's own state decides | DS-004 |
| BEH-007 | User | REQ-007 / AC-008 | Archive / Delete | A loaded root is ended | Refused while a copy works | DS-005 |
| BEH-006 | Operational | REQ-008 / AC-009 | Update restart | A `terminated` root skips its entries | A delegated run of a stopped standalone run is resumed | DS-006 |
| BEH-008 | System | REQ-001, REQ-010 / AC-011, AC-012 | Stop of a run with remote copies; Stop of a peer-started run | Remote copies are not stopped; a peer-started run ends whole | Preserved | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `follow-ups.md` | FU-001, FU-002 | REQ-010 | Names what this design leaves alone | Current; not behavior-defining |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - **Vocabulary drift** (Principle 15): `is_active` of the Agent-root view means the host's state in the stream and the root's state in GraphQL (Current-State Read, 1).
  - **Behavior by absence** (Principle 13): the copies' end on Stop, and the settings refusal, follow from "a root is loaded / unloaded", not from a rule about the run's own agent. The target gives each its own rule and result (D-1, D-4, D-5).
  - **Several kinds** (Principle 1): `stopRoot` serves user-started runs and peer-started runs; the target names the rule for each (D-1).
  - **Derived data**: the view's `is_active` feeds client readers (listed in Change Scope).
  - Not firing: repeated coordination (one manager owns the Stop rule), empty indirection, persisted-data transition (no stored shape changes).
- Root cause classification: `Missing Invariant` — "the root's lifetime is its copies' coordination, not the own agent's run" was true for a crash and not for a Stop.
- Refactor needed now: `No` (beyond the named removals)
- Evidence: the root and host are already separate owners; the wake path exists.
- Design response: one new root operation, one manager rule, four reader rules, removal of the client's whole-run child termination.
- Refactor rationale: the existing ownership absorbs the change.
- Intentional deferrals and residual risk: FU-002 (file sizes); a root now stays loaded until archive, delete or shutdown (one small object per used run; roots are already kept from first use until Stop).

## Terminology

- **Own agent**: a standalone run's own agent; `host` in code (`StandaloneHostAgentHandle`). No new word.
- **Root**: the run's `StandaloneAgentRunRoot`. "Loaded" = registered and active in the manager (`getActive`).
- **End (a root)**: today's whole termination, copies first, then the own agent (`root.stop()` today, `root.end()` in the target). **Stop** is kept for the user's action.
- `is_active` (Agent-root view): the root is loaded; its children's states are live. Recorded in `docs/modules/standalone_agent_run_root.md`.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the client's `beginHostTermination` with its `terminations` map and `assertNotTerminating`; the stream connect's `readyRoot`; `StandaloneAgentRunRoot.isHostLive` and `StandaloneHostAgentHandle.readiness` (see the removal plan).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. The full end for a peer-started run is its own rule (REQ-010), not a compatibility path.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored shape, file or field changes: the collaboration tree, message logs, run metadata, history index (`terminatedAt` is written by `terminateHost` as today) and the busy-run record keep their shapes and meanings.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-008 | Stop in the client | Own agent stopped; root and copies untouched | `StandaloneAgentRunRootManager` (what Stop covers) | The change itself |
| DS-002 | Primary End-to-End | BEH-003 | A copy's `send_message_to` | The woken own agent has the message | `StandaloneAgentRunRoot` (existing) | REQ-003; no new code, must stay true |
| DS-003 | Primary End-to-End | BEH-009 | Client opens a stopped run's copy | Live child output, own agent still stopped | `AgentCollaborationStreamHandler` (server), `agentRunCollaborationStore` (client) | REQ-004 |
| DS-004 | Primary End-to-End | BEH-001 (settings) | Save in Settings | Own model saved; stopped copies' choices saved | `DelegatedLaunchSelectionService` | REQ-006 |
| DS-005 | Primary End-to-End | BEH-007 | Archive / Delete | Refusal, or the root ended and the history change | `StandaloneRunLiveness` | REQ-007 |
| DS-006 | Primary End-to-End | BEH-006 | Startup after an update | Busy copies resumed | `RestartResumer` | REQ-008 |
| DS-007 | Return-Event | BEH-001 | Root events | Client child rows | Root publisher → stream → client context | Copies stay live in the tree after Stop |

## Primary Execution Spine(s)

- DS-001: `Stop control (web) -> agentRunStore.terminateRun -> GraphQL terminateAgentRun -> AgentRunService.terminateAgentRun -> StandaloneAgentRunRootManager.stopRun -> StandaloneAgentRunRoot.stopOwnAgent -> StandaloneHostAgentHandle.terminate -> StandaloneAgentRunLifecycleService.terminateHost (run stopped, history row terminated)`
- DS-002: `copy send_message_to -> StandaloneAgentRunRoot.deliverExactAgentMessage / deliverLogicalMessage -> StandaloneRootMessageDelivery.wakeAndRun -> StandaloneHostAgentHandle.ensureReady (restore) -> RootCommunicationEngine.deliver -> own agent input`
- DS-003: `select copy (web) -> agentRunCollaborationStore.syncHost -> /ws/agent-collaboration/:hostRunId connect -> StandaloneAgentRunRootManager.resolveRoot (no host start) -> snapshot is_active = root loaded -> client context live -> child events`
- DS-004: `Settings Save -> GraphQL updateDelegatedLaunchSelections -> DelegatedLaunchSelectionService.update -> (loaded root) StandaloneAgentRunRoot.updateDelegatedLaunchSelections for the copies -> AgentRunService.updateStoppedSelection for the own agent -> saved`
- DS-005: `Archive / Delete -> AgentRunHistoryCatalogService -> StandaloneRunLiveness.releaseForHistory -> StandaloneAgentRunRootManager.endRootForHistory -> (copies working: refusal) | (else) StandaloneAgentRunRoot.end -> history change`
- DS-006: `startup -> RestartResumer.resumeAfterUpdate -> resumeOne -> stop check for the entry's place -> CollaborationRootResolver.resolveOrRestore -> root.executeAgentCommand(post notice) -> copy resumed`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The manager decides what the user's Stop covers. For a run the user started it asks the root to stop its own agent; the root stays registered and keeps admitting, so copies, their idle timers, their leases and Task closure are untouched. For a run a peer started (`delegatedFrom`) it ends the root as today, because that run is a delegated copy. Without a registered root it stops the host only, as today. | Stop, run, root, own agent | Manager | End listeners (`onRunEnded`), history record |
| DS-002 | Unchanged code. The root's delivery makes a not-running own agent ready before it delivers; after a user Stop the root is still loaded, so the copy's message reaches this path instead of finding no root. | Copy, message, own agent | Root | Message log |
| DS-003 | Connect resolves the root and never starts the own agent. The snapshot's `is_active` is the root's state. The client follows the stream while the own agent runs **or** the view is active, so a stopped run's live copies are followed; a stopped run with an unloaded root is read once, as today. | View, stream, child | Stream handler; client store | Remote children observation |
| DS-004 | On a loaded standalone root the service no longer refuses the run's own settings. The copies' choices go through the root (each named copy must be stopped, as today); the own agent's model goes through its run service, which refuses while the own agent runs. | Settings, own agent, copies | Service | Model validation |
| DS-005 | The gate asks the manager to end a remaining root. The manager refuses while a copy is working and ends the root otherwise. The gate returns the reason; the catalog service words it. | History change, root, copies | Liveness gate | — |
| DS-006 | The resumer's stop check uses the entry's place: a `terminated` standalone root stops only its own agent, so its delegated entries are still resumed. | Busy-run entry, root history state | Resumer | Restart notice |
| DS-007 | Unchanged: root events reach the client while a stream is attached; the history poll covers listed runs. | Events | Root publisher | — |

## Spine Actors / Main-Line Nodes

`agentRunStore` (web), `AgentRunService`, `StandaloneAgentRunRootManager`, `StandaloneAgentRunRoot`, `StandaloneHostAgentHandle`, `AgentCollaborationStreamHandler`, `agentRunCollaborationStore` (web), `DelegatedLaunchSelectionService`, `StandaloneRunLiveness`, `RestartResumer`.

## Ownership Map

- `StandaloneAgentRunRootManager`: the registry of roots **and the rule of what Stop and a history end cover** (which runs keep their root; when a root may be ended).
- `StandaloneAgentRunRoot`: its own agent's handle, its copies, its lifecycle. Two ends: `stopOwnAgent()` and `end()`.
- `AgentRunService`: the Stop's public result and the history record for a host that was already down.
- `AgentCollaborationStreamHandler`: the Agent-root stream's connect and snapshot.
- `DelegatedLaunchSelectionService`: routing a Save between the root (copies) and the run service (own agent).
- `StandaloneRunLiveness`: whether a run is free for a history change, with the reason.
- `RestartResumer`: which recorded entries are resumed.
- Web `agentRunStore`: the own agent's Stop and local teardown. Web `agentRunCollaborationStore`: the collaboration view's source (stream or stored read) per run.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `StandaloneRunLifecyclePort.stopRun` | `StandaloneAgentRunRootManager` | `agent-execution` must not import the root module | The Stop rule |
| `StandalonePairedAgentAccess.executeOwnerCommand("terminate")` | the same `stopRun` | A peer's owner stops the run it started | A second Stop rule |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Web `beginHostTermination`, the `terminations` map, `assertNotTerminating` and every guard that reads them (`agentRunCollaborationStore.ts`); its use in `agentRunStore.terminateRun` | Stop no longer ends children. A root that does end (peer-started run, archive, delete, another client) is reported by the stream's `ROOT_LIFECYCLE` (`setActive(false)` cleans the children, `agentRunCollaborationContext.ts:228`) or found by the status poll | The stream's lifecycle path and `refreshListedStatuses`, both existing | Their tests change with them |
| `AgentCollaborationStreamHandler.readyRoot` | Connect and child commands need the root, never the own agent | `roots.resolveRoot` | The doc sentence "a stopped run's host starts when its collaboration view is opened" goes |
| `StandaloneAgentRunRoot.isHostLive`, `StandaloneHostAgentHandle.readiness`, type `StandaloneHostReadiness` | Dead: the stream snapshot was `isHostLive`'s only production caller (`grep -rn "isHostLive\|host\.readiness" src`: definitions plus `agent-collaboration-stream-handler.ts:89`) | — | The implementation repeats the search before removing; two unit tests read `isHostLive` and change |
| `StandaloneRootStopResult.rootEnded` | The root no longer ends on Stop | `StandaloneRunStopResult.hadRoot` | Clean rename; no alias |
| Names `stopRoot` (manager, port, paired access), `root.stop()` | They say less than they do now | `stopRun`, `root.end()`, `root.stopOwnAgent()` | Clean rename |
| `DelegatedLaunchSelectionService`'s blanket `RUN_ACTIVE` for kind `agent` on a loaded root | The run service owns that refusal | D-4 | Team and Org keep theirs |

## Return Or Event Spine(s)

DS-007, unchanged: `copy agent event -> StandaloneAgentRunRoot.onAgentExecutionEvent -> RootEventPublisher -> stream ROOT_EXECUTION_EVENT -> client context.applyEvent -> child row`. When a root ends: `publisher lifecycle isActive:false -> ROOT_LIFECYCLE -> client setActive(false)`.

## Bounded Local / Internal Spines

N/A. The root's lifecycle states are unchanged (`activating → active → terminating → terminated`, or `fail_stop`); `stopOwnAgent` does not change the state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Run end listeners (`onRunEnded`, notify) | DS-001, DS-005 | Manager | Tell a peer's observation stream that a run's own agent stopped or its history ended | autobyteus-278 | Hides the Stop rule; today it sits inside the oversized manager |
| History record (`recordRunTerminated`) | DS-001 | `terminateHost`; `AgentRunService` for a host already down | The row's `terminatedAt` | Existing | — |
| Inherited launch refresh | DS-004 | Root | Copies started later inherit the saved launch | Existing (`refreshInheritedLaunch`) | — |

## Ownership Boundaries

- Only the manager decides whether a Stop keeps or ends a root. `AgentRunService` and the paired access call `stopRun` and read its result.
- Only the root touches its host handle and its copies.
- The history gate never ends a root itself; it asks the manager and gets a named outcome.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `StandaloneAgentRunRootManager` | roots, their registration, the end listeners | `AgentRunService` (port), paired access, stream handler, history liveness, settings service | A caller that takes a root from the manager and calls `root.end()` or `root.stopOwnAgent()` itself | Add the named operation to the manager |
| `StandaloneAgentRunRoot` | host handle, copy registries, task lifecycle | Manager | Manager or service calling `terminateHost` for a run that has a registered root | — |
| `AgentRunService.updateStoppedSelection` | the own agent's saved selection and its `RUN_ACTIVE` rule | Settings service | The settings service deciding by "root loaded" | — |

## Dependency Rules

- `agent-execution` reaches the root module only through `StandaloneRunLifecyclePort` / `StandaloneRunCommandPort` (as today).
- `run-history` reaches roots only through `StandaloneRunCollaborationRoots` (as today), extended with the named outcome.
- `restart-resume` knows no root type: its rule reads only the entry (`place`, `root.rootSubjectKind`) and the history state.
- The web `agentRunStore` no longer depends on `agentRunCollaborationStore` for Stop.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `StandaloneAgentRunRoot.stopOwnAgent(): Promise<StandaloneHostTerminationResult>` | The run's own agent | The user's Stop: interrupt and stop the own agent, inside the root's operation gate; the root stays active | — | New |
| `StandaloneAgentRunRoot.end(): Promise<StandaloneHostTerminationResult>` | The root | Every copy ends, then the own agent; throws when the copies cannot finish | — | Today's `stop()`, renamed |
| `StandaloneAgentRunRoot.isPeerStarted: boolean` | The root | Whether a peer node started this run (`delegatedFrom`) | — | New getter over an existing option |
| `StandaloneAgentRunRootManager.stopRun(hostRunId): Promise<StandaloneRunStopResult \| null>` | A standalone run | The Stop rule (D-1) | host run ID | Renamed from `stopRoot`; `StandaloneRunStopResult = { hadRoot: boolean; host: StandaloneHostTerminationResult }` |
| `StandaloneAgentRunRootManager.endRootForHistory(hostRunId): Promise<"no_root" \| "ended" \| "copies_working">` | A standalone run's root | End a remaining root for archive or delete unless a copy is working (`root.hasOpenExecutionWork()`); throws when it cannot finish | host run ID | Replaces `endRoot` |
| `StandaloneRunLiveness.releaseForHistory(runId): Promise<HistoryRelease>` | A standalone run | `"released" \| "own_agent_active" \| "copies_working" \| "root_not_ended"` | run ID | Was `boolean`; three callers word the refusal |
| `DelegatedLaunchSelectionService.update` | A Save | D-4 | `{rootKind, rootRunId}` | Unchanged signature |
| GraphQL `terminateAgentRun`, `stopDelegatedExecution`, `updateDelegatedLaunchSelections`, archive/delete mutations; `/ws/agent-collaboration/:hostRunId` | — | Unchanged shapes | — | Archive/delete return a new message text; the stream's snapshot `is_active` has one meaning |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `stopRun` | Yes | Yes (host run ID) | Low | — |
| `endRootForHistory` | Yes | Yes | Low | — |
| `releaseForHistory` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| The user's Stop of a run | `stopRun` | Yes | Yes | Low | Rename `stopRoot` everywhere (manager, port, paired access, tests, docs) |
| Whole termination of a root | `end` / `endRootForHistory` | Yes | Yes ("ends" is the module doc's word) | Low | Rename `root.stop()` |
| The run's own agent | `host` in code, "own agent" in texts | Yes | Yes (existing words) | Low | — |
| View flag | `is_active` | Yes, once single | After this change | Medium until then | D-3; documented in the module doc |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Stop an agent and leave it restorable | `StandaloneHostAgentHandle.terminate` + `ensureReady` | Reuse | Already the host-crash path | — |
| Wake on a copy's message | `StandaloneRootMessageDelivery.wakeAndRun` | Reuse | Existing | — |
| "A copy is working" | `StandaloneAgentRunRoot.hasOpenExecutionWork()` | Reuse | The existing predicate (initializing or running) | — |
| Live child states after Stop | Root publisher, stream, status poll | Reuse | Existing | — |
| Report a root's end to the client | `ROOT_LIFECYCLE` | Reuse | Existing | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `standalone-agent-run-root` | Stop rule, root ends, end listeners | DS-001, DS-005 | Manager, root | Extend | — |
| `agent-execution` | Port types, Stop result | DS-001 | `AgentRunService` | Extend | — |
| `services/agent-streaming` | Agent-root stream connect | DS-003 | Stream handler | Extend | — |
| `run-history` | History gate, settings routing | DS-004, DS-005 | Liveness, settings service, catalog service | Extend | — |
| `restart-resume` | Stop check per entry | DS-006 | Resumer | Extend | — |
| `autobyteus-web` stores and composable | Stop, view source | DS-001, DS-003 | Stores | Extend | — |

## Draft File Responsibility Mapping

See the final mapping; no draft differed.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| "Tree first, then the own agent's model" result combination (stored path today, loaded-root path new) | A private method of `DelegatedLaunchSelectionService` | `run-history` | Two branches of one service | Yes | Yes | A second copy in the new branch |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `StandaloneRunStopResult { hadRoot, host }` | Yes | Yes | Low | — |
| Agent-root view `is_active` | Yes, after D-3 | — | Low | D-3 |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | standalone root | Root | `stopOwnAgent`, `end`, `isPeerStarted`; remove `isHostLive` | The root's public API | — |
| `standalone-agent-run-root/domain/standalone-host-agent-handle.ts` | standalone root | Host handle | Remove `readiness` | — | — |
| `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` | standalone root | Manager | `stopRun` (D-1), `endRootForHistory` (D-5) | The registry and its Stop rule | — |
| `standalone-agent-run-root/services/standalone-run-end-listeners.ts` (new) | standalone root | Manager's off-spine concern | `onRunEnded` registration and notification, moved out of the manager unchanged | One concern with its own state | — |
| `standalone-agent-run-root/services/standalone-paired-agent-access.ts` | standalone root | Paired access | Call `stopRun` | — | — |
| `agent-execution/services/standalone-run-ports.ts` | agent-execution | Port | `stopRun`, `StandaloneRunStopResult` | — | — |
| `agent-execution/services/agent-run-service.ts` | agent-execution | Run service | Read `hadRoot` | — | — |
| `services/agent-streaming/agent-collaboration-stream-handler.ts` | streaming | Stream handler | Connect without host start; snapshot `is_active` = root | — | — |
| `run-history/services/standalone-run-liveness.ts` | run-history | History gate | `HistoryRelease` outcome | — | — |
| `run-history/services/agent-run-history-catalog-service.ts` | run-history | Catalog service | Word the refusals (delete, archive/unarchive, prepared-run cancel) | — | — |
| `run-history/services/delegated-launch-selection-service.ts` | run-history | Settings service | D-4 | — | Private combine method |
| `restart-resume/restart-resumer.ts` | restart-resume | Resumer | D-6 | — | — |
| `autobyteus-web/stores/agentRunStore.ts` | web | Run store | Stop without child termination | — | — |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | web | Collaboration store | Remove whole-run termination; `syncHost` rule (D-7) | — | — |
| `autobyteus-web/composables/agentCollaboration/useAgentRunCollaborationSync.ts` | web | Sync composable | Watch the view's active state too | — | — |
| `autobyteus-web/stores/runHistoryMutationActions.ts`, `stores/runHistoryStore.ts` (`deleteRun`, `archiveRun`) | web | History mutations | Return the server's refusal (D-8) | — | — |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`, `composables/useWorkspaceHistoryGroupArchive.ts` | web | History mutation toasts | Show the refusal; adapt to the result type | The one toast owner for both panels | — |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-run-end-listeners.ts` | File (new) | Manager | Per-run end listeners | Beside its only user | The Stop rule |
| The files of the Final File Responsibility Mapping | File (modify) | As listed | As listed | Existing owners | — |
| `autobyteus-server-ts/docs/design/collaboration_model.md`, `docs/modules/standalone_agent_run_root.md`, `docs/modules/restart_resume.md`, `docs/modules/run_history.md`, `docs/modules/agent_communication.md` (Stop of copies: the root-not-loaded note), `autobyteus-web/docs/agent_execution_architecture.md` | File (modify) | Docs | The new rule (see Guidance) | Canonical contracts change with the code | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `standalone-agent-run-root/services` | Main-Line Domain-Control with its off-spine files | Yes | Low | One new small file |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| D-1, the Stop rule in the manager | `const root = this.active.get(id); if (!root) return { hadRoot: false, host: await this.options.host.terminateHost(id) }; const host = root.isPeerStarted ? await this.endAndUnregister(root) : await root.stopOwnAgent(); this.endListeners.notify(id); return { hadRoot: true, host };` | `if (root.hasOpenExecutionWork()) keepRoot() else root.stop()` (two states for one Stop; Stop's meaning would depend on timing) | One rule, by what the run is, not by what happens to be running |
| D-3, one meaning | Stream snapshot and GraphQL both: `isActive: root is loaded` | Stream: host live; GraphQL: root loaded | The client's stream service disconnects on an inactive snapshot (`agentRunCollaborationStreamingService.ts:227-228`), so a stopped host's live copies could not be followed |
| D-5, a named outcome | `releaseForHistory → "copies_working"` → "This run's delegated copies are still working. Stop them or wait until they finish, then delete it." | `false` → "Run is active. Terminate it before deleting history." (the run is already stopped; the user cannot act on it) | The refusal must tell the user what to do |
| D-6, the stop check | `const stopped = (state, entry) => state !== "present" && !(state === "terminated" && entry.place === "delegated" && entry.root.rootSubjectKind === "agent")` | Removing the `terminated` check for every kind (a stopped Team or Org run's copies were stopped with it and must not resume) | The exception is exactly this ticket's rule; FU-001 widens it |
| D-7, the client's view source | `syncHost(id, hostRunning)`: `if (hostRunning \|\| contextFor(id)?.isActive) attach(id) else { detach(id); if (phase !== 'historical') inspect(id) }`, and the composable's watch key includes `contextFor(runId)?.isActive` so a stored read that finds a loaded root leads to an attach | Attaching for every listed run (one socket per run), or attaching for a stopped run whose root is not loaded (it would load the root just to look) | Viewing stays cheap and never starts anything |

## Design Decisions

- **D-1 Stop rule (REQ-001, REQ-009, REQ-010).** `stopRun`: no registered root → stop the host only (as today); a peer-started run (`root.isPeerStarted`) → `root.end()` and unregister (as today: it is a delegated copy, DEC-003/DEC-006); otherwise `root.stopOwnAgent()` and the root stays registered. End listeners are notified in all three cases after the own agent stopped. `AgentRunService`: `terminated` → success; `rejected` → not stopped (as today); `not_active` with `hadRoot` → record terminated and answer success (as today's `rootEnded` case: a host that died by itself); otherwise not found.
- **D-2 Wake (REQ-003).** No code change: DS-002. A regression test proves it from the stopped state: after `stopRun`, a copy's message to the host run ID, and to the host address, makes the host ready once and is delivered once; the same for a remote copy's inbound message.
- **D-3 Viewing never starts the own agent; `is_active` has one meaning (REQ-004).** Stream connect and child commands use `resolveRoot`. Snapshot `is_active` = `root.isActive()`. Consequence, intended: a message the user sends to a copy of a stopped run wakes that copy and no longer starts the stopped run's own agent.
- **D-4 Settings (REQ-006).** For kind `AGENT` with a loaded root: the copies' changes go to `root.updateDelegatedLaunchSelections` (unchanged rule: every named copy stopped, else `COPY_RUNNING`), then the own agent's selection to `agentRuns.updateStoppedSelection`, which refuses with `RUN_ACTIVE` while the own agent runs. The results combine exactly as the stored path combines them today (one private method for both). Team and Org kinds keep their `RUN_ACTIVE` on a loaded root.
- **D-5 Archive and delete (REQ-007).** `endRootForHistory`: `copies_working` when `root.hasOpenExecutionWork()`, else end and unregister. `releaseForHistory` returns the outcome; the catalog service's three callers word it. A quiet copy (idle, not yet shut down) is ended with the root, as today.
- **D-6 Restart resume (REQ-008).** The stop check of D-6's example, applied before and after the restore. The recorder needs no change: a loaded root's busy copies are already recorded with place `delegated`.
- **D-7 Web client (REQ-002, REQ-004).** Stop tears down only the own agent's stream and context. The collaboration view follows its stream while the own agent runs or the view is active. The history poll already refreshes listed runs whose view is active.
- **D-8 The refusal reaches the user (REQ-007).** Today the client drops the server's message: `deleteRunFromHistoryStore` and `archiveRunRecord` return `false` (`runHistoryMutationActions.ts:134-137,168-171`) and `useWorkspaceHistoryMutations.ts` shows a generic failure toast (lines 129-134, 190-194). Target: the single-run delete and archive actions of a standalone run return `{ changed: boolean; refusal: string | null }` (the server's `message` when it answered `success: false`), and `useWorkspaceHistoryMutations` shows the refusal in its error toast, the generic text otherwise. Group archive counts a refused run as not archived, as today. The GraphQL documents select `message` (the implementation verifies it).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `stopRoot`/`rootEnded` as aliases | Fewer edits | Rejected | Clean rename |
| Keep `beginHostTermination` for peer-started runs | They still end whole | Rejected | The stream's `ROOT_LIFECYCLE` and the status poll already handle a root that ends |
| A setting "Stop also stops copies" | Today's behavior | Rejected (DEC-008) | The user stops copies or closes Tasks |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server root and manager: `stopOwnAgent`, `end`, `isPeerStarted`, `stopRun`, extracted end listeners; port and `AgentRunService`; change the two Stop tests of the investigation notes first (they must fail before, pass after). Add D-2's regression tests.
2. Stream handler (D-3) with its tests; remove `isHostLive` and `readiness`.
3. History gate (D-5), settings service (D-4), restart resumer (D-6), each with tests.
4. Web client (D-7) with its store and composable tests.
5. Docs.

No temporary seams.

## Key Tradeoffs

- **The root stays loaded after Stop** (until archive, delete or shutdown) instead of being unloaded when its last copy goes quiet. Chosen: one state and one rule; a loaded idle root costs one small object, and roots are already kept from first use until Stop. Rejected: unloading by a watcher on copy statuses (a second lifecycle mechanism with no demonstrated need).
- **Stop does not depend on whether copies are working.** Chosen for the same reason (D-1's bad shape).
- **Peer-started runs branch inside the manager.** One explicit rule in the owner of Stop, instead of a second entry point that two callers would have to choose between.

## Risks

- A reader of "root loaded" or of `is_active` not found by reading. Mitigation: the searches named in Change Scope; AC-007 and AC-010 on the isolated instance.
- A stale busy-run record with a peer-started standalone run that was stopped whole afterwards would have its copy resumed after a later update. It needs an update restart whose record was never consumed; accepted (not a supported normal scenario).
- The three over-limit files (`standalone-agent-run-root.ts` 521, `standalone-agent-run-root-manager.ts` 516, `agentRunStore.ts` 506) must not grow: the extraction and removals above offset the additions; the implementation reports the line counts.
- A copy's turn in flight during Stop: `stopOwnAgent` touches only the host handle; a delegation the host started and the root already admitted completes (the copy runs). Covered by a test of Stop during an admitted delegation.

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts`, tests "Stop ends every child before the host, then unregisters; the host-ready port answers again afterwards" (line 570) and "stops every delegated copy only on an explicit Stop, serves the stored view without restoring, and restores a copy on command" (line 201): they assert today's behavior; rewrite them to the new behavior first (the copy's `finish` is **not** called, `hasRoot` stays true, the copy keeps its live status).
- Tests to add or change: manager (`stopRun` three cases, `endRootForHistory` three outcomes), root (`stopOwnAgent` leaves copies, leases and idle timers; a copy's message wakes the host once), `AgentRunService.terminateAgentRun` results, stream handler (connect starts no host; snapshot active for a stopped host; child command wakes the child only), history catalog (refusal texts; archive and delete succeed once no copy works), settings service (own model saved on a loaded root with a stopped host; `RUN_ACTIVE` with a live host; `COPY_RUNNING` for a running copy), restart resumer (delegated entry of a terminated agent root resumed; of a terminated Team or Org root skipped), web stores and composables (Stop leaves children; `syncHost`; the refusal toast).
- Isolated-instance validation (TESTING.md): AC-001, AC-002, AC-004, AC-005, AC-007 (desktop and phone layout), AC-008, AC-010 with a real runtime; AC-009 by the resumer's tests; AC-011 on two nodes where available, otherwise stated as verified by reading.
- Docs: `collaboration_model.md` CM-7 (a user Stop of a standalone run stops only its own agent; its copies keep running and their messages wake it; Team and Org runs: unchanged until FU-001) and § 5; `standalone_agent_run_root.md` (Ownership: `stopRun`, `endRootForHistory`; Root lifetime; Surfaces: connect, `is_active`; "Whole-Host Stop" section rewritten); `restart_resume.md` step 6; `run_history.md` (archive and delete refusal); the web doc's Stop section.
- No user-facing text is added except the refusal messages of D-5, which the client shows through D-8.
