# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-002, IR-001, CRR-001 | N/A | Fail / 91% |

## Revision Entries

### API-REV-001 — Baseline: Team stream recovery proven on desktop and phone; AC-004 old vs new; C-2 reproduced

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001 Pass), round 1, code `9e508b3adf`.
- Triggering finding or case IDs: none (baseline); the reviewer's held C-1 and C-2.
- Related revision IDs: SR-002, IR-001, CRR-001.
- Coverage decisions or durable test paths changed: SDD-15 and MSP-120 assert the member keeps its last status during the recovery; SDD-16 (C-2's reproduction, fails on `9e508b3adf`) and SDD-17 (the run-tree reselect joins the recovery) added; the implementation's probe and fixture changes reviewed and kept.
- Cases: API-001…016, 016b (API-017 Not Tested: no unarchive in the UI).
- Commands, environment, fixture, or broader-validation delta: a base clone with the branch's probe files for AC-004; a temporary SDD-91 for C-2 (removed).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, progress log, follow-ups (FU-001), `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 91%.
- New or remaining failure IDs: F-1 (C-2 reproduced: an in-app execution link's member switch during a recovery's hydration is undone at the commit); FU-001 (base).
- Recommended owner: `/code_reviewer` (failure-origin review); preliminary `Local Fix` → implementation.
- Remaining risks: C-1 not reachable in one session through the UI.
