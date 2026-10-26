# API/E2E Execution Coverage Report

## Current result — API-REV-003
**Pass, integrated executable-validation stage /95.3% confidence.** Broader validation **Required and completed**. No product findings or fixture failures this round. Large/High unchanged; request proportional renewed test-harness/evidence review. No production or durable test-source edits.

Authority: R2 Approved / D4.1 / SR-001..008 / ARCH-REV-004 / IR-006 / CRR-007 / DR-002. Reviewed source **9b10fcd4d3eee578b9d1d23e1d6ab47f9b950c5c**, reviewed HEAD **13d7f4293e10c4b0f39114169a2e77455a9ef40e**, integrated `origin/personal@0fd9ca4b63bf86fad8e3fa357aa05016cc6d299e`. Prior API-REV-001/00295.3% is historical, not reused as integrated proof; this assessment is recomputed from the new receipts.

Worktree `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`, branch `task/backend-port-conflict-20261024`. No target merge/push/release/install. Delivery still owns fresh-base verification, raw-evidence review, documentation sync and AC-006 finalization. **This is not terminal delivery acceptance or Windows/WSL certification.** No historical Nuxt/Codex incident-fix claim.

Current evidence directory:
`/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/evidence/API-REV-003`

Canonical plan `api-e2e-coverage-investigation.md`; progress `api-e2e-test-progress.md`; history `api-e2e-revision-record.md`. Prior raw evidence remains untouched in parent `evidence/` and `evidence/API-REV-002/`; prior complete report is preserved at commit5f46d5ccf (and baseline at d16a07657). Same resumed run/case IDs, not a duplicate validation task.

## Build / impact / environment
- DR-002 integrates MCP config/vault-resolution/managed-transport foundation; reviewed ticket production delta is synchronous resolver binding after staged vault initialization in server-runtime. No install-time connection/timer/process owner. All selected composed system equivalents renewed on current source; historical API-04/06 not rerun separately. Requirements/design and durable standalone suite unchanged. TESTING.md adds test-only GitHub token aliases, not a live-provider obligation here.
- IMP-66/67/68/69/70/71 logs and exact IMP-75-checks.json commands inspected: **1110 unique passing current foundation cases** (246 core +575 server +156 Electron +123 web +10 dummy-secret real MCP transport). Initial IMP69 110pass/10fail retained; IMP70 focused31 replaces28/adds3, not an extra31. NODE_OPTIONS=--no-experimental-webstorage corrects diagnosed Node26 localStorage-shadow test environment; no production workaround. No affected Nuxt suite repeated here. Dummy transport is not live vault/GitHub certification.
- **IMP-72 full unsigned beta.10 macOS build exit0; DMG verify VALID**, ZIP/blockmaps/provenance available. IMP56 prior success and IMP44 resize35 historical failure preserved. API-build-identity.json directly confirms five compiled/packaged files match IMP72 hashes. No installation/publication performed.
- IMP-73 intercepted renderer and actual no-work preload quit220ms are not actual-provider/active-work proof. Neither substitutes for cases below.
- macOS arm64 / Node26.12.0 / Electron42.11.16. Current task-local unpacked `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`; standalone uses current dist. Private resolved HOME/CODEX_HOME/TMPDIR/data/workspace and ephemeral ports. No signed-in credentials or paid inference.
- Local Responses SSE replaces Codex inference only; CLI/tool execution, provider protocol, GraphQL/WS, actual panel and desktop lifecycle are real. Native Chat Completions/LMStudio fixture similarly replaces only inference. Real standalone host/application worker/RPC/SDK/native tools execute normally.
- Project TESTING/AGENTS and isolated-app instructions followed; one heavy run at a time. Incoming app-data migrations run only in private fixtures. No installed application, user-data reset, arbitrary PID/port cleanup, update installation or unrelated worktree changes.

## Exact commands
All commands run from the worktree root. Define `OUT="$PWD/tickets/in-progress/backend-port-conflict-20261024/evidence/API-REV-003"`.

**S — durable standalone:**
`env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR="$OUT" npm exec --yes --package=pnpm@10.28.2 -- pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch`

