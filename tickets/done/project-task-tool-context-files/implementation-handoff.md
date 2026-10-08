# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Medium / High) and passed as `ARCH-REV-001`, with no blocking findings. `get_handoff_rules` returns `/software_engineering_team/code_reviewer` for a completed Large-or-High implementation.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/requirements-doc.md` (SR-002, Approved)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/design-spec.md` (SR-003, Ready)
- Design-complete handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/handoff-architecture-design-complete.md`
- Supplemental task artifacts: None. Product design artifacts: N/A — not applicable.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/design-review-report.md` (Pass, round 1)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Triggering rework report, revision record, or evidence: N/A (initial implementation). The non-blocking review recommendations R-1, R-2 and R-3, plus the P-001 / copy-then-`utimes` / import-before-DONE notes, were resolved in place (see below).

## Current Implementation Summary

`create_or_update_task` now takes one optional, additive `context_files` argument (an array of absolute node-local file paths) in both create and patch mode. The tool contract checks only its shape. The manifest calls two tool-facing `ProjectTaskService` entrypoints: the new `createTaskWithLocalContextFiles` and the extended `updateTaskById`. The service runs a new draft-less `ProjectTaskContextStore.importLocalFiles`. It validates every source first, then copies each one exclusively into the Task's `context/` directory, and returns the same `PreparedTaskContext` shape the draft path produces. The existing in-lock `validatePrepared` plus metadata commit publishes the copies, appended to the current list. `createTask` / `updateTask` (GraphQL/UI, draft-based) keep their signatures and behavior; they now delegate to shared private `create` / `update` bodies. The tool returns `attachedContextFiles: [{storedFilename, displayName}]` only when the call attached files.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Implementation commit: `741b05131` on `codex/project-task-tool-context-files` (base `4a51482a5`, origin/personal at design time)
- Related solution revision IDs: `SR-002` (requirements), `SR-003` (design)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (non-blocking recommendations R-1, R-2, R-3 from ARCH-REV-001 applied)

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec §Task Size And Architectural Risk; confirmed by design-review-report §Routing Classification Review.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 7 production files in the planned owners, +202/−56 source lines, no new folder, route or persistence shape. All three risk drivers are real in the code: the shared native/MCP tool contract changed, the server now reads agent-named local files into app data, and the `ProjectTaskService` create/update bodies that carry the validation-before-write and DONE-closure ordering were restructured. The escalation trigger did not fire: the `prepare → validatePrepared → commit` protocol carries draft-less copies unchanged, and GraphQL/REST are untouched.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High-risk route; independent code review applies)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Create accepts optional `context_files`; copies saved; strict create rules kept | `parseProjectTaskToolInput` (contract) → `executeProjectTaskTool` → `ProjectTaskService.createTaskWithLocalContextFiles` → private `create` → `ProjectTaskContextStore.importLocalFiles` → `ProjectStore.createTask` (in-lock `validatePrepared`) → `taskChanged` → ack | Implemented. A create with no files (or `[]`) goes through the same entrypoint with an empty list: no fs work, unchanged ack |
| BEH-002 | Patch accepts `context_files`, additive, may be files-only; DONE semantics kept | `updateTaskById` → `uniqueTask` → private `update` (`assertOwner` → `importLocalFiles` → `store.updateTask` append, or `closeAndWrite` for DONE) | Implemented. `meaningful` counts `prepared.files.length` (R-2), and the list is written as `[...current, ...prepared.files]` under the Task lock. The import runs before `closeAndWrite` |
| BEH-003 | Same saved context, policy and record shape as UI uploads | `importLocalFiles` writes into `layout.contextDir`, `buildStoredFilename`, `ProjectTaskContextFile {storedFilename, displayName, mimeType, sizeBytes}`; policy via `contextFileMimeTypeForPath` + `CONTEXT_FILE_MAX_BYTES` | Implemented. Readers (GraphQL, REST, feed, `list_project_tasks`) are unchanged |
| BEH-004 | `delegate_task({task_id})` passes agent-attached files | Unchanged `resolveAssignment` → `savedFile` per record | Verified at unit level: `resolveAssignment(...).referenceFiles` equals the saved copies' paths |
| BEH-005 | `context_files` on a Task with no Project is rejected | `updateTaskById` ad-hoc branch throws `TASK_CONTEXT_INVALID` before any write | Implemented. A text/status patch of an ad-hoc Task is unchanged |
| BEH-006 | Return adds `attachedContextFiles` only when files were attached | Manifest `taskAcknowledgement(ack, attached)` projects `{storedFilename, displayName}` and omits the field when empty. Service ack `attachedContextFiles` is optional (R-1) | Implemented. Plain calls return exactly `{projectId, taskId, status}` (existing assertions unchanged) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No UI, GraphQL or REST change; no removal argument; no new tool; the upload policy is unchanged; the PTM skill is untouched.

