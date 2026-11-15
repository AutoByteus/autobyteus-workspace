# API/E2E Revision Record — memory-sync-large-files (Project Task autobyteus-workspace-7)

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative; this record holds the baseline and each round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`, `code-review-report.md` CRR-002 (Pass), round 1 | SR-004 / ARCH-REV-003 / IR-002 / CRR-001, CRR-002 | N/A | `Fail` on AC-003 only (Requirement Gap, routed to Solution Designer); final confidence 90% |

## Revision Entries

### API-REV-001 — Baseline: independent validation of the large-file Memory Sync package

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, review round 2 (CRR-002, Pass); API/E2E round 1.
- Triggering finding or case IDs: residual risks 1-4 of CRR-002: AC-003/QR-002 cold vs warm RSS; the card checked only under jsdom; the checks the implementation did not run (full server unit suite, web typecheck, `agent-semantic-memory.e2e`); suggested scenarios (Sync now during a background upload, hub restart during an upload, hub as the user's own node).
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-003, IR-001/IR-002, CRR-001/CRR-002; no delivery revision.
- Why this baseline was recorded: first API/E2E round on code `077fa6853` (documents at `bfcd82366`).
- Coverage decisions or durable test paths changed: none. All durable memory-sync unit and e2e coverage stayed `Still Valid`; no durable test was added, updated or removed. `TESTING.md` gained a "Node version" rule (own commit).
- Cases added, changed, removed, or rechecked: API-01, 02, 02b, 03, 03b, 05, 05b, 06a-c, 07, 08, 09, 10, 11, 12 run; API-04 `Reused` (IMP-03). Temporary probes (AC-003 measurement, rendered card, lifecycle/gate) stored in `evidence/probes-api-e2e/`.
- Commands, environment, fixture, or broader-validation delta: Node 22 (release), Node 24 (desktop runtime) and Node 26 (machine default); two real built servers; Chrome on a Nuxt dev server; fresh clone with frozen install; broader validation `Required` and executed.

#### Prior Failure Resolution

None. (CRR-001's CR-001 was resolved by the implementation in `077fa6853` before this round.)

- Canonical artifacts and sections updated: created `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`; `follow-ups.md` FU-003; evidence under `evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail` on AC-003 as written; all other acceptance criteria proven; final confidence 90% (requirement proof 75%, the rest 90-95%).
- New or remaining failure IDs: AC-003 (case API-07). Observations OBS-1 (card word breaks), OBS-2 (hub reason repeats path), OBS-3 (zero-byte partial after a refused piece) are non-blocking. FU-003 (web typecheck gate fails on base) is out of scope and urgent for delivery.
- Recommended owner: Solution Designer (`Requirement Gap`: cold or steady-state, which Node). A `Design Impact` follows only if cold on Node 24 binds.
- Remaining risks, blocked evidence, or untested scope: packaged desktop build (stops at FU-003; signing needs the runner); Electron-embedded Node approximated by Node 24.15.0; a torn piece after a kill mid-write not hit; 24 h staging expiry by unit clock; no remote network (FU-002).
