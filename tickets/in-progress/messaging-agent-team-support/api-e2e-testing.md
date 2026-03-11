# API And E2E Testing

## Scope

- Server setup GraphQL contract for `AGENT` and definition-bound `TEAM` bindings
- SQL-backed REST channel-ingress behavior for `AGENT` and definition-bound `TEAM` bindings
- Server TEAM dispatch continuation path across native-team and member-runtime restore flows
- Server callback-path guardrails that keep external replies bound to a single visible responder
- Team websocket/live UI mirroring of inbound external user messages for open TEAM runs
- Web history reopening of TEAM runs when a stale in-memory context already exists
- Web left-tree selection parity for subscribed live TEAM contexts versus inactive persisted TEAM history
- Binding lifecycle parity that reuses cached runs only while they remain bot-owned and active in the current backend process
- Web settings flow for `AGENT` vs `TEAM` selection, verification, and scoped binding rendering

## Latest Verification Addendum

- Full live backend runtime verification is now green for both external-member runtimes:
  - Codex live runtime GraphQL, configured-skills, and team roundtrip E2E all passed together
  - Claude live runtime GraphQL, configured-skills, and team external-runtime E2E all passed together
- The Claude configured-skills suite exposed one real E2E harness gap:
  - websocket capture could attach before the configured-skill turn had fully displaced the bootstrap assistant projection
  - the failing assertion observed replayed bootstrap fragments like `READYREADY` instead of the configured skill response token
  - the fix was to wait for the bootstrap assistant projection to settle before starting the websocket capture, matching the already-stable Codex harness
- With that harness fix in place, backend live verification now proves:
  - Codex and Claude standalone runtime runs both pass the live GraphQL runtime suite
  - Codex and Claude configured-skill runs both pass against the live runtime adapters
  - Codex and Claude team runtime paths both pass live external-member team E2E coverage
- Full frontend regression coverage is also green again:
  - the stale `AgentEventMonitor` spec was aligned with the current `AgentConversationFeed` composition
  - the isolated spec rerun passed
  - the full frontend Vitest suite rerun passed with `816` passed and `1` skipped tests
- The v7 active-runtime sync slice is now verified on the current tree, not only on the earlier backend slices:
  - history refresh remains read-only while active-runtime sync owns live hydration separately
  - the full frontend Vitest suite passed on the current worktree after the hydration split
  - the focused rerun after the final type-only import fix passed for `runHistoryStore`, `activeRuntimeSyncStore`, and `WorkspaceAgentRunsTreePanel`
- Frontend `nuxi typecheck` remains outside that green state and still fails on the broader repo baseline; this latest messaging-team slice did not make the whole frontend typecheck clean.

- The latest live screenshots clarified one more UI ownership gap:
  - focused member status is the value users actually read in the team header and member rows
  - team liveness is still useful for deciding whether the team stays in the active/live-connected set
  - the newest web-only fix now keeps those concerns separate by deriving live team member rows from each member context instead of inheriting the team status
- Manual Telegram testing also clarified one lifecycle edge: after backend restart, a messaging binding must not adopt a run that was merely reopened from workspace history.
- The latest focused rerun verifies that:
  - cached `TEAM` runs are reused only when they are bot-owned by the current backend process and still active
  - a history-reopened cached run does not hijack the binding after restart
  - the analogous `AGENT` launcher path also creates a fresh bound run when an active run exists but is not owned by the binding in the current process
  - backend websocket reconnect logic continues retrying across failed reconnect closes during restart
- After merging the latest `origin/personal`, the callback path changed to the managed outbox-and-dispatch-worker model. The latest callback verification rerun now also proves that:
  - fake Telegram `TEAM` ingress binds the accepted coordinator turn back to the reply callback service on the merged callback architecture
  - the callback outbox record is eventually enqueued before dispatch instead of being asserted synchronously in the same tick
  - the callback dispatch worker marks the queued record `SENT`
  - the fake gateway callback endpoint receives the outbound callback POST exactly once
- The newest addendum closes the remaining symmetry gap:
  - fake Telegram `AGENT` ingress now proves the same outbox-and-dispatch-worker callback path end to end
  - AGENT and TEAM bindings both have exact server-side API regressions that verify Telegram eventually receives the outbound payload
