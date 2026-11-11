# API/E2E Revision Record — desktop-node-file-open-471 (autobyteus-471)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-002, IR-001 | N/A | Fail / 78% |

## Revision Entries

### API-REV-001 — Baseline: the desktop on a Docker node, a remote run, the preserved suites

- Triggering role, report path, and round: Implementation Engineer (`implementation_engineer_2f676ee62a614a47b8814c2e96abbe6f`), `implementation-handoff.md` IR-001, round 1; code `2e2b9ed436`
- Triggering finding or case IDs: the handoff's "Left for you": AC-001's Electron + Docker check, AC-005's packaged regression, the desktop remote-run message and PDF/media node files
- Related revision IDs: SR-002, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: baseline test fixes `32dccf58fa` (`event-monitor-file-preview-probe.mjs`) and `b49b5c539f` (`search-pdf-preview-probe.mjs`); RU-05 (path attachments) added to the investigation
- Cases added, changed, removed, or rechecked: R-IMP (reused), API-01, API-02, API-03, API-04, API-05
- Commands, environment, fixture, or broader-validation delta: isolated packaged instance; test-owned Docker node of this worktree's server package; a paired host node; the scripted AGY CLI with its own MCP client package in the container

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, `follow-ups.md` (FU-001…FU-003), evidence
- Prior result and confidence: N/A
- Current result and confidence: Fail, 78%
- New or remaining failure IDs: F-1, F-2 (AC-003), F-3 (REQ-001 read-only); out of scope: FU-001, FU-002, FU-003
- Recommended owner: Code Reviewer (failure-origin review), then Implementation Engineer
- Remaining risks, blocked evidence, or untested scope: the phone link in a remote run (F-1, by code reading); Windows/Linux desktop not tested
