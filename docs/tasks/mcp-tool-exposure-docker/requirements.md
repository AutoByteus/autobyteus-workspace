# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined and approved by user on 2026-06-18. Scope now includes removing remote “Pair local browser” functionality in the same ticket, while preserving host Electron embedded browser support and container-local BrowserServer MCP support.

## Goal / Problem Statement

A Docker-hosted Codex agent is configured with BrowserServer MCP tools, but a running session misses same-named browser tools such as `open_tab` because the Agent Tools MCP catalog lets inactive embedded Electron browser adapter names reserve the namespace. The product direction is now clearer: remote/Docker nodes should use browser MCP configured inside the container/node, not a bridge back to the host Electron browser.

Therefore the system must simplify browser-source ownership:

- Host Electron-started server may expose embedded Electron browser tools through the existing env-injected local bridge.
- Remote/Docker nodes must not use the host Electron browser through “Pair local browser”. That functionality should be removed from backend, Electron, and UI surfaces.
- Remote/Docker browser automation should come from configured MCPs such as BrowserServer MCP.
- Inactive embedded browser providers must contribute no runtime tools and reserve no names, so configured MCP browser tools expose through the normal configured-MCP path.

## Investigation Findings

- Host Electron currently starts `BrowserRuntime`, starts `BrowserBridgeServer`, receives `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN`, and injects those env vars into the bundled server child process through platform server managers. This path should remain.
- Remote pairing currently uses Electron IPC to issue an expiring bridge descriptor, frontend GraphQL to send that descriptor to the remote node, and backend `RuntimeBrowserBridgeRegistrationService` to store an in-memory binding and dynamically register/unregister embedded browser tools. This path should be removed.
- The Docker server process has no browser bridge env vars and no need for host pairing; BrowserServer MCP is configured and registered in `/home/autobyteus/data/mcps.json`.
- `AgentToolMcpCatalog` currently reserves all static adapter names even when optional embedded browser support is inactive, causing BrowserServer MCP names like `open_tab` to be dropped as collisions.
- `attach_tab` survives because no embedded browser adapter has that name, proving the Agent Tools MCP descriptor reaches Codex and the failure is collision/routing policy.
- Frontend agent cards/details show configured `toolNames`, not the effective runtime tool manifest.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Cleanup/Removal.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy/Compatibility Pressure from remote host-browser pairing.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis: Agent Tools MCP reserves inactive embedded browser names; remote pairing adds a second browser implementation path for Docker nodes even though the intended path is container-local BrowserServer MCP.
- Requirement or scope impact: Remove remote pairing and route effective runtime tools from active sources only.

## In-Scope Use Cases

- UC-001: Host Electron starts the bundled server and embedded browser tools are exposed through env-injected `AUTOBYTEUS_BROWSER_BRIDGE_*` support.
- UC-002: Docker/remote node has BrowserServer MCP configured and selected; its browser tools are exposed through Agent Tools MCP/configured-MCP routing.
- UC-003: Docker/remote node has no BrowserServer MCP selected and no Electron env support; no embedded browser tools are exposed.
- UC-004: The Nodes settings screen no longer shows Remote Browser Sharing settings, pair/unpair state badges, or “Pair local browser” controls.
- UC-005: The backend no longer accepts GraphQL mutations that register or clear a remote host-browser bridge binding.
- UC-006: Existing platform/control tools such as `send_message_to` remain protected from configured MCP name collisions.
- UC-007: Runtime `tools/list`, `tools/call`, and backend descriptor `enabledTools` derive from the same source route decision.

## Out of Scope

- Redesigning BrowserServer MCP itself in `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp`.
- Requiring BrowserServer MCP to use `tool_name_prefix`.
- Removing host Electron embedded browser support for the bundled local server.
- Changing Codex/Claude provider-level MCP namespacing conventions.
- Adding new browser automation capabilities beyond exposing/removing the existing intended sources correctly.

## Functional Requirements

- REQ-001: Remote “Pair local browser” functionality must be removed from the product surface and runtime path.
- REQ-002: Host Electron embedded browser support must remain available through process-start env injection of `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN` into the bundled server.
- REQ-003: Backend runtime browser support resolution must no longer use an in-memory remote browser bridge registration as a browser-support source.
- REQ-004: Backend GraphQL schema must no longer expose `registerRemoteBrowserBridge` or `clearRemoteBrowserBridge` mutations or their associated input/result types.
- REQ-005: Electron IPC handlers and state controllers for remote browser sharing/pairing must be removed.
- REQ-006: Frontend Nodes settings must remove Remote Browser Sharing panel, pairing badges, and pair/unpair actions.
- REQ-007: Node registry/domain types and persisted normalization must stop modeling browser pairing state as an effective node capability; legacy persisted pairing fields may be ignored/dropped during normalization.
- REQ-008: Browser bridge server must bind for local embedded Electron support only; remote sharing listener-host configuration and remote descriptor issuing must be removed.
- REQ-009: Configured MCP-origin tools, including BrowserServer MCP browser tools, must remain independently visible/exposable when their MCP server is enabled and their registered tool is selected.
- REQ-010: Embedded browser adapter names must not reserve configured MCP tool names when host Electron env support is absent for the target process.
- REQ-011: Agent Tools MCP session exposure must use a source-aware route decision so `enabledTools`, `tools/list`, and `tools/call` agree on whether a tool is static embedded-browser/platform or configured MCP-origin.
- REQ-012: If an optional embedded browser route and a configured MCP route are both possible for the same selected browser name, the system must emit one deterministic route and no duplicate definitions; explicit configured MCP selection should take precedence for browser-tool overlaps.
- REQ-013: Protected non-browser/platform static tools must remain protected from configured MCP name collisions.
- REQ-014: Existing remote-node add/open/rename/remove behavior must continue without attempting remote browser cleanup.
- REQ-015: Tests and durable docs must be updated or removed to reflect that Docker/remote browser automation is MCP-based, not host-browser-pairing-based.

