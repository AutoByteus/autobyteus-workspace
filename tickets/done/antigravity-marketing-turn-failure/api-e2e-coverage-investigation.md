# API/E2E Coverage Investigation

## Investigation Meta
- Round: 1; trigger: Implementation Complete IR-001, commits 29c1fa66b / c0c7c858e.
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure.
- Canonical ticket root: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure/tickets/in-progress/antigravity-marketing-turn-failure.
- Active inputs (under ticket root): requirements-doc.md (SR-002 Approved), investigation-notes.md (E-001–006), design-spec.md (SR-003 Ready), solution-revision-record.md, solution-result.md, implementation-handoff.md, implementation-revision-record.md.
- Supplements: evidence/runtime-summary.json, provider-quota-log-excerpts.txt, deployed-terminal-result-snippet.txt, both *source-evidence.json; history/SR-001 and SR-002 snapshots are superseded audit context, not authority. Implementation checks, typecheck limitation, render inspection and cleanup remain relevant.
- Architecture review/report/revision and source review/report/revision: N/A — not applicable. Delivery re-entry: N/A.
- Prior API/E2E result: N/A. API/E2E revision record: api-e2e-revision-record.md; current revision API-REV-001 (baseline completed below).
- Latest authoritative investigation: this file; initialized before any coverage edits/execution.

## Routing Classification
- task_size: Medium; architectural_risk: Low; Direct Low-Risk.
- Successful-output route: Delivery (subject to final rule lookup).
- Test-code review: Not Required — direct low-risk route.

## Current Requirement And Design Basis
REQ-001/002 require supplied useful quota/limit/unfamiliar message/hints through existing error cards. REQ-003 requires existing redaction, inert rendering, no private response/log serialization, missing-message fallback and no arbitrary ordinary-message cap. REQ-004 preserves truthful failed turns, completed tools/partial text, exact run/provider identity, existing data/config and user-driven next turn. AC-001–005 are critical in scope. Two changed producers only: AGY string/record.message selection and Claude errors[] after existing scalar precedence; public contracts/lifecycle/renderer unchanged.

## Supported Scenarios And Real Usage
SCN-001 quota after partial work; SCN-002 next ordinary user turn after failure; SCN-003 missing/malformed/credential/markup error; SCN-004 useful unfamiliar/rate-limit message. Agent, hosted Team and Org are supported public paths. Added validation case: quiescent stop/restore of a test-owned failed Agent with exact conversation binding (normal documented lifecycle, not automatic recovery). No unsupported/contrived designer scenarios; no race/parallel-tab/artificial quota exhaustion tests.

## Changed Behavior / Boundary Classification
| Surface | Change / preserved | Existing evidence / material gap | Selected proof |
| --- | --- | --- | --- |
| Backend / external adapter | Two message extractions changed | Converter/resolver/session unit tests valid; no real public journey | Focused units then fake CLI through real runtime |
| API / WebSocket / contract | Unchanged but critical downstream | Existing AGY transport only denies tool/credential-only error; no quota/member/continuation cases | Extend Agent + Team + Org transport cases |
| Frontend / state / browser / web-equivalent desktop renderer | Unchanged shared handler/card | Unit + implementation static browser preview; live public stream to production service/card unproven | Owned Nuxt browser fixture with real WebSocket/services |
| Authentication / permissions | Existing credential redaction preserved; remote auth unchanged | Existing redaction units; no new auth contract | Credential/private response negatives; native-image denial preserved |
| Process / lifecycle | Settlement, continuity and restore unchanged | Local AGY/Claude lifecycle units; public identity/partial work gap | Failed→next-user-turn and exact restore controls |
| Persistence | Directly Usable — No Migration | No schema/read/write delta; existing generic string remains valid | Normal projection reader before/after termination/restore; saved generic card reader regression |
| Worker / distributed coordination | No change | No new scheduling/queue | N/A |
| Desktop shell | No change | No IPC/preload/window/package delta | N/A; browser proves only web-equivalent renderer |

