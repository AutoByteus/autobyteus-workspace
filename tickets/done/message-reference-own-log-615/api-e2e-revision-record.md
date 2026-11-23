# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Pass`

- Date: 2026-11-23
- Trigger: CRR-001 Pass (Medium / High)
- Code tested: `0629b5c631` (HEAD `725891acc1`)
- AC-007 on a fresh build (`dist` removed and rebuilt): MRV-1 opens all 21 listed references in 12 views; CRA-1 passes.
- AC-008: TESTING.md "Choosing the path" row for changes that move where data lives (`725891acc1`).
- AC-001…AC-006 reused from IMP-02…IMP-14 on the code under test.
- Result: `Pass`, confidence 95.4%; route: test-code review by `/code_reviewer`.
