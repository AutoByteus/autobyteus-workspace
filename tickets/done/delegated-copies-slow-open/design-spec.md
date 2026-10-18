# Design Spec — Delegated Copies Slow To Show And Open

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (revision for ARCH-REV-001: AR-001, AR-002)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-002; approved by the Solution Designer within the direction, user informed in this conversation on 2026-10-18
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/investigation-notes.md`
- Authorities read (2026-10-18): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/DESIGN.md` (rules 3, 4, 5, 6; "Keep unrelated state off the critical path"; "Match payload and UI work to the change"); `TESTING.md`; `autobyteus-web/AGENTS.md`. `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none

## Current-State Read

A standalone run that delegated work (the **hub**) keeps its copies in a collaboration root. The web client builds one `AgentRunCollaborationContext` per hub: an index of every child agent (task agents and task-team members, open and closed Tasks) and one `AgentContext` per child. The sidebar's copy rows (`AgentRunTaskRows.vue`) and the hub's center view read that context.

The context is published only after `stageAgentRunCollaborationContext` has fetched, for **every** child, the member projection (full conversation and activities) and `getRunFileChanges` (artifacts), in one `Promise.all` (BEH-001). The same staging runs for the live stream's snapshot and again after every `checkpoint_required` event (a new copy or a settings Save, BEH-004). On the server, `getRunFileChanges(memberRunId)` finds a copy member only through `CollaborationExecutionLocationService.findAgent({ agentRunId })` without a root, which reads every stored team tree, org tree and hub tree per request.

Measured on a test-owned copy of the user's PM hub (286 child agents): 572 requests per publication, a 257 MB projection payload, and about 2 s of server CPU per artifact lookup (about 10 minutes in total). The hub's own view costs about 0.45 s, and the hub's own conversation 13 ms. Rows need only the index and each child's status (`listTaskRows`), not conversations. Root cause: the client eagerly loads unrelated per-child state on the critical path, and the server's run-id artifact lookup scans unrelated runs. The memory layout is not the cause. Evidence: investigation notes, Source Log and Runtime findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 9 production files in two existing subsystems (web agent collaboration and server standalone-root and run-file-change services), within their current owners. One new web file, one additive GraphQL query, no new subsystem, no persistence change. Test updates in about 10 existing spec files plus new tests.
- Architectural risk: `High`
- Risk rationale and supporting evidence: the change moves a child's state loading from "complete before publish" to on-demand, which changes the lifecycle and concurrency between a child's loading and live stream events, local submissions and republication (R-001). It also adds a public GraphQL query (contract). Both are listed risk surfaces.
- Escalation trigger if implementation or validation discovers new impact: any need to change collaboration stream DTOs or contracts `dist/`, storage files or message-log stores (autobyteus-114 area); team/org root hydration behavior; or a consumer that needs unopened children's conversations.

## Architecture Investigation Evidence

| Source / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Timing probe | `probes/open-cost-probe.test.ts`, `probes/probe-run1.txt` | 286 children; projections 15.4 s / 257 MB; artifact lookup 1.95–2.38 s each; hub view 0.45 s | D-1 rows from the view alone; D-3 hub-scoped artifact list | Wall time in the app (U-001) |
| Code | `agentRunCollaborationContext.ts#listTaskRows` | Rows use the index and `currentStatus` only | D-1 | — |
| Code | `agentRunCollaborationContext.ts#prepareLocalContextAdoption` | Republication replaces each retained child's `state` with the newly staged one | D-4 carry-over of opened children's content | — |
| Code | `teamMemberProjectionHydrationService.ts` | On-demand member hydration precedent: in-flight dedupe, revision guard with 3 retries, live tool-state reconciliation, authoritative marker | D-2 same policy for hub children | — |
| Code | `agentRunCollaborationStore.ts#selectChild`, `useTaskRootNavigation.ts`, `AgentRunTaskRows.vue#select` | Every way to open a child goes through `selectChild`; `childTargetFor` requires a selected child | D-2 trigger at selection | — |
| Code | `run-file-change-projection-service.ts#readProjectionContext` | Collaboration-member branch: active → `getProjectionForCollaborationMember`, stored → `readProjection(memoryDir)` | D-3 reuse that branch from a located member | — |
| Code | `standalone-root-member-view-projection-service.ts#requireLocation` | Hub-scoped location (≈26 ms) already used by projection and event-monitor pages | D-3 owner of the new member read | — |
| Code | `ArtifactContentViewer.vue` → `/runs/:runId/file-change-content` → `resolveEntry(runId)` | Same unscoped lookup per artifact open | FU-3 (out of scope) | — |

