# Code Review Revision Record — chat-interface-entry

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 handoff | N/A | Pass | CR-001 (Low, non-blocking) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 / API-REV-001 Fail | Pass | Fail (Design Impact + Unclear + Local Fix) | CR-001 (resolved by API/E2E), CR-002, CR-003, CR-004 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 / IR-002 + IR-003 handoff | Fail (CRR-002) | Pass | CR-002, CR-003, CR-004 resolved; CR-001 pending test review |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review, round 1 / API-REV-002 Pass | Pass (CRR-003) | Pass | CR-001 verified resolved; advisories A-1..A-3 (non-blocking) |
| CRR-005 | `code-review-report.md` | Implementation Review, round 4 / IR-004 (D-16, UVF-001) | Pass (CRR-003/CRR-004) | Pass | None new |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code review, round 2 / API-REV-003 Pass | Pass (CRR-004/CRR-005) | Pass | None; advisories A-1..A-4; observation O-1 forwarded |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional test-code review, round 3 / API-REV-004 Pass (desktop addendum) | Pass (CRR-006) | Not Applicable | None; observations O-2, O-3 forwarded |

## Revision Entries

### CRR-001 — Initial implementation review: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-handoff.md`. There were no triggering findings.
- Relevant solution revision IDs: SR-003, SR-004, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, scoring 9.3/10 with every category at 9.1 or above.
- What changed in the review result and why: this is the initial baseline. The review verified D-08 (mode chosen by run id), D-04 and D-13 (launch order and route sync on promotion), D-11 (installed-record catalog and ALL_INSTALLED bindings) and RSK-005 (change-driven redirect) in code, along with the dependency rules and the removals. The reviewer reran the targeted web tests (219) and server tests (144); all passed.
- Supported product scenario / material-premise basis changes: None. MP-001 to MP-007 are confirmed as recorded in ARCH-REV-003. Candidates C-01, C-02, C-03, C-04, C-06 and C-07 were rejected; C-05 was promoted as Low and non-blocking.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001 (Low, non-blocking; a stale `createDraftRun` mock in a regressions spec).
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: RSK-003 (live ALL_INSTALLED on Claude and AGY), live voice, packaged Daily Assistant seeding, and the hand-applied `generated/graphql.ts` delta.

### CRR-002 — API/E2E failure-origin review: F-01 implementation defect, F-02 Unclear, F-03 Design Impact

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "API/E2E Failure-Origin Review (Round 2)" section.
- Review entry point and round: API/E2E Failure-Origin Review, round 2.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-execution-coverage-report.md`. Findings F-01 (CE-08/C05), F-02 (CE-09/C07) and F-03.
- Relevant solution revision IDs: SR-003, SR-004, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001, implementation review)
- Current authoritative result: Fail. The classifications are:
  - CR-004 / F-03: Design Impact.
  - CR-003 / F-02: Unclear.
  - CR-002 / F-01: Local Fix → implementation.
- What changed in the review result and why:
  - F-01 is confirmed in source. A live persisted run's thinking schema falls back to a runtime catalog that nothing loads, so `ChatThinkingControl` does not render. This is an earlier review gap.
  - F-02: no stream-close path exists in Chat-owned code. The leading hypothesis (H-1) is the pre-existing history reconcile disconnecting a prepared, not-yet-started run, but it is unconfirmed. The origin is held for evidence.
  - F-03 hits the design's RSK-003 escalation trigger. The ALL_INSTALLED name-collision policy for AGY workspace skills is a design decision.
- Supported product scenario / material-premise basis changes:
  - F-01: SCN-007/SCN-008, Supported Normal.
  - F-02: SCN-001-F, Supported Explicit Edge; origin Unclear.
  - F-03: Supported Explicit Edge under the RSK-003 governing contract.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Low, non-blocking) | Resolved (pending proportional test review) | API-REV-001 | API/E2E report: stale mock removed; the spec's 2 baseline failures are unchanged |

- New or remaining finding IDs: CR-002 (Medium, F-01), CR-003 (Unclear, F-02), CR-004 (High, F-03).
- Material score or classification changes: Runtime Correctness goes from 9.2 to 8.4 because of the F-01 review gap and F-03.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - The F-02 closer is unidentified; the evidence list is in the report.
  - The F-03 policy choice may need user or product input.

### CRR-003 — Round 3 implementation review (IR-002 / IR-003): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 3 Review (IR-002 / IR-003)" section and the updated scorecard.
- Review entry point and round: Implementation Review, round 3.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-handoff.md`. It addresses CR-002, CR-003 and CR-004 from CRR-002.
- Relevant solution revision IDs: SR-008, SR-009, SR-010
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005, ARCH-REV-006
- Relevant implementation revision IDs: IR-002, IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass, 9.3/10, with every category at 9.2 or above.
- What changed in the review result and why:
  - CR-002: the persisted-mode controls now request the run's runtime catalog, so the locked thinking control shows on a fresh load of a live run.
  - CR-003: the D-14 activation-pending marker in `agentRunStore` has every set and clear path the design lists. Reconcile skips marked runs, the SR-008 guard is removed cleanly, and the R-2 generation guard is in place. The live resend probe passed 14/14.
  - CR-004: D-15 request strength is implemented. Rule 1 covers the shared materializer and AGY. Rule 2 A skips; Rule 2 B yields to the configured source while the entry stays exclusive, and restores on failure. Release is keyed by holder (IC-1), and the link operations were extracted to `workspace-skill-links.ts`.
  - The reviewer reran 225 server tests (16 files) and 272 web tests (28 files); all passed.
