# API/E2E Test-Case Ledger

Round 1; worktree /Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace. Canonical coverage plan: api-e2e-coverage-investigation.md; round result: api-e2e-execution-coverage-report.md; history: api-e2e-revision-record.md. Initialized before execution because independently meaningful repository, API, provider and browser cases are interruption-prone. Initial timestamp 2026-09-22.

## Planned cases
| Case ID | Journey | AC | Status |
| --- | --- | --- | --- |
| API-C01 | Focused server config/options/GraphQL | AC-001,002,004 | Pass |
| API-C02 | Web draft/publication/composed Files/forms | AC-001,002,004,005 | Pass |
| API-C03 | Lifecycle/activation/task/bootstrap | AC-003,004,006 | Pass |
| API-C04 | Real HTTP API persistence/restart | AC-001,002,004,005 | Pass |
| API-C05 | Native continuation | AC-003,005 | Pass |
| API-C06 | Codex continuation | AC-003,005 | Pass |
| API-C07 | Claude continuation | AC-003,005 | Pass |
| API-C08 | Browser Save/reopen/Send | AC-001–005 | Pass |
| API-C09 | Browser unavailable Files/recovery | AC-004,005 | Fail — API-F001 |
| API-C10 | Fresh delegation B/history preservation | AC-006 | Pass |
| API-C09-R1 | Real reactive metadata-only registration regression | AC-005 | Fail — API-F001 |

