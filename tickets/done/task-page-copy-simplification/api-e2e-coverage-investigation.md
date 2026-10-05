# API/E2E Coverage Investigation

## Investigation Meta
Round 1, initial IR-001 request, 2026-10-05. Current API revision: API-REV-001; prior result N/A (initial completed round).
Canonical task directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification`.
Reviewed complete cumulative package: requirements-doc.md (Approved SR-001), investigation-notes.md, solution-revision-record.md (SR-001/002), design-spec.md (Ready SR-002), approval-record.md, solution-handoff.md, implementation-handoff.md and implementation-revision-record.md (IR-001). Original screenshot is current-state evidence only, path in upstream handoff. Independent architecture/source reviews and their revision records: N/A — not applicable. Product supplements, delivery/rework reports: N/A — not applicable. This investigation/report/revision/ledger are canonical current artifacts, not copies.

## Routing Classification
Small / Low, Direct Low-Risk; successful-output route Delivery, test review **Not Required — direct low-risk route**. Source baseline f5b1caa48d088d2ebc56f8835819f008f3e24d12; branch codex/task-page-copy-simplification, origin/personal base 88851166fe8a37944381f0299bd479f20ed0f877. No merge/push/release scope here.

## Current Requirement And Design Basis / Supported Scenarios
SCN-001 new task, SCN-002 edit task, SCN-003 blank/save/voice recovery; all supported normal user journeys. No added or contrived scenarios. BEH-001 removes redundant subtitle/h2/help/static policy, shortens en/zh placeholder and closes gaps. BEH-002 preserves typing, explicit save, trim, summary, files, identity/status, cancel/navigation, voice and errors. AC-001/002/004/005 require direct DOM/layout/locale/error-reference proof; AC-003 requires ordinary route to real API/context-byte persistence. Design DS-001/002/003 use unchanged draft/store/context owners.

## Changed Behavior And Boundary Classification
| Boundary | Change | Repository evidence / remaining gap | Broader mode |
| --- | --- | --- | --- |
| Frontend component/localization | Yes: templates and two catalogs only | Real templates in component tests; CSS/layout/browser route not exercised | Projects browser/API |
| Browser journey / web-equivalent desktop renderer | Yes: rendered copy/spacing/ARIA | Component mocks bypass route/API/browser layout | Projects browser/API |
| Domain, API/transport, authentication | No: preservation only | Draft/store tests, existing owned E2E | Retain journeys |
| Shell/Electron IPC, OS permissions, physical microphone | No | Existing voice doubles not hardware proof | Not required for copy-only change |
| Process/lifecycle, persisted transition, worker/distributed/external integration | No | Unchanged production scripts; no stored shape change | Existing probe restart/voice preservation only |
Legacy/Compatibility Removal Check and Persisted Data Transition Check read: clean-cut copy deletion; no alternate path, **Not Affected**, no reset/migration/fallback. Verified source diff supports both.

## Project Execution Discovery / Live Environment And Fixture Plan
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification`; Nuxt/Vue renderer + Node/GraphQL/REST/SQLite backend, desktop Electron shell unchanged. Installed dependencies available; no provider secrets needed.
| Instructions/config read | Learned command/constraint |
| --- | --- |
| Root AGENTS.md, DESIGN.md, TESTING.md | Small deletion; narrow checks then required browser/API Projects probe; no user app/data |
| autobyteus-web/AGENTS.md, README.md testing, ARCHITECTURE testing references | Colocated Nuxt tests, always --run; explicit staging only |
| Root README.md Local full-stack development; web/docs/projects.md | Ordinary routes/save/Cancel/required input/files/voice contract; prefer owned probe over persistent pnpm dev state |
| web/package.json, vitest.config.ts, server/package.json, probe header/source | Nuxt happy-dom doubles; probe builds current server incl prebuild, creates two nodes, migrates SQLite, starts actual Nuxt/Chrome on free ports |
| web/localization/runtime/preferenceStorage.ts and runtime types | Owned browser locale preference setup is supported en/zh-CN storage mode |
No closer TESTING/AGENTS instructions under affected web paths; no conflicts. Browser Chrome available; Node/pnpm installed. Probe scrubs ENABLE_* flags; no account required.
Setup: full Projects probe --voice-input --output-dir=<fresh absolute ticket evidence directory> --ledger-file=<initialized absolute ledger>. It owns disposable temp root, two SQLite nodes, workspace/file fixtures, backend processes, free-port Nuxt and fresh Chrome context. Health and frontend HTTP signal readiness. Real API creates project/tasks, ordinary UI authors; only optional extension discovery/transcription IPC is fixture, native capture uses fake mic and granted permission. Retain result.json, logs and new/edit en/zh wide/narrow screenshots. Finally close Chrome, terminate exact owned process groups, remove temp root. No reuse/termination of unknown processes or data. No desktop instance start.

