# Code Review Report — task-run-resources-workspace-cleanup

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5, a targeted delta for IR-004 / SR-009).
  - Round 4 was a targeted delta for CR-002, plus a correction recheck against the project's `DESIGN.md`, `TESTING.md` and package `AGENTS.md`.
  - Round 3 was the API/E2E failure-origin review (CRR-003).
  - Rounds 1–2 were implementation reviews.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved SD-AP-001; SD-AP-002 moves REQ-010 out; SR-008)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AE-01–AE-15)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001–SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` @ `a38bd6e` (Motion, Accessibility, TR-001–TR-005); `solution-design-handoff.md`; `product-design-request.md`; `implementation-evidence/org-leave-motion/`
- Relevant Solution Revision IDs: SR-006, SR-007, SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (round 3, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003, IR-004
- Relevant Solution / Architecture Review Revision IDs added in round 5: SR-009, ARCH-REV-004
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: 5
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1):
  - `git diff af690af33..489268fc7` touches only `AgentRunTaskRows.vue` (+12/−4), which is the CR-001 file, and adds `__tests__/AgentRunTaskRowsLeave.spec.ts`.
  - No data-flow spine, shared interface, data shape, or other file changed.
  - Round-1 evidence for every other check carries forward.
- Trigger: `/implementation_engineer` Local Fix for CR-001 (IR-002), commit `489268fc7` on top of `af690af33`.
- Prior Review Round Reviewed: 1 (CRR-001, `Fail`, Local Fix)
- Latest Authoritative Round: 5
- Round 5 scope: `Targeted Delta Review`.
  - `3570b8c10..50b08001d` changes `task-agent-resource-service.ts` (+20/−6), its unit test, and four docs.
  - Shared interfaces and data shapes are unchanged: `closedAgentRunsIn` keeps its signature and contract.
- Round 5 trigger: `/implementation_engineer` IR-004 implementing SR-009, which the user approved and which passed ARCH-REV-004: the per-root closed index (AE-17) and the protocol and module doc sync (AE-16, R-5, R-6).
- Round 4 scope: `Targeted Delta Review`.
  - `489268fc7..3570b8c10` changes only `treeRowLeave.css` (the CR-002 file) and `useLeavingTreeRows.spec.ts`.
  - No spine, interface or data shape changed.
  - The `DESIGN.md` and `TESTING.md` recheck covers the whole change set; see the Project Design Guide Recheck section.
- Round 4 trigger: `/implementation_engineer` Local Fix for CR-002 (IR-003, commit `3570b8c10`).
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs: API-F-001 / BR-002. This covers AC-010 (REQ-002, REQ-005) under the Agent Team root, during the AC-009 journey.
- Exact Failing Commands / Execution Mode:
  - `node api-e2e-evidence/browser/stack.mjs start` starts the built backend with the scripted AGY CLI and Nuxt dev.
  - `node api-e2e-evidence/browser/journeys.mjs BR-002` drives headless Chrome.
  - Reproduced 4/4. The same journey passes for Agent (3/3) and Org (3/3).
- Failure Evidence Paths: `api-e2e-evidence/BR-002-failure-summary.json` (class history, frames, computed `transition-property`), `api-e2e-evidence/browser/journeys/evidence.json`, `team-live-before.png`, `team-live-after.png`, `api-e2e-evidence/browser/diag-move.mjs`, `diag-move-team.json`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (rounds 1–2); `API/E2E Failure-Origin Review` (round 3)
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Shared wire contracts change for all three root kinds, the neutral Task port gains a read, and server and web both change. This matches the implementation.

## Review Scope

- Round 2 (delta):
  - Reviewed: `AgentRunTaskRows.vue` (the `rendered` ref guard, the immediate watch, and `onRowLeaveSettled`) and the new `AgentRunTaskRowsLeave.spec.ts`.
  - Reviewer run of `AgentRunTaskRowsLeave`, `useLeavingTreeRows`, `WorkspaceAgentRunsTreePanel` and `WorkspaceHistoryWorkspaceSection`: 4 files, 83/83 pass.
- Round 1 (full): the full `5c74fed71..af690af33` diff, excluding tracked `dist`. That is 141 files: contracts (src and tests), server source and tests, and web source, tests and fixtures.
- Files / areas reviewed:
  - **Server:**
    - port and Task side: `task-agent-resource-port.ts`, `task-agent-resource-service.ts`, `project-task-service.ts`;
    - the shared `task-execution-closure.ts`;
    - `root-task-agent-resource-scope.ts`, the adapter interface and the three adapters;
    - the three roots (events and snapshots) and the three managers;
    - `general-process-run-supervisor.ts`;
    - `collaboration-root-history-service.ts`, `team-run-history-service.ts` and the GraphQL types;
    - the three projectors.
  - **Composition and lifecycle (read):**
    - `project-task-agent-resource-composition.ts`: the resource view is loaded before the port is returned;
    - `task-agent-resource-store.ts` and `project-store.ts deleteTask`: resource files survive Task delete;
    - `root-event-publisher.ts`: `publish` never throws.
  - **Contracts:** `agent-org-execution-dtos.ts`, `agent-run-collaboration-dtos.ts`, `root-execution-view-dtos.ts` (correlation), and the Team snapshot and message DTOs.
  - **Web:**
    - `utils/collaboration/taskExecutionClosure.ts`;
    - the Agent context, streaming service and store;
    - the Team view state and view models, hydration and `runHistoryTeamExecutionRows.ts`, read with the `TeamStreamingService` effect handling;
    - the Org context, `agentOrgHistoryRows.ts`, `runHistoryStoreSupport.ts` and types;
    - the GraphQL queries;
    - the three tree components, `useLeavingTreeRows.ts` and `treeRowLeave.css`;
    - the run-row markup in `WorkspaceHistoryWorkspaceSection.vue`, read for the focus targets.
- Reviewer runs:
  - 10 closure-related web spec files: 111/111 pass;
  - 5 new or changed server unit files: 48/48 pass;
  - one temporary probe spec (described in CR-001), deleted after the run, so the worktree is unchanged.
- Explicit exclusions:
  - the hand-edited `generated/graphql.ts` was compared only against the three server fields; codegen confirmation is left to API/E2E;
  - pre-existing failing suites listed in the handoff;
  - REQ-010 restyle (out of scope).

## Round 5 — SR-009 Per-Root Closed Index And Docs (IR-004)

**Upstream basis.**
- SR-009 changes no intended behavior.
- The user approved it ("okayy. approved"), and it passed ARCH-REV-004.
- It supersedes the round-4 work-count note ("no cache warranted"). The approved design now removes the O(N_org × E) history-list growth with a derived map, which `DESIGN.md` "Before accepting a design" asks to be justified. I accept that decision as proportionate:
  - the map belongs to the same owner, `TaskAgentResourceService`;
  - it has the same single update point and lifecycle as `owners` (only `swap()`);
  - there is no persistence, background work or extra invalidation.

**Implementation check.**

| Check | Result | Evidence |
| --- | --- | --- |
| The map is updated only in `swap()`, after commit, synchronously | Pass | `swap()` removes the swapped Task's previous closed entries (`forgetClosed`, which also drops empty root maps), then adds the new entries with `closedAt !== null`. No other writer exists. |
| `closedAgentRunsIn` contract unchanged (closed refs of the root; damaged Tasks contribute none; never throws) | Pass | It returns a fresh array from the root's map, or `[]`. Damaged files never reach `swap()`. Restart rebuilds the map through the same swaps in `load()`. |
| Repeated DONE, reopen and new link | Pass | A re-swap replaces the Task's contributions without duplicating them. An open run is not indexed. |
| R-5 naming | Pass | `closedRunsByHostRootKey` does not collide with the `closedByHostRoot(taskId)` method. |
| Ordering | Pass | A re-swapped Task's refs move to the end of the root list. No consumer depends on order: contract arrays and web merge-by-key. |
| Test | Pass | The new unit test compares the index with a scan of the committed file across link, DONE, reopen and new link, repeated DONE, a second Task, another root, and a restart with a damaged file. |
| DOC-001 (area contract) | **Resolved** | `agent_websocket_streaming_protocol.md` § Team Server Messages now lists `TASK_EXECUTIONS_CLOSED` and the snapshot fields, with a "Closed task executions" subsection covering: the unfiltered tree, sequencing, published before stop, idempotent, the Workspaces-only filter, and the resume-config field. |
| R-6 module docs | Pass | `agent_communication.md`, `standalone_agent_run_root.md` and `autobyteus-web/docs/agent_orgs.md` match the code. The Org selection handoff is described as "when that agent is still listed", which matches `leaveClosedSelection`. |
| Source size | Pass | `task-agent-resource-service.ts` stays well under 220 effective lines; the delta is +20/−6. |

**Candidates.**
- C-08, a cross-Task conflict where one agent run is in two Tasks and one swap forgets the other Task's closed entry: **Reject**. `link()` refuses `TASK_AGENT_RESOURCE_CONFLICT`, so this is a logged error state, not a supported scenario. The existing `owners` map has the same property.
- C-09, the order change: **Reject**. No consumer depends on order.

**Reviewer runs.**
- Server `tests/unit/projects` and `tests/unit/agent-collaboration/execution/task`: 7 files, 83/83 pass.
- Server `tsc --noEmit -p tsconfig.build.json`: clean.
- I did not run a docs link check (the docs change no links).

## Project Design Guide Recheck (round 4 correction)

Rounds 1–3 applied the code-reviewer skill's `design-principles.md`. They did not read the repository's own `DESIGN.md`, `TESTING.md` or the package `AGENTS.md` files that the root `AGENTS.md` requires. Round 4 reads them and rechecks the whole change set (`5c74fed71..3570b8c10`) against them.

| `DESIGN.md` rule / check | Result | Evidence |
| --- | --- | --- |
| 1. Start with supported behavior; no speculative guards | Pass | The normal DONE path comes first. No new guards except contract correlation, which protects the existing Team-tab message invariant (AE-01). |
| 2. Fresh UUID allocation | N/A | No identity allocation changed. |
| 3 / BP 2. Justify critical-path dependencies and global work (work count) | Pass. Round 5: superseded by SR-009's per-root index, so the lookup is O(closed refs in the root) and the history list is O(Σ closed refs per Org). | See the work-count list below this table. |
| 4 / BP 4. Payload and UI work match the change | Pass | The live event carries only the released ∩ closed ∩ in-tree refs. Agent, Org and Team apply it in place, with no checkpoint reload and no history refetch. The added history and snapshot fields are small reference lists. |
| 5 / BP 3, BP 6. Smallest coherent owner; no unnecessary layers or caches | Pass | Existing owners are extended. There is one shared closure function per side. No cache, index or new runtime owner is added. |
| 6. Prove the result honestly | Pass (implementation layers) | See the `TESTING.md` row. |
| Project-specific docs: persisted data / Data Migration Guideline | N/A | Stored data `Not Affected`. No persisted shape or file changed (verified: no server store, schema or record file in the diff). |
| Project-specific docs: area contract **Agent WebSocket Streaming Protocol** | **DOC-001: resolved in round 5 (IR-004)** | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` § "Team Server Messages" lists the Team-only events (`TASK_EXECUTION_STARTED`, …). It does not list the new `TASK_EXECUTIONS_CLOSED` message or the snapshot's `closed_task_executions`. `DESIGN.md` requires the doc to be updated in the same change. Owner: Delivery documentation sync, before finalization. This does not block implementation review. |

