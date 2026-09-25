# Requirements

## Metadata

- Ticket: `messaging-gateway-desktop-distribution`
- Status: `Refined`
- Owner: `Codex`
- Branch: `codex/messaging-gateway-distribution-analysis`
- Last Updated: `2026-03-08`
- Scope Triage: `Medium`

## Scope Rationale

- The change is `Medium` scope because it crosses release/distribution, backend capability ownership, node-scoped frontend UX, process supervision, and persistent install/state management.

## Refined Problem Statement

External messaging currently depends on a separately run `autobyteus-message-gateway` service that the user must provision and manage outside the selected node. That model is inconsistent with the product's node-based architecture and creates avoidable setup friction, especially for embedded Electron usage and managed remote nodes.

## Decisions Already Made

- Messaging for this feature is a `node/server capability`, not an Electron-only local extension.
- The gateway source should remain in the current monorepo.
- The gateway runtime should remain a separate process, not be merged into the main server process.
- The default delivery strategy should be on-demand download of a compatible gateway artifact when messaging is enabled on a node, rather than bundling the gateway into every release package by default.
- WeChat-specific behavior is out of scope for this feature.
- A generic extension marketplace/framework is not required for the first iteration.

## Goal

Allow a user to enable, configure, and operate messaging on a selected node through that node's server, without requiring the user to manually run a separate gateway service as the default path.

## In Scope

- Server-managed installation, enablement, configuration, start/stop, status, and update control for the messaging gateway.
- Node-scoped messaging capability discovery and status reporting.
- Server-owned persistence layout for gateway binaries/artifacts, config, logs, and runtime state.
- Frontend control flows that target the selected node's server instead of a manually entered gateway URL/token.
- Embedded-node and remote-node behavior under the same ownership model.
- Release/version compatibility expectations between `autobyteus-server-ts` and `autobyteus-message-gateway`.
- Release-manifest or equivalent lookup needed to resolve a compatible gateway artifact for on-demand installation.
- Read-only runtime diagnostics exposed by the server for the managed gateway, including port/bind/version/install state.

## Out Of Scope

- WeChat and WeChat sidecar support.
- Full Stage 3 design decisions such as the final API schema or exact artifact delivery mechanism.
- A generic server-extension ecosystem for arbitrary third-party runtimes.
- Rewriting the gateway into the main server process.
- Provider policy/compliance work beyond current supported non-WeChat providers.

## Primary Use Cases

1. A user selects the embedded node in Electron and enables messaging.
2. A user selects a remote node and enables messaging on that node.
3. A user configures provider credentials and messaging options through the node's server-managed UI/API.
4. A user checks whether messaging is installed, running, degraded, stopped, or misconfigured on a node.
5. A user disables or updates the managed gateway on a node without manually operating Docker or a separate shell process.

## Functional Requirements

- `FR-001`: The selected node's server must be the control-plane owner for messaging lifecycle operations.
- `FR-002`: The server must expose node-scoped messaging capability status, including whether messaging is unavailable, installable, installed, enabled, running, degraded, or blocked by configuration/runtime issues.
- `FR-003`: Enabling messaging from the frontend must trigger a server-owned install/activation flow on the selected node rather than requiring the user to manually start a separate gateway.
- `FR-003A`: The initial install/activation flow should download a server-compatible gateway artifact on demand when the required version is not already present on the node.
- `FR-003B`: The server must resolve the artifact version from an explicit compatibility source rather than downloading an arbitrary "latest" gateway build.
- `FR-004`: The managed gateway runtime must execute as a separate child process or companion service owned by the selected node's server.
- `FR-005`: Gateway artifacts, config, logs, and runtime state must persist under server-owned data directories on the node.
- `FR-005A`: Artifact installation must include integrity verification and archive extraction before activation.
- `FR-006`: The default managed UX must not require the user to enter a raw gateway base URL or admin token.
- `FR-007`: Provider configuration for managed messaging must be mediated by the selected node's server API.
- `FR-007A`: The server must persist and apply provider-configuration changes for the managed gateway, then report resulting readiness/configuration state back to the frontend.
- `FR-008`: The solution must work for both the Electron-embedded node and remote nodes using the same ownership model.
- `FR-009`: The server must be able to report health and failure reasons for the managed gateway so the frontend can present actionable status.
- `FR-009A`: The server must report runtime diagnostics for the managed gateway, including the effective bind address/port and installed/running version, so the frontend can expose them as read-only status details.
- `FR-009B`: The server must report installation lifecycle progress and messages so the frontend can show states such as `downloading`, `installing`, `starting`, and `error`.
- `FR-010`: The gateway and server release process must define compatibility so a node installs or runs a matching gateway version.
- `FR-011`: The initial managed capability must exclude WeChat and only target non-WeChat messaging providers.
- `FR-012`: The initial implementation must not depend on a generic plugin framework, arbitrary remote code execution, or Docker daemon control as a prerequisite.
- `FR-013`: The selected node's server must support disabling managed messaging, stopping the supervised gateway, and surfacing a disabled state without requiring manual shell or Docker actions.
- `FR-014`: The selected node's server must support updating the managed gateway to a newer compatible artifact through the same server-owned install/supervision boundary, with rollback to the previous active version if activation fails.