## Key Files Or Areas

Production (`autobyteus-server-ts/src/`):
- `agent-tools/project-tasks/project-task-tool-contract.ts` adds the `context_files` ARRAY schema param (`arrayItemSchema: {type: "string"}`) and parameter description. The tool description is extended. The parser allows `context_files` in both modes, requires an array of non-blank strings (trimmed; holes rejected), and counts a non-empty `context_files` as a change for patch-required.
- `agent-tools/project-tasks/project-task-tool-manifest.ts`: create → `createTaskWithLocalContextFiles`; patch → `updateTaskById({..., localContextFiles})`; compact conditional `attachedContextFiles` projection.
- `projects/services/project-task-service.ts`:
  - new public `createTaskWithLocalContextFiles`;
  - private shared `create(projectId, description, prepareContext)` and `update(projectId, taskId, patch, ContextUpdate)` bodies;
  - `createTask` / `updateTask` delegate to these bodies with unchanged signatures;
  - `updateTaskById` gains files, the ad-hoc rejection and the optional ack field.
- `projects/context/project-task-context-store.ts`: new `importLocalFiles` with phase 1 (validate all) and phase 2 (copy, verify, `utimes`, and cleanup on failure), plus the `localContextSource` path rule.
- `context-files/domain/context-file-upload-policy.ts`: `contextFileMimeTypeForPath` (`mime-types` lookup, allowlist-gated).
- `projects/domain/models.ts`: `CreateTaskWithLocalContextFilesCommand`, `UpdateTaskByIdCommand.localContextFiles?`, `TaskAcknowledgementView.attachedContextFiles?`.
- `projects/domain/project-errors.ts`: `TASK_CONTEXT_FILE_UNAVAILABLE`.

Docs: `autobyteus-server-ts/docs/modules/projects.md` covers the tool table, `context_files` rules, errors, return, and the Task Context Bytes import path. The stale "no context upload/edit/delete tool" statement is now "no context removal/edit tool". `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` covers the `create_or_update_task` bullet; "Task attachment mutation" is now "Task attachment removal".

Tests:
- New `tests/unit/projects/project-task-local-context-files.test.ts` (18 cases).
- Extended `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`: schema/description test plus 13 parser cases.
- Extended `tests/unit/agent-tools/project-tasks/project-task-business-results.test.ts`: native/MCP create+patch return, and invalid-file parity for native and MCP.

## Important Assumptions

- ASM-001: the server process can read files the agent names (same node, same OS user). An unreadable file gets `TASK_CONTEXT_FILE_UNAVAILABLE`.
- `context_files` entries are trimmed by the parser, as `validateTaskReferenceFiles` trims reference files. The display name is `path.basename` of the (symlink-unresolved) path the agent supplied.
- A non-empty `localContextFiles` is passed to the service only when the tool argument is non-empty. An empty list on patch is rejected earlier by the parser (`TASK_PATCH_REQUIRED`), and the service enforces the same rule itself.

## Known Risks

- RSK-001 (accepted, DEC-001): typing is by extension only, so `.ts` (`video/mp2t`), `.js` (`text/javascript`, not the allowlisted `application/javascript`), `.py`, `.yaml`, `.sh` and extensionless files are rejected. Verified against the installed `mime-types`.
- RSK-002 (accepted, ASM-002): the server copies any readable regular file the agent names, at the server process's permissions. This is the same trust level as `delegate_task.reference_files`.
- The normalized-absolute path rule is repeated from `validateTaskReferenceFiles`, as designed (dependency direction). Drift risk is low.
- If phase 2 fails or the commit fails after the import, the context directory the call created stays (empty, or holding unreferenced copies if the commit itself failed). The draft path behaves the same way; the residual risk is accepted in the review.
- `updateTaskById` for a Project Task no longer builds a full `ProjectTaskView` after the write; the old path built one and then discarded everything but `status`. The view build cannot throw on missing bytes, so this removes only redundant work. The ack still comes from the committed record.
- The patch-required message is now "Supply description, status and/or context_files to update a Task." (parser) and "… and/or context files …" (service `updateTaskById`). The code `TASK_PATCH_REQUIRED` is unchanged, and the GraphQL `updateTask` message is unchanged.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found` (missing capability)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` beyond the planned local extraction of shared create/update bodies
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: The extraction keeps one commit path for both context sources. Every existing `tests/unit/projects` case (191 before the new file) passes unchanged. The manifest depends only on `ProjectTaskService`; `importLocalFiles` is called only by the service.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`. The manifest no longer calls `createTask`, which remains in use by GraphQL. The stale doc statements were rewritten.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. Local paths live only on the tool-facing command types. `TaskAcknowledgementView.attachedContextFiles` is optional and present only when files were attached.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`. The largest changed file is `project-task-service.ts` at 440 effective lines (+78/−41). The largest delta is 119 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Not Affected`
- Design-spec decision reference: design-spec §Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: new records use the existing `ProjectTaskContextFile` shape (asserted in the AC-001 unit test against `task.json`).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no `node_modules`. I ran `pnpm install --frozen-lockfile` with no lockfile change, then `pnpm -C autobyteus-server-ts prebuild` and `build`.
- `prebuild` (`prepare:shared`) leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` in the worktree. They are build outputs and are not committed.
- The branch is 6 commits behind `origin/personal` (workspace-history archive work, including `dc70e7f44`, which repairs stale base tests). None touch the changed files. Integration is left to delivery.

