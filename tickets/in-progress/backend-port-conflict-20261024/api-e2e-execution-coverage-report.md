# API/E2E Execution Coverage Report

## Result / authority
**API-REV-001: Pass — executable-validation stage, 95.3% confidence.** Broader validation **Required and completed**. Large / High unchanged; request independent proportional review of two new durable test files. No product-source fixes or open API/E2E product findings.

R2 Approved / D4.1 / SR-001..008 / ARCH-REV-004 / IR-004 / CRR-003. Current production source `9bd72c20893dedb8c7dc99aacfcb0b732d092d6c`, review HEAD `a201abe848cdff500948dfbd40dcd71d97926e26`; implementation evidence `e50cd6b4e`. This resumes the original CRR-002 validation run, not a duplicate run. Original API-04/06 receipts remain at HEAD5fd30310e/source d0338db0b; current follow-ons explicitly identified below.

**Not a build/package/release or final ticket acceptance.** IMP-44 overall build failed at DMG `hdiutil resize35`; current unpacked app/server/renderer/Electron compilation is usable and tested, but distribution packaging remains unresolved for Delivery. AC-006 merged-base/finalization receipt is a downstream Delivery gate, not performed here. Delivery owns integration from `origin/personal@034bfe51ab697817773ff545d369e1cfc03a79c5`. No historical Nuxt/Codex incident reproduction/fix claim.

Canonical plan: `api-e2e-coverage-investigation.md`; append-only progress: `api-e2e-test-progress.md`; result history: `api-e2e-revision-record.md`.
Evidence folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/evidence`.

## Environment / execution
- Worktree `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`, branch `task/backend-port-conflict-20261024`; commands below run from its root.
- macOS arm64, Node26.12.0, Electron42.11.16; pnpm10.28.2 via npm exec. Current unpacked `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, IMP-44 build / IMP-45-build-provenance.json. No duplicate build or installed-app use.
- Each actual run creates private resolved HOME/CODEX_HOME/TMPDIR/data/workspace, ephemeral ports and no credentials. Codex Responses SSE and native Chat Completions/LMStudio fixtures replace inference only. Actual CLI/tool, native command, host, GraphQL/WS, app-worker/RPC and desktop boundaries run normally.
- Project TESTING.md/AGENTS/isolated-app instructions followed; one heavy run at a time. No paid inference, user-data reset, release/install/update, merge or arbitrary cleanup. Safe marker strings are deliberately nonsecret fixtures.
- Root runner prefix **C**: `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node tickets/in-progress/backend-port-conflict-20261024/evidence/` followed by filename in Cases. These are complete commands when concatenated.
- Standalone command **S**: `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR="$PWD/tickets/in-progress/backend-port-conflict-20261024/evidence" npm exec --yes --package=pnpm@10.28.2 -- pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch`. Generic emitted files were renamed API-03-host.log/result.json for ticket evidence.

## Cases
All evidence filenames below are relative to evidence/. JSON timestamps and exact PIDs are authoritative; early progress labels were approximate and corrected in that log.

