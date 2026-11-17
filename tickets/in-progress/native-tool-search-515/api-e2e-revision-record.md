# API/E2E Revision Record — autobyteus-515

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001, round 1 | SR-001, SR-003, SR-004; ARCH-REV-002; IR-001; CRR-001 | N/A | Pass / 94.9 % |

## Revision Entries

### API-REV-001 — `Baseline: repository, whole-suite, live-provider and old-against-new validation`

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001, Pass 9.5/10), round 1
- Triggering finding or case IDs: the reviewer's still-to-run list: whole server `test:integration` and `test:e2e`; AC-004 on every reachable provider; AC-008/AC-009 old against new; K-2 (CCR-E2E-002, APC-E2E-004); FU-003 base comparison
- Related revision IDs: SR-001, SR-003, SR-004; ARCH-REV-002; IR-001; CRR-001
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts`; updated `live-tool-list-updates.e2e.test.ts` (opens the test vault) and `autobyteus-web/.../segmentHandler.spec.ts` (one case); `TESTING.md` rule "File watching on a busy Mac"; evaluation script's `download_media` stub fixed
- Cases added, changed, removed, or rechecked: API-R01…R05 reused; API-01…API-14 run (API-06b and API-14 added during execution)
- Commands, environment, fixture, or broader-validation delta: base build in a temporary worktree for every branch-vs-base comparison; live runs with the test vault

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-003 cause; FU-005…FU-008 added)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.9 % (environment category 92 %: providers without a vault key and a busy machine)
- New or remaining failure IDs: none in scope; whole-suite failures traced outside this change (FU-003, FU-006, FU-007, FU-008, TESTING rule)
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: AC-004 on Qwen, Mistral, MiniMax, LM Studio, Ollama (no vault key) and Kimi (billing refusal)
