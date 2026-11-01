# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-002 | N/A | Fail (9.3/10): Local Fix → Implementation | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review / IR-003 (Targeted Delta Review) | Fail (CRR-001) | Pass (9.5/10) | CR-001 resolved |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-08) | Pass (CRR-002) | Fail: Design Impact → Solution Designer | CR-002 new |
| CRR-004 | `code-review-report.md` | Implementation Review / IR-004 (Full Re-Audit) | Fail (CRR-003) | Fail (9.3/10): Design Impact → Solution Designer | CR-002 resolved (hub, Org); CR-003 new |
| CRR-005 | `code-review-report.md` | Implementation Review / IR-005 (Targeted Delta Review) | Fail (CRR-004) | Pass (9.5/10) | CR-003 resolved |
| CRR-006 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 Fail (API-08 L-002) | Pass (CRR-005) | Fail: Design Impact → Solution Designer | CR-004 new |
| CRR-007 | `code-review-report.md` | Implementation Review / IR-006 (Full Re-Audit of changed areas) | Fail (CRR-006) | Pass (9.5/10) | CR-004 resolved |
| CRR-008 | `api-e2e-test-review-report.md` | API/E2E Test-Code Review / API-REV-003 Pass | Pass (CRR-007, source) | Fail: Local Fix → API/E2E | CR-T-001 new |
| CRR-009 | `api-e2e-test-review-report.md` | API/E2E Test-Code Review / API-REV-004 Pass (round 2) | Fail (CRR-008) | Pass | CR-T-001 resolved |
| CRR-010 | `code-review-report.md` | Implementation Review / IR-007 (DR-001 merge; Targeted Delta Review) | Pass (CRR-007, source) | Pass (9.5/10) | None |

## Revision Entries

### CRR-001 — Large runs load less: mobile message screens lack loading and error states

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002)
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Local Fix` owned by implementation
- What changed in the review result and why: initial result. DS-001…DS-007 are implemented as designed, and D-IMP-1…D-IMP-6 were checked and hold (C-01…C-07). CR-001: the mobile message screens ignore `messagesStatus()`, so they say "No team messages yet" while loading and after a failed load (a damaged log). That contradicts AC-006 and the design's mapping for those screens. FU-003 records `existingRunConfigStore.ts` already over 500 and not grown
- Supported product scenario / material-premise basis changes: SCN-007-MOBILE added (supported explicit edge)

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001
- Material score or classification changes: N/A (initial)
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: M-151 not measured; DS-007 not on tool-call or reasoning renderers; FU-001

### CRR-002 — CR-001 resolved: the mobile message screens show loading and unavailable states

- Canonical review report updated: `code-review-report.md` (the round-2 section; CR-001; scores; Latest Result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` (two mobile components, a 13-line words module, the shared test stub, the mobile spec)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-003, IMP-13), CR-001
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 `Fail`
- Current authoritative result: `Pass`
- What changed in the review result and why: both mobile screens read `messagesStatus()`, showing loading, unavailable with the reason, and empty only when loaded. The words module respects the mobile guard's intent (no desktop shell import). The reviewer ran the six specs that use the shared stub: 62/62
- Supported product scenario / material-premise basis changes: SCN-007-MOBILE now `Confirmed`

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-003 (`438ea7fb65`) | Diff; `MobileTeamMessages.spec.ts` (3 new cases); `evidence/IMP-CR001-mobile-states.log`; reviewer run of the six stub-using specs: 62/62 |

- New or remaining finding IDs: None
- Material score or classification changes: 9.3 → 9.5; Fail → Pass
- Recommended recipient: API/E2E Engineer; informational to Implementation Engineer
- Remaining risks or uncertainty: M-151 not measured; DS-007 not on tool-call or reasoning renderers; FU-001

### CRR-003 — Failure origin of API-08: participant lists re-read on every running-hub publication

