# Code Review Revision Record — mobile-experience-redesign (autobyteus-277)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | [code-review-report.md](code-review-report.md) | Implementation Review, round 1 / IR-001 handoff | N/A | Fail (Local Fix) | CR-001, CR-002, CR-003 |
| CRR-002 | [code-review-report.md](code-review-report.md) | Implementation Review, round 2 (targeted delta) / IR-002 handoff | Fail (Local Fix) | Pass | CR-001, CR-002, CR-003 (resolved) |
| CRR-003 | [code-review-report.md](code-review-report.md) | API/E2E Failure-Origin Review, round 3 / API-REV-001 Fail | Pass | Fail (Design Impact, Requirement Gap, Local Fix) | API F-01…F-09 |
| CRR-004 | [code-review-report.md](code-review-report.md) | Implementation Review, round 4 (Full Re-Audit) / IR-003 | Fail (CRR-003) | Fail (Local Fix) | F-01…F-09 (resolved or decided); CR-004, CR-005 (new) |
| CRR-005 | [code-review-report.md](code-review-report.md) | Implementation Review, round 5 (targeted delta) / IR-004 | Fail (Local Fix) | Pass | CR-004, CR-005 (resolved) |
| CRR-006 | [code-review-report.md](code-review-report.md) | API/E2E Failure-Origin Review, round 6 / API-REV-002 Fail | Pass | Fail (Local Fix, implementation) | API F-10 |
| CRR-007 | [code-review-report.md](code-review-report.md) | Implementation Review, round 7 (targeted delta) / IR-005 | Fail (Local Fix) | Pass | API F-10 (resolved) |
| CRR-008 | [api-e2e-test-review-report.md](api-e2e-test-review-report.md) | API/E2E Test-Code Review, round 1 / API-REV-003 Pass | N/A (first test review) | Pass | None |
| CRR-009 | [code-review-report.md](code-review-report.md) | Implementation Review, round 9 (targeted delta: latest-base merge) / IR-006 | Pass (CRR-007) | Pass | None |
| CRR-010 | [api-e2e-test-review-report.md](api-e2e-test-review-report.md) | API/E2E Test-Code Review, round 2 / API-REV-004 Pass | Pass (CRR-008) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (base `407f0ee8e9` → HEAD `1fc93d45ce`)
- Triggering role, report path and finding or scenario IDs: `implementation_engineer`, [implementation-handoff.md](implementation-handoff.md), IR-001
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Local Fix` (implementation)
- What changed in the review result and why: this is the baseline.
  - The structure matches SR-004, and the desktop paths are behavior-equivalent.
  - Three bounded defects were found:
    - CR-001: the list's Retry leaves the bar and banner saying "Not reachable", and it skips the 401 rule and the definition reload;
    - CR-002: Files copy names a removed tab;
    - CR-003: the connection sheet's dialog has no accessible name.
- Supported product scenario / material-premise basis changes:
  - SCN-007…SCN-009 were added as explicit edges for this review.
  - C-04…C-08 were rejected; C-06 and C-04 are recorded as residual risks.
  - MP-001…MP-003 are confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: Runtime Correctness And Behavioral Fidelity is 8.8; every other category is ≥ 9.2.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the poll does not refresh reachability (as designed); device, real-data and two-server behavior is left to API/E2E.

### CRR-002 — Targeted delta review of IR-002 (the CRR-001 fixes)

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The code delta `f2816cc7c1` over `1fc93d45ce` stays within the files and behavior of CR-001…003. It changes no spine, shared interface or data shape.
- Triggering role, report path and finding or scenario IDs: `implementation_engineer`, [implementation-handoff.md](implementation-handoff.md) (IR-002), CR-001…003
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001, `Fail` (Local Fix)
- Current authoritative result: `Pass`
- What changed in the review result and why: all three findings are fixed as required, each with a test. The list's Retry now runs the shell's status check. The copy names no tab. The connection sheet's dialog is named by its heading.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open | Resolved | IR-002, `f2816cc7c1` | `MobileRunList.vue:45` emits `retry`; `MobilePairedShell.vue:26` handles it with `checkStatus()`. Tests: `MobileRemoteAccessShell.spec.ts` "Retry after a failed first check…" and `MobileRunList.spec.ts` (emits, no `fetchTree`). IMP-06: 83 passed |
| CR-002 | Open | Resolved | IR-002, `f2816cc7c1` | `useMobileWorkspaceFileExplorer.ts:194` reads "Folder contents could not be loaded." |
| CR-003 | Open | Resolved | IR-002, `f2816cc7c1` | `MobileBottomSheet.vue:10` passes the `titleId` slot prop; `MobileConnectionSheet.vue:5-7` puts it on the h2; the spec asserts the name |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness goes from 8.8 to 9.3, API/E2E Readiness from 9.2 to 9.4 and Cleanup from 9.3 to 9.4. Every category is now ≥ 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`. The implementation engineer gets an informational notification.
- Remaining risks or uncertainty: residuals C-04 and C-06; device, real-data and two-server checks (API/E2E).

