# Investigation Notes

- Ticket: `claude-agent-sdk-runtime-support`
- Stage: `1 (Investigation + Triage)`
- Last Updated: `2026-03-04`

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
- Claude Agent SDK v2 preview docs: https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-v2
- Claude Agent SDK TypeScript SDK docs: https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-typescript

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

## Re-Entry Delta (2026-03-02, user-mandated V2-only migration)

1. Latest SDK package version is already current, and V2 APIs are available.
- Workspace + npm latest are both `@anthropic-ai/claude-agent-sdk@0.2.63`.
- V2 exported APIs are present: `unstable_v2_createSession`, `unstable_v2_resumeSession`, `unstable_v2_prompt`.

2. Public V2 session options are feature-reduced vs V1 query options.
- `SDKSessionOptions` includes `model`, `allowedTools`, `disallowedTools`, `canUseTool`, `hooks`, `permissionMode`, etc.
- `SDKSessionOptions` does not expose `mcpServers` or `systemPrompt` fields.
- V1 `query()` options still expose `mcpServers` and `systemPrompt`.

3. Internal V2 session control path exposes capabilities not surfaced on public `SDKSession`.
- Runtime inspection of `unstable_v2_createSession(...)` objects shows an internal `query` control object with methods including `setMcpServers(...)`, `request(...)`, and `applyFlagSettings(...)`.
- SDK runtime source confirms V2 constructor currently hardcodes initial `mcpServers: {}` and does not pass init `systemPrompt` config into the V2 initialization path.

4. Live probe result: V2 session + internal query control can execute dynamic MCP tools.
- Executed local live probe in this worktree:
  - create V2 session (`unstable_v2_createSession`)
  - call internal `query.setMcpServers(...)` with `createSdkMcpServer(...)` and `tool(...)`
  - send forced token-return prompt
- Evidence outcome:
  - tool call executed (`TOOL_CALLS 1`)
  - model returned exact handler token (`RESULT == EXPECTED`), proving real MCP tool invocation via V2 session path.

5. Live probe result: dynamic system prompt injection via V2 control is not currently reliable.
- Attempted `query.applyFlagSettings({ appendSystemPrompt: ... })` and related variants.
- Behavior did not show deterministic system-instruction enforcement in probes; treat as unsupported/unreliable for architecture-critical teammate instruction injection.

## Re-Entry Delta (2026-03-04, team-member run-history reload truncation)

1. User-reported symptom is isolated to team-member projection hydration, not standalone run projection.
- Repro from UI: after team run with multiple turns, reopening the app/tab and selecting a team member shows only the first message.
- Standalone agent run history reopens with full multi-turn conversation in the same environment.

2. Current team-member projection fallback policy can return a truncated local snapshot and skip richer runtime projection.
- `src/run-history/services/team-member-run-projection-service.ts` currently tries runtime projection only when local member-memory projection is empty or throws.
- For external runtimes (`claude_agent_sdk`), if local projection has non-zero rows (for example only first user message), the service returns local data directly and never consults runtime provider output.

3. This differs from standalone run projection strategy and creates a plausible mismatch with user-observed behavior.
- Standalone projection path (`src/run-history/services/run-projection-service.ts`) treats runtime provider as primary and fallback provider as secondary.
- Team-member path currently treats local member-memory projection as primary even for external runtimes where runtime provider (`claude_session_projection`) is expected to be more complete.

4. Hypothesis with highest confidence for this defect.
- Team-member local memory projection can be partially populated (first turn only) while runtime provider can reconstruct richer multi-turn transcript.
- Because fallback trigger is `conversation.length === 0` only, partial history is treated as complete and returned to frontend, producing the “first-message-only” reopen symptom.

5. Investigation decision for fix direction.
- Update team-member projection arbitration for external runtimes to always attempt runtime projection and prefer the richer projection (at minimum by conversation cardinality), with deterministic fallback to local projection when runtime provider fails/unavailable.
- Add regression coverage in:
  - unit: team-member projection service richer-runtime arbitration behavior,
  - live API/E2E: Claude team member two-turn -> terminate -> projection fetch must contain both turn markers and at least four conversation messages.

