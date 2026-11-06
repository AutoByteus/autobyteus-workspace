# Implementation Revision Record — mobile-experience-redesign (autobyteus-277)

The current code and [implementation-handoff.md](implementation-handoff.md) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer`, [design-review-report.md](design-review-report.md), round 2 (Pass) | N/A | `Initial Baseline` | `SR-003`, `SR-004`, `ARCH-REV-002` | Implemented; checks IMP-01…05 pass; routed to Code Review |
| IR-002 | `code_reviewer`, [code-review-report.md](code-review-report.md), `CRR-001` (Fail — Local Fix) | CR-001, CR-002, CR-003 | `Local Fix` | `SR-004`, `ARCH-REV-002`, `CRR-001` | Fixed in `f2816cc7c1`; IMP-02, IMP-03, IMP-06 pass; back to Code Review |
| IR-004 | `code_reviewer`, [code-review-report.md](code-review-report.md), `CRR-004` (Fail — Local Fix) | CR-004, CR-005 | `Local Fix` | `SR-006`, `ARCH-REV-004`, `CRR-004` | Fixed in `400457d5f7`; IMP-02, IMP-03, IMP-09 pass; to Code Review |
| IR-003 | `architecture_reviewer`, [design-review-report.md](design-review-report.md), `ARCH-REV-004` (Pass of SR-005/SR-006); `CRR-003` local fixes; `API-REV-001` | F-01, F-02, F-03, F-04, F-05, F-06, F-09 | `Local Fix` (F-02…F-05) and the revised design (F-01, F-06, F-09) | `SR-005`, `SR-006`, `ARCH-REV-004`, `CRR-003`, `API-REV-001` | Implemented in `02905f49b5`…`1a48f4affe`; IMP-02, 03, 07, 08 pass; to Code Review |
| IR-005 | `code_reviewer`, [code-review-report.md](code-review-report.md), `CRR-006` (failure-origin review of `API-REV-002`) | F-10 | `Local Fix` | `SR-006`, `CRR-006`, `API-REV-002` | Fixed in `e3dd8c4677`; IMP-02, 03, 10 (ADR-07 on API 35 and API 34), 11 pass; to Code Review (targeted delta) |

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

### IR-003 — SR-005/SR-006 and CRR-003's local fixes

- Triggering role, report path, and round: `architecture_reviewer`, `design-review-report.md`, `ARCH-REV-004` Pass of SR-005/SR-006; `code-review-report.md` "API/E2E Failure-Origin Review (Round 3)" (`CRR-003`); `api-e2e-execution-coverage-report.md` (`API-REV-001`, Fail).
- Triggering finding IDs: F-01, F-02, F-03, F-04, F-05, F-06, F-09 (F-07 and F-08 need no code: DEC-009 (a), DEC-013 revised).
- Classification: `Local Fix` for F-02…F-05 (CRR-003); the revised design for F-01, F-06, F-09.
- Prior authoritative result: IR-002 (`f2816cc7c1`), CRR-002 Pass, then API-REV-001 Fail.
- Current authoritative result: `1a48f4affe`; Large/High, to Code Review.
- Related solution revision IDs: `SR-005`, `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-004`.
- Related code-review revision IDs: `CRR-003`.
- Related API/E2E revision IDs: `API-REV-001`.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: the revised design and the local fixes the API/E2E failure led to.
- Approved behavior or requirement IDs affected: REQ-002a, REQ-003a, REQ-011; REQ-003 (sends on HTTP), REQ-005/QR-001 (F-03, F-05), REQ-007/VIS-011 (F-04).
- Implementation delta:
  - `utils/randomId.ts` `createRandomId()` (randomUUID, else a UUID v4 from `getRandomValues`), adopted at the ten listed sites with their prefixes.
  - `useTaskWorkerTasks`: summaries everywhere, `locate` gated (`canLocate`); `buildMobileRunTreeRows` takes `taskSummary`; `useMobileRunTree` feeds it from the listed Task workers.
  - `agentOrgFirstMemberAddress`; the Org run row → `select` with that address (and `open: null` for an Org without members).
  - F-03: `openUnpairConfirm` closes the sheet first. F-04: `hideHeader` on the shared reference viewer. F-05: `min-w-[2.75rem]` on the path parts.
  - Android: `ui/SystemBarInsets.kt`, applied in `WebShellScreen` and `ConnectionScreen`; two instrumented tests.
  - Docs: `remote_access.md`, the Android README, `docs/android_mobile_access.md`.
- Changed files or areas: see the handoff's IR-003 summary and rerun plan.
- Local validation and result: IMP-07 (the full web suite, 701 files, 5198 tests) pass; IMP-02 typecheck PASS; IMP-03 guards pass; IMP-08 (Android unit tests, build, and the instrumented tests on API 35 and API 34: padding follows the bars and the keyboard, `env(safe-area-inset-*)` reads 0, nothing moves on API 34) pass.
- Next recipient or routing: Code Reviewer (Large/High), then API/E2E.
- Remaining limitations or risks: no device check; AC-002a's stopped-root case is desktop parity (ARCH-REV-004 residual 1); the shared composer's buttons stay below 44 px.

### IR-004 — CRR-004 dead-code removals

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md` and `code-review-revision-record.md`, `CRR-004` (Full Re-Audit of `ccf43b875c..1a48f4affe`).
- Triggering finding IDs: CR-004, CR-005.
- Classification: `Local Fix`.
- Prior authoritative result: IR-003 (`1a48f4affe`), CRR-004 Fail.
- Current authoritative result: `400457d5f7`; Large/High, to Code Review (targeted delta).
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-004`.
- Related code-review revision IDs: `CRR-004`.
- Related API/E2E revision IDs: `API-REV-001`.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: the code review's two dead-code findings.
- Approved behavior or requirement IDs affected: none (no reachable behavior changes; DEC-014's ids are still UUIDs from `randomUUID` or `getRandomValues`).
- Implementation delta: CR-004, `utils/randomId.ts` drops the `Math.random` branch and builds the UUID v4 from `crypto.getRandomValues` whenever `randomUUID` is missing; CR-005, `useTaskWorkerTasks` returns `{ taskOf, locate }`, keeps `canLocate` inside `locate`, and its spec drops the `canLocate` assertion (it still checks that `locate` does nothing without Projects).
- Changed files or areas: `autobyteus-web/utils/randomId.ts`, `autobyteus-web/composables/projects/useTaskWorkerTasks.ts`, `autobyteus-web/composables/projects/__tests__/useTaskWorkerTasks.spec.ts`.
- Local validation and result: IMP-09 (the full web suite, 701 files, 5198 tests) passes; IMP-02 typecheck PASS; IMP-03 guards pass.
- Next recipient or routing: Code Reviewer (targeted delta), then API/E2E round 2.
- Remaining limitations or risks: the CRR-004 residuals for API/E2E (typing with the keyboard open on API 34; AC-002a with a running root).

### IR-005 — CRR-006 F-10: the phone's conversation root clips

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md` and `code-review-revision-record.md`, `CRR-006` (API/E2E Failure-Origin Review, round 6, of `API-REV-002`).
- Triggering finding IDs: F-10.
- Classification: `Local Fix`.
- Prior authoritative result: IR-004 (`400457d5f7`), CRR-005 Pass, then API-REV-002 Fail on F-10. ADR-07 had failed on API 35 and API 34: the conversation root was scrolled by focus (`scrollTop` 330 / 327), which put the composer under the bar.
- Current authoritative result: `e3dd8c4677`; the reviewer's report and record are in `d646e1a17a`. The package stays Large/High and goes to Code Review for a targeted delta.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-004`.
- Related code-review revision IDs: `CRR-006`.
- Related API/E2E revision IDs: `API-REV-002`.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: the failure-origin review routed F-10 to implementation.
- Approved behavior or requirement IDs affected: REQ-003, REQ-011, AC-005, AC-011 (typing with the keyboard open).
- Implementation delta:
  - `MobileRunTargetView.vue` hosts `AgentEventMonitor` with `!overflow-clip` in place of `overflow-hidden`. The fix is at the phone's run-screen boundary, as the reviewer preferred.
  - A clipping box is not a scroll container, so focus and `scrollIntoView` cannot scroll it.
  - `AgentEventMonitor.vue` is unchanged, so the desktop is too.
  - A comment at the monitor records why.
  - Guard: `MobileRunScreen.spec.ts`, "hosts the conversation in a clipping root (overflow: clip, not hidden)".
- Changed files or areas: `autobyteus-web/components/mobile/runScreen/MobileRunTargetView.vue`, `autobyteus-web/components/mobile/runScreen/__tests__/MobileRunScreen.spec.ts`.
- Local validation and result:
  - IMP-10: ADR-01 and ADR-07 pass on the API 35 and API 34 emulators against a probe-owned held stack.
    - Conversation `scrollTop` is 0.
    - Bar at 0–56, conversation from 56 down to the keyboard.
    - Send sits 62 px above the keyboard, the same as the control reset.
    - `noDoublePadding` true.
  - IMP-11: the phone specs, 85 tests, pass.
  - IMP-02 typecheck: PASS.
  - IMP-03 guards: pass.
- Next recipient or routing: Code Reviewer (targeted delta), then API/E2E reruns ADR-07.
- Remaining limitations or risks: other phone screens with a field inside an `overflow: hidden` box were not run with the keyboard. That means New run's sheets and the Files search. A WebView without `overflow: clip` (Chromium < 90) keeps the old behaviour.
