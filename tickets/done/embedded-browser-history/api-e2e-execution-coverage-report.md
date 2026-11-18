# API/E2E Execution Coverage Report

## Round
Round 1 / **API-REV-001**, CRR-001 initial reviewed implementation. Plan: `api-e2e-coverage-investigation.md`; history: `api-e2e-revision-record.md`; append-only progress: `api-e2e-test-progress.md` and raw `evidence/API-native/API-progress.jsonl`. No prior API result.
Evidence folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history/tickets/in-progress/embedded-browser-history/evidence`.
Deviations: probe setup/settlement corrections described below; only affected cases rerun. No production change, widened scope, or removed test.

## Routing Classification
- Task size **Medium**, architectural risk **High**, input **Reviewed** (R1/SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001).
- Successful-output route **Code Review**; proportional test-code review **Required** for added durable probe and script registration.
- Returned rule: High-risk API/E2E pass requiring proportional test-code review → `/software_engineering_team/code_reviewer`.

## Tested Builds And Environments
| Env | Commit tested / build | Platform/runtime | Configuration/identity/fixture |
|---|---|---|---|
| ENV-1 | Production `7e2704199a6cf192546506f7e265301aee014dc0`; artifact head `e51d4b103d32da21da2beb784d9bd2d515eb97ad`; retained IMP-07 build | macOS arm64, Node 22.23.3, Electron 42.11.16 | Worktree `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`; canonical isolated-app lifecycle, private root and backend/control ports per launch. English locale, 1200×800 logical native window. No installed app, keys, provider inference or accounts. |
| ENV-2 | Added probe working source on ENV-1; exact final SHA-256 in API-09-audit.log | playwright-core CDP attached only to returned isolated endpoint | Loopback HTTP pages A/B/C/D, hash/SPA controls, same-URL state, popup, explicitly held network response and connection-close failure. Actual user-gesture clicks/type/keyboard, except explicit transport-contract probes through public preload. No product store mutation or page-script traversal injection. |

`API-native/API-environments.json` retains all eight probe start receipts/commands; `API-08-discovery-cleanup.json` retains the separate selector-discovery instance. Each case JSON names its actual instance. Final passing instances: API-03 `iso-49855-1995`; API-04/05 `iso-50065-1066`; API-06 `iso-50501-2ddb`; API-07 `iso-50653-7b85`. These are stopped, not endpoints to reuse.

### Commands and impact ledger
Workdir for launcher commands: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history`.
Shell setup: `export PATH=/opt/homebrew/opt/node@22/bin:/Users/normy/.npm/_npx/116f317e7afab6e7/node_modules/.bin:$PATH` (host pnpm bootstrap; normal installations need only Node22/pnpm10 on PATH).
`RUN` below expands to `pnpm -C autobyteus-web test:e2e:embedded-browser-history --output-dir /Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history/tickets/in-progress/embedded-browser-history/evidence/API-native --native-capture`.
Probe itself calls the project's canonical CLI `start --from-worktree` and `stop <own instanceId>`.

- `git diff --name-only 7e270419 HEAD` before validation: ticket evidence/review/handoff only; no dependencies, production, build configuration or exercised tests changed. IMP-01–07 remain valid. Package.json addition is only a test script, not dependencies/build scripts/version.
- API-03–05 last passed before later **case-local** API-06/07 probe corrections; shared fixture/setup/assertion helpers unchanged afterward. Retain them. API-06 rerun after native-settlement correction; API-07 rerun after drawer/dock setup correction. No second full suite run.
- Final source hash `14d143ed7889efc48b5883cb6fd34f963f8c1ac2c4008f02bb7e4ac19618aa0b`; new test source/evidence committed together at handoff. Product source remains unchanged.

