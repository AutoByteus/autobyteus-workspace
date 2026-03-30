# Investigation Notes

- Ticket: `runtime-domain-subject-refactor`
- Last Updated: `2026-03-16`
- Scope Triage: `Large`

## Questions

1. What architectural property makes the native runtime easier to reason about than Codex and Claude?
2. Do Codex and Claude use `AgentRunManager`, or do they build runs differently?
3. What domain subject is missing from the Codex and Claude runtime paths?
4. Where should runtime event normalization live after the refactor?

## Findings

### 1. Native runtime is centered around explicit domain subjects

- Native runtime behavior is organized around `AgentConfig`, `Agent`, `AgentTeam`, and native event streams.
- Processors and runtime steps are clearly subordinate to those subjects.
- This creates a clear ownership boundary for inputs, outputs, status, and event flow.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/context/agent-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/agent.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/agent-team.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-event-stream.ts`

### 2. Codex and Claude do not use `AgentRunManager` for runtime lifecycle

- Run creation commonly enters through `RuntimeCompositionService`.
- Only the native adapter delegates to `AgentRunManager`.
- Codex and Claude adapters create runtime sessions directly through their runtime services.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`

### 3. Codex and Claude still use `AgentDefinition`, but only as runtime context input

- Both external runtimes accept `agentDefinitionId`.
- They resolve instructions and configured skills through `resolveSingleAgentRuntimeContext(...)`.
- That context is converted into runtime metadata and skill exposure, not into a first-class `AgentRun` object.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-definition/domain/models.ts`

### 4. The current Codex and Claude run concept is implicit rather than embodied

- The effective run concept is distributed across:
  - runtime composition
  - runtime session store
  - command ingress
  - runtime adapter
  - runtime service
  - runtime event mapping
  - stream handlers
- This means the system has an operational run identity but not a first-class runtime domain subject.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-session-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`

### 5. Team member runtime mode amplifies the same architectural gap

- Member-runtime teams are reconstructed through orchestrator, binding registry, relay service, and event bridge instead of one first-class `TeamRun` subject.
- This makes team routing and external callback behavior harder to localize conceptually.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`

### 6. `AgentRunManager` is now close to the intended runtime-neutral seam, but `AgentTeamRunManager` is not there yet

- `AgentRunManager` no longer compiles native `AgentDefinition` input itself.
- Native create / restore now live under `AutoByteusAgentRunBackendFactory`, while Codex and Claude create / restore live under their own backend factories.
- `AgentRunManager` now owns one unified `Map<string, AgentRun>` active-run registry and creates `AgentRun` for native, Codex, and Claude through backend factories.
- That means the single-agent manager is now much closer to the intended runtime-neutral `AgentRunManager -> AgentRun -> backend` shape.
- `AgentTeamRunManager` is still less complete than the single-agent side; the team path still leaks backend execution shape above the manager boundary.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`

### 7. The frontend already consumes one normalized event language, but the event contract is still not fully domain-shaped

- Native single-agent runs still originate from native `StreamEvent` values under `AutoByteusAgentRunBackend`.
- Codex and Claude single-agent runs now subscribe through `AgentRun.subscribeToEvents(...)` as well; `AgentStreamHandler` no longer needs runtime-adapter subscription or manager-level native event-stream escape hatches for the active websocket path.
- Member-backed teams still repeat the older pattern through `TeamRuntimeEventBridge`, which subscribes to each member runtime, maps each raw runtime event, and then adds member identity for the frontend.
- So single-agent ingress is now closer to the right `AgentRun` boundary, but the emitted event vocabulary is still partly transport-shaped and the team side still uses a higher raw-runtime bridge.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`

### 8. The runtime adapter raw-event contract is now a compatibility layer, not the primary single-agent path

- `RuntimeAdapter.subscribeToRunEvents(...)` still exposes `event: unknown`.
- `RuntimeAdapter.interpretRuntimeEvent(...)` still works on raw provider-specific events.
- But single-agent websocket ingress no longer depends on that contract as its primary path; it now listens through `AgentRun.subscribeToEvents(...)`.
- So the remaining problem is narrower now: raw runtime-event contracts still survive in compatibility surfaces and the team/member bridge, and those should continue moving below `AgentRun` / `TeamRun`.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`

### 9. The current frontend contract is transport-normalized and runtime-unaware

- The frontend consumes one websocket protocol defined by `ServerMessageType`.
- `AgentStreamingService` and `TeamStreamingService` dispatch by normalized message type and do not branch by runtime kind.
- This confirms that the existing product/UI boundary is already runtime-unaware.
- It also means the refactor should preserve this contract rather than introducing runtime-specific frontend behavior.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web/services/agentStreaming/TeamStreamingService.ts`

### 10. The current websocket subscription model is already run/team scoped

- `AgentStreamHandler.connect(...)` creates one websocket session bound to one `agentRunId`.
- `AgentTeamStreamHandler.connect(...)` creates one websocket session bound to one `teamRunId`.
- The broadcaster layer can fan one run/team stream out to multiple websocket sessions for the same run/team.
- This is another signal that the run/team subject is the correct ownership boundary; the current transport model already assumes that shape.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-stream-broadcaster.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-stream-broadcaster.ts`

### 11. Working event-direction recommendation

- `AgentRun` should emit one normalized run-domain event language.
- `TeamRun` should emit one normalized team-domain event language.
- This normalized event language is the runtime-unaware contract that the frontend and other consumers should depend on.
- Runtime-specific backends should adapt native/Codex/Claude internal events into that normalized event language internally.
- Websocket/frontend mapping should stay one layer above that and continue converting normalized run-domain events into `ServerMessage`.
- External-channel callback publishing and run-history ingestion should subscribe to the same normalized run-domain events rather than re-subscribing to raw runtime events separately.

Important clarification:

- The target is not “reuse native event objects for every runtime.”
- The target is “emit one normalized event language from `AgentRun` / `TeamRun`, regardless of runtime.”
- Native runtime is only one backend implementation behind that boundary.
- The existing websocket `ServerMessage` protocol proves that a normalized runtime-unaware language already exists at the transport edge.
- The design question is whether `AgentRun` / `TeamRun` should emit that exact shape or emit a closely related domain event shape one layer below it.

Practical migration recommendation:

- Phase 1: keep the existing frontend websocket protocol unchanged.
- Phase 1 normalized event target:
  - `AgentRun` emits a runtime-neutral normalized event contract that preserves the current frontend/runtime-unaware behavior.
  - `TeamRun` emits a runtime-neutral normalized team event contract that preserves the current frontend/runtime-unaware behavior.
- Runtime backends then translate:
  - `AutoByteusAgentRunBackend` -> native internal events to normalized run-domain events
  - `CodexAgentRunBackend` -> raw runtime events to normalized run-domain events
  - `ClaudeAgentRunBackend` -> raw runtime events to normalized run-domain events
- After that, `RuntimeEventMessageMapper` becomes a transport mapper, not the place where Codex and Claude first become domain-shaped.

### 12. Current best boundary distinction: domain event vs transport message

- The current websocket `ServerMessage` type is transport-specific:
  - it includes serialization concerns (`toJson()`)
  - it includes connection lifecycle such as `CONNECTED`
- Because of that, the cleanest long-term shape is probably:
  - normalized domain events emitted by `AgentRun` / `TeamRun`
  - websocket `ServerMessage` derived from those domain events
- However, to reduce migration risk, the first refactor slice can keep the normalized domain event vocabulary closely aligned with the existing `ServerMessageType` vocabulary.
- In short:
  - preserve the existing normalized language
  - move ownership of normalization down to the run subjects
  - keep websocket serialization one layer above the run subjects

### 13. Status ownership also becomes cleaner with `AgentRun` / `TeamRun`

- Native runtime status is relatively simple because status is already close to the native run objects:
  - native agents expose `currentStatus`
  - native team runs expose `currentStatus`
  - native event streams already emit status updates from the run context/status manager path
- Codex and Claude single-run status is less explicit:
  - runtime services keep session-local `currentStatus`
  - adapters expose `getRunStatus(...)`
  - stream handlers and frontend normalization then consume the resulting status messages
- Member-runtime team status is even more reconstructed:
  - `TeamRuntimeEventBridge` reads member status through `adapter.getRunStatus(...)`
  - team status is derived from member statuses with `deriveTeamStatus(...)`
  - `TeamRuntimeStatusSnapshotService` then converts that into initial `TEAM_STATUS` and `AGENT_STATUS` messages

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-event-stream.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`

Working recommendation:

- `AgentRun` should own current normalized status.
- `TeamRun` should own current normalized team status plus member-visible status.
- Each backend updates run status while adapting runtime-specific events into normalized run-domain events.
- Consumers should read current status and subscribe to status-change events from the run subject itself rather than reconstructing status from multiple side channels.
- Team aggregate status derivation should move inside `TeamRun`, not remain in bridge/snapshot helper layers.

### 14. Current convergence point for the target design

- Keep the frontend unchanged in principle:
  - agent UI still opens `/ws/agent/<runId>`
  - team UI still opens `/ws/agent-team/<teamRunId>`
  - frontend remains runtime-unaware
- Keep run/team-scoped websocket subscriptions:
  - one websocket session subscribes to one run or one team run
  - multiple websocket sessions may still subscribe to the same run/team through the broadcaster layer
- Move normalization and status ownership into the run subjects:
  - `AgentRun` / `TeamRun` present normalized status and normalized event streams
  - backends adapt internal runtime/provider events before they cross the run boundary
- Preserve the current normalized frontend event language as the initial outward contract:
  - do not require frontend changes for the first refactor slice
  - use the new run/team subjects to make the existing contract easier to own and reason about

### 15. Historical interpretation: the normalized event language is effectively native-first

- The current frontend streaming contract and much of the surrounding architecture were shaped originally around the native AutoByteus runtime.
- Later, when Codex and Claude Agent SDK were introduced, their runtime events were adapted into the same general event language instead of redefining the frontend around runtime-specific protocols.
- That means the current shared event vocabulary is already very close to the native runtime’s conceptual model.
- This is why Codex/Claude behavior often feels like “converted into our own runtime events” in practice, even when the current implementation performs the conversion at the streaming/mapper layer rather than at a first-class `AgentRun` boundary.

Design consequence:

- The refactor should not fight this history.
- It should formalize it.
- In other words, keep the shared normalized event language, but move the ownership of that normalization from scattered mapper/bridge layers into `AgentRun` / `TeamRun` plus their runtime backends.

### 16. Team runs should preserve one team-scoped stream even for Codex and Claude backends

- Native teams already use one team-scoped stream per `teamRunId`.
- That stream carries rebroadcast member-agent events plus team-specific events in one place:
  - `TEAM`
  - `AGENT`
  - `SUB_TEAM`
  - `TASK_PLAN`
- The websocket remains bound to the team run, not to each internal member separately.
- The current member-runtime implementation for Codex/Claude already approximates this by subscribing to member runtimes internally and republishing them through one team websocket path.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-stream-events.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-event-stream.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`

