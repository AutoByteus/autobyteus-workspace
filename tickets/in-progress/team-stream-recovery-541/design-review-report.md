# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/requirements-doc.md` (SR-002, Approved; REQ-002 and AC-010 made explicit within the direction)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/investigation-notes.md` (with `evidence/investigation/`)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `evidence/investigation/` (A-run3 frames and console, `wire-order.mjs`, `real-wire-order.mjs`, `C-sdd-old-base.json`)
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer's revised package SR-002 after ARCH-REV-001 (committed at `205ae5de64`), 2026-11-27
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail, AR-001, AR-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: branch `codex/team-stream-recovery-541` at `4c5adb7ae4` (base `origin/personal` `80420a8bf6`). Opened:
  - web `services/runOpen/teamRunOpenCoordinator.ts:80-175` (`reopenTeamRunAfterStreamLoss`, including `selectRun: false`);
  - `stores/agentTeamContextsStore.ts:76-101` (`replaceTeamContext` swaps the whole Team context);
  - `stores/agentTeamRunStore.ts:185` and `:266-290` (the Team send);
  - `types/agent/AgentContext.ts:18-38` (the composer draft and page-local send/Stop state live on the member context);
  - `services/agentStreaming/TeamStreamingService.ts:57,69,91,375,430-445` (`onStreamRecoveryRequired`, default `() => undefined`);
  - `stores/runHistoryLoadActions.ts:320-395`; `services/runStatus/agentRuntimeStatusState.ts:40-55`; `stores/agentRunStore.ts:92-165` (the resume-of-stopped-run send).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: A changes the Team stream's lifecycle (an automatic replacement of a live service and context, concurrent with selection, sends and Stops); B changes a concurrent commit rule; about 20 files across web and server.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2: A's page-local state is carried at the one commit, in-flight sends are retargeted, and the recovery is started one way with a loud failure; AR-001 and AR-002 resolved).
- Approved requirements / intended behavior understood: Yes (REQ-001…008; DEC-001…005).
- Relevant existing behavior and evidence confirmed:
  - **A's cause** is well evidenced: the probe wire's double clock read, measured on the real module (1 of 8,000 when idle) and in the one reordered run (1, 2, 4, 3). The server path is read as synchronous.
  - **C** is reproduced on the base (SDD-12, SDD-09).
  - **B, D and E** are read.
- Scope guardrail confirmed: Yes. The Preserved list includes 540's not-sent notice with the text back, and 533's Stops.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-002 and the Preserved 540 notice with the text back; AR-002 → REQ-001).
- Statements about existing code the design relies on:
  - `reopenTeamRunAfterStreamLoss` runs without a selection intent when `selectRun: false` (`teamRunOpenCoordinator.ts:92-97,148`). True, so the escalation trigger "the replacement cannot run without a selection intent" does not fire.
  - The verified replacement swaps in a newly hydrated Team context (`replaceTeamContext`, `agentTeamContextsStore.ts:76-89`: `this.teams = new Map(this.teams).set(rootTeamRunId, replacement)`). Nothing carries the previous members' page-local state across. See AR-001.
  - The recovery starts from the service's `onStreamRecoveryRequired`, which defaults to a no-op (`TeamStreamingService.ts:91`). See AR-002.
  - C: removing the placeholder for an existing context also covers a context left `Offline` whose run became active again. A send then takes the "resume of a stopped run" branch (`agentRunStore.ts:99,158-161`), which only marks activation pending; the refresh loop clears it once the server reports the run active, and the stream's first status corrects the display. That is acceptable, and recorded.