## Re-Entry Delta (2026-03-03, workspace mismatch in Claude V2 sessions)

1. User-reported runtime behavior is reproducible.
- Selected UI workspace is `temp_workspace`, but Claude agent replies indicate it is operating from the server worktree root.
- Repro evidence from user screenshots:
  - Claude can read ticket/worktree files not expected in selected temp workspace.
  - Team relay and continuation otherwise work, isolating fault to workspace propagation.

2. Root cause in current server implementation.
- `claude-agent-sdk-runtime-service.ts` resolves and stores `state.workingDirectory`, but `resolveOrCreateV2Session(...)` did not pass that value into V2 session creation interop.
- `claude-runtime-v2-control-interop.ts` only passed model/executable/permission/tool allowlist options.

3. Root cause in upstream Claude Agent SDK V2 implementation (`@anthropic-ai/claude-agent-sdk@0.2.63`).
- Public TypeScript surface:
  - `query()` options include `cwd` (v1-style path).
  - `SDKSessionOptions` for `unstable_v2_createSession` / `unstable_v2_resumeSession` do not expose `cwd`.
- SDK source inspection (`sdk.mjs`, class `SQ`):
  - V2 session constructor builds `new V4({...})` without forwarding `cwd`.
  - Therefore child Claude process inherits `process.cwd()` from server process at spawn time.

4. Design implication.
- We cannot rely on normal V2 option passing for per-run workspace at the current SDK version.
- A runtime-local workaround is required: scope `process.cwd()` around V2 session create/resume and serialize that critical section to prevent cross-run cwd races.
- Keep workaround isolated in `claude-runtime-v2-control-interop.ts` so orchestration/service layers stay decoupled from SDK internals.

5. Validation direction for this cycle.
- Add interop-level regression tests that assert:
  - selected workspace cwd is applied during V2 create/resume calls,
  - original cwd is restored after session creation,
  - serialized critical section prevents overlapping cwd mutation windows.
- Add runtime-service unit assertion that `state.workingDirectory` is forwarded into interop session-creation call.

6. Design implications for V2-only requirement.
- V2-only migration is feasible for session lifecycle and dynamic MCP tooling if we isolate internal query-control usage behind a dedicated interop boundary.
- Team-manifest instruction strategy cannot rely on V1 `systemPrompt` options in V2-only mode; we need an alternate deterministic path (turn-preamble injection at runtime service boundary) until official V2 system prompt support is exposed.
- Because internal `session.query` is not part of public `SDKSession` contract, we must contain this in one module with defensive feature detection and deterministic degradation errors.

7. Risk updates.
- Main risk shifts from "MCP unavailable in V2" to "MCP available only via unstable internal control surface".
- Secondary risk is teammate-instruction fidelity without first-class V2 system prompt configuration.
- Required mitigation is stronger live E2E assertions on actual tool-call/recipient-delivery behavior, not lifecycle-only checks.

## Re-Entry Delta (2026-03-02, V2 control-binding regression + live quota block)

1. Real runtime failure was caused by control-method binding, not missing MCP capability.
- Claude SDK source (`sdk.mjs`) shows `setMcpServers()` reads internal state via `this.sdkMcpServerInstances`.
- Our V2 interop extracted the method and invoked it unbound, losing `this` and producing:
  - `TypeError: Cannot read properties of undefined (reading 'sdkMcpServerInstances')`.
- Fix: invoke control methods with owner binding preserved (`fn.call(owner, ...)`), and add unit coverage that fails when method binding is lost.

2. Post-fix live behavior confirms crash removal.
- Live team roundtrip rerun no longer emits `CLAUDE_RUNTIME_TURN_FAILED` / `sdkMcpServerInstances` errors.
- Remaining live failure switched to provider-response gating (quota text), proving the runtime wiring defect is resolved in this cycle.