## Intended Change

Publish a hub's collaboration context from its view alone (no per-child requests). Load one child's stored conversation, activities and artifact list when that child is selected, through a hub-scoped server read. After a republication, refresh only the selected child.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Web agent-collaboration staging, child hydration, context, store and streaming service; the shared `fetchMemberRunState` input shape; one additive server query for a hub child's artifact list and the extraction of the located-member branch in `RunFileChangeProjectionService`; tests; docs `autobyteus-web/docs/agent_execution_architecture.md` / `chat.md` (where they describe Agent-root hydration) and `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` (new query; note that for a running hub the scoped query returns a child's live artifacts, as for team members, while the generic run-id path always read the stored file; review R-B).
- Deliberately left alone: collaboration stream DTOs and contracts `dist/` (view still carries tree, statuses, input states and messages); storage files, `StandaloneRootPackageStore` and message-log stores (autobyteus-114); team and org root hydration (FU-1); the hub's message log in the view (FU-2); generic `getRunFileChanges(runId)` and the artifact content REST route (FU-3); sidebar run-history list; Task summary store (already batched).
- Follow-ups: **sent to `/project_task_manager` on 2026-10-18 at the user's request** (`followups-for-project-task-manager.md`); do not resend at delivery receipt:
  - FU-1: team-run and org-run roots also stage every member eagerly (`teamRunContextHydrationService.ts` best-effort all members; `agentOrgContextHydration.ts` all seeds). Today's volumes are small (largest org tree 34 agents). When done, extract the shared on-demand member hydration core that this ticket and `teamMemberProjectionHydrationService.ts` then both need.
  - FU-2: the hub's whole message log (4.3 MB / 1,325 messages on the user's PM) is sent with every view and snapshot; it grows with hub activity. Consider loading messages per opened child or Team tab.
  - FU-3: run-id-only file-change reads (`RunFileChangeProjectionService.readProjectionContext` → unscoped `findAgent`) scan every stored team/org/hub tree, about 1–2 s per call on the user's node. This affects the artifact content route for copies, team members and org members, and `getRunFileChanges` for team/org members. Give file-change reads an explicit owner scope.
  - FU-4: `useTaskRootNavigation.ts` waits at most 5 s for a hub's view to list the worker. It silently gave up under the old load. Re-check after this fix; no change is needed if validation shows the view in time.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior (evidence) | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-005; AC-001, AC-002, AC-005 | Sidebar hub row mounted | Rows after all children loaded (notes BEH-001) | Rows from the view in one request; same rows and statuses | DS-001 |
| BEH-002 | User | REQ-002; AC-003 | Click hub run | Waits behind fan-out | Hub conversation independent; Team tab from the view | DS-001 (sync path), unchanged host open |
| BEH-003 | User | REQ-003, REQ-004, REQ-006; AC-004, AC-006, AC-009 | Click a copy row / send to it | Staged eagerly | Selected child hydrated on demand, hub-scoped | DS-002, DS-003 |
| BEH-004 | System | REQ-006, REQ-007; AC-006, AC-007 | New copy / settings Save on a live hub | Re-stage all children | Republish structure; carry opened children's content; refresh the selected child only | DS-004 |
| BEH-005 | User | REQ-005; AC-005 | Rows shown | Correct statuses and summaries | Unchanged (statuses from the view and stream; summaries batched) | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/open-cost-probe.test.ts` | Server-side read timings | REQ-008, QR-001, QR-002 | Baseline; rerun after the change for server numbers (the new member read replaces the unscoped lookup) | Evidence |
| `probes/probe-run1.txt` | Baseline output | REQ-008 | Baseline numbers | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` (bug fix).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - Repeated coordination / unrelated work on the critical path: publication of the structure waits for a per-child fan-out the structure does not use (DESIGN.md rule 3, "Keep unrelated state off the critical path"). M children × H stored trees on the server (DESIGN.md "write down the work count": 286 × ~1,400).
  - Ambiguous-boundary trigger: `getRunFileChanges(runId)` takes a bare run id and guesses the run's family by scanning all of them. For hub children the client already knows the exact compound identity (`hostRunId`, `memberAddress`, `agentRunId`).
  - Ruled out: persisted-data transition (reads only); shared-structure looseness (no DTO change); file-placement drift (the new on-demand hydration gets its own file next to the staging file instead of growing the store).
