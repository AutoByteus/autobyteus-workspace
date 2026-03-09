# Implementation Progress

- Status: `Completed`
- Date: `2026-03-09`

## Planned Change List

1. Add backend history bootstrap for messaging-created runs.
2. Pass initial summary from external inbound message into the launch path.
3. Add frontend history auto-refresh while the workspace history panel is mounted.
4. Extend focused backend and frontend tests.
5. Add a run-scoped live message publish path for accepted external user turns.
6. Add frontend stream handling for the new live external user-turn event.
7. Extend focused backend/frontend tests for the live user-turn mirroring path.
8. Add a runtime-generic external turn bridge so `codex_app_server` and `claude_agent_sdk` bind accepted turn ids and publish provider replies through runtime-native completion events.
9. Resolve runtime-native callback publishing lazily inside the external turn bridge so Codex/Claude reply routing does not freeze `CALLBACK_NOT_CONFIGURED` at server startup.

## Execution Log

- 2026-03-09: Investigation complete. Ready to start Stage 6 implementation with code edits unlocked after workflow-state update.
- 2026-03-09: Added `channel-run-history-bootstrapper.ts` and wired messaging-created agent runs through manifest/history persistence in `channel-binding-runtime-launcher.ts`.
- 2026-03-09: Propagated the first inbound external message into the launcher so new messaging-created runs get an initial summary in run history.
- 2026-03-09: Updated `runHistoryStore.fetchTree()` to support quiet refreshes and added mounted-only background polling in `WorkspaceAgentRunsTreePanel.vue` so background-created runs surface in the frontend history tree.
- 2026-03-09: Added focused backend/frontend tests covering run-history bootstrap on messaging launch and periodic quiet history refresh.
- 2026-03-09: User expanded scope to include live mirrored external user turns in already-open chats. Workflow re-entered upstream for a `Requirement Gap`, and the ticket design/runtime artifacts were updated before resuming Stage 6.
- 2026-03-09: Added `agent-stream-broadcaster.ts` and `agent-live-message-publisher.ts`, then wired `default-channel-runtime-facade.ts` and `agent-stream-handler.ts` so accepted external user turns publish a run-scoped websocket event without depending on runtime raw user-message items.
- 2026-03-09: Added frontend protocol support and `externalUserMessageHandler.ts` so an already-open run appends messaging-originated user turns directly into the conversation stream.
- 2026-03-09: Extracted `runHistoryStoreSupport.ts` so the quiet refresh change did not leave `runHistoryStore.ts` over the workflow review hard-limit.
- 2026-03-09: Added direct bootstrapper coverage for manifest/runtime-field persistence and handler-level coverage for run-scoped live message broadcast registration.
- 2026-03-09: Stage 7 acceptance matrix passed and Stage 8 code review passed with no findings.
- 2026-03-09: Stage 9 docs sync concluded `No docs impact`; existing product docs do not describe the internal messaging-run visibility implementation details changed in this ticket.
- 2026-03-09: User live verification found a reply-routing regression after the frontend live user-turn mirror change. Investigation isolated a local-fix candidate: exceptions from the new websocket broadcaster can abort inbound receipt persistence after the runtime already accepted the message, which would leave outbound callback routing without source context.
- 2026-03-09: Implemented the local fix by making run-scoped websocket fan-out best-effort per connection and by preventing `DefaultChannelRuntimeFacade` from letting live frontend publish failures abort the inbound messaging dispatch path.
- 2026-03-09: Live verification uncovered two additional failures outside the previous reply-routing fix scope: replacement messaging bindings can no longer be saved after deleting an existing binding, and the managed messaging gateway now exits unexpectedly. Investigation is reopened before any further source edits.
- 2026-03-09: Investigation now classifies the new issue as a recovery-UX design impact. The next implementation round expands scope to managed-gateway restart reconciliation plus actionable binding/gateway recovery UX so users are not trapped behind generic blocked state or silent save failure.
- 2026-03-09: Added managed-gateway admin shutdown support and expanded `ManagedMessagingGatewayService` to reconcile reachable runtimes, recover from stale lifecycle state, and stop adopted runtimes cleanly during disable/update/restart paths.
- 2026-03-09: Updated the messaging settings UI so blocked gateway states expose recovery detail and a direct recover action, while binding setup now renders stale peer-selection errors and offers a manual recovery fallback instead of silently swallowing save failures.
- 2026-03-09: Fixed two backend lifecycle regressions discovered during focused verification: supervisor-triggered shutdowns are now marked as expected exits so intentional restarts do not poison state with `BLOCKED`, and failed starts no longer masquerade as adopted runtimes just because stale endpoint fields remain in persisted state.
- 2026-03-09: Preserved meaningful runtime status copy during recovery by keeping rollback/update messages when the runtime is already back in `RUNNING`, while clearing unreachable endpoint data on unexpected exits so the UI does not display stale runtime endpoints.
- 2026-03-09: Live packaged-app investigation for the Codex Telegram flow found a deeper architectural gap: `codex_app_server` and `claude_agent_sdk` bypass the in-house agent processor chain, so external receipt turn binding and outbound reply callback publication never execute for those runtimes.
- 2026-03-09: Workflow re-entered for a design-impact fix that will add runtime-generic external turn binding plus runtime-native outbound callback publishing for external runtimes.
- 2026-03-09: Added `runtime-external-channel-turn-bridge.ts` and wired `DefaultChannelRuntimeFacade` plus the Codex/Claude runtime adapters so accepted external-runtime turns bind `turnId` immediately and publish provider callbacks from runtime-native completion events.
- 2026-03-09: The user clarified that AutoByteus runtime still routes replies correctly while Codex does not. That made the earlier recovered-runtime-only theory insufficient and narrowed the real gap to runtime-native callback lifecycle behavior.
- 2026-03-09: Updated `runtime-external-channel-turn-bridge.ts` so it no longer caches `ReplyCallbackService` at singleton construction time. The bridge now resolves callback publishing lazily when the assistant reply is actually ready, matching the working in-house runtime behavior.
- 2026-03-09: User live verification confirmed that the Codex runtime now routes replies back to the messaging provider and that the binding replacement plus gateway recovery scenario also works. Stage 7 closes and the ticket moves into finalization.
- 2026-03-09: Ticket archived to `tickets/done/messaging-runtime-visibility`, merged into `personal`, pushed to origin, and released as `v1.2.33`.

