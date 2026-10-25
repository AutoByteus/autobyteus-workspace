# API/E2E Execution Coverage Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-002 (`/software_engineering_team/code_reviewer`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - Added diagnosis cases API-03b (timeout reason), API-05b (two readers at once) and API-08b (LM Studio listing) when API-01, API-05 and the first live read showed discrepancies.
  - API-12 mounted `dist` over an image whose `dist` also differs in 9 files changed on the base branch after the image was built (TESTING.md asks for "only the files you changed"); no dependency change in this ticket; the server started healthy. Recorded in the evidence header.
  - API-12 ran with signed-out CLIs only: copying a CLI login from the user's node containers could rotate their OAuth refresh tokens, so signed-in Docker reads are left to the user (ASM-001 was already user verification).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/evidence/api-e2e/` (the handoff gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after the failures below are resolved and validation passes)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | source `683b036be9` (HEAD `eac7ee8394`, tickets only after it) + this round's tests/fixtures | macOS darwin 25.5, Node v22.23.1 | in-process studio server (vitest), scripted CLIs (`agent-runtimes-fake-cli.mjs`), provider HTTP stubbed in process | clean env `env -i PATH HOME=<resolved temp> TMPDIR`; the server's own vault; `OLLAMA_HOSTS`/`LMSTUDIO_HOSTS` → closed port |
