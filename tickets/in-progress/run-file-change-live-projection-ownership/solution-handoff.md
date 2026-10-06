# Solution Handoff — run-file-change-live-projection-ownership

- Result: `Architecture Design Complete`
- Package identifier: `run-file-change-live-projection-ownership`
- Solution revision: `SR-001`
- Classification: `task_size=Medium`, `architectural_risk=High` (ownership-boundary correction and cache-lifecycle change; see design-spec §Task Size And Architectural Risk)
- Applied handoff rule: "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/architecture_reviewer`
- Expected output: independent architecture review (Pass / Fail with findings) of this package.

## Original Request

User (2026-10-06): in the Marketing Team run, `marketing_content_creator` (agy runtime) generated several images. Only the first previews in the Artifacts tab; the others show "File not found — deleted or moved". The user asked whether the files really moved. The user then approved the fix ("since you found the bug, please work on the ticket now. the requirement is clear.") and asked for an explicit check of whether this is a design issue that needs refactoring.

## Summary Of Findings

- The files were not moved. All three images exist, and all three entries are in `file_changes.json` with status `available`.
- Live reproduction: the content endpoint returns 200 for the first image and `404 "File change not found"` for the later two.
- Root cause (design issue, `Boundary Or Ownership Issue` + `Missing Invariant`):
  - The process writer is a `RunFileChangeService` instance constructed in `GeneralProcessRunSupervisor`.
  - The read path (GraphQL `getRunFileChanges`, REST `/file-change-content`) uses an orphaned module singleton `getRunFileChangeService()` that nothing attaches runs to.
  - Its `load()` caches the first disk snapshot of an active run forever.
  - The split was introduced by composition refactors `ae5a1c7bc` and `8704f2653`.
- Design: bind the single process authority (existing `bindProcess*` pattern); cache only attached runs and read fresh from disk otherwise; the reader resolves the authority per call; delete the orphan singleton. No API or persistence change.

## Approval Basis

- Requirements: `Approved` (2026-10-06, user message quoted above). No behavior-defining supplements.

## Workspace

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership`
- Branch: `codex/run-file-change-live-projection-ownership`
- Base: `origin/personal` @ `5c74fed71`. The affected files are identical to `d9ffaa7cb`, where the defect was reproduced.
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/requirements-doc.md`
- Investigation notes: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/investigation-notes.md`
- Design spec: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/design-spec.md`
- Solution revision record: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/solution-revision-record.md`
- Supplements: None
- Prior review artifacts: `N/A — not applicable` (first round)

## Scope And Scenarios

- In scope: UC-001..UC-003 / SCN-001..SCN-003 / REQ-001..REQ-004 / AC-001..AC-006.
- Out of scope: frontend 404 wording (RSK-001), `FILE_CHANGE` derivation, `file_changes.json` format, application artifact publication.

## Open Risks

- Startup ordering: the getter becomes bind-required. The only production caller resolves at request time.
- Tests relying on the implicit singleton need explicit binding or injection.
- RSK-001: frontend wording, non-blocking, separate-ticket candidate.

## Next Expected Action

Architecture Reviewer reviews the package.
