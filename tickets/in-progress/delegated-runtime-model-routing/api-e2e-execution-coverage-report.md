# API/E2E Execution Coverage Report — autobyteus-32 (Model Router core)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, code review pass CRR-004 (Full Re-Audit) from `/software_engineering_team/code_reviewer` after IR-003 (`424e9bdd62`):
  - SR-018, the user's decision: the router is not confined; F-1 and F-2 no longer apply.
  - CR-005: fixes round 1's F-3.
- Prior round reviewed: round 1 (API-REV-001, Fail). Prior failures rechecked first (Prior Failure Resolution in the revision record).
- Deviations from the plan, and why:
  - L-01 and L-02 confinement/escape probes removed (SR-018: no adversarial or escape probes). AC-011 is proven as reworded by L-05 (live router on each runtime) and MR-08.
  - Added:
    - L-05: router on each runtime;
    - API-14 as a durable browser probe (`autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs`);
    - API-15: an isolated desktop instance of this build.
  - One run broke TESTING.md's one-heavy-run rule: the MR file ran next to the L-05 probe. Its MR-09 timed out once; it was rerun alone (3 runs, all pass). Everything after that ran one at a time.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/evidence/api-e2e/` (round-2 files end in `-r2`, or sit in `API-14-model-routing-decisions/` and `API-15-desktop/`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `424e9bdd62` (IR-003) + this round's test changes | macOS darwin 25.5, Node 22 | In-process Studio server, scripted AGY CLI with a scripted router (plan modes valid / invalid_then_valid / silent / crash / throw), fake Grok, missing Codex, signed-out `claude` | `env -i PATH HOME=<disposable> TMPDIR` |
| ENV-2 | same | same | Two built servers (`pnpm -C autobyteus-server-ts build`, after IR-003), capturing proxies, scripted AGY in both | disposable HOMEs and data roots |
| ENV-3 | same | same | Built server on a fresh data root; **real** Claude Code, codex-cli (throwaway `CODEX_HOME` with `auth.json` linked), agy, grok; AutoByteus with DeepSeek (key from the test vault, `AUTOBYTEUS_TEST_VAULT`) | real HOME for sign-ins only; nothing in `~/.claude`, `~/.codex`, `~/.grok` written |
| ENV-4 | same | same + Docker 29.0.1 | Host node A + test-owned container of `autobyteus/autobyteus-server:beta` running this dist (read-only mount) | 127.0.0.1 only, no user volumes |
| ENV-5 | same | same | In-process Studio server with live agents; router = live Codex run | `env -i PATH HOME USER LOGNAME TMPDIR` |
| ENV-6 | same | same + headless Chrome (playwright-core) | Nuxt dev frontend bound to node alpha; two built backends (alpha, beta) with scripted AGY and scripted routers | probe-owned ports, temp root removed |
| ENV-7 | same | macOS arm64 | Isolated desktop instance of this worktree's packaged build (`autobyteus-web/electron-dist`, 1.5.9-beta.9 build of this branch), `pnpm --silent isolated-app start --build` | own data root (removed on stop), embedded server with the system-baseline environment (real sign-ins) |

## Cases

