# Investigation Notes

## Investigation Meta

- Package identifier: `project-task-tool-context-files`
- Request / ticket: Project Task Manager delegation (2026-10-08): "Let agents attach context files when they create or update a Project Task with `create_or_update_task`, the same way the user can in the app."
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files` / `codex/project-task-tool-context-files`
- Resolved base remote / branch / revision: `origin/personal` @ `4a51482a5` (fetched 2026-10-08; `origin/HEAD` → `origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree and branch created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/project-task-tool-context-files/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-08); design gate: `references/architecture-design.md`, `design-principles.md`, worktree `DESIGN.md` (2026-10-08)
- Investigation status: Requirements (SR-002 approved) and architecture investigation complete.

## Initial Request And Clarifications

- Original request: see the delegated Task text (Problem / What exists already / What to do / Done when). Summary: `create_or_update_task` must let an agent attach files at create time and add/remove files on patch, using absolute local file paths; files are copied into the Task's saved context (same storage the UI uses), so they show in the app and a later `delegate_task` by `task_id` passes them to the worker.
- Clarifications received (2026-10-08): term is "context files" (the app's name; `contextFiles` field); support goes into `create_or_update_task` itself, no separate tool; agents never remove files — one additive `context_files` argument in both modes; recommendations accepted for file types (app parity), Tasks with no Project (reject) and compact return.
- User-supplied facts and constraints:
  - Files must be **copied** into the Task, not just referenced.
  - Keep the tool's strict argument rules and clear errors (missing/unreadable file, unknown file to remove, …).
  - Return enough to identify attached files (e.g. stored names) without making the return bulky.
  - Update tool description, `docs/modules/projects.md`, `docs/modules/agent_tools_mcp_server.md`, and tests.
  - Out of scope: other task-tool return changes (e.g. trimming `list_project_tasks`), deliberately postponed by the user.
- Initial ambiguity: which file types are allowed; behavior for Tasks with no Project; exact return shape; argument names.

## Product And Domain Understanding

- Product area: Projects → Project Tasks; agent tools (native + Agent Tools MCP).
- Affected actors or systems: Manager agents (Project Task Manager or any agent with `create_or_update_task`, which is auto-exposed wherever `delegate_task` is); app users viewing Tasks; worker agents receiving a Task by `task_id`.
- Existing purpose: Tasks carry a description plus Task-owned context files; `delegate_task({task_id})` passes the description and the saved files' absolute server-local paths to the worker.
- Terminology: *context files* (Task-owned saved copies under `<appData>/projects/<pid>/tasks/<tid>/context/`), *draft* (staging area `<pid>/drafts/<draftId>/`), *stored filename* (`ctx_<12 hex>__<stem>.<ext>`), *display name* (original filename).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | Tool schema/parser | `create_or_update_task` schema = `project_id`, `task_id`, `description`, `status`; parser allows create `{project_id, description}` and patch `{task_id, description?, status?}`; unknown keys → `PROJECT_TOOL_ARGUMENT_INVALID`; empty patch → `TASK_PATCH_REQUIRED` | Extend schema/parser |
| 2026-10-08 | Code | `.../project-task-tool-manifest.ts` | Execution and returns | Create calls `ProjectTaskService.createTask({projectId, description})` (no `contextDraft`); patch calls `updateTaskById({taskId, description?, status?})`; returns `{task: {projectId, taskId, status}}`; non-`ProjectError` failures after the call → `PROJECT_OPERATION_UNCONFIRMED` | Extend execution and return |
| 2026-10-08 | Code | `src/projects/services/project-task-service.ts` | Task authority | `createTask` accepts `contextDraft {draftId, storedFilenames}`; `updateTask` accepts `contextChanges {draftId?, addStoredFilenames?, removeStoredFilenames?}` and validates removals before any write (incl. before DONE closure); `updateTaskById` supports only description/status, ad-hoc Task first, else unique Project Task → `updateTask`; `resolveAssignment` returns saved files' absolute paths as `referenceFiles` | Path-based staging must feed this protocol |
| 2026-10-08 | Code | `src/projects/context/project-task-context-store.ts` | Byte storage | Draft `begin/upload/prepare/consume`; `upload` takes a multipart file through `writeContextFileUpload`; `prepare` makes exclusive immutable copies into the Task `context/` dir, verifies size; drafts expire after 24 h (`CONTEXT_FILE_DRAFT_TTL_MS`) | No path-based import exists |
| 2026-10-08 | Code | `src/context-files/domain/context-file-upload-policy.ts`, `services/context-file-upload-writer.ts` | Upload policy | MIME allowlist (pdf, csv, office docs, text/plain, text/markdown, json, xml, html, text/x-python, application/javascript, jpeg/png/gif/webp, several audio/video) and 25 MiB max; writer is multipart-specific (`MultipartFile`) | Path-based files need MIME from extension |
| 2026-10-08 | Command | `node -e 'require("mime-types").lookup(...)'` in `autobyteus-server-ts` | Extension → MIME | png→image/png, jpg→image/jpeg, md→text/markdown, txt/log→text/plain, json→application/json, pdf, csv, html, mp4, mov OK; `.ts`→video/mp2t, `.js`→text/javascript, `.yaml`→text/yaml, `.sh`→application/x-sh, `.py`/`.vue`/no-extension→false (all outside the allowlist) | DEC-001 |
| 2026-10-08 | Code | `src/api/rest/project-task-context-files.ts`; `autobyteus-web/services/projects/projectTaskContextClient.ts`; `composables/projects/useProjectTaskDraft.ts`; `components/projects/TaskContextFiles.vue` | UI attach path | UI: begin draft → multipart upload per file (browser-supplied MIME) → save Task with `contextDraft`/`contextChanges`. Saved files are served by stored name; images previewed inline, others downloaded | UI parity reference |
| 2026-10-08 | Code | `src/agent-collaboration/execution/task/task-execution-input.ts` (`validateTaskReferenceFiles`), `root-task-execution-lifecycle.ts` | delegate_task file rules | `reference_files` must be normalized absolute paths of existing files (`fs.stat().isFile()`); linked `task_id` delegation passes saved context paths through the same validator | Reuse the path rule for consistency |
| 2026-10-08 | Code | `src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`, `project-task-native-tools.ts` | Exposure | Native and MCP share manifest/parser; schema `ParameterType.ARRAY` with string items already used by `delegate_task` | No new exposure work |
| 2026-10-08 | Code | `src/projects/domain/ad-hoc-task.ts`, `stores/ad-hoc-task-store.ts`, docs `projects.md` §Tasks With No Project | Ad-hoc Tasks | Tasks with no Project are text-only with plain `referenceFiles` paths; no saved-context storage; no UI/GraphQL mutation | DEC-002 |
| 2026-10-08 | Doc | `autobyteus-server-ts/docs/modules/projects.md` (§Exactly Four Agent Tools, §Task Context Bytes, §GraphQL And REST); `docs/modules/agent_tools_mcp_server.md` (§Project Task Data Tools) | Current contract text | Docs state "no context upload/edit/delete tool" and "No … Task attachment mutation" — must change | Docs update |
| 2026-10-08 | Doc | `.claude/skills/project-task-management/SKILL.md` (superrepo) | Main consumer | Skill says to create Tasks with `create_or_update_task` and write descriptions; no file guidance | Follow-up candidate (agent package), not in this ticket |
| 2026-10-08 | Code | `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`, `project-task-business-results.test.ts`; `tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Existing tests | Tool contract and service boundary suites exist | Extend |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Agent calls `create_or_update_task` create mode | `{project_id, description}` → new TODO Task with `contextFiles: []` | Agent cannot attach files; any other key is rejected | contract.ts L98-125; manifest L66-78 | High |
| BEH-002 | Contract | Agent calls `create_or_update_task` patch mode | `{task_id, description?, status?}` → patch text/status; saved context preserved | Agent cannot add or remove files | contract.ts; service `updateTaskById` | High |
| BEH-003 | User | User creates/edits a Task in the app and attaches/removes files | Draft upload (allowlisted MIME, ≤25 MiB) → Save publishes immutable copies in the Task `context/`; removals cleaned after commit | Files listed on the Task; image preview; download | REST routes, web composable, service | High |
| BEH-004 | Contract | `delegate_task({recipient_address, task_id})` | Saved description + saved files' absolute paths are put in the worker's first message as "Reference files" | Missing saved bytes fail the delegation | `resolveAssignment`, `validateTaskReferenceFiles` | High |
| BEH-005 | Contract | `create_or_update_task` patch on a Task with no Project | Description/status patch; returns `projectId: null` | Ad-hoc Tasks have no saved context storage | service `updateTaskById` | High |
| BEH-006 | Contract | `list_project_tasks` | Returns each Task's `contextFiles` (metadata, locator, validated `localPath`) | Agents can discover stored filenames | manifest `taskBusinessRead`; docs | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `ProjectTaskService.createTask/updateTask` | Publishes context via drafts; input errors rejected before writes | Path-based attach can reuse the same publication semantics | Stage local files into a draft inside the service, then use the existing protocol |
| `ProjectTaskContextStore.upload` | Multipart only | Need a path-based import with same policy | Neutral writer generalization vs. new local-file import |
| `context-file-upload-policy.ts` | Single owner of MIME allowlist / size cap | Parity with UI requires same policy | MIME derived from file extension for path sources |
| `validateTaskReferenceFiles` | Normalized absolute path + regular file | Same path rule for consistency with `delegate_task` | Reuse rule text/semantics; owner is agent-collaboration |
| `ProjectError` codes | `TASK_CONTEXT_INVALID`, `TASK_CONTEXT_NOT_FOUND` exist | Clear errors per failure kind | Possibly add a code for unavailable source file |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `<appData>/projects/<pid>/tasks/<tid>/task.json` (`contextFiles[]`), `context/` bytes, `<pid>/drafts/<draftId>/` staging.
- Readers/writers: ProjectTaskService/ProjectTaskContextStore; GraphQL `projectTasks`; REST context-file read; `/ws/projects` change feed; `resolveAssignment`.
- No schema change: `ProjectTaskContextFile {storedFilename, displayName, mimeType, sizeBytes}` is reused as-is.

### Structural Surfaces

- Agent tool contract (schema, parser, description) – shared native + MCP.
- ProjectTaskService command types (`UpdateTaskByIdCommand`, `CreateProjectTaskCommand`).
- ProjectTaskContextStore import path.

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — agent tool input and (conditionally) return.
- Persistence schema or invariant change: No (same records/bytes).
- Security or privacy boundary change: Minor — the server copies an agent-named local file into app data. Agents already pass arbitrary node-local paths to workers via `delegate_task.reference_files` and usually have filesystem tools; the server process reads with its own permissions.
- Concurrency or lifecycle change: No new lifecycle; reuse draft/publish.
- Deployment/migration: None.
- Confirmed: no migration, no UI change needed (UI already renders saved context files).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| mime-types lookup (above) | Path → MIME | Many code/config extensions map outside the allowlist or to nothing | Parity means agents cannot attach `.ts`, `.yaml`, `.py`, `.sh`, extensionless files | DEC-001 |
| Request report | PTM couldn't attach pasted screenshots (`/private/tmp/...png`) | Screenshots are PNG → allowed under parity | Primary scenario satisfied by parity | Task description |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via Project Task Manager (2026-10-08) | Attach chat screenshots to created Tasks so workers get them | Direct report | Create-with-files and later add/remove | File-type breadth (DEC-001) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `mime-types` | `^3.0.2` (server package.json) | Extension → MIME lookup | probe above | Extension-based only; no content sniffing |

## Persisted Data And State Facts

- Affected subject: Task `contextFiles` and `context/` bytes (existing shape).
- Volume: per-file ≤ 25 MiB.
- Readers/writers: unchanged set; new writer entry is the agent tool through the service.
- Preserve: existing Tasks and files untouched; no migration.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated` — no UI change requested; the app already displays saved context files.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | – | – | – | – | – | – |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Extension-based MIME may reject common code/config files under UI parity | Agents may want to attach logs/configs | DEC-001 user decision | Open |
| RSK-002 | Risk | Server copies any readable file the agent names | Data copied into app data | Same trust level as `delegate_task.reference_files`; recorded, no new policy | Accepted (proposed) |

## Architecture Investigation Findings

| Date | Source | Observation | Design implication |
| --- | --- | --- | --- |
| 2026-10-08 | `project-task-service.ts` L95-143, L364-381 | `PreparedTaskContext {files, draftId?, consumed}`; `consume` no-ops without a draft; `validatePrepared` re-checks saved bytes inside the Task lock; `closeAndWrite` only wraps the metadata write | A draft-less prepared context from local files can reuse create/update commit unchanged; importing before `closeAndWrite` keeps "no DONE closure on input error" |
| 2026-10-08 | `project-task-context-store.ts` `prepare` | Copy pattern EXCL → containment → size → utimes | Reuse pattern for local import |
| 2026-10-08 | `src/api/graphql/types/project-tasks.ts` L174-181 | GraphQL passes its `input` straight to `createTask`/`updateTask` | Local-path input must not be a field of those commands → separate tool-facing entrypoints |
| 2026-10-08 | `rg "TaskAcknowledgementView\|updateTaskById"` | Used only by the tool manifest and the service | Safe to extend the ack with `attachedContextFiles` |
| 2026-10-08 | `task-delegation-tool-parameter-schemas.ts` | ARRAY + `arrayItemSchema {type:"string"}` already used on native+MCP | Same schema for `context_files` |
| 2026-10-08 | `src/api/rest/project-task-context-files.ts` | REST maps unknown ProjectError codes to 400; it never produces the new code | New code `TASK_CONTEXT_FILE_UNAVAILABLE` is tool-only in practice |
| 2026-10-08 | `tests/unit/projects/project-task-context-store.test.ts`, `tests/unit/agent-tools/project-tasks/*`, `tests/e2e/projects/project-task-boundaries.e2e.test.ts` (API-MCP case) | Existing suites to extend | Verification plan |

## Requirement Implications

- Path-based attach must produce exactly the same saved-context records as the UI (same storage, same policy) so the app and `delegate_task` need no change.
- Strict argument rules and all-or-nothing input validation already exist in the service (removals validated before writes; DONE closure only after input validation); path validation must also happen before any write.
- Ad-hoc Tasks have no saved-context storage → context arguments need a defined rejection.
- The return change must stay minimal and only where files changed (user postponed other return changes).

## Notes For Architecture Design

- Verify whether staging through a server-owned draft (begin → import local file → existing `contextDraft`/`contextChanges`) satisfies validation-before-write and cleanup on failure.
- Decide neutral byte-writer generalization (stream + MIME) vs. separate local import.
- Decide error codes for unavailable source vs. invalid input.