## Cases
All paths here relative to evidence folder. Reused checks inherit exact environment/evidence from implementation-handoff Checks Run.
| Case | Criteria | Boundary / command or steps | Env | Result | Evidence files | Look for | Notes |
|---|---|---|---|---|---|---|---|
| API-01 | AC-001–005 | Reused IMP-01 and IMP-02 | IMP rows | Pass | IMP-01-electron.log; IMP-02-renderer-unit.log | `Tests  39 passed (39)`; `Tests  19 passed (19)` | Source unchanged. Mocked authority/dispatch/observer/store/component evidence, not native acceptance. |
| API-02 | AC-005/006 | Reused IMP-03–07 | IMP rows | Pass | IMP-03.log through IMP-06.log; IMP-07-desktop-build-excerpt.log | `Exit: 0`, guards `Passed`, `Build completed:`, `"ok": true` | Same production/build inputs; no rebuild needed. |
| API-03 | AC-001 | RUN --cases API-03; link A→B→C, toolbar Back B/A then Forward B/C | ENV-1/2 | Pass | API-native/API-03-result.json | `initial A`, `A B C`, four `committed` observations, `"length": 3`, `"result": "Pass"` | Each expected heading/URL and flag asserted; length remains three, no extra traversal entries. |
| API-04 | AC-003/005 | RUN --cases API-04,API-05,API-06,API-07; hash, pushState, same-URL, replaceState; Back→new link/address | ENV-1/2 | Pass | API-native/API-04-result.json | `same URL Back committed, draft retained`, `"address": "unfinished.example/path"`, `replace does not append`, `new link truncates forward`, `new address truncates forward` | Real document state marker distinguishes identical URL entries; replace length asserted unchanged. Later cases in this command had probe-local corrections; this case unchanged. |
| API-05 | AC-002/004 | Same command; two tabs, inactive/malformed/unattached/unavailable preload requests; switch and close while actual Back HTTP request held | ENV-1/2 | Pass | API-native/API-05-result.json | rejected request results; `inactive and unavailable IPC inert`; `pending traversal did not steal selection`; `closed pending traversal cannot reselect` | HTTP request receipt is precondition to switch/close; release then assert background content and retained active tab. Foreign lease/unregistered runtime remain API-01 simulated evidence; no foreign live shell is impersonated. |
| API-06 | AC-004/005 | RUN --cases API-06,API-07; connection-close on Back, wait main-frame stop/error-document commit, Forward recovery; popup/title/history/self-close | ENV-1/2 | Pass | API-native/API-06-result.json | `native failure committed after frameStoppedLoading`, `net::ERR_EMPTY_RESPONSE`, `Forward committed /B/`, `popup adopted and title updated`, `popup destruction preserves opener` | Dispatch exception is API-01 simulation; actual asynchronous failure, recovery and popup lifecycle proven here. Final corrected case passed; no source defect found. |
| API-07 | AC-001/004/005 | RUN --cases API-07; keyboard Back, refresh, drawer/dock/minimum/full-view/mobile/restore, last close | ENV-1/2 | Pass | API-native/API-07-result.json; API-07-panel-native.png, API-07-docked-native.png, API-07-minimum-native.png, API-07-full-view-native.png, API-07-mobile-native.png (all in API-native/) | `keyboard Back, disabled skipped`; form/input widths 434/166, 384/116, 1184/916; mobile width390/dpr3; `empty buttons disabled` | Native screenshots inspected. Disabled Back visibly faded, Forward available; all controls fit, native content below chrome; centered mobile page retained. Renderer screenshots are supplementary only. |
| API-08 | AC-006 validation portion | Every run finally stops own instance, closes fixture, verifies root removal and ports free | ENV-1/2 | Pass | API-native/API-08-cleanups.json; API-08-result.json; API-08-discovery-cleanup.json | all `"result": "Pass"`, `"dataRootRemoved": true`, every ports value true | Eight probe instances plus one discovery instance cleaned. Canonical stop reported forced=true; disclose forced stop, not graceful shutdown. No unrelated process controlled. |
| API-09 | AC-006 validation portion | node --check probe; git diff --check; SHA-256; independent Python result/root/port audit | ENV-1 | Pass | API-09-audit.log | `Probe syntax: PASS`; `Diff whitespace: PASS`; `All 9 owned instance roots removed; ports closed.` | Five final native cases and cleanup files checked; all roots absent and control/backend ports closed. |

## Acceptance-Criteria Proof
| Criterion | Critical at this validation gate | Cases | Result | Scope / remaining work |
|---|---|---|---|---|
| AC-001 | Yes | API-03, API-07; API-01 | Proven | Actual committed document content, toolbar controls and native history length; keyboard also exercised. |
| AC-002 | Yes | API-05, API-06; API-01 | Proven | Independent tabs, switch/close, popup cleanup, inactive targeting; per-tab documents retained. |
| AC-003 | Yes | API-04; API-01 | Proven | Hash/SPA/replace/same-URL content state, flags and branch truncation through real shell/native path. |
| AC-004 | Yes | API-05/06/07; API-01 | Proven | Empty/no-op/rejections, actual pending network switch/close, native load failure and recovery; dispatch-throw/foreign-lease/absent-runtime simulation appropriately reused. |
| AC-005 | Yes | API-04/06/07; API-01/02 | Proven | Draft retained; address/new/switch/close/refresh, 400px minimum panel/full-view/mobile, labels/keyboard/disabled; native capture confirms bounds. |
| AC-006 — validation/isolation/resources | Yes | API-02/08/09 and retained evidence | Proven | Changed-build evidence retained; own data roots/processes/fixtures removed; no user-data/app operations, release or install. |
| AC-006 — integrated base merge, archive, final branch/worktree cleanup | No — delivery-owned gate | None yet | Not Proven | Explicit downstream responsibility in R1/IR/CRR. This is an API/E2E Pass, not overall Task completion or release approval. |

Only-the-user-can-check parts: **None**. No unrun planned in-scope case remains. No missing critical runtime criterion is concealed by stage ownership.