## Acceptance Criteria

- AC-001: In a Docker/no-env/no-pairing scenario with BrowserServer MCP `open_tab` registered and selected, Agent Tools MCP session exposure includes `open_tab` as a configured MCP route and includes it in descriptor `enabledTools` and `tools/list`.
- AC-002: In a Docker/no-env/no-BrowserServer scenario, no embedded browser tools such as `open_tab`, `read_page`, or `screenshot` appear in any effective runtime tool manifest.
- AC-003: In a host Electron env-supported scenario with no configured MCP duplicate, embedded browser tools can appear as effective runtime tools.
- AC-004: `resolveToolCallAvailability(session, "open_tab")` routes to the same source chosen at session exposure time and does not prefer static adapters merely because a static adapter with that name exists in code.
- AC-005: `tools/list` never emits duplicate definitions for a same-named browser tool.
- AC-006: The Nodes settings screen no longer contains Remote Browser Sharing panel, pairing state badges, or Pair/Unpair local browser controls.
- AC-007: Electron preload/main no longer exposes remote browser pairing IPC APIs.
- AC-008: Backend GraphQL introspection no longer includes remote browser bridge mutations/types, and generated frontend GraphQL types no longer expose them.
- AC-009: Remote node removal no longer calls remote browser cleanup logic and still removes nodes correctly.
- AC-010: Tests for runtime remote browser bridge registration/pairing are removed or replaced with tests proving the removed surface is absent.
- AC-011: Existing host Electron browser runtime tests still prove env overrides are injected into the bundled server.
- AC-012: Existing protected static collision tests for platform/control tools still pass.
- AC-013: Documentation no longer instructs users to pair the local Electron browser to remote/Docker nodes; it should direct Docker/remote browser automation to configured BrowserServer MCP or no browser tools.

## Constraints / Dependencies

- Authoritative app/server code is in `/home/autobyteus/workspace/autobyteus-workspace`; BrowserServer MCP package should not need changes.
- Host Electron local browser bridge env injection is still required for the embedded desktop server path.
- Agent Tools MCP sessions are in-memory and run-scoped; route ownership can be added without persisted migration.
- No backward-compatibility dual path should preserve removed remote pairing behavior.

## Assumptions

- The intended Docker/remote browser automation path is BrowserServer MCP configured inside the container/node.
- Users do not need Docker/remote nodes to control the host Electron browser.
- Legacy persisted node records may contain `browserPairing`; dropping/ignoring that field is acceptable in this no-backward-compatibility task.

## Risks / Open Questions

- Removing remote pairing touches frontend, Electron, backend GraphQL, generated types, tests, and docs; implementation should remove all references rather than leave dead code.
- If any user relied on remote nodes using host browser cookies/session, that workflow is intentionally removed.
- BrowserServer MCP result shapes should still be validated against existing runtime event normalization for browser tool cards/activity.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Case(s) |
| --- | --- |
| REQ-001 | UC-004, UC-005 |
| REQ-002 | UC-001 |
| REQ-003 | UC-002, UC-003, UC-005 |
| REQ-004 | UC-005 |
| REQ-005 | UC-004 |
| REQ-006 | UC-004 |
| REQ-007 | UC-004 |
| REQ-008 | UC-001, UC-004 |
| REQ-009 | UC-002 |
| REQ-010 | UC-002, UC-003 |
| REQ-011 | UC-002, UC-007 |
| REQ-012 | UC-001, UC-002, UC-007 |
| REQ-013 | UC-006 |
| REQ-014 | UC-004 |
| REQ-015 | UC-002, UC-003, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Proves configured BrowserServer MCP browser names survive Docker exposure. |
| AC-002 | Proves remote/Docker nodes without MCP have no embedded browser tools. |
| AC-003 | Preserves host Electron browser tools. |
| AC-004 | Proves route-backed call dispatch. |
| AC-005 | Prevents ambiguous same-name definitions. |
| AC-006 | Confirms user-facing pairing removal. |
| AC-007 | Confirms Electron pairing API removal. |
| AC-008 | Confirms backend pairing API removal. |
| AC-009 | Confirms node management still works after cleanup removal. |
| AC-010 | Confirms stale pairing tests are removed/replaced. |
| AC-011 | Guards host Electron env-injection path. |
| AC-012 | Guards protected platform tools. |
| AC-013 | Keeps durable docs aligned with product direction. |

## Approval Status

Approved by user on 2026-06-18, including same-ticket removal of remote “Pair local browser” functionality and simplification toward container-local BrowserServer MCP for Docker/remote browser automation.
