# Docs Sync Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Scope

- Ticket: autobyteus-437, `task_size` `Large`, `architectural_risk` `High`, reviewed route.
- Trigger: CRR-006 Pass on API-REV-003 (delivery re-entry after DR-001).
- Bootstrap base reference: `b690a5dfdb`
- Integrated base reference used for docs sync: `origin/personal` `31aa11b241` (merged as `3e85115f6e`; unchanged at DR-002's fetch)
- Post-integration verification reference: DR1-01…05 (`evidence/delivery/`), API-REV-003 MSP-21…23 (`evidence/api-e2e/R3-API-03-mobile-shell-msp21-23.log`)

## Why Docs Were Updated

- Summary: the ticket's own docs already describe the credential gate (contract, remote access, MCP gateway, Docker README, GLOSSARY, TESTING.md). Docs sync found two places where the merged state's docs did not match the final change: a base-doc sentence about the phone viewer's 20 s re-check, which this ticket replaced, and TESTING.md not naming the probe fixture whose absence caused the DR-001 failure.
- Why this should live in long-lived project docs: the phone viewer doc is the reference for revocation behaviour, and TESTING.md is where the next probe author learns how a probe's own sockets get the credential.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/node_access_model.md` | the contract (§1, §5, NA-7, NA-9, NAS-*) | No change | matches the implementation and CRR-002's wording; NAS-37 states the close-at-once revocation |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-12, signed peer path | No change | updated in the ticket |
| `autobyteus-server-ts/docs/features/remote_access.md` | phone credential, revocation | No change | line 131: revocation closes sockets at once with 4403 |
| `autobyteus-web/docs/remote_access.md` | phone viewer, base-added sections (433 names, 434 live streams) | **Updated** | line 194 still described the removed 20 s re-check |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md`, `autobyteus-web/docs/tools_and_mcp.md` | gateway token | No change | updated in the ticket |
| `autobyteus-server-ts/docker/README.md`, `autobyteus-server-ts/README.md` | setup code, `--allow-local-network` | No change | updated in the ticket |
| `docs/android_mobile_access.md`, `autobyteus-android/README.md` | base 433 changes on the phone | No change | `/rest/remote-access/status` stays exempt (`node-route-permissions.ts:81`), so the app's connection check is unchanged |
| `autobyteus-web/docs/agent_execution_architecture.md` | base 434 live run stream reconnection | No change | transport-level; credentials come from the window or page as before |
| `GLOSSARY.md` | node access terms | No change | updated in the ticket |
| `DESIGN.md` | project design | No change | updated in the ticket (8 lines) |
| `TESTING.md` | testing guideline | **Updated** | Browser probes: names `fixtures/probe-node-access.mjs` for the probe's own calls and sockets |
| `RELEASE.md` | release guide | No change | the release steps are unaffected; users' one-time steps are in the ticket's release notes |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | correction | "ends its open desktop stream within 30 seconds (the node re-checks … every 20 s)" → "at once: the node closes every open socket of that phone with 4403 and the refusal code (NAS-37)" | the ticket removed `NODE_DESKTOP_RECHECK_INTERVAL_MS` (present at `b690a5dfdb`, absent at HEAD); `open-socket-registry.ts` closes on revocation |
| `TESTING.md` | description of the existing fixture | the probe's own HTTP calls and "other window" sockets carry the credential through `probeNodeEnvironment`, `ownerHeaders`, `ownerSocketUrl`, `attachToBrowserContext` | both probe misses in this ticket (API-16 LRL-001…005; DR-001 MSP-21…23) were the probe's own sockets |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Probe credentials | a probe's own sockets need `ownerSocketUrl` | DR-001, API-REV-003 | `TESTING.md` § Browser probes |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Node desktop viewers' 20 s phone re-check (`NODE_DESKTOP_RECHECK_INTERVAL_MS`) | open-socket registry closing a revoked client's sockets at once (4403) | `node_access_model.md` NAS-37, `features/remote_access.md`, `autobyteus-web/docs/remote_access.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary; the user's AC-008 check; then finalization and the beta.
- Notes: the Secret Gate needed one narrow `.gitleaks.toml` entry for two made-up gateway tokens in `McpGatewayPanel.spec.ts` (`mcpg_` + a word + sequential digits); recorded in the release report.
