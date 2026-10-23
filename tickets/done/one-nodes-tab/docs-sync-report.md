# Docs Sync Report — one-nodes-tab

## Scope

- Ticket: one-nodes-tab (one Manage Nodes list; one-confirmation two-node collaboration). `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review, source review, API/E2E, test-code review).
- Trigger: code reviewer handoff after CRR-006 (Pass), API/E2E API-REV-003 (Pass).
- Bootstrap base reference: `origin/personal` `ca1f09e52a`.
- Integrated base reference used for docs sync: `origin/personal` `be315bcf1c` (merged into `codex/one-nodes-tab` as `e84a0d6253`, no conflicts).
- Post-integration verification reference: `e84a0d6253`; DLV-01…DLV-06 in `evidence/delivery/` (see `release-deployment-report.md` § Initial Delivery Integration Refresh).

## Why Docs Were Updated

- Summary: REQ-714 / AC-712. The Remote Collaboration tab is gone; the web's settings doc and the server's remote-collaboration module doc must describe the one Manage Nodes list, the two-node plans, address resolution and the new settings operations. The implementation updated both docs. Delivery reviewed them against the integrated code. It corrected one sentence in the server doc that this change made untrue. It also reconciled the design spec's `changeAddress` run rule with the accepted implementation (A1 / CR-002).
- Why this should live in long-lived project docs: the one list joins two owners' stores by node ID, and each server resolves its own address for the other node. Each side registers only through its own settings API. Future changes to Nodes, Docker addressing or remote collaboration depend on these rules.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` § Nodes: Manage Nodes (one list) | REQ-714; replaced § Nodes: Remote Collaboration | Updated (by implementation; checked) | Matches `NodeManager.vue` tabs, `nodeListStore`, `nodeRowStatus` priorities, connector plans and run rules, the Docker hint. No change by delivery |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | REQ-714; new GraphQL operations, `PeerAddressResolver`, error extensions | Updated (by implementation, corrected by delivery) | Merged cleanly with autobyteus-269's edits. Delivery fixed "The window never contacts a peer": since this change the window calls the other node's settings API (DS-001/DS-004). Now: "The window never asks a peer for its offer (only this node's server does)", which NP-12 proves |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` (Docker Guide tab text) | REQ-714 names "the Docker guide where it explains addresses" | No change | It never tells users to add peers by hand or which address a peer uses. The new hint links to it. The implementation handoff reached the same conclusion |
| Other `docs/**/*.md` mentioning `RemoteCollaborationCard`, "Remote Collaboration tab" | Removed components | No change | `grep` finds only the deliberate "There is no Remote Collaboration tab" sentence in `settings.md` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Section rewrite (implementation, `e16d848e0f` and later) | § Nodes: Remote Collaboration → § Nodes: Manage Nodes (one list) | REQ-714 |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Additions (implementation) + one-sentence correction (delivery) | `addPeerNode {nodeId, name, baseUrl}`, `changePeerAddress`, `PeerAddressResolver`/`resolvePeerAddress`, `peerAddressCandidates`, `peerNodeAvailability`, error `extensions`; delivery: the offer sentence above | REQ-714; the old sentence contradicted DS-001/DS-004 |
| `tickets/.../design-spec.md` § Run Rules (ticket artifact) | Reconciliation | `changeAddress` row: one `changeAddressHere` step that checks the typed address only; the `resolveHere` step was dropped | Implementation assumption A1, accepted in code review (CRR-002), fixed as CR-002. The code reviewer assigned this to docs sync |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One list from two owners | Desktop list (`nodeStore`) and this node's peers (`remoteCollaborationStore`) stay separate stores, joined by node ID (`serverInstanceId`) | design-spec DS-001/DS-002 | web `settings.md` |
| Address depends on the caller | Each registering server resolves the address that answers with the expected node ID; the Docker hint | design-spec DS-003/DS-005, § Loopback Hint Surface | both docs |
| No node writes another node's peers | The window drives the other node only through that node's own settings API, after one confirmation | design-spec § Dependency Rules | server doc |
| Run rules per plan kind | Connect stops at the first failure; disconnect/remove carry on and report | design-spec § Run Rules | web `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Remote Collaboration tab (`RemoteCollaborationCard.vue`, `RemoteCollaborationPeersSection.vue`) | The Manage Nodes list (`nodes/NodeList.vue`, `NodeRow.vue`, `ThisNodeCard.vue`, `AddNodePanel.vue`, `NodeChangeDialog.vue`) | web `settings.md` |
| `CurrentWindowNodeCard.vue` | `nodes/ThisNodeCard.vue` | web `settings.md` |
| `utils/nodeCapabilityProbe.ts`, `utils/nodeHostValidation.ts`, desktop entry `capabilities`/`capabilityProbeState` | Identity probe (`nodeIdentityProbe.ts`) with `serverInstanceId`; the registry change `identify` | web `settings.md` |
| `addPeerNode {baseUrl, name}` | `addPeerNode {nodeId, name, baseUrl}` | server `remote_collaboration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: not applicable (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification. AC-711 is the user's check (see `release-deployment-report.md`).
- Notes: no follow-up was found in docs outside this ticket. FU-001 and FU-002 come from upstream.
