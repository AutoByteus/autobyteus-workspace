# Investigation Notes — Delegated Copies Slow To Show And Open

## Investigation Meta

- Package identifier: `delegated-copies-slow-open`
- Request / ticket: Project Task e6985045 "Bug (long-standing): opening a run with many delegated team copies (e.g. the Project Task Manager) is very slow after app start"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open`, branch `codex/delegated-copies-slow-open`
- Resolved base remote / branch / revision: `origin` / `personal` / `5ceb43039a` (v1.5.6-beta.4 bump, fetched 2026-10-18)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree and branch created from freshly fetched `origin/personal`; `pnpm install` and server `prebuild` done.
- Bootstrap blocker: none
- Current solution revision ID: `SR-003`
- Authorities read: requirements reading gate `references/requirements-engineering.md` (2026-10-18); `TESTING.md`, `RELEASE.md` (2026-10-18); architecture gate `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (2026-10-18, see design spec)
- Investigation status: complete for requirements and architecture

## Initial Request And Clarifications

- Original request: after app start, the Project Task Manager (PM) run shows its own rows at once, but the delegated team copies under it appear only after a long time; opening the run is slow too. The more copies, the slower. Long-standing (seen on v1.5.5-beta.1 and after the memory-structure refactor, Task 8641c0ac, which shrank the PM run folder from ~265 MB to ~37 MB).
- Clarifications received (in the Task text): own Task, do not mix with the memory refactor (user 2026-10-15); re-measure first after the refactor (2026-10-18); fix within the current storage structure; if the cause is the memory layout, say so and leave it to a memory follow-up; coordinate with autobyteus-114 (append-only message logs) on shared files.
- User-supplied facts: screenshots 46/47/53 (PM run with 2 own rows, copies missing at first, later ~15 copy rows; "Software Engineering Team (46)" team runs listed separately).
- Initial ambiguity: whether the time goes to server reads, API fan-out or rendering — resolved below by measurement.

## Product And Domain Understanding