- Canonical review report updated: `code-review-report.md` (the round-3 section; CR-002; Classification; Latest Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), API-08
- Relevant solution revision IDs: SR-002 (DS-002 reload call sites), SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-002, IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-002 `Pass`
- Current authoritative result: `Fail`, `Design Impact` → Solution Designer
- What changed in the review result and why: every publication of a running hub's context calls `reloadRoot` (as DS-002 lists). That means two hub-list fetches per selection (inspect, then attach) and one per new delegation (reconnect for a snapshot). It is correct, but it is avoidable repeated full-history transfer (DESIGN.md rule 3) against the ticket's outcome. It is a design gap, and a review gap on my part: CRR-001 checked the reload call sites for correctness, not for repeated transfer
- Supported product scenario / material-premise basis changes: the DS-002 premise "every rebuild may have lost events" is reclassified. It is false for inspect → attach, and possibly narrowable for reconnects

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (unchanged; API-06 confirmed desktop and phone) | CRR-002 | `API-06-LRL-004-team-tab-unavailable.png` |

- New or remaining finding IDs: CR-002
- Material score or classification changes: round-2 Pass superseded by the round-3 failure-origin result
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Team and Org share the rule (C-14, not measured); FU-004 (composer send errors only logged) recorded by API/E2E

### CRR-004 — Live-sequence reload rule: hub and Org fixed; running Team open still fetches twice

- Canonical review report updated: `code-review-report.md` (the round-4 section; CR-002/CR-003; Classification; Latest Result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit` (shared contract field; DS-002 reload rule)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-004), CR-002
- Relevant solution revision IDs: SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001 (API-08 recheck pending)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-003 `Fail`
- Current authoritative result: `Fail`, `Design Impact` → Solution Designer
- What changed in the review result and why: the per-root position (live sequence ID, C) and `reloadRoot`'s keep rule are correct. The advance condition was verified against `applyEvent`'s two results; stop/resume and restart reload; server IDs come per publisher. That resolves CR-002 for hub and Org, with tests and mutations. CR-003: a running Team opens through GraphQL hydration with no live sequence and commits as `'stored_rebuild'`, so the following stream snapshot reloads a list loaded in between, which is the CR-002 pattern for Team. SR-004 states one rule for all three roots; the implementation records it as a limitation outside SR-005; it needs a design choice
- Supported product scenario / material-premise basis changes: C-14 (Team and Org share the rule) resolved; for Team, its open path is CR-003

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (Design Impact) | Resolved for hub and Org; the Team open path is carried as CR-003 | SR-004, SR-005, ARCH-REV-005, IR-004 | Owner spec (10); `agentRunCollaborationParticipantReloads.spec.ts`; Team/Org stream specs; mutation results in `evidence/IMP-IR004-checks.log` |

- New or remaining finding IDs: CR-003
- Material score or classification changes: 9.3/10; Design Impact
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the API-08 recheck is pending; FU-005 recorded by implementation

### CRR-005 — CR-003 resolved: the running Team's open read names its live sequence

- Canonical review report updated: `code-review-report.md` (the round-5 section; CR-003; Classification; Latest Result)
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` (the Team open path: publisher position, resume config and its two fields, the web read and the commit)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-005), CR-003
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: N/A (API-08 recheck next)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-004 `Fail`
- Current authoritative result: `Pass`
- What changed in the review result and why: the Team resume config carries the managed root's live position (read together), and the commit reloads by the same rule as hub and Org. Running open keeps the list (1 fetch); a different publisher or a stopped Team reloads; recovery keeps correctly; `isActive` semantics unchanged
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Design Impact) | Resolved | SR-006, ARCH-REV-006, IR-005 (`99cd853f79`) | Diff; team hydration spec (running keeps, stopped reloads); server resume-config, resolver and publisher tests; `evidence/IMP-IR005-checks.log` |

- New or remaining finding IDs: None
- Material score or classification changes: 9.3 → 9.5; Fail → Pass
- Recommended recipient: API/E2E Engineer; informational to Implementation Engineer
- Remaining risks or uncertainty: the API-08 counts (hub, and now Team) need the browser recheck; FU-001, FU-004, FU-005 recorded

