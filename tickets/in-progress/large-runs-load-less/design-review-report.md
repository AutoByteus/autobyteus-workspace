# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/requirements-doc.md` (SR-001, approved by the Solution Designer within the direction; user informed)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md`
- Reviewed Design Spec: `…/design-spec.md` (SR-002, Ready; user approval of the design `Not required`)
- Supplemental Task Artifacts Reviewed: `evidence/M-*` (before measurements, the CPU profile), `evidence/probes/*.mjs`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Solution Designer re-review request (SR-002, for ARCH-REV-001), 2026-11-01
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail: AR-001…AR-004)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less` @ `efd28d5c4a` (no source changes). Code opened at the lines cited below.

## Round 2 Scope (SR-002)

SR-002 answers each finding in the design's "SR-002 Revision Summary". Verified against the code and the revised sections (DS-001…DS-005, the removal plan, the interface table, the mapping, the sequence step 1, and Risks):

- **AR-001: resolved.**
  - Inspections read and validate the tree only. The live `openPackageSnapshotConnection().snapshot` and the stored snapshots (`StandaloneRootPackageSnapshot`, which today reads `readMessages` at `standalone-agent-run-root-manager.ts:282`; the org inspection, `agent-org-run-manager.ts:189-197`; the team stream snapshot) drop `messages`.
  - Tree-plus-log validation moves to one records owner per root:
    - org: the existing `getCollaborationRecordsSnapshot` (`agent-org-run-manager.ts:148`), which gains the validation;
    - hub: a new equivalent on the standalone manager;
    - team: the existing projection service (`team-communication.ts:50-56` → `getTeamCommunicationProjectionService`).
  - The participant query, reference content (including the hub route that today reads `inspection.snapshot.messages`, `agent-collaboration-references.ts:17-20`) and resume read through them.
  - A damaged log fails only those reads, and the view opens (AC-006).
- **AR-002: resolved.**
  - Buffering starts before the request.
  - Merge by message ID. `baseChangeSequence` is removed from the result: message IDs are unique and the buffer covers the request window, so ID merge is sufficient.
  - `reloadRoot` abandons in-flight loads (generation) and reloads loaded lists on every rebuild. The named call sites cover reconnect, gap and checkpoint reopen, recovery and inspect.
  - Tests for a gap reopen during and after a load.
- **AR-003: resolved.** `MemberLoader` keeps a per-root generation, bumped by every rebuild (initial open, team stream recovery, org `source: 'stream'`, gap/checkpoint reopen). "Hydrated" is per member context in the current generation. Only the focused member is staged; recovery stays exact for that member between the checkpoints. Others load on open. A test covers a member hydrated before a stream failure.
- **AR-004: resolved.** No query for a remote focused participant (empty, as today). The server rejects non-participants. No remote fetching.

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`.
- Classification rationale reviewed: it changes shared view contracts for every root kind, live and stored; message completeness under live append is a correctness invariant; and readiness moves the startup validation boundary (DESIGN.md rule 7). The classification is confirmed.
- Independent Architecture Review required by the classification: `Yes`

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for the approved intent. The target paths have gaps (AR-001…AR-004).
- Approved requirements / intended behavior understood:
  - REQ-001: members on demand, through one shared loader.
  - REQ-002: no message log in views or snapshots; the Team tab loads its participant's messages when shown, complete and in order.
  - REQ-003: one view read per hub click.
  - REQ-004: structure-only admission; messages validated where read; a damaged log reported then (AC-006).
  - REQ-005: no repeated forced layout.
  - Items 161, 200 and 118 are dropped with evidence (DEC-003), which falls within the user's rule.
- Relevant existing behavior and evidence confirmed:
  - E-01: the projectors put the message log in every view: `agent-collaboration-view-projector.ts:39-40`, `agent-org-execution-view-projector.ts:55-56`, `team-execution-view-projector.ts:67`.
  - E-03: the readiness scan reads and validates every team and org log (`root-run-package-current-validator.ts:157-163,189-195`), and `admitCurrent` rebuilds (`root-run-package-readiness-index.ts:48-53`).
  - E-04: team open fetches every member (`teamRunContextHydrationService.ts:266-318`); org does the same (`agentOrgContextHydration.ts:145-165`).
  - E-06: Settings reads the view again.
  - M-163: the CPU profile.
  - Every message-list consumer goes through `listMessages()` / `listCommunicationMessages()`: `CollaborationMessagesSection.vue:36`, `activeContextStore.ts:87`, `MobileTeamMessages.vue:94`, `MobileActivityDigest.vue:97`, `test-support/teamWorkspaceContextView.ts:59`. This matches the design's consumer list.
