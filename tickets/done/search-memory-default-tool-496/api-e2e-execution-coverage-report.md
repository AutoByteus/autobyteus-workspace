# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/search-memory-default-tool-496/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/done/search-memory-default-tool-496/api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `tickets/in-progress/search-memory-default-tool-496/api-e2e-test-progress.md`
- Round and trigger: round 1, implementation IR-001 (SR-004) on the direct low-risk route; **round 2 (API-REV-002)**, the delivery engineer's release smoke failure before tagging v1.5.13-beta.8 (`configured-skill-on-demand-loading.e2e` expected the old native tool list), run in the release worktree `release-v1.5.13-beta.8` on branch `finalize/release-v1.5.13-beta.8`
- Prior round reviewed: round 1 (API-REV-001). Its miss: no ungated server E2E and only part of `test:integration` were run, so three tests outside the unit suite kept the old exact tool lists.
- Deviations from the investigation's plan, and why:
  - Added API-05N, a negative control: the scripted-AGY cases run with the rule line removed must fail. It shows the new suite actually detects a missing platform-given tool.
  - API-10 (Grok) could not complete: the provider quota was exhausted (see Cases).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496/tickets/in-progress/search-memory-default-tool-496/evidence/` (files prefixed `API-`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `5cdd6faf81` source (head `d163e606da` adds only docs) plus the new suite file | macOS Darwin 25.5.0 arm64 | Node v22.23.1; in-process Studio server (`startStudioE2eRuntimeServer`) on a fresh temp data root per run | `env -i` clean environment; the process `MemorySearch` uses the deterministic embedding stand-in (no download); the index is built through GraphQL `startMemoryIndexing` |
| ENV-2 | as ENV-1 | as ENV-1 | Scripted AGY CLI `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (case `linked_skills`), no model | throwaway `HOME` |
| ENV-3 | as ENV-1 | as ENV-1 | Native AutoByteus, DeepSeek `deepseek-v4-flash` | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (log line `Secret vault: test vault … (read-only)`), `AUTOBYTEUS_LIVE_STRICT=1`, throwaway `HOME` |
| ENV-4 | as ENV-1 | as ENV-1 | Claude Agent SDK, `claude` CLI on the host login, model `haiku` | real `HOME`, `USER`, `LOGNAME` |
| ENV-5 | as ENV-1 | as ENV-1 | Codex app server, `codex` CLI, `gpt-6.1-terra`, effort `medium` | throwaway `CODEX_HOME` holding a symlink to the host `auth.json` and an empty `config.toml` (removed afterwards) |
| ENV-6 | as ENV-1 | as ENV-1 | Grok Build, `grok` CLI on the host login, `grok-4.7` | real `HOME`, `USER`, `LOGNAME` |
| ENV-7 | round 2: `a8ac226e65` (release state), then `6aa25d9191` / `8af6082a52` / `40acfb7174` | as ENV-1 | release worktree `release-v1.5.13-beta.8`; Node v22.23.1; built `dist/` rebuilt during API-14 | clean environment (`env -i`, throwaway `HOME`); machine load average 49–300 from other sessions throughout, `fseventsd` at 135–176 % CPU |

## Cases

