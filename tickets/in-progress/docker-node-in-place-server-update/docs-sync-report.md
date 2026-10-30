# Docs Sync Report — autobyteus-305, build step 4 (desktop: node version and "Update to <version>")

This report holds the latest delivery round (DR-004, step 4). Earlier rounds are in git: DR-001 at `77fb8bf2d1`, DR-002 at `6b34f900b6`, DR-003 at `1bed6deeaf`.

## Scope

- Ticket: autobyteus-305 (`docker-node-in-place-server-update`), **build step 4 of 5**.
- Trigger: code reviewer CRR-008 (`Not Applicable`, no durable test changed) after API-REV-004 Pass (94.7%), CRR-007 Pass (9.5/10), IR-004, ARCH-REV-005.
- Bootstrap base reference for this step: `origin/personal` @ `1bed6deeaf`
- Integrated base reference used for docs sync: `origin/personal` @ `1bed6deeaf`. It had not moved, so the branch was already current.
- Post-integration verification reference: `evidence/DEL-11-step4-delivery-checks.log`

## Why Docs Were Updated

- Summary: step 4 adds a server line with "Update to <version>" under each remote row of Nodes → Manage Nodes. The web settings doc described that page and said "Nothing polls", which is no longer true while an update runs. Implementation changed no long-lived doc.
- Why this should live in long-lived project docs: `autobyteus-web/docs/settings.md` is the page's reference (stores, components, when nodes are asked). The new line, its states, its polling and the generic "Not reachable." for old nodes are lasting behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` (Nodes: Manage Nodes) | Page reference; "Nothing polls" | Updated | New bullet for the server line; the polling sentence corrected |
| `autobyteus-server-ts/docs/features/remote_access.md` | Owner route list (method and path) | Updated | Added `POST /rest/node-update` next to the GET from DR-002 (same route class, `remote-access-route-policy.ts` classifies by path) |
| `autobyteus-server-ts/docker/README.md` | Update command, refusals, `NO_PACKAGES_VOLUME` | No change | The settings doc links to it |
| `DESIGN.md` (rule 9 exception) | C1 GET and POST | No change | C1 already names "status and update" |
| `GLOSSARY.md` | Nodes terms | No change | — |
| `RELEASE.md` | — | No change | Step 4 adds no release asset |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Page reference | New bullet covering the line's states and texts: version, Update to `<version>`, newer than this app, steps, restart grace, results, Copy command, version unknown, `updateBlocker`, "Not reachable." for servers without C1, no line on the embedded node. Also how it asks (on open and when the app's version is known; 2 s while running; 10 s after 5 minutes without an answer), and that the click starts the update without a confirmation dialog. "Nothing polls" became "Nothing polls, except a row's server update line while an update runs" | Step 4's user-visible behavior; the review's docs note |
| `autobyteus-server-ts/docs/features/remote_access.md` | Route list | `POST /rest/node-update` under trusted-network owner routes | New C1 method in step 4 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Nodes page server line | States, polling (DS-005), no confirmation (SCN-001), "Not reachable." for old servers (N-4) | design-spec DS-005, row states; ARCH-REV-005 N-4; CRR-007 CC-06/CC-07 | `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

None.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, finalization into `personal` (no release requested).
- Ticket artifact also updated: `release-notes.md`, rewritten for the release that ships step 4 (the beta.6 version is in git at `1bed6deeaf`).
