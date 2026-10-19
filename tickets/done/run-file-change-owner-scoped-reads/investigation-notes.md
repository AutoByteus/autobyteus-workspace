# Investigation Notes — File Reads Name The Run They Belong To

## Investigation Meta

- Package identifier: `run-file-change-owner-scoped-reads`
- Request / ticket: Project Task "File reads should name the run they belong to (today each read searches every saved run, about 1–2 s)" — follow-up FU-3 of autobyteus-93 (Task e6985045, `delegated-copies-slow-open`), requested by the user on 2026-10-18 through that Task's Solution Designer; delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-19.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads`, branch `codex/run-file-change-owner-scoped-reads`
- Resolved base remote / branch / revision: `origin` / `personal` / `cba6b85122` (v1.5.6-beta.8 bump; fetched 2026-10-19). autobyteus-93 is merged on this base (`616b3968d0`).
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree and branch created from freshly fetched `origin/personal`. No install or build run yet (design-only phase).
- Bootstrap blocker: none
- Current solution revision ID: `SR-003`
- Authorities read: requirements gate `references/requirements-engineering.md` (2026-10-19); architecture gate `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `TESTING.md` sections "Test layers", "Choosing the path", "Environments, credentials and data" (2026-10-19)
- Investigation status: complete for requirements and architecture

## Initial Request And Clarifications

- Original request (Task text): the server finds a run's files from its run id alone by reading every saved team, org and agent run tree; about 1–2 s per request, growing with every saved run. Give file-change reads (file list and file content) an explicit owner (team run, org run, or standalone run plus the member), so a read never searches every saved run. Done when file list and file content reads for copies, team members and org members take well under a second on a realistic data set without scanning all saved runs; tests; merged; ships with the next release.
- Clarifications received: none needed. The direction is explicit.
- User-supplied facts: autobyteus-93 measurement on the user's machine (see Runtime findings).
- Initial ambiguity: (a) whether an ownerless read keeps any fallback search; (b) whether team and org member lists become live while their root runs; (c) whether the team-member conversation lookup (same locator) is in scope. Resolved as decisions in `requirements-doc.md` (DEC-002, DEC-003, DEC-004).

## Product And Domain Understanding

- Product area: Artifacts tab (desktop right panel, `ArtifactsTab.vue`) and the mobile Artifacts view (`MobileArtifacts.vue`), both rendering `ArtifactContentViewer.vue`; the run hydration services in `autobyteus-web` that load a run's file list; the server's run-file-change read services, GraphQL resolvers and the REST content route.
- Affected actors: the user opening a run, team member, org member or delegated copy and its files.
- Terms: **standalone run** = a top-level agent run (has `run_metadata.json`); **hub** = a standalone run that delegated work; **copy** = a delegated task agent or task-team member under a hub (located in the hub's collaboration package); **team member** = an agent of a team run, including the team's own delegated task agents; **org member** = an agent of an org run, including its task agents; **owner** = the run whose saved tree holds the agent (the standalone run itself, the team run, the org run, or the hub).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Doc | Task reference files: autobyteus-93 `investigation-notes.md`, `followups-for-project-task-manager.md` (FU-3), `probes/probe-run1.txt` | Baseline evidence | Unscoped lookup 1.95–2.38 s per member; teams 650 ms (680 team trees), orgs 48 ms, hubs 79 ms | — |
| 2026-10-19 | Command | `git fetch origin personal`; `git worktree add -b codex/run-file-change-owner-scoped-reads … origin/personal` | Bootstrap | Base `cba6b85122` | — |
| 2026-10-19 | Code | `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | The scanning read | `readProjectionContext(runId)`: active standalone run → stored standalone metadata → **unscoped** `CollaborationExecutionLocationService.findAgent({ agentRunId })`, which runs `teams.findAgent`, `orgs.findAgent`, `agents.findAgent` in parallel with no root. All three location services are built stored-only (no active managers), so a located member is always `isActive: false` here | Root cause |
| 2026-10-19 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Is a scoped lookup available? | `findAgent` already has scoped branches by `rootSubjectKind` + `rootRunId`; only the `default` branch scans all families | Scoped locators exist |
| 2026-10-19 | Code | `run-history/services/team-run-execution-tree-location-service.ts` `findAgent` | Team scan cost | With `rootTeamRunId`: reads one root tree. Without: loops `listStoredRootIds()` reading each stored tree until found (all of them when not found) | — |
| 2026-10-19 | Code | `agent-org-execution/services/agent-org-execution-tree-location-service.ts`, `standalone-agent-run-root/services/standalone-root-location-service.ts` | Org / hub scan cost | Same shape: with `rootRunId` one tree; without it every org tree / every hub tree | — |
| 2026-10-19 | Code | `run-history/services/team-run-package-catalog.ts` | Is `awaitReady` per-call work? | Readiness/admission is in-memory startup state; `isAdmitted` is a lookup | Scoped read cost = one tree read |
| 2026-10-19 | Code | `api/graphql/types/run-file-changes.ts` `getRunFileChanges(runId)`; `api/rest/run-file-changes.ts` `/runs/:runId/file-change-content` | Entry points | Both take a run id only and call the scanning `readProjectionContext` | — |
| 2026-10-19 | Code | `api/graphql/types/agent-run-collaboration.ts` `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` → `StandaloneRootMemberViewProjectionService.getFileChanges` → `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection(location)` | autobyteus-93's scoped list | Hub-scoped, active-aware (`roots.getActiveTree`), live projection while the hub runs | Precedent to extend |
| 2026-10-19 | Code | `run-history/services/team-member-run-view-projection-service.ts` `requireLocation` | Team member views | `this.locations.findAgent({ agentRunId: run })` **without the root**, then checks `rootTeamRunId === root`. Projection and event-monitor page of a team member therefore scan team trees (until found); manager-aware (active teams first) | Same locator the team file read needs (DEC-004) |
| 2026-10-19 | Code | `run-history/services/agent-org-member-run-view-projection-service.ts` `requireLocation` | Org member views | Scoped: `findAgent({ rootRunId, memberAddress, agentRunId })`; manager-aware | Precedent |
| 2026-10-19 | Code | GraphQL `getTeamMemberRunProjection(teamRunId, agentRunId)`, `getTeamMemberEventMonitorActiveTracePage(teamRunId, agentRunId, …)`, `getAgentOrgMemberRunProjection(orgRunId, memberAddress, agentRunId)`, `agentRunCollaborationMemberProjection(hostRunId, memberAddress, agentRunId)` | Identity shapes per family | Team member identity: team run + agent run. Org member and copy: root + member address + agent run | Interface shapes |
| 2026-10-19 | Code | `api/rest/context-files.ts` | REST owner-path precedent | `/runs/:runId/…`, `/team-runs/:teamRunId/agent-runs/:agentRunId/…`, `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/…`, `/agent-collaborations/:hostRunId/agent-runs/:agentRunId/…` | Route naming |
| 2026-10-19 | Code | `context-files/services/context-file-owner-resolver.ts` `lookup()` | Adjacent scans | A team member context-file owner is looked up as `{ containingTeamRunId, agentRunId }` with no `rootSubjectKind`, i.e. the unscoped compound branch over all families | Follow-up FU-A (out of scope) |
| 2026-10-19 | Code | `autobyteus-web/services/runHydration/runFileChangeHydrationService.ts` `fetchRunFileChanges(runId)` and callers | Web list reads | Callers: `runContextHydrationService.ts` (standalone run), `teamRunContextHydrationService.ts` (each team member), `teamMemberProjectionHydrationService.ts` (team member on selection), `agentOrgContextHydration.ts` (each org member). Copies use `agentRunCollaborationChildHydration.ts`'s own `fetchFileChanges` (scoped query) | — |
| 2026-10-19 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` `artifactContentUrl` | Web content reads | `${rest}/runs/${artifact.runId}/file-change-content?path=…` for every artifact; owner unknown to the viewer | — |
| 2026-10-19 | Code | `ArtifactsTab.vue`, `components/mobile/MobileArtifacts.vue`, `composables/mobile/useMobileFocusedRunIdentity.ts` | Who renders the viewer | Desktop list keyed by `activeContextStore.activeAgentContext.state.runId`; mobile by the focused run of an `agent-run` or `team-run` context, which is the active workspace target's context | Owner = active target's subject |
| 2026-10-19 | Code | `stores/activeContextStore.ts` `activeWorkspaceTarget`; `types/workspace/activeAgentWorkspaceTarget.ts` (`browse: EventMonitorActiveTraceBrowseSubject`); `stores/agentRunCollaborationStore.ts:295`; `services/agentOrgExecution/agentOrgExecutionContext.ts:145` | Does the web know the owner? | Every workspace target already carries `browse`, the owner-scoped subject used for event-monitor pages: `run`, `teamMember {teamRunId, memberAddress, agentRunId}`, `agentOrgMember {orgRunId, memberAddress, agentRunId}`, `standaloneMember {hostRunId, memberAddress, agentRunId}` | Reuse this subject for file reads |
| 2026-10-19 | Code | `services/eventMonitor/eventMonitorActiveTracePageService.ts` | Subject type owner | `EventMonitorActiveTraceBrowseSubject` defined in the event-monitor service; 4 files import it | Move to a neutral type (design) |
| 2026-10-19 | Code | `services/run-file-changes/run-file-change-service.ts` `getProjectionForCollaborationMember`, `load` | Live vs stored list | For an attached (live) run it returns the in-memory projection (includes not-yet-flushed entries); otherwise the stored `file_changes.json` | Active-aware member reads are safe |
| 2026-10-19 | Code | `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Tests that rely on the scan | Uses `getRunFileChanges(copyRunId)` among the calls that trigger the hub scan and its "Skipping standalone run" warning | Test must move to a remaining scanning surface or the scoped read (design) |
| 2026-10-19 | Code | `tests/integration/api/run-file-changes-api.integration.test.ts` "hydrates historical AutoByteus team-member file changes through GraphQL and REST" | Tests of member reads by run id | Reads a team member through `getRunFileChanges(memberRunId)` and `/runs/<member>/file-change-content` | Moves to the team-scoped surfaces |
| 2026-10-19 | Doc | `tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt` | Scoped vs unscoped cost (seed) | Seed with 50 team runs: copy file list generic 41.8 ms vs scoped 5.6 ms (median); on the user's 680 team trees the generic lookup is ~2 s | Scoped reads are cheap |
| 2026-10-19 | Doc | `design-review-report.md` ARCH-REV-001 (AR-001, AR-002, MP-001, MP-002) | Review findings | Active members are in the same activation registry as standalone runs; team and org task agents lose their workspace root | SR-003 |
| 2026-10-19 | Code | `agent-execution/services/agent-run-manager.ts:183-186` (`getActiveRun` → `activationRegistry`); `configured-agent-execution-handle.ts:111,465-473`; `application-execution-scope-kernel-builder.ts:97-134` | AR-001 check | Confirmed: one registry for standalone runs and collaboration members | Active ≠ standalone |
| 2026-10-19 | Code | `agent-execution/services/agent-run-provisioning-service.ts#prepareAgentRun` → `agent-run-history-catalog-service.ts#recordPreparedRun` (writes `run_metadata.json` before activation, including `applicationExecutionContext`); `run-history/store/agent-run-metadata-store.ts#readMetadataState` (G1: a file with a `taskAgent` section reads as missing); `agent-memory/store/agent-memory-layout.ts#getAgentRunMemoryDirPath` (configured members live under team/org/hub dirs; task agents under `agents/<id>/` with a task-agent file) | Standalone discriminator | Standalone metadata exists for every standalone run (hubs and application runs included) and for no member | AR-001 design |
| 2026-10-19 | Code | `collaboration-execution-location-service.ts#locatedLaunchConfiguration`; private `childSourceOf` in the three member-view services; `collaborator-source-projector.ts#catalogCopyExecutionSource`, `taskExecutionListsOf`; `team-run-execution-tree.ts:22-31` (task executions only on `rootTeam`), `agent-org-run-execution-tree.ts:10-18` (on `rootOrg`; member teams carry their own); `collaborator-source-projector.ts` imports (no location-service import, so no cycle) | AR-002 check | Confirmed: catalog-copy launch is missing for team and org in `locatedLaunchConfiguration`; three duplicate source helpers | AR-002 design |
| 2026-10-19 | Command | `git grep -l -E "getRunFileChanges\|file-change-content\|GetRunFileChanges"` (excluding tickets) | All consumers | Only `autobyteus-web` (viewer, hydration, tests, probes, docs) and server tests/docs. No other package calls these surfaces | Clean cut is safe |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open a file in the Artifacts tab of a delegated copy (task agent or task-team member under a standalone run) | Viewer → `GET /runs/<copyRunId>/file-change-content?path=` → no active run, no standalone metadata → unscoped scan of all team, org and hub trees → hub found → stored `file_changes.json` → file streamed | Content shown after ~2 s on the user's machine; time grows with saved runs | Code; autobyteus-93 probe | High |
| BEH-002 | User | Open a team run (or select a team member) | Team hydration → per member `getRunFileChanges(memberRunId)`. If the member's own run is active in the activation registry, it is served live by run id with no scan (SR-003 correction). Otherwise an unscoped scan: team trees scanned until the team is found, org and hub families fully scanned in parallel → stored list | Member file list correct; ~0.7–2 s per member request when not active; best-effort members are left unhydrated on error | Code; ARCH-REV-001 | High |
| BEH-003 | User | Open a file of a team member, including a team task agent | `GET /runs/<memberRunId>/file-change-content`: an active member run is served live by run id (`activeStandalone`, real workspace root). Otherwise the same unscoped scan, then a stored entry. For a task agent (catalog copy) the scanned location has no launch configuration, so no workspace root, so a workspace-relative entry answers 404 "not available" (SR-003 correction) | Content shown after the scan for configured members; task agents of saved teams answer 404; a pending file answers 409 only when the member's run is active | Code; ARCH-REV-001 MP-001, MP-002 | High |
| BEH-004 | User | Open an org run | Org hydration → per member `getRunFileChanges(memberRunId)` → unscoped scan | Same as BEH-002 | Code | High |
| BEH-005 | User | Open a file of an org member, including an org task agent | Same as BEH-003 | Same as BEH-003 | Code | High |
| BEH-006 | User | Open a standalone run and its files | `getRunFileChanges(runId)` and `/runs/<runId>/file-change-content` → active run, else stored metadata → no scan | Fast; live entries while running; 409 for a pending file of an active run, 404 for a missing file | Code; integration tests | High |
| BEH-007 | User | Open a delegated copy's file list (autobyteus-93) | `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` → hub-scoped, active-aware | Fast (~5 ms seed); live while the hub runs | Code; autobyteus-93 evidence | High |
| BEH-008 | User | Open a team member's conversation or older event-monitor pages | `getTeamMemberRunProjection` / `getTeamMemberEventMonitorActiveTracePage(teamRunId, agentRunId)` → `findAgent({ agentRunId })` scanning team trees until found | Correct; time grows with saved team runs | Code | High (cost by code reading, not measured) |
| BEH-009 | User | Mobile Artifacts view of an agent run or a team run member | Same list and content paths as desktop (BEH-002/003/006) | Same | Code | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `RunFileChangeProjectionService` | Run-id list and entry resolution with collaboration fallback scan; located-member list | Ownerless reads must not scan | Remove the fallback; add located-member entry resolution |
| `TeamMemberRunViewProjectionService` | Team member projection and trace pages, unscoped locate | Team member reads must be team-scoped | Scope `requireLocation`; add file list and entry |
| `AgentOrgMemberRunViewProjectionService` | Org member views, scoped locate | Org member file reads | Add file list and entry |
| `StandaloneRootMemberViewProjectionService` | Copy views, hub-scoped locate, file list | Copy content read | Add entry resolution |
| `api/rest/run-file-changes.ts` | One run-id route | Content reads per owner | Owner-shaped routes, shared response policy |
| `ArtifactContentViewer.vue` | Builds the run-id content URL | Must name the owner | Receive the owner subject from its parent |
| Workspace target `browse` | Owner subject for event-monitor pages | Same owner applies to the file list and content | Promote the subject to a neutral shared type |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files read: one owner tree (`team_run_execution_tree.json` of the named team root, the org tree, or the hub's `collaboration/collaboration_tree.json` plus its composed task-team trees), the member's `file_changes.json`, and the file itself.
- Readers: the three location services, `RunFileChangeProjectionStore`, `RunFileChangeService` (live).

### Structural Surfaces

- GraphQL: `getRunFileChanges` (meaning narrows to standalone runs), new team-member and org-member file-change queries, existing copy query.
- REST: content route per owner kind.
- Web: run file-change fetch (subject-dispatched), viewer URL, Artifacts tab and mobile view props, owner subject type.

### Potential Structural Impacts To Investigate

- API change: present (additive queries and routes; run-id reads narrowed to standalone runs; only in-repo consumers).
- Persistence schema: absent (reads only).
- Security/privacy: absent. Owner-shaped routes serve the same files as today from the same recorded entries and path canonicalization; the scope gets narrower, not wider.
- Concurrency/lifecycle: low. Team and org member reads become active-aware (live list while the root runs), as copies already are.
- Migration: absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| autobyteus-93 probe (in-process, read-only copy of the user's data, 2026-10-18) | Unscoped member lookup | 1.95–2.38 s per lookup; teams 650 ms (680 trees, not found), orgs 48 ms, hubs 79 ms | Scan must go | autobyteus-93 `probes/probe-run1.txt` (attached to the Task) |
| autobyteus-93 API-05 (seed: 1 hub, 50 task teams, 286-like shape; 2026-10-18) | Copy file list generic vs scoped | Generic 41.8 ms vs scoped 5.6 ms (median, seed with few unrelated runs) | Scoped cost is one tree read | `tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt` |
| No new probe in this round | — | The scoped cost follows from code: one named tree read per request; the scan cost was measured | Validation measures baseline vs fixed on a seed with many unrelated runs (AC-010) | U-001 |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via autobyteus-93 (2026-10-18) | Opening files of copies, team members and org members is slow; asked for this follow-up | Strong (requested) | Owner-scoped reads | — |
| Task direction | "well under a second", "never searches every saved run", next release | Explicit | QR-001, REQ-006 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Collaboration model | `autobyteus-server-ts/docs/design/collaboration_model.md` | A run's content is stored with the run; the owner tree records where | autobyteus-93 notes | None |
| DESIGN.md rule 3, rule 5 | repository root | No global work on a local action; remove unnecessary work before caches | `DESIGN.md` | None |
| DESIGN.md rule 7 | repository root | Containment of an unreadable run lives in scans; a named-root lookup reports its own error | `standalone-root-location-service.ts` doc comment | Containment e2e must keep a scanning trigger |
| Web GraphQL codegen | `autobyteus-web/codegen.ts` (schema from a running server) | New queries need `generated/graphql.ts` regenerated | `codegen.ts` | None |

## Persisted Data And State Facts

- Affected stored subject: none written. Reads only.
- Required semantics to preserve: the recorded file list per agent run, file content bytes, 409/404 semantics.
- Acceptable loss: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_d42446ab-0ef4-47fa-a16b-767cc3728332/context/ctx_5dad698d1210__probe-run1.txt` | autobyteus-93 Solution Designer | Baseline timings | evidence | QR-001 | Evidence (read-only) | N/A (evidence) |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_d42446ab-0ef4-47fa-a16b-767cc3728332/context/ctx_e78391836ac2__investigation-notes.md` | autobyteus-93 Solution Designer | Root-cause evidence | evidence | REQ-001..REQ-006 | Evidence (read-only) | N/A |
| `tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt` (this repository) | autobyteus-93 API/E2E | Scoped vs generic timing | evidence | QR-001 | Evidence | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact per-read time after the change on a data set with ~700 unrelated saved team runs | Done-when asks "well under a second on a realistic data set" | API/E2E: baseline vs fixed timing on a seed with many unrelated saved runs (AC-010) | Open (validation) |
| R-001 | Risk | Team and org member lists become live while the root runs (in-memory projection). Today this already happens for members whose own run is active (run-id read through the activation registry); the change makes it hold for every member of a running root | Visible: pending entries can appear in the list on hydration while the team runs; consistent with standalone runs and copies | DEC-003; covered by AC-008 | Accepted |
| R-002 | Risk | A member's owner subject must match the artifact's run while the selection changes | A stale subject could request another run's files | Design: the viewer builds a URL only when the subject's agent run equals the artifact's run | Design |
| R-003 | Risk | Containment e2e depends on the file-change scan to provoke the hub-scan warning | Test would fail for the wrong reason | Design: the test switches that call to the copy-scoped read and keeps another hub scan as the warning trigger | Design / validation |

## Architecture Investigation Findings

- Spine today (content, any member): `ArtifactContentViewer` → `GET /runs/:runId/file-change-content` → `RunFileChangeProjectionService.resolveEntry(runId)` → `readProjectionContext` → active standalone? → standalone metadata? → `CollaborationExecutionLocationService.findAgent({agentRunId})` (scan: teams ∥ orgs ∥ hubs) → `RunFileChangeProjectionStore.readProjection(memoryDir)` → stream file.
- Spine today (list, team/org member): hydration service → `GetRunFileChanges(runId)` → same `readProjectionContext`.
- Spine today (list, copy): `agentRunCollaborationChildHydration` → `agentRunCollaborationMemberFileChanges` → `StandaloneRootMemberViewProjectionService.getFileChanges` → hub-scoped `requireLocation` → `getLocatedCollaborationMemberProjection(location)` (live while the hub is active).
- Each collaboration family already has one member-view service that locates a member by exact identity inside one root and serves its projection and trace pages; the hub's also serves its file list. The file-change subsystem already serves "file changes of a located member".
- The web already knows the owner at every place it reads files: hydration services have the root id and member identity; the Artifacts tab's active workspace target carries the owner subject (`browse`).
- `RunFileChangeProjectionService`'s fallback location services are stored-only, so a *located* team or org member is never active there. However, its first check, `getActiveRun(runId)`, serves any active member by run id, because members share the activation registry (SR-003 correction). The member-view services are active-aware.
- Standalone discriminator (SR-003): standalone run metadata (`readMetadata`), present for every standalone run before activation and absent for every member.
- Located-member launch (SR-003): `locatedLaunchConfiguration` lacks the catalog-copy source for team and org task agents; the three member-view services each compute it privately (`childSourceOf`).
- Callers of `RunFileChangeProjectionService.getProjection/getEntry/resolveEntry`: GraphQL `getRunFileChanges`, REST content route. `getEntry` has no production caller (to verify during implementation; candidate dead code).

## Requirement Implications

- An explicit owner per read removes the scan (REQ-001..REQ-004); the ownerless read stays only for standalone runs (REQ-005).
- The web already has the owner; no new user-visible flow is needed (REQ-007).
- Response semantics stay those of the standalone run route (REQ-008).

## Notes For Architecture Design

- Map SCN-001..SCN-006 onto the owner-scoped reads.
- Constraints: no storage change; reuse the member-view services' locators; keep the copy file-list path of autobyteus-93; no compatibility fallback.
- Verify: `getEntry` dead; codegen; containment e2e.