| Case / kind | Command or steps / environment | Result | Evidence and what to look for | Scope / limits |
|---|---|---|---|---|
| API-01 Reused | IMP-23/25/26/27/28/29/30/31; exact commands in implementation-check-ledger.md | Pass at original repository boundary | IMP23:8,25:132,27:209,28:141,29:11 =501;26/30 types exit0;31 original build completed | Historical d0338db0b. Unchanged anchors/native composition/desktop fault tests reused; changed shared runtime covered by API-08 and current integration. No current packaging pass inferred. |
| API-02 host proof | Current API-06B full packaged Studio injection/close, not a direct-scope test; existing durable composition tests retained | Pass by composed API-06B evidence; no duplicate execution | API-06B-result.json normal agent termination with previews retained, then actual backend restart / desktop quit drains actual native work | Planned duplicate Studio durable fixture not added: same actual boundary already proven; new durable regression targets standalone. |
| API-03 Durable E2E | S; actual standalone public application command -> SDK agent launch/stream/end -> native model/tools -> public host.close | Pass, final1 test | API-03-test.log `1 passed`; result.json `live work`, `post close`, elapsedMs855, exit/close IPC; four command/anchor pairs absent, two TERM handlers observed, sentinel200/file preserved; host.log | Full real standalone host, not helper Fastify or injected scope. First run ended and second retained; both command forms. Final test-only deadline refinement rerun; earlier success retained pre-safety. |
| API-04 Original journey | C + API-04-desktop-codex.mjs; actual conversation yields listener, turn completes, full app quit | Pass, historical scoped | API-04-result.json postquit807ms, app/child absent, port absent, sentinel200, data intact | Original source d0338db0b; current restart/quit proven by API-09B, not silently relabelled. |
| API-05 Current desktop journey | C + API-05-conflict-recovery.mjs; exact captured own backend exits, owned external426 binds, actual preload restart, visible error, UI retry while held, release fixture, UI retry healthy | Pass | API-05-result.json `conflict first`, `retry preserves external owner`, `recovered`; actual runner PID/node shown; observedAt refreshes; fixture426/sentinel200 survive; diagnostic absent after healthy retry; conflict/recovered.png; run/application.log | Correct port and visible guidance without details; reset control hidden. Only own fixture closed, no arbitrary owner kill. |
| API-06 Original + current follow-on | Original C + API-06-desktop-native.mjs; current C + API-06B-desktop-native-current.mjs | Pass, current B confirms impact | API-06B-result.json post-shutdown turn1/2: ended-run restart and retained active-run quit; four listener/anchor pairs absent, TERM observed, sentinel200/data intact; run/application.log, before1/2.png | Current B required because shared AgentRun/manager changed; core/native ownership unchanged. Active means retained run with live work after turn, not in-flight inference. Original API-06 untouched. |
| API-07 Temporary fault/transport probe | C + API-07-packaged-ipc.mjs; actual packaged Electron-Node child/channel, healthy readiness or early cancellation, close request | Pass, four modes | API-07-result.json: early cancel complete-before-exit0 407ms; healthy complete-before-exit0 52ms; injected cleanup-unconfirmed failed-before-exit1 50ms; disconnected channel exit1/no false complete 52ms; per-mode logs | Fault wrapper throws only after real cleanup. Actual transport, not Windows parent/taskkill certification. Reused IMP-28 owns deterministic force/updater continuation without installing. |
| API-08 Reused R2 repository | IMP-34 unchanged21 backend/registry + IMP-42/43 corrected255 + IMP-41 web24; exact ledger commands | Pass,300 unique | IMP34/41/42/43 log headers/result tails. IMP42 had4 GraphQL realm fixture failures; IMP43 fixes all4 in10-case rerun; six previously passing not double-counted | Current source9bd72c208; new tests Still Valid. Actual provider/panel evidence independently required. IMP45 controlled rendering is supporting only. |
| API-09 phase A live query/UI | C + API-09-desktop-visibility.mjs; actual Codex conversation, public query, real chat route/Activity panel, collapse/reopen/reload, child natural exit0 | Pass | API-09-result.json `running snapshot`, `panel live response`, `reopened and reloaded`, `natural completion`; same task completed exit0, model calls stay2; running/completed.png; run/application.log | No intercepted query or fake contexts. Quiet quit807ms after natural exit is not active-work cleanup evidence. |
| API-09 phase B selection/lifecycle | C + API-09B-selection-lifecycle.mjs; two actual live runs, foreground+yielded tools; select A/B; A self-exit7, B remains running; terminate A then inspect; live B restart; fresh live C quit | Pass | API-09B-result.json selected panel A/B, failed exit7, inactive read, restart active Codex1590ms, quit active Codex203ms; three child PIDs/ports absent; sentinel/data intact; A/B/C screenshots, run/application.log | Foreground excluded from background rows. Idle is preserved; no BACKGROUND_TASK_UPDATED injected. Calls4 during selection/completion observation,6 only after fresh C inference. Current full host/desktop cleanup, not client.close shortcut. |
| API-10 actual unresponsive provider | C + API-10-provider-unavailable.mjs; exact own listener ancestry reaches own desktop, SIGSTOP captured actual Codex app-server, live query/panel, SIGCONT recovery, normal quit | Pass | API-10-result.json `bounded unavailable`5005ms, `last known panel`, `recovered actual provider`: same task, calls2 unchanged, listener426; postquit602ms all absent/sentinel200; unavailable/recovered.png; run/application.log | Harness-only fault, no production query interception. First-row/history counts clearly unconfirmed; no false empty/success. Unknown/missing-terminal/unsupported and stale response races proven deterministically by API-08. |