## Local Implementation Checks Run

These are implementation-scoped checks, not API/E2E sign-off.

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`: pass.
- `pnpm -C autobyteus-server-ts typecheck`: exits 2 only on pre-existing `TS6059` (`rootDir` excludes `tests/`) for every test file, the same on base. With TS6059 filtered out there are 0 errors, test files included. **Discrepancy:** the `typecheck` script as written cannot pass in this repo.
- `pnpm -C autobyteus-server-ts exec vitest run tests/architecture tests/unit/projects tests/unit/agent-tools tests/unit/context-files --no-watch`: 65 files, 517 tests pass. This includes the 18 new local-context cases, the 87 tool cases and the architecture boundary tests.
- Mutation check: removing `prepared.files.length > 0` from `meaningful` makes the AC-002 files-only patch test fail. The source was restored.
- `tests/unit/api` + `tests/unit/agent-collaboration`: 370 pass, 6 fail. The 6 failures (`workspace-converter`, `studio-application-api-services`, `memory-view-member-resolver`, `api/graphql/types/projects.test.ts`) fail identically on the untouched base (verified by stashing). They are pre-existing and are fixed upstream by `dc70e7f44`.
- `pnpm -C autobyteus-server-ts build`: pass, including the built-in agents bootstrap smoke.
- Existing E2E suites, run only as a regression check (no new E2E authored):
  - `vitest run tests/e2e/projects`: 4 files and 24 tests pass; the gated files are skipped.
  - With `RUN_AGY_FAILURE_E2E=1` and the fake AGY CLI, the `ad-hoc-task-delegation`, `task-closure-root-visibility`, `task-reactivation-root-visibility` and `project-change-feed` suites give 17 passed and 1 skipped (the Claude-gated case).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: the change is server-only. The app already renders Task `contextFiles` and no UI changed. In-app visibility of an agent-attached screenshot is the user-verification step (AC-010).

## Downstream Coverage Hints / Suggested Scenarios

- Server E2E through the real MCP tool path (design §Guidance; `tests/e2e/projects/project-task-boundaries.e2e.test.ts`):
  - create with `context_files` = [png, md];
  - patch files-only, then patch with description/status;
  - read the Task via GraphQL `projectTasks` / REST `context-files/:storedFilename`;
  - assert the bytes, display names, and an image MIME for preview (AC-001, AC-002, AC-006 after deleting the sources).
- Linked delegation: `delegate_task({recipient_address, task_id})` for a Task with agent-attached files should list the saved copies' paths as Reference files in the worker's first message (AC-010). It can extend the fake-AGY `ad-hoc-task-delegation` harness, which already exercises linked delegation by `task_id`.
- Error contract through MCP:
  - a relative path, a missing file, an unsupported type and a duplicate each return `isError: true` with `{error: {code, message}}` naming the path, and leave nothing changed;
  - `context_files` on an ad-hoc Task (created by a described `delegate_task`) returns `TASK_CONTEXT_INVALID`;
  - DONE plus an invalid file must not close the runs (AC-005, AC-007).
- Exposure parity: the `create_or_update_task` schema seen by Claude/Codex sessions through Agent Tools MCP shows `context_files` as `{type: "array", items: {type: "string"}}` (AC-011).
- Real-app user verification (Done-when): an agent attaches a pasted screenshot under `/private/tmp/...`; the Task in the app shows the file with image preview, and it survives deletion of the temp file.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All server E2E coverage for the new argument (above) is still required and owned by `api_e2e_engineer`. No new E2E was authored here.
- AC-010 worker-message verification through a real delegation path.
- MCP schema rendering for each runtime that consumes Agent Tools MCP.
- User verification in the app (preview and download of agent-attached files).
