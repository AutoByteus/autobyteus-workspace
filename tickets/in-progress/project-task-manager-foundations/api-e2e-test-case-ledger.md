# API/E2E Test-Case Ledger

## Ledger Meta
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/api-e2e-coverage-investigation.md`
- Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/api-e2e-execution-coverage-report.md`
- Revision: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/api-e2e-revision-record.md`
- Round 1; prior result N/A. Multi-case/long-running run; initialized before execution.

## Planned Cases
| Case ID | Journey | Requirement/AC | Planned surface/order | Status |
|---|---|---|---|---|
| REPO-SERVER | Existing services/tools/guards + GraphQL/MCP suites | AC-001–003/009/010/012/019–022 | 1 — documented repository/HTTP/browser/isolated-app | Pass |
| API-MCP | Actual selected MCP/native raw HTTP parity/local access | AC-001–003/010/020–022 | 2 — documented repository/HTTP/browser/isolated-app | Pass |
| API-FILES | Real HTTP context bytes/save/restart/delta/Done/delete | AC-009/012/019 | 3 — documented repository/HTTP/browser/isolated-app | Pass |
| API-AGG | Aggregate workspace registration/count/failure | AC-009/012/014 | 4 — documented repository/HTTP/browser/isolated-app | Pass |
| REPO-WEB | Renderer/voice/extension regressions | AC-013–019/025 | 5 — documented repository/HTTP/browser/isolated-app | Pass |
| TYPECHECK | Relevant full-web diagnostic regression investigation | Build/regression | 6 — documented repository/HTTP/browser/isolated-app | Pass |
| WEB-PAGES | Ordinary page/keyboard/context/deletion/search fidelity | AC-013–017/019 | 7 — documented repository/HTTP/browser/isolated-app | Pass |
| WEB-REFRESH | External tool commit -> physical Refresh/pending/error/order | AC-025 | 8 — documented repository/HTTP/browser/isolated-app | Pass |
| DESKTOP | Isolated worktree product/optional real voice capability | AC-018 | 9 — documented repository/HTTP/browser/isolated-app | Pass typed/Refresh; Not Tested real voice — user-waived |

## Execution Events
| Sequence | Case | Event | Expected | Observed | Result | Evidence / next action |
|---|---|---|---|---|---|---|
| 1 | REPO-SERVER | Started | Narrow reviewed units and existing real GraphQL/MCP suites pass | Shared preparation in progress | N/A | api-e2e-shared-prepare.log |
| 2 | REPO-SERVER | Completed | Valid suites pass | 145 pass; 1 stale schema expectation excludes approved contextChanges | Fail — test validity Local Fix | api-e2e-server-baseline.log; update before rerun |
| 3 | API-MCP/API-FILES | Started | Production HTTP/session/files contracts pass | New durable suite prepared | N/A | project-task-boundaries.e2e.test.ts |
| 4 | API-MCP/API-FILES | Completed | Real contracts pass | New harness locator assumption invalid; fetch Host override inconclusive, fix wire request | Fail — harness Local Fix | api-e2e-http.log |
| 5 | API-MCP/API-FILES | Started | Correct scoped draft endpoint and actual Host bytes | Rerun | N/A | api-e2e-http-rerun.log |
| 6 | API-MCP/API-FILES | Completed | Real contracts pass | 11/11 across 2 E2E files; selected actual host HTTP/native raw parity, Host/Origin rejection, files and deltas/Done/delete pass; reset is reader reconstruction, not process restart | Pass | api-e2e-http-rerun.log; process restart planned browser |
| 7 | REPO-WEB | Started | Renderer/voice current sink regressions pass | Nuxt suite launched after HTTP completion | N/A | api-e2e-web-unit.log |
| 8 | REPO-WEB | Completed | Renderer/voice regressions pass | 113/113, 12 files; extension transcription uses doubles, not real voice | Pass | api-e2e-web-unit.log |
| 9 | API-AGG/API-MCP | Started | Real aggregate/collision additions plus baseline regressions pass | Build passed and suites rerun | N/A | api-e2e-server-final.log |
| 10 | TYPECHECK | Started | Attribute relevant checker failures without suppression | Repository VueTSC with pinned compatible executable | N/A | api-e2e-web-typecheck.log |
| 11 | REPO-SERVER/API-AGG/API-MCP | Completed | Corrected existing and new collision/aggregate suites pass | 150/150, 20 files; real registration/no mkdir/unregistered/full counts and protected static collision pass | Pass | api-e2e-server-final.log |
| 12 | WEB-PAGES/WEB-REFRESH | Started | Ordinary rendered journeys through owned real stack | New probe uses worktree server build and owned node roots/ports | N/A | api-e2e-browser-1/result.json |
| 13 | DESKTOP | Started | Supported isolated worktree build/start | No installed app/profile touched; lifecycle chooses own ports/root | N/A | api-e2e-isolated-start.json / api-e2e-isolated-build.log |
| 14 | TYPECHECK | Completed | Relevant regressions attributed | Current 387, source base 388; absolute-root normalization pending; full checker remains Fail | Pass — investigation only | api-e2e-web-typecheck*.log / comparison.json |
| 15 | WEB-PAGES/WEB-REFRESH | Completed | Real rendered current journeys pass | 7 pass / 4 fail first probe; external-writer location and Retry copy harness errors; concurrent packaging altered Nuxt output; cleanup owned nodes/frontend/root confirmed | Fail — API/E2E Local Fix, not source defect | api-e2e-browser-1/result.json, external-tool.log, frontend.log |
| 16 | WEB-PAGES/WEB-REFRESH | Started | Corrected serialized probe; added ordinary route ordering/120 Tasks/keyboard/localization/live setting invalidation | Isolated build complete; no concurrent Nuxt generation | N/A | api-e2e-browser-2/result.json |
| 17 | WEB-PAGES/WEB-REFRESH | Completed | Current probe pass | 12 pass / 4 harness assertion failures; real Refresh/restart/route/full-count paths pass; owned cleanup confirmed | Fail — API/E2E Local Fix | api-e2e-browser-2/result.json |
| 18 | WEB-PAGES/WEB-REFRESH | Started | Corrected semantic row/currentness/settings assertions | Full 16-case final probe | N/A | api-e2e-browser-final/result.json |
| 19 | WEB-PAGES/WEB-REFRESH | Completed | Current 16 journeys pass | 16/16 Pass; owned processes terminated/temp root removed; zero pageerror events | Pass | api-e2e-browser-final/result.json |
| 20 | API-MCP/API-FILES/API-AGG | Completed | Physical old-copy removal and delete cleanup plus all HTTP scenarios pass | 13/13 final E2E tests, 2 files; physical ENOENT proof added and rerun | Pass | api-e2e-http-final.log |
| 21 | REPO-WEB | Completed | Stable extension archive fixture and relevant Electron contracts pass | 9/9 final tests, 4 files; initial one intermittent fixture install failure not reproduced on base or serial current; immutable fixture correction | Pass | api-e2e-electron-final.log / baseline.log / rerun.log |
| 22 | DESKTOP | Checkpoint | Owned packaged product typed authoring, truthful absent voice and external native write→Refresh | Exact worktree bundle; typed save/detail/backend proof; actual Refresh shows IN_PROGRESS with Desktop search retained | Pass — non-voice slice | api-e2e-desktop-observations.json / tool-refresh.json; CUA native AX/screenshot |
| 23 | DESKTOP-VOICE | Completed | Real installed/enabled microphone/permission/extension/IPC voice | Voice Input Not Installed; no real device capture; isolated install/microphone consent requested, no reply at checkpoint | Blocked | api-e2e-desktop-observations.json; no injected/sample transcription counted |
| 24 | DESKTOP | Cleanup | Stop only owned iso-55019-e50e and remove owned root/release ports | Stop ok, wasRunning true, forced false, root removed/control and server ports released; other instances untouched | Pass | api-e2e-isolated-stop.json / list-after-stop.json |
| 25 | WEB-PAGES | Investigation update | All user journeys use real ordinary triggers | PT-E2E-015 router shortcut replaced by Settings clicks/browser Back/Project nav; prior run guard-only for that navigation portion | N/A | investigation; full supported-trigger rerun planned |
| 26 | WEB-PAGES/WEB-REFRESH | Completed | Real Settings/Back ordinary triggers | 15/16 Pass; final Settings layout has no shell Projects nav until Back to Workspace; selector sequence defect; owned cleanup complete | Fail — harness Local Fix | api-e2e-browser-supported/result.json / PT-E2E-015-failure.png |
| 27 | WEB-PAGES/WEB-REFRESH | Started | Correct Settings exit then nav; full 16-case journey chain | Final ordinary-trigger rerun | N/A | api-e2e-browser-verified/result.json |
| 28 | WEB-PAGES/WEB-REFRESH | Completed | Real Settings exit/nav | 15/16; Back to Workspace display string differs from aria label, so exact role-name selector never located it; owned cleanup complete | Fail — harness Local Fix | api-e2e-browser-verified/result.json / failure screenshot; actual settings-nav-back markup |
| 29 | WEB-PAGES/WEB-REFRESH | Started | Observed Settings Back control and full ordinary journeys | Final runtime rerun | N/A | api-e2e-browser-accepted/result.json |
| 30 | WEB-PAGES/WEB-REFRESH | Completed | Full ordinary user-trigger journeys | 16/16 Pass, zero pageerrors; Settings click/Back/Back to Workspace/Projects nav actual controls; all owned cleanup complete | Pass | api-e2e-browser-accepted/result.json |
| 31 | TYPECHECK | Checkpoint | Latest test-code full checker diagnostics | Post-package rerun exit134/heap OOM, no diagnostics; generated own web package dirs included by Nuxt glob; environment investigation | Blocked — local execution | api-e2e-web-typecheck-final.log; relocate own generated output then retry |
| 32 | TYPECHECK | Completed | Latest test-code checker and baseline comparison | Same checker/heap after own generated package relocation: exit2/387 vs base388; zero new failing sites/codes; existing websocket.ts:15:3 TS2322 message shape changed; initial full-block compare0added/1removed; outputs restored/backup removed | Pass — regression investigation; checker Fail | final-clean.log / comparison.json / build-relocation.json |

## Re-entry And Reconciliation
Round1 / API-REV-001 completed with overall **Blocked /90.7%**; prior result N/A. Last recorded execution event32; final hygiene note below. No owned process/case still running. Final supported ordinary browser evidence: api-e2e-browser-accepted/result.json16/16 Pass; prior harness attempts retained, not production failures. REPO-SERVER/API-MCP/FILES/AGG/REPO-WEB/WEB-PAGES/REFRESH Pass; TYPECHECK investigation completed, checker remains Fail387 vs base388, no new failing sites/codes, one existing message-shape delta. DESKTOP typed/unavailable/Refresh Pass; installed real voice DESKTOP-VOICE Blocked pending consent/device/spoken user input. All owned cleanup complete. No teammate handoff; future successful Large/High proportional test-code review Required. Ledger timing deviations are disclosed in the canonical report.

Finalization: test checkpoint e4764d76a34328bacd62e76856689e6da6300da4, evidence commit34c9e60ce. Source/test whitespace check Pass; staged raw evidence logs/exact-patch whitespace warnings retained and disclosed, not altered to hide output. No push/integration. get_handoff_rules confirms no rule applies to Blocked; no member notification sent. User dependency request outstanding.

## Round2 Re-entry — API-REV-002
Prior result API-REV-001 Blocked /90.7% preserved above. The user explicitly removes the optional actual voice test obligation; no runtime rerun or new test evidence.

| Event | Case | Expected | Observed | Current result | Evidence |
|---|---|---|---|---|---|
| 33 | DESKTOP-VOICE | Resolve prior optional dependency before proceeding | User says no further voice input test needed and accepts Pass; no capture/install performed | Not Tested — user-waived | api-e2e-user-voice-validation-waiver.md |
| 34 | RETAINED-RESULTS | Existing code/evidence unchanged | Clean branch and all345 previous package hashes verified; tests e4764d76a unchanged | Pass — evidence integrity, no suite rerun | package inventory/test checkpoint |

Current reconciliation: **Pass for user-authorized scope /95.0%**; seven scoped categories95%, hardware claim excluded rather than upgraded. REPO/API/WEB/DESKTOP typed results retained; checker still Fail, regression investigation retained. Additional broader validation Not Required; successful Large/High proportional test-code review Required. No owned case/process running, no further microphone dependency request.
