# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-002, approved by the user in conversation on 2026-10-08 ("Yeah, exactly … Just make only one parameter. The context files are additive.")
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-08): `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md`, project `DESIGN.md` (repository root of the worktree); `autobyteus-server-ts/AGENTS.md` (testing commands). No closer `DESIGN*.md` under `autobyteus-server-ts`. `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None. Root `DESIGN.md` "smallest solution / preserve guarantees" is applied: no new subsystem, no draft staging for agent files, no new persistence shape.

## Current-State Read

- Agent tool: `src/agent-tools/project-tasks/project-task-tool-contract.ts` (schema, descriptions, strict parser) and `project-task-tool-manifest.ts` (execution, projections, error projection) are shared by native tools (`project-task-native-tools.ts`) and Agent Tools MCP (`project-task-tools-mcp-adapter-provider.ts`). Create calls `ProjectTaskService.createTask({projectId, description})`; patch calls `ProjectTaskService.updateTaskById({taskId, description?, status?})`. The return is `{task: {projectId, taskId, status}}`.
- Task authority: `ProjectTaskService` (`src/projects/services/project-task-service.ts`) owns Task metadata, context publication and DONE orchestration. Context is published only by the Task metadata save: `ProjectTaskContextStore.prepare` (`src/projects/context/project-task-context-store.ts`) makes immutable exclusive copies into `<appData>/projects/<pid>/tasks/<tid>/context/` and returns a `PreparedTaskContext`. `createTask` / `updateTask` then validate those copies inside the Task lock and commit `contextFiles` metadata. Input errors are rejected before any write, including before the DONE closure (`closeAndWrite`).
- Today the only source of bytes is a UI draft (multipart upload under the shared policy in `src/context-files/domain/context-file-upload-policy.ts`: MIME allowlist, 25 MiB).
- `updateTaskById` resolves ad-hoc Tasks first (no context storage), else the unique Project Task → `updateTask`.
- `resolveAssignment` (linked `delegate_task`) already hands every saved context file path to the worker. No change is needed there.
- No coupling or ownership problem was found. The gap is a missing source type ("local file path") for the existing publication protocol, plus the missing tool argument.

Evidence: investigation notes §Source Log and §Architecture Investigation Findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 7 production files inside two existing capability areas (agent-tools/project-tasks and projects; one constant/function in context-files policy), plus 2 docs and unit/E2E tests. No new subsystem, route, persistence shape or migration.
- Architectural risk: `High`
- Risk rationale:
  1. It changes a shared agent-facing tool contract (new `context_files` argument, new conditional `attachedContextFiles` return field) used by every runtime via native and MCP exposure. `create_or_update_task` is auto-exposed wherever `delegate_task` is.
  2. It adds a new path by which the server reads an agent-named node-local file and copies it into app data (security-adjacent; trust level documented as equal to `delegate_task.reference_files`).
  3. It restructures `ProjectTaskService` create/update internals that carry the validation-before-write and DONE-closure ordering invariants.
  Each is bounded, but each is a material contract/security/ordering surface, so independent review is warranted.
- Escalation trigger: if implementation finds that the existing `prepare → validatePrepared → commit` protocol cannot carry no-draft local copies without changing its publication semantics, or that GraphQL/REST would need to change, stop and return a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `project-task-service.ts` L95-168, L364-381 | `PreparedTaskContext {files, draftId?, consumed}`; `consume` is a no-op without a draft; `validatePrepared` re-checks bytes inside the lock | Local files can produce a draft-less `PreparedTaskContext` and reuse the commit path unchanged | None |
| Code read | `project-task-context-store.ts` `prepare` L71-97 | Copy pattern: `layout.directory(target, true)` → `fs.copyFile(..., COPYFILE_EXCL)` → `layout.regular` → size check → `utimes` | Same copy pattern for local sources; no draft hop | None |
| Code read | `context-file-upload-policy.ts`, `context-file-upload-writer.ts` | Policy is the single owner of the allowlist/cap; the writer is multipart-only | Add a path→MIME policy function beside the allowlist; do not route local files through the multipart writer | None |
| Code read | `src/api/graphql/types/project-tasks.ts` L174-181 | GraphQL passes its declared `input` object straight to `createTask` / `updateTask` | Keep local-path capability off the GraphQL-reachable commands: separate tool-facing service entrypoints | None |
| Code read | `task-execution-input.ts` `validateTaskReferenceFiles` | Rule: `path.isAbsolute(p) && path.normalize(p) === p`, `fs.stat().isFile()` | Same rule text in the Projects store (no dependency on agent-collaboration) | None |
| Code read | `task-delegation-tool-parameter-schemas.ts` | `ParameterType.ARRAY` + `arrayItemSchema: {type: "string"}` works on native + MCP | Same schema shape for `context_files` | None |
| Probe | `mime-types` lookup (investigation notes) | Extension → MIME; screenshots/docs/text map into the allowlist | Policy function `contextFileMimeTypeForPath` | Extension-only typing (accepted, REQ-004) |

## Intended Change

Add one optional additive argument, `context_files` (absolute local file paths), to both modes of `create_or_update_task`. The tool passes it to two explicit tool-facing `ProjectTaskService` entrypoints. The service copies the files into the Task's saved context through a new local-file import in `ProjectTaskContextStore` that produces the same `PreparedTaskContext` the draft path produces. The existing in-lock validation and metadata commit then publish them, and the DONE closure ordering is unchanged. The tool returns `attachedContextFiles: [{storedFilename, displayName}]` only when files were attached.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, 003-006, 008, 009, 012 / AC-001, 004-006, 008, 009 | Agent calls `create_or_update_task` create | Text-only create (notes BEH-001) | Create with copied files; strict rules kept | DS-001 |
| BEH-002 | Contract | REQ-002, 003-006, 008, 009 / AC-002-006, 008, 009 | Agent calls patch | Text/status patch (BEH-002) | Additive files; may be files-only; DONE semantics kept | DS-002 |
| BEH-003 | User | REQ-004, 005, 010 / AC-001, 006, 010 | User views the Task in the app | UI shows `contextFiles` (BEH-003) | Agent files are indistinguishable records in the same storage | DS-001/DS-002 commit → existing GraphQL/feed readers (unchanged) |
| BEH-004 | Contract | REQ-010 / AC-010 | `delegate_task({task_id})` | `resolveAssignment` passes saved paths (BEH-004) | Unchanged; now includes agent-attached files | DS-003 (existing, unchanged) |
| BEH-005 | Contract | REQ-007 / AC-007 | Patch of an ad-hoc Task with `context_files` | Ad-hoc text/status patch (BEH-005) | Reject before any write | DS-002 (ad-hoc branch) |
| BEH-006 | Contract | REQ-009 / AC-001, 002, 004, 009 | Tool return | `{task:{projectId,taskId,status}}` | Conditional `attachedContextFiles` | DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers considered:
  - *Authoritative-boundary trigger:* the tool must not call `ProjectTaskContextStore` directly. It calls only `ProjectTaskService`, and the service is the only caller of the store. This trigger does not fire.
  - *Duplicated policy:* MIME/size policy stays in `context-file-upload-policy.ts`, and a path→MIME function is added there. The two-line absolute/normalized path rule repeats `validateTaskReferenceFiles`. Making Projects depend on agent-collaboration execution code would invert dependency direction, so the repetition is accepted and recorded below. This does not fire materially.
  - *Ambiguous-boundary trigger:* adding `localContextFiles` to the GraphQL-reachable `CreateProjectTaskCommand` / `UpdateProjectTaskCommand` would give one command two context sources, one of them server-local, on a surface reachable from remote UI clients. This is rejected. Local files enter only through tool-facing entrypoints (`createTaskWithLocalContextFiles`, `updateTaskById`).
  - *Empty indirection:* no new layer is added; the store method owns real validation and copy work.
  - *Responsibility overload:* `ProjectTaskService` grows by one public method and a private shared create/update body. The file stays within its declared Task-subject boundary.
- Root cause classification: `No Design Issue Found` (missing capability, not a defect)
- Refactor needed now: `No`. Only a local extraction is needed: the bodies of `createTask` / `updateTask` become private shared bodies parameterized by a context-preparation step, so both sources share one commit path.
- Evidence: Current-State Read above.
- Design response: extend existing owners: tool contract/manifest, service, context store, policy.
- Refactor rationale: the extraction avoids a second copy of the create/update commit logic (duplicated invariants).
- Intentional deferrals and residual risk: the path rule text is duplicated with `validateTaskReferenceFiles`. The residual risk is drift between the two rules, which is low because both are documented as "normalized absolute path".

## Terminology

- *Local context file*: a node-local absolute file path an agent supplies in `context_files`; the source of a copy, never referenced afterwards.
- *Attached context files*: the saved records a single call created.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The design adds an additive capability and replaces nothing, so there is no legacy path to remove. Doc statements "There is no … context upload/edit/delete tool" (`projects.md`) and "No … Task attachment mutation" (`agent_tools_mcp_server.md`) become false and are rewritten.

## Persisted Data / State Transition Decision

- Stored subject: Task `task.json` `contextFiles[]` and `context/` bytes; per-file ≤ 25 MiB.
- Change: none to shape. New records use the existing `ProjectTaskContextFile {storedFilename, displayName, mimeType, sizeBytes}`.
- Readers/writers: unchanged readers (GraphQL, REST read, feed, `list_project_tasks`, `resolveAssignment`).
- Decision: `Not Affected` (new writes in the existing shape; no existing record changes meaning).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Agent tool call (create + `context_files`) | Committed Task with `contextFiles`; change feed; tool return | `ProjectTaskService` | Core create path |
| DS-002 | Primary End-to-End | BEH-002, BEH-005 | Agent tool call (patch + `context_files`) | Appended `contextFiles` (+ optional text/status/DONE); tool return | `ProjectTaskService` | Additive patch; DONE ordering |
| DS-003 | Primary End-to-End (existing, unchanged) | BEH-004 | `delegate_task({task_id})` | Worker first message with Reference files | `ProjectTaskService.resolveAssignment` | Done-when proof |
| DS-004 | Return-Event | BEH-006 | Service result | Tool JSON `{task: {..., attachedContextFiles?}}` | Tool manifest | Compact identification |
| DS-005 | Bounded Local | BEH-001, BEH-002 | `importLocalFiles(sources)` | `PreparedTaskContext` or thrown error with partial copies removed | `ProjectTaskContextStore` | All-or-nothing input handling |

## Primary Execution Spine(s)

- DS-001: `Agent (native/MCP) -> create_or_update_task parser -> tool manifest -> ProjectTaskService.createTaskWithLocalContextFiles -> ProjectTaskContextStore.importLocalFiles -> ProjectStore.createTask (in-lock validatePrepared) -> change feed -> tool return`
- DS-002: `Agent -> parser -> manifest -> ProjectTaskService.updateTaskById -> [ad-hoc: reject if files] -> applyUpdate -> importLocalFiles -> (DONE ? closeAndWrite : write) ProjectStore.updateTask (append) -> change feed -> tool return`
- DS-003 (unchanged): `delegate_task({task_id}) -> resolveAssignment -> savedFile paths -> validateTaskReferenceFiles -> work packet "Reference files"`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The parser checks argument shape (array of non-blank strings). The manifest calls the tool-facing create. The service checks the Project exists, generates the taskId and imports the local files into that Task's context dir, which validates all files first, then copies them. The Task is then created with `contextFiles = prepared.files` through the existing in-lock validation, and the feed is marked. The tool returns the ack plus the attached files. | Tool contract, ProjectTaskService, Task context | ProjectTaskService | MIME/size policy; path rule |
| DS-002 | The parser accepts `context_files` in patch mode and enforces "at least one change". `updateTaskById` resolves the Task. An ad-hoc Task with files is rejected before any write. For a Project Task, the shared update body validates the description/status, imports the files (all-or-nothing), then runs the existing write (or DONE `closeAndWrite`), appending the prepared files to the current list under the Task lock. It returns the ack plus the attached files. | Same | ProjectTaskService | Same |
| DS-004 | The manifest projects `attachedContextFiles` to `{storedFilename, displayName}` and omits the field when empty. | Tool manifest | Manifest | – |
| DS-005 | Phase 1 validates every source: path shape, uniqueness, `stat` regular file (following symlinks), `R_OK` access, size ≤ cap, allowlisted type. Phase 2 creates the context dir, then for each source copies exclusively to a generated stored name, checks containment and copied size ≤ cap, and touches the mtime. If phase 2 fails, it best-effort unlinks the copies made in this call and throws. | Context store | ProjectTaskContextStore | Upload policy |

## Spine Actors / Main-Line Nodes

Tool contract (parser) → tool manifest → `ProjectTaskService` → `ProjectTaskContextStore` → `ProjectStore` (unchanged).

## Ownership Map

- `project-task-tool-contract.ts`: owns argument schema, descriptions, strict shape parsing (no filesystem access).
- `project-task-tool-manifest.ts`: thin adapter that maps parsed input to service commands and projects the business return; owns no file policy.
- `ProjectTaskService`: governing owner of Task create/update semantics, Project-vs-ad-hoc routing, ordering (validate → import → commit → DONE release → feed), additive merge.
- `ProjectTaskContextStore`: owns Task context bytes: local-file validation, copy, containment, partial-copy cleanup.
- `context-file-upload-policy.ts`: owns the allowlist, the cap, and path → allowed MIME.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Native tool classes / MCP adapter | Tool manifest → ProjectTaskService | Exposure | Any file validation or copying |
| Tool manifest | ProjectTaskService | Input→command mapping, return projection | Path checks, MIME policy, direct store calls |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Doc sentences denying agent context mutation (`projects.md` §Exactly Four Agent Tools validation list; `agent_tools_mcp_server.md` §Project Task Data Tools) | Capability now exists (additive) | Updated docs describing `context_files` | In This Change | No code removal |

## Return Or Event Spine(s)

- DS-004 as above. The change feed (`changes.taskChanged`) is unchanged; it fires after each committed write, so the app refreshes and shows the files.

## Bounded Local / Internal Spines

- Parent owner `ProjectTaskContextStore`: `validate all sources -> ensure context dir -> copy each (EXCL) -> verify -> PreparedTaskContext` (DS-005). This matters because it is the all-or-nothing guarantee: validation errors happen before any byte is written, and copy failures remove this call's copies.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path → allowed MIME (`contextFileMimeTypeForPath`) | DS-005 | ProjectTaskContextStore | Map extension to MIME; null if not allowlisted | Same type policy as app uploads | Policy duplicated in tool or store |
| Change feed publication | DS-001/002 | ProjectTaskService | Existing `taskChanged` | App refresh | – |

## Ownership Boundaries

`ProjectTaskService` is the only public entrypoint for Task mutations. `ProjectTaskContextStore` stays internal to it. Agent-tool code depends on the service only. The GraphQL resolvers keep using `createTask(command)` / `updateTask(command)`, which have no local-path input.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ProjectTaskService` | `ProjectTaskContextStore.importLocalFiles/prepare`, `ProjectStore` | Tool manifest, GraphQL, REST | Manifest calling the context store or copying files itself | Extending the service's tool-facing entrypoints |

