# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md` CRR-001, round 1 | SR-008, ARCH-REV-002, IR-001, CRR-001 | N/A | Blocked / 87% |
| API-REV-002 | code_reviewer, `code-review-report.md` CRR-003, round 2 (hold lifted) | SR-009, SR-010, ARCH-REV-004, IR-002, IR-003, CRR-003 | Blocked / 87% | Blocked / 87% |

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

### API-REV-002 — Recheck on the cumulative package (autobyteus-ts reads the selector itself); live cases still blocked

- Triggering role, report path, and round: code_reviewer, `code-review-report.md` (CRR-003 Pass), round 2. Lifts the 2026-10-20 hold.
- Triggering finding or case IDs: SR-009/SR-010 revised AC-009, AC-013 and REQ-014, and added AC-018. Round-1 recheck list: AE-04, AE-06, AE-11, AE-12.
- Related revision IDs: SR-009, SR-010, ARCH-REV-004, IR-002, IR-003, CRR-003.
- Why this revision was recorded: the server, autobyteus-ts and test-support code changed under every round-1 case. All non-live cases were rerun on `a525ca02ac`.
- Coverage decisions or durable test paths changed: none. The temporary probes were reused (AE-04) or extended (AE-05: AC-018 inside the server process).
- Cases added, changed, removed, or rechecked:
  - New AE-15: a plain `node` script that imports only autobyteus-ts. It sends the vault key; without the variable it fails with `missing_api_key`; a forbidden location and a missing vault fail with their codes; `node:sqlite` loads only at the first lookup.
  - New AE-17: AC-009 as revised; the default autobyteus-ts suite is identical with and without the selector.
  - AE-06 gained run 4: a vault failure is a failure, not a skip.
  - Reran AE-01..AE-10 (AE-09 on a fresh `--build`).
  - Reused IMP-14..IMP-27, IMP-10 and IMP-11.
- Commands, environment, fixture, or broader-validation delta: root `/private/tmp/tv-r2`; `node` instead of `tsx` (not installed); otherwise as round 1.

#### Prior Failure Resolution

None. Round 1 found no failure; its live cases are still blocked on the same dependency.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md`: Meta and `## Round 2 Delta`;
  - `api-e2e-execution-coverage-report.md`: rewritten for round 2;
  - `api-e2e-test-progress.md`;
  - `evidence/AE-*`: round-2 sections and new AE-15/AE-17 files.
- Prior result and confidence: `Blocked`, 87%.
- Current result and confidence: `Blocked`, 87%. 15 of 18 ACs proven, including AC-009 (revised) and AC-018 (new). The live part is blocked.
- New or remaining failure IDs: none.
- Recommended owner: the user, for the missing dependency (`pnpm test-vault setup --source <file the user chooses>`). Then the API/E2E engineer runs AE-11..AE-14.
- Remaining risks, blocked evidence, or untested scope:
  - Blocked: AC-005, AC-006 (exit 0), AC-013 live (now via a plain `node` script), and AC-007 live (optional).
  - Accepted residuals: R-D (FU-05); Windows/Linux via injected policy only; in the environment default, media clients resolve without the server's media restrictions (accepted in ARCH-REV-004).
  - Observation (unchanged): the Settings toast after a refused save is generic; the read-only code appears in the console and GraphQL.
