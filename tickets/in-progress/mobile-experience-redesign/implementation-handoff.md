# Implementation Handoff — mobile-experience-redesign (autobyteus-277)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High). `ARCH-REV-002` passed the SR-004 design; this round implements SR-005/SR-006, which passed as `ARCH-REV-004`. The handoff rule for a Large/High implementation selects Code Review.
- Requirements doc: [requirements-doc.md](requirements-doc.md) — SR-005, Approved (REQ-001…009 plus REQ-002a, REQ-003a, REQ-011; AC-001…011; DEC-009…015).
- Investigation notes: [investigation-notes.md](investigation-notes.md) — E-01…E-32.
- Solution revision record: [solution-revision-record.md](solution-revision-record.md) — SR-001…SR-006.
- Design spec (required on every route): [design-spec.md](design-spec.md) — SR-006 (sections "Revision For ARCH-REV-003 (SR-006)" and "Revision For CRR-003 (SR-005)").
- Supplemental task artifacts: the Product UI/UX spec and VIS-001…029, `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md` at design revision `e6ca7b6098` (normative); [follow-ups.md](follow-ups.md).
- Design review report: [design-review-report.md](design-review-report.md) — `ARCH-REV-004`, Pass.
- Architecture review revision record: [architecture-review-revision-record.md](architecture-review-revision-record.md) — up to `ARCH-REV-004`.
- Triggering rework report, revision record, or evidence, when applicable:
  - API/E2E round 1, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md) (`API-REV-001`, Fail: F-01…F-09);
  - the code reviewer's failure-origin review, [code-review-report.md](code-review-report.md) section "API/E2E Failure-Origin Review (Round 3)" (`CRR-003`: Local Fixes F-02…F-05);
  - the revised design (SR-005, SR-006; `ARCH-REV-004` Pass). Earlier: `CRR-001` (CR-001…003, fixed in IR-002).

## Current Implementation Summary

The `/mobile` shell is rebuilt as the approved design on the desktop's owners. The phone keeps no model of its own.

- **Shared layer (desktop unchanged)** — commit `218c004f0e`:
  - `useRunHistorySectionLoad` owns the history load, the window and the 5 s poll, and returns each read's result; the desktop run section adopts it.
  - `useTargetConversation` owns a target's conversation binding (display name, read-only rule, sender names, remote view); both desktop surfaces adopt it.
  - `agentRunCollaborationStore` gains `ensureStoredView` and `selectTaskRow`; `AgentRunTaskRows` adopts them.
  - The selection actions gain `shell` (mobile: `selectionMode: 'mobile'`, no shell navigation) and `onOpenAgentRun`, which `RunListRow` and `RunDefinitionGroups` now use. `onCreateRun` moves into `WorkspaceAgentRunsTreePanel`.
  - The subject actions gain `shell` (mobile: open and select, no router call) and the pure `agentOrgRouteQuery`.
  - `useRouteSelectedAgentOrg` replaces the two desktop copies.
  - `selectTreeRun` passes `selectionMode`, and its local-run branch honors it.
  - `useRunListDisclosure` gains `defaultExpansion`.
- **Phone** — commit `27e8b359e6`:
  - The run list (`MobileRunList`, `MobileRunRow`) renders `buildMobileRunTreeRows` through `useMobileRunTree`.
  - The open sequence is `useMobileRunOpening` with the pending open in `mobileRunOpeningStore`. The run screen (`MobileRunScreen`, `MobileRunTargetView`, `MobileRunMenu`) shows "Opening…" while an open is pending.
  - `useMobileNavigation` is the only writer of `/mobile`'s query. Back walks the screens, and the Org keys are kept on the list entry.
  - The four view screens read `activeWorkspaceTarget`.
  - New run is agent only.
  - The connection sheet lists the peers read only.
  - `MobilePairedShell` owns the history load (complete window; it polls only while the list shows and the page is in front), the status check with the 401 rule, and `useAgentRunCollaborationSync`.
  - A conversation's file link opens on the Files screen.
  - Removed: `mobileWorkStore`, `MobileWorkContext`, the catalog, Home, the tabs, the Switch sheet, team launch, and their tests.
  - Docs: `autobyteus-web/docs/remote_access.md`.
