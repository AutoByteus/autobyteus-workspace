# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined. User approved requirements/design kickoff on 2026-06-19. Simplified design direction: `/mcp/gateway` is the stable general MCP gateway endpoint, and it exposes only registered MCP-origin tools. Internal AutoByteus agent tools stay out of this category.

## Goal / Problem Statement

AutoByteus already has a run-scoped Streamable HTTP MCP surface for AutoByteus-managed runtimes such as Codex App Server and Claude Agent SDK:

```text
/mcp/agent-tools/:sessionId
```

That surface is intentionally tied to an active AgentRun/member and can expose AutoByteus internal agent tools plus selected MCP-origin tools for that run.

The requested new capability is a minimal working general MCP gateway surface for external MCP clients such as Cursor, Antigravity, Claude Code, or other AI CLIs. The external client should configure AutoByteus as one normal MCP server:

```text
/mcp/gateway
```

The general gateway should expose only tools that AutoByteus imported from configured external MCP servers, i.e. registered `ToolOrigin.MCP` tools. It must not expose AutoByteus internal agent/run tools such as `send_message_to`, task delegation, `publish_artifacts`, media, browser, or other run-dependent server-owned tools.

## Investigation Findings

- Current Agent Tools MCP is documented and implemented as a run/session-scoped endpoint `/mcp/agent-tools/:sessionId`.
- Current sessions require AgentRun ownership (`runId`) and carry sender/runtime/execution context.
- Current runtime materializers for Codex/Claude mint private descriptors for active runs.
- MCP Server Management already imports external MCP servers and registers their tools as `ToolOrigin.MCP` definitions with `metadata.mcp_server_id`.
- Current configured MCP-origin execution already delegates through the registry-created `GenericMcpTool` / existing MCP proxy path.
- The simplified gateway design avoids profiles and token-management UI for the first version: make `/mcp/gateway` work and expose all currently registered MCP-origin tools.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Boundary Addition
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, if trying to reuse run-scoped session for external clients; no, if adding a separate MCP-origin-only gateway.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue avoided by explicit surface split.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Limited refactor likely needed only around MCP-origin execution identity / gateway route sharing; no refactor of internal run MCP behavior intended.
- Evidence basis: Current run-scoped MCP data model is correct for internal provider runtimes but carries AgentRun-only assumptions. General gateway becomes simpler and safer if it exposes only `ToolOrigin.MCP` tools through a separate endpoint.
- Requirement or scope impact: The new gateway must not attempt to make AutoByteus internal agent tools externally callable.

## Recommendations

1. Preserve `/mcp/agent-tools/:sessionId` unchanged for internal run-based runtime materializers.
2. Add `/mcp/gateway` as the stable external MCP gateway endpoint.
3. Gate `/mcp/gateway` with a simple gateway bearer token unless product chooses local-only unauthenticated mode; token should be preferred.
4. In the first version, valid gateway access exposes all currently registered `ToolOrigin.MCP` tools.
5. `tools/list` must filter strictly to `ToolOrigin.MCP` definitions.
6. `tools/call` must reject any non-MCP-origin tool, even if the tool name exists in the registry.
7. Gateway calls should execute through the existing MCP proxy/registry path with a stable gateway execution identity, not a fake AgentRun.
8. Defer profiles, per-client tool subsets, multi-user principals, and internal AutoByteus tool exposure.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The scope is much smaller than a general AutoByteus tool gateway because it excludes run-dependent internal tools and profiles, but it still requires a new MCP endpoint, auth/token handling, MCP-origin filtering, execution identity handling, and durable tests.

## In-Scope Use Cases

- UC-001: External MCP client configures AutoByteus once as `http://127.0.0.1:<port>/mcp/gateway`.
- UC-002: External MCP client can initialize and use `/mcp/gateway` under the minimal configured access mode.
- UC-003: Gateway `tools/list` returns all currently registered `ToolOrigin.MCP` tools.
- UC-004: Gateway `tools/call` executes a registered MCP-origin tool through the existing MCP proxy path.
- UC-005: Gateway rejects AutoByteus internal/non-MCP-origin tool names.
- UC-006: Existing internal run-scoped `/mcp/agent-tools/:sessionId` behavior remains unchanged.

## Out of Scope

- Gateway profiles or per-client tool subsets.
- Exposing AutoByteus internal agent tools through `/mcp/gateway`.
- Binding `/mcp/gateway` to an active AgentRun.
- UI for multiple gateway access profiles or token rotation/revocation.
- OAuth/multi-user authorization.
- Replacing or renaming `/mcp/agent-tools/:sessionId`.

## Functional Requirements

