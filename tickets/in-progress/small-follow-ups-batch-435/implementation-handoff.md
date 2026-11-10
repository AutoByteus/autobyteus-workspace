# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High) and passed (ARCH-REV-002); this handoff goes to the code reviewer per `get_handoff_rules` (Large or High → source review).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/requirements-doc.md` (SR-002, Approved)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: `follow-ups.md` (FU-001…FU-003 from design; FU-004 added by implementation: the browser's `/favicon.ico` request answered 401)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: `code-review-report.md` / `code-review-revision-record.md` (CRR-001, CR-001) → SR-003 (DS-006 entry form 2 corrected, DS-006b, AC-005-8, DEC-016) → `design-review-report.md` ARCH-REV-003 (Pass, AR-005 non-blocking); all in the ticket folder

## Current Implementation Summary

All twelve items are implemented, none dropped, in the design spec's change sequence (steps 1–8). **IR-002 (rework):** only DS-006 entry form 2 and DS-006b, as SR-003 / ARCH-REV-003 asked; see "IR-002 delta" below. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435`, base `origin/personal` @ `310fc27452`; implementation commit `e5ca0e1da7`, then `6ca743fee0` (regenerated `autobyteus-web/generated/graphql.ts`: one comment line for the digest field's new description); IR-002 rework commits `d0943a71ac` (code and specs) and `f9cb6f7153` (doc); documents and evidence in the commit after those.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (on top of `IR-001`)
- Related solution revision IDs: `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001` (code review); `AR-005` applied (architecture review guidance); `C-05` tidied (optional)

### IR-002 delta (Targeted Delta Review scope)

