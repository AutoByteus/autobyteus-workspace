# API/E2E Revision Record — MCP server secrets in the vault (autobyteus-244)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-002 pass), round 1 | SR-008, ARCH-REV-003, IR-002, CRR-002 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: packaged-app, live-runtime and Linux validation of MCP secrets in the vault

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-002), round 1
- Related revision IDs: SR-008, ARCH-REV-003 (AR-015, AR-016), IR-002, CRR-002
- Coverage decisions or durable test paths changed: none. A temporary diagnostic was added to the matrix suite and reverted.
- Cases:
  - API-R01 reused (IMP-01…IMP-22);
  - API-01 full server e2e;
  - API-02 gated runtimes and GitHub live;
  - API-03…API-07 desktop journeys on two isolated instances;
  - API-08 Linux Docker backup;
  - API-09 safety.

#### Prior Failure Resolution

None.

- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: none
- Recommended owner: the code reviewer (test-code review on the reviewed route)
- Remaining risks:
  - O-1: import applies the rule to reviewed-plain values (a question for the Solution Designer);
  - one unreproduced Codex matrix result (FU-007);
  - Windows not covered.