**Work count for rule 3 / BP 2.** `E` is the number of agent-run-resource entries across all Tasks, held in memory.
- `closedAgentRunsIn(hostRoot)` filters all `E` entries in memory, with no I/O.
- It runs once per live snapshot, once per stored inspection or resume config, and once per Org row in the history list. The history list therefore does N_org × E in-memory key comparisons.
- This is the required data for the result: closure is a Task-side fact keyed by host root. Under `DESIGN.md` rule 5 and BP 6, an index or cache needs a demonstrated problem, and none is evidenced (C-05 stays rejected).
- Residual: if the history list with many saved Orgs and many Task resources proves slow in real use, group closed refs by host root inside `TaskAgentResourceService`. Do this as Phase 2 refinement only.

| `TESTING.md` / package `AGENTS.md` check | Result | Evidence |
| --- | --- | --- |
| Smallest layer first, then close the gap ("Choosing the path") | Pass | Renderer and store changes have web unit and component tests. Client–server behavior has browser dev-path journeys (API-REV-001). |
| Project Task agent run resource regression set (§ "Project Task Agent Run Resources…") | Pass | The implementation ran the listed unit and integration suites. API/E2E added `tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` under the listed `tests/e2e/projects` path. |
| Rules: worktree build, never the user's app, stop what you started, assertions first | Pass (as reported) | API/E2E used its own built backend with a private data root and stopped its owned processes. The browser evidence uses assertions and DOM/class/frame data, with screenshots as support only. The full proof is owned by API/E2E. |
| Package `AGENTS.md` (server: `vitest run --no-watch`; web: colocated `__tests__`, `--run`) | Pass | New web tests are colocated in `__tests__`. Server tests sit under the existing `tests/` layout. |

