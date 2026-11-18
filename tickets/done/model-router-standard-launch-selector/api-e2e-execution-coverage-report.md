# API/E2E Execution Coverage Report — autobyteus-313 (Model Router: standard launch selector)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, the implementation engineer's direct handoff (IR-001), Medium/Low
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-03 used data written by the released **v1.5.9-beta.12** (the installed app). Its model-routing code equals beta.11's, so the router data has the beta.11 shape (coverage investigation, Project Execution Discovery).
  - API-04 needed one durable test update: RC-39's setup saved a router launch the node does not offer, which the new save check refuses.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector/tickets/in-progress/model-router-standard-launch-selector/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `e9c25f3801` (code `09f99eed32`, `f9c58612e5`, `1357063994`) + the RC-39 update | macOS darwin 25.5, Node 22 | two built servers of the branch (`pnpm -C autobyteus-server-ts build`, rebuilt from HEAD), scripted AGY | `env -i`, disposable HOMEs |
| ENV-2 | same | same | the branch's built server on a fresh data root; real Claude Code (router sonnet, delegator haiku), real agy for the routed copies | real HOME for sign-ins only; nothing in `~/.claude`, `~/.codex`, `~/.grok` written; throwaway `CODEX_HOME` |
| ENV-3 | released **v1.5.9-beta.12** (`/Applications/AutoByteus.app`, isolated instance), then the branch's built server | same | Electron isolated instance (`isolated-app start --app … --data-root <owned>`), then `dist/app.js --data-dir <that root>/server-data` | the owned data root was removed afterwards; the user's app and `~/.autobyteus` were not touched |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | AC-001, AC-002 (unit), AC-003 (unit), AC-004, AC-005 (unit) | unit, web, scripted E2E, probes | IMP-01, IMP-03, IMP-05, IMP-06, IMP-07, IMP-08 | — | Pass (Reused) | implementation handoff | — | Server source is unchanged after `09f99eed32` (IMP-01, IMP-03). Web code is unchanged after `1357063994` (IMP-05 on `f9c58612e5` plus the probe-only commit; IMP-06…08) |
| API-01 | AC-002 | GraphQL on a built server, real catalogs | the live probe (`API-01-02-live-router-launch-probe.mjs.txt`), step API-01 | ENV-2 | Pass | `API-01-02-live-router-launch.json` (`API-01`) | `"llmConfig":{"thinking_enabled":true,"reasoning_effort":"high"}`; `"The model settings are invalid: Value is not one of the supported options."`; `"…Expected boolean."`; `"The model 'no-such-model' is not available on claude_agent_sdk."` (`BAD_USER_INPUT`); `statusAfterRefusals` = the valid launch | |
| API-02 | AC-003 | live router (Claude sonnet), live delegator | same probe, step API-02 | ENV-2 | Pass | `API-01-02-live-router-launch.json` (`API-02`) | `checks` all `true`; `r1LlmConfig … "high"`, `r2LlmConfig … "low"`; router CLI `--effort high`, then a new run's `--effort low`; `knowledgeBeforeChange === knowledgeAtNewRun`; three routings "chosen by the Model Router", to Antigravity as taught | Observation: the replaced run's CLI process (same pid, `--effort high`) stays running. Same as autobyteus-32's launch change; recorded as FU-004 |
| API-03 | AC-005, REQ-005 | released build's data → this build | `isolated-app start --app /Applications/AutoByteus.app --data-root <owned>`; `API-03-beta12-seed.mjs.txt` (beta.12 GraphQL + a live routed delegation); stop; `API-03-upgrade.mjs.txt` (branch server on the same data dir); migration records compared | ENV-3 | Pass | `API-03-upgrade-from-beta12.json` | beta.12 `routerState` `{runId, runtimeKind, llmModelIdentifier}` (no settings); after the update `routerLaunch … "llmConfig": null`, `active: true`; `openedRouterRun` = beta.12's run = `statusAfterRouting.agentRunId`; one router run; `migrationRecordsIdentical: true` (27 Prisma, 34 app-data) | Configuration's rendering of a launch without settings: IMP-08 MRD-01 (`nativeSelects: 0`) |
| API-04 | autobyteus-32 peer router (regression) | two built servers | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-04-two-server-e2e.log` | `Tests  41 passed (41)`; RC-39 "…is not usable (Claude is signed out)." | First run: RC-39's setup was refused by REQ-002's save check (`gpt-5.5` on a node without Codex). The setup now uses a signed-out Claude router, which is a real "not usable" state |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-05 (rendered, 1440/390, zh-CN), IMP-06, IMP-08 MRD-01 | Proven | — |
| AC-002 | Yes | API-01, IMP-01, IMP-05 (`model-chosen`, `thinking-saved`, reload) | Proven | — |
| AC-003 | Yes | API-02 (live), IMP-01 | Proven | — |
| AC-004 | Yes | IMP-05, IMP-06, IMP-07 (Runtimes), IMP-08 (Configuration, Decisions, Overview, rows, zh-CN) | Proven | — |
| AC-005 | Yes | API-03 (released build's data), IMP-01 | Proven | — |
| Done-when "merged to personal", "prove from a clean clone" | — | — | Delivery's | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC above | — | — |
| Changed-boundary execution directness | 90% | 96% | GraphQL on a built server, a live router whose CLI shows the effort, a released build's real data | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | live Claude router and delegator; real beta.12 instance | a model option control (Codex Fast mode) not exercised live (page spec covers it) | a live Codex router with Fast mode |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | real sign-ins; released app; owned data roots | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | three refusals with the stored launch kept; run replacement and reuse; upgrade | FU-004 (old process not stopped), pre-existing | — |
| User-surface, browser, and desktop-shell confidence | 92% | 92% | IMP-05 rendered check, IMP-07/08 probes | the desktop app itself (delivery or the user) | — |
| Durable regression coverage quality and relevance | 92% | 95% | unit tests, MR (IMP-03), both probes, RC-39 kept meaningful | — | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 95%
- Calculation method: simple average (94.9%, rounded)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-004; the model option control not exercised with a live router

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (API-01, API-02), `Lifecycle` / upgrade (API-03), `Worker or Distributed` (API-04)
- Gap addressed: the settings reaching a real runtime, the refusal through the API, and a released build's data. The repository tests use a stub validator and synthesized state.
- Browser validation needed: no new run. IMP-05 (rendered dev stack) and IMP-07/IMP-08 (probes) ran on this code; the server changes since are none.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: written by the released v1.5.9-beta.12 (beta.11 shape): `.env` settings `AUTOBYTEUS_MODEL_ROUTER_RUNTIME`, `AUTOBYTEUS_MODEL_ROUTER_MODEL`, `AUTOBYTEUS_MODEL_ROUTING_ENABLED`; `model-routing/model-router-agent.json` without `llmConfig`; the router run in memory; a routed delegation
- Approved transition followed without an unnecessary migration: `Yes` (migration records identical; no Prisma change)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No` (the missing `llmConfig` reads as none, the design's reader rule)
- Residual untested persisted-data risk: none found

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (RC-39) | Updated: the not-usable router is a signed-out Claude (a launch the node does not offer is refused when saved, REQ-002); also asserts `reasonCode: "SIGNED_OUT"` | API-04 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity in API-04 | scripted AGY CLI | deterministic two-node contract | live routing in API-02 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Live probe server, data root, throwaway `CODEX_HOME` | Yes | probe cleanup | `tempRoot: true`, `serverExited: true` |
| Isolated beta.12 instance `iso-57926-eca2` and its data root `/tmp/r313/beta12-root` | Yes | `isolated-app stop`; data root removed after the evidence was written | removed |
| Branch server on the beta.12 data | Yes | SIGTERM / SIGKILL of its process group | stopped |
| Two-server E2E roots | Yes | the suite's cleanup | removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. "Merged to personal" and "prove from a clean clone" are delivery's.
- Next recipient from `get_handoff_rules`: delivery engineer (direct route, Medium/Low, test review not required)
- Notes:
  - FU-004 added (a replaced router run's process keeps running; pre-existing rule).
  - FU-003 (the dev launcher inherits `AUTOBYTEUS_*`) matters for delivery's clean-clone check.
