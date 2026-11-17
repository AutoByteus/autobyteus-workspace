# API/E2E Execution Coverage Report — autobyteus-515: tool search on the AutoByteus native runtime

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-001 pass (`/code_reviewer`, 2026-11-17)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-06b added: the gated native background-task transport suite scripts direct calls of `delegate_task`/`send_message_to`, now searchable; run to check them.
  - API-11: the live 324 suite never opened the test vault, so a native run had no key; the suite now opens it (durable update, `e87279514c`).
  - API-14 added: a web unit case for the tool card of a `call_tool` call (the user-surface part of AC-003), after reading how the web merges END arguments.
  - API-08: the evaluation's `download_media` stub wrote no extension where the real tool adds one; fixed in `evidence/evaluate-tool-search.mjs` and `da-download` rerun on both builds.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | branch `codex/native-tool-search-515`, source `49867e8dc4`; test commits `7ec93eee7d`, `e87279514c`, `abe5617269` on top | macOS (darwin 25.5), Node v22.23.1 | `autobyteus-ts` and server `dist` built from the source of `49867e8dc4` | `env -i PATH HOME=<resolved temp> TMPDIR`; machine load average 45–131 from other processes (a VM, `fseventsd` at 125–166 % CPU) |
| ENV-2 | base `4cbf9e7881` (`origin/personal`) in a temporary worktree `native-tool-search-515-base` (removed after) | same | `pnpm install --frozen-lockfile`, `prebuild`, `autobyteus-ts` and server builds there | same |
| ENV-3 | ENV-1 + test vault | same | real providers: DeepSeek, Gemini (Vertex Express), GLM, Grok, OpenAI, Anthropic; Kimi and Gemini AI Studio refused | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (read-only), suite gates |
| ENV-4 | ENV-2 + ENV-1 + test vault | same | old build (ENV-2 dist) and new build (ENV-1 dist) on DeepSeek V4 Flash / Gemini / Anthropic Sonnet | evaluation script and upgrade-restore probe, temp workspaces and memory folders |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | — | builds | IMP-01 | — | Pass | (IMP-01) | (IMP-01) | Source unchanged since `8065d773e0` |
| API-R02 | AC-001, AC-002, AC-003, AC-005, AC-006, AC-007; DS-001…DS-004 | `autobyteus-ts` unit + scripted integration | IMP-02 (+ IMP-15 mutation check) | — | Pass | (IMP-02, IMP-15) | (IMP-02, IMP-15) | Ran on `49867e8dc4`, the final source; also inside API-01's full run |
| API-R03 | — | server and web typecheck | IMP-10, IMP-12 | — | Pass | (IMP-10, IMP-12) | (IMP-10, IMP-12) | Rerun after this round's test changes: server PASS twice (baseline 1012 in 316 files), web PASS (87 in 37) (`API-04-…`, `API-14-…`) |
| API-R04 | AC-001, AC-003 (server, auto-execute) | server E2E | IMP-13, IMP-14 | — | Pass | (IMP-13, IMP-14) | (IMP-13, IMP-14) | IMP-13's file also passed inside API-05 |
| API-R05 | TESTING "tools a run gets" | whole server unit suite | IMP-08 | — | Pass | (IMP-08) | (IMP-08) | Server and library source unchanged since; its 3 watcher failures are API-02 |
| API-01 | FU-003; regression | `autobyteus-ts` whole library, branch vs base | `env -i … pnpm -C autobyteus-ts test` on ENV-1, then on ENV-2; cause probe `node evidence/API-01-run-bash-start-deadline-probe.mjs <root> 5\|60` on both | ENV-1, ENV-2 | Pass | `API-01-autobyteus-ts-full-suite-branch-vs-base.log`, `API-01-run-bash-start-deadline-probe.log`, `API-01-run-bash-start-deadline-probe.mjs` | Branch `Tests  4 failed \| 2480 passed`, base `Tests  9 failed \| 2427 passed`, every failure a terminal/`run_bash` case; probe stderr `"Command did not start: Command control deadline exceeded": 26` (branch 30/60 failed, base 60/60) | Cause: `NativeCommandProcessScope.start`'s 1500 ms launch deadline (anchor ready + `ps` group check) under load returns null exit and empty stdout. Not reached by this change; FU-003 updated with the cause |
| API-02 | Green server suites | server folder-watcher tests, branch vs base, `fs.watch` latency | the two watcher files alone on ENV-1 and ENV-2; `API-02-fswatch-latency-probe.mjs` | ENV-1, ENV-2 | Pass | `API-02-server-watcher-tests-branch-vs-base.log`, `API-02-fswatch-latency-probe.mjs` | Both `Tests  2 failed \| 25 passed (27)`; `{"latenciesMs":[null,null,null,null,1974]}` | Cause: `fseventsd` backlog delays watch events 2–5.5 s or loses them; same on base. TESTING.md rule added (`327566836a`) |
| API-03 | TESTING "tools a run gets" | whole server `test:integration` | `pnpm -C autobyteus-server-ts test:integration:prepare`; `env -i … test:integration`; failing file alone on both builds; `API-03-fswatch-main-thread-block-probe.mjs` | ENV-1, ENV-2 | Pass | `API-03-server-integration-suite.log`, `API-03-fswatch-main-thread-block-probe.mjs` | `Tests  14 failed \| 491 passed`; 13 watcher timeouts + the HTTP-contract timeout; probe `"closeMs":1831 … "maxEventLoopStallMs":1826` | Every failure is a watcher or a stalled request/hook; the HTTP-contract file fails alone on base too (another case); closing a recursive `fs.watch` blocks Node's main thread up to 1.8 s |
| API-04 | AC-001, AC-003, AC-005, REQ-006, DS-003 (history), restore | real studio server in process: GraphQL, agent WebSocket (approval), definition saves, stop/restore, run projection; scripted Anthropic model | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts --no-watch`; mutation: server passes `null` instead of the base tools | ENV-1 | Pass | `API-04-native-tool-search-server-e2e.log`, `API-04-native-tool-search-e2e.json` | `requests: 9 \| distinct tool sets: 1`; `approvals: ["search_tools","list_projects","list_projects","list_project_tasks","list_projects"]`; `history tool_call names: [... ]` without `call_tool`; mutation `AssertionError: expected [ 'run_bash', 'read_file', …(6) ] to deeply equal [ …(4) ]` | New durable test (`7ec93eee7d`); also passed inside API-05 |
| API-05 | TESTING "tools a run gets"; BEH-004 | whole server E2E | `env -i … pnpm test:e2e`; each failing file alone on ENV-1, the still-failing ones on ENV-2, a second ENV-1 rerun of those that passed on ENV-2; `API-05-built-server-stop-probe.mjs` on both | ENV-1, ENV-2 | Pass | `API-05-server-e2e-whole-suite.log`, `API-05-built-server-stop-probe.mjs` | `Tests  25 failed \| 536 passed \| 673 skipped`; `autobyteus-native-tool-search.e2e.test.ts (1 test)` ✓; stop probe `"Server shutdown exceeded 10s; forcing exit"` once on the branch, stop times overlapping on both builds | All 22 failing files traced: slow server shutdown past 10 s (`TEST_SERVER_EXITED_NONZERO`/`STOP_TIMEOUT`/SIGKILLed node) and stalled hooks/requests on both builds (FU-007), watcher events (API-02/03), perf limits under load, `dsh` on PATH (FU-006). None sends a message to a native run. Every file that failed alone on the branch either fails the same way on the base or passed on a second branch rerun; `project-mutation-node-locality` also failed on the base |
| API-06 | TESTING "tools a run gets" | gated suites asserting native tool lists | grep (`toolInstances`, `enabledTools`, `tools/list`, `requestedToolNames`, request `tools`) over server tests and `test-support` | ENV-1 | Pass | `API-06-gated-tool-list-suites.log` | the list of native provider-request assertions | Each is rewritten and run (IMP-13, IMP-14, API-09, API-10) or keys on `run_bash` (listed) |
| API-06b | BEH-002 (direct call of a searchable tool) | gated native background-task transport suite | `env -i … RUN_NATIVE_BACKGROUND_TASK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts --no-watch`; BGT-09 alone on both builds; temporary diagnostic (reverted) | ENV-1, ENV-2 | Pass | `API-06-gated-tool-list-suites.log` | `Tests  1 failed \| 8 passed (9)`; BGT-09 `Timed out after 60000 ms waiting for copy's running task` on both builds; `DIAG-BGT09 frames {…"ROOT_EXECUTION_EVENT":1} []` | BGT-09 scripts `delegate_task` by name and the delegation succeeds; it fails because the root view sends no per-agent record the test reads (FU-008) |
| API-07 | AC-004, AC-006 (live), REQ-005, K-1 | real providers through the real agent loop | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_PROVIDER_TESTS=1 LIVE_TOOL_SEARCH_RECORD=<f> pnpm -C autobyteus-ts exec vitest run tests/integration/agent/native-tool-search-live.test.ts`; Gemini again with `GEMINI_MODE=aiStudio` | ENV-3 | Pass | `API-07-live-tool-search-all-providers.log` | `Tests  7 passed \| 1 skipped (8)`; seven lines `"outcome":"called_correctly"` with `"identicalTools":true`; DeepSeek each `cacheRead` ≥ previous prompt rounded down to 128 | DeepSeek V4 Flash and Pro, Gemini 3.8 Flash (Vertex Express), GLM 5.3, Grok 4.7, GPT-5.4 mini, Claude Sonnet 5.5. Kimi: `provider refused kimi-k3: quota_or_billing_blocked`; Gemini AI Studio: `invalid_or_missing_credentials` |
| API-08 | AC-008, AC-009, REQ-008/009 | PM and Daily Assistant tool sets, real agent loop, DeepSeek V4 Flash, old vs new | `env -i … node evidence/evaluate-tool-search.mjs <ENV-2 root> <out> --agents pm,da --reps 2`, same with ENV-1 root; `da-download` ×4 per build with the fixed stub | ENV-4 | Pass | `API-08-evaluation-old-vs-new.log`, `API-08-evaluation-old-base-4cbf9e7881.json`, `API-08-evaluation-new-branch.json` | `pm first-request saving 5096`, `da first-request saving 5722`; `min per-conversation first-request saving 5080` / `5714`; fixed-stub `da-download` 4/4 old, 4/4 new | The two `da-download` failures (one per build) were the stub's missing extension (`filename: "logo"` per the tool's schema); script fixed |
| API-09 | REQ-006, K-2 (APC-E2E-004), thinking strip on restore | real studio server, Anthropic Opus 5.5, strict harness | `env -i … RUN_ANTHROPIC_CACHE_E2E=1 ANTHROPIC_CACHE_E2E_EVIDENCE_DIR=<d> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-09-anthropic-prompt-caching-live.log`, `API-09-apc-case-results.json` | `Tests  7 passed (7)`; APC-E2E-004 `"toolsChanged":false`, continuation `thinkingBlocksInRequest":7`, `cache_read":39258`; APC-E2E-008 `changedTool":400` | APC-E2E-005 still exercises the strip path: first request after restore `thinkingBlocksInRequest":0`, accepted |
| API-10 | REQ-006, BEH-005, K-2 (CCR-E2E-002) | real studio server, Anthropic Opus 5.5 strict + Gemini | `env -i … RUN_COMPACTION_CACHE_E2E=1 COMPACTION_CACHE_E2E_EVIDENCE_DIR=<d> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-10-compaction-cache-reuse-live.log` | `Tests  4 passed (4)`; CCR-E2E-002 `"toolsChanged":false`, `"thinkingBlocks":14`, `"cacheShare":0.9565`, `"status":200` | Compaction with tool search on both Anthropic and Gemini |
| API-11 | AC-005, SCN-003, AC-002 (live), DS-003 history | real studio server, native, DeepSeek V4 Flash, 324 definition edits | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=autobyteus LIVE_TOOL_LIST_MODEL=deepseek-v4-flash LIVE_TOOL_LIST_EVIDENCE_DIR=<d> ./node_modules/.bin/vitest run tests/e2e/runtime/live-tool-list-updates.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-11-live-tool-list-native-deepseek.log`, `API-11-live-tool-list-autobyteus.json` | run 2 `Tests  1 passed (1)`; turn 1 `search_tools … found: ["list_projects"]` then `list_projects`; turn 2 notice, search, `list_project_tasks`; turn 3 search `found: ["list_project_tasks","delegate_task","search_memory"]` | Run 1 failed only because the suite opened no test vault; suite fixed (`e87279514c`) |
| API-12 | SCN-A3, AC-003 (real server, platform tool) | real studio server, native, DeepSeek | `env -i … AUTOBYTEUS_TEST_VAULT=… SEARCH_MEMORY_LIVE_E2E=autobyteus SEARCH_MEMORY_E2E_EVIDENCE_DIR=<d> ./node_modules/.bin/vitest run tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-12-search-memory-native-deepseek.log`, `API-12-search-memory-autobyteus.json` | `✓ SM-autobyteus: a run of a definition without search_memory finds an earlier run and leaves itself out` | `search_memory` (searchable) found and called; history never names `call_tool` |
| API-13 | SCN-A1; persisted data `Directly Usable`; REQ-006 after restore; direct call of a searchable tool | old build writes a run, new build restores it | `env -i … node evidence/API-13-upgrade-restore-probe.mjs <ENV-2 root> <ENV-1 root> <model> <out>` for DeepSeek V4 Flash, Gemini 3.8 Flash, Claude Sonnet 5.5 | ENV-4 | Pass | `API-13-upgrade-restore.log`, `API-13-upgrade-restore-<model>.json`, `API-13-upgrade-restore-probe.mjs` | each `restore` `"success":{"rename":true,"start":true}`, `"identicalTools":true`, `"firstRequestTools":["run_bash","read_file","edit_file","write_file","search_tools","call_tool"]`, `"errors":0`; raw traces `c:update_project@call_tool` after old `c:update_task` without `called_through` | Temporary probe: needs two builds at once. DeepSeek and Anthropic also called a searchable tool directly by name after seeing old direct calls; it ran and was recorded as a direct call |
| API-14 | AC-003 (the run's tool card) | web segment handler | `env -i … pnpm -C autobyteus-web test:nuxt --run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-14-web-call-tool-card.log` | `Tests  23 passed (23)`; typecheck `PASS` | New case (`abe5617269`): a `call_tool` START becomes card `update_task` with `{task_id, status}` at END |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R02, API-R04 (IMP-14), API-04, API-07, API-13 | Proven | — |
| AC-002 | Yes | API-R02, API-04, API-07, API-11 (search finds an exact name; after removal it no longer returns it) | Proven | — |
| AC-003 | Yes | API-R02 (approval, unknown, malformed, invalid args), API-04 (approval prompt, END card name, execution, history over the real server), API-14 (web card), API-R04 (IMP-13), API-12 | Proven | — |
| AC-004 | Yes | API-07 (7 of 7 reachable providers) | Proven for every provider the vault reaches; Kimi (billing refusal), Gemini AI Studio (invalid key), Mistral, Qwen, MiniMax, LM Studio, Ollama (no vault key) recorded with the reason, as AC-004's alternate outcome allows | — |
| AC-005 | Yes | API-R02, API-04 (byte-identical tools and system across add/remove, notice, refusal), API-11 (live) | Proven | — |
| AC-006 | Yes | API-R02, API-04, API-07 (DeepSeek cache reads), API-09, API-10 | Proven | — |
| AC-007 | Yes | API-R02 (scripted compaction then search and call), API-10 (live compaction with tool search, tools unchanged) | Proven | — |
| AC-008 | Yes | API-08 | Proven: first request PM 7,620 → 2,524 (−5,096), DA 8,256 → 2,534 (−5,722); per request PM 7,838 → 3,589, DA 10,043 → 3,211; cache reads per request PM 5,898 → 2,699, DA 8,759 → 2,441; requests per task PM 4.3 → 4.7, DA 7.4 → 4.8 | — |
| AC-009 | Yes | API-08 | Proven: all 6 PM tasks 2/2 on both builds; DA tasks 2/2 on both except `da-download` (stub defect, then 4/4 on both with the fixed stub) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | Repository: API-R02, API-04; live: API-07…API-13 | AC-004 on providers without a vault key | Keys for Qwen (used by native runs today), Mistral, MiniMax; Kimi billing |
| Changed-boundary execution directness | 90% | 96% | API-04 (real server bytes and WebSocket), API-07 (real providers), API-11/12 (real server + real model) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | API-09/10/11/12 real server + real providers; API-13 real old writer → new reader | The evaluation's tool behavior is a stub world (definitions real) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | Clean env, test vault, Node 22, base build for comparison | Machine load and `fseventsd` backlog made broad suites noisy (all failures traced); unprobed providers | A quiet machine for the broad suites |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 95% | API-R02 (malformed, unknown, repair), API-04 (removal refusal, restore), API-09 APC-005 (restore strip), API-13 (upgrade restore, direct calls), API-10 (compaction) | — | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | API-04 (approval prompt and END name over the real WebSocket), API-14 (the web handler turns that END into the card's name and arguments) | No rendered check; the card renders `toolName`/`arguments` with unchanged code used for every tool, and no web or desktop code changed | A browser probe of a native run with a found tool |
| Durable regression coverage quality and relevance | 92% | 95% | API-04 new server E2E (mutation-checked), API-14 web case, live suite fixed to run on native | — | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 94.9% (simple average of 96, 96, 95, 92, 95, 95, 95)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.9%). The gap is the environment category (92%): providers without a vault key (Qwen, Mistral, MiniMax, LM Studio, Ollama; Kimi refused for billing) and a busy machine during the broad suites. No available surface closes it: the provider part needs keys only the user can add (AC-004 allows recording them), and every broad-suite failure is already traced to a cause outside this change. No critical criterion is unproven and no category is below 90%, so the result is `Pass` with this gap recorded
- Confidence-limiting residual risks: providers without a vault key (Qwen is used by native runs today, U-002); a busy machine during the broad suites.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (real providers through the library loop and through the real studio server) and `Lifecycle` (upgrade restore across two builds)
- Confidence gap it addressed: repository evidence used scripted models; AC-004 needed real providers; K-2 cases had never run; restored runs and 324 updates on a real model; AC-008/AC-009 old against new.
- Browser validation needed: No. No web or desktop code changed; the card name comes from the END metadata, proven at the WebSocket (API-04) and in the web handler (API-14).
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: a native run's memory folder written by the base build's own agent loop on real models (raw traces without `called_through`, working-context snapshot with direct calls), API-13
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-13 (three providers), API-R02 (`fromDict` without the key), API-04 (restore within the new build)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none found

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts` | Added (`7ec93eee7d`) | API-04 | — |
| `autobyteus-server-ts/tests/e2e/runtime/live-tool-list-updates.e2e.test.ts` | Updated (`e87279514c`): opens the test vault so the native runtime can run it | API-11 | — |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Updated (`abe5617269`): one case for a `call_tool` card | API-14 | — |
| `TESTING.md` | Updated (`327566836a`): rule "File watching on a busy Mac" | API-02, API-03, API-05 | — |
| `tickets/…/evidence/evaluate-tool-search.mjs` | Updated (ticket evidence, not durable coverage): `download_media` stub adds the URL extension | API-08 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Anthropic model in API-04 | `globalThis.fetch` answers `POST /v1/messages` from a script | deterministic, credit-free, runs in every `pnpm test:e2e` | none for the server boundary; real providers are API-07/09/10/11/12/13 |
| Tool behavior in API-07, API-08, API-13 | stub tools with the real registered definitions, in-memory world | no side effects on real Projects/Tasks/web | the tools' own behavior is not under test here |
| Embedding model in API-12 | the suite's deterministic stand-in | the suite's design | none for tool search |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515-base` | Yes | `git worktree remove --force`, `git worktree prune` | Removed |
| Temp HOMEs, data roots, workspaces, memory folders | Yes | removed by the suites and scripts | Removed |
| Diagnostic edits (server factory mutation, BGT-09 frame dump) | Yes | restored from copies; `git diff` empty for both files | Reverted |
| Logs in `/tmp/nts515` | Yes | excerpts copied into evidence | Removed after commit |
| Probes (`API-01-…`, `API-02-…`, `API-03-…`, `API-05-…`, `API-13-…`) | Yes | kept as evidence | Kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`. AC-004 lists the unreachable providers with their reasons.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes: Follow-ups added or updated by this round: FU-003 (cause found), FU-005, FU-006, FU-007, FU-008. Whole-suite failures in the server and library suites are all traced to causes outside this change (machine load, `fseventsd`, slow server shutdown, an installed `dsh`, a stale root-view reading in BGT-09).