## Non-Functional Requirements And Constraints

- `NFR-001`: The primary setup path should materially reduce user friction compared with today's manual external gateway model.
- `NFR-002`: Failure isolation must be preserved by keeping the gateway outside the main server process.
- `NFR-003`: The model must remain coherent in a multi-node product where different windows or sessions can target different nodes.
- `NFR-004`: The solution should preserve monorepo-local refactoring and coordinated release workflows.
- `NFR-005`: Embedded-node behavior and remote-node behavior should differ only in deployment location, not in ownership semantics.
- `NFR-006`: Release size growth should be minimized by avoiding unconditional packaging of the gateway artifact when the user never enables messaging on a node.
- `NFR-007`: Artifact download and install failures must be surfaced with actionable diagnostics rather than opaque "enable failed" messaging.

## Constraints And Dependencies

- `D-001`: A new build/release path is required for a standalone gateway artifact because the repo currently publishes desktop installers and a server Docker image, but not a downloadable gateway runtime package.
- `D-002`: The server needs a manifest or equivalent compatibility source to map a running server version to the correct gateway artifact.
- `D-003`: The server needs runtime-install helpers beyond raw file download, specifically integrity verification and archive extraction.
- `D-004`: Frontend install/progress UX should reuse node-scoped server APIs and should not depend on Electron-only IPC because remote nodes must be supported.

## Assumptions To Carry Into Stage 3

- `A-001`: Managed messaging is the replacement path for in-scope providers; the legacy raw gateway URL/token setup flow should be removed rather than retained as a permanent compatibility mode.
- `A-002`: A versioned install root under server-owned data is acceptable. A representative layout would be `server-data/extensions/messaging-gateway/<version>/` plus sibling config/state/log paths under server data.
- `A-003`: The selected node already has a usable Node runtime because `autobyteus-server-ts` itself is running there.
- `A-004`: The frontend should present runtime port information as diagnostic output, not as a user-entered setup field.
- `A-005`: A staged Node runtime package for the gateway is the preferred downloadable artifact shape unless a stronger distribution constraint appears during design.

## Acceptance Criteria

- `AC-001`: The frontend can query the selected node and determine whether managed messaging is supported and what its current lifecycle state is.
- `AC-002`: A user can enable messaging on the selected node without manually launching Docker or a separate gateway process as the default setup path.
- `AC-002A`: If the required gateway artifact is not already installed on the node, enabling messaging causes the server to download the matching artifact automatically before startup.
- `AC-002B`: The server chooses the gateway artifact from an explicit compatibility source; it does not blindly install an unpinned latest build.
- `AC-003`: Managed messaging configuration flows no longer require a raw gateway base URL or gateway admin token in the default UX.
- `AC-003A`: A user can save provider credentials and messaging options through the node's server-managed UI/API, and the resulting status reflects whether the gateway is ready, misconfigured, or blocked.
- `AC-004`: The gateway runs as a server-managed separate process with logs/state/config persisted under server-owned storage on the node.
- `AC-004A`: After startup, the frontend can show read-only runtime details reported by the server, including the active gateway port, as status or advanced diagnostics.
- `AC-004B`: During install/start, the frontend can show progress and failure messaging from the server for states such as `downloading`, `installing`, `starting`, and `error`.
- `AC-005`: The same capability model works for both the embedded Electron node and remote nodes.
- `AC-006`: Server and gateway version compatibility is explicitly defined for releases.
- `AC-007`: WeChat is excluded from the initial managed capability scope and does not block the design.
- `AC-008`: A user can disable managed messaging on the selected node, causing the server to stop the supervised gateway and expose a `disabled` or equivalent inactive state.
- `AC-009`: A user can update the managed gateway on the selected node through the server-managed flow, and if activation of the new version fails, the server keeps or restores the previously active version instead of leaving the node in a broken partial state.

## Requirement Coverage Map

