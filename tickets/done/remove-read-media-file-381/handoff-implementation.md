# Handoff — autobyteus-381 → Implementation

- Result: `Architecture Design Complete`; `task_size = Small`, `architectural_risk = Low`. Route: the rule for Small/Medium with Low → `/software_engineering_team/implementation_engineer` (rules read 2026-11-04).
- Package: `remove-read-media-file-381`, SR-001.
- Task: autobyteus-381, requested by `/project_task_manager` for the user.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-read-media-file-381`.
  - Branch: `codex/remove-read-media-file-381`.
  - Base: `origin/personal` `fe351591f2`; finalization target: `origin/personal`.
- Ticket folder: `tickets/in-progress/remove-read-media-file-381/` in the worktree.

## Original request (summary)

Remove what is left of the old `read_media_file` tool:
1. rename the helper;
2. remove the Work Journal converter with its fixtures, tests and doc line;
3. remove the "launch fallback" test and doc line.

The user's constraints: do not touch existing data; no migration; no change to journal or raw-trace files; no renderer revision bump and no re-render; stored definitions counted only (done: they are handled by the general rule). No release.

## What to do

`design-spec.md` § Change / Refactor Sequence. Key points:
- **Helper:** rename it to `readMediaAsContextFile`.
- **Journal:**
  - remove the converter, but keep `mediaReadRecorded`;
  - regenerate the golden `unchanged-groups-before.json` from the base commit's renderer with the synthetic row removed, and check that its diff contains only that call's lines and the shifted `rt_NNN` numbers;
  - `WORK_JOURNAL_RENDERER_REVISION` stays 2;
  - add one general sentence (no tool name) to "Changing The Wording".
- **Resolver:** remove the AC-006 test only. No resolver code changes.
- **Leave alone:** the v1.5.11 release notes, `test-results/` logs and `tickets/` (historical).

## Acceptance

AC-001..AC-006 in `requirements-doc.md`.

## Follow-ups

None.