Design carry-forward:

- `TeamRun` should remain the sole outward event/status boundary for a team run.
- Internal member runtimes for Codex/Claude should feed into `TeamRun` internally.
- The frontend should continue to consume one websocket stream for the team run rather than opening one websocket per member runtime.

### 17. Current native single-agent data flow is already close to the target shape

Current create/send path for a native agent run:

1. GraphQL `sendAgentUserInput(...)` receives runtime-unaware input plus optional `runtimeKind`.
2. If no existing `agentRunId` is provided, GraphQL calls `RuntimeCompositionService.createAgentRun(...)`.
3. `RuntimeCompositionService` resolves the runtime adapter for `autobyteus`.
4. `AutobyteusRuntimeAdapter.createAgentRun(...)` delegates to `AgentRunManager.createAgentRun(...)`.
5. `AgentRunManager`:
   - resolves `AgentDefinition`
   - builds native `AgentConfig`
   - creates the native agent through the native factory
   - starts the agent
   - waits for idle
   - returns the resulting `agentId` as `runId`
6. GraphQL binds the returned session through `RuntimeCommandIngressService.bindRunSession(...)`.
7. GraphQL converts user input into `AgentInputUserMessage`.
8. GraphQL calls `RuntimeCommandIngressService.sendTurn(...)`.
9. For native runtime, `AutobyteusRuntimeAdapter.sendTurn(...)` resolves the live native agent from `AgentRunManager.getAgentRun(...)` and calls `agent.postUserMessage(...)`.

Current native event-stream path:

1. Frontend opens `/ws/agent/<runId>`.
2. `AgentStreamHandler.connect(...)` first checks `AgentRunManager.getAgentRun(runId)`.
3. For native runs, it starts `streamLoop(...)`.
4. `streamLoop(...)` asks `AgentRunManager.getAgentEventStream(runId)` for a native `AgentEventStream`.
5. `AgentEventStream` subscribes to the native agent status/event notifier and emits typed native `StreamEvent` values.
6. `AgentStreamHandler.streamLoop(...)` iterates `stream.allEvents()`.
7. Each native event is:
   - persisted to run history
   - converted to normalized websocket message form
   - sent to the websocket

Interpretation:

- Native runtime already behaves like:
  - one run object
  - one outward event stream
  - one websocket subscription consuming that stream
- The current refactor goal for Codex and Claude is essentially to make them follow this same outward execution model through `AgentRun`, while keeping their backend internals runtime-specific.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`

### 18. GraphQL is already runtime-unaware, but the server path still detours through session-centric services

- `sendAgentUserInput(...)` already accepts runtime-neutral creation input:
  - `agentDefinitionId`
  - `llmModelIdentifier`
  - `workspaceId`
  - `autoExecuteTools`
  - optional `runtimeKind`
- The GraphQL layer does not contain runtime-specific branching logic.
- The mismatch happens after that:
  - GraphQL calls `RuntimeCompositionService.createAgentRun(...)`
  - then binds the returned `RuntimeSessionRecord`
  - then routes commands through `RuntimeCommandIngressService`
- This confirms that the public API boundary is already in the right shape conceptually, but the server-side runtime boundary is still session-centric instead of run-centric.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`

### 19. The current adapter registry is thin enough to survive as internal backend-selection infrastructure

- `RuntimeAdapterRegistry` currently does one thing: map `runtimeKind` to a `RuntimeAdapter`.
- That means the registry idea itself is not the problem.
- The problem is that the registry currently feeds public services with session-centric names and contracts:
  - `RuntimeCompositionService`
  - `RuntimeCommandIngressService`
- This suggests a pragmatic migration path:
  - keep the registry concept internally in the first slice
  - move it under `AgentRunManager` / `AgentTeamRunManager`
  - let managers use it only to choose the backend implementation/factory
- Naming can then be decided separately:
  - keep `RuntimeAdapterRegistry` temporarily if that reduces churn
  - or rename it later to `RuntimeBackendRegistry` once the new backend SPI is stable

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`

### 20. Active runtime snapshots are still assembled from multiple architectural centers

- `ActiveRuntimeSnapshotService` already treats active runs and active team runs as first-class UI concepts.
- But its implementation is still fragmented:
  - native single-run snapshots come from `AgentRunManager`
  - native team snapshots come from `AgentTeamRunManager`
  - member-runtime team presence comes from `TeamMemberManager`
  - team status comes from `TeamRuntimeStatusSnapshotService`
  - team display metadata can come from `TeamRunHistoryService`
  - team-member filtering for single-agent lists now uses `TeamMemberManager.resolveMemberRunBinding(...)` plus live agent-context hints
- This confirms that the active runtime snapshot layer is another place where the missing `TeamRun` domain subject shows up as reconstruction work.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts`

### 21. Continuation and resume paths are cleaner now on single-run, but team is still old-shaped

- `RunContinuationService` now uses:
  - `AgentRunManager` for active/create
  - `AgentRunRestoreService` for inactive restore
  - `AgentRunMetadataService` as the top-level persisted metadata layer
- `TeamRunContinuationService` still depends on:
  - `AgentTeamRunManager` for native teams
  - `TeamMemberRuntimeOrchestrator` for member-runtime teams
  - `TeamRunHistoryService` manifests to decide how to restore
- This means single-run continuation/resume is now substantially closer to the target architecture, while team continuation/resume is still the main old-shaped area.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`

### 22. Run history and projection already form a distinct persisted layer that should stay separate from live run ownership

- Single-run history already has a clean persisted model:
  - `RunManifest`
  - `RunHistoryIndexRow`
  - `RunProjectionService`
- Team history already has the equivalent persisted model:
  - `TeamRunManifest`
  - `TeamRunIndexRow`
  - member bindings and member runtime references
- Projection providers are already runtime-specific and selected from a provider registry using persisted manifest/runtime-reference data.
- This is a good sign: the history/projection layer should stay as the persisted/read-model side of the architecture, while live `AgentRun` / `TeamRun` objects should own only active execution state.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/domain/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/domain/team-models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-history-index-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/projection/run-projection-provider-port.ts`

### 23. `ActiveRuntimeSnapshotService` is best understood as a read-side aggregation workaround, not a core runtime domain service

- The service answers a real product/API question: “what active runs and active team runs should the UI show right now?”
- That is why it exists.
- But it currently answers that question by aggregating across several different architectural centers:
  - `AgentRunManager`
  - `AgentTeamRunManager`
  - `TeamMemberRuntimeOrchestrator`
  - `TeamRuntimeStatusSnapshotService`
  - `TeamRunHistoryService`
  - live team-member binding/context hints
- This means it is not the owner of active runtime state.
- It is a read-side adapter compensating for the fact that live runtime ownership is currently fragmented.

Design implication:

- In the target architecture, this service can still exist if useful for GraphQL/read-model shaping.
- But it should become thin.
- It should read snapshot views from manager-owned `AgentRun` / `TeamRun` objects rather than reconstructing active state itself.

Broader service-design implication:

- Services whose names match real business capabilities can survive:
  - `AgentRunManager`
  - `AgentTeamRunManager`
  - `RunHistoryIndexService`
  - `RunContinuationService`
  - `TeamRunContinuationService`
- Services whose names mainly describe current technical workaround layers should likely shrink, move down, or disappear.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`

### 24. Current single-run runtime services are already the natural core of the future single-run backends

- `CodexAppServerRuntimeService` already owns exactly the kind of internal state a `CodexAgentRunBackend` should own:
  - one run-scoped session map entry
  - current status
  - runtime reference (`threadId`)
  - raw event subscription
  - tool approval
  - turn interruption/termination
- `ClaudeAgentSdkRuntimeService` plays the same role for Claude:
  - one run-scoped session entry
  - current status and active turn state
  - runtime reference (`sessionId`)
  - raw event subscription
  - tool approval/interruption/termination
- This means those services should probably stay as low-level runtime engines, while the new single-run backends wrap them and add normalized run semantics.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`

### 25. Current member-runtime team services are already the natural precursor of shared internal team-backend machinery

- The current team member runtime path is split across:
  - `TeamMemberManager`
  - `TeamRuntimeBindingRegistry`
  - `TeamMemberRuntimeRelayService`
  - `TeamRuntimeEventBridge`
  - `TeamRuntimeStatusSnapshotService`
- Those pieces together already describe one coherent internal object:
  - create/restore member runtime sessions
  - own team/member bindings
  - route messages and approvals to members
  - relay inter-agent messages
  - multiplex member events into one team-facing stream
  - derive team/member status
- That strongly suggests the target team backend design should keep team-oriented top-level backend names:
  - `AutoByteusTeamRunBackend`
  - `CodexTeamRunBackend`
  - `ClaudeTeamRunBackend`
- Codex and Claude team backends can still share one internal member-runtime team core/helper for:
  - member binding ownership
  - member routing
  - inter-agent relay
  - event multiplexing
  - team/member status aggregation
- This keeps the public backend model team-oriented while still avoiding duplicated member-runtime team logic underneath.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`

### 26. History and continuation are still split by runtime/session shape today, which is another signal that the run boundary is too low

- `RunHistoryIndexService` currently has two different live-ingestion paths:
  - native: `onAgentEvent(runId, StreamEvent)`
  - external runtime: `onRuntimeEvent(runId, rawEvent)` plus runtime-kind lookup through `RuntimeSessionStore` and adapter interpretation through `RuntimeAdapterRegistry`
- `TeamRunHistoryService` already has a cleaner persisted-team role, but active team ownership is still split between native team manager state and member-runtime orchestrator state.
- `RunContinuationService` still branches across:
  - active native agent path
  - active runtime-session path
  - inactive restore path through `RuntimeCompositionService`
  - command dispatch through `RuntimeCommandIngressService`
- `TeamRunContinuationService` still branches above the team boundary between:
  - native team restore through `AgentTeamRunManager`
  - member-runtime restore through `TeamMemberRuntimeOrchestrator`
- This split strongly supports the design decision that history and continuation should move up to the `AgentRun` / `TeamRun` boundary:
  - one normalized `AgentRunEvent` ingestion path for run history
  - one normalized `TeamRunEvent` ingestion path for team history
  - continuation services become thin facades over `AgentRunManager` / `AgentTeamRunManager`
  - member-runtime restore belongs inside `CodexTeamRunBackend` / `ClaudeTeamRunBackend`, not inside continuation services

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-history-index-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`

### 27. The existing websocket message vocabulary is already the right first-slice target for run-domain event naming

