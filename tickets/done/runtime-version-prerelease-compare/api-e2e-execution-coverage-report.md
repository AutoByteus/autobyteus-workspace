# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation IR-001 on the direct route
- Prior round reviewed: N/A
- Deviations from the plan: API-04 (the other E2Es on the agent-runtime status service) and API-05 (server typecheck
  with the changed tests) added; API-01 found a stale baseline assertion, fixed as a baseline fix (Notes).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-version-prerelease-compare/tickets/in-progress/runtime-version-prerelease-compare/evidence/api-e2e/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `b472fae14a`; tests at `725b3d5c2d` | macOS arm64 | Node 22.23.1; in-process studio server; scripted runtime CLIs (`agent-runtimes-fake-cli.mjs`), vendor sources stubbed | `env -i PATH HOME=<temp> TMPDIR` |
| ENV-2 | as ENV-1 | macOS arm64 | real dsh 0.2.2-rc.1 (Node 25 wrapper), real npm registry | test vault; no model call |
| ENV-3 | `725b3d5c2d` working tree build | macOS arm64 | isolated desktop instance (`isolated-app start --build`, `AutoByteus_enterprise_macos-arm64-1.5.12-beta.3`), real installed CLIs on the login PATH | own data root, `server-data/.env` `DEEPSEEK_HARNESS_COMMAND`; test vault |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…AC-005 | unit, typecheck | Reused: IMP-00, IMP-01, IMP-02 | — | Pass | (implementation) | (implementation) | Ran on `b472fae14a`, the code under test |
| API-01 | AC-002, AC-005, REQ-001, AC-004 | real GraphQL API, status service, real CLI processes (scripted) | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-agent-runtimes-graphql-r2.log` (run 1: `API-01-agent-runtimes-graphql-run1.log`) | `Tests  14 passed (14)`; `✓ AR-14 shows a prerelease as it is and orders it by SemVer precedence…` | AR-14: installed `0.170.0-alpha.2`, latest `0.170.0` → `UPDATE_AVAILABLE`; Update → `SUCCEEDED`, `fromVersion "0.170.0-alpha.2"`, `toVersion "0.170.0"`, re-check `UP_TO_DATE`; installed `0.171.0-rc.1` vs latest `0.170.0` → `UP_TO_DATE`. Run 1: AR-01/AR-13 expected four runtimes (DeepSeek Harness, added by autobyteus-387, is the fifth; AR-02 then failed on AR-01's missing check). Not caused by this change; baseline fix `e916f1dbf1` (five rows, the fifth pinned not installed) |
| API-02 | AC-001, SCN-001 | real dsh row, npm registry | `… RUN_DEEPSEEK_HARNESS_E2E=1 DEEPSEEK_HARNESS_COMMAND=/tmp/ab387-dsh-bin/dsh … vitest run tests/e2e/runtime/deepseek-harness-live.e2e.test.ts -t 'is available'` | ENV-2 | Pass | `API-02-dsh-row-live.log` | `DSH_LIVE ROW {…"installedVersion":"0.2.2-rc.1",…"updates":{"state":"UP_TO_DATE","latestVersion":"0.2.2-rc.1"}}` | The case now asserts the row equals dsh's own `--version` and `npm view`'s version |
| API-03 | SCN-001, AC-001 (real texts) | Settings → Agent Runtimes rendered in the desktop build | `AUTOBYTEUS_TEST_VAULT=… pnpm --silent isolated-app start --build --data-root <own>`; open Settings → Agent Runtimes; read rows; screenshot; GraphQL; `<cli> --version`; stop | ENV-3 | Pass | `API-03-rows.json`, `API-03-agent-runtimes-page.png`, `API-03-graphql.json`, `API-03-real-cli-versions.txt`, `API-03-isolated-build-start.log`, `API-03-instance-start.json`, `API-03-instance-stop.json` | DeepSeek Harness `'installed': 'Installed Version 0.2.2-rc.1', 'updates': 'Updates Up to date'`; Codex `0.167.0` (text `codex-cli 0.167.0`), Claude `2.1.318` (`2.1.318 (Claude Code)`), Antigravity `1.5.2`, Grok `1.0.77` (`grok 1.0.77 (50ca579fa996) [stable]`) | The real CLIs' texts read as before (no false prerelease) |
| API-04 | AC-004, REQ-002 | other E2Es on the status service | `vitest run tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`; then `test:integration:prepare` and the running-agents file again | ENV-1 | Pass | `API-04-agent-runtime-status-e2es.log`, `API-04b-running-agents.log` | update notifications `3 tests` ✓, available runtimes `6 tests` ✓, running agents `Tests  4 passed (4)` | The running-agents file first stopped on its documented prerequisite (Brief Studio package), then passed |
| API-05 | gate | server typecheck with the changed tests | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-05-server-typecheck.log` | `(baseline 1182 in 365 files)`, `[typecheck] PASS` | |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-00 (unit, all texts), API-02 (real dsh), API-03 (five real CLIs on the page) | Proven | — |
| AC-002 | Yes | API-00, API-01 (Update available for `x.y.z-alpha.2` vs `x.y.z`; equal → Up to date) | Proven | — |
| AC-003 | Yes | API-00 (SemVer chain both ways) | Proven | — |
| AC-004 | Yes | API-00, API-01 (AR-01…AR-13), API-04 | Proven | — |
| AC-005 | Yes | API-00, API-01 (Update `0.170.0-alpha.2 → 0.170.0` succeeded) | Proven | — |
| Success definition (page shows `0.2.2-rc.1`) | Yes | API-03 | Proven | Registry latest is `0.2.2-rc.1` today, so "Update available" for a stable `0.2.2` is proven with the scripted runtime (API-01) and unit (AC-002), not on the real dsh |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Supports | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 90% | 96% | API-00…API-03 | stable dsh `0.2.2` not yet released (scripted proof instead) |
| Changed-boundary directness | 90% | 96% | real server, GraphQL, CLI processes, desktop page | — |
| Integration realism and mock gap | 85% | 95% | real dsh + registry, real CLIs in the desktop app | vendor sources stubbed in API-01 |
| Environment and fixture fidelity | 90% | 95% | clean env, isolated instance, test vault | — |
| Failure, edge, lifecycle | 90% | 95% | prerelease newer than latest; update outcome; gates (unit) | gates only in unit (no real prerelease CLI) |
| User surface | 75% | 96% | API-03 rendered page | — |
| Durable regression coverage | 90% | 95% | AR-14, live dsh assertion, unit | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 95% (simple average 95.4%)
- Every critical AC directly proven: `Yes`
- Any final category below 90%: `No`
- 95% target met: `Yes`

