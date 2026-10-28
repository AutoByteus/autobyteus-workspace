# API/E2E Execution Coverage Report — test-and-tooling-hygiene-294 (autobyteus-294)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-002; **round 2 (current), code review pass CRR-004 of the IR-003 packaging fix `75e9f323f0`** (§ Round 2 below)
- Prior round reviewed: round 1 (API-REV-001, Pass 95.3%)
- Deviations from the investigation's plan, and why:
  - API-20 ran file by file (run 2, temporary runner) after the full `pnpm test:e2e` (run 1) was stopped at the 2 h tool limit; the machine slept 03:32-05:16, which explains run 1's apparent hang. The two files that started at sleep boundaries were rerun awake.
  - Five red tests were found and fixed as Rule 9 baseline fixes (API-04, API-20 ×2, API-23, API-24); each is in the investigation's Durable Coverage To Update with its cause.
  - API-23 also ran the whole Claude integration file, because the fixed helper serves all five gated tests.
  - The named-spec supplement of API-05 ran in the worktree (the clone's `node_modules` had lost `cross-env`'s bin by then); the web specs are identical (`git diff --name-only dfef14abc6 HEAD -- autobyteus-web` lists only the probe file).
  - Later code commits are test-only (`dfef14abc6`, `a001e645c7`, `bce2f8b4e3`, `e60f4d89a0`, `6af8819ede`); no production file changed since `256cee925e`, so the earlier cases stay valid for production code.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/tickets/in-progress/test-and-tooling-hygiene-294/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `54ed02d56d` (code `256cee925e`); from API-04 run 2 on: `dfef14abc6` | macOS 26.5 arm64, 10 cores, heavily loaded | clean clone `$TMPDIR/ab294-clone.tmxUngS47b/repo` of the branch; `pnpm install --frozen-lockfile`, server `prebuild`, `nuxt prepare`; Node 22.23.1, pnpm 10.28.2 | shell env (server unit/integration isolate their env); no prior build outputs |
