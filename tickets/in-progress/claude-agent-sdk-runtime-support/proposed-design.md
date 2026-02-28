# Proposed Design Document

## Design Version

- Current Version: `v1`

## Artifact Basis

- Investigation Notes: `tickets/in-progress/claude-agent-sdk-runtime-support/investigation-notes.md`
- Requirements: `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Current runtime orchestration has partial abstraction but still routes many shared flows through codex-specific classes and literals. This design introduces runtime-neutral extension points for external runtimes and adds `claude_agent_sdk` as a first-class runtime while keeping codex-specific advanced relay logic isolated to codex modules.

## Goals

- Add `claude_agent_sdk` runtime for single-agent and external-member team runtime flows.
- Make runtime capability checks and model/provider registration runtime-kind driven.
- Remove codex-branded conditionals from runtime-neutral orchestration branches.
- Keep Codex and AutoByteus behavior stable for existing paths.
- Maintain independent runtime disablement controls for Codex and Claude.

## Legacy Removal Policy

- Policy: `No backward compatibility wrappers in touched shared orchestration modules.`
- Required cleanup:
  - Remove codex-only branching in generic runtime selectors where runtime-kind dispatch is sufficient.
  - Replace codex-specific team external mode naming with generic external-member runtime mode.

## Current State (As-Is)

- `RuntimeKind` only includes `autobyteus` and `codex_app_server`.
- Runtime capability checks are codex-special-cased in one service.
- `AgentStreamHandler` and team event bridge subscribe directly to codex service.
- Team external-runtime flow is encoded as `codex_members` mode.
- Team projection fallback directly references codex provider instead of runtime provider registry.
- Frontend runtime enums and runtime-selection UI are hardcoded to 2 runtime kinds.

## Target State (To-Be)

- `RuntimeKind` includes `claude_agent_sdk`.
- Runtime capability service uses runtime-kind probe descriptors (env toggle + probe) for each external runtime.
- Runtime event subscription for external runtimes is registry-driven by runtime kind.
- Team external-member runtime mode is generic (non-autobyteus external runtime mode), not codex-branded.
- Run projection fallback uses runtime provider registry for runtime-kind-based projection providers.
- Frontend runtime kind types/selectors include Claude runtime and remain capability-driven.

## Architecture Direction Decision

- Chosen direction: `Add runtime-neutral external-runtime extension points, then plug in Claude runtime service + adapter.`
- Rationale:
  - `complexity`: isolates runtime-specific internals from shared orchestration.
  - `testability`: each runtime can be unit-tested behind the same runtime contracts.
  - `operability`: runtime enable/disable and probe failures are explicit per runtime.
  - `evolution cost`: adding a future runtime is now registration work, not codex-branch cloning.
- Layering fitness assessment: `Current layering is partially coherent but violated by codex-specific checks in shared layers.`
- Outcome: `Add`, `Modify`, `Remove`.

## Allowed Dependency Directions

- API/Resolvers -> Runtime Composition/Ingress -> Runtime Adapter Registry -> Runtime-specific adapters/services
- Streaming Handlers -> Runtime Event Source Registry -> Runtime-specific event sources
- Run History Projection Service -> Projection Provider Registry -> Runtime-specific projection providers
- Runtime capability queries -> Runtime capability service -> Runtime probe descriptors

Disallowed direction:
- Runtime-neutral orchestration modules importing codex-specific relay/tooling internals.

## Target Modules, Responsibilities, and APIs

| Module | Responsibility | Key API(s) | Inputs | Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/runtime-kind.ts` | Canonical runtime-kind set and normalization | `isRuntimeKind`, `normalizeRuntimeKind` | raw runtime kind | normalized `RuntimeKind` | none |
| `runtime-management/runtime-capability-service.ts` | Runtime availability evaluation | `getRuntimeCapability`, `listRuntimeCapabilities` | runtime kind | enablement + reason | runtime probe descriptors |
| `runtime-execution/runtime-adapter-registry.ts` | Command adapter resolution | `resolveAdapter`, `listRuntimeKinds` | runtime kind | runtime adapter | runtime adapters |
| `runtime-execution/external-runtime-event-source-registry.ts` (new) | Runtime event source resolution | `resolveSource`, `hasSource` | runtime kind | event source | runtime event sources |
| `runtime-execution/claude-agent-sdk/*` (new) | Claude runtime session/stream/model integration | `create/restore/send/interrupt/terminate/subscribe/listModels` | run/session info, user turns | runtime events + model list | Claude Agent SDK |
| `services/agent-streaming/runtime-event-message-mapper.ts` | Runtime-event -> websocket message mapping | `map` | runtime events | `ServerMessage` | runtime-specific event adapters |
| `services/agent-streaming/*stream-handler.ts` | Websocket ingress/egress orchestration | `connect`, `handleMessage`, `disconnect` | ws messages | ws events | ingress service + event source registry |
| `agent-team-execution/services/team-runtime-binding-registry.ts` | Team runtime binding state + mode | `upsertTeamBindings`, `getTeamMode` | team/member bindings | binding state | none |
| `run-history/projection/run-projection-provider-registry.ts` | Runtime-specific projection lookup | `resolveProvider` | runtime kind | provider | registered providers |
| `run-history/services/team-member-run-projection-service.ts` | Team member projection assembly | `getProjection` | team/member route | conversation projection | projection reader + provider registry |
| `runtime-management/model-catalog/runtime-model-catalog-service.ts` | Runtime model listing/reload | `listLlmModels`, `reloadLlmModels*` | runtime kind | model list | runtime model providers |

## Change Inventory (Delta)

