# API/E2E Execution Coverage Report — token-meter-tps

## Latest Authoritative Result
**Pass — 95% validation confidence.** API-REV-001, round 1, 2026-10-13. Broader validation **Required and completed**: durable browser, real server with scripted runtime, and isolated current-worktree Electron journey. Every critical in-scope AC has direct evidence. No applicable score below 90%; clean target met. No product failure, unresolved blocker or user-only validation dependency. No paid inference performed. No blanket live-runtime verification claim.

**Medium / Low; Direct Low-Risk**, unchanged from R1/D1/IR-001. Successful-output test review: **Not Required — direct low-risk route**. No production source changes in this stage. Delivery owns documentation synchronization, integration/finalization and release decisions; this is not delivery or installed-app sign-off.

## Round Meta / Cumulative Package
Worktree `/home/autobyteus/workspace/.codex/worktrees/token-meter-tps`, branch `codex/token-meter-tps`. Product source commit `cd28a009e4a316c2414873e2dc3c333dc776a3cc`; incoming HEAD `4eed0dbecc74c163bd0a50a5aa15301b982903db`. Product source unchanged throughout validation; new tests were uncommitted during execution and are committed with this handoff.

All canonical artifacts under `/home/autobyteus/workspace/.codex/worktrees/token-meter-tps/tickets/in-progress/token-meter-tps/`:
- requirements-doc.md: approved R1/SR-001; investigation-notes.md E1–E14.
- design-spec.md D1/SR-002; solution-revision-record.md; solution-handoff.md.
- implementation-handoff.md and implementation-revision-record.md IR-001.
- api-e2e-coverage-investigation.md, this report, api-e2e-revision-record.md, api-e2e-test-case-ledger.md.
- Original screenshot is supporting context only; no behavior-defining supplement.
- Architecture/source independent reviews and their revision records: **N/A — not applicable**. Triggering review/delivery finding IDs, DR, earlier API result/confidence: N/A.

Investigation was written before edits/execution and updated for the real-context attribution gap and fixture setup correction. Scope Guardrail and Change Scope observed. Compatibility/legacy retention: None introduced or protected by tests. Persisted-data decision **Not Affected**; normal saved-summary read and renderer reload are covered without new history/migration/fallback behavior.

