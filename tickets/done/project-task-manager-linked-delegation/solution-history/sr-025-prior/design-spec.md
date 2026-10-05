# Design — Project Task Manager, Per-Project Storage And Task Agent Run Resources (SR-023 + SR-024)

## Solution And Approval Basis
- **Package:** `project-task-manager-linked-delegation`. **Round:** **SR-024**, 2026-10-05. **Status:** Architecture Design Complete.
- **What SR-024 adds on top of SR-023** (SR-023 itself passed as ARCH-REV-010):
  - **Per-Project folder storage with a one-time startup migration of released Projects data (C-3, replaced by the user).** Projects is off by default (E-094), so the migration is cheap now and costly later.
  - **"Agent run resources" naming (C-4):** file `agent_run_resources.json`, list `agentRunResources`, field `agentRun`. `TaskRun*` code names become `TaskAgentResource*`.
  - Everything else in SR-023 is unchanged in substance (§ SR-023 basis below).
- **Requirements:** **REQ-BL-009 (approved, SD-AP-003)**, with C-2/C-3/C-4 amended by direct user instruction (SR-024). It replaces REQ-BL-008 where they differ. See requirements-doc.md.
- **SR-023 basis (ARCH-REV-010 Pass), unchanged:**
  - the execution tree never knows about Tasks (C-1);
  - one authority with an in-memory view; a neutral port; a Task-free runtime;
  - link before register; per-Task serialization; DONE = close → status → release;
  - release follows retained exact authority; preconditions evaluated under the file lock;
  - the damaged-file policy (Q-3); owned runs pass no `task_id` (N2).
  - Archived snapshot: `solution-history/sr-024-prior/design-spec.md`.
- **Older predecessor:** the lifetime design (SR-014 … SR-022a) is at `solution-history/sr-023-prior/design-spec.sr-022a-final.md`. It stays authoritative only for the carried-forward sections below.
- **Evidence:** investigation-notes.md E-001–E-100. This design: E-084–E-093 (SR-023), E-094–E-100 (SR-024). Data model: `data-model-draft.md` (authoritative).
- **Workspace:**
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD `4b04d9097` (IR-012); base and finalization target origin/personal.
  - The IR-012 API/E2E recheck is paused (user).
  - Implementation is told to continue the runtime-side SR-023 work and to hold the Projects storage parts until this design passes review.

### Carried forward unchanged (authoritative text in the archived lifetime spec)
- **Private activation and provider ownership (DI-001):** "Exact private Agent activation and provider cleanup authority", "Partial Team / root preparation ownership".
- **Claude SDK opening / exact process owner (DI-002)**, including the SR-020 terminal-handoff clarification.
- **Identity-only planning, registered preparation before resources, durable tree commit, guarded deferred seed.** Changed only where the Task link is written (DS-A).
- **Public worker-tree projection and history (DS-008):** the SR-014 CRF-003 block and the SR-018 inventory.
- **Business-only Manager prompt and the compact mutation acknowledgement (SR-014).** The Task read projection follows Q-2.
- **One composition binding; runtime never imports Projects (SR-021 F06).**
- **CRR-024 Local Fixes F01–F03.** SR-022a receiver recording is removed.

## Current-State Read (IR-012 + released Projects storage)
**Task ownership today** is a **lifetime** concept stored in two places:
- a non-Project `{taskLifetimes}` row in `projects.json`, holding per-run `dispatch`, `cleanup` and a shared `error`;
- a `taskLifetime` stamp on every owned tree node.

The runtime reads ownership from the stamp through the root indexes. A process gate latches closure. Release unions links, registrations and stamps, and the result is recorded back into `projects.json`. This spans 39 server files (E-087).

**Released Projects storage** (E-099):
- `projects/projects.json`: an array of Project rows with their `tasks[]` inside;
- `projects/task_context_files/<projectId>/<taskId>/`: saved Task files;
- `projects/task_context_drafts/<projectId>/<draftId>/`: drafts with `manifest.json`;
- one `ProjectTaskContextLayout` owns the context paths.

Projects is off by default (E-094). The only known installed dataset is the user's: 1 Project, 2 TODO Tasks, no files (E-095).

## Task Size And Architectural Risk (Mandatory)
- **`task_size`: Large.**
  - **SR-023:** replaces the persisted ownership model and the Task ↔ runtime contract across Projects, shared lifecycle/dispatch, three root adapters/indexes, tree schemas, recipient routing, composition and facades.
  - **SR-024:** rewrites the Projects store for per-Project folders and adds a startup app-data migration.
- **`architectural_risk`: High.** The closed-forever fence, startup-race ordering, cross-file DONE ordering, the persisted ownership authority, and now a migration of released user data.
- **Route: Reviewed.**
- **Escalation:** return Design Impact if any of these turns out to be true:
  - a supported path needs Task ownership before the view is loaded;
  - a copy can be created by an owned run without link-before-register;
  - a second server process runs over the same app data (today there is one; user-confirmed);
  - a released Projects source shape is found that this migration does not cover.

## Architecture Investigation Evidence
| Evidence | Observation → decision |
| --- | --- |
| E-084 | A Task's run forest lives in the assignment's host root → release is addressed per host root. |
| E-085 / E-091 | Link before registration → the root releases exactly the named agent runs. |
| E-088 / E-089 | Trees: tolerant reader, field removed, no migration. The released `projects.json` row filter skips the unshipped lifetime row; this matters for the migration source (frozen copy). |
| E-090 | The containment chain is a runtime fact; ownership is looked up by run reference on the Task side. |
| E-092 | Synchronous ownership questions → an in-memory Task-side view loaded at composition. |
| E-093 | `readJsonFile` / `updateJsonFile` (lock + atomic replace + `onCommitted`) serve every new per-file JSON. |
| E-094 / E-095 | Projects is off by default; the real installed dataset is tiny → the migration is cheap now (user rationale). |
| E-096 | The canonical migration guideline governs § Migration Plan (checklist answered there). |
| E-097 | The runner continues after a failure and hosts only warn → no lockout; a narrow Projects gate is needed so un-migrated data is never shown as empty. |
| E-098 | Lesson: relayout by directory rename, not copy. |
| E-099 / E-100 | One layout owner and safe segments; logical locators unaffected; absolute paths in past conversations keep their old text (accepted). |

## Intended Change
- **Projects storage becomes per-Project folders:**
  - `projects/<projectId>/project.json`;
  - per Task `tasks/<taskId>/{task.json, context/, agent_run_resources.json}`;
  - `drafts/<draftId>/`.
