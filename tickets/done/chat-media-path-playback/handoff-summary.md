# Handoff Summary

## Summary Meta

- Ticket: `chat-media-path-playback` (Project Task `autobyteus-572`; requested by `/project_task_manager` for the founder, 2026-11-20)
- Date: `2026-11-20`
- Classification: `task_size: Medium`, `architectural_risk: Low`; route: direct low-risk (no architecture review, no source review, no test-code review by policy). The one review document is CRR-001, the failure-origin review of API-REV-001's failure (`Design Impact`, resolved by SR-004 / D-7). API/E2E `API-REV-002` Pass, final confidence 95.1 % (target met, no category below 90 %).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/chat-media-path-playback`, base `origin/personal` `bfd95f73a9` at bootstrap; integrated once with `origin/personal` `b072d93d8e` (81 commits, clean merge `367711125f`). Code: server `02320583a5` (D-5), web `f2894c65e1` (through D-7, IR-002); probes `9505c9039e`.

## Delivery Summary

- Delivered scope:
  - **No misleading message.** Tapping a video or audio path in chat on the phone, inside or outside the run's folder, no longer shows "Video URL is not available." / "Audio URL is not available." (or a bare "Opening…") while the file downloads. The shared players and the phone viewer show one loading view (`MediaLoadingState`: a spinner, "Loading video…" / "Loading audio…" / "Loading file…", and "4.1 of 9.7 MB" when the length is known), then the media plays. "Not available" appears only when there is no URL and nothing is loading.
  - **The node declares a file's length.** `sendUserFile` sets `Content-Length` (`UserFileContent.size`, required: a number or `null`) on the workspace, file, context-file, run-file-change and node-file routes; three message-reference routes whose services return only a stream pass `null`.
  - **A failure says so plainly, with Retry**, on every viewer the phone opens (D-6, D-7): a broken download or missing file shows "This video could not be played." / "This audio could not be played." / "The file preview could not be opened." / "This file was not found on the computer." with Retry; Retry reads the file again (a file created meanwhile then plays). No Retry for a folder, nor for a file of another folder. zh-CN included.
  - **Security unchanged**: the phone's key stays in the request header (12 of 12 media reads in MSP-89, none in a URL), no new credential or grant; MSP-91 re-checks no key → 401 on both media routes, and a path climbing out of the folder → 400 with no bytes.
  - **Scope decision (DEC-001 = A, DEC-003)**: the phone keeps downloading whole behind the loading view (streaming is FU-001); only absolute paths in chat are file links (relative links: FU-003). Desktop is unchanged and plays the same links.
- Docs synced (`docs-sync-report.md`): `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/file_explorer.md` (including a video-player paragraph that was not true for the phone), `autobyteus-server-ts/docs/features/remote_access.md`, `GLOSSARY.md`, and `docs/design-cases.md` (one case bullet, by the ticket). `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.
- Durable coverage: phone probe cases `MSP-89…92` in `test:e2e:mobile-shell` (`mobile-file-open-cases.mjs`): video and audio inside and outside the folder, a delegated run, a ~9.7 MB video at 8 Mbit/s with rising progress, missing file and folder, a node killed mid-download with Retry on both routes, a zh-CN phone, the gate and path rules, a Team message's reference video; unit specs for the loading view, the progress reader, the object-URL composable, the node-file composable, both players, the phone viewer and the server reply and routes.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-006) is directly proven; nothing needs the user's check.
- Final confidence 95.1 % (target 95 % met).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001/AC-002: MSP-89's two big videos (9.7 MB, inside and outside): progress rising from "0.1 of 9.7 MB" to the end, then `readyState: 4`; no timeline anywhere shows "not available" (11 `notAvailableShown: false`, 0 true); MSP-91's zh-CN phone: "正在加载视频…" with 95 rising "x / 9.7 MB" samples, `played: true`.
  - AC-003: video and audio inside and outside the folder and in a delegated run's conversation: every `readyState: 4`.
  - AC-004: MSP-90, the desktop windows: inside the folder the element gets the node URL, outside it a blob; all four play.
  - AC-005: MSP-89 `mediaReads`: 12 reads, `keyInHeader: 12`, `keyInUrl: []`, `mainFrameNodeNavigations: []`; MSP-91 `gate`: `workspaceNoKey` 401, `nodeFileNoKey` 401, `climbingWithKey` 400 (73 bytes); server `node-files.e2e` (5 tests) and `request-origin-and-phone-routes.e2e` (11 tests) pass.
  - AC-006: MSP-91 on both routes: the node killed mid-download → "This video could not be played." (inside) / "The file preview could not be opened." (outside), each with Retry, and Retry plays (`readyState: 4`); MSP-89: a missing outside video → "This file was not found on the computer." with Retry, created then played; a folder → plain, no Retry. This is round 1's failing criterion (no Retry outside the folder), now holding.
- Integrated-state check on the merged tree (`evidence/delivery/`): contracts and server rebuilt, both typechecks at baseline (server 0 production errors, 1006 test-file errors in 315 files; web 0 and 86 in 36 files), the ticket's unit specs pass (server 3 files / 18 tests; web 43 files / 337 tests), the server and phone bundle rebuilt, and MSP-89…92 pass on the merged build with no unknown browser error.

## Residual Risks For The User

- **R-1 (accepted, DEC-001 = A):** a large video still downloads whole before it plays, takes as long as its download, cannot be skipped through until loaded, and sits in the phone's memory (FU-001).
- **R-2 (by design):** a file whose length changes while it is read shows a wrong total; the download still completes.
- **FU-005:** for about 2.5 s after a node restarts, a read of the run's folder answers 404 until the node registers the folder again, so a Retry in that window fails once; the next Retry plays it.
- **Not tested:** a real phone or a real Wi-Fi drop (the phone bundle ran in headless Chrome at 390×844 with touch, en and zh-CN; a broken download is a killed node process); throttling is emulated by the browser; the Electron shell (unchanged).
- **Environment (API/E2E):** the whole phone probe's overall verdict is Fail on MSP-41 only (the desktop Files editor's own save read twice; autobyteus-458 FU-003; the diff touches none of it). Server integration: 5 watcher tests fail on FSEvents (`ENVIRONMENT: the OS delivered no file event within 10 s`) and 2 files time out under load and pass alone; server E2E ran as three runs because one command reached the 2-hour limit, and its 10 failed files rerun one at a time: 8 pass, 2 fail outside the diff (`agent-package-definitions-live-refresh`, the package folder watcher on FSEvents; `provider-secret-lifecycle-graphql`, a warm-read time limit also seen failing on another branch). No failing file serves user files.

## Follow-ups

- `follow-ups.md` lists FU-001…FU-005 for the Solution Designer to send (none sent yet; none urgent): FU-001 stream or seek large media on the phone; FU-002 `ServerSettingsBasicsPanel.spec.ts` fails on the base ("GitHub" text from an unstubbed card); FU-003 relative file paths in chat are not tappable; FU-004 MSP-59 (a background task's "Stopped" on the phone) failed once under load and passes alone; FU-005 the 404 for a run's folder right after a node restart.

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: no user action, no migration).
