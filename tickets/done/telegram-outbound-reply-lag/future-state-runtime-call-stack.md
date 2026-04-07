# Future-State Runtime Call Stack

## AutoByteus Direct Dispatch To Recovery-Runtime-Owned Capture Session

1. `ChannelIngressService.handleInboundMessage`
2. `ChannelBindingService.resolveBinding`
3. `ChannelMessageReceiptService.claimIngressDispatch`
4. `ChannelRunFacade.dispatchToBinding`
5. `ChannelAgentRunFacade.dispatchToAgentBinding`
6. `ChannelBindingRunLauncher.resolveOrStartAgentRun` returns exact `agentRunId`
7. `AcceptedReceiptRecoveryRuntime.prepareDirectDispatchTurnCapture(agentRunId, subscribeToEvents)` returns a recovery-runtime-owned capture session
8. That capture session is backed internally by `AcceptedReceiptDispatchTurnCaptureRegistry`, but ingress does not know that owner
9. `AutoByteusAgentRunBackend.postUserMessage`
10. Native facade `Agent.postUserMessage`
11. `AgentRuntime.submitEvent` enqueues `UserMessageReceivedEvent` and returns acceptance
12. Native worker may immediately dequeue the message and emit `TURN_STARTED(turnId)`
13. The dispatch capture registry records that exact `{ agentRunId, turnId }` tuple before accepted-receipt registration can miss it
14. `ChannelIngressService.recordAcceptedDispatch(...)` persists:
   - exact `turnId` immediately when already captured, or
   - `turnId = null` plus exact `agentRunId` when the first turn has not started yet
15. `captureSession.attachAcceptedReceipt(acceptedReceipt)` hands the persisted receipt back to the recovery-runtime-owned session
16. If the first turn starts later, the same capture session persists `updateAcceptedReceiptCorrelation(...)`
17. `AcceptedReceiptRecoveryRuntime.registerAcceptedReceipt(acceptedReceipt)` remains the restore/retry entrypoint
18. `AcceptedReceiptRecoveryRuntime.processReceipt`:
   - waits briefly when a live dispatch capture still owns that accepted receipt key
   - otherwise falls back to persistent unmatched-receipt observation or exact reply publication

## AutoByteus Team Dispatch To Recovery-Runtime-Owned Capture Session

1. `ChannelIngressService.handleInboundMessage`
2. `ChannelBindingService.resolveBinding`
3. `ChannelMessageReceiptService.claimIngressDispatch`
4. `ChannelRunFacade.dispatchToBinding`
5. `ChannelTeamRunFacade.dispatchToTeamBinding`
6. `ChannelBindingRunLauncher.resolveOrStartTeamRun` returns exact `teamRunId`
7. `AcceptedReceiptRecoveryRuntime.prepareTeamDispatchTurnCapture(teamRunId, subscribeToEvents)` returns a recovery-runtime-owned capture session
8. That capture session is backed internally by `AcceptedReceiptDispatchTurnCaptureRegistry`, not exposed directly to ingress
9. `AutoByteusTeamRunBackend.postMessage`
10. Native facade `AgentTeam.postMessage`
11. Team runtime enqueues the user message and returns acceptance
12. The target member runtime emits `TURN_STARTED(turnId)`, and team rebroadcast carries exact `memberRunId` plus `turnId`
13. The dispatch capture registry records that exact `{ teamRunId, memberRunId, turnId }` tuple
14. `ChannelIngressService.recordAcceptedDispatch(...)` persists:
   - exact `memberRunId` from dispatch,
   - and exact `turnId` immediately when already captured, otherwise `turnId = null`
15. `captureSession.attachAcceptedReceipt(acceptedReceipt)` ties the persisted accepted receipt to the live recovery-runtime-owned session
16. If the first team-member turn starts later, the same session persists `updateAcceptedReceiptCorrelation(...)`
17. `AcceptedReceiptRecoveryRuntime.registerAcceptedReceipt(acceptedReceipt)` remains the restore/retry entrypoint
18. `AcceptedReceiptRecoveryRuntime.processReceipt` later consumes that exact persisted correlation for strict team reply publication

