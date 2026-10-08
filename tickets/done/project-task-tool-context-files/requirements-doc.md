# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `project-task-tool-context-files`
- Request / ticket: Project Task Manager delegation 2026-10-08 — "Let agents attach context files when they create or update a Project Task with `create_or_update_task`."
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Approval state and reference: Approved by the user in conversation on 2026-10-08 ("Yeah, exactly … Just make only one parameter. The context files are additive."), confirming the SR-002 proposal: one additive `context_files` argument in both modes, no removal by agents, same file types as the app, rejection on Tasks with no Project, compact return of the files the call attached. Earlier in the same conversation the user confirmed the term "context files" and "no separate tool".
- Exact approved requirements baseline / solution revision: SR-002
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: In the app a user can attach context files to a Project Task; `delegate_task({task_id})` then hands those files to the worker. The agent tool `create_or_update_task` has no file argument, so every agent-created Task has no files. Agents can only paste paths into the description; those paths are not copied, and temporary files (e.g. pasted screenshots under `/private/tmp/...`) can disappear before the worker reads them.
- Affected actors or systems: Manager agents using `create_or_update_task` (native and Agent Tools MCP); app users viewing Tasks; workers receiving a Task by `task_id`.
- Desired outcome: An agent can attach files (by absolute local path) when creating a Project Task, and attach more files when patching one. Attachment is additive only; removal stays in the app. The files are copied into the Task's saved context exactly as UI uploads are, so they appear on the Task in the app and are passed to a worker by a later `delegate_task` by `task_id`.
- Observable definition of success: Through the agent tool, a created Task with files and a patched Task with added files show the expected files in the app; a following `delegate_task({task_id})` work message lists those saved files; the copies survive deletion of the original source files.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | Create mode accepts only `{project_id, description}`; the Task has no files | Create mode also accepts optional `context_files` (absolute local file paths); each file is copied into the new Task's saved context | Strict create mode: `project_id` + required description, no `status`, no `task_id`; unknown keys rejected | investigation-notes BEH-001 |
| BEH-002 | Contract | SCN-002 | Patch mode accepts only `{task_id, description?, status?}` | Patch mode also accepts `context_files`, which are appended to the Task's existing files; a patch may consist only of `context_files`. Agents cannot remove or replace files | Patch never takes `project_id`; omitted fields and all existing files preserved; DONE semantics unchanged | BEH-002 |
| BEH-003 | User | SCN-001, SCN-002 | UI attach copies files into Task saved context under the shared upload policy | Agent-attached files land in the same saved context, under the same type/size policy, and look the same in the app | UI attach/remove flow unchanged | BEH-003 |
| BEH-004 | Contract | SCN-004 | `delegate_task({task_id})` passes saved files as reference files | Agent-attached files are passed the same way | Linked delegation contract unchanged | BEH-004 |
| BEH-005 | Contract | SCN-006 | Patching a Task with no Project accepts description/status | `context_files` on a Task with no Project is rejected with a clear error | Description/status patch of Tasks with no Project unchanged | BEH-005 |
| BEH-006 | Contract | SCN-001, SCN-002 | Return is `{task: {projectId, taskId, status}}` | When the call attached files, the return also lists the files this call attached, compactly | Return unchanged for calls that attach no files; `list_project_tasks` return unchanged | BEH-006 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Manager agent | Create/maintain Tasks with the material a worker needs | Files are durably attached via the same tool | Node-local absolute paths, like `delegate_task.reference_files`; no extra tool |
| App user | See and verify what an agent attached; remove files if ever needed | Files appear on the Task like UI-attached files | No UI change |
| Worker agent | Receive the Task's material | `delegate_task` by `task_id` lists the saved files | Existing delegation path |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Agent creates a Project Task with attached files | SCN-001 |
| UC-002 | Agent adds more files to an existing Project Task (additive) | SCN-002 |
| UC-004 | Worker receives agent-attached files through `delegate_task` by `task_id` | SCN-004 |
| UC-005 | Agent gets a clear, non-mutating error for an invalid `context_files` argument | SCN-005, SCN-006 |

(UC-003 "agent removes files" was withdrawn in SR-002.)

### Out Of Scope