**C — each desktop/protocol probe:**
`env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" TEST_API_EVIDENCE_DIR="$OUT" node tickets/in-progress/backend-port-conflict-20261024/evidence/<filename from Cases>`

The six C invocations ran serially via `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node tickets/in-progress/backend-port-conflict-20261024/evidence/API-REV-003/API-run-integrated.mjs`; it records Started/Completed and result row before the next case, refuses existing result outputs, and stops on a nonpass. No automatic retry occurred. Generic durable outputs were renamed API-03-host.log/result.json for ticket evidence.

## Cases — current integrated receipts
Evidence names relative to current evidence directory unless explicitly IMP-prefixed (parent evidence folder). Exact event times/PIDs in JSON are authoritative. All seven executed runners returned exit0 and Pass.

| Case / boundary | Command / trigger | Result and proof | Limits / notes |
|---|---|---|---|
| API-01/08 Reused foundation | IMP-66..71 commands in IMP-75-checks.json |1110 unique pass; logs246/575/156/123/10, current source9b10. Initial web failure/environment correction retained; current build IMP72 | Count once across these IDs. Inspector denied/timeout/race/non-bind errors; identity/unknown ownership; Windows captured-child force/updater; Codex unknown/unsupported/page/instance/stale query; stream/idle/Claude/AGY controls remain at deterministic boundaries. |
| API-02 / API-06B Studio/native | C: `API-06B-desktop-native-current.mjs`; native background + returned-shell adopted child; end initiating run then restart; fresh retained run then quit | API-06B-result.json `post-shutdown`: ended-run restart2675ms, retained-run quit1319ms. Four command/anchor pairs absent, all listener ports gone, resistant child TERM handlers observed, unrelated sentinel200/file unchanged. run/application.log, before1/2.png | Full actual Studio composition and current packaged desktop, not direct scope injection. Active means retained run with completed turn and live background work. API-02 covered once through this case. |
| API-03 standalone durable | S; public application command -> worker/RPC/SDK run launch/stream/end -> native tools -> public host.close | API-03-test.log `1 passed`; result.json host close838ms/exit0/close receipt; first ended initiator previews retained and second run retained, four commands/anchors absent, TERM observed, sentinel200/file preserved; host.log | Same durable files passed CRR-004, unchanged and rerun on integrated source. Full standalone host rather than mocked host helper. |
| API-05 conflict/retry | C: `API-05-conflict-recovery.mjs`; exact captured own backend exits, external fixture426 binds, supported preload restart, visible error, UI retry while held, release fixture then UI retry | API-05-result.json `conflict first`, `retry preserves external owner`, `recovered`: correct port61154/PID8345/node; fresh observedAt, fixture remains426; healthy retry clears diagnostic/overlay, sentinel200/data preserved. conflict/recovered.png and logs | No arbitrary listener kill, no reset; actual default visible guidance inspected. |
| API-07 packaged IPC/faults | C: `API-07-packaged-ipc.mjs`; current packaged Electron-Node actual child/channel | API-07-result.json: startup cancel complete-before-exit0 305ms; healthy complete-before-exit0 51ms; injected cleanup-unconfirmed failed-before-exit1 51ms; disconnected transport exit1/no false complete51ms. Four per-mode logs; ports gone/data intact | Temporary fault throws only after real cleanup; validates failure reporting, not a naturally failing cleanup. Windows parent/taskkill and updater continuation are deterministic foundation proof, no platform certification/install. |
| API-09A Codex natural completion/UI | C: `API-09-desktop-visibility.mjs`; actual conversation yielded listener, live query, normal chat route/Activity panel, collapse/reopen/reload, natural exit0 | API-09-result.json running/panel responses, same task rediscovered, completed exit0; model calls stay2; no page errors; running/completed.png and logs | No intercepted query/fake contexts. Quiet quit707ms after natural completion is not active cleanup proof. |
| API-09B two-run/nonzero/active cleanup | C: `API-09B-selection-lifecycle.mjs`; actual foreground+yielded calls, two live runs, select A/B; A exits7 while B live; terminate A then inspect; live B backend restart; fresh live C full quit | API-09B-result.json selected panel exact task IDs, failed exit7, inactive unavailable; foreground excluded; calls4 unchanged through observation. Restart1591ms and full quit207ms remove exact live children/ports; sentinel/data intact. A/B/C screenshots/logs | Current full composed cleanup, not standalone client.close. Calls6 only after fresh C inference. No new legacy BG events; strict transcript/idle behavior unchanged. |
| API-10 actual unavailable/recovery | C: `API-10-provider-unavailable.mjs`; trace exact own listener ancestry to own desktop; temporarily SIGSTOP captured Codex app-server; query/panel; SIGCONT; active-work quit | API-10-result.json `bounded unavailable`5008ms; actual last-known row/count explicit; same task recovers running/listener426, model calls remain2; quit707ms removes child/app/port; sentinel200/data intact. unavailable/recovered.png and logs | No interception. Harness-only provider unresponsiveness; provider resumed before cleanup. Unknown/missing-terminal variants remain deterministic IMP67/69/70 proof, not fabricated live-provider records. |
| API-04/06 historical | Not rerun by plan | Old raw receipts preserved at d0338db0b; no integrated proof attributed to them | Superseded for current scope by API-06B/09B above, not silent relabelling. |

