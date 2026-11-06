# Docs Sync Report

## Scope

- Ticket: `node-desktop-on-phone` (Project Task autobyteus-407, slice S3 of autobyteus-394)
- Trigger: code review CRR-003 (test-code review Not Applicable) after API/E2E Pass (API-REV-001)
- Bootstrap base reference: `origin/personal` `e427a0c9cf`
- Integrated base reference used for docs sync: `origin/personal` `e427a0c9cf` (already current)
- Post-integration verification reference: not needed (already current)

## Why Docs Were Updated

- Summary: the phone and a desktop browser show the node desktop through the node's own server. A run's ⋮ menu offers VNC Viewer on a Docker node. The view opens in View only with zoom, pan and full screen, Control by switch, and a keyboard bridge. The node limits streams (4 node-wide, 2 per phone, close code 4429) and re-checks the phone's access (Phone Access off or a revoked phone ends the stream). The implementation updated `remote_access.md` and `node_desktop.md`. Delivery fixed two docs that still said the phone has no VNC.
- Why this should live in long-lived project docs: the "no VNC on the phone" statements would tell a future ticket that the view must not exist.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | The phone's views and their limits | No change (updated by implementation) | "Node desktop on the phone" matches the evidence (View only, zoom to 4×, Control, Keyboard, full screen, Back) |
| `autobyteus-server-ts/docs/modules/node_desktop.md` | Limits, re-check, 4429, node-closed | No change (updated by implementation) | Matches the route tests (5th node-wide and 3rd per phone refused with 4429; Phone Access off ends streams within 25 s) |
| `docs/android_mobile_access.md` | The `/mobile` shell's ownership list | Updated (delivery) | Said "Phase One removes the mobile Tools/Terminal/VNC page" and listed the ⋮ views without VNC Viewer |
| `autobyteus-web/docs/terminal.md` | Mobile Phone Access section | Updated (delivery) | Said "Phase One Android pairing removes the mobile Tools/Terminal/VNC page entirely" |
| `autobyteus-android/README.md` | Android shell | No change | The Android app did not change |
| `DESIGN.md`, `TESTING.md`, `RELEASE.md` | Project documents | No change | Nothing they describe changed |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `docs/android_mobile_access.md` | Correction | The ⋮ views include VNC Viewer on a node with a node desktop; no mobile Terminal or Tools page; pointer to `remote_access.md` | The old text excluded the view this ticket adds |
| `autobyteus-web/docs/terminal.md` | Correction | No mobile Tools or Terminal page; the node desktop opens from a run's ⋮ menu | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Phone node desktop | Entry rule, View only/Control, gestures, keyboard bridge, full screen, background disconnect | `design-spec.md` | `autobyteus-web/docs/remote_access.md` (already there) |
| Stream limits and re-check | 4 node-wide, 2 per phone, 4429; streams end on Phone Access off or revoke | `design-spec.md` | `autobyteus-server-ts/docs/modules/node_desktop.md` (already there) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "No VNC on the phone" (Phase One rule) | The phone's VNC Viewer through the node's server | `remote_access.md`, `android_mobile_access.md`, `terminal.md` |
| The desktop tile's own connection code (`NodeDesktopTile.vue`) | Shared `useNodeDesktopConnection` / `useNodeDesktopAvailability` | Code; `remote_access.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization (no release)