## Acceptance-Criteria Proof
Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/token-meter-tps/tickets/in-progress/token-meter-tps/evidence/api-001/`. Paths below are relative to that folder. Screenshots support assertions; JSON receipts/logs are the primary proof.

| AC | Critical | Case IDs | Direct evidence | Result |
|---|---|---|---|---|
| AC-001 | Yes | TPS-REPO, TPS-BROWSER, TPS-TRANSPORT | [Web regression](evidence/api-001/web-regression-final.log), [Rendered arithmetic](evidence/api-001/browser-2/result.json), [Normal rendering](evidence/api-001/browser-2/ready-en.png), [Both actual intervals](evidence/api-001/transport-3/result.json) | Proven |
| AC-002 | Yes | TPS-ATTRIBUTION, TPS-REPO, TPS-TRANSPORT, TPS-DESKTOP | [Real context admission](evidence/api-001/attribution.log), [Eight targets + Team](evidence/api-001/web-regression-final.log), [Server/WS](evidence/api-001/transport-3/result.json), [Desktop selection](evidence/api-001/desktop-runs/attempt-1/result.json) | Proven, layered scope attribution + real standalone stream; not every topology a live server journey |
| AC-003 | Yes | TPS-BROWSER, TPS-DESKTOP | [Frozen/time/help](evidence/api-001/browser-2/result.json), [Desktop idle reading](evidence/api-001/desktop-runs/attempt-1/result.json), [Desktop screenshot](evidence/api-001/desktop-runs/attempt-1/ready-desktop.png) | Proven |
| AC-004 | Yes | TPS-REPO, TPS-BROWSER, TPS-RUNTIME | [Guard/recovery tables](evidence/api-001/web-regression-final.log), [Browser invalid/zero](evidence/api-001/browser-2/result.json), [Unavailable](evidence/api-001/browser-2/unavailable-zh-narrow.png), [Normalization](evidence/api-001/server-runtime.log) | Proven |
| AC-005 | Yes | TPS-REPO, TPS-RUNTIME, TPS-DESKTOP | [Admission/revision/tuples](evidence/api-001/web-regression-final.log), [Codex/Claude source semantics](evidence/api-001/server-runtime.log), [Reload assertions](evidence/api-001/desktop-runs/attempt-1/result.json), [Reload view](evidence/api-001/desktop-runs/attempt-1/reloaded-unavailable.png) | Proven |
| AC-006 | Yes | TPS-BROWSER, TPS-DESKTOP | [Geometry/locale/keyboard](evidence/api-001/browser-2/result.json), [Collecting](evidence/api-001/browser-2/collecting.png), [Narrow Chinese](evidence/api-001/browser-2/ready-zh-narrow.png), [Actual desktop](evidence/api-001/desktop-runs/attempt-1/result.json) | Proven |
| AC-007 | Yes | TPS-REPO, TPS-RUNTIME, TPS-TRANSPORT | [Preserved web regressions](evidence/api-001/web-regression-final.log), [Accounting source](evidence/api-001/server-runtime.log), [Guards](evidence/api-001/guards.log), [Persisted totals](evidence/api-001/transport-3/persisted-summary.json) | Proven |
| AC-008 | Yes | All | [Source/asar hashes](evidence/api-001/final-provenance.sha256), [Current desktop receipt](evidence/api-001/desktop-runs/attempt-1/result.json), [Cleanup](evidence/api-001/cleanup.json) | Proven for validation; Delivery retains finalization/release responsibility |

## Execution / Ledger Reconciliation
Ledger initialized before execution; starts, meaningful checkpoints and completion outcomes recorded. All planned cases completed; no running/interrupted/unstarted cases. TPS-ATTRIBUTION added after identifying a real context-admission gap, before its edits. One failed setup attempt retained, corrected locally, rerun successfully; not an acceptance failure or a separate previously handed-off API round.

| Case | Surface / boundary | Result / evidence |
|---|---|---|
| TPS-REPO | Production estimator/store/scope/components/Team view, repository Nuxt | **10 files / 155 tests pass**, `web-regression-final.log`; initial 8/144 preserved |
| TPS-RUNTIME | Actual native/AGY converters, Codex adapter→normalizer→fold, Claude tracker→fold/result reconciliation, Grok call/fold source cases | **7 files / 174 tests pass**, `server-runtime.log`; these are source-shaped/recorded replay, not live provider sessions |
| TPS-ATTRIBUTION | Actual Org/collaboration context identity admission + selection stores | **4 files / 43 tests pass**, overlaps final 155; `attribution.log`. Two added tests exercise all 4 Org kinds and hosted Agent/Team, reject wrong address/host while preserving prior reading |
| TPS-BROWSER | Production panel/store/selection, deterministic fixture, real Chromium | **Pass**, `browser-2/result.json`; 10 state/geometry/accessibility checks, zero browser errors or unmocked GraphQL; initial browser-1 also passed |
| TPS-TRANSPORT | Scripted AGY child process→real server normalization/persistence→actual WS→production AgentStreamingService→card | **Pass**, `transport-3/result.json`, `transport-3.log`, `transport-3/persisted-summary.json`; first numeric 200 / 1.203s, latest 150 / 0.900s; three compatible reports in ONE turn; tool file genuinely read and content crosses stream |
| TPS-DESKTOP | Actual unpacked Electron worktree build, public API seed, real UI Token/composer/send, actual embedded server/runtime process | **Pass**, `desktop-runs/attempt-1/result.json`; 10 asserted journey checks, zero browser errors, own instance stopped/data removed/ports released |
| TPS-GUARDS | Web boundary + both localization guards | **Pass**, `guards.log`; zero unresolved localization findings |

## Exact Reproduction Commands
All from worktree root above, except package selection via `-C`. `corepack pnpm` resolves workspace pnpm 10.28.2. A private Corepack shim supplied nested `pnpm`; `OWN=$(mktemp -d)` with `bin/home` and `corepack enable --install-directory "$OWN/bin"`. Actual owned paths retained in `owned-setup-path.txt` and `desktop-owned-path.txt`, now deleted.

1. Server prerequisite: `PATH="$OWN/bin:$PATH" corepack pnpm -C autobyteus-server-ts prebuild` → `server-prebuild.log`. Installed workspace dependencies/web Nuxt prep existed from IR-001. No dependency/lockfile edit.
2. Web final: `corepack pnpm -C autobyteus-web test:nuxt stores/__tests__/tokenUsageThroughput.spec.ts stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__ composables/__tests__/useTokenUsageWorkspaceScope.spec.ts stores/__tests__/activeContextStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/teamExecution/__tests__/teamExecutionViewState.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts stores/__tests__/agentOrgInspection.spec.ts --run --maxWorkers=2`.
3. Server source semantics, clean env: `env -i PATH="$OWN/bin:$PATH" HOME="$OWN/home" corepack pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-model-call-fold.test.ts tests/unit/token-usage/projections/claude-sdk-call-usage-fold.test.ts tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts --no-watch`.
4. Real stream: `env -i PATH="$OWN/bin:$PATH" HOME="$OWN/home" ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-tps-cli.mjs" RUN_TOKEN_TPS_E2E=1 TEST_TPS_OUTPUT_DIR="$PWD/tickets/in-progress/token-meter-tps/evidence/api-001/transport-3" corepack pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts --no-watch`. Choose a fresh output directory on rerun. E2E invokes durable browser in real-backend mode, no GraphQL/WS mocking.
5. Deterministic browser: `corepack pnpm -C autobyteus-web test:e2e:token-meter-tps --output-dir "$PWD/tickets/in-progress/token-meter-tps/evidence/api-001/browser-2"` (fresh directory required).
6. Guards: `corepack pnpm -C autobyteus-web guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals`.
7. Desktop build: `env -i PATH="$OWN/bin:$PATH" HOME="$OWN/home" LANG=C.UTF-8 corepack pnpm -C autobyteus-web build:electron:linux` → `desktop-build.log`. Complete Linux ARM64 package build, not an installed binary. No concurrent build/dev server.
8. Desktop journey: private `DESK/bin/home/tmp/runtime`, scripted CLI copied to `DESK/bin/agy` and private `.bashrc` PATH; `setpriv --reuid=61031 --regid=61031 --clear-groups env -i PATH="$DESK/bin:/usr/bin:/bin" HOME="$DESK/home" TMPDIR="$DESK/tmp" XDG_RUNTIME_DIR="$DESK/runtime" SHELL=/bin/bash LANG=C.UTF-8 xvfb-run -a -e "$DESK/tmp/xvfb.log" -s '-screen 0 1600x1100x24 -nolisten tcp' node tickets/in-progress/token-meter-tps/evidence/api-001/desktop-probe.mjs "$PWD/tickets/in-progress/token-meter-tps/evidence/api-001/desktop-runs/attempt-1"`. Script uses canonical `isolated-app/cli.mjs start --from-worktree`, `stop <exact id>`, `list` via Node. Display remains alive for whole session.