Recheck result: no structural verdict or score from rounds 1–2 changes. DOC-001 is the one new obligation, and it belongs to Delivery.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-001–REQ-009 and AC-001–AC-010, with REQ-010/AC-011 moved out (SD-AP-002), plus the UI/UX spec Motion and Accessibility sections.
- Design-spec behavior map verified against the implementation: Yes. SP-1, SP-2, SP-3, EV-1 and LS-1 are traced in code.
- Design review report and round confirmed: round 3, Pass (ARCH-REV-003). R-1, R-2 and R-3 are applied in code:
  - R-1: the payload is released ∩ closed ∩ in-tree;
  - R-2: explicit `taskAgentResources` reaches the standalone and Org managers in the supervisor;
  - R-3: `orgRuns` Pick is widened and uses the same tree instance.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None. The Team REQ-009 scope is the accepted design residual.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 / REQ-006 | Confirmed | The start path is unchanged. Closure is per agent run, so new runs are open. Task-side test: reopen keeps old runs closed and new runs open. | — |
| BEH-002 / REQ-001–003, 005 (SP-1, EV-1) | Confirmed | `RootTaskAgentResourceScope.releaseTaskAgentResources` computes `closedInTree` and publishes synchronously before any registration, cancel or await. `publish` never throws, so stop isolation (REQ-003) is kept. Projectors map Agent/Org `task_executions_closed` and Team `TASK_EXECUTIONS_CLOSED`. Web contexts merge the refs: Agent through `shallowReactive` context assignment, Team through a `publication` shallowRef with the normal sequence gate, Org through a context assignment. | — |
| BEH-003/004 / REQ-004 (SP-2) | Confirmed | Live snapshots read `closedTaskExecutions()` inside the same snapshot thunk as `tree`. Stored reads go through the manager `closedTaskExecutionsFor` with a per-tree index. The port reads the in-memory view, which `composeProjectTaskAgentResources` loads before returning the port. Resource files survive Task delete (`TaskAgentResourceStore.list` does not depend on Task metadata). | — |
| BEH-003 / SP-3 (AR-001) | Confirmed | `projectAgentOrg` uses one `tree` (active snapshot, else stored) for both `org` and `closed_task_executions`. The web `projectAgentOrgHistoryRows` uses the context's closed set, else the item's. | — |
| BEH-006 / REQ-007, 008 | Confirmed | The tree DTO is never filtered. Contract correlation accepts only task-execution refs. Contexts and participant indexes are unchanged; only the listings filter. | — |
| REQ-009 | Confirmed (live selection paths) | Agent: `returnToHostWhenUnlisted` runs on publish and on `onTaskExecutionsClosed`; `selectChild` requires `isListed`. Team: `leaveClosedFocus` runs on the snapshot and on the message, and emits `reconcile_focused_team_member_projection`, which `TeamStreamingService:386` handles. Org: `leaveClosedSelection` runs on the event and in `select`. The focus move to the run row is in `useLeavingTreeRows`, but see CR-001 for the Agent last-row case. | — |
| REQ-002 / AC-010 (LS-1 motion) | Confirmed (CR-001 resolved in round 2) | `TransitionGroup name="tree-row"` in the three trees, with `treeRowLeave.css`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS-01 | SCN-001, REQ-001/002/009, AC-001, AC-009, AC-010 | User/System | User watching the tree; Project Task Manager as a standalone Agent root | Keep the tree to live work; the Manager marks a Task DONE | Manager `update_project_task` DONE while the root is open | Normal | DONE → release → scope publishes closed → Agent context merges → `taskRows` recompute → `AgentRunTaskRows` leave transition, with focus moved to the run row | Rows fade in 200 ms; a focused leaving row moves focus to the run row; the empty list is not rendered afterwards | Requirements SCN-001, UI spec TR-001, Accessibility, UXJ-001 | Supported Normal Scenario | Use |
| CS-02 | CS-01 subcase | User/System | Same | The Manager has one Task with runs (or the last open one) and marks it DONE, so every task row under the run leaves | Same | Normal (the first or final Task of any Manager session) | Same path; `rows` becomes `[]` in a single render | Same as CS-01 | Same; also the UI spec component states "a row leaving (200 ms)" and "empty (the list is not rendered)" | Supported Normal Scenario | Use |
| CS-03 | SCN-002/003, REQ-004 | User | User | Reload, restart, or open a stopped root | App load / stored reads | Normal | Snapshot or stored read → closed set → first render | Closed rows absent | Requirements AC-004 | Supported Normal Scenario | Use |
| CS-04 | SCN-001, REQ-005 | User/System | User + Manager in a Team or Org root | Same as CS-01 | Same | Normal | Team view state / Org context | Same | AC-005 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `AgentRunTaskRows.vue` renders `<TransitionGroup v-if="rows.length \|\| leaving">`. When the last rows leave, `rows.length` becomes 0 in the same render, before any `before-leave` hook has incremented `leaving`. The `v-if` therefore unmounts the whole `TransitionGroup` and its `div`, and child leave hooks never run. | CS-02 | The Manager marks DONE the only (or last) Task with runs under a standalone Agent root | No 200 ms fade (REQ-002, AC-010). No `aria-hidden` or inert. If keyboard focus was on that row, it is lost to `body` instead of moving to the run row (REQ-009, UI spec Accessibility). The `leaving` counter never serves its stated purpose. | Reviewer probe with the real `useLeavingTreeRows`, the same `v-if` shape and an unstubbed `TransitionGroup`: removing one of two rows gives `before-leave` 1 call; removing the last row gives 0 calls and the tree is gone at once. The existing `useLeavingTreeRows.spec.ts` drives the hooks directly and never mounts a component, so it cannot catch this. The Org evidence covers a tree that keeps rows. | Promote → CR-001 (resolved in round 2) | Bounded local fix in one component plus a component test. Round 2: the guard is now `rendered`, which stays true until the last leave settles; verified by code and test. |
| C-02 | The Team live-message check accepts any tree node key (members, configured agents), while Agent/Org accept only task-execution nodes. | Contract (EV-1) | Server publishes released ∩ closed ∩ in-tree task refs only | No supported path sends a non-task ref. The handoff records the Team snapshot as uncorrelated by design. | Server scope code; `teamTreeRunKeys` | Reject | No supported consequence. Noted for consistency only. |
| C-03 | `leaveClosedFocus` falls back to `listed[0]` after the delegator and the coordinator. | REQ-009 | — | The root coordinator is always a listed configured agent in a Team root, so the extra fallback never acts. | `projectNavigationRows`; root tree shape | Reject | Not material. |
| C-04 | Org `select()` redirects a closed selection to the delegator instead of rejecting it. | REQ-009 | No supported surface offers a closed Org row for selection; the Org tree lists only open rows. | Unreachable via the product UI | `agentOrgHistoryRows.ts`, `WorkspaceAgentOrgHistoryCollection.vue` | Reject | Technically possible but not reachable. |
| C-05 | `closedAgentRunsIn` scans every Task's in-memory resources per snapshot or history row. | Engineering contract (proportionate performance) | History list or snapshot | O(Tasks × entries) in memory, no I/O | No evidence of a material size or latency issue | Reject | No evidenced consequence. |
| C-06 | Team hydration does not run `leaveClosedFocus` at creation. | REQ-009 | Initial focus comes from a tree row click (`input.agentRunId`), and the tree offers only listed rows; live snapshots run the fallback. | Not reachable through a supported surface | `teamRunContextHydrationService.ts:249`, `selectInitialAgentRunId` | Reject | Not reachable. |
| C-07 | `generated/graphql.ts` was hand-edited. | Contract | Codegen | Risk of drift from the real schema | Three added fields match the server types | Hold for Evidence (API/E2E) | No defect found. API/E2E should confirm with codegen against a running server. Not scored. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Closure goes only through `listClosedTaskExecutions` (scope and three managers) on the server and `collectClosedSubtrees` on the web. Ownership is unmoved. | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | The UI spec Motion and Accessibility rules are met. The Agent last-row case was fixed in round 2 (CR-001). | — |
| Data-flow spine inventory clarity and preservation | Pass | SP-1, SP-2, SP-3, EV-1 and LS-1 each map one-to-one to code paths. | — |
| Ownership boundary preservation and clarity | Pass | The Task side stays behind the port. Managers own stored closure reads, and `run-history` calls managers, never the port. Roots do not import `projects/*`. | — |
| Off-spine concern clarity | Pass | Key and walk helpers serve the contexts. `useLeavingTreeRows` serves the tree components. | — |
| Existing capability/subsystem reuse check | Pass | Reuses the port, the shared release scope, the sequenced publishers, the existing selection fallbacks and the Team effect `reconcile_focused_team_member_projection`. | — |
| Reusable owned structures check | Pass | One server closure function, one web closure util, one leave composable and one CSS file shared by the three trees. | — |
| Shared-structure/data-model tightness check | Pass | One reference DTO per contract family. No `closed` flag on tree nodes. | — |
| Repeated coordination ownership check | Pass | The closed-subtree rule exists once; each root only supplies its tree walk. | — |
| Empty indirection check | Pass | `TeamTaskExecutionService.closedTaskExecutions` and `RootTaskExecutionLifecycle.closedTaskExecutions` follow the existing forwarding pattern of their peers (`releaseTaskAgentResources`). | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Changes land in their owners. | — |
| Ownership-driven dependency check | Pass | Web components → stores → contexts. Server roots and managers → port. | — |
| Authoritative Boundary Rule check | Pass | No caller uses both a manager and the port. `CollaborationRootHistoryService` reaches closure only through `orgRuns`. | — |
| File placement check | Pass | `agent-collaboration/execution/task/task-execution-closure.ts`, `utils/collaboration/taskExecutionClosure.ts`, `components/workspace/history/useLeavingTreeRows.ts`. | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `closedAgentRunsIn(hostRoot)`, `closedTaskExecutionsFor(rootRunId, tree)` per root kind, `isTaskExecutionRowListed(row)`, and `isListed(agentRunId)`. | — |
| Naming quality and naming-to-responsibility alignment | Pass | The names use the domain terms "task execution" and "agent run". | — |
| No unjustified duplication of code / repeated structures | Pass | The three adapters' `containsTaskExecution` and `publishTaskExecutionsClosed` are thin and per-root by design. | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead/obsolete code cleanup completeness | Pass | Round 2: the dormant `rows.length \|\| leaving` guard is replaced. `leaving` now gates `rendered` in `onRowLeaveSettled`. | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Round 2: `AgentRunTaskRowsLeave.spec.ts` mounts the real component with `TransitionGroup` unstubbed. Removing the only row keeps the tree mounted, the row gets `aria-hidden` and inert, focus moves to the run row, and the tree is gone after the leave settles. Re-appearance is also covered. The implementer reports this test fails against the old guard. | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `agentRootClosureFixture.ts`, Team/Org closure specs | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | Fixture updates only add the required field. | — |
| API/E2E readiness for the next workflow stage | Pass | CR-001 is resolved. Still to confirm downstream: browser renders of the Agent and Team trees, and codegen for `generated/graphql.ts` (C-07). | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | 476 | Pass | Pass (+74/−2) | Pass | Pass | Watch (close to 500) | None now. A further addition should extract the Team closure and focus helpers. |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | 466 | Pass | Pass (+10) | Pass | Pass | OK | — |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | 454 | Pass | Pass (+3) | Pass | Pass | OK | — |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | 453 | Pass | Pass (+2) | Pass | Pass | OK | — |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts` | 424 | Pass | Pass (+16/−1) | Pass | Pass | OK | — |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | 364 | Pass | Pass (+41) | Pass | Pass | OK | — |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` | 330 | Pass | Pass (+36/−3) | Pass | Pass | OK | — |
| All other changed source files | ≤ 398 | Pass | Pass (largest delta +74) | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The new fields are required and not defaulted. |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | The CR-001 guard was replaced in round 2. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; read-only. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `AgentRunTaskRows.vue` `leaving` term in `v-if="rows.length \|\| leaving"` | DormantPath | Probe in C-01 | It claimed to keep the tree mounted through the leave but could not. | **Resolved in round 2** (`489268fc7`): replaced by the `rendered` ref. |

