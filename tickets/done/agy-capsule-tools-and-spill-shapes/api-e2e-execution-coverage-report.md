# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes/tickets/in-progress/agy-capsule-tools-and-spill-shapes/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (code `0f74222c52`, IR-001; SR-001, SR-002)
- Prior round reviewed: none; Deviations from the plan: `None`
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes/tickets/in-progress/agy-capsule-tools-and-spill-shapes/evidence/api-e2e/

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `b55965acf0` (code identical to `0f74222c52`; the new e2e file and the fixture default committed with this round) | macOS arm64 | Node v22.23.1, vitest 4.1.12; server built with `pnpm build` (exit 0); BUILT server, test-owned data root and database | `env -i`, private HOME; scripted Antigravity CLI; host load average 26-48 |
| ENV-2 | same | same | BUILT server, REAL `agy` 1.5.15 | real HOME/USER/LOGNAME (host login); synthetic scratch workspace; adds synthetic conversations to the user's `agy` history |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-04..07 | AC-001..003 | live probe, typecheck, unit suite, Antigravity unit folder | implementation checks (`Reused`) | | Pass (reused) | implementation handoff rows | per those rows | code unchanged since `0f74222c52` (`git diff 0f74222c52 b55965acf0 -- . ':!tickets'` is empty); the full unit suite (8995) is not repeated, I reran the Antigravity folder and the typecheck (API-04) |
| API-01 | AC-002 (regression) | scripted CLI on a rebuilt server | `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts --no-watch` (before my fixture change) | ENV-1 | Pass, finding F-1 | `API-01-scripted-warning-noise-before-fixture-fix.log` | `Tests  10 passed (10)` and nine `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<id> names=view_file,write_to_file,…,generate_image` lines | F-1: the scripted CLI emitted `init.tools: []`; an empty array is a registry that lacks every name, so the warning fired on every scripted start (the handoff said the scripted CLI emits no `tools` field). Correct behavior of the product, noise from the fixture; I changed the fixture (below) |
| API-02 | AC-002 | built server, scripted CLI | `vitest run tests/e2e/runtime/agy-capsule-tool-registry.e2e.test.ts --no-watch` (same env) | ENV-1 | Pass (2 of 2 runs) | `API-02-scripted-built-server.log` | `✓ CR-01 a registry that lacks one allowlist name: one warning naming it, and the run answers`; `✓ CR-02 … no warning`; `✓ CR-03 an init message with no tools field: no warning`; `Tests  3 passed | 1 skipped (4)` | CR-01: `init.tools` without `find_by_name`: exactly one line `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<runId> names=find_by_name` in the server output, and the run answers (`ECHO:` in the raw trace). CR-02 all eight listed and CR-03 no field: no warning for the run |
| API-03 | AC-003, REQ-001 | LIVE built server, real agy | `env -i PATH HOME USER LOGNAME TMPDIR RUN_AGY_CAPSULE_TOOLS_LIVE_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-capsule-tool-registry.e2e.test.ts --no-watch` (two runs) | ENV-2 | Pass (2 of 2) | `API-03-live-built-server.log` | `CR-04 tools used: read_file,edit_file,write_file,run_command`; `✓ CR-04: no warning; the agent reads, writes, edits and runs a command` | with the capsule the server wrote (allowlist = the eight registry names): `a.txt` ended `alpha\ngamma\n`, `b.txt` holds `bravo`, and no warning in the server output. The implementer's probe also showed `init.tools` holds all eight names and the agent's own tools |
| X-A | AC-002 | mutation of `dist/` | the warning condition replaced by `false`; CR tests | ENV-1 | Fail (expected) | `X-A-mutation-no-warning.log` | `AssertionError: exactly one warning for this run: expected [] to have a length of 1 but got +0` | restored, `cmp` identical |
| API-04 | regression | scripted e2e, unit, typecheck | five scripted e2e files (`agy-linked-skills-transport`, `agy-failure-transport`, `agy-mcp-tool-call-transport`, `agy-native-tool-arguments-transport`, `projects/delegated-copy-model-change`) after the fixture change; Antigravity unit folder; `pnpm typecheck` | ENV-1 | Pass | `API-04-regression.log` | `Tests  50 passed | 1 skipped (51)`, 0 warning lines; `Tests  395 passed | 6 skipped (401)`; `test-file errors: 972 in 299 files (baseline 972 in 299 files)` | |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | policy unit test (IMP), API-04 unit folder, LIVE CR-04 (the real agent has its file and command tools with the unchanged allowlist) | Proven | |
| AC-002 | Yes | factory unit tests, API-02, X-A | Proven | |
| AC-003 | Yes | API-03 and the implementer's probe (IMP-04): `init.tools` holds all eight names, no warning, the agent's tools are the six | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | API-02, API-03, unit | | |
| Changed-boundary execution directness | 95% | 97% | API-02 through the built server's log, API-03 real CLI | | |
| Cross-boundary integration realism and mock gap | 92% | 94% | API-03 real agy | a registry that lacks a name is scripted only (no real CLI version does) | an older or newer agy |
| Environment, configuration, identity, and fixture fidelity | 92% | 94% | ENV-1, ENV-2 | one CLI version | |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 94% | CR-01..03, X-A | | |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface | | |
| Durable regression coverage quality and relevance | 94% | 95% | CR-01..04, fixture knob | the live case costs credits | |

- Overall post-repository confidence: 94%; overall final confidence: 95%
- Calculation method: simple average of six applicable categories (final: 96+97+94+94+94+95 = 570/6 = 95.0%)
- Every critical acceptance criterion directly proven: `Yes`; any final category below `90%`: `No`; default target of `95%` met: `Yes`
- Confidence-limiting residual risks: none beyond the scripted-only registry gap.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Live API` (built server; real agy; scripted CLI for the warning)
- Gap addressed: the warning through a real server's output, and the real CLI started with the capsule the server writes
- Browser validation: not needed

## Persisted-Data Transition Checks / Compatibility / Legacy Scope

Not applicable (no persisted data); backward compatibility in scope or observed: `No`; compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-capsule-tool-registry.e2e.test.ts` | Added (scripted gate `RUN_AGY_FAILURE_E2E=1`; live gate `RUN_AGY_CAPSULE_TOOLS_LIVE_E2E=1`) | API-02, API-03 |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: `init.tools` defaults to the eight registry names (was `[]`); env `AGY_FAKE_INIT_TOOLS` (a JSON array, or `ABSENT`) | API-02, API-04 |

- Attached for test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (API-01, 02, 04) | scripted `agy-failure-cli.mjs` | a registry missing a name cannot be had from a real CLI | API-03 uses the real one |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup | Result |
| --- | --- | --- | --- |
| test-owned data roots, databases, built servers | Yes | `removeOwnedTestRuntime`, `server.stop()` | removed |
| `dist/` mutation X-A | Yes | restored, `cmp` identical | clean |
| Synthetic conversations in the user's `agy` history (the live runs) | Yes | not removable by me | remain; disclosed |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or user-only parts: `None`
- Next recipient: `delivery_engineer`
- Notes: finding F-1 (the scripted fixture's empty `tools` array produced the warning on every scripted start) is fixed in the fixture; follow-up FU-1 records the same line in `agy-tps-cli.mjs`.
