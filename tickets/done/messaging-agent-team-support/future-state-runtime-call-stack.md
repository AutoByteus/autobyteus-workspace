# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-module loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v8`
- Requirements: `tickets/in-progress/messaging-agent-team-support/requirements.md` (status `Refined`)
- Source Artifact:
  - `Medium/Large`: `tickets/in-progress/messaging-agent-team-support/proposed-design.md`
- Source Design Version: `v8`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | N/A | Save or list `AGENT` bindings without behavior regression | Yes/N/A/Yes |
| UC-002 | Requirement | R-001,R-004,R-005 | N/A | Save `TEAM` binding from settings using team definition and team launch preset | Yes/N/A/Yes |
| UC-003 | Requirement | R-000,R-001 | N/A | Verify and render saved binding readiness for both `AGENT` and `TEAM` targets | Yes/N/A/Yes |
| UC-004 | Requirement | R-002,R-006,R-007 | N/A | Dispatch inbound Telegram message to a cached active team run with single external reply | Yes/Yes/Yes |
| UC-005 | Requirement | R-002,R-005,R-006,R-007 | N/A | Dispatch inbound Telegram message to a definition-bound team binding with no cached run by lazy-creating the run | Yes/Yes/Yes |
| UC-006 | Requirement | R-006 | N/A | Reset or replace stale cached team run state when the binding configuration changes or the cached run is inactive or unusable | Yes/Yes/Yes |
| UC-007 | Requirement | R-008 | N/A | Continue websocket reconnect attempts for an already selected live run during backend restart | Yes/Yes/Yes |
| UC-008 | Requirement | R-009 | N/A | Selecting a member row for an already subscribed live team run preserves the live context and only changes focus | Yes/Yes/N/A |
| UC-009 | Requirement | R-012 | N/A | Refresh persisted history without triggering websocket reconnect or active-context recovery side effects | Yes/N/A/N/A |
| UC-010 | Requirement | R-013 | N/A | Reconcile active agent and team subscriptions from a dedicated backend active-runtime source | Yes/Yes/Yes |
| UC-011 | Requirement | R-015,R-016 | N/A | Resolve standalone historical run projection and resume metadata through a runtime-aware backend history source | Yes/Yes/Yes |
| UC-012 | Requirement | R-015,R-016 | N/A | Resolve team-member historical projection through the same runtime-aware history source without probing standalone member ids | Yes/Yes/Yes |
| UC-019 | Requirement | R-017 | N/A | Apply authoritative backend live status to already-hydrated active runs and teams without resetting them to placeholder frontend states | Yes/N/A/Yes |
| UC-020 | Requirement | R-017,R-018 | N/A | Hydrate a newly discovered active run or team through a dedicated live-hydration path without reusing selection/history-open coordinators | Yes/Yes/Yes |
| UC-021 | Requirement | R-019 | N/A | Resolve team-member ownership from an indexed backend lookup during active-runtime polling instead of scanning every team directory per lookup | Yes/N/A/Yes |
| UC-022 | Requirement | R-020,R-021 | N/A | Re-resolve an ordinary filesystem workspace after backend restart from stable workspace identity instead of a stale runtime-local handle | Yes/N/A/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - Existing branch-local run-bound `TEAM` setup code is replaced, not retained.
  - Existing `teamRunId` persistence remains, but only as a runtime cache under a definition-bound team binding.
  - Existing history-poll-triggered active-run recovery is removed from the history fetch path and replaced by a separate active-runtime synchronization path.
- Existing runtime-aware projection-provider logic is promoted into a broader history-source boundary so summary extraction and resume metadata resolve through the same runtime-aware contract instead of reintroducing local-storage assumptions higher in the stack.
- Cached `TEAM` reuse is narrowed from resumable-or-active to current-process bot-owned active-only so it matches the intended messaging-binding lifecycle rule.
- Active-runtime synchronization no longer reuses history-open coordinators; it uses dedicated live-hydration services that share lower-level projection/resume helpers without inheriting selection or websocket side effects.
- Ordinary filesystem workspaces stop using random per-process ids as durable identity; restart-time workspace recovery re-resolves them from deterministic identity derived from normalized `rootPath`.
- Retirement plan for temporary logic:
  - None. The final design has one active TEAM setup model.

## Use Case: UC-001 [Save Or List `AGENT` Bindings Without Behavior Regression]

### Goal

Keep the current definition-bound agent binding flow working after definition-bound team bindings are added.

### Preconditions

