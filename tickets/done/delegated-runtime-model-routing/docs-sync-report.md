# Docs Sync Report — autobyteus-32 (delegated-runtime-model-routing, Model Router core)

## Scope

- Ticket: `delegated-runtime-model-routing` (Project Task autobyteus-32)
- Trigger: code review CRR-005 Pass (test-code review after API-REV-002 Pass); Large / High, reviewed route
- Bootstrap base reference: `origin/personal` @ `d74f75a51a`
- Integrated base reference used for docs sync: `origin/personal` @ `50e93c2108` (98 commits merged as `357936966c`)
- Post-integration verification reference: `evidence/delivery/DEL-01-post-integration-reruns.log`

## Why Docs Were Updated

- Summary:
  - The implementation wrote `model_routing.md`, the Settings → Model Routing section of `settings.md`, the glossary, `collaboration_model.md` CM-12 and the design case. Delivery checked them against the merged code.
  - Delivery corrected the tab names in `settings.md` and filled the gaps in neighbouring docs that list what this feature changed: the peer protocol and its time limit, the Agent Tools MCP families, the built-in agents, the visible workspace list, and the test listings.
- Why this should live in long-lived project docs: Model Routing changes how every delegated copy chooses its launch and what peers exchange. Future work (FU-001, FU-002) builds on it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/model_routing.md` | The feature's module doc | Updated | Matches the code, including on the merged composition: the router is released inside `closeProcessResources`, which both of the base's new shutdown paths call. Delivery added the E2E, live and browser-probe tests |
| `autobyteus-web/docs/settings.md` | Settings → Model Routing | Updated | The doc named the tabs **Setup** and **Agent runtimes now**; the page shows **Configuration** and **Runtimes** (ids `setup`, `runtimes`). Corrected |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Peer protocol | Updated | The delegated-run request now carries `task`; answers carry `launches`; refusals carry `modelRouting`, `agentName` and `MODEL_ROUTER_FAILED`. A start request waits up to 50 s (`PEER_START_REQUEST_TIMEOUT_MS`); the doc said 20 s for all calls |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Agent Tools MCP adapter families | Updated | Added the model-routing family (`submit_launch_choices`) |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Built-in agent list | Updated | Added `model-router/` (`autobyteus-model-router`, internal) |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Visible workspace list | Updated | Internal workspaces are left out while internal agents are hidden (`WorkspaceManager.listVisibleWorkspaces`) |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Tests | Updated | The live-agents test folded in from autobyteus-303 (`available-agent-runtimes-live-agents.e2e.test.ts`, LR-1…3 and its gates) |
| `GLOSSARY.md` | Model Routing vocabulary | No change | Accurate; merged cleanly with the base's MCP Secrets section |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-12 | No change | Accurate |
| `docs/design-cases.md` | Design case of this ticket | Updated (merge) | The base added its own Cases 9 and 10, so this ticket's "Case 9" is now **Case 11**. The ticket's older handoff files still say "Case 9"; they are historical and were left as written |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Correction | Tab names Configuration / Decisions / Overview / Runtimes with their `?tab=` ids; "link to Configuration" | Matched the rendered page (`tabs.setup` = "Configuration") |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Protocol | `task`, `launches`, `modelRouting`, `agentName`, `MODEL_ROUTER_FAILED`; 50 s start bound | The doc described the old protocol and time limit |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | List | Model-routing tool family | Incomplete list |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | List | The Model Router built-in | Incomplete list |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Behavior | Internal workspaces hidden | Incomplete list |
| `autobyteus-server-ts/docs/modules/model_routing.md`, `agent_runtimes.md` | Tests | E2E, live and probe tests named | Discoverability |
| `docs/design-cases.md` | Merge | This ticket's case renumbered to 11 | Both sides added a "Case 9" |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Launch layer order | default → team default → router → inherited → refusal; who decides | design spec | `model_routing.md` (implementation) |
| One routing at a time, 40 s budget | Queue by run idleness; outcomes and notes | SR-016 | `model_routing.md` (implementation) |
| Peer routing | B routes with A's Task; `launches` back to A; 50 s start bound | design spec, RC-39…41 | `remote_collaboration.md` (delivery), `model_routing.md` |
| No router confinement | The user's SR-018 decision; RSK-006 | SR-018 | `model_routing.md` (implementation), `docs/design-cases.md` Case 11 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Router confinement (`toolConfinement`, rounds 1–2) | None: the router runs like any auto-approved agent (SR-018) | `model_routing.md` § Tools of the router's run; design case 11 |
| One 20 s bound for every peer call | 20 s, except 50 s for a delegated-run start | `remote_collaboration.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization and beta.
- Notes: rechecked after IR-004 (`f48af0176a`: copy and the web built-in ID mirror). No doc change was needed; `settings.md` already says "Configuration".
