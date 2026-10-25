# API/E2E Revision Record — agent-tool-results-omit-empty (autobyteus-260)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 pass), round 1 | SR-011, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 81% |

## Revision Entries

### API-REV-001 — Baseline: E2E updated to the new shapes; migration lifecycle and worker-Task store failures

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, round 1.
- Triggering finding or case IDs: handoff Known Risks (E2E files on old shapes); suggested coverage (worker scope, startup migration, first-message line, desktop titles, sizes).
- Related revision IDs: SR-011, ARCH-REV-001–003, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E round.
- Coverage decisions or durable test paths changed: 2 server E2E files added (`get-project-task-worker-scope`, `project-task-titles-startup`), 25 server E2E files and 7 web probes updated (execution report, Durable Coverage Changed).
- Cases added, changed, removed, or rechecked: API-00 … API-15 (investigation Planned Cases).
- Commands, environment, fixture, or broader-validation delta: clean env with the AGY gate; built `dist/` servers; emulated LM Studio for the native route; real Codex MCP client with a throwaway `CODEX_HOME`; base scratch build for classifying out-of-scope failures.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), test progress log, `follow-ups.md` (FU-002 … FU-006).
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 81%.
- New or remaining failure IDs: F-001 (API-03, startup migration blocked while keys-v1 is `FAILED`), F-002 (API-11c, web worker-Task store drops `title`, Error 500).
- Recommended owner: F-001 Solution Designer (`Design Impact`), F-002 implementation engineer (`Local Fix`), confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: API-11d (four probes) and API-12 (isolated desktop) not run until F-002 is fixed; the Codex routing case cannot run (FU-005).
