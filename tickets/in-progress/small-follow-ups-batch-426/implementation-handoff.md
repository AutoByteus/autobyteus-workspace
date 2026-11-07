# Implementation Handoff — small-follow-ups-batch-426, round 1

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High); ARCH-REV-002 Pass (SR-004), ARCH-REV-003 Pass (SR-005, revised D-02), ARCH-REV-004 Pass (SR-006, D-19). Handoff rule: Large or High → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md`
- Investigation notes: `…/small-follow-ups-batch-426/investigation-notes.md`
- Solution revision record: `…/small-follow-ups-batch-426/solution-revision-record.md` (SR-001…SR-006)
- Design spec: `…/small-follow-ups-batch-426/design-spec.md` (D-01…D-19)
- Supplemental task artifacts: Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (VIS-001…009), `product-design-request.md`, `follow-ups.md` (FU-001, FU-002)
- Design review report: `…/small-follow-ups-batch-426/design-review-report.md`
- Architecture review revision record: `…/small-follow-ups-batch-426/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial round)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, `codex/small-follow-ups-batch-426`; base `6225a734a3`, then `origin/personal` `933163361c` merged in `ed29eb6522` (before D-19, as ARCH-REV-004 asked). Head: see the handoff message.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-004: CRR-004 local fixes F-004, F-005; IR-003: SR-008 revisions of D-02 and D-03 answering CRR-003 F-API-001/F-API-002; IR-002: CRR-001 local fixes; the rest as IR-001)
- Implementation revision record: `…/small-follow-ups-batch-426/implementation-revision-record.md`
- Current implementation revision ID: `IR-004`
- Related solution revision IDs: SR-004, SR-005, SR-006
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: CRR-001…CRR-004; API-E2E: API-REV-001; delivery: `N/A`
- Triggering finding IDs: F-004, F-005 (CRR-004); F-API-001, F-API-002 (CRR-003, via SR-008 / ARCH-REV-005); earlier F-001…F-003 (CRR-001)

