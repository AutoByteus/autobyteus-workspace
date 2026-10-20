# API/E2E Execution Coverage Report

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (IR-002, HEAD `7c9cadba2f`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: (1) API-09 added: the full-suite default reporter does not print per-file lines for fast files, so the touched files were run on their own with the verbose reporter to get their per-file counts for AC-006. (2) API-07 run 3 is invalid because of a harness error on my side: the insert landed in the first payload. Run 4 repeats mutation B on the correct payload; both runs stay in the log, and run 3 is marked there.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/evidence/`

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architectural risk (`Low`/`High`): `Low`
- Input route (`Reviewed`/`Direct Low-Risk`): `Direct Low-Risk`
- Successful-output route (`Code Review`/`Delivery`): `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `7c9cadba2f` (code = `9a1f560454`) | macOS, Darwin 25.5.0, arm64 | node v22.23.1, vitest 4.0.18, uv 0.10.2 (Homebrew), `/usr/bin/env` | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR"` per run (TESTING.md); system `TMPDIR=/var/folders/7w/…/T/`; existing uv venv/cache under it |
| ENV-2 | `7c9cadba2f` | same | same, plus `pnpm -C autobyteus-server-ts build` on HEAD (exit 0) | Per suite: `env -i PATH HOME=<resolved temp> TMPDIR=<run-owned /private/tmp/a8.*> UV_CACHE_DIR=<existing system uv cache>`; each run-owned `TMPDIR` listed after the suite, then removed |

## Cases

Evidence paths are relative to the evidence folder above. Each text file starts with its command, commit, environment and date.

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003; REQ-001, REQ-002 | Product MCP client (stdio, HTTP, registrar) ↔ real Python and Node test servers | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp --reporter=verbose`; fixture folder listed before/after | ENV-1 | Pass | `API-01-mcp-integration.log` | `Tests  22 passed \| 1 skipped (23)` (skip = opt-in `real-user-kind`, `RUN_REAL_MCP_SERVER_E2E=1 is not set`); `✓ … (python) > delivers the configured env and cwd to the server`, `✓ … (node) > delivers …`, `✓ … ends the server process when a connected server is closed` both impls; `## fixture folder after: pyproject.toml server.py uv.lock`; `## git status --ignored of fixture: []` | Python via `/usr/bin/env` keeps pid identity: pid-file close/hang cases pass |
| API-02 | AC-001, AC-002; REQ-001 | Launcher config → `/usr/bin/env` → `uv run` → Python | Throwaway probe `autobyteus-ts/tests/integration/tools/mcp/zz-api02-probe.test.ts` (source saved, file deleted after): asserts the Python stdio config shape, then spawns the config's command/args with child env `{PATH, HOME}` only and `python -c` printing what Python sees | ENV-1 | Pass | `API-02-ac001-ac002-probe.log`, `API-02-probe.test.ts.txt` | `API02 command=/usr/bin/env`; `API02 env={"MCP_TEST_DUMMY_VALUE":"v","MCP_TEST_SERVER_PID_FILE":"/tmp/api02.pid"}`; `API02 child env keys=PATH,HOME`; `PY={"prefix": "/var/folders/…/T/autobyteus-mcp-test-server-venv-c0cbb4480f4e", "dont_write_bytecode": true, …}`; `API02 fixture before=[…] after=[…]` equal; `Tests  1 passed (1)` | The probe asserts each location variable is absent from `env` and present as a `NAME=value` arg |
| API-03 | AC-002, AC-003; REQ-001, REQ-002 | Product env delivery removed | Uncommitted mutation: delete `env: config.env,` in `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts`; whole MCP folder as API-01; `git checkout` revert | ENV-1 | Pass (expected failures) | `API-03-env-delivery-mutation.log` | `-      env: config.env,`; `× … (python) > delivers the configured env and cwd to the server` → `expected { value: null, …(1) } to deeply equal { value: 'test-dummy', …(1) }`, same for node; pid cases `×` (no pid file without env); `✓ … (python) > lists the tools and calls echo, add, fail and slow`; `Tests  6 failed \| 16 passed \| 1 skipped (23)`; `## fixture folder after: pyproject.toml server.py uv.lock`; `## after revert, git status of autobyteus-ts: []` | Python servers still start from the temp venv with delivery gone; delivery is still tested |
| API-04 | AC-002 (sensitivity of API-03) | Same mutation with the base launcher | API-03's mutation + launcher replaced by `git show aac5da3112:<launcher>`; `stdio-managed-mcp-server.test.ts`; both reverted, created `.venv` removed | ENV-1 | Pass (negative control reproduced the defect) | `API-04-negative-control-base-launcher.log` | `## fixture folder after: .venv pyproject.toml server.py uv.lock`; `## .venv python: autobyteus-ts/tests/fixtures/mcp-test-server/.venv/bin/python …`; `## after revert and .venv removal, git status --ignored of autobyteus-ts (minus node_modules/dist): []` | uv writes `.venv/.gitignore` = `*`, so plain `git status` does not show it (`## git status of fixture: []`); API-01/03 used `ls` and `--ignored` |
| API-05 | AC-004; REQ-003 | `preparePython` / `uvError` on a real uv failure | `env -i … UV_OFFLINE=1 UV_CACHE_DIR=<empty> UV_PROJECT_ENVIRONMENT=<fresh> pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp/stdio-managed-mcp-server.test.ts --reporter=verbose`; raw `uv sync` stderr appended for comparison | ENV-1 | Pass | `API-05-skip-reason-offline.log` | Console and describe title: `uv could not prepare the fixture: × Failed to download \`cryptography==50.0.2\` ╰─▶ Network connectivity is disabled, but the requested data wasn't found in the cache for: \`https://files.pythonhosted.org/…/cryptography-50.0.2-cp311-abi3-macosx_11_0_arm64.whl\``; no `help:` text in the reason; `Tests  5 passed \| 5 skipped (10)` | Raw block (4 lines + `help:` block) shown below the run |
| API-06 | AC-004 (alternate) | `preparePython` without uv | Same file with `PATH` minus `/opt/homebrew/bin` (the only dir with `uv`) | ENV-1 | Pass | `API-06-skip-reason-no-uv.log` | `[mcp-test-server] python: skipped: uv unavailable (not on PATH)`; `uv found on reduced PATH: []`; `Tests  5 passed \| 5 skipped (10)` | — |
| API-07 | AC-007, AC-006; REQ-007 | Team stream contract parser through the e2e file | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts --no-watch --reporter=verbose`: run 1 unmutated; run 2 mutation A (remove `settled_at: null`); run 4 mutation B (add `delegator_agent_run_id` to the second payload); each reverted | ENV-1 | Pass | `API-07-contract-file-and-mutations.log` | Run 1: `Tests  2 passed (2)`. Run 2: `AssertionError: expected [Function] to throw an error` at `91\|     })).toThrow();`. Run 4: same error at `108\|     })).toThrow();`. `## after revert, git status of …: []` | Run 3 is invalid (marked in the log): my line pattern put the insert into payload 1 |
| API-08 | AC-005, AC-006, QR-001; REQ-004, REQ-005, REQ-006 | Full suites vs worktree and OS temp | `/tmp/abyt199-api/api08.sh` (in the evidence file): `pnpm -C autobyteus-server-ts build`; snapshot `git status --ignored --porcelain --untracked-files=all` (minus `node_modules`, `?? tickets/`); `pnpm -C autobyteus-ts test`, `pnpm -C autobyteus-server-ts test:unit`, `pnpm test:e2e`, each with `env -i` and a run-owned `TMPDIR`; snapshot after each; diff; temp leftovers listed | ENV-2 | Pass | `API-08-residue-diff.txt`, `API-08-core-library-excerpt.log`, `API-08-server-unit-excerpt.log`, `API-08-server-e2e-excerpt.log` | `build exit 0`; `core exit 0`, `server-unit exit 0`, `e2e exit 0`; `diff before vs 1-after-core exit 0 (0 lines)`, `… 2-after-unit exit 0 (0 lines)`; after e2e only `< !! autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db-journal` (a removal, in the excluded test-DB folder); `touched-prefix entries left: 0` for all three suites. Core `Test Files  387 passed \| 26 skipped (413)`, `Tests  2356 passed \| 78 skipped (2434)`; unit `752 passed \| 4 skipped`, `6201 passed`; e2e `Test Files  93 passed \| 91 skipped (184)`, `Tests  386 passed \| 410 skipped (796)`, `Failed-test markers … 0` | Core Python venv defaulted to `/private/tmp/a8.Bjrp5o/autobyteus-mcp-test-server-venv-…` (follows `TMPDIR`). FU-001's test passed (`✓ tests/unit/projects/project-task-index-status.test.ts (8 tests)`). Other tests' OS-temp leftovers → FU-002 |
| API-09 | AC-006; REQ-004, REQ-005, REQ-007 | The 12 touched files | (a) 6 core files, (b) 6 e2e files, each `vitest run … --reporter=verbose` with clean env; (c) test-declaration counts at `aac5da3112` vs HEAD | ENV-1 | Pass | `API-09-touched-files-counts.log` | (c) every file `N -> N` (16, 18, 4, 11, 9, 12; 3, 3, 2, 2, 11, 2) and `skip/only/todo at HEAD: 0`; (a) `Tests  72 passed (72)`; (b) `Tests  23 passed (23)`; per D-5 file `Custom app data directory set to: /var/folders/…/T/<prefix>-appdata-…` | Base e2e per-file counts (probe P-4 log) match: ws-lifecycle 3, graphql 3, path-boundary 2, file-ops 2, workspaces 11, contract 2 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02 | Proven | — |
| AC-002 | Yes | API-02, API-03, API-04 | Proven | — |
| AC-003 | Yes | API-01, API-03 | Proven | — |
| AC-004 | No | API-05, API-06 | Proven | — |
| AC-005 | Yes | API-08 | Proven | — |
| AC-006 | Yes | API-08, API-09, API-07 (run 1) | Proven | — |
| AC-007 | Yes | API-07 | Proven | — |
| QR-001 | No | API-08, API-09 | Proven: core 26.49 s vs base 32.97 s (probe P-3); touched e2e tests run in 1–23 ms each, the websocket file's three tests ~2 s total (base file 1750 ms) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 98% | Every AC directly proven on the final commit (API-01…API-09) | uv error format pinned to 0.10.2 | Another uv version (not available; design accepts the fallback) |
| Changed-boundary execution directness | 98% | 98% | Real product client, real `uv`, real `/usr/bin/env`, real contracts package, real suites (API-01, -03, -05, -07, -08) | None material | — |
| Cross-boundary integration realism and mock gap | 96% | 96% | No mocks in the proving paths. AC-002 shown by a product mutation and a base-launcher negative control (API-03/04) | The mutation removes delivery entirely rather than corrupting it partially; either way the launcher no longer relies on it | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | TESTING.md clean env, resolved temp HOME, server built on HEAD, run-owned TMPDIR (API-08) | macOS only; Linux `/usr/bin/env` is the same POSIX utility; Windows already skips Python | A Linux run (not needed for a test-only change) |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 96% | Offline and no-uv skips (API-05/06); pid close/hang cases (API-01); teardown removal in OS temp (API-08: 0 leftovers); `afterAll` order in the websocket file passes | Teardown after a failing test is not exercised; `afterEach`/`afterAll` run regardless in vitest | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No user surface: test-only change | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | Touched tests keep every declaration and assertion (API-09). The contract case now fails for its named field only (API-07) | Nothing durable guards against future residue (Non-Goal: no residue guard) | Out of scope by the requirements |