| Change ID | Type | Current Path | Target Path | Rationale |
| --- | --- | --- | --- | --- |
| C-001 | Modify | `src/runtime-management/runtime-kind.ts` | same | Add `claude_agent_sdk` runtime kind.
| C-002 | Modify | `src/runtime-management/runtime-capability-service.ts` | same | Replace codex-only probe logic with runtime descriptor map for codex + claude.
| C-003 | Add | N/A | `src/runtime-execution/external-runtime-event-source-port.ts` | Define runtime-neutral event source contract.
| C-004 | Add | N/A | `src/runtime-execution/external-runtime-event-source-registry.ts` | Runtime-kind event source resolution.
| C-005 | Add | N/A | `src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts` | Claude SDK-backed runtime sessions, turn streaming, model listing.
| C-006 | Add | N/A | `src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts` | Plug Claude runtime into command ingress via existing adapter interface.
| C-007 | Modify | `src/runtime-execution/runtime-adapter-registry.ts` | same | Register Claude adapter by default.
| C-008 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Use runtime event source registry for non-autobyteus external runtimes (no codex hardcode).
| C-009 | Modify | `src/services/agent-streaming/team-codex-runtime-event-bridge.ts` | `team-runtime-event-bridge.ts` (rename/move) | Generic external team runtime event bridge keyed by binding runtime kind.
| C-010 | Modify | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | Replace `codex_members` naming/branching with generic external-member runtime mode.
| C-011 | Modify | `src/agent-team-execution/services/team-runtime-binding-registry.ts` | same | Rename team runtime mode to runtime-neutral external mode.
| C-012 | Modify | `src/api/graphql/services/team-run-mutation-service.ts` | same | Resolve team external runtime mode by runtime kind != autobyteus.
| C-013 | Modify | `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | same | Generalize external member session create/restore to runtime-kind-driven path.
| C-014 | Modify | `src/run-history/projection/run-projection-provider-registry.ts` | same | Register Claude projection provider.
| C-015 | Add | N/A | `src/run-history/projection/providers/claude-session-run-projection-provider.ts` | Build projection from Claude session transcript APIs.
| C-016 | Modify | `src/run-history/services/team-member-run-projection-service.ts` | same | Remove codex direct fallback import; resolve provider by runtime kind.
| C-017 | Modify | `src/runtime-management/model-catalog/runtime-model-catalog-service.ts` | same | Register Claude runtime model provider.
| C-018 | Add | N/A | `src/runtime-management/model-catalog/providers/claude-runtime-model-provider.ts` | Claude runtime model provider.
| C-019 | Modify | `autobyteus-web/types/agent/AgentRunConfig.ts` | same | Add `claude_agent_sdk` to runtime kind union.
| C-020 | Modify | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | same | Add Claude runtime option + normalization handling.
| C-021 | Modify | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | same | Add Claude runtime option + normalization handling.
| C-022 | Modify | server/web tests in touched modules | same | Update assertions for new runtime kind and generic external-mode naming.

## Naming Decisions

| Item | Decision | Rationale |
| --- | --- | --- |
| Runtime kind string | `claude_agent_sdk` | Explicit vendor/runtime identity, parallel to `codex_app_server`.
| Generic external team mode | `external_member_runtime` | Avoids provider-coupled naming (`codex_members`).
| Event source contract | `ExternalRuntimeEventSource` | Describes purpose without binding to one runtime.
| Claude runtime service | `ClaudeAgentSdkRuntimeService` | Mirrors existing naming pattern (`*RuntimeService`) and runtime identity.
| Claude projection provider | `ClaudeSessionRunProjectionProvider` | Emphasizes transcript source (session) and provider role.

## Naming-Drift Check

| Existing Name | Drift Check | Action |
| --- | --- | --- |
| `TeamCodexRuntimeEventBridge` | Drifted if used for multiple external runtimes | Rename/Move to runtime-neutral `TeamRuntimeEventBridge`.
| `codex_members` team mode | Drifted (provider-branded generic mode) | Replace with `external_member_runtime`.
| `Codex`-only checks in shared handlers | Drifted from shared-responsibility intent | Replace with runtime-kind dispatch via registries.

## No-Backward-Compat Gate

- Compatibility wrappers rejected for shared orchestration paths.
- Runtime-neutral branches should switch to registry dispatch directly.
- Codex-only advanced relay remains codex-internal feature, not a shared fallback branch.

## Use-Case Coverage Matrix

| use_case_id | Primary Path Covered | Fallback Covered | Error Covered | Mapped Runtime-Model Section |
| --- | --- | --- | --- | --- |
| UC-001 | Yes | N/A | Yes | Stage 4 `UC-001` |
| UC-002 | Yes | N/A | Yes | Stage 4 `UC-002` |
| UC-003 | Yes | N/A | Yes | Stage 4 `UC-003` |
| UC-004 | Yes | N/A | Yes | Stage 4 `UC-004` |
| UC-005 | Yes | Yes | Yes | Stage 4 `UC-005` |
| UC-006 | Yes | Yes | Yes | Stage 4 `UC-006` |
| UC-007 | Yes | N/A | Yes | Stage 4 `UC-007` |
| UC-008 | Yes | N/A | Yes | Stage 4 `UC-008` |
| UC-009 | Yes | N/A | Yes | Stage 4 `UC-009` |
| UC-010 | Yes | N/A | Yes | Stage 4 `UC-010` |

## Risks and Mitigations

- Risk: Claude event mapping parity mismatch with existing websocket protocol.
  - Mitigation: runtime-specific adapter with focused unit tests for mapped message types.
- Risk: Continue/resume failures due session persistence differences.
  - Mitigation: include restore-path integration tests and explicit runtime reference persistence checks.
- Risk: Residual codex coupling in team/runtime shared paths.
  - Mitigation: enforce runtime-neutral mode naming and registry dispatch in shared modules; codex internals remain isolated.
