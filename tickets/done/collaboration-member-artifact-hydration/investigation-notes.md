# Investigation Notes

## Investigation Meta

- Package identifier: `collaboration-member-artifact-hydration`
- Request / ticket: Team-member (and Agent Org member) Artifacts tab is empty after page reload or for historical runs; make it consistent with standalone agents.
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/collaboration-member-artifact-hydration`
- Resolved base remote / branch / revision: `origin/personal` @ `db39803d4` (fetched 2026-10-06; includes predecessor ticket merge `64ec8bcda`)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read: `references/requirements-engineering.md`, `references/architecture-design.md`, `design-principles.md`. They were read on 2026-10-06 at SR-003; SR-001/SR-002 investigation was done without `requirements-engineering.md` and `design-principles.md` (see design-principles-recheck.md).
- Investigation status: Complete for requirements and architecture.

## Initial Request And Clarifications

- Origin: predecessor ticket `run-file-change-live-projection-ownership` SR-002 (archived at `tickets/done/run-file-change-live-projection-ownership/`). API-REV-001 B-003/B-004 found that the Team-member Artifacts list is empty after reload or on historical runs, while the server returns the correct entries. The user chose to split it into this follow-up ticket.
- User statements (2026-10-06):
  - On the follow-up behavior, which the user agreed should be "consistent" with standalone agents: "i guess stay consistant?" → "agreed. but lets finish this current bug ticket first. and then work on this one right?"
  - Bootstrapping this ticket: "cool. lets bootstrap the "the team-member Artifacts ticket." ticket. does agent org has the same issue? if it has the same issue lets fix it here as well"
- Clarification resolved by investigation: Agent Org members have the same gap (see below), so they are in scope per the user's instruction.

## Product And Domain Understanding

- Product area: Artifacts tab of collaboration members (Agent Team members, Agent Org members).
- Standalone agents: opening a run loads `getRunFileChanges(runId)` and hydrates the `runFileChangesStore`. Live `FILE_CHANGE` events merge into the same store.
- Collaboration members: only live `FILE_CHANGE` events populate the store; there is no initial load.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | Code | `grep -rn "hydrateRunFileChanges\|mergeHydratedRunFileChanges\|GetRunFileChanges" autobyteus-web` (non-test) | Who loads artifacts | Only `services/runOpen/agentRunOpenCoordinator.ts` (merge at L73 for KEEP_LIVE_CONTEXT, replace at L96 otherwise) and `services/runHydration/runContextHydrationService.ts` (L76 query, L204) | Gap confirmed |
| 2026-10-06 | Code | `services/runHydration/teamMemberProjectionHydrationService.ts` (`ensureAuthoritativeTeamMemberProjection`) | Team member hydration | Fetches exact member projection (conversation, activities) on member inspection; live-tool-authority reconciliation; no file changes | Add artifacts here |
| 2026-10-06 | Code | callers: `services/runOpen/teamMemberInspectionCoordinator.ts:42`, `stores/runHistoryTeamMemberInspectionActions.ts:120` | Trigger | Member selection / inspection | — |
| 2026-10-06 | Code | `services/agentOrgExecution/agentOrgContextHydration.ts` (`stageAgentOrgExecutionContext`, `fetchProjection`, `applyProjection`) | Org member hydration | On org open (`source: inspection` or `stream`), hydrates every member's conversation/activities via `GetAgentOrgMemberRunProjection`; no file changes | Add artifacts here |
| 2026-10-06 | Code | `services/agentStreaming/teamStreamDtoAdapters.ts:89,108` → `agentStreamMessageProjector.ts:209` → `handlers/fileChangeHandler.ts` | Live path | Team and Org streams map `FILE_CHANGE` to member runId and merge into `runFileChangesStore` | Live path is fine |
| 2026-10-06 | Code | `stores/runFileChangesStore.ts` `replaceRunProjection` / `mergeRunProjection` (`shouldApplyIncomingProjection`) | Store semantics | Replace for authoritative cold load; merge keeps newer live entries | Reuse the policy |
| 2026-10-06 | Runtime | `curl localhost:8000/graphql getRunFileChanges(runId: solution_designer_f8f18a3a…)` for an Agent Org member (`agent_orgs/software_development_department_…/software_engineering_team_…/solution_designer_…`) | Does the server serve org members? | Returns the entries (14 on disk) | Server needs no change |
| 2026-10-06 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/services/collaboration-execution-location-service.ts:36-46` | Server resolution | `findAgent` resolves team, org and standalone agent runIds | — |
| 2026-10-06 | Evidence | predecessor `api-e2e-evidence/browser/12-team-after-reload.png`, `13-team-historical-member-empty.png` | Symptom | "No touched files yet" for Team member after reload and on historical run | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select a Team member of an active run after page reload | inspection → projection hydration (no artifacts) | Artifacts empty until the next live FILE_CHANGE | API-REV-001 B-003 | High |
| BEH-002 | User | Select a Team member of a historical run | same | Artifacts empty | API-REV-001 B-004 | High |
| BEH-003 | User | Open an Agent Org run (active after reload, or historical) and select a member | org staging hydration (no artifacts) | Artifacts empty (same mechanism) | Code; server returns data | High (code-evident) |
| BEH-004 | User | Standalone agent open | `GetRunFileChanges` + replace/merge | Correct | Code | High |
| BEH-005 | User | Live FILE_CHANGE for Team/Org member | stream → merge | Correct | Predecessor AC-006 | High |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication |
| --- | --- | --- |
| `services/runHydration/runFileChangeHydrationService.ts` | store commit helpers (replace / merge) | Reuse |
| `services/runHydration/runContextHydrationService.ts` | standalone fetch of `GetRunFileChanges` (inline) | Fetch logic could be shared |
| `services/runHydration/teamMemberProjectionHydrationService.ts` | Team member authoritative hydration, with conflict/supersede guards | Add artifact fetch + commit inside the same guarded commit |
| `services/agentOrgExecution/agentOrgContextHydration.ts` | Org staging with deferred `commitActivities()` | Add artifact fetch in staging and commit with activities |
| `graphql/queries/runHistoryQueries.ts` `GetRunFileChanges` | existing query | Reuse; no server change |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- None (no data format change).

