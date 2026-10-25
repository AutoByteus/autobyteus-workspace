# Requirements Document: clean-checkout-build-fix

- Status: `Approved` (by the Solution Designer within the Task's direction; the Task is an urgent fix with its goal fully stated; user informed)
- Revision: SR-001
- Request: Project Task autobyteus-282, from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer; date 2026-10-24

## Problem And Goal

- **Problem:** a clean checkout of `personal` does not build the server. 280's frozen memory modules were never committed because of the bare `memory` ignore rule (C-01..C-03).
- **Goal:**
  - a clean checkout builds and its tests load;
  - the ignore rule no longer hides source;
  - a check prevents tracked code from importing untracked files again.

## Scope Guardrail

- **In scope:**
  - restore the 9 frozen files and whatever library code they need, as frozen copies inside `frozen/autobyteus-ts/`;
  - anchor the rule;
  - a guard against imports of untracked files.
- **Out of scope:** changing any migration's behavior; the dead prompt-engineering tests (FU-001); a release.
- **Preserved:** every migration's output; the 280 boundary test passes.
- **Prerequisites:** none.

## Requirements

| REQ | Requirement |
| --- | --- |
| REQ-001 | Every file that tracked code under `autobyteus-server-ts/src` and `tests` imports exists in git. The 9 frozen files (C-03) and their needed dependencies are restored as frozen copies of the library sources at the version 280 froze (unchanged since, C-04), under `frozen/autobyteus-ts/<original path>` |
| REQ-002 | `autobyteus-server-ts/.gitignore` ignores only the runtime data folder `/memory/` at the server root, not source folders named `memory` |
| REQ-003 | A check fails when tracked code (server `src`/`tests`, `autobyteus-ts/src`, `autobyteus-web` source) imports a relative path that is not a tracked file. It runs in the normal server test run, and in the pre-tag hygiene check that release workflows run, because an ignored file on the developer's disk must not hide the problem |
| REQ-004 | The migrations behave as before. The 280 suites (migration unit, integration, startup e2e) and the architecture boundary test pass |

## Acceptance Criteria

| AC | Expected outcome |
| --- | --- |
| AC-001 | In a **fresh clone** of the finalized commit (not a worktree that carries ignored files): server `tsc` exits 0; `test:integration:prepare` succeeds; the server unit and e2e suites load; the migration suites and the 280 architecture tests pass |
| AC-002 | `git check-ignore` no longer matches `src/app-data-migrations/frozen/autobyteus-ts/memory/**`, and still matches `autobyteus-server-ts/memory/` |
| AC-003 | The new check fails on a fixture that imports an untracked (or ignored) file, and passes on the finalized tree |

## Decisions

| DEC | Question | Decision |
| --- | --- | --- |
| DEC-001 | Restore from what? | The library sources at 280's freeze (C-04; unchanged). Copy whole files: the trimmed versions were never committed and cannot be recovered. They are the same code, so the behavior is the same, and the existing tests prove it |
| DEC-002 | Prevention | A tracked-import check (REQ-003), not "remember to build from a clean clone": it catches the problem in any checkout, including the worktree where it happened |