## Dependency Rules

- Allowed: `agent-tools/project-tasks` → `projects/services`, `projects/domain`; `projects/context` → `context-files/domain` (policy). 
- Forbidden: `agent-tools/project-tasks` → `projects/context` or `node:fs`; `projects/*` → `agent-collaboration/execution/*` (hence the repeated path rule); GraphQL/REST → local-file import.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Tool `create_or_update_task` create | Project Task | `{project_id, description, context_files?}` | `project_id` | `context_files: string[]` |
| Tool `create_or_update_task` patch | Any Task by id | `{task_id, description?, status?, context_files?}` | `task_id` | Files only for Project Tasks |
| `ProjectTaskService.createTaskWithLocalContextFiles({projectId, description, localContextFiles})` → `ProjectTaskView` | Project Task | Tool-facing create with node-local sources (may be empty) | `projectId` | New public method |
| `ProjectTaskService.updateTaskById({taskId, description?, status?, localContextFiles?})` → `TaskAcknowledgementView` | Any Task by id | Tool-facing patch | `taskId` | Extended command and return |
| `ProjectTaskService.createTask(command)` / `updateTask(command)` | Project Task | GraphQL/UI draft-based (unchanged signatures) | `projectId` (+`taskId`) | Delegate to shared private bodies |
| `ProjectTaskContextStore.importLocalFiles(projectId, taskId, sourcePaths)` → `PreparedTaskContext` (no `draftId`, `consumed: []`) | Task context bytes | Validate + copy | compound `projectId`+`taskId` | Internal to the service |
| `contextFileMimeTypeForPath(filePath)` → `string \| null` | Upload policy | Allowlisted MIME by extension | – | In `context-file-upload-policy.ts` |