| ENV-2 | `dfef14abc6` → `6af8819ede` (later commits are test-only) | same | worktree; server built by API-13 (server `src` unchanged since); packaged app built by API-24 | probe-owned stacks; headless Chrome; clean env (`env -i`, resolved temp HOME) for E2E; real HOME/USER/LOGNAME for codex/claude; `caffeinate -is` from API-20 run 2 on |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-032 (setup), AC-024 (missing package) | clean clone, install order | `git clone --branch codex/test-and-tooling-hygiene-294 <worktree> repo`; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild`; `pnpm -C autobyteus-web exec nuxt prepare`; then, before `test:integration:prepare`: `env -i PATH HOME=<temp> TMPDIR pnpm exec vitest run tests/e2e/runtime/application-reload-repair.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-clean-clone-setup.log` | three `exit: 0`; `Error: Brief Studio importable package missing (…/applications/brief-studio/dist/importable-package); build it with: pnpm -C autobyteus-server-ts test:integration:prepare`; `Test Files  1 failed (1)` | the suite fails loudly instead of skipping (the second half of AC-024, "passes after it", is API-20) |
| API-02 | AC-006, AC-025 | server `src` types | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-02-server-typecheck.log` | `exit: 0` | 16 s |
| API-03 | AC-001, 004, 005, 006, 025, 026 | server unit + architecture + Work Journal | `pnpm -C autobyteus-server-ts test:unit`; supplements: `vitest list --filesOnly` with the same arguments; verbose run of `tests/architecture tests/agent-work-journal tests/unit/secret-management`; verbose run of SD-07's two failing files and the Work Journal perf file | ENV-1 | Pass | `API-03-server-test-unit.log` | `Test Files  864 passed \| 5 skipped (869)`; `tests/architecture files: 7`; `tests/agent-work-journal files: 7`; `✓ … deepseek.compaction-agent-flow reaches agent setup …`, `✓ … lmstudio.qwen36.compaction-agent-flow …`, `✓ … captures post failure before termination/deletion and rethrows original without provider traffic`; perf `↓` (skipped without its gate) | 11 min 43 s on the loaded machine. The `APP_DATA_STARTUP_GATE_FAILED` line in the log is a test's expected output. No live compaction run (DEC-025) |
| API-04 | UC-001, AC-032 | server integration | `pnpm -C autobyteus-server-ts test:integration:prepare`; `pnpm -C autobyteus-server-ts test:integration` (run 1 at `54ed02d56d`; run 2 at `dfef14abc6`) | ENV-1 | Pass (run 2) | `API-04-server-test-integration.log` | run 1: `Tests  1 failed \| 440 passed`; run 2: `Test Files  80 passed \| 20 skipped (100)`, `exit: 0` | Run 1 failed `remove-built-in-project-task-manager-startup.integration.test.ts` ("expected [ 'autobyteus-daily-assistant', …(1) ] to deeply equal [ 'autobyteus-daily-assistant' ]"). Cause: the test (unchanged by this branch) predates `930597c730` (autobyteus-32), which made the Model Router a built-in. Baseline fix `dfef14abc6` (Rule 9; investigation § Durable Coverage To Update) |
| API-05 | AC-002, AC-020, AC-034, AC-008 (gate spec), BEH-028 specs, CR-001 plugin spec | web unit/component | `pnpm -C autobyteus-web test:nuxt --run` | ENV-1 | Pass | `API-05-web-test-nuxt.log` | `Test Files  666 passed (666)`; `Tests  4836 passed \| 2 skipped (4838)` | same file count as IMP-03/IMP-19 |
| API-06 | preserved (Electron main) | Electron main | `pnpm -C autobyteus-web test:electron --run` (run 2) | ENV-1 | Pass (run 2) | `API-06-web-test-electron.log` | run 2: `Test Files  48 passed \| 1 skipped (49)`, `exit: 0` | Run 1: one suite `Electron failed to install correctly`. Cause: `electron@42.11.16` has no install script and downloads its binary on the first `require('electron')`; two workers raced (`File exists (os error 17)`); `path.txt`/`dist/` were created during run 1. Pre-existing fresh-clone behaviour, not this change (lockfile Electron entry unchanged): follow-up FU-011 |
| API-07 | AC-007, QR-002 | web type gate | `pnpm -C autobyteus-web typecheck` (no vitest running) | ENV-1 | Pass | `API-07-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`; `[typecheck] PASS`; `real	0m42.534s` | Electron 27 / build 0 errors, each under its own config |
| API-08 | AC-009 chain, DEC-006 | web guards | the three guard scripts | ENV-1 | Pass | `API-08-web-guards.log` | `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.`; `[audit:localization-literals] Passed with zero unresolved findings.` | |
| API-09 | AC-021 | gateway + Docker image | in `autobyteus-message-gateway`: `pnpm install --frozen-lockfile`, `build`, `typecheck`, `test`; from the clone root: `docker build -f autobyteus-message-gateway/docker/Dockerfile -t ab294-gateway-test:local .`; `ls dist` in the image; `docker rmi` | ENV-1 | Pass | `API-09-gateway.log` | `ls: autobyteus-message-gateway/scripts: No such file or directory`; four `exit: 0`; `Test Files  86 passed (86)`; `#16 [11/11] RUN pnpm build … DONE`; image `dist` lists `application`, `bootstrap`, … | image removed |
| API-10 | AC-006, AC-021, AC-025, AC-026, AC-029 (grep) | repository content | `git grep` / `git ls-tree` at `256cee925e` | ENV-2 | Pass | `API-10-repository-grep-checks.log` | each tool name `0 matches`; `tracked .js under autobyteus-server-ts/tests: 0`; `i-heroicons- matches: 0`; gateway script names 0 (the 11 `release-manifest` hits are old committed Electron build logs under `test-results/`, file names of the long-removed managed-gateway feature) | the only Claude `env?:` left is `withClaudeControlQuery`'s input, which receives the spawn builder's output (production path) |
| API-11 | AC-008 | gate fail-closed | Reused: IMP-06 | — | Pass | (IMP-06) | (IMP-06) | `scripts/` and `typecheck-baseline.json` unchanged since `55d6c1d5b0` (`git diff --name-only 55d6c1d5b0 256cee925e` empty); API-07 shows the baseline still exact |
| API-12 | AC-019 | built server start | Reused: IMP-12; observed: FSTDEP / request-log lines in the four probe backends' logs (API-14, API-15) | ENV-2 | Pass | `API-12-fastify-startup-observed.log` | every backend log `FSTDEP 0`; Fastify request-log messages `0` | server `src` unchanged since `6fa5f443c6` where IMP-12 ran. Three node-a lines carrying `reqId` are application logs (two GraphQL errors; one 404 warning from `src/logging/http-access-log-policy.ts`, identical on base) |
| API-13 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-2 | Pass | `API-13-server-build.log` | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.`; `exit: 0` | shared packages unchanged by the branch |
| API-14 | AC-014 | Settings → Agent Runtimes, real stack | `pnpm -C autobyteus-web test:e2e:agent-runtimes-settings --skip-server-build --output-dir=autobyteus-web/test-results/ab294-api14-agent-runtimes-212717` | ENV-2 | Pass | `API-14-agent-runtimes-probe.log`, `API-14-agent-runtimes-result.json`, `API-14-ARP-01b-table-1440-en.png`, `API-14-ARP-04b-updated.png`, `API-14-ARP-07a-zh-CN.png`, `API-14-ARP-09-load-error.png`, `API-14-ARP-11c-remote-codex-signed-in.png` | `"result": "Pass"`, `darwin-arm64`; ARP-01..07, 09..12 `Pass`; ARP-08 `Not applicable` ("a darwin node always has a desktop browser"); `browserErrors: 0`; cleanup `tempRoot: removed` | the base failures ARP-01, 04, 09, 11 (SD-05) now pass |
| API-15 | AC-028 | Projects board, offline backends | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=autobyteus-web/test-results/ab294-api15-projects-212943` | ENV-2 | Pass | `API-15-projects-probe.log`, `API-15-projects-result.json`, `API-15-node-a-outside-network.log`, `API-15-PT-E2E-013-pass.png` | PT-E2E-001..017 `Pass`; PT-E2E-013 `"meaningSearch":{"state":"UNAVAILABLE","reason":"Could not reach huggingface.co to download the model: fetch failed: the probe node has no outside network (huggingface.co)"}`; refused hosts `2 huggingface.co` | node-b made no outside request (its log file is created on the first refusal). No other case broke under the offline stub |
| API-16 | AC-018 | upgrade E2E | `env -i PATH HOME=<resolved temp> TMPDIR pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-16-team-run-v1-upgrade-e2e.log` | `Tests  4 passed (4)` | |
| API-17 | AC-011 | DLC gated, scripted AGY | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-17-dlc-gated-e2e.log` | `Tests  3 passed (3)` | `followsTeam` is in every member expectation (15 uses in the file) |
| API-18 | AC-012 | SUN gated | same gate, `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | ENV-2 | Pass | `API-18-sun-gated-e2e.log` | `Tests  3 passed (3)` | the test's fetch stub answers every github.com/api/codeload request in-process and throws `Unexpected GitHub request` otherwise, so no request leaves |
| API-19 | AC-013 | multi-image gated | same gate, `tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` | ENV-2 | Pass | `API-19-multi-image-gated-e2e.log` | `Tests  2 passed (2)` | |
| API-26 | AC-031, AC-033 | docs | read the doc against `buildDefaultAgentToolMcpAdapterProviders`; read TESTING.md and its commits | ENV-2 | Pass | `API-26-docs-read.log` | `count: 12`, "All 12 providers listed."; `ef5a18f4d4 docs(testing): live compaction runs are not required proof`; `180:  Prove compaction with the deterministic layers` | |
| API-20 | UC-002; AC-003, AC-023, AC-024 (passes after prepare) | full server E2E | run 1: `env -i PATH HOME=<resolved temp> TMPDIR pnpm test:e2e` (stopped at the 2 h tool limit after 62/207 files). Run 2: the same tests file by file, `env -i PATH HOME=<temp> TMPDIR node run-e2e-per-file.mjs` (each `pnpm exec vitest run <file> --no-watch --reporter=verbose`, 900 s deadline), indices 0-98 at `a001e645c7`, 99-206 at `bce2f8b4e3` under `caffeinate -is`; reruns of indices 1 and 8 awake; index 21 rerun after its baseline fix (API-20b) | ENV-2 | Pass | `API-20-server-e2e-full.log` (run 1), `API-20-server-e2e-per-file.log` (summary, one line per file), `API-20-server-e2e-per-file-logs.tgz` (each file's full output), `API-20-run-e2e-per-file.mjs.txt` (runner), `API-20a-workspaces-e2e-baseline-fix.log`, `API-20b-ptm-startup-e2e-baseline-fix.log` | `END lines: 207`; `TIMEOUT: 0`; `RERUN PASS 21s …agent-package-definitions-live-refresh…`, `RERUN PASS 6s …scoped-org-history-graphql…`; `END 204 PASS … archive-run-history-graphql … tests: 6 passed (6)`; `END 90 PASS … agent-runtimes-running-agents … tests: 4 passed (4)`; `END 116 PASS … application-import-codex-launch … 2 passed`; `END 117 PASS … application-reload-repair … 5 passed`; `END 206 PASS … workspaces-graphql … 11 passed`; API-20b `Tests  4 passed (4)` | Three in-scope test lags found and fixed as Rule 9 baseline fixes: `workspaces-graphql` (config double lacked `get`, since `d384968700`; `a001e645c7`); `remove-built-in-project-task-manager-startup` E-003 (built-in folder list, since `930597c730`; `bce2f8b4e3`). Run 1's silent "hang" and run 2's inflated times: the Mac slept 03:32-05:16 on battery (pmset log); indices 1 and 8 started at sleep boundaries (`Test timed out in 30000ms`, `TEST_SERVER_START_TIMEOUT`) and pass when awake. 101 files are fully skipped by their own `RUN_*` gates (gated ones relevant here ran in API-17..19, 21..23) |
| API-21 | AC-027 | Codex routing, real codex | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR CODEX_HOME=<temp: auth.json symlink, empty config.toml> RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts --no-watch --reporter=verbose` | ENV-2, codex-cli 0.164.0 | Pass | `API-21-codex-routing-e2e.log` | `"code":"DELIVERED"` (active), `"code":"TARGET_AGENT_RUN_NOT_ACTIVE"` (after termination); `Tests  1 passed (1)` | throwaway `CODEX_HOME` keeps the user's Codex config and history untouched |
| API-22 | deviation 6 | Codex manager lease, real codex | same env, `tests/integration/runtime-management/codex/client/codex-app-server-client-manager.integration.test.ts` | ENV-2 | Pass | `API-22-codex-manager-integration.log` | `✓ … reuses one real app-server client per canonical cwd`; `✓ … releases the last acquired client and starts a fresh …`; `Tests  2 passed (2)` | |
| API-23 | REQ-023 / deviation 6 | Claude CLI Stop contract, real `haiku` | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts -t "cancels a queued message"` (runs 1-3), then the whole file (run 4) | ENV-2 | Pass (runs 3-4) | `API-23-claude-cancel-queued.log` | run 1 `TypeError: client.openStreamingSession is not a function`; run 2 `TypeError: session.close is not a function`; run 3 `✓ … path-claude cancels a queued message …`, `✓ … sdk-bundled-claude cancels …`, `Tests  2 passed \| 3 skipped (5)`; run 4 `Tests  5 passed (5)` | the shared helper used two APIs `028cca2312` removed before this branch; baseline fix `e60f4d89a0`. Same stale call in an untouched real-provider suite: FU-012 |
| API-24 | AC-016, AC-009 (build log) | packaged build through `build:electron:mac` + isolation probe | run 1: `caffeinate -is pnpm -C autobyteus-web test:e2e:electron:isolation --output-dir=<fresh>` (builds the package); run 2: the same with `--skip-build` on run 1's package after the probe's baseline fix | ENV-2 | Pass (run 2) | `API-24-electron-isolation.log`, `API-24-run1-electron-launch-profile-evidence.json`, `API-24-run2-electron-launch-profile-evidence.json`, `API-24-run2-provider-settings.png` | build chain line `… pnpm audit:localization-literals && pnpm typecheck && pnpm prepare-server …`; `[typecheck] PASS`; `Build completed: [ …AutoByteus_enterprise_macos-arm64-1.5.9-beta.13.dmg …]`; run 1 `E2E-PKG-004 fail` (`expectedMessage: "is unavailable"`, output `listen EADDRINUSE: address already in use 0.0.0.0:60183`); run 2 `[electron-launch-profile-probe] passed`, E2E-PKG-001..005 `"result":"pass"`, `failures 0` | Build 6 min 48 s including the gate (about 40 s). Run 1 cause: the probe still expected the text `f34ad8749f` (on base) removed, the same lag implementation commit `2fd4461897` fixed in the unit spec; baseline fix `6af8819ede`. The probe's ordinary-application checkpoints show the user's running AutoByteus stayed healthy (`health: ok 200`) |
| API-25 | AC-029 | packaged desktop renderer, former class icons | `pnpm --silent isolated-app start --from-worktree` (API-24 package); `node api25-desktop-icons.mjs http://127.0.0.1:60457 <evidence>` over CDP: D-01 Settings nav; D-02 MCP Servers: Bulk Import, Add Server; D-03 Add MCP Server: Add Argument, the argument delete button; D-04 Bulk Import view: Back; D-05 Local Tools: ToolCard icons; D-06 Agents → Daily Assistant → View Details: Run Agent, Edit, Delete; each asserts `svg.iconify--heroicons` with a `path` and a non-zero box in the named control, and no element with an `i-heroicons-` class; `isolated-app stop`, `list` | ENV-2, packaged AutoByteus 1.5.9-beta.13 (worktree build), isolated data root | Pass | `API-25-desktop-icons-result.json`, `API-25-D-01.png` … `API-25-D-06.png`, `API-25-isolated-instance.log`, `API-25-desktop-icons-journey.mjs.txt` | `"result": "Pass"`; nav icons `20x20` ×9; Bulk Import / Add Server `16x16`; argument delete `20x20`; Bulk Import Back `20x20`; `localToolCardIcons: 42`; Run Agent / Edit / Delete `20x20`; `leftoverClassElements: 0` on every step; `consoleErrors: 0`; after stop `"instances": []`, data root removed | The ToolCard icons show `cloud-arrow-down` (purple) because these tools' categories are named (not `LOCAL`); that selection logic is unchanged by this ticket. Icon data loaded from the Iconify API (network available; offline is FU-002) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-03 | Proven | — |
| AC-002 | Yes | API-05 (supplement: `definitionMutationCache.spec.ts` by name) | Proven | — |
| AC-003 | Yes | API-20 (`END 204 PASS … archive-run-history-graphql … 6 passed`) | Proven | — |
| AC-004 | Yes | API-03 (SD-07's three tests by name; no live compaction run) | Proven | — |
| AC-005 | Yes | API-03 (7 journal files collected; perf skipped without its gate) | Proven | — |
| AC-006 | Yes | API-10, API-02, API-03 | Proven | — |
| AC-007 | Yes | API-07 (clean clone), API-24 (inside the build) | Proven | — |
| AC-008 | Yes | API-11 (reused IMP-06; gate files unchanged) | Proven | — |
| AC-009 | Yes | API-24 (build log shows `pnpm typecheck` in `build:electron:mac` and `[typecheck] PASS`), API-08; TESTING.md row (commit `0e8ecd2125`) | Proven | — |
| AC-011 | Yes | API-17 | Proven | — |
| AC-012 | Yes | API-18 | Proven | — |
| AC-013 | Yes | API-19 | Proven | — |
| AC-014 | Yes | API-14 (macOS: all Pass, ARP-08 not applicable) | Proven (macOS) | Linux was not available ("when available"); not a user-only part. SD-14 already showed the same two fixes |
| AC-016 | Yes | API-24 | Proven | — |
| AC-018 | Yes | API-16, API-20 | Proven | — |
| AC-019 | Yes | API-12 (reused IMP-12 + four probe backend logs: `FSTDEP 0`, Fastify request-log messages 0) | Proven | — |
| AC-020 | Yes | API-05 (supplement: `removes script, event handlers, javascript: links and iframes from raw HTML`, `does not turn a Markdown javascript: link into a link`, under jsdom) | Proven | — |
| AC-021 | Yes | API-09, API-10 | Proven | — |
| AC-023 | Yes | API-20 (`agent-runtimes-running-agents … 4 passed`) | Proven | — |
| AC-024 | Yes | API-01 (fails naming the package and the command), API-20 (the three Brief Studio suites pass after prepare) | Proven | — |
| AC-025 | Yes | API-02, API-03, API-10 | Proven | — |
| AC-026 | Yes | API-10, API-03 | Proven | — |
| AC-027 | Yes | API-21 | Proven | — |
| AC-028 | Yes | API-15 | Proven | — |
| AC-029 | Yes | API-25 (packaged desktop app), API-10 (grep) | Proven | — |
| AC-031 | No | API-26 | Proven | — |
| AC-033 | No | API-26 | Proven | — |
| AC-034 | Yes | API-05 (supplement: the four BEH-032 specs by name pass); "fails on the base": IMP-08 (reused; the four fixed files and specs are unchanged since) | Proven | — |
| AC-032 | Yes | API-01..API-09 on a clean clone (install, prepare, server typecheck/unit/integration, web nuxt/electron/typecheck/guards, gateway + Docker) | Proven for this round | Requirements name delivery for the final clean clone of the merged branch. On a fresh clone the first `test:electron` can race Electron's lazy binary download (FU-011); a second run passes |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 96% | every AC above; API-01..26 | AC-014 on Linux not run; AC-008 by reuse | a Linux host |
| Changed-boundary execution directness | 85% | 96% | real suites on a clean clone; real probe stacks (API-14, 15); the packaged build chain (API-24); the packaged renderer (API-25); real Codex and Claude CLIs (API-21..23) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real backends in the probes; scripted AGY CLI for the gated suites (TESTING.md's model-free runtime); real codex/claude | GitHub and Hugging Face are stubbed or refused by design (SUN, PT-E2E-013) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | clean clone (API-01); `env -i` with resolved temp HOME; throwaway `CODEX_HOME`; isolated desktop instance | the machine slept during API-20 run 2; affected files rerun awake | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | loud prerequisite failure (API-01); gate fail-closed (API-11); invalid packaged profiles (API-24 E2E-PKG-004); offline meaning search (API-15); Stop/cancel-queued (API-23); upgrade E2E (API-16) | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 94% | API-14, API-15 (browser); API-24 (packaged shell); API-25 (desktop renderer icons) | BEH-032's phone and custom-provider screens are proven by their component specs (AC-034's stated verification), not rendered in a running app | rendering the phone team views with a running team |
| Durable regression coverage quality and relevance | 90% | 96% | five baseline fixes restore green, unweakened suites (API-04, API-20 ×2, API-23, API-24) | — | — |

- Overall post-repository confidence: 86% (simple average)
- Overall final confidence: 95.3% (simple average of 96, 96, 95, 95, 95, 94, 96)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: BEH-032 screens rendered only in specs; AC-014 Linux; fresh-clone Electron download race (FU-011).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (API-14, API-15), `Project Desktop Validation` (API-24, API-25), `Live API` (API-21..23), `Lifecycle` (API-01 clean clone, API-24 packaged launch)
- Confidence gap or residual risk it addresses, and the expected gain: the handoff's not-run list: probes, packaged build with the gate, real CLIs, the full server E2E, icons in the packaged renderer, a clean clone. Gain: categories 2, 3 and 6 from 75-85% to 94-96%.
- Browser validation needed, and why or why not: yes, for the two probes the ticket repaired (AC-014, AC-028), and the desktop renderer for icons (AC-029).
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation (When Applicable)

- Approach executed: the packaged isolation probe built the mac package through `build:electron:mac` (gate included) and ran E2E-PKG-001..005; an isolated instance of that package ran the icon journey over CDP. As planned.
- Cases proving web-equivalent behavior: API-14, API-15 (and API-05 specs). Cases proving shell-specific or lifecycle behavior: API-24, API-25.
- Effect on any already-running desktop application: `None` (the probe's ordinary-application checkpoints: health 200 before, during and after; the isolated instance used its own ports and data root and was stopped by its id).
- Behavior not directly proven and its confidence consequence: BEH-032 (a)/(c) phone views and (d) custom-provider loading state in a running app (specs only); category 6 at 94%.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: the team-run-v1 upgrade E2E's synthesized released install (API-16); the startup-migration E2E files in API-20.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-16, API-20.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (five TESTING.md Rule 9 baseline fixes; each test was red for a cause in the test, lagging a base commit)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/app-data-migrations/remove-built-in-project-task-manager/remove-built-in-project-task-manager-startup.integration.test.ts` | Updated (`dfef14abc6`): expected built-ins include `autobyteus-model-router` (since `930597c730`) | API-04 | — |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Updated (`a001e645c7`): the config double answers `get()` with `undefined` (since `d384968700`) | API-20 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | Updated (`bce2f8b4e3`): `INSTALLED_BUILT_IN_FOLDERS` for the `agents/` listings (since `930597c730`) | API-20 | — |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Updated (`e60f4d89a0`): helper uses `beginStreamingSession(...).open()` and `requestClose()` (since `028cca2312`) | API-23 | — |
| `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` | Updated (`6af8819ede`): occupied-port case expects `EADDRINUSE: address already in use` and the port (since `f34ad8749f`) | API-24 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (gated suites) | scripted `agy-failure-cli.mjs` (TESTING.md) | model-free runtime by project rule | transport proven, not paid inference (not in scope) |
| GitHub (SUN, Agent Runtimes probe) | in-process fetch stubs (the tests' own fixtures) | deterministic, no outside network (REQ-010, REQ-012) | none for the ACs |
| Outside network in the projects probe | `outside-network-offline.mjs` refuses non-localhost fetch | the ticket's own determinism fix (REQ-026) | none for the ACs |
| Runtime CLIs in the Agent Runtimes probe | `agent-runtimes-fake-cli.mjs` | the probe's design | none for AC-014 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| clean clone `$TMPDIR/ab294-clone.tmxUngS47b` | Yes | `rm -rf` | removed |
| Docker image `ab294-gateway-test:local` | Yes | `docker rmi` | removed |
| probe stacks (API-14, 15, 24) | Yes | the probes' own cleanup | receipts: all terminated, temp roots removed, ports released |
| probe output folders `autobyteus-web/test-results/ab294-*` | Yes | copied the evidence, then `rm -rf` | removed |
| isolated instance `iso-60457-9dbc` | Yes | `isolated-app stop`; `list` | `"instances": []`, data root removed |
| throwaway `CODEX_HOME` (auth.json symlink) | Yes | `rm -rf` | removed (the user's `~/.codex` untouched) |
| per-file E2E runner and CDP journey scripts, `/tmp/ab294-*` | Yes | copied into evidence as `.txt`, then removed | removed |
| `autobyteus-web/electron-dist/` | Yes (build output, git-ignored) | kept: the standard untracked build output, usable by delivery's `--from-worktree` | present |
| temp HOME folders for clean-env runs | Yes | removed after each run | removed |

## Round 1 Result (superseded by § Round 2)

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None` (AC-014 Linux "when available": no Linux host; AC-032's final clean clone of the merged branch stays delivery's, per the requirements)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review of the five baseline fixes; Large / High)
- Notes: follow-ups added: FU-011 (fresh-clone Electron binary download race), FU-012 (stale `openStreamingSession` in the real-provider capabilities E2E). No live compaction run (DEC-025).

## Round 2 — IR-003 packaging fix

- Trigger: Code Reviewer CRR-004 (round 3) after Desktop Release `40640209395` (v1.5.9-beta.14) failed in all five build jobs (DR-001); fix `75e9f323f0` (+ `340cee3763`), HEAD `4f27c2514d`.
- Plan: investigation § Round 2 (cases API-27..API-31).
- Environment ENV-3: fresh clone of `4f27c2514d` in the release job's order (`git clone`; `pnpm install --no-frozen-lockfile`; no prebuild, no `*/dist/`, no build outputs), macOS 26.5 arm64, 64 GB RAM, Node 22.23.1 (default V8 heap limit 4144 MB), pnpm 10.28.2. ENV-2 (worktree) for API-30.
- Rerun by impact: only `autobyteus-web/package.json` scripts, the gate's header comment and docs changed since round 1; the round-1 cases for server code, probes, E2E and live CLIs stay valid. Rerun: the gate (API-27, 28, 30) and the web suites (API-29).

### Round 2 Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-31 | DR-001 | the failed release run's gate output per job | `gh run view 40640209395 --job <id> --log` for the five build jobs (read-only) | GitHub runners | Pass (evidence read) | `API-31-release-run-40640209395-gate-output.log` | macOS ARM64 and macOS Intel x64: `[typecheck] FAIL: Nuxt app (tsconfig.json): the compiler ended by signal SIGABRT`; Linux x64, Linux ARM64, Windows x64: `[typecheck] Nuxt app (tsconfig.json): 292 errors, exit 2` with `error TS2307: Cannot find module '@autobyteus/application-sdk-contracts'` | **The two macOS jobs did not fail on TS2307.** DR-001 and IR-003 attribute all five jobs to the missing contracts `dist/` |
| API-27 | AC-007, AC-009/AC-016 precondition; IR-003 | the gate on a fresh checkout in the release job's order, default heap | fresh clone; `pnpm install --no-frozen-lockfile`; `pnpm -C autobyteus-web typecheck` | ENV-3 | Pass | `API-27-fresh-clone-gate-ci-order.log` | `ls: autobyteus-application-sdk-contracts/dist: No such file or directory`; `> pnpm -C .. --filter @autobyteus/application-sdk-contracts build`; `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`; `[typecheck] PASS` | the fix removes the TS2307 cause; this models the 16 GB Linux/Windows runners (4 GB default heap) |
| API-28 | AC-009, AC-016 on the macOS release runners | the same gate under the `macos-14` runner's default heap | same clone: `NODE_OPTIONS=--max-old-space-size=<MB> pnpm -C autobyteus-web typecheck` for 1792, 2048, 3072, 4096 | ENV-3 | **Fail** | `API-28-fresh-clone-gate-macos14-heap.log` | 1792: `[typecheck] FAIL: Nuxt app (tsconfig.json): the compiler ended by signal SIGABRT`, `exit: 1`; 2048: the same; 3072: `[typecheck] PASS`; 4096: `[typecheck] PASS` | GitHub `macos-14` runners have 7 GB RAM; Node's default old space is about a quarter of physical memory (~1.75 GB), the Linux/Windows runners (16 GB) get the 4 GB maximum. The emulation reproduces the CI macOS failure line exactly, with the contracts built. Direct vue-tsc runs abort with `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`; at a 4 GB heap vue-tsc's max RSS was 4.4-4.9 GB (API-30 notes). So `75e9f323f0` does not make the two macOS build jobs pass |
| API-29 | preserved | web unit and Electron suites | run 1: same clone (install only): `test:nuxt --run`, `test:electron --run`; run 2 in TESTING.md order: `pnpm -C autobyteus-server-ts prebuild`, then the two suites | ENV-3 | Pass (run 2) | `API-29-fresh-clone-web-suites.log` | run 2: `Test Files  666 passed (666)`; `Test Files  48 passed \| 1 skipped (49)` | run 1 failures were not the fix: the two FU-003 cross-package specs need `autobyteus-ts/dist` (`Failed to resolve import "autobyteus-ts/agent/message/context-file.js"`), which TESTING.md's install order builds and the CI-order clone skipped; `test:electron` hit FU-011 again |
| API-30 | AC-007, AC-009 | the gate after a local desktop build | worktree after API-24 (`resources/server` 866 MB from `prepare-server`, `electron-dist/` 2.4 GB): `pnpm -C autobyteus-web typecheck` | ENV-2, `4f27c2514d` | **Fail** | `API-30-gate-after-local-desktop-build.log` | `[typecheck] FAIL: Nuxt app (tsconfig.json): the compiler ended by signal SIGABRT`; `exclude has resources: false \| exclude has electron-dist: false`; with `electron-dist` aside: 4222 errors, 3951 of them in `resources/server/…` | the Nuxt project includes `../**/*`; `nuxt.config.ts` `typescript.tsConfig.exclude` (this ticket's H-07) excludes `electron/`, `build/` and three specs but not the git-ignored build outputs. Introduced by this ticket: before it no `build:electron*` chain ran a type check. Real use: a second `build:electron:*` or `isolated-app start --build` in the same worktree, and the macOS release job's own retry loop (it reruns the whole chain after a notarization failure, with `resources/server` already written) |
| — | AC-016 on CI | build-only release run (RELEASE.md) | not run | — | Not Tested | — | — | needs the fix pushed to `personal` (delivery's step before tagging). API-28 predicts it fails in both macOS jobs |

### Round 2 Acceptance-Criteria Impact

| Acceptance-Criteria ID | Critical | Proven By / Failed In | Result |
| --- | --- | --- | --- |
| AC-007 (`typecheck` passes) | Yes | API-27 passes on a fresh checkout at a 4 GB heap; API-28 fails at the 7 GB runner's default heap; API-30 fails after a local desktop build | **Not Proven** (fails in two real-use states) |
| AC-009 (the `build:electron*` chain runs `typecheck`) | Yes | the chain runs it, but on the macOS release runners it aborts (API-31, API-28) and after a local build it aborts (API-30) | **Not Proven** |
| AC-016 (`test:e2e:electron:isolation` builds the mac package and passes) | Yes | round 1 API-24 passed on this 64 GB Mac from a clean state; a repeated build in the same worktree now fails at the gate (API-30) | **Not Proven** for repeated builds |
| AC-032 (clean clone) | Yes | API-27, API-29 run 2 | Proven for the gate at 4 GB heap and the web suites |
| all other ACs | — | round 1 cases (code they exercise unchanged) | Proven (round 1) |

### Round 2 Validation Confidence Scorecard

| Confidence Category | Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | API-27, API-29 | AC-007, AC-009, AC-016 fail in the macOS release runner state and after a local build | the fixes below, then API-27/28/30 and a build-only release run |
| Changed-boundary execution directness | 90% | fresh clone in the release job's order; the real CI logs | macOS memory emulated through the V8 heap cap, not a 7 GB host | the build-only release run |
| Cross-boundary integration realism and mock gap | 90% | real compilers, real install order | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | ENV-3 matches the job's commands | physical memory of the runner not emulated (only the heap cap) | the build-only release run |
| Failure, edge-case, lifecycle, and recovery evidence | 50% | API-28, API-30 reproduce two failures | — | — |
| User-surface, browser, and desktop-shell confidence | 60% | round 1 desktop cases still valid for the app | the macOS desktop build itself fails in CI | — |
| Durable regression coverage quality and relevance | 85% | the gate's own specs; IMP-20 | no check guards the gate's memory or its scope against build outputs | — |

- Overall round-2 confidence: 73% (simple average); categories below 90%: requirement proof, environment fidelity, failure evidence, user surface, durable coverage.
- Every critical acceptance criterion directly proven: `No` (AC-007, AC-009, AC-016).
- Broader validation decision: `Required`; executed where possible locally (fresh clone in CI order, heap emulation, the real CI logs). The build-only release run is delivery's and is expected to fail on macOS until F-1 is fixed.

### Round 2 Failures

- **F-1 (critical): the Nuxt type check runs out of memory on the 7 GB macOS release runners.** Both macOS jobs of `40640209395` ended vue-tsc by SIGABRT (API-31). On a fresh clone with the contracts built, the gate aborts the same way under the runner's default heap of 1792 MB, and at 2048 MB, and passes from 3072 MB (API-28). Expected: `pnpm typecheck` passes inside `build:electron:mac` on the release runner (AC-009, AC-016). Observed: `[typecheck] FAIL: Nuxt app (tsconfig.json): the compiler ended by signal SIGABRT`. Measured for the owner: the clean Nuxt program needs about 3 GB of V8 heap: the gate passed at 3072 MB in API-28, while a direct vue-tsc run at 3072 MB on the loaded worktree host ran out of memory (API-30 notes), so 3 GB is at the edge; at a 4 GB cap vue-tsc reaches 4.4-4.9 GB RSS on this host; the gate spawns the compiler with `process.execPath` and passes its environment, so `NODE_OPTIONS` or a `--max-old-space-size` argument reaches it. Whether 7 GB of physical memory holds a ~4.9 GB compiler alongside the job is not proven here.
- **F-2: the gate's Nuxt scope includes the git-ignored desktop build outputs.** After a local desktop build, `autobyteus-web/resources/server` (from `prepare-server`) and `electron-dist/` fall inside `../**/*`; `typescript.tsConfig.exclude` lists neither, so the next `pnpm typecheck` aborts (out of memory at the 4 GB default; 3951 extra errors from `resources/server` when given 8 GB) (API-30). Expected: the gate checks the app's sources whatever build outputs sit in the folder. Real use: a second local `build:electron:*`, `isolated-app start --build` in a worktree that already built, and the macOS release job's notarization retry loop, which reruns the full chain after `prepare-server` has written `resources/server`.
- Not a failure, recorded for the record: DR-001 and IR-003 say all five jobs failed on the missing contracts `dist/`; the logs show that only for Linux and Windows (API-31).

## Preliminary Classification (On `Fail`)

- `Local Fix` for both, owner: implementation engineer. Both sit inside the approved design (REQ-007 / AC-007, AC-009: the gate passes and runs in every `build:electron*` chain) and need no new behaviour: F-1, give the Nuxt compiler the heap it needs on the release runners, or reduce the program it checks, and prove it against a 7 GB macOS runner (the build-only release run); F-2, keep the build outputs (`resources/`, `electron-dist/`) out of the Nuxt type project, like `electron/` and `build/`. The failure-origin review confirms the origin and owner.

## Latest Authoritative Result

- Result: `Fail` (round 2)
- Criteria not proven: AC-007, AC-009, AC-016 (round 2 Acceptance-Criteria Impact)
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer (F-1, F-2)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (focused failure-origin review)
- Notes: IR-003 itself works for its cause (API-27); the macOS jobs had a second cause the release run already showed. No durable test code changed this round.
