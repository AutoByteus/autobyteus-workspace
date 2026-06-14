# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined / Design-ready on 2026-06-14 for the fresh `runtime-agent-tools-mcp-unification` ticket.

This ticket starts from the merged `origin/codex/streamable-mcp-runtime-tools` base, where `send_message_to` already uses the server-hosted `autobyteus_agent_tools` MCP route for Claude Agent SDK and Codex App Server. This follow-up expands that route-backed pattern to the other currently exposed server-owned backend agent tool families that still have duplicated Claude local MCP or Codex `dynamicTools` projections.

## Goal / Problem Statement

Claude Agent SDK and Codex App Server currently expose several server-owned backend agent tools through runtime-specific projection code even though the base branch now has a runtime-neutral Agent Tools MCP server:

- Claude Agent SDK uses SDK-created local MCP servers for browser (`autobyteus_browser`), media (`autobyteus_image_audio`), task delegation (`autobyteus_team`), and published artifacts (`autobyteus_published_artifacts`).
- Codex App Server uses `dynamicTools` for browser, media, task delegation, and published artifacts.
- `send_message_to` is already route-backed through `autobyteus_agent_tools` for Claude and Codex and should remain the pattern.
- AutoByteus native already runs in-process and should remain local.

The target behavior is a clean-cut unification: for Claude Agent SDK and Codex App Server, all in-scope configured server-owned backend agent tools should be advertised and executed through one session-scoped `autobyteus_agent_tools` MCP server, with the shared Agent Tools MCP catalog becoming the authoritative schema/availability/execution boundary. The in-scope tool families are the currently duplicated external-runtime surfaces: `send_message_to`, browser tools, media tools, task delegation tools, and `publish_artifacts`.

The target is not to expose every registered AutoByteus local registry tool through Agent Tools MCP. Tool-management, skills, agent-management, and agent-team-management tools are out of scope unless they already have Claude/Codex runtime-specific exposure paths in this branch, which investigation did not find.

## Investigation Findings