All round-1 items are implemented in their existing owners: server D-18, D-08, D-06, D-14; web D-08 (client), D-01, D-02, D-05, D-16, D-17, D-12, D-13, D-19; Android D-07, D-03; probes D-10, D-11. One Design Impact was raised during the round (D-02: the refusal code never reached the check, evidence IMP-02). The Solution Designer revised it (SR-005, `historyReadFailure`), ARCH-REV-003 passed it, and it was implemented that way. API/E2E then found the history store's state unreliable as the check's source (CRR-003 F-API-001), and a share-started task re-running its link after process death (F-API-002). SR-008 / ARCH-REV-005 replaced D-02 with the phone's own credential check, removed `historyReadFailure`, and added D-03's re-delivery rule; both are implemented (IR-003).

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the deltas stayed inside their owners. The High rating still holds: D-07 relaxes the Android WebView navigation rule, and D-02 changes when the phone drops a credential. D-19 added one small template move. No new permission, stored-data change or new API: the manifest diff is empty; D-02's `historyReadFailure` is in-memory store state; and the contract delta is still only additive (`public` kind, `WORKSPACE_PATH_REFUSED`). None of the escalation triggers fired: R-01's re-check finishes (IMP-05); `isForMainFrame` is used as designed; the manifest is unchanged; 416's overlap is unchanged.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None` open (the D-02 Design Impact is resolved by SR-005 / ARCH-REV-003)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (D-01) | Phone feed only while paired; desktop/browser unchanged | `autobyteus-web/app.vue`: `definitionFeedEnabled = isAppReady && (!isMobileRemoteAccessRuntime() \|\| mobileNodeSession.isPaired)` | Done; `__tests__/app.spec.ts` (phone: off → paired on → unpaired off; desktop on) |
| BEH-002 (D-02, SR-008) | Revoked → session rejected (pairing screen); Phone Access off → kept, "Phone access off" + banner; 401 rule unchanged; the outcome comes only from the phone's own credential check | `stores/mobileNodeSessionStore.ts` (`checkCredential()`: one `POST <node>/graphql { __typename }` through `fetchWithRemoteAccessCredential` with the session's own credential; 2xx → reachable, else `remoteAccessReadRefusal({ status, code })` from the refusal body, else unreachable; `phoneAccessOff`; `recordCheckOutcome` replaces `recordAuthorizedApiReachability`; session end clears off); `utils/remoteAccess/remoteAccessReadRefusal.ts` (status and code only; replaces `remoteAccessAuthFailure.ts`); `components/mobile/MobilePairedShell.vue` (credential check, public status and history read together; outcome from the credential check only); `components/mobile/runList/MobileRunList.vue` (`connection` prop, labels, off banner). SR-005's `historyReadFailure` and `readHistory`'s cause are removed: the run-history store, its actions and `useRunHistorySectionLoad` are back to their pre-ticket code (D-08's split stays) | Done; specs: rule (status/code), store `checkCredential` (request shape and credential; revoked 403, off 403, 401, other refusal, 502, network error), shell (rejected, off → unreachable → reachable, outcome taken from the check only while the history read answers otherwise, Retry), run list (3 states). Never sent on the poll |
| BEH-003 (D-03, SR-008) | Process death reopens the same node and `/mobile` URL; policy-refused URL or removed node → ordinary start; a recreated activity does not re-run the share that started it; a new share still wins | `autobyteus-android/.../shell/OpenPageRestore.kt` (`save`, `read`, `restore`, `sharedTextToHandle(sharedText, recreated)`), `MainActivity.kt` (`onSaveInstanceState`; `onCreate`: shared text only when `savedInstanceState == null` → restored → last used → start; `onNewIntent` unchanged), `shell/NodeConnectionFlow.kt` (`open(entry, pageUrl = entry.mobileUrl)`) | Done; `OpenPageRestoreTest` (6, incl. the re-delivery rule). RR-02 is superseded by SR-008: the re-delivered share no longer wins over the restore (it had shown "This code has expired"). Run screens come back as the list until round 2 (AC-004b, DEC-013); AC-004a on the emulator is API/E2E's (API-08 Runs A, B, C) |
| BEH-005 (D-05) | Control + connected: Paste to desktop, Copy from desktop (tap) with selectable fallback; nothing without a tap | `composables/useVncSession.ts` (`remoteClipboardText` from RFB `clipboard`, cleared on stream end/disconnect; `sendClipboardText` → `clipboardPasteFrom`, Control+connected only), `components/mobile/views/MobileNodeDesktopClipboard.vue` (new sheet in `MobileBottomSheet`), `MobileNodeDesktop.vue` (Clipboard bar button next to Keyboard), `types/novnc.d.ts`, catalogs `mobileNodeDesktop.ts` (en, zh-CN) | Done; specs for session and view (no read/write on open; send; async copy; selection copy; failure → "Long-press the text to copy it."). After a successful send the sheet closes (the user then pastes on the desktop), and a successful copy labels the button "Copied": two small feedback choices the design did not spell out. U-01 (copy in the WebView on `http://`) needs the emulator |
| BEH-006 (D-06) | One metadata-only line per 4429 refusal | `server-ts/src/node-desktop/node-desktop-viewers.ts` (`admit(viewer, stream, mode)`; refusal `{ refused, limit, openStreams }`; `[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=<node\|phone> mode=… viewer=… open=… max=…`), `api/websocket/node-desktop.ts` (passes mode) | Done; unit spec + route E2E (5th node-wide, 3rd per phone; no device ID, credential or address) |
| BEH-007 (D-07) | `blob:` subframe of the open node's origin loads; main-frame blob:, foreign blob:, other schemes blocked; other origins external | `autobyteus-android/.../web/TrustedNavigationPolicy.kt` (`classify(url, entry, isMainFrame)`, `classifyBlob`, shared `isSameOrigin`), `web/AutoByteusWebView.kt` (passes `request.isForMainFrame`; `loadTrusted` main frame; deprecated String override removed) | Done; `TrustedNavigationPolicyTest` (+2 cases). RR-01: the emulator run must keep AC-007's `window.AutoByteusShell === undefined` check. No change to `ShellBridge` |
| BEH-008 (D-08) | Unregistered path must be an existing absolute folder; reason shown on phone and desktop; registered paths unchanged | Server: `src/workspaces/workspace-folder-check.ts` (new: `assertWorkspaceFolder`, `WorkspacePathRefusedError`), `workspace-manager.ts` (checks when neither active nor registered, raw input), `api/graphql/types/workspace.ts` (`WORKSPACE_PATH_REFUSED` + `reason`). Web: `utils/workspace/workspacePathRefusal.ts` (new), `services/workspace/runWorkspaceChoice.ts`, `stores/runHistoryLoadActions.ts` (`findOrRegisterWorkspaceByRootPath` split out), `composables/mobile/useMobileLaunchWorkspaces.ts`, catalogs `workspace.ts` | Done. RR-03, server-internal forms now refused at registration (instead of a later `ENOENT`): `agent-run-provisioning-service.ts:249`, `standalone-agent-run-lifecycle-service.ts:444`, `team-run-service.ts:126`, `agent-org-run-manager.ts:275`, `agent-org-run-service.ts:255`, `configured-agent-execution-handle.ts:451`; one form covered by the new E2E `workspace-path-refusal-run-launch.e2e.test.ts` (`createAgentRun` → provisioning). `stores/workspace.ts` needed no change (Apollo keeps `graphQLErrors`) |
| BEH-010 (D-10) | B04 asserts by the seeding rule | `tests/e2e/fresh-run-auto-approval-probe.mjs` (counts rows reading "Customized"; expects "`<n>` of `<total>` customized") | Changed; probe not run here |
| BEH-011 (D-11) | NVP-05 waits for the dev server after the restart | `tests/e2e/fixtures/dev-server-ready.mjs` (new: `/` and `/rest/health` 200, 60 s, 500 ms), `node-vocabulary-probe.mjs` | Changed; probe not run here. The other probe that restarts alpha under `nuxt dev` (mobile-shell MSP-09) does not navigate afterwards, so it needs no wait |
| BEH-012 (D-12) | Docs name `CollaborationMessageReferenceViewer` and describe it | `autobyteus-web/docs/agent_artifacts.md` (diagram, owner row, paragraph), `docs/content_rendering.md` | Done (descriptions re-read from the component) |
| BEH-013 (D-13) | Case 5 extended; new Case 17 | `docs/design-cases.md` | Written in the file's own form ("Again in" bullets for Case 5: 277 CRR-003 F-01 and 426 SR-005, SR-008 (CRR-004 F-005: D-13's SR-008 text); Case 17 with said / happened / fix / lesson / notice). Case 17's "fix" line states that the re-read was left out and rows of a run that is not open keep their first read. This is from E-09; the Solution Designer may want to confirm the wording. After the 427 merge, Case 17 keeps its number |
| BEH-014 (D-14) | Four E2E tests pass; AR-14 label prints last row; AR-14 waits for the re-check | `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`, `workspace-run-history-graphql.e2e.test.ts`, `runtime/runtime-capability-graphql.e2e.test.ts`, `runtime/agent-runtimes-graphql.e2e.test.ts` | Done. R-01 reproduced and measured (IMP-05): the re-check ends about 0.1 s after the update, so this is no product bug. AR-14 waits on the row's `checkedAt` (the design said the row has no "finished" field; it does, `agent-runtimes.ts:67`), not on a repeated `checkAgentRuntimes`. The label is built after the wait fails |
| BEH-016 (D-16) | Remote node: spec strings; embedded/Docker unchanged | `utils/phoneAccess/phoneSetupTextKey.ts` (new: `REMOTE_WORDED_PATHS`, 21 paths), `components/settings/phone/PhoneWayTab.vue`, `PhonesPanel.vue`, catalogs `localization/messages/{en,zh-CN}/phoneSetupRemoteNode.ts` (new, registered in each `index.ts`) | Done; catalog spec (both locales define every listed key) + panel spec for a remote node (VIS-001…009 strings) + rendered check (IMP-13). The remote keys live in their own catalog, so `settings.ts` (500 lines) does not grow; key names are unchanged |
| BEH-017 (D-17) | App UI locale everywhere; guard | ~20 sites (`useMemoryIndexView.ts`, `applicationLaunchProfile.ts`, `UiErrorPanel.vue`, `MemorySyncCard.vue`, `AboutSettingsManager.vue`, `ServerMigrationsManager.vue`, `MemoryHome.vue`, `CollaborationMemoryDetail.vue`, `AgentMemoryDetail.vue`, `WorkJournalTab.vue`, `RawTracesTab.vue`, `MemorySearchResults.vue`, `BackgroundTaskPanel.vue`, `SystemInstructionActivityItem.vue`, `CollaborationMessagesPanel.vue`, `tokenUsageFormatting.ts`, `IntegrationDetail.vue`, `MobileMessages.vue`, `SkillSourceRow.vue`); `scripts/guard-localization-boundary.mjs` (new OS-locale rule over the guard's dirs plus `utils/`, test files excepted) | Done; guard integration test (5 planted calls fail, 3 good forms pass); `SystemInstructionActivityItem` spec with `zh-CN`. No CI test job exists (only release workflows), and the guard already runs in every `build:electron*`, so no workflow or gate input changed (DESIGN rule 12 not triggered) |
| BEH-018 (D-18) | Private → LAN, 100.64/10 → tailnet-like, public → `public` after them, link-local not listed; one range owner | `server-ts/src/remote-access/services/ip-address-ranges.ts` (+ IPv6 ULA / link-local; header), `server-addressing/server-address-candidate-service.ts` (`classifyInterfaceAddress`; own copies removed), `server-address-candidate-types.ts` (`public`) | Done; unit tests (stubbed interfaces); `network-interface-classifier` unchanged and passing |
| BEH-019 (D-19) | Read-only conversation shows the file status; composer hidden | `components/workspace/agent/AgentEventMonitor.vue` (status in its own `shrink-0` block on `filePreviewStatus`; composer slots and `CollaboratorAddFailureNotice` stay behind `!readOnly`) | Done on 427's version of the file; `AgentEventMonitor.spec.ts` (`readOnly` true/false: same text, classes, role, aria-live; composer only when writable) and `AgentEventMonitor.mobileFileOpen.spec.ts` re-run green. The phone-bundle probe step is left to API/E2E (see below) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

New: `server-ts/src/workspaces/workspace-folder-check.ts`; `server-ts/tests/unit/server-addressing/server-address-candidate-service.test.ts`, `tests/unit/remote-access/ip-address-ranges.test.ts`, `tests/e2e/workspaces/workspace-path-refusal-run-launch.e2e.test.ts`; web `utils/remoteAccess/remoteAccessReadRefusal.ts` (renamed), `utils/workspace/workspacePathRefusal.ts`, `utils/phoneAccess/phoneSetupTextKey.ts`, `components/mobile/views/MobileNodeDesktopClipboard.vue`, `localization/messages/{en,zh-CN}/phoneSetupRemoteNode.ts`, `tests/e2e/fixtures/dev-server-ready.mjs`, `tests/integration/localization-boundary-guard.integration.test.ts`; Android `shell/OpenPageRestore.kt` and its test.

## Important Assumptions

- Item 8's check is made on the raw trimmed input (before the server resolves a relative path against its cwd), and only for an ID that is neither active nor in the registry. History restore (`ensureRunHistoryWorkspaceByRootPath`) keeps returning `null` on any failure.
- The credential check is a phone GraphQL read that the node authorizes for any operation (`remote-access-route-policy.ts:203-205`); its refusal body is `{ error, code, message }` (`remote-access-policy-plugin.ts:43-45`).
- The web drops the `pairing` query after pairing (`MobileRemoteAccessShell.vue:57`), so a restored page URL never carries a used code.

## Known Risks

- D-05: noVNC writes the local clipboard itself where its async clipboard is available (secure origin with `navigator.permissions`). There, the `clipboard` event does not fire, Copy stays disabled, and noVNC may still read the phone clipboard on canvas focus. That is today's noVNC behavior. It does not apply in the Android WebView on `http://` (no `navigator.permissions`, 407 API-04), which is the target. It would matter only for a phone browser on an https node.
- D-02: the connection sheet (`MobileConnectionSheet`) still takes the boolean `connected`, as designed. With Phone Access off it says "Not reachable" while the list bar says "Phone access off".
- D-07 / RR-01: any future unsandboxed same-origin `blob:` iframe would receive the bridge object (messages still ignored). Keep the AC-007 check.
- D-08: a historical run whose workspace was removed and whose folder is gone now opens without a workspace (DEC-004); server-internal launches into such a folder fail earlier, with the folder reason (RR-03).
- The server unit run's architecture timeout was fixed as a baseline fix (own commit `709617b6eb`); it was CPU contention against the 5 s default, not the change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix with Cleanup
- Reviewed root-cause classification: Missing Invariant (1, 2, 7, 8, 19), Duplicated Policy (18), Local Implementation Defect (3, 5, 6, 17), stale tests/docs (10–14)
- Reviewed refactor decision: `Refactor Needed Now` (bounded: item 18's range owner, item 8's find-or-register split)
- Implementation matched the reviewed assessment: `Yes` (after SR-005 for D-02)
- If challenged, routed as `Design Impact`: `Yes` (D-02 premise, evidence IMP-02; resolved SR-005 / ARCH-REV-003)
- Evidence / notes: D-14's premise "the row exposes no check-finished field" was wrong (`checkedAt`); the test-only consequence (wait on it) fits REQ-014's wording exactly and needed no design change.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files and modules removed: `Yes`. Removed: `isLanIp` and `isTailnetLikeIp`; `useRunHistorySectionLoad`'s read result (`RunHistoryReadResult`, `listsAnyRun`, `readHistory`'s ok/cause; load and initialLoad now settle void) once SR-008 left it no reader (CRR-004 F-004); `isRemoteAccessAuthFailure` (file renamed); `recordAuthorizedApiReachability`; the `connected` prop of `MobileRunList`; the deprecated `shouldOverrideUrlLoading(view, url)`; B04's constant assertion
- Dead code found elsewhere, added to `follow-ups.md`: FU-002 (`autobyteus-web/utils/dateUtils.ts`, no importer); FU-001 (Solution Designer) stands
- Shared structures remain tight: `Yes` (`NodeDesktopAdmission` refused variant, `MobileCheckOutcome`, `MobileRunListConnection`, `WorkspacePathRefusalReason`, each one meaning)
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes`. No changed source file is above 500 effective lines: largest `runHistoryStore.ts` 493 (+2), `runHistoryLoadActions.ts` 481. The two `settings.ts` catalogs would have reached 521, so the remote keys moved to their own catalog file. `MainActivity.kt` 320, `MobileNodeDesktop.vue` 242. No file has a changed-line delta over 220
- Notes: `tokenUsageStatisticsUi.ts`'s `getLocale` default (`() => undefined`) is never used (every caller passes the app locale), but the file is not touched; it is minor and not recorded as a follow-up because it is a default parameter, not unreachable code.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`. The workspace registry is only read for the check; nothing is rewritten. The Android saved-instance Bundle is system-transient. The credential check stores nothing.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `prebuild`, `nuxt prepare` and `autobyteus-server-ts build` ran in the worktree. Android tests need `ANDROID_HOME=$HOME/Library/Android/sdk` (no `local.properties` in the worktree).
- `origin/personal` (`933163361c`, autobyteus-427) was merged before D-19 (`ed29eb6522`, no conflicts; Case 2's heading and Case 17 coexist). It brought a TESTING.md rule: renderer behavior the phone also offers is proven on the phone bundle by a `test:e2e:mobile-shell` case. That covers D-01, D-02, D-05 (needs a node desktop), D-08 (phone field) and D-19.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | The four item-14 E2E files before their fix (clean env, `vitest run …`) | base `6225a734a3` + early server work (unrelated to these four) | macOS, Node 22.23.1 | the four E2E files | REQ-014 (reproduction) | Fail (expected) | `IMP-01-item14-e2e-before.log` | `Tests  4 failed \| 31 passed (35)` |
| IMP-02 | Apollo 3.14 against a stub 403 refusal body | base (web path unchanged) | Node 22 | Apollo error shape; `runHistoryLoadActions.ts:150-152`, `useRunHistorySectionLoad.ts:38` | REQ-002 (D-02 premise) | Measured | `IMP-02-apollo-403-error-shape.txt` | `"message":"Response not successful: Received status code 403","statusCode":403,"result":{…"code":"REMOTE_ACCESS_DEVICE_REVOKED"…}` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | work tree = `85d26ed1e8` minus the delegation fixture fix | macOS | whole server unit + architecture suite | all server items | Fail → causes found and fixed | `IMP-03-server-unit.txt` | `11 failed \| 8066 passed`: 9 × team-remote-delegation (D-08: the fixture never created its temp workspace folder → fixed in `3ea7c39322`); 1 × composition scan timeout (CPU contention vs 5 s → baseline fix `709617b6eb`); 1 × tracked-imports (files not yet committed). All three rerun green in IMP-06 |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | server sources as in `85d26ed1e8` (unchanged since) | macOS | server src + tests | all server items | Pass | `IMP-04-server-typecheck.txt` | `production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)` |
| IMP-05 | AR-14 alone, with a temporary timing log (removed) | work tree before `85d26ed1e8` | clean env | `agent-runtime-status-service.ts` re-check; AR-14 | REQ-014, R-01 | Pass; measured | `IMP-05-R01-ar14-recheck-measurement.txt` | `automatic re-check finished 108 ms after the update result was read` |
| IMP-06 | focused server unit + all `tests/architecture` (cmd in file) | `b1d92c7ced` (+ evidence) | macOS | D-18, D-08, D-06 units; delegation fixture; architecture incl. tracked-imports | REQ-006, 008, 018 | Pass | `IMP-06-server-focused-unit.txt` | `Tests  269 passed (269)` |
| IMP-07 | 7 server E2E files (cmd in file) | `b1d92c7ced` | clean env | item-14 files, D-08 GraphQL refusal, RR-03 run launch, D-06 route log, Memory Sync candidates (D-18) | REQ-006, 008, 014, 018; AC-006, 008, 014 | Pass | `IMP-07-server-e2e.txt` | `Test Files  7 passed (7)`, `Tests  48 passed (48)` |
| IMP-08 | `pnpm -C autobyteus-web test:nuxt --run` | `c17490a004` + D-17 work tree | macOS | whole web suite | all web items | Fail → fixed | `IMP-08-web-nuxt-full.txt` | `4 failed \| 713 passed (717)`: four specs mocked `useLocalization` without `resolvedLocale` (D-17 consequence) → mocks given a locale in `8aa5647d58`; rerun in IMP-09 |
| IMP-09 | every web spec touched since base (27 files; cmd in file) | `b1d92c7ced` | macOS | D-01, D-02, D-05, D-08, D-16, D-17, D-19 specs + the four fixed specs + 427's merged specs | REQ-001, 002, 005, 008, 016, 017, 019; AC-001…003, 005, 008, 016, 017, 019 | Pass | `IMP-09-web-touched-specs.txt` | `Test Files  27 passed (27)`, `Tests  285 passed (285)` |
| IMP-10 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | after D-19 (`4cfb3e4d19`) | macOS | guards incl. the new OS-locale rule | REQ-017 / AC-017 | Pass | `IMP-10-web-guards.txt` | `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-11 | `pnpm -C autobyteus-web typecheck` | `b1d92c7ced` | macOS | Nuxt app, Electron main, build scripts, cross-package tests | all web items | Pass (after fixing `types/novnc.d.ts` and one spec object) | `IMP-11-web-typecheck.txt` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-12 | `ANDROID_HOME=… ./gradlew --no-daemon :app:testDebugUnitTest` | `ea8897ee53` (Android unchanged since) | JDK 21 | all Android unit tests incl. `TrustedNavigationPolicyTest`, `OpenPageRestoreTest` | REQ-003, 007; AC-004, 007 (unit part) | Pass | `IMP-12-android-unit.txt` | `TrustedNavigationPolicyTest" tests="5" … failures="0"`, `OpenPageRestoreTest" tests="5" … failures="0"`; manifest diff vs base: 0 lines (QR-001) |
| IMP-14 | CRR-001 fix checks: affected specs (rule, shell, chat launch, guard integration), the guard, web typecheck | `1d2cdd15ab` | macOS | `remoteAccessReadRefusal.ts`, `runWorkspaceChoice.ts`, guard script | REQ-002, 008, 017 | Pass | `IMP-14-crr001-fix-checks.txt` | `Tests  52 passed (52)`; `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-15 | SR-008 revision: affected web specs, web typecheck, localization guard, Android unit tests | `35263117c9` | macOS, JDK 21 | `checkCredential`, `remoteAccessReadRefusal`, `MobilePairedShell`, restored run-history files, `OpenPageRestore`, `MainActivity` | REQ-002, REQ-003; AC-002, AC-003, AC-004a (unit part) | Pass | `IMP-15-sr008-revision-checks.txt` | `Tests  196 passed (196)`; `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`; `OpenPageRestoreTest" tests="6" … failures="0"` |
| IMP-16 | CRR-004 fix checks: run-history load specs, shell spec, desktop history specs, web typecheck, guard | `c8b4b659cd` | macOS | `useRunHistorySectionLoad.ts`, `design-cases.md` | REQ-002, REQ-013 | Pass | `IMP-16-crr004-fix-checks.txt` | `Tests  279 passed (279)`; `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-13 | Rendered Phone Setup: test-owned server (worktree dist) + `nuxt dev` + headless Chrome; embedded window, then the window bound to a remote entry | `b1d92c7ced` sources | 1059×738 and 640×900 @2×; OS locale de-DE, app en | `PhoneWayTab.vue`, `PhonesPanel.vue`, `phoneSetupTextKey.ts`, catalogs | REQ-016 / AC-016 | Pass | `IMP-13-render-summary.txt`; `IMP-render-phone-setup/` and `IMP-render-phone-setup-remote/` (PNGs, result JSON, harness scripts as `.mjs.txt`, server/frontend logs) | remote `kind= remote`; `desktop vpn \| status: Office Mac isn’t reachable through a VPN from this computer. Connect both to your VPN, then Check again. \| lines: 2 \| overflow: False`; embedded: `No VPN found on this computer. Connect it, then Check again.`; `browserErrors= []` |

- Not run, and why:
  - Probes B04 (`test:e2e:fresh-run-auto-approval`), NVP-05 (`test:e2e:node-vocabulary`) and the phone-bundle probe (`test:e2e:mobile-shell`): API/E2E executes probes. The probe code changed here is D-10, D-11.
  - Emulator checks AC-004, AC-005 (U-01), AC-007: they need the emulator with an isolated node, which is API/E2E's environment.
  - Docker node-desktop render of the clipboard sheet: no node desktop on this machine (Docker-only), so only specs cover it.
  - Fresh-start build: not run here. One build input changed: `autobyteus-web/scripts/guard-localization-boundary.mjs` matches `*/scripts/**` in TESTING § Fresh-start build. API/E2E or delivery runs the fresh-start desktop build before merge. No `package.json`, `tsconfig`, workflow, Gradle file or contract package changed. The guard reads only the web app's own source files, so DESIGN rule 12's prepare-step concern does not apply.
  - Electron main tests (`test:electron`): no Electron main code changed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - Phone Setup panel (D-16), rendered.
  - Phone run list bar/banner (D-02), phone VNC clipboard sheet (D-05), phone "Open a folder by path" field and desktop New-chat launch error (D-08), event-monitor status on read-only conversations (D-19), locale-formatted values (D-17): component specs on real DOM.
- Approved references: Product spec `phone-setup-remote-node-wording` (VIS-001…009); requirements UI section (REQ-002 reuses the existing banner; REQ-005 sheet layout; REQ-008 texts).
- Existing design system / components reviewed: `MobileBottomSheet` (reused for the sheet, same button styles as the connection sheet), `MobileRunList` banner markup (reused for the off banner), PhoneWayTab classes (unchanged).
- Surface used: `nuxt dev` against a server built from this worktree (TESTING § Browser probes). A browser window is always the embedded node, so for the remote kind the harness bound the window to a remote entry through its Pinia stores (same test-owned node) and gave the page an inert WebSocket. Without it, sockets to the unproxied dev origin reset `nuxt dev`, the E-11 effect.
- States, viewports and interactions inspected:
  - Every tab not ready, Check again for Tailscale and VPN, How it works open, remote and embedded; at 1059 and 640 px.
  - Remote strings equal the spec's. The VPN line takes two lines at 1059 px, as VIS-002 shows. Nothing overflows or clips at 640 px. No browser errors.
- Issues found and corrected: none in the rendered result.
- Remaining unverified states and limitations:
  - Remote *ready* states (VIS-005…008) and the no-address message (VIS-009) are proven by `PhonesPanel.spec.ts`, not rendered: the test node listens on 127.0.0.1, so no way becomes ready.
  - The phone screens were not rendered here. A phone page through `nuxt dev` is a loopback client of the node, so the node never refuses it; revoked and off states cannot appear there. The phone bundle on a LAN origin (`test:e2e:mobile-shell`) is the surface for them.

## Downstream Coverage Hints / Suggested Scenarios

- D-02 on the phone bundle: revoke the paired phone → Check / Retry → pairing screen. Phone Access off → bar "Phone access off" and banner "`<node>` is reachable, but Phone access is off." → on → Check loads the runs. Off → node stopped → "Can’t reach `<node>`.". No re-pairing.
- D-01: the phone page unpaired for 30 s makes no WebSocket attempt; after pairing, one feed socket to the paired node with `access_token`; after unpair it closes and is not retried. MSP's `KNOWN_BROWSER_LINES` entry for the old feed retry (`mobile-shell-probe.mjs:402-404`, "FU-002" of 277) should now be removable: check that the line no longer appears.
- D-08: phone "Open a folder by path" with `/definitely/not/a/folder`, `/etc/hosts`, `relative/dir`, then an existing folder. Desktop New chat with a typed folder in a browser / remote-node window shows the reason. History restore of a deleted, registered folder still loads.
- D-19 phone step (TESTING's phone-bundle rule): the MSP-16 neighbourhood. The phone's read-only conversations are targets whose `access` is `read_only` (`composables/workspace/useTargetConversation.ts:25-29`), for example a Task copy opened from the PTM's tree or a non-live Org/Team member. It needs a message in that run naming a file outside the workspace; tap it and expect "This file is available only on the host workspace." with no composer.
- D-05 on a Docker node in the Android app (AC-005, U-01): does `execCommand('copy')` work on `http://`? The selectable fallback shows either way.
- D-07 emulator (AC-007): the preview loads; `window.AutoByteusShell === undefined` inside the frame; the sandbox has no `allow-same-origin`; main-frame blob, foreign blob, `file:` and `javascript:` stay blocked.
- D-03 emulator (AC-004): Files screen → background → `adb shell am kill org.autobyteus.mobile` → reopen from recents → same URL. Remove the node meanwhile → ordinary start.
- D-17: app English with OS `de-DE` (and the reverse) on Memory, Work journal and token usage surfaces.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Probe runs: B04, NVP-05, and `test:e2e:mobile-shell` with new phone-bundle cases for D-01, D-02, D-08 (phone field) and D-19.
- Emulator checks AC-004, AC-005 (U-01), AC-007 with an isolated node.
- AC-006 is already covered by the route E2E. Live Docker node-desktop is optional.
- Fresh-start desktop build (or a clean-clone guard run), because `autobyteus-web/scripts/guard-localization-boundary.mjs` changed (TESTING § Fresh-start build).
