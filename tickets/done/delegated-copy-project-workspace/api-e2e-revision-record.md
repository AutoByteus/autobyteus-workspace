# API/E2E Revision Record — delegated-copy-project-workspace (autobyteus-97)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 pass | SR-002; ARCH-REV-001; IR-001; CRR-001 | N/A | `Pass` / 95.9% |

## Revision Entries

### API-REV-001 — Baseline: folder rule on every root, real runtimes' working directory, real restart, packaged app

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: the review's Residual Risks 1–5; the handoff's "Not run".
- Related revision IDs: SR-002, ARCH-REV-001, IR-001, CRR-001.
- Why recorded: the first API/E2E round.
- Coverage decisions or durable test paths changed:
  - added `tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` (DCF-01…08, scripted);
  - added `tests/e2e/projects/delegated-copy-project-folder-live.e2e.test.ts` (DCF-L1 Codex, DCF-L2 Claude);
  - updated `tests/e2e/projects/project-change-feed.e2e.test.ts` (a delegation into a Project whose link is missing is now refused, REQ-005).
- Cases: API-R01/R02 reused; API-01 8/8; API-02 2/2; API-03 Pass (after the feed update and `test:integration:prepare`); API-04 Pass.
- Commands, environment, fixture, or broader-validation delta:
  - live runs with signed-in CLIs (throwaway `CODEX_HOME`; the real `HOME` for Claude);
  - an isolated packaged instance with scripted AGY.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, test progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95.9%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (test-code review).
- Remaining risks:
  - C-07 (a folder-scoped Codex catalog on a configured placement);
  - FU-001 (existing);
  - the new Workspaces row (accepted by design).
