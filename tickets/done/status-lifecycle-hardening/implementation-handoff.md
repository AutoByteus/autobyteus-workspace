# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/investigation.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/design-spec.md`
- Native regression rework report: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/native-status-regression-rework.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/design-review-report.md`
- Current code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/review-report.md`
- Prior API/E2E report: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/api-e2e-report.md`
- Prior delivery report: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/delivery-report.md`

## What Changed

Implemented the reviewed `status-lifecycle-hardening` work plus the latest Round 5 status-event target:

- Added `TeamCommandStatusOverlayStore` as the single bounded pending command-start overlay lifecycle owner for member and team/source-path overlays.
- Removed the obsolete `team-member-command-start-status-overlays.ts` helper file and migrated all call sites off the old helper/map model.
- Added `AutoByteusTeamMemberStatusProjector` as the native AutoByteus member identity/status projection owner and observed native status cache.
- Migrated Codex, Claude, native AutoByteus, mixed leaf agent, and mixed sub-team command owners to use the store without moving target resolution, runtime startup, provider/native send, or child-team creation ownership.
- Migrated native AutoByteus event processing to use the native projector for member identity resolution, native id backfill, member context lookup, and member status snapshots.
- Replaced the canonical AutoByteus runtime stream status event name with `AGENT_STATUS` through `autobyteus-ts` runtime events, stream events, payloads, CLI/internal consumers, server converter tests, and docs.
- Removed canonical `AGENT_STATUS_UPDATED` / `agent_status_updated` / `AgentStatusUpdateData` usage from the runtime-to-server status spine; no alias, wrapper, or dual-read path was added.
- Preserved `autobyteus-ts` fine-grained internal `AgentStatus` vocabulary at the runtime/internal stream boundary: `autobyteus-ts` now emits `AGENT_STATUS { status: AgentStatus }`.
- Strengthened `autobyteus-server-ts` projection from fine-grained AutoByteus `AgentStatus` to coarse public `AgentApiStatus` before server-domain/websocket `AGENT_STATUS` emission.
- Updated `AutoByteusStreamEventConverter` so `StreamEventType.AGENT_STATUS` reads explicit `data.status` first, then snapshot fallback/enrichment, while preserving active-turn correction to public `running`.
- Updated `projectAutoByteusAgentStatus` to map representative fine-grained runtime statuses to public status: processing/tool/interrupting states to `running`, startup states to `initializing`, idle to `idle`, shutdown/shutdown-complete to `offline`, and error to `error`.
- Updated `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot` so known observed live members do not fall to `offline` only because `team.context.agents` is stale/missing while the backend is active.
- Preserved true inactive cleanup: observed live status is not applied when the backend is inactive.
- Addressed code review local fix `CR-003-001`: list member snapshots now skip observed live-status overlays when the backend is inactive, matching the single-member inactive snapshot path and preventing stale `running` / interruptible state from leaking after backend shutdown.
- Updated team stream status payloads to use `status` / optional `previous_status`, keeping the in-repository status stream target free of `new_status` / `old_status` transition fields.
- Updated websocket/frontend-facing docs/tests so normal liveness display remains coarse public status only and does not import/reason over AutoByteus fine-grained statuses.

## Key Files Or Areas

- Added: `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts`
- Added: `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.ts`
- Removed: `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-overlays.ts`
- Modified AutoByteus runtime/internal status stream path:
  - `autobyteus-ts/src/events/event-types.ts`
  - `autobyteus-ts/src/agent/events/notifiers.ts`
  - `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts`
  - `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`
  - `autobyteus-ts/src/agent/streaming/events/stream-events.ts`
  - `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`
  - `autobyteus-ts/src/agent/utils/wait-for-idle.ts`
  - `autobyteus-ts/src/cli/agent/cli-display.ts`
  - `autobyteus-ts/src/cli/agent-team/state-store.ts`
  - `autobyteus-ts/src/agent-team/streaming/agent-team-stream-event-payloads.ts`
  - `autobyteus-ts/src/agent-team/streaming/agent-team-event-notifier.ts`
  - `autobyteus-ts/src/agent-team/status/agent-team-status-manager.ts`
  - `autobyteus-ts/src/agent-team/utils/wait-for-idle.ts`
