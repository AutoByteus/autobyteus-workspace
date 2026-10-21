# API/E2E Test Progress — autobyteus-247 (Remote Agent Teams)

Evidence: `evidence/api-e2e/` (beside this file).

| When | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | API-00 build of `autobyteus-server-ts` (code `9ec78440e2`) | exit 0 | `API-00-server-build.log` |
| 2 | Investigation written (round 1) | — | `api-e2e-coverage-investigation.md` |
| 3 | E2E bodies updated for the clean-cut contract (`targetRoot`, no `coordinatingRun` in messages); RC-04 `/review_squad` replaced with `/hollow_team` and `/codex_team`; beta's Teams and `alt-model` set up | — | test file |
| 4 | Exploratory run, RC-01 … RC-06 + RC-21 | all pass except the soft check of `node` in the remote Team `delegate_task` result → **F-001** | `/tmp/api247-explore.log` (exploratory, superseded by run 1) |
| 5 | RC-21 tightened (member launch configurations, Task record, history); RC-22, RC-23, RC-24 added; RC-12/RC-13 extended for the Team | — | test file |
| 6 | Full E2E run 1 | 22/24. RC-21: F-001. RC-23: test defect (it used the ad-hoc Task ID for the saved-Task refusal; a saved Project Task is needed) | `API-run1.log`, `API-run1/` |
| 7 | RC-23 fixed: a saved Project Task, refused to the running copy and to a new remote Team; nothing starts | — | test file |
| 8 | Full E2E run 2 | 23/24; F-001 only | `API-run2.log`, `API-run2/` |
| 9 | API-25 same-node suites, switch on | first attempt stopped at my 10-minute tool limit; rerun: 44/45 files, the only failure `delegated-launch-config-defaults` :521/:639 (191 FU-003) | `API-25-same-node-e2e-switch-on.log` |
| 10 | Full E2E run 3 | 23/24; F-001 only (identical) | `API-run3.log`, `API-run3/` |
| 11 | API-26 browser journey on beta (temporary two nodes + Nuxt dev) | Pass; setup result also has no `node` (F-001); all cleaned up | `API-26-*` |
| 12 | F-001 cause confirmed in code; report, revision record written | Fail → code reviewer | `F-001-remote-team-result-without-node.log`, `api-e2e-execution-coverage-report.md` |
| 13 | Round 2: CRR-003 pass of the F-001 fix `351b4dd93f`. RC-21's `node` check made hard, with the exact result keys | — | test file |
| 14 | API-00 round 2 build | exit 0 | `API-00-server-build-round2.log` |
| 15 | API-R2 unit tests of the fix | 13/13 | `API-R2-unit-f001.log` |
| 16 | Full E2E runs 4 and 5 | 24/24 each; `node: "beta-node"` in the remote Team result | `API-run4*`, `API-run5*` |
| 17 | Report and revision record (API-REV-002): Pass → code reviewer for the test-code review | — | `api-e2e-execution-coverage-report.md` |
| 18 | Round 3 (DR-001: the scorecard was missing). An honest score is about 94%, below the 95% target, so I am closing the gaps instead of only recording them. Test changes: RC-25 (RSK-301: work packet dropped, unused Team run); RC-12 (a busy member holds the Team; the unused run stops); RC-13 (cold wake by the Team link after a second alpha restart); RC-23 (fence log line; alpha at INFO) | — | test file |
| 19 | Full E2E run 6 (exploratory, with the new cases) | 24/25. The fence matcher read single lines; `console.info` prints over several lines. Fixed. The new RC-25, busy member and cold wake passed | `API-run6.log`, `API-run6/` |
| 20 | RC-25 asserts alpha's result and Task record (observed in run 6); header updated | — | test file |
| 21 | Full E2E runs 7 and 8 (final file) | 25/25 each (250.7 s, 251.3 s); nothing left | `API-run7*`, `API-run8*` |
| 22 | Scorecard (post-repository 93%, final 95%), report § Round 3, revision record API-REV-003 | Pass → code reviewer (test-code delta) | `api-e2e-execution-coverage-report.md` |
