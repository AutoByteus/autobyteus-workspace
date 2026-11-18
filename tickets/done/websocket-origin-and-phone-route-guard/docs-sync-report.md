# Docs Sync Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Scope

- Ticket: autobyteus-403, websocket-origin-and-phone-route-guard
- Trigger: validated package from the code reviewer (CRR-001 Pass, API-REV-001 Pass at 95.4%, CRR-002 Pass); updated in DR-002 after the autobyteus-407 integration (IR-002, CRR-003 Pass, API-REV-002 Pass at 95.6%, CRR-004 Not Applicable)
- Bootstrap base reference: `origin/personal` @ `3bf9240d42`
- Integrated base reference used for docs sync: `origin/personal` @ `6341292552` (autobyteus-407), merged into the ticket branch as `6f59bab2a2` (IR-002); first refresh `e427a0c9cf` as `18fd9f4e5c`
- Post-integration verification reference: round 2 on `1e1d6482a7` (source identical to the delivery HEAD): IMP-10…IMP-12, API-01, API-03…API-09 (`api-e2e-execution-coverage-report.md`); round 1: `evidence/delivery/DEL-01-merged-state-remote-access-checks.log`

## Why Docs Were Updated

- Summary: the node now refuses browser requests from non-allowed origins on every HTTP request and WebSocket upgrade, adds the optional node setting `AUTOBYTEUS_ALLOWED_ORIGINS`, and limits a phone credential to the phone WebSocket routes. The source commit already updated the feature docs and the glossary. Delivery added the new setting to the server README's list of node settings, and a sentence to the Android setup guide where it tells users to set up a private HTTPS ingress, because an ingress that rewrites `Host` is now refused unless it is configured.
- Why this should live in long-lived project docs: operators who configure a node or a phone ingress read the README and the setup guides, not the ticket. A Host-rewriting gateway would otherwise break the phone with no hint of the fix.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Canonical owner of the request gate, allowed origins, phone WebSocket routes and refusal logs | Updated (source commit `88a93aaf26`; owners table updated in IR-002 for 407's `remote-access-close-codes.ts`) | Checked against the integrated code: owners table, Allowed Origins, Route Policy (phone routes, 4403/403), log lines and validation list match `remote-access-request-origin.ts`, `remote-access-policy-plugin.ts` and `remote-access-route-policy.ts` |
| `autobyteus-web/docs/remote_access.md` | Phone shell and desktop Phone Access behavior | Updated (source commit) | Phone route limit and the allowed-origin rule for the phone shell, with the `AUTOBYTEUS_ALLOWED_ORIGINS` case. Rechecked after 407's auto-merged edits (Node desktop on the phone, VNC Viewer now a phone surface): consistent, the phone route list names the node desktop |
| `autobyteus-server-ts/docs/modules/node_desktop.md` | 407's route doc for `/ws/node-desktop` lists the route's checks in order | Updated (delivery, DR-002) | Added that the request gate refuses a non-allowed Origin with HTTP 403 before the route, and that `/ws/node-desktop` is a phone WebSocket route; its close-code table and live re-check text already name 407's `remote-access-close-codes.ts` |
| `GLOSSARY.md` | Terms "Allowed origin", "Phone WebSocket route" | Updated (source commit) | — |
| `autobyteus-server-ts/README.md` | Lists the node's optional settings (Environment setup notes) | Updated (delivery) | Added `AUTOBYTEUS_ALLOWED_ORIGINS` and the allowed-origin rule, pointing to the feature doc |
| `docs/android_mobile_access.md` | Step 5 tells users to set up Tailscale Serve or a private HTTPS ingress | Updated (delivery) | Added when an ingress needs `AUTOBYTEUS_ALLOWED_ORIGINS`. 407's edit (VNC Viewer in the shell list) auto-merged and is consistent |
| `docs/ios_mobile_access.md` | Tailscale/phone setup | No change | It gives no ingress setup step; the wrapper loads the node's `/mobile` URL, which stays same-origin |
| `README.md`, `autobyteus-web/README.md` | Phone Access overview | No change | They recommend Tailscale Serve, which keeps `Host` and is allowed (API-04) |
| `autobyteus-server-ts/docker/README.md` | Docker node settings | No change | It names no CORS or gateway setting; the server README and feature doc own the setting |
| `DESIGN.md` | Project design rules | No change | No new convention; the design followed existing owners (request gate, route policy) |
| `TESTING.md` | Testing rules and commands | No change | The ticket recorded no discrepancy; `test:e2e:mobile-shell` keeps its command. The probe's change (keeping the phone's Host and Origin) is in its own header comment |
| `RELEASE.md` | Release guide | No change | This delivery followed it without deviation |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Feature doc (source commit) | Allowed Origins section, phone WebSocket routes, refusal logging, owners | New behavior |
| `autobyteus-web/docs/remote_access.md` | Feature doc (source commit) | Phone route limit and allowed-origin note | New behavior seen by the phone shell |
| `GLOSSARY.md` | Glossary (source commit) | Two terms | New terms |
| `autobyteus-server-ts/README.md` | Settings note (delivery) | `AUTOBYTEUS_ALLOWED_ORIGINS` and the allowed-origin rule | New node setting |
| `autobyteus-server-ts/docs/modules/node_desktop.md` | Module doc (delivery, DR-002) | Request gate before the node-desktop route; phone route | The origin refusal happens before the route's own checks |
| `docs/android_mobile_access.md` | Setup guide (delivery) | When an ingress needs `AUTOBYTEUS_ALLOWED_ORIGINS` | A Host-rewriting ingress now breaks the phone unless configured |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Allowed-origin rule | Which Origins a node accepts, before route authorization, on every path | `design-spec.md`, `requirements-doc.md` REQ-002 | `autobyteus-server-ts/docs/features/remote_access.md` (Allowed Origins) |
| Phone WebSocket routes | A new phone WebSocket surface must be added to `PHONE_WEBSOCKET_ROUTES`; the list is keyed by Fastify route pattern; the e2e test fails when a listed pattern is unregistered | `design-spec.md`, `implementation-handoff.md` | Same doc (Route Policy); `autobyteus-web/docs/remote_access.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| WebSocket credential checks and the close-code table inside `remote-access-websocket-auth.ts` | `RemoteAccessRoutePolicy.authorizeWebSocket` + `PHONE_WEBSOCKET_ROUTES` (one query-credential reader); close codes in 407's `remote-access-close-codes.ts`; the file is now the `/ws/*` adapter | `autobyteus-server-ts/docs/features/remote_access.md` (owners table) |
| Studio-server CORS registration in `build-studio-server.ts` | CORS granted by the request gate from the allowed-origin rule | Same doc (Allowed Origins) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, finalization (no release)
- Notes: no follow-up added by delivery; FU-001…FU-004 stand as recorded.
