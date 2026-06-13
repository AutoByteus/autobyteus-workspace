# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined after design-impact reroute, bootstrapped from the empty `runtime-mcp-agent-tools` ticket folder and explicitly grounded in the completed upstream `streamable-mcp-runtime-tools` ticket now archived under this same worktree at `tickets/done/streamable-mcp-runtime-tools`. This ticket is a follow-up to the base branch `origin/codex/streamable-mcp-runtime-tools`: the base branch already implemented the central AutoByteus Agent Tools MCP Server and deferred production runtime materializers. The scoped follow-up is to implement the first production runtime consumer: Claude Agent SDK programmatic MCP materialization for `send_message_to`.

## Goal / Problem Statement

The base branch already added the server-hosted AutoByteus Agent Tools MCP Server at `/mcp/agent-tools/:sessionId` with v1 `send_message_to` support, but production runtime backends do not yet consume the secret `AgentToolMcpDescriptor`. Existing runtime surfaces still expose `send_message_to` through runtime-specific wrappers:

- AutoByteus native uses a local `BaseTool` wrapper.
- Codex App Server uses dynamic tool registration.
- Claude Agent SDK uses an in-process SDK-created `autobyteus_team` MCP server with a Claude-specific `send_message_to` handler.

The upstream done-ticket materializer matrix identified Claude Agent SDK as the lowest-risk first materializer because it supports programmatic `mcpServers` in SDK query options and does not require writing bearer-token config files. This ticket should therefore make Claude Agent SDK consume `send_message_to` through the session-scoped `autobyteus_agent_tools` HTTP MCP descriptor instead of maintaining a second Claude-specific `send_message_to` implementation. Task-delegation, browser, media, and publish-artifacts surfaces stay on their current working Claude mechanisms unless/until the Agent Tools MCP Server supports those adapters.

## Investigation Findings

- Dedicated task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools`.
- Branch: `codex/runtime-mcp-agent-tools` tracking `origin/codex/streamable-mcp-runtime-tools`.
- Fetched base/current commit: `3a82ba5cb95542004fe4a4604fc600bc5404a0a8` (`feat(agent-tools): add streamable MCP endpoint`).
- The provided ticket folder was empty at bootstrap; scope was inferred from the completed upstream ticket artifacts and current code.
- Upstream artifact source read for lineage:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/design-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/implementation-handoff.md`
- Upstream done-ticket conclusions that govern this follow-up:
  - `AgentToolMcpDescriptor` is the canonical secret-bearing descriptor runtime materializers consume.
  - Runtime materializers were explicitly deferred for AGY, Claude Code CLI, Codex App Server, and Claude Agent SDK.
  - Claude Agent SDK materialization should be programmatic: `{ autobyteus_agent_tools: { type: "http", url, headers } }`, passed through SDK query options, no file.
  - Codex App Server materialization is unsafe without separate process/config isolation because app-server processes are keyed and reused by normalized `cwd`.
  - Antigravity CLI and Claude Code CLI materializers require runtime backends/config-file ownership that do not exist in this branch.
  - V1 Agent Tools MCP sessions are application-level run/member sessions with bearer tokens and owner cleanup; raw descriptors must not be persisted, logged, emitted, or written to durable artifacts.
- Base branch current capabilities:
  - `src/agent-tools/mcp/**` implements sessions, descriptors, catalog, route/method dispatch, result mapping, and `send_message_to` execution via `SendMessageToDispatcher`.
  - `AgentRunManager.unregisterActiveRun()` and `MixedAgentMemberHandle.dispose()` already revoke owned Agent Tools MCP sessions.
  - `AgentToolMcpSessionService.createAgentToolMcpSession(...)` returns a secret descriptor and redacted descriptor.
  - Production code currently only revokes sessions; it does not create any Agent Tools MCP session for real runtime backends.
- Claude Agent SDK current capabilities:
  - `ClaudeSdkClient.startQueryTurn(...)` already accepts `mcpServers` and `allowedTools` and forwards them to SDK query options.
  - The locked `@anthropic-ai/claude-agent-sdk@0.2.71` type definitions support remote HTTP MCP server configs as `{ type: "http", url: string, headers?: Record<string,string> }`.
  - `buildClaudeSessionMcpServers(...)` currently builds `autobyteus_team` from an in-process SDK server containing `send_message_to` and task-delegation tool definitions.
  - The Claude-specific send-message handler duplicates approval/event/result glue around the shared `SendMessageToDispatcher`.
