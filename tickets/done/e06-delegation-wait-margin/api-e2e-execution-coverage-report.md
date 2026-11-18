# API/E2E Execution Coverage Report — e06-delegation-wait-margin: E06 waits for a loaded machine; the node's Antigravity discovery bounds 10 s / 30 s

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; Implementation Engineer IR-001 (direct route); code `88525bc56a` + `b1b95ea158`, documents `db70126996`; base `origin/personal` @ `53b72018ad`
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: none
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/e06-delegation-wait-margin/tickets/in-progress/e06-delegation-wait-margin/evidence/api-e2e/`
  - `API-01-whole-file-run-{1,2,3}.log`; `API-02-smoke-agy-step.out`, `smoke-agy-step.{json,log}`; `API-03-server-build.log`, `API-03-discovery-bounds.out`, `API-03-discovery-bounds-reports.out`, `API-03-available-agent-runtimes-{slow5,slow12}.json`, `API-03-node-*.log`; `API-04-unit-capability.log`
  - `scripts/` (temporary tools: `smoke-agy-step.py`, `discovery-bounds.mjs`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (API/E2E changed no durable test)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `db70126996` (code `88525bc56a`, `b1b95ea158`) | macOS 26 arm64, Node 22 | the e2e file's in-process server from `src` (`startStudioE2eRuntimeServer`); the repository's scripted AGY CLI | the smoke env: `env -i PATH HOME=<fresh temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>`; load average 20–67 (other work on this machine) |
| ENV-2 | same | macOS | a node from `autobyteus-server-ts/dist` rebuilt from this commit (`API-03-server-build.log`: `SHORT_PROBE_TIMEOUT_MS = 10_000`, `MODELS_TIMEOUT_MS = 30_000`); temp data root and HOME, its own credential; `ANTIGRAVITY_CLI_COMMAND` = a wrapper around the fixture | one fresh node per variant |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-004, typecheck | — | IMP-E06-unit-runtime-management, IMP-E06-unit-repro, IMP-E06-server-typecheck | — | Reused (`Pass`) | implementation handoff rows | — | ran on the code validated; the repro shows the new bound tests fail on 3 s / 15 s |
| API-01 | AC-001, AC-005 | the e2e file, in-process server | `env -i PATH HOME=<fresh temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs npx vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts --no-watch` (in `autobyteus-server-ts`), 3× | ENV-1 | `Pass` 3/3 | `API-01-whole-file-run-{1,2,3}.log` | `Tests  10 passed (10)` each; `✓ E06 … 3185ms` / `750ms` / `855ms`; E09 ~500 ms | load average at start 59.6 / 24.5 / 20.6; delivery's failures were at load up to 137, which these runs did not reach |
| API-02 | AC-001, AC-005 (the release step) | `scripts/release_smoke.py`'s Antigravity step | `python3 evidence/api-e2e/scripts/smoke-agy-step.py <worktree> <evidence>`: the script's own `STEPS` entry, `step_environment`, `_run_step`, `parse_report`, `failed_suite_errors`, `evaluate` over the Antigravity required cases; no live step | ENV-1 | `Pass` | `API-02-smoke-agy-step.out`, `smoke-agy-step.json`, `smoke-agy-step.log` | `"exit": 0`, `"passed": true`; rows "brand-new run, linked workspace" and "brand-new team member, linked workspace" `"passed": true`; 10 results `passed`; 36.3 s | env keys exactly `ANTIGRAVITY_CLI_COMMAND, HOME, PATH, RUN_AGY_FAILURE_E2E, TMPDIR` |
| API-03 | REQ-003, AC-004 at the node | GraphQL → runtime availability → the CLI process | `node evidence/api-e2e/scripts/discovery-bounds.mjs <evidence> ok slow5 slow12 hang` (and `slow5 slow12` again with the full reports saved): `runtimeAvailability(runtimeKind: "antigravity_cli")` and `availableAgentRuntimes`, timed | ENV-2 | `Pass` | `API-03-discovery-bounds.out`, `API-03-discovery-bounds-reports.out`, `API-03-available-agent-runtimes-{slow5,slow12}.json` | ok `"enabled":true` 705 ms; slow5 `"enabled":true` 5463 / 5382 ms; slow12 and hang `"enabled":false`, `"reason":"Antigravity model discovery timed out; check the CLI and retry."` at 10009–10010 ms; Settings: ok lists Antigravity (924 ms), slow5/slow12 end at ~4.05 s, hang "models: unknown: Antigravity CLI model list timed out" | a CLI that takes 5 s to start, which the old 3 s bound refused, is now available; a hung one still reports the same diagnostic, at the new bound. Settings › Agent Runtimes keeps its caps (install 4 s wins); a timed-out install counts as not installed there (that service's REQ-007: Antigravity omitted, as on the base, where 3 s cut it sooner) |
| API-04 | AC-002, AC-003, AC-004 | reading; unit | the `until` helper (`agy-linked-skills-transport.e2e.test.ts:134-142`); `git diff --stat 53b72018ad HEAD`; `pnpm exec vitest run tests/unit/runtime-management/antigravity-cli-capability.test.ts` | ENV-1 | `Pass` | `API-04-unit-capability.log` | `throw new Error(\`Timed out waiting for ${label}: …\`)` after `ms` (90 000 for E06); the launch loop ends at `Date.now() + 60_000`; outside `tickets/` 3 files; `Tests  49 passed (49)` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (3/3), API-02 | `Proven` | — |
| AC-002 | No | API-04 | `Proven` | — |
| AC-003 | No | API-04 | `Proven` | — |
| AC-004 | Yes | R-IMP, API-04 (unit), API-03 (the node: 10 s at the real process, the deadline winning in Settings) | `Proven` | — |
| AC-005 | Yes | API-01 (3/3), API-02 | `Proven` | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | API-01…04, R-IMP | — | — |
| Changed-boundary execution directness | 92% | 97% | the release step itself; a real node with a slow and a hung CLI process | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | real processes and timers; scripted CLI (the ticket's rule) | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 92% | the smoke env and the script's own step environment | the load during these runs (20–67) was below delivery's worst (137) | a run at that load |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 96% | over-bound and hung CLIs; the bounded test waits | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change | — | — |
| Durable regression coverage quality and relevance | 93% | 94% | the bound unit tests (fail on the old bounds); E06 | — | — |

- Overall post-repository confidence: 92%
- Overall final confidence: 95% (95.2%, simple average of six applicable categories)
- Calculation method: simple average; user-surface `N/A` (server bounds and a server test)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the machine load during these runs was lower than at delivery's failing runs; E06's 90 s and the node's 10 s / 30 s leave about 2.5× the worst case measured

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (the release smoke's step; a node with real CLI processes)
- Confidence gap or residual risk it addresses, and the expected gain: the release step exactly as the script runs it, and the node's discovery through its real process boundary
- Browser validation needed, and why or why not: no; no UI change
- If `Not Required`: —
- If `Blocked`: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The Antigravity CLI | the repository's scripted AGY CLI, behind start-delay or hang wrappers in API-03 | the ticket's rule (no provider) | a real `agy`'s start-up time varies with its own state |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| The four API-03 nodes, their temp roots and HOMEs, the CLI wrappers | Yes | SIGTERM, root removed per variant | `"rootRemoved":true` each |
| The fresh HOMEs of API-01 and the smoke step's temp folder | Yes | removed | — |
| `autobyteus-server-ts/dist` | Yes (rebuilt from this commit) | kept (build output, untracked) | — |
| Observation: each API-03 node's Settings report listed the models of an LM Studio server on `localhost:1234` | No (another program on this machine) | read-only listing by the product's AutoByteus provider; nothing changed | — |
| Evidence secret scan | Yes | `own_` 20+ chars, `access_token=` with a value | no match |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: Delivery Engineer (direct Small / Low; test review `Not Required — direct low-risk route`)
- Notes: final confidence 95%. The release smoke's Antigravity step passes as the script runs it (API-02); delivery runs the full smoke on the merged state before the tag (RELEASE.md).
