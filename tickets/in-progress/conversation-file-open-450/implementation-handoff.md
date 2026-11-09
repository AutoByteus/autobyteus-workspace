# Implementation Handoff — autobyteus-450

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/tickets/in-progress/conversation-file-open-450/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450`, branch `codex/conversation-file-open-450`, base `origin/personal` `6884309283`.
Commits: `edd84787f7` (DS-002, reload on explicit open), `e02a230940` (DS-001, phone attachments), `e470edf165` (DS-003, Android `KeepPage`), `486ba3c395` (a spec that asserted the replaced behavior), `5f06b08ce9` (IR-002: the composer's draft attachments, DEC-006); the ticket documents and evidence follow in one docs commit (named in the handoff message).

**State (IR-002): SR-003 is implemented and passes the reproduction.** DI-001 (the composer's draft attachments) was taken in by the Solution Designer (DEC-005) and is fixed; DEC-006 (a notice for a path the phone cannot open) is implemented. The package goes to API/E2E.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Medium` / `Low`, direct route; this round ends with the Design Impact rule (Solution Designer).
- Requirements doc: `requirements-doc.md` (Approved, SR-001).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md`.
- Design spec: `design-spec.md` (SR-003, `Ready`); `handoff-sr-003.md` (the answer to DI-001).
- Supplemental task artifacts: `evidence/repro/file-open-repro.mjs` (unchanged); `follow-ups.md` (FU-001, unchanged).
- Design review report / architecture review revision record: `N/A — not applicable` (not selected).
- Triggering rework report: N/A (initial round).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001: SR-002; IR-002: SR-003)
- Related solution revision IDs: `SR-002`, `SR-003`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: DI-001 (raised in IR-001, decided in SR-003: DEC-005, DEC-006)

What the change does:

1. **DS-002, an explicit open reads again** (`stores/fileExplorerContentActions.ts`, `stores/fileExplorerState.ts`). `_openFileWithMode` of an already-open file calls `_reloadOpenFile`:
   - text is read again the way it was first loaded (`invalidateFileContent`: `content = null` + the `network-only` workspace read; or the desktop app's local read for an embedded window's absolute path), and `editorDraft` is never touched;
   - every other type bumps the new `OpenFileState.contentRevision`.
   
   Switching tabs (`setActiveFile`) reads nothing. `FileViewer` passes `contentRevision` to the media viewers (Image, PDF, Audio, Video, Excel), which pass it to `useAuthorizedObjectUrl(source, { revision })`. A first load is as before (on the desktop, the URL itself). A reload reads the bytes through `fetch` with `cache: 'no-store'` into an object URL. Reason: Chrome shows an image it already has for a URL the page saw before (IMP-02: no second request, old image), and the Electron `local-file:` scheme refuses a query string, so a cache-busting parameter was not an option.
2. **DS-001, phone attachments**:
   - `UserMessage` renders thumbnails through `MessageAttachmentThumbnail` (`useAuthorizedObjectUrl`; a refused load falls back to the name, as a broken image did).
   - On the phone (`isMobileRemoteAccessRuntime()`, taken in setup) a tap goes to `useMobileAttachmentOpening.open`:
     - an uploaded file → `mobileNavigation.openContextFile({ locator, name })` (query `contextFile`, `contextFileName`: the node URL path and the sent name, no credential);
     - an absolute path → `openMobileFilePath` (extracted from `useEventMonitorFilePreview`, now shared by file links and attachments);
     - another site's URL → as before (`window.open`, opens outside).
   - `MobileFiles` renders the attached-file entry through the generalized `useMobileNodeFile(source)` (`{ kind: 'path' }` | `{ kind: 'contextFile', locator, name }`). The type and the viewer title come from the sent name. The desktop keeps today's attachment opening.
3. **DS-003, Android** (`TrustedNavigationPolicy.kt`, `AutoByteusWebView.kt`): a main-frame same-origin `/rest/…` or `/graphql` navigation is `KeepPage`: not loaded, no screen. This applies in `shouldOverrideUrlLoading` and in `loadTrusted`. Subframes, other paths and the phone page's own load errors are unchanged.

## Design Impact DI-001 (resolved in SR-003, implemented in IR-002)

- Decision: taken in (DEC-005). Implemented in `5f06b08ce9`:
  - the composer's thumbnails use `MessageAttachmentThumbnail` (now without hard-coded classes; each caller gives them);
  - `FullScreenImageModal` gets `useAuthorizedObjectUrl(selectedImageUrl)`, so a draft image's full-screen view loads with the key;
  - on the phone any other draft opens through `useMobileAttachmentOpening` (`openContextFile` with the `/rest/drafts/…` locator).
- `ContextFilePathInputArea.vue`: 459 → 471 non-empty lines.
- Reproduction after IR-002 (IMP-11): `thumbnailRequests: []`; no node-file image is loaded without the key.
- DEC-006 (revises IR-001 decision 3): a path attachment the phone cannot open here shows `file_available_on_host` as an info toast (`failed`: `file_preview_failed`, error).

The IR-001 analysis as raised:

- **What:** the phone's composer (`components/agentInput/ContextFilePathInputArea.vue`, through `useContextAttachmentComposer`) has the same three failures for a **draft** attachment, before the message is sent:
  - its thumbnail is a plain `<img src>` → 401 (IMP-08: `thumbnailRequests` still lists one `/rest/drafts/…/attach-450.png`, `status 401, type image`);
  - a tap on an image opens `FullScreenImageModal` with that plain URL → a broken image;
  - a tap on any other file calls `openAttachment` → `window.open(node URL)` → the Android pairing screen (with DS-003's `KeepPage`: nothing happens).
- **Why it is not patched here:** the design's Change Scope and file map name `UserMessage` only, and REQ-001/REQ-002 speak of "a conversation message". This is the same capability on a parallel path (Principle 1), but adding a component outside the approved scope is the Solution Designer's call. AC-001 as written ("no 401 for it in the network log") cannot pass while the composer still loads the draft preview without the key.
- **Evidence:** `evidence/IMP-08-repro-after-fix/repro-summary.json` → `bug1.thumbnailRequests` (one draft 401, before sending); code read of `ContextFilePathInputArea.vue:81-87, 297-308`.
- **Proposed shape, if it is taken into scope:**
  - the composer thumbnail uses the same `MessageAttachmentThumbnail`;
  - the image modal is fed the authorized object URL (or, on the phone, the tap goes to the viewer);
  - on the phone a tap goes to `useMobileAttachmentOpening` (drafts are `uploaded` attachments with a `/rest/drafts/…` locator, which `openContextFile` already handles).
  
  About three files (`ContextFilePathInputArea.vue`, 459 non-empty lines, stays under 500; possibly `FullScreenImageModal`), plus tests. Classification unchanged (Medium / Low).
- **If it is not taken:** a follow-up, and AC-001's network-log clause reworded to "no 401 for the sent message's thumbnail".

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence: about 14 production files in web and Android, inside existing owners (two new composables and one new small component, all named or implied by the design); no server, contract, persistence or key-rule change; the Android change only stops navigations that fail today.
- Selected route: `Direct API/E2E` (after DI-001 was decided in SR-003).
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None` open (DI-001 resolved). The design's own escalation triggers did not fire: no legitimate main-frame `/rest/` load was found; a reload keeps drafts (test); media reloads without a credential in the URL.