- Modified server projection/conversion/public status path:
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`
- Modified command owners:
  - `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts`
- Docs touched:
  - `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md`
  - `autobyteus-ts/docs/agent_team_streaming_protocol.md`
  - `autobyteus-ts/docs/agent_team_design.md`
  - `autobyteus-server-ts/docs/modules/agent_streaming.md`
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`
  - `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`
  - `autobyteus-web/docs/agent_execution_architecture.md`
  - `autobyteus-web/docs/agent_integration_minimal_bridge.md`
- Tests:
  - `autobyteus-ts/tests/unit/events/event-types.test.ts`
  - `autobyteus-ts/tests/unit/agent/events/notifiers.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/streams/agent-event-stream.test.ts`
  - `autobyteus-ts/tests/unit/agent-team/streaming/*.test.ts`
  - `autobyteus-ts/tests/unit/cli/agent-team-state-store.test.ts`
  - `autobyteus-ts/tests/integration/agent-team/streaming/agent-team-streaming-flow.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-status-projector.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/team-command-start-status.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-member-status-projector.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-run-event-processor.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts`
    - Added inactive-backend regressions covering both `projectMemberStatusSnapshots()` and backend `getMemberStatusSnapshots()` after an observed live status.
  - `autobyteus-server-ts/tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`

## Important Assumptions

- `TeamCommandStatusOverlayStore` remains bounded to pending command-start overlays and is not a runtime/global status manager.
- `autobyteus-ts` fine-grained `AgentStatus` is an internal/runtime vocabulary and is not flattened at the runtime boundary.
- `autobyteus-server-ts` owns projection from fine-grained AutoByteus `AgentStatus` to coarse public `AgentApiStatus` before server-domain/websocket output.
- Websocket/frontend normal liveness display receives only coarse public statuses: `offline`, `initializing`, `idle`, `running`, `error`.
- Native explicit status payload `status` is the primary status edge; mutable native snapshots are fallback/enrichment only.
- No compatibility alias, wrapper, or dual-read path is permitted or implemented for `AGENT_STATUS_UPDATED`.
- `deriveTeamApiStatus` remains the aggregate authority; the overlay store only prepares pending command-start overlay inputs.
- Task-plan status events still use their existing `new_status` field under the task-management domain; that field is outside the agent/team liveness status-event path governed by this ticket.

## Known Risks

- No blocking implementation risks found.
- Code review local fix `CR-003-001` is addressed in implementation and covered by durable projector/backend regressions.
- This is a breaking `autobyteus-ts` API/stream token change for any external consumer still depending on `AGENT_STATUS_UPDATED` / `agent_status_updated`; release/versioning communication is a delivery concern.
- Fine-grained native token coverage is representative and now includes all listed `AgentStatus` processing/startup/shutdown states; future new runtime statuses should be added in `autobyteus-status-projector.ts`, not ad hoc in consumers.
- Residual validation risk remains around broader API/E2E behavior and runtime-environment coverage, owned downstream by `api_e2e_engineer`.
- The live `autobyteus-ts` integration streaming flow timed out at its 20s test timeout in this local environment while running live LM Studio/team runtime work. Unit/build checks and server narrow integration checks passed; broader runtime/API/E2E validation remains downstream-owned.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor / architecture hardening plus design-impact status-boundary correction.
- Reviewed root-cause classification: Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness; status-boundary duplicate concept.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A for this pass; Round 5 architecture review is the latest authoritative pass.
- Evidence / notes: The implementation centralizes pending command-start overlays in the store, native AutoByteus member identity/status projection in the projector, runtime event naming around `AGENT_STATUS { status: AgentStatus }`, and server public status projection in `autobyteus-status-projector.ts`. The CR-003-001 review defect was a local missing guard in the projector list-snapshot path; it now honors the same inactive-backend invariant as the single-snapshot path. Grep found no `AGENT_STATUS_UPDATED` / `agent_status_updated` / `AgentStatusUpdateData` / `createAgentStatusUpdateData` in source/tests/docs outside historical ticket artifacts.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Runtime and team liveness status payloads now use `status` / optional `previous_status`; no alias/wrapper/dual-read path was added. Remaining `new_status` references are task-management status events outside this ticket's agent/team liveness status path.

