# Delivery Integration Conflict Report

## Summary

- Ticket: `agent-idle-status-lifecycle`
- Date: `2026-07-22`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Ticket branch: `codex/agent-idle-status-lifecycle`
- User request: refresh the ticket branch onto the latest `origin/personal`, then rebuild the Electron app for testing.
- Delivery result: `Blocked before rebuild`
- Classification: `Local Fix — implementation-owned source integration with effective lifecycle-behavior risk`
- Required owner: `implementation_engineer`

## Protected Candidate And Latest Base

- Previously integrated and checked ticket head: `1ae7ad7f5f69dc31536ac0970d54d164ea405c91`, based on `origin/personal@9b4e038a40e0b6358fe53ca101406e0f6446e790` (`v1.4.23`).
- Delivery-safety checkpoint created before refresh: `0c4cc5c733004051f19914afa6b1dd5b23b2fb60` (`chore(delivery): checkpoint v1.4.23 Electron package`). This preserves the reviewed implementation, eight reviewed durable test paths, delivery reports, and the prior successful Electron package evidence.
- Latest tracked base after `git fetch origin personal --tags`: `origin/personal@965f97685c08569a98186b2a894243c0b3f602d3` (`docs(delivery): record v1.4.24 finalization`).
- Base advance: 33 commits beyond the prior `origin/personal@9b4e038a40e0b6358fe53ca101406e0f6446e790` integration.
- Integration command: `git merge --no-edit origin/personal`
- Integration state: merge remains in progress so the implementation owner can reconcile and stage the reviewed resolution.

## Conflict And Effective-Behavior Risk

- Unmerged source path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- The latest base adds Event Monitor mutation-window integration through `beginRecentEventMonitorMutation` and `commitRecentEventMonitorMutation`. That new active-trace/Event Monitor behavior must be retained.
- The latest base also reintroduces `LIVE_RUNTIME_ACTIVITY_MESSAGE_TYPES`, `isLiveRuntimeActivityMessage`, and `applyLiveRuntimeActivityProjectionRepair`, applying frontend lifecycle repair when ordinary activity arrives.
- This ticket's approved and reviewed contract explicitly removes those three activity-repair elements. Ordinary activity must remain content-only and must not reopen, repair, or infer lifecycle state. Streamed lifecycle changes only through canonical `AGENT_STATUS`; exact-turn recovery is emitted by the backend lifecycle transformer as an explicit status event.
- Therefore this is not a mechanical import conflict. Accepting the latest-base activity-repair path would materially regress the ticket's lifecycle semantics, while rejecting the latest-base side wholesale would discard new Event Monitor behavior.

## Required Resolution

The implementation owner must reconcile the latest base and ticket behavior so that:

1. The latest-base Event Monitor mutation baseline/commit path and active-trace paging behavior are preserved.
2. `AgentStreamingService` does not infer or repair lifecycle status from `TURN_STARTED`, segment, tool, todo, inter-agent, system-task, or other ordinary activity.
3. `LIVE_RUNTIME_ACTIVITY_MESSAGE_TYPES`, `isLiveRuntimeActivityMessage`, and the `applyLiveRuntimeActivityProjectionRepair` import/call do not survive as an activity-driven lifecycle path.
4. Canonical `AGENT_STATUS` remains the sole streamed lifecycle input at the frontend boundary, apart from the already approved explicit command/runtime projection overlays.
5. Latest-base streaming/Event Monitor tests are reconciled with the ticket's no-activity-reopen tests, and focused implementation checks pass.

## Required Review Route

After the implementation-owned merge resolution:

1. `implementation_engineer` completes the source reconciliation and implementation-scoped checks.
2. `code_reviewer` repeats source review for the integrated fix.
3. `api_e2e_engineer` reruns the applicable API/E2E and realistic lifecycle coverage on the latest-base integrated state.
4. `code_reviewer` performs proportional review of any durable test-code delta.
5. `delivery_engineer` resumes latest-base delivery checks and rebuilds Electron only after those gates pass.

## Rebuild And Finalization Status

- Electron rebuild: `Not started`. Building from an unresolved, behavior-sensitive merge would not provide a valid test candidate.
- Post-integration smoke: `Not started`; no integrated source state exists yet.
- Repository push/finalization/release/deployment: `Not started` and still subject to explicit user verification after a valid rebuilt candidate exists.
- Prior v1.4.23 build: preserved as history only and superseded for the user's latest-base request.