### Structural Surfaces

- Frontend hydration services for Team and Org members; possibly a shared fetch helper.
- Server: no change.

### Potential Structural Impacts To Investigate

- API: none (existing `getRunFileChanges`).
- Persistence: none.
- Concurrency: the commit must not drop live entries that arrived during the fetch. Use the existing store merge rule when the live stream is authoritative, mirroring the standalone path.
- Ownership: stays within the existing hydration owners.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| GraphQL `getRunFileChanges` on Org member | SCN-003 | Correct entries returned | Frontend-only fix | curl output (Source Log) |
| Predecessor browser evidence | SCN-001/002 | Empty Team-member list | Confirms symptom | predecessor `api-e2e-evidence/browser/12*`, `13*` |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User | Team members consistent with standalone; include Org if affected | Direct | REQ-001..003 |

## External Contracts, Standards, And Dependencies

None.

## Persisted Data And State Facts

Not affected.

## Product Design Request Context

`Not stated`; N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/run-file-change-live-projection-ownership/` | predecessor ticket | Origin evidence (B-003/B-004 screenshots, SR-002) | Final, read-only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | Hydration racing live FILE_CHANGE could drop or duplicate rows | Design uses the store merge rule under live authority (as standalone) | Addressed in design |
| RSK-002 | Risk | Org staging fetches all members at once; one more query per member | Same fan-out as existing projection fetch; acceptable | Accepted |
| NOTE-001 | Known | Pre-existing failing server integration test "hydrates historical AutoByteus team-member file changes" (stale seed per predecessor CRR-002) | Out of scope unless needed by verification | Open (non-blocking) |

## Architecture Investigation Findings

- Team member hydration is lazy per member (on inspection), guarded by context identity, selection-intent supersession and activity-revision conflict checks. Artifacts should be fetched alongside the projection and committed at the same point (after the guards pass).
- Org hydration is eager for all members at staging and commits activities later via `commitActivities()`. Artifacts should be fetched during staging and committed in the same commit step, so a released or superseded staging doesn't write.
- Standalone commit policy: replace when the hydrated context is authoritative cold state; merge when a live stream already owns the context (`KEEP_LIVE_CONTEXT`).

## Requirement Implications

- Frontend-only. Team and Org members are both in scope.

## Notes For Architecture Design

- Map SCN-001..SCN-004 to the Team and Org hydration owners; reuse `GetRunFileChanges` and the store commit helpers; consider a small shared fetch helper used by the standalone, Team and Org paths.

## Architecture Investigation Addendum (2026-10-06)

| Source | Finding | Implication |
| --- | --- | --- |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts` (`stageAgentRunCollaborationContext`, `fetchProjection` via `GetAgentRunCollaborationMemberProjection`) | Collaborators of a standalone host run are staged like Org members (conversation/activities, deferred `commitActivities()`); no file changes | Same gap → BEH-006 / REQ-006 |
| `stores/agentOrgContextsStore.ts:51-63,137-140`, `services/agentOrgExecution/agentOrgStreamingService.ts:68,143-151,294-309`, `stores/agentRunCollaborationStore.ts:67-70,124`, `services/agentCollaboration/agentRunCollaborationStreamingService.ts:51,187` | Callers of the staged `commitActivities()` | The commit callback must also commit artifacts; it should be renamed to reflect its broader meaning |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-location-service.ts:61-67` | Server resolves standalone-root collaborator runIds through `CollaborationExecutionLocationService.findAgent` | `getRunFileChanges` should serve collaborators. No live data with collaborator artifacts was available on node 8001, so a verification point is added (AC-008) |
| `stores/runFileChangesStore.ts:61-64` `shouldApplyIncomingProjection` | Merge applies incoming when `updatedAt >=` existing | Merging the server list never reverts newer live entries. Server entries are never deleted from a projection, so merge (not replace) is correct for members |
| `services/runHydration/runContextHydrationService.ts:65-96` | Standalone fetches `GetRunFileChanges` inline and throws on errors (the whole open fails) | Extract a shared fetch; keep standalone throwing (REQ-004) |

## Architecture Investigation Addendum 2 — DI-001 (2026-10-06)

| Source | Finding | Implication |
| --- | --- | --- |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:240-300` (`hydrateCurrentTeamRunContext`) | Eagerly fetches all member projections (exact for focused, best-effort others) on Team open / stream recovery; builds `TeamRunHydrationCandidate` | Primary Team path on reload and historical open; artifacts must be staged here |
| `autobyteus-web/services/runHydration/teamRunHydrationCommit.ts` | `commitTeamRunHydrationActivities` + `markCommittedTeamRunHydrationAuthority` (marks members authoritative) | The lazy member path is skipped for those members; commit artifacts in the Team commit |
| Call sites: `services/runOpen/teamRunOpenCoordinator.ts:65,67,128,136`; `stores/agentTeamRunStore.ts:310,312,481,483` | 4 commit sites | Rename and update |
| `services/runHydration/runContextHydrationService.ts` (standalone) | Missing `getRunFileChanges` payload currently yields `[]` | Shared strict fetch keeps `[]` (REQ-004) |