- Scope guardrail confirmed: UC-001…UC-005. Out of scope: storage formats, single-member paging, the dropped items, and other teams' Tasks.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Statements about existing code the design relies on:
  - **"Remote: a remote child's messages come from its node's view today" (Risks) is not what the code does.** Today a remote child's Team tab is empty. Org: `agentOrgExecutionContext.ts:421-423` returns `[]` with the comment "A remote child's messages are in its own run's log on its node". Hub: remote agents are not participants (`agentRunCollaborationIndex.ts:82-84`), so `perspective(remoteId)` is empty. See AR-004.
  - **The design does not mention that view inspections read and validate the whole log server-side.** Example: the stored org inspection reads the messages and validates them with the tree (`agent-org-run-manager.ts:189-197`). See AR-001.
  - **Team hydration has a third entry form that the design does not trace:** stream recovery loads every member exactly, under checkpoints (`teamRunContextHydrationService.ts:358-376`, `teamRunOpenCoordinator.ts:115-130`). Org hydrates every member again from a stream view (`agentOrgContextHydration.ts:145-147`, `source === 'stream'`). See AR-003.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (SR-002: buffer before request, ID merge, `reloadRoot` on every rebuild; remote rule) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (SR-002: tree-only inspections; `MemberLoader` generation per rebuild) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (a damaged log fails only the records-owner reads; the view opens) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass (the profile supports the cause; DEC-001 escalation) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/M-*`, `evidence/probes/*.mjs` | Pass | Pass | Pass (M-151 is to be measured in the build, as stated) | Pass | Pass (evidence only) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Performance, plus loading moments | — |
| Root cause explicit, evidence-backed | Pass | The view owns Team-tab data; duplicated member loading; validation in the wrong lifecycle; per-update forced layout | — |
| Refactor decision explicit | Pass | One participant owner; one member loader; per-run admission | — |
| Supported by concrete sections | Pass | Records owners per root; tree-only inspections (SR-002) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Views | Pass | Pass (tree-only inspection) | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Participant messages | Pass | Pass | Pass | Pass | Pass (web owner; server resolver → records owner) | Pass | Pass |
| DS-003 | Member loader | Pass | Pass (every entry form) | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Settings | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Readiness | Pass | Pass (records owners are the only log readers) | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Feed | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `collaborationParticipantMessages` query | Pass | Pass | Pass | Pass | — |
| `CollaborationParticipantMessages` (web) | Pass | Pass | Pass | Pass | — |
| `MemberLoader` | Pass | Pass | Pass (generation per rebuild) | Pass | — |
| Root managers' inspections and records owners | Pass | Pass | Pass | Pass | Views read the tree; only the records owners read the log |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web contexts → owners, never queries directly | Pass | Pass | Pass | Pass | — |
| server resolver → root managers' readers | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `collaborationParticipantMessages(rootKind, rootRunId, agentRunId) → { messages }` | Pass | Pass | Pass (compound; non-participants rejected) | Low | Pass |
| `CollaborationParticipantMessages.list/load/append/reloadRoot` | Pass | Pass | Pass | Low | Pass |
| `MemberLoader.ensure(context, agentRunId)` | Pass | Pass | Pass | Low | Pass |
| `admitCurrent(family, id)` (one package) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member loading | Pass | Pass (extract one from two) | Pass | Pass | — |
| Perspective order and shape | Pass | Pass | N/A | Pass | — |
| Log readers and validators | Pass | Pass (records owners) | N/A | Pass | — |
| Root stream rebuilds (gap, checkpoint, reconnect, recovery) | Pass | Pass (`reloadRoot` call sites) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| contracts, projectors, query, run-history, managers | Pass | Pass | Pass | Pass | — |
| web `collaborationMessages/`, `memberLoader.ts`, contexts, Settings, feed | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member loading (two loaders → one) | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View DTOs (field removed) | Pass | Pass | Pass | N/A | Pass | — |
| Server package snapshots | Pass (`messages` dropped) | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (SR-002 adds the server snapshots, inspections and reference-content readers).

Domain vocabulary keeps one meaning per word: `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Every mapped file | Pass | Pass | N/A | Pass | — |
| Root managers' inspections and records owners (SR-002 mapping) | Pass | Pass | N/A | Pass | — |
| Team stream recovery and org stream hydration (SR-002 DS-003) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/collaborationMessages/`, `services/runHydration/memberLoader.ts`, `api/graphql/types/collaboration-participant-messages.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| View message fields, team snapshot `messages`, `getTeamCommunicationMessages`, held messages in contexts | Pass | Pass | Pass | Pass | — |
| All-member hydration; the duplicate loaders | Pass | Pass | Pass (recovery exact only for the focused member) | Pass | — |
| Message reads in the readiness scan; full rebuild in `admitCurrent` | Pass | Pass | Pass | Pass | — |
| Message reads and message validation in view inspections and package snapshots; the hub reference route's snapshot read | Pass | Pass | Pass | Pass | — |
| Settings' own read; the per-update forced layout | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| View fields, the old team query | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Message logs, trees | `Not Affected` | Pass (reads and transport only) | Pass | N/A | Pass | — |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 | Pass. Records owners and the query come first; the DEC-001 (b) stop is in step 7 | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Messages, live merge, admission, scroll | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A team or org run whose stored message log is damaged is opened

- Related requirement: REQ-004, AC-006 (the Team tab shows the messages as unavailable with the reason; resume is refused). This is SCN-007, a Supported Explicit Edge Scenario.
- Initiating basis kind: `User` / `Operational`
- Trigger: the user opens a stored run whose log is damaged. With the structure-only scan this run is now admitted and listed.
- Forward path (org, stored): `getInspection` → `communicationStore.read(dir, tree)` → `validateAgentOrgStatePackage({ executionTree, communicationMessages })` (`agent-org-run-manager.ts:189-197`). A damaged log throws "inspection package is unavailable".
- Consequence: the whole run fails to open, not only its Team tab. Today such a run is excluded at the scan; under the design it is listed but cannot be opened. That contradicts AC-006.
- Reachability: `Reachable` (the scenario the requirement names)
- Review consequence: AR-001. **Round 2: resolved** (tree-only inspections; records owners).

### `MP-002` — A root's stream reopens after a sequence gap while a participant list is loaded or loading

- Related requirement: REQ-002 ("the loaded list equals the stored log"), AC-002
- Initiating basis kind: `System`
- Trigger: a root stream event arrives with an unexpected change sequence. The context requires a reopen (`agentRunCollaborationContext.ts:146-148`, `teamExecutionViewState.ts:292,371`) or returns `checkpoint_required` (`:158-160`). This is existing, supported handling.
- Forward path: the view is re-read; events in the gap are never applied on the client. A loaded participant list that is not reloaded misses any `communication` event in the gap. A load in flight at that moment may miss it too, if its snapshot predates the gap.
- Consequence: the Team tab misses messages until the next reload.
- Reachability: `Reachable`
- Review consequence: AR-002. **Round 2: resolved** (`reloadRoot` on every rebuild; in-flight loads abandoned).

### `MP-003` — A team stream fails and is recovered, then the user opens another member

- Related requirement: REQ-001, and BEH-002 preserved ("statuses, Task summaries, live updates, history")
- Initiating basis kind: `System` then `User`
- Trigger: a Team stream needs recovery (`runStore.isTeamStreamReopenRequired`). Today recovery reloads **every** member exactly, between two checkpoints (`teamRunContextHydrationService.ts:358-376`). Org re-hydrates every member from a stream view (`agentOrgContextHydration.ts:145-165`).
- Forward path under the design: hydration stages only the focused member. A member that was hydrated before the failure and missed events while the stream was down is still marked hydrated, so `MemberLoader.ensure` does not reload it.
- Consequence: a stale or incomplete conversation for that member.
- Reachability: `Reachable`
- Review consequence: AR-003. **Round 2: resolved** (`MemberLoader` generation per rebuild).

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements.

## Review Decision

- `Pass`

## Findings

None open. AR-001…AR-004 are resolved (see ARCH-REV-002 in the revision record).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- QR-004 depends on the DEC-001 (a) result. The escalation to the user is defined (step 7).
- Measurements run beside other teams' work. The load is recorded per measurement (R-01).
- A Team tab shows a short loading state per participant, which DEC-001 and the UI section accept.
- Wording drift: the Ownership Map line for `CollaborationParticipantMessages` still says "reload on reconnect", while the narrative and DS-002 say every rebuild. Implementation follows DS-002.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001…MP-003 are Reachable; resolved by SR-002)
- Notes: task_size=Large, architectural_risk=High. Messages leave views for a participant query whose server side reads only through one records owner per root. The web side uses one participant-list owner with `reloadRoot` on every rebuild, and one `MemberLoader` with a generation per rebuild. Admission is structure-only and per package; Settings reuses the view; layout is read once per frame. The escalation triggers in the design apply: a consumer beyond the seam, an ordering case the rule cannot keep, and QR-004 missed.