- Codex App Server is not the correct first consumer in this ticket:
  - Its client manager is keyed by canonical workspace `cwd` and can share one app-server process among multiple runs/members.
  - `thread/start` and `thread/resume` currently pass `config: null` and dynamic tools, not a per-thread MCP config layer.
  - Safe Codex MCP descriptor materialization needs separate process/config isolation to avoid leaking one run's bearer descriptor into another run sharing the same cwd-keyed app-server process.
- Antigravity CLI and Claude Code CLI runtime backends are not present in this base branch. Their materializers should be implemented in their runtime tickets.

## Design-Impact Reroute Refinement (2026-06-13)

Implementation/API-E2E proved that live Claude can execute the route-backed `autobyteus_agent_tools` `send_message_to` call and emit canonical stream lifecycle events, but the sender `getTeamMemberRunMemoryView(... includeRawTraces: true ...)` readback returned no raw traces. This refines the ticket from a Claude-only materializer to a materializer plus the required runtime-memory/run-history trace invariant that the materializer depends on.

New findings that now govern the requirements:

- `AgentRunMemoryRecorder` persists raw traces only when the active `AgentRunConfig.memoryDir` is non-empty; otherwise it skips the run.
- `RuntimeMemoryEventAccumulator` already records canonical `TOOL_EXECUTION_STARTED` and terminal tool events as `tool_call` / `tool_result` raw traces, so route-backed `send_message_to` must flow through canonical AgentRun events into that recorder.
- Standard mixed-team member memory paths are already derivable by `AgentMemoryLocationService.getTeamAgentRunLocation(...)`; dynamically spawned task-agent paths are derivable by `getTaskAgentLocation(...)`. The design gap is not a Claude-specific path derivation inside `MixedAgentMemberHandle`; it is an executable-team-member invariant and app-memory-root lifecycle invariant.
- The Agent Tools MCP route/dispatcher must remain transport/execution only. It must not also write runtime memory traces, because that would create a second persistence authority and bypass the canonical AgentRun event spine.
- Downstream fallback derivation inside `MixedAgentMemberHandle` is rejected. The handle may assert/fail fast when an executable member config is missing a required memoryDir, but the authoritative path must be established before the handle builds an `AgentRunConfig`.

## Branch-Comparison Requirement Clarification (2026-06-13)

Compared with `origin/personal`, the memory recorder and mixed-team memory layout are not materially different. The key behavior difference is that the old Claude `autobyteus_team` send-message handler manually emitted canonical lifecycle events and returned an application-result object, while the new route-backed Agent Tools MCP path removes that handler and relies on generic Claude SDK tool lifecycle chunks plus existing `AgentRunMemoryRecorder` attachment. This means the new path must explicitly prove three things that the old path masked:

1. The sender member `AgentRunConfig.memoryDir` is present before the member run is created/restored.
2. The writer root and `getTeamMemberRunMemoryView` readback root are the same configured app memory root.
3. Raw trace result assertions preserve the new MCP content result shape rather than the old handler's `{ accepted: true }` object.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus targeted refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination, Boundary Or Ownership Issue, Legacy Or Compatibility Pressure if both Claude send-message surfaces remain active, and Missing Invariant for executable mixed-team member runtime-memory roots after the design-impact reroute.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed now, still narrow but no longer Claude-only: implement the Claude materializer and enforce the existing mixed-team/runtime-memory trace spine invariant without adding downstream fallbacks.
- Evidence basis: The base branch established `AgentToolMcpSessionService` and `AgentToolMcpToolExecutor` as the authoritative MCP session/tool transport boundary, but Claude still owns a separate in-process `send_message_to` handler. Keeping both would preserve two active projection paths for the same configured server-owned tool.
- Requirement or scope impact: Implement a clean-cut Claude Agent SDK materializer for `autobyteus_agent_tools`; remove/decommission the old Claude-specific `send_message_to` in-process MCP handler path; explicitly enforce that executable mixed-team Claude member AgentRuns have authoritative durable memory directories before AgentRun creation; leave other runtime/tool families untouched.

## Recommendations

