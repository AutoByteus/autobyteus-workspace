# API/E2E Revision Record — test-and-tooling-hygiene-294 (autobyteus-294)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-002 (round 2 Pass) | SR-005, ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline validation: clean clone, full suites, probes, packaged build, desktop icons, live CLIs

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, round 2 (CRR-002).
- Triggering finding or case IDs: the implementation handoff's "Not run" list and Downstream Coverage Hints.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-005; ARCH-REV-002; IR-001, IR-002; CRR-001, CRR-002.
- Why this baseline or coverage/execution revision was recorded: first API/E2E round.
- Coverage decisions or durable test paths changed: five TESTING.md Rule 9 baseline fixes, each a red test whose cause was a lag behind a base commit:
  - `dfef14abc6`: `remove-built-in-project-task-manager-startup.integration.test.ts` (Model Router built-in, `930597c730`).
  - `a001e645c7`: `workspaces-graphql.e2e.test.ts` (config double `get`, `d384968700`).
  - `bce2f8b4e3`: `remove-built-in-project-task-manager-startup.e2e.test.ts` (built-in folder list, `930597c730`).
  - `e60f4d89a0`: `claude-sdk-client.integration.test.ts` helper (`beginStreamingSession` / `requestClose`, `028cca2312`).
  - `6af8819ede`: `electron-launch-profile-probe.mjs` occupied-port expectation (`f34ad8749f`).
- Cases added, changed, removed, or rechecked: API-01..API-26 as planned; API-20 gained a per-file run (temporary runner) after the full run hit the 2 h tool limit.
- Commands, environment, fixture, or broader-validation delta: clean clone for the repository suites; worktree for E2E, probes, packaged build and desktop instance; clean env for E2E; throwaway `CODEX_HOME` for the Codex runs; `caffeinate -is` after the machine slept during API-20.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections; Durable Coverage To Update rows for the five fixes), `api-e2e-execution-coverage-report.md` (all sections), `api-e2e-test-progress.md`, `follow-ups.md` (FU-011, FU-012), `evidence/API-*`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3% (no category below 94%).
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer, for proportional test-code review of the five baseline fixes.
- Remaining risks, blocked evidence, or untested scope: AC-014 on Linux (no host); BEH-032 screens rendered only through their specs; fresh-clone Electron download race (FU-011); stale call in the real-provider capabilities E2E (FU-012).