- Root cause classification: `Boundary Or Ownership Issue`. The structure publication owns child detail loading it does not need, and the artifact read uses an unscoped lookup where an exact scoped one exists.
- Refactor needed now: `Yes` (bounded). Split structure staging from child detail hydration; give hub children a hub-scoped artifact read.
- Evidence: Current-State Read; probe.
- Design response: D-1..D-5 below.
- Refactor rationale: deleting the eager fan-out removes the cost instead of accelerating it (DESIGN.md rule 5). The scoped read uses the exact identity the client already holds.
- Intentional deferrals and residual risk: FU-1 (same pattern in team/org roots, small volumes), FU-2 (message payload), FU-3 (generic run-id file-change reads, including artifact content opens for copies, about 1–2 s per open).

### Design Decisions

- **D-1 Structure publication needs no child details.** `buildAgentRunCollaborationContext({ hostRunId, view })` builds the index and one Offline `AgentContext` per child (statuses and input states from the view, as today). It resolves workspaces once per distinct root path (as today) and fetches nothing per child. Inspection and stream snapshots publish that context directly. The `commit` step at publication is removed, because nothing is staged per child.
- **D-2 One child is hydrated on demand, bound to one published context.** A **load** is `hydrateAgentRunCollaborationChild({ hostRunId, collaboration, agentRunId, isPublished, liveToolAuthority })`. It is bound to exactly one published collaboration context `C` (the `collaboration` argument) and one child `X` of it. It loads X's projection and artifact list (hub-scoped) and commits them into X's `AgentContext` in C, the activity store and the file-change store. Policy, following the team precedent (`teamMemberProjectionHydrationService.ts`) where it applies:
  - **Supersession (AR-001).** `isPublished()` answers whether C is still the store's published context for this hub (and the hub is not terminating). The load checks it after every fetch and immediately before the synchronous commit. If it is false, the load ends with outcome `superseded`: no retry, no commit, no warning. It never writes into an `AgentContext` that adoption has handed to a newer context.
  - **Conflict retry, within C only.** Before committing, the load checks that X's `eventMonitorPresentationRevision` and activity content revision are unchanged since the fetch began, and `commitMemberRunStates` returns no `conflict`. Otherwise it retries against the same C, at most 3 attempts, then fails. A shown local message or a live event bumps the presentation revision, so a just-sent message is never overwritten (AR-002: no separate submission guard).
  - On a live hub with a ready stream, reconcile live tool state with `reconcileTeamMemberToolState` (generic despite its name).
  - Commit order: `commitMemberRunStates` (activities, artifacts), then conversation, `hasEarlierActiveTraceEvents`, event-monitor baselines, then `C.markChildHydrated(X)`; synchronous after the last check.
  - Outcomes: `hydrated`, `superseded`, or a thrown error after 3 conflicts or a fetch failure. On error: `console.warn` naming host and child; X stays not hydrated in C; the next selection retries (AC-004).
  - The load holds no dedupe state of its own. The store owns dedupe (D-5).
- **D-3 Hub-scoped artifact list.** New GraphQL query `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId): [RunFileChangeEntryObject]` on `AgentRunCollaborationResolver`. It calls `StandaloneRootMemberViewProjectionService.getFileChanges(...)`, which uses the existing `requireLocation` (hub-scoped), then `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection(location)`. That method is extracted from today's collaboration branch of `readProjectionContext`, which then calls it too (one implementation of active vs stored member artifacts). No unrelated tree is read.
- **D-4 Republication keeps opened children cheap.**
  - `prepareLocalContextAdoption(previous)` carries `conversation` and `hasEarlierActiveTraceEvents` from previously hydrated children into the new state, so the opened copy does not flash empty. It does not carry the hydrated mark, because events may have been missed between the old and new stream or view.
  - After every publication, the store starts a load for the currently selected child against the new context (one projection request and one artifact request). A load still in flight for the previous context ends as `superseded` (D-2) and does not block it (D-5 key).
  - Other previously opened children refresh when selected again.
  - Unopened children are never loaded (AC-007).
  - Accepted cost (review R-C): clicking a copy under a hub that is not the selected run starts one load, and the run selection that the click causes republishes the hub and starts a second. That is at most one extra projection and one extra artifact request per such click; AC-004 allows it, since a new inspection occurred. Avoiding it would mean trusting a load across a republication, which D-4 rejects for correctness.