- Product area: Workspaces sidebar (run history tree) and the standalone-run view (center conversation, Team tab, delegated copies) in `autobyteus-web`; the standalone collaboration root ("Agent root") and run-file-change services in `autobyteus-server-ts`.
- Terms: **hub** = a standalone agent run that delegated work (the PM run); **delegated copy / task agent / task agent team** = a run created by `delegate_task`; **member** = an agent of a task agent team; **child agent** = any agent under the hub (task agent or member).

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | User | Task screenshots 46, 47, 53 | Symptom | PM row with 2 own runs, copies absent at first; later many copy rows | — |
| 2026-10-18 | Doc | `tickets/done/delegated-copy-own-run-memory/memory-layout-contract.md` H2, V-17 | Refactor's known cost | The refactor states that composing the hub views reads one small file per task agent and that "reading task agents only when the user expands them needs a change in the app (a follow-up … possibly together with the slow-opening Task e6985045)" | This Task is that app change |
| 2026-10-18 | Data (read-only) | `probes/shape.py` and an inline count over `~/.autobyteus/server-data/memory` | Real volume | PM run `…7c8dce0c…`: 56 task executions (50 task agent teams, 6 task agents) = **286 child agents**; their raw traces 388 MB; hub tree 15 KB (links); hub message log 4.3 MB / 1,325 messages composed. PM `…a5f6d9d3…`: 13 task executions, 59 child agents. Memory holds 680 team folders, 734 agent folders, 26 org runs, 6 hubs with packages | — |
| 2026-10-18 | Code | `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue` `loadStored` | Who loads the copy rows | Every run row with `hasCollaboration` calls `collaboration.inspect(runId)` on mount, so at app start every hub in an expanded workspace inspects at once | — |
| 2026-10-18 | Code | `autobyteus-web/stores/agentRunCollaborationStore.ts` `inspect` → `services/agentCollaboration/agentRunCollaborationHydration.ts` `stageAgentRunCollaborationContext` | What blocks the rows | Rows come from the published context; publication waits for `Promise.all` over **every** child agent in the index (open and closed Tasks alike), each doing `fetchMemberRunState` = member projection query + `getRunFileChanges` query. One failure fails the whole tree | Root cause 1 |
| 2026-10-18 | Code | `agentRunCollaborationStreamingService.ts` `ROOT_EXECUTION_VIEW_SNAPSHOT`, `ROOT_EXECUTION_EVENT` | Live hub | The live snapshot is staged the same way; `task_execution_started` and `delegated_launch_selections_changed` return `checkpoint_required`, which reconnects and re-stages **every** child again (each new delegation while the PM is open) | Root cause 1 (recurring) |
| 2026-10-18 | Code | `agentRunCollaborationContext.ts` `listTaskRows` | What rows need | Rows need only the tree (index) and each agent's `currentStatus`; closed Tasks' subtrees are hidden. Conversation, activities and artifacts are not used by the rows | Lazy load is possible |
| 2026-10-18 | Code | `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` `readProjectionContext` | Cost of `getRunFileChanges(memberRunId)` | A member has no standalone metadata, so it falls to `CollaborationExecutionLocationService.findAgent({ agentRunId })` without a root: scans **all** team trees, all org trees and all hubs (each composing its task agents' trees) in parallel, per request | Root cause 2 |
| 2026-10-18 | Code | `standalone-root-member-view-projection-service.ts` `getProjection` → `StandaloneRootLocationService.findAgent({rootRunId})` | Cost of member projection | Hub-scoped: re-reads and composes the hub tree (56 team trees) per request (~26 ms), then builds the projection from that member's raw traces | Contributes |
| 2026-10-18 | Code | `StandaloneAgentRunRootManager.getInspection` + `agent-collaboration-view-projector.ts` | Hub view | Stored view = composed tree + composed message log (all messages) + closed task executions; one request | Acceptable now; see R-002 |
| 2026-10-18 | Code | `stores/taskWorkerTaskStore.ts` | Task summaries | Batched: one `GetTaskWorkerTasks` query per microtask for all listed rows | Not a fan-out |
| 2026-10-18 | Code | `services/runHydration/teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts`, `services/agentOrgExecution/agentOrgContextHydration.ts` | Precedent / adjacent | Team and org roots also stage every member eagerly (team: best effort except the focused one; a member with a null projection is hydrated on selection by `teamMemberProjectionHydrationService`). User volumes there are small (largest org tree 34 agents) | Follow-up FU-1 |
| 2026-10-18 | Command | `probes/open-cost-probe.test.ts` (vitest, in-process, read-only) against `/tmp/dcso-data/memory` | Timings | See Runtime findings | — |
| 2026-10-18 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs` design spec Change Scope | Coordination with autobyteus-114 | It changes message-log stores, readiness and migrations; leaves wire DTOs, views, tree files alone. FU-1 there: startup readiness reads every team/org run's whole message history at each start | No file overlap expected (see design) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path / Lifecycle | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | App start with a workspace expanded that holds a hub | Sidebar lists runs → each hub row mounts its copy tree → inspection: view request, then 2 requests per child agent, all must finish → rows | Hub row at once; copy rows after minutes (286 children → ~572 requests, ~10 min server CPU in the probe) | Code + probe | High |
| BEH-002 | User | Click the hub run | Host conversation loads (13 ms on the server); collaboration sync inspects (stopped hub) or attaches the stream (running hub) and stages every child | The hub's own data is cheap, but the server is saturated by the copy fan-out, and the Team tab / copy selection wait for the full staging | Code + probe | High (contention inferred from CPU-bound probe) |
| BEH-003 | User | Click a copy row (task agent or task team → its coordinator) | Uses the already staged child context | Instant once staging finished; unavailable before | Code | High |
| BEH-004 | System | New delegation / Save of copy settings while the hub is open and running | `checkpoint_required` → reconnect → snapshot → re-stage every child | Every new copy re-pays the full cost | Code | High |
| BEH-005 | User | Copy row status, team aggregate status color, Task summary line, closed-Task hiding | Status from staged contexts (live statuses from the stream; stored → Offline); Task summaries batched | Correct once shown | Code | High |

## Relevant Codebase And Technical Facts

| Path / Component | Responsibility | Requirement Implication | Design Question |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts` | Builds the Agent-root client context; eagerly fetches every child | Rows must not wait on per-child data | Split structure publication from per-child hydration |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` | Index, child contexts, rows, events, messages views | Child contexts must exist (status) without a conversation | Context holds "not yet hydrated" children |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | inspect / attach / select / submit / childTargetFor | Selecting a child must load its stored state on demand | Where the on-demand load is triggered and owned |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` | Live stream; re-stages on new child | A new child must not re-load every other child | Keep hydrated children on republish |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | `getRunFileChanges(runId)` | A copy member's artifacts must load in time independent of other stored runs | Hub-scoped artifact read for copy members |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.ts` | Member projection (hub-scoped) | Natural owner for a hub-scoped member read | Return artifacts with the projection? |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files read: hub `collaboration/collaboration_tree.json` (links), each task agent team's `team_run_execution_tree.json` and `team_communication_messages.json`, each task agent's `run_metadata.json`/message log; each member's `raw_traces_*.jsonl` and `file_changes.json`.
- Readers: `StandaloneRootPackageStore`, `StandaloneRootLocationService`, `AgentRunViewProjectionService`, `RunFileChangeProjectionStore`.
- Evidence: probe output `probes/probe-run1.txt`.

### Structural Surfaces

- GraphQL: `agentRunCollaboration`, `agentRunCollaborationMemberProjection`, `getRunFileChanges`; WebSocket collaboration stream snapshot/events.
- Frontend: collaboration store, hydration service, streaming service, context, `AgentRunTaskRows.vue`.

### Potential Structural Impacts To Investigate

- API change: possibly an additive GraphQL field/argument for hub-scoped member artifacts. Present (additive).
- Persistence schema: none (Task forbids memory restructuring). Absent.
- Security/privacy: none. Absent.
- Concurrency/lifecycle: on-demand child hydration races with live events and republish. Present.
- Migration: none. Absent.

## Runtime, Probe, Or Reproduction Findings

Probe: `probes/open-cost-probe.test.ts`, run in the task worktree with `TEST_DCSO_MEMORY_DIR=/tmp/dcso-data/memory TEST_DCSO_HOST=project_task_manager_7c8dce0c4a8b44f88e776a83809dee03 pnpm -C autobyteus-server-ts exec vitest run tests/scratch-dcso/open-cost-probe.test.ts`. The data root is a test-owned copy in `/tmp` of every `*.json` under the user's `memory/` plus the full folders of this hub and its 56 copies (783 MB); the user's data was only read (rsync). No app startup, migration or write ran on it. Output: `probes/probe-run1.txt`. Machine: the user's Mac, warm file cache. Copy commands: `rsync -a --include='*/' --include='*.json' --exclude='*' ~/.autobyteus/server-data/memory/ /tmp/dcso-data/memory/`, then `rsync -a -r --files-from=<hub and its 56 copy folders>` for the full folders. The probe file was copied into `probes/`, and the scratch test and the `/tmp` copy were deleted after the measurement (2026-10-18).

| Measurement | Result | Meaning |
| --- | --- | --- |
| Hub stored view: composed tree / composed messages | 30 ms / 416 ms; tree+messages 5.0 MB JSON (1,325 messages) | The view itself is not the problem (≈0.5 s) |
| Child agents in the hub | 286 | 572 requests per inspection |
| Member projection, hub-scoped location only | 26 ms per member | hub tree re-composed per request |
| Member projection, all 286 sequential | 15.4 s total (54 ms avg); **256.9 MB** payload | Browser must download, parse and build 286 conversations before any row shows |
| `getRunFileChanges` lookup for a member (unscoped) | **1.95–2.38 s per member** → **≈9–11 min** for 286 (server CPU-bound, sequential estimate) | Dominant cause |
| …split by family (one member) | teams 650 ms (not found), orgs 48 ms, hubs 79 ms (found) + metadata read | the scan of all 680 team trees dominates and grows with every stored run |
| Hub's own conversation projection | 13 ms, 0.3 MB | Opening the hub itself is cheap when the server is not saturated |

## Stakeholder And User Evidence

| Source | Need / Problem | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task text, 2026-10-14/17/18) | Copies appear late after app start; opening the run slow; scales with copies | Strong (repeated, screenshots) | Show rows independent of copies; lazy details | — |
| User (2026-10-15) | Do not mix with the memory refactor | Explicit | No storage restructuring | — |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Collaboration stream contracts (`@autobyteus/collaboration-stream-contracts`) | tracked `dist/` | View/snapshot DTO shapes shared with server; changing them needs a rebuild and `dist` commit | TESTING.md | Prefer no DTO change |
| Collaboration model CM-8 | `autobyteus-server-ts/docs/design/collaboration_model.md` | A run owns its content; the coordinator owns the relationship | memory contract | Hub-scoped member reads go through the hub's links |

