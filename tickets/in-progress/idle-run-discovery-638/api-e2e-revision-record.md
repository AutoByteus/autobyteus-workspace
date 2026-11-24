# API/E2E Revision Record — idle-run-discovery-638 (autobyteus-638)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: real restarts on external runtimes and a Docker node; a stop during the restore

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001 Pass), round 1; code `ae1e36cded`.
- Triggering finding or case IDs: none (baseline); API-01 … API-09.
- Coverage decisions or durable test paths changed:
  - RUN-03/RUN-04 in `running-runs-built-server.e2e.test.ts`;
  - `running-runs-external-runtimes.e2e.test.ts` (new);
  - `running-runs-docker-node.e2e.test.ts` (new);
  - RR-01 extended for AC-005.
- Cases: API-01 … API-09; reused IMP-01/02/03/06/07.

#### Prior Failure Resolution

None.

- Canonical artifacts: the coverage investigation, the execution report, `api-e2e-test-progress.md`, `evidence/API/`, `follow-ups.md` (FU-002).
- Prior result and confidence: N/A. Current: Pass, 95%.
- New or remaining failure IDs: none for this ticket. RR-10 is FU-001, red before this ticket.
- Recommended owner: code reviewer (test-code review), then delivery.
- Remaining risks: Codex's conversation continuity after a restart with inference is Not Tested (the account's usage limit until 2026-11-27); FU-002 (an empty Codex thread renewed with the renewal line at the restore).
