# Docs Sync Report — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Scope

- Ticket: `one-step-phone-pairing` (Project Task `autobyteus-395`; also covers the cancelled `autobyteus-391`)
- Trigger: code reviewer's validated package (CRR-004 Pass after API-REV-002 Pass); route `Reviewed` (Large / High)
- Bootstrap base reference: `origin/personal` @ `677f61de0b`
- Integrated base reference used for docs sync: `origin/personal` @ `677f61de0b` (fetched at delivery start; the branch already contained it, merge-base = tip)
- Post-integration verification reference: no new base commits, so no rerun (see release-deployment-report, Initial Delivery Integration Refresh); docs synced against validated head `b1b79a29cf` plus the reviewers' records commit `49c56d4041`

## Why Docs Were Updated

- Summary: the change replaces the whole phone-pairing flow. Before, the desktop had a Tailscale Serve guide, a list of address candidates or a typed URL, a cleartext checkbox and **Create QR code**; the phone had **Scan QR**, an HTTP acknowledgement, "Pair this phone" and a peer list in the node sheet. Now the desktop panel shows four ways to connect as tabs, finds and checks the address itself and needs one press on **Show QR code**. The phone scans and connects, keeps several nodes by name and has **Switch node**. Four long-lived docs and two README paragraphs still told users to take the removed steps.
- Why this should live in long-lived project docs: these are the user and developer guides for Phone Access (desktop, `/mobile`, Android). A reader following them would look for controls that no longer exist (the URL field, the checkbox, **Create QR code**, `serve reset`, the peer list).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Server routes, node network, pairing model | No change | Updated in the implementation (Node Network And Ways To Connect, new owner routes, `DELETE` session, `connectionWay`, status without `serverName`). Confirmed against `node-network-service.ts`, the route policy and the API-07/API-08 evidence |
| `GLOSSARY.md` | New terms | No change | Updated in the implementation (Way to connect, Node network, Local network / network ID, Allowed local network, Shell bridge). Confirmed against the code |
| `autobyteus-web/docs/remote_access.md` | Desktop Phone Setup, `/mobile` screens, revocation, troubleshooting | Updated | Described the removed cards, candidates, cleartext acknowledgement, Create QR code, `serve reset` and the sheet's Peer nodes |
| `docs/android_mobile_access.md` | Android guide and real-device procedure | Updated | Described a pasted URL, HTTP acknowledgement, **Scan QR** with `CaptureActivity`, the connection screen |
| `autobyteus-android/README.md` | Android app ownership and flow | Updated | Found by API/E2E (execution report, Latest Authoritative Result); same stale flow |
| `README.md` (Phone Access paragraphs) | Product overview | Updated | Named the Tailscale Serve guide and acknowledged HTTP URLs |
| `autobyteus-web/README.md` (Phone Access / Remote Access) | Web overview | Updated | "enable Phone Access, choose the reachable private-network URL" |
| `docs/ios_mobile_access.md`, `autobyteus-ios/README.md` | iOS uses the same pairing | No change | They describe the iOS app's own flow, which this ticket does not change (FU-001). Their desktop steps ("Enable Phone Access", pair with an HTTPS URL) are still possible |
| `autobyteus-web/docs/settings.md` | Nodes screen tabs | No change | It names Phone Setup as a tab only |
| `DESIGN.md` | Project design document | No change | It holds no phone-pairing rule. The change follows its existing principles; no new design case came up in review |
| `TESTING.md` | Testing guideline | No change | Updated in this ticket by API/E2E (Fresh-start build: Android build inputs and the empty-Gradle-home command); reviewed in CRR-004. No discrepancy recorded in the reports |
| `RELEASE.md` | Release guide | No change | Its steps matched this delivery; no discrepancy found |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Rewrite of the pairing sections | "What Phone Access Does" now describes the Phones panel. The connection sheet has the refresh icon / Retry, Switch node and "Unpair from <node>", and no peer list. Network Model is now a table of the four ways with the trust decision of each, and it lists what is never offered. The two step-by-step flows (Docker, embedded) are replaced by **Connecting a phone**: one flow, the code's life, naming, and notes per kind of node (Advanced Serve command, Docker published port and `8443…` HTTPS ports, remote node and typed company address). New Pairing page and Android shell bridge sections. Revocation now describes the Phone access switch, Connected phones and History (n). Troubleshooting entries were rewritten | Old flow removed (design Removal Plan) |
| `docs/android_mobile_access.md` | Update | Intro (one step on each side). Ownership adds the node list, the connect sequence and the bridge. "Stable travel URL" is now "One address per pairing". Docker and embedded setups shortened to Show QR code. Android setup now covers the scan-first screen, entry forms, Can't reach and Switch node. Troubleshooting hints and the real-device steps 4–7 and 12 were updated (own Scan screen, no acknowledgement, Switch node) | Same |
| `autobyteus-android/README.md` | Update | "What the app owns" (node list, Scan screen, `NodeConnectionFlow`, `NodeReachability`, shell bridge). "Recommended Tailscale setup" is now "Connecting to a node" plus an Entry forms table. "QR scanning" folded into it | Same; API/E2E delivery note |
| `README.md` | Paragraph update | Phone Setup tabs, one press, once-per-network Wi-Fi question, Android scan and Switch node; remote and Docker nodes use the same panel | Same |
| `autobyteus-web/README.md` | Sentence update | Show QR code on the recommended way; link to `docs/remote_access.md` | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Ways to connect and their trust decisions | Four ways in a fixed preference order. Only the local Wi-Fi/LAN is asked, once per network ID, shared by the nodes of one computer. Every QR address is checked by node ID | requirements REQ-002/004/022, design "Way composition per node kind" | `autobyteus-web/docs/remote_access.md` Network Model; server rules already in `remote_access.md` |
| Per-node-kind composition | A Docker node uses the host's facts with its published port, and its allowed answer is kept by the embedded node. A remote node uses its own facts and keeps its own answers. Serve HTTPS port 443 / `8443 + k` | design-spec AR-002 table; `tailscaleServeCommand.ts` | `autobyteus-web/docs/remote_access.md` Connecting a phone |
| Code lifecycle | Discard on close, tab change, New code, leaving or Phone access off; expired and used codes refused | design DS-003; API-08, API-11 | `autobyteus-web/docs/remote_access.md` |
| Android connect sequence and bridge | Entry forms and when each pairs. A node is saved only on `paired`. The bridge is main frame, same origin and carries no credential | design "Android entry forms", Ownership Map; API-14 | `docs/android_mobile_access.md`, `autobyteus-android/README.md`, `autobyteus-web/docs/remote_access.md` |
| One address per pairing | A saved node keeps the address of the way it paired through; use Tailscale for a travelling phone (FU-002) | DEC-005, DEC-019 | `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `PhoneSetupGuideCard.vue` (Tailscale Serve guide) and `PhoneAccessCard.vue` | `components/settings/phone/PhonesPanel.vue` (+ `PhoneWayTab`, `PhoneCodeBlock`, `ConnectedPhones`) | `autobyteus-web/docs/remote_access.md` |
| `GET /rest/remote-access/address-candidates`, `address-candidate-service.ts`, "address candidate" in Phone Access | `GET /rest/remote-access/network` (`NodeNetworkService`), "way to connect" | `autobyteus-server-ts/docs/features/remote_access.md`, `GLOSSARY.md` |
| Cleartext acknowledgement checkbox for desktop-made QR codes | Way policy: Tailscale, VPN and company address need no question; Wi-Fi/LAN once per network | `autobyteus-web/docs/remote_access.md` Network Model |
| Status `serverName` ("AutoByteus Desktop" on the phone) | Name in the QR payload (computer name / Nodes-page name) | `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md` |
| Connection sheet's Peer nodes, "Unpair this phone" | Refresh icon / Retry, Switch node, "Unpair from <node>" | `autobyteus-web/docs/remote_access.md` Screens |
| Android `ConnectionScreen.kt`, `CaptureActivity` scanner launch, HTTP tick for scanned links | `ui/start/*`, `ui/connect/*` (own Scan screen), `NodeConnectionFlow` | `autobyteus-android/README.md`, `docs/android_mobile_access.md` |
| `serve reset` in the guide | Never offered | `autobyteus-web/docs/remote_access.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs were updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, commit, Secret Gate, finalization, beta release
- Notes: follow-up FU-007 added (Phone Setup in the window of a node older than the desktop shows the raw request error); the release notes tell users to update their nodes.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

N/A
