# API/E2E Execution Coverage Report — runtime-lifecycle-review (Settings → Agent Runtimes)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-002 Pass (Large / High, reviewed route). **Round 2 (API-REV-002):** delivery engineer's request for more evidence (DR-001). The user decided on 2026-10-20 that API/E2E must use his real accounts: no `HOME`/`CODEX_HOME`/`CLAUDE_CONFIG_DIR` or other vendor-home overrides, no command overrides, no fake CLIs.
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-12 added: the real studio server against the real installed CLIs in an empty HOME and the real vendor sources (no account), to close the fake/stub gap.
  - API-30 (isolated desktop instance) not run: its embedded server would read the user's real Claude/Antigravity/Grok accounts (only `CODEX_HOME` can be redirected), which the design forbids in automated tests. It stays the user's check for AC-001.
  - API-11 registers Brief Studio through `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` at server start, not `importApplicationPackage`, because a mid-run import of a Codex-default app is quarantined. The cause is not this ticket; it is follow-up FU-006.
  - API-21 added: the web guards rerun after the probe and its `package.json` script were added.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/evidence/api-e2e/` (round 1) and `…/evidence/api-e2e-real/` (round 2)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the added durable tests)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `52aa663edd` (HEAD `a5d4eeaa20`, docs only after the code) | macOS 26.5.2 arm64, node v22.23.1 | server integration suite (vitest, unit/integration env isolation) | shared sqlite test DB, never concurrent with e2e |
| ENV-2 | same + the new test files | same | in-process studio server (`buildStudioServer`, `fastify.listen` on a free port), real HTTP GraphQL/REST, real child processes | `env -i PATH HOME=<resolved temp> TMPDIR`; fake CLIs `tests/fixtures/agent-runtimes-fake-cli.mjs` via `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`; vendor sources stubbed in-process; API-10: logger bootstrap at `trace` + HTTP access log `all`, operation time-out 6 s (real value asserted 10 min) |
| ENV-3 | same | same | ENV-2 + the Brief Studio importable package (API-00), registered at start through the package-roots setting; Codex fake signed in, `model/list` = `gpt-5.6-luna` | Claude model via the SDK's own start (`claude-fake-sonnet`) |
| ENV-4 | same; server `dist` built by API-00 from this code | same; Chrome via playwright-core (headless) | real stack: `node --import agent-runtimes-vendor-sources.mjs dist/app.js` on a fresh data root + `pnpm dev` (Nuxt) bound to it | en and zh-CN; windows 1440/1280/1252/1250/1100/1024/739/390 px; fakes as ENV-2 |
| ENV-5 | same | same | in-process studio server with the **real installed CLIs** found by the unchanged resolvers (codex-cli 0.163.0, Claude Code 2.1.302, agy 1.4.3, grok 1.0.62), **real vendor sources** | empty resolved HOME and CODEX_HOME: everything signed out, no account read; read-only (check + query only) |
| ENV-6 | n/a (vendor CLIs only) | same | real CLIs, empty temp HOME | read-only signed-out commands |
| ENV-7 | branch `0c27f0a3b5` (origin/personal `5de6a698b9` merged in; Agent Runtimes code unchanged since `52aa663edd`) | same | **isolated desktop instance** `iso-56551-47f6` of this worktree's packaged build (`pnpm --silent isolated-app start --from-worktree` on the app `--build` packaged; the release zip step was stopped as unnecessary), backend `http://127.0.0.1:56552`, control port 56551 | **the user's real HOME, login-shell PATH ("Using PATH from login shell" in the instance log), real installed runtimes found by the unchanged resolvers, real accounts, real vendor sources**; no vendor-home or command override, no fake CLI. Only separate thing: the instance's own AutoByteus data root (`<TMP>/autobyteus-isolated-root-MW1OXQ`). The user's `/Applications/AutoByteus.app` instances were not touched |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | all (unit level) | server unit | Reused IMP-04 + IMP-12 | — | Pass | (implementation evidence) | — | IMP-12 reran every file the IR-002 diff touches at `52aa663edd`; `git diff --name-only 52aa663edd a5d4eeaa20` = ticket docs only |
| API-R2 | — | server typecheck | Reused IMP-12 (`TSC EXIT 0`) | — | Pass | — | — | same commit |
| API-R3 | — | architecture guards | Reused IMP-05 | — | Pass except baseline FU-005 | — | — | no architecture-relevant change since; FU-005 is the upstream `agent-memory-explorer-service.ts` call, recorded by implementation |
| API-R4 | AC-001…010 (component) | web guards + specs | Reused IMP-06, IMP-07 | — | Pass | — | — | no web source change since `8a2db203dc` |
| API-00 | — | build | `pnpm -C autobyteus-server-ts test:integration:prepare` | ENV-1 | Pass | `API-00-integration-prepare.log` | `Integration test prerequisites are present.`, `EXIT 0` | builds server dist (used by ENV-4) and Brief Studio's package (ENV-3) |
| API-01 | preserved behavior | server integration | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-01-server-integration-excerpt.log` (full: `API-01-server-integration-full.log`) | `Test Files  78 passed \| 20 skipped (98)`, `Tests  419 passed \| 70 skipped (489)`, `EXIT 0` | 20 skipped files are `RUN_*`-gated live suites; the `ACTIVATION_FAILED` line in the full log is a test's own expected output |
| API-02 | AC-006/009 inputs; fake fidelity | real vendor CLIs signed out | `node probe-real-shapes.mjs`; `node probe-codex-model-list.mjs` (sources in the log) | ENV-6 | Pass | `API-02-real-cli-signed-out-shapes.log` | `claude auth status --json` `EXIT=1` + `"loggedIn": false`; `grok models` `EXIT=0` `"You are not authenticated.\n\nDefault model…`; `agy models` `EXIT=1` `Error: Please sign in…`; Codex `{"account":null,"requiresOpenaiAuth":true,…}` | the fakes reproduce these answers verbatim |
| API-10 | AC-001 (API), 002, 003, 005, 006, 007, 009, 011, QR-002, QR-003, DEC-007, DEC-008 | GraphQL over HTTP, real child processes, close path | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-10-agent-runtimes-graphql-e2e.log` | 12 `✓` lines AR-01…AR-12; `Tests  12 passed (12)`; `[AR-11] scanned 342 API responses, 408 stdout/stderr writes, 11 data files; markers 6; hits 0`; `EXIT 0` | 4 green runs (last one with the final fixture). AR-01: Codex/Claude resolved while Antigravity's source was held (`CHECKING`), Claude `CHECK_FAILED` with `2.1.200` kept and `SIGNED_OUT` from JSON + exit 1. AR-03: `codex update`, step line, `fromVersion 0.150.0 → toVersion 0.163.0`, kept after the re-check, cleared by a user check. AR-04: exit 0 + same version → `FAILED`, `Claude is up to date!`. AR-05: ANSI stripped, `AGENT_RUNTIME_BUSY`, Try again. AR-06: codes `AGENT_RUNTIME_NOT_INSTALLED`, `AGENT_RUNTIME_SIGN_IN_UNSUPPORTED`, `AGENT_RUNTIME_UNKNOWN`. AR-07: sign-in operation has `command/step/error` null; `SIGNED_IN`. AR-08: Cancel kills the login pid. AR-09: Grok installed later appears on the next check; the login ignoring SIGTERM → `DID_NOT_FINISH` after time-out + 3 s SIGKILL, pid gone. AR-10: DEC-008 `NOT_APPLICABLE`. AR-12: server close kills a running login |
| API-11 | AC-004 (live counts incl. an Application team member, SR-011/AR-008); readiness unchanged (SCN-A3) | studio server + Brief Studio backend + both run managers; launch-configuration REST view | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts --no-watch --reporter=verbose` | ENV-3 | Pass | `API-11-agent-runtimes-running-agents-e2e.log` | `Tests  4 passed (4)`, `EXIT 0` | RA-01: Codex signed out → 3 issues `RUNTIME_AUTHENTICATION_UNAVAILABLE` "Codex authentication is unavailable: no logged-in account." (base text) for `/`, `/researcher`, `/writer`; signed in or `notRequired` → `RUNNABLE`. RA-02: Claude signed out (JSON + exit 1) → "Claude authentication is unavailable: " (base `describeFailure` text, empty stderr); signed in → `RUNNABLE`. RA-03: one standalone Codex agent → `runningAgentCount 1`, Update refused "Update unavailable while 1 agent(s) are running." (`AGENT_RUNTIME_AGENTS_RUNNING`), no updater started; after `terminateAgentRun` → 0 and Update runs to `SUCCEEDED`. RA-04: Brief Studio `launchDraftRun` → one more Codex `thread/start` (coordinator) and count 1 while the studio's `terminateAgentTeamRun` says "Agent team run not found." (so only the application-platform read sees it); + standalone → 2 and "2 agent(s)"; Antigravity unaffected (count 0, its Update starts) |
| API-12 | AC-001 (API), AC-002, AC-006 on real installs | real studio server, real CLIs via unchanged resolvers, real sources | temporary vitest file (source appended to the log; file removed) run with `env -i PATH HOME=<empty> CODEX_HOME=<empty> TMPDIR` | ENV-5 | Pass | `API-12-real-cli-signed-out-real-sources.log` | `[API-12] own --version {"codex_app_server":"0.163.0","claude_agent_sdk":"2.1.302","antigravity_cli":"1.4.3","grok_build":"1.0.62"}` and four rows `installed=true` with those versions, `account=SIGNED_OUT`, updates `UP_TO_DATE`/`UPDATE_AVAILABLE` (Claude `2.1.304`) | proves the real binaries' version/sign-in answers and today's real source formats through the shipped code, with no account |
| API-20 | AC-001, 002, 003, 004 (UI), 005, 006, 007, 009, 010, 011 (UI), SR-012 widths, zh-CN, VIS-001/004–009/018/019/022 | browser on a real stack | `pnpm -C autobyteus-web test:e2e:agent-runtimes-settings -- --skip-server-build --output-dir=<evidence>/API-20-agent-runtimes-settings-probe` | ENV-4 | Pass | `API-20-agent-runtimes-settings-probe/result.json`, `API-20-console.log`, 17 screenshots `ARP-*.png`, `backend.log`, `frontend.log`, `migrate.log` | `result.json`: `"result": "Pass"`, 10 cases `"result": "Pass"`, `"browserErrors": []`, `"cleanup": {"browser":"closed","frontend":"terminated:…","backend":"terminated:…","tempRoot":"removed"}`; `ARP-02-layout.tableFromWindowPx` = `{"stackedAt":1250,"tableAt":1252,"listWidthRemAtTable":58.1}`; `ARP-10-scan.hits` = `[]` | 3 green runs; run 1 had 3 probe-assertion bugs (text normalization of `·`, Playwright refusing to click an `aria-disabled` button, a dependent case), fixed in the probe, no product change. ARP-01: menu order API Keys → Agent Runtimes; Antigravity `checking` while Codex resolved (`ARP-01a`); exact copy for all states; Grok link `https://docs.x.ai/build/overview`, `target=_blank`, restart hint. ARP-02: 1440/1280 table, 1100/1024/739/390 stacked with visible labels, no overflow or cell overlap at any width. ARP-03: real count from a live Codex agent → "Update unavailable while 1 agent is running.", `aria-disabled`, `aria-describedby`, a press sends no mutation; enabled after the agent ends. ARP-04: `codex update · Installing…`, "Updated from 0.150.0 to 0.163.0.", kept after re-check, live region "Codex updated to 0.163.0.". ARP-05: Check again recovers Claude's source; failed update + vendor `EACCES` text + "Try again". ARP-06: "Signing in…", "Finish signing in to Codex in your browser.", Cancel → "Sign in"; completion → "Signed in", "Codex is signed in.". ARP-07: zh-CN menu/title/hints at 1440 (table) and 739 (stacked). ARP-08: window bound to a non-embedded node (the store action a node window uses) → same states, remote note, no action buttons, hints or blocked line. ARP-09: unreachable node → error + Retry. ARP-10: 724 GraphQL responses, page HTML, 1,122 data-root files, backend stdout → 0 secrets |
| API-21 | — | web guards | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | ENV-1 | Pass | `API-21-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` | — |
| API-40 | AC-001, AC-002, AC-006 (real) | real desktop app, real accounts | the user opened Settings → Agent Runtimes in ENV-7; `agentRuntimes` read over GraphQL | ENV-7 | Pass | `api-e2e-real/API-40-before-update-agentRuntimes.json.log` | Codex `0.163.0` `UP_TO_DATE` `SIGNED_IN`; Claude `2.1.302` `UPDATE_AVAILABLE` (`2.1.304`) `SIGNED_IN`; Antigravity `1.4.3` `UP_TO_DATE` `SIGNED_IN`; Grok `1.0.62` `UP_TO_DATE` `SIGNED_IN` | the user's own screenshot of the page showed the same four rows and one Update button (Claude) |
| API-41 | AC-003 (real) | real vendor updater started by the app | the user clicked Update on Claude in ENV-7; the Claude row was polled every 0.5 s (`watch-claude.mjs`); then `claude --version` | ENV-7 | Pass | `api-e2e-real/API-41-claude-real-update-watch.log` | `"state":"RUNNING","command":"claude update","step":"Successfully updated from 2.1.302 to version 2.1.304"` → `"state":"SUCCEEDED",…"fromVersion":"2.1.302","toVersion":"2.1.304"` → `"updates":{"state":"UP_TO_DATE","latestVersion":"2.1.304"}` with the result kept; `2.1.304 (Claude Code)` | **Changed the user's real install: Claude Code 2.1.302 → 2.1.304** (the product's normal behavior, the user's click). About 2 s from click to Up to date |
| API-42 | AC-006, AC-007 (real) | real sign-out detection and in-app sign-in | the user signed out of Codex and Grok, saw them detected as Not signed in, then clicked Sign in on the page for each; the vendor sign-in page opened in his browser and the rows reached Signed in (user's report in the conversation, 2026-10-20); final state read over GraphQL | ENV-7 | Pass | `api-e2e-real/API-42-after-real-sign-in-agentRuntimes.json.log` | all four `SIGNED_IN`, `operation: null` | the browser hand-off and completion were observed by the user, the step only he could do; the API state after it is recorded |
| API-43 | AC-011 (real) | instance data root, desktop/server log, API answers after real update and sign-ins | `python3 scan-real.py <data root> <instance log> <API-40/41/42>` (source in the log) + positive control | ENV-7 | Pass | `api-e2e-real/API-43-real-secret-scan.log` | `"filesScanned": 103`, `"hits": []`; control file hit all 7 patterns | patterns: OpenAI/xAI auth URLs, OAuth parameters, device codes, tokens, API-key-like strings, e-mail addresses |
| API-44 | AC-006 (real CLI answers beside the page) | the real CLIs under the real HOME | `--version` of each; `grok models`; `claude auth status --json` (non-identifying fields only); `agy models` (first lines); `codex login status` (exit + first words) | ENV-7 host shell | Pass | `api-e2e-real/API-44-real-cli-answers-redacted.log` | **Grok signed in really prints `You are logged in with grok.com.` + model list, `EXIT=0`** (no "You are not authenticated." → the strategy's rule reads Signed in); Claude `{'loggedIn': True, 'authMethod': 'claude.ai', …}`; agy lists models `EXIT=0`; codex `Logged in using` `EXIT=0`; versions `0.163.0`, `2.1.304`, `1.4.3`, `1.0.62` | identifiers redacted before saving; every CLI's own report matches the page |
| API-45 | AC-001 (real desktop UI) | the instance window | read the page DOM and screenshot over the control port (read-only) | ENV-7 | Pass | `api-e2e-real/API-45-real-page-dom.log`, `api-e2e-real/API-45-real-page-after-update-and-sign-in.png` | four rows `up_to_date`, `Signed in`, Claude `2.1.304`; "Checked 1 min ago" | the "Updated from 2.1.302 to 2.1.304." line had been cleared by a later user-started check, as designed (AR-006) |
| API-30 | AC-001 (real desktop) | isolated desktop instance | — | — | Superseded by API-40…45 (round 2) | — | — | Opening the page in an isolated instance would read the user's real Claude/Antigravity/Grok accounts (only `CODEX_HOME` passes through to its embedded server). The design forbids his accounts in automated tests. The real installs are proven signed out by API-12, and the renderer by API-20. This case is the user's check at delivery |

New test files were also type-checked with the package's strict `tsconfig.json` (temporary config limited to the three new TS files): the only reports are TS4111 index-signature style errors on `process.env.X`. That config reports 5,509 such errors across `src`, and its build config (`tsconfig.build.json`) does not include tests, so it is not a project gate.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-10 (AR-01), API-12, API-20 (ARP-01/02/07/09), API-R4, **API-40, API-45** | Proven (round 2: the real desktop app with the real installs) | API-20 ran the real renderer against a real server; API-12 read the real installs through the shipped resolvers. The packaged desktop on the user's own login shell (which runtimes its PATH finds) needs his real home, where opening the page reads his accounts → user's check |
| AC-002 | Yes | API-10 (AR-01/02), API-12, API-20 (ARP-01/05) | Proven | real sources answered in API-12 (Claude behind: `2.1.304`), independence/failure/recovery with controlled sources |
| AC-003 | Yes | API-10 (AR-03/04/05), API-11 (RA-03), API-20 (ARP-04/05), **API-41** | Proven (round 2: a real Claude update 2.1.302 → 2.1.304 from the page) | a real `<runtime> update` changes the user's install (vendor differences such as Homebrew) → delivery with his consent |
| AC-004 | Yes | API-11 (RA-03/04), API-20 (ARP-03) | Proven | live standalone and Application (Brief Studio) agents, per runtime |
| AC-005 | Yes | API-10 (AR-01/06/09), API-20 (ARP-01) | Proven | "after installing and restarting" shown as the next check after the command override points at an installed binary; a real install + restart is the user's |
| AC-006 | Yes | API-02, API-10 (AR-01/10/11), API-12, API-R1, **API-40, API-42, API-44** | Proven (round 2: real signed-in states of all four, real sign-out detected; Grok's real signed-in output recorded) | signed-in outputs of the real CLIs (especially `grok models`) need the user's accounts |
| AC-007 | Yes | API-10 (AR-07/08/09/12), API-20 (ARP-06), **API-42** | Proven (round 2: `codex login` and `grok login --oauth` started by the app opened the vendor page in the browser and completed to Signed in; the browser step was the user's own action within the run) | whether `codex login` / `grok login --oauth` open the browser when AutoByteus starts them without a terminal needs a real sign-in with his account |
| AC-009 | Yes | API-02, API-10 (AR-01), API-12, API-20 (ARP-01/07) | Proven | Claude 2.1.302's real signed-out answer (JSON + exit 1) reaches "Not signed in" + hint |
| AC-010 | Yes | API-20 (ARP-08), API-R4 | Proven (renderer); a real remote node window: Only The User Can Check | the window was bound to a non-embedded node with the same store action; a window opened on one of the user's remote/Docker nodes is his setup |
| AC-011 | Yes | API-10 (AR-07/11), API-20 (ARP-10), **API-43** | Proven (round 2 includes real sign-ins and real reads) | fakes print sign-in URLs, challenges and account e-mails (6–7 markers); 0 hits in API responses, server stdout/stderr, log files and data roots at `trace` logging |

## Validation Confidence Scorecard (Mandatory)

Scored over what can be proven without the user; the user-only parts are listed for delivery.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | API-10, API-11, API-12, API-20 | user-only parts (real update, real sign-in, signed-in outputs, real desktop) | delivery's user check |
| Changed-boundary execution directness | 75% | 96% | real HTTP GraphQL/REST, real child processes, real application platform, real renderer on a real server | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | API-12 (real binaries + real sources), API-02 (fakes copy real answers), API-11 (real Brief Studio backend) | vendor update/login processes are scripted | real update/sign-in at delivery |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | clean env, isolated data roots, real-shape fakes, real installs signed out (API-12) | signed-in answers are illustrative; remote window bound through the store, not Electron's window context | the user's own Mac |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 96% | AR-01/04/05/06/08/09/12, RA-03, ARP-05/09 | the 10-minute time-out is exercised at 6 s (constant asserted) | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | API-20 (journeys, 8 widths, zh-CN, remote, error, a11y attributes), API-R4 | no packaged desktop run (no shell code changed) | user's desktop check |
| Durable regression coverage quality and relevance | 75% | 95% | API-10 (12 cases), API-11 (4 cases), API-20 (10 cases), all repeatable without network or accounts | Brief Studio package must be built (`test:integration:prepare`), skipped otherwise | — |

- Overall post-repository confidence: 75% (repository evidence = reused unit/component checks + integration run; every new boundary was mocked)
- Overall final confidence: 95.3% (round 1). **Round 2: 97.1%**: requirement proof 98%, directness 97%, realism 98%, environment/identity fidelity 98%, failure/lifecycle 96%, user surface 96% (real desktop window; a real remote node window is still emulated), durable regression 95% (unchanged)
- Calculation method: simple average of the seven final scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: real vendor update/login behavior from a non-terminal process (`codex login` browser opening, Homebrew-style updaters), real signed-in outputs (Grok), the packaged desktop's PATH finding the user's installs, a real remote node window.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (in-process real servers with real processes; real CLIs signed out) + `Browser` (real stack)
- Confidence gap or residual risk it addresses, and the expected gain: all new boundaries (GraphQL contract, vendor processes, application-platform count, renderer journeys, width switch) were proven only through mocks before; the runs raised every category to ≥ 95%.
- Browser validation needed, and why or why not: yes: a new Settings section with polling, journeys, a width-dependent layout, zh-CN and a remote-node gate.
- If `Blocked`: —

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: web-equivalent renderer proven by API-20; the planned isolated-instance open (API-30) was not run (user accounts, see Cases).
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-20 (renderer); no shell code changed (`git diff aac5da3112..52aa663edd` has no Electron file).
- Effect on any already-running desktop application: `None` (the two running `/Applications/AutoByteus.app` isolated roots belong to other work and were not touched).
- Behavior not directly proven and its confidence consequence: the packaged app's login-shell PATH finding the user's runtimes. The lookup itself is unchanged (UD-007) and API-12 proves the resolvers on PATH; this is the user's AC-001 check.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the Claude plain-text "logged in" fallback is the design's preserved application-readiness rule, ARCH-REV-003, not a version shim)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Added | API-10 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Added | API-11 | — |
| `autobyteus-server-ts/tests/e2e/helpers/agent-runtimes-e2e-harness.ts` | Added | API-10, API-11 | — |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` (mode 755) | Added | API-10, API-11, API-20 | — |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` | Added | API-20 | — |
| `autobyteus-web/tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs` | Added | API-20 | — |
| `autobyteus-web/package.json` (`test:e2e:agent-runtimes-settings`) | Updated | API-20 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Codex, Claude, Antigravity, Grok CLIs (API-10/11/20) | `agent-runtimes-fake-cli.mjs`, real signed-out answers (API-02), scripted update/login/signed-in | real update/login change the user's installs and accounts | vendor update/login behavior; closed for status reads by API-12 |
| Vendor latest-version sources (API-10/11/20) | in-process `fetch` stub (e2e), `--import` stub in the probe backend | determinism (failing/slow/newer on demand) | closed by API-12 (real sources) and IMP-10 |
| Remote node window (API-20) | `windowNodeContext.bindNodeContext('remote-probe-node', …)` in the page | a real remote node window needs the user's node registry and Electron | Electron's window-context hand-off (unchanged code) |
| 10-minute operation time-out (API-10) | `vi.mock` sets `OPERATION_TIMEOUT_MS` to 6 s for that file; the real value is asserted | test duration | none for the logic; the constant is checked |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| e2e temp roots (fakes, data roots, HOMEs) | Yes | `dispose()` in `afterAll`, `rm -rf` of the resolved temp HOMEs | removed; one root left by an exploratory API-11 run whose close hook timed out (before the Codex fake ended interrupted turns) was removed by hand |
| Probe backend, Nuxt dev, Chrome, temp root | Yes | probe `finally` | `result.json` cleanup: browser closed, frontend/backend terminated, tempRoot removed |
| API-12 temporary test file | Yes | deleted after the run; source kept in its evidence log | removed |
| `/tmp/rlr-api-e2e` scratch (probe scripts, earlier probe outputs) | Yes | earlier probe outputs deleted; probe scripts kept in API-02's log | — |
| Build outputs (`*/dist/`, Brief Studio package) | Yes | left untracked, not committed (TESTING.md) | — |
| Running `/Applications/AutoByteus.app` isolated roots | No | left alone | — |

## Latest Authoritative Result

- Result: `Pass` (round 2, API-REV-002)
- Criteria not proven, or parts only the user can check (IDs): round 2 closed the user-only parts of AC-001, AC-003, AC-006 and AC-007 with the user's real home and accounts. Remaining: AC-010 in a real remote/Docker node window (the renderer gate is proven by API-20 ARP-08; no remote node was used in round 2).
- Round 2 durable test changes: none (no test-code review needed).
- Round 2 instance: `iso-56551-47f6` is left running at the user's request; stop with `pnpm --silent isolated-app stop iso-56551-47f6` (removes its data root).
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient: round 1 code reviewer (proportional test-code review, done as CRR-003); round 2 back to the delivery engineer who requested it (no durable test changed)
- Notes:
  - Observation for the Solution Designer: requirements "UI note (SR-010)" item (3) says windows "roughly 640–1100 px wide" show stacked rows; measured, the table starts at a 1252 px window (list 58.1 rem). The rule itself (≥ ~58 rem list; table at 1280/1440) holds. This is wording only.
  - Follow-up FU-006 added (mid-run import of a Codex-default app is quarantined; same on the base).