- User selects `targetType = AGENT`.
- Selected agent definition exists.
- Launch preset is complete.

### Expected Outcome

- Binding persists with `targetType = AGENT`, `agentDefinitionId`, and `launchPreset`.
- Listing and verification still show the agent target label and launch preset metadata.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue:onSaveBinding()
├── autobyteus-web/composables/messaging-binding-flow/orchestration-actions.ts:onSaveBinding(...) [ASYNC]
│   └── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:upsertBinding(draft) [STATE]
│       ├── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:validateDraft(draft) [STATE]
│       └── [IO] Apollo mutation -> autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts:upsertExternalChannelBinding(input)
│           ├── autobyteus-server-ts/src/api/graphql/types/external-channel-setup/validator.ts:parseTargetType(input.targetType)
│           ├── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:getAgentDefinitionById(...)
│           ├── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBinding(...) [IO]
│           └── autobyteus-server-ts/src/api/graphql/types/external-channel-setup/mapper.ts:toGraphqlBinding(binding)
└── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:loadBindings() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if agent definition is missing
autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts:upsertExternalChannelBinding(input)
└── graphql:GraphQLError(code="TARGET_AGENT_DEFINITION_NOT_FOUND")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Save `TEAM` Binding From Settings Using Team Definition And Team Launch Preset]

### Goal

Allow the settings UI to create a valid `TEAM` binding by selecting a team definition and configuring a reusable launch preset.

### Preconditions

- User selects `targetType = TEAM`.
- Team definition exists in setup-facing team-definition options.
- Team launch preset is complete.

### Expected Outcome

- Binding persists with:
  - `targetType = TEAM`
  - `teamDefinitionId`
  - `teamLaunchPreset`
  - `teamRunId = null` on first save unless a compatible cached run already exists
- Saved binding list renders a team-definition label instead of a team-run label.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue:onSaveBinding()
├── autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts:watch(draft.targetType) [STATE]
│   └── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:loadTeamDefinitionOptions() [ASYNC]
│       └── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts:externalChannelTeamDefinitionOptions()
│           └── autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts:listTeamDefinitionOptions() [IO]
├── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:upsertBinding(draft) [STATE]
│   ├── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:validateDraft(draft) [STATE]
│   └── [IO] Apollo mutation -> autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts:upsertExternalChannelBinding(input)
│       ├── autobyteus-server-ts/src/api/graphql/types/external-channel-setup/validator.ts:parseTargetType(input.targetType)
│       ├── autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts:requireTeamDefinition(targetTeamDefinitionId) [IO]
│       ├── autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts:normalizeTeamLaunchPreset(input.teamLaunchPreset) [STATE]
│       ├── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBinding(...) [IO]
│       └── autobyteus-server-ts/src/api/graphql/types/external-channel-setup/mapper.ts:toGraphqlBinding(binding)
└── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:loadBindings() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if targetTeamDefinitionId is missing
autobyteus-web/stores/messagingChannelBindingSetupStore.ts:validateDraft(draft)
└── fieldErrors.targetTeamDefinitionId = "Team definition is required"
```

```text
[ERROR] if teamLaunchPreset is incomplete
autobyteus-web/stores/messagingChannelBindingSetupStore.ts:validateDraft(draft)
└── fieldErrors.teamLaunchPreset = "Team launch configuration is required"
```

```text
[ERROR] if a stale or deleted team definition is submitted
autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts:requireTeamDefinition(targetTeamDefinitionId)
└── graphql:GraphQLError(code="TARGET_TEAM_DEFINITION_NOT_FOUND")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Verify And Render Saved Binding Readiness For Both `AGENT` And `TEAM` Targets]

### Goal

Ensure verification UI and saved-binding summaries reflect the correct prerequisites for each target type.

### Preconditions

- At least one binding is loaded.
- Setup verification flow runs after provider and session checks.

### Expected Outcome