## Broader Validation Decision

- Decision: `Required` (executed): the success definition is the rendered page, and the real CLIs' version texts are the parser's real inputs.
- Execution mode: `Live API` (real dsh/registry), `Project Desktop Validation`.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`; compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Updated: AR-14 added (`725b3d5c2d`); baseline fix for the fifth runtime (`e916f1dbf1`) | API-01 |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` | Updated: case 1 asserts the full installed and latest versions (`725b3d5c2d`) | API-02 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Codex CLI and vendor latest sources (API-01) | the suite's scripted CLI and in-process source stub | deterministic versions and updates | real Codex never ships a prerelease here |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-58517-a740`, data root `/tmp/ab393-api03` | Yes | `isolated-app stop`, root removed | Done; `list` shows only two stopped instances of others |
| Temp HOMEs, suite data roots | Yes | removed by the runs / suites | Done |
| Brief Studio importable package (`test:integration:prepare`), `autobyteus-web/electron-dist` from `--build` | Yes | untracked build outputs, left for later runs | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven or user-only: `None`
- Next recipient: delivery engineer (direct low-risk route)
- Notes: the stale four-runtime assertion was left by autobyteus-387 (which I validated without running this suite); fixed here as a labelled baseline fix. RSK-001 (a non-prerelease hyphen suffix) unchanged: no real CLI text has one (API-03).