1. Add a Claude-backend-local Agent Tools MCP materializer that consumes only `AgentToolMcpDescriptor`/redaction helpers and emits Claude SDK `mcpServers` config plus the Claude MCP-prefixed allowed tool name.
2. Ensure a valid Agent Tools MCP session exists for a Claude runtime session when `send_message_to` is configured. It may be created lazily during turn setup because the SDK consumes `mcpServers` per query, but it must be an in-memory runtime-session descriptor, not a persisted runtime context field or per-tool-call session.
3. Stop adding `send_message_to` to the Claude `autobyteus_team` in-process MCP server; keep that server for task-delegation tools only.
4. Remove the now-obsolete Claude-specific send-message handler/definition files and their tests, replacing them with materializer/config/event-normalization coverage.
5. Normalize Claude's new `mcp__autobyteus_agent_tools__send_message_to` runtime wire name to canonical `send_message_to` in backend events and history. Do not expose the MCP prefix as the application-facing tool name.
6. Do not create one generic materializer that hides runtime-specific config and token cleanup. Codex App Server, Claude Code CLI, and Antigravity CLI should each get backend-local materializers in their own tickets.
7. Treat the runtime-memory raw trace path as canonical-event-only: Claude SDK tool use must become canonical AgentRun lifecycle events, which `AgentRunMemoryRecorder` persists through `RuntimeMemoryEventAccumulator` into the member run memory directory.
8. Enforce member memory roots at the mixed-team runtime identity/provisioning boundary and task-agent activation boundary; `MixedAgentMemberHandle` should consume/assert, not derive a fallback memoryDir.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The change is narrower than implementing all runtime materializers, but it crosses the Claude turn startup path, MCP server config construction, allowed-tool policy, event normalization, obsolete Claude send-message files/tests, and docs/coverage.

## In-Scope Use Cases

- UC-RMCP-001: A Claude Agent SDK run whose agent definition includes `send_message_to` receives the server-hosted `autobyteus_agent_tools` HTTP MCP server in its SDK query options.
- UC-RMCP-002: A Claude Agent SDK team member can call `send_message_to` through `mcp__autobyteus_agent_tools__send_message_to`, and the call dispatches through the shared `SendMessageToDispatcher` via the Agent Tools MCP Server.
- UC-RMCP-003: Claude task-delegation tools remain available through `autobyteus_team` when configured and are not moved to the Agent Tools MCP Server in this ticket.
- UC-RMCP-004: Claude runtime events and history expose the canonical tool name `send_message_to`, not a provider-specific MCP prefix, and avoid duplicate Activity rows.
- UC-RMCP-005: If `send_message_to` is not configured, no Agent Tools MCP session or `autobyteus_agent_tools` MCP server config is created for the Claude runtime session/turn.
- UC-RMCP-006: Existing AutoByteus native, Codex App Server dynamic tools, browser/media/publish-artifacts Claude MCP surfaces, and task-delegation behavior continue to work unchanged.
- UC-RMCP-007: A Claude Agent SDK team member that executes route-backed `send_message_to` persists canonical `tool_call` and `tool_result` raw traces under the authoritative team-member memory directory and exposes them through existing run-history/memory readback surfaces.

## Out of Scope

- Implementing Codex App Server MCP config materialization or changing Codex App Server away from dynamic tools.
- Implementing Antigravity CLI or Claude Code CLI runtime materializers.
- Exposing browser, media, task-delegation, or publish-artifacts through the Agent Tools MCP Server.
- Persisted Agent Tools MCP sessions, restored-run persisted token reuse, or long-lived/resumable SSE server push.
- Keeping the old Claude `autobyteus_team` `send_message_to` path as a compatibility fallback.
- Any old `mcp__autobyteus_team__send_message_to` fallback, alias, or dual route.
- Downstream memoryDir fallback derivation inside `MixedAgentMemberHandle` or Agent Tools MCP route-side raw trace persistence.

## Functional Requirements

