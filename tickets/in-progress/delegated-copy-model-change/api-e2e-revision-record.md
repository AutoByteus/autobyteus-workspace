# API/E2E Revision Record — delegated-copy-model-change

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 (round 2 `Pass`) | SR-007, ARCH-REV-003, IR-002, CRR-002 | N/A | `Pass` / 95% |

## Revision Entries

### API-REV-001 — Baseline API/E2E validation of per-copy Stop and model change

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-002.
- Triggering finding or case IDs: none (baseline); the pre-existing SR-011 architecture failure reported by the reviewer (TESTING.md Rule 9).
- Related revision IDs: SR-007, ARCH-REV-003, IR-001/IR-002, CRR-001/CRR-002.
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts`: DCM-005..007 added (Org root, collaborator, live event, later copy; mid-turn interrupt and containment, followers vs own model, never-started members; woken during edit, invalid settings, Team stream event, provider refusal at resume with recovery in the same conversation).
  - `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`: DCP-002..004 added (Team root, Org root, UI refusal and backend restart); `autobyteus-web/package.json` script runs DCP-001..004.
  - `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts`: baseline fix commit `aaf6f010f1` (guard stale since base `9777af682c`).
- Commands, environment, fixture, or broader-validation delta: scripted AGY with two extra models; fake Grok replaying `cancel.jsonl`; isolated desktop instance with real Claude/Codex/AutoByteus (key file imported into the instance DB, removed with it).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| SR-011 architecture guard (`application-framework-boundaries.test.ts`), failing on the base | Pre-existing (reviewer note) | Cause: base commit `9777af682c` renamed the migrations' providers and removed one singleton call without updating the guard. Test-only fix, own commit `aaf6f010f1`; intent unchanged | ledger event 1 |

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`.
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95% (post-repository 81%)
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Remaining risks: AC-010 user verification; residuals in the report (another client's Settings needs a Refresh; Stop interrupts work; older copies without a recorded delegator); observations O-1..O-3.
