# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (supersedes SR-001/SR-002 design content; SR-002 history in solution-revision-record.md)
- Approved requirements baseline: `requirements-doc.md` SR-003: REQ-001..REQ-004 (Team and Agent Org members, consistent with standalone agents), user approval 2026-10-06 (quotes in requirements-doc Document Status). REQ-005 was withdrawn and REQ-006 is pending, so neither is in this design.
- Behavior-defining supplements: None
- Authorities read: `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md`, `.claude/skills/solution-designer/references/requirements-engineering.md` (read 2026-10-06 for SR-003; SR-001/SR-002 were authored **without** reading `design-principles.md` and `requirements-engineering.md`, see design-principles-recheck.md)
- Design status: `Ready`
- Canonical investigation notes: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/investigation-notes.md`
- Conformance recheck: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/design-principles-recheck.md`

## Current-State Read

Base `origin/personal` @ `db39803d4`; frontend only (`autobyteus-web`). The server already serves `getRunFileChanges(agentRunId)` for any AgentRun, including Team and Org members (Org probe in investigation notes; the predecessor ticket fixed live freshness).

Member hydration paths and their revision-guarded state commit:

| Path | Trigger | Fetch | Commit site | Conflict reaction | Artifacts today |
| --- | --- | --- | --- | --- | --- |
| Team open / stream recovery | `teamRunOpenCoordinator.ts:50,112`; `agentTeamRunStore.ts:379` | `teamRunContextHydrationService.hydrateCurrentTeamRunContext`: every member, exact for focused, best-effort others (`:256-262`); expected revision captured **before** the fetch | `teamRunHydrationCommit.commitTeamRunHydrationActivities` (4 call sites) | throw | none |
| Team member lazy (non-authoritative member only) | member inspection | `teamMemberProjectionHydrationService.attemptHydration` (exact); revision captured before the fetch; activities may be reconciled with live tool state | `:100` | retry (max 3) | none |
| Org open / stream recovery | `agentOrgContextsStore.ts:137`, `agentOrgStreamingService.ts:143,294` | `agentOrgContextHydration.stageAgentOrgExecutionContext`: every member, exact; revision captured **after** the fetch | staged `commitActivities` (`:179`) | throw | none |
| Standalone open | run open | `runContextHydrationService` | `runContextHydrationService.ts:175`, `agentRunOpenCoordinator.ts:79` | throw | yes (replace / KEEP_LIVE merge) |
| (Collaborators: pending REQ-006) | — | `agentRunCollaborationHydration` | `:117` | throw | none, out of scope |

The same commit policy (`replaceProjectionActivitiesIfRevisions` + conflict handling) is copied at 6 production sites. The standalone path is the only one that loads artifacts.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 12 production files in `autobyteus-web`: 1 new owner file, Team staging/commit and its 2 caller files, Team lazy, Org staging and its 2 caller files (callback rename), the standalone fetch reuse, and the file-change hydration helper. Specs are in addition. No server, API or persistence change.
- Architectural risk: `High`
- Risk rationale: it introduces a **new shared owner** of member-run state commit sequencing (activities, then artifacts) used by 3 member paths, which changes the commit contract of the Team and Org hydration candidates (an ownership/coordination change). It also includes a concurrency-relevant ordering (revision guard, then merge alongside live `FILE_CHANGE`).
- Escalation trigger: if any path needs a different commit ordering or merge rule than the shared owner provides, or if collaborators are approved (REQ-006), return a `Design Impact` or revision.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Commit-site inventory | `grep replaceProjectionActivitiesIfRevisions` (recheck DF-1) | 6 copies of the revision-guarded commit | One owner for member-run state commit | None |
| Team open staging | `teamRunContextHydrationService.ts:40-80,160-215,240-300` | `activityReplacements` + `projectionByAgentRunId` on the candidate; `stageProjection` returns `ActivityProjectionReplacement` | Replace with one staged per-member record | None |
| Team lazy | `teamMemberProjectionHydrationService.ts:50-110` | Activities reconciled with live tool state before commit | The owner commits caller-built activities | None |
| Org staging | `agentOrgContextHydration.ts:100-180` | Revision captured after the fetch | Caller supplies the expected revision (preserve semantics) | None |
| Store merge | `runFileChangesStore.ts:61-64` | `updatedAt >=` wins | Members merge | Equal-`updatedAt` transient `content` (pre-existing) |
| Server | Org member `getRunFileChanges` probe | Entries returned | No server change | None |

