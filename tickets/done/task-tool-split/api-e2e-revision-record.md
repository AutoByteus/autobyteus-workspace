# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger | Related Upstream | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code review CRR-001 pass | SR-001..SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline validation of the task-tool split

- Trigger: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/code-review-report.md, round 1
- Finding IDs: none (OBS-001 docs anchors for delivery; OBS-002 weak logger assertion, not blocking)
- Related revisions: SR-001..SR-003, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E round
- Coverage decisions / durable paths changed: added COL-001 in `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts`; updated OLD-001 in `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts`; nothing removed
- Cases: see ledger; real Claude and Codex probe both 19 pass
- Commands / environment: server build, clean-env e2e with scripted AGY CLI, live probes with a temp data root; base worktree at 35eacddb25 used for comparison and removed
- Process correction: validation started from the code reviewer's list (including four UI probe suites unrelated to this change) before the investigation was written; the investigation re-classified them as out of scope, and the ledger was written retrospectively.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: investigation, execution report, ledger, this record
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94% (default 95% target not met; reasons in the report)
- Remaining failure IDs: none attributable to this change. Intermittent `task-copy-idle-lifetime` (branch 4/10, base 2/11 failures), pre-existing UI probe failures (`projects-feature` PT-E2E-005..011, `project-manager-ux` PMU-002/021), documented integration baseline exception
- Recommended owner: code_reviewer for test-code review; web owner for the UI items
- Remaining risks: idle-lifetime attribution not proven; real-AGY host-crash lifecycle blocked by quota; AC-007 not proven with a real agent launch; FU-1 must ship with this release