- **CRR-001 fixes** — commit `f2816cc7c1` (IR-002): the run list's Retry goes through the paired shell's status check (CR-001); the Files folder error names no tab (CR-002); a bottom sheet passes its title id to a custom header, so the connection sheet's dialog is named (CR-003).
- **IR-003: SR-005/SR-006 and CRR-003's local fixes** — commits `02905f49b5`, `02718f21bf`, `4207af0889`, `9b4066b4df`, `1a48f4affe`:
  - `utils/randomId.ts` `createRandomId()` at the ten listed call sites, each keeping its prefix, so the sends work on a trusted private HTTP pairing (F-02, DEC-014).
  - `useTaskWorkerTasks`: summaries everywhere, `locate` only where Projects is (`canLocate`). The phone's delegated rows show their Task's summary, else a remote run's title; members and an Org's task rows show their name only (F-06, REQ-002a, DEC-010).
  - `agentOrgFirstMemberAddress` in `utils/agentOrgHistoryRows.ts`; the phone's Org run row opens through `select` with that address, and the same address is in the route keys (F-01, REQ-003a, DEC-012).
  - F-03: Unpair closes the sheet before the confirmation shows. F-04: `CollaborationMessageReferenceViewer` `hideHeader` (default false), used by the phone's reference screen. F-05: the Files path parts are 44 px wide.
  - The Android shell's insets: `ui/SystemBarInsets.kt` pads `WebShellScreen`'s and `ConnectionScreen`'s roots with the system bars, display cutout and keyboard (F-09, REQ-011, DEC-011). No permission, dependency or targetSdk change.
  - Not added, as the design says: `refreshListedRoots`, `readRevision` (DEC-013 revised; FU-007).
  - Docs: `remote_access.md`, `autobyteus-android/README.md`, `docs/android_mobile_access.md` (stale Home/Team steps too).
- **Polish and cleanup** — commits `e0788fe987`, `599002ecbf`, `b2d7a084dd`:
  - touch targets and the sheet's focus outline, from the rendered check;
  - removal of the helpers only the removed screens used;
  - removal of `useTeamRunRuntimeCatalogSync`, whose only caller was the phone's team launch.

- Implementation cycle: `Rework`
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-003` (IR-001 baseline, IR-002 CRR-001 fixes)
- Related solution revision IDs: `SR-005` (requirements), `SR-006` (design; SR-005 for CRR-003)
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` (Fail — Local Fix), `CRR-002` (Pass), `CRR-003` (failure-origin: Local Fixes F-02…F-05)
- Related API/E2E revision IDs: `API-REV-001` (Fail)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: F-01, F-02, F-03, F-04, F-05, F-06, F-09 (API-REV-001 / CRR-003, through SR-005/SR-006); F-07 and F-08 need no code (DEC-009 (a), DEC-013 revised). The architecture reviews' residual risks are handled; see Known Risks.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 135 files changed in `autobyteus-web` up to IR-002; IR-003 adds the id helper at ten sites, the `useTaskWorkerTasks` split, the Org first-member helper and three Kotlin files.
  - Shared owners used by the desktop changed: the history load, the conversation binding, the collaboration row rules, the open actions, disclosure and route-Org.
  - Ownership moved from the phone's model to the shared target and selection owners.
  - A history poll runs on the phone.
  - No server, persistence, security or contract change.
  - None of the design's escalation triggers fired. The desktop's behavior is unchanged, as the desktop tests of every touched shared file show (IMP-01). No open action needed shell navigation. No screen needed a server change. Navigation uses `vue-router` only.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-002; DS-001, DS-002) | The desktop Runs view's runs and their tree on the phone | `MobilePairedShell` → `useRunHistorySectionLoad({ window: () => null, polling })` → `runHistoryStore` → `runListStore.shownEntries` → `useMobileRunTree` (collaboration `taskRows` + `ensureStoredView`, `team.executionRows`, `projectAgentOrgHistoryRows`, phone disclosure `{ orgRuns: true, orgTaskTeams: false }`) → `buildMobileRunTreeRows` → `MobileRunList`/`MobileRunRow` | Implemented. Fold "Show older (N)"/"Show fewer"; rails; node chips; "Not reachable"; ages; loading/empty/error states (VIS-021…023) |
