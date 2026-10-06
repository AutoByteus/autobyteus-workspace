# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/requirements-doc.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/investigation-notes.md`
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/solution-revision-record.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed:
  - `design-principles-recheck.md`
  - predecessor ticket folder (evidence only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002` (history), `SR-003` (authoritative)
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1. SR-001/SR-002 took the direct route, so no prior architecture review exists.
- Trigger: `Architecture Design Complete` SR-003 from `/solution_designer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: base `db39803d4` (`git show HEAD:` so the uncommitted SR-002 work in progress is not read). Files read in `autobyteus-web`:
  - `services/runHydration/teamRunHydrationCommit.ts`
  - `teamRunContextHydrationService.ts` (candidate shape, revision capture before the fetch, exact or best-effort staging, `stageProjection`)
  - `teamMemberProjectionHydrationService.ts` (`attemptHydration` guards, reconciliation, commit, retry ≤3)
  - `services/agentOrgExecution/agentOrgContextHydration.ts` (`applyProjection` revision after the fetch, staged `commitActivities`, a missing projection throws)
  - `stores/agentActivityStore.ts` (`replaceProjectionActivitiesIfRevisions` batch semantics)
  - `stores/runFileChangesStore.ts` (`mergeRunProjection` upsert by `updatedAt >=`, never removes)
  - `runFileChangeHydrationService.ts`
  - `components/workspace/agent/ArtifactsTab.vue:43-44` (rows keyed by the active context `runId`, sorted by `updatedAt`)

  Commit-site inventory by grep: 6 production `replaceProjectionActivitiesIfRevisions` call sites, matching DF-1.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: a new shared owner of the member-state commit sequence changes the commit contract of the Team and Org candidates, and the change involves a concurrency-relevant ordering.
- Independent Architecture Review required: `Yes`
- Correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements understood: REQ-001..REQ-004.
  - Team and Org member Artifacts lists hydrate from `getRunFileChanges` after a reload or on a historical run, consistent with standalone agents.
  - Live rows are never lost (REQ-003).
  - Standalone behavior is unchanged (REQ-004).
  - REQ-005 is withdrawn and REQ-006 is pending, so both are excluded.
- Relevant existing behavior confirmed:
  - Only the standalone path loads artifacts.
  - Team open, Team lazy and Org staging load the projection and activities only.
  - The Artifacts tab reads `runFileChangesStore` by the active member `runId`.
- Scope guardrail confirmed: yes. The design excludes collaborators (§Intended Change 7) and server changes.
- Every prospective blocking finding is traceable: N/A (none).
- Remaining material ambiguity: none on intent. See DOC-001 for stale text in the requirements doc.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | Pass | Pass | Pass (DS-001: open or recovery stages every member, and authoritative members are covered there. DS-002: a non-authoritative member gets artifacts on selection) | Confirmed | None |
| BEH-003 | User | Pass | Pass | Pass (DS-003: Org stages all seeds, including members of nested teams, exact) | Confirmed | None |
| BEH-005 | User | Pass | Pass | Pass (merge-only upsert with `updatedAt >=` never removes or reverts newer live rows. The tab sorts by `updatedAt`, so append order does not matter) | Confirmed | None |
| BEH-004 | User | Pass | Pass | Pass (standalone keeps its commit; only the fetch is shared) | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear | Linked | Complete | Consistent | Status Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `design-principles-recheck.md` | Pass | Pass (design-spec §Supplemental) | Pass | Pass. Its "Pending User Decisions" list is superseded by SR-003; see DOC-001 | Pass | None |
| Predecessor ticket folder | Pass | Pass | Pass | Pass | Pass (evidence only) | None |

## Task Design Health Assessment Verdict

| Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | design-spec §Task Design Health Assessment | — |
| Root cause evidence-backed | Pass | `Duplicated Policy Or Coordination`: 6 commit copies (verified), and artifacts exist on one path only | — |
| Refactor decision explicit | Pass | `Yes`; the standalone and collaborator deferrals are named with residual risk | — |
| Reflected in sections | Pass | Removal plan, interface mapping, file mapping, sequence | — |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs Owner | Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass (`commitTeamRunHydration` is a thin facade) | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | N/A | Pass | Pass | Pass (live-tool reconciliation stays off the spine) | Pass |
| DS-003 | Primary | Pass | Pass | Pass (staged `commit()`) | Pass | Pass | Pass | Pass |
| DS-004 | Return-Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Primary (preserved) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Bounded local spine: the Team lazy retry loop is described, and artifacts are written only on `applied`.

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memberRunStateHydration` | Pass | Pass | Pass | Pass | Member paths must not call `replaceProjectionActivitiesIfRevisions` or `mergeHydratedRunFileChanges` directly. The owner is subject-agnostic, and the projection fetch is injected |
| `runFileChangeHydrationService.fetchRunFileChanges` | Pass | Pass | Pass | Pass | One query owner; the inline standalone query is removed |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member staging → owner → stores and fetch | Pass | Pass | Pass | Pass | The owner must not import Team or Org modules |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `fetchMemberRunState({ runId, fetchProjection })` | Pass | Pass | Pass | Low | Pass |
| `commitMemberRunStates(states)` → `applied` / `conflict` | Pass | Pass | Pass | Low | Pass |
| `fetchRunFileChanges(runId)` | Pass | Pass | Pass (`agentRunId` unique; DF-3) | Low | Pass |
| `commitTeamRunHydration` / Org `commit` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member-state commit | Pass | Pass | Pass (one owner replaces 3 member copies) | Pass | Lives in the existing `services/runHydration` |
| Revision guard / merge | Pass | Pass | N/A | Pass | Store semantics reused unchanged |

## Subsystem / Capability-Area Allocation Verdict

| Area | Clear | Sound | Supports Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/runHydration`, `services/agentOrgExecution`, `services/runOpen`, `stores` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemberRunStateCommit` | Pass | Pass | Pass | Pass | Replaces the SR-002 parallel `fileChangesByAgentRunId` |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | No Redundancy | Overlap | Core/Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MemberRunStateCommit { runId, expectedActivityRevision, activities, fileChanges }` | Pass | Pass | Pass | N/A | Pass | Non-optional fields; no conversation or context fields |
| `TeamRunHydrationCandidate.memberRunStates` | Pass | Pass | Pass | N/A | Pass | `projectionByAgentRunId` stays for authority marking; that is a distinct meaning. `TeamRunRecoveryHydrationCandidate` inherits the field through `Omit` |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memberRunStateHydration.ts` (new) | Pass | Pass | Pass | Pass | Fetch and commit for one subject |
| `runFileChangeHydrationService.ts` | Pass | Pass | N/A | Pass | — |
| Team, Org and standalone files and callers | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Item | Clear | Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New file in `services/runHydration` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `activityReplacements` | Pass | Pass | Pass | Pass | — |
| 3 member commit copies | Pass | Pass | Pass | Pass | — |
| Old names (no aliases) | Pass | Pass | Pass | Pass | — |
| Inline standalone query | Pass | Pass | Pass | Pass | — |
| SR-002 work-in-progress shapes and collaborator edits | Pass | Pass | Pass | Pass | Step 6 of the sequence |
| Standalone and collaborator copies | Pass | N/A | Pass (deferred, with rationale) | Pass | Residual risk named |

## Legacy / Backward-Compatibility Verdict

| Area | Retained | Clean-Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Renamed callbacks | No | Pass | Pass | Aliases rejected |
| Candidate field | No | Pass | Pass | Single field |

## Persisted-Data Transition Verdict (When Applicable)

| Subject | Decision | Evidence | Proportionate | Migration | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend in-memory stores | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Owner → standalone fetch → Team open → Team lazy → Org → WIP cleanup → E2E | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team staging, commit, candidate shape | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### MP-001 — `getRunFileChanges` fails for a member whose projection fetch succeeds (AC-007)

- Related approved requirement or established contract: AC-007, restated as preserved behavior.
- Relevant behavior ID(s): BEH-001..003
- Initiating basis kind: `System` (server or transport failure)
- Independent product-supported initiating trigger: none identified. For a resolvable member, the server returns entries. For an unknown run it returns an empty list (`RunFileChangeProjectionService.readProjectionContext` returns an empty projection when the run is not located). A failure therefore needs a server or infrastructure fault, which is out of scope by default (Principle 6).
- Forward path: N/A.
- Consequence: the design adds **no** machinery for this premise. Joining two promises so that either failure rejects is the minimal shape, and it follows each path's existing projection policy, consistent with how the standalone path already treats file-change errors. The user-visible note in design §Risks ("an Org open fails") applies only under such a fault.
- Reachability: `Not Reachable` as a supported scenario. Infrastructure failure is out of scope by default.
- Review consequence: no finding. The design's choice is acceptable because it introduces no new policy machinery. See DOC-001 for the approval-text clarification.

### MP-002 — A live `FILE_CHANGE` arrives while member hydration is in flight (SCN-005)

- Initiating basis kind: `System`. A supported runtime event: an active member keeps producing files while the user reloads or opens the run.
- Path: live handler → `upsertFromLivePayload`, then the hydration commit → `mergeRunProjection`. The live row is newer, so `updatedAt >=` keeps it. Older server rows are added. Nothing is removed. On an activity conflict, no artifact write happens, and Team/Org throw or Team lazy retries, as today.
- Reachability: `Reachable` (Supported Normal Scenario).
- Review consequence: the design handles it with existing store semantics. The pre-existing equal-`updatedAt` transient `content` edge case is named as a residual risk.

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking.

## Review Decision

`Pass`

## Findings

None blocking.

Non-blocking:

- **DOC-001 (requirements-doc stale text; Solution Designer):** the Document Status, the §Unapproved Items table and the design spec are consistent and authoritative. Several body sections still carry pre-SR-003 text, which an implementer could misread:
  - The In-Scope Use Cases table still lists UC-004, and the behavior table still lists BEH-006.
  - The scenarios table still lists SCN-006 without a "pending" marker.
  - The Traceability table still maps REQ-005 and REQ-006.
  - "Exact approved requirements baseline: SR-001".
  - Architecture Phase Input still says "Verify the standalone failure behavior for REQ-005".
  - AC-007 is mapped to REQ-004 (the standalone requirement), although it governs member paths.
  - design-principles-recheck §Pending User Decisions item 2 asked for user approval to replace REQ-005. SR-003 instead treats AC-007 as preserved behavior needing no approval. That is acceptable because MP-001 is out of scope and no machinery is added, but the record should state it consistently.

  Recommend cleaning these up at the next revision. No design change follows from them.
- **IMPL-NOTE-001 (implementation guidance):**
  - For Team best-effort members, keep `projectionByAgentRunId` = `null` whenever the whole `fetchMemberRunState` fails, so that `markCommittedTeamRunHydrationAuthority` does not mark the member authoritative. The lazy path (DS-002) then supplies projection and artifacts on selection.
  - Revert the collaborator edits in the paused work in progress (`agentRunCollaborationHydration.ts`, `agentRunCollaborationStreamingService.ts`, `agentRunCollaborationStore.ts` and their specs), as the design already states.

## Classification

N/A (Pass).

## Recommended Recipient

The primary pass recipient (`/implementation_engineer`), with an informational notice to `/solution_designer`.

## Residual Risks

- The standalone commit copies (2) and the collaborator copy (1) remain, deferred with rationale. If REQ-006 is approved, adopt the owner for collaborators and rename their `commitActivities`.
- The equal-`updatedAt` transient `content` merge edge case is pre-existing.
- Predecessor RSK-001 (404 wording) and the failing server integration test are out of scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Not Reachable, with no machinery; MP-002 Reachable and handled by existing semantics)
- Notes: SR-003 correctly resolves the repeated-coordination trigger with one subject-agnostic owner. DOC-001 and IMPL-NOTE-001 are advisory.
