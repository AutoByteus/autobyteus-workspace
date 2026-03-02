# Implementation Plan

- Ticket: `claude-agent-sdk-runtime-support`
- Plan Version: `v4`
- Scope: `Large`
- Stage Preconditions:
  - Stage 5 gate: `Go Confirmed`
  - Code edit permission: `Unlocked`

## Objective

Implement `claude_agent_sdk` runtime support and refactor shared runtime orchestration to runtime-neutral boundaries for external runtimes, while preserving existing `autobyteus` and `codex_app_server` behavior. For this cycle, enforce a V2-only Claude session execution path and remove active V1 `query()` turn execution.

## Change Batches

### Batch A: Runtime Core Contracts and Registries

- A1. Extend runtime kind set with `claude_agent_sdk`.
- A2. Refactor runtime capability service to runtime-kind descriptor map (codex + claude probes/toggles).
- A3. Add runtime-neutral external event source contract + registry.
- A4. Register Claude runtime adapter in runtime adapter registry.

### Batch B: Claude Runtime Service + Adapter

- B1. Add `runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`.
- B2. Add `runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`.
- B3. Wire adapter/service into command ingress/composition and stream handlers through event source registry.
- B4. Add runtime event adapter mapping Claude runtime events to existing websocket protocol messages.

### Batch C: Model Catalog + Projection

- C1. Add Claude runtime model provider and register in runtime model catalog service.
- C2. Add Claude session run projection provider (session transcript -> run projection).
- C3. Register Claude projection provider in projection registry.
- C4. Refactor team member projection fallback to runtime-kind provider resolution.

### Batch D: Team Runtime Decoupling

- D1. Replace codex-branded generic team runtime mode (`codex_members`) with runtime-neutral external-member mode.
- D2. Rename/generalize team runtime event bridge to runtime-neutral implementation.
- D3. Generalize team-member runtime orchestrator create/restore external member sessions for runtime kind dispatch.
- D4. Update team mutation/continuation/stream paths to use runtime-neutral mode checks.

### Batch E: Frontend Runtime Option Support

- E1. Extend `AgentRuntimeKind` union with `claude_agent_sdk`.
- E2. Update agent/team run config forms runtime options and normalization logic.
- E3. Update runtime capability store/tests for new runtime kind behavior.

### Batch F: Verification and Stabilization

- F1. Update/extend unit tests for runtime-kind, capability service, adapter registry, and model/projection registries.
- F2. Update runtime streaming/team-mode tests for runtime-neutral mode naming.
- F3. Run targeted test suites and typecheck for touched packages.

### Batch G: Claude Live E2E Parity Expansion

- G1. Expand Claude live runtime E2E suite to parity-count baseline with Codex runtime live E2E suite.
- G2. Add Claude live team E2E suite with parity-count baseline with Codex team live E2E suite.
- G3. Include explicit live assertions for intentionally unsupported Claude runtime behaviors (tool approval routing and inter-agent relay) rather than skipping.
- G4. Rerun full backend and frontend suites after parity expansion.

### Batch H: External Runtime Listener Continuity Across Restore

- H1. Add deferred run-listener persistence in external runtime services so listener subscriptions survive session close/restore (`runId`-keyed continuity).
- H2. Ensure create/restore rebinds deferred listeners before turn events can emit.
- H3. Add/adjust live and unit tests that verify terminate->continue keeps websocket event delivery without path-specific bridge refresh hooks.
- H4. Re-run Claude live runtime/team E2E to validate real send->receive and continue->send->receive behavior.

### Batch I: Claude Inter-Agent Tooling Parity (`send_message_to`)

- I1. Add Claude runtime relay callback contract + runtime-service wiring for team metadata-aware tool enablement.
- I2. Use Claude Agent SDK MCP custom tool integration (`createSdkMcpServer` + `mcpServers`) to expose `send_message_to` for team-bound Claude sessions.
- I3. Generalize team inter-agent relay orchestration to runtime-neutral ingress delivery (remove codex-only hard gate in orchestrator path).
- I4. Implement Claude runtime adapter recipient delivery path for inter-agent envelopes (`relayInterAgentMessage`).
- I5. Extend live Claude team E2E to assert real `send_message_to` tool-call lifecycle + recipient `INTER_AGENT_MESSAGE` delivery parity.
- I6. Re-run unit/live/full-suite verification for Claude and Codex runtime matrices.

