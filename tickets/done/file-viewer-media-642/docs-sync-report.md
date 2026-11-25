# Docs Sync Report — autobyteus-642 (file-viewer-media-642)

## Scope

- Ticket: `file-viewer-media-642` (Project Task `autobyteus-642`, absorbing `autobyteus-639`): four items. REQ-001, the message-reference route serves ranges like the other file routes and a reference's video or audio streams (desktop) or plays natively (apps) instead of downloading whole (574 FU-001). REQ-002, the apps' native player plays audio as it plays video, and the iOS app's sound is heard with the Ring/Silent switch on silent (574 FU-002, DEC-007). REQ-003, the desktop Files tab keeps the file viewer at least 400 px wide (618 FU-002). REQ-004, more file types are highlighted in the file viewer and in chat code blocks (618 FU-003, DEC-002, DEC-008). The bridge, the cache folder and the helper names are renamed clean from "video" to "media" (DEC-003).
- Trigger: API-REV-002 `Pass` (93.4 %, round 2 on IR-006), test-code review CRR-008 `Pass`; source review CRR-001 `Fail` (CR-001, Requirement Gap), CRR-002 `Fail` (CR-002), CRR-003, CRR-004, CRR-005 `Pass`, CRR-006 `Fail` (CR-003), CRR-007 `Pass`. Architecture review ARCH-REV-001 `Fail`, ARCH-REV-002 `Pass`, ARCH-REV-003 `Fail`, ARCH-REV-004, 005 and 006 `Pass`. `task_size` `Large`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `5c0db3a801`.
- Integrated base reference used for docs sync: `origin/personal` `45d1b4309c` (autobyteus-638, server only), merged as `0813c4f30e`.
- Post-integration verification reference: `evidence/delivery/` on the merged tree; the release/deployment report lists it.

## Why Docs Were Updated