`git diff --check` clean. Nuxt unit/browser/package compilation does not substitute for semantic Vue typechecking: IR-001's `vue-tsc` unavailable limitation remains; no such pass claimed. No full server unit/integration or all-platform shell suite claimed (server/shell production unchanged). Log ANSI escapes are removed and trailing line whitespace normalized for review/commit only; diagnostic content is retained.

## Runtime Matrix — Scripted / Live / Unrun
| Runtime | Code/source semantics executed | Actual subprocess + real server/renderer | Live provider/model inference |
|---|---|---|---|
| autobyteus | Native event converter tests + normalized estimator cases | Not run | Not run |
| codex_app_server | Actual cumulative adapter/normalizer/fold; context-only unchanged call count/new revision; frontend false-call preservation | Not run | Not run |
| claude_agent_sdk | Recorded main-loop paired call tracker/fold; multi-call result and summarizer reconciliation false-call; frontend ignores remainder as numerator/model | Not run | Not run |
| antigravity_cli | DONE agent_response converter; output excludes added thinking; same-turn tool sequence | **Scripted verified**, model identity `gemini-3.8-flash-low`, both browser and isolated desktop; actual file read + wait; real timestamps/persistence/WS | Not run; no Gemini inference |
| grok_build | Actual completed-call payload builder/fold in source suite + normalized estimator cases | Not run | Not run |
All support remains conditional on two compatible usable model-call reports in a turn. Single-report turns produce no rate. Source tests are not five live-runtime verification. No paid-provider proof is necessary for report-pair arithmetic; provider telemetry/cadence remains external and disclosed. Real full Team/Org/collaborator server journeys and macOS/Windows packages were not separately executed; relevant changed attribution is directly covered through actual web context/effect owners and exact target projection, not claimed as distributed runtime proof.

