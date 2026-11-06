# API/E2E Revision Record — autobyteus-405 (S1)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md` CRR-001, round 1 | SR-001…SR-004, ARCH-REV-003, IR-002, CRR-001 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Baseline: Electron journey, real Xvnc clipboard boundary, pwsh, fresh-start builds

- Triggering role, report, round: code_reviewer, CRR-001 Pass (Large/High), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001…SR-004, ARCH-REV-003, IR-001/IR-002, CRR-001
- Why recorded: first validation round
- Coverage decisions or durable test paths changed: none. The existing durable tests were judged valid; this round's probes stay as evidence.
- Cases:
  - API-01 reuses IMP-04, IMP-06 and IMP-15…25.
  - API-02/03 rerun checks whose output was not kept.
  - New cases:
    - API-04: clipboard boundary against real Xvnc.
    - API-05: Electron journey against a node reachable only by its LAN address.
    - API-06: PowerShell launcher, real, S0 → S1.
    - API-07: fresh-start server package + desktop job.
    - API-08: `wss` through TLS termination.
    - API-09: log scan.
    - API-10: launcher-made node from a fresh-clone S1 image + the app.
- Commands, environment, fixture, or broader-validation delta: as in the report's Round and Tested Builds sections.
  - One side effect on the user's environment happened and was reversed: the launcher's own `docker pull` moved the local `beta` tag. It was restored to `9c5aa01bb2fc`.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.1%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope:
  - AC-002 cloud variant through a real Tailscale Serve `wss` in the app: user-only.
  - The build-only release run on the ticket branch: delivery, before the merge.
  - PowerShell on a Windows host.
  - No durable Electron-shell or real-Xvnc suite.