- Summary: the ticket updated the web and phone docs, NA-8, the app READMEs and the design cases when it renamed the bridge and added audio. Delivery's review of the merged tree found what it left false or missing:
  - the server doc's "User Files" paragraph (written by autobyteus-574) said the message-reference routes hand over only a stream and send the whole file, and that `UserFileContent.size` can be `null`. The ticket removed the stream form: every file route now hands over a file, and the reference routes serve ranges, keeping `no-store`;
  - no doc said where the file viewer's languages and the chat code blocks' languages come from, or that they use two vocabularies (the ticket removed `FileDisplay.vue`, the table's Prism column and `getPrismLanguage`);
  - autobyteus-574's archived release note told users that audio and message-reference videos still download whole, which the same release now makes false (C-6: the two ship together);
  - the iOS doc's test list did not name the new `NativeMediaRealNodeUITests`.
- Why this should live in long-lived project docs: a later change to a file route must know that every route is a ranged file with a version (an old copy of a rewritten file must never show, and a reference must never be stored); a later highlighted type needs both its Monaco name and its Prism grammar, or one surface silently stays plain.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 9 (no compatibility between versions), rule 12 (build-only runs), Principle 7 (no dead code), Principle 15 (names) | No change | The ticket applies existing rules: DEC-003 is a clean rename (nothing shipped `playVideo`), DEC-008 removes dead code |
| `TESTING.md` | Test layers; the iOS wrapper row; Fresh-start build | No change | No Gradle file, `project.yml`, `package.json` or tsconfig changed; the iOS smoke script matched the build-input glob and the build-only iOS run covers it |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree; unchanged by the ticket |
| `docs/design-cases.md` | Design cases | Updated in the ticket (kept) | Three bullets: a cache header's readers, the reference viewer's whole read, media named by URL |
| `autobyteus-server-ts/docs/design/node_access_model.md` | NA-8: credentials never leave their owner | Updated in the ticket (kept) | `playMedia` (was `playVideo`); checked against `ShellBridge.kt` |
| `autobyteus-web/docs/file_explorer.md`, `remote_access.md`, `agent_artifacts.md` | The viewers, the bridge, the artifacts and references | Updated in the ticket (kept) | `useNativeMediaPlayback`, `hello.mediaPlayer`, `playMedia`, the reference viewer's one-byte probe, `FileExplorerLayout`'s 400 px rule |
| `docs/android_mobile_access.md` | The Android app | Updated in the ticket (kept) | "Video and audio", `MediaPlayerActivity`, `media-cache` |
| `docs/ios_mobile_access.md` | The iOS app | Updated in the ticket; one sentence added by delivery | The audio session, the 0.7 s read-ahead rule, `media-cache`; delivery added `NativeMediaRealNodeUITests` to the tests line |
| `autobyteus-android/README.md`, `autobyteus-ios/README.md` | How to run the app tests | Updated in the ticket (kept) | The audio fixtures and the new iOS class |
| `autobyteus-server-ts/docs/features/remote_access.md` | "User Files": what every file route answers | Updated by delivery | The stream form is gone |
| `autobyteus-web/docs/content_rendering.md` | Text and code in the viewer; Markdown code blocks | Updated by delivery | New section "Highlighted File Types" |
| `tickets/done/phone-video-574/release-notes.md` | The archived release note of the ticket this one builds on | Corrected by delivery | One bullet removed (audio and reference videos "still download completely") |
| `autobyteus-server-ts/docs/modules/restart_resume.md`, `design/collaboration_model.md` | Changed by the base (autobyteus-638), merged here | No change | Not touched by this ticket; no statement about references or ranges |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Contract | "User Files": a route hands over a `UserFileContent` (path, size, modified time) and `sendUserFile` serves it by range; the `kind: "file"` / `kind: "stream"` split and the `null` size are gone; the message-reference routes answer the same way and keep `Cache-Control: no-store` | The ticket's REQ-001 removed the stream form |
| `autobyteus-web/docs/content_rendering.md` | Behavior | New section "Highlighted File Types": the file viewer's table (`languageDetector.ts`, whole name then extension, Monaco names, TOML as `ini` and Vue as `html`, plain text otherwise) and the chat code blocks' PrismJS grammars by fence name (`highlightService.ts`, the `rs` and `zsh` aliases); where a new language is added; `FileDisplay.vue` removed | REQ-004, DEC-002, DEC-008 |
| `docs/ios_mobile_access.md` | Validation | The tests line names `NativeMediaRealNodeUITests` and what it covers | The ticket's new class |
| `tickets/done/phone-video-574/release-notes.md` | Correction | Removed "Audio files, and a video reached only through a message's list of reference files, still download completely before they play." | The statement is false once this ticket is on `personal`; both ship together (C-6) |

All statements were checked against the code at the merged state: `user-file-reply.ts` (`UserFileContent`, `sendUserFile`), `collaboration-message-references.ts` and `message-reference-content-reader.ts` (path, size and `modifiedMs` from one `stat`), `grep 'kind: "stream"' src` (no user left), `languageDetector.ts` (`HIGHLIGHTED_FILE_TYPES`), `highlightService.ts` (the registered grammars and the two aliases), and that `FileDisplay.vue` and the Prism column no longer exist. The ticket's own doc changes were read against `ShellBridge.kt`, `MediaKind.swift`, `MediaAudioSession.swift` and the final loader rule (IR-006).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Every file route is a ranged file with a version | One owner serves each route's file by range with an `ETag`; a reference keeps `no-store`; there is no stream form | `design-spec.md` D-1 | `features/remote_access.md` (User Files) |
| Two highlighting vocabularies | The file viewer maps a file type to a Monaco name; chat code blocks map a fence name to a Prism grammar; each language needs both | DEC-002, DEC-008, SR-006 | `content_rendering.md` |
| The phone's player by kind and type | The app lists the extensions its player plays per kind; the page plays any other type itself | DEC-003; `design-spec.md` D-2 | web `file_explorer.md`, `remote_access.md` (kept from the ticket) |
| The iOS audio session | While the player shows, the session is `.playback` with `.moviePlayback`, so the Ring/Silent switch does not mute the sound; it ends with the screen | DEC-007 | `docs/ios_mobile_access.md` (kept from the ticket) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `playVideo`, `hello.videoPlayer` | `playMedia { kind, … }`, `hello.mediaPlayer { video, audio }` | web `remote_access.md`, NA-8 |
| `video-cache` (both apps) | `media-cache` | `docs/android_mobile_access.md`, `docs/ios_mobile_access.md` |
| `useNativeVideoPlayback` and the "video" names in the apps | `useNativeMediaPlayback(kind)`, the "media" names | web `file_explorer.md` |
| `UserFileContent`'s stream form | one file form | `features/remote_access.md` |
| `FileDisplay.vue`, `getPrismLanguage`, the table's Prism column, `segmentHighlighter.ts`, `vueCodeHighlight.ts` | the file viewer's table (Monaco) and `highlightService` by fence name | `content_rendering.md` |
| The reference viewer's whole download of a video or audio | one `bytes=0-0` probe and the route's own URL | web `file_explorer.md`, `agent_artifacts.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` for the docs.
- Next delivery action: the verification record and the build-only runs' results, handoff summary, archive, finalization.
- Notes: no discrepancy outside this ticket was found. autobyteus-574's follow-ups FU-001 (message references served whole) and FU-002 (audio) are resolved by this ticket; the Solution Designer need not send them.
