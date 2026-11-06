# Code Review Report — mobile-experience-redesign (autobyteus-277)

> **Latest result: round 3, `API/E2E Failure-Origin Review` (CRR-003).** It is recorded in the section [API/E2E Failure-Origin Review (Round 3)](#apie2e-failure-origin-review-round-3) and in Latest Authoritative Result. The sections between here and that section are the implementation review of rounds 1–2 (CRR-001, CRR-002), and they are the basis for the round-3 judgement. Only the score rationale they affect is updated.

## Review Round Meta

- Round 3 (failure-origin):
  - Entry point: `API/E2E Failure-Origin Review`.
  - Current Code Review Revision ID: `CRR-003`.
  - Current Review Round: 3. Review Scope: `N/A` (failure-origin round). Latest Authoritative Round: 3.
  - Trigger: the API/E2E engineer's API-REV-001 `Fail`, with findings F-01…F-09.
  - Coverage investigation reviewed: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md).
  - Execution coverage report reviewed: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).
  - API/E2E revision record reviewed: [api-e2e-revision-record.md](api-e2e-revision-record.md), API-REV-001.
  - Failing scenario IDs: MSP-02, MSP-03, MSP-06, MSP-09, MSP-11, ADR-03, ADR-05, covering AC-002, AC-003, AC-004, AC-005, AC-007, AC-008 and AC-010.
  - Exact failing command: `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…/MSP-run-1`. MSP-02 was run again with `--cases=MSP-02 --output-dir=…/MSP-run-2-MSP-02`.
  - Other failing modes: `node scripts/android-journey.mjs <hold.json> <apk> …/ADR-run-1` (Android 15 emulator, this worktree's debug APK).
  - Code under test: `f2816cc7c1`. HEAD `ccf43b875c` adds tests and documents only.
  - Failure evidence: `evidence/api-e2e/MSP-run-1/mobile-shell-probe.json`, `evidence/api-e2e/MSP-run-2-MSP-02/mobile-shell-probe.json`, `evidence/api-e2e/ADR-run-1/android-journey.json`, and the PNGs the execution report's Cases table lists.
  - Testing guideline read: `TESTING.md` at the repository root. It has no phone, secure-context or overlay hit-testing rule; see the failure-origin section.
- Rounds 1–2 (implementation review):
- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md), SR-003 (Approved)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md), E-01…E-32 (read where the design cites them)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md), SR-004 with the `45fbb2ceee` editorial fixes
- Supplemental Task Artifacts Reviewed As Context: the Product `ui-ux-spec.md` at `e6ca7b6098` (the states, Retry, the not-reachable bar and banner, the transitions TR-015…TR-018); [follow-ups.md](follow-ups.md)
- Relevant Solution Revision IDs: SR-003 (requirements), SR-004 (design)
- Design Review Report Reviewed As Context: [design-review-report.md](design-review-report.md), round 2, Pass
- Architecture Review Revision Record Reviewed As Context: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: [implementation-handoff.md](implementation-handoff.md)
- Implementation Revision Record Reviewed As Context: [implementation-revision-record.md](implementation-revision-record.md)
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the code delta `f2816cc7c1` over `1fc93d45ce` touches only the files and behavior of CR-001…CR-003:
  - `MobileRunList.vue` and `MobilePairedShell.vue` (one emit and one handler);
  - `MobileBottomSheet.vue` and `MobileConnectionSheet.vue` (a slot prop and an id);
  - one string in `useMobileWorkspaceFileExplorer.ts`;
  - the three specs.
  - No spine, shared interface or data shape changes, and nothing spreads beyond the findings.