Each live command is `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts --no-watch`, run from the worktree root with the environment named in its row. Every case's definition has `toolNames: []`.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | Exposure rule, native resolver, MCP session `tools/list` (unit) | Reused: IMP-02 | — | Pass | (IMP-02) | (IMP-02) | Ran on `5cdd6faf81`, the code under test |
| API-02 | AC-001, AC-003 | MCP routes and sessions; tool-list update restore case (integration) | Reused: IMP-05 | — | Pass | (IMP-05) | (IMP-05) | Ran on `5cdd6faf81`. Its 8 skips are the `RUN_CLAUDE_E2E` cases; API-08 covers the live Claude path for this ticket. |
| API-03 | AC-002 | Memory tool and search unit tests; full server unit suite | Reused: IMP-01 (+ IMP-02 for the files that failed there) | — | Pass | (IMP-01, IMP-02) | (IMP-01) | `git diff --name-only 8a0858709f 5cdd6faf81` lists only test files. None of them touches `src/agent-tools/memory` or `src/memory-search`. |
| API-04 | — | Architecture tests; server and web typecheck with the new suite | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture --no-watch`; `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck`; plus the suite with no gate | ENV-1 | Pass | `API-04-typechecks-architecture.log` | `Tests  71 passed (71)`; `test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; `test-file errors: 87 in 37 files (baseline 87 in 37 files)`; with no gate: `Tests  3 skipped (3)` | The new file adds no type errors. The architecture tests include the node-credential paths check. |
| API-05 | AC-001, AC-004 (MCP path), AC-002 | Real Studio server → AGY runtime process → the run's Agent Tools MCP `tools/list` / `tools/call` | `SEARCH_MEMORY_LIVE_E2E=agy ANTIGRAVITY_CLI_COMMAND=<abs fixture>`, throwaway `HOME`. Cases `SM-agy` (earlier run told a codeword → index → a new run calls `search_memory` → after its own turn is indexed, a second call) and `SM-agy-list` (`LIST_TOOLS` for a definition with `toolNames: []` and one with `["search_memory","list_projects"]`) | ENV-2 | Pass | `API-05-agy-scripted-live.log`, `API-05-search-memory-agy.json` | Log: `✓ SM-agy: …`, `✓ SM-agy-list: …`. JSON: `"definitionToolNames": []`; first and second search results name the earlier run `…19a7aced…`, never the asking run `…9de8b532…`; `tools/list list-plain` → `["send_message_to","delegate_task","search_memory"]`; `tools/list list-listing` → `search_memory` once | The asking run's own journal held the codeword when the second search ran. The suite first waits until the user's Memory page search (GraphQL, no asking run) finds the asking run. |
| API-05N | AC-001 (the suite detects a missing tool) | Same as API-05 | Same command, with `...PLATFORM_GIVEN_TOOL_NAMES,` removed from `buildRuntimeAgentToolExposure`; restored with `git checkout` right after (`git diff -- autobyteus-server-ts/src` empty) | ENV-2 | Pass (all 3 cases failed, as a negative control should) | `API-05N-agy-negative-control.log` | `Tests  3 failed (3)`; `expected [] to deeply equal [ 'search_memory' ]`; `expected [ 'delegate_task', 'send_message_to' ] to include 'search_memory'` | Shows the durable suite guards the rule |
| API-06 | AC-003 | Real restore: GraphQL `terminateAgentRun` / `restoreAgentRun`, the seen-tool-names record, the runtime input | Case `SM-agy-upgrade`: a run's turn; terminate; its `seen_tool_names.json` rewritten as the previous build wrote it (`{version:1, toolNames}` without `search_memory`); restore; `ECHO_INPUT` twice; `CALL_TOOL` `search_memory` | ENV-2 | Pass | `API-05-agy-scripted-live.log`, `API-05-search-memory-agy.json` (`cases.upgrade`) | `"firstInput": "ECHO:\"[Platform notice — tools updated]\n\nYour tools changed. Now available: search_memory.\n\nECHO_INPUT first after the upgrade\""`; `"secondInput": "ECHO:\"ECHO_INPUT second after the upgrade\""`; `"secondNotices": []`; `seenAfter.toolNames` contains `search_memory`; `call` begins `CALLED:` | The previous build's record is synthesized small data of the same structure (TESTING.md: upgrades are tested on small synthesized data). The run is test-owned. |
| API-07 | AC-004 (native), AC-001, AC-002 | Real native AutoByteus run, real model, the native `SearchMemoryTool` | `SEARCH_MEMORY_LIVE_E2E=autobyteus AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1`, throwaway `HOME` | ENV-3 | Pass | `API-07-native-deepseek-live.log`, `API-07-search-memory-autobyteus.json` | Log: `✓ SM-autobyteus: a run of a definition without search_memory finds an earlier run and leaves itself out`. JSON: `"definitionToolNames": []`; both calls `toolName: search_memory`, `toolError: null`; results name the earlier run `…eae1fd28…`; the reply is `SEARCHED search_memory_plain_8219d8_eae1fd28ff9a471187db7bed1f5f557d` | Paid inference: two short turns of the earlier run and two of the asking run |
| API-08 | AC-004 (Claude), AC-001 | Real Claude Agent SDK run, real model, through the run's Agent Tools MCP endpoint | `SEARCH_MEMORY_LIVE_E2E=claude`, host login | ENV-4 | Pass | `API-08-claude-live.log`, `API-08-search-memory-claude.json` | `✓ SM-claude: …`; both calls succeed; the reply is `SEARCHED search_memory_plain_ab72cc_9f624b43cf324e14a142c6bfb9c1fdc9` (the earlier run); the asking run `…17f8969d…` is absent | Paid |
| API-09 | AC-004 (Codex), AC-001 | Real Codex run, real model, Codex `enabled_tools` and the Agent Tools MCP endpoint | `SEARCH_MEMORY_LIVE_E2E=codex CODEX_HOME=<throwaway>` | ENV-5 | Pass | `API-09-codex-live.log`, `API-09-search-memory-codex.json` | `✓ SM-codex: …`; the reply is `SEARCHED search_memory_plain_4917b9_629b23fcb45f42ef9c5f78a7b49f4ac4`; the asking run `…64fb5aea…` is absent | Paid |
| API-10 | AC-001 (Grok, ACP backend) | Real Grok Build run | `SEARCH_MEMORY_LIVE_E2E=grok`, host login | ENV-6 | Not Tested | `API-10-grok-live-quota.log` | `Rate limited: API error (status 429 Too Many Requests): subscription:free-usage-exhausted: You've used all the included free usage for model grok-4.7 for now. … tokens (actual/limit): 609708/600000` | Missing dependency: the Grok account's rolling 24-hour quota. `grok models` offers only `grok-4.7`. The earlier-run turn completed; the asking turn was refused before any tool call. Grok and DeepSeek Harness both build their runs with `AcpAgentRunBackendFactory`, which calls the shared rule. `acp-tool-list-reopen.test.ts` (API-01) proves that ACP sessions open with the rule's names. The served `tools/list` and `tools/call` are runtime-independent; API-05, API-08 and API-09 prove them with three different clients. DeepSeek Harness: `dsh` is not installed. |
| API-11 | AC-001 (stale test) | Native run tool instances (factory-level E2E) | `env -i PATH HOME=<throwaway> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts --no-watch` on `a8ac226e65` | ENV-7 | Fail (reproduced, stale test) | `API-11-configured-skill-repro.log` | `× keeps ordinary native tools and configured skill reads explicit in the same active run`; `expected [ 'run_bash', 'read_file', …(3) ] to deeply equal [ 'run_bash', 'read_file', …(2) ]` | Reproduces the smoke failure. The behavior is the approved REQ-001; the expectation is stale. |
| API-12 | AC-001 (stale tests) | Whole server integration suite | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` on `a8ac226e65`, then the two failing files alone | ENV-7 | Pass for the exposure (no tool-list failure); 11 failures out of scope | `API-12-integration-suite-excerpt.log` | `Tests  11 failed \| 494 passed \| 69 skipped (574)`; every failure is in `package-auto-refresh` or `file-system-watcher` (`Timed out waiting for event`, `expected 8846 to be less than 5000`) | File-watcher timing: `fseventsd` at 135–176 % CPU, load average 58–236 (another session's `yes` stress included). Not caused by this ticket: the only source change since beta.7 is the exposure rule. `autobyteus-agent-run-backend-factory.integration` passed, but only because its registry lacked the memory tools (fixed in API-13). |
| API-13 | AC-001 | The three stale tests, fixed | `vitest run` of `configured-skill-on-demand-loading.e2e`, `project-task-boundaries.e2e`, `autobyteus-agent-run-backend-factory.integration` with the fix (`6aa25d9191`) | ENV-7 | Pass | `API-13-fixed-files.log` | Before: `expected [ 'search_memory' ] to deeply equal []` (project-task-boundaries `beforeAll`, all 18 cases skipped). After: `Tests  22 passed (22)`; `Tests  4 passed (4)` | Each spreads `PLATFORM_GIVEN_TOOL_NAMES` instead of naming it; the integration test registers the memory tools as a server start does |
| API-14 | AC-001 (stale-test sweep) | Whole ungated server E2E suite | `env -i PATH HOME=<throwaway> TMPDIR pnpm test:e2e` on `8af6082a52`; API-14R: the 15 failed files again, `--no-file-parallelism` | ENV-7 | Pass for the exposure; failures out of scope | `API-14-server-e2e-excerpt.log` | `Tests  17 failed \| 543 passed \| 672 skipped (1232)`; no failure mentions `search_memory` or a tool list. API-14R: `Test Files  5 failed \| 10 passed (15)` | The remaining 5 are timing under load (5-min load 49–106): built server not stopped within 15 s (`TEST_SERVER_STOP_TIMEOUT`: team-run-v1-production-upgrade, qwen-configuration-lifecycle); `afterAll` 10 s < the 15 s stop allowance (provider-secret-lifecycle, and test-vault-selection, which reruns it), recorded as FU-006; NAS-01 over its 5 s test timeout; a watcher wait in agent-package-definitions-live-refresh. None runs code changed since beta.7. |
| API-15 | AC-001 (gated stale-test sweep) | Gated suites with exact tool lists | Search of gated E2E files for `enabledTools`, `enabled_tools`, `tools/list`, `LIST_TOOLS`, `toolInstances`; then `RUN_CODEX_E2E=1` `codex-agent-tools-empty-list.e2e` (no model use) | ENV-7 | Pass | `API-15-16-gated-codex-and-typechecks.log` | `✓ accepts enabled_tools: [] and connects to the Agent Tools endpoint` | The other gated suites compare tool lists with `arrayContaining`. The Codex file's own catalog has no memory adapter, so `enabled_tools: []` stays true and valid. |
| API-16 | — | Server and web typecheck with the fix | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` on `8af6082a52` | ENV-7 | Pass | `API-15-16-gated-codex-and-typechecks.log` | `test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; `test-file errors: 87 in 37 files (baseline 87 in 37 files)` | — |
| API-17 | Release smoke | The three release smoke suites | `python3 scripts/release_smoke.py` on `8af6082a52`; API-17A: `agy-linked-skills-transport` alone with the scripted AGY CLI | ENV-7 | Required cases Pass; run verdict Fail, not caused by this ticket | `API-17-release-smoke-first-attempt.log` | AutoByteus 2/2 PASS with no `configured-skill` failure; Claude 3/3, Codex 3/3, AGY 2/2 PASS; Grok 429 (waived); `other agy-linked-skills-transport.e2e.test.ts FAIL Error: Hook timed out in 60000ms.`; `worktree left unchanged FAIL` | The worktree row was my own evidence files, written during the run. The AGY cleanup hook: that step ran 109 s (E01 29.8 s) against 43 s alone (E01 3.6 s, API-17A `Tests  10 passed (10)`). |
| API-18 | Release smoke | The three release smoke suites, clean tree | `python3 scripts/release_smoke.py` on `40acfb7174` (code = `8af6082a52`), worktree untouched | ENV-7 | Required cases Pass; run verdict Fail, not caused by this ticket | `API-18-release-smoke-clean-tree.log` | Every required case PASS except Grok (waived: 429 and ACP `initialize` timeouts); `worktree left unchanged` passes; `other` E06 `Timed out waiting for delegation result`, E07 `Timed out waiting for TURN_COMPLETED` (the restored run stayed `initializing`) | The AGY step took 248 s against 129 s in delivery's run; E08 took 24.8 s against 2.1 s alone. The same E06/E07 passed in API-17 and in API-17A on the same code. The cause is machine load (5-min average 175) against the suite's fixed 30 s waits; which case misses varies from run to run. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, API-05, API-05N, API-07, API-08, API-09; round 2: API-13 (the stale E2E/integration expectations now assert it), API-14, API-17/API-18 (AutoByteus release smoke cases pass) | Proven | — (Grok live, API-10, could not run because of the provider quota; see the scorecard) |
| AC-002 | Yes | API-03; API-05 / API-07 / API-08 / API-09 (the result names the earlier run, never the asking run) | Proven | — |
| AC-003 | Yes | API-02, API-06 | Proven | — |
| AC-004 | Yes | API-07 (native), API-08 (Claude), API-09 (Codex); API-05 (AGY, scripted) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | API-01…09 | Grok and DeepSeek Harness not proven live | A Grok run after the quota resets |
| Changed-boundary execution directness | 75% | 95% | API-05, API-07, API-08, API-09: a real server and real runtime processes call the tool from a definition without it | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Real models on three runtimes, a real MCP client (AGY) and a real restore. Only the embedding model is a stand-in, and meaning search is not in this ticket's scope. | The ACP CLI's own MCP client is not exercised live. Server-side `tools/list` / `tools/call` are runtime-independent and proven by four clients. | Same as above |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Fresh data roots; test vault; host logins; throwaway `CODEX_HOME`; index built through the user's action | The upgrade's prior seen record is synthesized, not written by the previous binary | Create the run with a base build (low value: the record structure is unchanged) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | API-02, API-06 (restore, notice once, record rewritten), API-05 (listed once; asking run left out), API-05N | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI change. The notice entry the "Tools updated" card renders is asserted in API-06 (`system_task_notification`, sender `system.tool_list_update_notifier`). | — | — |
| Durable regression coverage quality and relevance | 85% | 95% | The new gated suite; its scripted-AGY cases cost nothing and API-05N shows they fail without the rule. Round 2: the three stale tests fixed (API-13), with the full unit-adjacent layers swept (API-12, API-14, API-15) | The paid cases run only when gated | Round 1 scored this 95% without running the ungated server E2E or the whole `test:integration`; that score was not earned, as the release smoke showed. Round 2 earns it. |

- Overall post-repository confidence: 78% (simple average of the 6 applicable categories)
- Overall final confidence: 95%
- Calculation method: simple average of the applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - No live Grok or DeepSeek Harness run: Grok's quota is exhausted and `dsh` is not installed. Bounded by the shared ACP backend factory's use of the rule (unit-proven) and by the runtime-independent server endpoint.
  - The privacy trade-off QR-002 (node-wide search, accepted by the user) is preserved behavior, not a risk this validation can lower.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (in-process Studio server; real runtime CLIs and providers; GraphQL and the agent WebSocket)
- Confidence gap or residual risk it addresses, and the expected gain: the repository tests prove the exposure, but not that a real model on a real runtime receives the tool and can call it (AC-004). The live runs close that gap.
- Browser validation needed, and why or why not: No. No renderer change; the notice card is unchanged and its data entry is asserted at the API.
- If `Blocked`: N/A. API-10 alone is `Not Tested` (Grok quota). It does not block, because AC-004 asks for native plus Claude or Codex, and both are proven.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: a per-run `seen_tool_names.json` in the structure the previous build wrote (`{version: 1, toolNames: ["delegate_task","send_message_to"]}`)
- Approved transition followed without an unnecessary migration: `Yes`. The existing writer rewrote the record at restore (`seenAfter` includes `search_memory`).
- Cases proving the direct-use outcome: API-06, API-02
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts` | Added | API-05, API-05N, API-06, API-07, API-08, API-09, API-10 | — |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Updated (round 2, `6aa25d9191`) | API-11, API-13, API-17, API-18 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated (round 2, `6aa25d9191`) | API-13 | — |
| `autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` | Updated (round 2, `6aa25d9191`) | API-12, API-13 | — |
| `TESTING.md`, Choosing the path (round 2, `8af6082a52`) | Updated: a change to the tools a run gets runs the whole unit, `test:integration` and server E2E suites, plus a search of the gated suites; tool-list assertions spread `PLATFORM_GIVEN_TOOL_NAMES` | — | The prevention for the stage that let the stale tests through |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Embedding model (meaning search) | `tests/helpers/fake-embedding-model.ts`, installed as the process `MemorySearch`'s index | A full index pass on a fresh data root downloads about 55 MB. The meaning tier is unchanged and out of scope. | Results come from the real text index only; the tool path is unaffected |
| AGY model (API-05/05N/06) | Scripted AGY CLI calling the run's real Agent Tools MCP endpoint with the MCP SDK client | No model is needed to prove `tools/list` / `tools/call` and the restore input; it costs nothing | A scripted client, not Gemini; the real models are covered by API-07…09 |
| The previous build's seen record (API-06) | Record rewritten in the same structure while the run is stopped | TESTING.md: upgrades are tested on small synthesized data | Not written by the old binary; same structure |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp data roots `search-memory-live-e2e-*` | Yes | Removed by the suite's `afterAll` | Removed |
| Agent runs and runtime processes | Yes | `terminateAgentRun` for each run; server closed | Done |
| Throwaway `HOME` folders and `CODEX_HOME` | Yes | `CODEX_HOME` removed after API-09. The empty temp `HOME` folders are left in `$TMPDIR` for the OS to clear. | Done |
| Negative-control source edit (API-05N) | Yes | `git checkout -- autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | `git diff -- autobyteus-server-ts/src` empty |
| Host `grok` and `claude` histories | No (the host login records sessions) | None | Each paid run adds its short sessions to the host CLI's history, as other live suites do |

## Latest Authoritative Result

- Result: `Pass` (round 2, API-REV-002). The release smoke failure is fixed: `configured-skill-on-demand-loading.e2e` passes, and every required release smoke case passes except Grok, which the user waived (API-17, API-18).
- Criteria not proven, or parts only the user can check: `None`. API-10 (Grok live) is `Not Tested` because of the provider quota; it is not required by any criterion.
- Round 2, not caused by this ticket: the release smoke verdict still reads `FAIL` on AGY timing cases (`other`: a 60 s cleanup hook in API-17, E06/E07 30 s waits in API-18), which pass alone on the same code (API-17A); integration file-watcher and E2E timing failures (API-12, API-14R). All are machine load from other sessions (load average 49–300, `fseventsd` saturated); none runs code changed since v1.5.13-beta.7, whose only source change is the exposure rule. FU-006 records the one latent test defect found (a cleanup hook shorter than the server stop allowance).
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff
- Notes: the warnings `Memory file missing: …/raw_traces_manifest.json` on restore come from the unchanged `agent-memory/store/memory-file-store.ts` reading an optional manifest of a run that never rotated. They are not failures and are not related to this ticket; they were filtered from the saved logs.