## Existing Durable Coverage Inventory
| Path/test (web-relative) | Intent | Validity | Action / criteria |
| --- | --- | --- | --- |
| components/projects/__tests__/ProjectTaskDraftEditor.spec.ts | Compact create/edit, blank focus/reference, save/cancel destinations, failure/blocked | Still Valid | Execute; AC-001–005 |
| components/projects/__tests__/TaskDescriptionComposer.spec.ts | Error-only references, attach/shortcuts, quiet voice success | Still Valid | Execute; AC-001/004/005 |
| localization/messages/__tests__/projectsCatalog.spec.ts | concise en/zh placeholder, deleted keys, shared detail key and catalog parity | Still Valid | Execute; AC-001/002/005 |
| components/projects remaining tests, composables/projects tests | Existing board/project/notice/draft/file/voice preservation | Still Valid | Execute affected folder suites |
| stores/__tests__/projectTaskStore.spec.ts, projectStore.spec.ts; utils/projects summary; composables/projects draft/context doubles | Save/status/files/summary/node transport | Still Valid | Execute broader relevant suites |
| tests/e2e/projects-feature-probe.mjs PT-E2E-005/006 | Ordinary task create/edit, validation, Cancel, HTTP files and identity/status | Needs Update | Extend copy/locale/error ARIA/label/no heading gap and new/edit wide/narrow evidence; keep detail heading |
| Same probe PT-E2E-001–004/007–016 | Owned project/node/context/restart/refresh regression | Still Valid | Retain full probe; no obsolete assertion |
| tests/e2e/projects-voice-cases.mjs B-001–006 | Native browser capture + fixture IPC; actual Project/Task save | Still Valid | --voice-input; no hardware/shell claim |
| Unrelated Electron/agent runtime suites | Unchanged boundaries | Out Of Scope | Not executed |
No unclear/stale coverage; no removal or replacement. No new suite needed: extend existing task cases durably. Temporary executable probes: None.

## Durable Coverage To Update
PT-E2E-005/006 in web/tests/e2e/projects-feature-probe.mjs: add en/zh copy absence and concise placeholders on actual new/edit routes; associated label, rows=8 and retained controls; computed no-heading-gap and overflow assertions at 1512x862/390x844; blank/error focus/reference and correction in both modes; create Ctrl+Enter, edit Meta+Enter; preserve summary/multiline/files/Cancel/ID/status; injected failed task save then same draft retry. AC-001–005, DS-001–003. Retain all existing journeys/detail heading. No runtime source changes authorized.

## Repository Coverage Execution Plan And Results
1. node --check web/tests/e2e/projects-feature-probe.mjs and git diff --check **Pass** (syntax/diff).
2. pnpm -C autobyteus-web test:nuxt components/projects composables/projects localization/messages/__tests__/projectsCatalog.spec.ts --run **Pass: 10 files / 66 tests**, evidence/api-unit.log.
3. pnpm -C autobyteus-web test:nuxt stores/__tests__/projectTaskStore.spec.ts stores/__tests__/projectStore.spec.ts utils/projects services/projects --run **Pass: 5 files / 37 tests**, evidence/api-preservation.log.
4. Full owned Projects probe --voice-input: **Pass**, final api-projects-03/result.json 22/22, launch log retained; first attempt built current server, later documented --skip-server-build reruns use unchanged build. Attempt details below.

## Test-Case Ledger Decision
Required: Yes, independently meaningful cases plus build/runtime interruption risk. Canonical api-e2e-test-case-ledger.md initialized before execution; probe appends each result before next case. Record unit cases separately; result.json checkpoints preserve partial execution.

## Post-Repository Confidence Scorecard
| Mandatory category | Score | Support / remaining gap | Targeted evidence gain |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Compact forms and local preservation passed; visual/ordinary API criteria partial | Route DOM/screens + HTTP persistence |
| Changed-boundary execution directness | 90% | Real Vue templates/catalogs, but happy-dom lacks CSS/browser layout | Actual Nuxt/Chrome layout |
| Cross-boundary integration realism and mock gap | 75% | Draft/store dependencies doubled | Real server/API/context bytes |
| Environment/configuration/identity/fixture fidelity | 75% | Current worktree units; runtime not started | Disposable rebuilt-server nodes |
| Failure/edge/lifecycle/recovery evidence | 90% | Blank/focus/failed-save/voice lifetime unit checks | Live blank + injected save retry/native voice |
| User-surface/browser/desktop-shell confidence | 75% | No independent full ordinary-route rendering yet; shell unchanged N/A | Wide/narrow en/zh routes |
| Durable regression coverage quality/relevance | 90% | 103 passed valid tests; extended durable probe unexecuted | Full extended Projects run |
Overall **81.43%**, simple average (570/7), below target; categories below 90 listed above. Critical AC-001/002/003/004/005 not yet all directly proven at real browser/API boundary. Broader Required; no Pass declared.

