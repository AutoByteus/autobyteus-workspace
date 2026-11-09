# Handoff Summary — autobyteus-450

## Summary Meta

- Ticket: `conversation-file-open-450` (Project Task autobyteus-450). Files attached to a conversation open on the phone; every open of a file shows its current content.
- Date: `2026-11-09`
- Current status: `Complete`. Verified from the evidence and finalized into `origin/personal` (DR-001; the merge and push are in `release-deployment-report.md`). No release.
- Routing: `task_size` `Medium`, `architectural_risk` `Low`, route `Direct` (no architecture, code or test-code review, by the team's rules). IR-001 and IR-002 (SR-003); API-REV-001 Pass at 95.6%.
- Archived ticket folder: `tickets/done/conversation-file-open-450/`

## Delivery Summary

- **Bug 1, the page (DS-001, `e02a230940`; drafts in `5f06b08ce9`):**
  - Phone attachment chips, sent and draft, show thumbnails loaded with the phone's key.
  - A tap opens the phone's viewer (`useMobileAttachmentOpening`) instead of navigating the page to the node's file URL.
  - A path of a run on another node shows the file-link notice (DEC-006).
- **Bug 1, the app (DS-003, `e470edf165`):** the Android WebView answers a main-frame navigation to `/rest/…` or `/graphql` with `KeepPage`. That navigation carried no key, and its 401 made the app show "Pair this phone again" (ASM-001, confirmed on the emulator).
- **Bug 2 (DS-002, `edd84787f7`):** an explicit open of an already-open file reads it again. Text is fetched `network-only` with the draft kept; other types bump `contentRevision`.
- **Durable tests:** specs per owner, `TrustedNavigationPolicyTest`, and phone probe cases MSP-28…31 (`mobile-file-open-cases.mjs`).
- **Docs:** `remote_access.md`, `file_explorer.md`, `android_mobile_access.md`. See `docs-sync-report.md`.

## Verification

- Verified from the evidence; no user check needed. Final confidence 95.6%, no category below 95%.

| AC | Proven by | Result |
| --- | --- | --- |
| AC-001 | MSP-28 | Thumbnails are blob loads; no 401 |
| AC-002 | MSP-28 | PNG, PDF, text (draft and sent) and a workspace path each open in the viewer and Back returns; no main-frame node navigation and no new window |
| AC-002 | MSP-29 | Another node's path: the notice, nothing opened |
| AC-003 | MSP-31 (desktop) | New link, same link and Files tab all show TWO; the unsaved edit is kept |
| AC-004 | MSP-30 | Text and image, new and old links, current content |
| AC-005 | API-06 on the Android emulator | (a) new page + new APK: viewer, Back; revoked → the page's pairing screen. (b) old page + new APK: the page is kept. (c) old page + old APK: "Pair this phone again", the user's report |
| AC-006 | API-05 | All 31 cases Pass, including MSP-13 and MSP-16/17 |

- The probe verdict is `Fail` only on 52 pre-existing 401 lines from the revoked main phone (autobyteus-446 FU-003).

## Integration

- The branch already contained `origin/personal` `6884309283` (v1.5.13-beta.1), the base the evidence was tested on. There was nothing to integrate and no rerun needed.

## Accepted Residual Risks

- FU-001: a viewer left open does not refresh by itself (DEC-004, out of scope).
- An old APK with the new page: the new page navigates nowhere (MSP-28), so only a non-viewer tap that still navigated would matter, until the app update.

## Notes For The Solution Designer

- **The fix needs a new APK, and there is no release.** Users get the page fix with the next node update and the `KeepPage` safety net with the next Android app. `release-notes.md` carries a "What you need to do" section for that release.
- **autobyteus-446 FU-003 still makes every full phone probe's verdict `Fail`.**

## Follow-ups

`follow-ups.md` (FU-001 and any others there), for the Solution Designer to send now that the ticket leaves the team.

## Release

None. Release only on the user's word (handoff), and `RELEASE.md` defaults to none. A release is available. The Android part reaches users only with an APK release (a beta or stable tag builds the signed APK).
