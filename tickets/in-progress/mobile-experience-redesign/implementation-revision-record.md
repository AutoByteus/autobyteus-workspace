# Implementation Revision Record — mobile-experience-redesign (autobyteus-277)

The current code and [implementation-handoff.md](implementation-handoff.md) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer`, [design-review-report.md](design-review-report.md), round 2 (Pass) | N/A | `Initial Baseline` | `SR-003`, `SR-004`, `ARCH-REV-002` | Implemented; checks IMP-01…05 pass; routed to Code Review |
| IR-002 | `code_reviewer`, [code-review-report.md](code-review-report.md), `CRR-001` (Fail — Local Fix) | CR-001, CR-002, CR-003 | `Local Fix` | `SR-004`, `ARCH-REV-002`, `CRR-001` | Fixed in `f2816cc7c1`; IMP-02, IMP-03, IMP-06 pass; back to Code Review |

## Revision Entries

### IR-001 — The phone as your runs with their delegated work, on the desktop's owners

- Triggering role, report path, and round: `architecture_reviewer`, `design-review-report.md`, round 2, `ARCH-REV-002` Pass.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented on branch `codex/mobile-experience-redesign`, commits `218c004f0e`, `27e8b359e6`, `e0788fe987`, `599002ecbf` and `b2d7a084dd` over base `407f0ee8e9` (plus the Solution Designer's ticket commit `45fbb2ceee`).
- Related solution revision IDs: `SR-003` (requirements), `SR-004` (design).
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the reviewed design.
- Approved behavior or requirement IDs affected: BEH-001…007; REQ-001…009; the review's residual risks 1, 2 and 5 (handled).
- Implementation delta:
  - The shared owners are extracted or extended with the desktop unchanged: `useRunHistorySectionLoad`, `useTargetConversation`, `useRouteSelectedAgentOrg`, the `shell` option and `onOpenAgentRun`, `agentOrgRouteQuery`, `ensureStoredView`/`selectTaskRow`, `selectTreeRun`'s `selectionMode`, the disclosure's `defaultExpansion`.
  - The phone shell is rebuilt, with its tests.
  - The phone model and its screens are removed, and so is the dead code they left: the launch-workspace lookups, `recentFiles`, `useTeamRunRuntimeCatalogSync`.
  - `docs/remote_access.md` is updated.
- Changed files or areas: see the handoff's Key Files Or Areas (135 files in `autobyteus-web`, +4043/−8838 lines over `407f0ee8e9` before `b2d7a084dd`).
- Local validation and result:
  - IMP-01: the full web suite, 700 files and 5190 tests, passes.
  - IMP-02: typecheck PASS.
  - IMP-03: guards pass.
  - IMP-04: rendered self-check at 390×844 and 360×800 — no horizontal scroll, and phone-owned controls ≥ 44×44.
  - IMP-05: the Team run store spec passes.
- Next recipient or routing: Code Reviewer, per the Large/High rule.
- Remaining limitations or risks:
  - The shared composer's Upload and Send buttons are below 44×44; the composer is unchanged by the spec.
  - Nothing was checked with real data or on a device (R-001, R-002, the Back key on WebView).
  - See the handoff's Known Risks and Important Assumptions.

### IR-002 — CRR-001 local fixes: Retry through the status check, the sheet's name, Files copy

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md` and `code-review-revision-record.md`, `CRR-001`.
- Triggering finding IDs: CR-001, CR-002, CR-003.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 (`1fc93d45ce`), CRR-001 Fail.
- Current authoritative result: `f2816cc7c1`; the classification stays Large/High, so it returns to Code Review.
- Related solution revision IDs: `SR-004`.
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: `CRR-001`.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: the code review's three findings.
- Approved behavior or requirement IDs affected: REQ-008 / VIS-024 (CR-001: the bar and the banner after Retry); REQ-007 (CR-002); QR-001 (CR-003: the dialog's accessible name).
- Implementation delta:
  - CR-001: `MobileRunList` emits `retry` instead of reading the history itself; `MobilePairedShell` runs `checkStatus()` on it: status, the history load with its definitions and catalog, the 401 rule, and the reachability record.
  - CR-002: `useMobileWorkspaceFileExplorer`'s unloaded-folder message is "Folder contents could not be loaded."
  - CR-003: `MobileBottomSheet` passes `titleId` to its `#header` slot; `MobileConnectionSheet` puts it on its h2.
- Changed files or areas: `components/mobile/runList/MobileRunList.vue`, `components/mobile/MobilePairedShell.vue`, `components/mobile/MobileBottomSheet.vue`, `components/mobile/connection/MobileConnectionSheet.vue`, `composables/mobile/useMobileWorkspaceFileExplorer.ts`; tests in `components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`, `components/mobile/runList/__tests__/MobileRunList.spec.ts`, `components/mobile/connection/__tests__/MobileConnectionSheet.spec.ts`.
- Local validation and result: IMP-06 (the phone specs, 83 tests, with the new cases: a failed first check then Retry gives a populated list, "Connected" and no banner; the list's Retry emits and reads nothing itself; the connection dialog is named "AutoByteus Desktop") pass; IMP-02 typecheck PASS; IMP-03 guards pass. IMP-01 and IMP-04 still valid (see the handoff's rerun plan).
- Next recipient or routing: Code Reviewer (targeted delta review), then API/E2E.
- Remaining limitations or risks: the reviewer's C-06 and C-04, recorded in the handoff's Known Risks for API/E2E.