## Execution events
| Seq | Case | Event | Expected / command | Observed / evidence | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | API-C01 | Started | prepare:shared; focused 3-file server Vitest | Awaiting command result | N/A |
| 2 | API-C01 | Completed | focused 3-file Vitest | 3 files/21 tests, exit 0; evidence/api-server-focused.log; prepare:shared exit 0 | Pass |
| 3 | API-C02 | Started | focused web selection test:nuxt --run | Awaiting | N/A |
| 4 | API-C02 | Completed | focused web tests | 25 files/249 tests, exit 0; evidence/api-web-focused.log; mocked external I/O, real composed target ownership | Pass |
| 5 | API-C03 | Started | Org lifecycle plus activation/provider bootstrap units | Awaiting | N/A |
| 6 | API-C03 | Completed | lifecycle owner regressions | 20 files/117 tests exit 0; evidence/api-lifecycle-units.log; provider mocks remain | Pass |
| 7 | API-C04 | Started | server build then new real-process API test | Build pending | N/A |
| 8 | API-C04 | Completed | pnpm server build; new real-process Vitest | Build + isolated HTTP/API/restart pass, 1/1 test. evidence/api-server-build.log and api-org-http.log. No LLM turns requested. | Pass |
| 9 | API-C05/06/07 | Started | Owned backend + runtime/credential/catalog preflight | Native, Codex and Claude availability not yet established | N/A |
| 10 | API-C07 | Completed | Claude Agent SDK haiku via existing CLI authentication, actual Org WebSocket Send | Same session ID before/after stopped Save; recalled token written under B; unused child wrote under B; A file intact. evidence/api-continuation-claude_agent_sdk.json | Pass |
| 11 | API-C08 | Started | Nuxt 127.0.0.1:54451 + owned backend 54193; browser workspace | Initial browser blank with generated #app-manifest Vite resolution errors; investigating safe preparation | N/A |
| 12 | API-C06 | Completed (recovered after poweroff) | Codex gpt-5.6-luna real Org Send | Durable JSON records same thread, recalled token/file B, unused child B, A unchanged, graceful Org stop. evidence/api-continuation-codex_app_server.json | Pass |
| 13 | API-C05/08 | Checkpoint | User reports poweroff; process inventory and durable files checked | No owned backend/Nuxt/probe processes survive. Native first turn + saved B persisted; continuation unresolved. Browser not yet tested. Resume same owned data, no reset/session replacement. | N/A |
| 14 | API-C05 | Completed | Resume same native Org/memory after user poweroff, qwen/qwen3.8-27b via already-loaded LM Studio | Canonical B read without Save replay; same Agent recalled pre-poweroff/A token and wrote continued.txt in B; never-used child wrote unused.txt in B. Original A file unchanged. evidence/api-continuation-autobyteus.json, api-events-autobyteus.jsonl. No model/server reset. | Pass |
| 15 | API-C08 | Checkpoint | nuxi prepare; restarted Nuxt; browser History→Claude Org→Edit Config→Team New C | Full renderer became ready; initial manifest diagnostics did not prevent startup after warm-up. Root/child/runtime controls locked; both child previews show C; API still inactive/B before explicit Save. | N/A |
| 16 | API-C08 | Core journey completed | Actual browser Save C → canonical reopen → ordinary Send | Reopened Team+children C; same provider binding and all other tree fields exact; rendered remembered token and pwd C; actual C/browser.txt contains token. Stopped via UI. evidence/api-browser-result.json. Responsive and picker subchecks pending. | Pass (core) |
| 17 | API-C08 | Completed | Compact desktop 900×800 and unchanged picker unit coverage | Team disclosure and sticky Save render within compact column, no viewport overflow in screenshot; default viewport restored. WorkspaceSelector.spec.ts native bridge success/cancel/error/disabled paths ran in C02. Actual Electron picker not executed (unchanged shell boundary). | Pass |
| 18 | API-C09 | Started | Own transparent backend HTTP/WS proxy; only metadata query for owned D receives controlled error | Proxy 56211 → own backend 55566; Nuxt restarted with proxy, no backend reset, provider sessions unchanged. | N/A |
| 19 | API-C10 | Started and completed while C09 recovery pending | New owned Claude fixture; delegate historical task A, stop/save B/restore, delegate fresh task | Real delegate_task/submit_task_result/review flow; fresh task wrote B/fresh.txt; historical snapshot deep-equal across save and later delegation; A/historical.txt unchanged. evidence/api-fresh-tasks.json, api-task-events.jsonl. | Pass |
| 20 | API-C09 | Failure checkpoint | Remove only metadata fault and reopen Settings; no Save replay; Files D opens | Correct unavailable state initially (no tree/editor, composer retained, tabs/keyboard safe). Recovery sends one metadata read/CreateWorkspace, but FileExplorer throws Maximum recursive updates exceeded and remains Loading workspace. Investigating source/environment separation; prior-mounted branch and explicit D edit not yet executed. | Unresolved failure |
| 21 | API-C09 | Completed — Fail API-F001 | Recovery should show current saved target without recursive render failure | Repeated with independent E after dirty D editor: whole tree/editor blocked, dirty D never saved, composer retained; read-only recovery again stuck Loading with same recursion at 10:04:41Z. D recovery at 09:59:30Z had same failure, with Activity→Files workaround allowing explicit D edit. evidence/api-c09-checkpoints.json, api-proxy-requests.jsonl, api-browser-recovery-failure.md. | Fail |
| 22 | API-C09-R1 | Durable reproduction completed | pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts --run | 1 test failed, exit 1, same Maximum recursive updates exceeded plus unhandled rejection. Actual reactive store registration, transport mocked only, no proxy/provider/backend dependency. evidence/api-files-activation-regression.log. | Fail |

| 23 | All | Cleanup and reconciliation | Stop only owned resources; preserve evidence | All owned Orgs stopped before teardown, DB/key/runtime/UI dirs gone; own tab closed and viewport reset; generated SDK dist removed. User production app PID19026 intact. evidence/api-cleanup.json, api-final-fixture-audit.json. | Complete |

## Round disposition
API-REV-001 initial baseline; prior completed result/confidence N/A. **Fail, 75.0% confidence**, API-F001. No case remains running or interrupted. C09 recovered D only by tab-toggle workaround; E first-recovery remains failing. Actual native picker, arbitrary provider/model combinations, and whole-project web typecheck are not claimed. Report reconciles every case and is authoritative.


# Round 2 — CRR-003 / IR-003 corrective return
Initialized before execution. Prior API-REV-001 Fail75.0% preserved. Reuse IDs; carried positives explicitly not rerun.

| Case | Round2 plan/status | Evidence intent |
| --- | --- | --- |
| API-C09-R1 | Pending, FIRST | Original failure plus14-test activation suite |
| API-C02 | Pending focused/broader rerun |6 Files tests,28-file cumulative frontend set |
| API-C04 | Pending smoke rerun | Real HTTP/restart with built unchanged server |
| API-C09 | Pending browser | First recovery unopened and prior-mounted dirty; no workaround |
| API-C01/C03/C05/C06/C07/C08/C10 | Carried Pass, not rerun | Prior scoped evidence valid for unchanged owners |

