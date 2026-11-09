# Handoff — autobyteus-446, SR-002: Architecture Design Complete

- Package: `phone-run-list-follow-446` (Project Task `autobyteus-446`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Result: `Architecture Design Complete`; `task_size: Medium`, `architectural_risk: Low`
- Route (`get_handoff_rules`, 2026-11-09): `/software_engineering_team/implementation_engineer`. Rule: Small or Medium and Low risk → direct implementation, no independent architecture review. Implementation self-checks, API/E2E validation and delivery still apply.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446`, branch `codex/phone-run-list-follow-446`, base `origin/personal` at `a85bf4f38d` (v1.5.12-beta.10); finalization target `origin/personal`. No product code is changed. The ticket documents are on disk, not committed. The server and phone bundle are already built in the worktree.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446/tickets/in-progress/phone-run-list-follow-446/`

## Original request

The phone kept listing a closed Task's Software Engineering Team copy that the desktop had already removed. The user asked to find out why: a bug or a network delay. Fix it only if it is a bug. Done when it is reproduced before the fix; after it, the run leaves the phone list (live and after reload); there is a regression test; and the work is finalized, cleaned up and follow-ups recorded. Constraints: isolated node only, no change to stored data, DESIGN.md and TESTING.md, release only on the user's word.

## Cause (reproduced; `investigation-notes.md`)

A bug, not network. A list learns of a Task closing only through the live stream of its open run. Other listed hosts are refreshed every 5 s by a states-only read that never notices closures. Measured on the phone bundle:
- the phone with the host run open dropped the rows in 2 ms;
- the phone with another run open still listed them after 120 s;
- a reload removed them.

## Approval basis

Requirements SR-001 were approved by the Solution Designer within the Task's direction ("fix it only if it is a bug"), with the user and the PM informed (2026-11-09).

## What to build (`design-spec.md`)

- The contracts package gets `closedTaskExecutionsDigest`.
- The node's `agentRunCollaborationStatuses` answer gains `closedTaskExecutionsDigest` for active hosts.
- The store's `refreshListedStatuses` re-reads a host's view when the digest differs from the digest of its context's `closed_task_executions`.

The sequence, tests and probe case are in the design's Change / Refactor Sequence. A fresh-start build check applies because the contracts package changes.

## Reproduction to start from

`node /Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446/tickets/in-progress/phone-run-list-follow-446/evidence/repro/closed-task-rows-repro.mjs --output-dir=<fresh> --wait-s=120`. Today `goneAfterMs.other: null`; after the fix ≤ 10 000 ms.

## Open items

- Validation checks that Team hosts are unaffected (design Risks).
- FU-001 (inactive hosts) and FU-002 (key copies) are in `follow-ups.md`; they are sent when the ticket leaves the team.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/repro/closed-task-rows-repro.mjs` (results in `evidence/repro-run-1/`).
