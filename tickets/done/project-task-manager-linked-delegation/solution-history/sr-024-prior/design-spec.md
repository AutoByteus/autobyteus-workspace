# Design — Project Task Manager And Task-Linked Runs (SR-023)

## Solution And Approval Basis
- **Package:** `project-task-manager-linked-delegation`. **Round:** SR-023, 2026-10-05, **revised after ARCH-REV-009** (Fail — bounded corrections). **Status:** Architecture Design Complete.
- **Revision summary (ARCH-REV-009):**
  - user decisions folded in: one file per Task (C-2 amended), the damaged-file policy (Q-3) and the own-Task-ID rule (N2);
  - AR9-F01: a damaged file gives a clear up-front rejection, and the list marks the Task unavailable instead of empty;
  - AR9-F02a: write preconditions are evaluated under the file lock, with the view swapped on commit;
  - AR9-F02b: release follows retained exact authority, not liveness;
  - AR9-F03: requirements and handoff corrected;
  - N1: write-time creator rule stated; N3: `ownershipChainFor` named.
- **Requirements:** **REQ-BL-009 (approved, SD-AP-003)** replaces REQ-BL-008 where they differ. The rest of REQ-BL-008 (SD-AP-001 + scoped SD-AP-002) carries forward. See requirements-doc.md.
- **Why this round exists:**
  - CRR-026 found that the Task file duplicated runtime facts, and the execution tree carried a Task concept.
  - The user then set the governing rule: **the execution tree never knows about Tasks; the Task side alone records which runs belong to a Task** (`task_runs/<taskId>.json`).
  - This design rebuilds the Task ↔ runtime boundary on that data model.