| ENV-2 | same | same | built `autobyteus-server-ts/dist` (2 nodes), Nuxt dev, headless Chrome 1440×1100 / 420 px, `Europe/Berlin` | scripted CLIs; provider stub `--import`ed into each node; synthetic keys saved via GraphQL; en and zh-CN |
| ENV-3 | same | same | built `dist`, test-owned node on `127.0.0.1:<free>`, own data root | real `HOME`/`USER`/`LOGNAME`: host CLIs codex-cli 0.164.0, Claude Code 2.1.310 (SDK 0.3.280), agy 1.4.7, grok 1.0.70; read-only test vault; LM Studio on localhost:1234 |
| ENV-4 | same | Docker (Linux) on macOS | `autobyteus/autobyteus-server:beta` (2026-10-24), this worktree's `dist` mounted read-only | no user volume (all CLIs signed out); test vault mounted read-only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…012 unit/component | unit, component | Reused IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-09 | (handoff) | Pass | (handoff) | (handoff) | `git diff --name-only 683b036be9 HEAD` = `tickets/` only; IMP-01…06 ran on `5135bb73dc`, and `5135bb73dc..683b036be9` only deletes a dead export covered by IMP-09 |
| API-01 | AC-001, 003, 004, 005, 006, 007, 009 | real HTTP GraphQL on a studio server; real child processes and protocols (scripted) | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts --no-watch` (AAR-01) | ENV-1 | Pass | `API-01-05-server-e2e-excerpt.log`, `API-01-05-server-e2e-full.log` | `✓ AAR-01 …`; `AAR-01 claude-stdin-frames ["control_request initialize","control_request get_usage"]`; `AAR-01 provider-requests [… count_tokens, … balance, … api-key, … balance]` | Codex "Weekly" 0 % with every model blocked; Antigravity Claude model blocked, Gemini not; Grok note; DeepSeek "0.14 USD", Kimi/Anthropic blocked, OpenAI "not reported" |
| API-02 | REQ-002, REQ-007 (sign-in), AC-001 alt | same | same file (AAR-02) | ENV-1 | Pass | same | `AAR-02 signed-out-missing-unchecked [{"runtime":"codex_app_server","signIn":"not checked"},{"runtime":"antigravity_cli"},{"runtime":"autobyteus"}]` | Claude signed out and Grok not installed left out; Codex `notRequired` listed without mark; signed-out Codex left out |
| API-03 | AC-008, AC-011, REQ-010 | same + process table | same file (AAR-03) | ENV-1 | Pass (see API-03b) | same | `AAR-03 elapsed-ms 14045`; `AAR-03 hung […5 entries]`; `✓ AAR-03 …` | agy hangs on `models` (sign-in and models steps) and `/usage`, Grok `--version` hangs, Codex `rateLimits` never answers: answer in 14.0 s, every hung pid gone, Codex app-server closed, next read complete. In run 1 Antigravity said "could not be read" instead of "timed out" (API-03b); the assertion stays strict |
| API-03b | AC-008 reason, design DS-003 | strategy + deadline | temporary probe (copy `API-03b-tmp-deadline-probe.e2e.test.ts.txt`): 400 × Antigravity `readUsageLimits` against a hanging `agy /usage` with 25–35 ms deadlines | ENV-1 | Fail | `API-03b-timeout-reason-probe.log` | `"Antigravity usage limits could not be read":9` of 400, each with `"wallMsLeftAfterReturn":1` | **F-1**: a step that did time out is reported "could not be read" when the kill timer fires < 1 ms before the wall-clock `endsAt` (`timeLeft(deadline) === 0` is false) |
| API-04 | AC-002, AC-012, REQ-001 | real Codex run → `thread/start` Agent Tools MCP config → real MCP host | same file (AAR-04) | ENV-1 | Pass | same | `AAR-04 with-tool enabled_tools ["list_available_agent_runtimes",…]`; `AAR-04 without-tool call {…"error":{"code":-32602,"message":"Tool is not enabled for this session"}}` | MCP `structuredContent` equals the GraphQL report (except `checkedAt`) |
| API-05 | RSK-002, REQ-010 | same | same file (AAR-04 parallel: 3 GraphQL reads + 1 MCP call at once) | ENV-1 | Pass (timing) / see API-05b | same (full log line `AAR-04 parallel`) | `"wallMs":404`; Codex limits `"unknown: Codex usage limits could not be read"` in 3 of 4 calls | All within 20 s; Codex degraded |
| API-05b | RSK-002, SCN-A2, AC-001 | same | temporary probe: two reads at once ×10, then 5 single reads (twice) | ENV-1 | Fail | `API-05b-two-readers-probe.log` | run A 4/10 and run B 1/10 rounds: one reader's Codex `"codexModels":"unknown: Codex model list could not be read"` and limits unknown; `"single":["read","read","read","read","read"]` | **F-3**: `CodexAppServerClientManager.beginAcquire` throws "unresolved cleanup" while the other read's release closes the shared home-folder app-server |
| API-06 | preserved behavior (Agent Runtimes page, launches, Claude models for launches) | existing server E2E | `… vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts tests/e2e/runtime/application-import-codex-launch.e2e.test.ts --no-watch` (after `test:integration:prepare` for the two Brief Studio files) | ENV-1 | Pass | `API-06-existing-runtime-e2e.log` | `Tests  13 passed`; `Tests  6 passed (6)` | First run skipped the two Brief Studio files (package not built); rerun after `pnpm -C autobyteus-server-ts test:integration:prepare` |
| API-07 | AC-010, REQ-009, REQ-007 UI states, REQ-008 | real stack page | `node autobyteus-web/tests/e2e/model-routing-settings-probe.mjs --skip-server-build --output-dir=/tmp/mrp-run2` (after `pnpm -C autobyteus-server-ts build`) | ENV-2 | Pass | `API-07-model-routing-probe/API-07-probe-summary.log`, `result.json`, `MRP-*.png` | `Pass MRP-01` … `Pass MRP-07`; `Result: Pass browserErrors: []`; cleanup `tempRoot removed`; `MRP-02b-failure-states-1440.png` shows "Sign-in could not be checked", "Limits unknown: Antigravity usage limits could not be read", "Models unknown: Grok model list could not be read" | Page data equals the node's GraphQL answer row by row; no read while idle 8 s; Check again busy/disabled with rows kept; 420 px single column; zh-CN; remote node window (all signed out, no key) shows "No API provider has a key on this node."; unreachable node error. Run 1 failed on two probe bugs (selector, locale reset), fixed before run 2 |
| API-07b | preserved Agent Runtimes page | real stack | `node autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs --skip-server-build`, then the same on a temporary base worktree at `a2faf424d6` | ENV-2 | Fail (pre-existing, out of scope) | `API-07b-agent-runtimes-probe-vs-base.log`, `API-07b-screens/ARP-09-failure-this-branch.png` | identical Fail list on both: ARP-01, ARP-04, ARP-09, ARP-11 | Not caused by this ticket: identical on base; causes in the probe → **FU-002** |
| API-08 | REQ-005, REQ-010, AC-003…007 live, AC-009, SCN-A4 | live node, real CLIs, test vault | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node live-probe.mjs <worktree> <out>` (copy `API-08-live-probe.mjs.txt`) | ENV-3 | Pass | `API-08-09-live-probe.json.log` | `"read-cold": {"ms": 4641`; `"read-second": {"ms": 4256`; `steps.direct` vs `steps.product` equal (Codex Weekly 100 %, Claude 87/50/100, agy 91.5→91 / 72.2→72 / 0 / 36.5→37, Grok period end, DeepSeek 0.14 USD, Kimi 0, Anthropic credit message, xAI flags false); `"scan"` all 0 hits | First read on a cold server listed AutoByteus (4.6 s, no warning) |
| API-08b | REQ-002, AC-001 | live node | `live-lmstudio-probe.mjs` (copy `API-08-live-lmstudio-probe.mjs.txt`) | ENV-3 | Fail | `API-08b-live-lmstudio-probe.json.log` | `"beforeEnsure": … "lmStudio": null` with `"lmStudioDirect"` 4 models; after `ensureProviderModelCatalog(LMSTUDIO)`: `"LM Studio"` listed with 4 models | **F-2**: a local provider with models is left out until something else loads its catalog |
| API-09 | RSK-002, REQ-010 | live node | same live probe, 2 rounds × 4 reads at once | ENV-3 | Pass | `API-08-09-live-probe.json.log` | `"parallel-1": {"wallMs": 5251` … `"unknowns": []` (8 of 8 reads) | Live CLIs are slower, so the F-3 race did not show in 8 reads |
| API-10 | REQ-008 (0 tokens), AC-005 live | real Claude CLI | `node claude-repeat.mjs <sdk.mjs>` (copy `API-10-claude-repeat.mjs.txt`) | ENV-3 | Pass | `API-10-claude-repeated-get-usage.log` | each of 6 reads: `"session_total_cost_usd": 0`, `"session_model_usage": {}`, `"five_hour_utilization": 13`, `"seven_day_utilization": 50` | 11 other Claude processes (the user's agents) shared the account; utilization still did not move across the reads |
| API-11 | AC-001 on the AutoByteus runtime (SCN-001) | live node, AutoByteus agent, LM Studio `qwen/qwen3.6-35b-a3b` | `live-agent-journey.mjs` (copy `API-11-live-agent-journey.mjs.txt`): definition lists the tool → `createAgentRun(runtimeKind autobyteus)` → message over `/ws/agent/<runId>` | ENV-3 | Pass | `API-11-live-agent-journey.json.log` | `"toolActivity": {"kind": "tool", "toolName": "list_available_agent_runtimes", "status": "success"…}`; `"toolResult": {… "runtimes": ["codex_app_server","claude_agent_sdk","antigravity_cli","grok_build","autobyteus"] … "sameShapeAsGraphql": true}` | Local model, no paid tokens; model unloaded after (`lms unload`) |
| API-12 | ASM-001, SCN-A3, AC-007 in Docker | test-owned Docker node | see evidence header (`docker run … -p 127.0.0.1:<port>:8000 -v dist:ro -v test-vault:ro`) | ENV-4 | Pass | `API-12-docker-node.log` | `real 0.93` / `0.77` / `0.89`; four CLIs `installed: true … SIGNED_OUT` and absent from the answer; AutoByteus providers with DeepSeek "0.14 USD", Kimi and Anthropic blocked | Signed-in reads in Docker not run (refresh-token risk to the user's nodes) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, API-08, API-11, API-12; **API-08b fails** | Not Proven | Runtimes and keyed providers proven; a local provider with models (LM Studio) is left out (F-2) |
| AC-002 | Yes | API-04 | Proven | — |
| AC-003 | Yes | API-01 (exhausted, no credits); API-00/IMP-03 (credits alternative); API-08 live (not exhausted) | Proven | — |
| AC-004 | Yes | API-01; API-08 live (7 Claude/GPT models blocked, Gemini not) | Proven | — |
| AC-005 | Yes | API-01 (only control frames written to the CLI), API-08, API-10 | Proven | — |
| AC-006 | No | API-01, API-08 | Proven (meaning of a present `creditUsagePercent`: Only The User Can Check) | Grok reports no used % this period (UNK-001); it can only be checked once the account has usage |
| AC-007 | Yes | API-01 (scripted), API-08 (live test vault), API-12 (Docker) | Proven | — |
| AC-008 | Yes | API-02, API-03, API-07 (MRP-02) | Proven, with **F-1** (a timeout is sometimes reported as "could not be read") | — |
| AC-009 | Yes | API-01 (AAR-05 scan), API-07 (MRP-07), API-08, API-12 | Proven | — |
| AC-010 | Yes | API-07 (incl. remote-node window on a test node) | Proven for the web-equivalent page; the user's own desktop and Docker node windows: Only The User Can Check | Validation may not use the user's running app or node containers (TESTING.md Rules 2, Docker nodes); a test-owned node and window stood in |
| AC-011 | Yes | API-03, API-08/09 | Proven | — |
| AC-012 | Yes | API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 75% | API-01…07, API-08…12 | AC-001 fails for local providers (F-2) | Fix F-2, rerun API-08b |
| Changed-boundary execution directness | 95% | 95% | real HTTP/MCP/WebSocket, real child processes, live CLIs and providers, Docker | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | live reads equal direct vendor answers (API-08); real agent run (API-11) | provider HTTP stubbed in API-01/07 (closed by API-08/12) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | test vault, host logins, Docker image | signed-in CLIs in Docker not run | user check on a real node |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 75% | API-03, API-03b, API-05b, MRP-02/06 | F-1 and F-3 fail | fixes + rerun API-03/03b/05/05b |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | API-07 (states, zh-CN, remote node, narrow) | desktop shell not changed (N/A for shell) | — |
| Durable regression coverage quality and relevance | 90% | 90% | new server E2E file, probe, extended fixture | AAR-03 asserts "timed out" strictly, so it can fail rarely until F-1 is fixed | F-1 fix |

- Overall post-repository confidence: 89%
- Overall final confidence: 88%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-001)
- Any final applicable category below `90%`: `Yes` — requirement proof 75%, failure/edge 75%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2, F-3 below.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (real stack), `Live API` (real CLIs, test vault), `Lifecycle` (processes), `Other` (Docker node, live agent run)
- Confidence gap: page states only covered in jsdom; live formats; 0-token property; Docker parity; real tool path on the AutoByteus runtime.
- Browser validation needed: yes, the page's states had only component coverage; done in API-07.

## Desktop Application Validation (When Applicable)

- Approach executed: web-equivalent page on a real stack (API-07); no desktop-shell code changed.
- Effect on any already-running desktop application: `None` (own ports, data roots, containers; the user's AutoByteus app and node containers untouched).
- Behavior not directly proven: the page inside the user's own desktop window and node windows (user check).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` | Added | API-01…05 |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | Updated (Codex `account/rateLimits/read` + `thread/start` config record + `account/read` error; Claude `get_usage` + stdin frame log + `auth` hang; agy `/usage`, model list and hang/fail knobs; Grok `agent --help`, ACP stdio with `initialize` models and `_x.ai/billing`, `--version` hang; call log) | API-01…07, API-06 |
| `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs` | Added | API-07 |
| `autobyteus-web/tests/e2e/fixtures/model-routing-provider-usage.mjs` | Added | API-07 |
| `autobyteus-web/package.json` (`test:e2e:model-routing-settings`) | Updated | API-07 |

- Added or updated paths attached for proportional test-code review: `Not Applicable` this round (Fail); they go with the passing round.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs (repository cases) | scripted fake CLI speaking each wire protocol with recorded answers | deterministic, offline, failure knobs | formats as recorded; live formats proven in API-08 |
| Provider HTTP (repository cases) | in-process `fetch` stub / `--import` stub | offline, deterministic, key-header check | live answers proven in API-08, API-12 |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp diagnosis tests `tmp-api03-deadline-probe.e2e.test.ts`, `tmp-api05b-two-readers.e2e.test.ts` | Yes | removed from the tree; copies in evidence | removed |
| In-process servers, fake CLI roots | Yes | `fastify.close()`, temp roots disposed | removed |
| Probe stacks (2 nodes, Nuxt, Chrome) ×4 runs | Yes | probe `finally` | `tempRoot: removed`, processes terminated |
| Base worktree `/tmp/aar-base-a2faf424d6` | Yes | `git worktree remove --force` | removed |
| Live nodes (4 runs) | Yes | process group SIGTERM/SIGKILL, data root removed | `serverExited: true`, `tempRoot: removed` |
| LM Studio model `qwen/qwen3.6-35b-a3b` loaded by API-11 | Yes | `lms unload` | unloaded (state `not-loaded`) |
| Docker container `aar303-api12-test` | Yes | `docker rm -f -v` | removed |
| Host agy history | No (host login) | — | agy `/usage` ran on the host login (TESTING.md known gap) |

## Preliminary Classification (On `Fail`)

- **F-1 — `Local Fix` (implementation engineer).** A timed-out step can be reported as "could not be read". `runStep` (`available-agent-runtimes-service.ts`) and `readUsageLimitsSafely` (`usage-limits-reading.ts`) decide "timed out" by `timeLeft(deadline) === 0`, comparing wall-clock milliseconds. The kill timer of `runRuntimeCommand` / `listAntigravityModels` / the ACP short process can fire just before `Date.now()` reaches `endsAt` (sub-millisecond early, ms truncation), leaving 1 ms. Measured: 9 of 400 timed-out reads (API-03b); seen in the real server read of API-03 run 1 for both Antigravity steps. Paths that classify by error type (Codex, Claude via `raceDeadline`) are not affected. Related, read only: `ClaudeSdkClient.listModels` turns any failure, a timeout included, into `[]`, so a Claude model-list timeout shows as "unknown: no models could be read".
- **F-2 — `Design Impact` (Solution Designer).** REQ-002 / AC-001: a local provider (LM Studio, Ollama) with models is not listed unless something else has already loaded its catalog. The design reads AutoByteus models from `runtimeModelSelectionCatalog("autobyteus")` → `LLMFactory.listAvailableModels()`, which holds only static models and discovered sources already ensured (`ModelCatalogService.ensureProviderModelCatalog`). Live: LM Studio serving 4 models absent; after `ensureProviderModelCatalog(LMSTUDIO)` listed with its 4 models (API-08b). The same likely holds for keyed custom (discovered) providers, which would be listed with no models (not tested).
- **F-3 — `Design Impact` (Solution Designer).** RSK-002 / SCN-A2 (page open while an agent calls the tool, or two agents at once): a concurrent read often gets Codex models and limits `unknown: … could not be read`. Each read acquires and releases the Codex home-folder lease three times (sign-in, models, limits), and `beginAcquire` throws "unresolved cleanup" while another read's release is closing that entry. Scripted: 3 of 4 concurrent readers (API-05) and 1–4 of 10 two-reader rounds (API-05b); live with slower real CLIs: 0 of 8 (API-09). The code review rejected C-05 as "not a supported concurrent workflow"; this report treats it as real use (the Model Router of autobyteus-32 will call the tool from parallel agents), so the Solution Designer decides whether it is in scope.

Observations (no finding; for the Solution Designer's judgement):

- O-1: percentages are rounded, so agy's 99.7 % remaining reads "100% left" (agy's own text says 99 %) (API-01, MRP-04 screenshot).
- O-2: in zh-CN, texts from the node's answer stay English inside Chinese labels: limit names ("Weekly"), reasons ("credit balance too low"), notes (`MRP-04-zh-CN-1440.png`). By design the report is the agent's English text.
- O-3: the "No agent runtime is available" empty state is only reachable when the AutoByteus listing fails; a node with nothing usable shows the AutoByteus row "No API provider has a key on this node." (MRP-05).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-001 (F-2); F-1 (AC-008 reason precision), F-3 (RSK-002). User-only: AC-010 on the user's own desktop and Docker node windows; AC-006 used-% meaning (UNK-001).
- Preliminary classification and recommended owner: F-1 `Local Fix` → implementation engineer; F-2 and F-3 `Design Impact` → Solution Designer. Failure-origin review requested.
- Next recipient from `get_handoff_rules`: see the handoff.
- Notes: out of scope and pre-existing: FU-002 (Agent Runtimes settings probe stale, identical on base).