- The latest manual workspace verification exposed one more web-only regression:
  - subscribed live TEAM contexts were not being preserved when a team member row was reselected from the left tree
  - the branch-local selection path reopened persisted TEAM projection, which made live runs look historical or `Uninitialized`
  - comparison against `origin/personal` confirmed the missing fast path, and the focused web rerun now proves subscribed live TEAM contexts are focused in place while inactive TEAM contexts still reopen from persisted history
- The latest manual workspace verification also exposed a shared streaming regression:
  - repeated reasoning bursts inside one turn, especially after `run_bash`, were still being appended into the first think segment
  - the focused rerun now proves stable reasoning item ids remain distinct within one turn, fallback turn-level reasoning ids reset across tool or text boundaries so later bursts render separately, and the frontend prefers `segmentId + segmentType` when that extra identity signal is available
- The latest manual verification exposed a separate frontend reconnect issue:
  - the backend team websocket route was being attached repeatedly, flooding the server log with identical `Agent team websocket attached for team run ...` lines
  - root cause was the shared frontend `WebSocketClient` reporting `DISCONNECTED` during reconnect backoff, which let the active-run recovery path layer fresh `connect()` calls onto an already scheduled retry
  - the focused rerun now proves the client enters `RECONNECTING` immediately after unexpected close, suppresses duplicate manual `connect()` calls while a reconnect is pending, and preserves the surrounding team-store plus run-history recovery behavior
- The latest manual Telegram verification exposed one more TEAM-only callback gap:
  - when `Student` sends a message back to the Telegram-bound `Professor`, the later Professor reply was visible in the workspace UI but did not publish back to Telegram
  - the root cause was not the callback service itself; the inter-agent relay path dropped the sender-turn and recipient-turn linkage needed to continue the external callback chain across `send_message_to` hops
  - the newest rerun now proves that later coordinator replies linked to the original Telegram source still publish back to Telegram, while unrelated UI-only turns remain internal
- The latest design-impact refactor separates persisted history refresh from active-runtime synchronization:
  - history polling is now read-only and no longer performs frontend live-run recovery
  - active agent/team liveness is synchronized through a dedicated frontend store that queries the existing backend active-run APIs
  - focused web verification proves active runs reconnect or hydrate only through that dedicated sync path, while inactive runs and teams are cleanly disconnected when they fall out of the active snapshot
- The first v6 backend ownership slice is now in place:
  - active-runtime snapshots no longer treat team-member runs as standalone active agents just because they are currently alive in the process
  - standalone resume-config lookup is now runtime-aware and rejects team-member run ids with an ownership-specific error instead of pretending a standalone manifest is missing
  - native-team websocket attach now emits initial member `AGENT_STATUS` snapshots alongside `TEAM_STATUS`, so focused member status is available immediately on first attach

## Commands Run

1. `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`
   - Result: `PASS`
   - Purpose:
     - generate the Prisma client in this worktree before rerunning SQL-backed suites

2. `pnpm -C autobyteus-server-ts exec vitest run --silent=true tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/run-history/team-run-continuation-service.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.delivery.test.ts`
   - Result: `PASS`
   - Coverage:
     - definition-bound TEAM setup GraphQL query and mutation path
     - launcher behavior for cached team-run reuse, lazy first-run creation, and stale cached-run replacement
     - TEAM runtime facade dispatch through continuation service
     - SQL-backed REST ingress for first-message lazy TEAM launch, cached `teamRunId` reuse, and persisted stale-run replacement
     - reply-callback and runtime-turn bridge behavior that keeps external replies agent-run-bound instead of fanning out every team member response
     - member-runtime TEAM coordinator-turn binding back into the external reply bridge for `codex_app_server` and `claude_agent_sdk`
     - metadata-preserving team continuation path
   - Totals:
     - `10` test files
     - `58` tests passed

3. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run --silent=true stores/__tests__/messagingChannelBindingSetupStore.spec.ts stores/__tests__/messagingVerificationStore.spec.ts components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts components/settings/messaging/__tests__/SetupVerificationCard.spec.ts stores/__tests__/messagingProviderFlowStore.spec.ts stores/__tests__/messagingChannelBindingOptionsStore.spec.ts composables/__tests__/useMessagingProviderStepFlow.spec.ts`
   - Result: `PASS`
   - Coverage:
     - TEAM binding validation and mutation payload shape
     - TEAM target configuration verification semantics
     - target-type selector and team-definition launch-preset UI behavior
     - shared binding fixture updates
   - Totals:
     - `7` test files
     - `37` tests passed

4. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-thread-history-reader.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts tests/unit/agent-memory-view/memory-file-store.test.ts`
   - Result: `PASS`
   - Coverage:
     - Codex thread-history reader returns quiet empty state when a team member thread is still unmaterialized
     - team-member projection returns stable empty payload for untouched Codex secondary members instead of surfacing an error
     - optional projection reads can suppress missing-file warnings without changing default warning behavior elsewhere
   - Totals:
     - `3` test files
     - `17` tests passed

5. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts --testNamePattern "keeps untouched secondary member projection empty while coordinator projection remains queryable in codex team runtime"`
   - Result: `PASS`
   - Coverage:
     - live `codex_app_server` two-member team runtime
     - coordinator member receives and answers the user turn
     - untouched secondary member remains queryable through `getTeamMemberRunProjection` with an empty conversation instead of an error
   - Totals:
     - `1` targeted live E2E passed

6. `pnpm -C autobyteus-server-ts build`
   - Result: `PASS`
   - Purpose:
     - confirm the hardening slice compiles cleanly in the worktree build path used for local backend startup

7. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/run-history/team-run-continuation-service.test.ts tests/unit/services/agent-streaming/agent-live-message-publisher.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts`
   - Result: `PASS`
   - Coverage:
     - TEAM dispatch now publishes inbound external user messages to a team-scoped live broadcaster using the resolved coordinator/member context
     - TEAM websocket sessions receive team-scoped `EXTERNAL_USER_MESSAGE` payloads in addition to runtime adapter events
     - TEAM continuation returns the resolved target member name for both native-team and member-runtime paths
     - SQL-backed ingress compatibility remains intact after the TEAM live-message dependency injection change
   - Totals:
     - `6` test files
     - `27` tests passed

8. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
   - Result: `PASS`
   - Coverage:
     - team web streaming now mirrors `EXTERNAL_USER_MESSAGE` into the correct member conversation instead of ignoring it
     - member run ids are refreshed from the inbound live payload before the user bubble is appended
   - Totals:
     - `1` test file
     - `3` tests passed

9. `pnpm -C autobyteus-server-ts build`
   - Result: `PASS`
   - Purpose:
     - confirm the TEAM live-stream fix compiles cleanly in the same backend build path used for local startup

10. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
    - Result: `PASS`
    - Coverage:
      - reopening a TEAM member from run history now refetches persisted member projections even when a local team context already exists
      - existing TEAM context objects are refreshed in place so live team websocket subscriptions are not invalidated by the history refresh path
      - prior TEAM `EXTERNAL_USER_MESSAGE` streaming behavior remains intact alongside the history-reopen fix
   - Totals:
     - `2` test files
     - `25` tests passed

11. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts`
    - Result: `PASS`
    - Coverage:
      - cached `AGENT` runs are reused only when the binding owns the run in the current backend process and the runtime session is still active
      - cached `TEAM` runs are reused only when the binding owns the run in the current backend process and the team run is still active
      - an active but history-reopened cached run does not get adopted by the messaging binding after restart
    - stale bot-owned cached team runs still fall back to fresh team creation
    - Totals:
      - `1` test file
      - `10` tests passed

12. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run services/agentStreaming/transport/__tests__/WebSocketClient.spec.ts`
   - Result: `PASS`
   - Coverage:
     - websocket clients enter `RECONNECTING` immediately when an unexpected close schedules an auto-retry
     - duplicate manual `connect()` calls during the pending reconnect window do not create extra sockets
   - Totals:
     - `1` test file
     - `2` tests passed

13. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run stores/__tests__/agentTeamRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/runHistoryStore.recovery.spec.ts`
   - Result: `PASS`
   - Coverage:
     - team stream store behavior stays green with the hardened reconnect-state machine
     - team streaming service still toggles subscription state correctly around connect and disconnect callbacks
     - run-history recovery remains compatible with the reconnect hardening path
   - Totals:
     - `3` test files
     - `16` tests passed

12. `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/channel-ingress.integration.test.ts`
    - Result: `PASS`
    - Coverage:
      - SQL-backed Telegram ingress keeps reusing the cached team run only when the current-process bot-owned run is still live
      - an inactive cached team run after restart triggers fresh lazy creation
      - a history-reopened cached team run that is active but not bot-owned does not hijack the binding
      - stale bot-owned cached team runs still fall back to fresh lazy creation and persistence
    - Totals:
      - `1` test file
      - `11` tests passed

13. `pnpm -C autobyteus-server-ts build`
    - Result: `PASS`
    - Purpose:
      - confirm the bot-owned cached-run lifecycle guard compiles cleanly in the backend startup path

14. `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/run-history/team-run-continuation-service.test.ts`
    - Result: `PASS`
    - Coverage:
      - end-to-end GraphQL setup contract for `AGENT` and definition-bound `TEAM` bindings
      - black-box REST ingress POST handling for fake provider payloads, receipt persistence, idempotency, delivery-event handling, and Telegram TEAM lazy launch/reuse/replace behavior
      - team websocket delivery of live external user messages
      - launcher/runtime/continuation unit coverage for the bot-owned cached-run lifecycle guard
    - Totals:
      - `6` test files
      - `43` tests passed

15. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts --testNamePattern "keeps untouched secondary member projection empty while coordinator projection remains queryable in codex team runtime"`
    - Result: `PASS`
    - Coverage:
      - live `codex_app_server` team runtime process
      - real team creation, coordinator delivery, and projection behavior in a two-member team
      - untouched secondary-member projection stability remains intact after the messaging fixes
    - Totals:
      - `1` targeted live E2E passed

16. `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts --testNamePattern "creates and terminates a Claude runtime run through GraphQL"`
    - Result: `PASS`
    - Coverage:
      - live `claude_agent_sdk` runtime create and terminate path through GraphQL
      - confirms the local environment can still exercise a real Claude runtime process after the messaging-binding changes

17. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-runtime-configured-skills-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
    - Result: `PASS`
    - Coverage:
      - full live `codex_app_server` backend runtime suite
      - standalone runtime GraphQL flows
      - configured-skill execution against the live Codex runtime adapter
      - live two-member team runtime roundtrip behavior
    - Totals:
      - `3` test files
      - `17` tests passed

18. `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-runtime-configured-skills-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
    - Result: `PASS`
    - Coverage:
      - full live `claude_agent_sdk` backend runtime suite
      - standalone runtime GraphQL flows
      - configured-skill execution against the live Claude runtime adapter
      - live external-member team runtime behavior, including team history recovery
    - Totals:
      - `3` test files
      - `23` tests passed

19. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run`
    - Result: `PASS`
    - Coverage:
      - full current-tree frontend regression suite after the v7 live-hydration separation
      - settings flow, workspace history, active-runtime sync, shared streaming transport, and team streaming behavior on the same tree that contains the new hydration services
    - Totals:
      - `180` test files passed
      - `1` test file skipped
      - `816` tests passed

20. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts stores/__tests__/activeRuntimeSyncStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
    - Result: `PASS`
    - Coverage:
      - focused rerun after the final v7 review fix
      - run-history rendering remains read-only
      - active-runtime sync hydrates live contexts without reusing history-open coordinators
      - workspace polling continues to treat history refresh and active-runtime sync as separate concerns
    - Totals:
      - `3` test files
      - `53` tests passed

19. `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-configured-skills-graphql.e2e.test.ts`
    - Result: `PASS`
    - Coverage:
      - confirms the configured-skill websocket harness fix by itself before rerunning the full Claude suite
    - Totals:
      - `1` test file
      - `1` test passed

20. `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --pretty false --noEmit`
    - Result: `PASS`
    - Purpose:
      - verify the backend test-harness fix compiles cleanly without introducing type regressions

21. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/workspace/agent/__tests__/AgentEventMonitor.spec.ts`
    - Result: `PASS`
    - Coverage:
      - verifies the refreshed `AgentEventMonitor` test matches the current `AgentConversationFeed` delegation path
    - Totals:
      - `1` test file
      - `4` tests passed

22. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run`
    - Result: `PASS`
    - Coverage:
      - full frontend Vitest suite after the `AgentEventMonitor` spec refresh
    - Totals:
      - `180` test files passed
      - `1` test file skipped
      - `816` tests passed
      - `1` test skipped

