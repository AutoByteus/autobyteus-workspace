# Handoff Summary: run-expand-motion (autobyteus-390)

- Status: verified from the evidence, archived and finalized on `personal`. **No release:** AC-004, "release only on the user's word".
- Classification: `task_size=Small`, `architectural_risk=Low`, direct route; no test-code review. API/E2E API-REV-002 Pass, 94%.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion`, branch `codex/run-expand-motion`.

## What Changed

- In the left panel's Runs view, expanding a run no longer makes its delegated rows "drop from the sky".
  - `RunListPanel` turns the `tree-row` move transition off in its scroll container.
  - `RunListRow` is back to `v-show`.
- Rows appear at their final place in the first frame, with their Task line. Collapse hides them at once.
- A DONE Task's row still fades, and the row below glides up.
- The Workspaces and Projects views keep their motion.

## Integration

- Already current with `origin/personal` @ `4500e7278d`. No new base commits, so delivery made no rerun.
- The user questioned a full delivery clean-clone rerun as over-building. It was stopped, because this ticket's AC-004 asks only for passing suites, the branch was current, and API/E2E had already proven the suites and the fresh-start build.

## Verification From Evidence

- `API-RXM-r4/delegated-launch-defaults-evidence.json`, read directly: RXM-001, RXM-002 and RXM-003 Pass, `browserErrors: []`.
  - Expand shows all 4 rows at their final tops (503/551/599/647) from the first frame, with `transform: none`.
  - The DONE row fades 1 → 0 over 216 ms, and the row below glides 551 → 505.
  - Fold, Runs → Workspaces → Runs and unfold leave the rows unchanged, with no new read.
- The fixture probe fails on the base (IMP-09) and on SR-001's code (IMP-10).
- AC-006: `task-closure-tree` BR-001…016 passes unchanged (API-07); IMP-08 REM-07 shows the motion is kept outside the Runs view.
- AC-004:
  - suites IMP-07 and IMP-11;
  - the fresh-start **unsigned** desktop build (`API-06-fresh-start-r3.log`): fresh clone, `pnpm install --frozen-lockfile` alone, `build:electron:mac -- --arm64`, typecheck PASS at the 99 baseline, `.dmg` and `.zip` built, and the Prisma and terminal-runtime verify steps pass.
  - Signing and notarization happen only on the release runner, and were not tested.
- No user check is needed.

## Residual

- OBS-1 (not this ticket): the Runs view's fold resets on a view switch; that is existing behavior from autobyteus-385.

## Release

- Decision: no release (AC-004). It will ship in the next beta the user asks for.