## Fixture corrections (not product failures)
- API-04 attempt1 used native-only ensureProviderModelCatalog for Codex; use external runtime snapshot query. No tool launched. Preserved attempt1 files; CLI forced cleanup is not graceful success.
- API-09B attempt1 observed the previous route surface before asynchronous selection hydration, toggling Activity incorrectly. Corrected helper waits exact selected run and settled frame; no fake context writes. A/B actual queries were correct. Prior source/log/result/screenshot preserved; forced fixture cleanup not a shutdown pass.
- API-05 attempt1 assumed clean backend SIGTERM alone must show an error. Corrected supported trigger to actual restart against occupied port, then visible UI retry. No product assertion failed. Prior forced cleanup preserved.
- API-03 attempt1 used GraphQL `modelIdentifier` for the internal public service model's `model_identifier`. Corrected setup; no native tools had launched. Then successful execution; final test helper adds total90s execution budget with reserved cleanup before160s outer timeout and records host PID. Only this affected case reran, prior success retained pre-safety.
- API-07 attempt1 directly launched packaged backend without ServerManager's .env seed. Expected configuration rejection before IPC. Added private test/base-URL seed; prior logs retained, no source fix.

## Acceptance-Criteria Proof — R2
| Criterion | Critical | Cases / direct evidence | Status / limits |
|---|---|---|---|
| AC-001 | Yes | API-05 conflict JSON/screenshot actual port/PID/node, safe visible guidance/no reset | Proven |
| AC-002 | Yes | API-01 IMP28 inspector unavailable/timeout/denied/empty/race/non-address-bind tests; code unchanged | Proven at explicitly required deterministic boundary; no live Windows claim |
| AC-003 | Yes | API-05 retry still426 and refreshed observedAt; release/retry healthy with diagnostic absent | Proven |
| AC-004 | Yes | API-03 standalone4 commands+anchors; API-06B current Studio/native ended/adopted/resistant restart+quit; API-09B current Codex active-work restart+quit | Proven for current host/macOS execution; Windows/WSL runtime not certified |
| AC-005 | Yes | API-01 unknown/identity/force/updater faults; API-03/06B ordinary end retains previews; API-07 failed/unconfirmed/early cancellation wire receipts; API-09B provider cleanup | Proven at real and deterministic boundaries specified; no arbitrary cleanup |
| AC-006 | Yes | API-03/05/06B/09B/10 healthy startup/restart, sentinels/isolated cleanup; final audit | API-owned portion proven. Merged-base/finalization receipt NOT PROVEN HERE: explicitly downstream Delivery authority. No final ticket/merge/release acceptance. |
| AC-007 | Yes | API-09 A natural0 completed; B natural7 failed; actual live query/panel and calls unchanged | Proven |
| AC-008 | Yes | API-09 reopen/reload same backend;09B two live selected identities; API-08 delayed prior node/run response fences and observational lookup | Proven: actual normal selection and deterministic stale-race injection |
| AC-009 | Yes | API-10 real timeout/last-known/recovery;09B inactive unavailable; API-08 unknown missing-terminal, unsupported, malformed/page/deadline and instance fencing | Proven: real operational failure plus required deterministic variants |
| AC-010 | Yes | API-09B real foreground exclusion/strict post-turn transcript retained, safe query/panel, no new model/legacy BG events; API-08 Claude/AGY first-entry/event-stream, idle/hasRunningBackgroundTasks controls, secret args/env/output exclusion | Proven; actual Claude/AGY live inference not rerun for unchanged providers; preserved paths explicitly covered by repository controls |

No behavior marked Only The User Can Check. No test-critical secret/service dependency missing. No unsupported/contrived scenario lowers confidence. No out-of-scope product defect discovered by these checks.

## Confidence / broader-validation gate
Post-repository categories were 50/75/50/75/75/75/90; mean70%. Real provider/list-to-panel and composed host boundaries were critical missing evidence; **Broader Validation Required**. Actual execution above closes those gaps.

