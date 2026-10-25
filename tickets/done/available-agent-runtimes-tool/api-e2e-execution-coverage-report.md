# API/E2E Execution Coverage Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002` (round 1: `API-REV-001`, Fail)
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, code review pass CRR-005 after the round-1 failures (F-1 → CR-002, F-2 → CR-003, F-3 → CR-004; SR-006, SR-007)
- Prior round reviewed: round 1 (API-REV-001); its failures are rechecked first (API-03b, API-05/05b, API-08b) and resolved (revision record)
- Deviations from the investigation's plan, and why:
  - API-05b's two-reader rounds became durable (AAR-04, 10 rounds) because AC-013 now requires them; a separate probe was not needed.
  - API-12 mounts `dist` over an image whose `dist` also differs in 9 base-branch files (as in round 1); recorded in the evidence header.
  - API-12 runs with signed-out CLIs only (copying a login from the user's nodes could rotate their refresh tokens).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/evidence/api-e2e/` (round-2 files carry `r2` in their names; the handoff gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | HEAD `5a87647318` (source `07c07cfc27`, `c4fff3eb00`, `7ece4e2069`) + this round's test edits | macOS darwin 25.5, Node v22.23.1 | in-process studio server (vitest), scripted CLIs | clean env `env -i PATH HOME=<resolved temp> TMPDIR`; server's own vault; Ollama → closed port; LM Studio and a custom endpoint on fake hosts answered by the test's stub |
| ENV-2 | same, `dist` built at `7ece4e2069` | same | 2 built nodes, Nuxt dev, headless Chrome 1440×1100 / 420 px, `Europe/Berlin` | scripted CLIs; provider/LM Studio/custom-endpoint stub `--import`ed into each node; synthetic keys via GraphQL; en and zh-CN |
| ENV-3 | same `dist` | same | test-owned node on `127.0.0.1:<free>`, own data root | real `HOME`/`USER`/`LOGNAME`: codex-cli 0.164.0, Claude Code 2.1.310 (SDK 0.3.280), agy 1.4.7, grok 1.0.70; read-only test vault; LM Studio on localhost:1234 |
| ENV-4 | same `dist` | Docker (Linux) on macOS | `autobyteus/autobyteus-server:beta` (2026-10-24), `dist` mounted read-only | no user volume (CLIs signed out); test vault mounted read-only |

## Cases

Round-2 results; round-1 results are in the revision record (API-REV-001).

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…013 unit/component | unit, component, guards | Reused IMP-15 (server typecheck + `test:unit`, `c4fff3eb00`), IMP-16 (focused, `c4fff3eb00`), IMP-18 (`7ece4e2069`), IMP-14 (web tests + guards, `07c07cfc27`), IMP-04 | (handoff) | Pass | (handoff) | (handoff) | Still valid: `git diff --name-only c4fff3eb00 HEAD -- . ':!tickets'` = the service (covered by IMP-18), `docs/design-cases.md` and my probe; `git diff --name-only 07c07cfc27 HEAD -- autobyteus-web` = only my probe |
| API-01 | AC-001, 003, 004, 005, 006, 007, 009 | real HTTP GraphQL on a studio server, real child processes (scripted protocols) | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts --no-watch` (AAR-01), 3 consecutive runs | ENV-1 | Pass | `API-01-06-r2-server-e2e-excerpt.log`, `API-01-06-r2-server-e2e-full.log` | `✓ AAR-01 …`; `Tests  6 passed (6)` ×3; `AAR-01 claude-stdin-frames ["control_request initialize","control_request get_usage"]` | Confirmed the implementation engineer's edit: Antigravity 99/98 follow the round-down rule (0.997 → 99, 0.989 → 98) |
| API-02 | REQ-002, REQ-007 sign-in | same | same file (AAR-02) | ENV-1 | Pass | same | `✓ AAR-02 …` | — |
| API-03 | AC-008, AC-011, REQ-010 | same + process table | same file (AAR-03, strict "timed out") | ENV-1 | Pass | same | `AAR-03 elapsed-ms 14…`; `"limits":"unknown: Antigravity usage limits timed out","models":"unknown: Antigravity model list timed out"` | 3 of 3 runs |
| API-03b | AC-008 (reason), REQ-007 SR-006 "a timed-out step always says timed out" | real service + real Antigravity strategy | temporary probe (copy `API-03b-r2-probe.e2e.test.ts.txt`): 400 × `AvailableAgentRuntimesService.read()` against a hanging `agy /usage`, `limitsMs` 25–35 | ENV-1 | Pass | `API-03b-r2-timeout-reason-probe.log` | `{"runs":400,"outcomes":{"unknown: Antigravity usage limits timed out":400}}` | Round 1: 9/400 "could not be read" (F-1) |
| API-04 | AC-002, AC-012 | real Codex run → Agent Tools MCP host | same file (AAR-04) | ENV-1 | Pass | same | `AAR-04 with-tool enabled_tools ["list_available_agent_runtimes",…]`; without: `"Tool is not enabled for this session"` | — |
| API-05 | AC-013, REQ-010 | same | same file (AAR-04): 3 GraphQL reads + 1 MCP call at once; then 10 rounds of 2 readers; then 3 back-to-back reads | ENV-1 | Pass | same (`AAR-04 parallel`, `AAR-04 two-reader-rounds`) | one `checkedAt` for all 4 callers, `"appServersStarted":1`, every caller `{"limits":"read","models":"read"}`; all 23 later reads Codex read | Round 1: 3/4 and 1–4/10 Codex unknown (F-3) |
| API-06 | preserved behavior (Agent Runtimes page, launches, Claude models) | existing server E2E | `… vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts tests/e2e/runtime/application-import-codex-launch.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-06-r2-existing-runtime-e2e.log` | `Test Files  3 passed (3)`, `Tests  19 passed (19)` | Strategies, command runner and catalogs changed this round |
| API-13 (AAR-06) | AC-007 (SR-006), REQ-002, REQ-007 (custom endpoint) | same; LM Studio and a custom endpoint scripted over HTTP | same file (AAR-06) | ENV-1 | Pass | same (`AAR-06 …` lines) | LM Studio answering: listed with 2 models on its first read; not answering: absent; custom endpoint created and answering: 2 models; not answering: `"models":"unknown: E2E Gateway model list could not be read: CUSTOM_PROVIDER_DISCOVERY_UNAVAILABLE"` | New this round |
| API-07 | AC-010, REQ-009, REQ-007 UI states, REQ-008 | real stack page | `node autobyteus-web/tests/e2e/model-routing-settings-probe.mjs --skip-server-build --output-dir=/tmp/mrp-r2b` (after `pnpm -C autobyteus-server-ts build`) | ENV-2 | Pass | `API-07-r2-model-routing-probe/API-07-r2-probe-summary.log`, `result.json`, `MRP-*.png` | `Pass MRP-01` … `Pass MRP-07`; `browserErrors: []`; `MRP-02-discovered`: `"modelsUnknown": "Models unknown: Probe Gateway model list could not be read: CUSTOM_PROVIDER_DISCOVERY_UNAVAILABLE"` and LM Studio with 1 model | MRP-02 extended this round (custom endpoint models unknown, LM Studio appearing on Check again); confirmed the implementation engineer's DeepSeek text edit (`Limits unknown: DeepSeek usage could not be read: unexpected answer (500)`). Same 7/7 in the run before (without MRP-02c). Screenshots are clipped at the page's inner scroll container; the DOM record is the proof |
| API-07b | preserved Agent Runtimes page | real stack | `node autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs --skip-server-build` | ENV-2 | Fail (pre-existing, out of scope) | `API-07b-r2-agent-runtimes-probe.log` | every case `same-error-as-base: True` (ARP-01, 04, 09, 11 fail as on base `a2faf424d6`) | FU-002; no regression from this round |
| API-08 | REQ-005, REQ-010, AC-003…007 live, AC-009, SCN-A4 | live node, real CLIs, test vault | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node live-probe.mjs <worktree> <out>` (copy `API-08-live-probe.mjs.txt`) | ENV-3 | Pass | `API-08-09-r2-live-probe.json.log` | `"read-cold": {"ms": 4994`; LM Studio among the providers on the cold read; `steps.direct` = `steps.product` (Antigravity 90.2 → 90, 36.5 → 36 rounded down); `"scan"` 0 hits | — |
| API-08b | REQ-002, AC-001, AC-007 (SR-006) | live node | `live-lmstudio-probe.mjs` (copy `API-08-live-lmstudio-probe.mjs.txt`) | ENV-3 | Pass | `API-08b-r2-live-lmstudio-probe.json.log` | `"beforeEnsure"` lists `"LM Studio"` with its 4 models | Round 1: absent before `ensureProviderModelCatalog` (F-2) |
| API-09 | AC-013 live, REQ-010 | live node | same live probe, 2 × 4 reads at once | ENV-3 | Pass | `API-08-09-r2-live-probe.json.log` | per round one `checkedAt` for all 4 calls, `{"limits": "read", "models": "read"}` for Codex, `"wallMs": 4710` / `4539` | — |
| API-10 | REQ-008 (0 tokens), AC-005 live | real Claude CLI | `node claude-repeat.mjs <sdk.mjs>` (copy `API-10-claude-repeat.mjs.txt`) | ENV-3 | Pass | `API-10-r2-claude-repeated-get-usage.log` | 6 × `"session_total_cost_usd": 0`, `"session_model_usage": {}`, utilization 53 / 60 on every read | The account's own use (the user's agents) moved utilization between rounds, never between the reads |
| API-11 | AC-001 on the AutoByteus runtime (SCN-001) | live node, AutoByteus agent, LM Studio `qwen/qwen3.6-35b-a3b` | `live-agent-journey.mjs` (copy `API-11-live-agent-journey.mjs.txt`) | ENV-3 | Pass | `API-11-r2-live-agent-journey.json.log` | `"toolName": "list_available_agent_runtimes", "status": "success"`; `"sameShapeAsGraphql": true`; providers include `"LM Studio"` | Local model, no paid tokens; unloaded after |
| API-12 | ASM-001, SCN-A3, AC-007 in Docker | test-owned Docker node | see evidence header | ENV-4 | Pass | `API-12-r2-docker-node.log` | `real 1.26` / `1.18` / `0.81`; four CLIs `installed … SIGNED_OUT` and absent from the answer; providers DeepSeek "0.14 USD", Kimi and Anthropic blocked; pattern hits 0 | LM Studio not reachable from the container: absent (REQ-002) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, API-08, API-08b, API-11, API-12, API-13 | Proven | — |
| AC-002 | Yes | API-04 | Proven | — |
| AC-003 | Yes | API-01; API-00 (credits alternative); API-08 live | Proven | — |
| AC-004 | Yes | API-01; API-08 live | Proven | — |
| AC-005 | Yes | API-01 (only control frames), API-08, API-10 | Proven | — |
| AC-006 | No | API-01, API-08 | Proven; meaning of a present `creditUsagePercent`: Only The User Can Check | Grok reports no used % this period (UNK-001); checkable only when the account has usage |
| AC-007 | Yes | API-01, API-13, API-07 (MRP-02), API-08, API-08b, API-12 | Proven | — |
| AC-008 | Yes | API-02, API-03, API-03b, API-07 | Proven | — |
| AC-009 | Yes | API-01 (AAR-05), API-07 (MRP-07), API-08, API-12 | Proven | — |
| AC-010 | Yes | API-07 (incl. a remote-node window on a test node) | Proven for the web-equivalent page; the user's own desktop and Docker node windows: Only The User Can Check | TESTING.md forbids the user's running app and node containers; test-owned nodes and windows stood in |
| AC-011 | Yes | API-03, API-08/09 | Proven | — |
| AC-012 | Yes | API-04 | Proven | — |
| AC-013 | Yes | API-05 (durable: 1 shared read for 4 callers, 10 two-reader rounds), API-09 (live) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | every AC proven (cases above) | user-only parts (AC-006 meaning, AC-010 on the user's own windows) | user check |
| Changed-boundary execution directness | 95% | 95% | real HTTP/MCP/WebSocket, real processes, live CLIs and providers, Docker | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | live answers equal direct vendor answers (API-08); real agent run (API-11); live LM Studio (API-08b) | provider/discovery HTTP stubbed in API-01/07/13, closed by API-08/08b/12 | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | test vault, host logins, LM Studio, Docker image with its real CLIs | signed-in CLIs inside Docker: needs the user's accounts on a node (copying their logins could rotate tokens) | user check on a real node |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-03 ×3, API-03b 400/400, AC-013 durable + live, MRP-02/06, AAR-06 down endpoints | FU-003 (another home-folder Codex user closing the client) not exercised | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | API-07 (states, discovered providers, zh-CN, remote node, narrow, unreachable) | no desktop-shell change (shell N/A) | — |
| Durable regression coverage quality and relevance | 95% | 95% | E2E file 3 consecutive 6/6 runs, strict AC-013 and "timed out", probe 7/7 | — | — |

- Overall post-repository confidence: 93.6%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-003, FU-005, RSK-001 (external formats), the user-only checks.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (real stack), `Live API` (real CLIs, test vault, LM Studio), `Lifecycle` (processes, shared reads), `Other` (Docker node, live agent run)
- Confidence gap it addresses: page states and the new provider-row state on a real stack; live formats; live discovered providers; live concurrency; 0-token property; Docker parity.
- Browser validation needed: yes; the provider-row "Models unknown" state was component-tested only; done in API-07.

## Desktop Application Validation (When Applicable)

- Approach executed: web-equivalent page on a real stack (API-07); no desktop-shell code changed.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the page in the user's own desktop window and node windows (user check).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` | Updated: LM Studio and a custom endpoint answered by the stub on fake hosts; AAR-04 strict for AC-013 (one shared read, app-server started once, 10 two-reader rounds, 3 back-to-back reads); AAR-06 added; AAR-05 scans the custom endpoint key. (AAR-01's 99/98 were edited by the implementation engineer for SR-006 O-1; confirmed.) | API-01…05, API-13 |
| `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs` | Updated: MRP-02 creates a keyed custom endpoint, takes it down and lets LM Studio answer (provider "Models unknown" state, LM Studio appearing); `assertPageMatches` handles provider models unknown; MRP-02c AutoByteus row screenshot; MRP-07 allows the two model-list URLs. (The DeepSeek text was edited by the implementation engineer for SR-007; confirmed by the run.) | API-07 |
| From round 1, unchanged this round: `tests/fixtures/agent-runtimes-fake-cli.mjs`, `autobyteus-web/tests/e2e/fixtures/model-routing-provider-usage.mjs`, `autobyteus-web/package.json` script | Added/Updated in round 1 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs (repository cases) | scripted fake CLI with each wire protocol and recorded answers | deterministic, offline, failure knobs | live formats proven in API-08 |
| Provider HTTP, LM Studio, custom endpoint (repository cases) | in-process `fetch` stub / `--import` stub on fake hosts | offline, switchable up/down | live LM Studio and providers proven in API-08/08b/12; a live custom endpoint not available (none configured) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp probe `tmp-api03b-r2-probe.e2e.test.ts` | Yes | removed from the tree; copy in evidence | removed |
| In-process servers, fake CLI roots | Yes | `fastify.close()`, temp roots disposed | removed |
| Probe stacks (Model Routing ×2, Agent Runtimes ×1) | Yes | probe `finally` | `tempRoot: removed`, processes terminated |
| Live nodes (4 runs) | Yes | process group SIGTERM/SIGKILL, data root removed | `serverExited: true`, `tempRoot: removed` |
| LM Studio model loaded by API-11 | Yes | `lms unload` | all models `not-loaded` |
| Docker container `aar303-api12-r2` | Yes | `docker rm -f -v` | removed |
| Host agy history | No (host login) | — | agy `/usage` ran on the host login (TESTING.md known gap) |

## Observations (no finding)

- O-2 (from round 1): in zh-CN, texts from the node's answer (limit names, reasons, notes) stay English inside Chinese labels (`API-07-r2-model-routing-probe/MRP-04-zh-CN-1440.png`).
- O-3 (from round 1): the "No agent runtime is available" empty state is only reachable when the AutoByteus listing fails; a node with nothing usable shows "No API provider has a key on this node." (MRP-05).
- O-4 (new): a custom endpoint that does not answer reads "… model list could not be read: CUSTOM_PROVIDER_DISCOVERY_UNAVAILABLE", the catalog's code rather than a sentence (AAR-06, MRP-02).
- O-5 (new, the catalog's existing behavior): LM Studio's listing includes its embedding and OCR models (`text-embedding-nomic-embed-text-v1.5`, `deepseek-ocr`) as models an agent could pick (API-08b).
- O-1 from round 1 is resolved (remaining percent rounds down).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: user-only: AC-010 in the user's own desktop and Docker node windows; AC-006 used-% meaning (UNK-001); signed-in runtime reads on a Docker node (ASM-001).
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review, Large/High).
- Notes: round-1 failures F-1, F-2, F-3 resolved (revision record). Out of scope: FU-002 (pre-existing, unchanged).
