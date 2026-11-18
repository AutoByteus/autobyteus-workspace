# Design Spec — A delegated copy runs in its Task's Project folder (autobyteus-97)

## Solution And Approval Basis

- Current solution revision ID: SR-002
- Approved requirements: `requirements-doc.md` SR-002 (user for the rule and the tree; Solution Designer within the direction for the rest).
- Behavior-defining supplements: none.
- User approval of the design: `Not required` (the Task does not ask for it; the user is informed).
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (E-001…E-012).
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `docs/design/collaboration_model.md`, server `docs/modules/projects.md`.
- Conflicts or discrepancies: none.

## Current-State Read

All three roots do: `prepareNewCopyWork` → `resolveDelegationPlacement` (in-run placement, else catalog) → `dispatchNewCopy` (E-002). A catalog copy's folder comes from `launchBase()` (E-001); a configured placement's from its snapshot (E-003). The launch check is per folder (E-004). Nothing checks that a folder exists (E-005). The web follows the focused agent's own folder (E-008, E-011).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`: about 12 server source files plus tests and docs, within existing owners; no web change; no new contract surface beyond one error code.
- Architectural risk: `High`: where every local saved-Task and sub-work copy runs changes, on all three roots and every runtime (blast radius); the collaboration path crosses into Projects through its existing port.
- Escalation trigger: any need to change the snapshot shape, restore, or the web; a runtime that ignores the recorded folder.

## Architecture Investigation Evidence

See `investigation-notes.md` E-001…E-012.

## Intended Change

A new local copy's folder is decided once, from its Task's Project, and flows through the existing launch resolution and snapshot.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003: the Task resource port, a Projects folder reader, the root lifecycle, the shared placement resolution, catalog admission, the three roots' delegation paths, docs.
- Derived consumers: the copy's snapshot (existing field) → restore, run views, web contexts: unchanged code, new value. The launch check and the Model Router read the folder through the base: correct value now.
- Deliberately left alone: remote delegation, `assignToExistingCopy`, reactivation, `defaults_only` runs started for a peer, the web, the tool schema, Project links.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Change | Path |
| --- | --- | --- | --- | --- |
| 001 | REQ-001…004, 006; AC-001…005, 008 | `delegate_task` with an address | Folder from the Project | DS-001 |
| 002 | REQ-005; AC-006 | Same, link unusable | Refusal | DS-001 |
| 003 | REQ-008; AC-009 | Focus the copy | None in code | Existing web path (E-008, E-011) |
| 004 | REQ-007; AC-007 | Existing copy, restart | None | Existing snapshot |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: Feature.
- Current design issue found: No.
- Structural triggers: Several kinds or forms (Principle 1): saved Task, sub-work, Temp task, remote; catalog and in-run placements; Agent, Team, Org roots; Agent and Team copies: each mapped below. Repeated coordination (Principle 13): the rule has one owner (`projectFolderForNewCopy`) and one apply step in shared code; each root adds one call in its existing sequence. File size: `root-task-execution-lifecycle.ts` 466, `project-task-service.ts` 445 effective lines: the folder read lives in its own file. Ruled out: persisted-data transition (existing field), behavior by absence (`null` is the explicit "inherit" result).
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: No.

## Terminology

- **New-copy folder**: the Project's first linked folder for a new copy, or `null` (inherit the top-level run's folder).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility wrappers: None.

## Persisted Data / State Transition Decision (Mandatory)

`Not Affected`: new copies write the existing `workspaceRootPath` fields with a different value; no file shape changes.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `delegate_task` with an address | Copy started in its folder | Root delivery sequence; `projectFolderForNewCopy` decides |

## Primary Execution Spine(s)

