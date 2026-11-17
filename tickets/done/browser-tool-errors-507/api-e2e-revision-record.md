# API/E2E Revision Record — browser-tool-errors-507

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/implementation_engineer`, `implementation-handoff.md`, round 1 | SR-001, SR-002, IR-001 | N/A | Pass / 94.6 % |

## Revision Entries

### API-REV-001 — Baseline: real-app agent journeys, OS window states and screen-lock probes

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001, direct route), round 1
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-001, SR-002 (solution), IR-001 (implementation); no ARCH-REV/CRR (direct route)
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none kept. E2E-09 tried an app-hidden case in `browser-screenshot-capture.electron.spec.ts` and reverted it because its result depends on the macOS screen lock state.
- Cases added, changed, removed, or rechecked: reused IMP-01..IMP-06 (E2E-R1..R4); ran E2E-00, E2E-B1, E2E-01, E2E-02a, E2E-02b, E2E-03a/03b (+ run 1 observation), E2E-04, E2E-05, E2E-06, E2E-07, E2E-08, E2E-09, E2E-10
- Commands, environment, fixture, or broader-validation delta: isolated instances of the worktree build and of the released 1.5.13-beta.7 app; a real `claude_agent_sdk` agent calling the browser tools; macOS accessibility for window minimize/app hide of the instance process; probes in the pinned Electron while macOS had locked the screen

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`, `follow-ups.md` (FU-004, FU-005)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.6 % (no category below 90 %; the 95 % target is missed by the unbounded never-answering capture, FU-004, and missing durable tests for lock/hide states, neither closable by validation)
- New or remaining failure IDs: None
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: FU-004 (unbounded wait if `capturePage()` never answers; observed only for an app hidden while the screen was locked, a state only automation produces); FU-002 unchanged; covered windows in the real app proven through the lock-state occlusion probes rather than the isolated instance (its flag disables occlusion)
