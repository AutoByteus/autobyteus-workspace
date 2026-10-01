# API/E2E Test-Case Ledger
Round 1, API-REV-001 pending. Initialized before execution; report is authoritative round result.
| Case | Requirement / criterion | Expected | Status / observed | Evidence |
| --- | --- | --- | --- | --- |
| REPO-001 | REQ-001–004 / AC-001–005 | Five directly affected suites pass | Pass — 35/35 | evidence/api-e2e/repo-narrow.log |
| REPO-002 | REQ-002/003/004 / AC-002/004/005 | Selection/tree/inspection/hydration regression suites pass | Pass — 28/28 | evidence/api-e2e/repo-integration.log |
| PEER-001 | AC-001/002/003/005 | Browser peers, distinct exact conversations, loading/error/retry | Pass — final clean repeat | evidence/api-e2e/browser/evidence.json |
| PEER-002 | AC-001/004 | Actual task-Team containment, projected ancestry, outer collapse/reopen | Pass — final clean repeat | evidence/api-e2e/browser/evidence.json |
| PEER-003 | AC-003/004 | Retained reload inspection, no-task list | Pass — final clean repeat | evidence/api-e2e/browser/evidence.json |

## Checkpoint REPO-001
Pass — independently reran exact five-file command recorded in implementation handoff. 5 files / 35 tests passed, 7.08s. Intentional retained-send negative-test console errors and existing KaTeX/Browserslist warnings only. Evidence: evidence/api-e2e/repo-narrow.log. Recorded before REPO-002.

## Checkpoint REPO-002
Pass — six surrounding selection/tree/inspection/hydration suites: 6 files / 28 tests passed, 5.88s. Exact command in coverage investigation; evidence/api-e2e/repo-integration.log. Recorded before browser execution.

## Harness development checkpoint
Initial browser fixture import used nonexistent testTeamNode; corrected API/E2E-owned fixture to existing testSubTeamNode before completing validation. No production change or implementation failure inferred. Browser run captures diagnostic evidence and will be repeated from clean startup.

## Browser checkpoint PEER-001
Fail — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('treeitem', { name: /Review launch notes/ }) to be visible[22m
. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json.

## Harness correction after PEER-001 attempt 2
Fixture lacked registered workspace catalog entry, so history section was absent while monitor rendered. Added isolated in-memory workspace via existing workspace store before projection. This is fixture setup, not product defect; no acceptance conclusion from failed setup. Preserved diagnostics in evidence/api-e2e/harness-attempt-2; rerun same case IDs.

## Browser checkpoint PEER-001
Pass — Initially visible peers; mouse/keyboard exact conversations; delayed loading, failure and retry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-001).

## Browser checkpoint PEER-002
Fail — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('treeitem', { name: /Nested task Agent proof/ }) to be visible[22m
. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json.

## Harness correction after PEER-002 attempt 3
PEER-001 passed with real renderer/selection/hydration. Probe-only revealNested control supplied catalog workspace ID instead of the stable presentation key consumed by row expansion. Corrected control to stableKey; projection ancestry was already exactly the two Team containers, no Agent ancestor. This check exercises the real tree composable with its presentation identity, not a claim about unrelated external navigation entrypoints. Evidence preserved in harness-attempt-3. Same cases rerun.

## Browser checkpoint PEER-001
Pass — Initially visible peers; mouse/keyboard exact conversations; delayed loading, failure and retry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-001).

## Browser checkpoint PEER-002
Pass — Task-Team containment and actual ancestor auto-reveal; outer collapse preserves peers. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-002).

## Browser checkpoint PEER-003
Pass — Retained settled task reload uses exact conversation; no-task list unchanged. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-003).

## Browser completed first clean pass
PEER-001/002/003 all Pass; cleanup confirmed. Added explicit live/retained combined lifecycle/runtime status assertions to durable probe after screenshot inspection; repeat clean execution for final evidence. Initial successful evidence retained at evidence/api-e2e/browser-pass-initial. No production changes.

## Browser checkpoint PEER-001
Pass — Initially visible peers; mouse/keyboard exact conversations; delayed loading, failure and retry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-001).

## Browser checkpoint PEER-002
Pass — Task-Team containment and actual ancestor auto-reveal; outer collapse preserves peers. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-002).

## Browser checkpoint PEER-003
Pass — Retained settled task reload uses exact conversation; no-task list unchanged. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser/evidence.json (PEER-003).

## Final reconciliation — API-REV-001
REPO-001 Pass (35 tests), REPO-002 Pass (28 tests), PEER-001/002/003 Pass in final clean repeat. All completed before report finalization; no unstarted/interrupted/blocked case. Final browser JSON result Pass, no failures; browser/context closed, owned Nuxt terminated, temporary route removed. Earlier setup failures resolved as documented, no remaining production finding. Authoritative round result in api-e2e-execution-coverage-report.md: Pass, 95%.