- DS-001: `delegate_task → root delivery → lifecycle.prepareNewCopyWork → lifecycle.newCopyFolder(work) → port.projectFolderForNewCopy(projectId) → resolveDelegationPlacement(…, folder) → (in-run: sourceInFolder | catalog: launches.resolve(baseInFolder(launchBase, folder))) → dispatchNewCopy → Task link → copy activation in the recorded folder`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Each root keeps its order and adds one step, inside `delegateToResolvedTarget`'s resolve closure and before placement. `newCopyFolder(work)` reads `work.delegation.task.projectId`: `null` → `null` (Temp task); otherwise it asks the port. The port reads the Project; no link → `null`; first link not an existing directory → `TASK_PROJECT_FOLDER_UNAVAILABLE`, which reaches the agent as the tool's coded error before any Task link. The folder goes to the shared placement resolution: a catalog copy resolves its launches from a base with this folder (so the launch check and the router's context use it); an in-run placement's snapshot is rewritten. Remote delegation does not call the step: it dispatches from `RemoteDelegation.delegate`. | Root delivery (sequence); `project-new-copy-folder.ts` (rule) |

## Spine Actors / Main-Line Nodes

Root delivery (`StandaloneRootMessageDelivery`, `RootTeamRun`, `AgentOrgRunMessageDelivery`), `RootTaskExecutionLifecycle`, `TaskExecutionResourcePort` / `ProjectTaskService`, `resolveDelegationPlacement`, `CollaboratorAdmission`, `CollaboratorLaunchResolver`.

## Ownership Map

- `projects/services/project-new-copy-folder.ts` (new): first link, existing-directory check, the refusal text. One owner of the rule.
- `ProjectTaskService`: implements the port method by calling it.
- `RootTaskExecutionLifecycle.newCopyFolder`: Project or none.
- `resolveDelegationPlacement` (shared): applies the folder to both placement forms.
- `collaborator-root-port.ts` `baseInFolder`; `run-execution-tree-shared-records.ts` `sourceInFolder` (Agent launch; Team default and every member): the two pure rewrites.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

Nothing becomes unnecessary.

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

N/A beyond the file above.

## Ownership Boundaries

Collaboration reaches Projects only through `TaskExecutionResourcePort`, as today.

## Boundary Encapsulation Map

| Boundary | Callers | Forbidden bypass |
| --- | --- | --- |
| `TaskExecutionResourcePort.projectFolderForNewCopy` | `RootTaskExecutionLifecycle` | Collaboration reading Project stores or `fs.stat` on links |

## Dependency Rules

`agent-collaboration → its port`; `projects → fs`. No new direction.

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| `TaskExecutionResourcePort.projectFolderForNewCopy(projectId: string)` | One Project | `Promise<string \| null>`; throws coded `TASK_PROJECT_FOLDER_UNAVAILABLE` (added to `TASK_EXECUTION_RESOURCE_REJECTION_CODES` and `TaskDelegationErrorCode`) |
| `RootTaskExecutionLifecycle.newCopyFolder(work: NewCopyWork)` | One prepared work | `Promise<string \| null>` |
| `resolveDelegationPlacement({…, newCopyFolder: string \| null, catalogSource(folder)})`; each root's recipient method takes the folder | Placement | Explicit |
| `catalogTaskSource({address, senderRunId, work, workspaceRootPath: string \| null})` | Catalog copy | Explicit |

`DelegationWork` is not extended: it travels to peers and the router as text and Task identity, and a local path has no meaning there.

## Interface Boundary Check

All singular; identities explicit; ambiguity Low.

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| The result | "new-copy folder" | `workspaceRootPath` stays the stored and launch name |

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Launch resolution, snapshot, restore, web contexts | Reuse unchanged |
| Project read | Reuse the store the service holds |

## Subsystem / Capability-Area Allocation

`projects` (rule), `agent-collaboration` (port, lifecycle, shared placement, admission), three roots (one call each).

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

`baseInFolder`, `sourceInFolder`: used by the shared placement step only; placed with their types.

## Shared Structure / Data Model Tightness Check

No structure changes.

## Final File Responsibility Mapping

| File (under `autobyteus-server-ts/src/`) | Change |
| --- | --- |
| `projects/services/project-new-copy-folder.ts` | New: rule and refusal |
| `projects/services/project-task-service.ts` | Port method (one line) |
| `agent-collaboration/execution/task/task-execution-resource-port.ts`, `task-delegation-command.ts` | Method, code |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | `newCopyFolder` |
| `agent-collaboration/collaborators/catalog-delegation.ts` | Applies the folder to both forms |
| `agent-collaboration/collaborators/collaborator-admission.ts`, `collaborator-root-port.ts` | Folder into the base |
| `run-history/domain/run-execution-tree-shared-records.ts` | `sourceInFolder` |
| `standalone-agent-run-root/services/standalone-root-{message-delivery,recipient-resolver,collaborators}.ts` | One step, pass-through |
| `agent-team-execution/domain/root-team-run.ts` 322–335, `services/team-run-message-delivery.ts` 146–153, `services/team-run-collaborators.ts` 45 | Same |
| `agent-org-execution/services/agent-org-{run-message-delivery,recipient-resolver,run-collaborators}.ts` | Same |
| Tests: `tests/unit/projects/project-new-copy-folder.test.ts` (new), placement and resolver tests, one real-delegation case per root, restore | New/modify |
| Docs (delivery): server `docs/modules/projects.md` (Saved-ID delegation, Workspace Registration Boundary), `docs/design/collaboration_model.md` (a sentence under CM-6), `standalone_agent_run_root.md` if it states inheritance | Update |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As above; no new folders.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Root step | `delegateToResolvedTarget(async () => recipients.resolveDelegationPlacement(identity, address, work.delegation, await taskExecutions.newCopyFolder(work)), dispatch)` | Stat'ing inside `prepareNewCopyWork`, which remote delegation shares: a missing local folder would refuse a remote copy that never uses it |
| Catalog | `launches.resolve([plan], baseInFolder(port.launchBase(), folder), work)` | Rewriting the source after resolution: the launch check would have read another folder's model catalog (E-004) |
| Refusal | `Project "AutoByteus Agents" has the linked folder "/x/agents", which does not exist on this node. Fix the Project's link, or link another folder, then delegate again. Nothing was started.` | Falling back to the manager's folder |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Rewriting existing copies' folders | Rejected (REQ-007) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Projects rule and port method. 2. Shared placement and admission with `folder = null` (no behavior change). 3. Lifecycle step and the three roots. 4. Tests, real delegation. 5. Docs.

## Key Tradeoffs

- A Task's first delegation may now register a new folder in the Workspaces list (E-005). Accepted: same as any run started there, and true.
- A worker in an old folder (a kept existing copy) can start sub-work in its Task's Project folder. Accepted: the Task decides.

## Risks

- An agent with `create_project` can link any path and delegate there. No new power: agents with Bash already reach any path; the link is user-visible on the Project.
- Task work that assumed the manager's folder through relative paths: Task text with relative paths now resolves in the Project folder, which is the point of the rule; absolute `reference_files` keep working.

## Guidance For Implementation

- Reproduction: `None` (new behavior).
- Read the copy's actual working directory on at least one external runtime and the native one, not only the record.