## Project Execution Discovery
| Instruction/config path | Learned authority / setup |
| --- | --- |
| TESTING.md (no closer applicable TESTING found) | Narrow server units → controlled AGY real-server E2E → web-equivalent browser probe; fake CLI flag; never user's app/data |
| autobyteus-server-ts/AGENTS.md; autobyteus-web/AGENTS.md | Vitest run --no-watch; Nuxt test --run; explicit paths only for staging |
| README.md Local full-stack; server/web README testing | pnpm dev is real dev stack; selected test-owned server helper + Nuxt probe avoid occupied default ports/data |
| server/package.json; vitest.config.ts; tests/setup/prisma-{env,global-setup,test-config}.ts | pnpm prepare:shared before direct Vitest; fileParallelism=false; test-owned worktree tests/.tmp SQLite reset, not developer/user DB |
| tests/e2e/helpers/studio-runtime-test-server.ts | buildStudioServer real app/runtime/MCP; port 0; prepare/recover lifecycle; app.close cleanup |
| tests/fixtures/agy-failure-cli.mjs | Existing deterministic protocol fixture, inherited AGY_FAKE_CASE and optional launch log; extend, don't substitute real provider |
| web/package.json; tests/e2e/*probe.mjs and fixture pages | Nuxt prepare, copy owned page temporarily, ephemeral port, own headless Chrome via playwright-core; remove/stop own resources |

No required secrets/accounts. Node 22.23.1 / pnpm 10.28.2 installed. SDK pin 0.3.280. No command will target localhost:8001, read authentication secrets or reuse user marketing state. Standard typecheck known TS6059 rootDir/include mismatch is retained, not treated as a pass or widened into config repair.

| Component / fixture | Setup / readiness | Ownership / cleanup |
| --- | --- | --- |
| Shared dependencies | pnpm -C autobyteus-server-ts prepare:shared; Prisma generate | Only this worktree generated outputs; remove newly untracked SDK dist at end |
| Real studio test server | Existing helper; GraphQL + stream CONNECTED/snapshot/lifecycle | Suite-owned dataDir/workspaces/processes/socket; terminate exact runs, close app, remove dataDir |
| Database | Existing worktree test setup; no simultaneous worktree test process | tests/.tmp test DB only; do not touch home/8001 DB |
| Runtime fixture | AGY_FAKE_CASE=runtime_error; synthetic public commands, completed fake tool/partial response, useful/malformed terminal frames | Unique provider conversation; launch/input audit under dataDir; no real model/tools |
| Browser | Owned Nuxt fixture + real Agent/Team streaming services; real-server public URL manifest | Owned Chrome/context/Nuxt/page only; child finally cleanup receipts |

## Persisted Data Transition Coverage Basis
Directly Usable — No Migration per design and handoff. Existing error message slots remain strings, old generic text remains valid. No error archive/migration promise. Prove unchanged normal readers/projections preserve completed work and config before/after normal continuation/restore; no user data fixtures.

## Existing Durable Coverage Inventory
| Paths (relative worktree) | Intent / validity | Decision/action |
| --- | --- | --- |
| server tests/unit/agent-execution/backends/antigravity/{agy-stream-event-converter,agy-turn-lifecycle,agy-provider-diagnostic-sink}.test.ts | Updated normal text, fallback, private sink, truthful failure / continuation | Still Valid; rerun |
| server tests/unit/agent-execution/backends/claude/session/{claude-session-output-events,claude-session,claude-turn-tracker}.test.ts | Scalar/list precedence, redaction, auth and settlement | Still Valid; rerun; SDK provider itself emulated |
| server tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts and Native/Codex/ACP converters/session | Preserve already informative paths/provider metadata | Still Valid; rerun proportionately |
| server tests/e2e/runtime/agy-failure-transport.e2e.test.ts + tests/fixtures/agy-failure-cli.mjs | Real Agent public redaction/history/private diagnostics | Needs Update: existing assertions valid but incomplete. Extend without dropping denial/privacy |
| web ErrorSegment.spec.ts / agentStatusHandler.spec.ts / web-boundary-guard.integration.test.ts | Useful text and inert component/current dependency boundary | Still Valid; rerun; add old generic-reader proof if absent |
| web AgentStreamingService / TeamStreamingService / Org streaming tests | Real current projection contracts | Still Valid; inspect/use current services in browser, no replacement |
| AGY native-image/background/MCP transport suites | Adjacent existing shared fixture modes | Still Valid; execute targeted shared-fixture regressions |
| Live provider/Desktop packaging suites | External capacity or shell, unchanged and excluded | Out Of Scope; not counted as passes |

## Durable Coverage Changes Planned
| Case IDs | Action / path | Requirement evidence |
| --- | --- | --- |
| API-A/T/O-01..07; API-C01/C02 | Extend existing AGY fixture/transport suite: quota, unfamiliar, structured rate text, absent, empty, nontext, credential+markup/private response; all three public paths; next turn/partial work/identity; Agent stop/restore | AC-001–005; DS-001–004 |
| API-D01 | Retain existing native-image tool denial case and privacy/permissions assertions | AC-003/005 |
| UI-A/T-01..07 | Add durable web-owned browser probe and fixture; real server suite provides owned run manifest and optionally invokes probe; actual services feed current ErrorSegment, ordinary user submits trigger runtime | AC-001–004; closes public→DOM gap |

No durable coverage removed. No obsolete assertion discovered requiring deletion. Temporary-only checks: source diff/build-output/cleanup inspection (not product regression coverage).

## Repository Execution Plan
1. prepare:shared + Prisma generation.
2. Focused AGY/Claude 6 unit files, then preserved Native/Codex/ACP/Agent projection files.
3. Extended controlled failure transport (Agent/Team/Org), then existing background/MCP fixture regressions.
4. Web handler/component/guard and representative streaming tests.
5. Update confidence before optional integrated browser invocation; broader Browser Required initially because real transport→rendered card still unproven. Browser reuses controlled real server rather than synthetic replay.
Exact commands/results will be appended as executed under evidence/api-e2e/.

## Ledger / Initial Confidence / Broader Decision
Ledger required: Yes, multiple independently meaningful cases and long-running browser/server work. Canonical api-e2e-test-case-ledger.md initialized before execution. Scores pending repository execution; no confidence/pass inferred from implementation's checks.
Broader validation: Required; Browser (web-equivalent). Expected gain: actual WebSocket parsing/projection/identity→inert visible message plus next user-turn continuity. No Electron shell change; isolated packaged desktop unnecessary because this is a bounded renderer+runtime contract proof, not a full Library→launch product journey.
Live plan: real suite starts server on port 0 with disposable data; public GraphQL creates run, browser consumes actual server streams; fixture alone replaces external CLI. Chrome DOM/state/WS events correlate with server-side fixture input and history logs; screenshots supplemental. Stop only owned resources.

## Not Tested / Escalation
Live quota availability/real provider recovery, installed app, user's historical marketing data, packaged Electron shell: outside approved repair proof, no claim. No unavailable secret is needed for deterministic scope. Any material implementation/projection/rendering failure will be retained and preliminary-classified, then rule-routed for failure-origin review. Proceed: Yes; durable additions/updates: Yes; reroute before execution: No.

## Execution Discovery Update — first transport attempt
171 focused units passed. First isolated Agent quota probe passed; full first matrix: 16 passed / 8 failed / browser 1 skipped. Seven Team cases never launched because my new fixture omitted required explicit member launch configs; restore probe used nonexistent scalar GraphQL fields. Both are API/E2E-owned test setup errors, not implementation defects or validated product failures. Current public schema/established Team E2E examples supply correction; no requirement/design change or coverage removal. Initial log retained as evidence/api-e2e/transport-initial.log and failed ledger events retained; correct setup then recheck all eight before broader execution.

Corrected Team launch: all seven Team cases pass. Restore setup second attempt still used a nonexistent runtimeReference.platformAgentRunId; current GraphQL reference is runtimeKind/sessionId/threadId/metadata. This additional API/E2E schema-assumption error is retained in transport-corrected.log, corrected without weakening identity assertions.

## Coverage Addition Before Further Execution
Existing tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts contains a valid deterministic ClaudeSdkClient streaming-input query boundary (SDK module only emulated), real ClaudeSession/backend/AgentRun/pipeline and Fastify Agent WebSocket; repository service lookup/status/persistence is a controlled harness, not full studio bootstrap. Add API-CL01–04 for SDK errors[] rate/hint+redaction, unfamiliar text, scalar precedence and missing-message fallback followed by same-process success. This closes the remaining Claude resolver→session→canonical→public-wire gap without live credentials or duplicating runtime infrastructure. Existing four deterministic lifecycle cases remain Still Valid; live case Out Of Scope.

Claude initial addition: four existing deterministic cases pass, four new cases fail at my assumed public code/first-ERROR assertion. Current terminal builder code is CLAUDE_RUNTIME_TURN_FAILED (not invented CLAUDE_RUNTIME_ERROR). The fixture also emitted separate incomplete assistant messages for text/tool; corrected to the current ordered single assistant content-block shape. Terminal error selection now uses existing effect=terminal, not an earlier segment diagnostic. Initial log/ledger retained. This is an API/E2E-owned fixture/assertion correction; no runtime source edited. Recheck actual terminal text and absence of invalid segment diagnostic before accepting evidence.

Further Claude evidence inspection (before accepting confidence): assertion-pass burst run carried three segment lifecycle diagnostics before the correct terminal cause. The scripted SDK emitted model text, tool start/result and later model failure synchronously within one input callback, allowing future terminal state to overtake queued source events. This is not the normal external tool→next model-call sequence this case represents. Refined provider emulation to publish tool start, independently publish completion after the observable started phase, then publish subsequent model failure after the observable completion phase; no forced races or runtime edits. Added exact one-ERROR assertion. Burst transcript and all frames preserved in claude-wire-burst.log/claude-burst-evidence.json; those intermediate assertion passes do not establish final scenario fidelity. Recheck before browser/confidence gate.

Claude staged external sequence final: 8 deterministic passes / live 1 skipped, and retained API-CL01–04 public frames contain exactly one terminal error each (no segment diagnostic). Same SDK session/process and completed tool fact retained. Final setup now matches the supported ordinary provider-work sequence; intermediate burst passes are not the scenario sign-off.

## Post-Repository Confidence Scorecard — before integrated browser
Evidence: 171 focused backend + 120 preserved-path + 82 web assertions pass; controlled AGY 24 pass / browser 1 not yet run; shared fixture 3 pass; Claude wire 8 pass / real-provider 1 skipped. Prior authored setup/assertion issues corrected and retained. No product-source correction required.

| Mandatory category | Score | Support | Remaining uncertainty / next proof |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Useful shapes, secrets/privacy, lifecycle/data proven through API; static component proof | Critical AC-001 actual public→rendered card still missing; integrated browser |
| Changed-boundary execution directness | 95% | Both production producer branches execute through real sessions/AgentRun/public wire; AGY full studio | External providers deliberately emulated, not live recovery |
| Cross-boundary integration realism/mock gap | 90% | Full AGY GraphQL/Agent/Team/Org WS + current projection/persisted facts; actual Claude client/session/WS | Browser stream/parser/service integration not yet executed |
| Environment/configuration/identity/fixtures | 95% | Exact owned app data/db, current SDK shape, public launch configs, distinct provider identities, exact Agent restore | Fixture replaces capacity/SDK process only; no actual provider account claim |
| Failure/edge/lifecycle/recovery | 95% | 21 shape+scope failure→explicit success cases, no auto inputs, same conversation, persisted successful tools, exact restore; Claude same session | External quota availability excluded by approved scope |
| User-surface/browser/desktop-shell | 75% | 82 current web tests and upstream inspected static renderer | No actual public transport→DOM; browser required. Shell N/A (unchanged) |
| Durable regression quality/relevance | 95% | Narrow existing-fixture extensions, current external contract shape, existing negatives retained; setup errors corrected | Browser automation added but not yet proven |

Overall: **90.71%**, arithmetic mean (635/7). Critical acceptance criteria all directly proven: **No** (AC-001/003 actual integrated DOM pending). Applicable category below 90%: user-surface 75%. Clean 95% target: No.
Broader validation decision: **Required — Browser**. Select existing TESTING.md Nuxt dev-path with real owned server, AgentStreamingService and TeamStreamingService and normal AIMessage/ErrorSegment renderer. Expected direct proof of all seven message shapes, inert markup, redaction/private-response exclusion, 1280/390 wrapping and subsequent user send retaining completed tool activity. Target confidence 95% across categories. This is web-equivalent contract validation, not packaged desktop or a full Library/launch UI journey. No user app/node/data access.

Integrated browser first attempt: all seven Agent shape/card assertions passed with no browser errors/dialogs; next-turn transport assertion counted two completions across *all* page sockets. Server log shows the normal app background subscription and fixture subscription to the same Agent (distinct sessions), plus background Team subscription. This page-wide counting is not a valid duplicate-turn assertion. API/E2E-owned observation correction: correlate each real outgoing user command to its exact WebSocket connection, assert one send and one completion on that connection (do not deduplicate messages), and additionally retain/assert server fixture inputs and normal projections. Keep first failed attempt browser-evidence-initial.json/browser-server-initial.log; Team browser case was not reached. No product change inferred.

## Broader Execution Result / Final Integrated Recheck Plan
Corrected browser observation passes Agent and Team journeys (14 shape/card steps + 2 next user turns). Exact connection correlation proves one outgoing command/completion; server audit confirms exactly 16 inputs, two distinct provider conversations, seven preserved successful tools per projection. No browser errors/dialogs. Cropped 390 quota/1280 credential screenshots visually inspected: useful cause readable, normal card hierarchy, inert markup. UI gap closed. Added only test safety: helper reports actual closed socket/server/data state, shared optional case-ledger helper avoids importing the AGY composition into Claude suite, browser cancellation/watchdog retains finally cleanup. Run all affected durable E2E files together with optional browser enabled as final source/test-state recheck; strict production server build and actual web boundary guard remain additional prerequisites, not full workspace certification.

Final combined E2E first recheck: 35 pass / 1 fail / live-Claude 1 skipped. Both browser journeys pass with no client errors; outer server-correlation assertion counted the entire shared fixture audit (44 earlier Node journey inputs + 16 browser inputs = 60), rather than just the browser interval. API/E2E-owned suite-isolation assertion correction: record audit offset immediately before browser journeys and assert exact subsequent 16 inputs. Added API-B01 outer ledger case so renderer Pass cannot hide backend-correlation Fail. Retain final-e2e-initial.log/browser-server-correlation-initial.json; repeat full combined suite to verify same-suite scope and no duplicate send.


## Final Execution / Confidence / Result — API-REV-001
Final combined E2E with browser enabled: **4 files passed; 36 tests passed; 1 opt-in live-Claude test skipped**, exit 0, `evidence/api-e2e/final-e2e.log`. Both UI journeys have seven actual public-frame→DOM checkpoints plus successful explicit continuation. Outer API-B01 correlation now proves exactly 16 browser-origin inputs, two distinct stable conversations, seven preserved successful tool facts per member; no automatic/duplicate input. Latest browser ran 2026-10-03 13:20:19–13:20:32 UTC, server 127.0.0.1:64544, Nuxt 127.0.0.1:64578, Chrome 154.0.8037.97, zero recorded console/page errors/dialogs. This closes the integrated renderer/contract gap, not a full packaged launch journey or live recovery claim.

Strict production build independently passed: `pnpm -C autobyteus-server-ts build`, shared builds + Prisma generation + `tsc -p tsconfig.build.json` + sanitized built-module/bootstrap smoke, `evidence/api-e2e/server-build.log`. Standard broader typecheck's inherited 836 TS6059 errors remain a limitation, not a pass; unchanged tsconfig not repaired. Actual web boundary guard passed separately. Unique checks: 291 backend unit, 82 web, 36 E2E = **409 passed**, one live case skipped; reruns not added to that total.

| Mandatory category | Post-repository | Final | Final direct proof / residual |
| --- | --- | --- | --- |
| Requirements / acceptance criteria | 90% | 95% | AC-001–005 producer/public-wire/current-card, privacy, work and continuity proofs joined; no live quota guarantee |
| Changed-boundary directness | 95% | 95% | Both real producer/session/canonical paths; actual AGY runtime/GraphQL/WS; fixture only emulates external provider |
| Cross-boundary integration realism / mock gap | 90% | 95% | Actual browser services/WS/rendering joined to full studio AGY; Claude current SDK/session/public path (lookup/persistence harness controlled) |
| Environment / configuration / identity / fixture fidelity | 95% | 95% | Current protocol shape, separate owned identities/config and exact restore; provider accounts deliberately not involved |
| Failure / edge / lifecycle / recovery | 95% | 95% | All seven shapes across three scopes; next explicit turn/no auto retry; completed work/same binding and normal stop/restore |
| User-surface / browser / desktop-shell | 75% | 95% | Both production services and shared card, inert markup, two widths, continuation; unchanged shell not an applicable evidence target |
| Durable regression coverage quality / relevance | 95% | 95% | All seven durable paths exercised together; existing denial/shared-fixture/lifecycle regressions retained; no invalid compatibility tests |

Final arithmetic mean: **665/7 = 95%** (post-repository 635/7 = 90.71%; gain 4.29 points). All critical AC directly proven: Yes. Applicable category below 90%: No. Broader validation **Required — Browser; executed successfully**. No material unresolved broader risk in the approved scope. No code/design/requirements reroute required; own setup/instrumentation corrections are preserved, not hidden or product changes.

Cleanup: owned server/sockets/runs/data, Chrome/Nuxt and installed temporary page closed/removed; exact ports now have no listeners. Removed only our untracked generated shared SDK dist and assigned test SQLite files; rerun prepare:shared before further tests. Actual receipts: `cleanup.json`, `browser-evidence.json.cleanup`, `final-cleanup.json`. localhost:8001, installed desktop, provider credentials and user marketing state untouched. Delivery retains docs sync, explicit user verification, finalization/release/deployment decisions. Durable test commit **3e42d6a77bcdeed199df40fefba6462ae5239bd8**; only trailing blank-line whitespace was cleaned after the final executable suite. Latest authoritative result: **Pass — 95%**, canonical execution report and API-REV-001 now capture this baseline.

## Final Handoff Rule Evaluation
Current get_handoff_rules selects the sole matching Pass + Direct Medium/Low + no test review rule, exact recipient **/delivery_engineer**. Reviewed-route pass, failure-origin review and upstream-gap conditions do not apply. Cumulative artifacts are persisted before the send; delivery owns remaining gates.
