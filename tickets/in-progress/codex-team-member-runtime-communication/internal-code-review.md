# Internal Code Review

## Gate Status

- Stage: `5.5`
- Decision: `Pass`
- Date: `2026-02-27`
- Blocking Findings: `0`
- Re-Entry Required: `No`
- Review Criteria Baseline: `Hard check = 500 effective lines (updated per user direction)`

## Scope

- Reviewed changed source files under:
  - `autobyteus-server-ts/src/**`
  - `autobyteus-web/components/**`
  - `autobyteus-web/stores/**`
  - `autobyteus-web/types/**`
  - `autobyteus-web/graphql/**`
- Generated artifact handling:
  - `autobyteus-web/generated/graphql.ts` is generated output and excluded from SoC architectural judgment.

## Source File Audit

| File | Lines | Adds/Expands Functionality | `>300` SoC Check | `>500 Effective-Line Check` | Result |
| --- | ---: | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | 212 | Yes | N/A | N/A | Keep (resolver boundary only) |
| `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts` | 563 | Yes | Pass | Pass (runtime mutation orchestration extracted from resolver) | Keep |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | 157 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/run-history/domain/team-models.ts` | 100 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts` | 273 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | 323 | Yes | Pass | N/A | Keep |
| `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts` | 191 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts` | 248 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts` | 198 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | 127 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | 463 | Yes | Pass | Pass (service reduced below hard `500` threshold; now orchestration-only shell) | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-event-router.ts` | 322 | Yes | Pass | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-model-catalog.ts` | 104 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts` | 68 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-shared.ts` | 65 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-send-message-tooling.ts` | 298 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-launch-config.ts` | 87 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts` | 48 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-json.ts` | 9 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts` | 57 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts` | 102 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/runtime-capability-policy.ts` | 58 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts` | 213 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | 476 | Yes | Pass | Pass (existing large module; codex-member branch isolated) | Keep |
| `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | 339 | Yes | Pass | Pass (adapter reduced to orchestration shell) | Keep |
| `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-segment-helper.ts` | 534 | Yes | Pass | Pass (single concern: segment normalization and message assembly helpers, now including metadata argument projection hook) | Keep |
| `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-tool-helper.ts` | 274 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-debug.ts` | 40 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/services/agent-streaming/team-codex-runtime-event-bridge.ts` | 95 | Yes | N/A | N/A | Keep |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | 699 | Yes | Pass | Pass (still large, but round-17 additions remain in orchestrator-owned metadata assembly/capability resolution concern; runtime startup injection logic remains outside this module) | Keep |
| `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts` | 247 | Yes | N/A | N/A | Keep |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | 200 | Yes | N/A | N/A | Keep |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | 109 | Yes | N/A | N/A | Keep |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | 211 | Yes | N/A | N/A | Keep |
| `autobyteus-web/stores/agentTeamRunStore.ts` | 279 | Yes | N/A | N/A | Keep |
| `autobyteus-web/stores/runHistoryStore.ts` | 601 | No (refactor only) | Pass | Pass (selection + read-model concerns extracted to dedicated modules) | Keep |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | 277 | No (refactor only) | Pass | Pass (container boundary narrowed; section contract fanout removed) | Keep |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | 241 | No (refactor only) | N/A | N/A | Keep |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | 54 | No (refactor only) | N/A | N/A | Keep |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | 127 | No (refactor only) | N/A | N/A | Keep |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | 65 | No (refactor only) | N/A | N/A | Keep |
| `autobyteus-web/stores/runHistoryTypes.ts` | 192 | Yes | N/A | N/A | Keep |
| `autobyteus-web/stores/runHistoryManifest.ts` | 82 | Yes | N/A | N/A | Keep |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | 322 | Yes | Pass | N/A | Keep |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | 52 | Yes | N/A | N/A | Keep |

## Targeted Review Findings

- Blocking findings:
  - None.
- Resolved in this round:
  - [P1] runtime-service hard-limit/SoC breach closed: session orchestration, model mapping, thread lifecycle, and event/request routing are now separated into focused modules with explicit boundaries.
  - [P1] relay ownership coupling: constructor-side global handler mutation removed; explicit relay bind/unbind lifecycle added.
  - [P2] history panel over-coupling: container now delegates tree rendering to section component and mutation/avatar/workspace-create logic to composables.
  - run-history store coupling reduced: team selection/reopen logic and read-model projection logic extracted into dedicated store modules.
- Reopened hotspots from user review were resolved by boundary extraction:
  - `agent-team-run.ts`: `726 -> 212` lines.
  - `runHistoryStore.ts`: `1464 -> 988` lines.
- Residual compatibility note:
  - `targetNodeName` compatibility field remains in GraphQL team-send input due existing cross-surface contracts; this ticket did not introduce a new compatibility wrapper path.
- Strict-live local-fix review update:
  - `codex-app-server-runtime-service.ts` now registers `send_message_to` as a team-session `dynamicTools` spec and handles `item/tool/call` relay flow.
  - `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` now requires direct `send_message_to` tool invocation semantics.
  - No new blocking SoC or correctness findings were identified in this delta.
- Requirement-gap refactor review update:
  - Codex runtime hotspot extraction completed: relay/tool parsing, launch config, and user-input mapping moved into dedicated modules.
  - Team-scoped dynamic tool gating remains explicit (`teamRunId` + relay-enabled check) and covered by new unit tests.
  - Post-refactor review confirms previous hotspots are now reduced to acceptable ownership boundaries under the updated `>500 effective lines` policy.
- Final local fix review update:
  - Relay unbind safety hardened with per-runtime binding-token ownership checks to prevent stale unbind callbacks from clearing newer handlers.
  - Targeted backend unit suites and strict-live Codex roundtrip E2E remained green after this guard addition.
- Round-9 refactor update:
  - History panel container-to-section callback/prop fanout replaced by typed section state/avatar/action contracts.
  - Tree expansion/status and selection/open/create flows moved into dedicated composables, leaving panel as composition shell.
  - Updated review finding scope (`WorkspaceAgentRunsTreePanel.vue:318`) is now resolved.
- Round-12 adapter update:
  - `codex-runtime-event-adapter.ts` no longer violates the `>500` effective-line hard check after helper extraction.
  - MCP tool-name extraction now covers `payload.tool` (string) and nested `payload.tool.name` (object) alongside `toolName/tool_name`, closing `MISSING_TOOL_NAME` regressions for supported event shapes.
- Round-13 argument-projection update:
  - Codex tool-call mapping now projects `payload.arguments` and `payload.item.arguments` into canonical `metadata.arguments` for MCP/generic `tool_call` activity cards.
  - Argument projection logic remains encapsulated in helper boundaries; adapter orchestration surface did not regain parsing/normalization coupling.
  - No new blocking SoC or correctness findings were identified in this delta.
- Round-15 closure update:
  - Strict-live roundtrip test fixture now explicitly configures `toolNames: ["send_message_to"]` for `ping`/`pong` definitions so `R-017` capability-gated dynamic tool exposure is validated under real transport.
  - Delta is test-fixture-only; changed source-module SoC posture is unchanged and no new blocking findings were introduced.
- Round-16 closure update:
  - No additional source-file delta was introduced in the round-16 process-control loop.
  - Internal review gate remains `Pass` with unchanged SoC posture from round 15.
- Round-17 teammate-manifest update:
  - Orchestrator now composes `teamMemberManifest` metadata and Codex runtime consumes it to inject teammate context via `developerInstructions` without moving relay/tool-execution concerns into orchestrator.
  - `codex-send-message-tooling.ts` owns metadata normalization + instruction rendering + recipient-hint derivation, keeping parsing/prompt-shaping logic out of the runtime service.
  - No blocking SoC/coupling regressions were found for the new `R-022` implementation path.
- Round-20 sender/recipient parity update:
  - `codex-runtime-event-router.ts` now emits synthetic sender-side canonical tool lifecycle events for intercepted `send_message_to`, while remaining the sole relay-interception/event-routing owner.
  - `codex-app-server-runtime-service.ts` now emits structured recipient-side `inter_agent_message` runtime events prior to envelope turn dispatch without absorbing adapter/parsing concerns.
  - `codex-runtime-event-adapter.ts` maps `inter_agent_message` to canonical `INTER_AGENT_MESSAGE`; frontend parser updates for JSON-string arguments remain scoped to streaming normalization only.
  - No blocking SoC/coupling regressions were identified for `R-023`/`AC-023` delta.

## Verification Evidence Used In This Review

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/runtime-command-ingress-service.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/agent-team-websocket.integration.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-send-message-tooling.test.ts`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `pnpm -C autobyteus-web exec vitest run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/runHistoryStore.spec.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-process-manager.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/projection/codex-thread-run-projection-provider.test.ts`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `pnpm -C autobyteus-web exec vitest run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/runHistoryStore.spec.ts`
- `pnpm -C autobyteus-web test`
- `pnpm -C autobyteus-server-ts test -- --run`
- `pnpm -C autobyteus-web test`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run --maxWorkers=1`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-send-message-tooling.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run --maxWorkers=1`
- `pnpm -C autobyteus-web test`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts --no-watch`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/codex-app-server/codex-send-message-tooling.test.ts tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts --no-watch`
- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/protocol/__tests__/segmentTypes.spec.ts --no-watch`
- `pnpm -C autobyteus-web test -- --run`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run` (known flaky file-watcher/indexer integration timeout in full-suite runs; isolated reruns pass)
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/file-explorer/file-name-indexer.integration.test.ts --no-watch`
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/file-explorer/file-system-watcher.integration.test.ts --no-watch`
