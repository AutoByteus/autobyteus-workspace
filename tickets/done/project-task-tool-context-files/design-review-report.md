# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed: None (package declares none; investigation-notes supplement inventory says None)
- Relevant Solution Revision IDs: SR-002 (requirements), SR-003 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` handoff from `/software_engineering_team/solution_designer` (2026-10-08)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/project-task-tool-context-files` @ `4a51482a5` (clean apart from the ticket folder). Read directly: `src/projects/services/project-task-service.ts`, `src/projects/context/project-task-context-store.ts`, `src/context-files/domain/context-file-upload-policy.ts`, `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts`, `src/projects/domain/models.ts`, `project-errors.ts`, `src/api/graphql/types/project-tasks.ts` (create/update resolvers), `src/agent-collaboration/execution/task/task-execution-input.ts` (`validateTaskReferenceFiles`), `src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`, `tests/unit/projects/ad-hoc-tasks.test.ts`, docs `projects.md` L353 and `agent_tools_mcp_server.md` L339, root `DESIGN.md`. `rg` for `TaskAcknowledgementView|updateTaskById` callers.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: about 7 production files in existing owners; the change touches a shared agent-tool contract exposed on native and MCP runtimes, adds a server read of an agent-named local file into app data, and refactors the create/update internals of `ProjectTaskService` that carry the validation-before-write and DONE-closure ordering invariants. All three are confirmed in current code (manifest shared by native/MCP; `closeAndWrite` wraps the metadata write in `updateTask`; there is currently no path-based context source).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. One additive `context_files` argument (absolute local paths) on `create_or_update_task` in both modes. Files are copied into Task saved context under the app upload policy, with all-or-nothing input handling. Tasks with no Project are rejected. `attachedContextFiles` is returned only when the call attached files. No removal and no new tool.
- Relevant existing behavior and evidence confirmed: Yes. Create calls `createTask({projectId, description})`. Patch calls `updateTaskById`, which handles ad-hoc first and then `uniqueTask` → `updateTask`. `prepare` produces `PreparedTaskContext` copies, and `validatePrepared` re-checks them in the Task lock. `consume` is a no-op without `draftId`. `resolveAssignment` maps saved files to absolute paths. The parser rejects unknown keys.
- Scope guardrail confirmed: Yes. In scope are UC-001/002/004/005. Out of scope are removal, a separate tool, other return changes, ad-hoc files, policy changes, UI/GraphQL/REST changes, the PTM skill update, and URLs/dirs. The preserved boundary is BEH preserved columns, REQ-008, AC-008/009, and the cross-cutting no-partial-effect invariant. Review authority is stated.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (no blocking findings raised).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass (manifest create → `createTask`; parser create allowlist) | Pass (DS-001: parser → manifest → `createTaskWithLocalContextFiles` → `importLocalFiles` → `ProjectStore.createTask` with in-lock `validatePrepared` → feed → return) | Confirmed | – |
| BEH-002 | Contract | Pass | Pass (`updateTaskById` → `updateTask`; DONE via `closeAndWrite`) | Pass (DS-002: ad-hoc reject before write; import after input validation and before `closeAndWrite`; append under lock) | Confirmed | See recommendation R-2 (`meaningful` must count imported files) |
| BEH-003 | User | Pass | Pass (UI draft → `prepare` → same `context/` dir and `ProjectTaskContextFile` shape) | Pass (same storage, same record shape, `buildStoredFilename`, unchanged readers) | Confirmed | – |
| BEH-004 | Contract | Pass | Pass (`resolveAssignment` → `savedFile` per record) | Pass (DS-003 unchanged; consumes any committed record) | Confirmed | – |
| BEH-005 | Contract | Pass | Pass (ad-hoc branch in `updateTaskById` has no context storage) | Pass (reject non-empty files before any write) | Confirmed | – |
| BEH-006 | Contract | Pass | Pass (`taskAcknowledgement` projects `{projectId, taskId, status}`) | Pass at tool boundary (field omitted when empty); internal service-ack shape inconsistent with the "existing tests unchanged" guidance; see R-1 | Confirmed | R-1 (non-blocking) |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec §Task Design Health Assessment: posture `Feature` | – |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`. The missing piece is a source type for the existing `prepare → validatePrepared → commit` protocol, and current code confirms this | – |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No broad refactor. A local extraction of shared private create/update bodies is needed. The path-rule duplication is deferred with its residual risk named | – |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping lists the shared bodies. Dependency rules explain why the path rule is repeated (`projects/*` must not depend on `agent-collaboration/execution/*`) | – |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Create with files | Pass | Pass | Pass (manifest thin; service governs) | Pass | Pass | Pass (policy off-spine) | Pass |
| DS-002 | Patch with files | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Linked delegation (unchanged) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return projection | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local import (validate all → copy) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskService` | Pass | Pass (`importLocalFiles` called only by the service) | Pass (forbidden: manifest → context store / `node:fs`) | Pass | Matches the existing pattern: GraphQL/REST → service → context store |
| `ProjectTaskContextStore` | Pass | Pass | Pass | Pass | Owns bytes, containment, and copy |
| Tool contract / manifest | Pass | Pass | Pass | Pass | Parser does shape only; no filesystem access |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/project-tasks` | Pass | Pass | Pass | Pass | Depends only on `projects/services` and `projects/domain` |
| `projects/context` → `context-files/domain` | Pass | Pass | Pass | Pass | Existing direction (already imports `buildStoredFilename`) |
| `projects/*` ↛ `agent-collaboration/execution/*` | Pass | Pass | Pass | Pass | Justifies the two-line path-rule repetition |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Tool `create_or_update_task` (+`context_files`) | Pass | Pass | Pass | Low | Pass |
| `ProjectTaskService.createTaskWithLocalContextFiles` | Pass | Pass | Pass (`projectId`) | Low | Pass |
| `ProjectTaskService.updateTaskById` (+`localContextFiles`) | Pass | Pass (files gated to Project Tasks) | Pass (`taskId`) | Low | Pass (see R-1 on ack shape) |
| `ProjectTaskContextStore.importLocalFiles(projectId, taskId, sourcePaths)` | Pass | Pass | Pass (compound id) | Low | Pass |
| `contextFileMimeTypeForPath` | Pass | Pass | N/A | Low | Pass |

Note: keeping local paths off `CreateProjectTaskCommand`/`UpdateProjectTaskCommand` is sound. The GraphQL input classes also carry only declared fields, so the isolation holds both structurally and in the command types.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Byte storage / stored names / containment | Pass | Pass (extend `ProjectTaskContextStore`, reuse `buildStoredFilename`, `ProjectsLayout`) | Pass | Pass | Copy pattern mirrors `prepare` |
| Type/size policy | Pass | Pass (extend policy file) | Pass | Pass | Single policy owner kept |
| Publication / DONE ordering | Pass | Pass (reuse commit path) | N/A | Pass | – |
| Draft staging | Pass | Pass (not used; avoids fake-draft lifecycle state) | N/A | Pass | Consistent with DESIGN.md rule 5 |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/project-tasks` | Pass | Pass | Pass | Pass | – |
| `projects/services` | Pass | Pass | Pass | Pass | – |
| `projects/context` | Pass | Pass | Pass | Pass | – |
| `projects/domain` | Pass | Pass | Pass | Pass | – |
| `context-files/domain` | Pass | Pass | Pass | Pass | – |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Create/update commit body (draft vs local source) | Pass | Pass (private shared bodies in the service) | Pass | Pass | Avoids duplicated invariants |
| Path → MIME | Pass | Pass (policy file) | Pass | Pass | – |
| Normalized-absolute path rule | Pass | N/A (deliberately repeated) | Pass | Pass | Low drift risk recorded |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectTaskContextFile` (reused) | Pass | Pass | Pass | N/A | Pass | No shape change |
| `PreparedTaskContext` (draft-less variant) | Pass | Pass | Pass | Pass (`draftId?` already optional; `consumed: []`) | Pass | – |
| `TaskAcknowledgementView` (+`attachedContextFiles`) | Pass | Pass | Pass (distinct from full `contextFiles`) | Pass | Pass | R-1: make it optional/omitted when empty, or update existing assertions |
| `CreateTaskWithLocalContextFilesCommand` / `UpdateTaskByIdCommand.localContextFiles` | Pass | Pass | Pass | Pass | Pass | – |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `project-task-tool-contract.ts` | Pass | Pass | N/A | Pass | – |
| `project-task-tool-manifest.ts` | Pass | Pass | N/A | Pass | – |
| `project-task-service.ts` | Pass | Pass | Pass | Pass | Grows modestly within the Task-subject boundary |
| `project-task-context-store.ts` | Pass | Pass | N/A | Pass | – |
| `context-file-upload-policy.ts` | Pass | Pass | N/A | Pass | – |
| `models.ts`, `project-errors.ts` | Pass | Pass | N/A | Pass | – |
| `projects.md`, `agent_tools_mcp_server.md` | Pass | Pass | N/A | Pass | Confirmed stale sentences at `projects.md` L353 and `agent_tools_mcp_server.md` L339 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All changes in existing files | Pass | Pass | Low | Pass | No new folders; flat change justified |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Doc statements denying agent context mutation | Pass | Pass | Pass | Pass | Only removal; additive feature |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Tool contract / service commands | No | Pass | Pass | Two context sources share one commit path (draft for UI, local import for tools). These are two supported product paths, not a legacy dual path |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `task.json` `contextFiles[]` + `context/` bytes | `Not Affected` | Pass (same record shape and storage; unchanged readers) | Pass | N/A | Pass | – |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Policy → store → service extraction → tool → docs → E2E | Pass | Pass (none needed) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Create/patch call and return | Yes | Pass | Pass | Pass | – |
| Ordering (validate → import → commit/DONE) | Yes | Pass | Pass | Pass | – |
| Boundary / GraphQL isolation | Yes | Pass | Pass | Pass | – |
| Error mapping | Yes | Pass | N/A | Pass | Phase-2 copy-failure code not mapped; see R-3 |

## Material Premise Validation (Only When Needed)

### `P-001` — The source file changes size between phase-1 `stat` and phase-2 copy

- Related approved requirement or established contract: REQ-004 (≤ 25 MiB), REQ-005 (copy at call time), BEH-004 (`savedFile` checks stored `sizeBytes` equality)
- Relevant behavior ID(s): BEH-001, BEH-002, BEH-004
- Initiating basis kind: `User` (agent as actor)
- Independent product-supported initiating trigger: a manager agent attaches a log file that is still being written, such as a running server's `.log`. `.log` maps to `text/plain`, which is allowlisted, and attaching logs is the kind of material REQ-001 serves.
- Support evidence: the `create_or_update_task` tool surface; the agent supplies `context_files` naming the live log.
- Forward path: parser → manifest → service → `importLocalFiles` phase 1 `stat` (size S1) → phase 2 `copyFile` copies the current bytes (size S2 ≥ S1).
- Lifecycle preconditions and material consequence: if `sizeBytes` were taken from phase-1 `stat`, `savedFile` (used by `validatePrepared`, `toView`, `resolveAssignment`) would reject the saved copy on every later read.
- Reachability: `Reachable`
- Review consequence: the design already records the copied size as `sizeBytes` and re-checks the cap after copy. Correct and proportionate; no change needed. The implementation must use the post-copy size.

### `P-002` — A concurrent `reclaimUnpublished` deletes a fresh import copy before `utimes`, because `copyFile` keeps an old source mtime

- Related approved requirement or established contract: REQ-005
- Relevant behavior ID(s): BEH-002, BEH-003
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: none coherent. It would need the app user to open or save context edits on the same Task (`beginContextDraft`/`updateTask` with `contextChanges` → `reclaim`) within the sub-millisecond window between an agent's `copyFile` and `utimes`. That is artificial timing.
- Support evidence: none beyond mechanical possibility.
- Forward path: N/A.
- Lifecycle preconditions and material consequence: even if it occurred, the in-lock `validatePrepared` would reject the commit, so no corrupted Task record would result.
- Reachability: `Not Reachable` (Technically Possible but Unsupported/Contrived)
- Review consequence: no finding and no new machinery. The design keeps the existing copy-then-`utimes` order, as in `prepare`.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`: the upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

None (blocking).

Non-blocking implementation recommendations (no upstream rework required; the implementation engineer should resolve them in place):

- **R-1 — Service ack shape vs "existing tests unchanged" (BEH-006 / REQ-009 / AC-009).** The design extends `TaskAcknowledgementView` with a required `attachedContextFiles: ProjectTaskContextFile[]` that is "empty for ad-hoc/no files". It also says existing `tests/unit/projects` tests must stay green unchanged. They would not: `tests/unit/projects/ad-hoc-tasks.test.ts` asserts `updateTaskById(...)` `.resolves.toEqual({ projectId, taskId, status })` at several points (around L85, L114, L117–118, L146), and `toEqual` fails on an extra `attachedContextFiles: []`. Prefer making `attachedContextFiles` optional on the service ack and present only when the call attached files. That matches the tool projection and keeps those tests unchanged. Alternatively, update those assertions deliberately. Either way, the tool-level return (AC-009) is unaffected.
- **R-2 — Count imported files as a meaningful change (REQ-002 / AC-002).** The current `updateTask` write callback decides `meaningful` from `additions.length > 0` (draft additions) and sets `contextFiles` only when `changes` is present. The shared update body must treat `prepared.files.length > 0` as meaningful and append `prepared.files` for the local-import source. Otherwise a files-only patch returns `current` unchanged and silently drops the copies. AC-002's files-only patch test covers this; make sure it asserts the persisted `task.json`, not just the return.
- **R-3 — Map phase-2 copy failures to a `ProjectError` (REQ-006 clarity).** After phase 2 removes this call's copies, throw a `ProjectError` that names the path. Use `TASK_CONTEXT_FILE_UNAVAILABLE` for a source that became unreadable or missing, and `TASK_CONTEXT_INVALID` for the post-copy cap. Do not let a raw fs error escape. A raw error would be wrapped by the manifest as `PROJECT_OPERATION_UNCONFIRMED`, which is safe but less clear than the known no-effect outcome. This is optional hygiene; it does not change approved behavior.
- **R-4 — Refresh stale investigation-note text (documentation coherence only).** Investigation notes still mention "add/remove files on patch" (Initial Request), "Stage local files into a draft inside the service" and "reuse draft/publish" (Technical Facts, Structural Impacts), and RSK-001 as `Open`. The investigation's BEH-006 (list_project_tasks return) also differs from the requirements' BEH-006 (create_or_update_task return). The Architecture Investigation Findings and the design spec supersede these, so they do not affect the design. Solution Designer may tidy them at the next revision.

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules), with informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- RSK-001 (extension-only typing rejects `.ts`/`.yaml`/`.py`/extensionless files): accepted by DEC-001.
- RSK-002 (the server copies any readable file the agent names, with the server process's permissions): accepted at the same trust level as `delegate_task.reference_files` (ASM-002).
- Path-rule text is duplicated with `validateTaskReferenceFiles`; drift risk is low.
- A create that fails after import (e.g. Project deleted concurrently) leaves unreferenced bytes in the Task's context dir, the same as the existing draft path. The existing reclaim covers them only if that Task later receives context edits. This is an accepted pre-existing property.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 Reachable and already handled; P-002 Not Reachable, no machinery)
- Notes: non-blocking recommendations R-1..R-4 for implementation and documentation hygiene. Classification Medium / High is confirmed.
