# Design Spec — File Reads Name The Run They Belong To

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revises SR-002 for ARCH-REV-001 findings AR-001, AR-002)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved in SR-002 by the Solution Designer within the Task's direction (no `Needs user` decision); user informed in the Solution Designer conversation on 2026-10-19. SR-003 makes factual corrections and clarifies AC wording without changing intended behavior, so the approval still applies (see the solution revision record)
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (2026-10-19); project `DESIGN.md` (repository root, 2026-10-19); `TESTING.md` (test layers, choosing the path, environments). `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none

## Current-State Read

- Every collaboration family already has one **member-view service** that locates one member by exact identity inside one root and serves its views: `TeamMemberRunViewProjectionService` (team), `AgentOrgMemberRunViewProjectionService` (org), `StandaloneRootMemberViewProjectionService` (copies under a hub). The hub one also serves the copy's file list (autobyteus-93) by handing the located member to `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection(location)`.
- The remaining file-change reads take a run id only: GraphQL `getRunFileChanges(runId)` and REST `/runs/:runId/file-change-content`. Both go through `RunFileChangeProjectionService.readProjectionContext(runId)`, which, for anything but a standalone run, calls the unscoped `CollaborationExecutionLocationService.findAgent({ agentRunId })` and reads every saved team, org and hub tree (investigation notes, Source Log). Its location services are stored-only, so a member is never seen as running there.
- `TeamMemberRunViewProjectionService.requireLocation` locates with `findAgent({ agentRunId })` without the team root, scanning saved team trees until it finds the member.
- Every running agent run is published in the one `AgentRunActivationRegistry` that `AgentRunManager.getActiveRun` reads. This covers standalone runs and every collaboration member: team and org members, task agents and copies (`configured-agent-execution-handle.ts:111,465-473`; `application-execution-scope-kernel-builder.ts:97-134`). So "the run is active" does not mean "the run is standalone". Today a run-id read of an *active* member takes `activeStandalone` (live, no scan); only members whose run is not active fall through to the scan (ARCH-REV-001 AR-001).
- A run is standalone exactly when it has standalone run metadata. `AgentRunProvisioningService.prepareAgentRun` records `run_metadata.json` for every standalone run before it is activated, including application runs and hubs (`agent-run-history-catalog-service.ts#recordPreparedRun`). `AgentRunMetadataStore.readMetadata` treats a task agent's own `run_metadata.json` (it has a `taskAgent` section) as absent (contract G1). Configured team and org members have no file at `agents/<runId>/`.
- `locatedLaunchConfiguration(location)` returns `configuredPlacement?.launchConfiguration ?? null` for team and org members. Their task agents (catalog copies) have `configuredPlacement: null`, so it returns `null`, and with a `null` workspace root a workspace-relative entry has no absolute path. Only the hub location fills the copy's launch from its catalog source (`standalone-root-location-service.ts:213`). Each member-view service has its own private `childSourceOf` over its tree's task-execution lists (team: `rootTeam.taskExecutions`; org: `rootOrg.taskExecutions` plus each member team's `taskExecutions`; hub: `taskExecutionListsOf(tree)`) (ARCH-REV-001 AR-002).
- The team location service returns an untagged `LocatedTeamAgentExecution`. The only tagging into `LocatedCollaborationAgentExecution` is the private `tagTeam` of `CollaborationExecutionLocationService`.
- The web already knows the owner wherever it reads: hydration services hold the root id and member identity; every workspace target carries `browse`, an owner subject (`run` / `teamMember` / `agentOrgMember` / `standaloneMember`) used today for event-monitor pages. `ArtifactContentViewer.vue` ignores it and builds `/runs/<artifact.runId>/file-change-content`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 11 server files (one service narrowed, three member-view services extended, the located-execution helpers in `collaboration-execution-location-service.ts` completed, one new error type, three GraphQL resolvers, one REST module) and about 14 web files (one moved type with 4 importers, one fetch service and its 5 callers, the viewer, the Artifacts tab, the mobile view and its composable, queries and generated types), plus tests. All within existing owners; no new subsystem.
- Architectural risk: `High`
- Risk rationale and supporting evidence: material API contract change. New GraphQL queries (`getTeamMemberFileChanges`, `getAgentOrgMemberFileChanges`), three new REST routes, and the existing run-id surfaces narrowed to standalone runs with the collaboration fallback removed (clean cut). Team and org member reads change from stored-only to live while running (DEC-003). No persistence, security or deployment change; the ownership model itself is reused, not changed.
- Escalation trigger: a production caller of the run-id surfaces outside `autobyteus-web` is found; a member-view locator turns out to need more identity than designed (for example the team member address); or the containment e2e cannot keep a scanning trigger.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `run-file-change-projection-service.ts#readProjectionContext` | Unscoped fallback scan | Remove the fallback; run-id read = standalone only | — |
| Code | `collaboration-execution-location-service.ts#findAgent`; the three family location services | A root id turns every lookup into one tree read | Owner-scoped locate through the member-view services | — |
| Code | `team-member-run-view-projection-service.ts#requireLocation` | Team locate without root | Pass `rootTeamRunId` | — |
| Code | `standalone-root-member-view-projection-service.ts#getFileChanges` | Precedent of a member-view service serving file lists | Extend the same pattern to team and org, and to content | — |
| Code | `api/rest/context-files.ts` | Owner-shaped REST paths per family | Same path shapes for content | — |
| Code | `stores/activeContextStore.ts` `activeWorkspaceTarget.browse` | Owner subject available to the Artifacts tab | Viewer takes the subject from its parent | — |
| Code | `run-file-change-service.ts#load` | Live projection falls back to the stored one when not attached | Active-aware member reads are safe | — |
| Evidence | autobyteus-93 `probe-run1.txt`; `API-05-07-timing-summary.txt` | Scan 1.95–2.38 s; scoped 5.6 ms (seed) | Expected scaling | U-001 (validation) |
| Command | `git grep` for `getRunFileChanges` / `file-change-content` / `.getEntry(` | Only in-repo web consumers; `RunFileChangeProjectionService.getEntry` has no caller | Clean cut; remove `getEntry` | — |
| Code (SR-003) | `agent-run-manager.ts#getActiveRun`, `AgentRunActivationRegistry`, `configured-agent-execution-handle.ts:111,465-473` | Active members are in the same registry as standalone runs | AR-001: being active is not the standalone discriminator | — |
| Code (SR-003) | `agent-run-provisioning-service.ts#prepareAgentRun` → `recordPreparedRun`; `agent-run-metadata-store.ts#readMetadataState` (G1: a file with `taskAgent` reads as missing); `agent-memory-layout.ts#getAgentRunMemoryDirPath` | Standalone metadata exists before activation for every standalone run, and never for a member | AR-001: standalone metadata is the discriminator | — |
| Code (SR-003) | `collaboration-execution-location-service.ts#locatedLaunchConfiguration`; the three `childSourceOf`; `collaborator-source-projector.ts#catalogCopyExecutionSource`; tree types (`team-run-execution-tree.ts:22-31`, `agent-org-run-execution-tree.ts:10-18`) | Catalog-copy launch is missing for team and org; the task-execution lists per tree are known | AR-002: one `locatedExecutionSource` owner | — |

## Intended Change

Every file-change read names its owner. The server resolves a member through its family's member-view service (one root tree), then the file-change subsystem serves the located member's list or file. The run-id reads keep serving standalone runs only: a run counts as standalone when it has standalone run metadata, whether it is running or saved. A located member's workspace root comes from one owner, `locatedExecutionSource`, which covers configured members and catalog copies of all three families. The web sends the owner subject it already holds.

## Change Scope (Mandatory)

- In scope: UC-001..UC-006. Server: run-file-change reads (`RunFileChangeProjectionService`), the three member-view services (file list, file entry, team root scoping), the located-execution helpers in `collaboration-execution-location-service.ts` (`locatedExecutionSource`, exported team tagging), GraphQL resolvers for team and org member file lists, REST content routes. Web: owner subject type, run file-change fetch, its five callers, `ArtifactContentViewer`, `ArtifactsTab`, `MobileArtifacts` and `useMobileFocusedRunIdentity`, GraphQL queries and generated types. Tests for all of these; containment e2e adjusted.
- Deliberately left alone: storage and the three family location services (they already support scoped lookups; only the shared helpers next to `CollaborationExecutionLocationService` change); `RunFileChangeService` live tracking; autobyteus-93's copy list query and child hydration flow (only its fetch moves to the shared fetch); team and org root hydration strategy (FU-1); context-file routes and `ContextFileOwnerResolver` (FU-A); the workspace target's `browse` field name (only its type moves); other unscoped lookups in the server.
- Follow-ups:
  - FU-A: `context-files/services/context-file-owner-resolver.ts#lookup` resolves a team-member context-file owner with `{ containingTeamRunId, agentRunId }` and no `rootSubjectKind`, which takes the unscoped compound branch over all team, org and hub trees. Evidence: code read 2026-10-19. Suggested Task: "Context-file reads for team members should name the team root, like file-change reads after FU-3, so opening an attachment never searches every saved run."

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-008; AC-001 | Open a copy's file | Scan | Hub-scoped content | DS-001 |
| BEH-002 | User | REQ-002, REQ-009; AC-002, AC-008 | Open a team run / member | Scan per member | Team-scoped list, live while running | DS-002 |
| BEH-003 | User | REQ-002, REQ-008; AC-003 | Open a team member's file, including a team task agent's | Active member run: served by run id, live. Otherwise: scan, and a task agent's entry has no workspace root (404) | Team-scoped content; workspace root from `locatedExecutionSource` (configured or catalog copy) | DS-001 |
| BEH-004 | User | REQ-003, REQ-009; AC-004, AC-008 | Open an org run | Scan per member | Org-scoped list | DS-002 |
| BEH-005 | User | REQ-003, REQ-008; AC-005 | Open an org member's file, including an org task agent's | As BEH-003 | Org-scoped content; same root rule | DS-001 |
| BEH-006 | User | REQ-005; AC-006, AC-007 | Standalone run files | No scan. Any active run id is served, standalone or member | Preserved for standalone runs (standalone metadata decides, running or saved); run-id reads of members get nothing, running or not, and there is no fallback | DS-001, DS-002 |
| BEH-007 | User | Preserved | Copy file list | Hub-scoped | Preserved (fetch moved to the shared web fetch) | DS-002 |
| BEH-008 | User | REQ-004; AC-011 | Team member conversation / older pages | Team scan | Team-root lookup | DS-003 |
| BEH-009 | User | REQ-007; AC-012 | Mobile Artifacts | Same as desktop | Owner subject from the active target | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| autobyteus-93 `probes/probe-run1.txt` (Task context file) | Baseline cost | QR-001 | Shows what is removed | Evidence |
| `tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt` | Scoped vs generic timing | QR-001 | Expected cost after | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` (with an API identity correction)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - Duplicated policy / missing invariant (SR-003): "which launch configuration a located member runs with" is answered three times by private `childSourceOf` helpers, and incompletely by `locatedLaunchConfiguration`, whose doc promises catalog copies but which drops them for team and org. Evidence: AR-002.
  - Ambiguous-boundary trigger: `getRunFileChanges(runId)` and `/runs/:runId/file-change-content` accept a run id that may mean a standalone run, a team member, an org member or a copy, and guess by searching. Evidence: `readProjectionContext`.
  - Authoritative-boundary / capability reuse: the file-change service carries its own stored-only copy of the three family locators, parallel to the member-view services that own member location (and are active-aware). Evidence: constructor of `RunFileChangeProjectionService` vs the member-view services.
  - Not firing: repeated coordination (one dispatch per surface, no repeated policy once the response policy is shared in the REST module); responsibility overload (each member-view service gains two small methods in its own subject).
- Root cause classification: `Boundary Or Ownership Issue` (an ambiguous selector resolved by global search inside the wrong owner)
- Refactor needed now: `Yes`
- Evidence: Source Log rows for `run-file-change-projection-service.ts`, member-view services, context-file routes.
- Design response:
  - Split the reads by subject, each with an explicit identity shape.
  - Member location stays with each family's member-view service. The file-change service serves only standalone runs (decided by standalone metadata) and members that are already located.
  - Remove the collaboration fallback and its locators.
  - "Execution source of a located member" gets one owner, `locatedExecutionSource`. The member-view services and `locatedLaunchConfiguration` use it.
- Refactor rationale: the scan cannot be removed without giving the reads an owner; adding owner-scoped reads while keeping the fallback would keep two authorities.
- Intentional deferrals and residual risk: FU-A (context files).

## Terminology

- **Owner subject**: which agent run a read addresses and the run whose tree holds it. Web type `AgentRunReadSubject` (moved from `EventMonitorActiveTraceBrowseSubject`): `{ kind: 'run', runId }`, `{ kind: 'teamMember', teamRunId, memberAddress, agentRunId }`, `{ kind: 'agentOrgMember', orgRunId, memberAddress, agentRunId }`, `{ kind: 'standaloneMember', hostRunId, memberAddress, agentRunId }`.
- **Member-view service**: the per-family server service that locates one member inside one named root and serves its views.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the collaboration fallback in `RunFileChangeProjectionService.readProjectionContext` and its three stored-only location services; `RunFileChangeProjectionService.getEntry` (dead); web `ArtifactContentViewer`'s run-id-only URL; `agentRunCollaborationChildHydration.ts`'s local `fetchFileChanges` (replaced by the shared fetch); `EventMonitorActiveTraceBrowseSubject` (renamed and moved, no alias).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Reads only; no stored shape, file or location changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 003, 005, 006, 009 | User clicks a file in the Artifacts tab | File bytes shown | Family member-view service (locate) + `RunFileChangeProjectionService` (entry) | The content read |
| DS-002 | Primary End-to-End | BEH-002, 004, 006, 007 | Run/team/org/copy hydration | Store holds the member's list | Same | The list read |
| DS-003 | Primary End-to-End | BEH-008 | Team member selected / older pages | Projection or page | `TeamMemberRunViewProjectionService` | Same locator, now team-scoped |

## Primary Execution Spine(s)

- DS-001: `ArtifactsTab / MobileArtifacts (owner subject of the active target) -> ArtifactContentViewer (runFileChangeContentPath) -> REST owner route -> member-view service.resolveFileChangeEntry (one-root locate) -> RunFileChangeProjectionService.resolveLocatedCollaborationMemberEntry -> file stream`
  - standalone: `… -> /runs/:runId/file-change-content -> RunFileChangeProjectionService.resolveStandaloneRunEntry -> file stream`
- DS-002: `hydration service -> fetchRunFileChanges(subject) -> owner GraphQL query -> member-view service.getFileChanges (one-root locate) -> RunFileChangeProjectionService.getLocatedCollaborationMemberProjection -> runFileChangesStore`
- DS-003: `teamMemberProjectionHydration / event-monitor browse -> getTeamMemberRunProjection / page -> TeamMemberRunViewProjectionService.requireLocation({ rootTeamRunId, agentRunId }) -> projection`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Artifacts tab passes the active target's owner subject to the viewer. The viewer builds the owner route for the artifact path. The route asks the family's member-view service to resolve the entry; the service locates the member in the named root (one tree, live if the root runs) and asks the file-change service for the entry of that located member; the route applies the one response policy | Owner subject, located member, file-change entry | Member-view service; file-change service | Path canonicalization; REST response policy |
| DS-002 | Each hydration path already knows the member's owner and passes the subject to one fetch, which picks the owner's query; the member-view service locates and the file-change service returns the list (live while running) | Owner subject, located member, projection | Same | Query dispatch |
| DS-003 | The team member lookup reads only the named team root | Located team member | Team member-view service | — |

## Spine Actors / Main-Line Nodes

Web: Artifacts tab / mobile view, `ArtifactContentViewer`, `fetchRunFileChanges`. Server: REST owner routes and GraphQL resolvers (thin), member-view services, `RunFileChangeProjectionService`.

## Ownership Map

- Member-view service (per family): owns "is this agent in this root, and where is it" (location, active state, identity validation, not-found error). Now also exposes the member's file list and file entry, delegating file-change work.
- `RunFileChangeProjectionService` owns file-change reads for two subjects; it no longer locates members:
  - **A standalone run, by run id.** The rule is: standalone metadata present → standalone. Then, if the run is active, the live projection with the run's workspace root; else the stored projection with the metadata's root. No standalone metadata → empty list or no entry, even if a run with that id is active.
  - **An already-located collaboration member**, list and entry. It decides live vs stored projection from `location.isActive`, takes the workspace root from `locatedLaunchConfiguration(location)`, canonicalizes the path, and sets `isActiveRun`.
- `collaboration-execution-location-service.ts` already owns the tagged `LocatedCollaborationAgentExecution` union and `locatedLaunchConfiguration`. It now also owns:
  - `locatedExecutionSource(location)`: the `{ agentDefinitionId, launchConfiguration }` a located member runs with. That is its configured placement, or else its catalog-copy source from its root tree's task-execution lists: team `rootTeam.taskExecutions`; org `rootOrg.taskExecutions` plus each member team's `taskExecutions`; hub `taskExecutionListsOf(tree)`. It returns `null` only for a member that has neither.
  - `tagTeamAgentExecution(item)`: the one way to tag a `LocatedTeamAgentExecution` as `agent_team`.
- REST module `run-file-changes.ts`: thin; owns the one content response policy (409/404/stream, mime, no-store) and owner-route parsing.
- GraphQL resolvers: thin.
- Web `fetchRunFileChanges`: owns mapping an owner subject to its list query.
- Web `runFileChangeContentPath`: owns mapping an owner subject and path to the content route.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| REST owner routes | Member-view services / file-change service | HTTP transport | Member location or projection logic |
| GraphQL `getTeamMemberFileChanges`, `getAgentOrgMemberFileChanges`, `agentRunCollaborationMemberFileChanges`, `getRunFileChanges` | Same | GraphQL transport | Same |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Collaboration fallback in `readProjectionContext` + `collaborationLocations` constructor option + imports of `CollaborationExecutionLocationService`, `StandaloneRootLocationService`, `AgentOrgExecutionTreeLocationService`, `createStoredTeamRunExecutionTreeLocationService` in `run-file-change-projection-service.ts` | Members are read only through their owner | Member-view services | In This Change | Keep importing `locatedLaunchConfiguration` and the located-execution type |
| `RunFileChangeProjectionService.getEntry` | Dead: no production caller (`git grep "\.getEntry("`) | — | In This Change | Remove its tests too |
| "Active run first" check in the run-id read (`readProjectionContext` → `agentRuns().getActiveRun(runId)` before metadata) | Active members are in the same registry, so the check served members by run id (AR-001) | Standalone metadata first, then active-or-stored | In This Change | — |
| Private `childSourceOf` in `team-member-run-view-projection-service.ts`, `agent-org-member-run-view-projection-service.ts`, `standalone-root-member-view-projection-service.ts` | Three copies of one rule; the team and org rule was missing from `locatedLaunchConfiguration` (AR-002) | `locatedExecutionSource(location)` | In This Change | `requireLocation` validity check and `metadataFor` use it |
| Private `CollaborationExecutionLocationService.tagTeam` | Needed outside the compound service | Exported `tagTeamAgentExecution(item)`, used by the compound service and the team member-view service | In This Change | — |
| Web run-id-only content URL in `ArtifactContentViewer.vue` | Owner is always sent | `runFileChangeContentPath(subject, path)` | In This Change | — |
| `fetchFileChanges` in `agentRunCollaborationChildHydration.ts` | Duplicates the shared fetch | `fetchRunFileChanges({ kind: 'standaloneMember', … })` | In This Change | Keep `queryDeduplication: false` in the shared fetch |
| `EventMonitorActiveTraceBrowseSubject` export | Becomes the neutral owner subject | `AgentRunReadSubject` in `types/agent/agentRunReadSubject.ts` | In This Change | No alias |
| Server tests reading members by run id (`run-file-changes-api.integration.test.ts` team-member case; projection-service tests of the fallback) | Behavior removed | Owner-scoped tests | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

N/A — request/response reads only. Live file-change stream events are unchanged.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Content response policy (`sendFileChangeContent`) | DS-001 | REST module | 409/404/stream/mime/no-store for a resolved entry | One rule for four routes (REQ-008) | Divergent rules per owner |
| Entry lookup in a projection context (`entryIn`) | DS-001 | `RunFileChangeProjectionService` | Canonicalize path, find entry, absolute path | Shared by standalone and located-member entry | Duplicated canonicalization |
| `CollaborationMemberNotFoundError` | DS-001..003 | Member-view services | Typed "agent not in this root" | REST maps to 404 without swallowing other errors | Catch-all error handling |

## Ownership Boundaries

- Member location is authoritative only in the member-view services. Transport layers and the file-change service never locate members.
- The file-change service is authoritative for which projection (live or stored) and which file a located member's entry means.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Member-view service (per family) | Family location service, tree index | GraphQL resolvers, REST routes | A resolver or route calling a location service or `findAgent` directly | Add a method to the member-view service |
| `RunFileChangeProjectionService` | Projection store, live `RunFileChangeService`, path identity | Member-view services, GraphQL `getRunFileChanges`, REST `/runs/…` route | Routes reading `file_changes.json` or the live service directly | Extend the service |
| Web `fetchRunFileChanges` / `runFileChangeContentPath` | Query documents, route shapes | Hydration services, viewer | A caller building a file-change query or URL itself | Extend the two functions |

## Dependency Rules

- Allowed: resolvers/routes → member-view services → `RunFileChangeProjectionService` → store/live service. Resolvers/routes → `RunFileChangeProjectionService` only for standalone-run reads.
- Forbidden: `RunFileChangeProjectionService` → any location service or member-view service (no cycle, no scan); any run-id-only read searching collaboration trees; web components building file-change URLs or queries outside the two web functions.
- The member-view services obtain `RunFileChangeProjectionService` lazily (`getRunFileChangeProjectionService()`) or by injection, as `StandaloneRootMemberViewProjectionService` does today.

## Interface Boundary Mapping

| Interface / API / Query / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `getRunFileChanges(runId)` | Standalone run | File list | `runId` (standalone) | Non-standalone id → `[]`, no search |
| GraphQL `getTeamMemberFileChanges(teamRunId, agentRunId)` (new, `team-run-history.ts`) | Team member | File list | team run + agent run | Mirrors `getTeamMemberRunProjection` |
| GraphQL `getAgentOrgMemberFileChanges(orgRunId, memberAddress, agentRunId)` (new, `agent-org-run.ts`) | Org member | File list | org run + member address + agent run | Mirrors `getAgentOrgMemberRunProjection` |
| GraphQL `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` | Copy | File list | unchanged | — |
| REST `GET /runs/:runId/file-change-content?path=` | Standalone run | Content | `runId` | Non-standalone id → 404 |
| REST `GET /team-runs/:teamRunId/agent-runs/:agentRunId/file-change-content?path=` (new) | Team member | Content | team run + agent run | Same shape as team context-file route |
| REST `GET /agent-org-runs/:orgRunId/agent-runs/:agentRunId/file-change-content?memberAddress=&path=` (new) | Org member | Content | org run + member address + agent run | `memberAddress` required (400 if missing) |
| REST `GET /agent-collaborations/:hostRunId/agent-runs/:agentRunId/file-change-content?memberAddress=&path=` (new) | Copy | Content | hub + member address + agent run | Same |
| `RunFileChangeProjectionService.getStandaloneRunProjection(runId)` / `resolveStandaloneRunEntry(runId, path)` (renamed from `getProjection` / `resolveEntry`) | Standalone run | List / entry | run id | 1) `metadataService.readMetadata(runId)`: absent means not standalone, so return empty / null (no active-run check, no tree read). 2) Active run with that id: live projection with the run's workspace root, `isActiveRun: true`. 3) Otherwise: stored projection with the metadata's workspace root |
| `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection(location)` (existing) / `resolveLocatedCollaborationMemberEntry(location, path)` (new) | Located member (`LocatedCollaborationAgentExecution`, tagged) | List / entry | located execution | Live while `location.isActive`; workspace root `locatedLaunchConfiguration(location)?.workspaceRootPath` |
| `locatedExecutionSource(location)` (new export) | Located member's execution source | `{ agentDefinitionId, launchConfiguration }` | tagged located execution | Configured placement, else the catalog copy in the located tree; `null` if neither |
| `locatedLaunchConfiguration(location)` (existing, now complete) | Located member's launch | Launch configuration | tagged located execution | `locatedExecutionSource(location)?.launchConfiguration ?? null` for every family |
| `tagTeamAgentExecution(item)` (new export, was private `tagTeam`) | Team location tagging | Tag as `agent_team` with `rootRunId` | `LocatedTeamAgentExecution` | — |
| `TeamMemberRunViewProjectionService.getFileChanges(teamRunId, agentRunId)` / `resolveFileChangeEntry(teamRunId, agentRunId, path)` (new) | Team member | List / entry | team run + agent run | via scoped `requireLocation` |
| `AgentOrgMemberRunViewProjectionService.getFileChanges(orgRunId, memberAddress, agentRunId)` / `resolveFileChangeEntry(…, path)` (new) | Org member | List / entry | org + address + agent run | — |
| `StandaloneRootMemberViewProjectionService.getFileChanges(…)` (existing) / `resolveFileChangeEntry(hostRunId, memberAddress, agentRunId, path)` (new) | Copy | List / entry | hub + address + agent run | — |
| Web `fetchRunFileChanges(subject: AgentRunReadSubject)` | Any owner subject | List | subject | Dispatches to the four queries |
| Web `runFileChangeContentPath(subject, path)` | Any owner subject | Content route path | subject | Returns the REST path relative to the bound REST base |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `getRunFileChanges(runId)` / `/runs/:runId/…` | Yes (standalone run) | Yes. Standalone run metadata decides; an active run without it is not standalone | Low (after the cut) | Documented as standalone-only (AR-001) |
| `get/resolve…LocatedCollaborationMember…(location)` | Yes | Yes. A tagged location; the workspace root comes from `locatedExecutionSource` for every family | Low | AR-002 |
| Team / org / copy queries and routes | Yes | Yes | Low | — |
| `fetchRunFileChanges(subject)` | Yes | Yes (tagged subject) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Owner subject | `EventMonitorActiveTraceBrowseSubject` → `AgentRunReadSubject` | Yes | Low | Rename; field `browse` keeps its name (out of scope) |
| Standalone read | `getProjection` → `getStandaloneRunProjection`; `resolveEntry` → `resolveStandaloneRunEntry` | Yes | Low | Rename makes the narrowed subject explicit |
| Not-found error | `CollaborationMemberNotFoundError` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why |
| --- | --- | --- | --- |
| Locate a member in one root | Member-view services + family location services | Reuse / Extend | Already own exact-identity location, active-aware |
| Located member's file list | `getLocatedCollaborationMemberProjection` | Reuse | autobyteus-93 |
| Located member's entry | `RunFileChangeProjectionService` | Extend | Same subject |
| Owner subject on the web | Workspace target `browse` | Reuse (type moved) | Already correct per target |
| Route shapes | Context-file owner routes | Reuse convention | Consistency |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services` | File-change reads; team and org member views | DS-001..003 | Extend |
| `autobyteus-server-ts/src/standalone-agent-run-root/services` | Copy member views | DS-001 | Extend |
| `autobyteus-server-ts/src/agent-collaboration/execution/domain` | Shared located-execution domain types | DS-001..003 | Extend (error type) |
| `autobyteus-server-ts/src/api` | Transport | DS-001, DS-002 | Extend |
| `autobyteus-web/services/runHydration`, `services/runFileChanges`, `types/agent`, `components/workspace/agent`, `components/mobile`, `composables/mobile` | Owner subject, reads, viewer | DS-001, DS-002 | Extend / Create one small file |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no change after the shared-structure check).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Owner subject (event monitor + file reads) | `autobyteus-web/types/agent/agentRunReadSubject.ts` | web types | Same identity for two read families | Yes | Yes (one type, no alias) | A grab-bag of run fields |
| Content response policy (four routes) | private function in `api/rest/run-file-changes.ts` | REST | One rule | Yes | Yes | A general file server |
| Entry lookup in projection context | private method in `run-file-change-projection-service.ts` | run-history | Two entry methods | Yes | Yes | — |
| Member not-found | `agent-collaboration/execution/domain/collaboration-member-not-found-error.ts` | collaboration execution domain | Three member-view services, one REST mapping | Yes | Yes | A generic not-found error for unrelated subjects |
| Execution source of a located member (configured or catalog copy) | `locatedExecutionSource` in `agent-collaboration/execution/services/collaboration-execution-location-service.ts` (next to `locatedLaunchConfiguration` and the tagged union it switches on) | collaboration execution | Three member-view services + file-change service | Yes | Yes (replaces three `childSourceOf`) | A second locator (it reads only the located tree it is given) |
| Team tagging | `tagTeamAgentExecution` in the same file | collaboration execution | Compound service + team member-view service | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunReadSubject` | Yes | Yes | Low | Add `agentRunIdOf(subject)` next to it (one place that reads `runId` vs `agentRunId`) |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` (Modify) | run-history | File-change reads | Standalone-run list/entry (renamed; standalone metadata first, then active-or-stored); located-member list (existing) and entry (new); fallback removed; `getEntry` removed |
| `autobyteus-server-ts/src/agent-collaboration/execution/services/collaboration-execution-location-service.ts` (Modify) | collaboration execution | Located-execution helpers | Add `locatedExecutionSource`; `locatedLaunchConfiguration` delegates to it; export `tagTeamAgentExecution` (replaces private `tagTeam`) |
| `autobyteus-server-ts/src/agent-collaboration/execution/domain/collaboration-member-not-found-error.ts` (Add) | collaboration domain | Error type | `CollaborationMemberNotFoundError extends Error` |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` (Modify) | run-history | Team member views | `requireLocation` uses `findAgent({ rootTeamRunId: root, agentRunId: run })`, tags the result with `tagTeamAgentExecution`, validates with `locatedExecutionSource` (replaces `childSourceOf`), and throws `CollaborationMemberNotFoundError` (same messages). `metadataFor` uses `locatedExecutionSource`. Add `getFileChanges` and `resolveFileChangeEntry`, which pass the tagged location to the file-change service. Optional `runFileChangeProjectionService` injection |
| `autobyteus-server-ts/src/run-history/services/agent-org-member-run-view-projection-service.ts` (Modify) | run-history | Org member views | Not-found error type; `childSourceOf` → `locatedExecutionSource`; add `getFileChanges`, `resolveFileChangeEntry`; injection |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.ts` (Modify) | standalone root | Copy views | Not-found error type; `childSourceOf` → `locatedExecutionSource`; add `resolveFileChangeEntry` |
| `autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts` (Modify) | API | Thin | `getRunFileChanges` → `getStandaloneRunProjection` |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` (Modify) | API | Thin | `getTeamMemberFileChanges` |
| `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts` (Modify) | API | Thin | `getAgentOrgMemberFileChanges` |
| `autobyteus-server-ts/src/api/rest/run-file-changes.ts` (Modify) | API | Thin + response policy | Four routes; `sendFileChangeContent(reply, resolved)`; `CollaborationMemberNotFoundError` → 404 "File change not found"; missing `path` or `memberAddress` → 400; options accept the services for tests |
| `autobyteus-web/types/agent/agentRunReadSubject.ts` (Add) | web types | Owner subject | `AgentRunReadSubject`, `agentRunIdOf` |
| `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts`, `eventMonitorActiveTraceBrowse.ts`, `components/workspace/agent/AgentEventMonitor.vue`, `types/workspace/activeAgentWorkspaceTarget.ts` (Modify) | web | Importers | Use `AgentRunReadSubject` |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` (Modify) | web | Queries | `GetTeamMemberFileChanges`, `GetAgentOrgMemberFileChanges` (same fields as `GetRunFileChanges`) |
| `autobyteus-web/generated/graphql.ts` (Regenerate) | web | Codegen | — |
| `autobyteus-web/services/runHydration/runFileChangeHydrationService.ts` (Modify) | web | List read | `fetchRunFileChanges(subject)` dispatch; `network-only`, `queryDeduplication: false` |
| `autobyteus-web/services/runFileChanges/runFileChangeContentPath.ts` (Add) | web | Content route | `runFileChangeContentPath(subject, path)` → `runs/…`, `team-runs/…/agent-runs/…`, `agent-org-runs/…/agent-runs/…?memberAddress=`, `agent-collaborations/…/agent-runs/…?memberAddress=`, all `encodeURIComponent` |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts`, `teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts`, `services/agentOrgExecution/agentOrgContextHydration.ts`, `services/agentCollaboration/agentRunCollaborationChildHydration.ts` (Modify) | web | Callers | Pass the owner subject; remove the copy's local fetch |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` (Modify) | web | Viewer | New prop `readSubject: AgentRunReadSubject \| null`; URL = bound REST base + `runFileChangeContentPath`; no URL unless `agentRunIdOf(readSubject) === artifact.runId` |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` (Modify) | web | Tab | Pass `activeContextStore.activeWorkspaceTarget?.browse ?? null` |
| `autobyteus-web/composables/mobile/useMobileFocusedRunIdentity.ts`, `components/mobile/MobileArtifacts.vue` (Modify) | web | Mobile | Expose `focusedReadSubject` = active workspace target's `browse` when its agent run equals `focusedRunId`; pass to the viewer |

## Applied Patterns (If Any)

None beyond the existing per-family member-view services.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. The only new folder is `autobyteus-web/services/runFileChanges/` (one file); the fetch stays in `runHydration` where its callers live. A flatter placement (adding the content path into `runHydration`) was rejected because content addressing is not hydration.

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/runFileChanges/` | Off-Spine Concern | Yes | Low | Server addressing of file-change content |
| `agent-collaboration/execution/domain/` | Domain | Yes | Low | Next to `located-execution-structure.ts` |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Content route for an org member | `GET /agent-org-runs/org-1/agent-runs/a-7/file-change-content?memberAddress=%2Fresearch%2Fwriter&path=docs%2Fa.md` | `GET /runs/a-7/file-change-content?path=docs%2Fa.md&rootKind=agent_org&rootRunId=org-1` (one route with an optional selector) | Explicit subject per route, as context files |
| Server dispatch | Route → `AgentOrgMemberRunViewProjectionService.resolveFileChangeEntry(orgRunId, memberAddress, agentRunId, path)` → `requireLocation` → `RunFileChangeProjectionService.resolveLocatedCollaborationMemberEntry(location, path)` | Route → `CollaborationExecutionLocationService.findAgent(...)` → file-change store | No boundary bypass |
| Ownerless read | `resolveStandaloneRunEntry("a-7", path)` for a member id → `null` → 404 | `null` → try collaboration trees | No fallback |
| Ownerless read of an *active* member (AR-001) | Team `t-1` is running and member `a-7` is active. `readMetadata("a-7")` is absent → `null` → 404, and `getRunFileChanges("a-7")` → `[]` | `getActiveRun("a-7")` is found → served live by run id | Being active is not the same as being standalone |
| Hub with copies by run id | Hub `h-1` has metadata → standalone. Running → live list with its workspace root; saved → stored list. Its copy `c-3` (task agent, own `run_metadata.json` with a `taskAgent` section) reads as absent → `[]` | — | The rule holds for hubs and their copies |
| Task agent entry (AR-002) | Team task agent `ta-2` (`configuredPlacement: null`). `locatedExecutionSource` finds its catalog source in `rootTeam.taskExecutions` and its launch `workspaceRootPath` `/w/proj`. Entry `docs/a.md` → `/w/proj/docs/a.md` → bytes | `locatedLaunchConfiguration` → `null` → absolute path `null` → 404 "not available" | Same bytes as a configured member |
| Viewer guard | `readSubject={kind:'teamMember', agentRunId:'a-7', …}` and `artifact.runId === 'a-7'` → URL | Build a URL from `artifact.runId` alone | No cross-run request during selection changes |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the collaboration fallback for run-id reads | Older web builds or other clients | Rejected | Removed; only in-repo clients, shipped together |
| Alias `EventMonitorActiveTraceBrowseSubject` | Fewer import edits | Rejected | Update 4 importers |
| Keep `getProjection`/`resolveEntry` names | Fewer edits | Rejected | Rename to standalone-run names |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server: add `CollaborationMemberNotFoundError`; switch the three member-view services' `requireLocation` to it; scope the team one to `rootTeamRunId` and tag its result with `tagTeamAgentExecution`. Add `locatedExecutionSource` and export `tagTeamAgentExecution` in `collaboration-execution-location-service.ts`; make `locatedLaunchConfiguration` delegate; replace the three `childSourceOf`.
2. Server: `RunFileChangeProjectionService`. Rename the standalone methods; the standalone path reads standalone metadata first and only then checks for an active run. Add `resolveLocatedCollaborationMemberEntry`. Remove the fallback, its locators and `getEntry`.
3. Server: member-view `getFileChanges` / `resolveFileChangeEntry`; GraphQL queries; REST owner routes with the shared response policy.
4. Server tests:
   - Unit tests per member-view service: scoped locate, not-found, list, entry. A spy shows that only the named root is read.
   - Projection-service tests: standalone only, with no collaboration read. AC-007 covers both saved and running owners: a member whose run is active in the activation registry still gets `[]` / `null` by run id. A hub with copies is served by run id both running and saved, and its copy's run id gets `[]`.
   - `locatedExecutionSource` tests: configured member, team task agent, org task agent (root `taskExecutions` and a member team's), hub copy, and a member with neither (`null`).
   - Content and list tests for a team task agent and an org task agent, saved and running, with workspace-relative paths. The bytes are served, and a pending file while running answers 409 (AC-003, AC-005, AC-008). REST unit tests per route (stream, 404, 409, 400); integration test of team-member reads moved to the team routes; containment e2e: replace `getRunFileChanges(copy)` with `agentRunCollaborationMemberFileChanges(...)` and keep a remaining hub-scanning call as the warning trigger (if none remains among its calls, the API/E2E engineer picks a still-scanning surface and records it).
5. Web: move the subject type; `fetchRunFileChanges(subject)` and callers; `runFileChangeContentPath`; viewer, tab, mobile; queries + codegen against a server built from this worktree.
6. Web tests: viewer URL per subject kind and the mismatch guard; fetch dispatch per kind; hydration callers send the right subject; mobile view.
7. Docs (delivery docs sync): `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `docs/modules/agent_artifacts.md`, `docs/modules/run_history.md`, `docs/modules/standalone_agent_run_root.md`; `autobyteus-web/docs/agent_artifacts.md`, `agent_teams.md`, `agent_orgs.md`.

## Key Tradeoffs

- Per-family routes and queries (explicit, more endpoints) over one route with an optional owner selector (fewer endpoints, ambiguous selector).
- Member location stays in the member-view services; the file-change service never locates. This costs two small methods per family but keeps one location authority and removes the parallel stored-only locators.
- `memberAddress` is required for org and copy content routes because those member-view services validate it (exact identity); team routes follow the team member-view identity (team run + agent run).

## Risks

- R-001 live lists for running teams/orgs (accepted, DEC-003).
- R-002 subject/artifact mismatch during selection changes: guarded in the viewer.
- R-003 containment e2e trigger: handled in sequence step 4.
- R-004 (SR-003): a standalone run read now costs one small metadata read even while the run is active. This is negligible next to the projection read and is the price of the AR-001 discriminator.
- R-005 (SR-003): `locatedExecutionSource` also feeds the member-view services' `metadataFor`, so team and org conversation projections use the same source rule. The outcome is unchanged, since they already used `configured ?? childSourceOf`.
- Codegen requires a running server built from this worktree.

## Guidance For Implementation

- Keep error messages of `requireLocation` unchanged; only the class changes.
- `locatedExecutionSource` must read only the located tree it is given. It must not look anything up.
- Watch for an import cycle between `collaboration-execution-location-service.ts` and `collaborator-source-projector.ts`. If one appears, the helper may live in `collaborator-source-projector.ts` and be re-used by `locatedLaunchConfiguration`, with the same single-owner rule.
- Team member identity for the web subject: team hydration callers have the member address in the team tree/location; it is carried in the subject even though the team query does not need it.
- Do not add caching or indexes; the scoped lookup is one tree read.
- QR-001/AC-010 are measured by API/E2E on a changed build with a seed that has hundreds of unrelated saved team runs.