- `AGENT` bindings verify against `targetAgentDefinitionId + launchPreset`.
- `TEAM` bindings verify against `targetTeamDefinitionId + teamLaunchPreset`.
- The UI explains that only the coordinator or entry-node reply is exposed back to Telegram.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/SetupVerificationCard.vue:render()
├── autobyteus-web/stores/messagingVerificationStore.ts:runVerification() [ASYNC]
│   ├── autobyteus-web/stores/messagingChannelBindingSetupStore.ts:loadBindings() [IO]
│   ├── autobyteus-web/stores/messagingVerificationStore.ts:evaluateBinding(binding) [STATE]
│   │   ├── [FALLBACK] if binding.targetType === "AGENT" -> require agent definition + launch preset
│   │   └── [FALLBACK] if binding.targetType === "TEAM" -> require team definition + team launch preset
│   └── autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue:bindingSummaryLabel(binding) [STATE]
└── autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue:teamReplyPolicyHint() [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if binding is partially configured
autobyteus-web/stores/messagingVerificationStore.ts:evaluateBinding(binding)
└── status = FAILED with target-type-specific detail message
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Dispatch Inbound Telegram Message To A Cached Active Team Run With Single External Reply]

### Goal

Route an inbound external message to an already known team run while publishing only one external reply stream.

### Preconditions

- A `TEAM` binding exists with `teamDefinitionId`, `teamLaunchPreset`, and a cached `teamRunId`.
- Cached `teamRunId` is still active for this binding.
- External envelope contains source metadata.

### Expected Outcome

