# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-002, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001: baseline validation of the beta.1 skill-exposure restore

- Trigger: CRR-001 Pass, implementation commit `810408bcee`. The implementation engineer merged the v1.5.6-beta.3 base (`c59da62e70`) during the round, and the release target is now v1.5.6-beta.4.
- Triggering cases: API-01..API-13
- Related revisions: SR-002, ARCH-REV-001, IR-001, CRR-001
- Why: first API/E2E result for this ticket.
- Coverage decisions and durable test paths:
  - added `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts`;
  - added the user-link case in `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts`;
  - baseline-fixed the stale gated Claude and Codex fixtures (commit `1f9aae5817`).
- Commands and environment:
  - live runs with `env -i` and the real HOME for CLI logins;
  - Codex under a throwaway `CODEX_HOME`;
  - isolated desktop instance built from the merged HEAD.

#### Prior Failure Resolution

None.

- Artifacts updated: coverage investigation, execution coverage report, test-case ledger.
- Prior result: N/A
- Current result: Pass, 95%
- Remaining failures: none in scope.
- Recommended owner: N/A
- Remaining risks:
  - F7: Grok does not list workspace `.grok/skills` itself. This is beta.1 behavior; a follow-up was sent.
  - F2 observed, by decision.
  - Stale out-of-scope gated suites (Claude browser-tool cases, older Codex live suites); follow-up.
