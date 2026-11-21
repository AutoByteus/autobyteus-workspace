# Handoff: Architecture Design Complete — autobyteus-584 (ios-demo-operation-coverage)

- Result: `Architecture Design Complete`, SR-001, task_size `Small`, architectural_risk `Low` → direct implementation.
- Package: `ios-demo-operation-coverage` (Project Task autobyteus-584); requested by `/project_task_manager`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage/tickets/in-progress/ios-demo-operation-coverage`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage`, `codex/ios-demo-operation-coverage` (see `git log -1`); base `origin/personal` `90c4958a35` (the beta.4 tag); finalization target `origin/personal`. No release tag in this Task.
- Approval: Solution Designer within the direction; user informed.

## Root cause

The demo build's coverage rule runs only at the end of a `--demo` build, which no local check runs; autobyteus-554 changed GraphQL documents and its four memory operations reached the release unlisted (and one entry went stale). Reproduced with `autobyteus-ios/scripts/prepare-demo-web.sh --build`.

## Design

D-1 list the four with reason `memory`, drop `ListAgentRunsWithMemory`; D-2 the rule takes an operations set, plus `sourceOperations(webRoot)`; D-3 a spec case applies it to the real source (no build); D-4 `TESTING.md` row (API/E2E owns it). Proof: the spec fails on the base and passes after; `prepare-demo-web.sh --build` passes; a build-only iOS workflow run passes (command in the design).

## Route record

`get_handoff_rules` (2026-11-21): Small / Low → `/implementation_engineer`.