- Cached team run is reused or resumed.
- Message reaches the coordinator or entry member with preserved external metadata.
- External callback publishes only from that entry responder’s run.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:acceptInbound(...)
├── [IO] autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:resolveBinding(...)
├── autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope)
│   └── autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToTeam(binding, envelope) [ASYNC]
│       ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts:resolveOrStartTeamRun(binding, { initialSummary }) [ASYNC]
│       │   ├── [IO] autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:getTeamRunResumeConfig(teamRunId)
│       │   └── [FALLBACK] if cached teamRunId is active -> return cached teamRunId
│       ├── autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts:buildAgentInputMessage(envelope) [STATE]
│       └── autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:continueTeamRunWithMessage(...)
│           ├── [FALLBACK] native-team path -> restore if needed -> autobyteus-ts/src/agent-team/agent-team.ts:postMessage(message, null) [ASYNC]
│           └── [FALLBACK] member-runtime path -> team-member-runtime-orchestrator.ts:sendToMember(...) [ASYNC]
├── [IO] autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts:recordReceipt(...)
└── entry responder emits assistant output
    ├── [FALLBACK] runtime = autobyteus
    │   └── autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts:processResponse(...) [ASYNC]
    └── [FALLBACK] runtime = codex_app_server / claude_agent_sdk
        └── autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts:publishPendingTurnReply(...) [ASYNC]
            └── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReplyByTurn(agentRunId, turnId, ...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if cached team run is inactive after restart
channel-binding-runtime-launcher.ts:resolveOrStartTeamRun(binding, ...)
└── do not reuse cached teamRunId -> fall through to fresh team creation
```

```text
[ERROR] if cached team run id no longer exists in history
channel-binding-runtime-launcher.ts:resolveOrStartTeamRun(binding, ...)
└── fall through to lazy-create path in UC-005 rather than failing the dispatch
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-009 [Refresh Persisted History Without Triggering Websocket Reconnect Or Active-Context Recovery Side Effects]

### Goal

Keep persisted history loading read-only so it never owns live-runtime recovery.

### Preconditions

- Workspace page is open.
- Background refresh interval fires or the user manually refreshes history.

### Expected Outcome

- Persisted rows, summaries, timestamps, and inactive-history details refresh.
- No websocket connect or reconnect is triggered as a side effect of the history fetch.
- No live run or team context is reopened during the history fetch path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:refreshTreeQuietly()
└── autobyteus-web/stores/runHistoryStore.ts:fetchTree(limitPerAgent, { quiet: true }) [ASYNC]
    └── autobyteus-web/stores/runHistoryLoadActions.ts:fetchRunHistoryTree(store, limitPerAgent, { quiet: true }) [ASYNC]
        ├── [IO] Apollo query -> ListRunHistory
        ├── [IO] Apollo query -> ListTeamRunHistory
        ├── autobyteus-web/stores/runHistoryReadModel.ts:buildRunHistoryTreeNodes(...) [STATE]
        └── return without calling active-run recovery or websocket connection code
```

### Branching / Fallback Paths

```text
[ERROR] if history query fails
runHistoryLoadActions.ts:fetchRunHistoryTree(...)
└── update store.error without mutating live subscription state
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `N/A`
- Error Path: `Planned`

## Use Case: UC-010 [Reconcile Active Agent And Team Subscriptions From A Dedicated Backend Active-Runtime Source]

### Goal

Drive websocket ownership from explicit backend liveness instead of from persisted-history side effects.

### Preconditions

- Backend exposes active agents and active teams from runtime managers.
- Frontend policy is to keep all active runs and teams live-connected.

### Expected Outcome

- Frontend receives the active runtime set.
- Subscription manager computes the desired subscribed set.
- Only newly active runs are connected.
- Already connected runs are left untouched.
- No-longer-active runs are detached once.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/runRecovery/activeRuntimeRegistry.ts:refreshActiveRuntimeSet() [ASYNC]
├── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/agent-run.ts:agentRuns()
├── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:agentTeamRuns()
└── autobyteus-web/services/runRecovery/runSubscriptionManager.ts:reconcile(nextActiveSet) [STATE]
    ├── diff current subscribed set vs next active set [STATE]
    ├── [FALLBACK] for each newly active agent -> agentRunStore.connectToAgentStream(runId)
    ├── [FALLBACK] for each newly active team -> agentTeamRunStore.connectToTeamStream(teamRunId)
    ├── [FALLBACK] for each no-longer-active agent -> context.unsubscribe()
    └── [FALLBACK] for each no-longer-active team -> teamContext.unsubscribe()
```

### Branching / Fallback Paths

```text
[FALLBACK] if a newly active run already has a connected websocket
runSubscriptionManager.ts:reconcile(nextActiveSet)
└── skip reconnect and preserve existing subscription
```

```text
[ERROR] if active-runtime query fails
activeRuntimeRegistry.ts:refreshActiveRuntimeSet()
└── preserve current subscribed set and surface a recoverable registry-sync error
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-019 [Apply Authoritative Backend Live Status To Already-Hydrated Active Runs And Teams Without Resetting Them To Placeholder Frontend States]

### Goal

Use backend-normalized live status as the source of truth for already-hydrated active contexts.

### Preconditions

- An agent run or team run already exists in frontend context state.
- Backend active-runtime snapshot query returns the run or team with current live status.

### Expected Outcome

- Existing live contexts keep their renderable conversation state.
- Status is updated from the backend snapshot instead of being reset to `Uninitialized`.
- Focused member status remains member-first for teams.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/activeRuntimeSyncStore.ts:refresh()
├── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/agent-run.ts:agentRuns()
├── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:agentTeamRuns()
├── autobyteus-web/stores/activeRuntimeSyncStore.ts:applyAgentStatuses(snapshot.agentRuns) [STATE]
│   └── autobyteus-web/stores/agentContextsStore.ts:getRun(runId)
│       └── update context.state.currentStatus from backend snapshot
└── autobyteus-web/stores/activeRuntimeSyncStore.ts:applyTeamStatuses(snapshot.agentTeamRuns) [STATE]
    ├── autobyteus-web/stores/agentTeamContextsStore.ts:getTeamContextById(teamRunId)
    ├── update teamContext.currentStatus from backend snapshot
    └── update memberContext.state.currentStatus from backend member-status snapshot using memberRouteKey
```

### Branching / Fallback Paths

```text
[FALLBACK] if a member status is missing from the active-team snapshot
activeRuntimeSyncStore.ts:applyTeamStatuses(snapshot.agentTeamRuns)
└── preserve the existing member runtime status instead of overwriting it with a placeholder
```

```text
[ERROR] if a snapshot row references a missing local context
activeRuntimeSyncStore.ts:refresh()
└── route to the dedicated live-hydration path in UC-020
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-020 [Hydrate A Newly Discovered Active Run Or Team Through A Dedicated Live-Hydration Path Without Reusing Selection/History-Open Coordinators]

### Goal

Render newly discovered active runs and teams without reusing the history-open coordinators that also own selection and websocket side effects.

### Preconditions

- Backend active-runtime snapshot includes a run or team id that has no local context yet.
- Projection and resume queries are available for that run or team.

### Expected Outcome

- Active-runtime sync fetches the needed projection/resume payload through a dedicated hydration service.
- Context state is hydrated without selection changes.
- Websocket ownership remains in the subscription manager rather than in the history-open path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/activeRuntimeSyncStore.ts:refresh()
├── detect active run/team ids missing local context [STATE]
├── [FALLBACK] missing agent run
│   └── autobyteus-web/services/runHydration/runLiveHydrationService.ts:hydrateActiveRunContext(runId, snapshotStatus) [ASYNC]
│       ├── [IO] Apollo query -> GetRunProjection
│       ├── [IO] Apollo query -> GetRunResumeConfig
│       └── autobyteus-web/stores/agentContextsStore.ts:upsertProjectionContext(...) [STATE]
└── [FALLBACK] missing team run
    └── autobyteus-web/services/runHydration/teamRunLiveHydrationService.ts:hydrateActiveTeamContext(teamRunId, snapshotStatus, memberStatuses) [ASYNC]
        ├── [IO] Apollo query -> GetTeamRunResumeConfig
        ├── [IO] Apollo query -> GetTeamMemberRunProjection(...) per member
        └── autobyteus-web/stores/agentTeamContextsStore.ts:addTeamContext(...) or patch existing context [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a live-hydration request finds an already-created context before completion
runLiveHydrationService.ts:hydrateActiveRunContext(...)
└── patch the existing context instead of replacing selection or reattaching stream ownership
```

```text
[ERROR] if projection/resume queries fail during live hydration
runLiveHydrationService.ts:hydrateActiveRunContext(...)
└── record recoverable sync warning and keep the run in the desired active set for the next refresh
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-011 [Resolve Standalone Historical Run Projection And Resume Metadata Through A Runtime-Aware Backend History Source]

### Goal

Keep frontend history loading runtime-agnostic while ensuring backend projection, summary extraction, and resume metadata all resolve through the correct runtime-aware history source.

### Preconditions

- A standalone run exists for one runtime kind (`autobyteus`, `codex_app_server`, or `claude_agent_sdk`).
- The run is represented in persisted history.
- Frontend requests either run projection or resume metadata.

### Expected Outcome

- Shared history query services resolve the correct history source from runtime kind.
- Local-memory assumptions are used only for native `autobyteus` runs.
- Codex and Claude history queries stay behind runtime-specific history-source implementations.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/runHistoryLoadActions.ts:openRunFromHistory(runId) [ASYNC]
└── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/run-history.ts:getRunProjection(runId)
    └── autobyteus-server-ts/src/run-history/services/run-history-query-service.ts:getRunProjection(runId) [ASYNC]
        ├── autobyteus-server-ts/src/run-history/services/run-history-service.ts:getRunManifest(runId) [IO]
        ├── autobyteus-server-ts/src/run-history/history-source/run-history-source-registry.ts:getSource(manifest.runtimeKind) [STATE]
        └── autobyteus-server-ts/src/run-history/history-source/history-source-port.ts:getProjection({ runId, manifest }) [ASYNC]
            ├── [FALLBACK] runtime = autobyteus -> local-memory-history-source.ts:getProjection(...) [IO]
            ├── [FALLBACK] runtime = codex_app_server -> codex-thread-history-source.ts:getProjection(...) [ASYNC]
            └── [FALLBACK] runtime = claude_agent_sdk -> claude-session-history-source.ts:getProjection(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the frontend requests resume metadata instead of projection
run-history-query-service.ts:getRunResumeConfig(runId)
├── run-history-service.ts:getRunManifest(runId) [IO]
├── run-history-source-registry.ts:getSource(manifest.runtimeKind) [STATE]
└── history-source-port.ts:getResumeConfig({ runId, manifest }) [ASYNC]
```

```text
[ERROR] if no history source exists for manifest.runtimeKind
run-history-source-registry.ts:getSource(runtimeKind)
└── throw Error("UNSUPPORTED_HISTORY_SOURCE")
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-021 [Resolve Team-Member Ownership From An Indexed Backend Lookup During Active-Runtime Polling Instead Of Scanning Every Team Directory Per Lookup]

### Goal

Keep backend ownership resolution cheap enough for the active-runtime registry to poll regularly.

### Preconditions

- Team-member manifests have been written for at least one team run.
- Active-runtime snapshot is evaluating active agent runs to decide whether they are standalone or team-member runs.

### Expected Outcome

- Ownership resolution checks an in-memory or lazily built member-run index first.
- Disk scans are limited to index-build or repair moments instead of every lookup.
- Active-runtime snapshot remains runtime-aware without repeated full team-directory scans.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts:listActiveAgentRuns()
└── autobyteus-server-ts/src/run-history/services/run-ownership-resolution-service.ts:resolveOwnership(runId) [ASYNC]
    └── autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts:findManifestByMemberRunId(runId) [ASYNC]
        ├── [STATE] check indexed memberRunId -> manifest cache
        ├── [FALLBACK] if cache is not initialized -> build index from disk once [IO]
        └── return cached manifest or null
```

### Branching / Fallback Paths

```text
[FALLBACK] if the cache misses after a lazy index build
team-member-run-manifest-store.ts:findManifestByMemberRunId(runId)
└── return null without a second full-directory scan in the same lookup path
```

```text
[ERROR] if the manifest root directory cannot be read during index build
team-member-run-manifest-store.ts:rebuildMemberRunIndex()
└── log once and return an empty index so ownership resolution degrades safely
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-012 [Resolve Team-Member Historical Projection Through The Same Runtime-Aware History Source Without Probing Standalone Member Ids]

### Goal

Ensure team-member history rendering stays member-runtime aware and never falls back into standalone agent-run manifest probing for team-member ids.

### Preconditions

- A team run exists with member bindings persisted in team history.
- Frontend opens a team member from history or refreshes a persisted team projection.
- Member runtime may be native or external.

### Expected Outcome

- Team-member history queries resolve through one team-member history query service.
- The service uses the member binding runtime kind to choose the correct history source.
- No standalone `getRunResumeConfig(memberRunId)` probing occurs for team members.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts:openTeamRunFromHistory(teamRunId, selectedMemberName) [ASYNC]
└── [IO] Apollo query -> autobyteus-server-ts/src/api/graphql/types/team-run-history.ts:getTeamMemberRunProjection(teamRunId, memberName)
    └── autobyteus-server-ts/src/run-history/services/team-member-history-query-service.ts:getMemberProjection(teamRunId, memberName) [ASYNC]
        ├── autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:getMemberBinding(teamRunId, memberName) [IO]
        ├── autobyteus-server-ts/src/run-history/history-source/run-history-source-registry.ts:getSource(binding.runtimeKind) [STATE]
        └── autobyteus-server-ts/src/run-history/history-source/history-source-port.ts:getTeamMemberProjection({ teamRunId, memberName, binding }) [ASYNC]
            ├── [FALLBACK] runtime = autobyteus -> local-memory-history-source.ts:getTeamMemberProjection(...) [IO]
            ├── [FALLBACK] runtime = codex_app_server -> codex-thread-history-source.ts:getTeamMemberProjection(...) [ASYNC]
            └── [FALLBACK] runtime = claude_agent_sdk -> claude-session-history-source.ts:getTeamMemberProjection(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if local team memory is richer for a native team member
local-memory-history-source.ts:getTeamMemberProjection(...)
└── return richer native-team projection without consulting standalone agent-run history
```

```text
[ERROR] if the team member binding is missing
team-member-history-query-service.ts:getMemberProjection(teamRunId, memberName)
└── throw Error("TEAM_MEMBER_BINDING_NOT_FOUND")
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-007 [Continue Websocket Reconnect Attempts For An Already Selected Live Run During Backend Restart]

### Goal

Keep an already selected live agent/team context capable of reconnecting when the backend restarts for longer than a single reconnect interval.

### Preconditions

- A workspace page has an active agent/team websocket connection.
- Backend restarts and the first reconnect attempt may fail because the server is not yet back.

### Expected Outcome

- The websocket client schedules the next reconnect attempt after a failed reconnect close while the retry budget remains.
- Live context does not become permanently offline after a single failed reconnect close.

### Primary Runtime Call Stack

```text
[ENTRY] browser websocket close event during backend restart
└── autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts:setupEventListeners().ws.onclose(event)
    ├── [STATE] setState(DISCONNECTED)
    ├── emit('onDisconnect', ...)
    └── [FALLBACK] if autoReconnect && reconnectAttempts < maxReconnectAttempts
        └── autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts:scheduleReconnect() [ASYNC]
            └── setTimeout(... -> doConnect())
                └── autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts:doConnect()
                    ├── [STATE] setState(RECONNECTING)
                    └── new WebSocket(url)
```

### Branching / Fallback Paths

```text
[FALLBACK] if reconnect attempt closes before onopen
WebSocketClient.ts:setupEventListeners().ws.onclose(event)
└── scheduleReconnect() again while reconnectAttempts < maxReconnectAttempts
```

```text
[ERROR] if reconnect budget is exhausted
WebSocketClient.ts:scheduleReconnect()
└── emit('onError', Error('Max reconnection attempts reached'))
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-008 [Selecting A Member Row For An Already Subscribed Live Team Run Preserves The Live Context And Only Changes Focus]

### Goal

Keep live team state, status, and tool/activity context intact when the user switches between `Professor` and `Student` from the left tree while that team is already live in memory.

### Preconditions

- A team run is already opened in memory for `teamRunId`.
- The local team context is subscribed to the live websocket stream.
- The user clicks a member row for that same `teamRunId` in the left history tree.

### Expected Outcome

- The existing in-memory team context remains the active source of truth.
- The selected member changes, but the team is not reopened from persisted projection.
- Current live status, tool activity, and live conversation state are preserved.
- Non-live or unsubscribed team contexts still use the history-reopen path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onSelect(teamMemberRow)
└── autobyteus-web/stores/runHistoryStore.ts:selectTreeRun(row) [STATE]
    └── autobyteus-web/stores/runHistorySelectionActions.ts:selectTreeRunFromHistory(store, row)
        ├── [STATE] teamContextsStore.getTeamContextById(row.teamRunId)
        ├── [FALLBACK] if localTeamContext.isSubscribed === true
        │   ├── [STATE] teamContextsStore.setFocusedMember(row.memberRouteKey)
        │   ├── [STATE] selectionStore.selectRun(row.teamRunId, 'team')
        │   ├── [STATE] store.selectedTeamRunId = row.teamRunId
        │   ├── [STATE] store.selectedTeamMemberRouteKey = row.memberRouteKey
        │   └── [STATE] clear team/agent config panels without reopening history
        └── [FALLBACK] otherwise
            └── autobyteus-web/stores/runHistorySelectionActions.ts:openTeamMemberRunFromHistory(store, row.teamRunId, row.memberRouteKey) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if no local team context exists
runHistorySelectionActions.ts:selectTreeRunFromHistory(store, row)
└── openTeamMemberRunFromHistory(...) -> reopen from persisted projection
```

```text
[FALLBACK] if a local team context exists but is not subscribed/live
runHistorySelectionActions.ts:selectTreeRunFromHistory(store, row)
└── openTeamMemberRunFromHistory(...) -> refresh historical projection to avoid stale inactive state
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `N/A`

## Use Case: UC-005 [Dispatch Inbound Telegram Message To A Definition-Bound Team Binding With No Cached Run By Lazy-Creating The Run]

### Goal

Create the team run on the first inbound external message when the binding is definition-bound and has no cached run yet.

### Preconditions

- A `TEAM` binding exists with:
  - `teamDefinitionId`
  - `teamLaunchPreset`
  - `teamRunId = null`
- Team definition resolves successfully.

### Expected Outcome

- Runtime expands the launch preset into member configs.
- Runtime creates the team in native-team or member-runtime mode.
- New `teamRunId` is persisted back onto the binding.
- Inbound message is delivered to the newly created team run.
- Telegram still receives a single reply stream only.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:acceptInbound(...)
├── [IO] bindingService.resolveBinding(...)
├── autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope)
│   └── autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToTeam(binding, envelope) [ASYNC]
│       ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts:resolveOrStartTeamRun(binding, { initialSummary }) [ASYNC]
│       │   ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts:normalizeTeamLaunchTarget(binding) [STATE]
│       │   ├── autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts:ensureTeamRunFromDefinition(...) [ASYNC]
│       │   │   ├── team-run-launch-service.ts:buildMemberConfigsFromTeamLaunchPreset(...) [STATE]
│       │   │   │   └── team-run-launch-service.ts:collectLeafAgentMembers(teamDefinitionId) [IO]
│       │   │   ├── [FALLBACK] if runtime mode = native_team -> agent-team-run-manager.ts:createTeamRunWithId(...) [ASYNC]
│       │   │   ├── [FALLBACK] if runtime mode = member_runtime -> team-member-runtime-orchestrator.ts:createMemberRuntimeSessions(...) [ASYNC]
│       │   │   └── [IO] team-run-history-service.ts:upsertTeamRunHistoryRow(...) # persist manifest
│       │   └── [IO] bindingService.upsertBindingTeamRunId(binding.id, teamRunId)
│       ├── default-channel-runtime-facade.ts:buildAgentInputMessage(envelope) [STATE]
│       └── team-run-continuation-service.ts:continueTeamRunWithMessage(teamRunId, message, ...) [ASYNC]
├── [IO] channel-message-receipt-service.ts:recordReceipt(...)
└── outbound reply path remains agent-run based and single-stream
```

### Branching / Fallback Paths

```text
[FALLBACK] if cached teamRunId is blank or reset
channel-binding-runtime-launcher.ts:resolveOrStartTeamRun(binding, ...)
└── create fresh team run from definition and preset
```

```text
[ERROR] if recursive member-config expansion hits an invalid team definition
team-run-launch-service.ts:collectLeafAgentMembers(teamDefinitionId)
└── throw deterministic launch error and abort dispatch
```

```text
[ERROR] if new team run cannot be persisted back onto the binding
bindingService.upsertBindingTeamRunId(binding.id, teamRunId)
└── fail the dispatch so runtime cache state does not silently diverge
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 [Reset Or Replace Stale Cached Team Run State When The Binding Configuration Changes Or The Cached Run Is Inactive Or Unusable]

### Goal

Ensure cached team-run state never points at the wrong definition or launch configuration.

### Preconditions

- Existing `TEAM` binding already has:
  - `teamDefinitionId`
  - `teamLaunchPreset`
  - cached `teamRunId`
- User updates the team definition or launch preset, or dispatch later discovers the cached run is inactive or no longer resolvable.

### Expected Outcome

- On binding update, persistence clears incompatible cached `teamRunId`.
- On dispatch, an inactive or unusable cached run falls back to lazy-create rather than reusing invalid state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts:upsertExternalChannelBinding(input)
└── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBinding(...) [IO]
    └── autobyteus-server-ts/src/external-channel/providers/*channel-binding-provider.ts:upsertBinding(input)
        ├── compare current.teamDefinitionId vs input.teamDefinitionId [STATE]
        ├── compare current.teamLaunchPreset vs input.teamLaunchPreset [STATE]
        └── [FALLBACK] if either changed -> persist teamRunId = null
```

### Branching / Fallback Paths

```text
[FALLBACK] if cached teamRunId still matches current binding config
providers/*channel-binding-provider.ts:upsertBinding(input)
└── preserve existing cached teamRunId
```

```text
[FALLBACK] if cached teamRunId later resolves inactive or fails runtime resolution
channel-binding-runtime-launcher.ts:resolveOrStartTeamRun(binding, ...)
└── ignore stale cache and create a fresh run from definition + preset
```

```text
[ERROR] if a binding somehow reaches dispatch without teamDefinitionId or teamLaunchPreset
channel-binding-runtime-launcher.ts:normalizeTeamLaunchTarget(binding)
└── throw deterministic configuration error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-022 [Re-Resolve An Ordinary Filesystem Workspace After Backend Restart From Stable Workspace Identity Instead Of A Stale Runtime-Local Handle]

### Goal

Ensure backend restart does not break file-explorer or workspace-bound reconnect behavior for ordinary filesystem workspaces that still exist on disk.

### Preconditions

- Frontend persists or reuses a workspace identity for an ordinary filesystem workspace.
- Backend process restarts.
- The same workspace root path still exists.

### Expected Outcome

- The stored workspace identity remains valid after restart.
- Backend resolves the workspace from its deterministic identity derived from normalized `rootPath`.
- File-explorer reconnect succeeds without `workspace not found` rejection for ordinary filesystem workspaces.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts:connect(workspaceId)
└── [IO] websocket -> autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts:connect(connection, workspaceId)
    └── autobyteus-server-ts/src/workspaces/workspace-manager.ts:getOrCreateWorkspace(workspaceId)
        ├── [FALLBACK] if activeWorkspaces already has workspaceId -> return cached live workspace
        └── [FALLBACK] if workspaceId is a deterministic filesystem workspace id
            ├── autobyteus-server-ts/src/workspaces/workspace-identity.ts:decodeFilesystemWorkspaceRootPath(workspaceId) [STATE]
            └── autobyteus-server-ts/src/workspaces/workspace-manager.ts:ensureWorkspaceByRootPath(rootPath)
                ├── autobyteus-server-ts/src/workspaces/workspace-manager.ts:createWorkspace(config)
                ├── autobyteus-server-ts/src/workspaces/filesystem-workspace.ts:constructor(config)
                │   └── autobyteus-server-ts/src/workspaces/workspace-identity.ts:buildFilesystemWorkspaceId(rootPath) [STATE]
                └── return re-resolved live workspace
```

### Branching / Fallback Paths

```text
[FALLBACK] if workspaceId belongs to a temp or skill workspace
workspace-manager.ts:getOrCreateWorkspace(workspaceId)
└── preserve existing stable synthetic-id handling
```

```text
[ERROR] if workspaceId is not decodable and is not a supported synthetic workspace id
workspace-manager.ts:getOrCreateWorkspace(workspaceId)
└── throw deterministic "Workspace '<id>' not found" error
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`
