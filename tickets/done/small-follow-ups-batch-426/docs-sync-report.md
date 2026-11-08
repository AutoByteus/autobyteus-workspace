# Docs Sync Report — small-follow-ups-batch-426 (autobyteus-426), round 1

## Scope

- Ticket: `small-follow-ups-batch-426` (Project Task autobyteus-426), round 1. Items 1, 2, 3 (AC-004a), 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18 and 19. Items 4 and 15 were dropped; items 9 and 20–22 and AC-004b are round 2.
- Trigger: CRR-006 (post-API/E2E test-code review) Pass; API-REV-002 Pass at 95%.
- Bootstrap base reference: `6225a734a3`. `origin/personal` @ `933163361c` (autobyteus-427) was merged at `ed29eb6522`.
- Integrated base reference used for docs sync: `origin/personal` @ `2783491938` (autobyteus-412 and autobyteus-416), merged into the ticket branch at `3551d69ee7`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh (DEL-01…DEL-04 on `3551d69ee7`).

## Why Docs Were Updated

- Summary: the implementation updated only the docs that items 12 and 13 name (D-12, D-13). Round 1 also changed behavior that long-lived docs describe or should describe:
  - the phone's connection state and its credential check (D-02);
  - when the phone opens the definitions feed (D-01);
  - the phone VNC Viewer's Clipboard (D-05);
  - the node-desktop refusal log line (D-06);
  - the Android restore after process death (D-03) and the navigation rule for preview subframes (D-07);
  - the workspace folder check and its refusal reasons (D-08);
  - the OS-locale formatting rule and its guard (D-17);
  - the address classification (D-18);
  - the read-only file status (D-19).
- Why this should live in long-lived project docs: these are user-visible phone and desktop behaviors, a server registration contract (`WORKSPACE_PATH_REFUSED`), an operator log line and a build-enforced coding rule. Without them, the module docs would describe behavior that no longer exists.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | `No change` | No rule changed. The ticket's design lessons are in `docs/design-cases.md` (Case 5 extended, Case 17), written by the ticket under D-13 |
| `TESTING.md` | Project testing guideline; commands the ticket's reports relied on | `No change` | Every command used is already there: the browser probes (`test:e2e:<name>`), `test:integration:prepare` (the reports' missing Brief Studio package), the gated suites and the fresh-start build. The new `tests/e2e/fixtures/dev-server-ready.mjs` is a probe helper and is documented in its own header. No report recorded a stale command |
| `RELEASE.md` | Project release guide (read on the integrated `origin/personal` copy) | `No change` | No release step changed. Nothing was found wrong with the guide |
| `autobyteus-web/docs/remote_access.md` | Phone shell behavior (D-01, D-02, D-05, D-08) | `Updated` | — |
| `docs/android_mobile_access.md` | Android app behavior (D-03, D-07, D-08) | `Updated` | — |
| `autobyteus-server-ts/docs/modules/node_desktop.md` | Viewer limit (D-06) | `Updated` | — |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Workspace registration (D-08) | `Updated` | — |
| `autobyteus-web/docs/localization.md` | Locale formatting rule and guard (D-17) | `Updated` | — |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Address candidates (D-18) | `Updated` | — |
| `autobyteus-web/docs/content_rendering.md` | File-link status (D-19); D-12 text from the implementation | `Updated` | The D-12 change was checked against `CollaborationMessageReferenceViewer` |
| `autobyteus-web/docs/agent_artifacts.md` | D-12 (implementation) | `No change` by delivery | The implementation's text matches the component |
| `docs/design-cases.md` | D-13 (implementation); merge with autobyteus-416 | `No change` by delivery | It merged cleanly with 416. The Case 17 "fix" wording is open for the Solution Designer to confirm (implementation handoff, BEH-013). Delivery did not change it |
| `autobyteus-server-ts/docs/features/remote_access.md` | Phone credential and route rules | `No change` | Server rules are unchanged; D-02 adds no route. The check is an ordinary authorized GraphQL request |
| `GLOSSARY.md` | Address-candidate terms | `No change` | "Memory Sync and Remote Collaboration keep their own address candidates" stays true |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Behavior | **After pairing**: the credential check on opening, Retry and Check (never on the poll); the definitions feed only while paired. **Revocation and Disable**: what the phone shows when revoked, when Phone access is off, when the node is down, and the sheet's "Not reachable" while off. **New run**: the folder-path refusal. **Node desktop**: the Clipboard sheet | D-01, D-02, D-05, D-08 |
| `docs/android_mobile_access.md` | Behavior | Process-death return: the same node and `/mobile` URL; a run screen comes back as the list; a share that started the app is not run again; ordinary start for a removed node or a refused URL. Navigation rule: a `blob:` preview subframe of the node's origin loads; the other cases are blocked or opened externally. Folder-path refusal | D-03, D-07, D-08 |
| `autobyteus-server-ts/docs/modules/node_desktop.md` | Operations | The `[node-desktop] stream refused …` line, its fields, and that nothing identifying is logged | D-06 |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Contract | Unregistered paths must be existing absolute folders: `WORKSPACE_PATH_REFUSED` with its reasons. Applies to every registering path. Registered paths are not re-checked | D-08 |
| `autobyteus-web/docs/localization.md` | Rule | Shown dates, times and numbers use the app's UI locale; what the guard rejects | D-17 |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Behavior | `lan` / `tailnet_like` / `public` classification and order; link-local addresses not listed; the one range owner | D-18 |
| `autobyteus-web/docs/content_rendering.md` | Behavior | The file-link status shows on read-only conversations, with no composer | D-19 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The phone's connection state | Only the phone's own credential check decides it. A history read or the poll does not | design-spec D-02 (SR-008), CRR-005 | `autobyteus-web/docs/remote_access.md` |
| Workspace registration contract | A new path is checked before it is registered; registered paths stay as they are (DEC-004) | design-spec D-08, requirements AC-008 | `autobyteus-server-ts/docs/modules/workspaces.md` |
| Android restore | Saved instance state restores the node and URL. The share that started the app is not re-delivered | design-spec D-03 (SR-008) | `docs/android_mobile_access.md` |
| Locale rule | The app UI locale is used, and the guard enforces it | design-spec D-17 | `autobyteus-web/docs/localization.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `utils/remoteAccess/remoteAccessAuthFailure.ts` | `utils/remoteAccess/remoteAccessReadRefusal.ts`, which takes status and code only | `autobyteus-web/docs/remote_access.md` (behavior); implementation handoff BEH-002 |
| Phone connection state from `recordAuthorizedApiReachability` | `mobileNodeSessionStore.checkCredential()` + `recordCheckOutcome` | `autobyteus-web/docs/remote_access.md` |
| `TeamCommunicationReferenceViewer` named in the docs | `CollaborationMessageReferenceViewer` (the real component) | `autobyteus-web/docs/agent_artifacts.md`, `docs/content_rendering.md` (D-12) |
| The server-addressing service's own IP-range copies | `remote-access/services/ip-address-ranges.ts` | `autobyteus-server-ts/docs/modules/remote_collaboration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, the handoff summary, then finalization into `origin/personal` (no release).
- Notes: one item for the Solution Designer stays open: confirming the D-13 Case 17 "fix" wording. It is not a delivery blocker; API-10 proved AC-013 is met. Nothing new outside the ticket was found, so no follow-up was added.