| BEH-002 (REQ-003; DS-003, DS-009) | A tap opens that agent's conversation; Team/Org runs open their coordinator | `MobileRunRow` → `useMobileRunOpening.open`: `mobileRunOpeningStore.begin` (ends the selection intent in flight) → `useMobileNavigation.openRun({ orgQuery })` → shared action in the phone shell (`onOpenAgentRun`, `selectTaskRow` + `onSelectRun`, `onOpenTeamRun`, `onSelectTeamMember`, subject `execute`) → `commit` (on `emitRunSelected` or a `committed` outcome) or `fail` → `MobileRunScreen` → `MobileRunTargetView` → `useTargetConversation` → `AgentEventMonitor` | Implemented. Opening… never shows the previous target. A failed open goes back to the list. A promoted `temp-*` id keeps the conversation (the screen reads the target) |
| BEH-003 (REQ-005, REQ-007, REQ-009; DS-004, DS-005, DS-008) | Route-driven screens; ⋮ views; Back walks file → view → run → list | `useMobileNavigation` (route query, `router.back()`, parent fallback); `MobileRunMenu`; `views/MobileArtifacts`, `MobileFiles` (+`MobileFileViewer`), `MobileMessages` (+`MobileTeamReferenceViewer`), `MobileActivity`; `useEventMonitorFilePreview` phone branch → `openFile` | Implemented. Messages only for member kinds. No filters, no Attach. A remote run's Files and Artifacts use 278's wording. The Messages loading/unavailable behavior is kept (autobyteus-358) |
| BEH-004 (REQ-006; DS-006) | "+" → New run for an agent; five rows with sheets; Create run → conversation | `MobileRunList` "+" → `openNewRun` → `MobileNewRun`/`MobileRunSetup` (`MobileChoiceSheet` ×2, `MobileRuntimeModelRows`, switch) → `useMobileRunSetupController` (preselection: the target's agent, else "Project Task Manager", else the first) → `useMobileRunLaunchCoordinator.createAgentRun` (`createRunFromTemplate({ selectionMode: 'mobile' })`) → `openRun({ replace: true })` | Implemented, agent only (DEC-007). Disabled with the baseline reason. "Open a folder by path" in the folder sheet's footer |
| BEH-005 (REQ-004; DS-002, DS-003) | A run on another node: chip, state, title; opens as in 278; unreachable: notice and Retry | The rows' `remote` from the transient rows and `remoteRunsStore`; `MobileRunTargetView` shows `RemoteRunNotice` when `remoteView.unreachable`; the composer stays text-only through the existing `useComposerTarget` | Implemented. The two-server behavior itself is not exercised here (API/E2E) |
| BEH-006 (REQ-008; DS-007) | The node name opens the connection sheet; read-only peers; unpair | `MobileRunList` node button → `MobileConnectionSheet` (`remoteCollaborationStore.load()`, `remoteCollaborationOffersStore.askAll`) → `MobileUnpairConfirm` → `deleteLocalSession`; the not-reachable bar and banner from `authorizedApiReachable` after the first check | Implemented |
| BEH-007 (REQ-009) | No row actions on the phone | `MobileRunRow` has the body and the chevron only | Implemented |
| REQ-002a, REQ-003a, REQ-011 (IR-003) | Second lines where data exists; an Org run opens its first member; sends on HTTP pairing; Android 15 insets | `useMobileRunTree` → `useTaskWorkerTasks.taskOf` → `buildMobileRunTreeRows` (`taskSummary` → Task summary, else remote title, else none); `MobileRowOpen { orgRun }` → `useMobileRunOpening` → subject `execute({ action: 'select', memberAddress: agentOrgFirstMemberAddress(orgRun) })` with the same address in `agentOrgRouteQuery`; `createRandomId()` in the collaboration, Org, Team and agent sends; `WebShellScreen`/`ConnectionScreen` → `SystemBarInsets.pad(root)` | Implemented. Delegated rows under a run that is not open keep the state last read, as on the desktop (DEC-013) |
| Preserved | Pairing, the post-pair check, unpair, the unsupported notice, the 401 rule | `MobileRemoteAccessShell` (pairing, route pairing link), `MobilePairedShell` (`checkStatus`: `Promise.allSettled([fetchStatus, initialLoad / load()])`, `isRemoteAccessAuthFailure`); the list's Retry and the sheet's Check connection both run `checkStatus` (CR-001) | Kept. Notice copy for `desktopWorkspace` per spec |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Shared: `composables/runHistory/useRunHistorySectionLoad.ts`, `composables/runHistory/useRouteSelectedAgentOrg.ts`, `composables/workspace/useTargetConversation.ts`, `composables/useWorkspaceHistorySelectionActions.ts`, `composables/useWorkspaceHistorySubjectActions.ts`, `composables/useRunListDisclosure.ts`, `stores/agentRunCollaborationStore.ts`, `stores/runHistorySelectionActions.ts`, `stores/runHistoryStore.ts`; the desktop adopters `WorkspaceAgentRunsTreePanel.vue`, `RunListPanel.vue`, `RunListRow.vue`, `RunDefinitionGroups.vue`, `AgentRunTaskRows.vue`, `AgentWorkspaceSurface.vue`, `TeamWorkspaceSurface.vue`, and the two section contracts.
- Phone: `components/mobile/{MobileRemoteAccessShell,MobilePairedShell,MobileScreenBar,MobileBottomSheet}.vue`, `components/mobile/{runList,runScreen,views,newRun,connection}/`, `composables/mobile/{useMobileNavigation,useMobileRunTree,useMobileRunOpening,useMobileRunSetupController,useMobileRunLaunchCoordinator,useMobileLaunchWorkspaces,useMobileWorkspaceFileExplorer}.ts`, `stores/mobileRunOpeningStore.ts`, `utils/mobile/{mobileRunTreeProjection,mobileRunStatusLabel}.ts`, `utils/remoteAccess/remoteAccessAuthFailure.ts`, `composables/useEventMonitorFilePreview.ts`.
- Probe fixture and scenario kept current: `tests/e2e/fixtures/fresh-run-auto-approval.page.vue` and `fresh-run-auto-approval-probe.mjs` B08 (agent only). The other fixtures gain `onOpenAgentRun`.

## Important Assumptions

Where the implementation goes past, or differs from, the letter of the design. Each choice stays inside the design's ownership.

1. **Where the tree lives.** `useMobileRunTree` is instantiated once in `MobilePairedShell`, and the run list stays mounted (`v-show`) under the other screens. One disclosure instance therefore keeps its folds and its scroll across ←, and the run screen reads "in <parent>" from the same rows.
   - `useMobileRunOpening` is in `MobileRunList`, as designed.
   - `MobilePairedShell` is a file the mapping does not name: it is the paired part of the shell. The load, the poll and the collaboration sync mount only while the phone is paired, and `MobileRemoteAccessShell` keeps pairing.
2. **Extra small files:**
   - `MobileRunTargetView` (the open state: one `useTargetConversation` per open target);
   - `MobileRuntimeModelRows` (replaces `MobileLaunchRuntimeModelCard`);
   - `utils/mobile/mobileRunStatusLabel`.
3. **`MobileRunTreeRow` fields.** It also carries `avatar`, `fold` (which disclosure the chevron folds) and `lastActivityAt` (top-level rows only), which the presentation needs.
   - `open` is `null` for a row there is nothing to open for: a Team member's delegated Team, whose row has no agent and no known coordinator (the desktop opens nothing there either). A tap on its body folds it.
4. **The poll reads once when it resumes** (back on the list, or the app back in front), then every 5 s. This is for R-002: a phone that wakes shows current states at once.
5. **`back()` uses vue-router's history state.** A screen with no app entry under it (a reload or a link) goes to its parent screen instead of leaving the app.
   - `openRun({ replace: true })` from New run goes Back to the list, then opens as usual. The list entry then loses an Org's keys left from an earlier open, so the list does not mark the old Org after a new run.
6. **Copy the spec does not give exactly:**
   - the post-pair line now reads "Refreshing Phone Access status before your runs open." (it named Home);
   - an over-large file says "This file is too large to show on the phone." (the spec says only "too large");
   - a peer whose offer is being asked shows "Checking…".
7. **Statuses and names.**
   - An Org run's dot is Running while it is active, else Stopped (the desktop's running/stopped).
   - Org member names use `memberDisplayName`, as the desktop's Org rows do (underscores become spaces).
