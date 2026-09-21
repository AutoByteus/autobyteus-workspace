# API/E2E Test-Case Ledger — ORG-HISTORY-ARCHIVE-DELETE-20260921-001

## Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions`
- Investigation: `api-e2e-coverage-investigation.md`
- Execution report: `api-e2e-execution-coverage-report.md`
- Revision record: `api-e2e-revision-record.md`
- Scope: repository, browser, persistence, lifecycle, localization, preservation and cleanup cases.
- Initialized: `2026-09-21T13:37:05Z`

## Planned Cases

| Case | Journey | Authority | Surface | Status |
| --- | --- | --- | --- | --- |
| R01 | candidate identity, focused regressions and builds | AC-001–005 | repository | Pass |
| B01 | stopped/active controls, isolation, keyboard, active rejection | AC-001/004/005 | Chrome/backend | Pass |
| B02 | selected English Archive success and retained package | AC-002/005 | Chrome/filesystem | Pass |
| B03 | Delete cancel and confirmed exact delete in en/zh-CN | AC-003/005 | Chrome/filesystem | Pass |
| B04 | failure retention; compensation/indeterminate policy | AC-002–005 | Chrome/repository | Pass |
| B05 | sibling/mixed-family/non-target/no-provider preservation | AC-002–005 | Chrome/files/logs | Pass |
| C01 | cleanup and artifact audit | all | workflow | Pass |

## Execution Events

| Seq | Case | Timestamp | Event | Entry Point | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R01 | 2026-09-21T13:40:00Z | Started | IR-002 manifest/diff; focused server/web Vitest; production builds | Exact candidate and proportional suites/builds pass | Repository execution started | N/A | `validation/api-e2e/*` | Complete R01 |

| 2 | R01 | 2026-09-21T13:42:30Z | Completed | IR-002 manifest/diff; 4 server suites; 4 web suites; server/web builds | Exact candidate and checks pass | 26/26 manifest exact; diff check pass; server 4 files/19 tests; web 4 files/123 tests; both production builds pass | Pass | `validation/api-e2e/{manifest-check.json,diff-check.log,server-focused-tests.log,web-focused-tests.log,server-build.log,web-build.log,environment-setup.log}` | Prepare isolated synthetic profile for B01 |

| 3 | B01 | 2026-09-21T13:54:18Z | Completed | Normal Chrome rows plus active mutation corroboration | Stopped roots expose isolated actions; active root remains Stop-only; keyboard works; authoritative boundary rejects stale active mutation | Three stopped roots had Archive/Delete; active root had Stop only; Enter/Space each opened one exact modal and cancel retained route/selection; active mutations returned non-success with byte-exact tree/index | Pass | `validation/api-e2e/{b01-browser-observation.json,b01-active-rejection.json,b01-active-before.json,b01-active-after.json,b01-server-correlation.log}` | Execute B02 |
| 4 | B02 | 2026-09-21T13:55:44Z | Completed | Selected stopped Org Archive in Chrome | Row/context/route clean only after authoritative success; package retained; tree/index share one archive fact; all other state unchanged | Row removed, route returned to `/workspace`, exact package retained, tree/index timestamps match, only canonical archive projections changed | Pass | `validation/api-e2e/{b02-browser-observation.json,b02-archive-persistence.json,b02-server-correlation.log}` | Execute B03 cancel/localization |
| 5 | B04 | 2026-09-21T14:02:07Z | Completed | Real Chrome Archive while exact target package directory was made read-only, then deliberate retry after restoring ownership mode | Determinate failure retains row/selection/context and bytes; exactly one later retry succeeds | Localized failure shown; row/route/actions retained; tree/index/messages/tasks byte-exact with null archive fact; after restoring mode, one retry archived with matching timestamps and retained package | Pass | `validation/api-e2e/{b04-before-failure.json,b04-failure-persistence.json,b04-server-correlation.log,b04-retry-success.json}` | Await user authorization, then complete B03 confirmation |
| 6 | B03 | 2026-09-21T14:07:45Z | Completed | Real English and zh-CN confirmation modal; Cancel then user-authorized Confirm | Cancel is exact no-op; localized accessible modal identifies AgentOrg history; confirmed delete removes only exact test package/index and exits selected route | English and zh-CN modal title/body/action exact; both safety cancels were no-ops; authorized zh-CN confirmation deleted `aorg_validation_org_f0c166744146487f8e7e61bae8558979`, removed only its package/index row, and returned to `/workspace` | Pass | `validation/api-e2e/{b03-localization-and-cancel.json,b03-cancel-before.json,b03-cancel-after.json,b03-delete-persistence.json,b03-b05-final-browser.json,b03-b05-server-correlation.log}` | Complete B05 |
| 7 | B05 | 2026-09-21T14:07:45Z | Completed | Mixed-family inventory/hash and process-log audit | Preserve active/sibling AgentOrg, Team/Agent histories, definitions, workspace/database and prevent provider inference | Active guard stayed Running/Stop-only; Team row and all non-target inventories/hashes exact; only two archive projections and exact deleted package changed; no unexpected files or inference/model request | Pass | `validation/api-e2e/{b05-preservation.json,b03-b05-final-browser.json,b03-b05-server-correlation.log,runtime-server.log,baseline-inventory.json}` | Stop remaining test root and clean resources |
| 8 | C01 | 2026-09-21T14:10:22Z | Completed | UI stop, tab/process shutdown, owned-profile/build cleanup, final manifest/diff audit | Remove only validation-owned resources and preserve candidate exactly | Active test root stopped through UI; owned tab closed; ports 51781/51783 closed; owned profile/install/build outputs removed; 26/26 manifest exact; diff check pass | Pass | `validation/api-e2e/{cleanup.json,final-manifest-check.json,final-diff-check.log}` | Finalize report/revision and handoff |

## Re-entry And Reconciliation

- Last event: C01 completed Pass.
- Last completed case: C01 Pass.
- Running/interrupted/not started: none.
- Final cases: R01, B01, B02, B03, B04, B05 and C01 all Pass.
- Reconciled into report: `Yes`.
- Finalization note: B01–C01 completion rows were reconstructed from timestamped canonical evidence during report finalization after a context interruption; their final results and artifacts are authoritative, but they were not all appended to this ledger immediately at execution time.