## Interface Boundary Check

| Interface | Singular Responsibility | Explicit Identity | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `createTaskWithLocalContextFiles` | Yes | Yes | Low | – |
| `updateTaskById` (+files) | Yes (patch by unique id; files gated to Project Tasks) | Yes | Low | Existing id-resolution kept |
| `importLocalFiles` | Yes | Yes | Low | – |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Tool argument | `context_files` | Yes (matches app "Context Files" / `contextFiles`) | Low | – |
| Return field | `attachedContextFiles` | Yes; distinct from the full `contextFiles` list | Low | – |
| Service command field | `localContextFiles` | Yes; says these are node-local sources | Low | – |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why |
| --- | --- | --- | --- |
| Byte storage, containment, stored names | `projects/context` + `ProjectsLayout`, `buildStoredFilename` | Extend | Same storage the UI uses |
| Type/size policy | `context-files/domain/context-file-upload-policy.ts` | Extend | Single policy owner |
| Publication / DONE ordering | `ProjectTaskService` commit path | Reuse | Invariants already implemented |
| Draft staging | `ProjectTaskContextStore` drafts | Not used | Drafts exist for multi-request UI uploads; a single tool call needs no staging, and fake drafts would add cleanup state |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `agent-tools/project-tasks` | Contract, parsing, projection | DS-001/002/004 | Extend |
| `projects/services` | Task semantics/ordering | DS-001/002 | Extend |
| `projects/context` | Local import | DS-005 | Extend |
| `projects/domain` | Command/view types, error code | – | Extend |
| `context-files/domain` | Path → MIME | DS-005 | Extend |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Change |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | Tool contract | Add `context_files` ARRAY param (`arrayItemSchema: {type: "string"}`) to `create_or_update_task`; allow it in both modes; validate it is an array of strings, trim each, reject blank (`PROJECT_TOOL_ARGUMENT_INVALID`); patch "at least one change" = description, status or non-empty `context_files` (`TASK_PATCH_REQUIRED`); update tool and parameter descriptions |
| `.../project-task-tool-manifest.ts` | Tool adapter | Create → `createTaskWithLocalContextFiles({projectId, description, localContextFiles: input.context_files ?? []})`; patch → `updateTaskById({..., localContextFiles})` when present; project `attachedContextFiles: [{storedFilename, displayName}]` only when non-empty (create: from `view.contextFiles`; patch: from `ack.attachedContextFiles`) |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | Task authority | New public `createTaskWithLocalContextFiles`; `createTask` and it share a private create body taking a "prepare" step (draft prepare vs local import). `updateTask` body becomes a private shared update body taking the prepare step and returning `{view, attached}`; public `updateTask` keeps its signature. `updateTaskById`: accept `localContextFiles`; ad-hoc + non-empty → `TASK_CONTEXT_INVALID` before any write; Project Task → shared update body; patch-required counts non-empty files; return `attachedContextFiles` (empty for ad-hoc/no files). Additive merge: `[...current.contextFiles, ...prepared.files]` under the Task lock (existing expression with no removals). Import happens after all input validation and before `closeAndWrite`. |
| `autobyteus-server-ts/src/projects/context/project-task-context-store.ts` | Context bytes | New `importLocalFiles(projectId, taskId, sourcePaths)` per DS-005; returns `{files, consumed: []}`; empty input → `{files: [], consumed: []}` with no fs work |
| `autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts` | Upload policy | Add `contextFileMimeTypeForPath(filePath): string \| null` using `mime-types` `lookup`, returning the type only if it is in `allowedMimeTypes` |
| `autobyteus-server-ts/src/projects/domain/models.ts` | Domain types | Add `CreateTaskWithLocalContextFilesCommand {projectId; description; localContextFiles: string[]}`; extend `UpdateTaskByIdCommand` with `localContextFiles?: string[]`; extend `TaskAcknowledgementView` with `attachedContextFiles: ProjectTaskContextFile[]` |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | Error codes | Add `TASK_CONTEXT_FILE_UNAVAILABLE` |
| `autobyteus-server-ts/docs/modules/projects.md` | Docs | Tool table/inputs, `context_files` rules, errors, return; Task Context Bytes: agent import path (no draft); remove "no context … tool" statement |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Docs | `create_or_update_task` bullet and "no Task attachment mutation" sentence |
| Tests (see Guidance) | – | Unit + server E2E |

