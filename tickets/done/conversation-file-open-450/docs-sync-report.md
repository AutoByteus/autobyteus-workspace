# Docs Sync Report — autobyteus-450

## Scope

- Ticket: autobyteus-450. Files attached to a conversation open on the phone, and every open of a file shows its current content.
- Trigger: delivery DR-001, after API/E2E's Pass (API-REV-001). Direct route (Medium / Low).
- Bootstrap base reference: `origin/personal` `6884309283` (v1.5.13-beta.1)
- Integrated base reference used for docs sync: the same. The branch was already current; nothing to integrate.
- Post-integration verification reference: `release-deployment-report.md`

## Why Docs Were Updated

- Summary:
  - The phone now shows and opens a conversation's attachments in its own viewer.
  - An explicit open of an already-open file now reads it again, on desktop and phone.
  - The Android WebView keeps the page on a main-frame navigation to a node route.
  - None of the three was described in the long-lived docs.
- Why this should live in long-lived project docs:
  - the explicit-open re-read is a store rule that every opener relies on;
  - `KeepPage` is part of the Android navigation policy, which the docs list rule by rule.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | The phone's screens | Updated | Attachments on the phone, and reopen reads again |
| `autobyteus-web/docs/file_explorer.md` | Reopen and draft rules | Updated | The explicit-open re-read per type; drafts kept; a viewer left open does not refresh (FU-001) |
| `docs/android_mobile_access.md` | WebView navigation policy | Updated | `KeepPage` for `/rest/…` and `/graphql`; needs the app update |
| `autobyteus-android/README.md` | Android module overview | No change | It does not describe the navigation policy |
| `DESIGN.md` | Project design rules | No change | No new rule |
| `TESTING.md` | Testing guideline | No change | The existing phone-probe and emulator rules applied |
| `RELEASE.md` | Release guide | No change | Its steps matched this delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Addition | Thumbnails with the phone's key; a tap opens the phone viewer (`contextFile` entry, path entries, the other-node notice); Back returns | New phone behavior |
| `autobyteus-web/docs/file_explorer.md` | Addition | `_openFileWithMode` re-read: text `network-only` with the draft kept; other types `contentRevision` | New store rule |
| `docs/android_mobile_access.md` | Addition | Main-frame node routes answered `KeepPage` | New policy rule |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| No page navigation to node files on the phone | A node URL loaded as the page carries no key. Open files through the phone viewer; the app keeps the page if a navigation slips through | `design-spec.md` DS-001, DS-003 | `remote_access.md`, `android_mobile_access.md` |
| Explicit open re-reads | Each open shows current content without losing an unsaved edit | `design-spec.md` DS-002 | `file_explorer.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Phone attachment chips as names that open the node URL in the page | Thumbnails, and the phone's attachment opener | `remote_access.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then finalization.
