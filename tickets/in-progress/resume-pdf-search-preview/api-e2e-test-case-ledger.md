# API/E2E Test-Case Ledger — resume-pdf-search-preview
Worktree /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview.
Canonical investigation api-e2e-coverage-investigation.md; report api-e2e-execution-coverage-report.md; revision api-e2e-revision-record.md.
Round1, API-REV-001 planned; initialized before execution.
| Case | Journey / AC | Planned order / surface | State |
| --- | --- | --- | --- |
| API-001 | current diagnostic path-boundary E2E / AC-002,003 | 1 clean Vitest | Pass |
| API-002 | joined real HTTP search/PDF/text + denials / AC-001–003 | 2 durable HTTP E2E | Pass |
| API-004 | focused backend and file-explorer lifecycle regression / AC-002,003 | 3 Vitest | Pass |
| API-005 | client tree/lazy/content identity / AC-003 | 4 web unit | Pass |
| API-003 | actual Files search/click2PDF pages + tree/text / AC-001,003 | 5 owned browser/current stack | Pass |
## Execution Events
Baseline attempts and final reconciliation follow; initial failures retained.
## Reconciliation
Round1/API-REV-001 complete:all5casesPass; final run03/cleanup reconciled into canonical execution report. No active/interrupted/unstarted cases; AC-004 Delivery-owned/not tested, not a delivery Pass.

- API-001 Started: clean env current path-boundary E2E.

- API-001 Completed exit0; evidence/api-path-boundary.log.

- API-001 Pass:1file/2tests/no skips. Narrow E2E uses GraphQL executor (not HTTP). Discovery: AUTOBYTEUS_DATA_DIR is not an AppConfig option; this run defaulted only to owned worktree package root, not live data. Created ignored workspaces.json contains own two fixture roots. Re-run with actual AppConfigProvider.initialize in temporary Vitest setup to ensure throwaway data root before broad cases.

- API-001 rerun Started actual AppConfig own root.

- API-001 rerun Completed exit0; evidence/api-path-boundary-isolated.log.

- API-001 isolated rerun Pass1file/2tests/no skips. API-002 Started real socket HTTP E2E.

- API-002 Completed exit1; evidence/api-search-content-http.log.

- API-002 initial Fail (cleanup hook only,6/6 assertions Pass): missing process run-supervisor; API-owned harness corrected to close owned explorer/remove entire own fixture in finally. Rerun pending.

- API-002 rerun Started6HTTP assertions plus corrected owned cleanup.

- API-002 rerun Completed exit0; evidence/api-search-content-http-rerun.log.

- API-005 Started web relevant stores/components/composables.

- API-005 Completed exit1; evidence/api-web-focused.log.

- API-002 Pass6tests/no skips with corrected cleanup. API-004 Started focused backend and entire file-explorer E2E folder.

- API-004 Completed exit1; evidence/api-backend-regression.log.

- API-005 setup Fail (0 tests): missing .nuxt/tsconfig.json; implementation retained server builds but no Nuxt prepare. API-owned prerequisite ordering corrected with documented Nuxt prepare before rerun; no source defect attributed.

- API-004 initial Fail:20files passed, existing5 afterEach cleanup failures and new6 setup-skips; no skipped coverage counted as Pass. Corrected new mkdir prerequisite; baseline REST fixture cleanup correction planned. evidence/api-backend-regression.log.

- API-004 rerun Started22backend files after fixture corrections.

- API-005 rerun Started after Nuxt prepare Pass.

- API-005 rerun Completed exit0; evidence/api-web-focused-rerun.log.

- API-004 rerun Completed exit1; evidence/api-backend-regression-rerun.log.

- API-005 Pass9files/58tests/no skips after Nuxt prepare; requested nonexistent composable path selected no tests, not counted. API-004 rerun Fail1suite transform (API-owned cleanup edit extra delimiters),103tests passed; syntax corrected. Third run Started same22files.

- API-004 final Completed exit0; evidence/api-backend-regression-final.log.

- API-004 Pass22files/108tests/no skips; all previous setup/teardown/transform failures resolved, prior logs retained. API-005 Pass9files/58tests/no skips. Baseline cleanup commit amended after syntax correction and green execution; original failing edit not misrepresented as validated.

- API-003 stack startup Checkpoint prebuild/build/Nuxt prepare Pass; launching own full-runtime backend and Nuxt/browser. API-002 full-runtime repeat logged by probe.

- 2026-10-12T16:25:55.228Z API-002 Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run01/evidence.json.

- 2026-10-12T16:25:55.254Z API-002 Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run01/evidence.json.

- 2026-10-12T16:26:20.943Z API-003 Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run01/evidence.json.

- 2026-10-12T16:26:23.348Z API-003 Fail; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run01/evidence.json.

- API-003 probe exit1; evidence/api-browser-run01.log and api-browser-run01/evidence.json; inspect case outcomes and cleanup before claiming Pass.

- API-003 run01 Fail: strict browser errors from cold pre-case Vite optimizer, plus cleanup ENOTEMPTY. Real render/identity assertions reached completion but not a Pass. Warmup separation and process-group drain API-owned corrections; run02 will reuse case IDs without weakening case assertions. evidence/api-browser-run01/evidence.json.

- 2026-10-12T16:28:14.650Z API-002 Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run02/evidence.json.

- 2026-10-12T16:28:14.673Z API-002 Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run02/evidence.json.

- 2026-10-12T16:28:36.123Z API-003 Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run02/evidence.json.

- 2026-10-12T16:28:38.430Z API-003 Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run02/evidence.json.

- API-003 run02 probe exit0; evidence/api-browser-run02.log and api-browser-run02/evidence.json.

- API-003 run02 Pass with2ink-bearing896x1095 canvases (5665/5676dark pixels), loading complete,0actual/0warmup browser errors, real HTTP and lazy/tree/text identity. Both owned groups zero live members/ports closed/root+host removed. Screenshot1 inspected valid. Optional second-page screenshot landed on blank page-bottom: screenshot capture alignment improved to second canvas TOP; no assertion/production behavior change. Final fresh run03 started samecases.

- 2026-10-12T16:29:28.076Z API-002 Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run03/evidence.json.

- 2026-10-12T16:29:28.102Z API-002 Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run03/evidence.json.

- 2026-10-12T16:29:49.000Z API-003 Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run03/evidence.json.

- 2026-10-12T16:29:51.318Z API-003 Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-browser-run03/evidence.json.

- API-003 final probe exit0; evidence/api-browser-run03.log and api-browser-run03/evidence.json.

- API-002/API-003 final run03 Pass;0actual/0warmup browser errors;2real ink-bearing canvases/loading done/no alert; screenshots both page headers visually inspected. All5cases complete Pass. Own browser/groups/ports/host/root, temp Corepack/home/data/DB/config/initial ignored own registry removed; evidence/api-cleanup.json. No user runtime/data touched; original read-only hash unchanged. Ready authoritative report/revision.
