# Investigation Notes

- Ticket: `claude-agent-sdk-runtime-support`
- Stage: `1 (Investigation + Triage)`
- Last Updated: `2026-02-28`

## Sources Consulted

### Local Code Paths

- `autobyteus-server-ts/src/runtime-management/runtime-kind.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
- `autobyteus-server-ts/src/runtime-management/model-catalog/runtime-model-catalog-service.ts`
- `autobyteus-server-ts/src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-codex-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`
- `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
- `autobyteus-server-ts/src/run-history/projection/providers/codex-thread-run-projection-provider.ts`
- `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/stores/runtimeCapabilitiesStore.ts`

### External / SDK References

- Claude Code SDK docs: https://docs.anthropic.com/en/docs/claude-code/sdk
- npm package metadata: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- npm tarball type declarations inspected locally from `@anthropic-ai/claude-agent-sdk@0.2.63` (`sdk.d.ts`, `sdk-tools.d.ts`)

## Key Findings

1. Runtime selection is partially abstracted, but runtime-specific behavior is still strongly codex-coupled in several layers.
- Runtime abstraction exists (`RuntimeAdapter`, registry, composition, ingress), but streaming, team-member orchestration naming, run projection fallback, and capability probing are codex-specific.

2. Single-agent WebSocket streaming path is hardcoded to Codex runtime service.
- `AgentStreamHandler` checks `runtimeKind === "codex_app_server"` and subscribes directly to `CodexAppServerRuntimeService`.
- This blocks plug-in addition of another external runtime without changing this handler.

3. Team runtime mode naming couples product logic to one external runtime.
- Current mode union is `"autobyteus_team" | "codex_members"`.
- Team stream handling and mutation flow branch on `codex_members`, not on runtime capabilities/traits.

4. Team runtime event bridge is Codex-only by class and implementation.
- `TeamCodexRuntimeEventBridge` filters only codex bindings and subscribes only to codex runtime service.

5. Model catalog and runtime capability checks are runtime-kind specific but implemented with codex-special-case logic.
- Model catalog defaults hardcode codex provider.
- Capability service probes codex binary and reads only `CODEX_APP_SERVER_ENABLED` toggle.
- No pluggable mechanism for adding runtime-specific probe + env override per runtime.

6. Run-history projection fallback is codex-specific and bypasses runtime registry.
- `TeamMemberRunProjectionService` directly imports codex projection provider and branches on `binding.runtimeKind === "codex_app_server"`.

7. Frontend runtime kind types and config UI are hardcoded to two values.
- `AGENT_RUNTIME_KINDS = ['autobyteus', 'codex_app_server']`.
- Runtime select components explicitly render only two options.

8. Claude Agent SDK provides workable primitives for a new external runtime implementation.
- Stable `query({ prompt, options })` API yields async stream of `SDKMessage` events.
- Supports `resume`, `sessionId`, `interrupt`, and model selection via options.
- Provides enough event/message data to map into existing websocket protocol with a runtime-specific event adapter.

## Constraints and Integration Implications

1. Separation of concerns requires introducing runtime-neutral interfaces for:
- runtime event subscription/stream source lookup,
- runtime capability probing/toggles,
- runtime model provider registration,
- team-member external-runtime mode resolution.

2. Backward compatibility behavior expectations:
- Existing `autobyteus` and `codex_app_server` paths must remain functional.
- Codex-specific advanced behavior (team relay/tooling) can remain codex-specific internally, but top-level orchestration should stop encoding codex names in generic control flow.

3. Runtime enable/disable needs explicit and independent toggles.
- Requirement implies being able to disable codex or claude independently.
- Capability service should support per-runtime env overrides and probes.

4. Run-history for Claude runtime should not depend on local autobyteus memory files.
- A runtime-specific projection provider is needed (Claude SDK session transcript APIs) for run-history parity.

## Unknowns / Risks

1. Claude SDK event-to-UI mapping parity risk.
- Claude stream event schema differs from codex app-server schema.
- Need a runtime-specific event adapter to preserve UI semantics (`SEGMENT_*`, approvals, tool events, assistant completion).

2. Team inter-agent relay parity risk.
- Codex has explicit `send_message_to` relay plumbing.
- Claude SDK path may initially support team user->member routing without immediate parity for codex-style runtime-level relay tooling unless separately implemented.

3. Runtime persistence semantics risk.
- Claude `resume` depends on persisted session data and cwd/settings behavior.
- Must validate restore flow in continuation and run-history projection paths.

## Re-Entry Delta (2026-02-28, hard parity request)

1. Codex vs Claude live E2E count is currently mismatched.
- Codex live runtime/team E2E tests: `13` total (`11` in `codex-runtime-graphql.e2e.test.ts` + `2` in `codex-team-inter-agent-roundtrip.e2e.test.ts`).
- Claude live runtime E2E tests: `4` total (`claude-runtime-graphql.e2e.test.ts`).
- User requirement is now explicit parity: Claude must have the same live E2E test count baseline as Codex.

2. Claude runtime behavior differences must be tested as real unsupported contracts, not skipped.
- `approveTool` is intentionally unsupported by Claude adapter/service (`TOOL_APPROVAL_UNSUPPORTED` path).
- `relayInterAgentMessage` is intentionally unsupported for non-Codex members (`INTER_AGENT_RELAY_UNSUPPORTED` path).
- Parity cannot be 1:1 feature behavior, but can be 1:1 test-depth count with explicit live assertions for supported and unsupported paths.

3. Team-runtime Claude parity is feasible for targeted member routing + workspace mapping.
- Team external-member runtime mode is runtime-neutral and can run Claude member sessions.
- Existing team websocket bridge can surface Claude runtime events per member (`agent_name` tagging).
- Codex-only inter-agent relay semantics must remain out-of-scope but should have explicit negative-coverage assertions.

## Scope Triage

- Classification: `Large`
- Rationale:
  - Cross-cutting changes needed across server runtime core, streaming, team orchestration, capability probing, model catalog, run-history projection, tests, and frontend runtime selection types/UI.
  - New external SDK integration (`@anthropic-ai/claude-agent-sdk`) plus decoupling refactors in currently codex-special-cased paths.

## Recommended Architecture Direction (Pre-Design)

1. Introduce runtime-neutral extension points for external runtimes.
- `ExternalRuntimeEventSource` registry (subscribe/has session by runtime kind).
- Capability probe registry (env override + probe per runtime kind).
- Projection provider registry usage in team member projection fallback (remove codex direct import).

2. Add new runtime kind `claude_agent_sdk` and runtime adapter/service pair.
- Keep command ingress/composition contracts unchanged.
- Implement Claude runtime service behind adapter; avoid codex codepath branching.

3. Generalize team runtime mode naming.
- Replace codex-branded mode with generic external-runtime member-session mode.
- Keep codex-specific relay features isolated behind codex service internals where needed.

4. Update frontend runtime enums/options to runtime-kind-driven rendering.
- Include `claude_agent_sdk` in runtime kind union and runtime selects.
- Keep capability store as source of runtime enablement.
