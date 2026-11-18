# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, round 1 (CRR-001 pass) | SR-004, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: semantic memory proven on five real runtimes and every run start path

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-001 (Pass, no findings)
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-004, ARCH-REV-001, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E validation of the implementation.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` (GraphQL journeys + scripted-AGY start paths, no inference) and `autobyteus-server-ts/tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts` (gated real runtimes with wire recording); commit `595990347`.
- Cases added, changed, removed, or rechecked: API-01..API-20, API-05b, API-09, API-TC, API-FS; implementation checks IMP-02, IMP-04, IMP-08, IMP-09 reused (API-R1..API-R4).
- Commands, environment, fixture, or broader-validation delta: live data root outside `/tmp` (`/root/.autobyteus-e2e/…`, AF-03); throwaway `CODEX_HOME`; recorder wrappers via `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `GROK_BUILD_COMMAND`; AGY live with a throwaway HOME holding a copied token; native AutoByteus with the test vault's Anthropic key.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), test progress log
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review of the two added suites)
- Remaining risks, blocked evidence, or untested scope: DeepSeek harness not installed and no DeepSeek key (AC-002 alternate outcome, FU-007); Electron shell not run (not affected).
