# Docs Sync Report — autobyteus-572 (chat-media-path-playback)

## Scope

- Ticket: `chat-media-path-playback` (Project Task `autobyteus-572`): tapping a video or audio path in chat plays it on the phone without the misleading "Video URL is not available." message; the download shows a loading view with progress; a failure says so plainly with Retry; authentication and path security are unchanged.
- Trigger: API-REV-002 `Pass` (95.1 %) on the direct low-risk route (`task_size` `Medium`, `architectural_risk` `Low`). Review gates: architecture review, source review and test-code review are `Not Applicable` on this route; the one review document is CRR-001, the failure-origin review of API-REV-001's failure (`Design Impact`, resolved by SR-004 / D-7).
- Bootstrap base reference: `origin/personal` `bfd95f73a9`.
- Integrated base reference used for docs sync: `origin/personal` `b072d93d8e` (81 commits), merged into the ticket branch as `367711125f`.
- Post-integration verification reference: `evidence/delivery/` `DEL-01`…`DEL-03` on `367711125f` (both typechecks, the ticket's unit specs, server and phone-bundle rebuilds, the phone cases MSP-89…92); the release/deployment report lists the commands and results.

## Why Docs Were Updated

- Summary: the ticket changed what a phone user sees while a media file downloads (a loading view with progress instead of "URL is not available."), what a failed file offers (one plain message with Retry, on the shared players and on the phone viewer's own failure state), and what the node declares about a file (`Content-Length`). The ticket edited only `docs/design-cases.md`; no document that describes the viewers, the phone, the file routes or the user-file reply named any of it. One existing passage described the video player's streaming behavior in a way that is true only where the element gets the URL itself (it is not true on the phone, where the player waits for a whole download).
- Why this should live in long-lived project docs: a later change to the viewers or to a file route must know that (a) the phone shows loading and Retry states and never "not available" for a file on its way; (b) the node's file routes serve whole files with a declared length and no Range, which is why the phone downloads whole; and (c) a route that cannot state a length passes `null`, not a guessed number. Without it the next change could drop `Content-Length` from a route, which turns the phone's "4.1 of 9.7 MB" into "4.1 MB" with no test naming the cause.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket applies existing rules (one owner per policy: `MediaLoadingState`, `sendUserFile`; DESIGN.md rule 9 and the node access model: no key in a URL). No new rule |
| `TESTING.md` | Test rules and commands | No change | It names browser probes generically (`test:e2e:mobile-shell`) and keeps no case list. The ticket adds cases MSP-89…92 to the existing probe file, and changes no package script |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree. The base added a "Desktop signing readiness" section for tags; it does not apply to a delivery without a release. The Finalization Target rules did not change |
| `AGENTS.md` | Pointers | No change | |
| `GLOSSARY.md` | Defines the user file reply | Updated by delivery | "User file reply" now names `Content-Length` |
| `docs/design-cases.md` | The design case this ticket's implementation found (DI-001) | Updated in the ticket (kept) | One bullet in Case 5: the design promised an outcome for relative paths that chat never turns into file links |
| `autobyteus-web/docs/remote_access.md` | The phone's file links, viewer and failure states | Updated by delivery | See "Docs Updated" |
| `autobyteus-web/docs/file_explorer.md` | Runtime row for the phone, the video player's loading behavior | Updated by delivery | See "Docs Updated" |
| `autobyteus-web/docs/content_rendering.md` | Names the shared viewers and the node-file route | No change | It lists which viewer renders which type and where bytes come from (node file route), none of which changed; the loading behavior belongs in `file_explorer.md`, next to the player's own description |
| `autobyteus-server-ts/docs/features/remote_access.md` | "User Files": what `sendUserFile` answers | Updated by delivery | See "Docs Updated" |
| `autobyteus-server-ts/docs/design/node_access_model.md` | Route permissions and the node-file row (NAS-39/40) | No change | Who may read which file, the gate and the path rules are unchanged (AC-005; MSP-91 checks 401 without a key on both media routes and 400 for a path climbing out of the folder). The row says "with the user-file headers", which stays true |
| `autobyteus-server-ts/docs/modules/*` | Module docs of the changed routes | No change | None describes a route's response headers; the three reference routes' stream-only services are unchanged apart from passing `size: null` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Behavior | The phone's file-link passage: a video or audio file, inside or outside the run's folder, downloads whole with the key in the request header and meanwhile shows the loading view (`MediaLoadingState`: "Loading video…" / "Loading audio…" / "Loading file…", "4.1 of 9.7 MB" when the node declared the length, else "4.1 MB"), never "Video URL is not available."; a large video takes as long as its download and cannot be skipped through until loaded. The phone-viewer passage: a file that cannot be opened shows one plain message with **Retry** (broken download, missing path, a player's own failure); Retry reads the file again; no Retry for a folder or for a file of another folder | New durable phone behavior |
| `autobyteus-web/docs/file_explorer.md` | Behavior (two places) | The Phone-first `/mobile` runtime row: loading view with progress and Retry for node files and workspace files. The `VideoPlayer.vue` paragraph, which said the player streams and seeks "without first buffering the whole source": now says where that holds (the embedded window's `local-file:` URLs answer Range; a desktop window's workspace URL plays progressively but cannot seek past what has loaded, because the node's file routes serve no part of a file) and that where the key must travel in a header (the phone) `useAuthorizedObjectUrl` downloads the whole file first behind `MediaLoadingState` | The paragraph was not true for the phone, and the ticket's reports record that behavior |
| `autobyteus-server-ts/docs/features/remote_access.md` | Contract | "User Files": `sendUserFile` also declares `Content-Length` when the route knows the length (`UserFileContent.size`, required: a number, or `null` for the message-reference routes whose services return only a stream); the routes serve a whole file, never a part (no `Accept-Ranges`, no `206`) | New field of the one user-file reply; the Range statement is the reason the phone cannot stream |
| `GLOSSARY.md` | Definition | "User file reply" lists `Content-Length` where the route knows it | Keeps the definition equal to `user-file-reply.ts` |
| `docs/design-cases.md` | Design case (by the ticket) | Case 5 bullet | Lesson for future requirements |

All statements were checked against the code at the merged state: the three `size: null` callers (`agent-org-references.ts:22`, `team-communication.ts:40`, `agent-collaboration-references.ts:41`), `sendUserFile` setting the header only for a number, no `Accept-Ranges` or `206` under `src/api/rest` and `src/node-files`, `useAuthorizedObjectUrl` downloading into an object URL when the key must be sent, `MobileFiles.vue`'s `retryable` rules, and the strings in `localization/messages/en/tools.ts` and `workspace.ts`.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The phone downloads media whole, and says so | A media element cannot send the phone's key and keys never go in URLs (node access model), and the node's file routes serve no Range, so the phone downloads first; the viewer shows loading with progress, then plays | `investigation-notes.md`, `design-spec.md` D-1…D-4, requirements DEC-001 | `remote_access.md` (web), `file_explorer.md` |
| The node declares a file's length | `UserFileContent.size`, `Content-Length` where known, `null` where a route only has a stream | `design-spec.md` D-5 | `autobyteus-server-ts/docs/features/remote_access.md`, `GLOSSARY.md` |
| Failure means Retry | A broken download or missing file shows a plain message with Retry on every viewer the phone opens; a folder has none | `design-spec.md` D-6, D-7 (SR-004); `code-review-report.md` CRR-001 | `remote_access.md` (web) |
| Absolute paths only | Relative paths in chat are not file links (any type, phone and desktop) | requirements DEC-003, `follow-ups.md` FU-003 | `docs/design-cases.md` (by the ticket) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The players' "Video URL is not available." / "Audio URL is not available." while a download is under way, and the node-file viewer's bare "Opening…" for media | `MediaLoadingState` (shared by `VideoPlayer`, `AudioPlayer`, `MobileFileViewer`), driven by `useAuthorizedObjectUrl`'s `loading` / `progress` and `useMobileNodeFile`'s `progress`; "not available" only when there is no URL and nothing loads | `file_explorer.md`, `remote_access.md` (web) |
| The audio player's raw error text | "This audio could not be played." with Retry, as the video player | `file_explorer.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization on `personal`.
- Notes: docs match the integrated code. API/E2E noted that a Team message's reference viewer has its own download and its own "Loading reference file..." text with no progress (MSP-92), so the implementation handoff's "x MB without a total" for the three `size: null` routes does not describe what the user sees there; no long-lived doc claimed it, and the docs above state only the route fact (`size: null`).