## Broader Validation Decision / Desktop Decision
**Required**, Browser + Live API: changed CSS/rendered copy/locale/error references need actual routes and wide/narrow layout; component doubles cannot prove persistence/file/native capture boundary. Expected final >=95% across copy-only scope. Electron web-equivalent presentation only; unchanged shell/hardware out of scope. Probe uses actual current-worktree Nuxt + rebuilt server; no installed binary or user's running app. Browser proof does not certify packaged shell, physical microphones, OS permission/model quality or mobile support.

## Not Tested / Infeasible / Deferred
Unchanged physical mic, OS dialogs, real extension/model, Electron IPC/packaged-shell and release: out of scope, no confidence claimed for those boundaries. Delivery owns applicable packaged/user verification and release gates. No required inaccessible dependency identified.

## Execution Preparation Observation
Source inspection found ProjectTaskRow includes a summary plus quieter remaining-line preview. The new summary assertion selects its existing project-task-row-text test ID rather than whole-row innerText; approved summary behavior unchanged, no production finding. Services/projects has no colocated suite; context transport preservation remains draft tests plus the real HTTP probe.

## Ambiguities Or Reroute Triggers / Investigation Decision
None currently. Proceed Yes; update durable E2E coverage Yes; no deletion; no reroute before execution. Keep final classification evidence-based.

## Attempt 01 Evidence And API/E2E-Owned Harness Correction (before re-execution)
Full current-server build succeeded, Nuxt/Chrome and nodes started, 16/22 cases passed including new-form en/zh layout and all six voice cases. PT-E2E-005 failed “Cancel retains search”: presentation locale inspection reloads the page, resetting the intentionally transient in-memory search established before it. This is test sequencing, not evidence of a product regression: no source/draft/store changes, requirements explicitly say transient search. PT-E2E-006/007/008/010 have undefined task cascades and 011 has downstream count mismatch because 005 never created its task. Evidence api-projects-01/result.json and launch log. All owned resources cleaned (browser closed, exact process groups terminated, temp root removed); browserErrors empty.
Correction owned here: separate presentation setup from the no-reload Cancel preservation journey. After presentation inspection, Cancel, fill search through ordinary board UI, reopen New, then blank/correct/Cancel/save. No expected preservation assertion removed. Also replace PT-016 accumulating locale init scripts with explicit owned stored preference setup/reset, avoiding unordered init-script overrides. These are bounded harness fixes; no production changes or intended behavior changes. Rerun all same IDs with fresh api-projects-02 evidence; --skip-server-build justified by successful current-worktree build from attempt 01, no server source changes. Final round not yet classified; preserve failed attempt receipts and require all formerly failing cases to pass.

## Attempt 02 Evidence / Final Critical-Criterion Completeness Check
All 22 existing/extended browser/API cases Pass with no page errors; new/edit × en/zh × 1512/390 layout asserts 12px composer gap and label at padding+border; both blank states reference the present alert and focus textarea. Previously failing 005/006/007/008/010/011 all resolved. Owned cleanup complete. During final AC-004 mapping, file-failure proof is indirect through unchanged draft/template and success paths, unlike blank/save/voice feedback. Add a bounded upload HTTP-503/retry step to PT-E2E-005 before its existing real two-file save, to directly prove retained typed text, actionable file error, no automatic persistence and same-editor retry. No production behavior change; rerun full same-case probe to fresh api-projects-03 with already-built unchanged server. This closes a critical evidence gap rather than claiming the passing command alone suffices.

## Final Current Investigation Decision — API-REV-001
Round 1 completed: **Pass / 95%**, all seven final categories 95%, simple average 665/7. Post-repository score remains 81.43%; broader Required completed through actual current-source Projects browser/API with native-browser voice fixtures. Final current test code: api-projects-03/result.json, **22/22 cases Pass**, browserErrors empty; repository **15 files / 103 tests Pass**. All formerly failing attempt-01 cases successfully rechecked and final upload-failure/retry directly proves AC-004. No critical acceptance criterion missing, no category below 90 or material in-scope broader risk; no additional execution required. Default target met. Canonical report, revision and ledger reconciled. Cleanup receipt verifies owned PIDs/ports/root gone; no desktop instance started; own untracked SDK build outputs removed. Small/Low unchanged; test review Not Required — direct low-risk route; proceed to configured handoff. No release/delivery completion claim.
