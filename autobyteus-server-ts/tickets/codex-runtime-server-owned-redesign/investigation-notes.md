# Investigation Notes

## Stage

- Understanding Pass: `Completed`
- Last Updated: `2026-02-24` (round-88 deep-review cycle, runtime degradation policy clarification)

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/proposed-design-based-runtime-call-stack.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/runtime-call-stack-review.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/websocket/agent.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/domain/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/graphql/types/agent-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/startup/cache-preloader.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/agentRunConfigStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/types/agent/AgentRunConfig.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/agentRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/graphql/queries/runHistoryQueries.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/graphql/queries/llm_provider_queries.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/graphql/mutations/llm_provider_mutations.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/generated/graphql.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/llmProviderConfig.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/runOpen/runOpenCoordinator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/__tests__/agentRunStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web codegen`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web exec vitest --run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts stores/__tests__/agentRunConfigStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/runHistoryStore.spec.ts types/agent/__tests__/AgentRunConfig.spec.ts types/agent/__tests__/AgentContext.spec.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/run-history/run-history-graphql.e2e.test.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts build:full`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest run tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts tests/integration/agent/agent-websocket.integration.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts`
- `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/run-history/run-history-graphql.e2e.test.ts`
- `AUTOBYTEUS_SERVER_HOST=http://localhost:8011 AUTOBYTEUS_NODE_DISCOVERY_ENABLED=false node dist/app.js --host 0.0.0.0 --port 8011` (startup smoke; no `--data-dir`)
- `POST http://127.0.0.1:8000/graphql` introspection (`SendAgentUserInputInput`, `ContinueRunInput`, `RunManifestConfigObject`)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/streaming/events/stream-events.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/streaming/segments/segment-events.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/events/notifiers.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`
- `https://developers.openai.com/codex/app-server` (v2 method reference: `turn/started`, `turn/completed`, `turn/diffUpdated`, `item/*`, `error`)
- `https://developers.openai.com/codex/app-server` (validated this round: `thread/read`, `thread/list`, `model/list` includes `reasoningEffort` + `defaultReasoningEffort`)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/unit/run-history/services/run-history-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts tests/unit/run-history/services/run-history-service.test.ts`
- `git diff origin/enterprise..personal -- src/services/agent-streaming/agent-team-stream-handler.ts`
- `git diff --name-status origin/enterprise..personal -- src tickets/codex-runtime-server-owned-redesign`

## Key Findings

1. Ticket baseline and artifact state
- The Codex runtime redesign ticket exists in `tickets/codex-runtime-server-owned-redesign` with design/call-stack/review artifacts.
- Mandatory workflow artifacts for continuation work were missing: `investigation-notes.md` and `requirements.md`.

2. Personal vs enterprise architectural drift that affects this ticket
- `personal` removed enterprise distributed team ingress/event aggregation logic from `agent-team-stream-handler`.
- `enterprise` team flow previously used approval-token-based command ingress (`extractToolApprovalToken`, distributed ingress services).
- `personal` team flow now routes approvals directly via payload fields (`invocation_id` + `agent_name`/`target_member_name`/`agent_id`) to `team.postToolExecutionApproval(...)`.

3. Ticket mismatch identified
- Current ticket design/call-stack still modeled enterprise-style token-based team approval routing in UC-005.
- This mismatch appears in:
  - `proposed-design.md` (`C-012` note, `RuntimeCommandContext.approvalToken`, token-based error handling, open question wording).
  - `proposed-design-based-runtime-call-stack.md` (UC-005 token extraction and token-resolution path).

4. Areas still aligned with personal baseline
- `AgentInstanceManager` still owns local runtime creation/restore.
- `STOP_GENERATION` is still a no-op in streaming handlers.
- `/ws/agent/:agentId` route still drops pre-connect messages silently (supports the `SESSION_NOT_READY` target gap).
- GraphQL model listing and cache preload still call `LlmModelService` directly (supports runtime model catalog migration goals).

5. Re-investigation finding from deep review
- UC-005 in the ticket was updated away from approval tokens, but still modeled only `targetMemberName`.
- Personal branch currently accepts team approval routing identities from `agent_name`, `target_member_name`, or `agent_id` for approval dispatch.
- The call stack/design needed one more alignment write-back so future runtime ingress does not accidentally narrow supported team-approval identity inputs.

6. Core-event sufficiency finding from deep review
- A fresh deep review against Codex App Server notifications (turn/item/error method streams) showed the core library has enough primitives, but the ticket lacked an explicit compatibility contract.
- Evidence in `autobyteus-ts`:
  - `StreamEventType` provides 17 runtime-facing event primitives, including assistant delta/complete, status, tool approval lifecycle, tool execution lifecycle, todo updates, artifact updates, error, and generic `SEGMENT_EVENT`.
  - `SegmentType` provides 7 segment channels (`TEXT`, `TOOL_CALL`, `WRITE_FILE`, `EDIT_FILE`, `RUN_BASH`, `REASONING`, `MEDIA`) that can represent command/file-change/reasoning deltas.
- Evidence in Codex App Server docs:
  - current notifications are method-based (`turn/started`, `turn/completed`, `turn/diffUpdated`, `turn/taskProgressUpdated`, `item/outputText/delta`, `item/reasoning/delta`, `item/plan/delta`, `item/commandExecution/*`, `item/fileChange/*`, `error`).
- The gap was not missing core event types, but missing explicit design/use-case coverage that maps Codex App Server notification methods to these core/runtime envelopes and defines fallback behavior for unmapped methods.

7. Re-investigation finding from this round
- The ticket currently documents compatibility mainly as abstract `turn.*`/`item.*` families and old approval event naming.
- Current Codex App Server docs define method-level notifications (slash paths) and explicit approval-request methods (`item/commandExecution/requestApproval`, `item/fileChange/requestApproval`).
- Design/call-stack needed one more write-back to prevent method-name drift and ensure deterministic mapper behavior for both canonical methods and legacy aliases.

8. Frontend runtime-selection requirement gap (new blocker)
- Backend GraphQL already supports runtime selection fields:
  - `SendAgentUserInputInput.runtimeKind`
  - `ContinueRunInput.runtimeKind`
  - `RunManifestConfigObject.runtimeKind` and `runtimeReference`
- Frontend run configuration UI does not expose any runtime selector in agent run form.
- Frontend state models do not carry runtime kind:
  - `AgentRunConfig` has no `runtimeKind`.
  - `agentRunConfigStore` template has no `runtimeKind`.
- Frontend send/continue orchestration does not pass runtime kind because config type has no field.
- Frontend GraphQL query shape for resume config does not request `runtimeKind`/`runtimeReference`.
- Frontend generated GraphQL types are stale relative to current backend schema and omit runtime fields:
  - `SendAgentUserInputInput` missing `runtimeKind`.
  - `ContinueRunInput` missing `runtimeKind`.
  - `RunManifestConfigObject` missing `runtimeKind` and `runtimeReference`.

9. Runtime selection location answer (current behavior)
- In current UI, there is no runtime selector in the run configuration panel; users cannot choose runtime before pressing `Run Agent`.
- Current behavior therefore silently defaults to server-side default runtime for new runs.

10. Backend startup profile clarification from live run
- The currently running backend process is using file persistence profile (`PERSISTENCE_PROVIDER=file` from project `.env`) and project-local data path.
- It is not using the sqlite DB path from the failed manual startup command that force-set `PERSISTENCE_PROVIDER=sqlite`.
- Forcing sqlite in current environment still fails during `prisma migrate deploy` with schema-engine error (separate environment issue, not runtime-selector UI issue).

11. Re-investigation closure on frontend parity (this round)
- Runtime selector is now present in the agent run configuration form and defaults to `autobyteus`.
- Runtime kind now propagates through:
  - run-config state (`AgentRunConfig.runtimeKind`),
  - continue-run mutation payload (`runtimeKind`),
  - resume-config query/hydration (`runtimeKind`, `runtimeReference`),
  - runtime-scoped model catalog query/reload variables (`runtimeKind`).
- Generated frontend GraphQL types were regenerated and now include runtime fields for send/continue/resume/model-catalog operations.
- Focused frontend tests and real backend e2e runtime/run-history GraphQL tests pass for this scope.

12. Runtime transport implementation status clarification (this round)
- `codex-app-server-runtime-adapter.ts` is concrete and delegates to `codex-app-server-runtime-service.ts` for create/restore/send/approve/interrupt/terminate.
- `codex-runtime-model-provider.ts` is concrete and serves runtime-scoped model discovery via real `model/list`.
- Live e2e (`RUN_CODEX_E2E=1`) confirms real transport behavior through GraphQL create/continue/terminate flow.
- The phrase "Runtime not configured until adapter transport implementation is added" is stale artifact text in ticket docs, not current runtime code behavior.
- Server startup smoke without `--data-dir` succeeded on `http://localhost:8011` with project-local data directory and no runtime-reference initialization crash.

13. Re-investigation finding from latest deep-review round
- Ticket artifacts (`proposed-design.md`, `proposed-design-based-runtime-call-stack.md`) still referenced several stream orchestration/reconnect modules that do not exist in personal branch implementation (`runtime-run-stream-orchestrator`, `runtime-event-subscriber-hub`, `runtime-event-catchup-service`, `runtime-event-sequence-ledger`, `runtime-event-envelope-normalizer`).
- This was a blocking document-to-code parity issue: requirements/design/call-stack were not aligned to implemented boundaries even though runtime behavior was working.
- Write-back action completed:
  - `proposed-design.md` updated to `v24` with actual implemented module boundaries and workflows.
  - `proposed-design-based-runtime-call-stack.md` updated to `v25` with real file/function flow and fallback/error paths.
  - `runtime-call-stack-review.md` recorded round `55` fail + rounds `56-57` clean confirmation.

14. Re-investigation finding from current deep-review round
- Backend and frontend invariant drift was discovered for reopened runs:
  - backend continuation rejects runtime changes for existing runs (`Runtime kind cannot be changed for an existing run.`),
  - frontend reopened-run config still allowed runtime selector changes before send.
- Resolution implemented:
  - backend resume contract now exposes `editableFields.runtimeKind=false`,
  - frontend run config panel locks runtime selector when `editableFields.runtimeKind` is false.
- Additional integration finding:
  - web codegen schema source is live backend URL based; after schema change, codegen initially failed until backend with updated schema was running.
  - verification now runs codegen with explicit `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:8011/graphql` against updated backend.

15. Re-investigation finding from latest deep-review round
- Terminate lifecycle behavior is implemented and tested in both backend and frontend, but it was not explicitly represented as a dedicated use case in future-state runtime call stacks.
- This created a planning/coverage blind spot: stop-generation interrupt was modeled, but full terminate lifecycle (runtime/local shutdown + history state update + failure handling) was implicit only.
- Resolution: introduced explicit UC-012 coverage in requirements/design/call-stack/review artifacts and aligned terminate-focused verification set.

16. Re-investigation finding from current deep-review round
- Reopen/reconnect live-handoff behavior is implemented (`runOpenCoordinator` + `decideRunOpenStrategy`) and tested, but it was not explicitly represented as a dedicated use case in future-state runtime call stacks.
- This created another planning/coverage blind spot: replay/handoff correctness (preserve subscribed live context vs hydrate projection) was implicit under broader frontend runtime-selector flow.
- Resolution: introduced explicit UC-013 coverage in requirements/design/call-stack/review artifacts and aligned open-run strategy verification mapping.

17. Re-investigation finding from current deep-review round
- Runtime alias-normalization parity is inconsistent between streaming and persistence layers:
  - `RuntimeEventMessageMapper` normalizes alias-form methods before websocket branching,
  - `RunHistoryService.onRuntimeEvent(...)` derives lifecycle status from raw method values and does not normalize aliases.
- This can cause lifecycle persistence drift when alias-form methods are emitted (`turn.started`, `turn.completed`): websocket state appears correct, but run-history status may remain stale.
- Resolution: UC-014/C-053 implemented by introducing `codex-runtime-method-normalizer`, wiring mapper + run-history service to shared canonicalization, and adding alias-parity tests plus run-history GraphQL e2e verification.

18. Re-investigation finding from current deep-review round
- Codex event adaptation concern drift was still present in runtime streaming:
  - Codex method mapping lived directly inside `runtime-event-message-mapper` (generic mapper), not behind a dedicated Codex adapter boundary.
  - Codex text/reasoning notifications emitted `ASSISTANT_CHUNK` payloads, but frontend streaming dispatch path no longer handled `ASSISTANT_CHUNK` message type.
  - Frontend segment handler dropped content when `SEGMENT_CONTENT` arrived before corresponding `SEGMENT_START` (`Segment not found for content event`).
- This produced runtime UX errors observed in live UI logs:
  - `Unhandled message type: ASSISTANT_CHUNK`
  - `Segment not found for content event: <id>`
- Resolution implemented in this round:
  - Added dedicated server-side adapter: `src/services/agent-streaming/codex-runtime-event-adapter.ts`.
  - Kept `RuntimeEventMessageMapper` as generic boundary and delegated Codex-specific logic to the adapter.
  - Converted Codex text/reasoning paths to segment-first envelopes (`SEGMENT_CONTENT`/`SEGMENT_END`) with deterministic ids and deltas.
  - Added deterministic frontend fallback: `handleSegmentContent` now auto-creates a text segment when content arrives before start.

19. Re-investigation finding from workflow re-entry round
- Live UI warnings can be reproduced when server runs stale `dist/` output after source updates:
  - stale compiled mapper still emitted old `ASSISTANT_CHUNK` behavior for Codex `item/outputText/*`,
  - rebuilt `dist` includes `codex-runtime-event-adapter` delegation and segment-first mapping.
- Root cause in this case was operational build parity, not architecture drift in source.
- Validation:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts run build:full`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web exec vitest --run services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`

20. Re-investigation finding from architecture-cleanup round
- Frontend still contained explicit `ASSISTANT_CHUNK` handling even after Codex adapter separation, which keeps runtime-specific compatibility logic in UI streaming code.
- Backend generic mapper also still emitted `ASSISTANT_CHUNK` for core stream events (`StreamEventType.ASSISTANT_CHUNK`), creating pressure to keep frontend chunk handlers.
- This violates the target architecture principle for this ticket: runtime-specific and legacy-shape normalization should terminate in backend streaming boundaries.
- Resolution implemented in this round:
  - `RuntimeEventMessageMapper` now normalizes core assistant chunk events into segment-first websocket envelopes (`SEGMENT_CONTENT` with deterministic `id`, `delta`, `segment_type`).
  - Frontend `ASSISTANT_CHUNK` dispatch/handler paths were removed from streaming services and protocol typings.
  - Existing frontend segment-content fallback remains as generic transport-order hardening, not runtime-specific compatibility.
- Validation:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web exec vitest --run services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts`

21. Re-investigation finding from this round
- Core runtime production path is now segment-first and does not emit assistant-chunk notifier events:
  - `LLMUserMessageReadyEventHandler` emits `notifyAgentSegmentEvent(...)` for stream deltas.
  - `notifyAgentDataAssistantChunk(...)` has no in-repo production call sites (only legacy notifier API/tests).
- Backend still carried a legacy defensive `StreamEventType.ASSISTANT_CHUNK` mapping branch and `ServerMessageType.ASSISTANT_CHUNK` enum member.
- This was dead compatibility surface and design drift under the no-legacy policy.
- Resolution implemented in this round:
  - removed backend `ASSISTANT_CHUNK` message type from websocket protocol enum,
  - removed `StreamEventType.ASSISTANT_CHUNK` mapping/state logic from `RuntimeEventMessageMapper`,
  - updated mapper/unit+integration tests to use segment-event canonical flow.
- Validation:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts run build:full`

22. Re-investigation finding from current round
- Tool-lifecycle payload contract drift remained in Codex runtime event adaptation:
  - frontend parsers require canonical fields (`invocation_id`, `tool_name`, `arguments`, `tool_invocation_id`, `log_entry`, `result`/`error`),
  - Codex adapter previously forwarded mainly raw serialized payload for several `item/commandExecution/*` branches.
- Impact:
  - tool approval/execution UI can warn or drop updates when canonical fields are absent.
- Resolution implemented in this round:
  - normalized command/file-approval payload mapping in `codex-runtime-event-adapter.ts`,
  - added canonical extraction for invocation id, tool name, arguments, log entry, result, and error,
  - expanded mapper unit tests to assert canonical payload keys for command/file approval paths.
- Validation:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`

23. Re-investigation finding from current round
- Codex run continuation is supported, but history projection fidelity is still incomplete for Codex-native session replay:
  - run reopen/hydration conversation is sourced from local memory-view projection (`RunProjectionService`),
  - Codex-native thread history is not currently loaded into that projection path.
- Impact:
  - user can continue a restored Codex thread, but reopened historical conversation may be partial/incomplete if local raw traces do not fully mirror Codex thread history.
- Evidence:
  - server projection path: `run-history/services/run-projection-service.ts`,
  - GraphQL projection resolver: `api/graphql/types/run-history.ts:getRunProjection(...)`,
  - Codex docs expose history-capable APIs (`thread/read` with `includeTurns`, `thread/list`) that are not yet used in this projection path.

24. Re-investigation finding from current round
- Runtime reference durability improved:
  - `RunHistoryService.onRuntimeEvent(...)` now updates manifest `runtimeReference.threadId` when runtime payload carries a newer thread id (`threadId`, `thread_id`, or `thread.id`).
- Impact:
  - reduces resume drift when Codex runtime rotates/updates thread ids at runtime.
- Validation:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/unit/run-history/services/run-history-service.test.ts`

25. Re-investigation finding from current round
- Projection separation-of-concern drift remains for history replay:
  - `RunProjectionService` is currently a direct local-memory view wrapper,
  - runtime-specific replay logic is not isolated behind runtime projection providers (unlike model catalog/provider architecture).
- Impact:
  - Codex history replay cannot evolve cleanly without adding runtime branching into generic projection service.
- Resolution direction (design write-back only in this round):
  - introduce runtime-projection provider boundary (`provider port` + `registry` + `codex provider` + `local fallback provider`),
  - keep GraphQL/frontend contract unchanged.

26. Re-investigation finding from current round
- Codex thinking metadata/config parity is incomplete end-to-end:
  - Codex `model/list` exposes reasoning capability metadata (`reasoningEffort`, `defaultReasoningEffort`),
  - current Codex model provider does not map these into model display labels/config schema,
  - `AgentRunConfigForm` currently displays `modelIdentifier` instead of backend `name`,
  - Codex send-turn payload sets `effort: null` and does not consume persisted `llmConfig.reasoning_effort`.
- Impact:
  - user cannot see Codex reasoning-level hint in model selection,
  - selected thinking effort in config does not affect Codex runtime behavior.
- Resolution direction (design write-back only in this round):
  - add UC-017 with two implementation slices:
    - model metadata/schema labeling (`C-059`),
    - send-turn effort propagation (`C-060`).

27. Re-investigation finding from current round
- Planned `C-060` boundary was slightly over-scoped for separation of concerns:
  - design implied widening generic runtime send-turn contracts for reasoning effort propagation,
  - but `llmConfig` already enters runtime at create/restore boundaries and is persisted in run manifest.
- Impact:
  - pushing Codex-specific config through generic send-turn ingress would increase cross-runtime coupling with no behavioral gain.
- Resolution direction (design write-back only in this round):
  - keep `RuntimeSendTurnInput` runtime-agnostic,
  - normalize/store Codex `reasoning_effort` in Codex session defaults during create/restore,
  - apply session-default effort at `turn/start` dispatch.

28. Re-investigation finding from current round
- Use-case granularity was still too coarse for implementation traceability:
  - UC-016/UC-017 each combined multiple concerns (history transformation rules, metadata normalization, lifecycle effort application).
- Impact:
  - deep-review pass/fail could not precisely map which sub-concern was incomplete,
  - implementation planning had weaker per-slice acceptance traceability.
- Resolution direction (design write-back only in this round):
  - introduce detailed architecture-level use-case slices:
    - UC-018: history transformation completeness,
    - UC-019: model metadata normalization completeness,
    - UC-020: reasoning-effort lifecycle parity,
  - map each slice to explicit future-state call stack sections and plan verification.

29. Re-investigation finding from current round
- Missing use-case coverage remained for reopen reasoning-config/schema drift:
  - current high-level use cases covered reasoning metadata + effort lifecycle, but did not explicitly model what happens when persisted reasoning config becomes incompatible with updated schema.
- Impact:
  - reconciliation behavior risked being implemented ad-hoc across UI/store/runtime paths,
  - weaker SoC enforcement for schema-driven frontend behavior.
- Resolution direction (design write-back only in this round):
  - add UC-021 for reopen reasoning-config reconciliation,
  - keep reconciliation schema-driven and runtime-agnostic in frontend,
  - keep backend/runtime as schema source of truth and runtime effort normalizer.

30. Re-investigation finding from current round
- User clarification request exposed ambiguous wording around Codex `turn/start.effort` behavior.
- Current code uses `effort: null` in Codex send-turn path, which means:
  - no explicit reasoning-effort override is sent to Codex App Server,
  - persisted/selected reasoning effort is currently not applied at turn dispatch (pending C-060).
- Additional missing use-case coverage found:
  - continuation-source semantics for model/thinking config were implicit in UC-003 but not explicitly represented as a dedicated parity use case.
- Resolution direction (design write-back only in this round):
  - add UC-022 for continuation manifest source-of-truth,
  - explicitly document `effort:null` semantics as pending gap under C-060.

31. Re-investigation finding from current round
- Runtime capability gating is not yet modeled as a first-class architecture concern even though runtime selection is now UI-visible.
- Current risk pattern:
  - frontend can expose `codex_app_server` as selectable even when environment/runtime capability is unavailable,
  - failures are deferred to runtime execution/transport stage instead of deterministic preflight capability checks.
- Separation-of-concern implication:
  - runtime availability should stay backend-owned as capability metadata; frontend should render/filter from backend capability contract, not local runtime-specific checks.
- Resolution direction (design write-back only in this round):
  - add UC-023 for runtime capability gating parity,
  - add planned change `C-061` for runtime capability service + GraphQL exposure + frontend selector gating,
  - keep command ingress as fail-fast guard for unavailable runtime kinds.

32. Re-investigation finding from current round
- The UC-023 capability design was still too coarse: a single global `assertRuntimeAvailable` gate at ingress can unintentionally block safety/read flows during runtime outages.
- Risk cases:
  - `terminateRun` could be rejected when runtime is unavailable, preventing deterministic cleanup,
  - projection/history-open read paths could become coupled to command-plane capability state,
  - degraded sessions can remain stale if cleanup is blocked by availability checks.
- Separation-of-concern implication:
  - capability must be operation-scoped (`send/approve` vs `interrupt/terminate` vs read-plane) with explicit degraded semantics.
- Resolution direction (design write-back only in this round):
  - add UC-024 for runtime degradation command/read policy parity,
  - add planned change `C-062` for operation-scoped capability policy boundary in ingress/service layer,
  - keep backend as source of truth for degraded reasons and policy decisions.

## Constraints

- Feature design must be based on `personal` branch runtime/streaming contracts, not enterprise distributed contracts.
- No backward-compatibility wrappers should be introduced in design artifacts for deprecated enterprise-only token paths.
- Existing run-history and websocket contracts in `personal` remain the authoritative baseline for target-state deltas.

## Open Questions

1. Team runtime selector follow-up
- Team run creation flow still has no runtime-kind input in team GraphQL contracts; this remains a follow-up ticket.

2. Default runtime UX extension
- Agent flow now defaults explicitly to `autobyteus`; follow-up question is whether future team/runtime presets should be workspace-aware.

3. Codex app server approval contract detail
- For direct team approval routing, is adapter identity keyed by `(runId, invocationId, approvalTarget)` sufficient for idempotent approval outcomes?

4. Team scope in this ticket
- Should team-level Codex execution remain in scope for phase 1 of this server-owned runtime adapter redesign, or be staged after single-agent path completion?

5. Runtime capability gating follow-up
- Runtime adapter registry currently wires both `autobyteus` and `codex_app_server` providers by default.
- Follow-up decision needed: exact capability contract shape for runtime selector UX (`hidden` vs `disabled-with-reason`), while keeping backend as source of truth.

6. Codex history replay source of truth
- Should reopened run conversation for `codex_app_server` be sourced from:
  - local memory projection only, or
  - Codex `thread/read`/`thread/list` primary with local memory fallback?
- This decision affects API boundaries and runtime/read latency budget.

7. Codex reasoning label semantics
- When model metadata provides both `reasoningEffort` choices and `defaultReasoningEffort`, should selector label show:
  - only default level, or
  - full set of supported levels?
- This affects concise UI wording in model dropdown.

## Implications For Requirements/Design

- Requirements must explicitly lock UC-005 to personal direct approval routing (not approval tokens).
- Proposed design and runtime call stack must remove token-resolution assumptions and replace them with invocation/member-target resolution compatible with `personal` handler contracts.
- Proposed design and runtime call stack must preserve personal member-identity resolution breadth (`agent_name` / `target_member_name` / `agent_id`) instead of modeling only one identity field.
- Requirements/design/call-stack need an explicit core-event compatibility use case to prove Codex App Server notification methods are fully representable with current core/runtime event primitives and are never silently dropped.
- Requirements/design/call-stack must encode method-level Codex compatibility (canonical slash methods) plus legacy alias normalization before mapping decisions.
- Design must include an explicit event/data workflow section so ingress, normalization, persistence, mapping, replay, and fanout boundaries are implementation-unambiguous.
- Runtime call stack review must record this as a new blocking finding and require two consecutive clean rounds after write-back before reconfirming `Go`.
- Requirements now include frontend runtime selector visibility/persistence for agent run creation path in this phase.
- Design/call-stack must include the explicit frontend data workflow: UI selector -> run-config store -> runtime-scoped model fetch -> GraphQL payload/query (`runtimeKind`) -> backend runtime ingress/resume.
- Frontend GraphQL artifacts must remain regenerated whenever runtime schema fields change, preventing compile-time omission.
- Future-state runtime artifacts must only reference modules present in personal branch codebase; speculative/non-existent module design paths are not acceptable once implementation exists.
- Requirements/design must encode runtime immutability as a first-class resume/edit contract (`editableFields.runtimeKind`) so frontend and backend invariants cannot drift.
- Future-state use-case inventory must include distinct lifecycle termination semantics (not only interrupt/stop-generation) to keep integration/e2e planning complete.
- Future-state use-case inventory must also include reconnect/live-handoff semantics as a distinct branch to preserve active subscribed context integrity during reopen flows.
- Requirements/design/call-stack must include runtime-status alias parity as an explicit use case so websocket mapping and run-history lifecycle persistence remain behaviorally consistent.
- Requirements/design/call-stack must include a dedicated Codex runtime event-adapter boundary and explicit backend chunk-to-segment normalization so frontend runtime streaming stays segment-first and minimal.
- Verification and runbook steps must keep source-to-dist parity explicit when launching via `node dist/app.js`; otherwise stale compiled artifacts can appear as false architecture regressions.
- Requirements/design/call-stack must treat `SEGMENT_EVENT` as the canonical core streaming contract and remove backend legacy `ASSISTANT_CHUNK` mapping/type surface from steady-state runtime architecture.
- Requirements/design/call-stack must add an explicit Codex history-hydration use case that defines how `thread/read` history is projected into frontend conversation replay without introducing runtime-specific frontend event handling.
- Requirements/design/call-stack must add an explicit Codex thinking-parity use case that keeps frontend generic (schema-driven) while backend handles runtime-specific metadata mapping and turn payload adaptation.
- Requirements/design/call-stack should keep per-turn ingress contracts runtime-agnostic by resolving runtime-specific reasoning effort at runtime session boundaries (create/restore), not generic send-turn command payloads.
- Requirements/design/call-stack should include detailed sub-slice use cases (transformation, normalization, lifecycle) when a single high-level use case spans multiple concerns, so SoC review and test planning stay precise.
- Requirements/design/call-stack should also include explicit reopen reconciliation use cases when persisted config can drift from current runtime schema, to prevent mixed logic and preserve schema-driven separation boundaries.
- Requirements/design/call-stack should explicitly model continuation source-of-truth for model/thinking config (manifest vs override policy), so continuation behavior remains deterministic and testable.
- Requirements/design/call-stack should explicitly model runtime capability gating so optional runtimes can be enabled/disabled without leaking runtime-specific availability logic into frontend.
- Requirements/design/call-stack should explicitly model operation-scoped degradation policy so capability gating does not block terminate/cleanup/read flows.