- `ServerMessageType` already defines the normalized runtime-unaware language the frontend consumes:
  - segment events
  - agent/team status
  - tool approval and execution lifecycle
  - todo/task-plan updates
  - assistant completion
  - inter-agent message
  - artifact updates
  - error
- This means the first `AgentRunEvent` / `TeamRunEvent` design does not need a brand-new vocabulary.
- The clean move is:
  - keep the run-domain event vocabulary very close to `ServerMessageType`
  - treat websocket connection concerns such as `CONNECTED` as transport-only
  - treat integration echoes such as `EXTERNAL_USER_MESSAGE` as transport/integration behavior rather than core runtime-domain events
- This supports the design choice that backends should normalize into `AgentRunEvent` / `TeamRunEvent`, and websocket handlers should only do a thin final mapping to `ServerMessage`.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`

### 28. Codex already has the exact engine/backend seam we need; the current adapter is just using it at the wrong boundary

- `CodexAppServerRuntimeService` already behaves like a low-level runtime engine:
  - it owns the session map keyed by `runId`
  - it owns startup gating, approval records, `threadId`, `activeTurnId`, and `currentStatus`
  - it emits raw `CodexRuntimeEvent`
  - it exposes command methods such as `sendTurn`, `approveTool`, `interruptRun`, and `terminateRun`
- `CodexAppServerRuntimeAdapter` is currently doing two distinct jobs at once:
  - runtime create/restore/send plumbing
  - partial event/status/runtime-reference interpretation for the rest of the system
- `RuntimeCommandIngressService` then adds another layer above that by looking up `RuntimeSessionStore` and forwarding commands again.
- This strongly supports the target shape:
  - keep `CodexAppServerRuntimeService` as the engine
  - replace the adapter/ingress/session-store stack above it with `CodexAgentRunBackend`
  - let `CodexAgentRunBackend` own:
    - runtime-neutral create/restore translation
    - normalized runtime reference construction
    - normalized `AgentRunEvent` emission
    - mirrored status/runtime-reference cache for one run
- One important lifecycle implication emerged from this read:
  - backend factories should decide launch mode (`new` vs `restore`)
  - the backend itself should then expose one `start()` lifecycle
  - that is cleaner than letting both the factory and the backend expose separate create/restore concepts

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-event-router.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`

### 29. Claude has the same engine/backend seam as Codex, but with one important difference: normalized status should likely be backend-owned

- `ClaudeAgentSdkRuntimeService` is also already a low-level runtime engine:
  - it owns the session map keyed by `runId`
  - it owns Claude SDK session/control handles
  - it owns transcript-store coordination
  - it owns turn scheduling and tooling approval coordination
  - it emits raw `ClaudeRuntimeEvent`
  - it exposes command methods such as `sendTurn`, `approveTool`, `interruptRun`, and `terminateRun`
- `ClaudeAgentSdkRuntimeAdapter` is currently doing the same double-duty as the Codex adapter:
  - runtime create/restore/send plumbing
  - partial event/status/runtime-reference interpretation for the rest of the system
- But unlike Codex, the Claude engine does not currently expose a simple `getRunStatus(runId)` surface.
- That means the future `ClaudeAgentRunBackend` should still sit above the engine in the same way as Codex, but its normalized status cache should likely be derived primarily from runtime events plus command lifecycle rather than mirrored from one engine getter.
- Another important Claude-specific behavior:
  - the effective `sessionId` can be adopted/refreshed during runtime
  - so runtime-reference refresh must be treated as part of normal backend event handling, not only as a create/restore-time concern

Design implications:

- keep `ClaudeAgentSdkRuntimeService` as the engine
- replace the adapter/ingress/session-store stack above it with `ClaudeAgentRunBackend`
- let `ClaudeAgentRunBackend` own:
  - runtime-neutral create/restore translation
  - normalized runtime reference construction
  - normalized `AgentRunEvent` emission
  - mirrored/derived normalized status cache for one run
- the generic `AgentRunBackend` contract should therefore require:
  - `getCurrentStatus()`
  - but should not assume every runtime engine exposes status in the same way internally

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-service-support.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-management/runtime-client/claude-runtime-client-module.ts`

### 30. Native team runtime already has the correct outward stream model

- `AgentTeamEventStream` is already one stream per `teamId`.
- Native `AgentTeamStreamEvent` already carries the source semantics the outward team model needs:
  - `TEAM`
  - `AGENT`
  - `SUB_TEAM`
  - `TASK_PLAN`
- `AgentTeamStreamHandler.convertTeamEvent(...)` already proves the intended outward rule:
  - one team-scoped stream
  - member events rebroadcast inside that stream
  - no separate outward websocket per member

Design implication:

- `TeamRunEvent` should preserve these source semantics explicitly.
- `AutoByteusTeamRunBackend` should normalize from this native stream directly.
- Codex and Claude team backends should synthesize the same outward team-scoped model even if they are internally member-runtime based.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-event-stream.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-stream-events.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

### 31. The current member-runtime team architecture branches above the team boundary

- `TeamRunLaunchService` decides `native_team` vs `member_runtime` before a first-class `TeamRun` exists.
- `TeamRunMutationService` repeats that branching and coordinates creation, continuation, and termination across multiple services.
- `AgentTeamStreamHandler` also branches:
  - native team path -> native `AgentTeamEventStream`
  - member-runtime path -> `TeamRuntimeEventBridge` plus `TeamRuntimeStatusSnapshotService`

Design implication:

- runtime-mode choice should move under `AgentTeamRunManager` and the team backend factory
- `TeamRun` should be the only public boundary for create, restore, stream, and command flow

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

### 32. `TeamRuntimeBindingRegistry` already holds the right team identity model, but at the wrong architectural level

- The registry already owns:
  - `teamRunId`
  - runtime mode
  - coordinator-member route key
  - member bindings
  - lookup by member run id
  - member resolution by route key or member name
- This is effectively core `TeamRun` state, but it currently lives as a separate global service.

Design implication:

- Codex and Claude team backends should internalize this state directly, or behind one private shared member-runtime team core
- the registry should not remain a peer top-level concept once `TeamRun` exists

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`

### 33. `TeamMemberManager` already performs most of the future team-backend create/restore translation

- It already resolves team/member instruction metadata and team-manifest metadata.
- It already builds runtime-reference metadata for member sessions.
- It already creates or restores member runtimes by calling `RuntimeCompositionService.restoreAgentRun(...)`.
- It already refreshes member runtime references back into the binding state after command results and restore.

Design implication:

- this logic should move under `CodexTeamRunBackend` and `ClaudeTeamRunBackend`
- the create/restore calls should switch from `RuntimeCompositionService` to the new single-run backend factory / manager boundary
- the runtime-reference refresh behavior belongs to the team backend manifest-view update path

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/domain/team-models.ts`

### 34. `TeamRuntimeEventBridge` and `TeamRuntimeStatusSnapshotService` reconstruct team behavior too late

- `TeamRuntimeEventBridge` subscribes to each member runtime through the runtime adapter layer and maps raw runtime events to websocket `ServerMessage`.
- `TeamRuntimeStatusSnapshotService` then separately reconstructs initial team/member statuses from the bridge or native team object.
- That means team event multiplexing and team status aggregation still happen in the transport layer rather than in a first-class team runtime subject.

Design implication:

- team event multiplexing must move into `CodexTeamRunBackend` / `ClaudeTeamRunBackend`
- team/member status aggregation must move into `TeamRun` / `TeamRunBackend`
- websocket handlers should only consume normalized `TeamRunEvent`, not raw member-runtime subscriptions

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`

### 35. Inter-agent relay and coordinator-only external callback propagation already belong to the team-backend responsibility set

- `TeamMemberRuntimeRelayService` already does the team-specific work of:
  - resolving sender member binding
  - resolving recipient member binding
  - delivering inter-agent messages
  - propagating external callback linkage only when the recipient is the coordinator
- `TeamMemberRuntimeOrchestrator` already delegates send, approval, relay, and terminate behavior across lifecycle and relay helpers.

Design implication:

- relay routing should move under the team backend or its private shared core
- coordinator-only external callback propagation should remain, but as an internal team-backend policy rather than a separate architecture concept
- approval routing should use team-owned member/invocation state, not transport-layer branching

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`

### 36. Team history and continuation already expose the right business surfaces, but still depend on native-vs-member-runtime branching

- `TeamRunHistoryService` currently determines active state by consulting both:
  - `AgentTeamRunManager`
  - `TeamMemberRuntimeOrchestrator`
- `TeamRunContinuationService` currently restores:
  - native teams through `AgentTeamRunManager`
  - member-runtime teams through `TeamMemberRuntimeOrchestrator`
- Those are the right business surfaces, but the branching still lives above the team subject boundary.

Design implication:

- keep `TeamRunHistoryService` and `TeamRunContinuationService`
- make them depend only on `AgentTeamRunManager` / `TeamRun`
- remove direct dependency on orchestrator-specific restore/active-state logic from those services

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`

### 37. `TeamRunManifest` already contains enough information to restore team backends without a session store

- `TeamRunManifest` already persists:
  - `teamRunId`
  - `teamDefinitionId`
  - `teamDefinitionName`
  - `workspaceRootPath`
  - `coordinatorMemberRouteKey`
  - `memberBindings`
- each `TeamRunMemberBinding` already persists:
  - `memberRouteKey`
  - `memberName`
  - `memberRunId`
  - `runtimeKind`
  - `runtimeReference`
  - agent/model/tool/workspace configuration

Design implication:

- team backend restore should use `TeamRunManifest` directly
- no top-level `RuntimeSessionStore` equivalent is needed for team runs once `TeamRun` becomes the live execution subject

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/domain/team-models.ts`

### 38. The native AutoByteus runtime tail is `Agent -> AgentRuntime -> provider integrations`, not `service -> client -> process`

- `AgentRunManager` creates a native `Agent`.
- `Agent` is a facade over `AgentRuntime`.
- `AgentRuntime` owns the worker loop, event submission, status manager, and event handlers.
- The actual provider-facing execution happens underneath that runtime through configured LLM and tool implementations.

Design implication:

- the native spine after `AutoByteusAgentRunBackend` should be described concretely as:
  - native `Agent`
  - `AgentRuntime` / `AgentWorker`
  - LLM/tool providers
- it should not be forced into the same `engine -> client -> provider process` wording as Codex

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/agent.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/runtime/agent-runtime.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/llm/llm-factory.ts`

### 39. Codex has the clearest explicit `engine -> client -> provider runtime` split

- `CodexThreadManager` now owns the live thread registry, event subscription entrypoint, and thread-scoped command delegation.
- `CodexAppServerClient` is the concrete low-level JSON-RPC client to the app-server process.
- `bootstrapCodexThread(...)` shows that the real provider runtime tail is a spawned Codex app-server session/thread driven through that client.

Design implication:

- the Codex spine should be named explicitly as:
  - `CodexAgentRunBackend`
  - `CodexThreadManager`
  - `CodexThread`
  - `CodexAppServerClient`
  - Codex app-server process / thread runtime

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-client.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-bootstrap.ts`

### 40. Claude has an `engine -> SDK session handles -> provider runtime` split, not a Codex-style client/process split

- `ClaudeAgentSdkRuntimeService` owns run/session state, transcript store, turn scheduler, tooling coordinator, and event emission.
- The concrete low-level handles are the Claude V2 session/control objects:
  - `ClaudeV2SessionLike`
  - `ClaudeV2SessionControlLike`
- The actual provider runtime tail is the Claude Agent SDK / Claude Code session that those handles create or resume.

Design implication:

- the Claude spine should be named explicitly as:
  - `ClaudeAgentRunBackend`
  - `ClaudeAgentSdkRuntimeService`
  - Claude SDK session/control handles
  - Claude Agent SDK / Claude Code runtime
- it should not be described as if there were a separate RPC client class matching Codex

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-service-support.ts`

### 41. Team spines should start at `TeamRun`, with manager/factory staying on the side

- The same architectural rule used for `AgentRun` also applies to teams:
  - `AgentTeamRunManager` creates or restores `TeamRun`
  - `TeamRunBackendFactory` creates or restores `TeamRunBackend`
- Neither manager nor factory should be treated as a main spine node.

Design implication:

- the main team spine should be:
  - `TeamRun -> TeamRunBackend -> runtime-specific team execution tail`
- creation, history, websocket, and external-channel services should sit beside that spine as contributors or consumers

### 42. Native team spine is `TeamRun -> AutoByteusTeamRunBackend -> AgentTeam -> native team runtime -> member agents`

- Native team execution already has a real team object and a real team event stream.
- Under that team object, execution continues through native member agents and their runtimes.

Design implication:

- the native team tail should be described concretely as:
  - native `AgentTeam`
  - native team runtime/handlers
  - native member `Agent` / `AgentRuntime`
  - provider integrations
- it should not be described using member-runtime orchestration terms that only apply to Codex/Claude team implementations

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/agent-team.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/streaming/agent-team-event-stream.ts`

### 43. Codex and Claude team spines run through internal member `AgentRun`s before reaching their provider-specific tails

- For external runtimes, the clean team tail is:
  - `TeamRun`
  - runtime-specific team backend
  - internal member `AgentRun`s
  - member single-run backend
  - member runtime engine/client/session tail
- This makes internal member runs part of the team backend execution tail, not peer public runtime roots.

Design implication:

- `CodexTeamRunBackend` spine:
  - `TeamRun -> CodexTeamRunBackend -> CodexTeamMemberManager -> internal member AgentRuns -> CodexAgentRunBackend -> CodexThreadManager -> CodexThread -> CodexAppServerClient -> Codex runtime`
- `ClaudeTeamRunBackend` spine:
  - `TeamRun -> ClaudeTeamRunBackend -> ClaudeTeamMemberManager -> internal member AgentRuns -> ClaudeAgentRunBackend -> ClaudeSessionManager -> ClaudeSession -> Claude runtime`
- team events must come back through the team backend and `TeamRun`, not directly from member runtime bridges to transport

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`

### 44. The frontend event path is already runtime-unaware at the transport edge, but still split above the run boundary

- Native single-run frontend path today is:
  - native `AgentEventStream`
  - `AgentStreamHandler`
  - `ServerMessage`
  - websocket
- Codex/Claude single-run frontend path today is:
  - raw runtime adapter subscription
  - `RuntimeEventMessageMapper`
  - `ServerMessage`
  - websocket
- Team frontend path is likewise split:
  - native team stream for native runtime
  - `TeamRuntimeEventBridge` plus `TeamRuntimeStatusSnapshotService` for member-runtime teams

Design implication:

- websocket transport is already a right-side consumer
- the missing change is to move normalized event ownership down to `AgentRun` / `TeamRun`
- frontend event spine should therefore be described as `runtime tail -> backend -> run -> websocket mapper -> frontend`

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

### 45. Native external-channel reply replay already lives close to the run boundary through processors

- Native inbound external messages are bound to accepted turns by `ExternalChannelTurnReceiptBindingProcessor`.
- Native final assistant replies are published by `ExternalChannelAssistantReplyProcessor`.
- This is why native external replay feels much cleaner than Codex/Claude today: the replay path is already attached to the agent boundary.

Design implication:

- future external-channel replay should be modeled as a right-side consumer of `AgentRun` / `TeamRun`
- native processors may survive internally, but architecturally they should be considered implementation details below the run boundary

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts`

### 46. Codex/Claude external-channel replay is currently reconstructed in a separate bridge, which should move under the run boundary

- The inbound external-channel spine is now much cleaner:
  - `ChannelIngressService -> ChannelRunFacade -> ChannelAgentRunFacade/ChannelTeamRunFacade -> AgentRun/TeamRun`
  - `ChannelBindingRunLauncher` ensures or restores the target `AgentRun` / `TeamRun`
  - `ChannelMessageReceiptService` and `ChannelRunHistoryBootstrapper` contribute beside that spine
- The remaining old-shaped part is the outbound reply path: `RuntimeExternalChannelTurnBridge` still binds accepted turn ids and subscribes to raw runtime events outside the `AgentRun` / `TeamRun` boundary.
- `RuntimeExternalChannelTurnBridge` then subscribes to raw runtime events for non-native runtimes, accumulates assistant text, and finally calls `ReplyCallbackService`.
- Team relay can also propagate callback linkage across member runs when the recipient is the coordinator.

Design implication:

- external-channel replay should no longer depend on raw adapter subscriptions in the target architecture
- instead it should consume normalized `AgentRunEvent` / `TeamRunEvent` from `AgentRun` / `TeamRun`
- accepted-turn source binding and coordinator-only callback propagation should become run/backend-owned state and policy

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/runtime/default-channel-run-facade.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/runtime/default-channel-agent-run-facade.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/runtime/default-channel-team-run-facade.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`

### 47. Runtime-first case splitting is the clearest review format for this refactor

- Concern-first sections are useful for architectural analysis, but they force the reader to jump between execution, team, frontend, external reply, and history sections.
- For this refactor, the better review format is runtime-first:
  - `autobyteus`
  - `codex_app_server`
  - `claude_agent_sdk`
- Each runtime case should be read as a complete slice including:
  - single-run execution spine
  - team-run execution spine
  - frontend event spine
  - external-channel reply spine
  - history spine

Design implication:

- proposed design docs should preserve both views:
  - concern-first for cross-cutting reasoning
  - runtime-first for implementation review and migration planning

### 48. For single-agent external runtimes, the missing internal spine node is a runtime-specific execution subject

- One public `AgentRun` still corresponds to one runtime-specific internal execution subject.
- For Codex, that subject is best named `CodexThread`, because the runtime identity and event flow are centered on one thread.
- For Claude, that subject is best named `ClaudeSession`, because the runtime identity and event flow are centered on one SDK session.

Design implication:

- the single-run design should distinguish:
  - construction spine:
    - `AgentRunManager -> AgentRun -> AgentRunBackendFactory -> runtime-specific backend`
  - live runtime spine:
    - `AgentRun -> runtime-specific backend -> runtime-specific execution subject -> low-level support -> provider runtime`
- `CodexAppServerRuntimeService` and `ClaudeAgentSdkRuntimeService` are better treated as creators/controllers/supporters of those runtime-specific subjects than as the main domain node themselves

### 49. Codex should be modeled as `CodexThreadManager -> CodexThread -> CodexAppServerClient`, not as one broad runtime service node

- `CodexAppServerRuntimeService` currently owns `runId -> session state` maps, but that broad service is mixing thread creation, thread state, event routing, and command delegation.
- The more natural target split is:
  - `CodexThreadManager`
  - `CodexClientThreadRouter`
  - `CodexThread`
  - `CodexAppServerClient`
- `CodexThreadManager` should create or resume one `CodexThread`.
- `CodexClientThreadRouter` should bind shared-client notifications/requests, filter them by thread, and expose thread-scoped raw events upward.
- `CodexThread` should own thread identity, low-level status, active turn, approval state, and raw-event emission for that thread.

Design implication:

- `CodexAgentRunBackend` should depend on `CodexThreadManager`, not on a broad `CodexAppServerRuntimeService` concept.
- `CodexAppServerRuntimeService` is not the target architecture name and should not return.
- the low-level client-pool component is better named `CodexAppServerClientManager` than `CodexAppServerProcessManager`, because the client abstraction already encapsulates process spawn/close behavior

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts`

### 50. One Codex thread uses one active client reference, but Codex clients are shared per working directory

- the current `CodexAppServerProcessManager` keys entries by normalized working directory and reference-counts them.
- `bootstrapCodexThread(...)` acquires a client from that manager before starting or resuming a thread.
- That means a live `CodexThread` has one active `CodexAppServerClient` reference while it is running, but the client is not dedicated to that thread.
- Multiple threads in the same working directory may be multiplexed through the same app-server client/process.
- For normal filesystem workspaces, that is effectively one client per workspace root, because filesystem `workspaceId` is canonically derived from root path.
- The actual child-process spawn/close behavior sits inside `CodexAppServerClient`; the manager above it is pooling/reuse policy, not the process abstraction itself.

Design implication:

- the Codex data flow should show `CodexThread -> CodexAppServerClient`, but the design notes should explicitly say that this is effectively one client per workspace root while remaining implementation-keyed by normalized `workingDirectory`.
- the design should also make explicit that `CodexThreadService` acquires clients through a client manager, while `CodexAppServerClient` itself owns the spawned app-server child process and JSON-RPC transport.
- backend and thread-service logic must therefore keep thread scoping explicit when routing notifications/requests and when interpreting status.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-client-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/workspaces/workspace-identity.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/workspaces/workspace-manager.ts`

### 51. Raw event entry points differ clearly between Codex and Claude, and normalization should start immediately above those points

- Codex raw events start at `CodexAppServerClient.onNotification(...)` and `CodexAppServerClient.onServerRequest(...)`.
- Those raw client messages are then filtered by thread in the Codex bootstrap/router layer before becoming thread-scoped runtime events.
- Claude raw events start while iterating `for await (const chunk of session.stream())` on one run-owned SDK session.
- Claude session identity may be adopted or refreshed during streaming, so runtime-reference refresh is part of normal event handling there.

Design implication:

- `CodexAgentRunBackend` should subscribe to `CodexThread` raw events after thread scoping, then normalize them into `AgentRunEvent`.
- `ClaudeAgentRunBackend` should subscribe to `ClaudeSession` raw events from the SDK stream path, then normalize them into `AgentRunEvent`.
- websocket, history, and external-channel replay should consume only the normalized run-domain events after that point.

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-service-support.ts`

### 52. Current single-run runtime event subscription is already a listener-hub model, which should move under the run boundary

- Both Codex and Claude runtime services keep one listener set per live run/session state.
- `subscribeToRuntimeRunEvents(...)` already provides the deferred-listener behavior needed to subscribe before or after the underlying session becomes active.
- `emitRuntimeEvent(...)` already fan-outs raw runtime events to those run-scoped listeners.

Design implication:

- this listener-hub behavior does not need to stay at the adapter/websocket layer
- it should move under `CodexThreadService` / `ClaudeSessionService` and then under `CodexAgentRunBackend` / `ClaudeAgentRunBackend`
- outwardly, websocket/history/external-channel layers should subscribe only to `AgentRun`

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/runtime-event-listener-hub.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`

### 53. Current team runtime event streaming is proof that the missing object is `TeamRun`, not another mapper

- `TeamRuntimeEventBridge` subscribes to each member runtime separately, maps member runtime events to websocket messages, then re-attaches member identity on the way out.
- `AgentTeamStreamHandler` already has a branch between native team event streams and member-runtime reconstructed team streams.
- `TeamRuntimeStatusSnapshotService` and `TeamMemberRuntimeRelayService` are both supporting the same missing team-runtime object by reconstructing team status and coordinator/member routing around those member streams.

Design implication:

- target team event execution should be `member raw event -> member AgentRunEvent -> TeamRunBackend multiplexing -> TeamRunEvent -> TeamRun`
- current bridge/snapshot/relay services should become internal collaborators of the team backend instead of staying peer streaming architecture

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`

### 54. The native runtime shows why the `spine + trunks` metaphor is useful

- In native runtime, the main execution spine is stable and easy to name:
  - `Agent -> AgentRuntime -> AgentWorker -> WorkerEventDispatcher -> execution providers`
- The major customization paths are not alternative runtime cores; they are trunks attached to specific joints on that spine:
  - input processors
  - system-prompt processors
  - LLM response processors
  - tool invocation preprocessors
  - tool result processors
  - lifecycle processors
- This is why native feels coherent: the main runtime subject is obvious, and the processing/customization branches are also obvious.

Design implication:

- the external-runtime refactor should copy this readability property, not the native internals
- Codex and Claude should each get one clear runtime spine plus named trunks at the correct joints

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/agent.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/runtime/agent-runtime.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/runtime/agent-worker.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/events/worker-event-dispatcher.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/handlers/user-input-message-event-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/handlers/llm-complete-response-received-event-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts`

### 55. Codex should be documented as one runtime spine with named trunks, not as one large runtime service

- The Codex main runtime spine is:
  - `AgentRun -> CodexAgentRunBackend -> CodexThreadService -> CodexThread -> CodexAppServerClient -> Codex runtime`
- The major Codex trunks are:
  - runtime-context and workspace-resolution trunk attached to `CodexAgentRunBackend`
  - shared-client supply trunk attached to `CodexThreadService`
  - thread-scoping and raw-event-routing trunk attached to `CodexThreadService`
  - event-normalization trunk attached to `CodexAgentRunBackend`
  - status/runtime-reference trunk attached to `CodexAgentRunBackend`
- This framing is clearer than treating `CodexAppServerRuntimeService` as one monolithic central node.

Design implication:

- proposed design should show both Codex execution spine and Codex event spine
- `CodexRuntimeEvent` and `AgentRunEvent` should both appear explicitly on the event side so the normalization boundary is visible

### 56. Claude should be documented as one runtime spine with named trunks, not as one large runtime service

- The Claude main runtime spine is:
  - `AgentRun -> ClaudeAgentRunBackend -> ClaudeSessionService -> ClaudeSession -> Claude V2 session/control handles -> Claude runtime`
- The major Claude trunks are:
  - runtime-context and workspace-resolution trunk attached to `ClaudeAgentRunBackend`
  - transcript/tooling/turn-scheduling trunk attached to `ClaudeSessionService`
  - event-normalization trunk attached to `ClaudeAgentRunBackend`
  - normalized status/runtime-reference trunk attached to `ClaudeAgentRunBackend`
- This framing is clearer than treating `ClaudeAgentSdkRuntimeService` as one monolithic central node.

Design implication:

- proposed design should show both Claude execution spine and Claude event spine
- `ClaudeRuntimeEvent` and `AgentRunEvent` should both appear explicitly on the event side so the normalization boundary is visible

### 57. Current `RunHistoryIndexService` proves the single-run history boundary is still too low-level

- `RunHistoryIndexService` currently has two ingestion paths:
  - native `onAgentEvent(runId, StreamEvent)`
  - external-runtime `onRuntimeEvent(runId, rawEvent)`
- The external-runtime path currently depends on:
  - `RuntimeSessionStore`
  - `RuntimeAdapterRegistry`
  - adapter-specific `interpretRuntimeEvent(...)`
- That means persisted history is still reconstructing runtime meaning from session records and raw runtime events instead of consuming one normalized run-domain stream.

Design implication:

- target single-run history should collapse to one `onAgentRunEvent(runId, AgentRunEvent)` path
- manager lifecycle hooks plus normalized run events are the correct history boundary
- history should become a right-side persisted-state trunk off `AgentRun` / `AgentRunManager`, not a raw-runtime interpretation layer

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-history-index-service.ts`

### 83. The codebase currently uses “history” to mean two different things, and the design should split them explicitly

- `RunHistoryIndexService` is mainly the run index / manifest / activity-status side.
- `RunProjectionService` is the readable transcript side.
- That distinction is already real in code:
  - `RunHistoryIndexService` updates index rows, active/idle/error state, last activity, and runtime-reference hints
  - `RunProjectionService` reads the manifest and runtime-specific projection provider to build conversation output

Runtime-specific projection reality:

- `autobyteus`
  - projection is built from persisted local memory and raw traces
  - no live session is needed to show the readable conversation
- `codex_app_server`
  - projection is built from manifest/runtime reference plus `CodexThreadHistoryReader`
  - the readable conversation currently depends on a thread-style runtime tail
- `claude_agent_sdk`
  - projection is built from manifest/runtime reference plus Claude session-message retrieval merged with cached transcript state
  - the readable conversation currently depends on a session-style runtime tail

Design implication:

- the architecture should stop talking about one generic “run history path”
- the clearer split is:
  - history index path
  - transcript projection path
  - restore path
  - continuation path

That refined split is more correct than the earlier coarser parallel-path description.

Incremental naming direction:

- keep `RunHistoryIndexService` as the single-run list/index boundary
- keep the detail side separate as a projection/history-detail boundary
- do not let `RunHistoryIndexService` imply that it reconstructs the detailed displayed history

Additional split now visible from the code:

- `getAgentRunResumeConfig(...)` does not belong on the history-index spine either
- it belongs on a separate `RunResumeConfig` read-for-restore spine
- that split has now been implemented for single-run via `AgentRunResumeConfigService`

### 84. The corrected single-run persisted-state spine should be four paths, not one “history” path

- `RunHistoryIndex`
- `RunHistoryProjection`
- `RunResumeConfig`
- `RunRestore`
- `RunContinuation`

Why this matters:

- the earlier runtime-by-runtime “RunHistory” wording was mixing:
  - index rows
  - transcript/detail rendering
  - restore mechanics
  - continuation workflow
- that made the data-flow spine look stranger than the actual code

Correct domain nodes:

- `RunHistoryIndexService`
  - persisted run list/index/status/resume-metadata side
- `RunHistoryProjectionService`
  - detailed displayed-history side
- `AgentRunResumeConfigService`
  - pre-resume config/read-for-restore side
- `AgentRunManager`
  - restore/create/live-run registry side
- `RunContinuationService`
  - business workflow side

Implementation reading:

- index is shared more than projection
- resume-config is a separate read path from index
- projection remains runtime-specific at the tail
- restore is runtime-specific under `AgentRunManager`
- continuation is business-shaped above that

This is the cleaner conceptual spine for the next history-related refactors.

### 85. `RunRestore` needs to stay explicit as its own spine, and `runtimeReference` is restore-tail support data

- `RunRestore` should be modeled as:
  - restore caller
  - `-> AgentRunRestoreService`
  - `-> AgentRunManifestStore`
  - `-> AgentRunRestoreState`
  - `-> AgentRunManager.restoreAgentRun(...)`
  - `-> AgentRun`
  - `-> runtime-specific backend restore tail`
- The main restore input should be standalone `runId`, not a generic ambiguous run identifier that might require ownership guessing.
- `RunContinuationService` inactive resume is allowed to call this spine, but that does not make restore the same thing as continuation.
- `runtimeReference` should be treated as persisted locator data for the runtime-specific restore tail:
  - Codex uses `threadId`
  - Claude uses `sessionId`
  - native AutoByteus barely needs it
- helper files like `run-runtime-reference-support.ts` are not main domain nodes.
- They are just support helpers for normalizing and merging persisted runtime-reference data around the restore path.

Naming implication:

- `runtimeReference` is a poor name because it sounds like a runtime object handle or runtime-type reference.
- The core concept is really the corresponding run identity on the specific backend/platform.
- The cleaner target vocabulary is:
  - `runtimeKind`
  - `platformRunId`
- If any extra backend-specific persisted data survives, it should be modeled explicitly instead of being hidden inside a vague `runtimeReference` bag.

### 86. The current restore smell is mostly a boundary-shape problem

- After `AgentRunManifestStore.readManifest(runId)`, the system already has one persisted restore record.
- That record includes:
  - run configuration
  - backend restore state (`runtimeReference`)
- So the current call shape:
  - `AgentRunManager.restoreAgentRun({ runId, config, runtimeReference })`
  feels redundant because it decomposes one persisted record into two arguments.
- For Codex and Claude, backend restore state is still legitimate:
  - Codex needs the persisted platform run id for the thread it should resume
  - Claude needs the persisted platform run id for the session it should resume
- For native AutoByteus, backend restore state is mostly trivial and therefore feels like legacy baggage.
- That means the real design issue is:
  - `runtimeReference` is too visible and too generically named
  - `RestoreAgentRunRequest` exposes the decomposition instead of one explicit restore-state object
  - native restore is still inlined in `AgentRunManager`, while external runtimes already restore through backend factories

Target implication:

- `AgentRunRestoreService` should read one persisted restore-state record
- `AgentRunRestoreState` should be the explicit manager/backend restore handoff object
- it should carry:
  - `config`
  - `platformRunId`
  - temporary `platformMetadata` only while some runtimes still need extra persisted restore hints
- legacy translation from old `config + runtimeReference` request shapes should live in the request boundary, not inside `AgentRunRestoreState` itself
- `AgentRunManager` should dispatch by runtime kind and register the resulting `AgentRun`
- each runtime-specific backend factory should perform the actual restore tail
- native `autobyteus` should eventually have the same factory-owned restore shape as Codex and Claude

### 58. Current `RunContinuationService` is now run-subject-centric, but should shrink further to a thinner business trunk

- `RunContinuationService` currently depends on:
  - `AgentRunManager`
  - `AgentRunRestoreService`
  - `AgentRunMetadataService`
- Its active/inactive/create branches now reason in terms of `AgentRun` plus one persisted metadata layer, not runtime sessions.
- But it still mixes three business cases in one service:
  - active continue
  - inactive restore then continue
  - lazy create then first send
- It also still depends on GraphQL-shaped input instead of a narrower application command DTO.

Design implication:

- the business capability should survive only as a left-side continuation trunk
- active path is now effectively `AgentRunManager -> AgentRun.postMessage(...)`
- inactive path is now effectively `AgentRunMetadataService.readManifest(...) -> AgentRunRestoreService -> AgentRun.postMessage(...)`
- the remaining cleanup target is team continuation, not single-run runtime composition

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`