## Persisted Data And State Facts

- Affected stored subject: none written. Reads only.
- Volume: see Source Log.
- Required semantics to preserve: complete child conversation history, activities and artifacts when a copy is opened; statuses; closed-Task hiding; message history.
- Acceptable loss: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/open-cost-probe.test.ts` | Solution Designer | Read-only server timing probe (copy of the server-side read paths) | investigation | QR-001, QR-002, AC-007 | Evidence; basis for the regression measurement | N/A (evidence) |
| `probes/shape.py` | Solution Designer | Read-only shape count of a hub | investigation | QR-001 | Evidence | N/A |
| `probes/probe-run1.txt` | Solution Designer | Probe output (baseline timings) | investigation | QR-001, QR-002 | Evidence | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact wall time in the app (browser concurrency of 6, server interleaving) | The probe gives server CPU, not perceived time | Baseline vs fixed measurement on an isolated instance/fixture by API/E2E | Open (validation) |
| R-001 | Risk | Lazy child hydration races with live events (presentation messages for a child not yet hydrated) | Correctness of a child's conversation | Design: buffering/authority rules as for team members | Design |
| R-002 | Risk | The hub message log (4.3 MB here) is sent with every view; it grows with hub activity, not with copies | Future slowness | Follow-up FU-2 (lazy messages) unless measured as material | Accepted for this Task |
| R-003 | Risk | Team and org roots stage every member eagerly too | Same pattern, small volumes today | Follow-up FU-1 | Accepted |

## Architecture Investigation Findings

- Spine today (stopped hub): `AgentRunTaskRows.vue#loadStored` → `agentRunCollaborationStore.inspect` → `readAgentRunCollaboration` (GraphQL `agentRunCollaboration` → `StandaloneAgentRunRootManager.getInspection`) → `stageAgentRunCollaborationContext` (per child: `GetAgentRunCollaborationMemberProjection` + `GetRunFileChanges`) → `publish` → `contexts[host]` → `taskRows`.
- Spine today (running hub): `useAgentRunCollaborationSync` → `syncHost` → `attach` → `AgentRunCollaborationStreamingService.connect` → snapshot → `stageAgentRunCollaborationContext` (same fan-out) → `publish`.
- Child view: `childTargetFor` exposes the staged `AgentContext` (conversation), `collaborationMessages`, `browse: standaloneMember` (event monitor pages via `agentRunCollaborationMemberEventMonitorActiveTracePage`).
- Activities and artifacts: `commitMemberRunStates` → `agentActivityStore.replaceProjectionActivitiesIfRevisions` (revision-guarded, all-or-nothing) + `mergeHydratedRunFileChanges`.
- Precedent for on-demand member state: `teamMemberProjectionHydrationService.ts` (`hydrateTeamMemberProjection`: one in-flight hydration per context, conflict retry up to 3, `authoritative` contexts not overwritten, live tool authority check).
- Context adoption: `AgentRunCollaborationContext.prepareLocalContextAdoption(previous)` already carries local state (drafts) from the previous context across republish.
- Live events for a child: `applyEvent('agent_presentation')` dispatches into the child's `AgentContext`, so a child context exists for every child even when not hydrated.
- Server member projection already locates the member hub-scoped (`StandaloneRootLocationService.findAgent({rootRunId, memberAddress, agentRunId})`), and the located record has `memoryDir` and `isActive`.
- `RunFileChangeService.getProjectionForCollaborationMember({agentRunId, memoryDir, workspaceRootPath})` exists for active members; `RunFileChangeProjectionStore.readProjection(memoryDir)` for stored ones.

## Requirement Implications

- The tree must be drawn from the hub view alone (one request), so its time is independent of the number of copies (REQ-001, REQ-002).
- A child's stored state is loaded only when needed (REQ-003), with a server path whose cost does not grow with unrelated stored runs (REQ-004).
- Status, Task summaries, hiding of closed Tasks and history stay correct (REQ-005, REQ-006).
- The cause is the app's eager load pattern and an unscoped server lookup, not the memory layout (REQ-008 report).

## Notes For Architecture Design

- Map SCN-001..SCN-005 onto the spines above.
- Constraints: no storage change; no change to collaboration stream DTOs if avoidable; the append-only message-log ticket owns message-log stores.
- Verify: which consumers need a hydrated child before selection (submit path, `childTargetFor`, settings editor, token meter); interaction with `prepareLocalContextAdoption`.