## Intended Change

1. **New owner `services/runHydration/memberRunStateHydration.ts`**: hydration of one collaboration member's run state.
   - `fetchMemberRunState<P>(input: { runId: string; fetchProjection: () => Promise<P> }): Promise<{ projection: P; fileChanges: RunFileChangeArtifact[] }>`: runs the subject-specific projection fetch and `fetchRunFileChanges(runId)` in parallel. If **either** fails, it throws, so artifacts follow exactly the same failure policy the caller already applies to the projection (AC-007).
   - `type MemberRunStateCommit = { runId; expectedActivityRevision; activities; fileChanges }`.
   - `commitMemberRunStates(states: readonly MemberRunStateCommit[]): 'applied' | 'conflict'`: one `replaceProjectionActivitiesIfRevisions` call for all states. On `conflict` it returns without touching artifacts. On `applied` it calls `mergeHydratedRunFileChanges(runId, fileChanges)` for each state. Callers keep their own conflict reaction (throw or retry).
2. **`runFileChangeHydrationService.ts`**: add `fetchRunFileChanges(runId)` (network-only; throws on GraphQL errors; a missing payload returns `[]`, which preserves standalone behavior).
3. **Standalone:** `runContextHydrationService` uses `fetchRunFileChanges`; the inline query and type are removed. Its commit stays as it is (REQ-004; see Deferrals).
4. **Team open:** `hydrateCurrentTeamRunContext` uses `fetchMemberRunState` per member. Exact members throw on failure; best-effort members wrap the **whole** member fetch and yield `null` for projection and artifacts together, extending the existing `fetchBestEffortProjection`. `stageProjection` returns a `MemberRunStateCommit | null`. `TeamRunHydrationCandidate.activityReplacements` is **replaced** by `memberRunStates: readonly MemberRunStateCommit[]`; there is no parallel artifacts map. `commitTeamRunHydrationActivities` is renamed `commitTeamRunHydration`: it calls `commitMemberRunStates` and throws on conflict. The 4 call sites are updated, and `markCommittedTeamRunHydrationAuthority` is unchanged.
5. **Team lazy:** `attemptHydration` uses `fetchMemberRunState` (exact). After the existing guards and live-tool reconciliation it builds a `MemberRunStateCommit` (reconciled activities plus artifacts) and calls `commitMemberRunStates`. On `conflict` it returns `null` (retry, as today); the conversation commit still happens only after `applied`.
6. **Org:** staging uses `fetchMemberRunState` per member (exact, as today). `applyProjection` returns a `MemberRunStateCommit` and keeps capturing the revision after the fetch, as today. The staged result's `commitActivities` is renamed **`commit`**, which calls `commitMemberRunStates` and throws on conflict. The callers are updated: `agentOrgContextsStore.ts:51-63,96,140`, `agentOrgStreamingService.ts:68,151,309`, and the related specs.
7. **Collaborators: no change.** `agentRunCollaborationHydration` and its `commitActivities` stay untouched until REQ-006 is decided.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Req / AC | Trigger | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | REQ-001 / AC-001, AC-002 | Team run open (reload / history row) or stream recovery; member inspection for non-authoritative members | Artifacts empty | Artifacts loaded with the member state and committed by the shared owner | DS-001, DS-002 |
| BEH-003 | User | REQ-002 / AC-003, AC-004 | Org run open / stream recovery | Artifacts empty | Same | DS-003 |
| BEH-005 | User | REQ-003 / AC-005 | Live `FILE_CHANGE` during hydration | Merge | Preserved; the owner merges by `updatedAt` | DS-004 |
| BEH-004 | User | REQ-004 / AC-006, AC-007 | Standalone open; member fetch failure | As today | Preserved | DS-005 |