- Dedicated task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification`.
- Task branch: `codex/runtime-agent-tools-mcp-unification`.
- Bootstrap base branch: `origin/codex/streamable-mcp-runtime-tools`; local `HEAD` and upstream both resolved to `9b6d8938e17f94148a4f23ab3ce04fbaaaf85014` after `git fetch --all --prune` on 2026-06-14.
- Current `src/agent-tools/mcp/**` owns the HTTP route, session registry, descriptor, JSON-RPC method dispatcher, schema mapper, result mapper, catalog, and tool executor, but it is still send-message-specific:
  - `agent-tool-mcp-catalog.ts` defaults to only `SendMessageToMcpDefinitionProvider`.
  - `agent-tool-mcp-tool-executor.ts` hard-codes `SEND_MESSAGE_TO_TOOL_NAME` and throws for all other tools.
  - Claude/Codex Agent Tools MCP materializers and event sanitizers contain send-message-specific name helpers.
- Current configured-tool exposure already derives all in-scope configured families from `agentDefinition.toolNames` in `agent-execution/shared/configured-agent-tool-exposure.ts`: browser, media, task-delegation, `send_message_to`, and `publish_artifacts`.
- Current server-owned family manifests already exist and should remain authoritative for family behavior/parsing:
  - Browser: `agent-tools/browser/browser-tool-manifest.ts` plus `browser-tool-parameter-schemas.ts`.
  - Media: `agent-tools/media/media-tool-manifest.ts` plus `media-tool-parameter-schemas.ts`.
  - Task delegation: `agent-tools/task-delegation/task-delegation-tool-manifest.ts` plus `task-delegation-tool-parameter-schemas.ts`.
  - Published artifacts: `services/published-artifacts/published-artifact-tool-contract.ts` and `agent-tools/published-artifacts/publish-artifacts-tool.ts`.
  - Send message: `agent-communication/services/send-message-to-tool-contract.ts` and `agent-tools/agent-communication/send-message-to-parameter-schema.ts`.
- Current runtime-specific duplicate projection files are still active:
  - Claude: `agent-execution/backends/claude/browser/**`, `media/build-claude-media-*`, `published-artifacts/**`, `task-delegation/**`, and `team-communication/claude-team-mcp-server-builder.ts`.
  - Codex: `agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts`, `media/build-media-dynamic-tool-registrations.ts`, `published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.ts`, and `task-delegation/build-task-delegation-dynamic-tool-registrations.ts`.
- Current runtime-specific projections duplicate schema conversion, result wrapping, error wrapping, tool-family availability decisions, and execution binding that can be owned once by Agent Tools MCP adapters.
- Browser support remains environment-dependent and must still be gated by `BrowserToolService.isBrowserSupported()`; unsupported browser tools must not be exposed through an empty or broken MCP descriptor.
- Media tools require a per-run workspace root path and benefit from run identity in the execution context. Claude currently supplies the session working directory; Codex supplies the resolved working directory plus `runId`/`agentId` in dynamic handlers.
- Task delegation tools require `MemberTeamContext`; standalone runs must not expose them even when listed in an agent definition.
- Published artifacts require the active run id and durable memory/workspace context available through `PublishedArtifactPublicationService` and the active `AgentRunManager`; relative paths depend on the active run workspace or fallback runtime context.
- Codex already has a thread-scoped `mcp_servers.autobyteus_agent_tools` config materializer. That materializer can carry a broader `enabled_tools` list once the Agent Tools MCP descriptor includes more tools.
- Claude already has an SDK HTTP MCP server materializer. It can carry a broader descriptor once the session state creates descriptors for any enabled Agent Tools MCP-supported tool, not only `send_message_to`.
- Current Codex and Claude event/history normalization is still send-message-specific for Agent Tools MCP names and must become generic for all `mcp__autobyteus_agent_tools__<tool>` names while continuing to redact bearer/header/server descriptor data.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus architecture refactor / cleanup of duplicated runtime-specific projections.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure if old local/dynamic paths remain active for migrated tools.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed now.
- Evidence basis: The base branch has an authoritative server-hosted Agent Tools MCP session/catalog/route boundary, but browser/media/task-delegation/publish-artifacts still have separate Claude and Codex schema/execution projections. Adding more tool families by copying send-message logic or keeping local/dynamic fallbacks would preserve duplicate policy and split ownership.
- Requirement or scope impact: The implementation must extend the shared Agent Tools MCP catalog/executor model, add family adapters, generalize runtime materializers and name/event sanitization, remove/decommission in-scope runtime-specific local MCP/dynamic builders, and update tests/coverage to prove the clean-cut migration.

## Recommendations

1. Extend the Agent Tools MCP subsystem into the authoritative catalog, availability, schema, execution, result, and descriptor boundary for in-scope external-runtime backend agent tools.
2. Use one adapter/registration abstraction for each supported MCP tool so definitions and execution are registered together; do not keep one hard-coded executor switch that only knows `send_message_to`.
3. Implement family MCP providers/adapters for:
   - `send_message_to`
   - all browser manifest tools when browser support is available
   - all media manifest tools
   - all task-delegation manifest tools only when the session sender has `MemberTeamContext`
   - `publish_artifacts`
4. Keep existing family manifests/parsers/services as the behavioral owners. Agent Tools MCP adapters should project and execute those family owners; they must not duplicate business rules.
5. Add a small session execution context to `AgentToolMcpSession` for per-run data needed by adapters, especially `workingDirectory`/workspace root. Keep the existing owner and sender identity shapes.
6. Materialize `autobyteus_agent_tools` for Claude and Codex when the descriptor has at least one enabled in-scope MCP tool, not only when `send_message_to` is configured.
7. Remove or decommission active Claude local MCP builders and Codex dynamic builders for migrated tool families. There must be no active fallback path that exposes the same migrated tool through `autobyteus_browser`, `autobyteus_image_audio`, `autobyteus_team`, `autobyteus_published_artifacts`, or Codex `dynamicTools`.
8. Generalize Claude and Codex Agent Tools MCP wire-name normalization from send-message-only to all `autobyteus_agent_tools` tools. Application events/history must use canonical tool names like `open_tab`, `generate_image`, `delegate_tasks`, and `publish_artifacts`.
9. Preserve descriptor secrecy: no raw bearer token, session id, or full MCP config in run history, logs, events, serialized runtime context, project config files, `.codex/config.toml`, `.claude`, or ticket artifacts.
10. Keep AutoByteus native local/in-process tool registration unchanged; it is not an external runtime MCP consumer.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

The change spans shared Agent Tools MCP catalog/executor abstractions, five tool families, Claude session tooling and MCP server composition, Codex bootstrap and dynamic-tool removal, event/history name normalization, result serialization, secrets redaction, and broad unit/integration/API/E2E coverage updates.

## In-Scope Use Cases

- UC-UATM-001: A Claude Agent SDK standalone run whose agent definition includes any supported in-scope backend tool receives one `autobyteus_agent_tools` HTTP MCP server config for those enabled tools.
- UC-UATM-002: A Claude Agent SDK team member whose agent definition includes task-delegation tools receives task-delegation through `autobyteus_agent_tools` only when `MemberTeamContext` exists.
- UC-UATM-003: A Codex App Server standalone run whose agent definition includes any supported in-scope backend tool receives one thread-scoped `config.mcp_servers.autobyteus_agent_tools` entry with those enabled tools.
- UC-UATM-004: A Codex App Server team member whose agent definition includes task-delegation tools receives task-delegation through `autobyteus_agent_tools` only when `MemberTeamContext` exists.
- UC-UATM-005: Browser tools execute through the shared browser service and return the same JSON/error semantics as the current runtime-specific projections, while remaining absent when browser bridge support is unavailable.
- UC-UATM-006: Media tools execute through the shared media generation service with the run workspace context and return generated file path JSON/error semantics.
- UC-UATM-007: `publish_artifacts` executes through the shared publication service using the active run id and preserves durable artifact projection/event behavior.
- UC-UATM-008: `send_message_to` remains route-backed through `SendMessageToDispatcher`, with no regression in existing all-runtime communication behavior.
- UC-UATM-009: Application-facing runtime events, memory traces, and run history display canonical tool names for all migrated tools and do not leak provider wire names or MCP secrets.
- UC-UATM-010: AutoByteus native keeps its existing in-process local tool exposure and is not turned into an HTTP MCP client.

## Out of Scope

- Exposing every `defaultToolRegistry` tool through Agent Tools MCP.
- Moving AutoByteus native to HTTP MCP.
- Antigravity CLI, Claude Code CLI, or other runtime backends not active in this branch.
- Persisting bearer-token MCP descriptors or writing runtime MCP config files into project/runtime config locations.
- Compatibility aliases or dual active execution paths for migrated Claude/Codex tools.
- Agent-management, agent-team-management, skills, and tool-management MCP migration unless a future ticket explicitly adds runtime-specific Claude/Codex exposure for those families.
- Changing the product semantics of browser, media, task-delegation, published-artifact, or send-message services beyond routing through the unified MCP boundary.

## Functional Requirements

- REQ-UATM-001: The Agent Tools MCP catalog must list every configured, available, in-scope backend agent tool for a session and exclude unconfigured, unsupported, or context-ineligible tools.
- REQ-UATM-002: The Agent Tools MCP route must execute `send_message_to`, browser tools, media tools, task-delegation tools, and `publish_artifacts` through shared family services/manifests, not runtime-specific Claude/Codex handlers.
- REQ-UATM-003: Browser tools must only be enabled when browser support is available; when unsupported, configured browser tools must not appear in `tools/list` or runtime materialized config.
- REQ-UATM-004: Task-delegation tools must only be enabled for sessions with a `MemberTeamContext`; standalone sessions must not advertise or execute them.
- REQ-UATM-005: Media tool execution must receive the run workspace root context and preserve path-generation behavior for relative, absolute, file URL, URL/data URI, and invalid references as covered by existing media tests.
- REQ-UATM-006: `publish_artifacts` execution must publish against the active run id and preserve durable published-artifact projection/event behavior.
- REQ-UATM-007: Claude Agent SDK must materialize one `autobyteus_agent_tools` HTTP MCP server when at least one in-scope supported tool is enabled, and must not build old in-scope local MCP servers for migrated tools.
- REQ-UATM-008: Codex App Server must materialize one thread-scoped `mcp_servers.autobyteus_agent_tools` config when at least one in-scope supported tool is enabled, and must not register migrated tools in Codex `dynamicTools`.
- REQ-UATM-009: Runtime allowed-tool, approval, lifecycle, history, and memory paths must normalize all Agent Tools MCP wire names to canonical tool names.
- REQ-UATM-010: Raw descriptors, bearer headers, session ids, and provider config details must not be logged, persisted, serialized in run contexts, or emitted in application-facing events/history.
- REQ-UATM-011: AutoByteus native local/in-process exposure must continue to use existing registry/local wrappers and must not depend on the HTTP MCP route.
- REQ-UATM-012: The implementation must remove or decommission obsolete Claude local MCP and Codex dynamic projection files/tests for migrated in-scope tools rather than keeping them as fallbacks.
- REQ-UATM-013: Existing configured-tool gating must remain based on `agentDefinition.toolNames`; unlisted tools must not be exposed by the unified MCP catalog.

## Acceptance Criteria

- AC-UATM-001: Unit tests prove Agent Tools MCP catalog/tool listing includes exactly configured-and-available supported tools across send-message, browser, media, task-delegation, and publish-artifacts families.
- AC-UATM-002: Unit or integration tests prove `tools/call` executes each migrated family through the shared Agent Tools MCP route and returns MCP-compliant success/error results.
- AC-UATM-003: Tests prove configured browser tools are absent when browser support is unavailable and present when support is available.
- AC-UATM-004: Tests prove task-delegation tools are absent for standalone sessions and present for member-team sessions.
- AC-UATM-005: Claude session/unit tests prove configured migrated tools are materialized only under `autobyteus_agent_tools`, with no `autobyteus_browser`, `autobyteus_image_audio`, `autobyteus_team`, or `autobyteus_published_artifacts` migrated-tool server config.
- AC-UATM-006: Codex bootstrap/unit tests prove migrated tools appear in `mcp_servers.autobyteus_agent_tools.enabled_tools` and are absent from `dynamicTools` and dynamic handler maps.
- AC-UATM-007: Event/history tests prove Agent Tools MCP wire names for multiple families normalize to canonical names and bearer/session details are redacted or omitted.
- AC-UATM-008: Existing `send_message_to` all-active-runtime coverage remains valid or is updated to cover the generalized materializer without regressing delivery, lifecycle, history, or memory traces.
- AC-UATM-009: Existing browser/media/published-artifacts/task-delegation executable coverage is updated or replaced to validate route-backed Claude/Codex execution; stale tests that assert old runtime-specific exposure are removed.
- AC-UATM-010: Static scans or tests prove no active production code path exposes migrated tools through old Claude local MCP builders or Codex dynamic registration builders.
- AC-UATM-011: No test, log, event, history item, serialized context, or artifact contains raw `Authorization: Bearer ...` values or unredacted Agent Tools MCP session ids.
- AC-UATM-012: AutoByteus native tool-resolution tests continue to pass unchanged except where assertions need updating for shared configured-tool exposure data structures.

## Constraints / Dependencies

- Base branch must remain `origin/codex/streamable-mcp-runtime-tools` unless delivery later refreshes from a newer integration branch.
- `agentDefinition.toolNames` remains the product-level configured-tool gate.
- The server-hosted MCP descriptor remains runtime-only secret data.
- Codex App Server must keep using thread-scoped `thread/start` / `thread/resume` `config.mcp_servers`, not process-wide launch args or project config files.
- Claude Agent SDK must keep using programmatic SDK `mcpServers`, not local config files.
- Browser support depends on configured browser bridge environment/service availability.
- Task delegation depends on an active team run and valid member context.
- Published artifacts depend on an active run with durable memory/workspace context.

## Assumptions

- The user wants this fresh ticket to expand the already-merged `send_message_to` Agent Tools MCP pattern to all currently duplicated Claude/Codex backend agent tool surfaces.
- The current Agent Tools MCP route shape is acceptable and should be extended rather than replaced.
- The MCP clients in Claude Agent SDK and Codex App Server can call multiple enabled tools from the same HTTP server descriptor.
- Existing family manifests/parsers/services are the correct behavior owners and should not be rewritten.

## Risks / Open Questions

- Codex App Server may represent terminal MCP tool-call items differently across versions; event/history normalization should be tested with route-backed non-send-message MCP calls.
- Claude SDK `allowedTools` may require provider-prefixed names, canonical bare names, or both; implementation must choose based on current SDK behavior and tests, without reintroducing old local servers.
- Browser route-backed live coverage may require browser bridge setup and may be environment-gated.
- Media generation live coverage may depend on configured media model credentials; default coverage can use existing mocks while release validation should record live evidence when available.
- Published-artifact route-backed execution must be checked with active run memory/workspace roots to avoid losing artifact events.
- Removing Codex dynamic builders may reveal unrelated tests that depended on dynamic tool internals rather than product behavior.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-UATM-001 | UC-UATM-001, UC-UATM-002, UC-UATM-003, UC-UATM-004 |
| REQ-UATM-002 | UC-UATM-005, UC-UATM-006, UC-UATM-007, UC-UATM-008 |
| REQ-UATM-003 | UC-UATM-005 |
| REQ-UATM-004 | UC-UATM-002, UC-UATM-004 |
| REQ-UATM-005 | UC-UATM-006 |
| REQ-UATM-006 | UC-UATM-007 |
| REQ-UATM-007 | UC-UATM-001, UC-UATM-002 |
| REQ-UATM-008 | UC-UATM-003, UC-UATM-004 |
| REQ-UATM-009 | UC-UATM-009 |
| REQ-UATM-010 | UC-UATM-009 |
| REQ-UATM-011 | UC-UATM-010 |
| REQ-UATM-012 | UC-UATM-001, UC-UATM-002, UC-UATM-003, UC-UATM-004 |
| REQ-UATM-013 | All in-scope use cases |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-UATM-001 | Catalog/session enablement matrix for configured, unavailable, and context-ineligible tools. |
| AC-UATM-002 | MCP route execution matrix for each migrated family. |
| AC-UATM-003 | Browser availability gating. |
| AC-UATM-004 | Team-context-gated task delegation. |
| AC-UATM-005 | Claude materializer cutover and old server removal. |
| AC-UATM-006 | Codex materializer cutover and dynamic-tool removal. |
| AC-UATM-007 | Canonical event/history names and secret redaction. |
| AC-UATM-008 | No regression for route-backed `send_message_to` communication. |
| AC-UATM-009 | Replacement of stale runtime-specific coverage with route-backed family coverage. |
| AC-UATM-010 | Static/structural proof that old migrated paths are gone. |
| AC-UATM-011 | Secret no-leak validation. |
| AC-UATM-012 | AutoByteus native non-regression. |

## Approval Status

Design-ready basis prepared from the user's 2026-06-14 request to work on this fresh ticket. No open product-scope question blocks architecture review; architecture review should route back if explicit user approval is required before implementation.