- **Archived predecessor:** the previous design (SR-014 … SR-022a, ARCH-REV-008 Pass) is at `solution-history/sr-023-prior/design-spec.sr-022a-final.md`. ARCH-REV-008 covered that basis, not this one.
- **Evidence:** investigation-notes.md E-001–E-093 (this round: E-084–E-093). Data model: `data-model-draft.md`, now authoritative as approved.
- **Workspace:**
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`.
  - HEAD `4b04d9097` (IR-012); base and finalization target origin/personal.
  - The API/E2E recheck of IR-012 is paused by user direction.

### Carried forward unchanged (authoritative text in the archived spec)
These decisions don't touch the Task ↔ runtime boundary, and this round keeps them exactly. Their archived sections stay authoritative:
- **Private activation and provider ownership (DI-001):** the opaque `AgentRunActivationOperation`, factory `beginPreparation` controls, retained partial receipts and success-only release memoization. Archived sections: "Exact private Agent activation and provider cleanup authority", "Partial Team / root preparation ownership".
- **Claude SDK opening / exact process owner (DI-002), including the SR-020 terminal-handoff clarification.** Archived section: "Concrete Claude SDK opening / exact local child authority".
- **Identity-only planning, registered preparation before resources, durable tree commit, and guarded deferred seed** ("Dispatch and durable cross-reference sequence"). Changed here only where the Task link is written (DS-A).
- **Public worker-tree projection and history (DS-008):** "SR-014 Business Role …" CRF-003 block and "SR-018 explicit public return inventory".
- **Business-only Manager prompt and the compact mutation acknowledgement (SR-014).** The Task read projection changes per Q-2 (§ Interfaces).
- **One composition binding; runtime never imports Projects (SR-021 F06).** It is kept and adapted here.
- **CRR-024 Local Fixes F01–F03** were implemented in IR-012 and stay. **SR-022a receiver recording** is now removed entirely (§ Removal).

## Current-State Read (IR-012)
Task ownership is a **lifetime** concept stored in two places:
- **`projects.json`** carries a non-Project `{taskLifetimes}` row. Each lifetime holds every owned run's link with `dispatch`, `cleanup` and a shared `error`.
- **Every owned tree node** carries a `taskLifetime` stamp.

The runtime then works off these:
- It reads ownership from the stamp through the root indexes (`taskLifetimeFor`, `listOwnedTaskExecutions`, `findLifetimeHelper`).
- A process `TaskLifetimeGate` latches closure, fed by a Task commit listener plus a durable read on every admission.
- Root release unions requested links, registered attempts and stamped nodes, then reports `{requested, unrequested}`. The Task service records cleanup back into `projects.json`.
- Message acceptance is recorded per receiver.

That machinery spans 39 server files (E-087). The web app and public API never see lifetimes.

## Task Size And Architectural Risk (Mandatory)
- **`task_size`: Large.** The SR-023 delta replaces the persisted ownership model and the Task ↔ runtime contract across Projects, the shared lifecycle/dispatch, three root adapters and indexes, the tree record schemas, recipient routing, composition and the root facades. Most of it is deletion, but it crosses many owners.
- **`architectural_risk`: High.** It changes the closed-forever fence, the "DONE never misses a startup" ordering, cross-file DONE ordering, and the persisted ownership authority, all on the concurrency-sensitive dispatch and release paths.
- **Route: Reviewed** (independent architecture review → implementation → code review → API/E2E).
- **Escalation:** return Design Impact if any of these turns out to be true:
  - a supported path needs Task ownership before the in-memory view is loaded;
  - a copy can be created by a Task-owned run without going through the link-before-register order;
  - the platform ever runs a second server process over the same app data. Today there is one (user-confirmed).

## Architecture Investigation Evidence
| Evidence | Observation → decision |
| --- | --- |
| E-084 | A Task's whole run forest lives in the assignment's host root → release is addressed per host root. |
| E-085 / E-091 | Durable link before resources is required. Linking **before registration** makes every registered Task attempt linked, so the root releases exactly the named runs. |
| E-086 / E-088 / E-089 | No migration: the tree reader tolerates unknown fields, the released `projects.json` reader skips the unshipped lifetime row, and `task_runs/<taskId>.json` is new. |
| E-090 | The containment chain (`taskExecutionChainFor`, including pre-commit registrations) is a pure runtime fact; Task ownership is looked up by run reference on the Task side. |
| E-092 | Synchronous ownership questions exist at fences, message scope and routing → an in-memory Task-side view loaded at composition. |
| E-093 | Existing `readJsonFile` / `updateJsonFile` lock + atomic replace serve the new file. |

## Intended Change
- **Two stores.** Released `projects.json` returns to holding only Projects and Tasks. A new `task_runs/<taskId>.json` records, for each Task, every run started for it: role, host root, run reference, start state and `closedAt`.
- **One authority over that file.** `TaskRunService` owns it, keeps an in-memory view, and answers runtime ownership questions through a neutral port implemented by the Task boundary.
- **Execution trees go back to pure execution facts.**
- **DONE:** closes the Task's open runs, then sets the status, then asks each host root to stop exactly those runs. The runtime is trusted for shutdown; nothing about shutdown is persisted.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | REQ / AC | Approved outcome | Target path |
| --- | --- | --- | --- |
| BEH-001/002 | REQ-001/002 | Shipped Manager; Project/Task tools | unchanged (DS-001 archived) |
| BEH-003/004 | REQ-003/004/010 | `task_id` alone or described work; saved packet | Lifecycle → `ProjectTaskService.resolveAssignment` → DS-A |
| BEH-005 | REQ-005 (Q-2), AC-002/006 | Run linked before resources; Manager sees current assignments | DS-A + DS-F |
| BEH-006/007 | REQ-006–009 (Q-1), B-3 | DONE closes runs forever and stops exactly them; retry by DONE again; failures logged | DS-C |
| BEH-008 | REQ-011, B-5 | Delete unchanged; run records kept | DS-001 unchanged; `task_runs/<taskId>.json` untouched |
| BEH-009 | REQ-007/012, B-1/B-2 | delegated/broughtIn linked to the creator's open Task; per-Task helper; no sharing | DS-B + DS-E |
| BEH-010 | REQ-013 | Business-only LLM contract | unchanged |
| C-1–C-3 | REQ-BL-009 | Tree Task-free; separate `task_runs/<taskId>.json`; released `projects.json` | § Data Model, § Removal |

## Relevant Supplemental Task Artifacts
- `data-model-draft.md`: the approved data model, authoritative.
- Archived design `solution-history/sr-023-prior/design-spec.sr-022a-final.md`: authoritative only for the carried-forward sections listed above.
- No Product/UI supplement.

## Task Design Health Assessment (Mandatory)
- **Posture:** Refactor of a feature under construction, user-directed.
- **Root cause:** a **Boundary Or Ownership Issue**. The previous design gave Task ownership two homes (tree stamp + Projects lifetime links) and copied runtime outcomes into the Task file. Reconciliation, listener and gate machinery existed only to keep those copies consistent. This was a designer error (SR-008 … SR-022 carried it).
- **Response:** one owner per fact.
  - Run existence and structure belong to the tree.
  - Run liveness and shutdown belong to runtime memory.
  - Task ↔ run links belong to `task_runs/<taskId>.json`, behind `TaskRunService`.
  - The runtime asks; it never stores Task facts.
- **Net effect:** large deletion. The added pieces are one store, one service and one port. The gate, listener, closure reads, reconciliation reports, cleanup recording, acceptance recording and per-root Task methods are removed.

## Terminology
- **Task run:** a run started for a Task. Its **role** is `assigned` (the Manager's `delegate_task(task_id)`), `delegated` (an open Task run's own `delegate_task` without task_id) or `broughtIn` (an open Task run's `send_message_to` that started a copy).
- **Host root:** the top-level run the user started (`agent` / `agent_team` / `agent_org`). Every run of an assignment shares it.
- **Open / closed:** a run's `closedAt`. DONE closes; closed is forever.
- **Containment chain:** the runtime's list of task copies containing an agent, innermost first: the agent's own copy, then any enclosing Team copy. A pure runtime fact.
- **Task copy:** the runtime's existing name for any `delegate_task` / bring-in copy, linked or not.
- "Collaborator" stays reserved for the user's @.

## Legacy Removal Policy (Mandatory)
No compatibility paths:
- no dual reading of stamps and the view;
- no lifetime-to-run conversion;
- no fallback that treats an unreadable `task_runs/<taskId>.json` as empty.

The unshipped lifetime format is removed outright. Dev/test data written by ticket builds is tolerated only by the released tolerant readers (E-088/E-089). It is not converted.

## Persisted Data / State Transition Decision (Mandatory)
| Subject | Decision |
| --- | --- |
| `<appData>/projects/projects.json` | **Directly usable — no migration.** Back to the released reader/writer. The unshipped `{taskLifetimes}` row in dev profiles is skipped by the released row filter and dropped on the next write. |
| Execution tree files (`team_run_execution_tree.json`, `agent_org_run_execution_tree.json`, `collaboration_tree.json`) | **Directly usable — no migration.** The `taskLifetime` field is removed from types and schemas. The tolerant reader ignores it in dev data, and the exact writer drops it. |
| `<appData>/projects/task_runs/<taskId>.json` (one file per Task; user decision C-2) | **New, never shipped.** A missing folder or file means no runs for that Task. Invalid content → that Task is in the view's damaged set (§ Failure policy). Never reset or converted. Kept on Task/Project Delete. |
| Context files | Not affected. |

Migration-guideline check: there is no representational change to shipped data, no startup conversion and no readiness gate (the view load is non-fatal), and no new journal.

## Data Model (approved REQ-BL-009 C-2; full text in `data-model-draft.md`)
```jsonc
// <appData>/projects/task_runs/project_task_efdc….json — one file per Task
{ "taskId": "project_task_efdc…",
  "runs": [
  { "role": "assigned", "assignedBy": "project_task_manager_882a…",
    "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
    "run": { "kind": "team", "teamRunId": "packet_team_e86b…", "coordinatorAgentRunId": "coordinator_2e35…" },
    "linkedAt": "…", "start": "starting|started|failed", "startError": { "code": "…", "message": "…" },
    "closedAt": null } ] }
