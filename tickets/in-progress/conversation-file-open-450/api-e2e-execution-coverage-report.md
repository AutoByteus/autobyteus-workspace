# API/E2E Execution Coverage Report — autobyteus-450

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 1)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-002 (Medium / Low, direct API/E2E)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **MSP-31's unsaved-edit check.** A link opens the tab read-only, in preview (product behavior: `accessIntent.readOnly`). So the edit is checked after a link open *and* a Files-tab open (editable): the preview after the link shows the re-read VERSION-THREE, and the editor still holds the unsaved edit.
  - **API-06's old-page combinations** tap one attachment each. After the old tap, Back leaves the run screen (b) or the app shows its own screen (c), so the harness relaunches and the PNG chip is not on screen; one tap proves each combination.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/tickets/in-progress/conversation-file-open-450/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | source `5f06b08ce9` (HEAD `33cea361ce` adds ticket documents) + this round's test files | macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2 | Chrome headless; server `dist` of `e470edf165` (no server change since); phone bundle of `5f06b08ce9` (`contextFileName` in 1 bundle file) | Probe-owned nodes alpha, beta, gamma, delta, epsilon and zeta (owner credential); scripted AGY `linked_skills`; phones 390×844 (epsilon's at `http://192.168.77.40:<port>`); desktop window 1440×1000 on `nuxt dev` against alpha |
| ENV-2 | same, and base `6884309283` for the old page and the old APK | Android emulator `emulator-5584` (`autobyteus277_api35`, read-only instance started for this run; Android 15) | new APK: `./gradlew :app:assembleDebug` in this worktree; old APK and old page: a temporary worktree at `6884309283` (frozen install, server build, `build:mobile-web`, `assembleDebug`; removed afterwards) | The node serves its worktree's phone bundle at `/mobile`; emulator reaches it at `10.0.2.2` through a recording TCP proxy; the attachments are sent by a second, headless-Chrome phone on the same node |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001…004 (unit) | web specs: opener, loader, store reload, viewers, composer drafts, notices | Reused IMP-03, IMP-05, IMP-12 | — | Pass | (rows) | `Tests  180 passed (180)`; `Tests  105 passed (105)`; IMP-12 draft and notice lines | IMP-12 on `5f06b08ce9`; IMP-03/05 on `486ba3c395`, the IR-002 files they exercise are covered again by IMP-12/13 |
| API-02 | REQ-005 | full web suite, typecheck, guards | Reused IMP-13 | — | Pass | (row) | `Test Files  735 passed (735)`; `production errors: 0` | `5f06b08ce9` |
| API-03 | AC-005 (unit) | Android unit suite | Reused IMP-06 | — | Pass | (row) | `tests=94 … failures=0`; `keepsThePageForAMainFrameNodeRoute` | Android unchanged since `e470edf165` |
| API-04 | DS-002 premise | Chrome, same-URL image vs `fetch` `no-store` | Reused IMP-02 | — | Pass | (row) | `"afterRewriteRemountSameUrl":10`, `"reloadThroughFetchNoStore":40` | browser behavior |
| MSP-28 | AC-001, AC-002 | phone bundle on epsilon: drafts (PNG, PDF, text), sent attachments, a workspace-path attachment | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-05-mobile-shell-probe` (full probe) | ENV-1 | Pass | `API-05-mobile-shell-probe/mobile-shell-probe.json` (`cases.MSP-28`), `MSP-28-*.png`, `msp-28-files/` (the test files) | `"draftThumbnail": {"blob": true, "width": 4}`, `"draftFullScreen": {"blob": true, "width": 4}`, `"sentThumbnail": {"blob": true, "width": 4}`; each of `draftPdf`, `draftText`, `sentPng`, `sentPdf`, `sentText`, `workspacePath`: `"ready": true, "backToConversation": true` (PDF `"pdfCanvases": 1`; PNG `"image": {"blob": true, "width": 4, "height": 3}`); `"draftsKeptAfterViewer": true`; `"refused": []`, `"mainFrameNodeNavigations": []`, `"newWindows": []` | Every attached-file read is a `fetch` with the key (`attachedFileReads`, all 200) |
| MSP-29 | AC-002 (DEC-006) | phone bundle: the run on zeta (another node), a message with a path on zeta | full probe | ENV-1 | Pass | `cases.MSP-29`, `MSP-29-remote-path-notice.png` | `"notice": true, "viewerOpened": false, "stillOnConversation": true`, no navigation, no refusal | The toast reads "This file is available only on the host workspace." |
| MSP-30 | AC-004 | phone bundle: workspace `post.md` and `chart.png` (2×1 → 3×1) rewritten; new and old links | full probe | ENV-1 | Pass | `cases.MSP-30`, `MSP-30-*.png` | `first`: `VERSION-ONE-1111`, image `width 2`; `newLinks` and `oldLinks`: `VERSION-TWO-2222`, image `"width": 3` | The image reload is the `no-store` read (`blob:` source) |
| MSP-31 | AC-003 | desktop window (`nuxt dev`, alpha): link, rewrite, new link, same old link, Files tab; an unsaved edit | full probe | ENV-1 | Pass | `cases.MSP-31`, `MSP-31-desktop-links.png`, `…-files-tab.png`, `…-unsaved-edit.png` | `"first": "VERSION-ONE-1111"`, `"newLink"`, `"sameOldLink"`, `"filesTab"`: `"VERSION-TWO-2222"`; `"unsavedEdit": {"typed": true, "previewAfterLink": "VERSION-THREE-3333", "keptAfterRewriteAndOpen": true}` | The edit toggle is clicked at its on-screen position (`editToggles`: one, 28×28, in view): a locator click waited without acting |
| API-05 | AC-006, regression | the full phone probe | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-05-mobile-shell-probe` | ENV-1 | Pass (cases 31/31); probe verdict `Fail` on 52 pre-existing lines | `API-05-mobile-shell-probe/mobile-shell-probe.json` | `"summary"`: MSP-01…31 `"Pass"`; MSP-13 `"onPairing": 1`, revoked → `"pairing": true`; MSP-16/17 (file links, node files) Pass; `"cleanup": {"frontendExited": true, "serversLeft": 0, "rootRemoved": true}` | The 52 unknown lines are all `phone console: … 401 (Unauthorized)` from the probe's main phone after MSP-13 revokes it: autobyteus-446 FU-003 (a revoked phone's run streams retry for ever), untouched by this ticket; none from this ticket's phones |
| API-06 | AC-002, AC-005 (real app), ASM-001, BEH-007 | Android emulator, three combinations | `node evidence/API-06-emulator/emulator-attachment-harness.mjs --worktree=<new or base> --apk=<new or old> --label=… --serial=emulator-5584 --output-dir=…` (`--revoke` for (a)) | ENV-2 | Pass | `API-06-emulator/a-new-page-new-apk/`, `b-old-page-new-apk/`, `c-old-page-old-apk/` (each `*-summary.json`, screenshots, UI text, logcat); `a-0-first-classifier/` (first try, same outcome, coarser classifier) | (a) `"name":"text" … "viewer":true … "backToConversation":true`, `"name":"png" … "viewer":true … "backToConversation":true`; `a-new-page-new-apk-tap-text.png` shows `TEXT-EMU-450: the attached notes.`; `"revocation": {"pairingShown": true, "screen": [… "Connect this phone" …]}`. (b) `"name":"text" … "appRejectionScreen":false … "conversationShown":true`. (c) `"appRejectionScreen":true`; `c-old-page-old-apk-tap-text.txt`: `Pair this phone again` / `The node rejected the current mobile credential.` | (a) proves AC-002 in the app and BEH-007 (a real rejection lands on pairing). (b) the old page's `window.open` to `/rest/…` is kept by the new APK: no screen (AC-005). (c) the user's screen comes from that main-frame 401 (ASM-001 confirmed) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-28 (draft and sent PNG thumbnails and the draft's full-screen view loaded with the key; no 401) | Proven | — |
| AC-002 | Yes | MSP-28 (PNG, PDF, text, drafts and sent, workspace path: each in the viewer, Back returns, no navigation, no new window); MSP-29 (another node's path: the notice); API-06 (a) (the real app: viewer, never the pairing screen) | Proven | — |
| AC-003 | Yes | MSP-31 (new link, same link, Files tab show TWO; unsaved edit kept); API-01 (store) | Proven | — |
| AC-004 | Yes | MSP-30 (text and image, new and old links, current content) | Proven | — |
| AC-005 | Yes | API-06 (b) (the page's navigation to `/rest/…` kept: no screen), (c) and (a) (the page's own rejection still shows pairing); API-03 (policy tests) | Proven | — |
| AC-006 | Yes | API-05 (MSP-13 → pairing; MSP-16/17 node files and file links; all 31 cases), API-02 (full web suite incl. desktop attachment and preview specs), API-03 (policy tests: subframes still allowed), API-06 (a) (a real rejection → pairing) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 97% | every AC on a real surface: MSP-28…31, API-06 | — | — |
| Changed-boundary execution directness | 70% | 96% | real key-carrying loads, pdf.js, images, Monaco; the real WebView's navigation decision | — | — |
| Cross-boundary integration realism and mock gap | 70% | 96% | production phone bundle on real nodes (incl. a peer node), the real Android app with both page versions | scripted runtime | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | owner credential, Phone Access pairing, emulator Android 15 | one emulator image | a physical phone (not needed) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | old page + new APK, old APK + old page, revocation, another node's path, unsaved edits | — | — |
| User-surface, browser, and desktop-shell confidence | 65% | 95% | phone viewer, composer, desktop window, Android app | packaged Electron (renderer-only change) | — |
| Durable regression coverage quality and relevance | 80% | 95% | MSP-28…31 in `test:e2e:mobile-shell`; unit tests per layer | the probe's overall verdict is red until 446 FU-003 is fixed; read per case | 446 FU-003 |

- Overall post-repository confidence: 74% (simple average)
- Overall final confidence: 95.6% (simple average of 97, 96, 96, 95, 95, 95, 95)
- Every critical AC directly proven: `Yes`; any final category below 90%: `No`; 95% target met: `Yes`
- Residual risks: autobyteus-446 FU-003 (the full probe's verdict); FU-001 (a viewer left open does not refresh by itself, out of scope); an old APK with the new page: a non-viewer tap that still navigates would show the old screen until the APK update (design note; the new page navigates nowhere, MSP-28).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Mode: `Browser` (phone bundle, desktop renderer) and `Lifecycle` (Android emulator)
- Gap addressed: the unit tests mock `fetch`, the viewers and navigation; the bug lives in real key-carrying loads, real viewers and the Android WebView's handling of a page navigation. Gain: 74% → 95.6%.

## Desktop Application Validation (When Applicable)

- Approach: the desktop renderer in a `nuxt dev` window (the probe's). No Electron main or preload change; the embedded window's `local-file:` read path is unit-covered (IMP-05).
- Effect on a running app: `None`. Not directly proven: the packaged window (renderer code identical).

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. The old main-frame allowance is gone and nothing relies on it (MSP-28: no main-frame node navigation). Compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` | Added | MSP-28, MSP-29, MSP-30, MSP-31 |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (imports and calls the module after the 446 cases; header lines; runtime note) | MSP-28…31 |

- Test-code review: `Not Applicable` (direct route). Temporary, not durable: `evidence/API-06-emulator/emulator-attachment-harness.mjs`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Model provider | Scripted AGY (`linked_skills`) | none for this change |
| A phone | Headless Chrome (390×844) and an Android 15 emulator | one emulator image |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks (incl. epsilon, zeta) | Yes | probe `finally` | `"serversLeft": 0, "rootRemoved": true` |
| Debug runs `/tmp/api450-dev-*` | Yes | removed | removed |
| Emulator `emulator-5584` | Yes | `emu kill` | gone |
| Base worktree `api450-base-6884309283` | Yes | `git worktree remove`, prune | removed |
| Harness nodes and temp roots | Yes | harness `finally` | `"serverExited": true, "rootRemoved": true` in each run |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: `None`
- Next recipient: delivery engineer (direct route)
- Notes: final confidence 95.6%. ASM-001 confirmed on the emulator. No new follow-up: the probe's red verdict is autobyteus-446 FU-003.
