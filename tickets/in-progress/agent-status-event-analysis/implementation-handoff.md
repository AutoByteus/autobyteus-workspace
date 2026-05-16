# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/design-review-report.md`

## What Changed

Implemented the fresh, independently reviewed four-state status source-of-truth design.

- Canonical backend/frontend status vocabulary is now `offline | idle | running | error`.
- `AGENT_STATUS` target payload is `{ status, can_interrupt, agent_id?, agent_name? }`.
- `TEAM_STATUS` target payload is aggregate-only `{ status }`; it does not carry `can_interrupt`.
- Runtime-specific backend status projectors now derive status from each runtime owner:
  - AutoByteus agent context/native status + active-turn state.
  - Codex `CodexThread` state; raw `thread/status/changed` is consumed as thread state input and is not forwarded raw.
  - Claude `ClaudeSession` state; no listener-derived snapshot authority.
- Inactive/no-runtime agent/team/member snapshots resolve to `offline`; active idle runtimes remain `idle`.
- Team aggregate status has one shared owner, `deriveTeamApiStatus(...)`, with precedence `error > running > idle > offline`.
- Backend run-history list APIs now expose normalized `status` for agent rows, team rows, and team-member rows:
  - active rows use live runtime/team snapshots;
  - inactive non-error rows are `offline`;
  - historical errors are `error`.
- Frontend status enums, stream payload types, hydration/open/recovery flows, history read models, sidebar display, running rows, local termination, and team/member projection code consume the four-state model.
- Frontend interrupt affordance is controlled by selected agent/member `canInterrupt` from backend-owned `can_interrupt`; `isSending` remains local submit/disable state only.
- Existing status docs touched by the branch were updated from the prior partial three-state wording to the four-state contract.
- API/E2E local fix `VAL-FS-008`: successful single-agent termination now publishes a terminal live `AGENT_STATUS { status: "offline", can_interrupt: false }` from the `AgentRun` status/event boundary after the backend accepts termination and before callers proceed to active-run cleanup/stream teardown.
- AR-004 rework: active/running team aggregate state is no longer fanned out to every team member in frontend history load, recovery, hydration/open, local active helpers, or team read-model overlays.
  - Active team rows may be `running`, but member rows/contexts use member-scoped history statuses, member snapshots/events, preserved member-scoped live context status, or an `offline/canInterrupt=false` unknown placeholder.
  - `memberStatuses: []` now means no member-scoped status snapshot is available; it does not imply all members are running.
- Interrupt-permission rework / AC-014:
  - Added `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` as the frontend mutation boundary for `AgentRunState.currentStatus` and `canInterrupt`.
  - Live `AGENT_STATUS.can_interrupt` is now applied through that boundary and remains the only path that can grant interrupt permission.
  - History refresh, recovery, open, hydration, and local cleanup now use explicit boundary methods for live status events, active placeholders, member/history snapshots, and offline/terminal cleanup.
  - Existing active subscribed single-agent and focused team-member contexts preserve backend-granted `canInterrupt=true` through history refresh/reconcile and active recovery until a later live status or explicit cleanup revokes it.
- CR-003 local fix:
  - `applyMemberOrHistoryStatusSnapshot(...)` now always clears `canInterrupt` for `offline` and `error` projections, even when a caller asks to preserve live interrupt permission for active/subscribed contexts.
  - Inactive single-agent run-open/hydration of an existing subscribed context now lands at `offline/canInterrupt=false` and disconnects the stream instead of preserving stale interrupt permission.

## Key Files Or Areas

Backend:

