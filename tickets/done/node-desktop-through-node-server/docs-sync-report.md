# Docs Sync Report

## Scope

- Ticket: `node-desktop-through-node-server` (Project Task autobyteus-405, slice S1 of autobyteus-394)
- Trigger: code review CRR-002 (test-code review Not Applicable) after API/E2E Pass (API-REV-001)
- Bootstrap base reference: `origin/personal` `9e0681bf39`
- Integrated base reference used for docs sync: `origin/personal` `26fa57697e` (includes autobyteus-277 and the v1.5.12-beta.4 release), merged into the ticket branch as `ee1c715547`
- Post-integration verification reference: the merged-state rerun recorded in `release-deployment-report.md`

## Why Docs Were Updated

- Summary: the desktop app's VNC Viewer now reaches a Docker node's desktop through the node's own server (`/rest/node-desktop`, `/ws/node-desktop`). It opens in View only, switches to Control on purpose, never resizes the desktop, and streams only while visible. Docker nodes publish only the Backend port. The `AUTOBYTEUS_VNC_SERVER_HOSTS` setting, its Server Settings card and the published 6080 port are retired. The implementation updated every affected long-lived doc. Delivery checked them against the merged state and changed nothing.
- Why this should live in long-lived project docs: users configure nodes and settings from these docs, and future server work on the node desktop route needs its module doc (`node_desktop.md`).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/node_desktop.md` (new) and `docs/modules/README.md` | The route, availability, filter, modes, limits, logging | No change (written by implementation) | Matches the code and the evidence (4400/4404/4502 codes, 8 MiB cap, metadata-only logs). Line 118 says Xvnc 5900, websockify 6080 and the debug proxy 9223 still listen inside the container, which is true and is not host publishing |
| `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | Docker node ports, URLs, compose | No change (updated by implementation) | Backend port only; 5900/6080/9223 not published; S0's VNC Viewer port wording replaced |
| `autobyteus-web/docs/settings.md` | The retired VNC Hosts card and setting | No change (updated by implementation) | Says a saved value shows as a deletable custom setting; endpoint cards are LM Studio and Ollama |
| `autobyteus-web/docs/workspace_layout.md` | VNC Viewer tool entry | No change (updated by implementation) | autobyteus-277 also changed this file; the merge is clean and both changes read coherently |
| `GLOSSARY.md` | Node desktop, View only, Control | No change (updated by implementation) | — |
| `docs/design-cases.md` | Case 16 | No change (added by implementation, owned by the Solution Designer) | — |
| `DESIGN.md` | Project design rules | No change | Rule 12 (gate changes) applied: the build-only release run was made before the merge |
| `TESTING.md` | Testing rules | No change | The VNC live probe already existed and keeps its command (`test:e2e:vnc-live`), documented in its header. No test command changed |
| `RELEASE.md` | Release guide | No change | Its steps fit this release as written |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| None by delivery | — | — | The implementation updated every affected doc. Delivery found them accurate on the merged state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Node desktop route | The server-side route, its availability rule, the RFB input filter per mode, the backpressure cap, the close codes, the logging rule | `design-spec.md`, `requirements-doc.md` | `autobyteus-server-ts/docs/modules/node_desktop.md` (already there) |
| Viewer behavior | View only by default, Control by switch, no resize, disconnect when hidden and reconnect in View only | `design-spec.md` | `autobyteus-web/docs/workspace_layout.md`, `GLOSSARY.md` (already there) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `AUTOBYTEUS_VNC_SERVER_HOSTS` and the "AutoByteus VNC Hosts" endpoint card | The node's own `/ws/node-desktop` route; nothing to configure | `autobyteus-web/docs/settings.md`, `node_desktop.md` |
| Host-published 6080 (`127.0.0.1` since S0) and the launcher's VNC Viewer port | Backend port only | The three READMEs |
| Direct websockify connection from the app | Stream through the node's server, filtered per mode | `node_desktop.md` |

## No-Impact Decision

Not used. The docs were updated, by the implementation.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive, finalization, then the beta
- Notes: follow-ups FU-001 and FU-002 are in `follow-ups.md`. The Solution Designer sends them when the ticket leaves the team.