- REQ-GW-001: The server must expose a stable general MCP gateway endpoint at `/mcp/gateway`.
- REQ-GW-002: `/mcp/gateway` must be separate from `/mcp/agent-tools/:sessionId`; no AgentRun session id is required in the gateway URL.
- REQ-GW-003: Gateway access must use the minimal configured access mode for this version; no token/profile CRUD is required. If a gateway token is configured, invalid/missing bearer auth must be rejected.
- REQ-GW-004: `tools/list` on `/mcp/gateway` must return only registered `ToolOrigin.MCP` tools from the AutoByteus tool registry.
- REQ-GW-005: `tools/call` on `/mcp/gateway` must reject all tool names whose current registry definition is missing or not `ToolOrigin.MCP`.
- REQ-GW-006: Gateway MCP-origin calls must execute through the existing registry-created MCP tool / MCP proxy path.
- REQ-GW-007: Gateway execution must use a stable gateway execution identity for remote MCP server instance scoping and must not fabricate an AgentRun id.
- REQ-GW-008: AutoByteus internal agent tools must not be visible or callable through `/mcp/gateway` in the first version.
- REQ-GW-009: Existing `/mcp/agent-tools/:sessionId` behavior and tests must continue to pass unchanged.
- REQ-GW-010: Gateway responses and logs must not leak gateway bearer tokens or sensitive remote MCP credentials.
- REQ-GW-011: Frontend Settings -> MCP Servers must present two tabs, similar to the Nodes page pattern: `MCP Servers` for existing server configuration and `MCP Gateway` for the gateway endpoint/config/help.
- REQ-GW-012: The MCP Gateway tab must be minimal: show the stable endpoint/config snippet and expose-count/list using existing MCP tool data where practical; no token management mutations are required in this version.

## Acceptance Criteria

- AC-GW-001: A Cursor/Antigravity-style MCP client can initialize against `/mcp/gateway` using the minimal configured access mode.
- AC-GW-002: `tools/list` returns registered MCP-origin tools and excludes known AutoByteus internal tools such as `send_message_to`, task delegation tools, `publish_artifacts`, media tools, and browser tools.
- AC-GW-003: Calling a registered MCP-origin tool through `/mcp/gateway` delegates to the existing MCP proxy path and returns the MCP tool result content.
- AC-GW-004: Calling `send_message_to` or another non-MCP-origin registered tool through `/mcp/gateway` returns a tool-not-found/not-allowed style MCP error without reaching its executor.
- AC-GW-005: If a tool registry entry changes from `ToolOrigin.MCP` to another origin or disappears, gateway calls fail closed.
- AC-GW-006: If gateway bearer auth is configured, missing/invalid token cannot list or call tools.
- AC-GW-007: Existing `/mcp/agent-tools/:sessionId` route integration tests still pass.
- AC-GW-008: No implementation introduces fake run ids into user-visible events, run history, or memory.
- AC-GW-009: Settings -> MCP Servers renders an internal tab switcher with `MCP Servers` and `MCP Gateway` tabs.
- AC-GW-010: MCP Gateway tab displays `/mcp/gateway` configuration guidance and the currently exposed registered MCP-origin tools/count without adding profile or token-management workflows.

## Constraints / Dependencies

- MCP Server Management remains the owner of external MCP server config, discovery, remote transport clients, connection reuse, and cleanup.
- Agent Tools MCP remains the owner of run-scoped provider runtime tool projection.
- Gateway must use current MCP protocol behavior supported by the server's existing MCP route helpers where practical.
- The first version should remain local/simple and avoid broader account/principal/profile/token-management complexity.

## Assumptions

- General gateway users want AutoByteus to act as a gateway to configured external MCP tools, not as a public interface to AutoByteus internal run tools.
- A single optional configured gateway token or local-only access mode is acceptable for the first version; the key goal is a working `/mcp/gateway`.
- If narrower access is required later, profiles can be added without changing `/mcp/gateway` URL shape.

## Risks / Open Questions

- Where should the optional gateway token be configured/stored for first version: env var, server settings, or config file?
- Should unauthenticated local-only mode be allowed for desktop convenience, or should token always be required when remote access is enabled?
- Does the current `autobyteus-ts` MCP proxy require an `agentId` string deeply, or can it accept an explicit gateway execution identity with minimal change?
- Should `/mcp/gateway` support DELETE/session termination semantics beyond the existing basic route behavior?

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-GW-001 | UC-001 |
| REQ-GW-002 | UC-001, UC-006 |
| REQ-GW-003 | UC-002 |
| REQ-GW-004 | UC-003 |
| REQ-GW-005 | UC-005 |
| REQ-GW-006 | UC-004 |
| REQ-GW-007 | UC-004 |
| REQ-GW-008 | UC-005 |
| REQ-GW-009 | UC-006 |
| REQ-GW-010 | UC-002, UC-004 |
| REQ-GW-011 | UC-001 |
| REQ-GW-012 | UC-001, UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-GW-001 | External client can treat AutoByteus as a normal MCP server. |
| AC-GW-002 | Gateway scope is MCP-origin-only. |
| AC-GW-003 | Gateway reuses existing remote MCP execution path. |
| AC-GW-004 | Internal AutoByteus tools are not exposed externally. |
| AC-GW-005 | Stale or non-MCP registry state fails closed. |
| AC-GW-006 | Access control is enforced when configured. |
| AC-GW-007 | Internal run-based MCP does not regress. |
| AC-GW-008 | No fake AgentRun leakage. |
| AC-GW-009 | Frontend navigation uses tabs inside MCP Servers settings. |
| AC-GW-010 | Gateway tab is useful but minimal. |

## Approval Status

Approved by user for design and downstream review on 2026-06-19.
