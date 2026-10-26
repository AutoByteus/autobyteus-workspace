# API/E2E Execution Coverage Report — autobyteus-32 (Model Router core)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1, code review pass CRR-002 from `/software_engineering_team/code_reviewer`
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - Added MR-09, which reproduces C-05 deterministically in-process with two scripted router modes, `crash` and `throw`.
  - L-02 got a second probe (`L-02-codex-confinement-probe.mjs.txt`): the live Codex model refuses to run outside writes on instruction, so its sandbox was never reached. The new probe runs a workspace script that writes outside.
  - API-14 (UI with real routed/remote data) and API-15 (preparing the user's desktop check) are **Not Tested** this round. The result is `Fail`, and the desktop check has to be prepared on the fixed build. The data the rows read was checked through the window's GraphQL tree (RC-31, API-13).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on a later `Pass`); this round is `Fail` → failure-origin review

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `75ca9c82ff` (code `03d9860e82` + 303 live-agents fold) + this round's test changes | macOS darwin 25.5, Node 22 | In-process Studio server (vitest), scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`, router plan file), fake Grok, missing Codex, real `claude` signed out in a disposable HOME | `env -i PATH HOME=<disposable> TMPDIR`; fresh app data per file |
| ENV-2 | same | same | Two built servers (`pnpm -C autobyteus-server-ts build`, 18:17) with capturing proxies; scripted AGY in both; beta's Model Router = scripted AGY run | `env -i`; disposable HOMEs and data roots |
| ENV-3 | same | same | Built server `dist/app.js` on a fresh data root; **real CLIs**: Claude Code (sonnet router, haiku delegator), codex-cli (throwaway `CODEX_HOME` with `auth.json` linked), agy (real) | real HOME for sign-ins only (nothing in `~/.claude`, `~/.codex`, `~/.grok` written); `env -i PATH HOME USER LOGNAME TMPDIR`; outside targets in `$TMPDIR` and a test-owned `~/.mr-confinement-probe-*` folder (removed) |
| ENV-4 | same | same + Docker 29.0.1 | Node A = host `dist/app.js`; node B = test-owned container of `autobyteus/autobyteus-server:beta` (image built 2026-10-25) with this worktree's `dist` mounted read-only over `/app/autobyteus-server-ts/dist` and the fixtures read-only | 127.0.0.1 only, no user volumes; the image's dist differs from the base build in 15 `.js` files (work merged after beta.7), `package.json` identical, the branch adds only `built-in-agents/templates/model-router/*` as non-JS assets |
| ENV-5 | same | same | In-process Studio server with **live** agents (`available-agent-runtimes-live-agents.e2e.test.ts`), real CLIs, router = live Codex run | `env -i PATH HOME USER LOGNAME TMPDIR`; app data in a temp folder |
| ENV-B | base `d74f75a51a` (temporary worktree `/tmp/mr-base-wt`, built) | same | as ENV-1 | used only to classify regression failures |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | unit/web | unit, component | IMP-09 (346 unit), IMP-10 (web specs), IMP-06 (guards), IMP-04 (integration) | — | Pass (Reused) | implementation handoff | — | Code unchanged since those checks (`03d9860e82`); this round changed only tests and the fixture |
| MR-01 | AC-002 | HTTP/WS/MCP, scripted delegator | `env -i PATH HOME=<disposable> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/model-routing/model-routing-delegation.e2e.test.ts --no-watch` | ENV-1 | Pass | `MR-01-09-model-routing-e2e-final.log`, `…-final-receipt.json` | `✓ MR-01 routing off (the default)` | Run 3 times (two in the first pass, one final) |
| MR-02 | AC-001, AC-009 data, AC-012 record | + router run, records, statistics | same | ENV-1 | Pass | same | `✓ MR-02 routing on`; receipt `MR-02-decisions` agent `model_router` / `grok_build` | |
| MR-03 | AC-004, QR-001 | router validation, 40 s budget | same | ENV-1 | Pass | same | `✓ MR-03`; receipt `MR-03-silent` elapsedMs ≈ 40 300 | |
| MR-04 | AC-006 | one request at a time | same | ENV-1 | Pass | same | `✓ MR-04`; "the Model Router was busy" for the request never sent | |
| MR-05 | AC-003 | U4b blocked default | same | ENV-1 | Pass | same | `✓ MR-05`; "is blocked until 2026-11-02 10:00 UTC (Retiring · weekly)" | |
| MR-06 | REQ-002 status | router status | same | ENV-1 | Pass | same | `✓ MR-06`; `reasonCode: "SIGNED_OUT"` | |
| MR-07 | AC-008 | GraphQL visibility | same | ENV-1 | Pass | same | `✓ MR-07` | |
| MR-08 | AC-011 (Agent Tools part) | router's MCP tool list | same | ENV-1 | Pass | same | `✓ MR-08`; tools `list_available_agent_runtimes`, `submit_launch_choices` | Covers the AutoByteus tool list only, not the runtime's own tools (see L-01) |
| MR-09 | C-05 (observation), AC-004 | router process death / failed turn | same (MR-09) | ENV-1 | **Observation → finding F-3** | `MR-01-09-model-routing-e2e-final.log` line `MR-09 […]` | `"Router throw"` → `"the Model Router's turn failed (…)"`, then `"After throw, 1"` / `"After throw, 2"` / `"After a new router launch"`: `elapsedMs` ≈ 40 250, `"the Model Router was busy"`, status `active: true` | A process that exits (crash) recovers on the next routing (≈ 8.7 s, "chosen by the Model Router"); a turn that fails with an error leaves every later routing waiting 40 s |
| RC-39 | AC-005 (off / not usable) | two built nodes, peer contract | `env -i PATH HOME=<disposable> TMPDIR RUN_AGY_FAILURE_E2E=1 REMOTE_E2E_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-2 | Pass | `RC-two-server-e2e.log`, `RC-39-41-receipt-excerpt.json` | `✓ RC-39`; `", and Model Routing is off on node \"beta-node\"."`; answer `modelRouting: {state: "off"}` | |
| RC-40 | AC-005 (on), REQ-009, REQ-012 | same | same | ENV-2 | Pass | same | `✓ RC-40`; link `launches[0].source.origin "model_router"`; B records `fromNode "alpha-node"`, `delegatingRunId null`, `delegatingAgentName null` | Agent and Team copy |
| RC-41 | QR-001, AC-005 (router failure) | same | same | ENV-2 | Pass | same | `✓ RC-41`; slow answer accepted after > 30 s; `MODEL_ROUTER_FAILED` "no valid answer within 40 seconds" < 50 s | |
| RC-01…38 (updated) | 191/245/247/261/269/278/308 regression | same | same | ENV-2 | Pass | `RC-two-server-e2e.log` | `Tests  41 passed (41)` | First run: 20 failed, all on intended contract changes (DS-002 `task` in the start request; REQ-009 `launches` on links and rows; supplement § 6 routing state in refusals; QR-001 50 s start bound) and their cascades. Expectations updated in RC-01/03 (inbound start carries `task`), RC-04/17 (refusal suffix), RC-05/06/07/10/21/31 (`launches`), RC-15 (start ≤ 55 s), RC-20 (`task` field) |
| API-09 | AC-002, regression | existing E2E (56 files) | see the log header | ENV-1, ENV-B | Pass (triaged) | `API-09-regression-e2e.log` | `Test Files  5 failed | 42 passed | 9 skipped (56)` then triage | Pre-existing on base: delegated-launch-config-defaults (FU-007), agy-native-image E-002/E-004 (FU-008), SUN-E2E-003 GitHub fixture (FU-009). EXC-E2E-004: load only, passes alone. internal-agents IA-01: stale "+1" (the built-in router is a second internal agent), updated, 5/5 |
| API-12 | REQ-001 on every runtime (303 fold) | live agents | 303 commits cherry-picked (`bd8948ef14`, `33da12b821`, `75ca9c82ff`); branch `codex/available-agent-runtimes-live-agents` kept | — | Pass (Reused) | `tickets/done/available-agent-runtimes-tool/evidence/api-e2e/API-14-live-agents/` | as in autobyteus-303 | LR-1/LR-2 unchanged; code they exercise unchanged by this ticket's later commits except the runtime report, which MR-05/06 and L-01 exercised live |
| API-12 LR-3 | QR-001 (routed `delegate_task` under each runtime's tool-call time-out) | live agents → real MCP → Model Routing | `env -i PATH HOME USER LOGNAME TMPDIR RUN_ROUTED_DELEGATION_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 RUN_AGY_E2E=1 RUN_GROK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts --no-watch -t "LR-3" --silent=false` | ENV-5 | Pass | `API-12-LR-3-live-routed-delegation.log` | `LR-EVIDENCE <runtime> LR-3 {… "event":"TOOL_EXECUTION_SUCCEEDED" …}` with `"Model Router could not choose (the Model Router was busy)"`; final run: `toolMs` Codex 40176, Claude 40113, Antigravity 43791; Grok `turnMs` 55353 (`failedAttempts` 1) | The router (live Codex) is held busy by a `sleep 55` turn, so each routing waits its whole 40 s. Grok reports a tool call only when it is done (timed by its turn); its model first tried a wrong tool name, then made the successful call. Earlier runs during harness fixes are in the progress log |
| L-01 | AC-011 (Claude), QR-004 | live Claude router | `L-probe-router-live-probe.mjs.txt` (`MR_PHASES=L-01`, raw SDK events on) | ENV-3 | **Fail (F-2)**; writes confined | `L-01-claude-router-confinement.json` | files `tmp`/`home`/`shell`/`viaLink` `false`, `inside` `true`; `"PreToolUse:Write hook error: This agent can write files only inside its workspace"`; **`sessionInit.tools` contains `"mcp__claude_ai_Claude_Docs__create"`, `"…__delete"`, `"…__update"`, `"Skill"`; `mcp_servers` `{"name": "claude.ai Claude Docs", "source": "claudeai"}`** | No shell; the workspace's `.claude/settings.json` (allow all, bypassPermissions) is not loaded; a symlink escape is denied too. The user-level Write allow rule could not be set (the user's `~/.claude/settings.json` must not be edited, and a throwaway config dir is signed out): only the user can check it |
| L-02 | AC-011 (Codex), QR-004 | live Codex router | `L-02-codex-confinement-probe.mjs.txt` | ENV-3 | **Fail (F-1)** | `L-02-codex-router-confinement.json` | `configPresentAtCodexStart` → `"targetWritten": true`, `"WROTE"`, `sandbox_policy … "writable_roots": ["/"]`; every control → `"Operation not permitted"` | A workspace `.codex/config.toml` with `[sandbox_workspace_write] writable_roots = ["/"]` that is there when Codex starts widens the router's sandbox to the whole disk. The router can write that file itself (writes in its workspace are allowed), and it takes effect when Codex next starts |
| L-03 | AC-007 | live router (real model) | `L-probe-router-live-probe.mjs.txt` (all phases) | ENV-3 | Pass | `L-03-router-knowledge.json` | `knowledgeBefore: null`; `knowledgeAfter` "Writing tasks (documentation, release notes, prose): choose runtime `antigravity_cli`"; launch note "runs on antigravity_cli / gemini-3.8-flash-low, chosen by the Model Router (release notes writing): Node owner's rule …" | |
| L-04 | C-05 (live Claude) | process lifecycle | same | ENV-3 | Pass (recovers) | `L-04-router-process-killed.json` | killed `claude … --model sonnet`; two later `delegate_task` SUCCEEDED in ≈ 22 s with "chosen by the Model Router"; `claude … --resume` running | |
| API-13 | AC-005 (Docker) | released image running this dist | `API-13-docker-peer-probe.mjs.txt` | ENV-4 | Pass | `API-13-docker-peer.json` | D-1 `"and Model Routing is off on node \"docker-1\"."`; D-2 link `"origin":"model_router"`, B record `"fromNode":"host-a"`; D-3 "no valid answer within 40 seconds" elapsedMs 40302; D-4 routed again | First run had a fixture mount error (harness). Its D-3 showed F-3 on a real container: "the Model Router was busy" after a failed router turn |
| API-14 | AC-009, AC-012 UI | browser with real data | — | — | Not Tested | — | — | Deferred to the rerun on the fixed build; IMP-05/07/08 cover the components; RC-31 and API-13 prove the `launches` the rows read |
| API-15 | Done-when | user's desktop check | — | — | Not Tested | — | — | Prepared on the fixed build (an isolated desktop instance) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MR-02, L-03 | Proven | The user's desktop check (Done-when) |
| AC-002 | Yes | MR-01, API-09, RC-01…38 | Proven | — |
| AC-003 | Yes | MR-05 | Proven | — |
| AC-004 | Yes | MR-03, RC-41 | Proven | — |
| AC-005 | Yes | RC-39, RC-40, RC-41, API-13 | Proven | — |
| AC-006 | Yes | MR-04 | Proven | — |
| AC-007 | Yes | L-03 | Proven | — |
| AC-008 | Yes | MR-07, internal-agents (API-09) | Proven | — |
| AC-009 | No | MR-02 (data), IMP-05 | Not Proven this round (UI with real data: API-14) | — |
| AC-011 | Yes | MR-08, L-01, L-02 | **Not Proven — fails**: Codex sandbox widened by a workspace config (F-1); Claude router has the user's claude.ai connector tools and Skill (F-2) | Claude with a user-level Write allow rule: needs a rule in the user's `~/.claude/settings.json`; tried a throwaway `CLAUDE_CONFIG_DIR` (signed out) and decided against injecting a vault key (credential variables never reach code under test) |
| AC-012 | Yes | MR-02 (records), RC-31, RC-40, API-13 (window tree) | Proven for the data; rows on screen in API-14 | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 75% | MR-01…09, RC-39…41, API-13, L-03 | AC-011 fails on Codex and Claude; AC-009 UI not run | Fixes for F-1/F-2, then L-01/L-02 again; API-14 |
| Changed-boundary execution directness | 90% | 90% | real HTTP/WS/MCP, real router run, two built nodes, released image, live CLIs | scripted router in the deterministic cases | — |
| Cross-boundary integration realism and mock gap | 85% | 90% | live router (L-01…L-04), live delegators on four runtimes (LR-3), Docker peer | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | real sign-ins, throwaway CODEX_HOME, test-owned container | user-level Claude allow rule not set | user check |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 70% | MR-03/04/09, RC-41, L-04, API-13 D-3/D-4 | F-3: a failed router turn leaves routing degraded and the status misleading | fix or decision on F-3 |
| User-surface, browser, and desktop-shell confidence | 70% | 70% | IMP-05/07/08, RC-31 rows data | no browser run on real data; desktop check pending | API-14, API-15 |
| Durable regression coverage quality and relevance | 90% | 90% | new MR file, RC-39…41, LR-3, updated stale cases | MR-09 records F-3 as observed rather than asserting the intended behavior | assert recovery once decided |

- Overall post-repository confidence: 84%
- Overall final confidence: 81%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-011)
- Any final applicable category below `90%`: `Yes` — requirement proof, fidelity, failure/recovery, user surface
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2, F-3; API-14/API-15 not yet run

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Live API` (L-01…L-04, LR-3), `Worker or Distributed` (API-13 Docker), `Other` (in-process lifecycle MR-09)
- Confidence gap or residual risk it addresses, and the expected gain: confinement and tool sets exist only in the real CLIs, and runtime tool-call time-outs only in the real runtimes. The Docker peer proves the released image with this build. These runs found F-1, F-2 and F-3, which no repository test could show.
- Browser validation needed, and why or why not: yes for AC-009/AC-012 rows on real data (API-14); deferred to the rerun after the fixes.
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: none this round (API-15 deferred to the fixed build)
- Effect on any already-running desktop application: `None`; the user's AutoByteus, `~/.autobyteus` and the user's node containers were not touched
- Behavior not directly proven and its confidence consequence: the user's desktop check (Done-when)

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: directly usable (absent fields = not routed; links without `launches` read as before)
- Representative existing data used: RC-13 restores of runs and links recorded earlier in the same file; the existing restore E2E (delegation-forest-restore, unclean-shutdown restore) in API-09
- Approved transition followed without an unnecessary migration: `Yes`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: links recorded by a released build read on this build (no synthesized older link record this round)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. The peer start request now requires `task`, and a node without it gets `REMOTE_REQUEST_INVALID` (both nodes are updated together, DESIGN.md rule 9)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` | Added | MR-01…09 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (router turn: plan modes valid / invalid_then_valid / silent / crash / throw; scripted `/usage`) | MR-*, RC-39…41, API-13 | — |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (RC-39…41 added; RC-01/03/04/05/06/07/10/15/17/20/21/31 to the new peer contract) | RC-* | — |
| `autobyteus-server-ts/tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | Updated (IA-01: shown adds both internal agents) | API-09 | — |
| `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts` | Added by the 303 fold (cherry-picked) and updated (LR-3) | API-12 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` this round (`Fail`)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (router and delegators) in MR/RC/API-13 | scripted AGY CLI calling the real Agent Tools MCP | deterministic router answers and timings, no inference | router reasoning is real only in L-01…L-04 |
| Grok in MR | recorded-fixture fake CLI | a second runtime to route to | live Grok covered in LR-3 |
| Codex in MR/RC | missing command (unavailable) | deterministic availability | live Codex in L-02, LR-3 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp data roots, HOMEs, servers of every E2E and probe | Yes | the suites' and probes' own cleanup | removed (`cleanup` in each probe JSON: `tempRoot: true`, `serverExited: true`) |
| `~/.mr-confinement-probe-*` (outside-write targets in HOME) | Yes | removed by the probes | `homeProbeDir: true` |
| Throwaway `CODEX_HOME` (auth.json symlink) | Yes | removed with the temp root | removed |
| Docker containers `mr-docker-peer-*`, `mr-dist-probe` | Yes | `docker rm -f -v` | `containerRemoved: true`; the user's `autobyteus-server-0/1/2` untouched |
| Raw Claude SDK event log (whole router session) | Yes | session-init fields copied to L-01 evidence, file deleted | removed |
| Base worktree `/tmp/mr-base-wt` (detached at `d74f75a51a`) | Yes | kept for the rerun's base comparisons; remove with `git worktree remove /tmp/mr-base-wt` | kept |
| Branch `codex/available-agent-runtimes-live-agents` | No (303) | kept, as asked | kept |

## Preliminary Classification (On `Fail`)

- **F-1 — `Local Fix` (implementation), High.** AC-011/QR-004 on Codex. The router thread is started with the sandbox mode `workspace-write` only. Codex still applies `[sandbox_workspace_write]` from a `.codex/config.toml` in the router's workspace (`writable_roots = ["/"]`) when that file exists as Codex starts. The router can write the file itself, and the bypass takes effect at Codex's next start. Expected: the thread pins the whole sandbox policy (writable roots = the workspace only), whatever any config file says. Code: `codex-thread-bootstrapper.ts` `resolveEffectiveCodexSandboxModeForRunConfig` (the comment "Thread parameters take precedence over Codex config files" holds for the mode, not for `sandbox_workspace_write`). The user's own `~/.codex/config.toml` could widen it the same way.
- **F-2 — `Local Fix` (implementation), Medium.** AC-011 on Claude: "tools equal its template list plus its runtime's file tools". The confined session (`settingSources: ["user"]`) also loads the user's claude.ai connectors (`claude.ai Claude Docs`: create, update, delete, batch, export, guide, query, read), which act on the user's account outside the workspace, and `Skill` with all of the user's skills. Code: `claude-workspace-confinement.ts`, `claude-session-query-options.ts` (MCP servers and disallowed tools for the confined run).
- **F-3 — `Local Fix` or a scope decision (Unclear), Medium.** C-05 with a broader trigger than process death. After a router turn that **fails with an error** (on Antigravity: the backend goes offline), every later routing waits the full 40 s and falls back with "the Model Router was busy". `modelRoutingStatus` meanwhile says `active: true` with no reason. Changing the router launch and changing it back does not clear it. A crash (exit) and a killed Claude process both recover. Code: `model-router-agent.ts` `isIdle()` (`watched.run.isActive()`), with no path that restores or replaces an offline router run. The code review rejected C-05 as an infrastructure failure. The new evidence is that any failed router turn (for example a provider or usage error) produces it, and the page shows the router as active.
- Recommended owner: implementation engineer, through the code reviewer's failure-origin review.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-011 (fails); AC-009 UI and AC-012 rows on screen (API-14, not run); only the user can check: Claude with a user-level Write allow rule, the desktop check (Done-when)
- Preliminary classification and recommended owner: F-1 Local Fix (High), F-2 Local Fix (Medium), F-3 Local Fix / Unclear (Medium); implementation engineer via failure-origin review
- Next recipient from `get_handoff_rules`: code reviewer (failure-origin review)
- Notes: on the rerun, recheck F-1 with `L-02-codex-confinement-probe.mjs.txt` (config present at Codex start), F-2 with the L-01 session-init tool list, and F-3 with MR-09 (its throw rows then assert recovery). Then run API-14 and prepare API-15.
