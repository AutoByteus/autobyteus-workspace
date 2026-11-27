# API/E2E Revision Record — usage-limit-fallback-646 (autobyteus-646)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-011, IR-002, CRR-002 | N/A | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: the node fallback in a delegation, a Team and on a peer; a switch that waits for a running turn

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002 Pass, round 2 of review), API/E2E round 1; code `1bc523124e`.
- Triggering finding or case IDs: none (baseline); API-01 … API-07.
- Coverage decisions or durable test paths changed (commit `b5e56fcc50`): UL-10, UL-11, UL-12 (built server); ULP-02 (peer); the scripted Codex's `HOLD_LIMIT`; the scripted AGY's `runtime_error` serves a `CALL_TOOL` turn.
- Cases: API-01 … API-06 run; API-07 Not Tested; reused IMP-11/12/13.

#### Prior Failure Resolution

None.

- Canonical artifacts: the coverage investigation, the execution report, `api-e2e-test-progress.md`, `evidence/API/`, `follow-ups.md` (FU-646-05).
- Prior result and confidence: N/A. Current: Pass, 94%.
- New or remaining failure IDs: none for this ticket. MRD-04 is FU-646-04 (before this ticket); the search-files teardown race is FU-646-05.
- Recommended owner: code reviewer (test-code review), then delivery (the release waits for R-6 and DEC-008 with the founder).
- Remaining risks: AC-001's live case and Claude's SDK signal Not Tested (no exhausted account); R-6's 40 s wait with Model Routing on.