- REQ-RMCP-001: Claude Agent SDK runtime/turn setup must ensure a valid `AgentToolMcpSession` exists when and only when `configuredToolExposure.sendMessageToConfigured` is true. The raw descriptor may be memoized only inside the live `ClaudeSession` object and must be recreated on restore/new session or after expiry; it must not be stored in `ClaudeAgentRunContext`, run history, or any durable artifact.
- REQ-RMCP-002: The session creation input must bind the correct sender context: `senderRunId` is the Claude run id, `senderName` is the member name when a `MemberTeamContext` exists and otherwise the agent definition id, `runtimeKind` is the run runtime kind, and `memberTeamContext` is passed through when present.
- REQ-RMCP-003: The Claude materializer must convert the secret `AgentToolMcpDescriptor` into an SDK HTTP MCP server config under the descriptor's reserved name `autobyteus_agent_tools`, using `{ type: "http", url: descriptor.serverUrl, headers: descriptor.headers }`.
- REQ-RMCP-004: Claude `allowedTools` must include the MCP-prefixed Agent Tools name `mcp__autobyteus_agent_tools__send_message_to` when `send_message_to` is configured, and must not include the old `mcp__autobyteus_team__send_message_to` path after the cutover.
- REQ-RMCP-005: `buildClaudeTeamMcpServers(...)` must no longer build or register a Claude-specific `send_message_to` tool definition; it may continue to return `autobyteus_team` only for task-delegation tools.
- REQ-RMCP-006: The obsolete Claude-specific `send_message_to` handler/definition files and unit tests must be removed or rewritten so there is only one active Claude `send_message_to` execution path: the Agent Tools MCP Server plus shared dispatcher.
- REQ-RMCP-007: Claude event conversion must normalize `mcp__autobyteus_agent_tools__send_message_to` to canonical `send_message_to` for segment metadata, approval events, execution lifecycle events, run history, and memory traces.
- REQ-RMCP-008: Claude event handling must not suppress the new Agent Tools MCP `send_message_to` raw tool lifecycle as duplicate noise; the generic Claude tool-use coordinator/converter should own the lifecycle for the remote MCP call.
- REQ-RMCP-009: Raw secret descriptors, bearer headers, and full materialized MCP config must not be logged, emitted in runtime events, persisted to run history, or written to durable project files by this ticket.
- REQ-RMCP-010: Existing Agent Tools MCP session cleanup by run/member owner must remain valid for Claude-created sessions; stale descriptors must fail through the existing route/session-denial behavior.
- REQ-RMCP-011: Browser, media, publish-artifacts, and task-delegation Claude MCP server construction must remain configuration-gated and behaviorally unchanged, except that `send_message_to` is no longer part of `autobyteus_team`.
- REQ-RMCP-012: Tests must cover descriptor-to-Claude-config mapping, allowed-tool selection, no-session/no-config when unconfigured, removal of `autobyteus_team` send-message registration, event-name canonicalization for `mcp__autobyteus_agent_tools__send_message_to`, and session creation with sender/team context.
- REQ-RMCP-013: Route-backed Claude `send_message_to` raw memory traces must be persisted only from canonical `AgentRun` lifecycle events (`TOOL_EXECUTION_STARTED` plus `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` / `TOOL_DENIED`) through `AgentRunMemoryRecorder` and `RuntimeMemoryEventAccumulator`; the Agent Tools MCP route, method dispatcher, executor, and `SendMessageToDispatcher` must not write run-memory raw traces.
- REQ-RMCP-014: Every executable non-AutoByteus mixed-team member `AgentRun` created for a standard team member must receive a concrete, non-empty `AgentRunConfig.memoryDir` before `AgentRunManager.createAgentRun(...)` or `restoreAgentRunFromPlatformState(...)` is called. The authoritative owner for standard mixed-team member memoryDir materialization is the mixed-team runtime identity/materialization path (`MixedTeamRunBackendFactory` for fresh team contexts and `TeamRunMetadataMapper` for restore contexts), backed by `AgentMemoryLocationService`.
- REQ-RMCP-015: Every executable task-agent member run must receive a concrete, non-empty task-agent memoryDir at the task-agent activation/recovery boundary owned by `MixedTeamMemberRegistry` using `AgentMemoryLocationService.getTaskAgentLocation(...)`.
- REQ-RMCP-016: `MixedAgentMemberHandle` must not silently derive a fallback memoryDir when its config is missing one. It may enforce the invariant with a fail-fast assertion/error before constructing `AgentRunConfig`, and any failure must point to the upstream mixed-team runtime identity owner.
- REQ-RMCP-017: `AgentRunMemoryRecorder` remains a defensive persistence subscriber, not a memory-location owner. It must not invent team or task-agent memory directories; missing `memoryDir` for recordable executable runs must be prevented upstream and surfaced by tests.
- REQ-RMCP-018: Application-facing raw traces for route-backed `send_message_to` must use canonical `toolName: "send_message_to"`, preserve the Claude invocation id as `toolCallId`, preserve arguments/result/error, preserve the route-backed MCP content result shape rather than converting it to the old handler's `{ accepted: true }` object, and not expose `mcp__autobyteus_agent_tools__send_message_to`, `mcp__autobyteus_team__send_message_to`, bearer headers, session ids, or raw MCP descriptor data.
- REQ-RMCP-019: If implementation evidence shows the live failure is a stale app-memory-root singleton rather than missing member memoryDir, the fix must explicitly target the app memory-root/service lifecycle boundary or test bootstrap/reset boundary. It must not be hidden as a member-handle fallback or route-side persistence workaround.


