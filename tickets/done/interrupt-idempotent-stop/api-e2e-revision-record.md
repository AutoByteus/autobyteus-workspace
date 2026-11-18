# API/E2E Revision Record — autobyteus-533 (interrupt-idempotent-stop)

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-002 Pass; round 1 | SR-003 (requirements SR-002), ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 94.6% |

## Revision Entries

### API-REV-001 — Baseline: durable Stop probes on desktop and phone, whole server suites, CG-07 explained

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-002 Pass, round 2 targeted), API/E2E round 1.
- Triggering finding or case IDs: the implementation handoff's "API / E2E … Still Required" (AC-010 phone case, durable desktop probe replacing the scratch, whole `test:integration` and `pnpm test:e2e`, real-stack journeys for Org, delegated and peer runs, CG-07).
- Related revision IDs: SR-003, ARCH-REV-002, IR-002, CRR-002.
- Why this baseline was recorded: first API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/stop-generation-probe.mjs` (`test:e2e:stop-generation`), `autobyteus-web/tests/e2e/mobile-stop-generation-cases.mjs` (MSP-75…79), `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs`.
  - Updated `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (runs MSP-75…79; the phone's sockets pass the wire, pass-through by default).
  - Removed `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` (replaced by the desktop probe).
  - Commits: `f8fad0fc6a`, `ed921d57c6`, `28de6a0ee9`, `6744d786c6`.
- Cases added: API-01…API-12 with API-05b, API-06b…e and API-09b (investigation's Planned Cases).
- Commands, environment, fixture, or broader-validation delta: broader validation executed in a real stack (built nodes, desktop renderer, phone bundle, two paired nodes); harness corrections during the round, each with its first run kept as evidence: the wire carries every `/ws/` socket (API-07 run 1), presses that meet a just-disabled button are recorded as none (API-08 run 1), repeated gaps are separate rounds (API-10).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: the investigation (all sections), the execution report (all sections), `follow-ups.md` (FU-005, FU-006, FU-007), `evidence/api-e2e/` (index `README.md`).
- Prior result and confidence: N/A.
- Current result and confidence: Pass, 94.6% (the 95% target missed only on the environment category: unrelated suites kept from passing by this machine's load and FSEvents).
- New or remaining failure IDs: none in scope.
- Recommended owner: Code Reviewer (proportional test-code review).
- Remaining risks, blocked evidence, or untested scope: AC-005 on live runtimes (unit only); the two folder-watcher integration files and five E2E files whose failures have causes outside the change (FSEvents, load, OT-2 stale on the base); CG-06, R-3, R-4 by design; FU-005, FU-006, FU-007.
