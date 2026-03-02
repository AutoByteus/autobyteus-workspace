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
- Claude Agent SDK docs (custom tools): https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-custom-tools
- Claude Agent SDK docs (MCP): https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-mcp
- Claude Agent SDK docs (multi-turn + streaming input): https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-python

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

## Re-Entry Delta (2026-03-01, no-reply after restart)

1. Live Claude SDK stream shape mismatch caused silent assistant output loss.
- Manual probe of `@anthropic-ai/claude-agent-sdk` returned chunks shaped as:
  - `type: "assistant"` with `message.content: [{ type: "text", text: "..." }]`
  - `type: "result"` with `result: "..."`
- Existing `normalizeClaudeStreamChunk` only extracted `delta`-style fields (`delta`, `textDelta`, etc.) and ignored `assistant.message.content`, so assistant text remained empty and UI appeared stuck/no-reply.

2. Existing live E2E coverage had a blind spot in assertion strength.
- Runtime websocket tests validated lifecycle (`RUNNING -> IDLE`) and absence of runtime errors, but did not require non-empty assistant output text for every live turn.
- This allowed lifecycle-only success even when assistant output normalization regressed.

3. Required corrective actions for this cycle.
- Extend Claude stream normalization to parse assistant content blocks (`message.content[].text`) and safe `result` fallback without duplicating emitted output.
- Tighten live Claude E2E assertions to fail unless assistant text is non-empty:
  - single-agent websocket lifecycle test now asserts non-empty assistant output containing expected keyword.
  - team external-member routing test now asserts each targeted member emits non-empty output containing the requested marker token.

## Re-Entry Delta (2026-03-02, live continue/send websocket drop)

1. Real live Claude team continuation E2E reproduces websocket no-reply after terminate->continue.
- Command:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
- Failure:
  - `Timed out waiting for professor output containing 'READY-CONTINUE-*' (running=false idle=false outputLength=0 recentTypes=)`
- This validates the user-reported symptom class: message accepted but websocket receives no runtime events.

2. Root-cause boundary is runtime-listener lifecycle, not only test flake.
- Team external runtime websocket bridge subscribes by member run id once at websocket connect.
- Claude runtime `subscribeToRunEvents(runId, listener)` currently returns no-op when no active runtime session object exists for that run id.
- On terminate/close, runtime session state (including listeners) is dropped. Continue restores session state, but prior websocket listener is not reattached unless a separate bridge-refresh path runs.
- GraphQL continuation path (`TeamRunMutationService -> TeamRunContinuationService`) does not invoke the websocket bridge refresh helper used in websocket `SEND_MESSAGE` path.

3. Design consequence.
- A route-specific patch (refresh in one mutation path) would keep control-flow coupling and miss other restore paths.
- Runtime service should preserve run-level listeners across session teardown/restore for external runtimes, so any transport path (GraphQL mutation, websocket command, or continuation service) keeps streaming continuity.

4. Validation direction for this cycle.
- Add runtime-level deferred listener persistence keyed by `runId`, applied on `subscribe`, `create/restore`, and `close`.
- Re-run live Claude runtime + team E2E with real send->receive and continue->send->receive assertions.

## Re-Entry Delta (2026-03-02, Claude team inter-agent tooling parity gap)

1. User-visible bug is reproducible and maps to a real backend capability gap.
- In Claude team runs, members respond as standalone Claude Code assistants and do not expose teammate-aware `send_message_to` behavior.
- This is consistent with current implementation: Claude runtime path does not consume team metadata for prompt/tool wiring and adapter relay is hard-disabled.

2. Current code explicitly blocks Claude inter-agent relay.
- `src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts` returns `INTER_AGENT_RELAY_UNSUPPORTED` from `relayInterAgentMessage`.
- `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` currently enforces codex-only relay delivery in `relayInterAgentMessage` (both sender and recipient runtime kinds must be `codex_app_server`).

3. Claude runtime currently ignores team-manifest metadata that is already persisted.
- Team orchestrator stores `teamRunId`, `memberName`, `sendMessageToEnabled`, and `teamMemberManifest` in member `runtimeReference.metadata`.
- Claude runtime service restore path keeps metadata in state but does not apply it to Claude query options (`systemPrompt`, `mcpServers`, tool restrictions, or relay callbacks).

4. Claude Agent SDK supports custom tool integration via MCP servers.
- Local SDK type and runtime inspection confirms:
  - `Options.mcpServers`, `Options.systemPrompt`, `Options.allowedTools`, `Options.tools`, `Options.resume` are supported in `@anthropic-ai/claude-agent-sdk` (`sdk.d.ts`).
  - SDK exports `createSdkMcpServer` and `tool` helpers in `sdk.mjs`.
  - `createSdkMcpServer({ name, tools })` can register in-process MCP tools and pass them through `mcpServers`.
- Official docs also state custom tools are exposed via MCP server wiring and can be added dynamically in SDK usage.

5. Requirements delta identified.
- Earlier ticket revision intentionally excluded Claude parity for codex-style `send_message_to`.
- User has now made this a hard requirement, so this is a `Requirement Gap` re-entry, not a local patch.

6. Design implication for separation of concerns.
- Correct fix is not a Claude-only prompt hack.
- Needed boundary updates:
  - runtime-neutral relay routing in team orchestrator,
  - runtime-specific tool surface implementation in Claude runtime service (MCP custom tool),
  - runtime adapter parity so recipient delivery works for Claude sessions via ingress port.
- Keep codex internal implementation intact while sharing runtime-neutral orchestration contracts.
