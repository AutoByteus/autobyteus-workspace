# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md` CRR-001, round 1 | SR-008, ARCH-REV-002, IR-001, CRR-001 | N/A | Blocked / 87% |

## Revision Entries

### API-REV-001 — Baseline: everything but the real-provider runs proven; live cases blocked on the user's test vault

- Triggering role, report path, and round: code_reviewer, `code-review-report.md` (CRR-001 Pass), round 1.
- Triggering finding or case IDs: open items from the handoff:
  - AC-005, AC-006, AC-007 and AC-013 (live);
  - AC-010;
  - AC-017 at full scale;
  - strict mode.
- Related revision IDs: SR-008, ARCH-REV-002, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E validation of IR-001.
- Coverage decisions or durable test paths changed: none.
  - IR-001's durable tests are reused (IMP-01..IMP-13). Every commit after `855842b8f1` is docs/ticket only.
  - Two temporary probes (AE-04, AE-05) proved key identity with env aliases present. They were removed afterwards; their sources are kept as evidence.
- Cases added, changed, removed, or rechecked:
  - Passed: AE-01..AE-10, including AE-08b.
  - Not Tested (Blocked): AE-11..AE-14.
- Commands, environment, fixture, or broader-validation delta:
  - Synthetic vaults were created through the real setup path.
  - Real inherited keys were replaced by canaries in every case.
  - The full `pnpm test:e2e` ran with and without the selector exported.
  - The packaged worktree Electron build ran an isolated-instance journey through the Settings UI.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/AE-*`.
- Prior result and confidence: N/A
- Current result and confidence: `Blocked`, 87% (requirement proof and integration realism at 75%, both limited by the missing live runs).
- New or remaining failure IDs: none.
- Recommended owner: the user, for the missing dependency (`pnpm test-vault setup --source <file the user chooses>`). Then the API/E2E engineer resumes AE-11..AE-14.
- Remaining risks, blocked evidence, or untested scope:
  - Blocked: AC-005, AC-006 (exit 0), AC-013 live, and AC-007 live (optional).
  - Accepted residuals: R-D (FU-05); Windows/Linux via injected policy only.
  - Observation, not a finding: the Settings toast on a refused save is the existing generic "Failed to save API key for <provider>". `SECRET_VAULT_READ_ONLY` appears in the console and the GraphQL error. The design leaves the Settings UI unchanged.