- Supported product scenario / material-premise basis changes: C-08..C-11 were rejected (design-approved, infrastructure failure, or contrived timing). C-12 was promoted as a non-blocking delivery note: the merge-time test type fix.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved by API/E2E (pending test review) | Unchanged (pending proportional test review) | API-REV-001 | Uncommitted worktree change; out of scope for source review |
| CR-002 | Open (Local Fix) | Resolved | IR-002 | `chatRunModelControls.ts` L80–L90; spec test; live evidence |
| CR-003 | Open (Unclear) | Resolved | SR-010, IR-002, IR-003 | `agentRunStore.ts` marker; `runHistoryLoadActions.ts` L242–L259; unit tests; stale reproduction and resend 14/14 |
| CR-004 | Open (Design Impact) | Resolved | SR-008/SR-009, IR-002 | `workspace-skill-materializer.ts`, `workspace-skill-links.ts`, the AGY materializer; V-A..V-E unit and live |

- New or remaining finding IDs: none blocking. There is one delivery note (C-12).
- Material score or classification changes: Runtime Correctness goes from 8.4 to 9.2; Cleanup from 9.1 to 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The D-14 marker has no timeout (design-approved).
  - The Windows re-point fallback is unit-tested only.
  - The merge-time type fix in the upstream AGY e2e test.