## Docs-Impact Verdict

- Docs impact: `Yes` (delivery-owned).
- Why: a new contract field and event, a new Team server message and GraphQL fields, and the tree's leave behavior.
- Files or areas likely affected: collaboration and Team stream contract docs, plus Workspaces tree and Project Task docs.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 (Org rows render from the history item without a context) | Confirmed | Implemented through SP-3, with a server test using the same tree instance and a web test with no context. |
| MP-002 (filtering `projectNavigationRows` would change other surfaces) | Confirmed | `projectNavigationRows` is unchanged. Only `buildRunHistoryTeamExecutionRows` filters, and a test asserts that the navigation rows are identical. |

No new or reclassified premises. CS-02 is an ordinary SCN-001 path, not an additional premise.

## Review Scorecard (Mandatory)

- Overall score: 9.35/10, 93.5/100 (simple average; not the decision rule). Round 2 rescored only the rows affected by CR-001 (7, 8 and 10).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | SP-1, SP-2, SP-3 and EV-1 are traceable end to end. Publishing comes before stopping, and the snapshot read is atomic with the tree. | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 (round 5: the index stays inside the Task-side owner) | Closure stays on the Task side behind the port. The managers own stored reads, and R-2 and R-3 are applied. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | One subject per method; the contracts are strict and non-empty, with correlation. | The Team snapshot is uncorrelated, and the Team live check is looser than Agent/Org (C-02, rejected; consistency only). | Optional: align the Team live check to task-execution nodes. |
| 4 | Separation of Concerns and File Placement | 9.2 | Changes land in their owners; the new files are placed by concern. | `teamExecutionViewState.ts` is at 476 lines. | Extract the Team closure and focus logic on the next growth. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | One reference DTO per family, no node flag, and one closure util and walk interface. | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | The domain naming is consistent and the comments are clear. | Some long one-line expressions in the server managers. | — |
| 7 | API/E2E Readiness | 9.2 | All three root kinds are ready. CR-001 is fixed with a real-transition component test. Targeted tests pass in both rounds. | `generated/graphql.ts` still needs codegen confirmation (C-07). The Agent and Team trees have not been rendered in a browser. | API/E2E: codegen and a real Manager DONE journey. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 (round 4; was 8.5 in round 3) | Closure, live events, stored reads, selection fallback, a11y and focus are correct in real browsers on all three trees (BR-001, BR-003 to BR-007 pass). | CR-002 is resolved (the leave transition now wins over the move rule; checked by a cascade test). Reduced-motion removal takes about 2 frames (accepted). The BR-002 rerun is still pending. | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | The fields are required and there is no dual path. | — | — |
| 10 | Cleanup Completeness | 9.3 | No obsolete or dormant code is left; the round-2 guard replaced the dormant one. | — | — |

