# Code Review Report — small-follow-ups-batch-426 (autobyteus-426), round 5 (Targeted Delta Review of IR-004)

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5). Round 4 was a Full Re-Audit of SR-008 / IR-003; round 3 the API/E2E failure-origin review (kept below as history).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-008: REQ-003 narrowed, AC-004a this round, AC-004b round 2)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections E-02, E-07, E-08, E-14, E-17, E-18)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008; D-02 and D-03 revised, D-13 text replaced)
- Supplemental Task Artifacts Reviewed As Context: Product spec `phone-setup-remote-node-wording/ui-ux-spec.md` (via IMP-13 and the catalog spec); `follow-ups.md`
- Relevant Solution Revision IDs: SR-004, SR-005, SR-006, SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002…005)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004, ARCH-REV-005
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001…IR-004
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: `5`
- Review Scope: `Targeted Delta Review` (round 4: Full Re-Audit; round 3: failure-origin; round 2: Targeted Delta; round 1: Full Review)
- Review Scope Evidence (round >1): `git diff 35263117c9 c8b4b659cd` touches only F-004's and F-005's files: `useRunHistorySectionLoad.ts` and its spec, the shell spec's load mocks, and `docs/design-cases.md`. No spine node, interface consumer or behavior changed: the reads, window and polling are identical, and `load` settles `void` (no reader used its value). Head `d115f1601d` adds documents only. Round 4's evidence for D-02/D-03 and rounds 1–2's for the other items is carried forward.
- Trigger: IR-004, the CRR-004 Local Fix (commit `c8b4b659cd`). Round 4 reviewed IR-003 (`40d8d088e5`, `35263117c9`).
- Prior Review Round Reviewed: round 4 (CRR-004, Fail, F-004, F-005)
- Latest Authoritative Round: 5
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs (round 3): MSP-13 (AC-002), MSP-18 (AC-003), API-08 runs A and B (AC-004)
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-04` (the phone production bundle against a probe-owned node); emulator `autobyteus277_api35` (Android 15, WebView 124) with the worktree debug APK: Files → `docs/guide.md` → Home → `adb shell am kill org.autobyteus.mobile` → Recents
- Failure Evidence Paths: `evidence/api-e2e/API-04-D02-failure-analysis.txt`, `API-04-summary.txt`, `API-04/mobile-shell-probe.json`, `API-04/MSP-13-revoked-check-to-pairing.png`, `API-04-run2/MSP-18-*.png`; `evidence/api-e2e/API-08-process-death-restore.txt`, `API-08-3-after.png`, `API-08-5-launcher-after.png`. Product code unchanged since `1d2cdd15ab`; API/E2E head `c85e705719`.
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The diff stays inside existing owners (≈60 source files across web, Android, server, most of them one-line locale arguments). High is still right: D-07 relaxes the WebView navigation rule, and D-02 changes when the phone drops its credential. Manifest diff is empty; no persistence or API change beyond the additive `public` kind and `WORKSPACE_PATH_REFUSED`. None of the design's escalation triggers fired. R-01 was measured in IMP-05.

## Review Scope

- Changed implementation and behavior reviewed: D-01, D-02 (SR-005 shape), D-03, D-05, D-06, D-07, D-08 (server, web, the RR-03 server-internal forms), D-10, D-11, D-12, D-13, D-14, D-16, D-17, D-18, D-19; baseline fix `709617b6eb`.
- Files / areas reviewed: `git diff 6225a734a3..af76ab7ff5` for all non-ticket files. Read in full: Android `TrustedNavigationPolicy`, `AutoByteusWebView`, `OpenPageRestore`, `MainActivity` (save/restore, `configChanges`), `NodeConnectionFlow`; web `remoteAccessReadRefusal`, `mobileNodeSessionStore`, `MobilePairedShell`, `MobileRunList`, the run-history store/load/selection/inspection actions, `useRunHistorySectionLoad`, `app.vue`, `useVncSession`, `MobileNodeDesktop`, `MobileNodeDesktopClipboard`, `workspacePathRefusal`, `runWorkspaceChoice`, `useMobileLaunchWorkspaces`, `stores/workspace.ts createWorkspace`, `plugins/30.apollo.client.ts` (default `errorPolicy`), `phoneSetupTextKey`, `PhoneWayTab`, `PhonesPanel`, `AgentEventMonitor`, `guard-localization-boundary.mjs`, a sample of the D-17 sites, `useLocalization`; server `workspace-folder-check`, `workspace-manager.createWorkspace`, the workspace resolver, `node-desktop-viewers`, `ip-address-ranges`, `server-address-candidate-service`; the six RR-03 `ensureWorkspaceByRootPath` call sites; changed E2E tests and probes; `docs/design-cases.md`.
- Explicit exclusions: 427's merged changes (reviewed in 427). I reran none of the recorded checks; the handoff's IMP-01…IMP-13 cover the current code. Probes, emulator checks and the fresh-start build are left to API/E2E, as the handoff says.

## Round 4 Review Of SR-008 (CRR-004)

Read in full at `35263117c9`:
- `mobileNodeSessionStore.checkCredential` and `readServerErrorCode`;
- `authorizedTransport.ts` (`authorizedFetch` = `fetchWithRemoteAccessCredential(…, activeCredential)`, and `activeCredential` = `session.credential`);
- `remoteAccessReadRefusal({ status, code })`;
- `MobilePairedShell.checkStatus` and its callers (mount, Retry, Check only; never the poll);
- the server route policy for phone GraphQL (`remote-access-route-policy.ts:203-205`, `authorizeMobileCredential`);
- the removal of `historyReadFailure`: `runHistoryStore.ts`, the selection and inspection actions and `useRunHistorySectionLoad.ts` are identical to base; `runHistoryLoadActions.ts` keeps only D-08's split;
- `OpenPageRestore.sharedTextToHandle` and `MainActivity.onCreate`;
- the new and changed specs.

**D-02 matches SR-008.** One small GraphQL read with this session's credential. 2xx → reachable. A refusal is classified by status and body `code` only. Anything else, or a network error → unreachable. The outcome comes only from that read. Both CRR-003 causes are gone: no `listsAnyRun` gate, no store state a poll can overwrite.

The design names `authorizedFetch`. The code calls `fetchWithRemoteAccessCredential` with `session.value.credential`. That is the same credential (`getActiveRemoteAccessCredential` returns `activeCredential = session.credential`), and it avoids the store importing the transport that imports the store. I accept it as equivalent.

**D-03 matches SR-008.** On a fresh start a shared text is handled (`savedInstanceState == null`). On recreation the share is not re-run, so the restore (or last used) applies. `onNewIntent` is unchanged. The native restore is unchanged. Run screens (AC-004b) are round 2 (DEC-013), as the narrowed REQ-003 says.

Candidates this round:

| Candidate ID | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-10 | The history load's read result (`RunHistoryReadResult`, `readHistory`'s `ok`/`cause`, `listsAnyRun`) has no production reader left | Principle 7; SR-008 replaced the path that read it | Promote → F-004 | its last consumer was removed by this change |
| C-11 | SR-008's replacement Case 5 text is not applied | DOC-013; design-spec D-13 (SR-008) | Promote → F-005 | the doc still describes the removed SR-005 design |
| C-12 | `fetchWithRemoteAccessCredential(…, session.credential)` instead of the designed `authorizedFetch` | design D-02 | Reject | the same credential; avoids an import cycle |
| C-13 | `fetchStatus` still sets `authorizedApiReachable=false` on a failed status read before the check records its outcome (a brief "Not reachable" during a Check) | the behavior before this ticket | Reject | not introduced here; the outcome is replaced when the check ends |
| C-14 | An activity recreated mid-pairing (share started, process killed before pairing completed) does not re-run the share | REQ-003 (SR-008: a re-delivered share is not re-run) | Reject | the intended rule; a new share still connects |
| C-15 | A non-JSON 403 (e.g. a proxy) | `readServerErrorCode` → `undefined` → `null` → unreachable | Reject | correct |


## API/E2E Failure-Origin Review (Round 3, CRR-003)

The failing scenarios still represent approved behavior:
- MSP-13 is AC-002: "phone checks (open, Retry, **Check**) → pairing screen".
- MSP-18 is AC-003: off + Check → bar/banner; off → unreachable shows "Can’t reach".
- API-08 is AC-004: same node, same Files URL after `am kill`.

Each starts from a supported trigger:
- revoke in Phone Setup (SCN-002);
- the Phone Access switch (SCN-003);
- Android ending the backgrounded process (SCN-004).

Each runs through the real phone bundle or the real APK. The tests are valid; none is stale or synthetic.

### F-API-001 — D-02: a Check on an open phone never sees its own read's failure

Verified in code:
- **Cause 1 (deterministic).**
  - `useRunHistorySectionLoad.ts:38` returns `{ ok: true }` whenever any run is listed (`… && !listsAnyRun()`).
  - A failed read leaves the earlier `workspaceGroups` in place: only the success path at `runHistoryLoadActions.ts:133` replaces them.
  - So on an open phone with runs, `MobilePairedShell.checkStatus` (`:114`) never calls `remoteAccessReadRefusal`. It records `reachable`, because the public status answered.
  - This guard predates the ticket (base `6225a734a3:…useRunHistorySectionLoad.ts:38`), and the 401 rule had the same gap at Check.
- **Cause 2 (race, needs the node down).**
  - A 5 s quiet poll (`refreshTreeQuietly`) increments `workspaceRequestGeneration` (`runHistoryLoadActions.ts:107`) while the Check's read waits up to 10 s in `waitForBoundBackendReady`.
  - The Check's catch then skips recording `error`/`historyReadFailure` (`:189`), after `:110-111` had cleared them.
  - `readHistory` therefore reports `ok`, and off → down shows Connected.

Origin: `Design Impact`.
- D-02 and DS-002 (SR-005) trace the refusal into `readHistory`'s `cause`, but not through the `ok` decision that gates it, nor through the read-generation rule that lets a quiet poll supersede a check.
- The implementation follows the design exactly.
- REQ-002 / AC-002 / AC-003 name the Check point explicitly, so this is in this ticket: an existing problem that blocks an in-scope AC (ticket-scope).

The fix needs a design decision. A check must learn the outcome of its own read, not infer it from store state that a poll can overwrite. Where that outcome lives is a shared-owner choice:
- the history store/load actions, which the desktop `RunSectionPanel` also uses;
- or the phone shell's check (for example a dedicated read).

A local patch to `listsAnyRun` or to the generation guard would change the desktop's display rule and poll-supersede semantics without a design.

Review gap:
- **Cause 1** should have been caught in source review. The invariant "a check's result reflects that check's own read" was checkable at `useRunHistorySectionLoad.ts:38`, the line the diff changed. Round 1 confirmed BEH-002 through `cause` without checking the `ok` gate for the normal open-phone state (runs listed).
- **Cause 2** was not reasonably detectable without tracing the poll timing.

### F-API-002 — D-03: the open page does not come back after process death

Verified:
- **Run B (launcher task).**
  - `OpenPageRestore` → `NodeConnectionFlow.open(entry, url)` loads exactly the saved URL, so the Android side works as designed.
  - The phone web shell keeps only the screen and file keys in `/mobile` (`useMobileNavigation`). The open run is store state, not URL state.
  - A fresh load of a run-scoped screen therefore lands on the list. That is 277's behavior: MSP-05, and the navigation's "a reload or a link has none" rule at `useMobileNavigation.ts:46-50`.
  - Design premise E-03 ("the WebView's current URL names the open page") is false for run screens.
- **Run A (share-started task).**
  - Android recreates the activity with its original `ACTION_SEND`.
  - `MainActivity.onCreate` handles shared text before the restore (`:86-88`), the RR-02 decision. So a phone paired by sharing sees "This code has expired" after every process death.

Origin: `Design Impact`, with a requirement question for the Solution Designer.
- Making run screens reopen from a URL changes 277's approved "reload lands on the list" behavior.
- Telling a re-delivered SEND (`savedInstanceState != null`) from a new share revisits RR-02 and REQ-003's "shared pairing links still win".

This was not reasonably detectable in source review of the Android delta. The false premise lay in an unchanged web module and was carried as investigation evidence. RR-02's consequence for a share-started task was a design decision that review accepted.

### Classification And Routing

| Finding | Origin | Classification | Owner |
| --- | --- | --- | --- |
| F-API-001 | Design premise incomplete (D-02/DS-002 stop at `cause`; `ok` gate and poll-supersede not designed); an existing guard blocks an in-scope AC | `Design Impact` | Solution Designer |
| F-API-002 | Design premise E-03 false for run screens; RR-02 yields the expired-code screen for share-started tasks | `Design Impact` (+ requirement question: 277's reload rule vs REQ-003; RR-02) | Solution Designer |

- Not implementation defects. Not test, fixture or environment problems. Not unrelated existing problems: both keep in-scope ACs from passing.
- The other API/E2E results stand. Those are AC-001, 005, 006, 007, 008, 010–014, 016–019, the full suites and the fresh build.
- After the revision, implementation, source review and API/E2E rerun the affected parts: MSP-13, MSP-18, API-08 and the full web suite.
- API/E2E's durable test changes get the proportional test-code review after a passing execution, not in this round.
- No new follow-up from this review. FU-003 was added by API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes` (round-1 REQ/AC rows, DEC-001…DEC-011).
- Design-spec behavior map verified against the implementation: `Yes`, per row below.
- Design review report and round confirmed: ARCH-REV-002 (SR-004), ARCH-REV-003 (SR-005, D-02 revised), ARCH-REV-004 (SR-006, D-19); all Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. The two D-05 feedback choices (the sheet closes after a send; the button reads "Copied") sit inside REQ-005 and add no behavior.
- Remaining material ambiguity: none blocking. D-13's Case 17 "fix" wording is for the Solution Designer to confirm (residual).