## Relevant Supplemental Task Artifacts

| Path | Purpose | Relationship |
| --- | --- | --- |
| `design-principles-recheck.md` (this ticket folder) | Conformance findings RF-1..4, DF-1..7 | Basis for SR-003 |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/run-file-change-live-projection-ownership/` | Predecessor; B-003/B-004 evidence | Read-only origin |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination`
- Structural triggers that fire (checked against `design-principles.md#structural-triggers`):
  - **Repeated coordination: fires.** The member-state commit policy is copied at 6 sites, and per-path staging decides independently what a member's state includes. Artifacts were added to only one path, which is this bug.
  - **Shared-structure tightness: fires** for the SR-002 shape (a parallel `fileChangesByAgentRunId` beside `activityReplacements`). Resolved by one `MemberRunStateCommit` record.
  - **Empty indirection: fires** for SR-002's best-effort `fetchMemberRunFileChanges`, which is removed.
  - **Ambiguous boundary: checked, does not fire.** `getRunFileChanges(agentRunId)` always concerns one AgentRun's file changes, and `agentRunId` is unique.
  - **Authoritative boundary: checked, does not fire.** Member services depend on the new owner only, not on both the owner and the stores.
  - Responsibility overload, shared-folder, shared-base overreach, capability-area reuse (reuses `services/runHydration`), legacy cleanup (handled in the removal plan) and persisted data: checked, do not fire.
- Refactor needed now: `Yes`
- Evidence: design-principles-recheck.md DF-1, DF-2, DF-5; commit-site inventory.
- Design response: extract the member-run state hydration owner (fetch + commit); route Team open, Team lazy and Org through it; remove the per-path commit copies and parallel structures in those paths.
- Refactor rationale: it makes "what a member's hydrated state includes" one decision, so a future member path or field cannot be omitted in one path again. Projection queries stay subject-specific (compound identities differ), so they are not unified.
- Intentional deferrals and residual risk:
  - **Standalone commit** (`runContextHydrationService.ts:175`, `agentRunOpenCoordinator.ts:79`) keeps its own copy. Its artifact policy legitimately differs (replace when cold, merge when keeping a live context), and REQ-004 preserves it. Residual risk: two commit copies remain, both outside collaboration members.
  - **Collaborators** (`agentRunCollaborationHydration.ts:117`) keep their copy pending REQ-006. Residual risk: collaborators keep the artifact gap, and their staged callback stays named `commitActivities` while Org's becomes `commit`. If REQ-006 is approved, adopt the same owner and rename.

## Terminology

- **Member run state:** a collaboration member AgentRun's hydrated activities and artifacts (conversation is applied per path to its context).
- **Shared owner:** `memberRunStateHydration.ts`.

## Legacy Removal Policy (Mandatory)

- Remove `TeamRunHydrationCandidate.activityReplacements` (replaced by `memberRunStates`), the direct store commit in `teamRunHydrationCommit.ts`, `teamMemberProjectionHydrationService.ts:100` and `agentOrgContextHydration.ts:179`, and the inline standalone `GetRunFileChanges` query/type.
- Rename `commitTeamRunHydrationActivities` → `commitTeamRunHydration` and the Org `commitActivities` → `commit`. No aliases.
- Do not introduce `fetchMemberRunFileChanges` or `fileChangesByAgentRunId` (SR-002 shapes). Remove them from the paused work in progress.

## Persisted Data / State Transition Decision

