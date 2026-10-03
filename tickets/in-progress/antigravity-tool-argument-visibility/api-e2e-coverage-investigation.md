# API/E2E Coverage Investigation — antigravity-tool-argument-visibility

## Investigation Meta / Authority
2026-10-03; round 1, initially written before durable test edits/execution. Trigger: code_reviewer Implementation Review Pass CRR-001 for IR-001. Prior API result: N/A. Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility` (W below); ticket `W/tickets/in-progress/antigravity-tool-argument-visibility` (T below). Canonical ledger: `T/api-e2e-test-case-ledger.md`; report: `T/api-e2e-execution-coverage-report.md`; revision record: `T/api-e2e-revision-record.md` created after completed result.

Cumulative context: T/requirements-doc.md (SR-001 behavior, SR-002 USER-APPROVAL-2026-10-03-FUTURE-ONLY), investigation-notes.md, solution-revision-record.md (SR-001–003), design-spec.md (SR-003), solution-handoff.md, design-review-report.md and architecture-review-revision-record.md (ARCH-REV-001 Pass), implementation-handoff.md and implementation-revision-record.md (IR-001), code-review-report.md and code-review-revision-record.md (CRR-001 Pass). Historical investigation-result.md is not current approval authority. All 13 factual supplements in investigation-notes.md remain active: production-coverage.json, production-selected-calls.json, native-comparison.json, analyze.py, native-probe/{probe.py,launch.json,stdout.jsonl,transcript_full.jsonl,transcript.jsonl,summary.json,timing-probe.py,timing-evidence.json}, architecture-correlation-evidence.json. Implementation/review evidence is contextual, not independent API execution. No normative supplement. Delivery/DR N/A — not applicable before delivery.

## Routing Classification
Medium / High retained; Reviewed route; successful durable-test output requires proportional Code Review, not Delivery. No classification downgrade. No findings at intake.

## Current Requirement And Design Basis
REQ-001–004 / AC-001–006 / BEH-001–004: capture actual typed call-specific native inputs before STARTED on newly observed calls, preserve terminal/background snapshot and ordinary saved history, including newly generated calls after actual restore. Strict bound-conversation adjacent DONE MODEL single-call/native-name/typed-summary recognition; only run_command.CommandLine literal Unicode-ellipsis prefix exception. Optional detail failures stay truthful summaries, not completeness success. No past backfill, result/diff recovery, tool expansion, shared recorder/schema migration, UI redesign or other-runtime change. Directly Usable — No Migration; old summaries must remain byte-identical and readable.

## Supported Scenarios And Changed Boundaries
| Scope | Change / existing proof | Remaining risk / validation |
| --- | --- | --- |
| SCN-001; backend/native file calls; AC-001,002 | Changed provider input read/normalization; typed reader/converter units | Real CLI→backend→first STARTED→disk; write and repeated same-path edit |
| SCN-002; AC-003,006 | Read/grep/find/list/command objects, MCP bypass/image results preserved | Full real transport fields, prefix expansion, MCP/open_tab and native image regressions |
| SCN-003; AC-004 | Generic writer/history/UI unchanged; local sequencer persistence tests | Actual terminate/reopen/restore/new calls with old summary prefix unchanged, no source at reopen |
| SCN-004; AC-005 | Guarded bounded scanner and strict decline units | Transport continues with absent/ambiguous detail, no borrowed inputs |
| MP-001; withheld earlier steps/background | Reverse full-snapshot scan units | Fixture writes later source rows before earlier stream; enriched background close |
| MP-002 / process-close; AC-006 | Pending Stop/close local lifecycle tests | Rerun pending cancellation units and existing real server Stop/failure tests |
| Web-equivalent Activity | Existing ToolActivityItem presentation self-check only | Integrated real live events and history-reader hydration rendered via worktree Nuxt; no Electron-shell code changed |
| Authentication/permissions | Unchanged, fake init uses production skip-permissions contract | Test-owned run identities and exact restore conversation |
| Worker/distributed / desktop shell | Not affected | N/A; no contrived races or desktop packaging requirement added |

No unsupported/contrived scenario is planned. Added cases are existing ordinary resume, withheld/background and Stop/process-close scenarios confirmed in ARCH-REV-001 / CRR-001, not new product requirements.

## Project Execution Discovery
Applicable guideline W/TESTING.md; no closer TESTING file. Read W/autobyteus-server-ts/AGENTS.md and W/autobyteus-web/AGENTS.md; root/parent AGENTS absent. Also root README Local full-stack development, server README Tests, web README Testing, package manifests, server vitest.config.ts, tests/setup/{prisma-env,prisma-global-setup,prisma-test-config}.ts, e2e helpers/studio-runtime-test-server.ts and websocket-command-helpers.ts, existing AGY image/background/MCP/failure tests, runtime docs, Nuxt config and browser-probe conventions.

- Server: documented `pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch`; real Studio composition with random HTTP port and owned MCP host. Vitest fork/no file parallelism; project resets only `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`. Worktree owns this test DB; do not run simultaneous server Vitest jobs.
- Deterministic CLI: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<W>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; disposable HOME hoisted before provider imports, as image-step-output test. Fixture writes only its own brain; source/runtime modules not mocked.
- Live provider: installed `agy` checked directly; test-owned application data/workspace/run/capsule, configured native tools only, no background or image spend. Existing CLI account is prerequisite; no secret extraction/copy or .env credentials. Only new owned provider session may be read; do not alter unrelated provider state.
- Renderer: TESTING permits Nuxt browser dev-path for web-equivalent client/server behavior; use random Nuxt port and BACKEND_NODE_BASE_URL targeting only our random-port Studio server. Normal production stream/history handlers and ToolActivityItem, no inline argument objects. Owned temporary route/probe acceptable for one external-provider inspection; durable deterministic transport remains in repository. No user app/data touched.
- Readiness: server listen/GraphQL result, WebSocket open; Nuxt HTTP ready. Stop exact owned sockets/runs, app, Nuxt and browser; remove owned HOME/app/workspace and temporary page/config. Retain logs/probe/evidence in T/api-e2e-evidence.
- No conflicting guideline. Existing general TS6059 rootDir/include issue is reported, not a new failure or claimed pass.

## Existing Durable Coverage Decisions
| Test group/path | Decision | Why / gap |
| --- | --- | --- |
| server tests/unit/agent-execution/backends/antigravity/agy-{brain-file,native-tool-arguments-reader,native-argument-converter,native-argument-lifecycle,native-argument-persistence}.test.ts | Still Valid | 57 current policy/framing/typed/identity/cancel/persistence tests; local resumed prefix is not actual restoration |
| agy-{turn-lifecycle,stream-event-converter,step-output-reader,task-exit-message-reader,mcp-tool-call,background-task-monitor,stream-process}.test.ts; unit/agent-memory/runtime-tool-trace-sequencer.test.ts | Still Valid | Preserved lifecycle/MCP/image/background/first-write contracts; summary fixtures are valid fallback but not full-input proof |
| e2e/runtime/agy-{failure-transport,background-task-transport,mcp-tool-call-transport,native-image-step-output}.e2e.test.ts | Still Valid | Real HTTP/WebSocket/history preserved boundaries; no change needed |
| Existing web toolLifecycle/history tests; ToolActivityItem | Still Valid | Generic canonical input consumer; no native-source IO or provider shape knowledge required |
| Direct native investigation scripts / controlled component preview | Temporary evidence only | Feasibility and presentation, not implemented backend/system proof |
| Other-runtime/desktop-shell/provider image generation suites | Out Of Scope | No changed boundary or justified spend |

No stale test removals or obsolete assertions. No test validity ambiguity.

## Durable Coverage To Add / Execution Plan
Add `server/tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts` and a narrow native-arguments fixture module used by existing fake CLI. Own HOME before imports. Cases below map approved REQ/AC; no source implementation changes planned.

| Case | Evidence / command order | Planned outcome |
| --- | --- | --- |
| E-001 | New deterministic transport: full typed write/repeated edits/read/grep/find/list/prefix command/background; immediate raw call after STARTED; terminal identity; source removed and terminated normal getRunProjection | Exact objects on first publication/disk/reopen; distinct edits; background snapshot |
| E-002 | Absent / ambiguous source transport | Summary only, normal completion, no fabricated content |
| E-003 | Actual terminate→GraphQL restoreAgentRun→new future calls; fake argv log confirms --conversation; old summary bytes and reader unchanged | Real restoration, no old trace repair |
| R-001 | Focused 13 files / source tsc; then preserved four AGY fake transport files | Valid regressions pass, pending Stop/close retained |
| L-001 | Real native calls through this server/backend, provider exact args→STARTED→terminal→disk/history; final file marker | Direct evidence AC-001–003 not only fake source |
| B-001 | Worktree Nuxt live/reopened rendered Activity using real server stream/projection and production hydration | Rendered JSON equals real verified objects, disclosure/collapse usable |

Ledger required: Yes, multiple meaningful cases and external-provider/browser interruption risk. Record each completed attempt/checkpoint immediately. Narrow new tests first, broader server preserved tests next; optional focused web tests if integrated hydration uncovers a relevant gap. No full unrelated monorepo suite needed.

## Confidence / Broader Validation Decision
Post-repository scorecard pending execution (not a Pass). Broader validation **Required**: fake CLI emulates provider source timing, and transport tests do not render the client. Selected modes Live API/CLI plus Browser dev-path; expected gain is direct current provider association/timing/execution and actual live/saved renderer proof. Desktop shell N/A (no changed shell integration); not claiming full packaged product acceptance. Native source unavailable account/service may be Blocked only after safe documented attempts, never counted as completeness. Final confidence gate ≥95% overall / no applicable category <90%, every critical AC directly proven.

## Temporary Executable / Not Tested / Escalation
Temporary L-001 and B-001 are scoped external-provider observation and one integrated inspection, not durable costly model automation. Keep reproducibility sources; disposable application page is removed. All deterministic regressions remain durable. Future AGY releases, ambiguous multi-call completeness, >2 MiB complete rows and unapproved output/history recovery explicitly outside completeness promise. No findings or reroute trigger yet. Proceed: Yes.

### Execution discovery delta
Initial new transport attempt proved full first/disk/terminal capture, but E-001/E-003 source-removal setup used an invalid UUID-extraction assertion against metadata containing both run and provider IDs. Bounded API-owned test correction: read production's explicit `platformAgentRunId` and assert runtimeKind/UUID. No intended-behavior or source change. Initial evidence retained in native-transport.log. E-002 passed both variants. Per-case ledger finish hook added before final rerun.

## Post-Repository Confidence Scorecard
E-001/002/003 final: 4 tests Pass. Real first STARTED and immediate disk precede terminal; all nine typed inputs/terminal identities and background-close pass, source-free terminated history parity, actual GraphQL restore and exact --conversation argv, immutable old summary byte prefix. R-001 broadened to full AGY unit directory plus four preserved transports: 23 files / 266 tests Pass; 3 opt-in files / 5 tests skipped, not proof. Production typecheck and focused new-test typecheck recorded separately.

| Mandatory category | Score | Support / remaining uncertainty / gain |
| --- | --- | --- |
| Requirement / AC proof | 85% | Deterministic cross-boundary proof; current real native file execution/capture still missing |
| Changed-boundary directness | 95% | Real backend, source reader, process boundary, WS and disk; only provider double |
| Integration realism / mock gap | 85% | Real Studio/restore/history, CLI emulated; real source timing not independently confirmed |
| Environment / identity / fixture fidelity | 95% | Hoisted disposable HOME, exact binding and real restore, owned data/ports |
| Failure / lifecycle / recovery | 95% | Guarded/typed decline, pending Stop/close, transport Stop/errors, actual restore |
| User-surface / browser | 50% | Component preview only; integrated live/hydrated DOM still missing |
| Durable regression relevance | 95% | Four new real transport tests plus 266 preserved tests |

Overall 85.71% (arithmetic average). Critical AC proof incomplete: real native representative and integrated Activity. Broader Required: L-001 plus B-001 can close actual provider and renderer gaps. No Pass from repository success. Browser will use unchanged production hydration service, AgentStreamingService, activity store and ToolActivityItem against the exact owned server (not inline activity objects). Selection host is a temporary page, not full navigation/desktop certification. Native source is real installed AGY account for a new diagnostic session; own application data/workspace only. No credential copying.

### Broader probe setup correction
First real-provider attempt generated all nine requested native calls and recorded exact actual inputs (independent initial-live-comparison.json), but the temporary browser wait used uppercase RUNNING; production label text is Running with CSS uppercase. This is an API-owned probe assertion correction, not product failure. Preserve initial logs/owned transcript/raw data. Also do not require EmptyFile merely because the prompt requested it: current AGY omitted that optional write field; compare only actual typed provider args. Hoisted fixture still independently covers false/zero/empty/collections. No product/source change or scope expansion.

### Repository execution detail / typecheck limitation
Focused new-test typecheck initially could not find ws declarations (TS7016; server package lacks @types/ws while pre-existing E2E uses ws). Temporary focused config maps ws to the already installed workspace @types/ws 8.18.1; no package/lockfile change or fabricated ambient any shim. Final production-plus-new-test tsc succeeds, reproducible config retained at api-e2e-evidence/test-tsconfig.json; temporary server config removed. Original missing declaration output retained. General TS6059 rootDir/include limitation still not claimed passed. All 13 upstream supplements parsed/read; eight investigative associations independently rechecked without re-reading user production data (upstream-inventory-audit.json).
Second broader attempt completed L-001: all nine source/first STARTED/terminal/raw input objects exact and intended file changes correct. Integrated live arguments directly rendered while foreground native command Running. B-001 saved step failed only because temporary probe used Playwright getByTestId (default data-testid) against the page's data-test attribute. Correct to explicit observed attribute locator; preserve second evidence and clean run before rerun. No product/source fix, hidden fixture assertion suppression or requirement change.

## Final Broader Evidence / Decision Update
Final corrected temporary probe Pass: live-validation.log, 1 test; L-001 nine real native calls in current AGY 1.2.16 via this worktree's real Studio backend. Provider args = first canonical STARTED = terminal = persisted raw objects, including two edits to one path. File is exactly AFTER_NATIVE_9382 plus second line. Native conversation ced8ac6d-ccfa-49cb-9341-5219fa2f4492; only this new session's source read. Actual source fields govern, not prompt-requested defaults.

B-001 Pass: production runContextHydrationService → AgentStreamingService → lifecycle/activity store → ToolActivityItem, real random-port HTTP/WS; no inline arguments or mocked routes. Live replacement content directly asserted while foreground run_command Running; after actual run termination, browser reload clears stores and network-only history hydration renders all nine equal objects. Disclosure/collapse/reopen, 1100×850 and 390×844 (no document overflow), zero page errors. Screenshots directly inspected: content visible, normal status/JSON layout preserved, no in-scope rendering defect. Temporary page and live test removed; reproduction sources retained in evidence.

Broader decision remains **Required — Completed**, not retroactively Not Required. Final seven-category scores each **95%** (overall95%). Every critical AC directly proven in combination with deterministic transport/source-free actual-restore and preserved regression layers. Internal provider source variability is handled by approved decline, not a guarantee; no material unresolved approved-scope gap. Full packaged Electron navigation/restart, other OS/provider releases, image model spend and unapproved backfill/output recovery remain outside this validation claim.

## Durable Coverage To Update / Remove
Updated only existing fake CLI to route the new native-arguments scenario and exact restore UUID. Added dedicated fixture module and transport test. Existing unrelated fake branches unchanged. Durable coverage removed: None. Source/runtime/API schemas unchanged. No compatibility-only tests or dual-version reader added. No Requirement Gap / Design Impact / Unclear finding.

## Final Result And Route
API-REV-001 **Pass / 95%**, High-risk proportional successful-test review Required. Exact returned rule matches **/code_reviewer** only; no Delivery, failure-origin or upstream-gap condition applies. Cumulative package manifest lists all absolute references. API durable coverage committed at b297e0042e8eaf02f53af6048199c57af7587069; no implementation-source edit or remote finalization.

Evidence formatting note: artifact-inclusive cached diff check flags seven preserved raw command logs for tool-produced blank lines at EOF. Source/test scoped diff check exits0. Logs remain unedited; no blanket artifact whitespace Pass is claimed.