## Acceptance Criteria

- AC-RMCP-001: A unit test proves the Claude Agent Tools MCP materializer maps a descriptor to `{ autobyteus_agent_tools: { type: "http", url, headers } }` without exposing the raw descriptor through logs/events.
- AC-RMCP-002: A Claude tooling-options test proves configured `send_message_to` adds `mcp__autobyteus_agent_tools__send_message_to` to `allowedTools` and no longer adds `mcp__autobyteus_team__send_message_to`.
- AC-RMCP-003: A Claude MCP server config builder test proves `autobyteus_team` contains task-delegation tools only, while `autobyteus_agent_tools` is merged separately when `send_message_to` is configured.
- AC-RMCP-004: A Claude session/turn setup test proves `AgentToolMcpSessionService.createAgentToolMcpSession(...)` is called with the run id, configured exposure, runtime kind, and correct standalone/member sender context when `send_message_to` is configured.
- AC-RMCP-005: The same setup path proves no Agent Tools MCP session is created and no `autobyteus_agent_tools` config is passed when `send_message_to` is absent.
- AC-RMCP-006: Claude event converter/coordinator tests prove `mcp__autobyteus_agent_tools__send_message_to` appears in emitted application events as `send_message_to` with arguments/result/error preserved.
- AC-RMCP-007: Removed obsolete Claude send-message handler/definition tests are replaced with the new materializer/event tests; no production import remains for the old handler/definition files.
- AC-RMCP-008: Existing focused Agent Tools MCP route/session tests still pass after the Claude materializer change.
- AC-RMCP-009: Existing Claude task-delegation/browser/media/publish-artifacts config tests, or updated equivalents, prove those MCP server names and allowed-tool entries are unchanged aside from the send-message cutover.
- AC-RMCP-010: `pnpm -C autobyteus-server-ts run build` passes after the cutover.
- AC-RMCP-011: A focused unit/integration test proves standard mixed-team member runtime identity materialization produces non-empty memoryDir values for agent members before `MixedAgentMemberHandle` builds an `AgentRunConfig`; if the handle is given an executable member config without memoryDir, a fail-fast test proves it rejects that invalid state rather than deriving fallback.
- AC-RMCP-012: A focused test proves task-agent activation/recovery config construction produces a task-agent memoryDir using `AgentMemoryLocationService.getTaskAgentLocation(...)`.
- AC-RMCP-013: A runtime-memory accumulator/recorder test proves canonical Claude-style `TOOL_EXECUTION_STARTED` and `TOOL_EXECUTION_SUCCEEDED` events with `tool_name: "send_message_to"` and an invocation id create one `tool_call` and one `tool_result` raw trace in the configured memoryDir.
- AC-RMCP-014: The live Claude route-backed team roundtrip E2E asserts successful delivery, canonical stream lifecycle, no provider-name leaks, and readback of the sender `send_message_to` raw traces from `getTeamMemberRunMemoryView(...)`, with `toolResult` preserving the route-backed MCP content result shape instead of the old handler result object.
- AC-RMCP-015: If stale app-memory-root singleton state is found, a test/bootstrap check proves runtime-memory/run-history reads and writes use the same configured app memory root for the team run; the solution must be reviewed as service-lifecycle/test-bootstrap ownership, not as member fallback.
- AC-RMCP-016: Static or focused test coverage proves the Agent Tools MCP route/dispatcher/executor and `SendMessageToDispatcher` do not perform raw memory persistence directly.


## Constraints / Dependencies