## Confidence Scorecard
Simple average over all seven applicable categories. Shell-specific behavior is unchanged; category 6 assesses renderer/full desktop journey, not an unsupported claim of comprehensive shell coverage.
| Category | Repository-only | Final | Evidence / residual uncertainty |
|---|---:|---:|---|
| Requirement and AC proof | 75% | 95% | AC index complete across arithmetic, attribution, disclosure, lifetime, persistence and real rendered/runtime transport; negligible provider cadence variability remains explicit |
| Changed-boundary directness | 90% | 95% | Real store/intakes/context owners and packaged renderer; no bypass of estimator/selection/card in final journey |
| Integration realism / mock gap | 75% | 95% | Real server, DB, runtime child, WS and UI; provider inference deliberately scripted, not part of changed computation |
| Environment / identity / fixture fidelity | 75% | 95% | Exact run IDs, same-address task copies, private state, current asar/source hashes, non-root sandboxed desktop; non-Linux packaging not tested/changed |
| Failure / edge / lifecycle / recovery | 95% | 95% | Invalid/missing/gaps/tuple/false calls/hydration recovery, offline freeze and real reload; no defect observed |
| User surface / browser / desktop | 75% | 95% | Real Token tab/UI send and keyboard help, 320px localized browser, no browser errors; screenshots reviewed |
| Durable regression relevance | 90% | 95% | Narrow scripted end-to-end test + browser probe and real context admission; no stale tests removed |
**82.1% → 95.0%**. Every category >=90%; all critical in-scope behavior proven; no material broader-validation risk remains for this web-local change. Confidence does not promise live-model telemetry availability or exact inference speed.

## Durable Coverage Changes
Paths relative to worktree; all attached to handoff. No production source or dependencies changed; no removed tests.
- Added `autobyteus-web/tests/e2e/token-meter-tps-probe.mjs`: fixture and real-server modes, all browser errors/unmocked fixture GraphQL fail, both report intervals asserted, source hashes and cleanup receipt.
- Added `autobyteus-web/tests/e2e/fixtures/token-meter-tps.page.vue`: isolated test route, production panel/store/selection, real AgentStreamingService in live mode, deterministic controls only in fixture mode.
- Updated `autobyteus-web/package.json`: discoverable `test:e2e:token-meter-tps` script only.
- Added `autobyteus-server-ts/tests/fixtures/agy-tps-cli.mjs`: bounded same-turn tool-using CLI protocol emulation, no credentials/network/inference.
- Added `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts`: public API seed, real server/runtime/browser, persistence assertion and cleanup; opt-in gate; launch-environment fixture-command assertion prevents accidental real CLI use.
- Updated `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`: two tests through actual Org/collaboration event admission and exact selections, including same-address task copies and invalid address/host rejection.