Round-1 rows for code that IR-003 did not change are kept, marked "R1 (still holds)". IR-003 changed `model-routing/services/model-router{,-agent}.ts` and removed the run-config confinement field, so every case that exercises routing was rerun.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | unit/web | unit, component | IMP-11 (IR-003 typecheck + unit), IMP-10, IMP-06 | — | Pass (Reused) | implementation handoff | — | IMP-11 ran on `424e9bdd62`, which is the code tested here |
| MR-01…08 | AC-001…004, 006, 008, 011 (Agent Tools), AC-012 records | HTTP/WS/MCP, router run, records | `env -i PATH HOME=<disposable> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/model-routing/model-routing-delegation.e2e.test.ts --no-watch --silent=false` | ENV-1 | Pass | `MR-01-09-model-routing-e2e-r2.log`, `…-r2-receipt.json` | `Tests  9 passed (9)` (solo runs 1 and 2) | |
| MR-09 | C-05 / CR-005, AC-004 | router run lifecycle | same (MR-09 asserts recovery) | ENV-1 | Pass | `MR-01-09-model-routing-e2e-r2.log` (section "MR-09 alone") | `"After throw, 1","elapsedMs":8423 … "chosen by the Model Router (general): Back after throw."`; status `active: true` | Round 1's F-3 is resolved: after a turn that fails with an error, the next routings are the router's again (≈ 8.4 s), also after a router-launch round trip. Run A (alongside L-05) timed out once on one `delegate_task`; it passed in three solo runs |
| RC-01…41 | AC-005, peer contract, 191…308 regression | two built nodes | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-2 | Pass | `RC-two-server-e2e-r2.log` | `Tests  41 passed (41)` | Includes RC-39…41 (off / not usable refusals with B's state; B's router chooses, `launches` on A, B's record `fromNode`; slow answer accepted; `MODEL_ROUTER_FAILED` within 50 s) |
| API-13 | AC-005 (Docker) | released image running this dist | `API-13-docker-peer-probe.mjs.txt` | ENV-4 | Pass | `API-13-docker-peer-r2.json` | D-1…D-4 `"ok": true`; `containerRemoved: true` | |
| API-12 LR-3 | QR-001 | live agents → MCP → routing (router held busy) | `env -i PATH HOME USER LOGNAME TMPDIR RUN_ROUTED_DELEGATION_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 RUN_AGY_E2E=1 RUN_GROK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts --no-watch -t "LR-3" --silent=false` | ENV-5 | Pass | `API-12-LR-3-live-routed-delegation-r2.log` | `"event":"TOOL_EXECUTION_SUCCEEDED"` + "the Model Router was busy": Codex `toolMs` 40136, Antigravity 43751, Claude 40109, Grok `turnMs` 200907 | In the four-runtime run, Claude's case found no unblocked Claude model in that one report read (a transient). Rerun alone, it passed |
| L-05 | AC-011 (reworded), AC-007, REQ-003 | live router on each runtime | `L-05-router-runtimes-probe.mjs.txt` with `AUTOBYTEUS_TEST_VAULT` | ENV-3 | Pass | `L-05-router-runtimes.json` | per runtime (Claude sonnet, Codex gpt-6.1-sol, Antigravity gemini-3.8-flash-low, Grok grok-4.7, AutoByteus deepseek-v4-flash): `"lineAdded": true`, `"routedByRouter": true`, `"routedToAntigravity": true`, `"collaborationToolsNamed": []`; `claudeRouterRerun.routerSessionInit.tools` with `…list_available_agent_runtimes`, `…submit_launch_choices`, no `delegate_task` / `send_message_to` / `get_handoff_rules` | The router's run metadata has no `toolConfinement` (SR-018) and has `autoExecuteTools: true` and `systemRunOwner`. The first session-init excerpt came from the delegator's file, so the Claude phase was rerun and read from the router run's own file |
| L-03 / L-04 | AC-007, C-05 (live) | live Claude router, process kill | `L-probe-router-live-probe.mjs.txt` with `MR_PHASES=L-03` | ENV-3 | Pass | `L-03-04-router-knowledge-and-restart-r2.json` | `knowledgeAfter` has the owner's rule; route, L-04 first and second all "chosen by the Model Router (writing)" (≈ 23 s, 21.5 s after the kill) | Rerun on IR-003's restore path; confinement phases not run |
| API-14 | AC-009, AC-012 (UI), UXJ-008 | browser on a real two-node stack | `node autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs --output-dir=<fresh>` (`pnpm -C autobyteus-web test:e2e:model-routing-decisions`) | ENV-6 | Pass | `API-14-model-routing-decisions/result.json`, `MRD-*.png` | MRD-01…07 `"result": "Pass"`; `settingsRows` writer `"source": "model_router"`, `"Model Router · writing"`, reason; remote row has `beta-node` and beta's reason; beta's Decisions show `blank slate`, no Open run | Runs 1–3 failed on probe assertions (display names, filter markup); fixed in the probe. Observation: Decisions shows the model ID (`alt-model`) where Settings rows show the model's display name |
| API-15 | Done-when (preparation) | Electron isolated instance | `pnpm --silent isolated-app start --build`; smoke over CDP; `isolated-app stop` | ENV-7 | Pass (prepared) | `API-15-desktop/API-15-desktop-smoke.json`, `API-15-desktop-*.png`, `API-15-user-desktop-check.md` | `start` `"ok": true`; with the switch on, `runtimeOptions` "Codex, Claude, Antigravity, Grok, AutoByteus"; `browserErrors: []`; stop `dataRootRemoved: true` | The user's check runs on this build with `--from-worktree` (steps in the guide) |
| API-09 | AC-002, regression | 56 scripted-AGY E2E files | see the log header | ENV-1 | Pass (triaged) | `API-09-regression-e2e-r2.log` | `Test Files  3 failed | 44 passed | 9 skipped (56)`: only FU-007, FU-008, FU-009 | Run alone. Each of the three also fails on base `d74f75a51a` (round 1). internal-agents and EXC-E2E-004 pass |
| API-12 LR-1/LR-2 | REQ-001 (303) | live agents | — | — | R1 (still holds) | `tickets/done/available-agent-runtimes-tool/evidence/api-e2e/API-14-live-agents/` | as in autobyteus-303 | Code unchanged by IR-003 |
| L-01, L-02 | (round 1 confinement) | — | — | — | Withdrawn | round-1 files `L-01-…`, `L-02-…` (history) | — | SR-018: not confined; AC-011 reworded. No escape probes this round |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MR-02, L-05, L-03, API-14 | Proven | The user's desktop check (Done-when) |
| AC-002 | Yes | MR-01, API-09, RC-01…38 | Proven | — |
| AC-003 | Yes | MR-05 | Proven | — |
| AC-004 | Yes | MR-03, MR-09, RC-41 | Proven | — |
| AC-005 | Yes | RC-39…41, API-13 | Proven | — |
| AC-006 | Yes | MR-04 | Proven | — |
| AC-007 | Yes | L-05 (five runtimes), L-03 | Proven | — |
| AC-008 | Yes | MR-07, internal-agents (API-09) | Proven | — |
| AC-009 | Yes | API-14 MRD-01…03, MRD-05, MRD-06 (zh-CN) | Proven | — |
| AC-011 (SR-018) | Yes | MR-08, L-05 | Proven | — |
| AC-012 | Yes | MR-02, RC-31, RC-40, API-13, API-14 MRD-04 | Proven | — |
| Done-when "the user has verified it in the desktop app" | Yes | API-15 (prepared) | Only The User Can Check | I built and started this branch's desktop app isolated, checked the page with real runtimes, and wrote the steps. The verification itself is the user's, by definition |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC above | — | — |
| Changed-boundary execution directness | 95% | 96% | real router runs, real MCP, real nodes, released image, real CLIs, browser, Electron | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | L-05 live router on five runtimes, LR-3 live delegators on four, Docker peer, API-14 real stack | scripted router in the deterministic cases (by design) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | real sign-ins, test-vault DeepSeek, test-owned container, isolated desktop | one transient Claude report read (no unblocked model) in LR-3 | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | MR-03/04/09, RC-41, API-13 D-3/D-4, L-04 live kill | MR-09 timed out once when run next to another heavy run | — |
| User-surface, browser, and desktop-shell confidence | 70% | 94% | API-14 (DOM + screenshots, en and zh-CN, peer window), API-15 desktop smoke | the desktop journey is the user's check (excluded from scoring) | — |
| Durable regression coverage quality and relevance | 92% | 95% | MR-01…09 (MR-09 now asserts recovery), RC-39…41, LR-3, the API-14 probe | — | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories (94.9%, rounded)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - The one-off MR-09 time-out under concurrent load (3 solo passes).
  - Claude's transient report read in LR-3.
  - Remote copy names are shown by address (`blank slate`), and Decisions shows model IDs where Settings shows display names. Both are presentation observations; neither contradicts the UI spec.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode:
  - `Live API`: L-05, L-03/L-04, LR-3;
  - `Worker or Distributed`: RC, API-13;
  - `Browser`: API-14;
  - `Project Desktop Validation`: API-15.
- Gap addressed:
  - routing on every real runtime;
  - the router's tool exposure;
  - knowledge carried across runs;
  - the recovery fix on real CLIs;
  - the UI with real routed and remote data;
  - this build running as the desktop app.
- Browser validation needed: yes (AC-009, AC-012 rows): API-14.

## Desktop Application Validation (When Applicable)

- Approach executed: `pnpm --silent isolated-app start --build`.
  - Settings → Model Routing was read over the instance's loopback CDP port, and routing was turned on and off again.
  - The instance was then stopped and its data root removed.
- Cases proving web-equivalent behavior: API-14. Shell: API-15 (packaged Electron build, embedded server, real sign-ins).
- Effect on any already-running desktop application: `None`. Separate ports, data and process group; `~/.autobyteus` untouched.
- Behavior not directly proven: the user's own journey (Done-when). The guide is `API-15-desktop/API-15-user-desktop-check.md`.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: directly usable. Absent fields mean not routed. Links without `launches` read as before. Run metadata without `toolConfinement` (removed in IR-003) is the base shape.
- Representative existing data used: RC-13 restores; delegation-forest-restore and unclean-shutdown restore in API-09; MR-09's restored router run.
- Approved transition followed without an unnecessary migration: `Yes`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: router runs recorded by round-1 builds with `toolConfinement` (never released; only in test data)

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes` (rounds 1 and 2; commit `64e5b57932` holds round 1)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` | Added (R1); updated (R2: MR-09 asserts recovery after a failed turn; per-step log; header) | MR-01…09 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (R1: scripted router, `/usage`; crash and throw modes) | MR-*, RC-39…41, API-13, API-14 | — |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (R1: RC-39…41; twelve older cases to the ticket's peer contract) | RC-* | — |
| `autobyteus-server-ts/tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | Updated (R1: IA-01) | API-09 | — |
| `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts` | Added by the 303 fold; updated (R1: LR-3; R2: model-pick message) | API-12 | — |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs`, `autobyteus-web/package.json` (`test:e2e:model-routing-decisions`) | Added (R2) | API-14 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI in MR/RC/API-13/API-14 | scripted AGY CLI calling the real Agent Tools MCP; scripted router plans | deterministic answers, timings and failures (crash, throw, silent) | router reasoning is real in L-03/L-04/L-05 and LR-3 |
| Grok in MR | recorded-fixture fake CLI | a second runtime to route to | live Grok in L-05 and LR-3 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| E2E/probe temp roots, servers, Nuxt dev server, headless Chrome | Yes | own cleanup | removed (each probe's `cleanup`) |
| Docker container `mr-docker-peer-*` | Yes | `docker rm -f -v` | `containerRemoved: true`; the user's containers untouched |
| Isolated desktop instance `iso-64830-94b4` | Yes | `isolated-app stop` | `dataRootRemoved: true`, ports released |
| `autobyteus-web/electron-dist/` (packaged build) | Yes | kept for the user's check (`--from-worktree`); untracked | kept |
| Raw Claude SDK event logs (L-05) | Yes | the router's session-init fields copied, files deleted | removed |
| Base worktree `/tmp/mr-base-wt` | Yes | `git worktree remove /tmp/mr-base-wt` when no longer needed | kept |
| Branch `codex/available-agent-runtimes-live-agents` | No (303) | kept, as asked | kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: only the user can check the desktop app verification (Done-when); prepared in API-15
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review, Large/High)
- Notes:
  - FU-007, FU-008 and FU-009 are pre-existing regression failures, recorded in `follow-ups.md`.
  - The presentation observations (names by address, model ID vs display name) are left to the reviewer and designer; neither contradicts the UI spec.