- Removing or replacing context files through the agent tool (users remove them in the app).
- A separate or new agent tool for context files.
- Other changes to Task-tool returns (e.g. trimming `list_project_tasks`) — postponed by the user.
- Files on Tasks with no Project (ad-hoc Tasks) — they have no saved-context storage.
- Changing the shared upload policy (MIME allowlist, 25 MiB cap) for UI or run uploads.
- UI changes; GraphQL/REST contract changes.
- Updating the Project Task Manager agent package/skill to use the new argument (separate follow-up candidate).
- URLs, remote-node paths, directories, globs, inline/base64 content.

### Non-Goals

- Content sniffing of file types (type comes from the file extension).
- Deduplicating a file that is already attached (attaching the same source again creates another saved copy, as in the UI).

### Preserved Behavior Boundary

BEH-001..006 preserved columns; REQ-008; AC-008, AC-009. Cross-cutting invariants: a call that fails input validation changes nothing (no Task created, no text/status/file change, no DONE closure); the tool never removes a Task's saved files; the app's attach/remove flow is unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `create_or_update_task` has exactly one context-file argument, `context_files`: an optional array of absolute local file paths, accepted in both create and patch mode. In create mode each file is copied into the new Task's saved context, with its original filename as the display name. | BEH-001, BEH-003 | Must | Core request | Task "What to do"; DEC-004 |
| REQ-002 | In patch mode `context_files` is additive: the files are copied in and appended to the Task's existing saved files, which are always preserved. The tool offers no removal or replacement. A patch may consist only of `context_files`; a patch must still request at least one change (description, status, or a non-empty `context_files`). | BEH-002 | Must | More context never hurts; removal stays in the app | User 2026-10-08 (SR-002) |
| REQ-003 | Path rule matches `delegate_task.reference_files`: each path must be a normalized absolute path on the current node naming an existing, readable regular file. Paths within one call must be unique. | BEH-001, BEH-002 | Must | Consistency; clear errors | `validateTaskReferenceFiles` |
| REQ-004 | Agent-attached files obey the same policy as app uploads: the file type (derived from the file extension) must be one the app accepts, and the file must be at most 25 MiB. | BEH-003 | Must | "the same way the user can in the app" | DEC-001 |
| REQ-005 | Files are copied at call time into the same Task-owned saved context the app uses; later changes to or deletion of the source file do not affect the Task. The agent's source files are never modified or deleted. | BEH-003, BEH-004 | Must | Durability | Task "copied, not referenced" |
| REQ-006 | All-or-nothing: if any `context_files` entry is invalid (bad path, missing/unreadable/not a regular file, unsupported type, too large, duplicate in the call), the call fails with a clear error naming the offending path, and nothing is changed — no Task created, no description/status change, no DONE closure, no file added. | BEH-001, BEH-002 | Must | Strict rules; safe retries | Task "clear errors" |
| REQ-007 | `context_files` on a Task with no Project is rejected with a clear error and no change. | BEH-005 | Must | No saved-context storage there | DEC-002 |
| REQ-008 | Existing strict rules are preserved: create forbids `status`/`task_id`; patch forbids `project_id`; unknown keys (including any removal/replace argument) are rejected; `context_files` must be an array of non-blank strings. | BEH-001, BEH-002 | Must | Strict contract | contract.ts |
| REQ-009 | When a call attached files, the returned `task` additionally contains `attachedContextFiles: [{storedFilename, displayName}]` — exactly the files this call attached, in argument order. Calls without `context_files` (or with an empty list on create) return exactly the current `{projectId, taskId, status}`. | BEH-006 | Must | Identify attached files compactly | DEC-003 |
| REQ-010 | Agent-attached files appear on the Task in the app (same list, preview/download as UI-attached files) and are passed as reference files by a later `delegate_task({task_id})`. | BEH-003, BEH-004 | Must | Done-when | Task "Done when" |
| REQ-011 | The tool description, parameter description, `docs/modules/projects.md` and `docs/modules/agent_tools_mcp_server.md` describe the new argument, rules, errors and return; native and Agent Tools MCP exposure behave identically. | All | Must | Agents learn from the description | Task "What to do" |
| REQ-012 | Context-file support is added to the existing `create_or_update_task` tool only; no new or separate agent tool is introduced. | BEH-001, BEH-002 | Must | Too many tools confuse agents | User 2026-10-08 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005, REQ-009 | BEH-001 / SCN-001 | Project exists; agent calls create with description and `context_files` = [png, md] | New TODO Task with both files saved; return includes `attachedContextFiles` with two stored names and the original display names; saved bytes equal the sources | – | Unit + server E2E via tool |
| AC-002 | REQ-002, REQ-009 | BEH-002 / SCN-002 | Existing Project Task with one saved file; patch with `task_id` + `context_files` only | Task keeps the old file and gains the new one (appended); description/status unchanged; `attachedContextFiles` lists only the new file | Attaching the same source again creates another saved copy | Unit + E2E |
| AC-003 | REQ-002 | BEH-002 / SCN-002 | Patch combining description and/or status with `context_files` | All changes applied in one call | Status DONE plus files: files are added and DONE semantics run as today | Unit |
| AC-004 | REQ-002, REQ-009 | BEH-002 | Patch with only `context_files: []` | `TASK_PATCH_REQUIRED`; nothing changed | Create with `context_files: []` creates a Task with no files and the unchanged return | Unit |
| AC-005 | REQ-003, REQ-004, REQ-006 | SCN-005 | Create/patch with one valid path and one invalid (relative or non-normalized path / missing / directory / unreadable / unsupported type / >25 MiB / duplicate in the call) | Error with a clear code and a message naming the offending path; no Task created (create) or no change at all (patch), including no DONE closure | – | Unit per case |
| AC-006 | REQ-005 | SCN-001, SCN-002 | After a successful attach, the source file is changed or deleted | The Task's saved copy and its app display/download are unaffected; the tool never deletes source files | – | Unit/E2E |
| AC-007 | REQ-007 | BEH-005 / SCN-006 | Patch of a Task with no Project including `context_files` | Clear error; Task unchanged | Description/status patch of that Task still works | Unit/E2E |
| AC-008 | REQ-008, REQ-012 | BEH-001, BEH-002 | Non-array `context_files`, non-string or blank items, `project_id`+`task_id`, unknown keys such as `remove_context_files` | `PROJECT_TOOL_ARGUMENT_INVALID` (or existing specific code); nothing changed; no new tool is registered | Existing argument tests still pass | Unit |
| AC-009 | REQ-009 | BEH-006 | Create without files; patch of description/status only | Return is exactly `{task: {projectId, taskId, status}}` as today | – | Unit (existing assertions) |
| AC-010 | REQ-010 | SCN-001, SCN-004 | Task created/patched with files by the tool; then `delegate_task({recipient_address, task_id})` | Worker's first message lists the saved copies' paths as Reference files; the Task in the app shows the files (image preview for screenshots) | – | Server E2E for delegation; user verification in app |
| AC-011 | REQ-011 | All | Tool listing (native + MCP) | Description and schema describe `context_files` (absolute paths, additive, same types/size as the app, Project Tasks only); docs updated | – | Unit schema test + doc review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Manager agent | Create a Task with the user's screenshots | `create_or_update_task` create | Project exists; screenshots at absolute temp paths | Agent passes description + `context_files` | Task created with copies; app shows them | Invalid file → nothing created | Supported Normal Scenario | User report 2026-10-08 | REQ-001, REQ-003..006, REQ-009 / AC-001, AC-005, AC-006 |
| SCN-002 | Contract | Manager agent | Add more material to an existing Task | patch | Project Task exists | Agent passes `task_id` + `context_files` (optionally with description/status) | Files appended; existing files kept | Invalid → no change | Supported Normal Scenario | Task "What to do"; user 2026-10-08 (additive) | REQ-002 / AC-002..004 |
| SCN-003 | Contract | Manager agent | Remove material through the tool | – | – | – | Not offered; users remove files in the app | – | Out of scope by user decision (SR-002) | User 2026-10-08 | – |
| SCN-004 | Contract | Manager → worker | Worker receives the files | `delegate_task({task_id})` | Task has agent-attached files | Delegation resolves saved files | Worker message lists paths | Missing saved bytes fail as today | Supported Normal Scenario | BEH-004 | REQ-010 / AC-010 |
| SCN-005 | Contract | Manager agent | Get a clear error | Bad `context_files` entry | – | Tool validates | Clear error, no change | – | Supported Normal Scenario | Task "clear errors" | REQ-006 / AC-005 |
| SCN-006 | Contract | Agent | Attach to a Task with no Project | patch ad-hoc Task | Ad-hoc Task exists | – | Rejected | – | Supported Explicit Edge Scenario (defined rejection) | BEH-005, DEC-002 | REQ-007 / AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — the app already renders Task context files; no UI change.
- Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 | Operability | Same 25 MiB per-file cap and MIME allowlist as app uploads | Per file | Unit |
| QR-002 | REQ-006 | Reliability | No partial effect on input errors | All modes | Unit |
| QR-003 | REQ-009 | Other | Return adds only `storedFilename` and `displayName` per file this call attached, only on calls that attached files | – | Unit |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new writes only, in the existing shape).
- Must be preserved: all existing Tasks and saved files; agent source files are never modified or deleted.
- Acceptable loss: N/A.
- Constraints: none beyond existing draft/saved retention rules.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent Tools MCP + native tool exposure | Same contract on both | Shared manifest | None |
| `mime-types` extension lookup | Determines file type for agent-attached files | Server dependency | Extension-only typing (RSK-001) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` | Evidence | All | Current | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The server process can read the files the agent names (same node, same OS user). | Path-based copy | E2E | Open |
| ASM-002 | Copying any readable file the agent names is acceptable, at the same trust level as `delegate_task.reference_files`. | No new access policy | Included in SR-002 approval | Accepted |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which file types may an agent attach? | Under UI parity, `.ts`, `.js`, `.yaml`, `.sh`, `.py` and extensionless files are rejected | A: same allowlist and 25 MiB cap as the app; B: any file | User | Resolved 2026-10-08 (SR-002): A |
| DEC-002 | Files on Tasks with no Project? | No saved-file storage | Reject with a clear error | User | Resolved 2026-10-08 (SR-002): reject |
| DEC-003 | Return shape | Identify attached files compactly | Only on calls that attached files: list of `{storedFilename, displayName}` for the files this call attached; otherwise unchanged. Field named `attachedContextFiles` so it is not mistaken for the Task's full `contextFiles` list (as in `list_project_tasks`) | User | Resolved 2026-10-08 (SR-002); field name fixed in the SR-002 write-up and flagged to the user |
| DEC-004 | Argument names / removal / tool count | Agent ergonomics | One additive argument `context_files` in both modes; no removal/replace argument; same tool | User | Resolved 2026-10-08 (SR-002) |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-003 | AC-001 | SCN-001 | notes |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003, AC-004 | SCN-002 | DEC-004 |
| REQ-003 | UC-005 | BEH-001, BEH-002 | AC-005 | SCN-005 | notes |
| REQ-004 | UC-005 | BEH-003 | AC-005 | SCN-005 | DEC-001 |
| REQ-005 | UC-001, UC-002 | BEH-003, BEH-004 | AC-001, AC-006 | SCN-001, SCN-002 | notes |
| REQ-006 | UC-005 | BEH-001, BEH-002 | AC-005 | SCN-005 | notes |
| REQ-007 | UC-005 | BEH-005 | AC-007 | SCN-006 | DEC-002 |
| REQ-008 | UC-005 | BEH-001, BEH-002 | AC-008 | SCN-005 | notes |
| REQ-009 | UC-001, UC-002 | BEH-006 | AC-001, AC-002, AC-004, AC-009 | SCN-001, SCN-002 | DEC-003 |
| REQ-010 | UC-004 | BEH-003, BEH-004 | AC-010 | SCN-004 | notes |
| REQ-011 | all | all | AC-011 | all | notes |
| REQ-012 | UC-001, UC-002 | BEH-001, BEH-002 | AC-008 | SCN-001, SCN-002 | DEC-004 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001, SCN-002, SCN-004, SCN-005, SCN-006 (SCN-003 records the excluded removal).
- Constraints to preserve: single upload policy owner; Task service as the only Task/context authority; validation before any write; DONE closure only after input validation; no schema change.
- Deferred to architecture: how local files are staged, byte-writer generalization, error codes, where path validation lives.
- Technical facts to verify: draft cleanup on failure; `updateTaskById` routing for file additions; MCP array schema rendering.
- Known risks: RSK-001 (type coverage), RSK-002 (copy trust level).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08, SR-002)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