### CRR-003 — Failure-origin review of API-REV-001 (F-01…F-09)

- Canonical review report updated: [code-review-report.md](code-review-report.md), section "API/E2E Failure-Origin Review (Round 3)" and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path and finding or scenario IDs: `api_e2e_engineer`, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), F-01…F-09 (MSP-02, MSP-03, MSP-06, MSP-09, MSP-11, ADR-03, ADR-05)
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002 (code `f2816cc7c1`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-002, `Pass`
- Current authoritative result: `Fail`, with mixed classifications, routed to the Solution Designer
- What changed in the review result and why: every API/E2E failure is a real failure of approved behavior on a supported surface.
  - Design Impact:
    - F-01: an Org run row maps to `open`, which selects no member; the "first member" rule is undefined and its premise about the desktop is false.
    - F-06: the spec's Task line conflicts with `useTaskWorkerTasks`' rule that disables it where Projects is absent.
    - F-08: live states hold only for the selected host's tree.
  - Requirement Gap:
    - F-07: DEC-001 desktop parity conflicts with VIS-002 nesting.
    - F-09: the Android 15 status bar is a prerequisite candidate in the Android shell, depending on the user's Android version.
  - Local Fix (implementation):
    - F-02: guard `crypto.randomUUID` at four bare call sites; this ticket, since its phone paths make them reachable;
    - F-03: unpair confirmation under the sheet;
    - F-04: the reference screen embeds the shared viewer's header;
    - F-05: the 41px path part.
- Supported product scenario / material-premise basis changes:
  - The plain-HTTP pairing origin is recorded as a Supported Explicit Edge (`docs/remote_access.md:9, 56`).
  - The design premise that Org open works "as the desktop's target resolver does" is reclassified as false (`AgentOrgWorkspaceView.vue:108-121`, `:20-33`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (confirmed on a real stack) | API-REV-001 MSP-09 | Node down → Check clears the bar and banner; C-06 was not seen |
| CR-002 | Resolved | Resolved | — | — |
| CR-003 | Resolved | Resolved (confirmed) | API-REV-001 MSP-09 | `dialogName: "AutoByteus Desktop"` |

- New or remaining finding IDs: API F-01…F-09. The API/E2E IDs are reused; no CR IDs were added.
- Material score or classification changes: round 2's Runtime Correctness rationale is withdrawn. F-01, F-03 and F-06 (F-05 minor) were review gaps in rounds 1–2.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - the user's Android version (F-09);
  - a `TESTING.md` phone rule is needed (a non-secure origin, real-tap overlay checks), owned by API/E2E.

### CRR-004 — Implementation review of IR-003 (SR-005/SR-006 and the CRR-003 local fixes)

- Canonical review report updated: [code-review-report.md](code-review-report.md), section "Implementation Review (Round 4)" and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit`. The delta changes shared interfaces and behavior (`useTaskWorkerTasks`, the shared reference viewer, an id helper at ten sites, the Org open mapping, the Android shell) and reaches files beyond CRR-003's findings.
- Triggering role, report path and finding or scenario IDs: `implementation_engineer`, [implementation-handoff.md](implementation-handoff.md) (IR-003), CRR-003 F-01…F-09
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003 (code `1a48f4affe`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-003, `Fail` (failure-origin)
- Current authoritative result: `Fail`, `Local Fix` (implementation)
- What changed in the review result and why:
  - F-01…F-06 and F-09 are implemented as SR-005/SR-006 designed, each with tests; F-07 and F-08 are decided as desktop parity.
  - Two new dead-code findings:
    - CR-004: `createRandomId()` keeps a `Math.random` branch for a runtime without `crypto.getRandomValues`, which its own comment says does not exist;
    - CR-005: `useTaskWorkerTasks` exports `canLocate`, which only its spec reads.
- Supported product scenario / material-premise basis changes: none.
  - C-11…C-14 were rejected.
  - C-12, the keyboard on Android 11–14, is recorded as a residual for API/E2E.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-01 | Open (Design Impact) | Resolved | SR-005 DEC-012; `02718f21bf` | `useMobileRunOpening.ts:21-24`; `agentOrgHistoryRows.ts:210-216`; specs |
| F-02 | Open (Local Fix) | Resolved (see CR-004) | DEC-014; `02905f49b5` | `utils/randomId.ts`; ten sites; `grep` |
| F-03 | Open | Resolved | `4207af0889` | `MobilePairedShell.vue:131-135`; shell spec |
| F-04 | Open | Resolved | `4207af0889` | `hideHeader`; specs of the viewer and the phone screen |
| F-05 | Open | Resolved | `4207af0889` | `MobileFiles.vue:37` |
| F-06 | Open (Design Impact) | Resolved | DEC-010; `02718f21bf` | `useTaskWorkerTasks` split; projection spec |
| F-07 | Open (Requirement Gap) | Decided, no code change | DEC-009 (a) | — |
| F-08 | Open (Design Impact) | Decided, no code change | DEC-013 (revised at SR-006) | — |
| F-09 | Open (Requirement Gap) | Resolved | DEC-011 (a), REQ-011; `9b4066b4df` | IMP-08 on API 35 and API 34 |

- New or remaining finding IDs: CR-004, CR-005
- Material score or classification changes: No Backward-Compatibility and Cleanup are at 9.0; every other category is ≥ 9.3.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the keyboard on Android ≤14 (not exercised); AC-002a's live case needs a running root.

### CRR-005 — Targeted delta review of IR-004 (the CRR-004 fixes)

- Canonical review report updated: [code-review-report.md](code-review-report.md), section "Implementation Review (Round 5)" and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review`. Commit `400457d5f7` touches only `utils/randomId.ts`, `useTaskWorkerTasks.ts` and one spec line.
- Triggering role, report path and finding or scenario IDs: `implementation_engineer`, [implementation-handoff.md](implementation-handoff.md) (IR-004), CR-004, CR-005
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-004, `Fail` (Local Fix)
- Current authoritative result: `Pass`
- What changed in the review result and why: both dead-code findings are removed as required. IMP-09 (the full web suite) passes on the fix.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open | Resolved | IR-004, `400457d5f7` | `utils/randomId.ts:7-14`: no `Math.random`; `getRandomValues` used unconditionally; `randomId.spec.ts` |
| CR-005 | Open | Resolved | IR-004, `400457d5f7` | `useTaskWorkerTasks.ts` returns `{ taskOf, locate }`; `grep canLocate` finds only the internal guard |

- New or remaining finding IDs: none
- Material score or classification changes: No Backward-Compatibility 9.5, Cleanup 9.4, API / Interface 9.4. Every category is ≥ 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`. The implementation engineer gets an informational notification.
- Remaining risks or uncertainty: the keyboard on Android 14 (C-12); AC-002a with a running root; C-04; the user's device check.

### CRR-006 — Failure-origin review of API-REV-002 (F-10)

- Canonical review report updated: [code-review-report.md](code-review-report.md), section "API/E2E Failure-Origin Review (Round 6)" and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin)
- Triggering role, report path and finding or scenario IDs: `api_e2e_engineer`, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), F-10 (ADR-07, API 35 and API 34)
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004 (code `400457d5f7`)
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-005, `Pass`
- Current authoritative result: `Fail`, `Local Fix` (implementation)
- What changed in the review result and why: F-10 is a real failure of approved behavior (REQ-003, REQ-011, AC-005) in a Supported Normal Scenario, typing a reply.
  - The browser's focus scroll lands on the `overflow: hidden` root of the conversation view that the phone's run screen hosts (`scrollTop` 330/327). It persists after the WebView shrinks for the keyboard. The control at `scrollTop = 0` is correct.
  - This ticket owns it: the phone's run screen. It was probably pre-existing in the base `MobileChat`, but it fails an in-scope AC either way.
  - It was not detectable in source review.
  - The `TESTING.md` phone rule from CRR-003 is superseded by the user's direction.
  - The Back key with the ⋮ menu open is not a finding.
- Supported product scenario / material-premise basis changes: C-12 (double padding on Android ≤14) is closed by evidence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-01…F-06, F-09 | Resolved (CRR-004/005) | Resolved, confirmed on real stacks | API-REV-002 | Execution report round 2: AC-002a, AC-003a, AC-011, unpair with a real tap |
| C-12 (residual) | Open | Closed | API-REV-002 ADR-07 | `webView.bottom 1517 = ime.top 1517` on API 35 and API 34 |

- New or remaining finding IDs: API F-10
- Material score or classification changes: none to the implementation scorecard; F-10 is runtime-only.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the user's device check; C-04.

### CRR-007 — Targeted delta review of IR-005 (the F-10 fix)

- Canonical review report updated: [code-review-report.md](code-review-report.md), section "Implementation Review (Round 7)" and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review`. Commit `e3dd8c4677` touches only `MobileRunTargetView.vue` and its spec.
- Triggering role, report path and finding or scenario IDs: `implementation_engineer`, [implementation-handoff.md](implementation-handoff.md) (IR-005), F-10
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-006, `Fail` (Local Fix)
- Current authoritative result: `Pass`
- What changed in the review result and why: the phone's run screen hosts the conversation root with `!overflow-clip`, so focus cannot scroll it. The shared `AgentEventMonitor` is unchanged. IMP-10: ADR-07 passes on API 35 and API 34, with `scrollTop` 0 and a 62 px gap equal to the control.
- Supported product scenario / material-premise basis changes: none.
  - C-15 (a WebView older than Chromium 90) was rejected.
  - C-16 (the keyboard on other phone inputs) is a residual.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-10 | Open (Local Fix) | Resolved | IR-005, `e3dd8c4677` | `MobileRunTargetView.vue:23-39`; `MobileRunScreen.spec.ts` guard; IMP-10 on API 35 and API 34 |

- New or remaining finding IDs: none
- Material score or classification changes: none; every category is ≥ 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`. The implementation engineer gets an informational notification.
- Remaining risks or uncertainty: the keyboard on New run's sheets and the Files search (C-16); a WebView older than Chromium 90; C-04; the user's device check.

### CRR-008 — Proportional review of the durable test code (API-REV-003 Pass)

- Canonical review report updated: [api-e2e-test-review-report.md](api-e2e-test-review-report.md), created
- Review entry point and round: API/E2E Test-Code Review, round 1
- Review scope: `N/A` (test review). Reviewed: `tests/e2e/mobile-shell-probe.mjs` (added); `package.json`, `node-vocabulary-probe.mjs`, `large-runs-load-less-cases.mjs`, `workspace-views-chooser-cases.mjs` and `owner-scoped-file-reads-probe.mjs` (updated)
- Triggering role, report path and finding or scenario IDs: `api_e2e_engineer`, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), API-REV-003 `Pass` (95%)
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002, API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A (first test review); the source review's latest is CRR-007 `Pass`
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The probe proves the approved scenarios through the real surfaces: node-stored sends, the desktop comparison, the network log and failing on unknown browser errors.
  - It follows `TESTING.md`'s probe rules: an owned stack, cleanup with a receipt, and never the user's data.
  - The four updated probes follow the new phone paths, with no stale steps.
  - One non-blocking note: the probe header cites a `TESTING.md` "phone changes" section that does not exist. It is comment-only, and delivery can drop it in docs sync.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: the user's device checks (QR-003, AC-005, AC-010, AC-011); iOS paired screens through WebKit only.

### CRR-009 — Review of the latest-base merge (IR-006)

- Canonical review report updated: [code-review-report.md](code-review-report.md), section "Implementation Review (Round 9, Latest-Base Merge)" and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 9
- Review scope: `Targeted Delta Review` of merge `ed20da1cd1` (`7b0c5098f0` + `origin/personal` `9d8077fd2a`): the conflict resolution and where `personal` meets this branch
- Triggering role, report path and finding or scenario IDs: `implementation_engineer`, [implementation-handoff.md](implementation-handoff.md) (IR-006), for the delivery engineer's latest-base Local Fix
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: the delivery engineer's latest-base integration (see the implementation handoff's IR-006 section)
- Prior authoritative result: CRR-007 `Pass` (source); CRR-008 `Pass` (tests)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - `RunSectionPanel` carries 388's windows (Projects is now `null`) under this branch's `useRunHistorySectionLoad`, with nothing of 388's lost; its specs pass.
  - The phone's toast keys follow the rename and resolve in `en` and `zh-CN`.
  - The stale "the phone sets 5" lines are corrected.
  - C-17 was rejected: a Runs↔Projects switch no longer reads once more, because the window stays `null` and the 5 s poll covers it.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`. The implementation engineer gets an informational notification.
- Remaining risks or uncertainty: the phone bundle and emulator journeys on the merged tree are not rerun yet (IR-006 rerun plan); the user's device checks.

### CRR-010 — Proportional review of the round-4 test change (MSP-15)

- Canonical review report updated: [api-e2e-test-review-report.md](api-e2e-test-review-report.md), section "Round 2"
- Review entry point and round: API/E2E Test-Code Review, round 2
- Review scope: `N/A` (test review). `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` gains MSP-15 in `54e2eb4d07`.
- Triggering role, report path and finding or scenario IDs: `api_e2e_engineer`, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), API-REV-004 `Pass` (95%)
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: the delivery engineer's latest-base integration
- Prior authoritative result: CRR-008 `Pass` (tests); CRR-009 `Pass` (source)
- Current authoritative result: `Pass`
- What changed in the review result and why: MSP-15 proves the desktop windows after the merge through the real view menu and the GraphQL request log, with a poll-tolerant bound and cleanup.
  - Non-blocking: the Workspaces check uses `some(...)`, so it would not catch a double read on that switch (a second 6-window read was observed, 272 ms later). It is optional to tighten.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - the user's device checks;
  - NVP-05's out-of-scope dev-server crash (FU-006);
  - signing, notarization and the non-mac builds need the release runner.