- **Released data is moved once** by a registered startup migration.
- **`TaskAgentResourceService`** is the sole authority over every Task's `agent_run_resources.json`. It keeps an in-memory view and answers runtime ownership questions through a neutral port implemented by the Task boundary.
- **Execution trees go back to pure execution facts.**
- **DONE** closes the Task's open agent run resources, then sets the status in `task.json`, then asks each host root to stop exactly those runs. Nothing about shutdown is persisted.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | REQ / AC | Approved outcome | Target path |
| --- | --- | --- | --- |
| BEH-001/002 | REQ-001/002 | Shipped Manager; Project/Task tools/UI | Same services and APIs over the per-Project store |
| BEH-003/004 | REQ-003/004/010 | `task_id` alone or described work; saved packet from `task.json` + `context/` | Lifecycle → `ProjectTaskService.resolveAssignment` → DS-A |
| BEH-005 | REQ-005 (Q-2), AC-002/006 | Linked before resources; Manager sees current assignments | DS-A + DS-F |
| BEH-006/007 | REQ-006–009 (Q-1), B-3 | DONE closes forever, stops exactly them; retry by DONE; failures logged | DS-C |
| BEH-008 | REQ-011, B-5 | Delete removes `task.json`/`context/` (and `project.json`/`drafts/`), keeps `agent_run_resources.json` | Store delete rules |
| BEH-009 | REQ-007/012, B-1/B-2, N2 | delegated/broughtIn linked to the creator's open Task; no sharing; owned runs pass no `task_id` | DS-B + DS-E |
| BEH-010 | REQ-013 | Business-only LLM contract | unchanged |
| C-1–C-4, Q-3 | REQ-BL-009 | Task-free trees; per-Project folders + migration; naming; damaged-file policy | § Data Model, § Migration Plan, § Failure policy |

## Relevant Supplemental Task Artifacts
- `data-model-draft.md`: the authoritative data model and layout.
- `autobyteus-server-ts/docs/design/data_migration_guideline.md`: the canonical migration policy (repository-owned).
- Archived designs: `solution-history/sr-024-prior/design-spec.md` (SR-023, ARCH-REV-010) and `solution-history/sr-023-prior/design-spec.sr-022a-final.md` (carried-forward sections only).
- No Product/UI supplement.

## Task Design Health Assessment (Mandatory)
- **Posture:** Refactor of a feature under construction, user-directed.
- **Root causes:**
  - **(1) Boundary or ownership issue:** Task ownership had two homes, and runtime outcomes were copied into the Task file (SR-023 fixes this).
  - **(2) Storage granularity:** every Project and Task edit rewrote one shared `projects.json`, and a Task's files and records lived in three unrelated trees (SR-024 fixes this; user-directed).
- **Response:** one owner per fact, and one folder per Project and Task. Changing the released layout requires one bounded migration, done now while the data is tiny.
- **Net effect:**
  - the lifetime machinery is deleted;
  - the Projects store is rewritten (smaller, per-file writes);
  - one migration definition is added.

