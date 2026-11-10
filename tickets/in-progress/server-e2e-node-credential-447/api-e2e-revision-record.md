# API/E2E Revision Record — server-e2e-node-credential-447

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 90% |
| API-REV-002 | Implementation engineer, `implementation-handoff.md` IR-002 (CRR-001 Local Fix), round 2 | SR-001, IR-002, CRR-001 | Fail / 90% | Pass / 95% |

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

### API-REV-002 — API-11 fixed: the gated Codex fixture child presents its launch credential

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002), round 2; failure-origin review `code-review-report.md` (CRR-001: CR-001, CR-002)
- Triggering finding or case IDs: API-11 (round 1 Fail)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-002, CRR-001
- Why this baseline or coverage/execution revision was recorded: rerun after the Local Fix
- Coverage decisions or durable test paths changed: none by API/E2E (IR-002 changed `codex-native-multi-agent-disabled.e2e.test.ts`, `tests/fixtures/codex-native-multi-agent-system.mjs`, TESTING.md)
- Cases added, changed, removed, or rechecked: rerun by impact (`git diff --name-only 8c0d99eb83 0a324654a5`): API-11, API-08b (new ID for the round-2 guard run), API-13, API-14; new API-11c (missing-credential branch). API-01…API-07, API-09, API-10, API-12 still valid (they do not exercise the changed files)
- Commands, environment, fixture, or broader-validation delta: same API-11 command and stand-in Codex as round 1, at `0a324654a5`

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-11: fixture child's `/graphql` refused 401 `NODE_CREDENTIAL_REQUIRED` | `Local Fix` (implementation), confirmed by CRR-001 | Fixed in `63dc98b054` (child env + child attachment) and `44ee19f3b8` (TESTING.md) | API-11 (round 2: GraphQL setup and WebSocket admitted, stops only at the stand-in Codex), API-11c |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (Round, Cases, AC proof, scorecard, result), `api-e2e-coverage-investigation.md` (meta, planned cases), `api-e2e-test-progress.md`
- Prior result and confidence: Fail, 90%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: None in scope (FU-002…FU-004 are out-of-scope follow-ups)
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: live Codex part of the gated Codex native policy suite and other paid live suites not run (Non-Goal, user direction); fixture children not statically guarded (approved Non-Goal, CRR-001 C-03)
