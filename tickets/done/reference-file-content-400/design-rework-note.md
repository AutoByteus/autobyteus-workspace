# Design Rework Note

Date: 2026-07-05
Owner: solution_designer

## Reason For Rework

After the initial design/implementation direction considered workspace-relative task reference readback, the user clarified that backward compatibility is not required and that task `reference_files` should mimic `send_message_to.reference_files`.

## Revised Decision

Task-delegation `reference_files` are absolute-only going forward.

- `delegate_task`, `submit_task_result`, and `review_task_result` must reject relative reference paths before persistence.
- `TaskDelegationReferenceContentService` should remain absolute-only.
- Do not add workspace-root resolution, relative-path fallback, frontend fallback, or historical record migration.
- Update task tool descriptions/runtime instructions to clearly require absolute local file paths.
- Reuse/extract the existing message-reference absolute-path validation policy rather than adding a third duplicate validator.

## Superseded Direction

The prior workspace-relative compatibility direction is superseded. Any implementation or review notes that describe adding these files/behaviors are stale for the revised requirement:

- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-path.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-workspace-resolver.ts`
- workspace-relative task reference content service changes
- workspace-relative task reference API/integration tests

The solution designer cleaned those stale uncommitted implementation files from the worktree before this revised handoff.

## Authoritative Revised Artifacts

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/design-spec.md`

## Verified Cleanup After Architecture Review AR-001

Date: 2026-07-05

Architecture review round 2 correctly found that the stale workspace-relative draft was still present in the worktree. The solution designer then force-restored the tracked stale source/test files from `HEAD` and removed the untracked workspace-relative resolver/integration-test files.

Verification command run after cleanup:

```bash
git status --short --branch --untracked-files=all
```

Observed result after cleanup:

```text
## codex/reference-file-content-400...origin/personal
?? tickets/done/reference-file-content-400/api-e2e-coverage-investigation.md
?? tickets/done/reference-file-content-400/code-review-report.md
?? tickets/done/reference-file-content-400/design-review-report.md
?? tickets/done/reference-file-content-400/design-rework-note.md
?? tickets/done/reference-file-content-400/design-spec.md
?? tickets/done/reference-file-content-400/implementation-handoff.md
?? tickets/done/reference-file-content-400/investigation-notes.md
?? tickets/done/reference-file-content-400/requirements.md
```

Additional verification:

- `git diff --stat -- autobyteus-server-ts` is empty.
- These superseded workspace-relative files are absent:
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-path.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-workspace-resolver.ts`
  - `autobyteus-server-ts/tests/integration/api/task-delegation-reference-content-api.integration.test.ts`
- `TaskDelegationReferenceContentService` is back to the base absolute-only implementation and has no workspace metadata resolver dependency.

Important handoff nuance:

- The repository source is now pre-implementation/base state except ticket artifacts.
- The absolute-only task schema/runtime wording is specified in the revised design as implementation work. The base source currently contains its original vague wording, but it no longer contains the superseded workspace-relative wording or resolver code.
- Implementation must now apply the absolute-only target described in `design-spec.md`.