`Not Affected`. This is frontend in-memory stores only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/002 | User reloads the page / opens a Team history row | Member artifacts in the Artifacts tab | `teamRunContextHydrationService` → `memberRunStateHydration` | Main Team path |
| DS-002 | Primary | BEH-001/002 | User selects a non-authoritative Team member | Artifacts tab | `teamMemberProjectionHydrationService` → `memberRunStateHydration` | Fallback Team path |
| DS-003 | Primary | BEH-003 | User opens an Org run / stream recovery | Artifacts tab | `agentOrgContextHydration` → `memberRunStateHydration` | Org path |
| DS-004 | Return-Event | BEH-005 | Server `FILE_CHANGE` on the member stream | store merge → Artifacts tab | `fileChangeHandler` | Live path, unchanged |
| DS-005 | Primary | BEH-004 | Standalone open | Artifacts tab | `runContextHydrationService` / `agentRunOpenCoordinator` | Preserved |

## Primary Execution Spine(s)

- DS-001: `Workspace history row / page reload → teamRunOpenCoordinator (or agentTeamRunStore) → teamRunContextHydrationService.hydrateCurrentTeamRunContext → memberRunStateHydration.fetchMemberRunState ⇄ server (getTeamMemberRunProjection ∥ getRunFileChanges → RunFileChangeProjectionService) → commitTeamRunHydration → memberRunStateHydration.commitMemberRunStates → agentActivityStore + runFileChangesStore → ArtifactsTab (activeAgentContext.state.runId)`
- DS-002: `Team member selection → teamMemberInspectionCoordinator → teamMemberProjectionHydrationService.attemptHydration → fetchMemberRunState ⇄ server → guards + live reconciliation → commitMemberRunStates → stores → ArtifactsTab`
- DS-003: `Org history row / reload / stream recovery → agentOrgContextsStore or agentOrgStreamingService → stageAgentOrgExecutionContext → fetchMemberRunState ⇄ server (getAgentOrgMemberRunProjection ∥ getRunFileChanges) → publish(candidate, commit) → commitMemberRunStates → stores → ArtifactsTab`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | Opening a Team stages every member's state (projection and artifacts) under the existing exact/best-effort policy. The Team commit hands all member states to the shared owner, which applies activities under revision guards, then merges artifacts | member run state | Team staging + shared owner | GraphQL fetch |
| DS-002 | A non-authoritative member is hydrated alone; the reconciled activities and artifacts commit through the same owner; a conflict retries | member run state | Team lazy + shared owner | live-tool reconciliation |
| DS-003 | An Org open stages all members; the publish-time `commit()` applies them through the shared owner | member run state | Org staging + shared owner | — |

## Spine Actors / Main-Line Nodes

Open coordinators/stores (trigger), path staging services (`teamRunContextHydrationService`, `teamMemberProjectionHydrationService`, `agentOrgContextHydration`), `memberRunStateHydration` (shared owner), server GraphQL, `agentActivityStore` + `runFileChangesStore`, `ArtifactsTab`.

## Ownership Map

- **`memberRunStateHydration`**: owns *what a member's hydrated run state contains* (activities + artifacts), the parallel fetch of artifacts with the projection under the caller's failure policy, and commit sequencing (revision-guarded activities → artifact merge; no artifact write on conflict).
- **Path staging services**: own the trigger, member enumeration, subject-specific projection query, exact/best-effort policy, revision capture point, conversation application to their contexts, and conflict reaction.
- **Stores**: own merge precedence and revision checks.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Must Not Own |
| --- | --- | --- |
| `teamRunHydrationCommit.commitTeamRunHydration`, Org staged `commit()` | `memberRunStateHydration` | Their own copy of the commit policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `TeamRunHydrationCandidate.activityReplacements` | Partial member state | `memberRunStates` | In This Change |
| Direct `replaceProjectionActivitiesIfRevisions` in `teamRunHydrationCommit.ts`, `teamMemberProjectionHydrationService.ts`, `agentOrgContextHydration.ts` | Duplicated commit policy | `commitMemberRunStates` | In This Change |
| `commitTeamRunHydrationActivities` / Org `commitActivities` names | Now commit full member state | `commitTeamRunHydration` / `commit` | In This Change |
| Inline `GetRunFileChanges` query/type in `runContextHydrationService.ts` | Duplicate fetch | `fetchRunFileChanges` | In This Change |
| Standalone commit copies (2) | — | — | Deferred (see assessment) |
| Collaborator commit copy | — | — | Pending REQ-006 |

