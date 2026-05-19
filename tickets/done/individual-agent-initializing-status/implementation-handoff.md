# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-spec.md`
- Architecture pivot notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-architecture-pivot-notes.md`
- Post-delivery rework notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-post-delivery-rework-notes.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-review-report.md`
- Historical design rework notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-rework-notes.md`
- Latest code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/review-report.md`

## What Changed

Implemented the revised backend-owned standalone run lifecycle:

- Added backend standalone command identity, idempotency, status overlay, projection, and command coordination.
- Removed the post-delivery restore-snapshot bridge entirely: restored runtime readiness/snapshot status no longer clears a `STARTING` command overlay or publishes visible `running` before command-correlated execution evidence.
- Tightened overlay replacement to command-correlated events after message handoff: local command-start `AGENT_STATUS initializing`, `TURN_STARTED`, command-correlated `AGENT_STATUS`, command-correlated terminal/error events, or coordinator-handled activation/post failures.
- Added prepared run metadata and lifecycle support so a new frontend run can reserve an identity without creating/restoring runtime until the first `SEND_MESSAGE` command.
- Refactored standalone websocket connect/send:
  - connect is identity/projection-only and no longer restores runtime;
  - `SEND_MESSAGE` requires/uses `message_id` and `dedupe_key`;
  - send is routed through `AgentRunCommandCoordinator`;
  - server sends `AGENT_COMMAND_ACK` after command acceptance/rejection.
- Refactored run history/resume projection so command overlays project `Initializing`/`Error`, `shouldConnectStream`, and `statusSource` while runtime events remain authoritative once they arrive.
- Refactored frontend standalone send so new runs call `PrepareAgentRun`, existing inactive runs do not call frontend `RestoreAgentRun`, and messages are sent over the stream with command identity.
- Migrated external-channel standalone dispatch through the same command coordinator with a deterministic command identity derived from the channel envelope.
- Added/updated targeted unit/store/service coverage for command registry/coordinator/projection, history projection fields, frontend prepare/send behavior, command ACK handling, and protocol serialization.
- Split the prepared identity/activation implementation out of `AgentRunService` into `AgentRunProvisioningService` to keep the service boundary readable and under source-size guardrails.

## Key Files Or Areas

Backend:

- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-types.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-registry.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-status-overlay-store.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/models.ts`
- `autobyteus-server-ts/src/run-history/**`
- `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`

Frontend:

- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/graphql/mutations/agentMutations.ts`
- `autobyteus-web/graphql/queries/runHistoryQueries.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/services/agentStreaming/protocol/agentCommandTypes.ts`
- `autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts`
- `autobyteus-web/services/agentStreaming/protocol/externalUserMessageTypes.ts`
- `autobyteus-web/stores/runHistoryLoadActions.ts`
- `autobyteus-web/stores/runHistoryTypes.ts`

Tests:

- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-command-registry.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-status-projection-service.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-command-coordinator.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts`
- `autobyteus-web/stores/__tests__/agentRunStore.spec.ts`
- `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts`

## Important Assumptions

- Standalone command idempotency is scoped to retained in-memory command records for the same `(runId, message_id)`; durable cross-process exactly-once is still out of scope per the approved design.
- A different `message_id` while the run has a `STARTING`/`FORWARDED` command is rejected with `RUN_COMMAND_IN_PROGRESS`.
- Runtime/live `AGENT_STATUS` remains authoritative only after command correlation: command overlays are not cleared by restored-runtime readiness, websocket bind success, `statusHint=ACTIVE`, metadata `lastKnownStatus=ACTIVE`, or active runtime snapshot availability.
- `PrepareAgentRun` persists identity/history/metadata only; it intentionally does not create or restore the active runtime.
- External-channel standalone sends now use the command boundary. Other non-chat internal runtime callers that launch their own dedicated runtime flows were left outside this change unless they matched the in-scope standalone send lifecycle.

## Known Risks

- Full backend `tsc --noEmit` remains blocked by existing `TS6059` test/rootDir project configuration debt unrelated to the changed source files; backend source build typecheck passes with `tsconfig.build.json`.
- Full Nuxt typecheck is still blocked by broad existing project debt. The only changed-file grep hits are `agentMutations.ts` and `runHistoryQueries.ts` line 1 for the pre-existing global missing `graphql-tag` declaration/import issue, which also appears across many unchanged GraphQL modules.
- Full frontend `runHistoryStore.spec.ts` is not a clean validation target in this worktree because of unrelated legacy team-context fixture/type failures; targeted frontend checks were limited to the changed standalone send and streaming protocol behavior.
- API/E2E validation still needs to prove real websocket runtime streaming after identity-only connect, including normal turn/segment/live events, not only status/ACK.
- CR-007 stale frontend-placeholder documentation was corrected to describe the backend-owned lifecycle. `autobyteus-web/docs/` remains dirty only for the revised backend-owned lifecycle documentation updates, not the superseded frontend local placeholder.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix / lifecycle refactor.
- Reviewed root-cause classification: Boundary or ownership issue + duplicated coordination policy.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Frontend no longer owns standalone create/restore-before-send status timing. The backend command coordinator owns acceptance, idempotency, activation/restore, overlay publication, forwarding, and ACK/result projection. Websocket and external-channel callers use that boundary instead of directly restoring and posting to runtime for in-scope standalone sends.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` for the in-scope standalone frontend restore/create-before-send path.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: `AgentRunService` was split by responsibility into `AgentRunProvisioningService` after size-pressure review. Frontend protocol command ACK, compaction, and external-user payload types were split out so the existing broad `messageTypes.ts` file remains below 500 non-empty lines.

## Environment Or Dependency Notes

- No package or lockfile changes were made.
- Shared workspace packages were built with `pnpm -C autobyteus-server-ts run prepare:shared` before server checks.
- Typecheck logs used for changed-file grep:
  - Server full typecheck: `/tmp/individual-agent-server-typecheck-post-delivery-rework.log`
  - Server source build typecheck: `/tmp/individual-agent-server-build-typecheck-post-delivery-rework.log`
  - Web: `/tmp/individual-agent-web-typecheck-post-delivery-rework.log`

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts run prepare:shared` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-command-registry.test.ts tests/unit/agent-execution/agent-run-status-projection-service.test.ts tests/unit/agent-execution/agent-run-command-coordinator.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts` — passed: 4 files, 23 tests.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/agentRunStore.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts` — passed: 2 files, 25 tests.
- `git diff --check` — passed.
- Changed source size guard — passed: no changed non-test source implementation file over 500 effective non-empty lines after splitting.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec tsc --noEmit` — failed on existing broad `TS6059` test/rootDir project configuration debt; changed server-source grep returned no hits.
- `pnpm -C autobyteus-web exec nuxi typecheck` — failed on existing broad project debt; changed-file grep only hit pre-existing line-1 `graphql-tag` missing declarations in changed GraphQL modules, with the same error present across many unchanged GraphQL modules.

## Post-Delivery Command-Correlated Rework Update

- Removed `clearOverlayForRuntimeOwnedStatus(activeRun, runId)` and the equivalent immediate restore-snapshot publication path from `AgentRunCommandCoordinator`.
- Runtime readiness after `restoreAgentRun()` / `activatePreparedRun()` is now internal while an inactive-start command overlay is active.
- The coordinator records a command-scoped observer before handoff but only treats events as overlay replacement evidence once the current command has been marked forwarded and `postUserMessage()` handoff has started.
- Replacement is limited to command-correlated events: local `AGENT_STATUS initializing`, `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error status hints after handoff, or coordinator failure handling.
- `statusHint=ACTIVE` alone is not used to replace the overlay; `TURN_STARTED` is handled explicitly as execution evidence.
- Added regression coverage for restored inactive standalone runtime snapshot already `running`: published statuses remain `initializing` until a command-correlated `TURN_STARTED`, then publish `running` (`initializing -> running`, no false restored-snapshot `running` in between).

## Code Review CR-008 Local Fix Update

- CR-008 fixed: updated the changed durable docs at `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` and `autobyteus-server-ts/docs/modules/agent_execution.md`.
- The docs now state that inactive-start command overlays are replaced only by command-correlated post-handoff lifecycle signals: command-start `AGENT_STATUS initializing`, explicit `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error events after handoff, or coordinator activation/post failure handling.
- The docs now explicitly state that restored runtime snapshots/readiness, WebSocket bind success, `statusHint=ACTIVE` alone, metadata `lastKnownStatus=ACTIVE`, and active runtime snapshot availability do not clear or replace the overlay.
- No code change was needed for CR-008.
- CR-008 requested check: `git diff --check` — passed.

## Code Review Round 4 Local Fix Update

- CR-004 fixed: `AgentRunCommandCoordinator` now checks for an already-active runtime before publishing a command overlay. Active runtime commands rely on runtime-owned status instead of a pre-runtime overlay, so an active `running` run is not downgraded to `initializing` and the ACK preserves the active runtime status/interrupt state. Added coordinator regression coverage for active `running` sends.
- CR-005 fixed: active-runtime command rejection no longer publishes a contradictory lifecycle error overlay; the ACK remains rejected/failed with the runtime-owned status and error message for UI error handling. Command error overlays that are intentionally published for pre-runtime/activation failures now win in projection even if an active runtime exists. Added coordinator and projection regression coverage.
- CR-006 fixed: split frontend protocol payload types into `agentCommandTypes.ts`, `compactionTypes.ts`, and `externalUserMessageTypes.ts`; `messageTypes.ts` is now 455 non-empty lines by `awk 'NF{c++}'`, below the 500-line hard limit.
- CR-007 fixed: stale frontend-placeholder documentation was removed/replaced with backend-owned lifecycle wording. Dirty docs in this package are intentional lifecycle documentation updates.

Round-4 fix checks:

- `pnpm -C autobyteus-server-ts run prepare:shared` — passed.
- Backend targeted Vitest — passed: 4 files, 23 tests.
- Frontend targeted Vitest — passed: 2 files, 25 tests.
- `git diff --check` — passed.
- Source size guard — passed; no changed non-test source file exceeds 500 non-empty lines.
- Server source build typecheck now passes with `tsconfig.build.json`; full server `tsc --noEmit` remains blocked by existing `TS6059` test/rootDir debt and changed server-source grep returned no hits. Logs: `/tmp/individual-agent-server-build-typecheck-post-delivery-rework.log`, `/tmp/individual-agent-server-typecheck-post-delivery-rework.log`.
- Web Nuxt typecheck still fails on existing broad project debt; changed-file grep only hit the known pre-existing line-1 `graphql-tag` missing declarations in changed GraphQL modules. Log: `/tmp/individual-agent-web-typecheck-post-delivery-rework.log`.

## Downstream Validation Hints / Suggested Scenarios

- Existing active standalone send: verify `SEND_MESSAGE(message_id,dedupe_key)` routes through coordinator and normal runtime events still stream.
- Existing offline standalone send: verify websocket connects by identity without restore, backend publishes `Initializing` before slow restore completes, then normal turn/segment/live status events stream.
- Restored-running inactive standalone send: verify restored runtime snapshot/readiness does not emit visible `running` before `postUserMessage()` command-correlated evidence; expected sequence is `offline -> initializing -> running`.
- New standalone first message: verify frontend calls `PrepareAgentRun`, promotes the run id, connects the stream, and backend activation/send owns `Initializing`.
- Busy command: verify same `(runId,message_id)` is idempotent and different `message_id` while in progress returns `RUN_COMMAND_IN_PROGRESS`.
- Activation/post failure: verify overlay/error projection and `AGENT_COMMAND_ACK` failure surface in UI/history without stale initializing.
- External-channel standalone dispatch: verify channel standalone messages route through coordinator and preserve the normal dispatch result path.
- History/resume: verify `shouldConnectStream` and `statusSource` reflect command overlay and active runtime states.

## API / E2E / Executable Validation Still Required

API/E2E validation is still required. Implementation checks above are unit/store/service/typecheck checks only and do not replace realistic backend websocket/runtime validation or browser/UI validation.
