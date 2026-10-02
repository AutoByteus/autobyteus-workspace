# API/E2E test-case ledger — API-REV-003

New narrow ticket SR-006 / IR-003; preserve parent case IDs without carrying their results forward. All cases Not Tested at initialization. Commands/output under api-e2e-evidence/api-rev-003; prior ledger snapshot inherited only.

| Case | Plan |
| --- | --- |
| TC-001/002 | Fresh server build, AGY unit folder/native regression |
| TC-003 | Explicit fake MCP WS/history/Files transport |
| TC-012 | Full server E2E regression and bounded base comparison |
| TC-004 | Base converter writer → current reader same stored run |
| TC-005/008 | Live AGY Team/Org naming and native image guard |
| TC-006 | Real provider shape evidence applicability |
| TC-007 | Current rendered Activity/reload/reopen |
| TC-013 | Current isolated packaged desktop full-product journey |

## Execution events
| Case | Event/result | Evidence / next action |
| --- | --- | --- |
| TC-001/002 | Build exit 0 | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-001/002 | Started agy-units | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-001/002 | agy-units: exit 0; {'numPassedTests': 168, 'numFailedTests': 0, 'numPendingTests': 5}. Skips are Not Tested. | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-002/003 | Started fake-agy | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-002/003 | fake-agy: exit 0; {'numPassedTests': 9, 'numFailedTests': 0, 'numPendingTests': 0}. Skips are Not Tested. | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-012 | Started full-e2e | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-012 | full-e2e: exit 1; {'numPassedTests': 195, 'numFailedTests': 43, 'numPendingTests': 133}. Skips are Not Tested. | api-e2e-evidence/api-rev-003; exact commands.json |
| TC-012 | Baseline-equivalent failure comparison completed; converter source/dist restored exactly. No repair. | api-e2e-evidence/api-rev-003/baseline-provenance.json |
| TC-004 | Started old-writer | API-REV-003 |
| TC-004 | old-writer: exit 0; inspect evidence for assertion totals | api-e2e-evidence/api-rev-003/old-writer.log |
| TC-007 | Started renderer | API-REV-003 |
| TC-007 | renderer: exit 0; inspect evidence for assertion totals | api-e2e-evidence/api-rev-003/renderer.log |
| TC-005/008 | Started live-agy | API-REV-003 |
| TC-006 | Pass: fresh AGY 1.2.14 SUCCESS; actual MCP server received echo_args nested object, json_result empty args and always_fails. All three provider wrapper shapes captured. | api-rev-003/agy-mcp-call-shape-probe/summary.json |
| TC-012 | Baseline-equivalent selected rerun: 24 pass / 41 fail; all 41 failure identities also in candidate. Two token analytics failures did not reproduce in selected cohort; current focused rerun pending, not yet attributed. | baseline-comparison.json |
| TC-005/008 | live-agy: exit 0; inspect evidence for assertion totals | api-e2e-evidence/api-rev-003/live-agy.log |
| TC-013 | Started desktop-build | API-REV-003 |
| TC-013 | desktop-build: exit 0; inspect evidence for assertion totals | api-e2e-evidence/api-rev-003/desktop-build.log |
| TC-013 | Desktop attempt1 Fail: temporary blind section-toggle automation hid fallback arguments on reload; own instance cleaned. | api-rev-003/desktop-attempt1/desktop-result.json |
| TC-013 | Rerun started from same packaged build with conditional section-opening probe; exact expected data unchanged. | desktop-probe.mjs |
| TC-012 | Current focused token analytics rerun Pass 5/5; full production-equivalent baseline run started to preserve full-suite context. | token-candidate.json; baseline-full-e2e.log |
| TC-013 | Desktop attempt2 Fail: probe assumed Activity already visible; responsive tools drawer was closed. Own instance cleaned. | api-rev-003/desktop-attempt2/desktop-result.json |
| TC-012 | Baseline-equivalent failure comparison completed; converter source/dist restored exactly. No repair. | api-e2e-evidence/api-rev-003/baseline-provenance.json |
| TC-013 | Attempt3: explicitly select Activity when hidden, 1440x1000 viewport, conditional sections; all exact data assertions retained. | desktop-probe.mjs |
| TC-013 | Packaged scripted MCP journey and reload Pass; seven names/arguments/results/failure/fallback verified. Real CLI and process-reopen next. | api-rev-003/desktop/desktop-result.json |
| TC-013 | Desktop attempt3: live/reload Pass; process-reopen probe navigated before initial app bootstrap completed and landed on new-chat screen. Own instance cleaned. | api-rev-003/desktop-attempt3/desktop-result.json |
| TC-012 | Baseline-equivalent failure comparison completed; converter source/dist restored exactly. No repair. | api-e2e-evidence/api-rev-003/baseline-provenance.json |
| TC-013 | Attempt4 waits for ready new-chat surface before selecting saved run route; keeps all assertions. | desktop-probe.mjs |
| TC-012 | Baseline-equivalent failure comparison completed; converter source/dist restored exactly. No repair. | api-e2e-evidence/api-rev-003/baseline-provenance.json |
| TC-013 | Packaged scripted MCP journey and reload Pass; seven names/arguments/results/failure/fallback verified. Real CLI and process-reopen next. | api-rev-003/desktop/desktop-result.json |
| TC-013 | Real packaged AGY native run_command journey Pass; command output marker displayed. | api-rev-003/desktop/desktop-result.json |
| TC-013 | Desktop final Pass; cleanup receipt recorded. | api-rev-003/desktop/desktop-result.json |
| TC-012 | Baseline-equivalent failure comparison completed; converter source/dist restored exactly. No repair. | api-e2e-evidence/api-rev-003/baseline-provenance.json |
| TC-012 | Final raw result Fail:43 inherited non-AGY assertions. Baseline full reproduces41; ordered current/base token cohort reproduces remaining2 identically. All43 separated; no repair/waiver. | api-rev-003/final-failure-provenance.json; failure-provenance.md |
| TC-013 | Final Pass: packaged fake MCP, reload/process-reopen; real native AGY command and process-reopen. All four owned instances stopped/data removed. Earlier scaffold attempts retained, not hidden. | desktop/desktop-result.json; final-isolated-list.json |
| ALL | Final narrow API-REV-003 Pass /95.7%; no running cases, no durable diff, no release. | api-e2e-execution-coverage-report.md |