---

# Ticket Round 2 (items 9, 20–23; AC-004b dropped by DEC-013)

## Scope

- Trigger: CRR-008 (post-API/E2E test-code review) Pass; API-REV-003 Pass at 95%; CRR-007 Pass.
- Base: round 1 finalized at `d785ded109`. Integrated base used for docs sync: `origin/personal` @ `eebbc2b8ee` (the v1.5.12-beta.8 release: a version bump and autobyteus-431's delivery records), merged at `0714ea1e68`.
- Post-integration verification reference: `release-deployment-report.md` § Ticket Round 2 (DEL-R2-01).

## Why Docs Were Updated

- D-09 adds a status read to the run-history poll, and with it a new GraphQL read. Delegated rows of listed runs that are not open now follow their children. The phone doc said the opposite ("shows the state last read and updates when that run is opened"); it is corrected.
- D-20 adds a peer error code, `PEER_HOST_REFUSED`, an attempt result, `host_refused`, and a Nodes page cause text.
- DEC-013 (B) made a run screen coming back as the list the decided behavior. Round 1's Android doc said "currently"; it now says so plainly.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | `No change` | No rule changed |
| `TESTING.md` | Project testing guideline | `No change` | The probe flag `--day` (D-21) and `fixtures/shifted-clock.mjs` are documented in the probe's header. No stale command was recorded |
| `RELEASE.md` | Release guide (integrated copy) | `No change` | The base's release changed only the version |
| `autobyteus-web/docs/workspace_layout.md` | The history poll (D-09) | `Updated` | — |
| `autobyteus-web/docs/remote_access.md` | Phone run list rows (D-09) | `Updated` | Stale sentence corrected |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | GraphQL reads of the root (D-09) | `Updated` | — |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Peer add / change address / resolution errors (D-20) | `Updated` | — |
| `autobyteus-web/docs/settings.md` | Nodes page causes (D-20) | `Updated` | — |
| `docs/android_mobile_access.md` | Run screen after process death (DEC-013) | `Updated` | — |
| `autobyteus-server-ts/docs/features/remote_access.md` | Origin rule (D-23) | `No change` | D-23 moves one helper into `web-origin.ts` with behavior unchanged, and no doc names the helper |
| `docs/design-cases.md` | Case 17 refers to item 9 | `No change` | Case 17 records 277's history and already points to item 9 as the smaller read |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/workspace_layout.md` | Behavior | New "Delegated row states": which runs are read; the one status read after the quiet history read; when a run's view is re-read (active state or local children changed); one refresh at a time; the open run and remote children excluded; shared by Runs, Workspaces and the phone | D-09 |
| `autobyteus-web/docs/remote_access.md` | Behavior | The run list's delegated rows follow their children on each poll | D-09 |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Contract | `agentRunCollaborationStatuses(runIds)`: limit, shape, inactive answer, never restores | D-09 |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Contract | `PEER_HOST_REFUSED` with `host` from adding and changing the address; the `host_refused` attempt result; other 403s unchanged | D-20 |
| `autobyteus-web/docs/settings.md` | Behavior | The cause text for a refused name | D-20 |
| `docs/android_mobile_access.md` | Behavior | A run screen coming back as the list is decided (DEC-013) | DEC-013 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Two private `parseWebOrigin` copies (`node-browser-access.ts`, `remote-access-request-origin.ts`) | `src/api/security/web-origin.ts` | Code only; no doc named them (D-23) |
| The status loop in the collaboration context's constructor | `agentRunCollaborationContext.ts` `applyStatuses` (shared by the view and the status read) | `autobyteus-web/docs/workspace_layout.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, archiving the ticket (round 2 is the last round), and finalization into `origin/personal` with no release.
