# Data Model — Projects, Tasks and Agent Run Resources (REQ-BL-009, SD-AP-003; C-2/C-3/C-4 amended by the user 2026-10-05)

## Principles (user direction)
1. **The execution tree never knows about Tasks.** Team, Org and standalone tree files record runs, nesting, creator (`delegatorAgentRunId`) and source only (C-1).
2. **Each Project has its own folder, and each Task has its own folder inside it (C-3).** Project-specific files live in the Project's folder.
3. **The Task side alone records which agent runs were started for a Task**, in that Task's `agent_run_resources.json` (C-2, C-4).
4. **Neither side stores the other's facts.** A Task's agent run resources are references (host root, run IDs) plus Task-level facts (why started, did it start, is it closed). Liveness and shutdown stay in runtime memory (Q-1).
5. **Released data is moved once** by a startup migration (C-3). The app is never locked out.

## Layout
```
<appData>/projects/
└── project_7e74…/                                ← one folder per Project
    ├── project.json                              ← the Project
    ├── drafts/
    │   └── 3f2a…-uuid/                           ← temporary uploads before a Task is saved
    │       ├── manifest.json
    │       └── ctx_…__notes.md
    └── tasks/
        ├── project_task_efdc…/                   ← one folder per Task
        │   ├── task.json                         ← the Task
        │   ├── context/                          ← the Task's attached files
        │   │   └── ctx_0ad25cc6cad1__requirements.txt
        │   └── agent_run_resources.json          ← agent runs started for this Task
        └── project_task_18e5…/
            ├── task.json
            └── context/
```
- **IDs as folder names.** Project and Task IDs pass the existing safe-segment rule (no separators, no `.`/`..`; encoded) before becoming folder names, so no path can escape `<appData>/projects/`.
- **What is listed.** A folder is a listed Project only if it has a valid `project.json`, and a listed Task only if it has a valid `task.json`.
- **Optional files.** A Task folder without `agent_run_resources.json` means no agent runs were started for it, and a missing `context/` means no files.

## project.json
```jsonc
{ "projectId": "project_7e74…", "name": "Website relaunch", "description": "…",
  "createdAt": "…", "updatedAt": "…",
  "workspaces": [ { "workspaceId": "…", "workspaceRootPath": "/…", "description": "…", "addedAt": "…" } ] }
```
The same fields as a released Project row, minus `tasks`.

## task.json
```jsonc
{ "taskId": "project_task_efdc…", "projectId": "project_7e74…",
  "description": "Write the requirements doc", "status": "IN_PROGRESS",
  "createdAt": "…", "updatedAt": "…",
  "contextFiles": [ { "storedFilename": "ctx_0ad25cc6cad1__requirements.txt",
                      "displayName": "requirements.txt", "mimeType": "text/plain", "sizeBytes": 62 } ] }
```
The same fields as a released Task entry. `contextFiles[].storedFilename` names a file in this Task's `context/`.

## agent_run_resources.json
```jsonc
{ "taskId": "project_task_efdc…",
  "agentRunResources": [
    { "role": "assigned",                                  // Manager delegate_task(task_id)
      "assignedBy": "project_task_manager_882a…",
      "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
      "agentRun": { "kind": "team", "teamRunId": "docs_team_e86b…",
                    "coordinatorAgentRunId": "coordinator_2e35…" },
      "linkedAt": "…", "start": "started", "closedAt": null },
    { "role": "broughtIn",                                 // owned run's send_message_to started a copy
      "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
      "agentRun": { "kind": "agent", "agentRunId": "researcher_9a1…" },
      "linkedAt": "…", "start": "started", "closedAt": null },
    { "role": "delegated",                                 // owned run's delegate_task without task_id
      "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
      "agentRun": { "kind": "agent", "agentRunId": "analyst_51c0…" },
      "linkedAt": "…", "start": "failed",
      "startError": { "code": "TASK_DISPATCH_FAILED", "message": "…" }, "closedAt": null } ] }
```
| Field | Meaning |
| --- | --- |
| `role` | `assigned` (a non-owned run's, e.g. the Manager's, `delegate_task(task_id)`), `delegated` (an open owned run's `delegate_task` without task_id), `broughtIn` (an open owned run's `send_message_to` that started a copy). |
| `assignedBy` | Only on `assigned`: the run that made the assignment. |
| `hostRoot` | The top-level run the user started, which hosts this agent run. |
| `agentRun` | `{kind: agent, agentRunId}` or `{kind: team, teamRunId, coordinatorAgentRunId}`. |
| `linkedAt` | Written **before** any resource is acquired. |
| `start` | `starting` → `started` \| `failed` (with `startError`). Set once. |
| `closedAt` | `null` while open; DONE sets it on every open entry. **Closed is forever.** |

**Rules:**
- the file's `taskId` matches its folder;
- an agent run appears at most once in the file and is never linked to two Tasks (fresh identities; the view asserts it);
- `assignedBy` exists if and only if `assigned`; `startError` exists if and only if `failed`;
- `delegated` / `broughtIn` are written only while the creator is open (write-time rule);
- never stored: shutdown state, liveness, lineage, addresses, descriptions.

## Operations
| Operation | Files touched |
| --- | --- |
| Create Project / Task | write `project.json` / `task.json` (+ move files from the draft into `context/`) |
| Edit Task / attach files | `task.json` and `context/` |
| Manager `delegate_task(task_id)` | add an `assigned` entry `starting` **before** resources; then `started` / `failed` |
| Owned run delegates or brings in a copy | add `delegated` / `broughtIn` `starting` before resources; then `started` / `failed` |
| DONE | **first** `closedAt` on all open entries in `agent_run_resources.json`, **then** status in `task.json`; then the runtime is asked to stop those runs (not stored) |
| Repeated DONE | no file change; the stop is requested again |
| Reopen + delegate | status in `task.json`; a new open `assigned` entry |
| Delete Task | remove `task.json` and `context/`; **keep `agent_run_resources.json`** |
| Delete Project | remove `project.json`, `drafts/`, and every Task's `task.json` and `context/`; **keep every `agent_run_resources.json`** |
| Server start | load every `*/tasks/*/agent_run_resources.json` into the in-memory view |

## One-time migration from the released layout
```
before (released)                                 after
projects/projects.json  [ {project + tasks[]} ]   projects/<projectId>/project.json
                                                  projects/<projectId>/tasks/<taskId>/task.json
projects/task_context_files/<pid>/<tid>/…         projects/<pid>/tasks/<tid>/context/…   (directory rename)
projects/task_context_drafts/<pid>/<draftId>/…    projects/<pid>/drafts/<draftId>/…      (directory rename)
projects/projects.json                            projects/projects.pre-folders.json     (retained original, never read again)
```
Design details are in design-spec.md § Migration Plan.
