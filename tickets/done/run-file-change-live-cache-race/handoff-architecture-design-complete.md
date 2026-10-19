# Handoff: Architecture Design Complete (SR-002), direct implementation route

- **Package identifier:** `run-file-change-live-cache-race`
- **Project Task:** autobyteus-180
- **Result:** `Architecture Design Complete`
- **Classification:** `task_size = Small`, `architectural_risk = Low`. Rationale: one private method (`RunFileChangeService.load`) in one owner. No API, persistence-shape, ownership, deployment or concurrency-primitive change. Deterministic tests cover the ordering.
- **Route:** direct implementation, with no independent architecture review (team rules). Implementation self-checks and API/E2E validation still apply.
- **Current SR entry:** `SR-002`
- **Approval:** requirements `Approved` by the Solution Designer within the Task's direction. There is no `Needs user` decision. The user was informed on 2026-10-19.

## Original request

Project Task autobyteus-180 from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). It is follow-up FU-C of autobyteus-153.

- **Defect:** in `RunFileChangeService.load`, a first read that overlaps a running agent's first file change overwrites the live cache with a stale projection.
- **Done when:**
  - a regression test proves the fix;
  - the E2E loop no longer fails in repeated runs;
  - the fix is merged and ships with the next release.

## Goals and scope

- **REQ-001:** the live list keeps every recorded file.
- **REQ-002:** the saved record keeps every recorded file. Investigation found that the next file change persists the stale cache, so the entry is lost on disk permanently. Probe: `probes/race-disk-probe-run1.txt`.
- **REQ-003:** add regression tests and remove the E2E's workaround wait.
- **REQ-004:** everything else is preserved.
- **Out of scope:** repairing past losses (not recoverable), client store policy, and other caches.

## Design summary

After its stored read returns, `load` fills the cache only if the cache is still empty. Otherwise it returns a copy of the newer cache, and the detach guard is kept. Reads never wait for the event queue. See `design-spec.md` → Final File Responsibility Mapping and Concrete Examples.

Files:
- `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`
- `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-service.test.ts`
- `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` (remove the stored-record wait, comment lines 22-24, and the helper at 68-74 if it is unused)

## Verification intent

| AC | What to prove | How |
| --- | --- | --- |
| AC-001 | Later live reads list the file after an overlapping first read | Unit test |
| AC-002 | After a second event, the saved record and the live list hold both files, and a fresh read after detach lists both | Unit test |
| AC-003 | The owner-scoped E2E without the wait passes 10 or more consecutive runs | Gated E2E loop; the command is in the test header |
| AC-004 | Existing service unit tests and run-file-changes integration tests stay green | Existing tests |

## Workspace

- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race`
- **Branch:** `codex/run-file-change-live-cache-race`
- **Base:** `origin/personal` @ `87732d5504`
- **Finalization target:** `origin/personal`
- **State:** `pnpm install` and server `prebuild` are done. Ticket documents are not committed. The temporary probe is already removed from the source tree.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/probes/race-disk-probe.test.ts.txt`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/probes/race-disk-probe-run1.txt`
- Task evidence:
  - `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_23ec1db9-8217-48d0-b68b-2b018c163302/context/ctx_d2a07083e8fc__API-08-run-file-change-cache-race.probe.test.ts.txt`
  - `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_23ec1db9-8217-48d0-b68b-2b018c163302/context/ctx_3e19e07fba65__API-04b-stability-loops.txt`
- Review artifacts: `N/A — not applicable` (direct route).

## Open risks

- **R-001:** a run is detached and re-attached within one disk read. This is contrived, and the risk is accepted.
- **R-002:** entries lost before the fix cannot be restored. The release-notes line says so.

## Expected next action

Implementation by `/software_engineering_team/implementation_engineer`.

## Route record

`get_handoff_rules` (2026-10-19): the "Small or Medium and Low" rule matches, so this goes to `/software_engineering_team/implementation_engineer`. No other rule matches.