## Validation

- 2026-03-09: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-web test:nuxt --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` -> Passed (`26 passed`).
- 2026-03-09: `./node_modules/.bin/vitest run tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts` -> Passed (`3 passed`).
- 2026-03-09: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-web test:nuxt --run services/agentStreaming/__tests__/AgentStreamingService.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` -> Passed (`29 passed`).
- 2026-03-09: `./node_modules/.bin/vitest run tests/unit/external-channel/runtime/channel-run-history-bootstrapper.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/services/agent-streaming/agent-stream-broadcaster.test.ts tests/unit/services/agent-streaming/agent-live-message-publisher.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts tests/integration/agent/agent-websocket.integration.test.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts` -> Passed (`23 passed`).
- 2026-03-09: `./node_modules/.bin/vitest run tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/services/agent-streaming/agent-stream-broadcaster.test.ts tests/unit/services/agent-streaming/agent-live-message-publisher.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/integration/agent/agent-websocket.integration.test.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts` -> Passed (`26 passed`).
- 2026-03-09: `./node_modules/.bin/vitest run tests/unit/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.test.ts tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts` -> Passed (`10 passed`).
- 2026-03-09: `./node_modules/.bin/vitest run tests/integration/http/routes/runtime-reliability-route.integration.test.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-message-gateway` -> Passed (`4 passed`).
- 2026-03-09: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-web test:nuxt --run components/settings/messaging/__tests__/ManagedGatewayRuntimeCard.spec.ts components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts` -> Passed (`11 passed`).
- 2026-03-09: `./node_modules/.bin/vitest run tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts` -> Passed (`38 passed`).
- 2026-03-09: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts` -> Passed (`3 passed`).
- 2026-03-09: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts` -> Passed (`12 passed`).

## Stage 7 Summary

- Acceptance criteria to scenario mapping: `Complete`
- Scenario status: `AV-001 Passed`, `AV-002 Passed`, `AV-003 Passed`, `AV-004 Passed`, `AV-005 Passed`, `AV-006 Passed`, `AV-007 Passed`
- Re-entry required during Stage 7: `Yes`
- Residual risk: `No open Stage 7 acceptance gaps remain. Residual risk is limited to future regressions outside the verified user configuration and the focused automated suites already recorded above.`
- Additional open risk: `None beyond ordinary future-change risk.`

## Docs Sync

- Result: `No docs impact`
- Rationale: `The change is internal to runtime launch persistence, agent-streaming protocol handling, and mounted history refresh behavior. No canonical end-user or architecture docs currently promise the old behavior or require updated usage guidance for this implementation detail.`