Continuation branch model:

- branch `A` active standalone run
  - `RunContinuationService`
  - `-> AgentRunManager.getActiveRun(runId)`
  - `-> AgentRun.postUserMessage(...)`
- branch `B` inactive standalone run
  - `RunContinuationService`
  - `-> AgentRunMetadataService.readManifest(...)`
  - `-> AgentRunRestoreService`
  - `-> AgentRun.postUserMessage(...)`
- branch `C` brand-new standalone run
  - `RunContinuationService`
  - `-> AgentRunManager.createAgentRun(...)`
  - `-> AgentRun.postUserMessage(...)`

Design implication:

- continuation should stay one business-flow trunk with three explicit branches
- it should not grow back into a generic runtime-session router
- manifest/index writes are downstream side effects, not the main spine owner

### 59. Team history is closer to the right model, but still reconstructs active ownership above the future `TeamRun` boundary

- `TeamRunHistoryService` already works mainly in terms of team manifests and team index rows, which is closer to the target than single-run history.
- But active ownership is still inferred from two places:
  - `AgentTeamRunManager`
  - `TeamMemberRuntimeOrchestrator`
- It also merges active member bindings back into persisted manifests by consulting orchestrator state directly.

Design implication:

- `TeamRunHistoryService` should remain a persisted-state trunk
- but active ownership and binding refresh should come from `TeamRun` / `AgentTeamRunManager` instead of direct orchestrator-centric reads at the history boundary

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`

### 60. Team continuation still branches above the team boundary, which is exactly what the refactor should remove

- `TeamRunContinuationService` is already business-shaped, but it still branches above the future `TeamRun` boundary:
  - native team restore through `AgentTeamRunManager`
  - member-runtime restore through `TeamMemberRuntimeOrchestrator`
- It also directly calls `restoreMemberRuntimeSessions(...)`, `sendToMember(...)`, and `removeTeam(...)`.

Design implication:

- `TeamRunContinuationService` can survive as a business capability
- but it should become a left-side continuation trunk over `AgentTeamRunManager`
- member-runtime restore and dispatch should move under `TeamRun` / team backend ownership
- the continuation service should not know whether the restored team is native or member-runtime

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`

### 61. Native status is already a true event-derived model, but it is more detailed than external runtimes

- Native single-agent status is reduced from runtime events by `AgentStatusDeriver`.
- The native vocabulary includes:
  - `UNINITIALIZED`
  - `BOOTSTRAPPING`
  - `IDLE`
  - `PROCESSING_USER_INPUT`
  - `AWAITING_LLM_RESPONSE`
  - `ANALYZING_LLM_RESPONSE`
  - `AWAITING_TOOL_APPROVAL`
  - `TOOL_DENIED`
  - `EXECUTING_TOOL`
  - `PROCESSING_TOOL_RESULT`
  - `SHUTTING_DOWN`
  - `SHUTDOWN_COMPLETE`
  - `ERROR`
- That is a strong proof that status should remain event-derived in the target architecture.

Design implication:

- the server-side `AgentRun` model should keep status event-derived
- but the server-side normalized status model likely needs a coarse common status plus optional detail, because external runtimes do not expose all native phases equally

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/status/status-enum.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/status/status-deriver.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/status/status-update-utils.ts`

### 62. Codex and Claude already derive status from events, but at a coarser level than native

- Codex mutates session status in the runtime event router based on events such as:
  - `turn/started`
  - `turn/completed`
  - `thread/status/changed`
- Claude currently derives status mainly from turn lifecycle and error events coming from the session stream path.
- The websocket adapter for method-style runtimes already maps the external runtimes mostly to `RUNNING`, `IDLE`, and `ERROR` at the transport layer.

Design implication:

- the target backend layer should keep status event-derived for Codex and Claude
- but the normalized server-side status model should not assume native-level phase richness for every runtime

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-event-router.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`

### 63. Team status is already an aggregation problem, which belongs inside `TeamRun`

- Native team runtime already has its own team-status enum:
  - `UNINITIALIZED`
  - `BOOTSTRAPPING`
  - `IDLE`
  - `PROCESSING`
  - `SHUTTING_DOWN`
  - `SHUTDOWN_COMPLETE`
  - `ERROR`
- Current member-runtime team streaming derives team status from member statuses in `TeamRuntimeEventBridge`.
- `TeamRuntimeStatusSnapshotService` is also reconstructing team/member status for websocket initial state.

Design implication:

- target `TeamRun` should own team-status aggregation directly
- team/member status should come from normalized run/team events, not from bridge-level reconstruction in higher layers

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/status/agent-team-status.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/status/status-deriver.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`

### 64. Claude should be modeled around `ClaudeSessionManager -> ClaudeSession`, with no separate client-manager layer

- The current Claude runtime keeps one SDK session object and one optional control handle per `runId`.
- Session creation/resume is already done by creating or resuming that run-owned SDK session, then caching it in the runtime service.
- The low-level session object itself owns `send(...)`, `stream()`, and `close()`, while the control handle owns interruption and related control operations.
- Unlike Codex, there is no shared-client-per-workspace layer beneath the run. The session object is already the low execution/transport boundary.

Design implication:

- the Claude data flow should explicitly show:
  - `ClaudeSessionManager -> ClaudeSession -> Claude SDK session/control handles -> Claude runtime`
- `ClaudeSessionManager` should be the creator/controller above the session, not a pool manager
- `ClaudeSession` is the runtime-specific domain subject on the data flow; the SDK handles are interop detail below it
- `ClaudeAgentRunBackend` should subscribe to raw session events from that path and normalize them into `AgentRunEvent`
- proposed design should make this relationship just as explicit as the Codex `ThreadService -> Thread -> Client` relationship

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`

### 65. Current team execution is split above the team boundary, and native vs member-runtime already prove the missing `TeamRun` subject

- The current team launch path branches in `TeamRunLaunchService` before any first-class `TeamRun` object exists:
  - `native_team` -> `AgentTeamRunManager`
  - `member_runtime` -> `TeamMemberRuntimeOrchestrator`
- Native teams already have a coherent internal domain subject chain:
  - `AgentTeam -> AgentTeamRuntime -> TeamManager / AgentEventMultiplexer`
- Member-runtime teams do not. Their team identity is reconstructed across:
  - `TeamMemberManager`
  - `TeamRuntimeBindingRegistry`
  - `TeamMemberRuntimeRelayService`
  - `TeamRuntimeEventBridge`
- That means the current team architecture already demonstrates the same pattern as single-run:
  - native has an explicit team runtime subject
  - external runtimes reconstruct the team from services because the subject is missing

Design implication:

- the future public team data flow should be:
  - `AgentTeamRunManager -> TeamRun -> TeamRunBackend`
- native backend should wrap the existing `AgentTeam -> AgentTeamRuntime` chain
- Codex/Claude team backends should absorb the orchestrator/binding/relay/bridge responsibilities under one `TeamRun` ownership boundary

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/agent-team.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`

### 66. A private team member manager still makes sense inside runtime-specific member-run team backends

- The current member-runtime team path already has one real orchestration concern:
  - create/restore member runs
  - track bindings
  - route coordinator/member messages
  - relay inter-agent messages
  - propagate accepted-turn metadata
- Today that concern is spread across:
  - `TeamMemberRuntimeOrchestrator`
  - `TeamMemberManager`
  - `TeamRuntimeBindingRegistry`
  - `TeamMemberRuntimeRelayService`
- That means the orchestration concern itself is legitimate; what is wrong today is where it lives in the architecture.

Design implication:

- future `CodexTeamRunBackend` and `ClaudeTeamRunBackend` should each be allowed to own a private `...TeamMemberManager`
- that manager should remain beneath `TeamRun`, not beside it
- it should be an internal collaborator of the backend, not a public server-side entrypoint
- it should reuse the runtime-specific single-run backend factory path underneath
  - Codex path: `CodexAgentRunBackendFactory`
  - Claude path: `ClaudeAgentRunBackendFactory`
- it should not create member runs through the public `AgentRunManager`
  - `AgentRunManager` is the outward active-run registry for public single runs
  - team member runs are internal implementation state of one `TeamRun`
- likely contract:
  - `createMembers(...)`
  - `restoreMembers(...)`
  - `getMemberRun(...)`
  - `listMemberRuns(...)`
  - `subscribeToMemberEvents(...)`
  - `terminateAll(...)`
- ownership correction:
  - `TeamMemberManager` should not own execution verbs like `postMessage`, `approveToolInvocation`, `interrupt`, or `terminate`
  - those belong to the selected internal member `AgentRun`
  - the backend should resolve the member run through the manager and then invoke the member run directly
  - a temporary `TeamMemberCommandRouter` is acceptable as a supporting concern under the backend while the private internal member `AgentRun` registry is still being completed
  - that router should stay off the main execution spine
- decomposition rule:
  - if the member manager gets too broad, split helper concerns beneath it
  - examples:
    - binding store
    - routing helper
    - accepted-turn tracker
    - member-event intake helper
  - keep the manager as the main internal domain node on the team-execution spine

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`

Naming implication:

- `member_runtime` is still useful as a transitional execution-mode label while refactoring
- it is not a good stable backend name because it describes strategy rather than runtime identity
- stable target names should remain:
  - `CodexTeamRunBackend`
  - `ClaudeTeamRunBackend`
- if a temporary helper/backend is named after `member_runtime`, it should be treated as a migration seam rather than a final architecture concept

### 67. `CodexAppServerClient` is already a transport/process boundary, not a thread or run domain subject

- The current client owns:
  - child-process spawn/close
  - stdout/stderr wiring
  - JSON-RPC request/notify/respond framing
  - pending request correlation and timeout handling
  - listener registration for notifications, server requests, and close
- It does not own:
  - Codex thread identity
  - thread scoping
  - status derivation
  - runtime-reference construction
  - workspace-level pooling policy