- Trigger: the implementation engineer's handoff of IR-002 (CRR-001 fixes), HEAD `e7b3af5059`
- Prior Review Round Reviewed: round 1 (CRR-001, Fail, Local Fix)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Shared owners that the desktop uses changed (the history load, the conversation binding, the collaboration row rules, the open actions, disclosure, the route's Org), the phone's model was replaced by the shared owners, and a history poll now runs on the phone. No correction is needed.

## Review Scope

- Round 2 (targeted delta): commit `f2816cc7c1`:
  - CR-001…CR-003 were rechecked against the code and the new tests;
  - IMP-06 (the phone specs, 83 passed), IMP-02 (typecheck) and IMP-03 (guards) were read on that commit;
  - nothing was rerun, because the evidence covers the delta.
  - Round 1's evidence for unaffected checks is carried forward.
- Round 1, changed implementation and behavior reviewed: base `407f0ee8e9` to HEAD `1fc93d45ce`. The code commits are `218c004f0e`, `27e8b359e6`, `e0788fe987`, `599002ecbf` and `b2d7a084dd`. The ticket commits `ef54fc1d97` and `1fc93d45ce` were read as documents.
- Files and areas reviewed:
  - **Shared:**
    - `useRunHistorySectionLoad`, `useRouteSelectedAgentOrg`, `useTargetConversation`;
    - `useWorkspaceHistorySelectionActions`, `useWorkspaceHistorySubjectActions` (with `agentOrgRouteQuery`), `useRunListDisclosure`;
    - `agentRunCollaborationStore` (`ensureStoredView`, `selectTaskRow`), `runHistorySelectionActions`, `runHistoryStore`;
    - the desktop adopters `WorkspaceAgentRunsTreePanel`, `RunListPanel`, `RunListRow`, `RunDefinitionGroups`, `AgentRunTaskRows`, `AgentWorkspaceSurface`, `TeamWorkspaceSurface`, and the two section contracts;
    - `useEventMonitorFilePreview`.
  - **Phone:**
    - `MobileRemoteAccessShell`, `MobilePairedShell`, `MobileScreenBar`, `MobileBottomSheet`;
    - the screen folders `runList/`, `runScreen/`, `views/`, `newRun/` and `connection/`;
    - `useMobileNavigation`, `useMobileRunOpening`, `useMobileRunTree`, `useMobileRunSetupController`, `useMobileRunLaunchCoordinator`, `useMobileWorkspaceFileExplorer`;
    - `mobileRunOpeningStore`, `mobileRunTreeProjection`, `mobileRunStatusLabel`, `remoteAccessAuthFailure`.
  - **Tests:** the new phone specs and the changed desktop specs, read for structure and for what they assert. The removal set was checked by search.
- Explicit exclusions:
  - The checks in the handoff's Checks Run were not rerun. IMP-01…IMP-05 ran on the current code, and HEAD changes only ticket documents.
  - Device, two-server and real-data behavior is left to API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. REQ-001…009 and AC-001…010 are understood, with the Product spec as the normative UI.
- Design-spec behavior map verified against the implementation: `Yes`. DS-001…DS-009 were traced through the code, below.
- Design review report and round confirmed: round 2, `Pass` (ARCH-REV-002). Residuals 1–5 are handled as the handoff states:
  - residual 1: `begin` invalidates the selection intent;
  - residual 2: a test covers it;
  - residual 3: `agentOrgRouteQuery` is the only builder of the Org keys;
  - residual 4: fixed in `45fbb2ceee`;
  - residual 5: tested per desktop surface.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `MobilePairedShell` → `useRunHistorySectionLoad({ window: () => null, polling: list ∧ visible })` → `runHistoryStore` → `runListStore.shownEntries` → `useMobileRunTree` (`ensureStoredView`, `taskRows`, `executionRows`, `projectAgentOrgHistoryRows`, phone disclosure) → `buildMobileRunTreeRows` → `MobileRunList`/`MobileRunRow` | — |
| BEH-002 | Confirmed | `MobileRunList.openRow` → `useMobileRunOpening.open`: `begin` → `openRun({ orgQuery })` → the shared action in the phone shell → `commit`/`fail` → `MobileRunScreen` (pending-decided "Opening…") → `MobileRunTargetView` → `useTargetConversation` → `AgentEventMonitor` | — |
| BEH-003 | Confirmed | `useMobileNavigation` is the only `/mobile` writer (`router.push`/`replace`/`back` only; no `pushState`); ⋮ → `openView`; the views read `activeWorkspaceTarget`; a file link → `useEventMonitorFilePreview` phone branch → `openFile` | — |
| BEH-004 | Confirmed | "+" → `openNewRun` → `MobileRunSetup` → `useMobileRunSetupController` (preselection rule at `:54-61`) → `createAgentRun` (`createRunFromTemplate({ selectionMode: 'mobile' })`) → `openRun({ replace: true })` | — |
| BEH-005 | Confirmed | `remoteOf`/`remoteTitleOf` from the transient rows and `remoteRunsStore`; `MobileRunTargetView` shows `RemoteRunNotice` when `remoteView.unreachable` | — |
| BEH-006 | Confirmed | node button → `MobileConnectionSheet` (`remoteCollaborationStore.load()` → `askAll`) → `MobileUnpairConfirm` → `deleteLocalSession`; the bar and banner from `authorizedApiReachable` | — |
| BEH-007 | Confirmed | `MobileRunRow` has only the body and the chevron | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001; REQ-001/002 | User | The user | See runs and delegated work | Open `/mobile` (paired) | Normal | DS-001 → DS-002 | Tree as the desktop Runs view | Requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002; REQ-003 | User | The user | Talk to any agent in the tree | Tap a row | Normal | DS-003 | Opening… then the conversation | SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003; REQ-005/007/009 | User | The user | One-hand navigation; read results | ← / system Back / ⋮ | Normal | DS-004, DS-005, DS-008 | Back walks file → view → run → list | SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004; REQ-006 | User | The user | Start an agent run | "+" | Normal | DS-006 | New run → Chat | SCN-004 | Supported Normal Scenario | Use |
| SCN-006 | BEH-006; REQ-008 | User | The user | Check the connection, peers, unpair | Node name | Normal | DS-007 | Sheet; unpair → pairing | SCN-006 | Supported Normal Scenario | Use |
| SCN-007 | REQ-001 (AC-001 alternate), REQ-008 (AC-008 alternate); spec VIS-023, VIS-024, TR-017 | User | The user | Opens the app while the paired node does not answer (phone offline, Tailscale down), then gets the node back | `/mobile` cold open; the list's Retry | Explicit Edge | `MobilePairedShell.checkStatus(true)` fails both reads → `recordAuthorizedApiReachability(false)` → list "Couldn’t load your runs." + bar "Not reachable" + banner → the user taps Retry → `MobileRunList.retry` → `runHistoryStore.fetchTree()` | Runs listed, and the bar and banner say the node answers | Spec states "List, read error" and "Paired node not reachable" with Retry/Check (ui-ux-spec `:177`, `:218`, `:229-230`) | Supported Explicit Edge Scenario | Use |
| SCN-008 | REQ-003 (Opening… only), design DS-003 "failed open → list" | User | The user | Opens a row whose open fails while an earlier run is still the target | Tap a row | Explicit Edge | `fail(key)` clears `pending` → `MobileRunScreen.state` becomes `open` with the earlier target → the failure watcher's `router.back()` | Back to the list | Design-spec DS-003, Guidance "Open outcome per kind" | Supported Explicit Edge Scenario | Use (candidate C-04) |
| SCN-009 | Design DS-003 "superseded" | User | The user | Taps a second row while the first open is in flight (← then a tap) | ← and a tap | Explicit Edge | `begin(B)` → `invalidateSelectionIntent()`; the A action's `intent.isCurrent()` is false → no emit or commit; the Org action returns `superseded` | B opens; A's outcome is ignored | Design DS-003 names the superseded case | Supported Explicit Edge Scenario | Use (no defect found) |

### Candidate Finding And Mechanism Gate

Round 2: C-01, C-02 and C-03 were promoted to CR-001…CR-003 and are now resolved; see Findings. The rejected candidates are unchanged.

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The list's Retry reads the history directly and never updates the paired node's reachability. After a failed first check, runs list but the bar still says "Not reachable" and the "Can’t reach <node>." banner stays | SCN-007 | Retry on the read-error state after the node is back | `MobileRunList.vue:118` `retry = () => runHistoryStore.fetchTree()`. `authorizedApiReachable` changes only in `fetchStatus` and `recordAuthorizedApiReachability` (`mobileNodeSessionStore.ts:104-127, 188-190`), which only `MobilePairedShell.checkStatus` calls. The first check recorded `false` (`MobilePairedShell.vue:110`). The populated list then shows the offline bar and banner (`MobileRunList.vue:16-30`) until the user opens the sheet and checks. The Retry also skips the 401 rule and does not reload the definitions or the folder catalog that the failed first load missed | Code at the cited lines. The old shell's segment Retry recorded reachability on success (base `MobileRemoteAccessShell.vue` `retryCatalogSegment`). No test covers Retry (`MobileRunList.spec.ts` covers only the states) | Promote | This ticket | A wrong connection state in a state the spec defines (VIS-024 is for "Node down"). Fix: Retry runs the shell's status check (`checkStatus()`: `load()` with `fetchStatus`, the 401 rule and reachability). Add a test |
| C-02 | Stale copy "Try again from the mobile Files tab." | REQ-009/AC-009 (no tabs), REQ-005 (copy as spec), QR-002 | A folder's load returns without children | `useMobileWorkspaceFileExplorer.ts:194` → `getFolderError` → shown at `MobileFiles.vue:59` | Code. The tabs are removed in this change | Promote | This ticket | The text points the user to a removed surface. Fix: change the text so it names no tab (for example, use the generic "Folder contents could not be loaded." that the catch branch already uses) |
| C-03 | The connection sheet's dialog has no accessible name. `MobileBottomSheet` sets `aria-labelledby="titleId"`, but `MobileConnectionSheet` replaces the `#header` slot, so no element carries that id | QR-001 ("menus and sheets with their roles"), AC-008 | Tap the node name | `MobileBottomSheet.vue:7, 10-12`; `MobileConnectionSheet.vue:5-9` (the h2 has no id) | Code | Promote | This ticket | A sheet the spec requires (UIS-010) lacks its label. Fix: give the header slot the id (a slot prop, or `aria-label`) so the dialog is named by the node name |
| C-04 | After a failed open, while an earlier run is still the target, the run screen renders that earlier target until `router.back()` lands | SCN-008 | Tap a row whose open fails | `MobileRunScreen.vue:40, 45`: `fail` clears `pending` → `state` is `open` with the earlier target → `back()` follows in the same flush, but the route changes asynchronously | Code reading | Reject | — | The scenario is supported, but the consequence is a transient frame on a rare failure path, and it ends on the list as designed. It is not "while attaching" (REQ-003). Too small to require machinery; noted for API/E2E observation |
| C-05 | When the first open fails and no target exists, both run-screen watchers navigate (`toList` replaces, the failure watcher goes `back`) | SCN-008 | As C-04 | `MobileRunScreen.vue:43, 45` | Code reading | Reject | — | It ends on the list either way, and at most a duplicate list entry stays ahead in Forward history. No user-visible defect |
| C-06 | The poll lists runs once the node is back, while the bar keeps its earlier "Not reachable" | SCN-007 | The node comes back while the list is shown | `useRunHistorySectionLoad` polls `refreshTreeQuietly` without recording reachability (DS-001 as designed) | Code; design DS-001 / Off-Spine "Auth failure on read" | Reject (as a finding) | — | The design sets reachability from the shell's status check only, and the spec's not-reachable state shows "open runs as last loaded" with Check. Not a defect against the approved design. C-01's fix covers the Retry path; recorded under Residual Risks |
| C-07 | `useWorkspaceHistorySelectionActions.onOpenAgentRun` calls `useAgentRunCollaborationStore()` directly while the composable's other stores are injected | Design Interface Mapping (AR-006) | — | `useWorkspaceHistorySelectionActions.ts:77-80` | Code | Reject | — | It follows the design's stated shape (`collaboration.selectChild` + `onSelectRun`), and its tests pass. A style point with no maintainability defect |
| C-08 | `runHistoryStore.ts` is 547 raw / 491 effective lines | Size rule | — | +2/−2 (a comment and an options type) | `git diff --numstat` | Reject | — | Under 500 effective lines and not grown |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | The phone model is removed; the three shared rules (load, binding, task-row rules) are extracted to their owners; the open composables take `shell` | — |
| Matches approved behavior-defining supplemental artifacts | Pass (round 2) | Round 1 failed on CR-001…003. All three are fixed in `f2816cc7c1`:<br>Retry → `checkStatus()` (`MobilePairedShell.vue:26`, `MobileRunList.vue:45`);<br>the copy names no tab (`useMobileWorkspaceFileExplorer.ts:194`);<br>the dialog is named by its h2 (`MobileBottomSheet.vue:10`, `MobileConnectionSheet.vue:5-7`) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-009 traced as designed. One load owner. The open sequence order is `begin` → `openRun` → action → `commit`/`fail` (`useMobileRunOpening.ts:77-90`) | — |
| Ownership boundary preservation and clarity | Pass | The pending open is owned by `mobileRunOpeningStore`; "Opening…" is decided by the pending state (`MobileRunScreen.vue:40`), not the target. Navigation is only `useMobileNavigation`. The open rules stay in the shared actions | — |
| Off-spine concern clarity | Pass | Visibility feeds `polling`; the 401 rule is in the status check; ages are a minute tick in the list | — |
| Existing capability/subsystem reuse | Pass | `runListStore`, the disclosure, the collaboration store, the Team and Org rows, `RemoteNodeChip`/`RemoteRunNotice`, `AgentEventMonitor` and the remote stores are all reused | — |
| Reusable owned structures | Pass | `MobileScreenBar`, `MobileBottomSheet`, `useTargetConversation` and `useRunHistorySectionLoad` each serve several users | — |
| Shared-structure/data-model tightness | Pass | `MobileRowOpen` and `MobileRowFold` are discriminated unions. `MobileRunTreeRow` carries no run-id copies beyond `open`. `RunListDefaultExpansion` is one two-flag option | — |
| Repeated coordination ownership | Pass | The desktop's two route-Org copies → `useRouteSelectedAgentOrg`; two read-only/sender/name copies → `useTargetConversation`; the `AgentRunTaskRows` rules → the store; the run-row open → `onOpenAgentRun` | — |
| Empty indirection | Pass | `useMobileRunOpening` owns the sequence; the design names it as the facade | — |
| Separation of concerns and file responsibility | Pass | One screen per folder; the pure projection is split from the store wiring | — |
| Ownership-driven dependency | Pass | The only shared → phone import is `useEventMonitorFilePreview` → `useMobileNavigation`, the allowed exception. `grep` finds no other | — |
| Authoritative Boundary Rule | Pass | The phone calls the shared actions, never `openTeamMemberRun` or `orgContexts.select` directly. The views read `activeWorkspaceTarget` only | — |
| File placement | Pass | `composables/runHistory/`, `composables/workspace/` (shared); `components/mobile/*/`, `composables/mobile/`, `utils/mobile/` (phone) | — |
| Flat-vs-over-split layout | Pass | Five screen folders hold about 20 phone files | — |
| Interface boundary clarity | Pass | `shell: 'desktop' \| 'mobile'` with a desktop default; named navigation methods; `selectTaskRow(hostRunId, row)` | — |
| Naming quality and one vocabulary | Pass | Run list, run screen, view, open target, as the design's Terminology. The "work" vocabulary is gone | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files | Pass | The Removal Plan is complete (search: no `mobileWorkStore`, `MobileWorkContext` or `useMobileWorkCatalog` in source). `useTeamRunRuntimeCatalogSync` and the dead returns of `useMobileLaunchWorkspaces` and the explorer are removed. One trivial leftover, `normalizeMobileWorkspaceRoot`, is a private one-line wrapper (nit, not a finding) | — |
| Test scenarios and assertions are clear and requirement-aligned | Pass | The projection depths 0/1/1/2/1, the open order and supersession, promotion, the 401 path with no second read, the poll pause and resume, Back per screen, and per-surface read-only.<br>Round 2 adds tests for Retry → the status check → "Connected" with no banner, for Retry emitting without reading, and for the dialog's name | — |
| Test fixtures/helpers reusable, structure coherent | Pass | `mobileTestRouter.ts` is shared by the navigation and opening specs | — |
| No stale, duplicated or compatibility-only tests | Pass | Specs of removed code are deleted; the shell spec asserts their absence | — |
| API/E2E readiness | Pass | The handoff's coverage hints are specific (Org Back, the 401 path, the poll network log, Android Back) | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Lines Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/runHistoryStore.ts` | 491 | 491 | Pass | — | Pass | Pass | — | — |
| `components/workspace/history/RunDefinitionGroups.vue` | 409 | 406 | Pass | — | Pass | Pass | — | — |
| `stores/agentRunCollaborationStore.ts` | 356 | 375 | Pass | — | Pass (two moved rules) | Pass | — | — |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | 390 | 366 | Pass | — | Pass | Pass | — | — |
| `composables/mobile/useMobileWorkspaceFileExplorer.ts` | 310 | 247 | Pass | — | Pass | Pass | Resolved (CR-002) | — |
| `utils/mobile/mobileRunTreeProjection.ts` | 0 | 209 | Pass | +222 raw: assessed, one pure concern (the flattening and its row types) | Pass | Pass | — | — |
| `components/mobile/views/MobileFiles.vue` | 0 | 142 | Pass | — | Pass | Pass | — | — |
| `components/mobile/MobilePairedShell.vue` | 0 | 137 | Pass | — | Pass | Pass | Resolved (CR-001) | — |
| `composables/mobile/useMobileRunSetupController.ts` | 416 | 133 | Pass | — | Pass (agent only) | Pass | — | — |
| `components/mobile/runList/MobileRunList.vue` | 0 | 121 | Pass | — | Pass | Pass | Resolved (CR-001) | — |
| `components/mobile/MobileBottomSheet.vue`, `connection/MobileConnectionSheet.vue` | 0 | 37, 80 | Pass | — | Pass | Pass | Resolved (CR-003) | — |
| Other new phone files and shared composables (`useMobileNavigation` 86, `useMobileRunOpening` 86, `useMobileRunTree` 93, `useRunHistorySectionLoad` 86, …) | — | ≤ 121 | Pass | — | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No flags, no hidden tabs, no dual paths |
| No legacy old-behavior retention | Pass | Home, the tabs, the Switch sheet, team launch and the catalog are removed |
| Dead code removed in touched files | Pass | See the structural check |
| Approved persisted-data transition followed | Pass | `Not Affected`; the screen state is the URL query; the pairing key is unchanged |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None requiring removal. The stale "Files tab" text is a copy defect (CR-002), not dead code.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: the phone section of `autobyteus-web/docs/remote_access.md` describes the old shell.
- Files: `autobyteus-web/docs/remote_access.md` (updated in `27e8b359e6`). Delivery syncs it again at finalization.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

The architecture review's premises (MP-001 Opening…, MP-002 no re-open, MP-003 Org keys on the list entry) are `Confirmed` in the code:

- MP-001: `MobileRunScreen.vue:40`;
- MP-002: no re-open path exists;
- MP-003: `useMobileNavigation.ts:76-85`, and its spec "opening an Org run writes its keys on the list entry too".

No new or reclassified premise.

## Review Scorecard (Mandatory)

- Round 3 correction (CRR-003): API/E2E showed that row 8, Runtime Correctness And Behavioral Fidelity, is below the pass bar.
  - The source-review gaps were F-01, F-03 and F-06, with F-05 minor.
  - F-04 showed only in a rendered check.
  - The row is not rescored in a failure-origin round. Its rationale is withdrawn until the rework is reviewed.
- Overall score: 9.4 / 10 (round 2; simple average; not the decision rule). Rows 7, 8 and 10 are rescored for the fixes. The other rows carry forward from round 1, because the delta does not touch them.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every designed spine is present, with one owner per node; the open order is explicit | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The phone model is gone; the pending open, navigation and load each have one owner; no boundary bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | `shell` option, discriminated `MobileRowOpen`, explicit navigation methods, `selectTaskRow(hostRunId, row)` | `onOpenAgentRun` reaches its store directly beside injected ones (C-07, style only) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | One screen per folder; pure projection vs wiring; the shell split into pairing and paired | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Tight unions; no run-id copies; shared bar, sheet and binding | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Names follow the design's terminology; the code is commented where the order matters | A private wrapper of a one-line normalizer stays | — |
| 7 | API/E2E Readiness | 9.4 | Specific coverage hints; the Not-run list is stated plainly; Retry now has a shell-level test | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Open, supersession, promotion, Back, the 401 path and the poll pause are correct and tested. Retry now goes through the status check (reachability, the 401 rule, definitions). The copy and the dialog's name are fixed | Not seen on a device or with real data (C-04, C-06 residuals) | API/E2E on the device |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | A clean cut; nothing hidden | — | — |
| 10 | Cleanup Completeness | 9.4 | The removal plan is complete, with search evidence; the stale "tab" text is gone; `retry` is removed from `MobileRunList` with no leftover | — | — |

## Findings

All three round-1 findings are **resolved** in round 2 (`f2816cc7c1`); there are no open findings. Their round-1 text stays below for the record.

- **CR-001: resolved.**
  - `MobileRunList.vue:45` emits `retry` and reads nothing itself. `MobilePairedShell.vue:26` handles it with `checkStatus()`, so a Retry runs status and `load()` together, with the 401 rule and the reachability record.
  - During the reload the list shows the loading rows (TR-017), because `fetchTree` sets `loading` while no entries are listed.
  - Tests:
    - `MobileRemoteAccessShell.spec.ts` "Retry after a failed first check…" starts from the error state, "Not reachable" and the banner. After Retry, `load()` is called once, `fetchStatus` twice, the list is populated, the bar says "Connected" and the banner is gone.
    - `MobileRunList.spec.ts` asserts that Retry emits and does not call `fetchTree`.
- **CR-002: resolved.** `useMobileWorkspaceFileExplorer.ts:194` now reads "Folder contents could not be loaded."
- **CR-003: resolved.**
  - `MobileBottomSheet.vue:10` passes `titleId` to the `#header` slot, and `MobileConnectionSheet.vue:5-7` puts it on its h2.
  - `MobileConnectionSheet.spec.ts` asserts that `aria-labelledby` resolves to the node name.
  - Every other sheet uses the default header, which already carries the id.

### CR-001 — The list's Retry leaves the paired node marked unreachable (Local Fix, implementation; resolved in round 2)

- Protects: REQ-001 / AC-001 alternate (read error with Retry, TR-017) and REQ-008 / AC-008 alternate (the bar's "Not reachable" and the banner only while the node is down, VIS-024). Candidate C-01, scenario SCN-007.
- Evidence:
  - `components/mobile/runList/MobileRunList.vue:118`: `retry` calls `runHistoryStore.fetchTree()` directly.
  - The reachability flag that drives the bar and banner (`MobileRunList.vue:16-30`, through `connected` from `MobilePairedShell.vue:126`) is set only by the shell's `checkStatus` (`MobilePairedShell.vue:99-111`) and by `fetchStatus` (`mobileNodeSessionStore.ts:104-127`).
  - After a cold open with the node down, the first check records `false`. When the user taps Retry and the read succeeds, runs list under "Not reachable" and "Can’t reach <node>." until he opens the sheet and taps Check connection.
  - The same Retry bypasses the 401 rule (DS-001, E-27), and it does not reload the definitions and folder catalog that the failed first load missed (New run's agent list).
  - The old shell's Retry recorded reachability on success.
- Required action:
  - The list's Retry runs the paired shell's status check, `checkStatus()` (`load()` together with `fetchStatus`, the 401 rule and `recordAuthorizedApiReachability`). For example, `MobileRunList` emits `retry` and `MobilePairedShell` handles it.
  - Add a component test: a failed first check, then a successful Retry, gives a populated list, a "Connected" bar and no banner.

### CR-002 — Files copy names a removed tab (Local Fix, implementation; resolved in round 2)

- Protects: REQ-009 / AC-009 (no tabs), REQ-005 (copy as specced), QR-002. Candidate C-02.
- Evidence: `composables/mobile/useMobileWorkspaceFileExplorer.ts:194`, "Folder contents could not be loaded. Try again from the mobile Files tab.", shown at `components/mobile/views/MobileFiles.vue:59`. This change removed the tabs.
- Required action: change the text so it names no tab. The catch branch's "Folder contents could not be loaded." fits.

### CR-003 — The connection sheet's dialog has no accessible name (Local Fix, implementation; resolved in round 2)

- Protects: QR-001 (sheets with their roles), AC-008, UIS-010. Candidate C-03.
- Evidence: `components/mobile/MobileBottomSheet.vue:7` sets `aria-labelledby` to `titleId`, which exists only on the default header's `h2` (`:10-12`). `components/mobile/connection/MobileConnectionSheet.vue:5-9` replaces `#header`, and its `h2` has no id, so the label points at nothing.
- Required action:
  - Name the dialog when the header is replaced. For example, pass `titleId` as a slot prop and put it on the connection sheet's `h2`, or give the dialog an `aria-label`.
  - Extend `MobileConnectionSheet.spec.ts` to assert the dialog's name.

## API/E2E Failure-Origin Review (Round 3)

### Basis

- Every failing scenario represents approved behavior. Each enters through the real surface, which is the production `/mobile` bundle on a real paired node, and the Android shell's real pairing. They are tied to approved criteria as follows:
  - AC-003: REQ-003, a tap opens that agent; "a team or Org run opens its coordinator".
  - AC-004: REQ-004.
  - AC-008 and AC-010: unpair.
  - AC-005, AC-007, QR-001 and VIS-011: the screens match the references, and touch targets are at least 44×44.
  - AC-002 and REQ-002: the tree, live states, and VIS-002 as normative.
- No failing test is invalid or stale. The probe's trigger is a real tap, a real send or a real node state.
- The plain-HTTP origin (F-02) is a **Supported Explicit Edge**. `docs/remote_access.md:9, 56` documents "acknowledged trusted Local LAN/private `http://` URLs" for pairing, with Tailscale Serve HTTPS as the recommended path. The Android WebView in ADR-01 reported `secure: false` on such a URL.

### Origin Per Finding

| Finding | Confirmed origin | Evidence checked | Scope | Classification, owner | Detectable in source review? |
| --- | --- | --- | --- | --- | --- |
| F-01 Org run row never opens | **The design.** BEH-002 says "an Org run opens its first member", and the spec says "(its first member), as the desktop's target resolver does". But the design's Interface Mapping sends the Org run row to the subject action's `open`. `open` only opens the context for inspection and selects nothing (`useWorkspaceHistorySubjectActions.ts:64-79`; mobile branch `:83-86`). `AgentOrgExecutionContext.selectedTarget()` returns `null` without a selection (`agentOrgExecutionContext.ts:137-142`). The desktop does not pick a member either. With no `memberAddress` or `agentRunId` in the route, its view selects nothing (`AgentOrgWorkspaceView.vue:108-121`) and shows "active unfocused" (`:20-33`). So the "as the desktop's target resolver does" premise is false, and no owner defines an Org's "first member". An Org root has no coordinator; only Teams do (`agentOrgExecutionViewIndex.ts:132-135`). The implementation followed the mapping | Code at the cited lines; MSP-03 `states: ["list", "opening:", "none:", "list"]` | This ticket | **Design Impact**, Solution Designer. Define which member an Org run row opens (for example the first configured member of `executionTree.rootOrg.members`, and a Team member's coordinator). Decide which shared owner holds that rule, and map the row to `select` with that address | Yes, partly. Round 1 traced the Org open path but did not check that `open` yields a target. That was a review gap: the "Several kinds" check should have traced the `orgRun` kind to its target |
| F-02 `crypto.randomUUID` on plain HTTP | **The implementation scope, through old code this ticket makes reachable.** There are bare calls at `stores/agentRunCollaborationStore.ts:317`, `stores/agentOrgContextsStore.ts:246`, `services/agentCollaboration/agentRunCollaborationStreamingService.ts:135` and `services/agentOrgExecution/agentOrgStreamingService.ts:237`. `services/agentStreaming/TeamStreamingService.ts:157` also uses it as a fallback. `agentRunStore.ts:53-58`, `nodeStore.ts:38`, `teamRunCommandPresentation.ts:9` and `useContextAttachmentComposer.ts:48` already guard it, so the codebase has the rule, repeated four ways. The calls predate the ticket (`agentOrgContextsStore` since `61f633abe6`). The desktop (Electron, localhost) is a secure context, so only the phone hits them, and before this ticket the phone could not reach these sends (BEH-002: own agent only) | `grep` of `randomUUID`; MSP-03 `control` (a send reaches the node when `randomUUID` exists); ADR-01 `randomUUID: "undefined"` | **This ticket.** The two prerequisite questions decide it. First, the ticket cannot reach AC-003 or AC-004 on a supported HTTP pairing. Second, the functionality is "talk to a delegated child or an Org member from the phone" (UC-002), which this ticket delivers, and the phone is the only client that runs outside a secure context. `agentRunCollaborationStore` is already in the Change Scope. The fix adds no behavior | **Local Fix**, implementation. One guarded id helper, from the existing `agentRunStore` pattern, at the four bare call sites and the Team fallback. The Solution Designer records the Change Scope extension to `agentOrgContextsStore` and the two streaming services | No. The dependency on a secure context exists only at runtime, in call sites the change did not edit |
| F-03 Unpair confirmation under the sheet | **The implementation**, introduced by this change. `MobilePairedShell.vue:44-47`: `@unpair` sets `showUnpairConfirm` and leaves `showConnection` true. The sheet teleports to `<body>` at `z-50` (`MobileBottomSheet.vue:4-5`). `MobileUnpairConfirm` renders in place, also at `z-50` (`MobileUnpairConfirm.vue:2`), and earlier in the DOM, so the sheet covers it. The unit test clicks through test-utils, which does no hit-testing | Code; MSP-09 `confirmOnTop: {onTop: false, hit: "mobile-unpair"}`; ADR-03 | This ticket | **Local Fix**, implementation. Close the sheet when the confirmation opens, or stack the confirmation above the sheet. Add a hit test (for example `elementFromPoint`) in a component or probe check | Yes. Review gap: both files were read in round 1 |
| F-04 Reference screen shows the shared viewer's header | **The implementation.** `MobileTeamReferenceViewer.vue:5-9` embeds `CollaborationMessageReferenceViewer`, whose own header (`CollaborationMessageReferenceViewer.vue:8-46`: name, full path, edit, preview, maximize at `p-1.5`) renders under the phone bar. VIS-011 has the bar and the file only. The Files viewer (`MobileFileViewer.vue`) renders `FileViewer` directly and matches VIS-029 | Code; `MSP-11-reference-open-*.png`; MSP-11 `reference-open: BUTTON 28×28` ×3 | This ticket | **Local Fix**, implementation. Render the reference without the shared header and keep the autobyteus-358 loading and unavailable states. For example, add a prop on the shared viewer that hides its header, with the desktop default unchanged | Partly. It shows only when rendered; IMP-04 did not render the opened reference |
| F-05 Files path part 41×44 | **The implementation**, introduced by this change. The breadcrumb buttons are `h-11 px-1` with no minimum width (`MobileFiles.vue:37`) | Code; MSP-11 `file-open: docs 41×44` | This ticket | **Local Fix**, implementation. Add `min-w-[2.75rem]`, as the Files Retry button at `:31` already has | Yes; minor |
| F-06 No title or Task line on delegated rows | **The design, with an unresolved conflict between authorities.** The normative spec's run row has "the title or Task line" (`ui-ux-spec.md:98`). VIS-002 shows a line under every delegated row and member. The desktop gets these lines from `useTaskWorkerTasks`, which disables them outside the Projects feature: `enabled = isFeatureAvailableInRuntime('projects')`, documented "Summaries exist only where the Projects tab does" (`composables/projects/useTaskWorkerTasks.ts:21-30`). Projects is not on the phone (REQ-009, `mobileFeatureGates.ts:62`). The design never named a source for the phone's line, and implementation assumption 8 followed the existing gate. Showing them changes that gate's contract, so it is not a local choice | Code; VIS-002; MSP-02 `phoneTitles` null against `desktopTitles` | This ticket | **Design Impact**, Solution Designer. Decide the source of the Task line (open Task summaries to the phone, or obtain the user's decision to drop the line) and what member rows show | Yes. Review gap: round 1 accepted assumption 8 without checking it against the spec's row |
| F-07 A member's task agent sits beside the member | **The requirements.** Two approved authorities disagree. The shared source deliberately lifts task-agent leaves to their parent's level (`stores/runHistoryTeamExecutionRows.ts:58-66`, "Only sidebar task-Agent leaves are lifted…"), and DEC-001 makes the desktop Runs view the one list. VIS-002 nests "Code Searcher" under "implementation_engineer" | Code; VIS-002; `MSP-02-desktop-tree.png` | This ticket | **Requirement Gap**, Solution Designer, then the user: desktop parity (DEC-001) or VIS-002 nesting. With nesting, the shared lift rule or a phone-only projection becomes a design decision | No. The implementation matches the approved design |
| F-08 A delegated row's state goes stale under a root that is not open | **The design.** REQ-002 asks for each row's live state. DS-009 relies on the once-read stored view (`ensureStoredView`) and on the live stream of the *selected* host only (`useAgentRunCollaborationSync`). The 5 s poll reads history, not collaboration views. The implementation matches the design, and the desktop behaves the same | Code; MSP-02 `unselected: {seen: ["idle"], afterRootOpened: "offline"}` | This ticket | **Design Impact**, Solution Designer. Name how children of hosts that are not selected stay current on the phone, or obtain agreement that only the open run's tree is live | No. The implementation followed DS-009 |
| F-09 Android 15 status bar covers the bars | **Other functionality: the Android shell.** It targets SDK 35 with no inset handling, so the WebView page runs edge-to-edge. The base had the same exposure. The Scope Guardrail and DEC-006 exclude Android shell changes | ADR-05 `underStatusBarCss: 25`, `openedByCenterTap: 0` | **Prerequisite candidate.** Whether it blocks the ticket depends on the user's Android version, which is unknown. If it is 15 or later, AC-005 on his phone cannot pass | **Requirement Gap**, Solution Designer, named a prerequisite candidate. Ask the user's Android version; if it is 15 or later, a shell-insets Task goes first | No. The cause is outside the change |

### Not A Defect Of This Change

API/E2E recorded FU-002…FU-006 in [follow-ups.md](follow-ups.md). I agree with their placement: none of them blocks an in-scope acceptance criterion, and no file this change touched causes them. This review added no follow-ups.

### Review Gaps In Rounds 1–2

F-01, F-03 and F-06 were detectable from source read in round 1 and were missed. F-05 was a minor miss. As a result, round 2's 9.3 for Runtime Correctness And Behavioral Fidelity was too high. Measured against the evidence now available, that category is below the pass bar. The round-1 report's statement that the deviations were accepted is withdrawn for assumption 8.

### The Check That Lets These Through (Project Documents)

Phone behavior that depends on a real browser context or on real stacking passed the component tests:
- the secure-context APIs (F-02);
- overlay order and hit-testing (F-03);
- shared components embedded in phone screens (F-04).

The earliest stage that reproduces them is a browser run of the phone bundle. `TESTING.md` has no phone rule. As part of this ticket, it should state that:
- phone changes are validated with `test:e2e:mobile-shell`, on a non-secure private HTTP origin;
- phone overlays and sheets are checked with real taps (hit-testing), not test-utils clicks.

`TESTING.md` is owned by the API/E2E engineer. The Solution Designer routes it with the rework.

## Follow-ups

- Follow-ups this review added: None. FU-002…FU-006 were added by API/E2E.

## Classification

- Round 3 (failure-origin), mixed:
  - **Design Impact:** F-01, F-06, F-08.
  - **Requirement Gap:** F-07 (two approved authorities disagree) and F-09 (a prerequisite candidate in the Android shell).
  - **Local Fix, owned by implementation:** F-02, F-03, F-04, F-05.
  - No API/E2E-owned problem. The probe and its tests are valid.
- Round 2: none (`Pass`). Round 1 was `Local Fix`, owned by implementation (CR-001…003), and all three are resolved.

## Recommended Recipient

- Round 3: `solution_designer`, `/software_engineering_team/solution_designer`. The rule is "review identifies a Design Impact, Requirement Gap, or Unclear issue".
  - F-01, F-06 and F-08 change the row and open mapping that the Local Fixes sit beside, so one revised package goes to implementation.
  - F-02…F-05 are ready as stated and need no design change, apart from recording F-02's Change Scope extension.
  - After rework: source review, then API/E2E again.
- Round 2: `api_e2e_engineer`, `/software_engineering_team/api_e2e_engineer` (the rule "implementation review passes and the cumulative package is ready for API, end-to-end, and executable coverage work"). The implementation engineer gets an informational notification.

## Residual Risks

- C-06: with the node back, the 5 s poll lists runs while the bar keeps its last "Not reachable" until a check runs. This is as designed (DS-001), and the spec's not-reachable state shows runs as last loaded with Check. API/E2E should observe it on the device; if the user finds it confusing, it is a design question, not a defect here.
- C-04: a failed open with an earlier target renders that target for a moment before Back lands. Watch for it during API/E2E's failure-path checks.
- Left to API/E2E by the handoff:
  - real delegation, Team, Org and remote data;
  - the two-server remote case;
  - Android Back in WebView and iOS WKWebView;
  - cellular cost (R-001) and wake (R-002).
- The shared composer's Upload (28px) and Send (36px) buttons are below 44px (QR-001). The composer is outside the spec's scope, so this is known and not attributable to this change.

## Latest Authoritative Result

- Review Decision: `Fail`. This is the failure-origin result of round 3 (CRR-003), which supersedes round 2's `Pass` for routing.
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`. Every failing scenario is approved behavior on a supported surface; F-02's HTTP origin is a Supported Explicit Edge.
- Material-Premise Gate: `Fail` for F-01. The design's premise that Org open works "as the desktop's target resolver does" is false.
- Score Summary: no new scorecard (failure-origin round). The round-2 Runtime Correctness rationale is withdrawn because of the review gaps on F-01, F-03 and F-06.
- Failure Origin:
  - the design: F-01, F-06, F-08;
  - the requirements: F-07;
  - the Android shell, a prerequisite candidate: F-09;
  - the implementation: F-02 (old code this change makes reachable), F-03, F-04, F-05.
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Round 2 notes (implementation review, Pass):
  - Round 2 resolved CR-001…003; its CRR-002 `Pass` is superseded for routing by round 3.
  - Round 2 resolves CR-001…003 with tests, and adds nothing beyond the findings.
  - Package: HEAD `e7b3af5059`; code at `f2816cc7c1`.
  - Round 1's notes still hold:
  - The architecture is sound and faithful to SR-004. The phone reads the desktop's owners, and the desktop paths are behavior-equivalent:
    - the load: same calls and same error swallowing;
    - read-only: each surface receives only its own Org kinds (`AgentOrgWorkspaceView.vue:47-63`);
    - the route Org: the same expression;
    - `onOpenAgentRun`: the same two calls.
  - The three findings are small local fixes. The re-review will be a targeted delta.