## Target Subsystem / Folder / File Mapping

No new folders or files are needed in production code; all changes land in the existing files above. A flat change is clearer because every concern already has an owner file.

## Folder Boundary Check

N/A: no folder changes.

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Create call | `{"project_id":"p1","description":"Fix green status","context_files":["/private/tmp/shot1.png","/Users/me/notes.md"]}` → `{"task":{"projectId":"p1","taskId":"project_task_…","status":"TODO","attachedContextFiles":[{"storedFilename":"ctx_ab12…__shot1.png","displayName":"shot1.png"},{"storedFilename":"ctx_cd34…__notes.md","displayName":"notes.md"}]}}` | Returning full `contextFiles` with locators/localPath on every call | Compact, approved return |
| Patch call | `{"task_id":"project_task_…","context_files":["/private/tmp/shot2.png"]}` → `attachedContextFiles` lists only `shot2.png`; the Task keeps earlier files | `context_files` replacing the list | Approved additive semantics |
| Ordering | validate args → resolve Task → reject ad-hoc+files → import (validate all, then copy) → in-lock validate + commit (DONE via `closeAndWrite`) | Closing DONE runs, then discovering a missing file | REQ-006 no partial effect |
| Boundary | Manifest → `ProjectTaskService.createTaskWithLocalContextFiles` | Manifest → `getProjectTaskContextStore().importLocalFiles` | Authoritative boundary |
| GraphQL isolation | `CreateProjectTaskCommand` unchanged | `CreateProjectTaskCommand.localContextFiles` reachable from GraphQL `input` passthrough | Remote clients must not make the server copy server-local files |