23. `pnpm -C autobyteus-web exec nuxi typecheck`
    - Result: `FAIL`
    - Coverage:
      - full frontend static typecheck
    - Failure Summary:
      - broad pre-existing repo baseline errors across unrelated app, build, store, and utility modules
      - not limited to the messaging-team slice
    - Totals:
      - `1` targeted live E2E passed

17. `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/channel-ingress.integration.test.ts`
   - Result: `PASS`
    - Coverage:
      - exact single-flow Telegram TEAM API scenario:
        - first fake Telegram inbound message lazy-creates the team run

18. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts`
   - Result: `PASS`
   - Coverage:
     - live TEAM member rows derive `isActive` and `lastKnownStatus` from member runtime state instead of inheriting team status
     - persisted TEAM history projection and history-open behavior remain intact
   - Totals:
     - `1` test file
     - `24` tests passed

19. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/activeRuntimeSyncStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
   - Result: `PASS`
   - Coverage:
     - workspace tree rendering remains stable after the member-status projection cleanup
     - active-runtime sync still reconciles live teams and agents correctly
     - team streaming lifecycle callbacks remain intact
   - Totals:
     - `3` test files
     - `33` tests passed
20. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts exec vitest run tests/unit/api/graphql/services/active-runtime-snapshot-service.test.ts tests/unit/run-history/team-member-run-manifest-store.test.ts tests/unit/run-history/services/run-history-service.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
   - Result: `PASS`
   - Coverage:
     - active runtime snapshot filtering excludes team-member runs from the standalone `agentRuns()` view
     - team-member manifests can be resolved by member run id across team directories
     - standalone resume-config lookup now reports explicit team ownership for member runs instead of a misleading missing-manifest error
     - native-team websocket attach sends initial member status snapshots in addition to team status
   - Totals:
     - `4` test files
     - `16` tests passed

21. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts exec tsc -p tsconfig.build.json --pretty false --noEmit`
   - Result: `PASS`
   - Purpose:
     - confirm the backend ownership plus initial-status slice compiles cleanly after the new resolver boundary and team attach snapshot changes

22. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts build`
   - Result: `PASS`
   - Purpose:
     - confirm the full backend build path stays green after the ownership-resolution and native-team initial-status changes, so the worktree can be restarted directly for live verification
        - the test simulates team shutdown while leaving the cached `teamRunId` on the binding
        - second fake Telegram inbound message creates a fresh team run and routes there instead of reusing the inactive cached run
    - existing Telegram TEAM ingress regressions remain green alongside the new scenario
    - Totals:
      - `1` test file
      - `12` tests passed

18. `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/channel-ingress.integration.test.ts --testNamePattern "calls the gateway callback API for TEAM coordinator replies after fake Telegram ingress"`
   - Result: `PASS`
   - Coverage:
     - exact fake-Telegram TEAM callback path on the latest merged callback architecture:
       - inbound TEAM message resolves and dispatches to the coordinator member
       - accepted coordinator turn is bound back to the external reply callback service
       - callback outbox record is enqueued
       - dispatch worker delivers the queued callback
       - fake gateway callback endpoint receives the outbound POST
   - Totals:
     - `1` targeted integration test passed

19. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts`
   - Result: `PASS`
   - Coverage:
     - reply callback service contract on the merged outbox-based callback architecture
     - runtime-native turn bridge behavior for accepted external turns
     - TEAM runtime facade dispatch plus callback ownership flow
     - full SQL-backed ingress integration regression set including the strengthened TEAM callback publish path
   - Totals:
     - `4` test files

20. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-member-runtime-relay-service.test.ts tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts --testNamePattern "TEAM coordinator replies|later TEAM coordinator replies|TeamMemberRuntimeRelayService|RuntimeExternalChannelTurnBridge|ClaudeAgentSdkRuntimeAdapter|CodexAppServerRuntimeAdapter"`
   - Result: `PASS`
   - Coverage:
     - selective TEAM callback propagation across `send_message_to` hops
     - later source-linked coordinator turns still publish back to Telegram without requiring a fresh inbound envelope
     - Codex and Claude inter-agent relay adapters preserve accepted recipient turn ids for the propagation path
     - fake Telegram ingress plus a later source-linked coordinator reply still enqueue, dispatch, and deliver the callback payload to the fake gateway endpoint
   - Totals:
     - `5` test files
     - `24` tests passed

21. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts build`
   - Result: `PASS`
   - Purpose:
     - confirm the selective TEAM callback-propagation slice compiles cleanly in the backend startup path after carrying sender-turn metadata and recipient-turn ids through the relay pipeline

