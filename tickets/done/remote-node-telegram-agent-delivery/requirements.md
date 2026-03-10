# Requirements

- Ticket: `remote-node-telegram-agent-delivery`
- Status: `Design-ready`
- Last Updated: `2026-03-10`
- Scope Classification: `Medium`

## Goal / Problem Statement

Fix the managed messaging runtime so a Telegram message received by a Docker-hosted remote node is forwarded to that same server process through a reachable local server address, allowing the remote server to launch the bound Codex run and surface activity in the remote Electron window.

## Scope Classification Rationale

- `Medium` because the fix changes shared runtime-bootstrap semantics across server startup, managed messaging runtime env generation, and deployment-sensitive tests.
- The change is small in line count but cross-cutting in behavior because it separates public server URL semantics from colocated child-process reachability semantics.

## In-Scope Use Cases

| use_case_id | Name | Summary |
| --- | --- | --- |
| UC-001 | Docker Remote Inbound Delivery | Managed Telegram on a Docker-hosted remote node forwards inbound envelopes to the same server through a reachable internal base URL. |
| UC-002 | Electron Embedded Dynamic Port | Managed messaging on the embedded Electron server uses the actual runtime listen port instead of assuming `8000`. |
| UC-003 | Managed Runtime Restore / Restart | Gateway enable, restart, and restore-after-startup all use the same internal server base URL resolution path. |
| UC-004 | Internal URL Resolution Failure | If the internal server base URL cannot be resolved, managed messaging start fails explicitly instead of silently falling back to the public URL. |

## Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Managed messaging must use a colocated internal server base URL for gateway-to-server ingress forwarding. | Inbound gateway forwarding targets a same-host reachable URL rather than the public client URL. | UC-001, UC-003 |
| R-002 | Internal server base URL resolution must honor the actual runtime listen port used by the server process. | Embedded Electron and Docker deployments both generate a correct internal base URL without hardcoding `8000`. | UC-002, UC-003 |
| R-003 | `AUTOBYTEUS_SERVER_HOST` must remain the server's public URL for external clients and absolute URL generation. | Remote-node registration, UI access, and absolute file/media URLs keep current public URL behavior. | UC-001, UC-002 |
| R-004 | Managed messaging must fail closed if the internal server base URL is unavailable or invalid. | Gateway startup or restart returns an actionable error rather than silently using the wrong public URL. | UC-004 |

## Acceptance Criteria

| acceptance_criteria_id | Requirement ID(s) | Acceptance Criterion | Expected Measurable Outcome |
| --- | --- | --- | --- |
| AC-001 | R-001 | Docker-hosted remote managed messaging forwards Telegram inbound messages through a reachable internal server URL. | No inbound dead-letter records caused by `fetch failed` when the only issue is host-mapped public URL usage. |
| AC-002 | R-002 | Embedded Electron managed messaging resolves the internal base URL from the actual runtime port. | The generated gateway server base URL matches the started server port and is not fixed to `8000`. |
| AC-003 | R-003 | Public URL behavior remains unchanged for outside clients. | `AUTOBYTEUS_SERVER_HOST` still drives public URL generation and remote node registration; no public client path is redirected to loopback. |
| AC-004 | R-004 | Internal URL resolution errors are surfaced explicitly during managed gateway startup. | Enable/restart/restore reports a deterministic configuration/runtime error instead of silently writing a broken `GATEWAY_SERVER_BASE_URL`. |

## Constraints / Dependencies

- Managed messaging is server-managed and the managed gateway process is colocated with the owning server process.
- Public client access and absolute URL generation still require a public server URL.
- No backward-compatibility wrapper should preserve the old "use public URL for managed gateway callbacks" behavior.
- The fix must support both Docker-hosted remote nodes and embedded Electron-hosted nodes.

## Assumptions

- Managed gateway-to-server forwarding is always same-host for the managed runtime flow.
- Server startup already knows the effective bind host and port before managed messaging restore or enable runs.
- A runtime-only internal URL may be derived without exposing a new user-facing setting.

## Open Questions / Risks

- Telegram polling conflicts from another running bot instance are a separate operational issue and are not the primary scope of this fix.
- Provider session disconnection status is currently under-surfaced in the UI; that observability gap is a follow-up, not part of the primary forwarding fix.
- Deployments that intentionally bind the server to a non-loopback concrete host need the resolver to preserve that host rather than blindly forcing `127.0.0.1`.

## Requirement Coverage Map

| requirement_id | Covered By Use Case IDs |
| --- | --- |
| R-001 | UC-001, UC-003 |
| R-002 | UC-002, UC-003 |
| R-003 | UC-001, UC-002 |
| R-004 | UC-004 |

## Acceptance-Criteria Coverage Map To Stage 7 Scenarios

| acceptance_criteria_id | Planned Stage 7 Scenario IDs |
| --- | --- |
| AC-001 | S-001 |
| AC-002 | S-002 |
| AC-003 | S-003 |
| AC-004 | S-004 |

## Planned Stage 7 Scenario Index

| scenario_id | Scenario | Maps To AC |
| --- | --- | --- |
| S-001 | Docker-hosted remote node writes managed gateway env with a reachable internal base URL and forwards inbound Telegram to server ingress successfully. | AC-001 |
| S-002 | Embedded Electron runtime writes managed gateway env with the started internal port rather than `8000`. | AC-002 |
| S-003 | Public server URL for external clients remains unchanged after the internal managed-messaging fix. | AC-003 |
| S-004 | Managed gateway start fails with explicit error when no internal server base URL can be resolved. | AC-004 |