- `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-status-payload.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts`
- `autobyteus-server-ts/src/agent-execution/backends/{autobyteus,codex,claude}/...` status projectors/converters/backends
- `autobyteus-server-ts/src/agent-team-execution/backends/{autobyteus,codex,claude,mixed}/...`
- `autobyteus-server-ts/src/run-history/services/{agent-run-history-service,team-run-history-service}.ts`
- `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `autobyteus-server-ts/src/services/agent-streaming/*`

Frontend:

- `autobyteus-web/types/agent/{AgentStatus,AgentTeamStatus,AgentRunState}.ts`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/services/agentStreaming/handlers/{agentStatusHandler,teamHandler}.ts`
- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`
- `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
- `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts`
- `autobyteus-web/services/runOpen/*`
- `autobyteus-web/stores/runHistory*`, `agentRunStore.ts`, `agentTeamRunStore.ts`, context stores
- `autobyteus-web/utils/runTree*`
- `autobyteus-web/components/workspace/**` and `components/agentInput/AgentUserInputTextArea.vue`
- `autobyteus-web/graphql/queries/runHistoryQueries.ts`, `autobyteus-web/generated/graphql.ts`

Tests:

- `autobyteus-server-ts/tests/unit/agent-execution/agent-api-status-projectors.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/team-status-aggregation.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/services/{agent-run-history-service,team-run-history-service}.test.ts`
- `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `autobyteus-web/stores/__tests__/agentContextsStore.spec.ts`
- `autobyteus-web/services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts`
- `autobyteus-web/services/runOpen/__tests__/agentRunOpenCoordinator.integration.spec.ts`
- `autobyteus-web/services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts`
- `autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts`
- `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`
- `autobyteus-web/utils/__tests__/runTreeLiveStatusMerge.spec.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel*.spec.ts`

## Important Assumptions

- Native/provider runtimes may keep detailed internal lifecycle states. The public API/UI status contract collapses them at the server/frontend boundary.
- `TASK_PLAN_EVENT.new_status` remains a task-management field and is intentionally outside the `AGENT_STATUS` / `TEAM_STATUS` contract.
- API/E2E validation setup and execution remain downstream-owned; this handoff includes implementation-scoped checks only.

## Known Risks

- Full `autobyteus-web` typecheck still fails with broad pre-existing project-wide typing issues outside this status surface. I did not attempt to fix unrelated build-script, missing-module, generated GraphQL, browser-shell bridge, and unrelated fixture typings.
- Real runtime API/E2E coverage is still needed for live WebSocket ordering, reconnect snapshots, browser sidebar behavior, interrupt affordance, confirmation that the `VAL-FS-008` terminal offline publication fix is visible across AutoByteus, Codex, and Claude browser WebSocket flows, AC-013 Electron-like restart behavior with one running team member plus offline members, and AC-014 browser-visible preservation of the stop button after refresh/recovery.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix + Behavior Change + Refactor
- Reviewed root-cause classification: Missing Invariant + Boundary Or Ownership Issue + Duplicated Policy Or Coordination + Shared Structure Looseness + Legacy Or Compatibility Pressure
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes:
  - Status ownership is at runtime projectors/snapshot boundaries.
  - Team aggregate status is centralized in `team-status-aggregation.ts`.
  - History first-load now receives normalized backend `status` instead of deriving display status from `lastKnownStatus=IDLE`.
  - Frontend API-visible status enums are only `Offline`, `Idle`, `Running`, `Error`.
  - Interrupt authority is `can_interrupt` / selected `canInterrupt`, not `isSending`.
  - AR-004 implementation keeps team aggregate status scoped to team rows; member contexts/rows are never derived from `TEAM_STATUS.status`, team `isActive`, or `resumeConfig.isActive`.
  - AC-014 implementation keeps all production `AgentRunState.currentStatus` / `canInterrupt` writes behind the new frontend runtime status/action mutation boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - No target `AGENT_STATUS` / `TEAM_STATUS` dual-read fallback such as `payload.status || payload.new_status` was added.
  - No target `AGENT_STATUS` / `TEAM_STATUS` `new_status` / `old_status` emission remains.
  - Exact `getStatus(` grep under `src/agent-execution` and `src/agent-team-execution` returns no old authoritative run/team status methods.
  - Remaining `new_status` source matches are task-plan payload handling only, outside the status contract.
  - Codex `thread/status/changed` remains a provider state input; outbound `AGENT_STATUS` is projected from `CodexThread` status snapshot.
  - Claude completion ordering continues to apply terminal idle state before `TURN_COMPLETED` emits its paired status projection.
  - The termination fix emits the new canonical `status: "offline"` payload only; it does not add legacy termination fallback fields or dual-read compatibility.
  - AR-004 grep guardrail after rework found no target `memberStatuses: []` active-team status seeding and no target `memberContext.state.currentStatus = AgentStatus.Running` aggregate fan-out path. Remaining `AgentStatus.Running` matches in the reviewed target set are single-agent active-run metadata only.
  - CR-003 local fix tightened the mutation boundary rather than adding a call-site compatibility branch: `offline`/`error` projections are terminal for interrupt permission and always clear `canInterrupt`.
  - AC-014 direct-write audit after rework:
    - `rg -n "\\.canInterrupt\\s*=" autobyteus-web/services autobyteus-web/stores autobyteus-web/components autobyteus-web/utils -g '*.ts' -g '*.vue' -g '!**/__tests__/**' -g '!**/*.spec.ts' -g '!**/*.test.ts'` returns only `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`.
    - `rg -n "state\\.currentStatus\\s*=" autobyteus-web/services autobyteus-web/stores autobyteus-web/components autobyteus-web/utils -g '*.ts' -g '*.vue' -g '!**/__tests__/**' -g '!**/*.spec.ts' -g '!**/*.test.ts'` returns only `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis`
- No dependency or lockfile changes were needed.

## Local Implementation Checks Run

Passed:

- `git diff --check`
- `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit`
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-execution/agent-api-status-projectors.test.ts tests/unit/agent-team-execution/team-status-aggregation.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts tests/unit/run-history/services/team-run-history-service.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
  - Result: 7 test files passed, 73 tests passed.
- `cd autobyteus-web && pnpm exec vitest run services/runOpen/__tests__/agentRunOpenCoordinator.integration.spec.ts stores/__tests__/agentContextsStore.spec.ts services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts utils/__tests__/runTreeLiveStatusMerge.spec.ts stores/__tests__/runHistoryStore.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
  - Result: 11 test files passed, 124 tests passed.
- Legacy gate grep:
  - no exact old run/team `getStatus(` authoritative methods under agent/team execution source;
  - no target `payload.status || payload.new_status` fallback;
  - target `AGENT_STATUS`/`TEAM_STATUS` payload types expose only the four-state `status` field plus member `can_interrupt`.
- Changed source-file guardrail check:
  - no changed non-test implementation file exceeded 500 effective non-empty lines.

Not counted as pass:

- `cd autobyteus-web && pnpm exec nuxi typecheck`
  - Fails with many broad project-wide type errors outside this status implementation surface, including build script type-only imports, missing `~/stores/agents`, generated GraphQL exports, browser shell bridge typings, and unrelated test fixture types.

## Downstream Validation Hints / Suggested Scenarios

1. Connect/reconnect single-agent streams for AutoByteus, Codex, and Claude and verify initial/live `AGENT_STATUS` payload shape is only `{ status, can_interrupt, ...identity }`.
2. Complete and interrupt turns; verify `can_interrupt=true` only during interruptible `running` periods and terminal projections are `idle/can_interrupt=false` or `error/can_interrupt=false`.
3. Terminate active single-agent runs for AutoByteus, Codex, and Claude while a browser WebSocket is already connected; verify the socket receives `AGENT_STATUS { status: "offline", can_interrupt: false }` before any stream close.
4. Trigger Codex `thread/status/changed`; verify raw provider status is not forwarded and outbound status is normalized from `CodexThread` state.
5. Connect/reconnect team streams; verify member `AGENT_STATUS` snapshots plus aggregate `TEAM_STATUS { status }`, with no team `can_interrupt`.
6. Exercise team aggregate precedence: error > running > idle > offline, including all-offline historical teams.
7. First-load history/sidebar after restart: inactive non-error runs/teams/members display `offline`, historical errors display `error`, and active rows use runtime snapshots.
8. Confirm the interrupt button follows the selected agent/team member `canInterrupt` and is not enabled by `isSending` alone.
9. AC-013: simulate app restart/Electron startup where backend history and team stream snapshots report `team.status=running`, `solution_designer=running`, and all other members `offline`; verify first load, active recovery, reconnect, refresh, and sidebar/read-model overlays preserve exactly those member statuses.
10. AC-014: after a live/snapshot `AGENT_STATUS { status: "running", can_interrupt: true }`, trigger run-history refresh/reconcile and active recovery for both single-agent and focused team-member contexts; verify selected context `canInterrupt` remains true and the input remains in stop/interrupt mode.
11. CR-003: reopen an existing subscribed single-agent context that previously had `running/canInterrupt=true` as inactive/offline; verify projection hydration clears interrupt (`offline/canInterrupt=false`) and stream disconnect occurs.

## API / E2E / Executable Validation Still Required

Yes. API/E2E validation is still required downstream for real runtime streams, reconnect snapshots, first-load sidebar behavior, browser-visible interrupt affordance, re-validation of `VAL-FS-008` live terminal offline publication, AC-013 team-member status preservation through restart/recovery/refresh, and AC-014 stop-button persistence after refresh/recovery.
