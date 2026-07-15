# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Fix the Team > Tasks reference-file preview 400 by aligning task-delegation reference-file semantics with the existing Team Communication/message reference contract: task `reference_files` must be absolute local filesystem paths, validated before task/submission/review records are created.

The reported failure happened because `delegate_task` accepted and persisted the relative path `math_problem_train_bird.txt`, while the backend task reference content endpoint already expects stored reference paths to be absolute and returns `INVALID_REFERENCE_PATH`/HTTP 400 for non-absolute paths.

The revised product decision from the user is: **no backward compatibility is required**. Existing relative task-reference records do not need compatibility fallback, migration, or workspace-relative readback support.

## Investigation Findings

- The frontend task reference viewer correctly fetches by task identity:
  `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`.
- The failing persisted task record stores `referenceFiles[0].path = "math_problem_train_bird.txt"` and `referenceId = "task-reference:0:math_problem_train_bird.txt"`.
- The backend task reference content service rejects non-absolute stored paths as `INVALID_REFERENCE_PATH`, which the REST route maps to HTTP 400.
- `send_message_to.reference_files` already documents and enforces an absolute-local-path contract before message delivery/persistence.
- Task-delegation `reference_files` are currently vague in tool descriptions and permissive in parsers: they accept non-empty strings without absolute-path validation.
- User clarified on 2026-07-05 that backward compatibility is not needed; the target behavior should be a clean-cut absolute-only invariant for task references.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Tightening
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: task content readback already has an absolute-path invariant, message references enforce the same invariant at input, but task delegation accepts relative paths and persists records that cannot be previewed. Adding task-specific duplicate validation would create a third copy of an already duplicated explicit-reference-file policy.
- Requirement or scope impact: enforce absolute local file paths for all task-delegation reference file inputs and update tool/runtime guidance. No workspace-relative compatibility or migration is in scope.

## Recommendations

- Treat `reference_files` for task delegation as explicit attachments/references, not workspace path hints: each entry must be an absolute local filesystem path.
- Reuse or extract the existing message-reference absolute local path validation policy so task delegation, agent communication, and team communication do not maintain parallel validators.
- Validate task `reference_files` before records are created/updated for:
  - `delegate_task`
  - `submit_task_result`
  - `review_task_result`
- Keep task reference content readback absolute-only; do not add workspace-root resolution, relative-path fallback, or historical record migration.
- Update task-delegation tool descriptions and runtime instructions to match `send_message_to`: agents should use `realpath`, absolute paths returned by file-writing tools, or otherwise pass full absolute paths.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- A teacher/agent calls `delegate_task` with an absolute task reference file path; the task record stores the normalized absolute path and the frontend preview can fetch the content.
- A teacher/agent calls `delegate_task` with a relative task reference file path; the tool call is rejected before a task record is created.
- A task execution target calls `submit_task_result` with relative `reference_files`; the tool call is rejected before a submission/update reference is recorded.
- A task review owner calls `review_task_result` with relative `reference_files`; the tool call is rejected before revision/acceptance context references are recorded.
- Tool descriptions and runtime instructions make the absolute-path requirement explicit.

## Out of Scope

- Supporting workspace-relative task reference content readback.
- Migrating historical task records that already contain relative paths.
- Adding frontend fallback to the Files tab or workspace content route.
- Changing Team Communication/message reference behavior except for possible internal reuse of the same absolute-path validator.
- Changing the Files tab/file explorer behavior.
- Redesigning task reference IDs beyond preserving existing identity route behavior.

## Functional Requirements

- `REQ-001`: Task-delegation `reference_files` entries must be absolute local filesystem path strings.
- `REQ-002`: `delegate_task` must reject any non-absolute, empty, URL/protocol-shaped, null-byte, route-template, or relative-segment task reference path before creating a task record.
- `REQ-003`: `submit_task_result` must reject invalid `reference_files` before recording a task result submission/update.
- `REQ-004`: `review_task_result` must reject invalid `reference_files` before recording review/revision/acceptance context references.
- `REQ-005`: The backend task reference content service must remain identity-owned and absolute-only: it resolves by `teamRunId + taskId + referenceId`, then streams only readable absolute local files stored on the task reference record.
- `REQ-006`: Existing relative task reference records may continue to fail as invalid; no compatibility fallback, workspace-root resolution, or migration is required.
- `REQ-007`: Task-delegation tool schemas, tool descriptions, and runtime instructions must clearly state that `reference_files` require absolute local file paths.
- `REQ-008`: The existing `send_message_to` absolute-path behavior must not regress.
- `REQ-009`: The absolute local reference-file validation policy should have one clear owner or reusable shared structure rather than adding another duplicated validator.

