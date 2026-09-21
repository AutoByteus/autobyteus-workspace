# API/E2E Test-Case Ledger — ORG-HISTORY-ROW-TOGGLE-20260920-001

## Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle`
- Investigation: `api-e2e-coverage-investigation.md`
- Execution report: `api-e2e-execution-coverage-report.md`
- Revision record: `api-e2e-revision-record.md`
- Reason: multiple independently meaningful repository/browser/cleanup cases.

## Planned Cases

| Case | Journey | Authority | Surface | Status |
| --- | --- | --- | --- | --- |
| R01 | Manifest and proportional repository regression | AC-001–004 | Vitest/diff | Pass |
| B01 | Stopped primary row mouse expand/open/collapse, selection/content/sibling/ARIA | AC-001/002/004 | Real browser | Pass |
| B02 | Native keyboard activation and ARIA | AC-001/002, QR-001 | Real browser | Pass |
| B03 | Chevron-only and active Stop isolation | AC-003 | Real browser | Pass |
| B04 | Team parity and read-only/persistence boundary | AC-004, QR-002 | Real browser/process/files | Pass |
| C01 | Cleanup and artifacts | All | Workflow | Pass |

## Execution Events

| 1 | R01 | 2026-09-20T18:20:00Z | Started | Candidate manifest plus focused AgentOrg and adjacent real-section suite | Exact hashes; focused behavior and preserved Team/section rendering pass | Initial run could not resolve `autobyteus-web/.nuxt/tsconfig.json`; no test executed | N/A | `validation/api-e2e/repository-tests.log` | Run documented `nuxi prepare`, then repeat |
| 2 | R01 | 2026-09-20T18:21:00Z | Completed | `pnpm -C autobyteus-web exec nuxi prepare`; then `pnpm -C autobyteus-web test:nuxt WorkspaceAgentOrgDisclosure.spec.ts WorkspaceHistoryWorkspaceSection.spec.ts --run` | Exact manifest and proportional tests pass | Candidate manifest 2/2 exact; Nuxt types generated; 2 files / 19 tests pass | Pass | `validation/api-e2e/{manifest-check.json,nuxt-prepare.log,repository-tests.log}` | Prepare isolated browser environment |
| 3 | B01 | 2026-09-20T18:27:00Z | Started | Normal Chrome at the real stopped Software Development Department row on owned Nuxt `51583` / backend `51581` | Primary activation opens/expands exact Org; second activation collapses without clearing selection; sibling and ARIA stay exact | Started from the saved member URL with target hierarchy initially expanded | N/A | CUA Chrome session; `validation/api-e2e/b01-stopped-expanded.png` | Normalize collapsed state via chevron, then exercise primary |
| 4 | B01 | 2026-09-20T18:30:00Z | Completed | Native pointer activation of exact primary row twice; semantic DOM/AX observations | Expanded state has exact `aria-controls`; collapsed state omits it; second activation retains exact selected Org; sibling stays collapsed | First primary activation expanded hierarchy and opened exact Org root; second collapsed it while URL stayed on that Org; `hello` sibling remained collapsed; rendered children ID exactly matched `aria-controls` | Pass | `validation/api-e2e/{browser-results.json,b01-stopped-expanded.png}` | Exercise keyboard activation |
| 5 | B02 | 2026-09-20T18:30:00Z | Started | Focused stopped Org primary button in normal Chrome | Space and Enter use native button activation semantics and update exact ARIA/state | Focus remained on the semantic button | N/A | CUA Chrome session | Press Space then Enter |
| 6 | B02 | 2026-09-20T18:31:00Z | Completed | Native Space through Chrome accessibility input; Playwright/CDP `Enter` on the focused semantic button | Space collapses; Enter expands; URL selection and exact conditional ARIA stay correct | Space produced collapsed/no-controls/no-children; Enter produced expanded/exact-controls/children; exact selected Org URL unchanged | Pass | `validation/api-e2e/browser-results.json` | Exercise chevron and active Stop isolation |
| 7 | B03 | 2026-09-20T18:31:00Z | Started | Existing stopped row chevron plus disposable Nested Classroom Test Org created through catalog Run/model/Run UI | Chevron changes disclosure only; active primary toggles; Stop terminates without opening/toggling/selecting its row | Stopped chevron left URL unchanged; disposable active root created through ordinary UI without Send | N/A | CUA Chrome session; backend log | Exercise active primary then select another Org and Stop collapsed active row |
| 8 | B03 | 2026-09-20T18:33:00Z | Completed | Active primary collapsed/expanded through browser; active row then collapsed by chevron; different stopped Org selected; visible Stop clicked | Active/stopped rows both toggle; chevron remains disclosure-only; Stop remains isolated | Active primary toggled both ways with exact ARIA; Stop changed only disposable row Running→Stopped, removed Stop, kept row collapsed, and preserved different stopped Org URL/selection | Pass | `validation/api-e2e/{browser-results.json,backend-boundary-check.txt}` | Exercise Team comparator and persistence boundary |
| 9 | B04 | 2026-09-20T18:33:00Z | Started | Real stopped Software Engineering Team history row plus before/after byte snapshots | Team behavior unchanged; original history trees/database unchanged; no provider/browser errors | Team group/history available in same sidebar | N/A | CUA Chrome; `targets-before.json` | Toggle Team row twice and compare snapshots/logs |
| 10 | B04 | 2026-09-20T18:34:00Z | Completed | Native Team-row activation; browser console; backend log; SHA-256 snapshot comparison | Team expands/selects then collapses while content remains; no provider call; existing data stays byte exact | Team row expanded and selected solution_designer, then collapsed with content retained; console empty; provider/error grep empty; database and both existing trees exact before/after | Pass | `validation/api-e2e/{browser-results.json,b04-team-comparator.png,persistence-comparison.json,targets-before.json,targets-after-browser.json,backend-boundary-check.txt}` | Clean up owned tabs/processes/generated outputs and finalize reports |
| 11 | C01 | 2026-09-20T18:35:00Z | Started | Close both owned browser tabs; stop owned Nuxt/backend; remove generated SDK `dist` prerequisites; verify ports/processes/status | All validation-owned runtime resources are closed; candidate/docs and persisted snapshot evidence retained | Cleanup started after all scenario evidence was persisted | N/A | `validation/api-e2e/process-cleanup-check.txt` | Verify resources and persist result artifacts |
| 12 | C01 | 2026-09-20T18:36:00Z | Completed | Browser tab listings, Ctrl-C owned sessions, `lsof`, process check, generated-output removal, owned-clone removal, `git status --short` | No owned tab/listener/process/profile or generated prerequisite remains; no user tab/server/profile is changed | Both validation tabs closed; ports 51581/51583 closed; no worktree process remains; owned profile and generated contract `dist` directories removed; candidate and ticket evidence are the only status entries | Pass | `validation/api-e2e/{process-cleanup-check.txt,final-resource-check.txt,final-status-pre-report.txt}` | Reconcile ledger into canonical report and create API-REV-001 |

## Re-entry And Reconciliation

- Last event: C01 completed Pass.
- Last completed case: C01 Pass.
- Cases still running, interrupted, or not started: None.
- Next case: Route the completed direct Pass using current handoff rules.
- Reconciled into report: Yes — `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation and Changed Boundary And Evidence Matrix.
- Note: B01–B04 terminal events were persisted as one contiguous post-session reconciliation rather than after each individual browser case; exact semantic/browser/log/file artifacts support each result and the execution report records the timing deviation.