### CRR-006 — Failure origin of API-08 L-002: a delegation's reconnect window always passes C

- Canonical review report updated: `code-review-report.md` (the round-6 section; CR-004; Classification; Latest Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002), API-08 L-002
- Relevant solution revision IDs: SR-004…SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004…ARCH-REV-006
- Relevant implementation revision IDs: IR-004, IR-005
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-005 `Pass`
- Current authoritative result: `Fail`, `Design Impact` → Solution Designer
- What changed in the review result and why: the selection, open, live-message, stop/resume and dropped-stream counts are now right. A new delegation still reloads every loaded list: the reconnect snapshot's base counts the new copy's non-message events from the window, so B > C always. SR-004's measure (any root change) cannot give its expected 0 for "no message". Not a Local Fix: the decision happens at the snapshot, before later events. Review gap acknowledged: CRR-004/005 verified the rule's safety, not that its expected counts were reachable
- Supported product scenario / material-premise basis changes: the SR-004 premise "no message in the window means B ≤ C" is reclassified as false for delegations

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Resolved (hub, Org) | Partly resolved: the selection double is fixed; the per-delegation reload remains as CR-004 | API-REV-002 | API-08-r2 log lines 84 (1 fetch) and 93/94 (refetch) |
| CR-003 | Resolved | Resolved (running Team open: 1, LRL-005) | API-REV-002 | `API-03-06-09-r2-lrl-browser-probe.json` |

- New or remaining finding IDs: CR-004
- Material score or classification changes: round-5 Pass superseded by the round-6 failure-origin result
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Org and settings Save follow the same rule (C-18); FU-006 (intermittent Terminal-panel errors, unchanged code) recorded by API/E2E

### CRR-007 — CR-004 resolved: lists are kept unless a message was published past them

- Canonical review report updated: `code-review-report.md` (the round-7 section; CR-004; Classification; Latest Result)
- Review entry point and round: Implementation Review, round 7
- Review scope: `Full Re-Audit` of the changed areas (contract field; keep rule)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-006), CR-004
- Relevant solution revision IDs: SR-007, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-007, ARCH-REV-008
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: N/A (API-08 L-002 recheck next)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-006 `Fail`
- Current authoritative result: `Pass`
- What changed in the review result and why: the publisher's latest-message sequence M (one sequence per event, read with the base) lets the keep rule ask the right question: no message past C keeps the lists, and C becomes the base. M is exact, the predicates match what the client lists, the earlier SR-005/SR-006 cases still hold, and tests and mutation checks prove it
- Supported product scenario / material-premise basis changes: the CRR-006 premise is resolved by measuring messages, not root changes

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open (Design Impact) | Resolved | SR-007, SR-008, ARCH-REV-008, IR-006 (`65a5b34c9b`) | Diff; publisher, contract, owner, hub store/stream and Team tests; mutation (3 fail); `evidence/IMP-IR006-checks.log` |

- New or remaining finding IDs: None
- Material score or classification changes: Fail → Pass (9.5/10)
- Recommended recipient: API/E2E Engineer; informational to Implementation Engineer
- Remaining risks or uncertainty: the API-08 L-002 browser recheck; FU-001, FU-004 … FU-006 recorded

### CRR-008 — Test review: LRL-004 does not assert the reason AC-006 requires

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Review scope: proportional review of the durable test changes in API/E2E rounds 1–3 (`ceb5e2d972`, `161913c003`, `59f4604da5`, `e78f587a28`; head `393d78cf2a`)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-003 `Pass`, 94%); CR-T-001
- Relevant solution revision IDs: SR-004…SR-008
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-001…API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-007 `Pass` (source); no prior test review
- Current authoritative result: `Fail` (test code), Local Fix → API/E2E Engineer. The source result is unchanged.
- What changed in the review result and why: the new cases and hub-probe updates enter through real triggers, assert request counts and that the rows equal the stored log, and replace every read of the removed view field and of `isChildHydrated`. LRL-004, though, records but never asserts that the desktop Team tab and the phone show the reason (AC-006 "with the reason"). Today's evidence shows the reason, so a regression would pass silently.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N/A | — | — | — | — |