- **Shared promotion rule (AR-005):** the desktop's D-13 detection moved, unchanged, from `composables/chat/useChatRouteRunSync.ts` to the shell-neutral `autobyteus-web/composables/useDraftRunPromotionRouteSync.ts` (`git mv`, renamed function, doc comment names both shells). `pages/chat.vue` calls it as before; its spec moved to `composables/__tests__/useDraftRunPromotionRouteSync.spec.ts`. No wrapper or second copy remains.
- **`useMobileRouteRunSync(navigation)`** (`composables/mobile/useMobileRouteRunSync.ts`, new; mounted once by `MobilePairedShell.vue`): passes `routeRunId` = `agentRunIdOfRowKey(navigation.openRowKey)` (a top-level `agent:<id>` row only; null for child keys, `team:` and `org:` keys) to the shared rule; its `replaceRouteRunId(P)` records the draft R → P for the page and calls `navigation.replaceRowKey(agentRunRowKey(P))`. A `watch` on `routeRunId` replaces the row again whenever a route change (Back) lands on a recorded draft key.
- **`useMobileNavigation.replaceRowKey(rowKey)`**: `router.replace` of the current entry with `row` changed, every other key kept; navigation stays the route's only writer.
- **`agentRunIdOfRowKey(rowKey)`** (`utils/runListProjection.ts`, beside `agentRunRowKey`): the one reader of the top-level `agent:<id>` format; the restore's `delegatedHostOf` now uses it instead of a regex (CRR-001 C-05).
- **`MobilePairedShell.onLaunched(draftRunId)`**: unchanged behavior (the draft's row), renamed parameter and comment saying the route names the draft until the first send.
- **AC-005-8 / DEC-016**: no new code; a reload before the first send names a draft no node lists, so the restore's existing "not listed after readiness" step shows the list (test added).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation stayed within the twelve bounded deltas (no new subsystem, no persistence). The High drivers are real in the code: a retry decision changed in all five stream owners (desktop windows included) plus a page-wide close; a new phone route key with a page-start restore; a GraphQL answer whose meaning for inactive hosts changed.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None` (no Host/Origin/credential/CORS change; every owner took the shared classification without restructuring; the restore needed no new server data; no Android permission or manifest change)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Server overlays only in the Electron window; Electron as today | `autobyteus-web/app.vue`: `showsServerOverlays = isEmbeddedWindow && isElectronEnvironment()` (`utils/browserServerConfig.ts`); `isAppReady` unchanged | Done. No health request at a browser page start (IMP-10 has no `localhost:8000/health` failed request without the exemption; IMP-01 shows 6 on base) |
| BEH-002 | Opaque second GET after a non-timeout failure → `window_refused`, words per window kind | `utils/nodeIdentityProbe.ts` (`answersOpaquely`, cause `window_refused`); `utils/nodeConnectionErrorText.ts` (`cause.windowRefused` / `cause.windowRefusedPage` by `isElectronEnvironment()`); `localization/messages/{en,zh-CN}/nodesPage.ts` | Done. Same URL, same timeout, no credential, no second request after success, readable refusal or timeout. Electron-app run against a refusing node is API/E2E (AC-003-1) |
| BEH-003 | Dead code removed | `utils/remoteAccess/mobileConnectionDiagnostics.ts` (function, and the two kinds nothing produces: `websocket_blocked`, `unsupported_mobile_feature`; `types/remoteAccess.ts`), spec lines; `utils/dateUtils.ts` deleted | Done (grep: no symbol left) |
| BEH-004 | Full screen lays out into the cutout; insets: keyboard only while on; as before off | `autobyteus-android/.../ui/DesktopFullScreenController.kt` (`setOn` on/off branches set the cutout mode, API ≥ 28 by `sdkInt`; `reapplyInsets()` after each change), `ui/SystemBarInsets.kt` (`typesFor(fullScreen)`, `pad(root, fullScreen)`), `ui/WebShellScreen.kt`, `MainActivity.kt` (provider `{ fullScreenController.isOn }`) | Done. Unit test covers API 26–27, 28–34, 35. Emulator measurement (AC-004-1) is API/E2E |
| BEH-005 | Route names the open agent/Team subject (tap and Create run; a Create run draft until its first send, then the node's run, SR-003 DS-006b); restore at page start with "Opening…"; list when gone; list with connection state when reads fail; a reload before the first send → list (AC-005-8) | `composables/mobile/useMobileNavigation.ts` (`row` among the subject keys, `openRun(MobileRunSubject & { replace? })`, `openRowKey`); `utils/runListProjection.ts` (`agentRunRowKey`); `composables/mobile/useMobileRunOpening.ts` (`rowKey` for non-Org rows, `reopen`); `composables/mobile/useMobileRunTree.ts` (`revealRow`); `composables/mobile/useMobileSubjectRestore.ts` (steps 1–7); `components/mobile/MobilePairedShell.vue` (restore created before the subject-less-view watch; the watch waits on `restoring`; view screens show the run screen's "Opening…" while restoring; `onLaunched(runId)` → `agentRunRowKey`); `stores/mobileRunOpeningStore.ts` (`cancel`); IR-002: `composables/useDraftRunPromotionRouteSync.ts` (shared D-13 rule), `composables/mobile/useMobileRouteRunSync.ts`, `useMobileNavigation.replaceRowKey`, `utils/runListProjection.ts` `agentRunIdOfRowKey` | Done. Unit + component tests (a real draft through `createRunFromTemplate` → `promoteTemporaryId`); rendered Create run across the send and reloads (IMP-14); Android process-death check is API/E2E (AC-005-2) |
| BEH-006 | Send beside the field in a short viewport; field row kept in view | `components/mobile/views/MobileNodeDesktopClipboard.vue` (`[@media(max-height:320px)]` row layout; `scrollIntoView` on focus and on resize while focused) | Done. Emulator tap check (AC-006-1) is API/E2E |
| BEH-007 | Plain words naming the node; 401/403 unchanged | `connection/ConnectionDiagnosticMapper.kt` `fromHttpStatus(code, nodeName)`; callers `web/AutoByteusWebView.kt`, `connection/ConnectionValidator.kt` pass `entry.shownName` | Done (DEC-006 words verbatim) |
| BEH-008 | Retry reloads the pairing link while pending | `shell/NodeConnectionFlow.kt` (`pendingPairing` keeps the attempt; `retryUrlFor(entry)`); `MainActivity.webCallbacks` | Done. Link held in memory only |
| BEH-009 | Credential-refusal closes final in all five owners; page-wide close on session end | `services/liveStreamLifecycle/credentialRefusalClose.ts`; `WebSocketClient.ts` (agent and Team via `retryable`), `agentRunCollaborationStreamingService.ts`, `agentOrgStreamingService.ts`, `FileExplorerStreamingService.ts`; registries `agentRunStore.disconnectAllAgentStreams`, `agentTeamRunStore.disconnectAllTeamStreams`, `agentRunCollaborationStore.releaseAll` (also its binding watch), `agentOrgContextsStore.releaseAll`, `workspace.disconnectAllFileExplorerLiveStreams` (existing); `services/liveStreamLifecycle/closeAllLiveStreams.ts`; `components/mobile/MobileRemoteAccessShell.vue` (on `isPaired` true→false) | Done. Probe: MSP-32 fails on base (56 refused reads, 55 refused sockets, IMP-01) and passes after (IMP-10); MSP-18 (Phone Access off → on) passes |
| BEH-010 | Inactive digest from memory; re-read once per digest | Server `standalone-agent-run-root-manager.ts` `getAgentStatuses` (`root?.closedTaskExecutions() ?? taskExecutionResources.closedTaskExecutionsIn(createAgentRootExecutionIdentity(runId))`); GraphQL description `api/graphql/types/agent-run-collaboration.ts`; web `agentRunCollaborationStore.refreshListedStatuses(listedAgentRunIds)` stopped-host rule with `stoppedHostRereads` (cleared on release); `runHistoryStore.listedAgentRunIds` replaces `activeListedAgentRunIds`; `useRunHistorySectionLoad.ts` | Done. Server test proves no stored read (store spy); live run is API/E2E (AC-011-1) |
| BEH-011 | One key definition | `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` exports `taskExecutionReferenceKey` (tracked `dist` rebuilt); server (14 production + 4 test importers) and web (`taskExecutionClosure.ts`, `teamExecutionViewState.ts`) import it; the two local definitions removed | Done; no behavior change (contracts test of the format) |
| BEH-012 | Guide note on Android's one-time full-screen hint | `docs/android_mobile_access.md` | Done |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

### Implementation decisions inside the design (for review)

1. **Restore waits for the shell's first check, not only `initialLoad`** (`useMobileSubjectRestore({ …, firstCheck })`). The shell resolves `firstCheck` when `checkStatus(true)` ends (it includes `historyLoad.initialLoad`); the restore then waits one render (`nextTick`) and checks that its scope is not disposed. A session rejected at the first check unmounts the shell in that render, so the restore never rewrites the route under the pairing screen (design-review residual risk). Readiness of the list is still `runHistoryStore.error === null` after the first history read (step 2).
2. **`mobileRunOpeningStore.cancel(key)`**: a restore that ends on the list (gone, or a failed read) moves the page itself (`navigation.toList()`), then clears its pending open without a failure. `fail(key)` would make `MobileRunScreen`'s failure watcher call `back()` as well. A reopen that the shared action does not commit still ends with `fail` (as a tap).
3. **The restore also stops on Back**: `isCurrent()` checks the pending key (a tap supersedes) and that the route still names the row on a non-list screen (Back supersedes); a superseded restore's own pending open is cancelled.
4. **`revealRow` opens the run list's older-runs fold** (`runListStore.showRun`) for the row's run. The phone lists the newest five runs; without it, a restored run older than those would be judged "gone".
5. **View screens while restoring render `MobileRunScreen`** (its "Opening…" state), as DEC-015 asks; when the reopen commits, the target appears and the view replaces it.
6. **Clipboard short viewport = `max-height: 320px`**: the 151 px landscape-with-keyboard viewport is far below it, and portrait phones with the keyboard open stay above it, so the portrait sheet is as before (AC-006-2).
7. **GraphQL `closedTaskExecutionsDigest` stays nullable** (the client's generated type is unchanged); the manager's TypeScript answer is now `string`. The field and the doc comment describe the two meanings (AR-004).
8. **Android API level**: the controller takes `sdkInt` (`forActivity` passes `Build.VERSION.SDK_INT`), so the unit test covers API 26–35; `Display.setLayoutInDisplayCutoutMode` is `@RequiresApi(P)` and the controller's call is guarded by `sdkInt`.
9. **Collaboration stream**: a credential-refusal close settles readiness with "The node refused this connection's credential." and starts over, as its 4004 branch does; no error report. **Org stream**: the context still requires a reopen; the scheduler starts over instead of retrying.
10. **Probe**: MSP-32 runs last; the probe now records every 401/403 HTTP answer per phone context (`phoneRefused`) and each phone socket's close code; MSP-13 records when it revoked the open phone.

## Key Files Or Areas

- New: `autobyteus-web/services/liveStreamLifecycle/credentialRefusalClose.ts`, `closeAllLiveStreams.ts`, `autobyteus-web/composables/mobile/useMobileSubjectRestore.ts` (+ specs `credentialRefusalClose.spec.ts`, `closeAllLiveStreams.spec.ts`, `useMobileSubjectRestore.spec.ts`, `useMobileRunTreeRevealRow.spec.ts`, `runHistoryListedRuns.spec.ts` replacing `runHistoryActiveListedRuns.spec.ts`).
- Removed: `autobyteus-web/utils/dateUtils.ts`.
- Full list: `git show --stat e5ca0e1da7` (109 files).

## Important Assumptions

- A real browser `WebSocket` always passes a close event (code, reason) to `onclose`; two test doubles that called `onclose()` with no event now pass `{ code: 1006, reason: '' }` (IMP-02/IMP-03).
- `NODE_CREDENTIAL_INVALID` closes with 4401 today (its refusal is a 401); it is in the 4403 code set too, as DEC-008 lists it.

## Known Risks

- Item 10 on desktop windows: a desktop window whose owner credential is revoked stops reconnecting its run streams (intended, DEC-008); change feeds keep retrying (FU-003).
- Item 6 (IR-002): history entries other than the current one cannot be rewritten (History API). An entry pushed before the first send and first visited only after a reload still names the draft; it then behaves as any entry whose subject is gone (the list), as SR-003 accepts. Promotions are kept per page (lost on reload, by design).
- Item 6: a delegated row whose host's view is read through a live stream (`collaboration.read` returns at once while a service is attached) could be judged gone if the stream has not published yet; at page start no stream is attached, so this needs a stream attached before the restore's step 3 (not seen in tests).
- Item 5: verified by unit test for API 26–35 and the instrumented insets test (compiled, not run); the emulator measurement in both landscape directions and other cutout devices (UNK-001) remain for API/E2E.
- Item 11: not run against a live node (as in 446); API/E2E runs it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (items 1, 2, 5–11) and Cleanup (3, 4, 12)
- Reviewed root-cause classification: item 10 `Duplicated Policy Or Coordination` + `Missing Invariant`; item 12 `Shared Structure Looseness`; others `Local Implementation Defect`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` for items 10 and 12 (bounded), none for the rest
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: one classification function used by all five owners, each keeping its own final codes; one key export, both local definitions and the contracts' private `referenceKey` removed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (also the two diagnostic kinds nothing produces)
- Dead code found elsewhere, added to `follow-ups.md`: None (FU-004 records an unrelated pre-existing console 401, not dead code)
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`MobileRunSubject` is a two-variant union; `NodeProbeCause` gains one case)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Raw `wc -l` base → now: `agentRunStore.ts` 506 → 505, `agentOrgStreamingService.ts` 516 → 515, `standalone-agent-run-root-manager.ts` 516 → 516 (net ≤ 0, as required); `agentTeamRunStore.ts` 492 → 494, `agentRunCollaborationStore.ts` 458 → 472 (≤ 500); `teamExecutionViewState.ts` 516 → 516 (499 effective lines, not grown). No source file over 220 changed lines (largest: `DesktopFullScreenController.kt` +45/−8). Pre-existing excess is FU-002.
- Notes: `activeListedAgentRunIds` and its spec replaced by `listedAgentRunIds`; the collaboration store's inline release loop is `releaseAll`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (an Android-saved URL without `row` opens the list: the normal no-subject path)
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install --frozen-lockfile`, `nuxi prepare` (web) and `pnpm -C autobyteus-server-ts prepare:source` (Prisma client) before tests.
- The contracts package's tracked `dist/` was rebuilt (`pnpm -C autobyteus-collaboration-stream-contracts test` builds it) and is committed: a fresh-start build input (TESTING.md § Fresh-start build) for API/E2E or delivery.
- `autobyteus-web/typecheck-baseline.json` shrank (96 → 93 test-file errors) after the probe spec's fetch doubles were typed.
- The GraphQL description is a schema change for `autobyteus-web/generated/graphql.ts` (`pnpm -C autobyteus-web codegen:local`, commit `6ca743fee0`); the server architecture test `web-generated-graphql-current.test.ts` checks it.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/evidence/implementation/`. Environment for all: macOS (darwin 25.5.0, arm64), Node v22.23.1, pnpm 10.28.2, 2026-11-10.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Reproduction: base build (`pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`) + `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…` with this ticket's probe (exemption removed, MSP-32 added) | `310fc27452` + probe only (detached worktree, removed after) | headless Chrome | whole phone stack on base | AC-001-1, AC-010-3 | `Fail` (expected: the reproduction) | `IMP-01-base-repro-excerpt.txt`, `IMP-01-base-repro-mobile-shell-probe.json` | `failed cases: ['MSP-32']`; `MSP-32 refused requests after MSP-13: 56`; `refused sockets …: 55`; `unknownBrowserErrors: 62`; 6 failed requests to `http://localhost:8000/health` |
| IMP-02 | `pnpm -C autobyteus-web test:nuxt --run` (full web suite, first run) | production code of `e5ca0e1da7` (see Look For) | happy-dom/jsdom | all web units | all web | `Fail` → fixed (IMP-03, IMP-12) | `IMP-02-web-unit-full.txt` | first run: `Tests 23 failed | 5558 passed`, all 23 `Cannot read properties of undefined (reading 'code')` in two Org specs whose socket doubles fired `onclose()` with no event; doubles fixed (IMP-03), full rerun IMP-12 |
| IMP-03 | `pnpm -C autobyteus-web test:nuxt <the 25 spec files the commit touches or adds> --run` | `e5ca0e1da7` | happy-dom | stream owners, registries, close-all, phone navigation/opening/restore/tree/shell, clipboard, probe causes/words, app shell, list refresh | AC-001-1/2, AC-002-1, AC-003-1/2/3, AC-005-1…7, AC-006-2, AC-010-1/2, AC-011-2, AC-012-1 | `Pass` | `IMP-03-web-unit-touched.txt` | `Test Files  25 passed (25)`, `Tests  336 passed (336)` |
| IMP-04 | `pnpm -C autobyteus-web typecheck` (after `typecheck:update-baseline`) | `e5ca0e1da7` | — | web app, Electron, tests | all web | `Pass` | `IMP-04-web-typecheck.txt` | `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`, `[typecheck] PASS` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `e5ca0e1da7` | — | web boundaries, localization | AC-003-1/2 | `Pass` | `IMP-05-web-guards.txt` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, audit exit 0 |
| IMP-06 | `pnpm -C autobyteus-collaboration-stream-contracts test` | `e5ca0e1da7` | node:test | contracts incl. `taskExecutionReferenceKey` | AC-012-1 | `Pass` | `IMP-06-contracts-test.txt` | `# tests 49`, `# fail 0` |
| IMP-07 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/graphql/agent-run-collaboration-statuses.test.ts tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts --no-watch` | `e5ca0e1da7` | vitest | `getAgentStatuses`, resolver | AC-011-1, QR-002 | `Pass` | `IMP-07-server-digest-tests.txt` | `Tests  29 passed (29)`; the store spy test "a stopped host's digest follows a Task closed while it is stopped, from memory" |
| IMP-08 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts test:unit`; the one failing file rerun after `pnpm -C autobyteus-web codegen:local` | `e5ca0e1da7`; rerun `6ca743fee0` | vitest | server (key imports, manager, schema) | AC-011-1, AC-012-1 | `Pass` (after the codegen fix) | `IMP-08-server-typecheck-unit.txt` | typecheck `[typecheck] PASS`; unit `Tests  1 failed | 8264 passed | 9 skipped` (only `web-generated-graphql-current.test.ts`: the new field description); rerun `Tests  1 passed (1)` |
| IMP-09 | `cd autobyteus-android && ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` | `e5ca0e1da7` | JDK + Android SDK 35 | controller, insets, mapper, flow; androidTest compile | AC-004-1/2 (unit part), AC-007-1, AC-008-1 (unit part) | `Pass` | `IMP-09-android-unit.txt` | `BUILD SUCCESSFUL`; `unit tests 103 failures 0` |
| IMP-10 | Final build + `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/sfb435-final-probe` | `e5ca0e1da7` | headless Chrome, probe-owned nodes | whole phone stack | AC-001-1, AC-010-3, preserved MSP-01…31 (MSP-18 included) | `Pass` | `IMP-10-final-probe-excerpt.txt`, `IMP-10-final-mobile-shell-probe.json` | `result: Pass`; all 32 cases `Pass`; `unknownBrowserErrors: 0`; `MSP-32: Pass refused: [] refusedSockets: [] socketsOpened: 0`; `failed requests to http://localhost:8000/health …: 0` |
| IMP-11 | Rendered restore on the real phone bundle: probe stack in `--hold`, `IMP-11-render-restore-script.mjs` pairs a 390×844 Chrome phone, opens an agent run's Activity and reloads, opens a Team run and reloads, starts on `?row=agent:no-such-run&screen=activity` | `e5ca0e1da7` | headless Chrome | phone route `row`, restore, "Opening…", gone row | AC-005-1, AC-005-3, AC-005-7 | `Pass` | `IMP-11-render-restore-excerpt.txt`, `IMP-11-render-restore.json`, `IMP-11-*.png` | agent: trace `opening: true` then `activity: true`, same query, `listShownBeforeRestore: False`; Team: `opening` then `runOpen: true`; gone row: query becomes `?row=agent:no-such-run`, screenshot shows the list "Connected"; 12 console 401s are all `GET /favicon.ico` (FU-004) |
| IMP-12 | `pnpm -C autobyteus-web test:nuxt --run` (full web suite rerun) | `6ca743fee0` | happy-dom/jsdom | all web units | all web | `Pass` | `IMP-12-web-unit-full.txt` | `Test Files  739 passed (739)`, `Tests  5581 passed | 2 skipped (5583)` |
| IMP-13 | IR-002: `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-web test:nuxt --run` | `f9cb6f7153` | happy-dom/jsdom | all web units incl. `useMobileRouteRunSync.spec.ts` (real draft through `createRunFromTemplate` → `promoteTemporaryId`: row before/after the send, a view pushed before it, Back to the run-screen and list entries, a selection change that is not a promotion, another draft, a child key), `useDraftRunPromotionRouteSync.spec.ts` (moved desktop spec), `MobileRemoteAccessShell.spec.ts` (a reload before the send with a real draft ID → list) | AC-005-6, AC-005-8, D-13 preserved | `Pass` | `IMP-13-web-unit-full-rework.txt` | typecheck `PASS` (93 in 40, baseline 93); `Test Files  740 passed (740)`, `Tests  5586 passed | 2 skipped (5588)` |
| IMP-14 | IR-002 rendered: probe stack `--hold` (bundle of `f9cb6f7153`) + `IMP-14-render-create-run-script.mjs`: New run → Create run → reload before the send; Create run → first message → Activity → reload | `f9cb6f7153` | headless Chrome 390×844 | Create run route, promotion sync, restore | AC-005-6, AC-005-8 | `Pass` | `IMP-14-render-create-run-excerpt.txt`, `IMP-14-render-create-run.json`, `IMP-14-*.png` | A1 `row=agent:temp-…&screen=run`; A2 after reload `row=agent:temp-…`, no run screen, list; B2 after the send `row=agent:project_task_manager_…&screen=run`; B4 reload → Activity of that run, same query |
| IMP-15 | IR-002: `pnpm -C autobyteus-web build:mobile-web`; full `test:e2e:mobile-shell` | `f9cb6f7153` | headless Chrome, probe-owned nodes | whole phone stack incl. MSP-07 (Create run + first message) | AC-001-1, AC-010-3, preserved MSP-01…31 | `Pass` | `IMP-15-rework-probe-excerpt.txt`, `IMP-15-rework-mobile-shell-probe.json` | `result: Pass`; `failed cases: []`; `unknownBrowserErrors: 0`; `MSP-07 … Pass`; MSP-32 `refused: [] refusedSockets: []` |

- Not run, and why: Android emulator checks (AC-004-1 both directions, AC-005-2 process death, AC-006-1 real taps, AC-008-1 pairing Retry) and the instrumented tests (`connectedDebugAndroidTest`, compiled only) need an emulator: API/E2E. Item 2 in the Electron app against a node started without the window's name in `AUTOBYTEUS_ALLOWED_HOSTS` (AC-003-1): API/E2E. Item 11 against a live node (AC-011-1): API/E2E. A fresh-start build (the contracts' `dist` changed): API/E2E or delivery per TESTING.md.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: phone page start (no overlay), phone run screens across reload (route `row`, "Opening…"), Clipboard sheet in landscape full screen with the keyboard, Nodes page cause words.
- Approved UI/UX, interaction, requirement, or design references: REQ-003/DEC-002 (words), REQ-005/DEC-014/DEC-015 (restore states), REQ-006/DEC-005 (layout). No UI supplement.
- Existing design system, shared components, and adjacent product surfaces reviewed: `MobileRunScreen`'s "Opening…" state (reused, not restyled); `MobileBottomSheet` (unchanged); the repository's existing `[@media(max-height:540px)]` variant usage (`LeftSidebarStrip.vue`); the Nodes page's existing cause sentences (`cause.hostRefused`) as the tone model.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md § Browser probes; the phone bundle served by a probe-owned node.
- States, layouts, viewports, and interactions inspected: 390×844 phone: an agent run's Activity view reloaded (blank → "Opening…" → the same Activity view, the list never shown), a Team run's run screen reloaded ("Opening…" → the same run), a route naming a row that is not listed (→ the run list, "Connected"); the full probe (IMP-10) renders every other phone screen at 390×844 and 360×800 (MSP-11) with the new route keys.
- Visual or interaction issues found and corrected: none in the product; IMP-11 found the browser's own `/favicon.ico` request refused with 401 at each page start (pre-existing, FU-004).
- Check IDs with the supporting evidence, and remaining unverified states or limitations: the Clipboard sheet needs a node desktop (Docker VNC) in Control and a keyboard-open landscape viewport, and the Nodes page words need the Electron window and a refusing node: both were checked by component tests only (class and words), not rendered by implementation; API/E2E's emulator check (AC-006-1) and Electron check (AC-003-1) cover them.

## Downstream Coverage Hints / Suggested Scenarios

- Phone bundle, browser: open an agent run's Messages and the VNC Viewer (with full screen), reload, expect the same screen after "Opening…"; a Team member; a delegated task row (its host's view read first); a run older than the newest five; a run archived meanwhile → list; reload while the node is stopped → list with "Not reachable".
- New run → Create run → first message → open Messages/VNC Viewer → reload → same screen (AC-005-6); reload before the first message → list (AC-005-8); a durable probe assertion of the route `row` after MSP-07's first message would cover it on every run.
- Android: `am kill` with the viewer in full screen → reopens the same run's viewer in full screen (AC-005-2); full screen in both landscape directions, page width = screen width (AC-004-1); Clipboard Send with the keyboard open (AC-006-1); a pairing link with the node down, then Retry after it is back (AC-008-1); a 502 from the node's page (AC-007-1).
- Desktop window: revoke the window's owner credential → its run streams stop (no reconnect loop); Phone Access off → on still resumes phone streams (MSP-18 covers the phone).
- Nodes page in the Electron app against a node started without the window's name in `AUTOBYTEUS_ALLOWED_HOSTS` → "Something answers at <host>, but it refuses this window…"; a closed port → "No answer from that address." (AC-003-1).
- Item 11: a listed stopped host whose Task is set DONE and reopened → rows leave and return within one poll, desktop and phone; one view re-read per change (AC-011-1/2).

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E owns the executable coverage above, the emulator and Electron checks, the live item-11 run, and the fresh-start build. The full phone probe (IMP-10) and its MSP-32 check are implementation evidence that API/E2E may reuse for the commit it ran on.