22. `NUXT_TEST=true pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec vitest run stores/__tests__/activeRuntimeSyncStore.spec.ts stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/transport/__tests__/WebSocketClient.spec.ts`
   - Result: `PASS`
   - Coverage:
     - persisted history polling remains side-effect free and no longer owns live-run recovery
     - active agent and team liveness is reconciled from the backend active snapshot through one explicit sync store
     - agent/team websocket disconnect and reconnect behavior now follows the active set instead of the history-refresh loop
     - workspace refresh now updates history rows and active-runtime synchronization in parallel rather than mixing the two concerns
   - Totals:
     - `8` test files
     - `81` tests passed

23. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web exec nuxi typecheck`
   - Result: `FAILED (pre-existing baseline)`
   - Coverage:
     - confirmed that the new active-runtime sync slice no longer introduces the local implicit-any that initially appeared in `activeRuntimeSyncStore.ts`
     - repository-wide web typecheck still fails on many unrelated pre-existing issues across application, component, and test files outside this refactor

22. `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-member-runtime-relay-service.test.ts tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts --testNamePattern "TEAM coordinator replies|later TEAM coordinator replies|TeamMemberRuntimeRelayService|RuntimeExternalChannelTurnBridge"`
   - Result: `PASS`
   - Coverage:
     - final post-build verification of the exact callback-propagation slice after the enum-backed source typing cleanup
     - relay propagation, bridge rebinding, and fake-Telegram follow-up callback publish stay green on the final compiled code
   - Totals:
     - `3` test files
     - `9` tests passed
     - `33` tests passed

20. `pnpm -C autobyteus-server-ts build`
   - Result: `PASS`
   - Purpose:
     - confirm the latest merged branch compiles cleanly after fixing the file-backed channel-binding provider merge regression

21. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
   - Result: `PASS`
   - Coverage:
     - distinct stable reasoning item ids within one turn
     - fresh fallback reasoning burst creation after command-execution boundaries within the same turn
     - existing reasoning coalescing behavior for contiguous same-burst fallback events
   - Totals:
     - `1` test file
     - `38` tests passed

22. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/transport/__tests__/WebSocketClient.spec.ts`
   - Result: `PASS`
   - Coverage:
     - web segment handling still renders distinct think segments when the backend emits a new reasoning id
     - frontend lookup now prefers `segmentId + segmentType` when `segment_type` is present, preventing reused raw ids across different segment kinds from colliding
     - TEAM streaming subscription behavior remains intact
     - shared websocket transport behavior remains intact
   - Totals:
     - `3` test files
     - `23` tests passed

23. `pnpm -C autobyteus-server-ts build`
   - Result: `PASS`
   - Coverage:
     - backend compile check after the reasoning-burst streaming fix

21. `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8010 node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port 8010`
   - Result: `PASS`
   - Purpose:
     - verify that a freshly built backend instance from this branch starts successfully on a clean port instead of relying on the older `:8000` process that was already running during manual Telegram testing
   - Notes:
     - startup completed successfully with no pending migrations against the worktree `production.db`

22. `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/channel-ingress.integration.test.ts --testNamePattern "calls the gateway callback API"`
   - Result: `PASS`
   - Coverage:
     - exact fake-Telegram callback API symmetry:
       - `TEAM` binding inbound message -> coordinator reply -> outbox enqueue -> dispatch worker -> callback POST
       - `AGENT` binding inbound message -> agent reply -> outbox enqueue -> dispatch worker -> callback POST
   - Totals:
     - `1` test file
     - `2` targeted integration tests passed

23. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts`
   - Result: `PASS`
   - Coverage:
     - reply callback service contract
     - runtime turn bridge callback binding
     - AGENT and TEAM runtime-facade callback integration behavior
     - full SQL-backed ingress integration suite including both exact fake-Telegram callback API regressions
   - Totals:
     - `4` test files
     - `34` tests passed

24. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts stores/__tests__/runHistoryStore.recovery.spec.ts`
   - Result: `PASS`
   - Coverage:
     - subscribed live TEAM contexts stay local/live when a team member is reselected from the left tree
     - inactive or unsubscribed TEAM contexts still reopen through persisted projection refresh
     - existing TEAM contexts continue to refresh in place when history reopen is required
     - active-run recovery semantics remain intact for TEAM contexts after the live-selection fix
   - Totals:
     - `2` test files
     - `27` tests passed

25. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentTeamRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - Result: `PASS`
   - Coverage:
     - TEAM subscription lifecycle remains intact in the team run store
     - TEAM websocket connect/disconnect still toggles subscription state correctly
     - run-history selection keeps the subscribed live TEAM fast path
     - workspace tree-panel team-row clicks still route through member selection instead of blind top-row selection
   - Totals:
     - `4` test files
     - `39` tests passed

26. `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts`
   - Result: `PASS`
   - Coverage:
     - typed `StreamSegmentIdentity` helper does not change agent-stream or team-stream behavior
     - segment start/content matching still separates repeated reasoning bursts correctly
     - synthetic tool lifecycle segments still attach to the correct segment identity
     - status/error handlers still resolve tool segments after the identity-helper cleanup
   - Totals:
     - `5` test files
     - `41` tests passed

## Gate Repair Logged During Testing

- Expanded REST ingress testing exposed a real SQL-schema gap: the Prisma model and SQL provider expected `channel_bindings.team_definition_id`, but the applied migrations did not create it.
- Added `autobyteus-server-ts/prisma/migrations/20260310153000_add_channel_binding_team_definition_id/migration.sql`.
- After that migration was added, the full SQL-backed ingress suite passed.
- Fresh review then exposed a real runtime gap: member-runtime TEAM dispatch did not bind accepted coordinator/member turns to the external reply bridge, so Codex/Claude team replies were not yet reliably wired back to messaging providers.
- Fixed that by returning accepted member-turn metadata from the TEAM continuation path and binding it in `DefaultChannelRuntimeFacade` with the original inbound envelope.
- Added regression coverage at the unit and REST-ingress integration levels for that reply-bridge path.
- Increased the managed-callback delivery test timeout from `5000ms` to `10000ms` because the test is valid but was close to the default timeout under the broader suite load.
- Manual Telegram verification then exposed a pre-existing but noisy projection case for untouched Codex team members: optional local member-memory files were missing and the untouched secondary-member Codex thread was still unmaterialized.
- The hardening slice did not change TEAM routing or coordinator-only reply behavior; it only makes that untouched-member projection path return quiet empty state and adds focused regression coverage.
- Manual Telegram verification later exposed a separate TEAM live-stream gap: reused TEAM runs still produced assistant replies, but the inbound external user message was not mirrored into the open team UI conversation.
- Fixed that by adding a team-scoped live-message broadcaster/publisher on the server, returning the resolved target member name from TEAM continuation, and teaching the team web streaming client to consume `EXTERNAL_USER_MESSAGE`.
- Added server regression coverage for TEAM dispatch publication plus team-websocket delivery, and a web regression proving the targeted member conversation now receives the user bubble.
- The latest Telegram retest plus direct `getTeamMemberRunProjection` queries showed that backend projection already contained the Telegram user turns; the remaining gap was the web history-selection path reusing a stale local TEAM context instead of refetching projections.
- Fixed that by making TEAM history selection reopen through `openTeamMemberRun(...)` and refreshing existing team contexts in place so websocket-bound context objects remain valid.
- Manual workspace verification later exposed a second TEAM selection regression specific to this branch: the live-team fast path from `origin/personal` was no longer active for subscribed contexts, so reselection from the left tree reopened persisted projection and made live TEAM runs look historical.
- Fixed that by restoring the subscribed-live TEAM selection fast path in `runHistorySelectionActions.ts` while keeping the inactive/unsubscribed TEAM reopen path intact, then reran focused run-history, tree-panel, team run store, and team streaming regressions.
- Added focused web regression coverage for both the stale-local-context selection path and the in-place TEAM context refresh path.
- The latest lifecycle fix tightened the rule again: cached runs are reused only when the messaging binding still owns that exact run in the current backend process and the run is still active.
- Added focused launcher unit coverage for both `AGENT` and `TEAM` ownership checks, plus a Telegram ingress integration regression where a history-reopened cached team run is active but must still be ignored by the binding after restart.
- The expanded rerun then exercised the strongest local black-box paths available: GraphQL setup E2E, black-box REST ingress API handling, team websocket delivery, a live Codex team-runtime E2E, and a minimal live Claude runtime GraphQL E2E.
- Added the exact server-side API ingress regression requested by the user for the create -> shutdown -> recreate TEAM flow.
- After merging the latest `origin/personal`, the first fresh build exposed a real compile regression in `file-channel-binding-provider.ts`: `upsertBindingTeamRunId()` referenced an out-of-scope `bindingsFilePath` variable instead of `this.filePath`.
- Fixed that merge regression, reran the backend build, and then started a fresh backend instance on `127.0.0.1:8010`.
- The strengthened TEAM callback integration regression initially raced the async runtime-event handling path by asserting the callback outbox state immediately after a single tick.
- Hardened that regression with polling so the test now waits for the outbox enqueue, dispatch-worker delivery, and callback POST receipt instead of depending on same-tick timing.
- The remaining coverage gap was the absence of an exact AGENT-side fake-Telegram callback regression matching the TEAM one.
- Added that AGENT regression so both binding types now prove the final callback POST path through the server-local fake gateway endpoint.

