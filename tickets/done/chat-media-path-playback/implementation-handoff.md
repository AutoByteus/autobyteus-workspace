# Implementation Handoff — autobyteus-572 (chat-media-path-playback)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: no architecture review (Medium / Low, direct route). IR-001 went to the Solution Designer for DI-001, resolved by SR-003 (`a301dcf60e`) with no implementation change, then to API/E2E. API-REV-001 failed API-03, and the failure-origin review CRR-001 classified it as a Design Impact. SR-004 added D-7, which IR-002 implements. It goes back to API/E2E (`get_handoff_rules`: Small/Medium + Low, self-review done).
- Requirements doc: `requirements-doc.md` (SR-004; REQ-002 means absolute paths, DEC-003; Retry where the phone viewer fails, DEC-004; AC-006 with its folder exception)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-004, Ready; D-7)
- Supplemental task artifacts: `handoff-architecture-design-complete.md`, `handoff-design-revised-sr-004.md`; `follow-ups.md` (FU-001; FU-002 from this round; FU-003 relative links, from SR-003)
- Design review report: N/A (direct route)
- Triggering rework report, revision record, or evidence: IR-002: API/E2E `api-e2e-execution-coverage-report.md` (API-REV-001 Fail, API-03, `evidence/api-e2e/API-03-msp91-outside-retry/`); `code-review-report.md` (CRR-001, failure origin: Design Impact); design SR-004 (`da861a4a33`)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/tickets/in-progress/chat-media-path-playback`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback`, `codex/chat-media-path-playback`. Code commits `02320583a5` (server), `d165d3143a` (web), `04034bc797` (the audio spec's names) and the MSP-89 comment commit after SR-003 (IR-001); `f2894c65e1` (D-7, IR-002). Documents and evidence are in the commits after each round (`git log`). Base `origin/personal` `bfd95f73a9`.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, after a design revision)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 baseline)
- Related solution revision IDs: `SR-002`, `SR-003` (DI-001 resolved: absolute paths only), `SR-004` (D-7)
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001` (failure-origin review of API-03: Design Impact)
- Related API/E2E revision IDs: `API-REV-001` (Fail: API-03)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: API-03 / CRR-001 (no Retry on the phone viewer's own failure state, outside the folder)

**IR-002: D-7 Retry on the phone viewer's own failure state (SR-004), commit `f2894c65e1`.**
- `useMobileNodeFile` returns `refusal` (`not-found`, `folder` or `failed`) and `reload()`. `reload()` reads the current source again: a new serial so an answer still arriving is ignored, the old object URL released, progress and refusal reset. It is the same function the source watcher runs.
- `MobileFileViewer` gets a `retryable` prop (default false) and a `retry` event.
  - Its failure branch shows the plain message as before, keeping `role="alert"` and the `mobile-file-preview-error` test id.
  - When `retryable` it adds a Retry button: 44 px high; class `retry-button`, shared with the players' Retry, which the probes look for; test id `mobile-file-preview-retry`; label from the new key `workspace.components.mobile.views.MobileFileViewer.retry` ("Retry" / "重试").
- `MobileFiles`:
  - Node-file mount: `retryable` when the refusal is `failed` or `not-found`, never for `folder`. `retry` → `reload()`.
  - Workspace mount: `retryable` when the file is in the open agent's folder and an open error or the file's own error is shown. `retry` → `explorer.openFileReadOnly(openPath)`; an explicit open of a file already open reloads it (`_reloadOpenFile`, autobyteus-450).
  - One judgement call within the design's "an open error is shown": no Retry for a file of *another* folder. Its error is `unavailable` and reading again cannot help.
- The players keep their own failure + Retry (D-2, D-6). Every file type the phone viewer opens now offers Retry on a broken download or a missing file (DEC-004).

**DI-001, resolved by SR-003 (`a301dcf60e`, Solution Designer, 2026-11-20): REQ-002/UC-001 mean absolute paths (DEC-003); making relative links tappable is FU-003. IR-001 needed no change; MSP-89's comment now cites the decision.** The finding as raised: REQ-002 says a tapped video or audio path plays "absolute or relative". The design's Current-State Read puts relative paths on the workspace route. In a conversation, though, only **absolute** paths become file links:
- `resolveEventMonitorMarkdownFileDestination` (`autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts`) returns `not-file` for anything that is not an absolute path or a `file://` URI. Its spec says so.
- `openMobileFilePath` takes `absolutePath` only.
- So `[rel-572.mp4](media/rel-572.mp4)` renders as an ordinary `<a href="media/rel-572.mp4">`. This holds for every file type, on the phone and the desktop, today and after this change (MSP-89 records `relativeLink: {"fileControl": false, "href": "media/rel-572.mp4"}`).
- Making relative links tappable is outside the design's Change Scope. It would need a decision on what a relative path is resolved against (the run's workspace? which run's, for a delegated run?) and a change to the shared link classifier.

Options as I see them: (a) REQ-002/UC-001 mean absolute paths only, with relative links a follow-up; or (b) a design revision adds relative-path links. Nothing else in the package depends on the answer. Everything else is implemented and validated below, and the package can go on to API/E2E as it stands if (a) is chosen.

**Server (D-5), `02320583a5`.**
- `UserFileContent` gains a required `size: number | null`. `sendUserFile` sets `Content-Length` when it is a number.
- These callers pass the size of the file they stat:
  - workspace content and static (`workspaces.ts`; the route now stats once and uses that result for its existence check too);
  - `files.ts`;
  - `context-files.ts` (`contextFileContent`);
  - `run-file-changes.ts`;
  - `node-files.ts` (`node-file-reader.ts` returns `size` from the opened handle's `stat`).
- These pass `null`, because their services return only a stream: `agent-org-references.ts`, `team-communication.ts`, `agent-collaboration-references.ts` (`AgentOrgReferenceContentService.open` and the team-communication / collaboration content services). Media sent there show "4.1 MB" without a total.
- That covers 13 call sites in 8 files.

**Web, `d165d3143a`.**
- D-1:
  - `utils/download/responseBlobProgress.ts` adds `readResponseBlobWithProgress(response, onProgress)`. It reads the body with its reader, reports `{ loaded, total }` (total from `Content-Length`, else null) and returns a `Blob` typed from `Content-Type`. A reply with no body falls back to `response.blob()`.
  - `fetchAuthorizedResourceBlob(url, init, credential, onProgress?)` and `loadNodeFileFromUrl(url, asText, onProgress?)` use it when given a callback. Other callers are unchanged.
- D-2:
  - `useAuthorizedObjectUrl` returns `loading` and `progress`. They are set only on the authorized-fetch path (phone), only for the current load, and cleared on success, failure, a new source and unmount.
  - `VideoPlayer` and `AudioPlayer` render: failure → `MediaLoadingState` → element → "… URL is not available." (only when there is no URL and nothing loads).
- D-3:
  - `MediaLoadingState.vue` shows a spinner, "Loading video…/audio…/file…" and "4.1 of 9.7 MB" (else "4.1 MB"). It uses `role="status"`, `aria-live="polite"`, and has no animation under reduced motion.
  - One formatter, `formatLoadingProgress`. The unit follows the total, and loaded is capped at the total.
- D-4:
  - `useMobileNodeFile` exposes `progress`; `MobileFiles` passes it to `MobileFileViewer`.
  - `MobileFileViewer` shows `MediaLoadingState` for a known non-text type: video, audio, or "file" for image/PDF. It keeps its `mobile-file-preview-loading` test id. Text keeps "Opening…".
- D-6: `AudioPlayer` has the video player's failure state, "This audio could not be played." with Retry; the raw error text is gone. It also has the media-attempt key and the `@error`/`@loadedmetadata` handling.
- Localization: en and zh-CN keys under `tools.components.fileExplorer.viewers.{AudioPlayer,MediaLoadingState}`.
- Probes (design Change Sequence 3):
  - Durable `MSP-89` (phone) and `MSP-90` (desktop window) in `tests/e2e/mobile-file-open-cases.mjs` replace the scratch `MSP-572`.
  - `MSP-16`'s settle check in `mobile-shell-probe.mjs` knows the new loading words.
  - Media are synthetic, from ffmpeg `lavfi` (`FFMPEG` names the binary). A clear failure is raised when ffmpeg is missing.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - Server: one header plus a mechanical `size` at 13 call sites.
  - Web: 1 helper, 1 view, 2 viewers, 1 composable and the phone viewer, all inside their existing owners.
  - No credential, gate, route-permission or path-rule change. MSP-89 shows every media read carries the key in its header and no URL carries one.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E` (after DI-001 went to the Solution Designer and was resolved by SR-003)
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `DI-001` (relative paths), resolved by SR-003. No security escalation trigger was hit.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | Loading, never "URL is not available.", while a file loads; then plays | `useAuthorizedObjectUrl` (loading, progress) → `VideoPlayer`/`AudioPlayer` → `MediaLoadingState` | Unit (`VideoPlayer.spec`, `AudioPlayer.spec`, `useAuthorizedObjectUrl.spec`); IMP-07 (the reproduction now passes); MSP-89 (no "not available" in any of 9 timelines) |
| REQ-002 / AC-002 | ~10 MB at 8 Mbit/s, in and outside the folder: progress rises, then plays | DS-001 workspace route; DS-002 `useMobileNodeFile` → `loadNodeFileFromUrl(onProgress)` → `MobileFileViewer`; server `Content-Length` | MSP-89 insideBig/outsideBig: 94 progress texts "0.1 of 9.8 MB" → "9.7 of 9.8 MB", plays at ~10 s (IMP-08) |
| REQ-002 / AC-003 | Video and audio, inside/outside, delegated run's conversation, play on the phone | as above | MSP-89: 6 small files play (blob:, 3 s), incl. a run delegated on the same node ("Producer"). Relative links: out of scope (SR-003 DEC-003, FU-003) |
| REQ-003 / AC-004 | Desktop windows play the same links | Desktop path unchanged (direct URL; node file via the Files panel) | MSP-90 (node URL for the folder, blob via `/rest/node-files/content` outside); MSP-31/37 pass (IMP-09) |
| REQ-004 / AC-005 | No key in any URL; gate and path rules unchanged | No change to `node-access`, route permissions or path rules; only `Content-Length` added | MSP-89 `mediaReads`: 9 of 9 with the key in `Authorization`, `keyInUrl: []`, no 401/403. Existing `node-route-permissions` and `user-file-replies` architecture tests pass (IMP-05) |
| REQ-005 / AC-006 (SR-004) | Broken download or missing file, any file the phone viewer opens, in or outside the folder: plain message + Retry; Retry reads again; a folder: no Retry | Players' failure state (inside); D-7 `MobileFileViewer` `retryable`/`retry` ← `MobileFiles` ← `useMobileNodeFile.reload()` / `explorer.openFileReadOnly` | Unit (players; `useMobileNodeFile` reload/refusal; viewer Retry; `MobileFiles` wiring both routes, folder without Retry). MSP-89: inside missing (player Retry); outside missing → Retry → created → plays; outside folder: no Retry. MSP-91: outside Retry after a killed node (IMP-12) |
| REQ-006 | Probe cases, desktop cases, unit tests, synthetic media | `MSP-89`, `MSP-90`; specs listed below | Done (relative paths out of scope by SR-003) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/api/rest/{user-file-reply,workspaces,files,context-files,run-file-changes,node-files,agent-org-references,team-communication,agent-collaboration-references}.ts`, `src/node-files/node-file-reader.ts`. Tests: `tests/unit/api/rest/user-file-reply.test.ts` (size → header; null → none), `workspaces.test.ts` (`content-length` equals the file's bytes), `tests/unit/node-files/node-file-reader.test.ts` (`size`).
- Web:
  - Added: `utils/download/responseBlobProgress.ts`, `components/fileExplorer/viewers/MediaLoadingState.vue`.
  - Modified: `utils/remoteAccess/authorizedResourceUrl.ts`, `utils/fileExplorer/nodeFileContent.ts`, `composables/useAuthorizedObjectUrl.ts`, `composables/mobile/useMobileNodeFile.ts`, `components/fileExplorer/viewers/{VideoPlayer,AudioPlayer}.vue`, `components/mobile/views/{MobileFileViewer,MobileFiles}.vue`, `localization/messages/{en,zh-CN}/tools.ts`, `tests/e2e/{mobile-file-open-cases,mobile-shell-probe}.mjs`.
  - Tests: new `responseBlobProgress.spec.ts`, `MediaLoadingState.spec.ts`, `AudioPlayer.spec.ts`; cases added to `VideoPlayer.spec.ts`, `useAuthorizedObjectUrl.spec.ts`, `useMobileNodeFile.spec.ts`, `MobileFileViewer.spec.ts`.
  - `useAuthorizedObjectUrl.reload.spec.ts`: its mocked reply gained `headers`, as a real `Response` has (the reload path now passes a progress callback, which reads them).

- IR-002 (D-7): `composables/mobile/useMobileNodeFile.ts`, `components/mobile/views/{MobileFileViewer,MobileFiles}.vue`, `localization/messages/{en,zh-CN}/workspace.ts`, `tests/e2e/mobile-file-open-cases.mjs` (MSP-89's outside missing and folder steps). Tests: `useMobileNodeFile.spec.ts` (+3), `MobileFileViewer.spec.ts` (+3), `MobileViews.spec.ts` (+2).

## Important Assumptions

- No compression is installed on the node, so `Content-Length` is the body's length (design D-5). The progress helper shows "x MB" without a total when the header is absent.

## Known Risks

- R-1 (design, accepted by DEC-001): large videos still download whole and sit in the phone's memory (FU-001).
- R-2 (design): a file that changes length while it is read makes the total wrong; the download still completes.
- Units:
  - The loading view uses decimal MB (1,000,000), the way the phone's own file details show sizes. The design's example "4.1 of 9.7 MB" for the founder's 9.7 MB file is decimal too.
  - Some other app surfaces (task context files, memory sync) use 1024-based "MB". The first build used 1024 and showed "9.2 MB" for the founder's file (IMP-07); I changed it to decimal.
- On the phone the node-file loading view sits near the top of the screen, where "Opening…" was. The workspace-route view (inside the player) is centered on the player's black background (IMP-08 screenshots). I kept each owner's existing placement.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix (honest state) plus a small response contract addition.
- Reviewed root-cause classification: a missing state (loading) between "no URL" and "URL".
- Reviewed refactor decision: no refactor; one shared helper and one shared view.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: DI-001 (relative paths; not a challenge to the assessment), resolved by SR-003.
- Evidence / notes: the two download owners keep their ownership; the helper is used by both, and the view by three places.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (`size` is required; each caller decides; the design rejected an optional default).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. `AudioPlayer`'s raw `resourceError` text; the scratch `MSP-572` case. `workspaces.ts` and `run-file-changes.ts` now stat once instead of `existsSync` + `statSync().isFile()`.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`DownloadProgress` is `{ loaded, total }`).
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest: `context-files.ts` 251 (+1), `useAuthorizedObjectUrl.ts` 203 (+19), `MobileFiles.vue` 172 (+1). Largest delta: `AudioPlayer.vue` +73 (now 114). The probe file `mobile-file-open-cases.mjs` is 741 lines (+181; a test module of cases). IR-002: `MobileFiles.vue` 184 (+12), `MobileFileViewer.vue` 124 (+14), `useMobileNodeFile.ts` 99 (+7).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Lightweight Implementation Self-Review (direct route)

- Loading and progress are written only for the current load token, or serial on the phone node-file route. A replaced load cannot overwrite the new one's state, and unmount clears both.
- The desktop direct-URL path never sets `loading` (unit "desktop no-loading"; MSP-90).
- A failed read inside the progress loop rejects, and both callers already turn that into their failure state (player failure + Retry, or the node-file refusal "could not be opened").
- `progress` updates once per chunk (~150 per 10 MB): cheap reactive writes, no throttle needed.
- No string is hard-coded outside localization except the phone viewer's existing English strings, which were there before. The literals audit passes.
- `MediaLoadingState`'s explanatory comment sits inside its root. A comment before the root made it a fragment and lost `role`; this was caught by its spec and fixed.

## Environment Or Dependency Notes

- macOS, Node v22.23.1, Chrome 158 (headless), ffmpeg 8.0.1 (`/opt/homebrew/bin/ffmpeg`). The probes need ffmpeg on PATH or `FFMPEG`.
- `fseventsd` was at 157% CPU throughout; FSEvents events took 0.95 s to over 10 s (IMP-05). This explains the agent-package folder watcher failures.

## Checks Run

Evidence: `tickets/in-progress/chat-media-path-playback/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Scratch `MSP-572` with `SD572_THROTTLE_KBPS=8000` on the base | `315d6d94cf` (base) | macOS, Chrome, loopback, 8 Mbit/s | phone workspace + node-file routes | AC-001 (repro) | Fail (expected: reproduces) | `IMP-01-phone-repro-base/` | bigVideo "Video URL is not available." 178 → 9817 ms |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | tree = `02320583a5`+`d165d3143a` | macOS, Node 22 | server src + tests | — | Pass | `IMP-02-server-typecheck.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)` |
| IMP-03 | `pnpm -C autobyteus-web typecheck` (twice); `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | tree = commits | macOS, Node 22 | web app, tests, cross-package; guards | QR | Pass | `IMP-03-web-typecheck-and-guards.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`; `Passed with zero unresolved findings.` |
| IMP-04 | `NUXT_TEST=true pnpm exec vitest run` (whole web) | tree = `d165d3143a` before the unit change | macOS, Node 22 | whole web suite | AC-001, AC-006 (unit) | Pass for the changed code; 1 unrelated | `IMP-04-web-unit-full.log` | `1 failed \| 5915 passed`: ServerSettingsBasicsPanel "GitHub" (base; FU-002) |
| IMP-05 | `pnpm -C autobyteus-server-ts test:unit`; reruns after the commits; FSEvents latency | tree, then `d165d3143a` | macOS, Node 22, fseventsd 157% | whole server unit suite; file routes; node files | AC-005 (gate/rules unchanged) | Pass for the changed code; watcher = FSEvents | `IMP-05-server-unit-full.log` | tracked-imports `2 passed` after commit; watcher fails alone 19/22 with fs.watch 950 ms / >10 s |
| IMP-06 | Targeted web suites after the commits (viewers, phone views, composables, download, fileExplorer, remoteAccess utils) | `d165d3143a` | macOS, Node 22 | everything changed on the web | AC-001, AC-006 | Pass | `IMP-06-web-targeted-after-commit.log` | `Test Files  34 passed (34)`, `Tests  234 passed (234)` |
| IMP-07 | IMP-01 again after the fix | tree before commits (1024 units) | as IMP-01 | as IMP-01 | AC-001, AC-002 | Pass | `IMP-07-phone-repro-after-fix/` | "Loading video…" then "0.1 of 9.2 MB" … "9.2 of 9.2 MB", plays at 9719 ms |
| IMP-08 | `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-89,MSP-90` | tree = commits | macOS, Chrome 158, ffmpeg, loopback; big videos at 8 Mbit/s | DS-001, DS-002, desktop window | AC-001…AC-006 | Pass | `IMP-08-media-probe-msp-89-90/` (README, JSON, 15 PNGs) | `MSP-89 Pass`, `MSP-90 Pass`, `unknownBrowserErrors 0`; `keyInHeader 9`, `keyInUrl []`; `relativeLink.fileControl false` |
| IMP-09 | `--cases=MSP-16,MSP-28,MSP-29,MSP-30,MSP-31,MSP-37` | tree = commits | as IMP-08 | existing phone/desktop file opening | REQ-003 | Pass | `IMP-09-file-open-regression/` | all six Pass |
| IMP-10 | IR-002: `pnpm -C autobyteus-web typecheck`; the three guards | tree = `f2894c65e1` | macOS, Node 22 | web app incl. D-7 | QR | Pass | `IMP-10-web-typecheck-and-guards-d7.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`; guards Passed |
| IMP-11 | IR-002: whole web suite | tree = `f2894c65e1` | macOS, Node 22 | whole web suite incl. 8 new D-7 cases | AC-006 (unit) | Pass for the changed code; 1 base failure (FU-002) | `IMP-11-web-unit-full-d7.log` | `1 failed \| 5923 passed`: ServerSettingsBasicsPanel only |
| IMP-12 | IR-002: `build:mobile-web`; `--cases=MSP-89,MSP-91` | tree = `f2894c65e1` | macOS, Chrome 158, ffmpeg, loopback | D-7 on the node-file route; players' Retry | AC-006, REQ-005 (and AC-001…AC-005 again) | Pass | `IMP-12-probe-d7-msp-89-91/` | outsideMissing `retry: true` → `after.media.readyState 4`; outsideFolder `retry: false`; MSP-91 `outside.state.retry: true` |
| IMP-13 | IR-002: `--cases=MSP-16,MSP-28,MSP-29,MSP-30` | tree = `f2894c65e1` | as IMP-12 | phone file opening (MobileFiles changed) | REQ-003 | Pass | `IMP-13-phone-file-open-regression-d7/` | all four Pass |

- Not run, and why:
  - Whole `test:e2e:mobile-shell` (all cases), server `test:integration`, `pnpm test:e2e`: left to API/E2E (heavy; one heavy run at a time). The file-opening subset ran (IMP-09).
  - A real Android/iOS device or app: API/E2E, if they choose. The phone bundle ran in headless Chrome at 390×844.
  - The founder's flow (a Product Video Producer under a Project Task Manager): MSP-89 covers a same-node delegated run's conversation, not a Project task.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - the phone file viewer for video/audio (workspace route, inside the player) and for node files (video, audio, image, PDF);
  - the desktop Files panel players (unchanged path; the loading view appears only on the phone).
- Approved UI/UX, interaction, requirement, or design references: D-2, D-3, D-4, D-6; REQ-001, REQ-005.
- Existing design system, shared components, and adjacent product surfaces reviewed: `VideoPlayer`'s failure + Retry, which `AudioPlayer` now copies; `MobileFileViewer`'s "Opening…" placement; the gray/slate text colors of both.
- Testing guideline or development / preview instructions and rendered surface used: the production phone bundle served by a built node, headless Chrome 390×844 (IMP-07, IMP-08); the desktop window on `nuxt dev` (IMP-08 MSP-90).
- States, layouts, viewports, and interactions inspected:
  - loading with progress, inside the player on black (`MSP-89-insideBig-loading.png`: "Loading video…", "2.9 of 9.7 MB", centered);
  - node-file loading on white (`MSP-89-outsideBig-loading.png`);
  - playing video and audio; failure + Retry (`MSP-89-missing.png`);
  - desktop players (`MSP-90-*.png`); Back to the conversation after each.
- IR-002 states inspected (IMP-12 screenshots): outside missing video, plain red message and a dark 44 px Retry under it (`MSP-89-outsideMissing.png`); after Retry, the video plays; a folder, message only (`MSP-89-outsideFolder.png`); MSP-91's broken outside download with Retry (`MSP-91-outside-failed.png`). The Retry is centered under the message at 390 px.
- Visual or interaction issues found and corrected: the units (1024 → decimal, see Known Risks); the `role` lost to a fragment root (fixed before the first render).
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-07, IMP-08.
  - zh-CN loading text was not rendered on a device (unit-covered keys only).
  - Retry was not clicked in the probe (the unit specs cover Retry → `refresh`).

## Downstream Coverage Hints / Suggested Scenarios

- Run MSP-89/90 in the whole `test:e2e:mobile-shell` (they run after MSP-30 and MSP-37 respectively).
- A real phone (Android app or browser) on Wi-Fi with a large synthetic video: the loading text rises and the video then plays.
- IR-002: rerun API-03 (MSP-91; its outside step now has Retry) and the API/E2E rounds marked Next Round (server `test:integration`, `pnpm test:e2e`). Optionally tap the outside Retry in MSP-91 itself, not only tap the link again. MSP-89 covers Retry after a not-found file.
- A media file sent as an Org / Team / agent-collaboration reference: shows "Loading video… x MB" without a total (size `null` on those routes), then plays.
- zh-CN: "正在加载视频…" and "x / y MB".

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: as listed above.
