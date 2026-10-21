# Docs Sync Report — autobyteus-261 (Remote discovery, slice S5)

## Scope

- Ticket: `remote-discovery` (autobyteus-261, part of autobyteus-25). Classification `Medium` / `High`, reviewed route.
- Trigger: CRR-002 (test-code review Pass) after API-REV-001 (Pass, 95%), handed to delivery by the code reviewer.
- Bootstrap base reference: `origin/personal` `8fbe77c461`.
- Integrated base reference used for docs sync: `origin/personal` `8fbe77c461`. The base had not advanced; the branch was already current.
- Post-integration verification reference: not rerun, because the branch was already current (`release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the implementation updated the long-lived docs (design commit for CM-12; `d7bcd1b768` and `93dc932920`). Delivery checked every statement against the final code and found them accurate, so delivery made no further edit.
- Why this lives in long-lived docs: discovery adds two opt-in agent tools, two routes between nodes, a new refusal shape (`target {kind, name}` instead of `targetName`) and new agent-facing texts. Future changes to the catalog or the contract between nodes must keep them aligned.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-12; the scope table | No change | Discovery is listed as holding since autobyteus-261; no stale "discovery in a later slice" remains. |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Four routes, the refusal `target`, `PeerClient` strict list, `RemoteCatalogLister`, § Discovery | No change | Every named owner and file exists: `remote-catalog-lister.ts`, `discovery/remote-node-discovery.ts`, `remote-discovery-channel.ts`, `available-collaborator-entry.ts`, the routes `/remote/availability` and `/remote/available-agents` (`api/rest/remote.ts`), "it answered without its list". `targetName` is gone from the code. Matches RC-20 (bodies and answer keys) and RC-26/27. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | The two opt-in tools, `node`, availability | No change | `register-agent-discovery-tools.ts`, `listAvailableNodesEnabled` and the tool contracts exist; texts match RC-26/28 and API-30 (6 vs 8 tools without and with the selection). |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `description?` (DEC-405); `node` listing | No change | Plain Helper has no `description` field (RC-26). |
| `autobyteus-web/docs/settings.md` | Remote Collaboration tab | No change | No UI change in this ticket (requirements § UI: none). |

## Docs Updated

None by delivery. The implementation's updates were verified.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Discovery | The offer is exactly what a delegation accepts (same policy and port); nothing is stored; identity is claimed until S6 | `design-spec.md` | `remote_collaboration.md` § Discovery; `agent_tools.md` |

## Removed / Replaced Components Recorded

| Old | Replacement | Where Documented |
| --- | --- | --- |
| Refusal field `targetName` | `target: {kind, name}` | `remote_collaboration.md` § Between nodes |
| `list_available_agents` without arguments only | an optional `node`; plus `list_available_nodes` | `agent_tools.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification. AC-408 is the user's check; then archive and finalize.