## Validation Confidence Scorecard
Scores assess supported scenarios at this role's gate, not delivery actions or excluded native-browser policies.
| Category | Post-repository | Final | Evidence support | Residual uncertainty | Improvement |
|---|---|---|---|---|---|
| Requirement/AC proof | 75% | 95% | API-03–07 direct AC-001–005; API-08/09 scoped AC-006 | Negligible unenumerated native timing variation; delivery actions not claimed | Delivery integrated impact check |
| Changed-boundary directness | 75% | 95% | Actual UI→preload→IPC→main→native→snapshot; committed content | Rare synchronous native throw is injected in unit, not induced destructively in live shell | Preserve exception regression |
| Integration realism/mock gap | 75% | 95% | Real packaged app/native views and local network; no shell substitution | Foreign lease/absent runtime intentionally simulated at owning boundary | Retain guard tests, not unsafe live mutation |
| Environment/config/identity/fixtures | 95% | 95% | Worktree source/build match; canonical isolation, local HTTP with native user gestures | Platform evidence macOS arm64 only; no account/remote-provider path in scope | Platform smoke if separately required by release |
| Failure/edge/lifecycle/recovery | 90% | 95% | API-05 actual held traversal and close; API-06 error document/recovery/popup | Browser unload/form policies not exhaustively sampled (not promised by R1) | Native engine remains authority |
| UI/browser/desktop-shell | 75% | 95% | API-04 draft; API-07 semantic input and native visual inspection | Runtime locale switched to Chinese not exercised; both catalogs statically guarded | Optional localized smoke, no material layout concern for two short labels |
| Durable regression quality/relevance | 90% | 95% | 58 retained unit/component tests plus new repeatable five-case native probe | New probe still needs proportional independent code review | Requested next gate |

Overall post-repository **82.14%** (575/7), final **95.00%** (665/7), simple unweighted mean. No applicable final category below90%. Default95% target met. Every critical **validation-stage** criterion directly proven. No material broader-validation risk remains for approved scope; no100% claim.

## Broader Validation Decision
**Required → completed**, execution mode **Project Desktop Validation**. Mocked repository checks could not prove native commits, real IPC events, pending-close interaction, native overlay bounds or rendered controls. A browser-only renderer substitute was insufficient. Actual isolated packaged worktree app plus fixture network closed those gaps. Source unchanged, retained build valid; no installed/running-user app touched.

## Probe Corrections / Native Observations
Initial setup used the wrong role for the Browser tab; observed DOM showed it present (API-setup-failure.txt). Corrected to actual visible tab text; setup retries and all receipts retained. No product case ran in those two setup attempts.
API-06 initially called a saved request URL string as a function (API-06-initial-harness-failure.json). After fixing that predicate, an immediate check after requestfailed raced native error-document settlement (API-06-transient-flags.json). A focused diagnostic confirmed subsequent error page/flags/recovery (API-06-diagnostic-settlement.json); final durable test waits main-frame frameStoppedLoading + committed chrome-error URL + shell URL/capabilities. **Network failure is not navigation completion**, just as successful invoke/index is not. No delay-only completion assertion remains.
API-07 first expected a dock resize handle in the normal responsive drawer at1200px with expanded left sidebar (API-07-initial-drawer-setup.json). Corrected only its UI setup: dismiss drawer, collapse left sidebar, reopen tools into dock, drag real handle. Final evidence proves400px dock and full view. These were API-owned test/setup corrections, not implementation findings; historical Fail rows remain in progress/raw evidence, final case results supersede them.

## Compatibility / Persisted Data
Approved persisted-data decision **Not Affected**; no migration, saved-history transition, profile reset or real-data reader change. Existing native view/session partition used; isolated root is newly created by canonical e2e profile, not reset user data. Requirements/design introduce no compatibility allowance. Implementation has no legacy fallback/dual path; new coverage protects none. No reroute needed.

## Durable Coverage Changes
| Path | Change | Cases |
|---|---|---|
| autobyteus-web/tests/e2e/embedded-browser-history-probe.mjs | Added credential-free repeatable packaged native journeys/fixture/cleanup, optional case filter and native capture | API-03–08 |
| autobyteus-web/package.json | Added test:e2e:embedded-browser-history discovery script only | Same |
No existing tests altered/removed; no production change. Attach both for proportional test-code review. Root TESTING.md remains unchanged because this is one ticket's probe, not a global testing-policy change.

## Dependencies Mocked Or Emulated
Local HTML/server represent normal documents/SPA/user actions, held response and socket-close failure; Chromium and Electron are real. No external site/account required. Repository mocks cover sender/foreign lease/absent-runtime/native synchronous throw and observer frame/custom-title contracts; they are not claimed as native acceptance. No worker/distributed/provider/migration boundary affected.

## Temporary Methods And Cleanup
Owned nine isolated instances/root trees all removed; fixture sockets/ports closed (API-08/09). Original application never selected/controlled; no production root/account operation or release/install. Scratch runner/discovery scripts and receipts removed after preserving relevant evidence. Durable probe and evidence retained. Implementation-owned untracked generated SDK dist folders and worktree build deliberately left for delivery; never staged. FU-001/002 remain deferred, no new follow-up.

## Latest Authoritative Result
**Pass — API-REV-001, 95% final confidence.** Broader native validation completed. No product failure or preliminary failure classification; no only-user or blocked part. AC-006 final integration/archive remains expressly **Not Proven / delivery-owned**, not a claim of whole-Task completion. Next `/software_engineering_team/code_reviewer` for proportional review of added durable coverage and evidence.