Temporary retained probe: `evidence/api-001/desktop-probe.mjs`. Ticket-specific current-build UI journey built on existing durable isolated-launch lifecycle; no new production hook or global package command justified. It seeds by public API, navigates real chat/Token, sends by UI, compares wire payloads/DOM, tests selection and reload. It does not modify Pinia directly or inject reports. Deterministic browser mode mocks GraphQL and definition WS only; unit selection tests mock target projection deliberately; new context tests execute actual admission owners. Real-backend and desktop modes mock neither transport nor accounting.

## Setup Corrections / Non-Failing Diagnostics
`transport-1.log` failed setup before test: fixture command set in beforeAll was too late for module-level discovery. API/E2E Local Fix: put exact command in process launch environment, assert it before starting server. `transport-2` and enhanced `transport-3` passed; failed-attempt cleanup preserved. No requirement/design/product correction or failure-origin reroute required.
Build/unit logs retain existing KaTeX, Browserslist and route-injection warnings. Headless desktop process log includes DBus diagnostics and missing empty trace files for newly seeded, unsent runs; API/UI journey and browser-error gate pass. These are not suppressed failed tests. No source behavior defect established outside scope.

## Provenance, Environment, Cleanup And Installed State
Ubuntu 24.04 ARM64 container, Node 22.23.3, pnpm 10.28.2, Nuxt 3.21.1; browser Chromium 153.0.8010.52. Electron **42.4.1**, app 1.5.3-beta.4, default **enterprise** Linux ARM64 worktree package; not a release/personal installed-app update. Desktop 1540×1050/en; browser 900×1000 and 320×1000/en/zh-CN. Browser receipt and desktop source SHA-256s match. Packaged asar SHA-256 `fc45429a7f781911d5206cc7677cbb2bdf33ae0e5bea95a57b55e328bc6c022a`; contains Output TPS and shown by actual UI. `final-provenance.sha256` verifies unchanged product sources and package.

| Resource | Cleanup / proof |
|---|---|
| Browser Nuxt/routes/fresh Chrome | Each receipt cleanup true; `cleanup.json` independently confirms all recorded Nuxt PIDs gone, ports not accepting connections and temporary route absent |
| Real server/run/definition/DB rows/temp workspace | `transport-3-cleanup.json` termination/delete success, server closed, data removed; earlier attempts also cleaned |
| Desktop iso-42155-574d | Canonical stop not forced; dataRootRemoved/controlPortReleased/serverPortReleased true; list empty; Xvfb full wrapper exited |
| Test identities/private homes/shims/CLI fixture/SDK caches | Only owned `/tmp/token-tps-api-*` and `/tmp/token-tps-desktop-*` removed; original/copy CLI hash checked; worktree test SQLite removed. `cleanup.json` |
| Generated builds | Kept for Delivery reuse, not staged: SDK dist, web resources/output/electron-dist. Delivery owns final worktree cleanup |
| System setup | Added Xvfb via normal apt setup; no security policy/sandbox-helper/sysctl change. Non-root UID/GID 61031; user namespace preflight passed; no sandbox-disabling flag. No user account/home/app configuration altered |

No user-running application, node, credentials or production data touched. **No merge/push/tag/publish/deploy/installed-app update.** User-only behavior checks: None required to close this validation; Delivery still decides source finalization, release and whether user installation verification is needed. Follow-ups: None established. Next recipient resolved through handoff rules, recorded below before transmission.

## Routing And Commit Receipt
Coverage commit: `e4d6ae1cb74336e00f0b01af6ce86ede88ca7f54` (tests/fixtures/script only). On 2026-10-13, `get_handoff_rules` selected the single direct-route Pass + Medium/Low + no-policy-test-review rule → **`/software_engineering_team/delivery_engineer`**. Other review/failure/upstream-gap rules do not apply. This report and evidence are committed separately. No forward to Code Reviewer or duplicate Implementation notification. Transmission confirmation is the send tool result, not this pre-send record.
