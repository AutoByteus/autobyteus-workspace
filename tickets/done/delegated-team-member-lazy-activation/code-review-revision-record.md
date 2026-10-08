# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review / DTL-003 failure (API-REV-001) | N/A | Fail — Local Fix → implementation_engineer | CR-FO-001, CR-FO-002 |
| CRR-002 | `code-review-report.md` | Failure-origin reclassification / user instruction to refactor | Fail — Local Fix | Fail — Design Impact → solution_designer | CR-FO-001, CR-FO-002, CR-FO-003 |
| CRR-003 | `code-review-report.md` | Implementation Review of IR-003 (SR-003 + SR-004) | Fail — Design Impact | Pass → api_e2e_engineer | CR-FO-001, CR-FO-002, CR-FO-003 (all resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review after API-REV-002 Pass | Pass (implementation review) | Pass → delivery_engineer | None |

## Revision Entries

### CRR-001 — DTL-003 member start failure: teammate delivery throws instead of reporting

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md`; DTL-003 (AC-004 / REQ-005 member branch)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A (direct route; no prior code review)
- Current authoritative result: Fail. Failure origin is an implementation defect in `ConfiguredAgentExecutionHandle.reserveInput`, which has no start-failure handling, unlike `postMessage`. The test is valid.
- What changed in the review result and why: Initial baseline. Confirmed that teammate `send_message_to` reaches the not-started member through `reserveInput`, not `postMessage`. In that path a start failure throws past `RootCommunicationEngine.deliver` to MCP as `-32603`. The `readiness_failure` event has no consumer, so the member stays `offline`.
- Supported product scenario / material-premise basis changes: FO-SCN-001 (= SCN-002 alternate) is confirmed as a Supported Normal Scenario. No new premise.

#### Prior Finding Resolution

None

- New or remaining finding IDs:
  - CR-FO-001 (blocking, Local Fix)
  - CR-FO-002 (non-blocking note: DS-002 path citation)
- Material score or classification changes: N/A (no scorecard in a failure-origin round); classification `Local Fix`.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the fix also changes the failure output for UI-started Team/Org members (from an internal error to the approved not-accepted result plus `error`), consistent with REQ-005's intent.

### CRR-002 — Reclassified to Design Impact: refactor the duplicated activation-failure handling in this ticket

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2 (reclassification)
- Review scope: `N/A` (failure-origin reclassification; no source re-audit)
- Triggering role, report path, and finding or scenario IDs: User instruction (2026-10-08) after the root-cause discussion. Same DTL-003 / AC-004 evidence as CRR-001.
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001; IR-002 (`d30c11204`, not reviewed, superseded by the refactor scope)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Local Fix → implementation_engineer (CRR-001)
- Current authoritative result: Fail — Design Impact → solution_designer
- What changed in the review result and why: The root cause is structural. The same member-activation failure handling is written separately on the `postMessage` and `reserveInput` paths. One failure is reported through four channels, one of which (`readiness_failure`) has no consumer. The design traced the wrong path. The user asked for a bounded refactor in this ticket (CR-FO-003) instead of a symptom patch. The broader input/delivery cleanup goes to a separate ticket.
- Supported product scenario / material-premise basis changes: None (FO-SCN-001 unchanged).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-FO-001 | Open (Local Fix) | Open; to be resolved within the CR-FO-003 refactor | IR-002 `d30c11204` (not reviewed) | `d30c11204` diff fixes the symptom by duplicating the `postMessage` handling in `reserveInput` |
| CR-FO-002 | Open (non-blocking note) | Open; now a required item (design trace correction) in CR-FO-003 | SR-002 | design-spec.md DS-002 L109, L114 |

- New or remaining finding IDs: CR-FO-001, CR-FO-002 (folded into CR-FO-003), CR-FO-003 (new, blocking, Design Impact)
- Material score or classification changes: `Local Fix` → `Design Impact`. Solution Designer must re-confirm size and risk. The reviewer recommends independent source review for the refactor.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - The compaction-recovery difference between `postUserMessage` and `reserveUserMessage` has not been traced. It belongs to the separate cleanup ticket.

### CRR-003 — Implementation review of IR-003: one member start-failure step (Pass)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Review` of the IR-003 delta (`git diff d30c11204 b3b28d47b`). This is the first implementation-source review of the package.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-003)
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-003 (supersedes IR-002)
- Relevant API/E2E revision IDs: API-REV-001 (a rerun is pending)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Design Impact → solution_designer (CRR-002)
- Current authoritative result: Pass, score 9.4/10, every category ≥ 9.0
- What changed in the review result and why: `startForInput()` implements DS-005 exactly. Both entry points use it. AR-NB-001..003 and SR-004 are applied. The reviewer ran the focused suites (107/107) and `tsc` (clean).
- Supported product scenario / material-premise basis changes: PREM-001 confirmed as implemented.
- **Correction of CRR-001:** CAND-002 / CR-FO-003 item 2 said `readiness_failure` had no consumer. That was wrong. The presentation adapter's implicit fall-through turned it into the member's conversation `ERROR` card (AINV-013). The reviewer had verified consumers by string grep instead of by type. SR-004 / DI-001 corrected the design before any behavior was lost. Method note: verify event consumers by type and exhaustiveness.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-FO-001 | Open (folded into CR-FO-003) | Resolved | IR-003 `b3b28d47b` | `reserveInput` → `startForInput` returns `{reserved:false, code:"AGENT_RUN_ACTIVATION_FAILED", message:"<code>: <msg>"}` plus the `error` overlay. Unit cases for both entry points |
| CR-FO-002 | Open | Resolved | SR-003 | design-spec DS-002 (L110, L115) now traces `reserveInput` |
| CR-FO-003 | Open (Design Impact) | Resolved as revised by SR-004 | SR-003, SR-004, IR-003 | Per-entry-point readiness catch removed. One failure code. `readinessFailureCode` removed. The `readiness_failure` removal was withdrawn (wrong premise; see the correction above) |

- New or remaining finding IDs: None
- Material score or classification changes: first scorecard, 9.4/10. Decision: Pass.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`, with an informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - PREM-001 cosmetic residuals (local-only `initializing` withdrawal; predicate evaluated twice).
  - Pre-existing throw before the handle exists.
  - Deferred cleanup ticket.

### CRR-004 — Proportional test-code review after API/E2E Pass (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-test-review-report.md` (created)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Covers the durable test changes from `c95ad4b92`, `fecc0c047` and `520c53dc7`.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-002); DTL-001..009, BR-008..011
- Relevant solution revision IDs: SR-002, SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, implementation review)
- Current authoritative result: Pass (test review)
- What changed in the review result and why:
  - The durable tests prove the approved contracts through real boundaries: launch log, saved bindings, view-snapshot statuses, the sender's typed failure, exactly one error card, and rendered row status.
  - The baseline fixes update stale doubles and assertions to current contracts, as TESTING.md rule 9 requires.
  - The flipped `@`-candidate assertion matches the documented policy (`collaborator-candidate-policy.ts:73-76`).
- Supported product scenario / material-premise basis changes: None. DTL-007's saved-tree edit is accepted as the representative way to stage pre-fix data (REQ-006 / AC-005).

#### Prior Finding Resolution

None

- New or remaining finding IDs: None. Non-blocking notes N-1..N-4 are in the test review report.
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-007 needs the user's check in the desktop app.
  - The Codex runtime was not run.
  - The PREM-001 race is covered by unit tests only.