- **D-5 Trigger at selection; the store owns dedupe.** `selectChild(hostRunId, agentRunId)` (sidebar row, Task locate) and every publication with a selected child call the store's `ensureChildHydrated(hostRunId, agentRunId)`. The store is the single dedupe owner. It keeps in-flight loads in `WeakMap<AgentRunCollaborationContext, Map<agentRunId, Promise>>`, so the key is (published context, child) and cannot span a republication. `ensureChildHydrated` does nothing if there is no published context, no child, the child is already hydrated in the current context, or a load for (current context, child) is in flight. Otherwise it starts one load with `isPublished = () => contexts[host] === C && !terminations.has(host)` and removes the entry when that load settles. `childTargetFor` stays a pure getter. Sending to a child requires it to be selected, so it is hydrated or loading. The presentation-revision check in D-2 protects a just-sent message.

## Terminology

- **Hub**: a standalone agent run with a collaboration root (delegated copies).
- **Child**: an agent under the hub (task agent or task-team member).
- **Hydrated child**: a child whose stored conversation, activities and artifact list were loaded into the client in the current collaboration context.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in this scope: eager per-child staging in `agentRunCollaborationHydration.ts`; the publication `commit` callback and the `activityRevisions` capture in the store's `inspect`; the commit passing in the streaming service.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. The change reads existing files through existing readers; nothing is written or reshaped.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-005 | Hub row mounted / hub selected | Copy rows rendered | `agentRunCollaborationStore` | The reported slowness |
| DS-002 | Primary End-to-End | BEH-003 | User selects a child | Child conversation, activities, artifacts shown | `agentRunCollaborationStore` → child hydration | Lazy details |
| DS-003 | Primary End-to-End (server) | BEH-003 | `agentRunCollaborationMemberFileChanges` | Child's artifact entries | `StandaloneRootMemberViewProjectionService` | Removes the scan |
| DS-004 | Return-Event | BEH-004 | `checkpoint_required` / host stop | Republished context; selected child refreshed | Streaming service → store | Per-delegation cost |
| DS-005 | Bounded Local | BEH-003 | Hydration attempt | Commit or retry | `hydrateAgentRunCollaborationChild` | Race with live events (R-001) |

## Primary Execution Spine(s)

- DS-001: `AgentRunTaskRows (mount) / useAgentRunCollaborationSync → agentRunCollaborationStore.inspect | attach → GraphQL agentRunCollaboration | stream snapshot → buildAgentRunCollaborationContext → store.publish → taskRows → rows`
- DS-002: `Row click / Task locate → store.selectChild → store.ensureChildHydrated → hydrateAgentRunCollaborationChild → (member projection + member file changes queries) → commit into AgentContext + activity/file-change stores → center view`
- DS-003: `GraphQL agentRunCollaborationMemberFileChanges → AgentRunCollaborationResolver → StandaloneRootMemberViewProjectionService.getFileChanges → StandaloneRootLocationService.findAgent({rootRunId,…}) → RunFileChangeProjectionService.getLocatedCollaborationMemberProjection → entries`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The hub's view (tree, statuses, messages) is read once; the client builds the index and Offline child contexts and publishes; rows render at once | view, collaboration context, rows | store | workspace resolution |
| DS-002 | Selecting a child loads only that child's projection and artifact list, guarded against concurrent live changes, then commits | child context, projection, artifacts | store (trigger), child hydration (sequencing) | tool-state reconciliation, event-monitor baselines |
| DS-003 | The server locates the child inside the named hub only and returns its artifact list from the same owner used for the generic read | located member, file-change projection | member view projection service | active vs stored artifact source |
| DS-004 | A new snapshot republishes the cheap structure; opened children keep displayed content; the selected child is refreshed | new context, adoption | streaming service, store | — |

## Spine Actors / Main-Line Nodes

`AgentRunTaskRows.vue`, `agentRunCollaborationStore`, `agentRunCollaborationHydration.ts` (`readAgentRunCollaboration`, `buildAgentRunCollaborationContext`), `agentRunCollaborationChildHydration.ts`, `AgentRunCollaborationContext`, `AgentRunCollaborationStreamingService`; server `AgentRunCollaborationResolver`, `StandaloneRootMemberViewProjectionService`, `RunFileChangeProjectionService`.

## Ownership Map