| Requirement | Covered By Use Cases | Supported By Investigation Findings |
| --- | --- | --- |
| `FR-001` | `1`, `2`, `3`, `4`, `5` | `F-001`, `F-002`, `F-003` |
| `FR-002` | `4` | `F-001`, `F-003` |
| `FR-003` | `1`, `2` | `F-002`, `F-005` |
| `FR-003A` | `1`, `2` | `F-011` |
| `FR-003B` | `1`, `2` | `F-015` |
| `FR-004` | `1`, `2`, `5` | `F-004`, `F-005`, `F-009` |
| `FR-005` | `1`, `2`, `5` | `F-003`, `F-009` |
| `FR-005A` | `1`, `2`, `5` | `F-016` |
| `FR-006` | `1`, `2`, `3` | `F-002` |
| `FR-007` | `3` | `F-003`, `F-004` |
| `FR-007A` | `3`, `4` | `F-003`, `F-004` |
| `FR-008` | `1`, `2`, `4`, `5` | `F-001`, `F-009` |
| `FR-009` | `4`, `5` | `F-003`, `F-004` |
| `FR-009A` | `4`, `5` | `F-012` |
| `FR-009B` | `1`, `2`, `4`, `5` | `F-013` |
| `FR-010` | `2`, `5` | `F-007`, `F-008` |
| `FR-011` | `1`, `2`, `3`, `4`, `5` | `F-010` |
| `FR-012` | `1`, `2`, `5` | `F-005`, `F-006` |
| `FR-013` | `5` | `F-003`, `F-004`, `F-009` |
| `FR-014` | `5` | `F-008`, `F-011`, `F-016` |

## Acceptance Criteria Traceability

| Acceptance Criterion | Primary Requirements |
| --- | --- |
| `AC-001` | `FR-001`, `FR-002`, `FR-009`, `FR-009B` |
| `AC-002` | `FR-001`, `FR-003`, `FR-003A`, `FR-004`, `FR-012` |
| `AC-002A` | `FR-003A`, `FR-010` |
| `AC-002B` | `FR-003B`, `FR-010` |
| `AC-003` | `FR-006`, `FR-007` |
| `AC-003A` | `FR-007`, `FR-007A`, `FR-009` |
| `AC-004` | `FR-004`, `FR-005`, `FR-009` |
| `AC-004A` | `FR-009`, `FR-009A` |
| `AC-004B` | `FR-009`, `FR-009B` |
| `AC-005` | `FR-001`, `FR-008` |
| `AC-006` | `FR-010` |
| `AC-007` | `FR-011` |
| `AC-008` | `FR-001`, `FR-004`, `FR-013` |
| `AC-009` | `FR-004`, `FR-010`, `FR-014` |

## Acceptance Criteria To Stage 7 Scenario Seeds

| Acceptance Criteria ID | Scenario Seed ID | Planned Test Level | Expected Outcome |
| --- | --- | --- | --- |
| `AC-001` | `AV-001` | `API` | Node-scoped status query reports capability state and support. |
| `AC-002` | `AV-002` | `E2E` | Enabling messaging from the frontend triggers server-owned activation. |
| `AC-002A` | `AV-003` | `E2E` | Missing gateway artifact is downloaded automatically before startup. |
| `AC-002B` | `AV-004` | `API` | Compatibility source resolves the exact gateway artifact version used for install. |
| `AC-003` | `AV-005` | `E2E` | Managed setup completes without raw gateway URL/token entry. |
| `AC-004` | `AV-006` | `API` | Managed gateway runs as a separate supervised process with persisted state/log/config paths. |
| `AC-004A` | `AV-007` | `API` | Runtime diagnostics include port/version/bind details as read-only data. |
| `AC-004B` | `AV-008` | `E2E` | Frontend shows install/start progress and failure messages from the server. |
| `AC-005` | `AV-009` | `E2E` | The same managed capability flow works for embedded and remote nodes. |
| `AC-006` | `AV-010` | `API` | Release compatibility rules prevent mismatched server/gateway versions. |
| `AC-007` | `AV-011` | `API` | WeChat remains excluded from the managed capability surface. |
| `AC-003A` | `AV-012` | `E2E` | Provider credentials and messaging options are saved through the server-managed flow and readiness state updates accordingly. |
| `AC-008` | `AV-013` | `E2E` | Disabling messaging stops the managed gateway and exposes an inactive state without manual shell or Docker steps. |
| `AC-009` | `AV-014` | `API` | Updating the managed gateway activates a newer compatible version or restores the previous active version if activation fails. |

## Open Questions

- `Q-001`: What exact artifact format should the gateway release publish: `.tar.gz`, `.zip`, or platform-specific bundles?
- `Q-002`: Should the server expose managed gateway lifecycle through GraphQL, REST, or split status/control surfaces?
- `Q-003`: How much of the gateway API should remain directly callable versus proxied/mediated by the server?

## Risks

- `RISK-001`: Shipping dynamic install without explicit artifact integrity checks would create an unsafe runtime-install path.
- `RISK-002`: Designing diagnostics around raw port usage instead of node-owned status could regress the product back toward manual gateway operations.
- `RISK-003`: Failing to define a gateway artifact release lane will block the on-demand install model even if runtime code is implemented.