3. Current Stage 7 blocker is external account quota, with concrete reset window.
- Live Claude turns now return: `You've hit your limit · resets 8pm (Europe/Berlin)`.
- This prevents deterministic assertion tokens (`READY`, `READY-FIRST-*`, `send_message_to` lifecycle token paths) from being produced.
- Blocker classification: external/infrastructure (provider quota), not design/runtime regression.

## Re-Entry Delta (2026-03-03, auto-approve tools not honored for Claude writes)

1. User-visible bug is reproducible and maps to Claude permission handling.
- With Claude runtime selected and UI `Auto approve tools` enabled, write attempts still produce permission prompts (for example "approve the permission prompt so I can create hello.py").
- Team routing and normal turn streaming continue to work, isolating this to permission policy wiring rather than session lifecycle.

2. Current implementation drops `autoExecuteTools` before Claude session creation.
- `runtime-adapter-port.ts` includes `RuntimeCreateAgentRunInput.autoExecuteTools`.
- `claude-agent-sdk-runtime-adapter.ts` currently passes model/workspace/llmConfig but does not forward `autoExecuteTools` into Claude runtime session options.
- `claude-runtime-v2-control-interop.ts` hardcodes `permissionMode: "default"` with no `canUseTool` override.

3. Official SDK type surface supports a deterministic runtime-side fix.
- Local package source (`autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`) defines:
  - `PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'dontAsk'`.
  - V2 session options include `canUseTool?: CanUseTool`.
  - `CanUseTool` can return `PermissionResult` with `{ behavior: 'allow' }`.
- This allows an SDK-native "auto approve" path without routing through unsupported runtime `approveTool` command handling.

4. Design implication for separation of concerns.
- Keep runtime ingress `approveTool` unsupported for Claude (unchanged contract).
- Implement auto-approval at Claude V2 session policy boundary:
  - map `autoExecuteTools=true` to a V2 session `canUseTool` callback that returns `allow`,
  - keep `autoExecuteTools=false` on default permission behavior.
- Preserve this mapping in interop/service layers only; no frontend protocol branching required.

## Re-Entry Delta (2026-03-04, Claude output appears full-buffered instead of incremental streaming)

1. User-visible symptom is reproducible in UI behavior.
- Claude responses eventually arrive and render correctly, but message content appears in one large burst instead of visibly incremental token/segment growth.
- Team relay/tool execution still work, indicating runtime is alive and tool calls are not the primary blocker.

2. Backend event path currently intends incremental forwarding.
- `claude-agent-sdk-runtime-service.ts` (`executeV2Turn`) iterates `for await (const chunk of session.stream())` and emits `item/outputText/delta` for each normalized delta, followed by `item/outputText/completed`.
- Runtime event adapter maps these to websocket `SEGMENT_CONTENT` and `SEGMENT_END`.
- Frontend segment handler appends each `SEGMENT_CONTENT` payload delta as received.

3. Likely fault domain is upstream chunk cadence or normalization precedence.
- If `session.stream()` yields only coarse/final payloads, frontend will naturally appear non-streaming.
- Current normalizer accepts multiple payload shapes and may prefer fully materialized message text when present, which can collapse visible incremental cadence.
- Need raw chunk instrumentation for V2 stream and emitted runtime-event timestamps to confirm whether collapse occurs before or during normalization.

4. Investigation decision and classification.
- Classification remains `Unclear` until instrumentation proves whether issue is:
  - SDK stream granularity limitation,
  - normalization precedence collapse,
  - or runtime event emission buffering.
- Re-entry follows workflow path `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` with source edits blocked until Stage 6 unlock.

5. Planned diagnostic evidence for next stage.
- Add temporary debug instrumentation in Claude runtime stream loop (chunk index, normalized delta length, fallback-source markers, timestamp).
- Add focused runtime unit/API assertion verifying that multiple `SEGMENT_CONTENT` emissions occur before completion for synthetic multi-chunk stream input.
- If SDK emits coarse chunks only, design fallback strategy (server-side chunk slicing is explicitly disallowed; must preserve semantic source fidelity).