| Behavior ID | Status | Implementation Path And Lifecycle Evidence | Notes |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `app.vue` `definitionFeedEnabled = isAppReady && (!isMobileRemoteAccessRuntime() \|\| isPaired)` → existing feed retain/release | — |
| BEH-002 | Confirmed (round 4, SR-008) | `MobilePairedShell.checkStatus` (mount, Retry, Check) → `Promise.all[checkCredential, fetchStatus (diagnostic), history load (content)]` → `checkCredential`: `POST <serverBaseUrl>/graphql {PhoneCredentialCheck}` with `Bearer session.credential` → 2xx reachable / `remoteAccessReadRefusal({status, code})` / unreachable → `session_rejected` → `rejectLocalSessionForAuthFailure()`; else `recordCheckOutcome` → `connection` → `MobileRunList` | Runtime rerun of MSP-13 and MSP-18 is owed to API/E2E |
| BEH-003 | Confirmed for AC-004a (round 4, SR-008); AC-004b is round 2 | `onCreate`: `sharedTextToHandle(shared, recreated = savedInstanceState != null)` → `OpenPageRestore.read` → `flow.open(entry, url)` → last used → start; `onNewIntent` unchanged | RR-02 is superseded by SR-008. API-08 rerun owed |
| BEH-005 | Confirmed | `useVncSession` `clipboard` listener (current session only), cleared on disconnect/stop; `sendClipboardText` only in Control + connected; the sheet is shown only in Control + connected; copy runs only on tap | Known noVNC secure-origin risk recorded by implementation |
| BEH-006 | Confirmed | `admit(viewer, stream, mode)` → `refuse()` logs reason, limit, mode, viewer kind, open, max; no device ID, credential or address | Matches the module's existing `console.*` convention |
| BEH-007 | Confirmed | `classify(url, entry, isMainFrame)`: `blob` → inner URL must be http(s) same-origin and `!isMainFrame`; else Block. `loadTrusted` passes `true`; client passes `request.isForMainFrame`; deprecated overload removed | `isSameOrigin` shared by both rules; emulator AC-007 still required (RR-01) |
| BEH-008 | Confirmed | `createWorkspace`: neither active nor registered → `assertWorkspaceFolder(raw input)` → `WorkspacePathRefusedError` → resolver `GraphQLError WORKSPACE_PATH_REFUSED {reason}` → `readWorkspacePathRefusal` (phone field, desktop launch error) / `null` (restore through `ensureRunHistoryWorkspaceByRootPath`). Server-internal forms go through `ensureWorkspaceByRootPath` → `createWorkspace` (canonical absolute path) | Registered IDs skip the check (DEC-004). Project metadata's own `WORKSPACE_PATH_INVALID` is a separate reference check ("never inspect a folder"), not a duplicate |
| BEH-010/011/014 | Confirmed | B04 counts "Customized" rows; `waitForDevServerReady` after `alpha.start()`; AR-14 waits on `checkedAt` moving, label built after the wait fails | — |
| BEH-012 | Confirmed | docs name `CollaborationMessageReferenceViewer` | — |
| BEH-013 | Confirmed (F-005 resolved, round 5) | Case 5 carries D-13's SR-008 text verbatim; the heading lists autobyteus-426, SR-005, SR-008; Case 17 present | — |
| BEH-016 | Confirmed | `phoneSetupTextKey(kind, path)` explicit list → `remote.<path>`; both components pass `{ name }` | — |
| BEH-017 | Confirmed | sites pass `resolvedLocale`; utilities read `useLocalization()` at use (it is a module-level runtime, safe outside setup); guard's new rule covers dirs + `utils/`, tests excepted | — |
| BEH-018 | Confirmed | `classifyInterfaceAddress` uses `ip-address-ranges`; public appended after the loop; link-local skipped | — |
| BEH-019 | Confirmed | status block on `filePreviewStatus` outside `!readOnly`; composer slots and notice stay inside | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | BEH-002 | User | desktop user revokes a phone | cut a lost phone off | Phone Setup revoke → phone check | Normal | node 403 `REMOTE_ACCESS_DEVICE_REVOKED` → Apollo `networkError.result.code` → `session_rejected` | pairing screen | REQ-002, IMP-02 | Supported Normal | Use |
| SCN-003 | BEH-002 | User | desktop user turns Phone Access off | pause phones | switch → phone check | Normal | 403 `PHONE_ACCESS_DISABLED` → `phone_access_off` | bar/banner, session kept | REQ-002 | Supported Normal | Use |
| SCN-004 | BEH-003 | System | Android | memory pressure | process death → recents | Normal | DS-003 | same page | REQ-003 | Supported Normal | Use |
| SCN-005 | BEH-005 | User | phone user | move text | Clipboard tap | Normal | DS-004 | text moved | REQ-005 | Supported Normal | Use |
| SCN-007 | BEH-007 | User | phone user | HTML preview | preview open | Normal | DS-006 | sandboxed preview | REQ-007 | Supported Normal | Use |
| SCN-008 | BEH-008 | User/Contract | phone/desktop user; server-internal launches | open a folder by path | path field, New chat, run launch | Normal | DS-007 | refused with reason or registered | REQ-008, RR-03 | Supported Normal | Use |
| SCN-012/013/011/014 | BEH-017/018/016/019 | User | per requirements | per requirements | per requirements | Normal | per design | per AC | requirements | Supported Normal | Use |
| DOC-013 | BEH-013 | Contract | Solution Designer (design-case owner) | record design lessons | `docs/design-cases.md` | Normal | D-13 text | the texts the design gives | design-spec D-13, SR-005 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `remoteAccessReadRefusal` also classifies the two new codes by message text (`message.includes('PHONE_ACCESS_DISABLED')`; `REMOTE_ACCESS_DEVICE_REVOKED` added to the 401 regex) | SR-005 / ARCH-REV-003 contract: the new codes come only from `networkError.result.code` / `response.data.code`; the message fallback is kept "for the 401 and auth codes"; option C (code in message text) rejected | SCN-002 / SCN-003 check | No supported path yields such a message: Apollo's is "Response not successful: Received status code 403", axios's "Request failed with status code 403" (IMP-02), and `historyReadFailure` always carries the object. The branches are unreachable for the supported shapes, untested, and they would end a session (credential drop, the High-risk item) on message text, which is the classification ARCH-REV-003's pass relied on not existing | `remoteAccessReadRefusal.ts:41-45`; `design-review-report.md:248-250`; design-spec D-02 | Promote | This ticket | F-001: remove both message-text additions; keep today's 401/auth-code fallback |
| C-02 | `resolveRunWorkspaceChoice` keeps `workspaceId: string \| null`, `workspaceId ? … : null` and `!workspaceId` after `findOrRegisterWorkspaceByRootPath` became `Promise<string>` (throws instead of null) | Principle 7 (dead code in touched files) | desktop folder launch | the null branch can no longer be taken; reads as if null were still a result | `runWorkspaceChoice.ts:114-125`; `runHistoryLoadActions.ts:467-499` | Promote | This ticket | F-002 |
| C-03 | Stray blank line added inside the catalog-guard loop | engineering hygiene | — | no behavior; noise in a build-input diff | `guard-localization-boundary.mjs:71` | Promote (folded into F-002) | This ticket | drop it |
| C-04 | D-13 Case 5 lacks the design's third text (426 SR-005/IMP-02: trace an error through the real client library and every store that keeps it) | DOC-013; design-spec D-13 ("Case 5 also gets, from this ticket: …"); SR-005 "Design case" line | doc read | the lesson of this ticket's own Design Impact is not recorded | `grep -n "autobyteus-426" docs/design-cases.md` → only the Case 17 mention | Promote | This ticket | F-003 |
| C-05 | After Phone Access off, a later quiet poll success does not clear "Phone access off" until the next check | REQ-002 keeps the quiet poll unchanged | — | same as today's `authorizedApiReachable` | REQ-002 Preserved | Reject | — | preserved behavior |
| C-06 | Folder launch with an empty root path now reaches the node and is refused `not_absolute` instead of the old early `null` | — | no UI produces a folder choice with an empty path | — | `runWorkspaceChoice` callers | Reject | — | not reachable |
| C-07 | Activity recreated by a non-rotation config change (e.g. dark mode) now restores the open page | REQ-003 intent | system config change | reopens the same page | manifest `configChanges` | Reject | — | consistent with the intent, not a defect |
| C-08 | `WORKSPACE_PATH_REFUSED` also reaches the Apollo error link's `uiErrorStore` | — | path refusal | shown only in the debug panel (`showDebugErrorPanel`) | `app.vue:11` | Reject | — | no user-visible effect |
| C-09 | IPv4-mapped IPv6 interface address would classify as `public` | — | `os.networkInterfaces` does not report mapped addresses | — | Node API | Reject | — | not reachable |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | handoff § Task Design Health; bounded refactors (range owner, find-or-register split) done as designed | — |
| Matches behavior-defining supplements | Pass | `REMOTE_WORDED_PATHS` = the spec's line set; catalog spec + IMP-13 | — |
| Data-flow spine preservation | Pass | DS-001…DS-009 traced as above | — |
| Ownership boundary preservation | Pass | policy stays the one navigation owner; `WorkspaceManager` owns the invariant; the resolver only maps the error | — |
| Off-spine concern clarity | Pass | `OpenPageRestore`, `workspace-folder-check`, `workspacePathRefusal`, `phoneSetupTextKey` each serve one owner | — |
| Existing capability reuse | Pass | `MobileBottomSheet`, `ip-address-ranges`, `useLocalization`, the existing guard | — |
| Reusable owned structures | Pass | one range owner; one refusal reader for two web surfaces | — |
| Shared-structure tightness | Pass | `NodeDesktopAdmission` refused variant, `MobileCheckOutcome`, `MobileRunListConnection`, `WorkspacePathRefusalReason` | — |
| Repeated coordination ownership | Pass | `recordCheckOutcome` sets both facts in one place | — |
| Empty indirection | Pass | `ensureRunHistoryWorkspaceByRootPath` is the designed `catch → null` facade | — |
| SoC / file responsibility | Pass | clipboard sheet in its own component; remote catalog in its own file | — |
| Dependency direction | Pass | `server-addressing → remote-access/services/ip-address-ranges`; `OpenPageRestore → policy` | — |
| Authoritative Boundary Rule | Pass | the sheet uses `useVncSession` only; no caller reaches past `WorkspaceManager` or the policy | — |
| File placement | Pass | new files next to their owners | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `classify(url, entry, isMainFrame)` explicit frame; `findOrRegister…` throws vs. facade returns null | — |
| Naming / one vocabulary | Pass | `public`, `WORKSPACE_PATH_REFUSED`, `phone_access_off` used the same everywhere | — |
| No unjustified duplication | Pass | duplicate IP checks removed | — |
| Patch-on-patch control | Pass | the SR-005 revision is implemented cleanly, not layered | — |
| Dead code removed in touched files | Pass | round 2: the null branch in `runWorkspaceChoice` and F-001's message branches are removed | — |
| Test scenarios and assertions clear | Pass | specs use Apollo's real 403 shape; refusal spec, store spec, run-list states, policy +2 cases, restore 5 cases | — |
| Test fixtures/helpers reusable and coherent | Pass | `dev-server-ready.mjs` shared helper; delegation fixture now creates its folder | — |
| No stale/duplicated tests | Pass | B04 constant assertion replaced; old auth-failure spec renamed | — |
| API/E2E readiness | Pass | handoff lists the probe, emulator and fresh-build work with concrete steps | — |

