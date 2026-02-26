# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Cross-cutting backend changes across runtime execution, websocket streaming, run-history manifests, GraphQL model APIs, and startup preloading.
  - Requires both unit and integration coverage to lock behavior for runtime command ingress and streaming.
- Workflow Depth:
  - `Medium` -> proposed design doc -> proposed-design-based runtime call stack -> runtime call stack review (minimum 3 rounds) -> implementation plan -> progress tracking

## Plan Maturity

- Current Status: `Implementation Complete (Post-Round-92 deep-review sync)`
- Notes:
  - Runtime call stack review gate is `Go Confirmed` at round `92` after consecutive clean rounds (`91`, `92`) post C-058..C-062 implementation write-back.
  - Earlier blocking fix (`F-036`) remains resolved by `C-057` and verification is green.
  - `F-037`, `F-038`, `F-043`, and `F-044` are implementation-complete (`C-058..C-062`) and review-closed.
  - UC-021/UC-022 acceptance-depth validation now includes schema-driven config sanitization tests and continuation manifest source-of-truth + active-override parity e2e coverage.

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: `Yes`
- All in-scope use cases reviewed: `Yes (UC-001..UC-024)`
- No unresolved blocking findings: `Yes`
- Minimum review rounds satisfied: `Yes (Medium >= 3, current 92)`
- Final gate decision in review artifact (`Implementation can start`): `Yes (Go Confirmed)`

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 92 | UC-001..UC-024 | `tickets/codex-runtime-server-owned-redesign/proposed-design-based-runtime-call-stack.md` | `tickets/codex-runtime-server-owned-redesign/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: `92`
  - Final review round: `92`
  - Final review gate line (`Implementation can start`): `Yes (Go Confirmed)`

## Principles

- Bottom-up dependency order (foundations before handlers/routes/resolvers).
- Tests with each slice:
  - Unit tests for services/mappers/policies.
  - Integration tests for websocket and GraphQL/runtime flows.
- Integration tests should avoid mocks where practical; prefer in-process fake runtime components and real route/graphql execution.
- No backward-compatibility wrappers for enterprise-only paths.
- Progress file is updated at each file/test status transition.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `src/runtime-management/runtime-kind.ts` | None | Canonical runtime selector used by all runtime layers. |
| 2 | `src/runtime-execution/runtime-adapter-port.ts` | 1 | Shared runtime contracts before concrete adapters/services. |
| 3 | `src/runtime-execution/runtime-session-store.ts` | 1,2 | Runtime session lookup needed by ingress/stream handlers. |
| 4 | `src/runtime-execution/adapters/autobyteus-runtime-adapter.ts` | 1,2 | Baseline adapter for current behavior parity. |
| 5 | `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | 1,2 | Codex adapter boundary and transport surface. |
| 6 | `src/runtime-execution/runtime-adapter-registry.ts` | 1,2,4,5 | Runtime resolution boundary for composition/ingress. |
| 7 | `src/runtime-execution/runtime-composition-service.ts` | 3,6 | Runtime create/restore centralization. |
| 8 | `src/runtime-execution/runtime-command-ingress-service.ts` | 3,6 | Canonical send/interrupt/approval command path. |
| 9 | `src/run-history/domain/models.ts` + `src/run-history/services/runtime-manifest-migration-service.ts` + `src/run-history/services/active-run-override-policy.ts` | 1 | Runtime metadata persistence + continuation policy. |
| 10 | `src/run-history/services/run-continuation-service.ts` | 7,8,9 | Continuation flow migration to runtime architecture. |
| 11 | `src/services/agent-streaming/runtime-event-message-mapper.ts` | 1,2 | Event-method compatibility mapping contract. |
| 12 | `src/services/agent-streaming/agent-stream-handler.ts` + `src/services/agent-streaming/agent-team-stream-handler.ts` + `src/api/websocket/agent.ts` | 8,11 | Runtime ingress + pre-connect policy + event mapping adoption. |
| 13 | `src/runtime-management/model-catalog/*` + `src/api/graphql/types/llm-provider.ts` + `src/startup/cache-preloader.ts` | 1,6 | Runtime-scoped model APIs and preload path closure. |
| 14 | Legacy cleanup checks (`grep`/`rg` gates) + docs/progress sync | 10..13 | Verify decommission rules and record completion status. |
| 15 | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` + `autobyteus-web/stores/{agentRunConfigStore,agentRunStore,llmProviderConfig,runHistoryStore}.ts` + `autobyteus-web/services/runOpen/runOpenCoordinator.ts` + `autobyteus-web/graphql/{queries,mutations}/*` + `autobyteus-web/generated/graphql.ts` | 1,10,13 | Close UC-010 by explicit frontend runtime selector + runtimeKind propagation parity for launch/continue/resume/model-catalog paths. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001..C-008 | Add | T1-T8 | No | Unit tests for runtime kind/registry/session/ingress; typecheck |
| C-009..C-013 | Modify | T9-T12 | No | Unit + websocket integration tests |
| C-014..C-017 | Modify/Add | T9-T10 | No | Run-history GraphQL e2e + continuation tests |
| C-018..C-024 | Add/Modify/Remove | T13 | Yes (`C-024`) | Resolver tests + startup preload tests + grep gate |
| C-048 | Modify | T11-T12 | No | Mapper unit tests + websocket integration tests |
| C-049 | Modify | T38 | No | Frontend unit/integration-style store/component tests + GraphQL codegen parity |
| C-050 | Modify | T39 | No | Resume editable-field contract + runtime lock UI tests + codegen sync |
| C-051 | Modify | T40 | No | Terminate lifecycle use-case coverage mapping + terminate-path verification |
| C-052 | Modify | T41 | No | Reconnect/live-handoff use-case coverage mapping + open-run strategy verification |
| C-053 | Add/Modify | T42 | No | Run-history alias-form lifecycle parity tests + mapper/run-history normalization boundary consistency |
| C-054 | Add | T43 | No | Codex adapter unit tests + websocket integration/e2e streaming parity verification |
| C-055 | Modify | T44 | No | Frontend streaming handler tests for chunk-path decommission and out-of-order segment recovery |
| C-056 | Modify/Remove | T45 | Yes | Backend mapper/protocol tests for assistant-chunk compatibility path decommission |
| C-057 | Modify | T46 | No | Mapper unit tests for canonical Codex tool lifecycle payload fields and run-history thread-id update coverage |
| C-058 | Add/Modify | T47 | No | Runtime-projection provider architecture + Codex thread-history hydration tests validating fallback behavior |
| C-059 | Modify | T48 | No | Codex model metadata mapping tests (reasoning labels/defaults -> config schema/display name) and frontend selector render parity tests |
| C-060 | Modify | T49 | No | Codex send-turn effort propagation tests from persisted `llmConfig.reasoning_effort` via session defaults across create/restore/continue |
| C-061 | Add/Modify | T50 | No | Runtime capability metadata query + frontend selector gating + ingress runtime-availability fail-fast tests |
| C-062 | Add/Modify | T51 | No | Operation-scoped capability policy tests (send/approve fail-fast; terminate best-effort; read-plane unaffected) |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Direct runtime-path `LlmModelService` usage in GraphQL/startup (`C-024`) | Remove | Replace with runtime model catalog service; run grep gate over resolver/startup | Missed callsites could reintroduce dual-source behavior. |
| T-DEL-002 | Silent pre-connect message drop in websocket agent/team routes | Remove | Emit explicit `SESSION_NOT_READY` protocol error payload | Client behavior may depend on previous silent drop; integration tests lock new behavior. |

## Step-By-Step Plan (Execution Record)

1. Completed: implemented runtime foundations (`runtime-kind`, adapter port, adapters, registry, session store, composition, command ingress).
2. Completed: implemented run-history runtime metadata + migration + active override policy and migrated continuation flow.
3. Completed: implemented runtime event mapper with Codex method mapping + alias normalization + non-silent fallback.
4. Completed: rewired agent/team stream handlers and websocket route to runtime ingress + pre-connect deterministic error policy.
5. Completed: implemented runtime model catalog and rewired GraphQL/startup model paths away from direct runtime-path `LlmModelService` usage.
6. Completed: added/expanded unit + integration + e2e coverage, including live `RUN_CODEX_E2E=1` transport validation.
7. Completed: ran focused/full verification commands and updated progress artifacts.
8. Completed: implemented UC-010 frontend runtime selector/runtimeKind propagation and regenerated frontend GraphQL codegen.
9. Completed: implemented UC-011 runtime immutability parity (`editableFields.runtimeKind` + run config runtime lock) and synchronized schema/codegen validation workflow.
10. Completed: added UC-012 terminate lifecycle coverage in future-state artifacts and validated terminate behavior with backend/frontend focused tests.
11. Completed: added UC-013 reconnect/live-handoff coverage in future-state artifacts and validated open-run strategy behavior with focused frontend tests.
12. Completed: implemented UC-014 runtime-status alias parity (`C-053`) by introducing shared runtime-method normalizer usage in run-history status derivation and adding targeted alias-form lifecycle tests.
13. Completed: implemented UC-015 Codex adapter boundary + streaming contract strictness (`C-054`, `C-055`) by introducing dedicated Codex event adaptation, segment-first runtime envelopes, and out-of-order segment-content recovery.
14. Completed: implemented frontend-minimal cleanup (`C-056`) by decommissioning backend `ASSISTANT_CHUNK` mapper/protocol compatibility path and keeping frontend segment-first with no chunk dispatch/typing paths.
15. Completed: implemented tool-lifecycle payload normalization and runtime thread-id persistence hardening (`C-057`) with focused mapper/run-history unit coverage.
16. Completed: implemented UC-016 (`C-058`) with runtime-projection provider architecture so Codex thread history is hydrated into run projection with deterministic fallback to local projection.
17. Completed: implemented UC-017 (`C-059`) so Codex model metadata exposes reasoning labels/defaults and frontend selector renders backend display names.
18. Completed: implemented UC-017 (`C-060`) so Codex send-turn applies selected `llmConfig.reasoning_effort` to app-server `turn/start.effort`.
19. Completed: validated UC-018/UC-019/UC-020 acceptance with focused run-projection, model-metadata, and reasoning-effort lifecycle tests (unit + e2e evidence in progress log).
20. Completed: expanded UC-021 acceptance with schema-driven reopen reconciliation coverage by sanitizing persisted model config against active schema and adding focused frontend tests.
21. Completed: expanded UC-022 acceptance with continuation-manifest parity e2e tests for inactive-run manifest defaults and active-run override ignore reporting (`ignoredConfigFields`).
22. Completed: implemented UC-023 (`C-061`) so runtime capability metadata drives runtime selector availability and ingress/composition enforce deterministic runtime-unavailable fail-fast behavior.
23. Completed: implemented UC-024 (`C-062`) so capability policy is operation-scoped and does not block terminate/cleanup/read-plane behavior under runtime degradation.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `src/runtime-execution/*` | Runtime selection/command API implemented with strict typed contracts | New runtime service tests pass | Websocket integration sends/approvals/interrupts flow via ingress plus live Codex runtime e2e | Codex adapter now uses concrete `codex app-server` transport client/session service. |
| `src/run-history/*` (runtime migration + continuation) | Runtime fields persisted, migrated, validated, and used in continuation | Policy/migration tests pass | Run-history GraphQL continue/resume e2e passes | Old manifests must continue via migration path. |
| `src/services/agent-streaming/*` + `src/api/websocket/agent.ts` | Runtime ingress + mapping + pre-connect policy wired | Handler/mapper tests pass | Agent/team websocket integration tests pass | `SESSION_NOT_READY` asserted. |
| `src/runtime-management/model-catalog/*` + `src/api/graphql/types/llm-provider.ts` + `src/startup/cache-preloader.ts` | Runtime model catalog is sole runtime model listing/reload/preload path | Resolver/catalog unit tests pass | GraphQL integration path uses runtime catalog | Decommission grep gate required. |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` + `autobyteus-web/stores/{agentRunConfigStore,agentRunStore,llmProviderConfig,runHistoryStore}.ts` + `autobyteus-web/services/runOpen/runOpenCoordinator.ts` | Runtime selector visible in agent run form and runtimeKind propagates through launch/continue/resume/model-catalog flows | Frontend store/component tests pass | Backend runtime/run-history e2e contracts remain green with frontend codegen parity | Agent scope only for this phase; team runtime selector deferred. |
| `src/runtime-execution/codex-app-server/codex-runtime-method-normalizer.ts` + `src/run-history/services/run-history-service.ts` | Runtime method canonicalization is shared without cross-layer coupling and run-history lifecycle status is alias-safe | New unit tests cover alias/canonical status equivalence (`turn.started` == `turn/started`, `turn.completed` == `turn/completed`) | Existing run-history GraphQL e2e remains green after parity fix | Closes `UC-014` / `F-032`. |
| `src/services/agent-streaming/codex-runtime-event-adapter.ts` + `src/services/agent-streaming/runtime-event-message-mapper.ts` + `src/services/agent-streaming/models.ts` + `autobyteus-web/services/agentStreaming/{AgentStreamingService,TeamStreamingService}.ts` + `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Codex method mapping is isolated to dedicated adapter, backend protocol remains segment-first without legacy chunk message type, and frontend streaming remains segment-first with deterministic fallback | Adapter/mapper and frontend streaming tests pass | Agent/team websocket integration plus Codex runtime e2e stay green with no dropped-content path | Closes `UC-015` / `F-033` / `F-034` / `F-035`. |
| `src/run-history/projection/*` + `src/run-history/services/run-projection-service.ts` + `src/runtime-execution/codex-app-server/{codex-thread-history-reader,codex-app-server-runtime-service}.ts` + `src/api/graphql/types/run-history.ts` | Reopen projection for Codex runs hydrates conversation from Codex thread APIs through runtime-projection providers with deterministic local fallback and no frontend runtime-specific logic | New run-projection provider and Codex history transformer unit tests pass | Existing run-history GraphQL e2e + Codex e2e remain green with history replay assertions | Closes `UC-016` / `F-037`. |
| `src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts` + `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` + `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Codex model metadata exposes reasoning label/default schema and frontend selector shows backend display names without runtime-specific frontend branching | Model-provider/unit mapping tests + frontend selector render tests pass | Model list GraphQL integration remains green for codex runtime | Closes `UC-017` / `F-038` (part A). |
| `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` + `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | Codex send-turn applies persisted reasoning config (`reasoning_effort`) to turn payload for create/restore/continue flows via runtime session defaults | Adapter/runtime unit tests cover effort mapping + invalid-value normalization | Codex runtime e2e asserts turn-start effort parity | Closes `UC-017` / `F-038` (part B). |
| `src/runtime-management/runtime-capability-service.ts` + `src/api/graphql/types/runtime-capability.ts` + `src/runtime-execution/runtime-command-ingress-service.ts` + `autobyteus-web/stores/runtimeCapabilitiesStore.ts` + `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Backend publishes runtime capability metadata and frontend runtime selector is capability-driven; ingress blocks unavailable runtime kinds with deterministic errors | Capability service + ingress guard unit tests, frontend capability-store/component tests pass | GraphQL runtime-capability integration + run-launch unavailable-runtime rejection path pass | Closes `UC-023` / `F-043`. |
| `src/runtime-execution/runtime-capability-policy.ts` + `src/runtime-execution/runtime-command-ingress-service.ts` + `src/api/graphql/types/run-history.ts` + `autobyteus-web/stores/agentRunStore.ts` | Runtime degradation behavior is operation-scoped: write-plane commands fail fast, lifecycle safety commands are best-effort, read-plane remains available | Policy/ingress tests cover per-operation outcomes | Terminate/read-path integration tests verify degraded-mode determinism | Closes `UC-024` / `F-044`. |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `src/runtime-execution/runtime-command-ingress-service.ts` | `src/agent-execution/services/agent-instance-manager.ts` | Current agent runtime implementation is embedded in manager/factory | Adapter wraps manager without widening manager responsibilities | Move complete runtime creation/send/approval out of manager callsites | `Not Needed` | Codex |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Additional SoC drift discovered during implementation | Runtime code vs `UC-006` / `UC-009` call stack mismatch | `proposed-design-based-runtime-call-stack.md` + review | Pause implementation, write-back design/call-stack/review, then resume | Completed |

## Test Strategy

- Unit tests:
  - Runtime kind/registry/session store/composition/ingress.
  - Runtime manifest migration + active override policy.
  - Runtime event method mapper (`turn/*`, `item/*`, alias normalization, fallback/error).
  - Run-history runtime-method lifecycle derivation parity for canonical + alias forms.
  - Codex runtime-event adapter mapping (segment-first content/end for text/reasoning and deterministic fallback on unknown methods).
  - Runtime-projection provider registry and Codex thread-history projection transformer (Codex provider + local-memory fallback provider).
  - Codex model metadata mapping for reasoning labels/defaults -> `configSchema.reasoning_effort`.
  - Codex runtime send-turn effort mapping from `llmConfig.reasoning_effort`.
  - Runtime capability metadata mapping and runtime-availability guard behavior.
  - Operation-scoped capability policy behavior for degraded runtime states.
  - Frontend streaming handlers for segment-first flow and out-of-order `SEGMENT_CONTENT` recovery (no runtime-specific chunk bridge).
- Integration tests:
  - Agent websocket flow (`SEND_MESSAGE`, `STOP_GENERATION`, approvals, pre-connect errors).
  - Team websocket approval routing compatibility (`agent_name` / `target_member_name` / `agent_id`).
  - Terminate lifecycle (`terminateAgentInstance`) for local + runtime-backed runs, including frontend terminate UX/store behavior.
  - Reopen/reconnect live-handoff strategy (`KEEP_LIVE_CONTEXT` vs projection hydration), including non-clobber checks for subscribed active contexts.
  - Run-history GraphQL continue/resume with migrated manifests.
  - Run-history projection GraphQL for Codex history hydration with fallback path assertions.
  - Runtime model listing/reload GraphQL paths and startup preload.
  - Frontend model selector rendering parity (display backend model name labels for codex runtime).
  - Frontend runtime-selector run flow (component + run-store + run-history open-flow) with real GraphQL shapes after codegen.
  - Runtime streaming contract parity for Codex segment flow, including no-content-loss behavior when content arrives before start.
  - Runtime capability-gating parity for unavailable Codex runtime (`enabled=false` metadata path + fail-fast ingress error).
  - Runtime degradation parity where terminate/cleanup remain available while send/approve are blocked under outage.
- Verification commands:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts run test -- tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts run test -- tests/integration/agent/agent-websocket.integration.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts run test -- tests/e2e/run-history/run-history-graphql.e2e.test.ts`
  - `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts exec vitest --run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
  - `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:8011/graphql pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web codegen`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web exec vitest --run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts stores/__tests__/agentRunConfigStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts types/agent/__tests__/AgentRunConfig.spec.ts types/agent/__tests__/AgentContext.spec.ts`
