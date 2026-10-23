# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record indexes every completed API/E2E validation result.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-002, round 1 | SR-001..SR-003, ARCH-REV-002..003, IR-001..IR-002, CRR-001..CRR-002 | N/A | Pass / 95.5% |

## Revision Entries

### API-REV-001 — Baseline: capability gates on a real server, every migration suite on the current code

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002, Pass), round 1
- Triggering finding or case IDs: the handoff's "Downstream Coverage Hints" and code review's "Residual Risks":
  - the G-1 and G-2 real-startup journeys;
  - the 205 compactor at a real startup;
  - the migration startup e2e suites.
- Related revision IDs: SR-003, ARCH-REV-003, IR-002, CRR-002
- Why recorded: first API/E2E validation.
- Coverage decisions or durable test paths changed:
  - `custom-provider-readable-id-startup-migration.e2e.test.ts`: the obsolete G-1 startup-block case was replaced (its old assertion fails on the branch, API-08), and a new failed-chain journey case was added;
  - `remove-skill-improvement-data-startup.e2e.test.ts`: SID-2 extended with the compactor run.
- Cases:
  - API-01..API-03 reused (IMP-01 r2, IMP-02 r2, IMP-04);
  - API-04..API-07 rerun on `9b013fcc09` (rule 4, a migration changed);
  - API-08..API-12 new.
- Commands, environment, fixture, or broader-validation delta: built-server e2e with a clean env. Heavy runs waited until no other heavy run was active on the machine.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: all (new)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.5%
- New or remaining failure IDs: none in this ticket. RA-04's full-run failure was caused by the machine's idle sleep (evidence `API-12-ra04-sleep-cause.txt`); it passes alone.
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review), per `get_handoff_rules`
- Remaining risks: FU-001 (pre-existing).