## Architecture Investigation Addendum 3: SR-003 Principles Recheck (2026-10-06)

| Source | Finding | Implication |
| --- | --- | --- |
| `grep replaceProjectionActivitiesIfRevisions autobyteus-web` | 6 production commit sites: `agentRunOpenCoordinator.ts:79`, `runContextHydrationService.ts:175`, `teamRunHydrationCommit.ts:10`, `teamMemberProjectionHydrationService.ts:100`, `agentOrgContextHydration.ts:179`, `agentRunCollaborationHydration.ts:117` | Repeated-coordination trigger → shared member-run state owner (design-spec SR-003) |
| `teamRunContextHydrationService.ts:50-58` (`TeamRunHydrationCandidate`) | `activityReplacements` (+ SR-002 WIP `fileChangesByAgentRunId`) | Replace with one `memberRunStates` record |
| `agentOrgContextHydration.ts` `applyProjection` | Expected activity revision captured after the fetch | Preserve via caller-supplied revision |
| `components/workspace/history/AgentRunTaskRows.vue`; `components/workspace/agent/ArtifactsTab.vue:41` | Collaborators are selectable task rows; the Artifacts tab reads the active context runId | Scenario evidence for REQ-006 (pending user decision) |
| Worktree state | Paused implementation WIP, 21 modified files in the SR-002 shape (uncommitted) | Must be reworked to SR-003 |