- New or remaining finding IDs: CR-T-001 (Local Fix, API/E2E)
- Material score or classification changes: N/A (proportional review; no scorecard)
- Recommended recipient: API/E2E Engineer
- Remaining risks or uncertainty:
  - Non-blocking notes in the report: fixed waits in LRL-004 and LRL-002, the Org stop not confirmed, LRL-005 `>= 1` vs `=== 1`, and `copyLoadedInPage` being dev-server-only.
  - FU-006 can fail full hub-probe runs.
  - The reload branch for a message inside the window is covered by unit and mutation tests only.

### CRR-009 — Test review round 2: LRL-004 asserts the reason on every surface; Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (Round 2 Recheck; Findings; Latest Authoritative Result)
- Review entry point and round: Successful API/E2E Test-Code Review, round 2
- Review scope: the CR-T-001 fix and the notes acted on (`d8d99351b3`; evidence `4d83c0b7b6`)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-004 `Pass`, 94%); CR-T-001
- Relevant solution revision IDs: SR-004…SR-008
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-008 `Fail`
- Current authoritative result: `Pass`
- What changed in the review result and why: LRL-004 now asserts the damaged file and line (built from the damage the test wrote) on the server error, the desktop Team tab, the phone and the refused restore. Its restore wait, the Org stop in LRL-002 and LRL-005's reload count (exactly one) are now asserted or awaited. The round-4 rerun passes with no browser errors.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-T-001 | Open (Local Fix, API/E2E) | Resolved | API-REV-004, `d8d99351b3` | Diff; `evidence/api-e2e/API-04-06-09-r4-lrl-browser-probe.json` (LRL-002/004/005 Pass, `browserErrors` `[]`); `API-06-r4-LRL-004-*.png` |

- New or remaining finding IDs: None
- Material score or classification changes: Fail → Pass
- Recommended recipient: Delivery Engineer
- Remaining risks or uncertainty:
  - The reload branch for a message inside the window is covered by unit and mutation tests only.
  - FU-006 can fail full hub-probe runs.
  - FU-001, FU-004 and FU-005 are recorded.

### CRR-010 — Delivery integration merge: conflict resolutions correct; Pass

- Canonical review report updated: `code-review-report.md` (Round 8; Review Round Meta; Residual Risks; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 8
- Review scope: `Targeted Delta Review` of merge `bd79cb1601` (`origin/personal` @ `92fffca77a` into `523c8c95bf`) and `328a9bca27` (records)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-007), for DR-001 (`delivery-revision-record.md`)
- Relevant solution revision IDs: SR-008 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-007
- Relevant API/E2E revision IDs: API-REV-004 (prior validated state)
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: CRR-007 `Pass` (source); CRR-009 `Pass` (tests)
- Current authoritative result: `Pass`
- What changed in the review result and why: the 7 conflicts are resolved by keeping both intents: the ticket's removed message log and live fields, and the base's typed, immutable rework, protocol details and baseline cut. The base's new server test gate required one minimal typing fix, which now uses the service's own exported port. Reruns: server and web type gates PASS (baselines 1,200 / 99), the touched specs (7 files, 55) and the service test (2) pass, and architecture tests pass (61).
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N/A | — | — | — | — |

- New or remaining finding IDs: None
- Material score or classification changes: None (9.5/10; Large/High)
- Recommended recipient: API/E2E Engineer; informational to Implementation Engineer
- Remaining risks or uncertainty:
  - Full suites were not rerun by me; I reused `evidence/IMP-IR007-merge-checks.log`.
  - FU-001 is resolved by the base; FU-005 and FU-006 stand.