## Source File Size And Structure Audit

Effective lines = non-blank, non-comment lines.

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryStore.ts` | 486 | 487 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | 459 | 469 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-android/.../MainActivity.kt` | <348 | <360 (physical) | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` | <220 | <242 (physical) | Pass | Pass | Pass (sheet split out) | Pass | — | — |
| all other changed source files | — | each <250 physical | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy old-behavior retention | Pass | `isRemoteAccessAuthFailure`, `recordAuthorizedApiReachability`, `connected` prop, `isLanIp`/`isTailnetLikeIp`, the deprecated WebView overload all removed |
| Dead code removed in touched files | Pass | F-001 and F-002 resolved in `1d2cdd15ab` |
| Persisted-data decision followed | Pass | `Not Affected`; registry only read; Bundle transient; `historyReadFailure` in memory |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `remoteAccessReadRefusal.ts:43` `message.includes(PHONE_ACCESS_OFF_CODE)` and `REMOTE_ACCESS_DEVICE_REVOKED` in the regex at :44 | DormantPath | no supported failure shape carries the code in its message (IMP-02); untested | contradicts SR-005/ARCH-REV-003 | F-001 |
| `runWorkspaceChoice.ts:114-125` `string \| null` typing, `workspaceId ? … : null`, `!workspaceId` | DeadCode | `findOrRegisterWorkspaceByRootPath(): Promise<string>` | null no longer a result | F-002 |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: D-12 and D-13 are doc items; D-13 is incomplete (F-003).
- Files or areas likely affected: `docs/design-cases.md` (Case 5). Delivery syncs other docs as usual.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Status | Note |
| --- | --- | --- |
| R-01 (AR-14 re-check never ends) | No Longer Relevant | IMP-05: ends ~108 ms after the update |
| WebView reports `isForMainFrame=false` for the preview frame (escalation b) | Confirmed in code; runtime proof pending | emulator AC-007 (API/E2E) |
| RR-01…RR-03 | Confirmed | RR-03's six forms reach `createWorkspace`; one form covered by the new E2E |

New or reclassified premises: `None`.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | every DS traced end to end in code as designed | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | single owners kept (policy, manager, refusal rule, session store) | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | explicit frame argument; throwing finder vs null facade | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | sheet, restore, folder check, text key each in their own file | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | tight unions; `historyReadFailure` set/cleared only with `error` | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | consistent vocabulary; `workspaceId` now typed `string` | — | — |
| 7 | API/E2E Readiness | 9.3 | clear list of probes, emulator checks and the fresh build | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | SR-008's check reads its own request; both CRR-003 causes are removed by construction; D-03 re-delivery rule as designed | runtime proof (MSP-13/18, API-08) is still owed to API/E2E | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | all designed removals done | — | — |
| 10 | Cleanup Completeness | 9.4 | `historyReadFailure`, the Apollo/axios shapes and the message text are removed; the dead read result (F-004) and the stale Case 5 text (F-005) are gone | — | — |

## Findings

### F-001 — The read-refusal rule classifies the two new codes by message text (Resolved in round 2)

- Round 2: `1d2cdd15ab` restores the fallback to exactly `/\b401\b|REMOTE_ACCESS_AUTH_REQUIRED|REMOTE_ACCESS_AUTH_INVALID/`. The new codes are read only from `networkError`/`response`. Two spec lines assert that a bare message naming either code returns `null`. IMP-14: 52/52.

- Where: `autobyteus-web/utils/remoteAccess/remoteAccessReadRefusal.ts:41-45`.
- What: after the status/code checks, the fallback adds `if (message.includes(PHONE_ACCESS_OFF_CODE)) return 'phone_access_off'` and puts `REMOTE_ACCESS_DEVICE_REVOKED` in the 401/auth-code regex.
- Basis: design-spec D-02 (SR-005): "keeps today's message fallback for the 401 and auth codes"; option C ("behavior by message text") rejected. ARCH-REV-003 passed the revision with "no classification by message text for the new codes" (`design-review-report.md:250`). REQ-002 / AC-002 (revoked → session rejected) is the credential drop this ticket rates High.
- Consequence: no supported failure carries these codes in its message (IMP-02: Apollo "Response not successful: Received status code 403"; axios "Request failed with status code 403"), so the branches are unreachable and untested. They leave a credential-ending decision keyed on text, and they contradict the condition the High-risk review passed on.
- Required action: remove the `PHONE_ACCESS_DISABLED` message check and drop `REMOTE_ACCESS_DEVICE_REVOKED` from the regex, so the fallback is exactly today's 401 / `REMOTE_ACCESS_AUTH_REQUIRED` / `REMOTE_ACCESS_AUTH_INVALID` rule. Optionally add a spec line showing that a bare message naming either new code returns `null`. The existing spec stays green.

### F-002 — Leftover null handling and a stray line in touched files (Resolved in round 2)

- Round 2: `workspaceId: string`; metadata resolved unconditionally; only `!workspaceMetadata` throws; the blank line is removed. IMP-14 typecheck: production 0, test files at baseline 96.

- Where: `autobyteus-web/services/workspace/runWorkspaceChoice.ts:114-125`; `autobyteus-web/scripts/guard-localization-boundary.mjs:71`.
- What: `findOrRegisterWorkspaceByRootPath` now returns `Promise<string>` and throws on failure, but the caller still declares `workspaceId: string | null` and tests `workspaceId ? … : null` / `!workspaceId`. The guard diff adds an empty line inside the unchanged catalog loop.
- Basis: Principle 7 (dead code in touched files).
- Required action: type `workspaceId` as `string` (or assign it in the `try` and use it directly), resolve metadata unconditionally, and keep only the `!workspaceMetadata` check. Remove the blank line.

### F-003 — D-13: Case 5 lacks this ticket's own lesson (Resolved in round 2)

- Round 2: the "Again in autobyteus-426 (SR-005, IMP-02)" bullet now carries D-13's text verbatim, and the heading list gains "autobyteus-426, SR-005".

- Where: `docs/design-cases.md` Case 5.
- What: design-spec D-13 gives three texts. The 277 Case 5 bullet and Case 17 are present. The third text is missing ("Case 5 also gets, from this ticket: autobyteus-426 (SR-005, IMP-02): the phone's refusal rule was designed on the error shape its own unit spec used … trace an error from the server to the code that reads it through the real client library and every store that keeps it, not through the shape a test builds."). SR-005's "Design case" line records the same intent.
- Required action: add it as an "Again in autobyteus-426 (SR-005, IMP-02)" bullet in the file's form. Add `autobyteus-426, SR-005` to the Case 5 heading list, as was done for 277.

### F-004 — The history load's read result has no consumer left (Resolved in round 5)

- Round 5: `c8b4b659cd` removes `RunHistoryReadResult`, `listsAnyRun` and `readHistory`'s ok/cause; `load`/`initialLoad` settle `void`; `fetchTree().catch` keeps the old non-rejecting shape; the specs follow. IMP-16: 279/279; typecheck at baseline; no remaining hits.

- Where: `autobyteus-web/composables/runHistory/useRunHistorySectionLoad.ts`:
  - `RunHistoryReadResult` (:10);
  - `listsAnyRun` (:27-29);
  - `readHistory`'s `ok`/`cause` result (:32-40);
  - `load`/`initialLoad` typed with it (:43, :55-57).
- Evidence: `MobilePairedShell.checkStatus` was the only reader of that result, at base as the E-27 401 rule (`6225a734a3:MobilePairedShell.vue:106-113`). It now awaits the load only for timing (`.catch(() => undefined)`) and ignores the value. `RunSectionPanel` never read it. A search of components, composables, pages and stores finds no other reader. Only `useRunHistorySectionLoad.spec.ts` (:42, :85-96) and the shell spec's `load` mocks still use it.
- Basis: Principle 7. Code only its own tests call is dead, and so are paths this change replaces: SR-008 replaced the history-read-decides-the-check path. This change removed the last consumer, so the dead result belongs to this ticket. It also keeps the very `ok`-while-runs-are-listed rule that misled F-API-001 ready for a future reader.
- Required action:
  - Make `readHistory` / `load` / `initialLoad` resolve `void`. Drop `RunHistoryReadResult` and `listsAnyRun`. The reads, catalog/definitions loads, window and polling stay exactly as they are, so desktop and phone behavior do not change (the design's "the shared history load keeps its pre-ticket behavior" holds).
  - Update `useRunHistorySectionLoad.spec.ts` and the shell spec's `load` mocks accordingly.
  - Record the removal in the handoff's removal list.

### F-005 — D-13: SR-008's replacement Case 5 text is not applied (Resolved in round 5)

- Round 5: the bullet is replaced verbatim with D-13's SR-008 text, and the heading is extended.

- Where: `docs/design-cases.md:95`, and the Case 5 heading.
- What: design-spec D-13 (SR-008) says "**Replace the 426 Case 5 paragraph (SR-008) with:** 'autobyteus-426 (SR-005, SR-008; IMP-02, CRR-003): twice the phone design traced a value but not the code that decides with it. … Lesson: trace a value to the decision that consumes it, through the real library and every store and poll that can replace it; and a check should read the outcome of its own request.'" SR-008 also lists "D-13's 426 lesson rewritten". The file still has the SR-005 text, which now describes a design that was removed.
- Required action: replace the bullet with the SR-008 text in the file's "Again in" form, and extend the heading's 426 entry to "autobyteus-426, SR-005, SR-008".

## Follow-ups

- Follow-ups this review added: None. FU-001 and FU-002 stand as recorded.

## Classification

- Round 5 (current): none; the review passes. Round 4's `Local Fix` items F-004 and F-005 are resolved. Round 3's `Design Impact` F-API-001 and F-API-002 are answered in code by SR-008, with runtime proof owed to API/E2E. Rounds 1–2: F-001…F-003 resolved.

## Recommended Recipient

- Round 5 (current): `/software_engineering_team/api_e2e_engineer` (primary pass handoff: rerun MSP-13, MSP-18, API-08 and the full web suite); an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- D-07: the runtime frame flag (`isForMainFrame=false` for the preview iframe) and AC-007's `window.AutoByteusShell === undefined` are proven only on the emulator (RR-01). API/E2E must keep that check.
- D-05: noVNC on a secure origin writes the clipboard itself, and Copy stays disabled there (the implementation's known risk). U-01 (`execCommand('copy')` on `http://`) needs the emulator.
- D-08: server-internal launches into a removed, unregistered folder now fail earlier with the folder reason (RR-03, accepted). The full server E2E suite has not been run since D-08. API/E2E should run it, because several suites register workspaces.
- D-13: the Case 17 "fix" line comes from E-09. The Solution Designer may want to confirm it.
- The fresh-start desktop build is still owed, because `guard-localization-boundary.mjs` changed.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average. Every category is at or above 9.3.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: F-004 and F-005 are resolved. D-02 and D-03 are implemented as SR-008 designs them. Runtime proof for AC-002 and AC-003 (Check) and AC-004a is owed to API/E2E. Medium / High is unchanged.