## Return Or Event Spine(s) (If Applicable)

DS-004 unchanged.

## Bounded Local / Internal Spines (If Applicable)

- Team lazy retry loop: `attempt → fetchMemberRunState → guards → commitMemberRunStates → applied: commit conversation, mark authoritative | conflict: retry (≤3)`. Artifacts are written only in the `applied` branch.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Owner | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Artifact GraphQL fetch | DS-001..003, DS-005 | `runFileChangeHydrationService` (`fetchRunFileChanges`) | query + error policy | duplicated queries |
| Live-tool reconciliation | DS-002 | `teamMemberToolStateReconciliation` | unchanged | — |

## Ownership Boundaries

Member staging services call `memberRunStateHydration` for fetch and commit, and must not write `agentActivityStore` projections or `runFileChangesStore` directly.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `memberRunStateHydration` | revision-guarded activity commit, artifact merge, parallel artifact fetch | Team open, Team lazy, Org | calling `replaceProjectionActivitiesIfRevisions` or `mergeHydratedRunFileChanges` directly from member paths | extend the owner |

## Dependency Rules

Member staging → `memberRunStateHydration` → (`runFileChangeHydrationService`, `agentActivityStore`). `memberRunStateHydration` must not import Team/Org modules (subject-agnostic; the projection fetch is injected).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `fetchMemberRunState({ runId, fetchProjection })` | one member run | parallel projection + artifacts; throw if either fails | `runId` + injected subject-specific fetch | generic over the projection type |
| `commitMemberRunStates(states)` | member run states | guarded commit then merge | per-state `runId` | returns `applied` / `conflict` |
| `fetchRunFileChanges(runId)` | AgentRun artifacts | strict fetch | `agentRunId` | missing payload → `[]` |

## Interface Boundary Check

All singular with explicit identity. Ambiguous selector risk: Low (DF-3).

## Main Domain Subject Naming Check

| Name | Natural? | Note |
| --- | --- | --- |
| `memberRunStateHydration`, `fetchMemberRunState`, `commitMemberRunStates`, `MemberRunStateCommit` | Yes | concrete concern; no "Helper" naming |
| `commitTeamRunHydration`, Org `commit` | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Member state commit | 6 copies | Create one owner in the existing `services/runHydration` |
| Artifact merge / revision guard | stores | Reuse |
| Artifact fetch | inline standalone | Extend `runFileChangeHydrationService` |

## Subsystem / Capability-Area Allocation

`services/runHydration` (new owner, fetch, Team), `services/agentOrgExecution` (Org), `services/runOpen` + `stores` (call sites). All Extend, plus one new file.

## Draft File Responsibility Mapping

See final.

## Reusable Owned Structures Check

| Structure | File | Why Shared | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- |
| `MemberRunStateCommit` | `memberRunStateHydration.ts` | Same member-state shape in 3 paths | Yes (replaces `ActivityProjectionReplacement` usage in member paths) | Yes (no parallel artifacts map) | a carrier for conversation/context or subject-specific fields |

## Shared Structure / Data Model Tightness Check

`MemberRunStateCommit { runId, expectedActivityRevision, activities, fileChanges }`: one meaning per field, no optional fields. Overlap risk: Low.

## Final File Responsibility Mapping