## Environment Or Dependency Notes

- No new dependencies were added.
- Previous dependency restoration remains unchanged: `pnpm install --frozen-lockfile` had already restored workspace dependencies with no lockfile changes.
- `pnpm install` had reported ignored build scripts for `lzma-native@8.0.6`; this did not block build or focused unit tests.

## Local Implementation Checks Run

Implementation-scoped checks only:

1. `pnpm -C autobyteus-ts run build`
   - Result: Pass.
2. `pnpm -C autobyteus-server-ts run build`
   - Result: Pass.
   - Covers shared package builds, Prisma client generation, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
3. `pnpm -C autobyteus-ts exec vitest run tests/unit/events/event-types.test.ts tests/unit/agent/events/notifiers.test.ts tests/unit/agent/streaming/events/stream-event-payloads.test.ts tests/unit/agent/streaming/streams/agent-event-stream.test.ts tests/unit/agent-team/streaming/agent-event-bridge.test.ts tests/unit/agent-team/streaming/agent-team-stream-events.test.ts tests/unit/agent-team/streaming/agent-team-event-stream.test.ts tests/unit/agent-team/streaming/agent-team-event-notifier.test.ts tests/unit/agent-team/streaming/team-event-bridge.test.ts tests/unit/cli/agent-team-state-store.test.ts`
   - Result: Pass, `10` files / `41` tests.
4. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-status-projector.test.ts tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/unit/agent-team-execution/autobyteus-team-run-event-processor.test.ts tests/unit/agent-team-execution/autobyteus-team-member-status-projector.test.ts tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts`
   - Result after CR-003-001 fix: Pass, `6` files / `63` tests.
5. `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts`
   - Result after CR-003-001 fix: Pass, `1` file / `9` tests.
6. `git diff --check`
   - Result after CR-003-001 fix: Pass.
7. Cleanup grep: `rg "AGENT_STATUS_UPDATED|agent_status_updated|AgentStatusUpdateData|createAgentStatusUpdateData" --glob '!tickets/**' --glob '!node_modules/**' --glob '!**/dist/**' .`
   - Result after CR-003-001 fix: Pass, no matches.
8. Status-path cleanup grep across agent/team status source/tests/docs shows no `AGENT_STATUS_UPDATED`, no status-event class/factory legacy names, and no `new_status`/`old_status` in agent/team liveness status payloads. The only remaining `new_status` hits are task-management event payloads outside this ticket's liveness status path.

Attempted but not counted as pass:

- `pnpm -C autobyteus-ts exec vitest run ... tests/integration/agent-team/streaming/agent-team-streaming-flow.test.ts`
  - Result: Failed by test timeout after `20000ms` while executing live LM Studio/team runtime flow. This is broader integration/runtime-environment coverage and remains downstream API/E2E validation scope.

## Downstream Validation Hints / Suggested Scenarios

- API/E2E should exercise offline/idle command-start to Codex, Claude, native AutoByteus, mixed leaf, and mixed sub-team members.
- Verify root source path `[]` and mixed sub-team `context.memberPath` replacement events do not cross-clear overlays.
- Verify native snapshots expose configured member run id as `agent_id`, not a duplicate native agent id entry.
- Verify aggregate status remains `initializing` while command-start overlay is active, then reflects replacement runtime/native/team status.
- Verify native AutoByteus `TURN_STARTED -> AGENT_STATUS { status: AgentStatus.PROCESSING_* or idle } while active -> TURN_COMPLETED -> AGENT_STATUS { status: AgentStatus.IDLE }` surfaces public `running -> idle`, never `offline`, while the backend remains active.
- Verify inactive backend/termination still clears/suppresses observed live status and surfaces public `offline`/`error` as appropriate, including `getMemberStatusSnapshots()` after a previously observed live member status.
- Verify websocket/frontend normal liveness display receives only coarse public statuses and does not import or reason over `autobyteus-ts` fine-grained `AgentStatus`.
- Verify no server/websocket/frontend canonical path emits or consumes `AGENT_STATUS_UPDATED`.

## API / E2E / Executable Validation Still Required

API/E2E and broader executable validation are still required downstream. This handoff only records implementation-level build and focused unit/narrow integration confidence checks.