```
**Invariants**, checked by the schema on read and write:
- the file's `taskId` matches its filename;
- each run reference appears at most once in the file. Cross-Task uniqueness holds because every linked run is a freshly planned copy, and the view asserts it on link;
- `assignedBy` exists if and only if the role is `assigned`;
- `startError` exists if and only if `start` is `failed`;
- `delegated` / `broughtIn` are only added while the creating run is open. This is a write-time rule; lineage is not stored (ARCH-REV-009 N1). It suffices because DONE closes all of a Task's open runs at once, so an open run never has a closed creator in the same Task.

**Never stored:** shutdown state, liveness, lineage, addresses, descriptions.

## Data-Flow Spine Inventory
| ID | Scope | Start → End | Governing owner |
| --- | --- | --- | --- |
| DS-A | Primary | Manager `delegate_task(task_id)` → linked, started worker + `target_agent_run_id` | RootTaskExecutionLifecycle; Task link via ProjectTaskService |
| DS-B | Primary | Owned run's `delegate_task` / bring-in → linked copy in the same Task | RootTaskExecutionLifecycle |
| DS-C | Primary | DONE (tool or UI) → runs closed forever + exact stop requested per host root | ProjectTaskService → TaskRunService → root boundary |
| DS-D | Bounded local | Input / wake / restore of an agent → allowed or `TASK_RUN_CLOSED` | RootTaskRunScope over the TaskRun view |
| DS-E | Bounded local | Owned sender `send_message_to(address)` → own Team / Task helper / unowned outside run / new helper | message-recipient-resolution |
| DS-F | Return | `list_project_tasks` → Tasks + current assignments | Tool manifest over ProjectTaskService |
| DS-G | Bounded local | Composition / any Task-run write → validated `task_runs/<taskId>.json` + in-memory view | TaskRunService + TaskRunStore |
| DS-007, DS-008 | Carried forward | Private activation/provider release; public tree projection | Archived spec |

## Primary Execution Spines
- **DS-A:**
  1. Lifecycle `delegate` → `port.resolveAssignment(taskId, sender)`, which returns saved work or rejects (unknown, DONE, or a sender owned by another Task).
  2. `adapter.planActivation` (identity only).
  3. `port.linkRun({role: assigned, taskId, assignedBy, hostRoot, run})`, written `starting` under the Task's serialization with a status re-check.
  4. At the queue head: `port.isOpen(run)` → `adapter.beginActivation` (register).
  5. `prepare` (resources) → `isOpen` → `commit` (tree, Task-free) → `isOpen` → `acceptSeed(isOpen)`.
  6. `port.markStarted(run)` → `target_agent_run_id`.
- **DS-B:** the same as DS-A, except steps 1 and 3:
  - **Owner check:** `owner = port.ownerOf(chain(sender))` must be open. `delegate_task` without task_id gets role `delegated`; a bring-in gets role `broughtIn` (no seed).
  - **Link:** `port.linkRun({role, creator: owner.run, hostRoot, run})` validates that the creator is open in the same Task.
  - **Start:** `markStarted` at commit for `broughtIn`, at seed acceptance for `delegated`.
- **DS-C:**
  1. `ProjectTaskService.updateTask(status DONE)` → `taskRuns.closeTask(taskId, writeMetadata)`, under the Task's serialization:
     - set `closedAt` on every open run and commit. The view updates at once, so synchronous fences now reject.
     - run `writeMetadata()`: the released `projects.json` update of status, description and context.
  2. Then `requestRelease(taskId)`: group **all** closed runs of the Task by host root → the injected request → `root.releaseTaskRuns(runs)` → per-run in-memory results → log the failures.
  3. Ordinary acknowledgement to the caller.
- **DS-D:**
  - **Synchronous:** `chain = adapter.ownershipChainFor(agent)`. If it's empty, the agent is unowned and nothing is asked. Otherwise `owner = port.ownerOf(chain)`; a closed owner rejects.
  - **Async wake/restore:** the same check before the queue and again at the queue head. No durable read is needed, because the view is the loaded authority.

## Spine Narratives (Mandatory)
| Spine | Narrative |
| --- | --- |
| DS-A | The Task boundary decides whether the Task can take work and records the run before anything is acquired. The root decides how the copy is built and never learns which Task it serves. Every await is followed by an `isOpen` check, so a DONE landing anywhere in the sequence stops further acquisition. The attempt then releases its own exact operation, as today. |
| DS-B | Ownership flows by creation: the runtime asks the Task side who owns the sender's chain, and the Task side links the new run to the same Task only while the creator is open. Unowned senders never touch the Task side. |
| DS-C | Closing is a Task fact, committed first; status follows. Stopping is a runtime act, requested afterwards and only logged. Repeating DONE re-requests the stop of every closed run, and roots skip runs that aren't live. |
| DS-D | Fences ask "is the run containing this agent closed?" from memory. Restart reloads the view from disk, so closed stays closed. |
| DS-E | Helper reuse and isolation come from the Task's own run list plus the root's address lookup. No Task data is placed in the tree. |
| DS-F | The Manager's read is a projection of the same `assigned` records; nothing extra is stored. |
| DS-G | One process writer: the service validates, writes atomically, then updates its view. A damaged file puts its Task in the damaged set (fail closed for that Task and for unknown copies), never treated as empty. |

## Spine Actors / Main-Line Nodes
Manager (business agent) → tool manifest → **ProjectTaskService** (Task boundary) ⇄ **TaskRunService** (task_runs authority) | **RootTaskExecutionLifecycle** + **RootTaskRunScope** (runtime) → subject adapters → provider owners (carried forward). The composition binds the two sides once.

## Ownership Map
| Owner | Owns |
| --- | --- |
| **ProjectTaskService** (`projects/services/project-task-service.ts`) | The Task subject boundary: released Task metadata in `projects.json` (create/update/delete/context), saved work for assignment, status rules. It orchestrates DONE (`closeTask` → metadata write → `requestRelease`) and assignment linking (status re-check inside `TaskRunService.serialize`). It **implements `TaskRunPort`** for the runtime, delegating run facts to TaskRunService. Task creation does not read `task_runs/<taskId>.json` (fresh UUIDs; DESIGN.md rule 2). |
| **TaskRunService** (`projects/services/task-run-service.ts`, new) | The sole authority over the per-Task files `task_runs/<taskId>.json` and the process in-memory **view**: run key → `{taskId, role, open}`, per-Task run lists, and the **damaged set**. `load()`, `link`, `markStarted`/`markFailed`, `closeTask`, `ownerOf`, `isOpen`, `openRuns(taskId, role)`, `closedRunsByHostRoot`, `currentAssignments`, and per-Task `serialize`. It knows nothing about `projects.json`; it receives prechecks and after-close callbacks. |
| **TaskRunStore + task-run-schema** (`projects/stores/`, new) | One file per Task under `task_runs/`: directory listing for load, per-file invariant validation, exact serialization, per-file lock + atomic replace via `readJsonFile`/`updateJsonFile` (with `onCommitted` for the synchronous view swap). |
| **task-runs domain** (`projects/domain/task-runs.ts`, new) | Pure types and reducers (link, start transitions, close, projections). |
| **Task run release** (`projects/runtime/task-run-release.ts`, replaces `project-task-runtime-release.ts`) | Groups closed runs by host root, calls the injected request (`null` = root not active → nothing live), and logs failures. No state, no coalescing (exact runtime receipts already coalesce). |
| **Composition** (`compositions/project-task-run-composition.ts`, replaces `project-task-lifetime-composition.ts`) | Creates the store/service, `await load()` (non-fatal), initializes the ProjectTaskService process instance with `{taskRuns, requestRelease}` (directory-based), and returns `TaskRunPort` to the supervisor. Released on host close/rollback. |
| **RootTaskExecutionLifecycle / `dispatchTaskCopy`** | Runtime sequence (DS-A/B) and fences via the scope; unchanged idle/queue behavior. |
| **RootTaskRunScope** (`agent-collaboration/execution/task/root-task-run-scope.ts`, replaces `root-task-lifetime-scope.ts`) | Stateless per-root policy: chain → `port.ownerOf`, input/message fences, and `releaseTaskRuns(runs)`. The latter verifies each run is closed, cancels the registration or the committed copy before any await, then performs exact stops and returns in-memory results. |
| **Root adapters / indexes / tree** | Execution facts only: plan/begin/commit, a **new `ownershipChainFor(agentRunId)`** (the index containment chain plus any pre-commit registration whose planned members include the agent; ARCH-REV-009 N3; the existing `taskExecutionChainFor` stays index-only for idle/restore), registration by run reference, the copy at an address among given references, exact cancel/stop. **No Task methods.** |
| **Root facades** (RootTeamRun, AgentOrgRun, StandaloneAgentRunRoot) + `ActiveCollaborationRootDirectory` boundary | `releaseTaskRuns(runs)` replaces `releaseTaskLifetime`; fences wired as today. |
| Carried forward | AgentRunManager / activation operation / factories / Claude opening & process owner / resource manager / public tree projection: unchanged (archived spec). |

## Thin Entry Facades / Public Wrappers
- The native and MCP tool manifests translate, validate and project only.
- The composition binding is wiring only.
- `ProjectTaskService` implementing `TaskRunPort` is a real boundary: it owns status rules and orchestration, not just forwarding.

## Removal / Decommission Plan (Mandatory)
| Remove | Replacement |
| --- | --- |
| `projects/stores/project-state-schema.ts`, `project-metadata-schema.ts`, logical-state `ProjectStore` (`readState`/`updateState`/observed commit) | Released `project-store.ts` (array rows) |
| `projects/domain/project-task-execution.ts`, `project-task-execution-state.ts`; `ProjectTaskView.executionLifetimes`; lifetime error codes | `projects/domain/task-runs.ts` |
| `projects/runtime/project-task-runtime-release.ts` (`recordCleanup`, coalescing, reports) | `projects/runtime/task-run-release.ts` (log-only) |
| `task-lifetime-gate.ts`, `TaskLifetimeClosureListener`, `TaskLifetimeAdmission`, `TaskLifetimeReleaseReport`, `TaskExecutionLifetimePort`, `TaskExecutionLifetimeStamp`, `parseTaskLifetimeStamp`, `TaskExecutionPurpose`, `TaskExecutionLinkIdentity.purpose` | `task-run-port.ts` (neutral port + result types) |
| `root-task-lifetime-scope.ts` | `root-task-run-scope.ts` |
| Adapter methods `registeredActivations(lifetimeId)`, `ownedExecutions`, `findLifetimeHelper`, `lifetimeForAgent`, `linkForExecution`; `TaskExecutionActivationWork.taskLifetime`; `RegisteredTaskActivation.plan.taskLifetime` | Task-free `registrationFor(ref)`, `taskExecutionAt(address, among)` |
| Index methods `taskLifetimeFor`, `listOwnedTaskExecutions`, `findLifetimeHelper` (Team, Org, standalone) | `taskExecutionAt(address, among)` lookup |
| `taskLifetime` in `run-execution-tree-shared-records.ts`, schemas, `task-execution-tree-projection.ts`, mutators | — (field gone) |
| `withLiveLease({recordAcceptance})`, `recordMessageAccepted`, `readExecutionDispatch` (SR-022a) | `broughtIn` started at commit; no per-message recording |
| `assertExecutionLinked` and the stamp/link cross-checks in dispatch/restore | — (one authority; nothing to reconcile) |
| `releaseTaskLifetime` on the directory boundary and the facades; the `taskLifetimes` supervisor/builder fields | `releaseTaskRuns`; `taskRuns: TaskRunPort` |

## Return Or Event Spine(s)
- **DS-F business read:** `list_project_tasks(project_id, status?)` → ProjectTaskService released listing + `TaskRunService.currentAssignments(taskIds)` → projection.
- **DS-C mutation acknowledgement:** unchanged compact `{projectId, taskId, status}`.
- **Stop results:** never returned to the Manager or user; logged only.

## Bounded Local / Internal Spines
- **Per-Task serialization:** `serialize(taskId, fn)` is an in-process promise chain, used only by assigned linking and DONE closure.
- **View update:** after every committed write, the view is replaced for that Task. Never before commit.
- **Helper dedupe:** in-flight attempts keyed by `(taskId, address)` in the lifecycle (as today, re-keyed).

## Off-Spine Concerns
| Concern | Owner | Note |
| --- | --- | --- |
| View load at startup | Composition → TaskRunService | Awaited once; reads every per-Task file; a damaged file is non-fatal and adds its Task to the damaged set |
| Per-Task serialization | TaskRunService | In-process promise chain per Task ID; covers assignment-link vs DONE |
| Failed-stop logging | task-run-release | One structured line per failed or unavailable root stop; no persistence (Q-1) |
| Tool projection | project-task-tool-manifest | Q-2 shape |

## Ownership Boundaries / Boundary Encapsulation
| Public boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| ProjectTaskService (+ `TaskRunPort`) | ProjectStore, context store, TaskRunService | Tools, GraphQL/REST, runtime via port | Anyone else reading/writing `task_runs/<taskId>.json` or calling TaskRunService |
| TaskRunService | TaskRunStore, view, serialization | ProjectTaskService, composition (load) | Direct file access |
| Root facade `releaseTaskRuns` / fences | Lifecycle, scope, adapters, registries | Composition-bound release request; delivery paths | Projects touching adapters/indexes |

## Dependency Rules
- **Tree side:** `run-history/**` and the tree mutators/projections import **no** Task-run type (C-1).
- **Runtime side:** runtime subsystems (`agent-collaboration`, `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`, `agent-execution`) import nothing from `projects/**`. They depend only on `agent-collaboration/execution/task/task-run-port.ts` and the existing reference/identity types.
- **Projects side:** `projects/**` imports only those neutral types. It must not import runtime implementations.
- **Composition:** only `src/compositions/project-task-run-composition.ts` (called by both host compositions) binds both sides.
- **Store access:** TaskRunService is the only code touching `task_runs/<taskId>.json`. ProjectTaskService is the only runtime-facing Task boundary. The tools and GraphQL call ProjectTaskService only.
- **Locks:** no file lock is held across the other file's write. Cross-file ordering comes from TaskRunService's per-Task serialization, not from nested locks.
- **Mechanical checks** (implementation self-check):
  - `rg -n "projects/" src/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,agent-execution,run-history}` → no matches;
  - `rg -n -i "lifetime" src/run-history` → no matches.

## Interface Boundary Mapping
```ts
// agent-collaboration/execution/task/task-run-port.ts — neutral; "Task" = business Task
export type TaskRunRole = 'assigned' | 'delegated' | 'broughtIn';
export type TaskRunOwner = Readonly<{ taskId: string; run: TaskExecutionReference; open: boolean }>; // taskId is opaque to runtime
export interface TaskRunPort {
  // async (writes)
  resolveAssignment(taskId: string, sender: Readonly<{ agentRunId: string; ownerTaskId?: string }>):
    Promise<Readonly<{ description: string; referenceFiles: string[] }>>;  // unknown / DONE / other-Task owner → reject
  linkRun(input: Readonly<{ hostRoot: RootExecutionIdentity; run: TaskExecutionReference; coordinatorAgentRunId?: string }
    & ({ role: 'assigned'; taskId: string; assignedBy: string }
     | { role: 'delegated' | 'broughtIn'; creator: TaskExecutionReference })>): Promise<Readonly<{ taskId: string }>>;
  markStarted(run: TaskExecutionReference): Promise<void>;
  markFailed(run: TaskExecutionReference, error: Readonly<{ code: string; message: string }>): Promise<void>;
  // sync (loaded view). ownerOf throws TASK_RUNS_UNAVAILABLE only when no chain element is known and the damaged set is non-empty
  ownerOf(chain: readonly TaskExecutionReference[]): TaskRunOwner | null; // innermost linked; mixed Tasks → TASK_RUN_CONFLICT
  isOpen(run: TaskExecutionReference): boolean;
  openRuns(taskId: string, role: TaskRunRole): readonly TaskExecutionReference[];
}
// Task → runtime (bound in composition):
export type TaskRunReleaseRequest = (hostRoot: RootExecutionIdentity, runs: readonly TaskExecutionReference[])
  => Promise<readonly TaskRunStopResult[]> | null;              // null: root not active
export type TaskRunStopResult = Readonly<{ run: TaskExecutionReference; stopped: boolean; error?: { code: string; message: string } }>;
// Root boundary (ActiveRootMessageBoundary + facades):
//   releaseTaskRuns(runs: readonly TaskExecutionReference[]): Promise<readonly TaskRunStopResult[]>;
```

| Interface | Subject / identity | Notes |
| --- | --- | --- |
| `delegate_task` | unchanged input: `recipient_address` + (`task_id` \| `description` [+ `reference_files`]) | Linked mode = role `assigned`, allowed only for non-owned senders. An owned worker passing any `task_id` is rejected (B-1/N2). While any Task file is damaged, description-only mode by a non-owned sender is rejected up front (Q-3). |
| `list_project_tasks` | `project_id` + optional `status` (released) | Each Task: `assignments: [{targetAgentRunId, kind: agent \| team, assignedBy, outcome: accepted \| not_confirmed \| failed}]`, from **open `assigned`** runs only. Mapping: started → accepted, starting → not_confirmed, failed → failed. A Task whose run file is damaged shows `assignmentsUnavailable: true` instead (Q-3). |
| `create_or_update_task` | unchanged | DONE follows DS-C; compact `{projectId, taskId, status}` acknowledgement. |
| GraphQL / REST Task ops | unchanged | Same ProjectTaskService (UI DONE = DS-C). |

## Interface Boundary Check
- Each interface has one subject.
- Run identity is the existing tagged `TaskExecutionReference` (agent vs team); the Team ingress is carried separately as `coordinatorAgentRunId`.
- The runtime never receives Task metadata. `taskId` is used only as an opaque equality/dedupe key.

## Main Domain Subject Naming Check
- Natural subjects: Task, task run, role, host root, run reference, `closedAt`.
- Removed: lifetime, work period, purpose, stamp.
- No generic coordinator, gate or registry is introduced.

## Existing Capability / Subsystem Reuse Check
| Need | Decision |
| --- | --- |
| Projects metadata | Reuse the released store unchanged |
| Atomic JSON file | Reuse `readJsonFile` / `updateJsonFile` |
| Copy creation, registration, exact stop | Reuse the existing lifecycle, adapters, registries and DI-001/002 owners |
| Containment chains / address lookup | Reuse the existing indexes (Task methods removed) |
| Root lookup | Reuse `ActiveCollaborationRootDirectory` |

## Reusable Owned Structures Check
| Concern | Owned file |
| --- | --- |
| Task-run types/reducers | `projects/domain/task-runs.ts` |
| Physical schema | `projects/stores/task-run-schema.ts` |
| Neutral port / result types | `agent-collaboration/execution/task/task-run-port.ts` |
| Per-root fence/release policy (shared by Team/Org/standalone) | `root-task-run-scope.ts` |

## Shared Structure / Data Model Tightness Check
- **Tagged unions:** run reference (agent | team), role-dependent fields (`assignedBy`), and start-dependent fields (`startError`).
- **No optional soup:** there is no generic error or cleanup field.
- **No copied runtime facts.**

## Final File Responsibility Mapping
Paths are under `autobyteus-server-ts/src/`.

| Path | Action | Responsibility |
| --- | --- | --- |
| `projects/stores/project-store.ts` | **Revert to released** (`10fb69504`) | Rows only |
| `projects/stores/{project-state-schema.ts,project-metadata-schema.ts}` | **Remove** | — |
| `projects/stores/{task-run-store.ts,task-run-schema.ts}` | **Add** | Physical `task_runs/<taskId>.json`, invariants |
| `projects/domain/task-runs.ts` | **Add** | Types + pure reducers/projections |
| `projects/domain/{project-task-execution.ts,project-task-execution-state.ts}` | **Remove** | — |
| `projects/domain/{models.ts,project-errors.ts}` | **Modify** | Drop `executionLifetimes`/lifetime codes; add `TASK_RUN_*`, `TASK_RUNS_UNAVAILABLE` |
| `projects/services/task-run-service.ts` | **Add** | Authority + view + serialization |
| `projects/services/project-task-service.ts` | **Modify** | Released metadata paths + TaskRunPort + DONE/assignment orchestration; process-instance init/release |
| `projects/runtime/project-task-runtime-release.ts` → `task-run-release.ts` | **Replace** | Group, request, log |
| `compositions/project-task-lifetime-composition.ts` → `project-task-run-composition.ts`; `compositions/build-studio-server.ts`; `standalone-application-host/start-standalone-application-host.ts` | **Replace / Modify** | Async compose + load; pass `taskRuns` |
| `agent-execution/runtime/general-process-run-supervisor.ts`; Team/Org/standalone builders, managers, options, facades | **Modify** | Field `taskLifetimes` → `taskRuns: TaskRunPort`; `releaseTaskRuns` |
| `agent-collaboration/execution/task/{task-execution-lifetime.ts,task-lifetime-gate.ts,root-task-lifetime-scope.ts}` | **Remove** | — |
| `agent-collaboration/execution/task/{task-run-port.ts,root-task-run-scope.ts}` | **Add** | Neutral port; per-root policy |
| `agent-collaboration/execution/task/{root-task-execution-lifecycle.ts,root-task-dispatch.ts,root-task-execution-adapter.ts,task-execution-tree-projection.ts}` | **Modify** | DS-A/B order, no Task data in plans/trees, no acceptance recording |
| `agent-collaboration/execution/services/active-collaboration-root-directory.ts` | **Modify** | `releaseTaskRuns` |
| `agent-collaboration/collaborators/{message-recipient-resolution.ts,task-scoped-message-recipient.ts}` | **Modify** | Owner/helper via port + `taskExecutionAt` |
| Team/Org/standalone `*-task-execution-adapter.ts`, `*-execution-index.ts`, tree mutators | **Modify** | Remove Task methods; add `registrationFor`, `taskExecutionAt`, and the new `ownershipChainFor` (index chain + pre-commit registrations, N3) |
| `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts` | **Modify** | Remove `taskLifetime` |
| `agent-tools/project-tasks/project-task-tool-{manifest,contract}.ts` | **Modify** | Q-2 projection and description wording |
| Delivery receiver sites (`team-run-message-delivery.ts`, `agent-org-run-message-delivery.ts`, `standalone-root-message-delivery.ts`, `root-team-run.ts`) | **Modify** | Drop `recordAcceptance` options |
| Tests under `tests/unit/{projects,agent-collaboration,agent-tools,run-history}`, integration and e2e | **Specialist-owned** | Retarget to the new owners; remove lifetime/gate/report tests |
| `docs/modules/{projects,agent_team_execution,agent_orgs,standalone_agent_run_root,run_history,agent_communication}.md` | **Delivery-owned** | Resync after implementation; the current uncommitted sync describes lifetimes |

## Folder Boundary Check
- `projects/stores` holds physical files.
- `projects/domain` holds pure types.
- `projects/services` holds authorities.
- `projects/runtime` holds the release side effect.
- `agent-collaboration/execution/task` holds the neutral port and shared runtime policy.
- Subject-root folders hold execution-only adapters and indexes.
- `run-history` holds execution records only.

## Detailed Rules
### Assignment / inherited linking (DS-A, DS-B)
- **Link before register.** The link is written after identity planning and before `beginActivation`. Registration happens at the queue head only if `isOpen(run)`; check-then-register is synchronous, so a DONE can't slip between them.
- **All write preconditions are evaluated inside the Task file's `updateJsonFile` updater, from the content read under that file's lock, never from the in-memory view** (ARCH-REV-009 AR9-F02a). This covers:
  - the inherited-link check (the creator is present in this Task's file and open);
  - in-file uniqueness of the new run;
  - `closeTask`'s set of open runs.

  The view only selects which Task file to open. It is swapped synchronously in the same write's `onCommitted` callback, so any queue-head `isOpen` after a commit sees the committed state. Consequence: an owned bring-in racing DONE either commits before the close (and is closed by it) or reads the closed creator under the lock and is rejected. It can never commit open after the close.
- **Assigned:** inside `serialize(taskId)`, ProjectTaskService re-reads the Task metadata (it must exist and not be DONE), then TaskRunService links in the updater as above. A DONE is either entirely before (the link is rejected) or entirely after (the link is closed by it).
- **Inherited:** links only if the creator is open in the same Task file under the lock. Otherwise `TASK_RUN_CLOSED`, and no resources are acquired.
- **Own Task ID (B-1/N2):** a Task-owned run calling `delegate_task` with any `task_id` is rejected (`TASK_RUN_OWNED_SENDER`, message "workers delegate sub-work without task_id"). Only non-owned runs create `assigned` runs.
- **Failure handling** stays as today. Before acceptance: cancel/release the operation, then `markFailed`. After acceptance, or with uncertain persistence: `TaskDispatchIndeterminateError`. A `starting` run left by a crash stays `starting`, which the Manager sees as not_confirmed. That's truthful, and there's no automatic redo.
- **Helper bring-in** dedupe key is `(taskId, address)`. An existing helper is found as `adapter.taskExecutionAt(address, port.openRuns(taskId, 'broughtIn'))`.

### Fences (DS-D, DS-E)
- **Unowned agents are never checked against Task data.** An agent with an empty chain (configured member, host, @ collaborator) needs no Task data at all.
- **Message scope:** sender and recipient owned by different Tasks → `TASK_RUN_CONFLICT`. A closed sender or recipient → `TASK_RUN_CLOSED`.
- **Routing order** (unchanged): own Team instance → the Task's open helper at the address → an unowned run-wide run (`ownerOf(candidate chain) === null`) → a new `broughtIn` copy.

### DONE and stopping (DS-C)
- **Write order:** closure is committed first, then the metadata. If the metadata write fails, the runs stay closed and the stop is still requested. The caller gets the existing "could not be confirmed" error, and repeating DONE completes it.
- **What is released:** every closed run of the Task, grouped by host root, on every DONE (so repeated DONE is the retry).
- **At the root**, for each run:
  - verify it is closed in the view (otherwise result `TASK_RUN_NOT_CLOSED`, no action);
  - cancel its registration and/or committed copy synchronously, before any await;
  - **always invoke the exact release on every authority the root still holds for that run**, whether or not the run looks live. That means the registration operation's `release()` and the adapter's exact release of the committed copy, which reaches the retained DI-001/002 receipts (`releaseExactRun`, retired/failed receipts). Those owners memoize success, so a second call after a successful stop is a no-op (ARCH-REV-009 AR9-F02b);
  - report `stopped: true` only when every invoked release is accepted, or when the root holds no authority for the run at all (no registration, no committed copy, no retained receipt). Otherwise report `stopped: false` with the error.
  - A failed stop whose receipt is retained is therefore retried by every repeated DONE, and is never reported as stopped.
- **Root not active** (`null`): the root holds no authority in this process (none survives a restart), so this is logged at debug level, not as a failure.
- **Failures** are logged with taskId, hostRoot, run and error. Nothing is persisted (Q-1).

### Failure policy for a damaged Task run file (user decision REQ-BL-009 Q-3; ARCH-REV-009 AR9-F01)
- **Load:** at composition, TaskRunService reads every file in `task_runs/`. A file that is unreadable, invalid, or whose `taskId` doesn't match its filename puts that Task in the view's **damaged set**. The server starts normally and logs one error per damaged file. Damage should be very rare: only the app writes these files, atomically.
- **Still works:** the whole app. That includes Chat, the Projects screens, Task create, edit, delete and non-DONE status changes, and **every Task whose file is readable**: assign, DONE, its workers, helpers and delegations. Bring-in by unowned senders also works (it is the root-wide collaborator path, not a task copy).
- **Rejected with one clear error** (`TASK_RUNS_UNAVAILABLE`; message: *"Task run data could not be read (`<appData>/projects/task_runs/<taskId>.json`: <reason>). Fix or restore the file and restart the app; other features keep working."*):
  - **for the damaged Task itself:** assign and DONE;
  - **while the damaged set is non-empty:**
    - **description-only `delegate_task` by a non-owned sender** is rejected **up front**, before planning or any resources. Its new copy would have no record in any readable file, and under C-1 the runtime could not tell it from the damaged Task's runs, so its own fence checks would fail mid-dispatch;
    - **waking, messaging or restoring any copy not found in the view.** `ownerOf(chain)` returns the owner when any element is in the view. It returns `null` when none is and the damaged set is empty. When none is and the set is non-empty, it throws `TASK_RUNS_UNAVAILABLE`.
- **`list_project_tasks`:** every Task is listed. A damaged Task carries `assignmentsUnavailable: true` and no `assignments` field. It never shows an empty list as if it had no assignments. GraphQL Task reads don't include assignments and are unaffected.
- **Where the user sees it** (existing surfaces, no new UI):
  - a DONE from the Projects UI shows the existing red alert (GraphQL `ProjectError` code + message → `ProjectRequestError`);
  - an agent's tool call gets the error as its result and relays it in chat;
  - a rejected message or wake shows as the existing rejected-command result.
- **Recovery:** fix or restore the file and restart. No self-repair, no automatic reload.
- **Write failure:** the view is not changed (it updates only after a commit). The caller gets the scoped error.
- **Single writer:** the platform runs one server process, which owns `<appData>/projects` (a platform fact, confirmed by the user 2026-10-05). The file lock still protects atomic replace.
- **No historical ID scan at Task creation.** Task IDs are fresh UUIDs (DESIGN.md rule 2), so `createTask` does not read `task_runs/<taskId>.json`, and a damaged run file never blocks creating Tasks.

## Concrete Examples / Shape Guidance
- **Same root, two Tasks:** the Manager assigns A → Team T and B → Agent G in its standalone root.
  - T's member brings in `/researcher` → `broughtIn` (A).
  - G brings in `/researcher` → a separate `broughtIn` (B).
  - DONE A closes T and A's researcher and stops only those. G, B's researcher and the Manager keep running.
- **Restart:** DONE A, server restart, a message to T's coordinator → the view (loaded from disk) says closed → `TASK_RUN_CLOSED`. Nothing is restored.
- **Reopen:** A is set to TODO, then assigned → Agent W. The new `assigned` run is open. T stays closed. `list_project_tasks` shows only W.
- **Delete:** delete Task A after DONE → `projects.json` loses A, while `task_runs/<taskId>.json` keeps A's closed runs, so T can never wake. New Tasks get fresh UUIDs, so they never reuse A's ID.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep reading `taskLifetime` stamps as a fallback | Rejected: two authorities again |
| Convert lifetimes to `task_runs/<taskId>.json` | Rejected: the data never shipped |
| Treat an unreadable `task_runs/<taskId>.json` as empty | Rejected: it would wake closed runs (B-3) |
| Persist shutdown results for diagnostics | Rejected (Q-1): logs instead |
| Keep the gate as a cache next to the view | Rejected: the view is the authority's own memory; one holder |

## Derived Layering
Transport/tools → **ProjectTaskService** (Task boundary, port) → TaskRunService / ProjectStore → files.
Runtime: lifecycle → **RootTaskRunScope** (asks the port) → adapters → provider owners.
The two sides meet only through the port and the release request, bound at composition.

## Change / Refactor Sequence
1. Add `task-runs.ts`, `task-run-schema.ts`, `task-run-store.ts`, `task-run-service.ts` with unit tests (invariants, serialization, view, load failure).
2. Revert `project-store.ts` to released and delete the state/metadata schemas. Rewrite the lifetime parts of `ProjectTaskService` to TaskRunService orchestration, including the DONE order. Remove the retained-ID collision scan from `createTask`.
3. Add `task-run-port.ts` and `root-task-run-scope.ts`. Remove the gate, the lifetime contract and the scope.
4. Lifecycle/dispatch: the link-before-register order, `isOpen` checks, `markStarted`/`markFailed`, no acceptance recording.
5. Adapters/indexes/trees/schemas: remove every Task method and field; add `registrationFor` and `taskExecutionAt`.
6. Recipient resolution, root facades `releaseTaskRuns`, directory, composition, supervisor, builders.
7. Tool projection (Q-2).
8. Mechanical dependency checks; retarget the tests. Docs are Delivery's.

## Key Tradeoffs
- **An in-memory view loaded at startup vs a durable read per admission.** The view is cheaper, makes synchronous fences exact, and removes the gate. The cost is reading the small per-Task files once at composition, plus the scoped fail-closed behavior for a damaged file (Q-3).
- **Per-Task in-process serialization vs nested file locks.** Serialization gives the safe DONE order without cross-store lock coupling. This is correct because the platform runs a single server process (user-confirmed).
- **Logging stop failures vs persisting them.** User decision Q-1.

## Risks
- **Missing an `isOpen` check after an await in dispatch** would allow acquisition after DONE. Covered by the existing check discipline plus race tests.
- **Missing a Task-free conversion in one of the three adapters or indexes.** Covered by the mechanical grep and per-root tests.
- **A damaged Task run file** blocks that Task's assign/DONE and, while it exists, description-only delegation and unknown copies. Accepted by the user (Q-3): very rare, the error is clear and everything else works.
- **Accumulation:** one small file per Task that ever had runs; each stops growing at DONE. Files are kept on Delete (closed-forever). Pruning when run history is deleted is a possible later cleanup.

## Guidance For Implementation / Verification Intent
Follow TESTING.md. The minimum controls:
- the `task_runs/<taskId>.json` invariants and atomic writes;
- damaged file: the server still starts; other Tasks work fully; the damaged Task's assign and DONE reject with the clear message (Projects UI alert shows it); `list_project_tasks` marks it `assignmentsUnavailable` (never empty); description-only delegation is rejected **up front** with zero planning/resources; waking an unknown copy is rejected; after fixing the file a restart restores everything (AR9-F01);
- both-order race: an owned bring-in/delegation link vs DONE on the same Task. Either the run is closed by DONE, or the link is rejected under the lock; never open after the close and never registered after the close (AR9-F02a);
- an own-Task-ID `delegate_task` by an owned worker is rejected (N2);
- a status-checked assignment link racing DONE (both orders);
- DONE before register, after register and after commit (zero acquisitions or an exact stop);
- an inherited link from a closed creator rejected;
- two Tasks in one root with the same helper address isolated;
- message-scope conflict;
- restart → closed wake rejected;
- reopen → only the new assignment listed;
- Delete keeps runs and fences;
- a failed stop whose receipt is retained → reported `stopped: false` and logged; repeating DONE invokes the same exact release again and, once it succeeds, reports stopped; a third DONE is a no-op through success memoization (AR9-F02b);
- a failed stop is logged, not persisted;
- trees contain no Task fields after a linked dispatch;
- released `projects.json` round-trips byte-compatibly, and a dev profile with a lifetime row reads without error;
- no Projects import in the runtime (grep).

Real Manager journeys (Agent/Team/Org roots, DONE, reopen, restart) rerun on a changed build at API/E2E.