| File (autobyteus-web/) | Change | Concern |
| --- | --- | --- |
| `services/runHydration/memberRunStateHydration.ts` | Add | shared owner (fetch + commit) |
| `services/runHydration/runFileChangeHydrationService.ts` | Modify | `fetchRunFileChanges` |
| `services/runHydration/runContextHydrationService.ts` | Modify | use `fetchRunFileChanges`; remove the inline query |
| `services/runHydration/teamRunContextHydrationService.ts` | Modify | stage via the owner; `memberRunStates` |
| `services/runHydration/teamRunHydrationCommit.ts` | Modify / rename fn | `commitTeamRunHydration` via the owner |
| `services/runOpen/teamRunOpenCoordinator.ts`, `stores/agentTeamRunStore.ts` | Modify | call `commitTeamRunHydration` |
| `services/runHydration/teamMemberProjectionHydrationService.ts` | Modify | fetch/commit via the owner |
| `services/agentOrgExecution/agentOrgContextHydration.ts` | Modify | stage/commit via the owner; `commit` |
| `stores/agentOrgContextsStore.ts`, `services/agentOrgExecution/agentOrgStreamingService.ts` | Modify | rename the callback |
| Specs | Add/Modify | new `memberRunStateHydration.spec.ts` (ordering, conflict → no artifact write, parallel fetch failure semantics); Team open/coordinator/store specs (AC-001, AC-002); Team lazy spec (AC-002, retry); Org hydration and streaming specs (AC-003, AC-004); standalone spec (AC-006); AC-005 race; AC-007 per-path failure |

## Applied Patterns (If Any)

Staged commit (existing), with commit policy centralized in one owner.

## Target Subsystem / Folder / File Mapping

No new folders; the new file lives in `services/runHydration` next to the existing hydration owners.

## Folder Boundary Check

`services/runHydration`: main-line hydration control; clear; low risk.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Team staging | `const state = await fetchMemberRunState({ runId, fetchProjection: () => fetchExactTeamMemberProjection(teamRunId, runId) })` (best-effort members: wrap this whole call → `null`) | fetching artifacts separately with its own failure policy |
| Commit | `if (commitMemberRunStates(candidate.memberRunStates) === 'conflict') throw new Error(...)` | `replaceProjectionActivitiesIfRevisions(...)` then `mergeHydratedRunFileChanges(...)` written out in each path |
| Candidate shape | `memberRunStates: readonly MemberRunStateCommit[]` | `activityReplacements` + `fileChangesByAgentRunId` side by side |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep `commitActivities` / `commitTeamRunHydrationActivities` as aliases | Rejected | rename all call sites |
| Keep `activityReplacements` alongside `memberRunStates` | Rejected | single field |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `fetchRunFileChanges` + `memberRunStateHydration` with unit specs.
2. Standalone fetch reuse (spec green, AC-006).
3. Team open staging + `commitTeamRunHydration` + 4 call sites + specs.
4. Team lazy + spec.
5. Org staging + `commit` rename + callers + specs.
6. Remove the SR-002-shaped work in progress (`fetchMemberRunFileChanges`, `fileChangesByAgentRunId`, collaborator edits) from the paused worktree.
7. Browser E2E (API/E2E owner): Team and Org, reload and historical.

## Key Tradeoffs

- One owner for 3 member paths, with the standalone path deferred: the standalone path's cold/live artifact policy differs, and REQ-004 forbids changing it.
- Artifacts follow each path's projection failure policy, with no new resilience rule (REQ-005 withdrawn).

## Risks

- Equal-`updatedAt` transient `content` edge case (pre-existing).
- Stricter coupling: an artifact fetch error now fails a member exactly as a projection error does, e.g. an Org open fails. This is consistent with existing behavior, and it is the user-visible effect of withdrawing REQ-005.

## Guidance For Implementation

- Paused work in progress in the worktree follows the SR-002 shape. Rework it to SR-003 and revert the collaborator changes.
- Keep the existing guards, revision capture points and conflict reactions per path.
- Tests for AC-001..AC-004 must fail on base.
