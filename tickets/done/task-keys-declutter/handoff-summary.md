# Handoff Summary — task-keys-declutter

> **Status (DR-001): verified; release decision Stable `v1.5.5` (user, 2026-10-17); release notes shown to the user, used as drafted.**

## What Shipped

- Board cards (Projects page and right-panel tab) no longer show the Task key line; each card starts with its summary.
- The Workspaces-tree Task summary shows only the summary. Its tooltip and accessible name read "Show Task in Projects: <summary>".
- Keys stay where they link or refer to a Task: the Task page and tab Task view chip, Depends on / Required by rows, badges and their hover list, the picker, and URLs.
- `TaskWorkerTaskView` no longer has `taskKey` (server GraphQL type, web query, store and types).

## Classification And Route

- `task_size=Small`, `architectural_risk=Low`; Direct route (SR-001 → IR-001 → API-REV-001). Architecture, source and test-code review: Not Applicable (direct low-risk route).

## Integrated State

- Base `origin/personal@aa84fd026c`; the branch was current at delivery start (0 behind). No merge was needed.
- Checks on this state:
  - API/E2E: server typecheck pass; Projects/GraphQL unit 306/306; web unit 4,473 pass; guards pass; Projects probe 17/17; PM-UX probe 25/25; isolated desktop DSK-D1..D4.
  - Delivery's extra full server unit run: 715 files, 5,811 tests passed, 0 failed (`evidence/delivery/server-unit.log`).

## Verification

- Verified from the evidence. Every AC is proven, at 97.2% confidence. Delivery read `dsk-declutter.json` (0 key lines on every card; badge "Blocked by autobyteus-1" with its key tooltip; tree copy and Temp copy without keys; chip `autobyteus-2`, rows and picker by key) and the board and tree screenshots.
- User check: requested by the Task's Done-when, after the release.

## Release

- **Stable `v1.5.5`**. The user said "stable please" on 2026-10-17, and had said in advance that this task needs a stable release. The Task's Done-when says "a beta release"; the user's later decision supersedes it.
- The release includes everything merged since `v1.5.4`. The curated notes are in `release-notes.md`.

## Known Limits

- RSK-001 (accepted by the user): a badge names a key that no card shows. Hover and the Task page cover it.
- DEC-004: the Product design record update goes through `/project_task_manager`.