- Base branch is `origin/codex/streamable-mcp-runtime-tools` at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8`.
- `@anthropic-ai/claude-agent-sdk` is locked at `0.2.71` in the workspace lockfile; its local package type definitions support `McpHttpServerConfig` with `type: "http"`, `url`, and optional `headers`.
- `AgentToolMcpDescriptor` is secret-bearing runtime-only data. Materializers may consume it in memory but must not persist raw headers or full URLs with unredacted session ids.
- The Agent Tools MCP route currently requires MCP-compatible content negotiation and bearer auth; downstream API/E2E should validate the actual Claude SDK/Claude Code client behavior before delivery if durable runtime execution coverage is feasible.
- Claude Agent SDK remains an SDK/runtime boundary with its own raw tool-use events and permission callback. The new remote MCP call should use that generic lifecycle rather than a Claude-specific duplicated send-message handler.

## Assumptions

- The intended follow-up is to start consuming the completed Agent Tools MCP Server from production runtime code, not to implement a new external runtime in this ticket.
- Claude Agent SDK is the correct first production consumer because the upstream done-ticket already verified programmatic `mcpServers` as its preferred materialization path and because no token-bearing files are needed.
- Runtime-specific materializers should stay backend-local. A generic all-runtime config writer would hide token cleanup/process-isolation rules.

## Risks / Open Questions

- The ticket folder was empty; if the intended target was Codex App Server, Antigravity CLI, Claude Code CLI, or all materializers, this scope must be reset upstream before implementation.
- Real Claude SDK HTTP MCP behavior may need an API/E2E smoke because route strictness around `Accept: application/json, text/event-stream` depends on the spawned Claude Code/SDK transport behavior.
- Changing the Claude tool name from `mcp__autobyteus_team__send_message_to` to `mcp__autobyteus_agent_tools__send_message_to` can affect provider-native histories; application-facing events must stay canonical to avoid UI/history drift.
- The design-impact reroute showed empty raw traces after successful route-backed delivery. Implementation must distinguish missing member `memoryDir` from stale app-memory-root singleton state with focused evidence before applying the final fix, but either fix must preserve the authoritative ownership model above.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-RMCP-001 | UC-RMCP-001, UC-RMCP-005 |
| REQ-RMCP-002 | UC-RMCP-001, UC-RMCP-002 |
| REQ-RMCP-003 | UC-RMCP-001 |
| REQ-RMCP-004 | UC-RMCP-001, UC-RMCP-004 |
| REQ-RMCP-005 | UC-RMCP-003 |
| REQ-RMCP-006 | UC-RMCP-002, UC-RMCP-004 |
| REQ-RMCP-007 | UC-RMCP-004 |
| REQ-RMCP-008 | UC-RMCP-004 |
| REQ-RMCP-009 | UC-RMCP-001, UC-RMCP-004 |
| REQ-RMCP-010 | UC-RMCP-002, UC-RMCP-005 |
| REQ-RMCP-011 | UC-RMCP-003, UC-RMCP-006 |
| REQ-RMCP-012 | UC-RMCP-001..UC-RMCP-006 |
| REQ-RMCP-013 | UC-RMCP-004, UC-RMCP-007 |
| REQ-RMCP-014 | UC-RMCP-007 |
| REQ-RMCP-015 | UC-RMCP-007 |
| REQ-RMCP-016 | UC-RMCP-007 |
| REQ-RMCP-017 | UC-RMCP-007 |
| REQ-RMCP-018 | UC-RMCP-004, UC-RMCP-007 |
| REQ-RMCP-019 | UC-RMCP-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-RMCP-001 | Descriptor-to-Claude SDK config shape and redaction discipline |
| AC-RMCP-002 | Allowed-tool policy cutover from old team MCP name to new Agent Tools MCP name |
| AC-RMCP-003 | Config merge behavior: task delegation remains `autobyteus_team`, send-message moves to `autobyteus_agent_tools` |
| AC-RMCP-004 | Runtime session creation binds correct sender/team context |
| AC-RMCP-005 | Configuration gate prevents unconfigured tool/session exposure |
| AC-RMCP-006 | Runtime event/history canonicalization after provider-specific MCP prefix |
| AC-RMCP-007 | Obsolete duplicate path removed instead of retained |
| AC-RMCP-008 | Existing Agent Tools MCP route/session coverage remains valid |
| AC-RMCP-009 | Existing Claude non-send-message tool surfaces are not regressed |
| AC-RMCP-010 | Build-level TypeScript/source integration check |
| AC-RMCP-011 | Standard mixed-team member memoryDir invariant and no downstream fallback |
| AC-RMCP-012 | Task-agent memoryDir derivation at task-agent activation/recovery owner |
| AC-RMCP-013 | Canonical AgentRun lifecycle events persist raw tool traces |
| AC-RMCP-014 | Live route-backed Claude team E2E validates memory readback with canonical names and MCP content result shape |
| AC-RMCP-015 | App memory-root read/write consistency if singleton lifecycle is implicated |
| AC-RMCP-016 | No route/dispatcher-side raw memory persistence |

## Approval Status

Proceeding as refined and design-ready after the implementation design-impact reroute, based on the user's instruction to work this ticket, the branch/ticket context, and the upstream done-ticket materializer guidance. The main scope assumption is explicit above; downstream should send back a Requirement Gap if the intended runtime target is not Claude Agent SDK first.