## Terminology
- **Agent run resource:** an agent run (an Agent run, or a Team run with its coordinator) started for a Task. **Role:** `assigned` (a non-owned run's `delegate_task(task_id)`), `delegated` (an open owned run's `delegate_task` without task_id), or `broughtIn` (an open owned run's `send_message_to` that started a copy).
- **Owned run:** an agent run that is (or is contained in) some Task's agent run resource.
- **Host root:** the top-level run the user started (`agent` / `agent_team` / `agent_org`).
- **Open / closed:** an entry's `closedAt`. DONE closes; closed is forever.
- **Containment chain:** the runtime's list of task copies containing an agent, innermost first.
- **Task copy:** the runtime's name for any `delegate_task` / bring-in copy, linked or not.
- "Collaborator" stays reserved for the user's @.

## Legacy Removal Policy (Mandatory)
- No dual reading of stamps and the view, and no lifetime conversion.
- No fallback that treats an unreadable `agent_run_resources.json` as empty.
- **No current-runtime reader of the released `projects.json` / `task_context_*` layout.** Old-shape interpretation lives only inside the registered migration, as a frozen copy. Current code may only test for the source file's **existence**, for the narrow migration gate (§ Migration Plan). It never reads it.
- The unshipped lifetime format is removed outright. Its dev residue (a `{taskLifetimes}` row in dev profiles) is skipped by the migration's frozen row filter and kept in the retained original.

## Persisted Data / State Transition Decision (Mandatory)
| Subject | Decision |
| --- | --- |
| `<appData>/projects/projects.json`, `task_context_files/`, `task_context_drafts/` (released) | **Migration Required** (C-3, user-directed relayout). See § Migration Plan. |
| `<appData>/projects/<projectId>/project.json`, `tasks/<taskId>/task.json`, `context/`, `drafts/<draftId>/` | **New current layout**, written exactly and read tolerantly (known fields; unknown ignored; no version field). |
| `<appData>/projects/<projectId>/tasks/<taskId>/agent_run_resources.json` | **New, never shipped.** Missing = no agent run resources. Invalid → that Task is in the damaged set (Q-3). Kept on Task/Project Delete. |
| Execution tree files | **Directly usable — no migration.** The `taskLifetime` field is removed; the tolerant reader ignores dev residue; the exact writer drops it. |

## Data Model (REQ-BL-009 C-2/C-3/C-4; full text in `data-model-draft.md`)
```
<appData>/projects/<projectId>/
├── project.json                      { projectId, name, description, createdAt, updatedAt, workspaces[] }
├── drafts/<draftId>/                 manifest.json + uploaded files (unchanged draft semantics)
└── tasks/<taskId>/
    ├── task.json                     { taskId, projectId, description, status, createdAt, updatedAt, contextFiles[] }
    ├── context/<storedFilename>      the Task's attached files
    └── agent_run_resources.json      { taskId, agentRunResources: [ … ] }
```
```jsonc
// agent_run_resources.json
{ "taskId": "project_task_efdc…",
  "agentRunResources": [
  { "role": "assigned", "assignedBy": "project_task_manager_882a…",
    "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
    "agentRun": { "kind": "team", "teamRunId": "packet_team_e86b…", "coordinatorAgentRunId": "coordinator_2e35…" },
    "linkedAt": "…", "start": "starting|started|failed", "startError": { "code": "…", "message": "…" },
    "closedAt": null } ] }
```
**Invariants**, checked on read and write:
- `project.json.projectId` and `task.json.{taskId,projectId}` match their folders; `agent_run_resources.json.taskId` matches its folder;
- IDs pass the shared safe-segment rule before any path use (ARCH-REV-010 N5);
- an agent run appears at most once per file and is never linked to two Tasks (fresh identities; the view asserts it on link);
- `assignedBy` exists if and only if `assigned`; `startError` exists if and only if `failed`;
- `delegated` / `broughtIn` are written only while the creator is open. This is a write-time rule with no stored lineage (N1); it suffices because DONE closes all of a Task's open entries at once.

**Never stored:** shutdown state, liveness, lineage, addresses, descriptions.
**Listing:** a folder is a Project only with a valid `project.json`, and a Task only with a valid `task.json`. A folder holding only `agent_run_resources.json` files (left by Delete) is not listed.

## Migration Plan — `projects-per-folder-v1` (Migration Required; answers the data_migration_guideline §2 checklist)
**Definition:** `app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.ts`, registered in `app-data-migration-registry.ts`.
- `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"` (it moves files that the Projects runtime uses).
- No prerequisites. Frozen source readers live in the same folder (`released-projects-array-v1.ts`), as a copy of the released `project-store.ts` row filter, normalizers and context-layout `segment()`.

### Algorithm (deterministic: known source → one fixed target)
1. **Nothing to do.** If `<appData>/projects/projects.json` does not exist → `SUCCEEDED`, 0 scanned (fresh install, or already migrated).
2. **Read the source** with the frozen released reader (array; tolerant rows; `tasks` optional; context files normalized).
   - Rows failing the frozen `isValidProject` are **not migrated**. This includes the unshipped dev `{taskLifetimes}` row: it is skipped silently as known dev residue and not counted as a warning.
   - Invalid non-residue rows → `SKIPPED` with a warning (kept in the retained original).
   - A duplicate `projectId` keeps the first and skips the later one with a warning.
   - A file that is not an array or not JSON → `FAILED`, sources untouched.
3. **For each valid Project**, in order:
   - **a.** Write `<projectId>/tasks/<taskId>/task.json` for each valid Task (frozen `isValidTask`; invalid Task entries are skipped with a warning). Then write `<projectId>/project.json`.
     - Writes are per-file atomic (temp + rename).
     - An existing target that already validates is left unchanged (retry).
     - An existing target that differs → that Project is `SKIPPED` with a warning, preserved and not overwritten.
     - `task.json` gets `projectId` added; every other field is copied as released.
   - **b.** For each Task: if `task_context_files/<enc pid>/<enc tid>/` exists and the target `context/` does not, **rename** the directory into `tasks/<taskId>/context/`.
     - A missing source with an existing target means already done.
     - Both existing → `SKIPPED` with a warning, nothing overwritten.
     - Every `contextFiles[].storedFilename` must then exist in `context/`; a missing file is a warning (the Task is still migrated, matching released behavior, where a missing saved file was already a read-time error).
   - **c.** For each draft dir `task_context_drafts/<enc pid>/<draftId>/`, rename it into `<projectId>/drafts/<draftId>/`, using the same already-done / conflict rules.
4. **Retire the sources** only after every non-skipped Project validated by rereading with the **current** reader:
   - rename `projects.json` → `projects.pre-folders.json` (the retained original, never read by current code);
   - remove `task_context_files/` and `task_context_drafts/` only if now empty; otherwise leave them and warn (non-empty residue: skipped or orphan dirs).
5. **Status:** `SUCCEEDED` with no warnings; `SUCCEEDED_WITH_WARNINGS` with bounded explicit skips (counts plus capped examples in item details); `FAILED` if the source can't be parsed or a write or rename fails. The runner owns status text and the attempt log (§8).

### Checklist answers (§2)
1. **Need:** yes. A user-directed **relayout** (one file → per-Project/Task folders) changes where every fact lives, which a tolerant reader can't absorb without a dual-layout runtime (forbidden §4). It is cheap now because Projects is off by default (E-094/E-095).
2. **Availability:** startup never waits on Projects. The runner continues after a failure and hosts only warn (E-097). While `projects.json` still exists (migration not completed), **only Projects** rejects with `PROJECTS_MIGRATION_PENDING` and a clear message (the narrow gate). Chat, agents and everything else work, and un-migrated data is never shown as an empty Project list. Agent run resources need no gate: none existed in the released layout.
3. **Source/target:**
   - inspected sources: the released `project-store.ts` (`10fb69504`) and `project-task-context-layout.ts` (E-089/E-099), the user's real dataset (E-095), and the unshipped dev lifetime residue (E-088/E-089);
   - no predecessor Projects migration exists;
   - the target is admitted by the current ProjectStore and layout.
4. **Disposition:**
   - converted Projects/Tasks → `MIGRATED`;
   - already-current targets → `SKIPPED` (no-op);
   - invalid rows/Tasks, conflicts, non-empty residue → `SKIPPED` + warning, preserved;
   - an unparsable source or I/O failure → `FAILED` (sources unchanged; the Projects gate stays; restart retries).
   - The aggregate status is separate from admission: admission is "source file absent + current reader validates the requested file".
5. **Commit/retry:** per-file atomic writes and same-filesystem directory renames, with sources kept until validation. A retry recognizes completed targets and redoes only the rest. No backup copies, hashes or journal. The retained original `projects.pre-folders.json` is the released file itself, renamed rather than copied.
6. **Current-only boundary:** old-shape reading exists only in the frozen `released-projects-array-v1.ts` inside the migration folder. Current code only tests `projects.json` for **existence** (the gate). The migration imports the current schema only to validate its output.
7. **Cost:** one read of `projects.json` (the real dataset is 1,011 bytes), one small write per Project/Task, one rename per context/draft directory, one validation reread per written file. Startup after completion: one `stat` (the gate) plus the normal per-request reads; no history audit.
8. **References:**
   - `contextFiles[].storedFilename` → `context/` (checked in 3b);
   - logical locators `projects/<pid>/tasks/<tid>/context/<file>` are unchanged;
   - absolute paths in past agent conversations keep their old text (E-100, accepted: historical text only; new delegations get new paths);
   - Task IDs referenced by `agent_run_resources.json` didn't exist before this release.
9. **Evidence:** see § Guidance (released-data fixtures including the real-shape sample, retry after a partial move, already-migrated no-op, both startup entrypoints, the gate before and after, and the conflict/skip cases).
10. **Lessons:** directory-rename relayout (`team-agent-memory-layout`, E-098); frozen strict source copies (`legacy/released-run-package-shapes`); no lockout, no backups/journals (v1.4.87 incident, startup-performance correction). Independent review: architecture review → code review → API/E2E.

## Data-Flow Spine Inventory
| ID | Scope | Start → End | Governing owner |
| --- | --- | --- | --- |
| DS-A | Primary | Manager `delegate_task(task_id)` → linked, started worker + `target_agent_run_id` | RootTaskExecutionLifecycle; Task link via ProjectTaskService |
| DS-B | Primary | Owned run's `delegate_task` / bring-in → linked copy in the same Task | RootTaskExecutionLifecycle |
| DS-C | Primary | DONE (tool or UI) → runs closed forever + exact stop requested per host root | ProjectTaskService → TaskAgentResourceService → root boundary |
| DS-D | Bounded local | Input / wake / restore of an agent → allowed or `TASK_AGENT_RESOURCE_CLOSED` | RootTaskAgentResourceScope over the TaskRun view |
| DS-E | Bounded local | Owned sender `send_message_to(address)` → own Team / Task helper / unowned outside run / new helper | message-recipient-resolution |
| DS-F | Return | `list_project_tasks` → Tasks + current assignments | Tool manifest over ProjectTaskService |
| DS-G | Bounded local | Composition / any Agent-run-resource write → validated `<projectId>/tasks/<taskId>/agent_run_resources.json` + in-memory view | TaskAgentResourceService + TaskAgentResourceStore |
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
  1. `ProjectTaskService.updateTask(status DONE)` → `taskAgentResources.closeTask(taskId, writeMetadata)`, under the Task's serialization:
     - set `closedAt` on every open run and commit. The view updates at once, so synchronous fences now reject.
     - run `writeMetadata()`: the Task's `task.json` update of status, description and context.
  2. Then `requestRelease(taskId)`: group **all** closed runs of the Task by host root → the injected request → `root.releaseTaskAgentResources(runs)` → per-run in-memory results → log the failures.
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
Manager (business agent) → tool manifest → **ProjectTaskService** (Task boundary) ⇄ **TaskAgentResourceService** (agent run resources authority) | **RootTaskExecutionLifecycle** + **RootTaskAgentResourceScope** (runtime) → subject adapters → provider owners (carried forward). The composition binds the two sides once.

## Ownership Map
| Owner | Owns |
| --- | --- |
| **ProjectTaskService** (`projects/services/project-task-service.ts`) | The Task subject boundary: Task metadata (`task.json`) and context through ProjectStore/context store (create/update/delete/context; released API semantics), saved work for assignment, status rules. It orchestrates DONE (`closeTask` → metadata write → `requestRelease`) and assignment linking (status re-check inside `TaskAgentResourceService.serialize`). It **implements `TaskAgentResourcePort`** for the runtime, delegating run facts to TaskAgentResourceService. Task creation does not read `<projectId>/tasks/<taskId>/agent_run_resources.json` (fresh UUIDs; DESIGN.md rule 2). |
| **TaskAgentResourceService** (`projects/services/task-agent-resource-service.ts`, new) | The sole authority over the per-Task files `<projectId>/tasks/<taskId>/agent_run_resources.json` and the process in-memory **view**: run key → `{taskId, role, open}`, per-Agent run resource lists, and the **damaged set**. `load()`, `link`, `markStarted`/`markFailed`, `closeTask`, `ownerOf`, `isOpen`, `openRuns(taskId, role)`, `closedRunsByHostRoot`, `currentAssignments`, and per-Task `serialize`. Paths come from `ProjectsLayout`; it knows nothing about `task.json`/`project.json` content, and receives prechecks and after-close callbacks. |
| **TaskAgentResourceStore + task-agent-resource-schema** (`projects/stores/`, new) | Every `<projectId>/tasks/<taskId>/agent_run_resources.json`: enumeration for load (`*/tasks/*/agent_run_resources.json`), per-file invariant validation, exact serialization, per-file lock + atomic replace via `readJsonFile`/`updateJsonFile` (with `onCommitted` for the synchronous view swap). |
| **ProjectStore** (`projects/stores/project-store.ts`, **rewritten for per-Project folders**) | `project.json` and `task.json` files. List Projects = enumerate `<appData>/projects/*/project.json` (tolerant, valid only). List a Project's Tasks = `<projectId>/tasks/*/task.json`. Read/write one file at a time (lock + atomic replace). Find a Task by ID across Projects = a `tasks/<taskId>/task.json` existence check per Project folder. **Delete rules:** Task → remove `task.json` + `context/`, keep `agent_run_resources.json`; Project → remove `project.json`, `drafts/`, every `task.json` + `context/`, keep every `agent_run_resources.json`. Released API semantics unchanged (same fields, same errors). |
| **ProjectsLayout** (`projects/stores/projects-layout.ts`, replaces `projects/context/project-task-context-layout.ts`) | The **single path owner** for everything under `<appData>/projects/`: Project dir, `project.json`, Task dir, `task.json`, `context/`, `agent_run_resources.json`, `drafts/<draftId>/`. Applies the existing `segment()` safe-segment rule and contained-directory checks (N5). Context and draft stores keep their file semantics, now through these paths. |
| **Projects migration** (`app-data-migrations/migrations/projects-per-folder-v1/…`, new) | The one-time relayout of released data, with frozen source readers. § Migration Plan. |
| **Projects migration gate** (in ProjectStore) | If the released source `<appData>/projects/projects.json` still **exists** (migration not completed), every Projects/Task operation rejects `PROJECTS_MIGRATION_PENDING` ("Projects data is being upgraded; restart the app to finish. Other features keep working."). Existence check only; it never reads the old file. |
| **task-agent-resources domain** (`projects/domain/task-agent-resources.ts`, new) | Pure types and reducers (link, start transitions, close, projections). |
| **Agent run resource release** (`projects/runtime/task-agent-resource-release.ts`, replaces `project-task-runtime-release.ts`) | Groups closed runs by host root, calls the injected request (`null` = root not active → nothing live), and logs failures. No state, no coalescing (exact runtime receipts already coalesce). |
| **Composition** (`compositions/project-task-agent-resource-composition.ts`, replaces `project-task-lifetime-composition.ts`) | Creates the store/service, `await load()` (non-fatal), initializes the ProjectTaskService process instance with `{taskAgentResources, requestRelease}` (directory-based), and returns `TaskAgentResourcePort` to the supervisor. Released on host close/rollback. |
| **RootTaskExecutionLifecycle / `dispatchTaskCopy`** | Runtime sequence (DS-A/B) and fences via the scope; unchanged idle/queue behavior. |
| **RootTaskAgentResourceScope** (`agent-collaboration/execution/task/root-task-agent-resource-scope.ts`, replaces `root-task-lifetime-scope.ts`) | Stateless per-root policy: chain → `port.ownerOf`, input/message fences, and `releaseTaskAgentResources(runs)`. The latter verifies each run is closed, cancels the registration or the committed copy before any await, then performs exact stops and returns in-memory results. |
| **Root adapters / indexes / tree** | Execution facts only: plan/begin/commit, a **new `ownershipChainFor(agentRunId)`** (the index containment chain plus any pre-commit registration whose planned members include the agent; ARCH-REV-009 N3; the existing `taskExecutionChainFor` stays index-only for idle/restore), registration by run reference, the copy at an address among given references, exact cancel/stop. **No Task methods.** |
| **Root facades** (RootTeamRun, AgentOrgRun, StandaloneAgentRunRoot) + `ActiveCollaborationRootDirectory` boundary | `releaseTaskAgentResources(runs)` replaces `releaseTaskLifetime`; fences wired as today. |
| Carried forward | AgentRunManager / activation operation / factories / Claude opening & process owner / resource manager / public tree projection: unchanged (archived spec). |

## Thin Entry Facades / Public Wrappers
- The native and MCP tool manifests translate, validate and project only.
- The composition binding is wiring only.
- `ProjectTaskService` implementing `TaskAgentResourcePort` is a real boundary: it owns status rules and orchestration, not just forwarding.

## Removal / Decommission Plan (Mandatory)
| Remove | Replacement |
| --- | --- |
| `projects/stores/project-state-schema.ts`, `project-metadata-schema.ts`, logical-state `ProjectStore` (`readState`/`updateState`/observed commit) **and** the released array-row `projects.json` read/write path | Rewritten per-Project-folder `project-store.ts` (old-shape reading only inside the migration) |
| `projects/context/project-task-context-layout.ts` (released `task_context_files/`, `task_context_drafts/` paths) | `projects/stores/projects-layout.ts` (per-Project/Task paths) |
| `projects/domain/project-task-execution.ts`, `project-task-execution-state.ts`; `ProjectTaskView.executionLifetimes`; lifetime error codes | `projects/domain/task-agent-resources.ts` |
| `projects/runtime/project-task-runtime-release.ts` (`recordCleanup`, coalescing, reports) | `projects/runtime/task-agent-resource-release.ts` (log-only) |
| `task-lifetime-gate.ts`, `TaskLifetimeClosureListener`, `TaskLifetimeAdmission`, `TaskLifetimeReleaseReport`, `TaskExecutionLifetimePort`, `TaskExecutionLifetimeStamp`, `parseTaskLifetimeStamp`, `TaskExecutionPurpose`, `TaskExecutionLinkIdentity.purpose` | `task-agent-resource-port.ts` (neutral port + result types) |
| `root-task-lifetime-scope.ts` | `root-task-agent-resource-scope.ts` |
| Adapter methods `registeredActivations(lifetimeId)`, `ownedExecutions`, `findLifetimeHelper`, `lifetimeForAgent`, `linkForExecution`; `TaskExecutionActivationWork.taskLifetime`; `RegisteredTaskActivation.plan.taskLifetime` | Task-free `registrationFor(ref)`, `taskExecutionAt(address, among)` |
| Index methods `taskLifetimeFor`, `listOwnedTaskExecutions`, `findLifetimeHelper` (Team, Org, standalone) | `taskExecutionAt(address, among)` lookup |
| `taskLifetime` in `run-execution-tree-shared-records.ts`, schemas, `task-execution-tree-projection.ts`, mutators | — (field gone) |
| `withLiveLease({recordAcceptance})`, `recordMessageAccepted`, `readExecutionDispatch` (SR-022a) | `broughtIn` started at commit; no per-message recording |
| `assertExecutionLinked` and the stamp/link cross-checks in dispatch/restore | — (one authority; nothing to reconcile) |
| `releaseTaskLifetime` on the directory boundary and the facades; the `taskLifetimes` supervisor/builder fields | `releaseTaskAgentResources`; `taskAgentResources: TaskAgentResourcePort` |

## Return Or Event Spine(s)
- **DS-F business read:** `list_project_tasks(project_id, status?)` → ProjectTaskService listing (reads that Project's `task.json` files) + `TaskAgentResourceService.currentAssignments(taskIds)` → projection.
- **DS-C mutation acknowledgement:** unchanged compact `{projectId, taskId, status}`.
- **Stop results:** never returned to the Manager or user; logged only.

## Bounded Local / Internal Spines
- **Per-Task serialization:** `serialize(taskId, fn)` is an in-process promise chain, used only by assigned linking and DONE closure.
- **View update:** after every committed write, the view is replaced for that Task. Never before commit.
- **Helper dedupe:** in-flight attempts keyed by `(taskId, address)` in the lifecycle (as today, re-keyed).

## Off-Spine Concerns
| Concern | Owner | Note |
| --- | --- | --- |
| View load at startup | Composition → TaskAgentResourceService | Awaited once, after app-data migrations (existing startup order). Reads every `*/tasks/*/agent_run_resources.json`; a damaged file is non-fatal and adds its Task to the damaged set |
| Per-Task serialization | TaskAgentResourceService | In-process promise chain per Task ID; covers assignment-link vs DONE |
| Failed-stop logging | task-agent-resource-release | One structured line per failed or unavailable root stop; no persistence (Q-1) |
| Tool projection | project-task-tool-manifest | Q-2 shape |

## Ownership Boundaries / Boundary Encapsulation
| Public boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| ProjectTaskService (+ `TaskAgentResourcePort`) | ProjectStore, context store, TaskAgentResourceService | Tools, GraphQL/REST, runtime via port | Anyone else reading/writing `<projectId>/tasks/<taskId>/agent_run_resources.json` or calling TaskAgentResourceService |
| TaskAgentResourceService | TaskAgentResourceStore, view, serialization | ProjectTaskService, composition (load) | Direct file access |
| Root facade `releaseTaskAgentResources` / fences | Lifecycle, scope, adapters, registries | Composition-bound release request; delivery paths | Projects touching adapters/indexes |

## Dependency Rules
- **Tree side:** `run-history/**` and the tree mutators/projections import **no** Agent-run-resource type (C-1).
- **Runtime side:** runtime subsystems (`agent-collaboration`, `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`, `agent-execution`) import nothing from `projects/**`. They depend only on `agent-collaboration/execution/task/task-agent-resource-port.ts` and the existing reference/identity types.
- **Projects side:** `projects/**` imports only those neutral types. It must not import runtime implementations.
- **Composition:** only `src/compositions/project-task-agent-resource-composition.ts` (called by both host compositions) binds both sides.
- **Store access:** TaskAgentResourceService is the only code touching `<projectId>/tasks/<taskId>/agent_run_resources.json`. ProjectTaskService is the only runtime-facing Task boundary. The tools and GraphQL call ProjectTaskService only.
- **Locks:** no file lock is held across the other file's write. Cross-file ordering comes from TaskAgentResourceService's per-Task serialization, not from nested locks.
- **Migration boundary:** `app-data-migrations/migrations/projects-per-folder-v1/**` may import current Projects code only to validate its output (ProjectsLayout, current readers). Current runtime code never imports the migration or its frozen reader, and never reads `projects.json`; it only checks that the file exists, for the gate.
- **Path ownership:** every path under `<appData>/projects/` comes from `ProjectsLayout`. No other code concatenates Project paths.
- **Mechanical checks** (implementation self-check):
  - `rg -n "projects/" src/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,agent-execution,run-history}` → no matches;
  - `rg -n -i "lifetime" src/run-history` → no matches;
  - `rg -n "task_context_files|task_context_drafts|projects\.json" src --glob '!src/app-data-migrations/**'` → only the gate's existence check in `project-store.ts`.

## Interface Boundary Mapping
```ts
// agent-collaboration/execution/task/task-agent-resource-port.ts — neutral; "Task" = business Task
export type TaskAgentResourceRole = 'assigned' | 'delegated' | 'broughtIn';
export type TaskAgentResourceOwner = Readonly<{ taskId: string; run: TaskExecutionReference; open: boolean }>; // taskId is opaque to runtime
export interface TaskAgentResourcePort {
  // async (writes)
  resolveAssignment(taskId: string, sender: Readonly<{ agentRunId: string; ownerTaskId?: string }>):
    Promise<Readonly<{ description: string; referenceFiles: string[] }>>;  // unknown / DONE / other-Task owner → reject
  linkRun(input: Readonly<{ hostRoot: RootExecutionIdentity; run: TaskExecutionReference; coordinatorAgentRunId?: string }
    & ({ role: 'assigned'; taskId: string; assignedBy: string }
     | { role: 'delegated' | 'broughtIn'; creator: TaskExecutionReference })>): Promise<Readonly<{ taskId: string }>>;
  markStarted(run: TaskExecutionReference): Promise<void>;
  markFailed(run: TaskExecutionReference, error: Readonly<{ code: string; message: string }>): Promise<void>;
  // sync (loaded view). ownerOf throws TASK_AGENT_RESOURCES_UNAVAILABLE only when no chain element is known and the damaged set is non-empty
  ownerOf(chain: readonly TaskExecutionReference[]): TaskAgentResourceOwner | null; // innermost linked; mixed Tasks → TASK_AGENT_RESOURCE_CONFLICT
  isOpen(run: TaskExecutionReference): boolean;
  openRuns(taskId: string, role: TaskAgentResourceRole): readonly TaskExecutionReference[];
}
// Task → runtime (bound in composition):
export type AgentResourceReleaseRequest = (hostRoot: RootExecutionIdentity, runs: readonly TaskExecutionReference[])
  => Promise<readonly AgentResourceReleaseResult[]> | null;              // null: root not active
export type AgentResourceReleaseResult = Readonly<{ run: TaskExecutionReference; stopped: boolean; error?: { code: string; message: string } }>;
// Root boundary (ActiveRootMessageBoundary + facades):
//   releaseTaskAgentResources(runs: readonly TaskExecutionReference[]): Promise<readonly AgentResourceReleaseResult[]>;
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
- Natural subjects: Task, agent run resource, role, host root, run reference, `closedAt`.
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
| Agent-run-resource types/reducers | `projects/domain/task-agent-resources.ts` |
| Physical schema | `projects/stores/task-agent-resource-schema.ts` |
| Neutral port / result types | `agent-collaboration/execution/task/task-agent-resource-port.ts` |
| Per-root fence/release policy (shared by Team/Org/standalone) | `root-task-agent-resource-scope.ts` |

## Shared Structure / Data Model Tightness Check
- **Tagged unions:** run reference (agent | team), role-dependent fields (`assignedBy`), and start-dependent fields (`startError`).
- **No optional soup:** there is no generic error or cleanup field.
- **No copied runtime facts.**

## Final File Responsibility Mapping
Paths are under `autobyteus-server-ts/src/`.

| Path | Action | Responsibility |
| --- | --- | --- |
| `projects/stores/project-store.ts` | **Rewrite** | Per-Project folder store (`project.json`, `task.json`), listing, delete rules, migration gate |
| `projects/stores/projects-layout.ts` | **Add** (replaces `projects/context/project-task-context-layout.ts`) | Single path owner + safe segments |
| `projects/context/project-task-context-store.ts` | **Modify** | Same draft/saved-file semantics via `ProjectsLayout` paths (`drafts/`, `tasks/<taskId>/context/`) |
| `app-data-migrations/migrations/projects-per-folder-v1/{projects-per-folder-v1-app-data-migration.ts,released-projects-array-v1.ts}`; `app-data-migrations/app-data-migration-registry.ts` | **Add / Modify** | Migration + frozen source reader; registration |
| `api/graphql/types/{projects,project-tasks}.ts`, REST context routes | **Inspect / keep** | Same API; `PROJECTS_MIGRATION_PENDING` surfaces through the existing `withProjectErrors` → UI alert |
| `projects/stores/{project-state-schema.ts,project-metadata-schema.ts}` | **Remove** | — |
| `projects/stores/{task-agent-resource-store.ts,task-agent-resource-schema.ts}` | **Add** | Physical `<projectId>/tasks/<taskId>/agent_run_resources.json`, invariants |
| `projects/domain/task-agent-resources.ts` | **Add** | Types + pure reducers/projections |
| `projects/domain/{project-task-execution.ts,project-task-execution-state.ts}` | **Remove** | — |
| `projects/domain/{models.ts,project-errors.ts}` | **Modify** | Drop `executionLifetimes`/lifetime codes; add `TASK_AGENT_RESOURCE_*`, `TASK_AGENT_RESOURCES_UNAVAILABLE` |
| `projects/services/task-agent-resource-service.ts` | **Add** | Authority + view + serialization |
| `projects/services/project-task-service.ts` | **Modify** | Released metadata paths + TaskAgentResourcePort + DONE/assignment orchestration; process-instance init/release |
| `projects/runtime/project-task-runtime-release.ts` → `task-agent-resource-release.ts` | **Replace** | Group, request, log |
| `compositions/project-task-lifetime-composition.ts` → `project-task-agent-resource-composition.ts`; `compositions/build-studio-server.ts`; `standalone-application-host/start-standalone-application-host.ts` | **Replace / Modify** | Async compose + load; pass `taskAgentResources` |
| `agent-execution/runtime/general-process-run-supervisor.ts`; Team/Org/standalone builders, managers, options, facades | **Modify** | Field `taskLifetimes` → `taskAgentResources: TaskAgentResourcePort`; `releaseTaskAgentResources` |
| `agent-collaboration/execution/task/{task-execution-lifetime.ts,task-lifetime-gate.ts,root-task-lifetime-scope.ts}` | **Remove** | — |
| `agent-collaboration/execution/task/{task-agent-resource-port.ts,root-task-agent-resource-scope.ts}` | **Add** | Neutral port; per-root policy |
| `agent-collaboration/execution/task/{root-task-execution-lifecycle.ts,root-task-dispatch.ts,root-task-execution-adapter.ts,task-execution-tree-projection.ts}` | **Modify** | DS-A/B order, no Task data in plans/trees, no acceptance recording |
| `agent-collaboration/execution/services/active-collaboration-root-directory.ts` | **Modify** | `releaseTaskAgentResources` |
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
- **Assigned:** inside `serialize(taskId)`, ProjectTaskService re-reads the Task metadata (it must exist and not be DONE), then TaskAgentResourceService links in the updater as above. A DONE is either entirely before (the link is rejected) or entirely after (the link is closed by it).
- **Inherited:** links only if the creator is open in the same Task file under the lock. Otherwise `TASK_AGENT_RESOURCE_CLOSED`, and no resources are acquired.
- **Own Task ID (B-1/N2):** a Task-owned run calling `delegate_task` with any `task_id` is rejected (`TASK_AGENT_RESOURCE_OWNED_SENDER`, message "workers delegate sub-work without task_id"). Only non-owned runs create `assigned` runs.
- **Failure handling** stays as today. Before acceptance: cancel/release the operation, then `markFailed`. After acceptance, or with uncertain persistence: `TaskDispatchIndeterminateError`. A `starting` run left by a crash stays `starting`, which the Manager sees as not_confirmed. That's truthful, and there's no automatic redo.
- **Helper bring-in** dedupe key is `(taskId, address)`. An existing helper is found as `adapter.taskExecutionAt(address, port.openRuns(taskId, 'broughtIn'))`.

### Fences (DS-D, DS-E)
- **Unowned agents are never checked against Task data.** An agent with an empty chain (configured member, host, @ collaborator) needs no Task data at all.
- **Message scope:** sender and recipient owned by different Tasks → `TASK_AGENT_RESOURCE_CONFLICT`. A closed sender or recipient → `TASK_AGENT_RESOURCE_CLOSED`.
- **Routing order** (unchanged): own Team instance → the Task's open helper at the address → an unowned run-wide run (`ownerOf(candidate chain) === null`) → a new `broughtIn` copy.

### DONE and stopping (DS-C)
- **Write order:** closure is committed first, then the metadata. If the metadata write fails, the runs stay closed and the stop is still requested. The caller gets the existing "could not be confirmed" error, and repeating DONE completes it.
- **What is released:** every closed run of the Task, grouped by host root, on every DONE (so repeated DONE is the retry).
- **At the root**, for each run:
  - verify it is closed in the view (otherwise result `TASK_AGENT_RESOURCE_NOT_CLOSED`, no action);
  - cancel its registration and/or committed copy synchronously, before any await;
  - **always invoke the exact release on every authority the root still holds for that run**, whether or not the run looks live. That means the registration operation's `release()` and the adapter's exact release of the committed copy, which reaches the retained DI-001/002 receipts (`releaseExactRun`, retired/failed receipts). Those owners memoize success, so a second call after a successful stop is a no-op (ARCH-REV-009 AR9-F02b);
  - report `stopped: true` only when every invoked release is accepted, or when the root holds no authority for the run at all (no registration, no committed copy, no retained receipt). Otherwise report `stopped: false` with the error.
  - A failed stop whose receipt is retained is therefore retried by every repeated DONE, and is never reported as stopped.
- **Root not active** (`null`): the root holds no authority in this process (none survives a restart), so this is logged at debug level, not as a failure.
- **Failures** are logged with taskId, hostRoot, run and error. Nothing is persisted (Q-1).

### Failure policy for a damaged Task's agent run resources file (user decision REQ-BL-009 Q-3; ARCH-REV-009 AR9-F01)
- **Load:** at composition, TaskAgentResourceService reads every `<projectId>/tasks/<taskId>/agent_run_resources.json`. A file that is unreadable, invalid, or whose `taskId` doesn't match its filename puts that Task in the view's **damaged set**. The server starts normally and logs one error per damaged file. Damage should be very rare: only the app writes these files, atomically.
- **Still works:** the whole app. That includes Chat, the Projects screens, Task create, edit, delete and non-DONE status changes, and **every Task whose file is readable**: assign, DONE, its workers, helpers and delegations. Bring-in by unowned senders also works (it is the root-wide collaborator path, not a task copy).
- **Rejected with one clear error** (`TASK_AGENT_RESOURCES_UNAVAILABLE`; message: *"Agent run resource data could not be read (`<appData>/projects/<projectId>/tasks/<taskId>/agent_run_resources.json`: <reason>). Fix or restore the file and restart the app; other features keep working."*):
  - **for the damaged Task itself:** assign and DONE;
  - **while the damaged set is non-empty:**
    - **description-only `delegate_task` by a non-owned sender** is rejected **up front**, before planning or any resources. Its new copy would have no record in any readable file, and under C-1 the runtime could not tell it from the damaged Task's runs, so its own fence checks would fail mid-dispatch;
    - **waking, messaging or restoring any copy not found in the view.** `ownerOf(chain)` returns the owner when any element is in the view. It returns `null` when none is and the damaged set is empty. When none is and the set is non-empty, it throws `TASK_AGENT_RESOURCES_UNAVAILABLE`.
- **`list_project_tasks`:** every Task is listed. A damaged Task carries `assignmentsUnavailable: true` and no `assignments` field. It never shows an empty list as if it had no assignments. GraphQL Task reads don't include assignments and are unaffected.
- **Where the user sees it** (existing surfaces, no new UI):
  - a DONE from the Projects UI shows the existing red alert (GraphQL `ProjectError` code + message → `ProjectRequestError`);
  - an agent's tool call gets the error as its result and relays it in chat;
  - a rejected message or wake shows as the existing rejected-command result.
- **Recovery:** fix or restore the file and restart. No self-repair, no automatic reload.
- **Write failure:** the view is not changed (it updates only after a commit). The caller gets the scoped error.
- **Single writer:** the platform runs one server process, which owns `<appData>/projects` (a platform fact, confirmed by the user 2026-10-05). The file lock still protects atomic replace.
- **No historical ID scan at Task creation.** Task IDs are fresh UUIDs (DESIGN.md rule 2), so `createTask` does not read `<projectId>/tasks/<taskId>/agent_run_resources.json`, and a damaged run file never blocks creating Tasks.

## Concrete Examples / Shape Guidance
- **Same root, two Tasks:** the Manager assigns A → Team T and B → Agent G in its standalone root.
  - T's member brings in `/researcher` → `broughtIn` (A).
  - G brings in `/researcher` → a separate `broughtIn` (B).
  - DONE A closes T and A's researcher and stops only those. G, B's researcher and the Manager keep running.
- **Restart:** DONE A, server restart, a message to T's coordinator → the view (loaded from disk) says closed → `TASK_AGENT_RESOURCE_CLOSED`. Nothing is restored.
- **Reopen:** A is set to TODO, then assigned → Agent W. The new `assigned` run is open. T stays closed. `list_project_tasks` shows only W.
- **Delete:** delete Task A after DONE → A's `task.json` and `context/` are removed, while `<projectId>/tasks/<taskId>/agent_run_resources.json` keeps A's closed runs, so T can never wake. New Tasks get fresh UUIDs, so they never reuse A's ID.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep reading `taskLifetime` stamps as a fallback | Rejected: two authorities again |
| Convert lifetimes to `<projectId>/tasks/<taskId>/agent_run_resources.json` | Rejected: the data never shipped |
| Treat an unreadable `<projectId>/tasks/<taskId>/agent_run_resources.json` as empty | Rejected: it would wake closed runs (B-3) |
| Persist shutdown results for diagnostics | Rejected (Q-1): logs instead |
| Keep the gate as a cache next to the view | Rejected: the view is the authority's own memory; one holder |

## Derived Layering
Transport/tools → **ProjectTaskService** (Task boundary, port) → TaskAgentResourceService / ProjectStore → files.
Runtime: lifecycle → **RootTaskAgentResourceScope** (asks the port) → adapters → provider owners.
The two sides meet only through the port and the release request, bound at composition.

## Change / Refactor Sequence
1. Add `projects-layout.ts` and the rewritten per-Project `project-store.ts` (with the migration gate); adapt the context store; delete the state/metadata schemas and the old context layout.
2. Add the migration `projects-per-folder-v1` with its frozen source reader and register it; tests per the guideline (below).
3. Add `task-agent-resources.ts`, `task-agent-resource-schema.ts`, `task-agent-resource-store.ts`, `task-agent-resource-service.ts` with unit tests (invariants, serialization, view, damaged set).
4. Rewrite the lifetime parts of `ProjectTaskService` to TaskAgentResourceService orchestration, including the DONE order (agent run resources first, then `task.json`). Remove the retained-ID collision scan from `createTask`.
5. Add `task-agent-resource-port.ts` and `root-task-agent-resource-scope.ts`. Remove the gate, the lifetime contract and the scope.
6. Lifecycle/dispatch: the link-before-register order, `isOpen` checks, `markStarted`/`markFailed`, no acceptance recording.
7. Adapters/indexes/trees/schemas: remove every Task method and field; add `registrationFor` and `taskExecutionAt`.
8. Recipient resolution, root facades `releaseTaskAgentResources`, directory, composition, supervisor, builders.
9. Tool projection (Q-2).
10. Mechanical dependency checks; retarget the tests. Docs are Delivery's (`docs/modules/projects.md` describes the new layout).

## Key Tradeoffs
- **An in-memory view loaded at startup vs a durable read per admission.** The view is cheaper, makes synchronous fences exact, and removes the gate. The cost is reading the small per-Task files once at composition, plus the scoped fail-closed behavior for a damaged file (Q-3).
- **Per-Task in-process serialization vs nested file locks.** Serialization gives the safe DONE order without cross-store lock coupling. This is correct because the platform runs a single server process (user-confirmed).
- **Logging stop failures vs persisting them.** User decision Q-1.

## Risks
- **Missing an `isOpen` check after an await in dispatch** would allow acquisition after DONE. Covered by the existing check discipline plus race tests.
- **Missing a Task-free conversion in one of the three adapters or indexes.** Covered by the mechanical grep and per-root tests.
- **A damaged Task's agent run resources file** blocks that Task's assign/DONE and, while it exists, description-only delegation and unknown copies. Accepted by the user (Q-3): very rare, the error is clear and everything else works.
- **Migration of released data:** bounded by the off-by-default feature and tiny real data; no-lockout gate; retry-safe renames; retained original. Residual risk: an unexpected hand-edited source shape is skipped with a warning, not converted.
- **Accumulation:** one small file per Task that ever had runs; each stops growing at DONE. Files are kept on Delete (closed-forever). Pruning when run history is deleted is a possible later cleanup.

## Guidance For Implementation / Verification Intent
Follow TESTING.md. The minimum controls:
- the `<projectId>/tasks/<taskId>/agent_run_resources.json` invariants and atomic writes;
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
- **migration**, with released-data fixtures committed with the tests, including a faithful copy of the real-shape sample (E-095: 1 Project, 2 TODO Tasks, no files), Projects with `task_context_files/` and drafts, a dev profile with a `{taskLifetimes}` row, an invalid row, and a duplicate `projectId`:
  - the exact target layout and content;
  - the retained `projects.pre-folders.json`;
  - empty source dirs removed;
  - statuses SUCCEEDED / SUCCEEDED_WITH_WARNINGS / FAILED as specified;
  - a retry after an interruption mid-way (some dirs moved) completes without duplication;
  - an already-migrated or fresh install is a no-op;
- **gate:** while `projects.json` exists, Projects operations reject `PROJECTS_MIGRATION_PENDING` (UI alert) and the rest of the app works. After success, the Projects list is identical to before. Both startup entrypoints (studio, standalone host) are covered;
- **per-Project store:** create/edit/delete Project and Task; listing skips folders without `project.json`/`task.json`; Delete keeps `agent_run_resources.json`; ids with unsafe segments are rejected (N5);
- no Projects import in the runtime (grep).

Real Manager journeys (Agent/Team/Org roots, DONE, reopen, restart) rerun on a changed build at API/E2E.
