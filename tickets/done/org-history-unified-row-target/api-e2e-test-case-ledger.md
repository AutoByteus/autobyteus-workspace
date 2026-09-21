# API/E2E Test-Case Ledger — ORG-HISTORY-UNIFIED-ROW-20260921-001

## Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target`
- Investigation: `api-e2e-coverage-investigation.md`
- Execution report: `api-e2e-execution-coverage-report.md`
- Revision record: `api-e2e-revision-record.md`
- Reason: multiple independently meaningful repository/browser/lifecycle/preservation/cleanup cases.
- Initialized: `2026-09-21T07:16:38Z`

## Planned Cases

| Case | Journey | Authority | Surface | Status |
| --- | --- | --- | --- | --- |
| R01 | Manifest and proportional repository regression/build | AC-001–005 | Vitest/build/diff | Pass |
| B01 | One primary row; no independent chevron; summary and chevron pointer exact-once | AC-001/002 | Real browser | Pass |
| B02 | Native Space/Enter and exact ARIA | AC-003 | Real browser | Pass |
| B03 | Active Stop isolation and retained selection/content/siblings | AC-004/005 | Real browser/lifecycle | Pass |
| B04 | Team comparator, persistence and no-inference boundary | AC-005 | Real browser/process/files | Pass |
| C01 | Cleanup and evidence audit | All | Workflow | Pass |

## Execution Events

| Sequence | Case | Timestamp | Event | Command / Entry Point | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R01 | 2026-09-21T07:17:00Z | Started | Candidate SHA-256 verification; `nuxi prepare`; focused Vitest; backend build | Exact candidate; all proportional tests/build pass | Execution started from assigned worktree | N/A | `validation/api-e2e/{manifest-check.json,nuxt-prepare.log,repository-tests.log,server-build.log}` | Complete checks |
| 2 | R01 | 2026-09-21T07:19:01Z | Completed | Same | Exact manifest and repository boundaries pass | 3/3 hashes exact; Nuxt types generated; 3 files / 28 tests pass; server production build and sanitized bootstrap pass | Pass | `validation/api-e2e/{manifest-check.json,nuxt-prepare.log,repository-tests.log,server-build.log}` | Prepare isolated browser environment for B01 |
| 3 | B01 | 2026-09-21T07:28:00Z | Started | Normal Chrome on owned Nuxt/backend and stopped Software Development Department Org | One primary button; no chevron button; summary and icon each toggle/open exact run once | Direct saved-history navigation rendered the real selected stopped Org and hierarchy | N/A | Chrome session; `validation/api-e2e/browser-results.json` (pending) | Exercise summary and icon targets, inspect exact DOM/URL/content |
| 4 | B01 | 2026-09-21T07:30:32Z | Completed | Pointer click on summary child, then pointer click on presentational SVG chevron child | Each target produces exactly one observable toggle/open transition through one primary control | Exactly one primary button and one SVG chevron; zero chevron buttons; summary changed expanded→collapsed and icon changed collapsed→expanded; exact URL, stopped content and sibling hierarchy were retained; expanded `aria-controls` resolved to the rendered hierarchy | Pass | `validation/api-e2e/{browser-results.json,b01-unified-expanded.png}` | Begin B02 native keyboard/ARIA |
| 5 | B02 | 2026-09-21T07:31:00Z | Started | Focus exact primary Org button in normal Chrome; press Space then Enter | Native button activation alternates exact hierarchy and updates primary-only ARIA | Starting state expanded with exact controls | N/A | Chrome session | Execute native keyboard actions and inspect focus/ARIA/URL/content |
| 6 | B02 | 2026-09-21T07:31:45Z | Completed | Native `Space` then `Enter` on the focused primary button | Space collapses, Enter expands; focus stays on the one button; ARIA follows state | Space produced false/no-controls/no-children; Enter produced true/exact-controls/children; focus, exact URL and stopped content remained; chevron has no independent expanded/controls/label/tabindex | Pass | `validation/api-e2e/browser-results.json` | Begin B03 Stop/sibling/retention |
| 7 | B03 | 2026-09-21T07:32:00Z | Started | Ordinary Agent Orgs catalog→Run flow in isolated profile; then selected-sibling Stop interaction | Active Stop terminates only the disposable run without toggling/opening/selecting it; retained stopped selection/content/siblings remain exact | No provider Send will be performed | N/A | Chrome session + owned backend log | Create disposable active Org through normal UI, select stopped Org, then click Stop |
| 8 | B03 | 2026-09-21T07:34:30Z | Completed | Created Nested Classroom Test Org through catalog/model/Run; collapsed it, selected stopped Software Development Department, clicked visible Stop | Stop changes lifecycle only and leaves selected sibling, content and disclosure untouched | Disposable run created with local catalog model and no Send; Stop removed itself and status became Stopped; disposable row stayed collapsed/no children; exact different stopped Org URL and content stayed; two Org sibling rows remained | Pass | `validation/api-e2e/{browser-results.json,b03-stop-isolation.png,backend-boundary-check.txt}` | Begin B04 Team/persistence/no-inference comparator |
| 9 | B04 | 2026-09-21T07:36:00Z | Started | Real saved Software Engineering Team row, console/backend boundaries and before/after hashes | Team remains behaviorally unchanged; no provider inference; original stopped Org/Team trees remain byte exact | Minimal Team history index entry added only to owned clone, then owned server restarted; normal browser reload published the real Team group | N/A | Chrome session; `validation/api-e2e/targets-before.json` | Toggle Team, capture retained content, then compare logs/files |
| 10 | B04 | 2026-09-21T07:38:30Z | Completed | Team primary row clicked twice; browser/service logs and exact hashes inspected | Team expands/selects then collapses while content remains; no inference; representative data unchanged | Team selected saved solution_designer content on first click and retained it after collapse; no inference/error marker in corrected backend run; clone database plus stopped Org and Team trees are byte exact before/after. One dev-server dynamic-import retry at initial workspace navigation is qualified; the stabilized page and all subsequent cases passed | Pass | `validation/api-e2e/{browser-results.json,b04-team-comparator.png,persistence-comparison.json,backend-boundary-check.txt}` | Clean up C01 and record the setup-isolation correction transparently |
| 11 | C01 | 2026-09-21T07:39:00Z | Started | Close owned Chrome tab; stop owned Nuxt/backend; remove isolated profile and generated prerequisites; verify ports/status | No validation-owned runtime remains; ticket evidence and candidate only remain | Cleanup started after all evidence persisted | N/A | `validation/api-e2e/process-cleanup-check.txt` (pending) | Execute and verify cleanup |
| 12 | C01 | 2026-09-21T07:41:00Z | Completed | Owned tab close; Ctrl-C owned frontend/backend; Python removal of exact clone and generated SDK dirs; `lsof`/status check | Owned tab/process/profile/prerequisite resources removed | Ports 51681/51683 closed; clone removed; generated SDK dirs removed; git status contains only implementation files and ticket artifacts | Pass | `validation/api-e2e/process-cleanup-check.txt` | Reconcile ledger and finalize API-REV-001 |

## Re-entry And Reconciliation

- Last event: `C01` completed Pass.
- Last completed case: `C01` Pass.
- Cases still running/interrupted/not started: none.
- Next case: finalize reports and route the completed result.
- Reconciled into report: `Yes — api-e2e-execution-coverage-report.md (Pass / 96.9%)`.
