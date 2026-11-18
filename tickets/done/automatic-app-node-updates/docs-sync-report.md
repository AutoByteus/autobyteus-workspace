# Docs Sync Report — automatic-app-node-updates (autobyteus-356)

## Scope

- Ticket: `automatic-app-node-updates`, Project Task `autobyteus-356`: an "Update automatically" switch for the desktop app and for each Docker node. `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Trigger: CRR-006 (test-code review Not Applicable) from the code reviewer, after API-REV-003 Pass.
- Bootstrap base reference: `origin/personal` @ `3b9dc912a1`.
- Integrated base reference used for docs sync: `origin/personal` @ `84ea944ac5` (134 commits), merged as `42d74d09c6`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: the change documented both switches in `electron_packaging.md` (Automatic App Updates, Automatic Node Updates, the IPC list, the "nothing downloads by itself unless" rule) and `settings.md`, and added the strings in both locales. Both docs were also changed on the base. The merge was clean, and delivery checked the merged text against the code: the store, policy, install readiness, install attempt, run record and node updater. It is accurate. No further doc change was needed.
- Why this should live in long-lived project docs: the app now installs and restarts without a click, so the conditions, the macOS wait and the one-attempt rule must be findable without the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Updater behavior; both new sections | Updated (by the change) | Consistent with 339's "Install update and restart" paragraph and the base's edits |
| `autobyteus-web/docs/settings.md` | The switches in the Notification Center, Settings and Nodes | Updated (by the change) | — |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | AC-003 relies on it | No change | It already lists "automatic updates" as an update restart |
| `autobyteus-server-ts/docker/README.md` | Node in-place update | No change | The node side is unchanged; the desktop calls the existing update API (AC-006: no server surface) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Behavior (change) | Automatic App Updates; Automatic Node Updates; IPC `app-update:set-automatic`; the auto-download exception | REQ-001..006 |
| `autobyteus-web/docs/settings.md` | Behavior (change) | Switch placement and outcomes | REQ-001, REQ-005 |
| `autobyteus-web/localization/messages/{en,zh-CN}/*` | Strings (change) | Switch, outcome and failure texts | REQ-004, REQ-005 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| When the app installs by itself | As soon as the download is done (DEC-001). On macOS, after Squirrel's own verified copy (bounded wait of 15 min; nothing stops during it) | requirements DEC-001, SR-004; design | `electron_packaging.md` |
| One attempt per version | An install or trial failure blocks that version for automatic installs; a download failure retries at the next check | REQ-004 | `electron_packaging.md` |
| Nodes follow the desktop | Only to the desktop's version, only when older, only while a desktop runs (DEC-003) | DEC-003 | `electron_packaging.md` |

## Removed / Replaced Components Recorded

None (additive feature; the manual path is unchanged).

## No-Impact Decision

Not applicable (docs updated by the change, checked by delivery).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, archive, finalization, then the beta release the user asked for.
