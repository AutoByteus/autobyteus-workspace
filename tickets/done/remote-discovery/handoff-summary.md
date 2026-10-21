# Handoff Summary — remote-discovery (autobyteus-261, slice S5)

Status: **finalized into `personal` and released in beta `v1.5.8-beta.6`** (DR-001), at the user's decision. **AC-408, the user's desktop ↔ Docker check, is open:** the user chose to run it on the beta.

## Ticket

- Package: `remote-discovery`, Project Task `autobyteus-261`, slice S5 of autobyteus-25.
  - Two opt-in agent tools: `list_available_nodes` lists this node's peers with their status, and `list_available_agents` with `node` lists what a peer offers for delegation.
  - With them, an agent finds a peer and an Agent or Agent Team there and delegates without being told an address.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed:
  - architecture review, Pass;
  - code review CRR-001, Pass, 9.4/10;
  - API/E2E API-REV-001, Pass, 95%;
  - test-code review CRR-002, Pass.
- Archived ticket folder: `tickets/done/remote-discovery/` on `personal`.

## What Changed

- **Tools** (`src/agent-tools/agent-discovery/`):
  - `list_available_nodes` (new, opt-in);
  - `list_available_agents` with an optional `node`, going through the `RemoteDiscoveryChannel` port (`RemoteNodeDiscovery`). Entries are `{name, kind, address, description?}`, with no empty description.
- **Between nodes:**
  - `POST /rest/remote/availability` and `/rest/remote/available-agents`, envelope only, through the `PeerGateway` admission;
  - `RemoteCatalogLister` answers with exactly what a delegation accepts (same policy and port);
  - `PeerClient` reads the list strictly;
  - refusals carry `target {kind, name}` in place of `targetName`, so Team refusals read "The Agent Team …".
  - Unknown-node and unknown-address texts now point to the discovery tools.
- **Nothing is stored;** a listing writes nothing on either node.
- **Tests:** the two-server E2E grows to 29 cases (RC-26 … RC-29 new; RC-04/19/20 updated), and the scripted CLI fixture gets `LIST_TOOLS`. The suite now needs `pnpm -C autobyteus-server-ts test:integration:prepare` (Brief Studio's package).
- **Docs:** CM-12 / scope table, `remote_collaboration.md` (§ Discovery), `agent_tools.md` and `agent_communication.md`. Delivery verified them (`docs-sync-report.md`).

## Integration

- The base was already current: `origin/personal` `8fbe77c461` at bootstrap, at delivery and at finalization.
- A checkpoint commit `b90e531506` added the reviewer's documents.
- No rerun was needed: the finalized code is the validated code (`93dc932920` plus the tests at `f09ebad342`), on the same base.

## Verification

- **Judged from the evidence: sufficient for AC-401 … AC-407.**
- **Evidence opened by delivery:**
  - receipts of runs 2 and 3 (29/29 each, clean cleanup);
  - RC-26: the exact 12-entry offer with the exclusions, the wire body and answer keys, every listed address delegable;
  - RC-27: four peer states in order, the reasons equal to `delegate_task`'s, a black-holed peer at 20.2 s;
  - RC-28: switch off, unknown/blank/null node, the local list;
  - RC-29: read per call;
  - RC-20: 90 requests, transport headers only;
  - API-30: DeepSeek on AutoByteus found the designer by nodes, then agents, then `delegate_task`; Claude haiku, opted in and plain; 8 vs 6 tools prepared;
  - API-31: same-node suites, with 191's FU-003 the only failure.
- **Confidence:** 95%, with no category below 90%.
- **AC-408 (the user's check):** between the user's desktop node and a Docker node, in both directions: list the nodes, list the other node's Agent Teams, and delegate to one without being told its address.
  - API/E2E could not reach it: real networking between the desktop and a container needs the user's nodes and sign-ins.
  - On 2026-10-21 the user chose to finalize and release a beta ("now release a new beta thanks") after delivery offered checking before merge or on a beta. The check is to be run on `v1.5.8-beta.6`.
  - Status: **open**. A failure there is fixed forward in the next release.

## Release

- `Beta` `v1.5.8-beta.6`, by the user's request (2026-10-21). It also carries autobyteus-247 (Remote Agent Teams). Details are in `release-deployment-report.md`.

## Residual Risks And Follow-ups

- RSK-401: a listing is answered to any registered peer; identity is claimed until S6 (accepted).
- RSK-402: up to 20 s for a black-holed peer.
- An older peer without the routes answers 404, read as unavailable. This is unit-only; DESIGN.md rule 9 expects the same release on both nodes.
- Follow-ups in `follow-ups.md`, sent by the Solution Designer:
  - FU-001, application-owned runs delegating remotely;
  - FU-002, `application-framework-boundaries` architecture test, which also fails on the base;
  - FU-003, claude.ai connectors on Claude-runtime agents.

  Also still open: autobyteus-191's FU-003 (`delegated-launch-config-defaults`).
