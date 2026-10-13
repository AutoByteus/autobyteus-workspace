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

## Round2 Planned Cases — actual Electron/Linux qualification
| Case | Planned proof | State |
| --- | --- | --- |
| API-006 | Own Linux prerequisites/native current packaged build/sandboxed isolated launch and lifecycle | Pass |
| API-002 | Real isolated backend search→protected PDF/text and4denials | Pass |
| API-003 | Normal actual Electron Files UI→search lazy PDF→pages/text/tree identity | Pass |
| API-007 | Reusable Linux/container commands, environment/documentation and full own cleanup | Pass |
- Round2 investigation persisted before setup/execution/coverage edits; previous round1 events remain history.

- API-006 Started Linux prerequisites/build qualification; no desktop pass yet.

- API-006 Checkpoint:51isolated lifecycle/launch-environment Node tests Pass/no skips; Ubuntu dependencies installed; root AND own non-root user namespaces succeed, no sandbox policy change.

- API-006 Checkpoint own non-root Xvfb display ready, existing X99 untouched; packaged native build Started (serial).

- API-006 packaged build Completed exit0; evidence/api-electron-build.log; launch/journey still pending.

- API-006 Checkpoint canonical native ARM64 Electron42.4.1 build and AppImage completed exit0; launching source-current unpacked package via isolated-app as own UID61193 under owned Xvfb:100. No --no-sandbox/global security changes. Real desktop probe begins.

- 2026-10-13T03:29:13.794Z API-006: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:26.175Z API-006: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:26.177Z API-002: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:26.235Z API-002: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:26.237Z API-003: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:28.566Z API-003: Checkpoint actual packaged2page PDF rendered through protected200 bytes; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:29.523Z API-003: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:29.528Z API-007: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- 2026-10-13T03:29:36.019Z API-007: Fail; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run01/evidence.json.

- Round2 actual Electron probe attempt01 exit1; evidence/api-electron-run01/evidence.json and log; inspect exact case/cleanup results before completion.

- API-006/API-002/API-003 first actual Electron Pass, API-007 Fail404 from new probe ordering before lazy activation (metadata listing does not activate). Normal source/client owner trace validates API-owned test setup correction; real UI recovery will precede byte assertions. Initial failed receipt retained; all owned app roots/ports/fixtures cleaned. Second run Started sameIDs.

- Round2 actual Electron attempt02 exit1; inspect evidence/api-electron-run02/evidence.json and cleanup.

- Attempt02 did not start any desktop case: API-owned new-probe regex escaping syntax error; output retained in api-electron-run02.log, no instance created. Corrected and node --check is now a fail-fast prerequisite. Actual attempt03 pending.

- 2026-10-13T03:32:12.110Z API-006: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:23.630Z API-006: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:23.633Z API-002: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:23.691Z API-002: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:23.694Z API-003: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:27.313Z API-003: Checkpoint actual packaged2page PDF rendered through protected200 bytes; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:28.272Z API-003: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:28.275Z API-007: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- 2026-10-13T03:32:40.048Z API-007: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run03/evidence.json.

- Round2 actual Electron attempt03 exit0; inspect evidence/api-electron-run03/evidence.json and cleanup.

- Actual Electron attempt03 all4cases Pass: launch/native/HTTP, fullnormalFilesPDF2pages/text/tree, restart/newCDPtarget/persistedregistration/reopenFiles rendersagain;0renderer errors. Canonicalstop/list root/ports/fixtures cleanup Pass. First and second page screenshots inspected. Final Linux recipe qualification will repeat under xvfb-run -a (owned full-suite display lifetime), fresh output04.

- 2026-10-13T03:35:06.143Z API-006: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:21.557Z API-006: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:21.560Z API-002: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:21.617Z API-002: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:21.620Z API-003: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:24.525Z API-003: Checkpoint actual packaged2page PDF rendered through protected200 bytes; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:25.527Z API-003: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:25.531Z API-007: Started; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- 2026-10-13T03:35:39.027Z API-007: Pass; /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/api-electron-run04/evidence.json.

- Linux xvfb-run full-suite recipe attempt04 exit0; inspect exact case/cleanup results and generated display lifetime.

- API-006/API-002/API-003/API-007 final actual Electron04 allPass under automatic owned xvfb-run display;0renderer errors, normal PDF2pages/text/tree/denials and restart recovery proven. Generic Linux guidance qualified; temp/display final cleanup pending manualdisplay and builder/runtime homes.

- Round2 final cleanup Pass: all4desktop casesPass; canonicalstop/list/appgroup/ports/root/fixtures gone; own manualX100 and automaticX101 gone; UID61193 no live processes; all builder/runtime caches/temp homes removed. Existing VNCX99/PID35 and serverPID61 untouched; original read-only SHA unchanged. Evidence/api-electron-cleanup.json. Reusable prerequisites/package/evidence retained unstaged outputs only.

## Latest Reconciliation — API-REV-002
All4round2casesPass and finalcleanupPass; completed events recorded before further work; no interrupted/active/unstarted cases. Canonical report currentround2 reconciles attempted404/testsyntax failures, actual03/04success and retained prior evidence. No AC-004/deployment/user verification inferred.

## API-REV-003 — User-Requested Tooling Scope Correction

- 2026-10-13T04:26:38.305308+00:00 API-008 Planned: remove named shared Electron PDF script/probe; check active references and generic recipe syntax; focused launcher regression checks only. Prior API-002/003/006/007 execution records preserved, not rerun claims.

- 2026-10-13T04:28:48.781764+00:00 API-008 Pass: script/probe removed; no active non-ticket references;7recipe Bash syntax checks;51Node checksPass/0fail/0skip; privateHOME/TMPDIR removed. No Electron/PDF rerun; prior evidence retained.
