# API/E2E Execution Coverage Report

## Round / Current state
**Paused at user request; validation incomplete, no overall Pass/Fail/Blocked verdict.** Round1 entered from CRR-002. No active test was interrupted: completed runners had exited before pause arrived. API-REV N/A until first completed validation result. Plan `api-e2e-coverage-investigation.md`; append-only log `api-e2e-test-progress.md`.
R1 Approved/D3.1/SR-001..006/ARCH-REV-003/IR-003/CRR-002. Newly approved read-only background visibility is being authored by Solution Designer as R2/design revision; no expanded-ticket acceptance inferred from these R1 checks. Resume only after user/coordinator direction and current package review.
Evidence folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/evidence`.

## Routing / environment
Large/High, Reviewed. Successful durable changes require proportional Code Review; no successful-output handoff now. No durable suite/source edits so far; ticket-owned probes only.
ENV-1: macOS arm64 Node26.12.0, actual unsigned task-local Electron42.11.16 package at d0338db0b; tested HEAD5fd30310e contains only later docs/evidence. Private HOME/CODEX_HOME, data/workspace, assigned ports, no credentials or paid inference. Commands below run from worktree root. ENV-R: original implementation environments at d0338db0b, reused rather than rerun. Source diff from d0338db0b to5fd30310e contains ticket documentation/evidence only.

## Cases
| Case | Criteria / boundary | Exact command or steps | Env | Result | Evidence / look for | Limits |
|---|---|---|---|---|---|---|
| API-01 | AC-002/004/005, partial001/003/006; repository | Reused IMP-23/25/26/27/28/29/30/31, exact commands in implementation-check-ledger.md | ENV-R | Pass | IMP-23:8 passed;25:132;27:209;28:141;29:11;26/30 exit0;31 Build completed | 501 durable cases; existing mock boundaries not whole-host proof |
| API-04 | AC-004/005/006 Codex quit | `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node tickets/in-progress/backend-port-conflict-20261024/evidence/API-04-desktop-codex.mjs`; public GraphQL/WS create run/send message → real Codex exec_command → TURN_COMPLETED while listener live → normal preload startShutdown | ENV-1 | Pass, scoped | API-04-result.json postquit: elapsedMs807, desktopAbsent/childAbsent true, listenerStatus null, sentinelStatus200, data unchanged; API-04-run.log actual tool/turn frames; API-04-application.log | Full packaged host+desktop quit, not standalone client.close. Restart and historical Nuxt reproduction not proven |
| API-06 | AC-004/005/006 native restart/quit | `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node tickets/in-progress/backend-port-conflict-20261024/evidence/API-06-desktop-native.mjs`; public custom-provider+agent/run APIs/WS, real start_background_process TERM-resistant child + run_bash returned-shell survivor; terminate agent, verify both previews still live, actual restartServer; new active run same forms then startShutdown | ENV-1 | Pass, scoped | API-06-result.json post-shutdown turn1 restart2696ms, turn2 quit1316ms: all4 listeners and4 anchors absent, listenerStatus null, resistant children termObserved true, unrelated sentinel200/data unchanged; API-06-run.log tool outputs/turn and terminate result; API-06-application.log | Native model inference is local SSE; all tool/runtime/host/shell actions real. Active means retained run with completed turn and live background work, not an in-flight model request |
| API-02 | AC-004/005/006 full Studio durable regression | Planned normal native runtime/host close suite | — | Not Tested | None | Not started before requested pause; API-06 does cover actual Studio injection through packaged backend, but no new durable suite yet |
| API-03 | AC-004/005/006 standalone host | Planned public standalone start/native run/close | — | Not Tested | None | Not started before requested pause; standalone package build prerequisite identified, not run |
| API-05 | AC-001/003/006 current conflict recovery UI | Planned external426 fixture/retry/release/retry | — | Not Tested | None | Pause before start; IMP-20 remains older10990feb1, not current acceptance |
| API-07 | AC-005 actual packaged IPC/fault entry | Planned real captured-child wire/startup controls | — | Not Tested | None | Pause before start; Windows/updater deterministic cases only reused under API-01 |

### Fixture failure retained
API-04 attempt1 invoked native-only `ensureProviderModelCatalog` for Codex. Current model-catalog-service.requireProvider explicitly rejects external runtimes. Corrected probe to normal `providerModelCatalogSnapshots` query. No command had launched in attempt1. Exact own instance cleanup required CLI force; both ports released/root removed. Retained API-04-attempt1-{run.log,result.json,application.log}; not a product failure or graceful-quit pass. Only API-04 reran. Final results above are from corrected fixture.

## Acceptance-Criteria Proof (R1, incomplete)
| Criterion | Critical | Evidence so far | Status / gap |
|---|---|---|---|
| AC-001 | Yes | API-01 component/diagnosis | Not Proven: current isolated visible conflict journey not run |
| AC-002 | Yes | API-01 bounded injected inspection/bind errors | Proven at required deterministic boundary; live Windows not certified |
| AC-003 | Yes | API-01 generation/retry tests | Not Proven: current isolated external-conflict recovery not run |
| AC-004 | Yes | API-04 actual Codex quit; API-06 native ended-run restart and active-run quit, adopted child/TERM fallback, real absence | Not Proven in full: standalone host, Codex restart and remaining planned host paths unrun |
| AC-005 | Yes | API-01 fault/unknown/Windows/updater mocks; API-06 ordinary agent stop preserves preview | Partial / Not Proven in full: remaining actual transport/failure integration |
| AC-006 | Yes | API-04/06 actual healthy startup/restart and sentinel/cleanup | Not Proven in full: Delivery integration/base verification outstanding |
No part designated Only The User Can Check. Expanded visibility criteria await upstream authority; not scored or claimed tested.

## Confidence / broader validation
Post-repository mandatory category scores: requirement/AC50%; changed-boundary75%; cross-boundary50%; environment75%; failure/lifecycle75%; user/desktop75%; durable90%; mean70%. This determined **Broader Validation Required**. Actual desktop execution materially improves native and Codex-quit evidence, but a final score/verdict is deferred while paused and upstream scope changes. No default95% gate or complete acceptance claimed. Critical unrun criteria block Pass irrespective of individual case success.

Selected mode: Project Desktop Validation plus lifecycle/API/WS, not browser substitute. No effect on installed/running user app. Screenshots API-04-before-quit.png, API-06-before-1.png and before-2.png are supporting captured states, not independently inspected visual acceptance. Assertions and process/API receipts are primary proof.

## Data / compatibility / dependencies
Approved persisted-data decision Not Affected. Unique test file remained unchanged across shutdown/restart; no migration/reset or user-data copies. No compatibility-only coverage or runtime fallback introduced. Local Responses SSE emulates Codex model inference; local Chat Completions SSE emulates native inference. Actual provider CLI/tool execution and native command execution are real. Native custom-provider nonsecret placeholder belongs only to the disposable vault. Existing Windows/WSL mock evidence is not platform certification. No installation or update download performed; updater continuation was reused mocked evidence.

## Cleanup / resumption
Both completed probes stopped exact isolated instances using canonical CLI; final stop receipts wasRunning=false/forced=false/controlPortReleased=true/serverPortReleased=true. Model and unrelated-sentinel servers closed, runner sessions exited, owned private roots removed after logs copied. Failed first setup attempt also cleaned its exact instance/root. API-pause-cleanup.json records read-only current absence audit of known PIDs. No remaining test-owned live instance/process/data root known. SDK dist prerequisites and task-local build/worktree intentionally preserved. Only ticket evidence/reports added; no product/suite modification, merge/release/install.
On resume: read progress first, inspect current authoritative requirements/design, reuse completed case IDs/results by impact. Do not rerun completed cases merely because testing paused. Add current visibility coverage only after approved design/implementation/review package. No new tests started after pause.
