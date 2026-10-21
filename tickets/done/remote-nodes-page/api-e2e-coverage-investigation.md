# API/E2E Coverage Investigation — autobyteus-267 (Nodes → Remote Collaboration page)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-nodes-page/tickets/in-progress/remote-nodes-page`

## Investigation Meta

- Requirements: `…/requirements-doc.md` (Approved, SR-002), AC-501 … AC-507 (AC-503 removed)
- UI/UX spec (normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-nodes-page/ui-ux-spec.md` (ST-01 … ST-11, TR-001 … TR-012, VIS-001 … VIS-007)
- Design spec: `…/design-spec.md` (SR-003)
- Implementation handoff: `…/implementation-handoff.md` (IR-001, code `3a21bcae44`, docs `f684e1e368`)
- Code review: none (direct route)
- Classification carried: `Medium / Low`, direct route; a pass goes to delivery, with test-review decision `Not Required — direct low-risk route`
- Revision record: `…/api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Testing guideline: the worktree's `TESTING.md` (clean environments, test-owned servers; never the user's app or data)

## What Must Be Proven

- **AC-501 (REQ-501/504, QR-501).** With peers in every state, each shows its own state and reason on the page, at its own pace. The states: available, off there, not registered there, not reachable (stopped), different server, shares nothing, and black-holed. A black-holed peer shows "Checking…" and then "Not reachable" after about 20 s, while the others are already settled and the page stays usable.
- **AC-502 (REQ-502/503).**
  - The available peer's list on the page equals `list_available_agents {node}` (names, kinds, descriptions).
  - Every request the window makes goes to this node's server; none goes to a peer URL.
  - Only names, kinds and descriptions reach the window (no address).
- **AC-504 (REQ-507).** With 30 entries on a peer, the list starts as one line; typing part of a name narrows it; clearing restores all.
- **AC-505 (REQ-504/508).**
  - With the switch off, no peer is asked and the notice shows.
  - Turning it on asks every peer once.
  - Adding a peer asks it at once.
  - Returning to the tab asks again.
  - Refresh asks one peer.
  - Nothing polls.
- **AC-507 (preserved).** Add, rename and remove; the 261 tool results unchanged.
- **REQ-510.** The window's data carries only fields with a value (`description` null when absent is GraphQL's form, and the store drops it).

## Supported Scenarios And Real Usage

- SCN-501: the owner has just added a peer.
- SCN-503: a peer is down.
- Real use added:
  - RU-1: the owner leaves the tab and comes back.
  - RU-2: the owner turns the switch off and on while peers are listed.
  - RU-3: the owner looks for one entry among many (30).
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Changed boundary | Repository evidence (IMP) | Material risk not exercised there | Mode |
| --- | --- | --- | --- | --- |
| Server GraphQL `peerNodeOffer` | window ↔ own server; through `RemoteNodeDiscovery` | IMP-02 (unit) | real peers in every state; equality with the agent tool's list on the same peer | Two-server E2E (extend RC-26/27, RC-16) |
| Web store + page | triggers, tokens, states, search | IMP-03 (specs), IMP-07 … IMP-13 (live, the implementer's own) | the window's real request log, the exact triggers over HTTP, the 20 s bound in a real browser | Durable browser probe (playwright-core) against test-owned servers |
| Strings, VIS | the spec's tables | IMP-03, IMP-07 … IMP-13 | — | Reused (implementation evidence), spot-checked in the probe |

## Existing Durable Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| server two-server E2E RC-01 … RC-29 | Still Valid | Extend RC-26 (`peerNodeOffer` equals the tool's list), RC-27 (codes, bound), RC-16 (identity mismatch); run all |
| web specs (offers store, card, disclosure, peers store) | Still Valid | Reused (IMP-03) |
| web `tests/e2e/*-probe.mjs` | — | Add `remote-nodes-page-probe.mjs` (durable, the repository's browser-probe pattern) |

## Planned Cases

| Case | Criteria | Kind | Steps |
| --- | --- | --- | --- |
| API-00 | all | Existing | server build |
| API-R1 | unit, component | Reused | IMP-02, IMP-03, IMP-05, IMP-06 (code `3a21bcae44`) |
| API-01 (RC-26, RC-27, RC-16 extended) | AC-502, AC-501, REQ-510 | Durable | Through alpha's GraphQL: `peerNodeOffer(beta)` entries equal the Scout's `list_available_agents {node: beta}` without addresses, and Plain Helper's `description` is null. The codes are `PEER_UNREACHABLE` (stopped and black-holed, within the bound), `REMOTE_COLLABORATION_OFF`, `PEER_NOT_REGISTERED` and `PEER_IDENTITY_MISMATCH`. Exactly one field is set |
| API-02 | AC-501, AC-502, AC-504, AC-505, AC-507 | Durable browser probe | alpha plus peers: beta (30 entries: 24 Agents, one without a description, and 6 Teams), gamma (stopped), delta (switch off), epsilon (not registered there), zeta (a different server at its address), eta (shares nothing), theta (black-holed), and iota (added through the UI). The page is driven in Chrome (playwright-core) via `nuxt dev`, with the window's full request log. Steps: open (each peer settles at its own pace; theta about 20 s); compare beta's list with `peerNodeOffer` and the DOM; search narrows and clears; Refresh asks one peer; add iota (asked once); switch off (notice, no ask) and on (one ask per peer); leave the tab and return (asked again); rename and remove; no window request to a peer port; no polling during a quiet minute |
| API-03 | AC-507 | Existing | RC-01 … RC-29 (the 261 tool results unchanged) |

- Test progress log: `Yes`

## Not Tested / Deferred

| Behavior | Reason | User only? |
| --- | --- | --- |
| AC-506 desktop ↔ Docker windows | the user's nodes | Yes |
| RSK-501 (a 7th silent peer waits behind the browser's 6 connections) | accepted risk; at most one silent peer in this setup | No |

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `Yes`; reroute: `No`