- `agentRunCollaborationStore`: lifecycle per hub (inspect/attach/release), selection, publication, and the decision of when a child is hydrated (selection and after publication).
- `buildAgentRunCollaborationContext`: transforms a view into a context; no I/O except workspace resolution.
- `agentRunCollaborationStore` (in addition): the single owner of in-flight child-load dedupe, keyed by (published context, child), and of the `isPublished` answer given to each load.
- `hydrateAgentRunCollaborationChild`: the sequencing of one load bound to one published context (fetch, supersession check, conflict retry within that context, commit). It holds no dedupe state.
- `AgentRunCollaborationContext`: child contexts, the hydrated set (`isChildHydrated`, `markChildHydrated`), adoption rules, rows, events.
- `StandaloneRootMemberViewProjectionService`: stored views of one hub child (projection, event monitor page, and now the artifact list) by exact compound identity.
- `RunFileChangeProjectionService`: the only implementation of "artifact projection of a located collaboration member" (active vs stored).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunCollaborationResolver.agentRunCollaborationMemberFileChanges` | `StandaloneRootMemberViewProjectionService` | GraphQL transport | location or artifact logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Per-child `fetchMemberRunState` loop and `fetchProjection` in `stageAgentRunCollaborationContext` | D-1 | `buildAgentRunCollaborationContext` (structure) + `agentRunCollaborationChildHydration.ts` (one child) | In This Change | `fetchProjection` moves to the child hydration file |
| `stageAgentRunCollaborationContext` name, its `activityRevisions` / `isCurrent` inputs and `commit` result | Nothing is staged per child | `buildAgentRunCollaborationContext({ hostRunId, view })` returning the context | In This Change | `isCurrent` checks stay in the callers (store/stream) |
| `activityRevisions` capture in `agentRunCollaborationStore.inspect`; `commit` parameter of `publish` and of the streaming service's `publish` option | Dead after D-1 | — | In This Change | |
| Eager re-staging after `checkpoint_required` | D-4 | Cheap republish + selected-child refresh | In This Change | Reconnect itself stays |
| `runId` field of `fetchMemberRunState` input | Replaced by explicit `fetchFileChanges` per caller | Callers pass `() => fetchRunFileChanges(runId)` (team, org) or the hub-scoped fetch | In This Change | One shape, no hidden default |

## Return Or Event Spine(s) (If Applicable)

DS-004: `stream ROOT_EXECUTION_EVENT (task_execution_started | delegated_launch_selections_changed) → context.applyEvent = checkpoint_required → streaming service reconnect → snapshot → buildAgentRunCollaborationContext → store.publish (adoption carries opened children's content) → store.ensureChildHydrated(selected)`.
Stopped hub: `syncHost(running=false) → inspect → publish → ensureChildHydrated(selected)`.
Live presentation events (`agent_presentation`) keep being dispatched into each child's `AgentContext`, hydrated or not (unchanged).

## Bounded Local / Internal Spines (If Applicable)

- DS-005, parent owner `hydrateAgentRunCollaborationChild`:
  0. If `isPublished()` is false at any check below → end `superseded` (no retry, no commit).
  1. Capture the revisions (presentation, activity) and the live-tool authority.
  2. Fetch the projection and the artifact list in parallel.
  3. Check `isPublished()` (else `superseded`), then that the revisions are unchanged; if they changed, retry from step 1 against the same context (at most 3 attempts, then error).
  4. Reconcile tool state when live.
  5. Synchronously from here: `commitMemberRunStates`; on `conflict`, retry from step 1 (counts toward the 3).
  6. Assign the conversation and baselines, then `collaboration.markChildHydrated(X)` → outcome `hydrated`.
- Why it matters: it is the only place where on-demand content meets concurrent live updates (R-001).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why It Exists | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace resolution (`resolveWorkspace`) | DS-001 | context builder | Map launch root paths to workspace metadata, once per root | Child config needs workspace | — (unchanged) |
| Tool-state reconciliation (`reconcileTeamMemberToolState`) | DS-002 | child hydration | Keep live tool decisions over a stale projection | Live hub | — (reused) |
| Event-monitor baselines (`reset/primeRecentEventMonitorBaseline`) | DS-002 | child hydration | Event monitor windows after content replacement | Same as today | — (reused) |
| Activity/file-change commit (`commitMemberRunStates`) | DS-002 | child hydration | Revision-guarded activity replacement, artifact merge | Same as today | — (reused) |

## Ownership Boundaries

- The store is the only entry for UI code: components and composables call `selectChild`, `inspect`, `syncHost`, `taskRows` and `childTargetFor`, never the hydration services directly.
- The child hydration owns sequencing; the context owns the hydrated set and child contexts.
- On the server, the GraphQL resolver calls only `StandaloneRootMemberViewProjectionService`. That service uses `StandaloneRootLocationService` (hub-scoped) and `RunFileChangeProjectionService` (located member).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers That Must Use It | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `agentRunCollaborationStore` | child hydration, context builder, streaming service | `AgentRunTaskRows.vue`, `useTaskRootNavigation`, `useAgentRunCollaborationSync`, `activeContextStore` | A component calling `hydrateAgentRunCollaborationChild` | Add a store action |
| `StandaloneRootMemberViewProjectionService` | location service, `RunFileChangeProjectionService` located method | `AgentRunCollaborationResolver` | Resolver composing location + file-change service itself | Add a service method |
| `RunFileChangeProjectionService` | projection store, run file change service | member view service, generic resolver/REST | Re-implementing active/stored member artifact reads elsewhere | Extend this service |

## Dependency Rules

- Allowed: store → (context builder, child hydration, streaming service, context); child hydration → GraphQL queries, `commitMemberRunStates`, conversation/activity builders, `reconcileTeamMemberToolState`, event-monitor baseline helpers, context; streaming service → context builder (not child hydration).
- Forbidden: components → child hydration; context → GraphQL; child hydration → store (it receives what it needs as input, including `isPublished` and live-tool authority).
- Server: resolver → member view service → (location service, run file-change projection service). The member view service must not call `CollaborationExecutionLocationService` (unscoped).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` | Hub child's artifact list | Return `[RunFileChangeEntryObject]` | compound triple, like the existing member projection and event-monitor queries | New, additive |
| `StandaloneRootMemberViewProjectionService.getFileChanges(hostRunId, memberAddress, agentRunId)` | same | located read | same triple | Uses `requireLocation` |
| `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection(location: LocatedCollaborationAgentExecution)` | Located member's artifacts | active vs stored | located record | Extracted; `readProjectionContext` reuses it |
| `buildAgentRunCollaborationContext({ hostRunId, view })` | View → context | structure only | host run id + view | Replaces staging |
| `hydrateAgentRunCollaborationChild({ hostRunId, collaboration, agentRunId, isPublished, liveToolAuthority })` | One child's stored state for one published context | load + commit; outcome `hydrated` / `superseded` / error | (published context, child run id) | New; no dedupe state |
| Store `ensureChildHydrated(hostRunId, agentRunId)` (internal action, also used by `selectChild` and after publication) | Trigger | single dedupe owner, keyed by (published context, child) | host + child | |
| `fetchMemberRunState({ fetchProjection, fetchFileChanges })` | One member's state | parallel fetch | caller-supplied fetchers | Explicit for all callers |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `agentRunCollaborationMemberFileChanges` | Yes | Yes | Low | — |
| `getLocatedCollaborationMemberProjection` | Yes | Yes (located record) | Low | — |
| `hydrateAgentRunCollaborationChild` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Context builder | `buildAgentRunCollaborationContext` | Yes | Low | — |
| Child loader | `hydrateAgentRunCollaborationChild` (file `agentRunCollaborationChildHydration.ts`) | Yes | Low | — |
| Query | `agentRunCollaborationMemberFileChanges` | Yes (matches sibling queries) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| On-demand member load policy | `teamMemberProjectionHydrationService.ts` | Reuse policy, new Agent-root file | That service is bound to `AgentTeamContext`; generalizing now would change team code outside scope; shared core is FU-1 |
| Member state fetch/commit | `memberRunStateHydration.ts` | Extend (explicit `fetchFileChanges`) | Same pairing contract |
| Located member artifacts | `RunFileChangeProjectionService` | Extend (extract method) | Single implementation |
| Hub-scoped member read | `StandaloneRootMemberViewProjectionService` | Extend | Owns member views by compound identity |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentCollaboration` | context build, child hydration, streaming, context | DS-001, DS-002, DS-004, DS-005 | Extend |
| `autobyteus-web/stores` (`agentRunCollaborationStore`) | lifecycle, selection, triggers | DS-001, DS-002, DS-004 | Extend |
| `autobyteus-web/services/runHydration` (`memberRunStateHydration.ts`) | member state fetch/commit | DS-002 | Extend |
| `autobyteus-server-ts/src/standalone-agent-run-root/services` | hub child views | DS-003 | Extend |
| `autobyteus-server-ts/src/run-history/services` | file-change projection | DS-003 | Extend |
| `autobyteus-server-ts/src/api/graphql/types` | transport | DS-003 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping. No reusable structure beyond the reuse above emerged.

## Reusable Owned Structures Check

| Repeated Logic | Candidate | Decision |
| --- | --- | --- |
| On-demand member hydration (team precedent and new Agent-root child) | shared core in `services/runHydration` | Not now. It would change team code outside scope; record in FU-1, when the third user (team/org roots) appears |
| Located member artifacts (active vs stored) | `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection` | Extracted (single implementation) |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RunFileChangeEntryObject` (reused for the new query) | Yes | Yes | Low | — |
| `fetchMemberRunState` input | Yes | Yes (`runId` removed) | Low | — |

## Final File Responsibility Mapping

| File | Owner | Concern | Change |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts` | context builder | `readAgentRunCollaboration`, `buildAgentRunCollaborationContext` (structure only) | Modify |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationChildHydration.ts` | child hydration | `hydrateAgentRunCollaborationChild` (one load bound to one published context), member projection and member file-change fetches | Add |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` | context | hydrated set; adoption carries opened children's content | Modify |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | store | publish without commit; `ensureChildHydrated` on selection and after publish; inspect simplified | Modify |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` | stream | snapshot → build → publish | Modify |
| `autobyteus-web/services/runHydration/memberRunStateHydration.ts` | member state | explicit `fetchFileChanges` | Modify |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts`, `services/agentOrgExecution/agentOrgContextHydration.ts` | callers | pass `fetchFileChanges: () => fetchRunFileChanges(id)` | Modify (mechanical) |
| `autobyteus-web/graphql/queries/collaboratorQueries.ts`, `autobyteus-web/generated/graphql.ts` | queries | `GetAgentRunCollaborationMemberFileChanges` | Modify / regenerate |
| `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts` | resolver | new query | Modify |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.ts` | member views | `getFileChanges` | Modify |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | file changes | extract `getLocatedCollaborationMemberProjection` | Modify |
| Tests and docs | — | see Guidance | Modify / Add |

## Applied Patterns (If Any)

Lazy loading with a store-owned in-flight dedupe keyed by (published context, child), supersession by context identity, and an optimistic revision check with bounded retry within one context (the team member precedent's guard policy).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationChildHydration.ts` | File | child hydration | one child's load and commit | store state, selection policy, structure building |

All other changes are in existing files listed above.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `services/agentCollaboration/` | Main-line domain-control (client) | Yes | Low | Sits next to the staging and streaming files it complements |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Publication | `const context = await buildAgentRunCollaborationContext({ hostRunId, view }); publish(hostRunId, context)`, then `ensureChildHydrated(hostRunId, selection[hostRunId])` | `Promise.all(children.map(fetchMemberRunState))` before `publish` | Rows independent of copies |
| Server read | `requireLocation(host, address, id)` → `getLocatedCollaborationMemberProjection(location)` | `getRunFileChanges(id)` → scan all families | Cost independent of stored runs |
| Prefetch | none | prefetch visible rows / all in background | Repeats the server load (DEC-002) |

Example store shape (illustrative):

```ts
// Store-owned dedupe: the key is (published context, child), so it never spans a republication.
const childLoads = new WeakMap<AgentRunCollaborationContext, Map<string, Promise<unknown>>>()

const ensureChildHydrated = (hostRunId: string, agentRunId: string | null): void => {
  const context = contextFor(hostRunId)
  if (!agentRunId || !context || context.isChildHydrated(agentRunId)) return
  const loads = childLoads.get(context) ?? new Map<string, Promise<unknown>>()
  childLoads.set(context, loads)
  if (loads.has(agentRunId)) return
  const load = hydrateAgentRunCollaborationChild({
    hostRunId, collaboration: context, agentRunId,
    isPublished: () => contextFor(hostRunId) === context && !terminations.has(hostRunId),
    liveToolAuthority: () => context.isActive && services.get(hostRunId)?.isReady() === true,
  }) // resolves 'hydrated' | 'superseded'; throws after 3 conflicts or a fetch failure
    .catch((cause) => console.warn(`[agentRunCollaboration] Could not load '${agentRunId}' of '${hostRunId}'.`, cause))
    .finally(() => loads.delete(agentRunId))
  loads.set(agentRunId, load)
}
// publish(hostRunId, context) ends with: ensureChildHydrated(hostRunId, selection[hostRunId] ?? null)
```

Republication during a load (review MP-001): click → load L1 for (C1, X) → `select-run` → `syncHost` → inspection → `publish(C2)` (adoption hands X's `AgentContext` to C2) → `ensureChildHydrated` finds no entry for (C2, X) → load L2 for (C2, X). L1's next `isPublished()` check is false → `superseded`, nothing written. L2 commits → X is hydrated in C2.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep eager staging behind a flag for small hubs | "Safety" | Rejected | Lazy for all hubs |
| Optional `hostRunId` argument on `getRunFileChanges` | Smaller API delta | Rejected (ambiguous selector) | Dedicated compound-identity query |
| Default `fetchFileChanges` in `fetchMemberRunState` | Fewer caller edits | Rejected (hidden default) | Explicit per caller |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server: extract `getLocatedCollaborationMemberProjection`; add `getFileChanges` and the GraphQL query; server tests.
2. Web: add the query and codegen; make `fetchMemberRunState` explicit and update the team and org callers.
3. Web: add `agentRunCollaborationChildHydration.ts`; change the context (hydrated set, adoption carry-over).
4. Web: replace staging with `buildAgentRunCollaborationContext`; update the store (publish, inspect, selectChild, ensureChildHydrated) and the streaming service; remove dead parameters.
5. Update the affected specs and probes; add new tests; update docs.
6. Validation timings on the synthesized large hub (see Guidance). The investigation probe (`probes/open-cost-probe.test.ts`) can be pointed at that test-owned data root for server-side numbers. The `/tmp` copy of the user's data used for the baseline was deleted after the measurement.

## Key Tradeoffs

- On-demand loading means a brief empty or old view of a copy (≈100 ms on the server) when it is first opened, instead of minutes before any copy is visible. Accepted, as for team members today.
- Previously opened, unselected copies refetch after a republication. One request each when opened again, which keeps correctness after missed events.
- The Agent-root hydration duplicates the team precedent's policy in a smaller file instead of extracting a shared core now (FU-1).

## Risks

- R-001: a live event, local submission or republication during a child's fetch. Mitigated by the D-2 supersession rule, the presentation/activity revision check with retry within one context, and the D-5 dedupe key. Covered by unit tests (AC-004, AC-006, AC-007).
- R-004 (accepted, review R-C): one extra projection and artifact request when a copy is clicked under a hub that is not the selected run (D-4).
- R-002: the message payload (FU-2) could dominate QR-001 if the hub log grows a lot. Validation measures it.
- R-003: other consumers expecting hydrated unopened children. Investigation found none (rows, token meter, settings editor and termination use status/config only). Implementation re-checks with a search for `getAgentContext(` / `listAgentContextEntries()` on the Agent-root context.

## Guidance For Implementation

- Tests to update: `agentRunCollaborationHydration.spec.ts`, `agentRunCollaborationStore.spec.ts`, `agentRunCollaborationStoreClosure.spec.ts`, `agentRunCollaborationDisclosure.spec.ts`, `agentRootCompactionIntegration.spec.ts`, `agentRunCollaborationStreamingService.spec.ts`, `AgentRunTaskRowsDisclosure.spec.ts`, `useTaskRootNavigationDisclosure.spec.ts`, the fixtures, and probes `tests/e2e/delegated-team-default-collapse-probe.mjs` and `cross-scope-agent-mentions-live-probe.mjs` (fixture GraphQL answers for the new query).
- New tests:
  - **(a) Request counts (AC-001, AC-002, AC-007).** Drawing rows for views with 5 and 50 task teams issues one view request and zero member requests. A `checkpoint_required` with one opened child issues exactly one member projection request and one member file-change request.
  - **(b) Child hydration.** Selection hydrates once. Reselection does not refetch. Failure leaves the child not hydrated and the next selection retries. A presentation event during the fetch causes a retry. A local message shown during the fetch is not overwritten (via the presentation revision). Live tool reconciliation applies (AC-004, AC-006). **Republication during a load (AR-001):**
    - select a child, then republish (inspection and stream snapshot variants) while its load is in flight;
    - the first load ends `superseded` and writes nothing;
    - the child ends hydrated in the new context;
    - the extra member requests are exactly one projection and one file-change;
    - a second `ensureChildHydrated` for the same (context, child) while a load is in flight starts no request.
  - **(c) Server, `agentRunCollaborationMemberFileChanges`.** It returns the stored and the active member's entries. It rejects a child that is not in the hub. It does not read unrelated families: with many stored team runs present, the team/org location services are not called (AC-009).
- Regression check with a realistic large run (REQ-008, AC-008): API/E2E builds a test-owned large hub per TESTING.md. Either use the scripted AGY CLI for real delegations, or have a generator write a fresh data root with the server's current writers. Shape: ≥50 task agent teams × 5–6 members, a few hundred KB of raw traces per member, a few-MB hub log, plus ≥300 unrelated stored team runs. Time hub-row → copy rows, hub click → conversation, and copy click → conversation on an isolated instance of the worktree build, for the base build and the fix. Record the request counts. Never run the app on the user's data or a copy of it.
- Do not touch `StandaloneRootPackageStore`, message-log files or the collaboration stream contracts (autobyteus-114 coordination).
