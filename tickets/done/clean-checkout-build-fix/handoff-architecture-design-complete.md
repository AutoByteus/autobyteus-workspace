# Handoff: Architecture Design Complete: clean-checkout-build-fix (autobyteus-282, URGENT)

- Classification: task_size `Medium`, architectural_risk `Low`, so the direct implementation route applies (handoff rules).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-checkout-build-fix`, branch `codex/clean-checkout-build-fix`, base `origin/personal` @ `1c9edce551`; finalization target `origin/personal`; no release.
- Goal (Task): a clean checkout of `personal` builds the server. Restore 280's frozen memory modules; stop the `memory` ignore rule from hiding source; prevent a repeat. It blocks autobyteus-210's delivery and every ticket's server checks.
- Approval: within the Task's direction (urgent fix, goal fully stated); user informed.
- Plan: `design-spec.md`.
  - D-1: restore from `autobyteus-ts/src` at `9b013fcc09`, whole files plus the dependencies `tsc` needs.
  - D-2: `/memory/`.
  - D-3/D-4: a tracked-import check in `scripts/check_repository_artifact_hygiene.py`, run by a new server architecture test.
- Proof required: AC-001 **from a fresh clone**, not a worktree.
- Why 280 missed it: investigation C-07.
- Follow-up: FU-001 (dead prompt-engineering tests).
