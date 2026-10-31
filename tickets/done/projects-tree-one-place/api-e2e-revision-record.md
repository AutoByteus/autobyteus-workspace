# API/E2E Revision Record — projects-tree-one-place (autobyteus-353)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, IR-001 (direct route) | SR-002; IR-001 | N/A | `Pass` / 95.7% |

## Revision Entries

### API-REV-001 — Baseline: one place per run, proven on the server, in the browser and in the packaged app

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001); round 1.
- Triggering finding or case IDs: the handoff's Known Risks (the 347 suites assert removed behavior) and its Downstream Coverage Hints.
- Related revision IDs: SR-002, IR-001.
- Why recorded: the first API/E2E round of this ticket.
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts` updated: query; PRH-04/05/07/08/10 replaced; PRH-06 removed.
  - `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` updated: PLN-01/05/07 replaced; PLN-04, 08, 09 adjusted; delete added.
  - The removal of `WorkspaceAgentOrgScopedRows.spec.ts` by IR-001 was validated.
- Cases: API-R01…R04 reused (IMP-01…08); API-01 Pass (9/9); API-02 Pass (10/10); API-03 Pass (179/179 run); API-04 Pass.
- Commands, environment, fixture, or broader-validation delta: as 347's harnesses. The desktop driver was adapted (Q Task step) and now resolves `playwright-core` from its own worktree.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95.7%.
- New or remaining failure IDs: none.
- Recommended owner: delivery engineer.
- Remaining risks: 347 FU-008 (existing). Existing workspace-started managers leave the Projects tree, by the user's decision.
