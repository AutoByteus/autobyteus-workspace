# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: SR-003 Architecture Design Complete (Small/High) after CRR-002 | SR-002, SR-003 | N/A | Pass | AR-NB-001, AR-NB-002, AR-NB-003 (non-blocking) |
| ARCH-REV-002 | Round 2: SR-004 correction after implementation DI-001 | SR-002, SR-003, SR-004 | Pass (premise defect) | Pass | AR-NB-001..003 (still applicable); no new findings |

## Revision Entries

### ARCH-REV-001 — Initial baseline: SR-003 single member start step, reviewed with the SR-002 lazy-activation design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff `handoff-sr-003-design-revision.md`.
- Triggering role, report path, and finding IDs: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-002 (CR-FO-001, CR-FO-002, CR-FO-003), after API/E2E API-REV-001 failed DTL-003.
- Relevant solution revision IDs: SR-002, SR-003
- Prior authoritative decision: N/A (SR-002 went the direct route; no prior architecture review)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - The behavior basis is confirmed against the code at HEAD `d30c11204`.
  - The corrected DS-002 (`reserveInput`) trace is verified across the standalone, Team and Org delivery paths.
  - AINV-010 (no consumer of `readiness_failure`) and AINV-011 (no branching on activation codes, server and web) are verified.
  - The DS-005 closed-input branch is accepted under PREM-001 (Task DONE race, Reachable).
  - Three non-blocking implementation-precision notes were recorded.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-NB-001 (`readinessFailureCode` second consumer in the indeterminate wrapper), AR-NB-002 (closed-input detection and overlay clearing), AR-NB-003 (keep `postMessage` behavior after a successful start unchanged). All are non-blocking.
- Material classification changes: None. Small/High is confirmed.
- Recommended recipient: `/software_engineering_team/implementation_engineer`. `/software_engineering_team/solution_designer` receives an informational notice.
- Remaining risks or uncertainty:
  - CAND-005 (accepted).
  - Pre-existing: a throw during flat-handle construction can still escape `reserveInput`. This is deferred to the cleanup ticket.

### ARCH-REV-002 — SR-004: keep `readiness_failure` as the member's conversation error card

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-review-report.md`
- Review round and trigger: Round 2. Solution Designer handoff `handoff-sr-004-design-correction.md`.
- Triggering role, report path, and finding IDs: `/software_engineering_team/implementation_engineer`, `implementation-design-impact-ir-003.md`, DI-001.
- Relevant solution revision IDs: SR-002, SR-003, SR-004
- Prior authoritative decision: Pass (ARCH-REV-001)
- Factual correction to ARCH-REV-001:
  - ARCH-REV-001 accepted AINV-010 ("no consumer of `readiness_failure`") using a string grep, and so approved the event's removal. That premise was wrong.
  - The implicit fall-through in `CollaborationAgentPresentationEventAdapter.adapt` (L86-97) is a consumer. It shows a conversation error card in every root, so the removal would have broken REQ-007 / BEH-002.
  - The ARCH-REV-001 entry is kept as history.
- Current authoritative decision: `Pass`
- What changed in the review result:
  - AINV-013 is verified by type:
    - Every `publishAgentEvent` sink, in all three roots, goes through the presentation adapter.
    - The roots drive lifecycle only from `status_overlay` and `agent_run`.
    - The web `handleError` adds an error segment and calls `markConversationComplete`.
  - SR-004 option A is accepted: keep the event, emitted once per failed start by `initializeReady`; add an explicit adapter branch with an exhaustive `never` check; suppress the card in the closed-input race.
  - PREM-001 is extended to cover the card suppression.
  - Options B and C were correctly rejected: B changes REQ-007 without approval, and C changes which failures get a card.
  - Removal, interface, file and structure verdicts are updated in the report.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-NB-001 | Open (non-blocking) | Still applicable | SR-004 item 4; WIP patch | `describeActivationFailure` serves both `startForInput` and the indeterminate wrapper |
| AR-NB-002 | Open (non-blocking) | Still applicable; extended by SR-004 item 3 (same predicate gates the card) | SR-004 | WIP `inputClosedReason()` and own-overlay clearing |
| AR-NB-003 | Open (non-blocking) | Still applicable | SR-004 item 4 | WIP `postMessage` keeps the post-start logic unchanged |

- New or remaining finding IDs: AR-NB-001..003 (non-blocking). No new findings.
- Material classification changes: None (Small/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`. `/software_engineering_team/solution_designer` receives an informational notice.
- Remaining risks or uncertainty:
  - The two evaluations of the closed predicate can disagree inside the race. This is cosmetic and acceptable; evaluating once is an implementation option.
  - CAND-005.
  - The deferred cleanup ticket.