- Those responsibilities are currently split above it, which is why the target architecture should keep the client low and move Codex thread/run semantics into `CodexThreadService`, `CodexThread`, and `CodexAgentRunBackend`.

Design implication:

- bottom-up refactoring should start from the Codex client boundary because it is already a clean separation point
- the client should remain transport/process infrastructure only
- thread/run semantics should not be pushed down into the client during the refactor

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-client.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`

### 68. First bottom-up Codex extraction can be done safely by introducing `CodexThread` before renaming the broad runtime service

- The current Codex runtime service is still too broad, but the lowest-risk first extraction is to introduce a real `CodexThread` object and keep the outer service API stable for one pass.
- This works because the existing `CodexThreadState` is already the de facto thread state bag:
  - run/thread identity
  - startup lifecycle
  - active turn tracking
  - approval records
  - listener set
  - client bindings
- Once those concerns move into `CodexThread`, the current runtime service can be reduced into the temporary thread-creator/controller above it without forcing a large rename in the same slice.

Implemented implication:

- bottom-up implementation should proceed in this order:
  - keep `CodexAppServerClient`
  - rename pool layer to `CodexAppServerClientManager`
  - introduce `CodexThread`
  - then shrink/rename the broad runtime service toward `CodexThreadManager`

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-event-router.ts`

### 69. `CodexThread` should own listener lifecycle, startup control, approval records, and low-level runtime reference/state

- After extracting `CodexThread`, the following concerns fit naturally on the thread object itself:
  - listener storage and event emission
  - deferred-listener rebind / close-time deferral
  - startup ready / startup failed control
  - approval-record add/find/delete
  - runtime-reference construction
  - low-level status and active-turn updates
- Those are thread-local concerns and should not stay owned by the broader runtime service.
- The runtime service still remains above the thread for now because it coordinates create/restore/terminate, but it should delegate these thread-local behaviors downward.

Implemented evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-event-router.ts`

### 70. `CodexThread` becomes cleaner once immutable launch/runtime-option data is split into `CodexThreadConfig`

- After the first `CodexThread` extraction, the next structural issue is that immutable launch/runtime-option data is still mixed into the live thread object.
- The clean split is:
  - `CodexThreadConfig`
    - model
    - working directory
    - reasoning effort
    - runtime metadata
    - member/team identity and capability flags
    - configured skills + skill access mode
  - `CodexThread`
    - run id
    - thread id
    - client attachment
    - startup lifecycle
    - status / active turn
    - listeners
    - approval records
    - cleanup bindings
    - materialized skill resources
- This matches the native mental model more closely: config is separate from the live runtime subject.

Implemented evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-bootstrap.ts`

### 71. `CodexThreadConfig` live input is now typed, and persistence metadata is isolated from launch/config input

- `CodexThreadConfig` no longer accepts a generic `runtimeMetadata: Record<string, unknown>` input.
- The only remaining metadata bag is emitted persistence metadata used for runtime references/history.
- That persistence payload still contains:
  - execution hints: `model`, `cwd`, `reasoning_effort`
  - rendered or source instruction data: `agentInstruction`, `memberInstructionSources`
  - team-member routing data: `teamRunId`, `memberName`, `sendMessageToEnabled`, `teamMemberManifest`
  - skill context: `skillAccessMode`, `configuredSkillNames`
- That is acceptable only as persistence/output data, not as live input.

The cleaner target is:

- `CodexInstructionContext`
  - `teamInstruction`
  - `agentInstruction`
- `CodexTeamContext`
  - `teamRunId`
  - `memberName`
  - `sendMessageToEnabled`
  - `teammates`
- `CodexExecutionConfig`
  - `model`
  - `workingDirectory`
  - `reasoningEffort`
  - `autoExecuteTools`
- `CodexThreadConfig`
  - typed Codex runtime fields only, not a generic metadata map

Important design observation:

- `memberInstructionSources` is not a good long-term field name once values are already normalized into one rendered instruction string.
- `agentInstruction` / `teamInstruction` should stay singular once normalized:
  - `agentInstruction`
  - `teamInstruction`

Migration judgment:

- do not keep backward-compatible instruction/config aliases on the live Codex path
- keep persistence metadata isolated to runtime-reference/history edges only
- conversion from persistence data into typed thread launch/config data should happen in the Codex backend/bootstrap boundary

### 71. `CodexThreadManager` is now the concrete Codex manager boundary, and the remaining requirement is to keep support concerns out of it

- Current public API on the manager:
  - `createThread`
  - `restoreThread`
  - `hasThread`
  - `getThread`
  - `terminateThread`
- Support concerns have already been moved out to side collaborators:
  - `CodexModelCatalog` owns model listing
  - `CodexWorkspaceResolver` owns workspace-root resolution
  - `CodexInterAgentRelayBinding` owns mutable relay wiring
  - `CodexAppServerClientManager` owns pooled client acquisition/release
  - `CodexThreadBootstrapper` owns create/restore bootstrap
  - `CodexClientThreadRouter` should own low-level client listener installation and shared-client thread routing

Design implication:

- `CodexThreadManager` should stay centered on live-thread lifecycle + lookup
- support concerns should remain side trunks rather than drift back onto the public manager API

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts`

### 72. The bottom-up Codex split is now visible in code, and the next step is thread-local tightening rather than another broad rename

- The broad runtime service has been removed.
- The manager boundary is now explicit and support concerns have been extracted.
- The better next step is to keep moving thread-local concerns downward into `CodexThread` and keep the manager API small.
- The latest source slice already moved `sendTurn`, `injectInterAgentEnvelope`, `interrupt`, and `approveTool` onto `CodexThread`, and the adapter now reaches those through `getThread(...)`.

Recommended future `CodexThreadManager` API:

- `createThread(runId, options): Promise<CodexThread>`
- `restoreThread(runId, options, runtimeReference): Promise<CodexThread>`
- `hasThread(runId): boolean`
- `getThread(runId): CodexThread | null`
- `terminateThread(runId): Promise<void>`

Recommended future `CodexThread` API:

- `sendTurn(message): Promise<{ turnId: string | null }>`
- `injectInterAgentEnvelope(envelope): Promise<{ turnId: string | null }>`
- `interrupt(turnId?): Promise<void>`
- `approveTool(invocationId, approved): Promise<void>`
- `getStatus(): string | null`
- `getRuntimeReference(): { threadId: string; metadata: JsonObject }`
- `subscribeRuntimeEvents(listener): () => void`
- `terminate(): Promise<void>`

Likely side trunks / collaborators:

- `CodexThreadBootstrapper`
  - current `bootstrapCodexThread`
- workspace/runtime-context resolution collaborator
  - current `CodexWorkspaceResolver`
- model-catalog collaborator
  - current `CodexModelCatalog`
- server-request relay collaborator
  - current `CodexInterAgentRelayBinding`

Design implication:

- next source step should keep removing thread-scoped verbs from `CodexThreadManager` until it is only a lifecycle/lookup boundary

### 73. Listener ownership should be split into bootstrap listeners, thread-local raw listeners, and backend-level stable subscriptions

- low-level client listeners (`onNotification`, `onServerRequest`, `onClose`) are not public manager concerns
- those listeners should be installed by a live shared-client router, not by the manager
- source now matches that split:
  - `CodexThreadBootstrapper` creates the thread without attaching client listeners
  - `CodexClientThreadRouter` owns shared-client listener installation and thread routing
- `CodexThread` should own the raw runtime listener set for that live thread instance
- stable run-facing subscription continuity across thread replacement should not stay on `CodexThreadManager`
- that continuity belongs one layer up on `CodexAgentRunBackend`, because `AgentRun` is the stable subject and `CodexThread` is only the internal execution subject

Design implication:

- `CodexThreadManager` should not remain the stable event hub
- `CodexThreadManager` should not own `emitEvent`, `handleServerRequest`, or `handleClientClose`
- a `CodexClientThreadRouter` should sit between the shared client and the live threads
- source now follows the live event path `CodexAppServerClient -> CodexClientThreadRouter -> CodexThread`
- `CodexThread` should expose raw thread-runtime subscription
- `CodexAgentRunBackend` should subscribe to the current thread and re-expose stable normalized `AgentRunEvent` outward
- source now partially matches that target:
  - `CodexAgentRunBackend` exists above `CodexThreadManager`
  - `CodexAppServerRuntimeAdapter` now acts mainly as a backend registry/factory by `runId`
- stable raw run-facing subscription continuity has moved out of `CodexThreadManager` and into `CodexAgentRunBackend`
- normalized `AgentRunEvent` emission is still the next upward refactor
- the adapter is now clearly legacy-shaped and should be removed once single-agent entrypoints move to the future runtime-unaware manager boundary

### 74. Claude has the same “broad service + plain state bag” problem Codex had before `CodexThread`

- Current Claude runtime behavior is still centered on `ClaudeAgentSdkRuntimeService`.
- That service currently owns:
  - active-session registry
  - create / restore / close lifecycle
  - deferred listener continuity
  - command delegation
  - transcript / scheduler / tooling coordination
  - Claude V2 session/control-handle ownership
  - stream driving and event emission
- The live Claude run subject is still only a plain state bag:
  - `ClaudeRunSessionState`
  - created in the old `claude-runtime-session-state.ts`
  - then passed through helpers and the broad service

Design implication:

- Claude needs the same first bottom-up extraction Codex already got
- the first correct Claude move is to introduce a real `ClaudeSession` subject beneath the broad service
- that session should own:
  - session identity
  - raw listener set
  - raw event emission
  - runtime-reference construction
  - session-id adoption / transcript migration
  - active turn / abort-controller state

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-service-support.ts`

### 75. Claude should next mirror the early Codex split: `ClaudeSession` first, `ClaudeSessionManager` boundary second

- Claude does not need a Codex-style client-manager layer.
- But it does need the same ownership cleanup:
  - manager owns lifecycle/registry
  - session owns live runtime behavior
  - backend owns stable run-facing continuity and normalization
- The clean Claude progression is:
  1. introduce `ClaudeSession`
  2. move live session ownership into it
  3. shrink the broad service toward `ClaudeSessionManager`
  4. later add `ClaudeAgentRunBackend` above that boundary

Recommended future `ClaudeSessionManager` API:

- `createSession(runId, options): Promise<ClaudeSession>`
- `restoreSession(runId, options, runtimeReference): Promise<ClaudeSession>`
- `hasSession(runId): boolean`
- `getSession(runId): ClaudeSession | null`
- `closeSession(runId): Promise<void>`

Recommended future `ClaudeSession` API:

- `subscribeRuntimeEvents(listener): () => void`
- `emitRuntimeEvent(event): void`
- `getRuntimeReference(): { sessionId: string; metadata: Record<string, unknown> }`
- `adoptResolvedSessionId(sessionId, transcriptStore): void`
- `setActiveTurn(turnId): void`
- `clearActiveTurn(): void`
- `setActiveAbortController(controller): void`
- `clearActiveAbortController(): void`
- `markTurnCompleted(): void`