| Mandatory category | Final | Support / residual uncertainty |
|---|---:|---|
| Requirement / AC proof |95%|Every executable-stage critical behavior proven by mapped real or specified deterministic boundary. AC-006 Delivery-owned finalization remains a separate downstream gate, not a claim here.|
| Changed-boundary execution directness |98%|Actual provider CLI/tool/query/panel, both composed hosts, native processes/anchors, full desktop restart/quit and packaged IPC. Only targeted fault mechanics emulated.|
| Cross-boundary realism / mock gap |97%|No runtime/query/UI interception in API-09/10. Inference replaced locally; actual app worker/RPC and lifecycle exercised. Artificial list/missing-terminal races retain deterministic proof.|
| Environment / identity / fixture fidelity |90%|Current macOS task-local package, exact process ownership, private roots/credentials-free fixtures. One bounded material uncertainty: actual Windows/WSL runtime/platform paths unrun; mocks are not certification.|
| Failure / edge / lifecycle / recovery |96%|Actual conflict/retry/stale clear, natural/nonzero exits, real provider timeout/recovery, native TERM fallback/ended/adopted cleanup, startup cancellation and actual IPC failure reporting; Windows force/updater deterministic.|
| User surface / desktop shell |95%|Actual current panel and conflict UI with semantic/API assertions, selection/reopen/reload; screenshots inspected for safe/readable labels. IMP45 current locale/narrow rendering reused only as controlled layout evidence.|
| Durable regression relevance |96%|Valid native/Electron fault controls and300 R2 scoped cases plus new full standalone E2E; version-specific Codex desktop scripts retained as reproducible ticket probes, not falsely durable CLI contract tests.|

Arithmetic mean667/7 = **95.3%**; no category below90%. These are validation-confidence percentages, not measured source-code coverage. All executable-stage critical criteria have direct or requirement-prescribed deterministic proof. Residual platform uncertainty is explicit; no material additional safe macOS run selected. Packaging and final integrated evidence remain Delivery responsibilities.

## Durable changes / data / review
New paths only:
- `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-fixture.mjs`

No production edits or test removals. Gate `RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1`, current builds prerequisite, local model only. Mandatory proportional successful-test review on Large/High route. Fixture/runner SHA256 receipts in API-validation-provenance.json identify final test files independent of commit creation.

Legacy/Compatibility Removal check clean; no compatibility-only test added. Persisted data **Not Affected**; sentinels survive real lifecycle, no migration/reset or copies of user data. FU-001 remains existing unrelated full-test-tree TypeScript debt, FU-002 incorporated R2; no new follow-up.

## Not run / delivery constraints
- Actual Windows/WSL, actual updater installation, paid provider inference and historical Nuxt incident: Not Tested; no certification/fix claim. Windows owner/force/IPC/updater sequencing is deterministic coverage only.
- Whole-repository suite and standalone strict vue-tsc: Not Tested; impact-selected checks and project production type policy used. No speculative whole-repo rerun.
- Merge/base refresh/finalization/release/install: Not Tested, not authorized here. Delivery must produce AC-006 merged-base evidence and resolve/retain IMP-44 DMG packaging failure before claiming distribution success.
- No remaining planned executable case silently skipped: API-02 resolved through current actual Studio case; API-03/05/07 completed; current Codex restart and R2 panel/fault paths completed.

## Cleanup / evidence
API-final-cleanup.json read-only audit: **49 exact recorded test PIDs absent;12 private roots absent** across attempts/current runners. Every final successful desktop stop has forced=false and both app ports released; attempted-setup forced cleanup separately labelled. Four API-07 child modes exited with expected codes, ports gone. Standalone final4 commands+anchors absent and host exited. Provider SIGSTOP always reversed before cleanup. No active validation runner or remaining owned instance known. Task-local app, two untracked SDK dist prerequisite directories, evidence and worktree intentionally preserved.

Evidence headers/provenance and compact API-validation-summary.json point to authoritative JSON results and retained full logs. Screenshots API-09B-A-failed, API-10-unavailable and API-05-conflict were visually inspected and agree with semantic assertions; no raw command or stop action in new panel. Raw commands remain in existing transcript, intentionally unchanged.