## Acceptance Criteria

- `AC-001`: Calling `delegate_task` with `reference_files: ["math_problem_train_bird.txt"]` returns a validation error that says task `reference_files` must be absolute local file path strings, and no task record is created.
- `AC-002`: Calling `delegate_task` with `reference_files: ["/Users/normy/.autobyteus/server-data/temp_workspace/math_problem_train_bird.txt"]` succeeds when the rest of the task input is valid, stores the normalized absolute path, and the existing task reference preview route can serve the file if it exists/readable.
- `AC-003`: Calling `submit_task_result` or `review_task_result` with a relative reference path is rejected before persistence.
- `AC-004`: Calling task-delegation tools with URL/protocol paths, null-byte paths, `.`/`..` segments, or route-template-shaped segments is rejected before persistence.
- `AC-005`: The task reference content REST route keeps mapping stored non-absolute reference paths to `INVALID_REFERENCE_PATH`/HTTP 400; no workspace-relative fallback is added.
- `AC-006`: `send_message_to.reference_files` still accepts valid absolute local paths and rejects relative paths after any shared-validator extraction.
- `AC-007`: Task-delegation parameter schemas and runtime instruction text explicitly use wording equivalent to “absolute local file paths,” not “paths or references” or “workspace-relative paths.”
- `AC-008`: The final implementation does not contain task-reference workspace-root resolution code for this behavior.

## Constraints / Dependencies

- Must preserve route-owned access: the frontend may provide only `teamRunId`, `taskId`, and `referenceId`; it must not provide raw path authority.
- Must not add dual behavior where task references can be either relative or absolute.
- Must not migrate or rewrite historical task records as part of this change.
- Must not relax Team Communication/message reference validation.
- Must avoid creating a third copy of the same absolute local reference-file validation logic.

## Assumptions

- Agents can obtain absolute paths by using shell commands such as `realpath <file>` or by using absolute paths returned by file-creation/writing tools.
- Requiring absolute paths is acceptable even when agents operate inside a workspace.
- Existing historical relative records are acceptable to leave invalid under the clean-cut target behavior.

## Risks / Open Questions

- The reported existing record will still preview as 400 unless the task is re-created with an absolute reference path. This is accepted by the clarified no-backward-compatibility requirement.
- Refactoring existing agent/team communication validators into a shared owner must preserve error messages closely enough that existing tests remain stable or are intentionally updated.
- The validation owner must not become a generic arbitrary file-read capability; it only normalizes and validates explicit local reference path strings.

## Requirement-To-Use-Case Coverage

- Absolute `delegate_task` reference succeeds and previews: `REQ-001`, `REQ-002`, `REQ-005`, `REQ-007`
- Relative `delegate_task` reference is rejected: `REQ-001`, `REQ-002`, `REQ-006`, `REQ-007`
- Task result/review references are validated: `REQ-001`, `REQ-003`, `REQ-004`
- Adjacent message behavior is preserved: `REQ-008`, `REQ-009`
- No compatibility fallback: `REQ-006`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`: Directly prevents the original relative-path record shape from being created again.
- `AC-002`: Shows the intended successful path for the user’s scenario: pass the real absolute file path.
- `AC-003`: Covers all task-delegation lifecycle surfaces, not only initial delegation.
- `AC-004`: Covers safety-invalid local path shapes.
- `AC-005`: Locks the no-backward-compatibility decision into readback behavior.
- `AC-006`: Protects existing message reference behavior.
- `AC-007`: Prevents future model/tool ambiguity.
- `AC-008`: Ensures obsolete workspace-relative implementation is not retained.

## Approval Status

Refined by explicit user clarification on 2026-07-05: task references should mimic message reference files and no backward compatibility is needed.