| Seq | Case | Expected / action | Observation | Result |
| --- | --- | --- | --- | --- |
| R2-01 | API-C09-R1 | Rerun14-test metadata activation suite first | Starting | N/A |
| R2-02 | API-C09-R1 | Original regression+expanded semantic activation lifecycle | 1file/14tests Pass, exit0, no reported unhandled errors; api-r2-c09r1.log. Real-browser failure not yet closed. | Pass |
| R2-03 | API-C02 | Focused6 then broader frontend suite | Starting | N/A |
| R2-04 | API-C02 | Focused6 actual Files/layout suites | 6files/49tests Pass, no reported unhandled error; api-r2-focused.log. Both first-recovery composed cases use delayed real registration. | Pass |
| R2-05 | API-C04 | prepare:shared/build and unchanged real HTTP/restart suite | Started own preparation/smoke; no live shared DB | N/A |
| R2-06 | API-C02 | Broader28 frontend set | 28files/275tests Pass, exit0; api-r2-web.log. Counts include focused49, not additive. | Pass |
| R2-07 | API-C04 | prepare:shared/build and real HTTP/restart | All exit0;1file/1test Pass; api-r2-prepare.log, api-r2-build.log, api-r2-http.log. Unique test data cleaned by test. | Pass |
| R2-08 | API-C09 | Real browser revalidation setup | New owned backend58661/runtime offline-org-r2-79622-1790075019782. Creating public fixture; no old runtime reuse/reset. | N/A |
| R2-09 | API-C09 unopened | SaveB metadata fault, first Files view blocked, clear fault + single Settings reopen | First recovery yields target.txt/no Loading, console errors empty; no tab switch/reload/pre-registration/Save replay. Explicit B open/real Monaco save persisted. Composer APRICOT history retained; entire tree exact except Team/all child paths; inactive/same binding. api-r2-unopened-unavailable.json, api-r2-unopened-recovered.json. Two CUA CDP timeouts resolved by read-only observation, no action replay. | Pass |
| R2-10 | API-C09 prior-mounted dirty | With B mounted, enter unsaved dirty content; Save Team D under metadata fault; press keyboard Save while unavailable | Dirty B editor/tree disappeared, keyboard Save produced no write, B stayed at its prior explicit value, D stayed original. Exact schema-v1 whole tree changed only Team/all configured child paths; Org remained inactive. api-r2-dirty-unavailable.json. | Pass |
| R2-11 | API-C09 prior-mounted dirty | Clear only D fault; one Edit Config/canonical read while Files remains selected; first recovery must work without tab toggle/remount/pre-registration/Save replay | First completion rendered D target.txt/no Loading; browser console errors empty; no recursion. D opened with original content and explicit Monaco save wrote only D. B remained unchanged. Conversation marker, unsent composer and launch draft A remained. Totals:2 config saves,2 injected faults,2 workspace creates,2 deliberate writes. api-r2-dirty-recovered.json, api-r2-browser-result.json, api-r2-requests.jsonl. | Pass |
| R2-12 | All | Cleanup and reconciliation | Owned Nuxt/proxy/backend stopped; runtime/DB/key and generated SDK dist absent; ports closed; production app PID19026 untouched. Active validation tab closed. One pre-interruption local tab was debugger-unattached, left unmarked/inert with services stopped for automatic browser-session cleanup; no user tab touched. api-r2-cleanup.json. | Complete |

## Round 2 disposition
API-REV-002 completes revalidation of API-F001. **Pass, 95.0% confidence.** API-C09-R1 and both API-C09 first-recovery branches pass without the prior workaround, pre-registration, Save replay, draft clearing, provider reset, recursion, or stale write. API-C01/C03/C05/C06/C07/C08/C10 remain carried Pass from API-REV-001 because CRR-003 independently proved their production owners unchanged; API-C02/C04 were proportionately rerun. No case remains running, interrupted, failed, or unstarted. Actual Electron picker and full-project web typecheck remain bounded unexecuted/baseline-blocked scope, not hidden Passes. The execution report is authoritative; successful cumulative result requires proportional Code Reviewer review of the changed durable tests before Delivery.