Error mapping (all `ProjectError`, surfaced as `{error:{code,message}}`, message names the path):

| Condition | Code |
| --- | --- |
| `context_files` not an array / item not a string / blank item / used with unknown keys | `PROJECT_TOOL_ARGUMENT_INVALID` |
| Not absolute or not normalized; duplicate in call; type not accepted by the app; larger than 25 MiB | `TASK_CONTEXT_INVALID` |
| Missing, not a regular file, or not readable | `TASK_CONTEXT_FILE_UNAVAILABLE` |
| Files on a Task with no Project | `TASK_CONTEXT_INVALID` ("Context files can be attached only to Project Tasks; this Task has no Project.") |
| Patch with nothing to change (incl. only `context_files: []`) | `TASK_PATCH_REQUIRED` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Separate tool for attaching files | Possible API shape | Rejected (REQ-012) | Argument on the existing tool |
| `add_/remove_context_files` pair | First proposal | Rejected (SR-002) | Single additive `context_files` |
| Staging agent files through a fake draft | Reuse UI path verbatim | Rejected | Draft-less `PreparedTaskContext` from `importLocalFiles` |

## Change / Refactor Sequence

1. Policy: `contextFileMimeTypeForPath`; error code; domain types.
2. Store: `importLocalFiles` with unit tests (validation cases, copy, partial-failure cleanup, symlink-to-file source accepted, containment of target).
3. Service: extract shared private create/update bodies; add `createTaskWithLocalContextFiles`; extend `updateTaskById`. Existing service tests must still pass unchanged.
4. Tool contract + manifest + descriptions; tool unit tests.
5. Docs.
6. Server E2E via the MCP/native tool path, plus linked delegation.

