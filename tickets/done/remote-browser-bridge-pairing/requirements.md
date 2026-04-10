# Requirements

- Status: `Design-ready`
- Ticket: `remote-browser-bridge-pairing`
- Last Updated: `2026-04-10`
- Scope Triage: `Large`
- Triage Rationale: The feature crosses Electron browser runtime ownership, remote-node onboarding, runtime server capability exposure, tool-advertisement behavior, security/pairing boundaries, and multi-surface validation.

## Goal / Problem Statement

Electron already provides a local browser bridge that gives embedded agents a strong in-app browser UX. Remote or Docker nodes cannot currently use that same Electron-owned browser capability, even when the user explicitly trusts a node and wants that node to drive the local Electron browser surface. The product needs an explicit, advanced, off-by-default pairing model so a user-selected remote node can use the Electron browser bridge without making the desktop browser capability globally available by default.

## Scope Positioning

- In scope:
  - Electron desktop as the authoritative owner of the browser runtime and browser shell
  - user-added remote nodes, including same-host Docker nodes and trusted LAN-reachable nodes explicitly added in Electron
  - explicit per-node pairing initiated from Electron UI
  - runtime enablement and revocation without remote server restart
  - browser tool selection/execution behavior on paired nodes
- Out of scope:
  - automatic discovery or broadcast pairing to arbitrary nodes
  - unauthenticated public-internet browser sharing
  - replacing the Electron-owned browser runtime with a separate remote browser runtime
  - multi-node shared credentials or blanket network-wide browser grants

## In-Scope Use Cases

- `UC-001` (Requirement): User enables advanced remote-browser sharing in Electron settings.
  - Expected outcome: Electron remains loopback-only by default and only exposes remote reachability when the user explicitly opts in.
- `UC-002` (Requirement): User adds or opens a specific remote node and explicitly pairs that node with the local Electron browser.
  - Expected outcome: Only the selected node receives the browser bridge descriptor and authorization material.
- `UC-003` (Requirement): A user configures or syncs agent definitions on a paired-capable remote node.
  - Expected outcome: Browser tool names remain selectable or preservable for that node without requiring remote server restart.
- `UC-004` (Requirement): A paired remote node with configured browser tool names runs an agent that invokes browser operations.
  - Expected outcome: Remote node browser tool calls execute through the Electron-owned browser bridge and surface in the existing Browser shell.
- `UC-005` (Requirement): An unpaired remote node, or a paired node after revocation/expiry, cannot use the Electron browser bridge.
  - Expected outcome: Browser tool exposure or execution fails safely rather than silently granting access.
- `UC-006` (Requirement): Existing embedded Electron browser behavior remains unchanged.
  - Expected outcome: Embedded-node browser support still works through the current local bridge path without new required user configuration.
- `UC-007` (Requirement): Agent tool gating remains authoritative.
  - Expected outcome: Pairing does not expose browser tools unless the agent definition already includes the configured browser tool names.

## Requirements

- `R-001`: Electron must keep remote-browser sharing disabled by default.
  - Expected outcome: Fresh installs and existing users remain on loopback-only browser bridge behavior unless they explicitly enable the feature.
- `R-002`: Electron must expose an advanced opt-in control for remote-browser sharing with explicit security warning and restart semantics when listener mode changes are required.
  - Expected outcome: Users understand they are granting a selected remote node control over the local Electron browser.
- `R-003`: Remote-browser sharing must apply only to nodes the user explicitly added in Electron and explicitly chose to pair.
  - Expected outcome: The feature does not broadcast browser access to arbitrary nodes on the network.
- `R-004`: Remote-browser sharing must use explicit per-node pairing rather than a blanket global grant.
  - Expected outcome: Browser bridge credentials are issued or registered only for the selected node.
- `R-005`: Browser bridge authorization for remote nodes must be revocable, scoped, and time-bounded.
  - Expected outcome: Tokens or equivalent credentials can expire or be revoked without requiring permanent trust.
- `R-006`: Remote server/browser bridge registration must be supported after node add/open time without requiring a full remote server restart.
  - Expected outcome: Pairing can happen through a runtime API path rather than only through static environment variables.
- `R-007`: Remote-node browser tool configuration must remain usable without requiring a remote server restart once remote-browser sharing is enabled and pairing is available.
  - Expected outcome: Users can configure or preserve browser `toolNames` on an eligible remote node without being blocked by startup-only browser tool registration.