8. **Row title lines (revised in IR-003).** As SR-005 decides: a Task worker's current Task summary, else a remote run's title, else no second line. The phone reads the summaries through the same `useTaskWorkerTasks`, now that only `locate` is gated on Projects. Assumption 8 of IR-001 is withdrawn.
9. **Android insets (IR-003).** The inset rule is one small helper, `ui/SystemBarInsets.kt`, that both screens call on their root. `MainActivity.kt` needs no change: it already sets each screen as the content view. No `windowSoftInputMode` change was needed: on API 35 the keyboard's inset reaches the padded root (883 px), and the page gets shorter above it.
10. **An Org run with no member** has nothing to open (`open: null`), rather than a `select` without an address.
11. **`createRandomId()` outside a secure context** builds a UUID v4 from `crypto.getRandomValues`, which every context has, so ids keep the UUID shape there too.

## Known Risks

- **ARCH-REV-004 residual 1 (AC-002a probe).** Opening a *stopped* root reuses its settled stored view and does not re-read it (`agentRunCollaborationStore.ts` `syncHost`), as on the desktop. For AC-002a's "a child's changed state shows once that run is opened", use a running root, or record the stopped-root case as desktop parity.
- **ARCH-REV-004 residual 2 (double bottom padding): checked.** On API 35, inside the padded WebView, the page's `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` read `0px` with the keyboard closed and open (IMP-08). On API 34 the root gets no padding and nothing moves.
- **Not checked on a device.** The insets were checked on the API 35 and API 34 emulators, not on the user's phone. The phone screens on a paired node over HTTP (the id helper's real case) are for `test:e2e:mobile-shell` (API/E2E).