No fixture or product failure this round; no case retry. Prior API-REV-001 setup mistakes remain historical evidence and are not replayed as current failures.

## Acceptance-Criteria Proof — R2
| Criterion | Critical | Current proof | Status / outstanding authority |
|---|---|---|---|
| AC-001 | Yes | API-05 JSON + inspected conflict screenshot: correct current owner/port, visible safe guidance, reset hidden | Proven |
| AC-002 | Yes | Current IMP68 inspector unavailable/timeout/denied/empty/race/non-address-bind controls | Proven at explicitly prescribed deterministic boundary |
| AC-003 | Yes | API-05 fresh retry preserves fixture426; released fixture permits healthy retry with no stale diagnostic | Proven |
| AC-004 | Yes | API-03 standalone and06B Studio/native real ended/adopted/TERM-resistant ownership, exact process/listener absence;09B actual Codex restart/quit | Proven on current macOS integrated host/desktop; no Windows/WSL runtime certification |
| AC-005 | Yes | Current IMP66..68 identity/unknown/force/updater controls; API03/06B normal end retains previews;07 actual startup/transport/failure receipts;09B provider close | Proven at actual and prescribed fault boundaries |
| AC-006 | Yes | Integrated commit/base recorded; build identity matched;03/05/06B/09B/10 healthy startup/restart/data/no installed app; current cleanup audit | Integrated API-owned portion proven. Delivery fresh-base/docs/raw-proof/finalization receipt remains NOT PROVEN HERE, downstream authority; no terminal delivery claim. |
| AC-007 | Yes |09A actual natural0 completed and09B natural7 failed in live query and actual panel, no model polling | Proven |
| AC-008 | Yes |09A collapse/reopen/reload same backend;09B two actual selected runs; current IMP67/69/70 stale-run/node/client and observational active-instance fences | Proven, real normal paths plus deterministic delayed races |
| AC-009 | Yes |10 actual bounded timeout/unavailable/last-known/retry recovery;09B inactive unavailable; IMP67/69/70 missing-terminal unknown/unsupported/malformed/page/instance fences | Proven |
| AC-010 | Yes |09B actual foreground exclusion, safe query/panel and no extra model/legacy BG event; current IMP67/69/70 Claude/AGY stream rows, idle/hasRunningBackgroundTasks, strict turn gate and secret args/env/output exclusion | Proven; unchanged actual Claude/AGY live inference not repeated |

No behavior assigned Only The User Can Check. No missing dependency blocks validation. No contrived unsupported case included. No product finding/follow-up added.

## Confidence and broader-validation decision
Foundation reuse initially yielded scores50/75/50/75/75/75/95, mean70.7%. **Broader Validation Required**, because integrated real provider-to-panel and composed shutdown had no current proof. Executed all planned renewed equivalents before reassessment.