### CRR-004 — Proportional API/E2E test-code review: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md` (new). `code-review-report.md` is unchanged and stays authoritative for source review (CRR-003).
- Review entry point and round: Successful API/E2E test-code review, round 1.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-execution-coverage-report.md` (API-REV-002, Pass, 95%).
- Relevant solution revision IDs: SR-010
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, source review)
- Current authoritative result: Pass (test-code review)
- What changed in the review result and why: three durable test paths were reviewed:
  - the live probe C01–C15 (added);
  - the `package.json` script (updated);
  - the CR-001 mock removal (updated).
  They are coherent, isolated, and requirement-aligned, and they match the execution evidence. `node --check` passes.
- Supported product scenario / material-premise basis changes: None. The probe cases reproduce scenarios already established upstream.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved by API/E2E (pending test review) | Resolved (verified) | API-REV-001/API-REV-002 | The worktree diff removes the `createDraftRun` mock line; no other change to the spec |

- New or remaining finding IDs: none blocking. Advisories A-1..A-3 are recorded in the test review report.
- Material score or classification changes: N/A (the scorecard does not apply to test review).
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - The durable test changes are uncommitted and must be committed at finalization.
  - Delivery note C-12 (the merge-time AGY e2e test argument).
  - Voice dictation is not automatable.
  - The Windows re-point fallback is unit-tested only.

### CRR-005 — Round 4 implementation review (IR-004, D-16 Chat model labels): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 4 Review (IR-004 / D-16)" section.
- Review entry point and round: Implementation Review, round 4.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-004). The origin is user verification finding UVF-001 (`user-verification-finding-001.md`, DR-002).
- Relevant solution revision IDs: SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-007, ARCH-REV-008
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002 (prior pass; a rerun is needed for D-16)
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: Pass (CRR-003 source review; CRR-004 test review)
- Current authoritative result: Pass, 9.3/10.
- What changed in the review result and why: D-16 is verified.
  - One builder, `toChatModelOption` (catalog record first, then `existingRunChoiceLabelInput`), serves the catalog rows, search, the footer trigger and the persisted fixed list.
  - The shared `modelSelectionLabel` policy, with the mapping moved and its local copy removed.
  - The shared `compareRecommendedFirstBy` comparator.
  - One search predicate, `matchesModelQuery`.
  - Single-line truncation with the full text in `title` and `aria-label`.
  - The launch-form badge style.
  - The reviewer reran 14 files (74 tests); all passed.
- Supported product scenario / material-premise basis changes: SCN-002 is extended by REQ-021/AC-018 (user-approved). C-13..C-15 were rejected.

#### Prior Finding Resolution

None. No findings were open after CRR-004.

- New or remaining finding IDs: None.
- Material score or classification changes: None. The delta is Small/Low, and the package stays Large/High.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: the locale-dependent upstream spec (`TokenUsageMeterPanel.spec.ts`) is unrelated to this ticket.

### CRR-006 — Proportional API/E2E test-code review, round 2 (D-16 probe update): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md`. See the "Round 2 Delta" section and the latest result.
- Review entry point and round: Successful API/E2E test-code review, round 2.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-003, Pass, 95%); AC-018 / V-L1..V-L5.
- Relevant solution revision IDs: SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: Pass (CRR-004 test review; CRR-005 source review)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The probe update was reviewed: `MODEL_ROW`, the C04 policy-label trigger check, and the new C16.
  - C16's independent oracle matches the shared label policy rule for rule and is cross-checked against the launch form (V-L5).
  - `node --check` passes.
- Supported product scenario / material-premise basis changes: SCN-002 is extended by REQ-021/AC-018 (user-approved).

#### Prior Finding Resolution

None. There were no open test-review findings; advisories A-1..A-3 are carried forward and A-4 was added.

- New or remaining finding IDs: None.
- Material score or classification changes: N/A.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - O-1: the fresh New chat trigger shows the raw identifier for about 0.6–3 s before the policy label. It is implementation behavior outside the approved requirement's scope; it goes to delivery for UVF-001 re-verification.
  - The probe update is uncommitted.

### CRR-007 — Proportional test-code review, round 3 (API-REV-004 desktop addendum): Not Applicable

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md`. See the "Round 3" section and the latest result.
- Review entry point and round: Successful API/E2E test-code review, round 3.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` ("Round 4" section; API-REV-004, Pass, 95%); DT-00..DT-05.
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-003, DR-004 (delivery merge refreshes)
- Prior authoritative result: Pass (CRR-006)
- Current authoritative result: Not Applicable
- What changed in the review result and why:
  - No durable test changed. The round-2 probe was committed unchanged in `030bab78d` (empty diff to HEAD).
  - No chat-owned source changed since `e9f2ce399`; the later commits are delivery merge refreshes of `origin/personal` and ticket docs.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None. There are no open test-review findings.

- New or remaining finding IDs: None.
- Material score or classification changes: N/A.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - O-1: the transient identifier label on a fresh New chat.
  - O-2: the `/` skill list is fetched once per session, so a skill added externally is missing until the Skills page is visited or the app restarts.
  - O-3: the runtime badge truncates at 1200 px.
  - All three are for user re-verification; none is a finding against the approved requirements.
