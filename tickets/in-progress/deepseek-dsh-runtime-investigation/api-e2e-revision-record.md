# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report
(`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 Pass (round 1 of API/E2E) | SR-004, ARCH-REV-003, IR-002, CRR-002 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: DeepSeek Harness validated live, with a scripted DeepSeek, in Teams/Orgs, the standalone host and the desktop app

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002, Pass), API/E2E round 1.
- Triggering finding or case IDs: the code review's and the implementation handoff's Downstream Coverage Hints.
- Related revision IDs: SR-004, ARCH-REV-003, IR-002, CRR-002.
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed: added `deepseek-harness-scripted-provider.e2e.test.ts`,
  `deepseek-harness-collaboration-live.e2e.test.ts`, `deepseek-harness-standalone-host.e2e.test.ts` and its fixture
  (`autobyteus-server-ts/tests/e2e/runtime/`); baseline fix in `autobyteus-web/tests/integration/voice-input-extension.integration.test.ts`;
  `TESTING.md` gained a Fresh-start build section.
- Cases added, changed, removed, or rechecked: API-01, API-06…API-08, API-10…API-16, API-20…API-22, API-25, API-30,
  API-35, API-KEYSCAN run; API-02…API-05 reused from IMP-02/03/04/08/09.
- Commands, environment, fixture, or broader-validation delta: scripted DeepSeek endpoint as the relay's origin;
  shortened idle timeout and dsh's own threshold patch in the scripted suite; live flash runs with the test vault;
  real standalone host from `dist/`; fresh-clone release build; three isolated desktop instances.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, this record,
  `api-e2e-test-progress.md`, `follow-ups.md` (FU-002).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none. Test-side issues found and fixed within the round (not product failures): the
  web voice test timeout (baseline fix), and four bugs in the new suites' own first drafts (first terminal event taken
  for the idle failure; pgrep pattern parsed as an option; team text batches; Antigravity command set after import).
- Recommended owner: code reviewer (test-code review).
- Remaining risks, blocked evidence, or untested scope: AC-006 wording (Solution Designer); no live-model compaction
  (TESTING.md: on user request only); signed x64 build (runner only); FU-002.
