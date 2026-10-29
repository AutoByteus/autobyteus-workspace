# Docs Sync Report — autobyteus-267 (Nodes → Remote Collaboration page)

## Scope

- Ticket: `remote-nodes-page` (autobyteus-267, part of autobyteus-25). Classification `Medium` / `Low`, direct route. There was no independent design or source review; the code reviewer did a failure-origin review for F-001 (CRR-001).
- Trigger: API-REV-002 Pass (95%) from the API/E2E engineer.
- Bootstrap base reference: `origin/personal` `9e7a458808`.
- Integrated base reference used for docs sync: `origin/personal` `00d8a7ce62` (merge `534ae78028`), which brings remote-node-runtime-sign-in and `1.5.8-beta.7`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: the implementation documented the page and the `peerNodeOffer` query (`remote_collaboration.md`, `autobyteus-web/docs/settings.md`). Delivery verified the statements against the merged code. Delivery added one rule that was missing: every ask is a new request even while an earlier one is open. That rule is the F-001 fix, and without it a later change could bring the defect back.
- Why this lives in long-lived docs: the page's asking rules (when, how often, tokens, no caching) are what keep it honest about each peer's state now.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | `peerNodeOffer(nodeId)`; `listAvailableAgentsOf(nodeId)` | No change | The resolver (`remote-collaboration-settings.ts:77`) goes through `RemoteNodeDiscovery.listAvailableAgentsOf`, the same path as the tool (`remote-node-discovery.ts:35/42`). Answer shape and codes match API-01's RC-26 `pageOffer` and RC-27 `pageCodes`. |
| `autobyteus-web/docs/settings.md` | The page: sources, states, when peers are asked, the offer, the rules line | **Updated** | Files `remoteCollaborationOffersStore.ts`, `RemoteCollaborationOfferDisclosure.vue` and `RemoteCollaborationOfferList.vue` exist; search from more than 6 (`SEARCH_FROM = 6`); `network-only`. Added the in-flight rule (`queryDeduplication: false`). The base's own changes to this file (Agent Runtimes remote sign-in) merged cleanly beside it. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Rule added | § When peers are asked: every ask is a new request, even with an earlier ask for that peer open; Apollo's in-flight deduplication is off for this query | F-001's cause and fix were only in ticket artifacts |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Asking a peer again while an ask is open | Apollo joins identical in-flight queries; the page needs a new request per ask | `api-e2e-execution-coverage-report.md` F-001, `code-review-report.md` CRR-001, IR-002 | `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old | Replacement | Where Documented |
| --- | --- | --- |
| The "Agents and Agent Teams available to peers" note card | The collapsed rules line in the Peer nodes card; per-peer state and offer | `autobyteus-web/docs/settings.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification. AC-506 is the user's check.