## Findings

No open findings. DOC-001 was resolved in round 5.

### CR-002 — A leaving row that still carries `tree-row-move` loses its fade and collapse (Medium) — **Resolved (round 4, IR-003, `3570b8c10`)**

- Resolution evidence:
  - `.tree-row-move` is now declared before `.tree-row-leave-active`, and the leave rule lists opacity, max-height, margin-top and transform, each at 200 ms ease-out. A leaving row with a lingering move class now fades and collapses and finishes its transform.
  - The reduced-motion block still comes last and sets `none` for both rules.
  - When transform is not actually animating, Vue's leave ends through its duration fallback at about 201 ms. This is acceptable.
  - The new cascade test injects the real stylesheet and checks the row with both classes plus a move-only row.
  - Reviewer run: `useLeavingTreeRows` and `AgentRunTaskRowsLeave`, 6/6 pass.
  - I swapped the old CSS back in temporarily; the CR-002 test failed with "expected 'transform 200ms ease-out' to contain 'opacity 200ms ease-out'". The file was then restored, and the worktree is unchanged.
  - Still to confirm: the real-browser proof of the Team-root trigger is the API/E2E rerun of BR-002.

Original finding (round 3):

- Scenario: the AC-009 / AC-010 journey (CS-01, CS-04; SCN-001; REQ-002, REQ-005). This is a Supported Normal Scenario.
  - The user selects a worker row of open Task A. This is the ordinary AC-009 precondition.
  - Its inspection or loading line grows the row from 28 to 50 px, and the `TransitionGroup` FLIP-moves the rows below. Those rows get `tree-row-move`.
  - The Manager then marks Task A DONE through the real `create_or_update_task` tool, a product action and not a test-only setup.