- **CRR-001 residual risks, for API/E2E (not findings):** C-06, the poll lists runs while the bar keeps its last "Not reachable" until a check (as designed); C-04, a failed open whose screen had an earlier target can show that target for a moment before Back lands on the list.

- **Review residual 1 (commit attribution): closed.** `mobileRunOpeningStore.begin` calls `selectionStore.invalidateSelectionIntent()`, so an earlier open cannot emit after a new tap. Tests: `stores/__tests__/mobileRunOpeningStore.spec.ts` "a new open ends the selection intent in flight", and `useMobileRunOpening.spec.ts` "an earlier open's late outcome does not end the newer open".
- **Review residual 2 (a failed open leaves the list entry rewritten): covered by a test.** `useMobileRunOpening.spec.ts`: "a failed Org open fails the pending open and leaves the list entry rewritten with its keys".
- **Review residual 3 (Org `mode` from the history item).** Kept as reviewed. `agentOrgRouteQuery` is the only builder of the Org keys, used by both shells (tested in `useWorkspaceHistorySubjectActions.spec.ts`).
- **Review residual 4 (stale design text).** Already fixed upstream in commit `45fbb2ceee`.
- **Review residual 5 (desktop safety).**
  - The unified read-only rule is tested per desktop surface in `components/workspace/__tests__/TargetConversationReadOnly.spec.ts`.
  - The desktop tests of every touched shared file are green (IMP-01).
  - `useWorkspaceHistorySelectionActions.spec.ts` and `workspaceSelectionComposition.spec.ts` are updated for the `onCreateRun`/`startPresetChat` move.
- **Touch targets of the shared composer.** Its Upload (28×28) and Send (36×36) buttons are below 44×44. The spec keeps the shared composer unchanged (out of scope), so QR-001 cannot be met for those two controls. Every phone-owned control measures ≥ 44 (IMP-04).
- **Not seen with real data.** Real delegation trees, remote runs, offers and models were not rendered with live data here (no backend in IMP-04), and nothing was checked on a device. R-001 (cellular cost of the complete history), R-002 (wake) and the Back key on Android WebView and iOS WKWebView remain for API/E2E and the device.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature, behavior change, bug fix of the invisible delegated runs).
- Reviewed root-cause classification: Boundary Or Ownership Issue, with Duplicated Policy Or Coordination.
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`. The phone's model is removed. The three shared rules are extracted to their owners. The two open composables get the mobile shell.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: `grep` finds no `mobileWorkStore`, `MobileWorkContext` or `useMobileWorkCatalog`, and the shell spec asserts their absence from the phone's sources.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`.
  - The Removal Plan in full.
  - `utils/mobile/mobileSelectionAdapter.ts` (only the old shell used it).
  - `useMobileLaunchWorkspaces`: its root-path lookups, its refreshing flag and its group labels.
  - `useMobileWorkspaceFileExplorer`: `recentFiles` and its unused returns.
  - `useTeamRunRuntimeCatalogSync` and its spec: the phone's team launch was its only caller. A stale mock of it in `agentTeamRunStore.spec.ts` goes too.
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`.
  - `MobileRowOpen` and `MobileRowFold` are discriminated unions.
  - The disclosure's default is one two-flag option.
  - The selection and subject actions gain one `shell` option each.
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Changed source implementation files stayed within the size guardrails: `Yes`.
  - The largest changed source file is `stores/runHistoryStore.ts` at 491 effective lines, +4 lines in this change.
  - The new `utils/mobile/mobileRunTreeProjection.ts` (209 lines, a 222-line delta) is one pure concern: the flattening and its row types. That passes the >220 assessment.
- Notes: `typecheck-baseline.json` shrinks by 3 test-file errors, from the deleted specs.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`.
- Design-spec decision reference: "Persisted Data / State Transition Decision".
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Evidence:
  - `mobileWorkStore` held memory only.
  - The screen state is the URL query.
  - The pending open is an in-memory Pinia store.
  - The pairing session key is unchanged.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- The worktree had no `node_modules`, so I ran TESTING.md's install order: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`.