- Overall post-repository confidence: 96%
- Overall final confidence: 96%
- Calculation method: simple average of the six applicable categories (98, 98, 96, 95, 96, 95 → 96.3)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: uv error format on other versions (fallback to the last line, as before); macOS-only run

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Execution mode: `None`
- Confidence gap or residual risk it addresses, and the expected gain: none remains. The changed boundaries are test code, the MCP launch path and the suites' file-system effects. API-01…API-09 already execute each of them for real.
- Browser validation needed, and why or why not: No. Nothing reaches a browser, renderer or desktop shell.
- If `Not Required`: the cases that already exercise the real changed boundary: API-01/02/03/04 (launch path with real uv and the product client), API-05/06 (real uv failure), API-07 (real contract parser), API-08/09 (the documented suites on a built server, worktree and OS temp observed)
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The location variables live only on the command line (API-02 asserts their absence from `env`), and `uvError` has no line-count path left.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`. The 13 test files changed by implementation (IR-001, IR-002) are validated, not changed here.

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| None | — | — | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Network for uv (API-05) | `UV_OFFLINE=1` + empty cache | Deterministic, real uv failure path | None: the error text comes from the real uv |
| Product env delivery loss (API-03/04) | Uncommitted source mutation | A real regression cannot be produced otherwise | None |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe `autobyteus-ts/tests/integration/tools/mcp/zz-api02-probe.test.ts` | Yes | Deleted after API-02; source copy in evidence | `git status` of `autobyteus-ts` empty |
| Mutation of `stdio-managed-mcp-server.ts` (API-03, API-04) and base launcher (API-04) | Yes | `git checkout --` | Clean (`[]` in the logs) |
| `autobyteus-ts/tests/fixtures/mcp-test-server/.venv` created by API-04 | Yes | `rm -rf` | `git status --ignored … []` |
| Contract file mutations (API-07) | Yes | `git checkout --` | Clean |
| Temp HOMEs, run-owned `TMPDIR`s (`/private/tmp/a8.*`), empty uv cache, fresh venv path | Yes | `rm -rf` after each run | Removed |
| Server `dist/` rebuilt on HEAD | Yes (build output) | Left in place (excluded build output) | — |
| `/tmp/abyt199-api/` scratch logs | Yes | Kept as full logs behind the committed excerpts | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff message (delivery on the direct route)
- Notes: FU-001 did not reproduce (`project-task-index-status` 8/8 passed); its cause is still not investigated and it stays a follow-up. FU-002 records the OS-temp leftovers of untouched tests. Test-code review: `Not Required — direct low-risk route`.