### Batch J: Claude V2-Only Runtime Migration

- J1. Introduce V2 session invoker module (`unstable_v2_createSession`/`unstable_v2_resumeSession`) and route Claude runtime create/restore/send through it.
- J2. Add dedicated V2 control interop module that feature-detects and wraps unstable control methods required for dynamic MCP registration.
- J3. Migrate Claude team metadata instruction path from V1 `systemPrompt` wiring to runtime-owned turn preamble injection for V2 sends.
- J4. Remove active Claude V1 `query()` turn execution path and keep V1 helpers only where still required for non-turn ancillary operations (or decommission when unused).
- J5. Extend unit/integration/live tests to enforce V2-only behavior and deterministic error signaling when required V2 controls are unavailable.

## Planned File Groups

- Server core/runtime:
  - `autobyteus-server-ts/src/runtime-management/runtime-kind.ts`
  - `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
  - `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts` (if needed for generic session-active checks)
- New server files:
  - `autobyteus-server-ts/src/runtime-execution/external-runtime-event-source-port.ts`
  - `autobyteus-server-ts/src/runtime-execution/external-runtime-event-source-registry.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`
  - `autobyteus-server-ts/src/runtime-management/model-catalog/providers/claude-runtime-model-provider.ts`
  - `autobyteus-server-ts/src/run-history/projection/providers/claude-session-run-projection-provider.ts`
- Streaming/team decoupling:
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-codex-runtime-event-bridge.ts` (rename/replace)
  - `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
  - `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- Projection/model catalog:
  - `autobyteus-server-ts/src/runtime-management/model-catalog/runtime-model-catalog-service.ts`
  - `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
  - `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- Frontend:
  - `autobyteus-web/types/agent/AgentRunConfig.ts`
  - `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
  - `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
  - runtime-capability/runtime-kind related tests

## Requirement Traceability

| Requirement | Planned Batch(es) | Planned Verification |
| --- | --- | --- |
| R-001 | A, E | runtime-kind tests + frontend config form tests |
| R-002 | A | capability service unit tests + runtime capabilities query path |
| R-003 | A, D | stream/team-mode tests verify runtime-neutral branching |
| R-004 | B | runtime adapter/service tests for create/restore |
| R-005 | B | stream handler + message mapper unit tests |
| R-006 | B | interrupt/terminate adapter/service tests |
| R-007 | C | runtime model catalog/provider tests |
| R-008 | C | run projection provider/service tests |
| R-009 | D | team orchestrator/stream/mutation tests |
| R-010 | F | regression run of touched codex/autobyteus tests |
| R-011 | D, F | code-level boundary checks + tests around generic mode naming |
| R-012 | G | live Claude E2E count parity verification (`13`) + full-suite rerun |
| R-013 | H | live continue/send websocket assertions + runtime-service listener lifecycle tests |
| R-014 | I | live Claude team relay roundtrip assertions + runtime-neutral orchestrator relay unit coverage |
| R-015 | J | source/test assertions that Claude turn execution uses V2 session APIs only |
| R-016 | J | interop-boundary unit tests for available/unavailable V2 control capabilities |
| R-017 | J | team-metadata turn-preamble assertions + live teammate-aware relay checks |

## Test Plan

- Server unit tests (targeted):
  - `tests/unit/runtime-management/*`
  - `tests/unit/runtime-execution/*`
  - `tests/unit/services/agent-streaming/*`
  - `tests/unit/agent-team-execution/*`
  - `tests/unit/run-history/*`
- Web unit tests (targeted):
  - runtime capability store tests
  - agent/team run config form tests
- Type checks:
  - `pnpm -C autobyteus-server-ts typecheck`
  - `pnpm -C autobyteus-web test -- --runInBand` for targeted files (or equivalent project command)

## Execution Order

1. Batch A (compile-safe baseline for runtime kind + capability + registries).
2. Batch B (Claude runtime service + adapter + basic stream mapping).
3. Batch C (model catalog + projection provider wiring).
4. Batch D (team-mode/runtime-neutral refactor).
5. Batch E (frontend runtime kind option wiring).
6. Batch F (test stabilization and final cleanup).
7. Batch G (Claude live E2E parity expansion and full-suite proof).
8. Batch H (listener continuity hardening + live continue/send proof).
9. Batch I (Claude inter-agent tooling parity and runtime-neutral relay completion).
10. Batch J (Claude V2-only runtime migration and V1 turn-path retirement).