| Mandatory category | Final | Current evidence / residual uncertainty |
|---|---:|---|
| Requirement / AC proof |95%|Mapped integrated proofs for every executable-stage critical behavior. Delivery-owned AC006 finalization is explicitly downstream, not claimed.|
| Changed-boundary directness |98%|Actual integrated CLI/tools/query/UI, standalone worker/SDK/native host, Studio, shell lifecycle and packaged IPC.|
| Cross-boundary realism / mock gap |97%|No query/UI/runtime interception in actual journeys; only inference and targeted faults emulated. Missing-terminal/timing races deterministic.|
| Environment / identity / fixture fidelity |90%|Current package hashes, private roots and exact process ownership; bounded material uncertainty remains actual Windows/WSL runtime paths not exercised.|
| Failure / lifecycle / recovery |96%|Actual conflict/retry, native TERM fallback/ended/adopted cleanup, natural/nonzero, real provider timeout/recovery, IPC cancellation/unconfirmed; Windows force/update remains deterministic.|
| User / desktop surface |95%|Current real selection/reload/status/count/privacy and conflict UI plus semantic receipts; no page errors in recorded view runners. IMP73 controlled layout feedback not elevated to provider proof.|
| Durable regression relevance |96%|1110 current foundation cases + unchanged real standalone E2E rerun; version-specific real Codex desktop scripts retained as temporary executable probes.|

Mean667/7 = **95.3%**, independently recomputed from this round's evidence; no category below90%. Percentages are validation confidence, not measured source coverage. Broader validation **Required and completed**. No additional safe macOS run selected: current proof covers planned paths. Windows/WSL uncertainty remains explicit, not certification.

## Test/probe changes / data / review
- No new or changed durable suite files. Existing `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts` and `native-standalone-host-fixture.mjs` retain CRR-004 hashes and pass on the integrated foundation.
- Existing six ticket probes are unchanged from API-REV-002. This round copies sequential orchestration with source/output directory constants and a report-marker guard; it records progress, stops on failure and refuses duplicate outputs. No behavior assertion removed or product source changed. Exact script hashes in current API-validation-provenance.json.
- Large/High route: renewed proportional harness/evidence review requested. No duplicate source-implementation ownership assumed.
- Ticket persisted-data decision Not Affected remains; incoming base migrations preserved and run only in private setup. Sentinels survive real lifecycle. No ticket migration, compatibility fallback or user-data changes. Legacy/removal checks remain clean. FU001 unchanged typing debt; FU002 incorporated R2.

## Not tested / downstream gates
- Actual Windows/WSL, live vault/GitHub, paid inference, installer/updater execution, historical Nuxt incident and standalone strict vue-tsc: Not Tested; foundation mocks/production build types are not certification of these.
- Whole-repository suite: Not Tested; current impact-selected1110 checks reused, all affected system cases rerun.
- Target merge/push, fresh-base Delivery recheck, long-lived docs synchronization, release/install/finalization: Not Tested / not this role's authority. Delivery must complete AC006 gates, including pending-implementation wording in design cases. Current IMP72 package success does not itself authorize release/install.
- No planned current executable case skipped. API02 represented by06B once; historical04/06 deliberately not duplicated.

## Cleanup and evidence
Current **API-final-cleanup.json:35 exact recorded test PIDs absent;7 private roots absent**. All final desktop CLI receipts forced=false, control/backend ports released; actual normal quit/restart assertions precede registry cleanup. Standalone host and four command/anchor pairs absent. API07 modes exited as expected with no health listeners. API10 provider resumed before quit. No remaining validation runner, owned process or instance known. Task-local build/worktree and two untracked SDK dist prerequisites intentionally preserved.

API-validation-summary.json contains compact assertion receipts; API-build-identity.json confirms current packaged content; full per-case JSON/logs/screenshots retained. Current API09B-A-failed, API05-conflict and API10-unavailable screenshots visually inspected, consistent with semantic assertions. Safe executable/time/opaque ID/exit visible, no new raw-command or stop control; existing transcript remains intentionally unchanged. Earlier receipts/audit remain exact-source historical, never overwritten.
