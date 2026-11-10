# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (Source Log rows cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-004)
- Relevant Solution Revision IDs: `SR-002`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete (IR-001), route `Code Review` (Medium / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435`, base `310fc27452`, reviewed commits `e5ca0e1da7` (implementation), `6ca743fee0` (generated GraphQL), `49c64e47ee` (ticket docs).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Twelve bounded deltas in existing owners; the High drivers (retry decision in five stream owners plus a page-wide close; a new phone route key and page-start restore; a GraphQL answer whose meaning changes for inactive hosts) are real in the code. No correction.

## Review Scope

- Changed implementation and behavior reviewed: all twelve items (BEH-001…BEH-012) in `e5ca0e1da7`, plus `6ca743fee0`.
- Files / areas reviewed: `app.vue`; `utils/nodeIdentityProbe.ts`, `nodeConnectionErrorText.ts`, localization; `services/liveStreamLifecycle/{credentialRefusalClose,closeAllLiveStreams}.ts`; `WebSocketClient.ts`, `agentRunCollaborationStreamingService.ts`, `agentOrgStreamingService.ts`, `FileExplorerStreamingService.ts`; stores `agentRunStore`, `agentTeamRunStore`, `agentRunCollaborationStore`, `agentOrgContextsStore`, `runHistoryStore`, `mobileRunOpeningStore`; `MobileRemoteAccessShell.vue`, `MobilePairedShell.vue`, `MobileNodeDesktopClipboard.vue`; `useMobileNavigation`, `useMobileRunOpening`, `useMobileRunTree`, `useMobileSubjectRestore`, `useRunHistorySectionLoad`; `runListProjection.ts`; server `standalone-agent-run-root-manager.ts`, GraphQL type, key importers; contracts `root-execution-view-dtos.ts`; Android `DesktopFullScreenController`, `SystemBarInsets`, `WebShellScreen`, `MainActivity`, `ConnectionDiagnosticMapper`, `ConnectionValidator`, `AutoByteusWebView`, `NodeConnectionFlow`; probe `mobile-shell-probe.mjs`; the new and changed specs. Production paths read beyond the diff: `MobileRunScreen.vue`, `mobileRunTreeProjection.ts`, `runListStore.showRun`, `agentRunOpenCoordinator.ts`, `runHistoryLoadActions.ts`, `useMobileRunSetupController.ts`, `useMobileRunLaunchCoordinator.ts`, `agentContextsStore.createRunFromTemplate/promoteTemporaryId`, `agentRunStore.sendUserInputAndSubscribe`.
- Explicit exclusions: none rerun. The handoff's checks (IMP-01…IMP-12) were not rerun; nothing they exercise changed after they ran, and the finding below needed only a code read.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-002; REQ-001…REQ-012, AC-005-1…7 incl. DEC-014/015).
- Design-spec behavior map verified against the implementation: Yes, by the trace below.
- Design review report and round confirmed: ARCH-REV-002 Pass (AR-001…AR-004 resolved).
- Behavior-basis status: `Contradicted` for BEH-005 entry form 2 (Create run); `Confirmed` for the rest.
- Changed or newly discovered behavior: none new; DS-006 entry form 2's premise is wrong (CR-001).
- Remaining material ambiguity: what a reload of a New run draft that was never sent should show (CR-001 decision for the Solution Designer).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `app.vue` `showsServerOverlays = isEmbeddedWindow && isElectronEnvironment()`; `isAppReady` unchanged; IMP-10 shows no health request | — |
| BEH-002 | Confirmed | `probeNodeIdentity`: timeout returns at once; other failures ask `answersOpaquely` with the same URL/timeout; `causeText` picks desktop/page words by `isElectronEnvironment()` | — |
| BEH-003 | Confirmed | function, spec lines and two unproduced kinds removed; `dateUtils.ts` deleted | — |
| BEH-004 | Confirmed | `setOn` sets the cutout mode (API ≥ 28, by `sdkInt`) and re-applies insets after orientation is set, so `isOn` (read from the window) is already true when `SystemBarInsets` asks `typesFor(fullScreen())` | — |
| BEH-005 | Contradicted (entry form 2) | Entry form 1 (row tap) and the restore (steps 1–7) confirmed: `restoring` is set in setup before the shell's immediate watch; `firstCheck` + `nextTick` + `isCurrent()`; readiness per row kind; `cancel` on the list exits; reopen via `settle`. Entry form 2 (Create run): see CR-001 | `useMobileRunLaunchCoordinator.ts:50-53` returns the `temp-*` draft ID from `agentContextsStore.createRunFromTemplate` (`agentContextsStore.ts:90-111`); the node run is created at the first send and the context is promoted (`agentRunStore.ts:214-223` → `agentContextsStore.promoteTemporaryId:160-173`), which updates selection but never the route |
| BEH-006 | Confirmed | `[@media(max-height:320px)]` row layout; `scrollIntoView` on focus and on resize while focused; listeners removed on blur/unmount | — |
| BEH-007 | Confirmed | `fromHttpStatus(code, nodeName)`, DEC-006 words verbatim; both callers pass `entry.shownName` | — |
| BEH-008 | Confirmed | `pendingPairing` keeps the `Attempt`; `retryUrlFor(entry)` returns its URL only for the same entry ID; cleared on `onPaired` | — |
| BEH-009 | Confirmed | `isCredentialRefusalClose` used by all five owners, each keeping its own final codes; `closeAllLiveStreams` calls registry actions only; shell calls it on `isPaired` true→false; re-pair reopens because open paths call `connectToAgentStream` again (`agentRunOpenCoordinator.ts:125-126`, `runHistoryLoadActions.ts:325-342`) | — |
| BEH-010 | Confirmed | server answers `closedTaskExecutionsIn(root identity)` for inactive hosts (port wired in production, `general-process-run-supervisor.ts:271`); client stopped-host rule with `stoppedHostRereads`, cleared on release | — |
| BEH-011 | Confirmed | one export in contracts; local definitions and private `referenceKey` removed | — |
| BEH-012 | Confirmed | guide note | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005 (Create run form, AC-005-6) | BEH-005 | User | Phone user | Come back to the run just created after a reload | New run → Create run → first message → Messages/VNC Viewer → reload | Normal | `createRun` → `createAgentRun` (draft `temp-*`) → `onLaunched(temp)` → route `row=agent:temp-…` → send → `promoteTemporaryId(temp, real)` (route unchanged) → views carry `subjectKeys()` (still temp) → reload → restore looks up `agent:temp-…` → not listed → list | Same run's same screen | AC-005-6 (approved); code paths cited above | Supported Normal Scenario | Use |
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
| C-06 | `agentRunStore.ts` reaches net −1 partly by collapsing formatting | design guidance "net ≤ 0" | — | — | diff | Reject | — | Meets the design's rule; excess is FU-002 |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | items 10 and 12 refactors done as designed | — |
| Matches approved behavior-defining supplements | Pass | none exist | — |
| Data-flow spine clarity and preservation | Fail | DS-006 entry form 2 as designed and built writes a draft ID; the spine has no step for the draft becoming a node run (CR-001) | Design Impact |
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
| Test scenarios clear and requirement-aligned | Pass, with gap | strong per-owner and restore specs; the Create run path is tested with a stubbed real-looking ID, so AC-005-6 is not exercised end to end (CR-001) | add a test that follows a draft through promotion |
| Test fixtures/helpers coherent | Pass | — | — |
| No stale/compat-only tests | Pass | `runHistoryActiveListedRuns.spec.ts` replaced | — |
| API/E2E readiness | Fail | AC-005-6 would fail in API/E2E | resolve CR-001 first |

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

- Docs impact: `Yes` (already made): `node_access_model.md` NA-11, `docs/android_mobile_access.md`, `autobyteus-web/docs/{remote_access,agent_execution_architecture,settings,workspace_layout}.md`, `standalone_agent_run_root.md`. The CR-001 rework may need one sentence in `remote_access.md` on when a new run's route names it.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AR-001 / DS-006 entry form 2 ("`onLaunched` receives the run ID it now uses") | Reclassified | `onLaunched` receives the draft's `temp-*` ID, not the node's run ID; the node run exists only after the first send and is promoted (`agentRunStore.ts:214-223`). See CR-001 |

## Review Scorecard (Mandatory)

- Overall score: `9.2/10` (average; not the decision rule)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 8.8 | Spines DS-001…DS-009 are followed closely and the restore owns its order end to end | DS-006 entry form 2 misses the draft → node run step | Add the promotion step to the spine (CR-001) |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Registries own their streams; shell reacts; restore goes through opening/tree; server through its port | — | — |
| 3 | API / Interface Clarity | 9.4 | `MobileRunSubject` enforces one subject; `reopen`, `revealRow`, `cancel` are narrow | `cancel` vs `fail` difference needs its doc comment (present) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | New files small and placed in existing areas; size rules met | — | — |
| 5 | Shared-Structure Tightness / Reusable Structures | 9.3 | One key export, one classification | Row-key format read in two ways (C-05, not material) | Optional tidy-up |
| 6 | Naming and Local Readability | 9.3 | Clear names; comments cite the decision each line serves | Some long single-line actions | — |
| 7 | API/E2E Readiness | 8.6 | Most ACs ready with strong evidence (IMP-01/10/11) | AC-005-6 would fail | Fix CR-001 and test it through promotion |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.5 | Restore ordering, supersede, session-end close, close classification and digest rule are correct | Create run's reload lands on the list (CR-001) | As CR-001 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead code, exemption, getter, inline loop all removed | — | — |

## Findings

### CR-001 — Create run's route names the draft's temporary ID, so a reload does not reopen the created run (AC-005-6)

- Classification: `Design Impact` (Solution Designer). Protects REQ-005 / AC-005-6.
- Evidence:
  - `MobilePairedShell.vue` `onLaunched(runId)` → `openRun({ replace: true, rowKey: agentRunRowKey(runId) })`.
  - `runId` comes from `useMobileRunLaunchCoordinator.createAgentRun` (`:50-53`), which returns `agentContextsStore.createRunFromTemplate(...)`'s `temp-${Date.now()}-n` ID (`agentContextsStore.ts:90-111`); the selection at that moment is the same temp ID.
  - The node run is created at the first send: `agentRunStore.ts:214-223` gets `permanentRunId` and calls `promoteTemporaryId(temp, permanent)` (`agentContextsStore.ts:160-173`), which moves the context and the selection, but nothing updates the phone route. Every later view (`openView`, `openDesktopFullScreen`, files) copies `subjectKeys()`, so `row=agent:temp-…` stays.
  - On reload the draft context is gone (memory only) and the run is listed as `agent:<permanent>`; `useMobileSubjectRestore` finds no `agent:temp-…` row → `toList()`. The user sees the list, not the created run's Messages/VNC Viewer.
  - Not caught upstream: DS-006 entry form 2 and ARCH-REV-002 AR-001 assume `onLaunched` gets the run's ID; the navigation spec uses `'agent:new-run'` and `MobileNewRun.spec.ts` stubs `createAgentRun`; IMP-11 did not exercise Create run.
- Why Design Impact, not Local Fix: the reviewed spine for entry form 2 rests on a wrong premise, and the fix adds a step with an owner decision: which owner rewrites the route's `row` when the open draft becomes a node run (the phone route's only writer is `useMobileNavigation`; promotion is in the shared `agentContextsStore`/selection), and which entries it rewrites (the current entry; the list entry under it also carries the temp row). There is also an intended-behavior point the Solution Designer should state: a reload before the first message has no node run to reopen; the list (or New run) is the likely outcome, and AC-005-6's precondition should say the run was sent.
- Expected response: revise DS-006 entry form 2 (and AC-005-6 wording if needed); then implementation follows the draft through promotion and adds a test that does the same (Create run → promotion → route names `agent:<permanent>`), and API/E2E runs AC-005-6 on the phone bundle.

## Follow-ups

- Follow-ups this review added: None. (Note for whoever sends FU-002: `teamExecutionViewState.ts` is also over 500 on base.)

## Classification

- `Design Impact` (CR-001).

## Recommended Recipient

- Solution Designer (Design Impact), per `get_handoff_rules`.

## Residual Risks

- Everything except CR-001 is ready for API/E2E as handed off: the Android emulator checks (AC-004-1, AC-005-2, AC-006-1, AC-008-1), item 2 in the Electron app (AC-003-1), item 11 on a live node (AC-011-1) and a fresh-start build (contracts `dist` changed) remain API/E2E's.
- Item 10 on desktop windows: a revoked owner credential now stops run-stream reconnects (intended); change feeds still retry (FU-003).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (C-01 promoted; C-02…C-06 rejected with reasons)
- Material-Premise Gate: `Fail` (AR-001 / DS-006 entry form 2 reclassified)
- Score Summary: 9.2 average; below 9.2 in Data-Flow Spine (8.8), API/E2E Readiness (8.6), Runtime Correctness (8.5), all from CR-001
- Failure Origin: earlier design premise (DS-006 entry form 2)
- Recommended Recipient: Solution Designer
- Notes: the rest of the implementation is of high quality; the ten implementation decisions in the handoff hold up (firstCheck + nextTick guard, `cancel` vs `fail`, Back supersede, `revealRow` opening the older-runs fold, 320 px breakpoint, nullable field, `sdkInt`). A rework that touches only DS-006 entry form 2 should get a Targeted Delta Review.
