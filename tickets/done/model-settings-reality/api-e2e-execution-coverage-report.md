# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident I am, and the outcome. The plan is [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md); the history is [api-e2e-revision-record.md](api-e2e-revision-record.md). This file holds the latest complete result (round 2); round 1's `Fail` (API-14) is in the revision record and its evidence folders.

## Round

- Coverage investigation (the plan; it lists the upstream documents): [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-002`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 2; code reviewer handoff after the source review of the SR-004 delta passed (CRR-004, CR-004 resolved); code commit `dfa0faa76`, implementation documents `f1a4ef410`
- Prior round reviewed: round 1 (`API-REV-001`, `Fail`: API-14, REQ-010/REQ-011/QR-001, `Local Fix`). Resolved: API-14 passes on the real stack with the real Claude CLIs and in the scripted mode (cases API-14, API-14b)
- Deviations from the investigation's plan, and why:
  1. **Surface:** still no isolated Electron instance (container uid 0, no Electron build, no Xvfb/xauth, no unprivileged display; the change touches no Electron main/preload/IPC/window code). The journeys ran on the project's real-stack browser pattern (real Chromium → real Nuxt dev → real built `dist/app.js` → real Claude CLIs) at desktop and phone viewports. The embedded-server environment of an isolated instance is listed as `Only The User Can Check` below.
  2. **Round-2 additions beyond the rerun plan:** MSR-003 (the new `modelListReadable` contract through real GraphQL), API-14b (the reviewer's request: first open with the CLI already failing), API-19 (discovered providers re-discovered by Refresh models, closing the unit-only part of AC-011), the backend restart between the return save and its message in API-12 (TESTING.md Rule 10), API-15 (phone bundle) and API-18 (fresh-start build; `autobyteus-web/generated/graphql.ts` is a build input).
  3. **The journey probe became durable** (`autobyteus-web/tests/e2e/model-list-journeys-probe.mjs`, `--cli scripted` default, `--cli real`); the ticket-owned round-1 copy was removed. Round 1's unit reproduction became durable store cases (implementation, IMP-08).
  4. **Interim runs:** the probe's development runs (four iterations that fixed my own probe) are not evidence; the evidence is the final run of each mode.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/tickets/in-progress/model-settings-reality/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architectural risk (`Low`/`High`): `High`
- Input route (`Reviewed`/`Direct Low-Risk`): `Reviewed`
- Successful-output route (`Code Review`/`Delivery`): `Code Review` (test-code review of the changed durable tests, then delivery)
- Proportional test-code review decision: `Required` (the changed durable test code is listed under Durable Coverage Changed)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | code `dfa0faa76` (HEAD `be161036e` / `534535bc5` add tests and probes only; the implementation documents `f1a4ef410` are documents) | Linux arm64 container, uid 0, Node 22.23.3, pnpm 10.28.2 via corepack | vitest 4.1.12; autobyteus-ts and server `dist` rebuilt from `dfa0faa76` (restored sources after each mutation check); no browser | sanitized environment (`env -i PATH HOME TMPDIR`), throwaway HOME, test-owned data roots and databases |
| ENV-2 | same | same | headless Chromium `/usr/bin/chromium` (`--no-sandbox`, as the project probes run it), Nuxt dev, `autobyteus-server-ts/dist/app.js`, production phone bundle (`build:mobile-web`), real Claude CLIs `2.1.280` (SDK-bundled) and `2.1.322` (`/usr/bin/claude`); desktop viewport 1440×900 / 1512×952, phone 390×844 | owned temp data root, free ports, owner credential, test vault (`provider.anthropic.api-key` only; api-key mode, owned `CLAUDE_CONFIG_DIR`) for `--cli real`; native models = a test-owned LM Studio stand-in; Antigravity = the scripted `agy-failure-cli.mjs`; the user's app (port 8000) untouched |
| ENV-3 | same | same | live Anthropic API through the real studio server / `LLMFactory` / real Claude Code CLIs (test vault) | real credits, all short replies (round 1: API-06, API-09, API-11; round 2: two `opus` replies of the real-mode journey runs and the T03 reply) |
| ENV-4 | `be161036e` fresh shallow clone | same | `pnpm install --frozen-lockfile` alone, then the web build chain | no build output, warm pnpm store |

## Cases

Evidence paths are inside the evidence folder. Screenshots support; the proof is the quoted line or value. `Still valid` = passed in round 1 on `817bd9950`, nothing it exercises changed (`git diff --name-only 817bd9950 dfa0faa76`); its row keeps the round-1 evidence.

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, AC-007, AC-009 | autobyteus-ts unit; docs | `Reused`: IMP-01, IMP-06 | — | Pass (still valid) | (IMP-01, IMP-06 rows) | `Tests  2 failed \| 2129 passed (2131)` (two `run-bash` chmod tests, uid 0) | no `autobyteus-ts` file changed since `f31fa1821` |
| API-02 | AC-001, AC-002, AC-004 | live Anthropic API through `LLMFactory`, every Claude row | `Reused`: IMP-02 | — | Pass (still valid) | (IMP-02 row) | `Tests  28 passed (28)`; Opus 5 Off `reasoning_output_tokens` 0 | unchanged since `d741d4340` |
| API-03 | AC-005..AC-008, AC-013 | server unit/arch/migrations/work-journal at the new code | `env -i PATH HOME=/root TMPDIR=/tmp corepack pnpm -C autobyteus-server-ts test:unit --no-watch` | ENV-1 | Pass (8 environmental failures, causes found) | `API-03-r2-server-unit-excerpt.log`, `API-03-r2-server-unit.full.log.gz` (round 1: `API-03-server-unit-excerpt.log`) | `Test Files  3 failed \| 968 passed \| 5 skipped (976)`; `Tests  8 failed \| 8292 passed \| 12 skipped (8312)` | the 8 tests are the chmod/read-only tests of agent-package-folder-watcher (5), unreadable-package-root (2) and app-config (1): uid 0 ignores permissions. Round 1's pairing-auth teardown race (FU-008) did not recur. IMP-08's slice omitted the folders of other refusal sites, so I ran the whole suite once |
| API-03b | all (type gate) | server typecheck gate | `corepack pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-03b-r2-server-typecheck.log` | `production errors: 0; test-file errors: 1181 in 365 files (baseline 1181 in 365 files)` / `[typecheck] PASS` | after MSR-003 |
| API-04 | QR-001, QR-002, AC-003, AC-010, AC-011, REQ-010..013 | web unit/component, web typecheck, guards | `Reused`: IMP-08 (ran on `dfa0faa76`) | — | Pass | (IMP-08 log) | web `Tests  1 failed \| 5582 passed \| 2 skipped (5585)` (FU-005 `projectRunsStore.spec.ts`); typecheck `test-file errors: 96 ... (baseline 96 ...)` PASS; three guards passed | the fresh clone (API-18) re-ran the guards and the typecheck |
| API-05 | persisted data; REQ-007, REQ-008; availability | built/in-process e2e: available-agent-runtimes, agent-runtimes, Anthropic stored-config resume + edit/launch | `env -i PATH HOME=<temp> TMPDIR=/tmp corepack pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-05-r2-runtime-e2e.log` (round 1: `API-05-runtime-e2e.log`, `API-05b-...`) | `Test Files  4 passed (4)`, `Tests  29 passed (29)` | rerun: edit/launch saves go through the changed validation/options service |
| API-06 | AC-003, AC-004 | gated live suite through the real studio server | `Reused`: round 1 (`RUN_CLAUDE_5_5_E2E=1`, C55-E2E-001..005) | ENV-3 | Pass (still valid) | `API-06-claude-5-5-live.log`, `API-06-claude-5-5-live-off-requests.txt` | `✓ C55-E2E-001: ... thinking schema defaults` (toggle default `true`); Off requests `thinking {"type":"between_tools"}` / `{"type":"disabled"}`, `output_config null` | round 1 had provider-behavior flakes in 002/004 (request shapes correct, rerun passed); live LLM paths untouched by the delta |
| API-07 | AC-012 (server), AC-013, REQ-010, REQ-012, REQ-013, SCN-010, Rule 10 | built server GraphQL (stopped agent, Team member, delegated copy), scripted `claude` | (a) `env -i PATH HOME=/root TMPDIR=/tmp corepack pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts --no-watch`; (b) `... RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs ... vitest run tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-07-r2-stopped-run-graphql-e2e.log`, `API-07-r2-delegated-copy-e2e.log`, `API-07-r2-mutation-check.log` (round 1: `API-07-*`) | (a) `Tests  5 passed (5)`: `✓ MSR-001: ...`, `✓ MSR-002: ...`, `✓ MSR-003: a stopped agent run's and Team run's options say whether the runtime's model list could be read`; (b) `Tests  11 passed (11)` incl. `✓ DCM-010: team root ...`, `✓ DCM-010: agent root ...`; mutation: `-   "modelListReadable": false, +   "modelListReadable": true,` | MSR-003 (new): agent and Team options through real GraphQL: readable with the model and its replacements; with the CLI offering none every scope answers `{currentModelIdentifier, modelListReadable:false, currentModel:null, replacements:[], unavailableReason:"The model list of Claude Agent SDK could not be read. Try again."}`; readable again when it works (not sticky). Mutation (server answers an unreadable list as readable) fails it. MSR-001/DCM-010 cover the refusal texts (round 1: not offered / unreadable, nothing saved) |
| API-08 | AC-001, AC-003, AC-004, AC-005, AC-006, AC-010 | composer probe `chat-composer-polish-probe.mjs`, real stack, test vault | `cd autobyteus-web && AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault corepack pnpm test:e2e:chat-composer-polish --cases T01,T03 ...` (round 1: T01–T04, T06–T08) | ENV-2 | Pass | `API-08-composer-probe/API-08e-r2-T01-T03-evidence.json`, `API-08e-r2-T03-run-settings-after-edit.png`; round 1: `API-08b-*`, `API-08c-*` | T03 `"saved":{"thinking_enabled":true,"reasoning_effort":"high"}` after Off → effort choice → Save in a stopped run's settings | T03 edits a saved run through the changed options client, so it was rerun; T02, T04, T06–T08 still valid |
| API-09 | AC-005, AC-006; persisted data | live Claude Agent SDK sessions on the real CLIs behind an argv-logging wrapper | `Reused`: round 1 (`RUN_CLAUDE_E2E=1 ... claude-agent-effort-only-live.e2e.test.ts`) | ENV-3 | Pass (still valid) | `API-09-claude-sdk-effort-only-live.log`, `API-09-mutation-check.log` | `✓ path-claude: ...`, `✓ sdk-bundled-claude: ...`, `Tests  2 passed (2)`; `--effort xhigh`, no `--thinking*` | the SDK session/client code is untouched by the delta |
| API-10 | AC-008, QR-003, REQ-008 | real GraphQL launch (agent, Team) | MSR-002 in (a) above, rerun; live part reused from round 1 | ENV-1, ENV-3 | Pass | `API-07-r2-stopped-run-graphql-e2e.log`; `API-09-claude-sdk-effort-only-live.log` | `✓ MSR-002: a new agent run and a new Team run store only the settings the model declares`; live `createAgentRun took 50 ms` / `99 ms`, no Claude CLI started during creation | |
| API-11 | AC-010, AC-011, QR-001, QR-002, REQ-010, REQ-011, REQ-014; SCN-007, SCN-009, SCN-010 | real stack: new-run model picker, Claude Agent SDK runtime, the CLI updated while the app runs | `node autobyteus-web/tests/e2e/model-list-journeys-probe.mjs --output-dir <fresh> --browser-executable /usr/bin/chromium --cli scripted` and `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node ... --cli real` (worktree root, pnpm shim on PATH) | ENV-2 | Pass (both modes) | `API-11-12-14-r2-real-stack/{real-cli,scripted-cli}/evidence.json`, `real-cli/API-11-2-updated-list.png`, `API-11-3-refresh-failed-list-kept.png`, `API-11-4-launched-on-new-model.png` | real: `"added":["opus"]`, `"opening2":{"rows":[…"opus"…],"reads":1}`, `"failed":{"error":"Couldn’t refresh models","button":"Retry","rows":[…4 rows…]}`, `"launched":{"llmModelIdentifier":"opus","llmConfig":null,"runtimeKind":"claude_agent_sdk"},"replied":true`; the page marker and backend pid asserted unchanged (no reload, no restart) | CLI 2.1.280 → 2.1.322 by a symlink swap; the open picker shows the old list at once with the busy state (`"busySeen":true`), one catalog read per opening, a failing CLI keeps the list with the error and Retry, Retry recovers, the new model launches. Scripted: `claude-new-model` after the update |
| API-12 | AC-012, AC-013; SCN-008, SCN-011; Rule 10 | real stack: stopped Team member switched to the Claude Agent SDK runtime, Team settings | same run | ENV-2 | Pass (both modes) | `API-11-12-14-r2-real-stack/*/evidence.json`, `real-cli/API-12-4-refused-not-offered.png`, `API-12-5-refused-unreadable.png`, `API-12-6-saved.png`, `API-12-8-after-restart-and-message.png` | `"refusedNotOffered":"'opus' is not offered by Claude Agent SDK now (for '/worker'). Refresh the model list and choose again. Saved settings were not changed."`; `"refusedUnreadable":"The model list of Claude Agent SDK could not be read. Try again. Saved settings were not changed."`; `"saved":{"runtimeKind":"claude_agent_sdk","model":"opus"}`; `"afterMessage":{"runtimeKind":"autobyteus",…,"pending":false}` | a native Team, stopped; both refusals leave the stored member unchanged (asserted); Save succeeds when the CLI works; saved back onto the first runtime; **backend restarted** between that save and a message to the worker, which answers on its first runtime in the same conversation (`NATIVE-REPLY-1`, `NATIVE-REPLY-2`) with no trace of the Claude choice (Rule 10) |
| API-13 | AC-002, AC-003, AC-005, AC-006 (UI on the real catalog) | composer probe T09 + T08 | `Reused`: round 1 | ENV-2 | Pass (still valid) | `API-08-composer-probe/API-08d-T09-evidence.json`, `T09-claude-opus-5.png`, `T09-claude-fable-5.png`, `API-08b-T08-sdk-effort-only-menu.png` | all seven AutoByteus Claude rows (switch rows default On with Off; Fable 5/5.1/Opus 5.5 effort only, default checked, no `thinking_enabled`); T08 `"before":{"trigger":"Default","draft":null}` | new-chat menus and the catalog store are untouched by the delta |
| API-14 | REQ-010, REQ-011, QR-001; AC-010 (alternate outcome); the saved-run (locked) menu | real stack: stopped Team run on the Claude Agent SDK runtime, Team-level model menu | same run | ENV-2 | **Pass** (round 1: Fail) | `API-11-12-14-r2-real-stack/*/evidence.json` (`API-14`), `real-cli/API-14-2-locked-menu-updated-on-open.png`, `API-14-4-locked-menu-refresh-failed.png`, `API-14-5-card-after-failed-refresh.png`, `API-14-6-locked-menu-recovered.png`; round-1 failure: `API-11-12-14-real-stack/` | real: `"failedSeen":true`, `"afterFailure":{"error":"Couldn’t refresh models","button":"Retry","rows":["claude-fable-5-1[1m]","haiku","opus","sonnet"]}`, `"cardAfterFailure":"Workspace workspace Model claude-haiku-4-5-20251001 Claude Agent SDK Thinking Not available for this model ..."` (no "No longer offered"), `"afterRecovery":{…"button":"Refresh models"}` | the options re-read on open (new model listed), the busy state keeps the options usable, and with the CLI failing the menu keeps its 4 options and shows the error with Retry; round 1 emptied them to "No models available" and flagged the saved model |
| API-14b | AC-012 failure alternate (SR-004), REQ-013, QR-001 | real stack: the same menu opened for the first time while the CLI is already failing | same run | ENV-2 | Pass (both modes; new) | `API-11-12-14-r2-real-stack/*/evidence.json` (`API-14b`), `real-cli/API-14b-1-first-open-cli-failing.png`, `API-14b-2-menu-cli-failing.png`, `API-14b-3-recovered.png` | `"card":"Workspace workspace Model haiku Claude Agent SDK Thinking Not available for this model ..."` (no "No longer offered"), `"menu":"Claude Agent SDK No models available Couldn’t refresh models Retry"`, `"err":"Couldn’t refresh models","btn":"Retry","rec":true`, model control enabled | a first read with nothing loaded shows "No models available" with the error and Retry (as AC-012's failure alternate states); the saved model is not marked "No longer offered" and stays editable; Refresh models recovers once the CLI works. The server's text is not displayed on this screen: the requirement does not ask for it, and I did not assert it |
| API-15 | TESTING.md phone rule; REQ-010, REQ-011, QR-002 | production phone bundle, new-run model sheet | `corepack pnpm -C autobyteus-web build:mobile-web`; `cd autobyteus-web && corepack pnpm test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-32 --browser-executable=/usr/bin/chromium` | ENV-2 | Pass (MSP-32) | `API-15-phone-bundle/mobile-shell-probe.json`, `README.md`, `MSP-32-model-sheet-open.png`, `MSP-32-model-sheet-refreshed.png` | `cases["MSP-32"]`: `"opened":{"reads":1,"runtime":"antigravity_cli","rows":["Gemini test"]}`, `"control":{"text":"Refresh models","box":{…,"width":132.2,"height":44}}`, `"afterRefresh":{"reads":1,"rows":["Gemini test"],"error":0,"button":"Refresh models"}` | one catalog read on opening, a 44 px control, one read per refresh, list kept, no error. The probe's overall line is `Fail` only because of the known FU-003 phone health check of `http://localhost:8000/health`: it is recorded as known only when refused, and on this machine the user's app listens there, so it is blocked by CORS (two `setup` browser errors; no case failed). The scripted AGY list does not change on the phone; the changing-list proofs are API-11/API-19 |
| API-16 | AC-013 (application launch texts) | server unit (validator) | `Reused`: IMP-08 slice + my API-03 full run | ENV-1 | Pass | (IMP-08; API-03 log) | `application-launch-host-capability-validator.test.ts` in the 968 passed files | no GraphQL application-launch e2e harness exists for the Claude list |
| API-17 | AC-009 | docs grep at HEAD | `rg -n "gemini-3.5-flash\|kimi-k2" autobyteus-ts/docs` | — | Pass | — | exit 1 (no match) | rerun (docs changed in the delta) |
| API-18 | Fresh-Start Build (TESTING.md) | fresh clone of `be161036e`, install alone, the web build chain of the release job | shallow clone (`git clone --depth 1 --no-local file://<worktree>`); `corepack pnpm install --frozen-lockfile`; `NODE_ENV=production`: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `typecheck`, `prepare-server`, `generate:electron`, `transpile-electron`, `tsc -p build/tsconfig.json` | ENV-4 | Pass | `API-18-fresh-start-build.log` | `install-exit=0`, `guards-exit=0`, `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `prepare-server-exit=0`, `generate-electron-exit=0`, `transpile-exit=0`, `build-tsc-exit=0` | build input: `autobyteus-web/generated/graphql.ts` (regenerated from the server schema). Not run (needs the runner): `build:electron:mac` packaging/signing/notarization, `node build/dist/build.js --linux`, "Verify bundled Prisma" |
| API-19 | AC-011, REQ-011, REQ-014 | real stack: AutoByteus runtime, discovered provider (LM Studio stand-in) | same run | ENV-2 | Pass (both modes; new) | `API-11-12-14-r2-real-stack/*/evidence.json` (`API-19`), `real-cli/API-19-local-model-after-refresh.png` | `"before":["rsw-native-b:…","rsw-native:…"]`, `"after":["rsw-native-b:…","rsw-native-c:…","rsw-native:…"]` | the local server starts offering a third model while the app runs; Refresh models re-discovers it with no page reload or backend restart (asserted) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (live), API-01, API-06 (Off request bodies carry no effort) | Proven | — |
| AC-002 | Yes | API-02 (live resume), API-13 (menus on the real catalog), API-01 | Proven | — |
| AC-003 | Yes | API-08 T01, API-13 T09, API-06 C55-E2E-001, API-01 | Proven | — |
| AC-004 | Yes | API-02 (live per row), API-06 (live through the server, request bodies) | Proven | — |
| AC-005 | Yes | API-09 (both real CLIs, process boundary), API-13 (menu) | Proven | — |
| AC-006 | Yes | API-09, API-13 ("Default", nothing written, High writes the effort alone) | Proven | — |
| AC-007 | Yes | API-01 (IMP-01 per-adapter request capture, the AC's stated intent), API-02 (Anthropic live) | Proven (live provider acceptance of projected requests only for Anthropic; the other providers have no vault keys) | — |
| AC-008 | Yes | API-10 (MSR-002; live stored config and no CLI start at creation), API-09 | Proven | — |
| AC-009 | No | API-17, API-01 | Proven | — |
| AC-010 | Yes | API-11 (new-run picker incl. its failure alternate), API-14 and API-14b (saved-run menus), API-08, API-15 (phone sheet) | Proven | — |
| AC-011 | Yes | API-11 (Refresh models, busy, Retry), API-14 (locked menu), API-15 (phone), API-19 (discovered providers re-discovered), API-04 | Proven | — |
| AC-012 | Yes | API-12 (UI journey incl. the return and a restart), API-14b (failure alternate), API-07 (server: Team member and delegated copy), MSR-003 | Proven (the delegated copy's locked menu in the UI was not run; it shares the store merge, unit-covered in IMP-08, and the server path of DCM-010/MSR-003) | — |
| AC-013 | Yes | API-07 (per site type, GraphQL), API-12 (both texts in the app), API-16 | Proven | — |
| QR-001 | Yes | API-11 (new-run picker), API-14, API-14b (saved-run menus), API-15 | Proven | — |
| QR-002 | No | API-11 (`"reads":1` per opening), API-15 (`"reads":1`), API-04 | Proven | — |
| QR-003 | No | API-10 (no CLI start at creation, 50–99 ms vs ≈2.3 s) | Proven | — |
| Electron embedded-server environment (the "isolated Electron" wording of AC-010/AC-012) | No (no shell code changed; web-equivalent behavior proven) | — | `Only The User Can Check` | Tried: `command -v Xvfb xvfb-run xauth` finds nothing; no `autobyteus-web/electron-dist`; the container user is uid 0 (TESTING.md: Electron must not run as root) and the only display, Xvnc `:99`, is the host user's desktop session; installing system packages or a `build:electron:linux` + unprivileged launch is not routine setup I may do here. To check on a host with a display and a normal account: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault pnpm --silent isolated-app start --build`, switch the Claude CLI it discovers on PATH (a symlink earlier on PATH; `CLAUDE_CODE_EXECUTABLE_PATH` does not pass into the embedded server) and open a model picker and a stopped Team's member settings |

## Validation Confidence Scorecard (Mandatory)

Scored over what can be proven without the user; the user-only Electron part is listed for delivery (decision rule: it is not a gap here).

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC directly proven (API-01..API-19) | AC-007 live acceptance only for Anthropic; the delegated copy's locked menu not run in the UI | live non-Anthropic keys; a copy-menu journey |
| Changed-boundary execution directness | 93% | 96% | API-07/MSR-003 (real GraphQL), API-09 (CLI process boundary), API-11/12/14/14b/19 (real renderer + server + CLI), API-15 (phone bundle) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 94% | real Claude CLIs (two versions), real Anthropic API, real server and renderer; mocked: native-model stand-in, scripted AGY, scripted `claude` (alongside the real ones), canned Anthropic in the stored-config suites | the embedded-server environment of an isolated Electron instance (user-only part) | an isolated instance on a host with a display |
| Environment, configuration, identity, and fixture fidelity | 88% | 94% | owned roots, test vault, owner credential, sanitized env, both real CLI versions, a fresh-start build (API-18); uid-0 container with a `--no-sandbox` Chromium | Linux-only fresh-start; no packaging step | a non-root host run; the release runner |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | failing CLI at refresh (API-11, API-14) and at first open (API-14b), both refusals and nothing saved (API-12, MSR-001, DCM-010), the unreadable answer is not sticky (MSR-003), stale stored shapes (API-09), A→B→A with a backend restart and a message (API-12) | mid-read cancellation of a refresh is unit-covered only | — |
| User-surface, browser, and desktop-shell confidence | 78% | 94% | API-08, API-11/12/14/14b/19 (desktop viewport, DOM values), API-15 (phone bundle), API-13 | Electron shell (no shell code changed; user-only); delegated copy menu in the UI | an isolated instance; a copy-menu journey |
| Durable regression coverage quality and relevance | 92% | 96% | MSR-001/002/003, DCM-010, the gated live argv test, the durable journeys probe (scripted default + real), MSP-32, the updated composer probe, five baseline fixes; MSR-001, MSR-003 and the live test have mutation evidence; implementation's store cases fail on the pre-change stores (IMP-08) | the real-CLI mode needs two CLI versions and credentials; the scripted mode is the portable one | — |

- Overall post-repository confidence: 87% (simple average of the post-repository scores: 87.3%)
- Overall final confidence: 95% (simple average of the seven final scores: 95.0%)
- Calculation method: simple average of the applicable category scores; the project defines no other method
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (at the line: 95.0%; the categories at 94% are limited by the user-only Electron part and the unrun delegated-copy menu)
- Confidence-limiting residual risks: the Electron embedded-server environment (user-only); the delegated copy's saved-run menu in the UI; live acceptance of projected requests by non-Anthropic providers

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (real stack, both CLI modes; phone bundle) and `Live API`
- Confidence gap or residual risk it addresses, and the expected gain: the round-1 failure (API-14) and its first-read variant (API-14b), the user's reported journey with a backend restart and a return, discovered providers, the phone bundle; it moved every category from the 78–93% post-repository range to 94–96%
- Browser validation needed, and why or why not: yes; the change is a renderer + server behavior whose acceptance criteria are user journeys
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: the project's real-stack browser pattern instead of an isolated Electron instance (plan deviation 1)
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: web-equivalent: API-08, API-11, API-12, API-13, API-14, API-14b, API-15, API-19. Shell-specific: none changed, none run
- Effect on any already-running desktop application: `None` to its data and state. One note: the phone bundle's own startup health check (known FU-003) sends a cross-origin request to `http://localhost:8000/health`, which on this machine is the user's app; the browser blocks it (CORS) and the page never reads it
- Behavior not directly proven and its confidence consequence: the embedded server of an isolated Electron instance receives only a system-baseline environment (see the user-only row); scored in categories 3, 4 and 6 at 94%

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: stored Fable 5 `{thinking_enabled:false, reasoning_effort:'max'}` (API-02); stored SDK `{thinking_enabled:false, reasoning_effort:'xhigh', thinking_display:'omitted'}` restored and resumed (API-09); stored Anthropic configs with stale keys (API-05); launch configs with undeclared keys (API-10); saved runs opened and edited through the new `modelListReadable` options answer (API-12, API-14, API-14b, MSR-003)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-02, API-05, API-09, API-10
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none identified

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the web refuses an options answer without the flag: no old-shape fallback)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (cumulative with round 1; round-2 additions marked)

| Path / Test | Change | Case IDs | For A Removal: Obsolete Assertion, Upstream Evidence, And Replacement Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | Updated (MSR-001, MSR-002 in round 1; **MSR-003** in round 2) | API-07, API-10 | — |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` | Updated (DCM-010; round 1) | API-07 | — |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | Updated (`claude-models` state; round 1) | API-07, API-11 (scripted) | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-effort-only-live.e2e.test.ts` | Added (gated `RUN_CLAUDE_E2E=1`; round 1) | API-09, API-10 | — |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` | Updated (T01–T03, T06, T07 retargeted; T08, T09 added; round 1) | API-08, API-13 | the removed assertion ("an SDK model has `thinking_enabled`, a fresh draft records Off") is obsolete under REQ-003/REQ-005; replaced by T01/T09/T08 |
| **`autobyteus-web/tests/e2e/model-list-journeys-probe.mjs`** | **Added** (round 2; replaces the ticket-owned `probes/real-stack/model-list-journeys-probe.mjs` of round 1, removed): API-11, API-12 (with the restart), API-14, API-14b, API-19; `--cli scripted\|real`. Test review CRR-005 fixed (API-REV-003): a browser page error fails the run (`--inject-page-error` self-checks it) and API-14 asserts the card after a failed refresh | API-11, API-12, API-14, API-14b, API-19 | the ticket-owned copy was a temporary probe; this is its durable form |
| **`autobyteus-web/tests/e2e/mobile-shell-probe.mjs`** | **Updated** (round 2): MSP-32 | API-15 | — |
| Baseline fixes of rotted e2e suites (round 1, commit `f6ce6c78e`): `available-agent-runtimes-graphql.e2e.test.ts`, `agent-runtimes-graphql.e2e.test.ts`, `tests/e2e/helpers/agent-runtimes-e2e-harness.ts`, `autobyteus-anthropic-stored-config-resume.e2e.test.ts`, `...-edit-launch.e2e.test.ts`, `tests/e2e/helpers/native-runtime-live-harness.ts` | Updated | API-05, API-06 | — |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` | Updated (header; round 1) | API-06 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (the handoff message lists them)
- Diff or repository evidence supplied for removed paths: the ticket-owned `probes/real-stack/model-list-journeys-probe.mjs` was removed in `be161036e` (its durable replacement is the added path); `git diff a3b87f061..HEAD -- autobyteus-web/tests/e2e autobyteus-server-ts/tests` shows the round-2 test changes

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native-runtime models in the journeys | test-owned LM Studio stand-in (its model list is mutable for API-19) | no provider cost; the journeys are about Claude lists and discovered-provider re-discovery | none for the behavior under test |
| Antigravity CLI | scripted `agy-failure-cli.mjs` | starts Team members and phone-stack runs without inference | none for the Claude behavior |
| Claude CLI in MSR-001/MSR-003/DCM-010 and `--cli scripted` | scripted `claude` (`agent-runtimes-fake-cli.mjs`, `claude-models` state) | deterministic, credential-free list that changes on demand | proves the server's and renderer's handling of a changing/failing list, not the real CLI's output (the real CLIs are API-09 and `--cli real`) |
| "Failing" Claude CLI (`--cli real`) | `#!/bin/sh` script that exits 1 | the CLI failing on demand | stands for a broken or signed-out CLI |
| Anthropic in the stored-config e2e suites | the suites' canned `fetch` answer | request-shape checks without credits | live proof is API-02/API-06 |
| Electron shell | not used | plan deviation 1 | user-only part |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backends, Nuxt dev servers, Chromium of the probes | Yes | the probes stop them; cleanup receipts in `evidence.json` (`"stop":"SIGTERM"`, `"removed":"/tmp/runtime-switch-members-probe-…"`) | done; `pgrep` shows none left |
| Fresh clone `/tmp/api-e2e-fresh-*` (7.9 GB) | Yes | removed after the evidence was saved | removed |
| Source mutation (`modelListReadable`), restored from a copy, `dist` rebuilt | Yes | `git status` of `autobyteus-server-ts/src` clean after each mutation, rebuild exit 0 | done; never committed |
| `autobyteus-web/dist-mobile`, `dist` (phone bundle build output) | Yes | untracked build output (ignored); left in place | untracked, not staged |
| `/tmp/api-e2e-msr2`, `/tmp/pnpm-shim` | Yes | working copies; evidence is in the ticket folder | `/tmp/api-e2e-msr2` removed at handoff; the shim is a harmless 2-line script |
| The user's app (port 8000) | No | not touched (see the CORS note under Desktop Application Validation) | untouched |

## Preliminary Classification (On `Fail`)

N/A — result is `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): none unproven; user-only: the Electron embedded-server environment check (see Acceptance-Criteria Proof). Not run and not a failure: the delegated copy's locked menu in the UI
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules` (`Blocked` -> user request): the code reviewer for the test-code review of the changed durable tests (Large / High), then delivery
- Test review (CRR-005): two `Local Fix` findings in the durable journeys probe (T-001 page errors did not fail the run; T-002 API-14 did not assert the card after a failed refresh) are fixed and the probe was rerun once in scripted mode (`evidence/API-11-12-14-r3-probe-fixes/`: all five cases Pass, `"result":"Pass"`, 0 browser errors; the self-check run fails as designed); no result or score changed.
- Notes: final confidence 95% (every category 94–96%); API-14 (round 1's failure) and its first-read variant pass in both CLI modes; the user's journey passes on the real stack including a backend restart and a return to the first runtime; the 95% target is met at the line because the two limiting items are user-only (Electron environment) or a bounded unrun UI path (delegated copy menu). Known non-change failures: web `projectRunsStore.spec` (FU-005), server uid-0 chmod tests (8 tests in 3 files), pairing-auth teardown race (FU-008, did not recur), the mobile probe's FU-003 health-check line when a real node listens on port 8000 (new follow-up FU-009).
