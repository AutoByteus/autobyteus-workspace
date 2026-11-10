# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 4, CRR-004). History: round 1 Implementation Review (CRR-001 Fail, CR-001); round 2 Targeted Delta Review (CRR-002 Pass); round 3 API/E2E Failure-Origin Review (CRR-003, CR-002, CR-003).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005, Approved; REQ-003 rewritten per DEC-019, AC-004-1 on API 34 per DEC-020, REQ-013/REQ-014 per SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005, Ready)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Relevant Solution Revision IDs: `SR-002` … `SR-005`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004 for SR-004, ARCH-REV-005 for SR-005; residual: keyboard on API 26–29)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002` … `ARCH-REV-005`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001` … `IR-004`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: `4`
- Review Scope: `Full Re-Audit` of the delta since round 2
- Review Scope Evidence (round >1): the changes since CRR-002 spread beyond the prior findings' files: two new items in new areas (IR-003: server delegation placement and refusal texts; web Activity item), the item-2 probe and words (CR-003) and the Android full-screen controller (CR-002) plus instrumented tests. All structural checks were rerun for these files; evidence for code unchanged since round 2 is carried forward.
- Trigger: IR-003 (`432d1c3af2`, items 13–14, SR-004 / ARCH-REV-004) and IR-004 (`9ee362778e`, `7e53b46d80`, `06a072014f`; CR-002/CR-003 rework, SR-005 / ARCH-REV-005), handed off together
- Prior Review Round Reviewed: `3` (CRR-003, failure-origin, Design Impact CR-002, CR-003)
- Latest Authoritative Round: `4`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: read as context for F1/F2 (`API-REV-001`); not under review this round
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A (implementation review)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435`, base `310fc27452`, HEAD `b5da2d15a0` (documents and evidence). Reviewed code by round: 1 `e5ca0e1da7`, `6ca743fee0`; 2 `d0943a71ac`, `f9cb6f7153`; 4 `432d1c3af2`, `9ee362778e`, `7e53b46d80`, `06a072014f`. API/E2E's `a380fc419f` (MSP-33…35) is not reviewed here; it gets the proportional test-code review after a passing API/E2E round.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Twelve bounded deltas in existing owners; the High drivers (retry decision in five stream owners plus a page-wide close; a new phone route key and page-start restore; a GraphQL answer whose meaning changes for inactive hosts) are real in the code. No correction.

## Review Scope

- Changed implementation and behavior reviewed: rounds 1–2 cover the twelve items (BEH-001…BEH-012). Round 4 covers BEH-013 and BEH-014 (new), BEH-002 (CR-003 rework) and BEH-004 (CR-002 rework).
- Round 4 files: server `catalog-delegation.ts` (`DelegationSourceIndexPort.agentAddressOf`, self check before own-team), `collaborator-errors.ts` (`selfDelegationRefusedMessage`), the three indexes' existing `agentAddressOf`, the three placement callers (`agent-org-recipient-resolver.ts`, `team-run-message-delivery.ts`, `standalone-root-recipient-resolver.ts`), tests and four server docs; web `SystemInstructionActivityItem.vue` + spec; `nodeIdentityProbe.ts` (`refusalCodeOf`, `host_refused`), `nodeConnectionErrorText.ts`, en/zh-CN `nodesPage.ts`, `docs/settings.md`, specs; Android `DesktopFullScreenController.kt` (`setDecorFitsSystemWindows`), unit tests, `WebShellWindowInsetsTest`, and the baseline fixes to `SystemBarInsetsTest` and `DesktopFullScreenWindowTest`; IMP-16…IMP-20.
- Files / areas reviewed: `app.vue`; `utils/nodeIdentityProbe.ts`, `nodeConnectionErrorText.ts`, localization; `services/liveStreamLifecycle/{credentialRefusalClose,closeAllLiveStreams}.ts`; `WebSocketClient.ts`, `agentRunCollaborationStreamingService.ts`, `agentOrgStreamingService.ts`, `FileExplorerStreamingService.ts`; stores `agentRunStore`, `agentTeamRunStore`, `agentRunCollaborationStore`, `agentOrgContextsStore`, `runHistoryStore`, `mobileRunOpeningStore`; `MobileRemoteAccessShell.vue`, `MobilePairedShell.vue`, `MobileNodeDesktopClipboard.vue`; `useMobileNavigation`, `useMobileRunOpening`, `useMobileRunTree`, `useMobileSubjectRestore`, `useRunHistorySectionLoad`; `runListProjection.ts`; server `standalone-agent-run-root-manager.ts`, GraphQL type, key importers; contracts `root-execution-view-dtos.ts`; Android `DesktopFullScreenController`, `SystemBarInsets`, `WebShellScreen`, `MainActivity`, `ConnectionDiagnosticMapper`, `ConnectionValidator`, `AutoByteusWebView`, `NodeConnectionFlow`; probe `mobile-shell-probe.mjs`; the new and changed specs. Production paths read beyond the diff: `MobileRunScreen.vue`, `mobileRunTreeProjection.ts`, `runListStore.showRun`, `agentRunOpenCoordinator.ts`, `runHistoryLoadActions.ts`, `useMobileRunSetupController.ts`, `useMobileRunLaunchCoordinator.ts`, `agentContextsStore.createRunFromTemplate/promoteTemporaryId`, `agentRunStore.sendUserInputAndSubscribe`.
- Round 2 delta reviewed: `useMobileRouteRunSync`, `useDraftRunPromotionRouteSync` (moved), `useMobileNavigation.replaceRowKey`, `agentRunIdOfRowKey`, the restore's host parse, `MobilePairedShell` mount, `pages/chat.vue` import; the new/changed specs (`useMobileRouteRunSync.spec.ts`, the moved D-13 spec, the shell's reload-before-send case) and IMP-13…IMP-15.
- Explicit exclusions: no check rerun. IMP-01…IMP-12 cover code unchanged since round 1; IMP-13…IMP-15 ran on the rework commit.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-002; REQ-001…REQ-012, AC-005-1…7 incl. DEC-014/015).
- Design-spec behavior map verified against the implementation: Yes, by the trace below.
- Design review report and round confirmed: ARCH-REV-002 Pass (AR-001…AR-004 resolved).
- Behavior-basis status: `Confirmed` (round 2: BEH-005 entry form 2 corrected by SR-003 DS-006b and implemented).
- Changed or newly discovered behavior: SR-003 DEC-016 / AC-005-8 (reload before the first send shows the list).
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `app.vue` `showsServerOverlays = isEmbeddedWindow && isElectronEnvironment()`; `isAppReady` unchanged; IMP-10 shows no health request | — |
| BEH-002 | Confirmed | `probeNodeIdentity`: timeout returns at once; other failures ask `answersOpaquely` with the same URL/timeout; `causeText` picks desktop/page words by `isElectronEnvironment()` | — |
| BEH-003 | Confirmed | function, spec lines and two unproduced kinds removed; `dateUtils.ts` deleted | — |
| BEH-004 | Confirmed | `setOn` sets the cutout mode (API ≥ 28, by `sdkInt`) and re-applies insets after orientation is set, so `isOn` (read from the window) is already true when `SystemBarInsets` asks `typesFor(fullScreen())` | — |
| BEH-005 | Confirmed (round 2) | Entry form 1 (row tap) and the restore (steps 1–7) confirmed: `restoring` is set in setup before the shell's immediate watch; `firstCheck` + `nextTick` + `isCurrent()`; readiness per row kind; `cancel` on the list exits; reopen via `settle`. Entry form 2 (round 2): Create run names `agent:temp-…`; at the first send `promoteTemporaryId` re-keys the same context and moves the selection; `useDraftRunPromotionRouteSync` (the desktop D-13 rule, moved not copied) sees selection R→P with `getRun(P)` the displayed context and calls the phone's `replaceRouteRunId`, which records R→P and `replaceRowKey(agent:P)` on the current entry; a later route change to a recorded `agent:R` (Back to an entry pushed before the send) is replaced too. Before the send a reload finds no listed row → list (AC-005-8). IMP-14 rendered both. | Round 1 CR-001 (resolved) |
| BEH-006 | Confirmed | `[@media(max-height:320px)]` row layout; `scrollIntoView` on focus and on resize while focused; listeners removed on blur/unmount | — |
| BEH-007 | Confirmed | `fromHttpStatus(code, nodeName)`, DEC-006 words verbatim; both callers pass `entry.shownName` | — |
| BEH-008 | Confirmed | `pendingPairing` keeps the `Attempt`; `retryUrlFor(entry)` returns its URL only for the same entry ID; cleared on `onPaired` | — |
| BEH-009 | Confirmed | `isCredentialRefusalClose` used by all five owners, each keeping its own final codes; `closeAllLiveStreams` calls registry actions only; shell calls it on `isPaired` true→false; re-pair reopens because open paths call `connectToAgentStream` again (`agentRunOpenCoordinator.ts:125-126`, `runHistoryLoadActions.ts:325-342`) | — |
| BEH-010 | Confirmed | server answers `closedTaskExecutionsIn(root identity)` for inactive hosts (port wired in production, `general-process-run-supervisor.ts:271`); client stopped-host rule with `stoppedHostRereads`, cleared on release | — |
| BEH-011 | Confirmed | one export in contracts; local definitions and private `referenceKey` removed | — |
| BEH-012 | Confirmed | guide note | — |
| BEH-002 (round 4) | Confirmed | `probeNodeIdentity`: a readable 403's code is read from a clone (`refusalCodeOf`). `NODE_NETWORK_REFUSED` gives `network_refused`, and `REMOTE_ACCESS_HOST_REFUSED` gives `host_refused` with the existing `cause.hostRefused` words; both are checked before `!response.ok`. Any other 403 or a non-JSON answer stays `not_autobyteus`. A thrown request still makes the opaque second request, which gives `window_refused` with the page words. The `isElectronEnvironment` branch and the desktop-only key are gone. `NodeProbeCause` gains `host_refused`; its consumers (`nodeRowStatus`, `causeText`) handle it. AC-003-3 holds: no second request after success, a readable answer or a timeout | Round 3 CR-003 (resolved) |
| BEH-004 (round 4) | Confirmed (source); API 34 measured by implementation (IMP-20), API-18 to rerun | `setOn` order: orientation, bars, cutout (API ≥ 28), decor fitting (`WindowCompat.setDecorFitsSystemWindows(window, false/true)` on API < 35 only), root colour, `reapplyInsets`. Off restores the decor's fitting, so screens outside full screen on API 26–34 lay out exactly as before (autobyteus-277 REQ-011); API 35 is never touched. Unit tests cover each API range and the call order. `WebShellWindowInsetsTest` measures the real window on API 34 and 29: in full screen the root is the screen width and the keyboard alone pads it | Round 3 CR-002 (resolved) |
| BEH-013 (new, SR-004) | Confirmed | `resolveDelegationPlacement` compares the canonical address (each caller's `requireAddress`/`requireNonRootAddress`) with `port.agentAddressOf(sender)` before `isOwnTeamAddress`; the code stays `COLLABORATION_SELF_TARGET_REJECTED`; all three indexes already implement `agentAddressOf` (`agent-org-execution-index.ts:125`, `team-execution-index.ts:152`, `standalone-root-execution-index.ts:130`). The words are REQ-013's, and teammate and own-Team words are unchanged (tests: placement, vocabulary, Org, standalone, Team integration) | — |
| BEH-014 (new, SR-004) | Confirmed | `<pre>` loses `max-h-80`, `overflow-auto`, `tabindex` (DEC-018); keeps `whitespace-pre-wrap [overflow-wrap:anywhere]`, monospace, `select-text`; collapse stays on the header; IMP-17 rendered on phone and desktop | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005 (Create run form, AC-005-6, AC-005-8) | BEH-005 | User | Phone user | Come back to the run just created after a reload | New run → Create run → first message → Messages/VNC Viewer → reload | Normal | round 1: route kept `agent:temp-…` → list (CR-001). Round 2: `onLaunched(temp)` → send → `promoteTemporaryId` → `useMobileRouteRunSync` → `replaceRowKey(agent:P)` → views carry `agent:P` → reload → restore reopens P; before the send → list | Same run's same screen | AC-005-6 (approved); code paths cited above | Supported Normal Scenario | Use |
| SCN-005 (tap form, AC-005-1/3/5/7) | BEH-005 | User/System | Phone user / Android | Same | Reload, process-death restore | Normal | as DS-006 restore | Same subject/screen; list when gone or unreadable | IMP-11, specs | Supported Normal Scenario | Use |
| SCN-009 | BEH-009 | System | Node / phone | Stop refused retries | Revoke, Unpair | Normal | DS-003, DS-004 | No refused request | IMP-01 vs IMP-10 | Supported Normal Scenario | Use |
| SCN-010 | BEH-010 | System | Task Manager | Rows follow closure | Task DONE/reopen | Normal | DS-007 | Rows leave/return | server + store specs | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Create run writes the draft's `temp-*` ID into the route `row`; promotion to the node's run ID never updates it | SCN-005 Create run form, AC-005-6 | User taps Create run, sends the first message, reloads | Reload finds no `agent:temp-…` row (drafts are memory-only; the promoted run is listed under its real ID) → the list, not the created run's screen. AC-005-6 fails on the real path | `useMobileRunLaunchCoordinator.ts:50-53`; `agentContextsStore.ts:90-111,160-173`; `agentRunStore.ts:214-223`; `MobilePairedShell.vue` `onLaunched`; no route update on promotion anywhere in `components/mobile`/`composables/mobile`. The unit test (`useMobileNavigation.spec.ts:199-215`) and `MobileNewRun.spec.ts:85` use a stubbed ID, so neither sees it; IMP-11 did not cover Create run | Promote → CR-001 | This ticket | Design Impact (DS-006 entry form 2 premise wrong) |
| C-02 | A restored view whose reopen does not commit triggers both `MobileRunScreen`'s `back()` and the `'none'`→`toList()` | SCN-005 | Reopen fails (node drops between the list read and the open) | Ends on the list, same as a failed tap on the run screen today (`MobileRunScreen.vue:43-45`) | code read | Reject | — | Pre-existing tap behavior; no new consequence |
| C-03 | Inactive digest (index, unfiltered) may differ from the stored view's (tree-filtered) for good | SCN-010 | Stale index entry | One extra view read per digest value per page session | design AR-004, RSK-002; spec `re-reads at most once per digest value` | Reject | — | Accepted by design; bounded |
| C-04 | Delegated row judged gone if a stream attached before step 3 (handoff Known Risks) | SCN-005 | — | At page start no collaboration stream is attached before the restore reads | code read | Reject | — | Not reachable at page start |
| C-05 | The restore parses `agent:<host>/` with a regex and `revealRow` splits on the first `/`, while `agentRunRowKey`/`child()` write the format | design Principle 11 | — | Two readers of one key format | code read | Reject (not material) | — | Small; optional tidy-up while reworking CR-001 (e.g. let `useMobileRunTree` say which host a row key needs) |
| C-07 | Round 2: an entry pushed before the send and first visited after a reload still names the draft and gives the list | SCN-005 | Back across a reload into a pre-send entry | Lands on the list (subject gone), as any stale entry | design SR-003 DS-006b (History API rewrites only the current entry) | Reject | — | Accepted limit in SR-003; the entry current at reload is always the node run |
| C-08 | Round 2: `useMobileRouteRunSync` also follows a promotion while the route is on the list entry (send, then Back before the answer) | SCN-005 | Back before the send resolves | Route on the list names `agent:temp`; promotion replaces it with `agent:P`; the forward entry is fixed when revisited | code read | Reject (no defect) | — | Behaves correctly |
| C-09 | Round 2: `autobyteus-web/docs/chat.md:359,555` still name `composables/chat/useChatRouteRunSync.ts` and its old spec path after the move | design Principle 7/15 (no stale names) | — | Stale doc reference | grep | Promote as docs item, non-blocking | This ticket (docs sync) | Delivery's docs sync updates the two lines to `composables/useDraftRunPromotionRouteSync.ts` and its spec |
| C-10 | Round 4: keyboard in full screen on API 26–29 after decor fitting is turned off (ARCH-REV-005 residual); no `windowSoftInputMode` is declared, so the resolved mode varies between resize and pan | SCN-004 / SCN-006 | Keyboard opened in full screen | IMP-20 measures the IME inset reaching the root's padding on API 34 and 29 (page 412→151, 393→193 CSS px) with either resolved mode; API 26–28 share the pre-30 insets path | IMP-20 | Reject (no defect evidenced) | — | Residual for API/E2E: AC-006-1 on API 34 is worth one pass; API 26–28 not run |
| C-11 | Round 4: the three skipped `SystemBarInsetsTest` cases on API < 30 | test contract (TESTING rule 9) | — | Each skip has a stated reason (hand-built separate inset types do not survive dispatch before API 30); `WebShellWindowInsetsTest` checks the real window on every level | IMP-20; commit 06a072014f | Reject | — | Not a disabled-without-reason test |
| C-06 | `agentRunStore.ts` reaches net −1 partly by collapsing formatting | design guidance "net ≤ 0" | — | — | diff | Reject | — | Meets the design's rule; excess is FU-002 |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | items 10 and 12 refactors done as designed | — |
| Matches approved behavior-defining supplements | Pass | none exist | — |
| Data-flow spine clarity and preservation | Pass | Round 4: DS-002 has a readable branch (`host_refused`) and an unreadable branch (opaque request → `window_refused`); DS-005 adds the decor step in the controller, the one owner of full-screen window changes; item 13's check sits in the shared placement owner for all three roots. Round 2: DS-006b return/event spine implemented as designed: promotion → shared D-13 detection → `useMobileRouteRunSync` → `replaceRowKey` | — |
| Ownership boundary preservation | Pass | `closeAllLiveStreams` calls registry actions only; restore uses `useMobileRunOpening`/`useMobileRunTree`; server reads the index through its port | — |
| Off-spine concern clarity | Pass | `isCredentialRefusalClose` classifies only; owners keep final codes | — |
| Existing capability reuse | Pass | `liveStreamLifecycle/`, `runListStore.showRun`, disclosure owners, `MobileRunScreen`'s "Opening…" reused | — |
| Reusable owned structures | Pass | one key export; one classification; `releaseAll` reused by the binding watch | — |
| Shared-structure tightness | Pass | `MobileRunSubject` two-variant union; `NodeProbeCause` +1 case; digest meanings documented per state | — |
| Repeated coordination ownership | Pass | five owners ask one classification | — |
| Empty indirection | Pass | — | — |
| Separation of concerns / file responsibility | Pass | new files each own one concern | — |
| Dependency direction | Pass | stores do not import `closeAllLiveStreams`; `mobileNodeSessionStore` unaware of streams; Android `SystemBarInsets` takes a provider | — |
| Authoritative Boundary Rule | Pass | no caller reaches a service or reconnection behind a store | — |
| File placement | Pass | under existing areas | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `openRun` requires exactly one subject; `reopen` takes a row with `open` | — |
| Naming / one vocabulary | Pass | `window_refused`, `row`, `isCredentialRefusalClose`, `closeAllLiveStreams` | — |
| No unjustified duplication | Pass | C-05 noted, not material | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | function, two diagnostic kinds, `dateUtils.ts`, `activeListedAgentRunIds`, probe exemption | — |
| Test scenarios clear and requirement-aligned | Pass | Round 4: probe 403 code cases, `host_refused`/`window_refused` words, controller per API range and order, `WebShellWindowInsetsTest` on a real window, self vs teammate vs own-Team refusals in all three roots, System instructions whole and collapsible. Round 2: `useMobileRouteRunSync.spec.ts` follows a real draft (`createRunFromTemplate` → `promoteTemporaryId`): current entry, a view pushed before the send, Back to run screen and list, non-promotion selection change, another draft, child key; shell spec reloads before the send with a real draft ID → list | — |
| Test fixtures/helpers coherent | Pass | — | — |
| No stale/compat-only tests | Pass | `runHistoryActiveListedRuns.spec.ts` replaced | — |
| API/E2E readiness | Pass | Round 4: ready for the rerun plan (API-13, API-18, API-07, API-06, API-17; API-02 if build inputs changed). Round 2: AC-005-6/8 rendered (IMP-14); full probe 32/32 incl. MSP-07 (IMP-15) | — |

## Source File Size And Structure Audit

Raw `wc -l`, base `310fc27452` → now.

| Source File | Before | After | `>500` Check | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentRunStore.ts` | 506 | 505 | Already over, not grown — follow-up (FU-002) | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | 516 | 515 | Already over, not grown — FU-002 | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/.../standalone-agent-run-root-manager.ts` | 516 | 516 | Already over, not grown — FU-002 | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | 516 | 516 | Already over, not grown — FU-002 scope | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentTeamRunStore.ts` | 492 | 494 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | 458 | 472 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | 439 | 441 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/composables/mobile/useMobileRunTree.ts` | 112 | 153 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/composables/mobile/useMobileSubjectRestore.ts` | — | 86 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-android/.../DesktopFullScreenController.kt` | — | +45/−8 | Pass | Pass | Pass | Pass | — | — |

Round 4 changed source files: `catalog-delegation.ts` 118→123, `collaborator-errors.ts` 69→73, `DesktopFullScreenController.kt` 99→157, `nodeIdentityProbe.ts` 80→102, `nodeConnectionErrorText.ts` 80→83, `SystemInstructionActivityItem.vue` 87→89: all pass both limits.

`teamExecutionViewState.ts` is over 500 on base too and is not in FU-002's list; it changed by one import line and did not grow, so it is not this ticket's. Delivery or the Solution Designer may add it to FU-002's description when sending.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | key not re-exported from server/web |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected`; a saved URL without `row` is the normal no-subject path |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | none required |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. Made: `node_access_model.md` NA-11, `docs/android_mobile_access.md`, `autobyteus-web/docs/{remote_access,agent_execution_architecture,settings,workspace_layout}.md`, `standalone_agent_run_root.md`; round 2 `remote_access.md` (draft → node run). Round 4 docs: four server module docs (item 13), `agent_execution_architecture.md` (item 14), `docs/settings.md` (item 2). Still stale (C-09, for delivery's docs sync): `autobyteus-web/docs/chat.md:359` and `:555` name the old `composables/chat/useChatRouteRunSync.ts` and `composables/chat/__tests__/useChatRouteRunSync.spec.ts`; they moved to `composables/useDraftRunPromotionRouteSync.ts` and its spec.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AR-001 / DS-006 entry form 2 ("`onLaunched` receives the run ID it now uses") | Reclassified (round 1), corrected upstream in SR-003 | `onLaunched` receives the draft's `temp-*` ID; SR-003 DS-006b makes the route follow the promotion; implemented in round 2 |

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (average; not the decision rule). Rescored in round 4 after the Full Re-Audit of the delta. The CRR-003 note (F1 missed in source review) is closed: the rework is proven on real windows below API 35.

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-001…DS-009 and DS-006b followed; DS-002 now has a readable and an unreadable branch, each with its own verdict; DS-005's window changes all sit in one controller | Only the current history entry follows a promotion (accepted) | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Registries own streams; one D-13 rule; the self check lives in the shared placement owner and uses each root's index port | — | — |
| 3 | API / Interface Clarity | 9.4 | `DelegationSourceIndexPort.agentAddressOf`, `Display.setDecorFitsSystemWindows`, `refusalCodeOf`, `NodeProbeCause.host_refused` are narrow and explicit | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Small changes in the owning files; size rules met | — | — |
| 5 | Shared-Structure Tightness / Reusable Structures | 9.4 | One refusal-code reader replaces a single-purpose one; `host_refused` reuses the server-checked words and key; the desktop-only key removed | — | — |
| 6 | Naming and Local Readability | 9.3 | Clear names; comments cite decisions | Some long single-line actions; `docs/chat.md` stale path (C-09, delivery) | — |
| 7 | API/E2E Readiness | 9.3 | Rerun plan is clear; the implementation already measured API 34/29 and rendered item 14 | API 26–28 keyboard in full screen not measured (C-10) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | F1/F2 causes addressed at their root; outside full screen and on API 35 nothing changes; self refusal precedes the own-team check with the same code | Electron and Android 14 VNC re-checks still pending in API/E2E | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | `windowRefused` desktop words and the `isElectronEnvironment` branch removed, no wrapper | — | — |
| 10 | Cleanup Completeness | 9.5 | `isNetworkRefused` replaced; unused key removed; tests updated | — | — |

## Findings

### CR-001 — Create run's route names the draft's temporary ID (AC-005-6) — Resolved in round 2

- Round 1: `Design Impact`. `onLaunched` received the draft's `temp-*` ID and the route never followed the promotion, so a reload after the first send showed the list.
- Resolution: SR-003 (DEC-016, DS-006b, AC-005-8), ARCH-REV-003 Pass, IR-002 (`d0943a71ac`, `f9cb6f7153`).
- Verified: `useMobileRouteRunSync` uses the moved D-13 rule (`useDraftRunPromotionRouteSync`, `git mv`, no copy, `pages/chat.vue` imports it, no reference in code to the old path) and records R→P; `replaceRowKey` rewrites only `row` on the current entry; a route change to a recorded `agent:R` is replaced; a non-promotion selection change, another draft or a child key does nothing (`agentRunIdOfRowKey` returns null for children, Team, Org). The spec follows a real draft through `createRunFromTemplate` → `promoteTemporaryId`; IMP-14 shows `row=agent:temp-…` → reload → list before the send, and `row=agent:project_task_manager_…` carried to Activity and reopened after a reload once sent.

### CR-002 — Full screen does not lay the page out into the cutout on Android 9–14 (REQ-004) — Resolved in round 4

- Resolution: SR-005 DEC-020 (option 1, API < 35 only), ARCH-REV-005, IR-004 `7e53b46d80` (+ baseline test fix `06a072014f`). Verified: `fitDecorToSystemWindows(false)` while on and `(true)` while off, skipped on API ≥ 35; order unit-tested; `WebShellWindowInsetsTest` on API 34 (root 2400 = screen, cutout 126) and API 29 (2160, cutout 132), keyboard alone pads in full screen (IMP-20). API-18 on a Docker node remains API/E2E's rerun.

Round 3 record:

- Classification: `Design Impact` (Solution Designer). Protects REQ-004 (and DS-005, QR-004 "min SDK 26 behaviour defined").
- Scenario basis: SCN-004, Supported Normal Scenario. Phone user on an Android 9–14 phone with a cutout (the app's `minSdk` is 26, `build.gradle.kts:45`) turns the VNC Viewer to full screen. REQ-004 is not limited to API 35; AC-004-1 named the API 35 emulator only as its test device.
- Observed (API-18, Android 14, cutout 136 px): the window has `layoutInDisplayCutoutMode=shortEdges frame=[0,0][2400,1080]`, but `android:id/content` is at `136,0-2400,1080`. The page is 863 CSS px wide on a 915 px screen in both landscape directions, and Fill draws 863 px. On API 35 the same build passes (API-07).
- Origin: the design. DS-005 and the file mapping say "`Display.setLayoutInCutout(on)` (API ≥ 28: `SHORT_EDGES` on, `DEFAULT` off)" and "the root keeps only the keyboard inset". On API ≤ 34 the window decor still fits system windows: the app never calls `WindowCompat.setDecorFitsSystemWindows(window, false)` (grep: no match in `autobyteus-android/app/src/main`). The decor therefore insets `android:id/content` by the cutout whatever the cutout mode, and `SystemBarInsets` only pads inside it. Only Android 15's enforced edge-to-edge for targetSdk 35 makes the design's two steps enough. The implementation follows the design exactly (`DesktopFullScreenController.kt` `layOutInCutout`), so this is not an implementation defect.
- Why it is a design matter: the remedy changes how the window fits system windows on API 28–34. Either full screen turns `decorFitsSystemWindows` off and back on, or the app goes edge-to-edge on every API. Whichever is chosen also decides who pads the bars and cutout outside full screen on API 26–34. Today the decor does that there (`SystemBarInsets.kt:9-12`), so the choice touches autobyteus-277 REQ-011 (preserved: outside full screen every screen stays clear of bars, cutout and keyboard) and `SystemBarInsetsTest`. The controller's KDoc ("before 28 there is nothing to ask for"; "on API 35 … Android forces it") and the API-level split should follow the decision.
- Review gap: yes. Source review could have caught it. `SystemBarInsets.kt:9-12` already says that before Android 15 "the window has already taken them [the insets] and the root gets no inset". The controller only changes the cutout mode and never the decor's fitting. The handoff said the API 28–34 branch was covered only by a unit test with a fake `Display` and the instrumented tests ran on API 35. I accepted the unit test as proof for API 28–34 instead of asking for an on-device check or questioning the premise.
- Expected response: the Solution Designer revises DS-005 (window fitting per API level, insets outside full screen preserved). Implementation then adds a test that does not stop at the fake port. Rerun API-18 (Android 14), API-07 (API 35) and API-06.

### CR-003 — The Electron desktop window reads the node's Host-gate 403, so the "refuses this window" cause never shows there (AC-003-1) — Resolved in round 4

- Resolution: SR-005 DEC-019 (exact `host_refused` words), ARCH-REV-005, IR-004 `9ee362778e`. Verified: readable 403 `REMOTE_ACCESS_HOST_REFUSED` → `host_refused` with one request; other 403 → `not_autobyteus`; thrown request → opaque → `window_refused` (page words). API-13 in the packaged app remains API/E2E's rerun.

Round 3 record:

- Classification: `Design Impact` (Solution Designer, with REQ-003's mechanism wording). Protects REQ-003 / AC-003-1 / DEC-002.
- Scenario basis: SCN-002, Supported Normal Scenario. The desktop owner adds or probes a node whose Host gate refuses the name, in the Electron app.
- Observed (API-13): for the refused row and the refused Add, the line is "Not reachable. Something answers there, but it isn't an AutoByteus node." A closed port gives the correct "No answer from that address." In the window, the readable fetch resolves `{"status":403,"type":"basic"}` although the 403 carries no `Access-Control-*` header. Request counts: 2 per refused probe (no opaque request), 4 for the closed port. In headless Chrome the `file://` and `http` pages behave as DEC-002 measured.
- Origin: the design premise. DEC-002 and DS-002 assume the desktop window, like a browser, cannot read the refusal and must infer it from an opaque second request. The design recorded this ("Electron renderer re-check by API/E2E"; requirements External Contracts: "Electron same engine; API/E2E re-checks"). In the packaged Electron `file://` window the request is not CORS-restricted. `probeNodeIdentity` (`nodeIdentityProbe.ts:85-86`) therefore receives the 403 and maps any non-OK answer that is not `NODE_NETWORK_REFUSED`/`NODE_IDENTITY_NOT_MIGRATED` to `not_autobyteus`. The opaque branch (`:80-83`) runs only when the fetch throws. The code matches the design, so this is not an implementation defect.
- Why it is a design matter: the window can read `{"code":"REMOTE_ACCESS_HOST_REFUSED"}`, the exact cause. The words and verdict for that answer (the existing `host_refused` cause text, or `window_refused`'s) and REQ-003's "readable probe fails → opaque request" wording are decisions for the Solution Designer. AC-003-2 (browser window) holds as built.
- Review gap: no. Whether the packaged Electron `file://` renderer applies CORS to this request cannot be read from the web source (no `webSecurity` setting in `autobyteus-web/electron`, per API/E2E's grep). The design deliberately left it to an API/E2E check, which caught it.
- Expected response: the Solution Designer revises DEC-002 / DS-002 (and REQ-003 wording) for a readable Host-gate refusal. Implementation adds the mapping with a unit test (fake fetch resolving 403 + `REMOTE_ACCESS_HOST_REFUSED`). Rerun API-13.

## Follow-ups

- Follow-ups this review added: None. (Note for whoever sends FU-002: `teamExecutionViewState.ts` is also over 500 on base.)

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E engineer (pass), then the informational notice to the implementation engineer, per `get_handoff_rules`.

## Residual Risks

- API/E2E reruns: API-13 (Electron Nodes page, AC-003-1), API-18 (Android 14, AC-004-1), API-07 and API-06, API-17 (full phone probe at the final commit), and API-02 if a build input changed. New executable coverage is needed for item 13 (AC-013-1 against a live run) and item 14 (AC-014-*, already rendered by IMP-17), as API/E2E judges.
- Full screen with the keyboard on API 26–28 is not measured (C-10). API 29 and 34 are measured.
- Accepted limit (SR-003): only the current history entry follows a draft's promotion.
- Desktop change feeds still retry after a credential refusal (FU-003).
- `autobyteus-web/docs/chat.md:359,555` still give the moved composable's old path (C-09), for delivery's docs sync.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, Full Re-Audit of the delta)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (DS-005 and DEC-002 premises corrected by SR-005 and implemented)
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: CR-001, CR-002 and CR-003 are resolved; no open findings.
