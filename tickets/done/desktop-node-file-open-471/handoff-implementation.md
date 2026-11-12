# autobyteus-471 — Architecture Design Complete (direct implementation route)

- Package: `desktop-node-file-open-471`, SR-002; task_size `Medium`, architectural_risk `Low` → direct implementation (no independent architecture review; implementation self-checks, code review and API/E2E validation still apply)
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471`, `codex/desktop-node-file-open-471`, `origin/personal` @ `827f1e68dc`; finalization target `origin/personal`. Documents uncommitted; no source changed.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user; Project Task `autobyteus-471`.
- Approval: requirements approved by the user (2026-11-11; DEC-001 = C, "remove the limits"); the rest within his direction ("we should fix the desktop as well, because currently it's authenticated").
- Classification rationale: about 10 web files and tests in existing owners; the existing node-file route (436) and credentials (437) are reused; no new route, contract, persistence or security behavior.

## Scope

1. Desktop windows of Docker/remote nodes open any path on the run's node read-only in the Files panel through the node-file route (shared loader extracted from the phone's `useMobileNodeFile`).
2. Plain reasons for missing, folder and unreadable paths on the desktop (the 436 messages).
3. A remote run's path: "This file is on {{node}}, where this run runs." on desktop and phone; `file_available_on_host` removed.
4. The phone shows text files of any size (limit and "too large" removed).

## Documents

`/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471/tickets/in-progress/desktop-node-file-open-471/`: `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`.

## Done when (Task)

On an isolated instance with a Docker node, clicking a path outside the run's folder opens the file on the desktop; a file over 120,000 characters opens on the phone; a missing or unreadable path gives a plain reason; finalized on the base branch; release only on the user's word.