| Behavior / REQ | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 (Team recovers by itself) | User | Pass | Pass | Pass (D-A1/D-A2: the store publishes, a plugin-created owner drives, a missing owner throws) | Confirmed | AR-002 resolved; N-4 |
| REQ-002 (during recovery: status kept, send waits then not-sent with text back, Stop answer, notice after 5; page state survives) | User | Pass | Pass | Pass (D-A6 carry; D-A7 retarget; walks) | Confirmed | AR-001 resolved |
| REQ-003 (no Initializing placeholder for existing contexts) | User | Pass | Pass (reproduced) | Pass | Confirmed | — |
| REQ-004 (status at open from the run-status feed) | User | Pass | Pass | Pass | Confirmed | — |
| REQ-005 (retry once, keep the current context) | User | Pass | Pass | Pass | Confirmed | — |
| REQ-006…008 | User / Cleanup | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/investigation/` | Pass | Pass | Pass (the honest limit stated: run 3's node-side order not recorded) | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present and evidence-backed | Pass | A's cause proven on the real wire; C reproduced; B read | — |
| Refactor decision explicit | Pass | D-E1 splits by owned concern; dead code removed (C-3) | — |

## Data Contract Verdict

`N/A`: no stored or exchanged shape changes (verified: the Team, run, Org and run-status stream contracts are untouched). A page-side state is added (the Team's recovery state, `recovering`/`exhausted`), which is judged under ownership.

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A: gap → `reopen_required` → store publishes `required` → recovery owner (plugin) → `reopenTeamRunAfterStreamLoss` → `replaceFailedTeamStream` (carry page state) → new service; a waiting send retargets | Primary | Pass | Pass (walks table) | Pass | Pass | Pass (one direction: owner → coordinator → store) | Pass | Pass |
| B: open → status → commit/retry | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| C: refresh with an existing context | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `teamStreamAutoRecovery` (new) | Pass | Pass | Pass | Pass | One per Team root |
| `reopenTeamRunAfterStreamLoss` (single-flight) | Pass | Pass | Pass | Pass | A reselect joins |
| `replaceFailedTeamStream` / `replaceTeamContext` | Pass | Pass (`carryAgentContextPageState` owns the field list) | Pass | Pass | AR-001 resolved |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Recovery owner → `teamRunOpenCoordinator` → `agentTeamRunStore` | Pass | Pass (the store never starts or knows the recovery) | Pass | Pass | AR-002 resolved |

Principle 16: `Pass — deviation recorded, reason holds`. The owner registers with the store at plugin start, before any Team stream exists. Publishing `required` with none registered throws, so a missing owner fails loudly. `onStreamRecoveryRequired` becomes required, so there is no silent default. The registration drives nothing in the store, so it hides no cycle (D-A1).

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `reopenTeamRunAfterStreamLoss({ teamRunId, selectRun: false })` | Pass | Pass | Pass | Low | Pass |
| Team recovery state `recovering` / `exhausted` | Pass | Pass | Pass | Low | Pass |
| `ensureTeamStreamConnected` (waits for the current service) | Pass | Pass | Pass | Low | Pass, subject to AR-001's handling of the waiting send |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cadence and page-resume rules | Pass (`LiveStreamReconnectScheduler`, as the Org) | Pass | N/A | Pass | — |
| Verified replacement | Pass (`replaceFailedTeamStream`) | Pass | N/A | Pass | — |
| Status at open | Pass (`runStatusStore.statusOf`) | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web `services/runOpen/`, stores, streaming, components; server handler; e2e fixture | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Recovery notice component (reused for the Team) | Pass | Pass | Pass | Pass | — |

## Shared Structure Tightness Verdict

`N/A` (no shared structure changed).

Derived consumers listed: `Pass` (round 2: the page-local fields are carried by one helper; `interruptPending` deliberately not carried, with its reason).

Vocabulary: `Pass`.

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| D-A…D-E rows | Pass | Pass | N/A | Pass | D-E1's seam chosen by implementation and recorded |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/runOpen/teamStreamAutoRecovery.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `applyActiveRuntimePlaceholder`; `activeRunRecoveryCoordinator` and its spec; the `TEAM_STREAM_REOPEN_REQUIRED` throw; the English literal; the null-run branch; the old file name; per-frame timers | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| None | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

`N/A` (no persisted data).

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| A–E; reproductions kept failing on the old code | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The FIFO wire, the status at open, the retry rule | Yes | Pass | Pass | Pass | — |
| A's replacement under a typed draft and a waiting send | Yes | Pass (walks table) | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — The automatic replacement commits while the user has page-local state on the member

- Related approved requirement: REQ-001 (recovery by itself, on the reconnect cadence); REQ-002 (a send during recovery waits, then shows the not-sent notice with the text back); Preserved: 540's not-sent notice with the text back.
- Initiating basis kind: `User` + `System`.
- Trigger: a Team stream enters `reopen_required` (REQ-001's own scenario; AC-001 creates it deterministically) while the user is in that member's composer. Either they are typing, or they have just pressed Send (REQ-002: "a send right after works"; "a send waits … then the not-sent notice").
- Forward path:
  - The recovery attempts at 1, 2, 4… s. On success, `replaceFailedTeamStream` commits `replaceTeamContext`, which swaps in the newly hydrated Team context. Every member `AgentContext` is a new object, and nothing copies `requirement`, `contextFilePaths`, `requestedSkillNames`, `requestedMentions`, `messageNotDelivered`, `collaboratorAddFailure`, `submissionPending` or `interruptPending` from the old one (`agentTeamContextsStore.ts:76-89`; `AgentContext.ts:18-38`).
  - Consequences:
    - (a) A draft being typed disappears from the composer at commit.
    - (b) A send that timed out at 10 s has put the text back and set the not-sent notice on the old member context. A later attempt that commits (for example at 15 s on the cadence) replaces that context, and the restored text and notice vanish.
    - (c) A send still waiting when the commit lands holds its `LocalUserSubmissionHandle` on the old context, so its optimistic row, pending state and failure presentation all target a context no longer shown.
- Today this cannot happen without the user: the replacement runs only when the user reselects the member (an explicit reload).
- Reachability: `Reachable` (REQ-001/REQ-002's own scenario; the cadence makes a commit after a 10 s send timeout ordinary).
- Review consequence: AR-001 (round 1). Round 2: D-A6 carries the fields at the one synchronous commit, and D-A7 retargets a waiting send before any outcome is shown, so each consequence in the premise is covered by a walk.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 2)

## Findings

None open. AR-001 and AR-002 below are `Resolved` (ARCH-REV-002) and kept for traceability.

### AR-001 — The automatic replacement discards the member contexts' page-local state: a typed draft, a returned draft and its not-sent notice, a waiting send

- Status: `Resolved` (SR-002 D-A6, D-A7, walks, AC-010; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: High (blocking in round 1)
- Protects: REQ-002 ("a send waits … then shows the not-sent notice with the text back (540)"); the Preserved line "a send's not-sent notice with the text back (540)"; REQ-001 (recovery by itself must not cost the user their input).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem: D-A1 runs the existing verified replacement automatically. That replacement swaps the whole Team context for a newly hydrated one, and none of the member contexts' page-local state comes across (MP-001). Until now only the user's own reselect, an explicit reload, triggered it. Under the design it commits under the user's hands:
  - a draft in the composer vanishes;
  - a send's returned text and not-sent notice vanish if a later attempt commits;
  - a send waiting across the commit has its local row, pending state and failure presentation on a context the view no longer shows.
  The design's "while recovering, members keep their last status: nothing writes them until the replacement's snapshot" covers status only.
- Evidence: MP-001; `agentTeamContextsStore.ts:76-89`; `AgentContext.ts:18-38`; `agentTeamRunStore.ts:266-290`.
- Required update: state who carries a member's page-local state across the replacement, and in what order. One proportionate shape:
  - **Carry the state at commit.** In the replacement's commit step (`replaceFailedTeamStream` → the `beforeContextCommit`/`replaceTeamContext` boundary, one owner for both the automatic and the reselect path), for each member present in both contexts, copy the composer and notice fields (`requirement`, `contextFilePaths`, `requestedSkillNames`, `requestedMentions`, `messageNotDelivered`, `collaboratorAddFailure`) from the old member context to the new one, before the swap.
  - **Keep sends from straddling the commit.** Either the recovery does not commit while a member has `submissionPending` (it commits on the next attempt), or a waiting send re-targets the current member context when its wait ends. State which.
  - **Name the Stop rule.** A Stop is already settled at `reopen_required` (a final close, 533), so say that `interruptPending` is cleared or carried consistently.
  - **Walk the cases:** typing during a recovery that commits; send → commit during the wait → success; send → 10 s timeout → a later commit (the text and notice survive); a reselect during recovery.
  - **List the fields as derived consumers,** and add specs for these walks.
- Why proportionate: one commit-time copy in the replacement's single owner, plus one rule for an in-flight send. No new machinery.
- Recommended recipient: Solution Designer.

### AR-002 — Who starts the recovery is left open, and both offered wirings hide a cycle or fail silently

- Status: `Resolved` (SR-002 D-A1, D-A2; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: Medium (blocking in round 1)
- Protects: REQ-001 (the recovery must start every time a Team stream needs it).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem: D-A1 starts the recovery from the store's `onStreamRecoveryRequired` "without importing the coordinator statically (for example the store takes a recovery starter from a plugin or a lazy import)".
  - Either way the store would drive the recovery, which drives `reopenTeamRunAfterStreamLoss`, which drives the store's `replaceFailedTeamStream`: each owner drives part of the other's sequence. That is the tangled cycle Principle 9 asks to redesign, merely hidden from the import graph.
  - A starter supplied later must exist before the first `reopen_required`, and fail loudly if it does not. Today `TeamStreamingService`'s `onStreamRecoveryRequired` defaults to `() => undefined` (`:91`), so a missing wiring would mean no recovery, silently (Principle 16; behavior by absence, Principle 13).
- Required update: decide the direction, and record it as a fired Structural Trigger (hidden dependency; backward dependency) with the reason.
  - One proportionate shape: the store only publishes state. Its per-Team recovery state becomes `recovering` when the service enters `reopen_required`, and that is a notification, not a call.
  - The recovery owner (`teamStreamAutoRecovery`), created once at the app's composition root, for example a Nuxt plugin like the other stream owners, watches that state and drives `reopenTeamRunAfterStreamLoss` on its scheduler. So the store never calls the recovery, and the dependency points one way: recovery → coordinator → store.
  - Make a missing recovery owner a loud startup failure, or remove the silent default on `onStreamRecoveryRequired`.
- Why proportionate: it fixes the direction with existing pieces; no new abstraction.
- Recommended recipient: Solution Designer.

## Classification

N/A (Pass). Round 1: `Design Impact` (AR-001, AR-002), both resolved.

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- Round 2: N-1 (end conditions), N-2 (every `enterReopenRequired` path specced) and N-3 (the Offline-then-active spec) are adopted in SR-002.
- N-4 (round 2, non-blocking, REQ-001): D-A2 ends the recovery when "the Team is no longer active (stopped)". An open stopped Team's view still keeps its stream, which tells its state (SR-045), so a real gap there would leave that view stale until a reselect, against REQ-001's "a Team stream that needs recovery recovers by itself".
  - Either keep recovering while the Team's context is open (end only on removal, or when the service is no longer `reopen_required`), or record why a stopped Team is excluded.
  - The case is rare, because the server's order is correct.
- N-5 (round 2, implementation precision, D-A7): the retarget also covers a held send, one with mentions (540 AR-007), whose message is shown only on acceptance. Move the handle without adding a row, and let `acceptLocalSubmission` show it on the new context.

- N-1 (non-blocking, A): say when a recovery ends besides success and `disconnectTeamStream`:
  - the Team context removed (`removeTeamContext`);
  - the Team's current service no longer `reopen_required`;
  - the Team stopped.
  Otherwise `reopenTeamRunAfterStreamLoss` throws "not awaiting recovery" (`teamRunOpenCoordinator.ts:106-108`) and each attempt counts as a failure, so the loop keeps retrying and can show "exhausted" for a Team that is fine.
- N-2 (non-blocking, A): `enterReopenRequired` is also reached through other protocol failures besides the gap (`TeamStreamingService.ts:375`). The recovery covers them all, which is right; name them in AC-001's specs so each path is exercised once.
- N-3 (non-blocking, C, recorded): removing the placeholder also leaves a context shown `Offline` whose run became active again elsewhere, until the stream binds. A send in that window marks activation pending and is sent once bound; the refresh loop clears the mark. That is acceptable, but add a spec of it.
- Rule 12: the stop-generation wire is a test fixture, not a gate input; no build input changes.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, SR-002)
- Material-Premise Gate: `Pass` (MP-001's consequences covered by D-A6/D-A7 walks)
- Round 2 notes: AR-001 is resolved by the one commit-point carry (`carryAgentContextPageState`) and the retargeting of in-flight sends, with walks and AC-010. AR-002 is resolved by the one-way direction (store publishes; plugin-created owner drives) with a loud missing-owner failure and a required callback. N-4 and N-5 are non-blocking.
- Round 1 decision: `Fail`
- Notes: these pass:
  - A's cause, the probe wire's double clock read, is well proven, and the FIFO wire (D-A5) is right;
  - B (status at open from the run-status feed; retry once, then keep the current context);
  - C (no Initializing placeholder for existing contexts; dead coordinator removed);
  - D and E.
  A's automatic recovery is the right behavior (DEC-001). It needs two things before implementation: the member contexts' page-local state carried across the replacement, with a rule for an in-flight send (AR-001), and a one-way, loud wiring for starting the recovery (AR-002).
