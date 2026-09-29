# API/E2E Test-Case Ledger — task-team-row-collapse-chevron

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron`
- Coverage investigation: `tickets/in-progress/task-team-row-collapse-chevron/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/task-team-row-collapse-chevron/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/task-team-row-collapse-chevron/api-e2e-revision-record.md`
- Ledger scope and reason it is required: multiple independent Vitest scenarios plus a Nuxt dev-server browser probe with seven journeys
- Last updated: 2026-09-29

## Planned Cases

| Case ID | Case / Journey | Req / AC | Boundary / Surface | Planned Command Or Entry Point | Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-TTRC-000 | Baseline focused Org suites before edits | AC-005 | Vitest (jsdom) | `NUXT_TEST=true pnpm exec vitest run <8 focused files>` | 0 | — |
| API-TTRC-001 | Sibling delegations of the same Team collapse independently; collapsing the mounted Team does not hide delegated rows | REQ-003 / AC-003 | Projector | `utils/__tests__/agentOrgHistoryRows.spec.ts` | 1 | new |
| API-TTRC-002 | Collapsed state survives live tree changes (re-projection) | REQ-003, REQ-005 | Collection + real tree state | `WorkspaceAgentOrgDelegatedRows.spec.ts` | 2 | new |
| API-TTRC-003 | Real panel binding: toggle + real `inspect` subject action for the coordinator | REQ-006 / AC-004 | `WorkspaceAgentRunsTreePanel` | `WorkspaceAgentRunsTreePanel.spec.ts` | 3 | new |
| API-TTRC-004 | Broader web regression | AC-005 | Vitest | `vitest run components/workspace/history composables utils services/agentOrgExecution stores` | 4 | — |
| API-TTRC-B01 | Default: delegated Team chevron down, aligned with the mounted Team chevron, members visible, `aria-expanded=true` | AC-001, REQ-001/005 | Browser | `test:e2e:agent-org-task-team-disclosure` | 5 | — |
| API-TTRC-B02 | Mouse click collapses (rotation, descendants hidden, connectors) and inspects the coordinator; second click restores | AC-002, AC-004 | Browser | same | 6 | — |
| API-TTRC-B03 | Keyboard Enter/Space on the focused row toggles and inspects | REQ-004 | Browser | same | 7 | — |
| API-TTRC-B04 | Nested delegated Team collapses independently of its outer Team | REQ-003 | Browser | same | 8 | — |
| API-TTRC-B05 | Mounted Team with the same name and a second delegation of the same Team are independent | AC-003 | Browser | same | 9 | — |
| API-TTRC-B06 | Live tree update while collapsed keeps the row collapsed | REQ-003/005 | Browser | same | 10 | — |
| API-TTRC-B07 | Mounted Team, Agent and delegated Agent rows unchanged; no browser errors | AC-005 | Browser | same | 11 | — |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Entry Point | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-TTRC-000 | 2026-09-29T16:53 | Completed | `NUXT_TEST=true pnpm exec vitest run` on 8 focused files | all pass | 8 files, 143/143 pass | Pass | console | durable additions |
| 2 | API-TTRC-001 | 2026-09-29T16:56 | Completed | `vitest run utils/__tests__/agentOrgHistoryRows.spec.ts` | 2nd delegation of `/team` stays open while 1st collapses; mounted `/team` unaffected and vice versa | 4/4 pass | Pass | console | — |
| 3 | API-TTRC-002 | 2026-09-29T16:56 | Completed | `vitest run …/WorkspaceAgentOrgDelegatedRows.spec.ts` | Collapsed row stays collapsed after a live tree update adds a member; expanding shows the new member | 8/8 pass | Pass | console | — |
| 4 | API-TTRC-003 | 2026-09-29T16:57 | Completed | `vitest run …/WorkspaceAgentRunsTreePanel.spec.ts` | Real panel binding toggles; real subject action: `openForInspection`, `select(agent_execution agent-task-lead)`, router `agentRunId`/`memberAddress` | 66/66 pass. Mutation check: removing the `toggleAgentOrgTaskTeam` binding fails the test (`expected 'true' to be 'false'`); file restored | Pass | console | — |
| 5 | API-TTRC-004 | 2026-09-29T16:59 | Completed | `vitest run components/workspace/history composables utils services/agentOrgExecution stores` | no new failures | 1304 pass / 2 fail tests; 3 failed files, all identical on base `cd4ad898b` (applicationAssetUrl + applicationHostStore: unbuilt `@autobyteus/application-sdk-contracts`; regressions spec: stub lacks `beginSelectionIntent`) | Pass (no regression) | `api-e2e-evidence/vitest-broad-regression.log` | browser probe |
| 6 | B01..B07 | 2026-09-29T17:05 | Checkpoint | probe run 1 | all pass | B01..B05 Pass; B07 Fail: `Unexpected chevron count`. Diagnosis: the probe's own fixture root `data-test="agent-org-task-team-disclosure-probe"` matched the chevron prefix selector (4 = root + 3 real chevrons). Probe defect, not product | — | evidence.json (overwritten by the rerun) | rename the fixture root to `ttrc-disclosure-probe-root`; rerun |
| 7 | API-TTRC-B01 | 2026-09-29T17:07 | Completed | `pnpm test:e2e:agent-org-task-team-disclosure --output-dir …/api-e2e-evidence/browser-probe` | row order; 3 chevrons down; aligned with mounted chevron | Order exact; chevrons are svg 14×14 at x=70, same as the mounted Team chevron; nested at x=84 | Pass | `browser-probe/b01-default-open.png`, evidence.json | — |
| 8 | API-TTRC-B02 | 2026-09-29T17:07 | Completed | same run | collapse/rotate −90°/descendants removed/connectors; inspect `ssg1-s1` once per click | as expected; collapsed row is followed by `ssg-task-2`; `data-has-following-sibling=true`; 2 inspect calls, 0 select calls | Pass | `b02-collapsed.png` | — |
| 9 | API-TTRC-B03 | 2026-09-29T17:07 | Completed | same run | trusted Enter collapses, Space expands, both inspect; the row is in the Tab order | as expected; Shift+Tab lands on the previous row | Pass | `b03-keyboard-collapsed.png` | — |
| 10 | API-TTRC-B04 | 2026-09-29T17:07 | Completed | same run | nested collapses alone; state survives outer collapse/expand | as expected; nested inspects `reviewers-nested-chair` | Pass | `b04-nested-collapsed.png` | — |
| 11 | API-TTRC-B05 | 2026-09-29T17:07 | Completed | same run | mounted `StudentStudyGroup` and `ssg-task-2` unaffected by `ssg-task-1`; mounted collapse does not change the delegated state | as expected; mounted click: select `/StudentStudyGroup`, no extra inspect | Pass | `b05-independent-state.png` | — |
| 12 | API-TTRC-B07 | 2026-09-29T17:07 | Completed | same run | Agent/delegated Agent/member rows have no `aria-expanded`; exactly 3 chevrons; mounted Reviewers select and delegated Agent inspect semantics unchanged | as expected | Pass | evidence.json | — |
| 13 | API-TTRC-B06 | 2026-09-29T17:07 | Completed | same run | after the live update (run active + new member), the row stays collapsed; expanding reveals the new member | as expected | Pass | `b06-live-collapsed.png` | — |
| 14 | B01..B07 | 2026-09-29T17:09 | Completed | determinism rerun `--output-dir /tmp/ttrc-probe-rerun` (deleted afterwards) | Pass | Pass; the fixture page was removed and no Nuxt process was left | Pass | console | — |
| 15 | API-TTRC-000 (post) | 2026-09-29T17:09 | Completed | focused 8-file Vitest set after all edits | all pass | 8 files, 146/146 (143 + 3 new) | Pass | console | reports |

## Re-entry And Reconciliation

- Last durably recorded event: 15
- Last completed case and result: all cases Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption note: none. Run-1 B07 failure was a probe selector defect, fixed before the authoritative run.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` › Test-Case Ledger Reconciliation