- Location: `autobyteus-web/components/workspace/history/treeRowLeave.css`.
  - Lines 3–6: `.tree-row-leave-active { transition: opacity …, max-height …, margin-top … }`.
  - Lines 17–19: `.tree-row-move { transition: transform 200ms ease-out }`.
  - Both are scoped selectors of equal specificity, so the later `transition` shorthand wins.
  - A row whose leave starts while it still has `tree-row-move` therefore computes `transition-property: transform`. Opacity and max-height jump to the `leave-to` values in one frame, and Vue removes the row about 190 ms later, when the fallback timeout fires.
- Evidence (BR-002, real Chrome):
  - The class history shows `tree-row-move tree-row-leave-from tree-row-leave-active`, then `tree-row-move tree-row-leave-active tree-row-leave-to`, on all three Task A rows.
  - Computed `transition-property` is `transform`.
  - There are 0 intermediate opacity frames and height goes 28 → 0 in one frame.
  - `aria-hidden`, inert, the focus move and the selection fallback all behaved correctly.
- Scope: `treeRowLeave.css` is shared by all three trees, so the Agent and Org trees have the same defect when a leave starts while the row carries the move class. BR-002 hits it on the Team tree because the row-selection move came before DONE.
  - Why the move class was still present 336–425 ms after the move began (no `transitionend`) is a runtime detail.
  - The fix below does not depend on it: a leave can also legitimately start inside a normal 200 ms move window.