## Acceptance Evidence Summary

- `AGENT` bindings still save with definition-bound launch presets: `PASS`
- `TEAM` bindings save with `targetTeamDefinitionId + teamLaunchPreset`, with `teamRunId` remaining unset until first inbound launch: `PASS`
- TEAM definition options are discoverable in the settings flow: `PASS`
- TEAM inbound dispatch routes through lazy team-run resolution and continuation instead of active-team lookup only: `PASS`
- First TEAM ingress lazily creates and persists a new `teamRunId`, and later ingress events reuse the cached `teamRunId`: `PASS`
- Stale cached TEAM runs are replaced and the fresh `teamRunId` is persisted before continuation: `PASS`
- Cached `AGENT` and `TEAM` runs are now reused only while they remain bot-owned in the current backend process and active: `PASS`
- TEAM verification requires a team definition plus team launch preset, not an agent launch preset: `PASS`
- Member-runtime TEAM coordinator turns are now bound into the external reply bridge for Codex/Claude-style runtimes: `PASS`
- External callback-path tests still enforce a single visible responder instead of multi-member fan-out: `PASS`
- Open TEAM UI conversations now mirror inbound external user messages into the resolved coordinator/member conversation instead of showing assistant-only updates: `PASS`
- Reopened TEAM history rows now refresh member projections instead of keeping stale in-memory conversation state after a missed live event: `PASS`
- Telegram/web UX communicates single visible responder semantics for teams: `PASS`
- Untouched secondary Codex team members can now be projected as empty without surfacing noisy warnings or GraphQL failures in the server-side regression suite: `PASS`
- The local environment now also proves live Codex team runtime startup/projection and live Claude runtime create/terminate behavior on top of the API/integration coverage: `PASS`
- The local environment now also proves the merged outbox-based callback path for TEAM replies, including the actual callback POST into a fake gateway endpoint: `PASS`
- The local environment now also proves the merged outbox-based callback path for AGENT replies, including the actual callback POST into a fake gateway endpoint: `PASS`

## Environment Limits

- Real Telegram delivery was not exercised in this environment.
- Full provider-runtime integration against a live `autobyteus` runtime through a real messaging gateway was not exercised in this environment.
- `claude_agent_sdk` was exercised through a live runtime GraphQL E2E, but not through the real messaging gateway path or a team-runtime live E2E here.
- Live `codex_app_server` was exercised through a focused team-runtime E2E, but not through a real Telegram gateway automation.
- `pnpm -C autobyteus-server-ts run typecheck` still fails on an existing repository-wide `TS6059` `rootDir`/`tests` configuration issue unrelated to this ticket.
- Web GraphQL codegen could not run against a live schema endpoint because no backend GraphQL server was listening on `http://localhost:8000/graphql`.
- `autobyteus-web/generated/graphql.ts` was manually synchronized for the affected messaging setup operations as a compensating step.
