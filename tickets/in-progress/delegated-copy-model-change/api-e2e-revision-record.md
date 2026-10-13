# API/E2E Revision Record — delegated-copy-model-change

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 (round 2 `Pass`) | SR-007, ARCH-REV-003, IR-002, CRR-002 | N/A | `Pass` / 95% |
| API-REV-002 | Delivery engineer, delivery verification (evidence gap) | DR-001 | `Pass` / 95% (per-member Team-copy choice unit-tested only) | `Pass` / 95% |

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

### API-REV-002 — Per-member choice in a Team copy proven end to end (delivery evidence gap)

- Triggering role, report path, and round: `/software_engineering_team/delivery_engineer`, delivery verification (`handoff-summary.md` → Verification); round 2.
- Triggering finding: REQ-001 "any member of a Team copy" and the AC-010 scenario (change the code reviewer of a delegated SE Team copy) were covered by unit tests only.
- Related revision IDs: DR-001 (delivery checkpoint commits `c841412d6b`, `357bfa1ab6`, `1f3bd8ffde`), API-REV-001.
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts`: DCM-008 and the `trio` Team.
  - `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`: DCP-005, `agyLaunchDetailsOf`; header; `autobyteus-web/package.json` script runs DCP-001..005.
- Cases added: DCM-008, DCP-005; temporary ISO-002.
- Commands, environment, fixture, or broader-validation delta: DCM ×2 (6/6), probe DCP-005 ×2 and the full probe (15/15); isolated desktop instance with real Claude and Codex (no key import needed).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| Delivery evidence gap: per-member choice in a Team copy | Evidence gap (API/E2E) | Closed: DCM-008 (server), DCP-005 (UI), ISO-002 (real runtimes: code reviewer on Codex switched and resumed in its thread; coordinator unchanged) | ledger events 8–12 |

- Canonical artifacts updated: report (meta, reconciliation, matrix, durable coverage, scorecard, observations), investigation (meta, coverage to add, broader validation), ledger (cases, events 8–12).
- Prior result and confidence: `Pass`, 95%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` (test-code review of DCM-008 and DCP-005)
- Remaining risks: AC-010 user verification; observations O-1..O-4.