- Required action (Local Fix, implementation-owned):
  - Make a leaving row's transition always include opacity, max-height and margin-top, whatever move class it carries. For example, declare `.tree-row-move` before the leave rules and give the leave rule precedence, or use one combined rule for `.tree-row-leave-active` (and `.tree-row-move.tree-row-leave-active`) that also lists `transform 200ms ease-out`.
  - Keep `transition: none` for both under `prefers-reduced-motion: reduce`.
  - Add a regression assertion that a row carrying both `tree-row-move` and `tree-row-leave-active` still transitions opacity and max-height. A CSS-order or component check is enough; BR-002 is the authoritative proof.
  - Then hand back for a targeted source review and an API/E2E rerun of BR-002, plus BR-001, BR-003, BR-004 and BR-006 for non-regression.
- Review gap: yes, a minor one in round 1. Two same-specificity rules set the `transition` shorthand on classes that `TransitionGroup` can apply to the same element. Round 1 checked the CSS values and the composable but did not check move/leave overlap. The stale move class itself was runtime-only and was not detectable from source.

### CR-001 — The Agent tree skips the leave motion and focus move when its last task rows leave (Medium) — **Resolved (round 2, IR-002, `489268fc7`)**

No change in round 3: BR-006 passes in a real browser.

- CR-001 resolution evidence:
  - The guard is now `v-if="rendered"`. An immediate watch turns `rendered` on when rows exist.
  - `onRowLeaveSettled` (bound to `after-leave` and `leave-cancelled`) turns it off only when `leaving === 0` and no rows remain.
  - So the group stays mounted through the last leave, and the empty list is not rendered afterwards.
  - `AgentRunTaskRowsLeave.spec.ts` covers the only-row case and the re-appearance case. Reviewer run: 83/83 pass.