- `R-008`: Remote browser availability must preserve the existing agent `toolNames` gating model.
  - Expected outcome: Browser tools are reachable only when both pairing/bridge support exists and the agent definition explicitly enables the relevant browser tool names.
- `R-009`: Electron Browser shell ownership must remain authoritative for browser session lifecycle and rendering.
  - Expected outcome: The remote-node feature reuses the current Browser runtime and shell rather than adding a second browser engine or renderer-owned runtime.
- `R-010`: The product must surface pairing status and failure states clearly in the node-management experience.
  - Expected outcome: Users can tell whether a node is unpaired, paired, expired, revoked, or rejected.
- `R-011`: Existing embedded Electron browser behavior must remain unchanged.
  - Expected outcome: Embedded server startup, browser tool availability, and browser shell behavior continue to work without requiring remote-browser-sharing opt-in.

## Acceptance Criteria

- `AC-001`: Browser bridge remains loopback-only and remote-node browser access remains unavailable when the advanced setting is disabled.
- `AC-002`: When the advanced setting is enabled and a user explicitly pairs a node, only that node receives browser-bridge pairing material.
- `AC-003`: On a remote node participating in this feature, browser tool names can be configured or preserved for agents without requiring remote server restart after pairing.
- `AC-004`: A paired remote node can execute Electron browser operations only when the corresponding agent browser tool names are configured.
- `AC-005`: A node without valid pairing material cannot execute Electron browser operations, even if the user previously enabled the advanced setting.
- `AC-006`: Revoking or expiring a pairing disables subsequent remote browser operations without breaking embedded browser support.
- `AC-007`: Existing embedded Electron browser flows continue to function without new mandatory setup.
- `AC-008`: Validation covers security-sensitive negative paths, tool-advertisement/configuration behavior, and the positive paired-node execution flow.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001` | `UC-001`, `UC-005`, `UC-006` |
| `R-002` | `UC-001`, `UC-002` |
| `R-003` | `UC-002`, `UC-005` |
| `R-004` | `UC-002`, `UC-004`, `UC-005` |
| `R-005` | `UC-002`, `UC-004`, `UC-005` |
| `R-006` | `UC-002`, `UC-004`, `UC-005` |
| `R-007` | `UC-003` |
| `R-008` | `UC-004`, `UC-007` |
| `R-009` | `UC-004`, `UC-006` |
| `R-010` | `UC-002`, `UC-005` |
| `R-011` | `UC-006` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Advanced setting off: remote nodes stay unable to use Electron browser |
| `AC-002` | Pair one specific node: only that node gets pairing material |
| `AC-003` | Pair/configure flow: browser tool names remain configurable without restart |
| `AC-004` | Positive execution: paired node + configured browser tool names succeed |
| `AC-005` | Negative execution: missing/invalid pairing fails safely |
| `AC-006` | Revocation/expiry: previously paired node loses access without embedded regression |
| `AC-007` | Embedded non-regression: embedded browser flow remains unchanged |
| `AC-008` | Validation completeness: test matrix covers configuration, security negatives, and positive execution |

## Constraints / Dependencies

- Electron browser lifecycle ownership must remain in Electron main and Browser shell boundaries.
- Embedded browser support already depends on the browser bridge env path and must not regress.
- Remote pairing cannot bypass current agent configured-tool exposure rules.
- Remote node tool-advertisement behavior currently depends on startup-loaded tool registry state.
- The feature must be explicitly advanced/opt-in and must not silently expose a network-reachable browser control surface by default.
- Remote browser sharing only applies to nodes explicitly added in Electron; generic public exposure is out of scope.

## Assumptions

- Same-host Docker and user-trusted LAN nodes explicitly added in Electron are the main motivating cases.
- A runtime registration/pairing API on the server is preferable to relying only on startup environment variables for remote nodes.
- Short-lived per-node credentials are an acceptable initial trust model if revocation and visibility are present.
- Public-internet browser sharing is not required for the first delivery of this feature.

## Open Questions / Risks

- Whether the server should always advertise browser tool names on remote nodes participating in this feature, or advertise them only while an active pairing exists.
- Whether pairing material should be stored in-memory only on the remote server or support limited durable recovery after remote-server restart.
- Whether pairing should be initiated automatically immediately after add-node success or exposed only as an explicit follow-up action after add/open.
- Whether listener bind-mode changes require full app restart or can be partially reconfigured at runtime on all desktop platforms.