## Accepted Receipt Restore / Retry To Persistent Unmatched-Receipt Observation

1. `AcceptedReceiptRecoveryRuntime.registerAcceptedReceipt`
2. `AcceptedReceiptRecoveryRuntime.processReceipt`
3. If persisted reply text is already available, `tryPublishPersistedReply` publishes immediately
4. If `turnId` is missing and no live dispatch capture still owns the accepted receipt key:
   - `AcceptedReceiptTurnCorrelationObserverRegistry.ensureObservationForReceipt(receipt)`
5. The observer registry subscribes once per direct run or team run
6. On later `TURN_STARTED(turnId)`:
   - direct path binds the oldest unmatched accepted receipt for that exact `agentRunId`
   - team path binds the oldest unmatched accepted receipt for that exact `{ teamRunId, memberRunId }`
7. `ChannelMessageReceiptService.updateAcceptedReceiptCorrelation(...)`
8. `AcceptedReceiptRecoveryRuntime.scheduleProcessing(updatedReceipt, 0)`
9. `AcceptedReceiptRecoveryRuntime.processReceipt` resumes and either:
   - publishes persisted text, or
   - starts strict live observation on the now-exact turn

## Direct Telegram Reply Publication

1. Accepted receipt now carries exact `agentRunId` and exact `turnId`
2. `AcceptedReceiptRecoveryRuntime.processReceipt`
3. `AcceptedReceiptRecoveryRuntime.tryPublishPersistedReply`
4. If text is not yet persisted, `AcceptedReceiptRecoveryRuntime.tryStartLiveObservation`
5. `ChannelAgentRunReplyBridge.observeAcceptedTurnToSource`
6. Bridge filters only exact turn-scoped runtime events
7. `TURN_COMPLETED(turnId)` remains the only completion signal for publishing
8. `ReplyCallbackService.publishAssistantReplyToSource`
9. `ChannelMessageReceiptService.markReplyPublished`

## Team Telegram Reply Publication

1. Accepted receipt now carries exact `teamRunId`, `memberRunId`, and `turnId`
2. `AcceptedReceiptRecoveryRuntime.processReceipt`
3. `AcceptedReceiptRecoveryRuntime.tryPublishPersistedReply`
4. If text is not yet persisted, `AcceptedReceiptRecoveryRuntime.tryStartLiveObservation`
5. `ChannelTeamRunReplyBridge.observeAcceptedTeamTurnToSource`
6. Bridge filters exact `{ memberRunId, turnId }`
7. `TURN_COMPLETED(turnId)` for that exact member turn publishes the reply
8. `ReplyCallbackService.publishAssistantReplyToSource`
9. `ChannelMessageReceiptService.markReplyPublished`

## Internal Ownership Split

### Recovery Runtime Public Boundary

1. `AcceptedReceiptRecoveryRuntime`
2. owns:
   - restore/retry scheduling
   - public dispatch-capture preparation
   - publish-or-observe orchestration
3. must not leak:
   - internal registry types
   - internal pending-capture implementation details

### Bounded Local Spine: Dispatch Capture Sessions

1. Parent owner: `AcceptedReceiptDispatchTurnCaptureRegistry`
2. `create*DispatchTurnCapture -> subscribe before enqueue -> capture TURN_STARTED -> attach accepted receipt -> persist correlation or schedule retry -> dispose`
3. This owner exists only for fresh accepted dispatches and expires quickly

### Bounded Local Spine: Persistent Unmatched-Receipt Observation

1. Parent owner: `AcceptedReceiptTurnCorrelationObserverRegistry`
2. `ensure observer -> observe TURN_STARTED -> bind oldest unmatched accepted receipt -> reschedule processing -> dispose observer when empty`
3. This owner serves restore/retry and delayed-correlation cases after accepted receipt persistence

## Intended Outcome

- The first bound Telegram message still cannot miss its own native `TURN_STARTED`
- `ChannelIngressService` depends only on the recovery-runtime boundary for capture lifecycle
- The fresh dispatch capture state machine and the persistent unmatched-receipt observer no longer share one oversized source owner
- Strict exact persisted correlation plus `TURN_COMPLETED(turnId)` remains the only reply-publication authority