## Key Tradeoffs

- Direct import (one copy, no draft) vs draft staging (two copies, extra cleanup state): direct import chosen.
- Separate tool-facing service entrypoints vs an extra field on shared commands: separate entrypoints chosen to keep local-path input off GraphQL.
- The path rule is repeated rather than shared across subsystems: accepted (dependency direction).
- Extension-based typing (approved parity) means some useful files (`.ts`, `.yaml`) are rejected. Accepted per DEC-001.

## Risks

- Source changes size between stat and copy: the copied size is re-checked against the cap and recorded as `sizeBytes`. Acceptable.
- Server process lacks read permission for a file the agent can see (different OS user): `TASK_CONTEXT_FILE_UNAVAILABLE` with a clear message.
- Unproven failure after commit (I/O failure while building the view) still maps to `PROJECT_OPERATION_UNCONFIRMED`, as today. Copies of a failed create may remain as unreferenced bytes, the same as the existing draft path.

## Guidance For Implementation

- Keep `createTask` / `updateTask` public behavior byte-for-byte the same for GraphQL callers; all existing unit tests in `tests/unit/projects` must stay green.
- Do validation strictly before any write. In particular, `importLocalFiles` must run before `closeAndWrite` for DONE, and phase 1 (validate all) must finish before phase 2 (copy).
- Parser: `context_files` allowed in both modes; reject `null`. The "unknown key" rule continues to reject anything else (e.g. `remove_context_files`).
- Return projection: omit `attachedContextFiles` when empty, so existing return assertions (AC-009) hold.
- Tool description (keep it concise), suggested text addition: "Optional context_files: absolute local file paths to copy into a Project Task as context files (create or patch; patch appends, never removes). Same file types and 25 MiB limit as the app; not for Tasks with no Project. Returns attachedContextFiles [{storedFilename, displayName}] when files were attached."
- Tests:
  - Unit: `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` (schema/parser/description), `project-task-business-results.test.ts` (returns, AC-001/002/009), `tests/unit/projects/project-task-context-store.test.ts` (import cases, AC-005/006), service tests for ad-hoc rejection, DONE+files ordering, no-partial-effect (AC-003/004/005/007).
  - Server E2E: extend `tests/e2e/projects/project-task-boundaries.e2e.test.ts` (API-MCP) to create and patch with `context_files` through the MCP tool and read the Task via GraphQL/REST (AC-001/002/006/010 app-visible records). Add or extend a linked `delegate_task({task_id})` case showing the worker message lists the saved copies (AC-010).
  - User verification in the app (Done-when): a screenshot attached by an agent shows on the Task with preview.
- Follow `TESTING.md`; run `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks --no-watch` and `tests/e2e/projects`.