Design implication:

- Claude should not jump directly from the current broad service to a renamed manager without first extracting the real runtime subject
- otherwise the new name would still sit on top of the same mixed ownership we are trying to remove

### 76. The first Claude source cut is now in place: `ClaudeSession` exists and `ClaudeSessionManager` is the broad manager/orchestrator boundary

- Source now has a real `ClaudeSession` class under the Claude runtime layer.
- The old state-bag constructor file has been removed.
- `ClaudeSessionManager` now stores `Map<string, ClaudeSession>` instead of plain session-state records.
- Session-local behavior has moved downward into `ClaudeSession`:
  - raw runtime listener ownership
  - raw runtime event emission
  - deferred-listener rebind / close-time deferral helpers
  - runtime-reference construction
  - session-id adoption / transcript migration
  - active turn / abort-controller state helpers
- The broad manager/orchestrator boundary still owns the higher Claude orchestration concerns:
  - create / restore / close lifecycle
  - transcript-store coordination
  - turn scheduler coordination
  - tooling coordinator integration
  - Claude V2 session/control-handle ownership
  - stream driving

Design implication:

- Claude now has the first real runtime-specific subject on the bottom-up path
- the next cleanup target is the run-facing layer above `ClaudeSessionManager`, not another state split
- the next source step should introduce:
  - `ClaudeAgentRunBackend`
  - `ClaudeAgentRunBackendFactory`
- after that, `AgentRunManager` can own Claude create / restore through an internal runtime-specific delegate while keeping its public boundary runtime-neutral

Implemented evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-session.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-session-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-service-support.ts`

### 77. Codex still has one remaining event-boundary gap: backend listeners are stable, but emitted events are still raw runtime events

- The low event path is already in the right shape:
  - `CodexAppServerClient -> CodexClientThreadRouter -> CodexThread`
- Stable run-facing listener continuity also already moved up:
  - `CodexAgentRunBackend` owns the listener hub above `CodexThread`
- But the backend is still forwarding raw `CodexRuntimeEvent` upward.
- That means:
  - method normalization still effectively depends on adapter/transport interpretation
  - status/runtime-reference hints are still reconstructed above the backend

Design implication:

- the next Codex event slice should normalize inside `CodexAgentRunBackend`
- that normalization should produce one Codex run-event shape with:
  - normalized `method`
  - preserved `params`
  - explicit `statusHint`
  - explicit `runtimeReference` / `runtimeReferenceHint`
- the first version should stay method-based so websocket/history compatibility does not block the slice

Key evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-agent-run-backend.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`

### 78. The next Codex architectural cut is create / restore ownership

- After the event-layer slice, the main remaining Codex mismatch is that create / restore still enter through `CodexAppServerRuntimeAdapter`.
- That keeps workspace resolution, runtime-context resolution, and backend creation in the old adapter boundary.
- The cleaner next step is `CodexAgentRunBackendFactory`, which should:
  - resolve workspace root
  - resolve single-agent runtime context
  - call `CodexThreadManager.createThread(...)` / `restoreThread(...)`
  - create and attach `CodexAgentRunBackend`
- After that, the adapter becomes a much thinner compatibility shim and is easier to remove entirely.

### 79. `RunHistoryIndexService` can now read Codex backend events directly

- After the backend event normalization slice, Codex now emits a stable backend event shape with:
  - normalized `method`
  - explicit `statusHint`
  - explicit `runtimeReference` / `runtimeReferenceHint`
- That means `RunHistoryIndexService` no longer needs adapter-side Codex interpretation as its primary path.
- The cleaner integration is:
  - `CodexAgentRunBackend event -> RunHistoryIndexService`
  - adapter interpretation only as transitional fallback

### 80. Continuation can now bypass composition / ingress, but `AgentRunManager` should own create / restore next

- Continuation is still a higher-layer business capability and should remain runtime-neutral at its public boundary.
- But for Codex, the cleaner next lower boundary is:
  - `RunContinuationService -> AgentRunManager -> CodexAgentRunBackendFactory -> CodexThreadManager -> CodexThread`
- `CodexAgentRunService` may still survive temporarily for:
  - backend registry by `runId`
  - run-scoped send / approve / interrupt / terminate delegation
  - event subscription / runtime-reference lookup
- However, create / restore no longer belong there once `AgentRunManager` is widened beyond the native-only path.
- The manager remains runtime-neutral at its public boundary; runtime-kind dispatch should stay in internal factory/delegate collaborators underneath it.
- This lets Codex continuation bypass `RuntimeCompositionService` and `RuntimeCommandIngressService` while also moving top lifecycle ownership to the manager boundary that the target architecture already calls for.

### 81. Claude now has the same first run-facing lower boundary pattern as Codex

- `ClaudeSessionManager` now owns live `ClaudeSession` objects instead of plain session-state bags.
- A run-facing layer now exists above it:
  - `ClaudeAgentRunBackend`
  - `ClaudeAgentRunBackendFactory`
- `AgentRunManager` now dispatches Claude create / restore through an internal runtime-managed delegate while keeping the public manager boundary runtime-neutral.
- `ClaudeAgentSdkRuntimeAdapter` create / restore is therefore now a thin compatibility caller into `AgentRunManager`, not the real lifecycle owner.

### 82. `RunHistoryIndexService` can now read Claude backend events directly too

- `RunHistoryIndexService` already had a transitional direct path for backend-normalized Codex events.
- It can now do the same for backend-normalized Claude events:
  - `ClaudeAgentRunBackend event -> RunHistoryIndexService`
- That means Claude history no longer needs adapter-side runtime interpretation as its primary path once the backend event is available.
- This keeps the Codex and Claude event-to-history line symmetrical one layer higher while websocket/external-command entrypoints are still being migrated.

### 83. Single-agent GraphQL no longer needs `RuntimeCompositionService` for create/send/approve

- The single-agent GraphQL resolver now creates runs through `AgentRunManager` directly.
- It then binds the resulting `RuntimeSessionRecord` straight into `RuntimeSessionStore` / `RuntimeCommandIngressService` compatibility state instead of going through `RuntimeCompositionService.createAgentRun(...)`.
- Existing native runs can also lazily bind a missing session record before approval/send.
- `AgentRunTerminationService` likewise now reads/removes session state directly from `RuntimeSessionStore` instead of `RuntimeCompositionService`.
- This does not remove the old command-ingress shell yet, but it does mean the main single-agent GraphQL entrypoint has stopped using composition as the create/lookup owner.

### 84. The missing middle subject should be implemented as `AgentRun` / `TeamRun`, not as a generic handle

- The active-run lookup problem exposed a real architectural gap:
  - `AgentRunManager` was widening beyond native create / restore
  - but there still was no real server-side `AgentRun` subject
- A temporary `handle` abstraction would only rename the gap, not solve it.

Cleaner boundary:

- `AgentRunManager -> AgentRun -> runtime-specific backend`
- `AgentTeamRunManager -> TeamRun -> runtime-specific backend`

First implementation direction now started:

- a real server-side `AgentRun` class now exists
- `AgentRunManager.getActiveRun(runId)` now returns that subject
- native `Agent`, Codex backend, and Claude backend can now sit behind `AgentRun`
- a first server-side `TeamRun` class now exists for native team runs
- `AgentTeamRunManager.getActiveRun(teamRunId)` now returns that subject for native teams

This restores the ownership rule the design expects:

- manager manages lifecycle / lookup
- run subject owns live behavior

Single-run follow-up:

- the same ownership issue still exists in smaller form on the single-run side
- `AgentRunManager` no longer exposes public send/approve/interrupt methods directly, which is already better than the current team-member shape
- native is now cleaner:
  - native path goes through `AutoByteusAgentRunBackend`
- but `AgentRunManager` still assembles runtime-specific `AgentRun` backends internally:
  - Codex path through `CodexAgentRunBackendAdapter`
  - Claude path through `ClaudeAgentRunBackendAdapter`
- so the remaining smell is:
  - manager is still partly lifecycle manager and partly run-behavior assembler
- design implication:
  - keep the public ownership rule
  - then shrink the internal manager role further by moving Codex/Claude adapter backend assembly out of the manager and into backend-factory or runtime-specific wrapper code

### 85. Run config should be runtime-neutral and converted under backend factories

- The next missing split after `AgentRun` / `TeamRun` is config ownership.
- We should not keep passing loose top-level option bags forever.
- We also should not promote backend-specific config like `CodexThreadConfig` to the public run boundary.

Cleaner split:

- `AgentRunConfig`
  - runtime-neutral immutable input for one single run
- `TeamRunConfig`
  - runtime-neutral immutable input for one team run
- backend-specific config
  - derived below the manager boundary under the backend factory

Meaning:

- `AgentRunConfig -> AgentRunBackendFactory -> CodexThreadConfig / Claude session config / AgentConfig`
- restore keeps `runId` and `runtimeReference` beside the config instead of putting them inside the config itself

That keeps concerns separate:

- config = desired run setup
- runtime reference = resume hint
- live state = `AgentRun` / backend / runtime subject

### 86. Remaining runtime-shell usage after the latest refactor

- `RuntimeCompositionService`
  - production call sites: none
  - status: dead, removable
- `RuntimeCommandIngressService`
  - live usage:
    - `TeamRuntimeInterAgentMessageRelay`
  - stale/removed usage:
    - `AgentTeamStreamHandler` constructor dependency was unused and should be removed
- `RuntimeAdapterRegistry`
  - still live on:
    - `RunHistoryIndexService`
    - `AgentRunResumeConfigService`
    - `AgentStreamHandler`
    - `TeamRuntimeEventBridge`
    - `TeamMemberManager`
    - `TeamMemberManager`
    - `TeamRunLaunchService`
    - `TeamRunMutationService`
  - current role:
    - adapter lookup for active/status/event compatibility on external runtimes
    - team runtime-mode selection via `teamExecutionMode`
    - relay-handler binding for runtime-specific member-run team members

Design implication:

- not every remaining `runtime*` reference is the same kind of debt
- the composition layer can be removed now
- command ingress is already reduced to a narrow relay bridge
- adapter registry remains as a migration shell and should be peeled off one spine at a time:
  - single-run history/index
  - single-run streaming
  - team runtime mode / relay / event bridge

## Initial Assessment

The current architecture has strong infrastructure modularity but weak domain centrality for external runtimes. Native runtime already has clear domain subjects; Codex and Claude do not. The working hypothesis for this ticket is that the missing aggregate root is a first-class runtime subject such as `AgentRun` and `TeamRun`, with current runtime services and adapters repositioned as collaborators beneath those subjects.