- The untracked `autobyteus-application-*/dist/` folders are build outputs of the typecheck's `prepare:shared-types` step and are not committed.
- No dependency changed.
- IR-003 created a test-owned AVD, `autobyteus277_api34` (Android 14, `system-images;android-34;google_apis;arm64-v8a`, Pixel 6), for the older-API check, and kept it for the API/E2E rerun beside `autobyteus277_api35`. Both emulators are stopped. Remove it with `avdmanager delete avd -n autobyteus277_api34`.

## Checks Run

The evidence files are in [evidence/](evidence/).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web test:nuxt --run` (the full web unit and component suite) | `599002ecbf` | macOS, Node v22.23.1 | All of `autobyteus-web`. It includes the new phone specs and the desktop specs of every touched shared file. | REQ-001…009; AC-001…003, 005…009 (component level); review residuals 1, 2, 5 | Pass | `evidence/IMP-01-web-unit-tests.txt` | `Test Files  700 passed (700)`; `Tests  5190 passed \| 2 skipped (5192)` |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | `1a48f4affe` | same | Nuxt app, Electron main, build scripts, cross-package tests | — | Pass | `evidence/IMP-02-web-typecheck.txt` | `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`; `[typecheck] PASS` |
| IMP-03 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `1a48f4affe` | same | Web boundary and localization rules | QR-002 (no filler) | Pass (exit 0 each) | `evidence/IMP-03-web-guards.txt` | `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.` |
| IMP-04 | Rendered self-check. A temporary, uncommitted preview page rendered each phone surface with seeded data on a Nuxt dev server whose backend was `127.0.0.1:9`; `/rest/health` was answered ok and `/graphql` with an error. Headless Chrome at 390×844 and 360×800 measured horizontal scroll and the controls under 44×44 CSS px. | `e0788fe987` | macOS, Chrome, Nuxt dev | `components/mobile/**` presentation: run list (default, expanded with the open row, node not reachable with the notice, empty), Opening…, run screen, ⋮ menu, Artifacts, Activity, Messages, Files, New run, Agent sheet, connection sheet | AC-005, QR-001, QR-004 (`100dvh`, safe area); VIS-001, 002, 005, 006, 010, 012, 015, 016, 019, 022, 024 | Pass, with one limitation: the shared composer's own buttons | `evidence/IMP-04-render/IMP-04-render-facts.txt` and 29 PNGs `IMP-04-<view>-<width>x<height>.png` | Every view: `scrollWidth` = `clientWidth` (no horizontal scroll); `smallTargets: []` except `run`/`menu`: `Upload files 28×28`, `Send message 36×36` (the shared composer) |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run components/mobile composables/mobile` (the phone's specs, with the three CRR-001 tests) | `f2816cc7c1` | same | `components/mobile/**`, `composables/mobile/**` | CR-001 (REQ-008, VIS-024), CR-002, CR-003 (QR-001 roles and names) | Pass | `evidence/IMP-06-phone-tests-crr001.txt` | `Tests  83 passed (83)`; the case "Retry after a failed first check reads again through the status check: the runs list, the bar says Connected, the banner goes" |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt --run` (the full web suite, IR-003) | `1a48f4affe` | macOS, Node v22.23.1 | All of `autobyteus-web`, with the new specs: `utils/__tests__/randomId.spec.ts`, `agentOrgFirstMemberAddress.spec.ts`, the `useTaskWorkerTasks` phone case, the projection's second lines and memberless Org, the Org first-member open, the unpair sheet, `hideHeader`, the path targets | REQ-002a, REQ-003a; F-01…F-06 | Pass | `evidence/IMP-07-web-unit-tests-ir003.txt` | `Test Files  701 passed (701)`; `Tests  5198 passed \| 2 skipped (5200)` |
| IMP-08 | Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin`, then `:app:connectedDebugAndroidTest` on AVD `autobyteus277_api35` (API 35) and on a test-owned AVD `autobyteus277_api34` (API 34); the debug APK's connection screen on both (screenshot, view bounds) | `1a48f4affe` | macOS, JDK 21, Android emulators (arm64) | `autobyteus-android` `ui/SystemBarInsets.kt`, `WebShellScreen.kt`, `ConnectionScreen.kt`; instrumented `SystemBarInsetsTest`, `WebShellWindowInsetsTest` (a real WebView in the real window) | REQ-011, AC-011 (emulator part); ARCH-REV-004 residual 2 | Pass | `evidence/IMP-08-android/IMP-08-android-insets.txt`, `IMP-08-connection-screen-api35.png`, `IMP-08-connection-screen-api34.png` | API 35: `padding=136,63 page="0px\|0px\|839"` closed, `padding=136,883 page="0px\|0px\|527"` open; API 34: `padding=0,0 rootTop=128`; `run finished: 12 tests, 0 failed` on both |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/agentTeamRunStore.spec.ts` | `b2d7a084dd` | same | The Team run store, after the removal of `useTeamRunRuntimeCatalogSync` | — | Pass | `evidence/IMP-05-team-store-spec.txt` | `Tests  28 passed (28)` |

IR-003 rerun plan (`git diff --name-only bb80e60c97 1a48f4affe`, code only: the id helper and its ten call sites, `useTaskWorkerTasks`, the projection, `useMobileRunTree`, `useMobileRunOpening`, `agentOrgHistoryRows.ts`, `MobilePairedShell.vue`, `CollaborationMessageReferenceViewer.vue`, `MobileTeamReferenceViewer.vue`, `MobileFiles.vue`, three Kotlin files, specs and docs):

- **Rerun:** the full web suite (IMP-07), because shared stores and services changed; IMP-02 and IMP-03; IMP-08 is new.
- **Still valid:** IMP-04 for the surfaces it rendered: the row second lines are text in the existing title line, and the other changes do not touch those screens' layout. The reference screen (F-04) was not in IMP-04; API/E2E's MSP-11 renders it.

IR-002 rerun plan (`git diff --name-only b2d7a084dd f2816cc7c1`: `MobileRunList.vue`, `MobilePairedShell.vue`, `MobileBottomSheet.vue`, `MobileConnectionSheet.vue`, `useMobileWorkspaceFileExplorer.ts` and three phone specs):

- **Rerun:** IMP-02 and IMP-03 (cheap; on `f2816cc7c1`); IMP-06 is new and covers every spec of the changed files: they are all under `components/mobile` and `composables/mobile`, and no file outside them imports the changed files.
- **Still valid:** IMP-01 for everything outside the phone folders (nothing it exercises there changed); IMP-04, because the fixes change no rendered layout: Retry's button is the same, the sheet heading gains an `id`, and the Files error string is shorter.

Earlier, IMP-01, IMP-03 and IMP-04 stayed valid at `b2d7a084dd`, by the impact rule:

- `599002ecbf` changed no markup the render shows. The workspace items lost a `group` field that the controller already dropped.
- `b2d7a084dd` removes a composable nothing imported, its spec and a stale mock; IMP-02 and IMP-05 ran on that tree.

Not run, and left to API/E2E or the device:

- a browser probe against a probe-owned real stack with delegated, Team, Org and remote fixture runs (design step 8);
- the two-server remote run journey of 278;
- the user's device (IMP-08 covers the API 35 and API 34 emulators);
- `test:e2e:mobile-shell` on a non-secure private HTTP origin with real-tap overlay checks (TESTING.md's new phone rule, owned by API/E2E);
- iOS Safari/WKWebView;
- cellular cost (R-001) and wake (R-002);
- server suites, which nothing here touches.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: UIS-001…UIS-010, UXJ-001…UXJ-008.
- Approved references:
  - the Product UI/UX spec at `e6ca7b6098` and VIS-001…029;
  - the reference's components (`MobileRunsScreen`, `MobileRunRow`, `MobileRunScreen`, `MobileConnectionSheet`, `MobileRunSetup` and the sheets), whose markup and classes were followed for layout. Their stores and fixtures were not.
- Existing design system, shared components and adjacent product surfaces reviewed: `RemoteNodeChip`, `RemoteRunNotice`, `agentStatusDotClass`, `AgentEventMonitor` and the shared composer, `ArtifactContentViewer`, `FileViewer`, `CollaborationMessageReferenceViewer`, `MobileUnsupportedFeatureNotice`, `MobilePairingBootstrap`; the desktop `RunListPanel`/`RunListRow` and the Org/Team trees.
- Testing guideline and rendered surface used: TESTING.md (web unit tests and a browser render). A Nuxt dev server served a temporary preview page in headless Chrome, as the repository's probes do. The page was removed afterwards; the dev server was stopped and its port is free.
- States, layouts, viewports and interactions inspected, at 390×844 and 360×800:
  - run list: default tree; three levels with a task team unfolded and the open row marked; node not reachable (bar and banner) with the unsupported notice; empty;
  - Opening…; the run screen with "Stopped · in Software Engineering Team"; the ⋮ menu of a standalone agent (no Messages);
  - Artifacts empty, Activity empty, Messages with references, Files with an unresolved folder;
  - New run, and its Agent sheet; the connection sheet.
  - Interactions (fold, open, Back, sheets, menu) were exercised in the component tests.
- Visual or interaction issues found and corrected:
  - two Retry links were 36px wide (now ≥ 44);
  - the auto-approve switch's hit area was 32px tall (now 44, with the 56×32 track kept);
  - a focus outline showed around a bottom sheet when focus moved into it;
  - the first render of "empty" was a harness artifact; it was re-rendered.
- Remaining unverified states and limitations:
  - New run's Runtime, Model and Folder rows were seen only in their no-backend states (no runtimes, models or folders).
  - Files was seen only in its unresolved-folder state when rendered; its tree, search and opened file are covered by component tests.
  - The loading state (VIS-021) and the read error (VIS-023) are covered by component tests, not rendered.
  - Nothing was rendered with real data or on a device.

## Downstream Coverage Hints / Suggested Scenarios

- A probe-owned stack with a Project Task Manager run that delegated a task agent, a task team (with members) and a remote run (one node reachable, one not), plus a Team run and an Org run:
  - list order and fold (AC-001); the tree, folding and states (AC-002);
  - a tap on each kind opens its conversation, a message reaches it, ← returns with the row marked at the same scroll (AC-003);
  - "Opening…" only during attach;
  - Back/Forward re-attach;
  - a new run's first message keeps the screen (TR-014).
- An Org run: open a member, ←, the list still marks it; "+" preselects its agent (MP-003).
- The system Back key on Android: file/reference → view → run → list (AC-005).
- The 401 path: a revoked device lands on pairing with no extra read.
- The poll pauses on the run screen and in the background, and resumes on return (network log).
- `fresh-run-auto-approval` probe B08 changed to agent only; rerun it.
- IR-003: on the non-secure HTTP origin, a message to a delegated child and to an Org member reaches the node (F-02); an Org run row opens its first member, and a Team first member opens its coordinator (F-01); Task lines under Task workers and none under members (F-06); Unpair's confirmation is hit-testable (F-03); the reference screen shows only the phone bar (F-04); the path parts measure ≥ 44 px (F-05); Android 15 on the emulator and the user's phone: no bar or control under the system bars, ⋮ opens with a center tap (AC-011).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Code review of the source above (Large/High route).
- Then API/E2E:
  - the browser probe at 390×844 and 360×800 against a probe-owned stack (design step 8);
  - the two-server remote case as in 278 (AC-004);
  - Android emulator and device checks (AC-010; QR-003's 2 s on the user's history over Tailscale; R-001 and R-002);
  - an iOS Safari/WKWebView smoke check (QR-004);
  - the desktop regression (AC-010) beyond the unit suite.
- The user's confirmation on his phone remains the final acceptance (AC-005).