Original finding (round 1):


- Candidate: C-01. Scenario: CS-02 (SCN-001, Supported Normal Scenario).
- Requirements: REQ-002, AC-010 (200 ms leave), and REQ-009 / AC-009 plus UI spec Accessibility ("If the focused row leaves, focus moves to the root run row"; "A leaving row is removed from the accessibility tree when it starts to leave").
- Location: `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue`, `<TransitionGroup v-if="rows.length || leaving" ...>`.
- Evidence:
  - When `taskRows(runId)` becomes `[]`, the render that removes the rows also evaluates `v-if` as false, because `leaving` is still 0. `leaving` only increments inside `before-leave`, which the unmount never reaches.
  - Vue unmounts the `TransitionGroup` component and its root `div`, so the children are removed without leave hooks.
  - A reviewer probe with the real composable, the same guard and an unstubbed `TransitionGroup` confirms it. Removing one of two rows fires `before-leave` once. Removing the last row fires it zero times, and the tree element disappears at once.
- Product consequence: a standalone Agent Project Task Manager is the primary host. When it marks DONE its only, or last remaining, Task with runs:
  - the rows vanish instantly instead of fading;
  - a keyboard-focused row's focus falls to `document.body` instead of the run row.

  The Team and Org trees are not affected: they always keep stable member rows.
- Required action (Local Fix, implementation-owned): keep the Agent tree's transition container mounted until its leaving rows have settled, then stop rendering the empty list (UI spec: "empty (the list is not rendered)"). Implementation chooses the mechanism. For example:
  - track a "rendered" flag that turns on when rows exist and turns off only on the last `after-leave` / `leave-cancelled`; or
  - keep the `TransitionGroup` mounted and drop the tree semantics and contents when there are no rows and nothing is leaving.

  Add a component test that mounts `AgentRunTaskRows` (or the same structure) with `TransitionGroup` not stubbed. Remove the only row and assert that:
  - `before-leave` runs (`aria-hidden`, inert);
  - focus on that row moves to the run row;
  - the empty tree is not rendered after the leave settles.

## Classification

Round 4: N/A. The review passes and CR-002 is resolved.

Round 3 history (failure origin, API-F-001): `Local Fix`, an implementation defect in `treeRowLeave.css` (CR-002).
- Not `Design Impact`: the design spec and UI spec define the leave (fade and collapse, 200 ms ease-out) and the move correctly. The defect is CSS precedence in one implementation file.
- Not a test or environment issue: the evidence is real Chrome against a real built backend, and the scenario is product-valid.
- Classification stays Large/High.

## Recommended Recipient

`/api_e2e_engineer` (primary). The rerun should cover CR-002 (BR-002, BR-001, BR-003, BR-004, BR-006) and the IR-004 server change: the closure reads behind `task-closure-root-visibility` and the Org history-list closure (BR-007). The proportional test-code review follows on its pass round. `/implementation_engineer` gets an informational notification.

## Residual Risks

- Reduced motion removes the row within about 2 frames, not synchronously, but with no visible motion. Accepted in the handoff.
- `TransitionGroup` also fades rows removed by collapsing a Team (accepted in the design).
- Team REQ-009 covers only the Workspaces tree and main view. Other Team surfaces still list closed members (accepted design residual; confirm with the user at delivery).
- `generated/graphql.ts` was edited by hand. API/E2E should confirm it with codegen against a running server (C-07).
- `teamExecutionViewState.ts` is at 476 effective lines, near the 500 limit.
- A damaged Task file keeps its runs listed (existing Q-3 surface).
- Not yet exercised: a real Manager DONE journey across all three root kinds and browser renders of the Agent and Team trees. These are downstream (API/E2E).

## Latest Authoritative Result

- Review Decision: `Pass` (round 5, CRR-005, targeted delta for IR-004 / SR-009). Round 4 (CRR-004, CR-002) also passed.
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`. CS-01 to CS-04 are supported. C-01 was promoted and is now resolved; C-02 to C-06 are rejected; C-07 is held for API/E2E evidence.
- Material-Premise Gate: `Pass`. MP-001 and MP-002 are confirmed, with no new premises.
- Score Summary: 9.4/10, with every category ≥ 9.0. Round 5 raises Data-Flow and Cleanup slightly: the stated scaling replaces the per-call full scan, and the area-contract docs are synced.
- Failure Origin: N/A this round. Round 3 found an implementation defect (CR-002), now resolved.
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - Round 2 resolved CR-001 with a bounded change.
  - The implementation follows the reviewed design, including R-1 to R-3.
  - For API/E2E:
    - run codegen to confirm `generated/graphql.ts`;
    - run a real Manager DONE journey under the Agent, Team and Org roots (AC-001–AC-010);
    - render the Agent and Team trees in a browser, including the case where the last row leaves.
