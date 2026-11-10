# API/E2E Revision Record — server-e2e-node-credential-447

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 90% |

## Revision Entries

### API-REV-001 — Baseline validation of IR-001; a gated fixture-composed node still has no credential

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-001
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/mcp/mcp-gateway-token.e2e.test.ts` (API-07, AC-003 refusal half on the real server)
- Cases added, changed, removed, or rechecked: API-01…API-06 reused from IMP-01/02/04/05/06/07/08; new API-07…API-14
- Commands, environment, fixture, or broader-validation delta: all 59 scripted-AGY gated suites run (API-10); a no-model probe of the Codex native policy suite with a stand-in binary (API-11)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002…FU-004)
- Prior result and confidence: N/A
- Current result and confidence: Fail, 90%
- New or remaining failure IDs: API-11 (REQ-003)
- Recommended owner: implementation engineer (`Local Fix`, via code reviewer failure-origin review)
- Remaining risks, blocked evidence, or untested scope: paid live suites not run (Non-Goal); FU-002…FU-004 are out-of-scope gated-suite failures with causes recorded (FU-004's cause not yet found)