## Lightweight Implementation Self-Review

- Correctness: a reload uses the same loader the first open used (workspace read, Electron local read, URL for media); `editorDraft` is never written by a reload, and the tabs already show a draft over a loading state (`FileExplorerTabs.vue:289-294`). Tab switching does not reload (QR-002: one read per explicit open).
- Phone: no credential in any URL or query (QR-001); `contextFile` holds the node URL path only. The navigation is taken in setup (TESTING.md `inject` rule).
- Android: stricter, never weaker. Only main-frame same-origin node routes change, from "allowed, then 401 → pairing screen" to "kept".
- Dead code in touched files: `useEventMonitorFilePreview` lost its private `openMobilePath` body and its now-unused remote-runs store; no other unused code found.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Phone: thumbnail with the key (sent and draft) | `UserMessage` / `ContextFilePathInputArea` → `MessageAttachmentThumbnail` → `useAuthorizedObjectUrl`; the composer's full-screen view → `useAuthorizedObjectUrl` | Fixed: `chipKind: thumbnail`, `thumbnailRequests: []` (IMP-11; `name-chip` and three 401s in IMP-01); composer unit cases (IMP-12) |
| BEH-002 | Phone: tap → phone viewer (a draft image: the composer's full-screen view), Back returns, no navigation; a path it cannot open: the notice | `useMobileAttachmentOpening` → `openContextFile` → `MobileFiles` → `useMobileNodeFile` (`contextFile`) → `MobileFileViewer`; DEC-006 toast; Android `KeepPage` | Fixed: `viewerOpen: 1`, `newWindow: null`, the attached file fetched 200 (IMP-11); draft and notice unit cases (IMP-12); policy tests (IMP-06) |
| BEH-004 | Desktop: re-open shows current content | `_openFileWithMode` → `_reloadOpenFile` | Fixed: `D2_newLinkAfterRewrite: VERSION-TWO` (IMP-08; ONE in IMP-01); store tests incl. the draft kept (IMP-05) |
| BEH-005 | Phone: same | `MobileFiles` → `openFileReadOnly` → the same store rule | Fixed: `P2_newLinkAfterRewrite: VERSION-THREE` (IMP-08; TWO in IMP-01) |
| BEH-003, 006, 007 | Preserved | Desktop attachment opening unchanged; node files (436) through the generalized loader; the page's own load errors unchanged | Suites (IMP-07, IMP-09) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (SR-003's scope, which took in the composer's drafts).

## Key Files Or Areas

- DS-002: `autobyteus-web/stores/fileExplorerState.ts`, `stores/fileExplorerContentActions.ts`, `components/fileExplorer/FileViewer.vue`, `components/fileExplorer/viewers/{ImageViewer,PdfViewer,AudioPlayer,VideoPlayer,ExcelViewer}.vue`, `composables/useAuthorizedObjectUrl.ts`, `components/mobile/views/MobileFileViewer.vue`.
- DS-001: `components/conversation/UserMessage.vue`, new `components/conversation/MessageAttachmentThumbnail.vue`, new `composables/mobile/useMobileAttachmentOpening.ts`, new `composables/mobile/mobileFileOpening.ts`, `composables/useEventMonitorFilePreview.ts`, `composables/mobile/useMobileNavigation.ts`, `composables/mobile/useMobileNodeFile.ts`, `components/mobile/views/MobileFiles.vue`.
- DS-003: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/{TrustedNavigationPolicy,AutoByteusWebView}.kt`.
- IR-002: `components/agentInput/ContextFilePathInputArea.vue`, `components/conversation/MessageAttachmentThumbnail.vue`, `components/conversation/UserMessage.vue` (classes), `composables/mobile/useMobileAttachmentOpening.ts`; specs `components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` (phone cases), `composables/mobile/__tests__/useMobileAttachmentOpening.spec.ts` (notices).
- Tests (new): `stores/__tests__/fileExplorerReopen.spec.ts`, `components/fileExplorer/__tests__/FileViewer.reload.spec.ts`, `composables/__tests__/useAuthorizedObjectUrl.reload.spec.ts`, `composables/mobile/__tests__/useMobileAttachmentOpening.spec.ts`, `components/conversation/__tests__/UserMessageMobileAttachments.spec.ts`. Tests (updated): `useMobileNavigation.spec.ts`, `useMobileNodeFile.spec.ts` (source union, attached-file cases), `TrustedNavigationPolicyTest.kt` (main-frame `/rest/` and `/graphql` are `KeepPage` now), and `contentRevision: 0` in five `OpenFileState` fixtures.

### Decisions made inside the design (for review)

- **The media reload goes through `fetch`.** The design says "media viewers reload when `contentRevision` changes". Remounting with the same URL is not enough in Chrome (IMP-02). The reload therefore reads the bytes with `no-store` into an object URL, on the desktop too. Cost: a reloaded video on the desktop is read whole into memory, as the phone already does for every node file.
- **`contextFileName`** in the route besides `contextFile`, so the viewer's title and the file type come from the name the file was sent with, not the stored name `ctx_<hash>__<name>`.
- ~~A path attachment the phone cannot open here opens nothing~~: revised in SR-003 (DEC-006), it shows the file links' notice as a toast.
- **`FileViewer.file.contentRevision` is optional**: `FileViewer` also shows files that are not in the file explorer (artifact and reference viewers), which never reload.

## Important Assumptions

- ASM-001 (the Android screen comes from the main-frame 401) remains for the emulator (API/E2E).

## Known Risks

- With only the new page and an old APK, a draft or other non-viewer tap that still navigates shows the pairing screen until the APK update (design note).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix.
- Reviewed root-cause classification: Missing Invariant; Boundary Or Ownership Issue.
- Reviewed refactor decision: `No` beyond the named generalization and extraction (both done).
- Implementation matched the reviewed assessment: `Yes`; the third path of the same capability (DI-001) was taken into the design in SR-003.
- If challenged, routed as `Design Impact`: `Yes` (DI-001, IR-001; resolved in SR-003).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The main-frame `/rest/` and `/graphql` allowance is gone; on the phone, `UserMessage` no longer falls back to `window.open` for node attachments.
- Dead code in the touched files and modules removed: `Yes` (see self-review).
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`. `contentRevision` is required on `OpenFileState` and optional only on `FileViewer`'s display prop; the node-file source is an explicit union.
- Changed source files within size guardrails: `Yes`. Non-empty lines: `fileExplorerContentActions.ts` 313 → 340; `useEventMonitorFilePreview.ts` 150 → 132; the others grow by under 20; the largest production delta is +42 (the new `mobileFileOpening.ts`).

## Persisted Data Transition Check

- `Not Affected`. Followed: `Yes`.

## Environment Or Dependency Notes

- macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2; Android unit tests need `ANDROID_HOME=$HOME/Library/Android/sdk` (no `local.properties` in this worktree).
- Harness note: after vitest runs, `node autobyteus-web/scripts/typecheck.mjs` alone reported 5 extra errors in untouched files (`layouts/__tests__/default-drawer.spec.ts`, `test-support/*`), because the generated `.nuxt` types were stale. `pnpm -C autobyteus-web typecheck`, which runs `nuxt prepare` first, passes at the baseline (IMP-04). Use the package script.

## Checks Run

Evidence paths are relative to the ticket folder's `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node evidence/repro/file-open-repro.mjs --output-dir=…` (before any change) | `6884309283` | as above, headless Chrome, `nuxt dev` desktop window | desktop links, phone links, phone attachment | BEH-001, 002, 004, 005 (fail expected) | Pass (reproduced) | `IMP-01-repro-baseline/` (`repro-summary.json`, `repro-stdout.log`, screenshots) | `"D2_newLinkAfterRewrite":"VERSION-ONE-1111"`, `"P2_newLinkAfterRewrite":"VERSION-TWO-2222"`, `"chipKind":"name-chip"`, `"newWindow":"/rest/runs/…"` |
| IMP-02 | `node evidence/IMP-02-chrome-image-reload-check/check.mjs` | — (browser premise check) | headless Chrome | Chrome's handling of a same-URL image vs `fetch` `no-store` | DS-002 premise | Pass | `IMP-02-chrome-image-reload-check/` (`check.mjs`, `result.log`) | `"afterRewriteRemountSameUrl":10`, `"reloadThroughFetchNoStore":40` |
| IMP-03 | `pnpm -C autobyteus-web test:nuxt --run composables/mobile/__tests__ components/conversation/__tests__ composables/__tests__/useEventMonitorFilePreview*.spec.ts components/mobile/views/__tests__` | `486ba3c395` | as above | phone attachment opener, navigation, node-file loader, `UserMessage`, the event monitor's path open, phone views | REQ-001, REQ-002 | Pass | `IMP-03-web-phone-attachment-specs.log` | `Test Files  20 passed (20)`, `Tests  180 passed (180)` |
| IMP-04 | `pnpm -C autobyteus-web typecheck` | `e470edf165` (working tree identical) | as above | web app, Electron main, build scripts, cross-package tests | — | Pass | `IMP-04-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/fileExplorerReopen.spec.ts stores/__tests__/fileExplorerStore.spec.ts components/fileExplorer composables/__tests__/useAuthorizedObjectUrl*.spec.ts` | `486ba3c395` | as above | the store reload rule and drafts, `FileViewer`, the media viewers, the reload through `fetch` | REQ-003 / AC-003 (unit), QR-002 | Pass | `IMP-05-web-reload-specs.log` | `Test Files  18 passed (18)`, `Tests  105 passed (105)` |
| IMP-06 | `ANDROID_HOME=… ./gradlew --no-daemon :app:testDebugUnitTest` | `e470edf165` | as above, JDK of the Gradle wrapper | the whole Android unit suite incl. `TrustedNavigationPolicyTest` | REQ-004 / AC-005 | Pass | `IMP-06-android-unit.log` | `tests=94 … failures=0 errors=0`; `keepsThePageForAMainFrameNodeRoute` |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt --run` (full) | `e470edf165`; the one updated spec rerun at `486ba3c395` | as above | every web spec | REQ-005 | Fail → fixed: `RightSideTabs.workspaceTarget.spec.ts` asserted one read for two opens of the same link (the replaced behavior); updated in `486ba3c395`, rerun passes | `IMP-07-web-unit-full.excerpt.log`, `IMP-07-web-unit-full.log.gz` | `Test Files  1 failed \| 734 passed (735)`; rerun `Tests  4 passed (4)` |
| IMP-08 | `node evidence/repro/file-open-repro.mjs --output-dir=…` (after the fix) | `e470edf165` | as above, builds IMP-09 | desktop links, phone links, phone attachment | AC-001 (message thumbnail), AC-002 (PNG), AC-003 (link), AC-004 (link) | Pass, except the composer draft 401 (DI-001; fixed in IR-002, IMP-11) | `IMP-08-repro-after-fix/` (`repro-summary.json`, `repro-stdout.log`, screenshots) | `"D2_newLinkAfterRewrite":"VERSION-TWO-2222"`, `"P2_newLinkAfterRewrite":"VERSION-THREE-3333"`, `"chipKind":"thumbnail"`, `"viewerOpen":1`, `"newWindow":null`; the draft `status 401` |
| IMP-09 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `e470edf165` | as above | server `dist`, the served phone bundle | — | Pass | `IMP-09-builds.log` | `served phone bundle files with contextFileName: 1` |
| IMP-10 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `e470edf165` | as above | web boundary and localization rules | — | Pass | `IMP-10-web-guards.log` | `Passed.` ×2, `Passed with zero unresolved findings.` |
| IMP-11 | `node evidence/repro/file-open-repro.mjs --output-dir=…` (after IR-002) | `5f06b08ce9` | as above, phone bundle rebuilt | desktop links, phone links, sent and draft attachment loads | AC-001 (both chips), AC-002 (PNG), AC-003, AC-004 (links) | Pass | `IMP-11-repro-after-ir2/` (`README.md`, `repro-summary.json`, `repro-stdout.log`, screenshots) | `"thumbnailRequests":[]`, `"chipKind":"thumbnail"`, `"viewerOpen":1`, `"newWindow":null`, `VERSION-TWO` / `VERSION-THREE` |
| IMP-12 | `pnpm -C autobyteus-web test:nuxt --run components/agentInput/__tests__/ContextFilePathInputArea.spec.ts composables/mobile/__tests__/useMobileAttachmentOpening.spec.ts components/conversation/__tests__` | `5f06b08ce9` | as above | the composer's draft thumbnails, full-screen view and tap on the phone; DEC-006 notices; `UserMessage` | REQ-001, REQ-002 (drafts), DEC-006 | Pass | `IMP-12-ir2-specs.log` | the "draft attachments on the phone" and notice lines; totals |
| IMP-13 | full web suite, `pnpm -C autobyteus-web typecheck`, the three guards, `build:mobile-web` | `5f06b08ce9` | as above | every web spec; type and boundary rules; the phone bundle | REQ-005 | Pass | `IMP-13-ir2-regression.log`, `IMP-13-web-unit-full.log.gz` | `Test Files  735 passed (735)`; `production errors: 0 … (baseline 96 in 41 files)`; `Passed` ×3 |

- Not run, and why: the design's step-4 probes (phone-bundle MSP cases with PNG, PDF, text and workspace-path attachments and an image rewrite; the desktop-window case with an unsaved edit; the emulator for AC-002/AC-005 and MSP-13) are API/E2E's. No server change, so no server suite. No build input changed: no fresh-start build.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the phone conversation's attachment thumbnails and the Files screen's attached-file viewer; the desktop and phone file viewers on a re-open (no visual change).
- References: requirements § UI ("existing elements only; thumbnails as on the desktop"); the existing `MobileFileViewer` and thumbnail button styles (unchanged classes).
- Surface used: the phone bundle served by an isolated node (IMP-08), 390×844, plus the `nuxt dev` desktop window for the link cases.
- Inspected:
  - `phone-bug1-chip.png`: the attached PNG shows as the 48 px thumbnail under "Context files", like the desktop.
  - `phone-bug1-after-tap.png`: the full-screen viewer titled `attach-450.png` with ← and the zoom control. The test image is 1×1 px, so the viewer shows it at 100% as a dot.
  - `desktop-D2.png` / `phone-P2.png`: the rewritten text after the second open.
- Issues found and corrected: the thumbnail's error watcher missed an error already present at mount (made `immediate`).
- Not inspected: PDF/text attachment taps and Back on the phone in the browser (the reproduction taps the PNG only; unit-covered; left to the API/E2E probe); the emulator.

## Downstream Coverage Hints / Suggested Scenarios

- The composer's draft attachments on the phone: thumbnail, a draft image's full-screen view, a draft PDF/text tap into the viewer (no 401, no navigation).
- A path attachment of a run on another node: the "available only on the host workspace" toast (DEC-006).
- The design's MSP cases: PNG, PDF, text and a workspace-path attachment, each opening in the viewer with Back to the conversation; an image in the workspace rewritten and opened again (AC-004 image); no main-frame `/rest/` request in the network log.
- The desktop window: link, the same link again, Files tab, with an unsaved edit in an open tab kept (AC-003).
- Emulator: the tap shows the viewer, never the pairing screen; MSP-13 (rejected credential) still lands on pairing.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All of the above.
