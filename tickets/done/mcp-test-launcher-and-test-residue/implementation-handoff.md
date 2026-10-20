# Implementation Handoff

- Package: `mcp-test-launcher-and-test-residue` (Project Task `autobyteus-199`)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue`
- Branch: `codex/mcp-test-launcher-and-test-residue`, rebased onto `origin/personal` @ `aac5da3112`
- Implementation commits: `fc281c980a` (IR-001, D-1…D-5; was `33fc5f4e16` before the rebase, same content), `9a1f560454` (IR-002, D-6). Ticket documents and evidence are committed after them; see the handoff message for the final commit.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Small / Low); Solution Designer's rule → implementation engineer (direct route)
- Requirements doc: `requirements-doc.md` (`SR-002`, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (`SR-001`, `SR-002`)
- Design spec (required on every route): `design-spec.md` (`SR-002`, D-1…D-6)
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable` (architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: `handoff-result.md` "SR-002 addition" (Task extension, not rework)

## Current Implementation Summary

D-1…D-6 are implemented as designed. Only test files changed (13 files, +181/−61); there is no product `src` change.

- D-1: the MCP test launcher starts the Python server as `/usr/bin/env UV_PROJECT_ENVIRONMENT=… UV_CACHE_DIR=… PYTHONDONTWRITEBYTECODE=1 <uv> run --frozen --project <fixture> python server.py …`, and its config `env` is `{}`. The module state is renamed `uvEnv` → `uvLocations`, and the header says the variables are on the command line.
- D-2: `uvError` returns the whole block, from `×`/`error:` up to the next `help:` line, joined on one line.
- D-3: five core test files use a file-local `makeTempDir()` that returns `realpath(mkdtemp(os.tmpdir()/<same prefix>))`. An `afterEach` removes the dirs.
- D-4: `agent-runtime.test.ts` has a `makeMemoryDir()`, taken out of `attachMemory`. The "Agent facade" case sets `config.memoryDir` with it, and the existing `afterEach` removes the dir.
- D-5: five e2e files create `<os.tmpdir()>/<file prefix>-appdata-*` in `beforeAll` and call `appConfigProvider.config.setCustomAppDataDir`. `afterAll` removes the dir; in the websocket file this happens in `finally` after `app.close()`.
- D-6: in the contract rejection case, both `TASK_EXECUTION_STARTED` payloads carry the first case's agent `source`. Each payload keeps its named defect: `settled_at: null` in the first, no `delegator_agent_run_id` in the second. No error-text matching was added (DEC-007).

- Implementation cycle: `Initial` (IR-001), plus the Task extension (IR-002)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the changes are test-only and local to each file's hooks or the launcher. No product `src`, fixture, config or `.gitignore` changed, and no assertion changed. `/usr/bin/env` keeps the pid, so the pid-file and kill cases pass (IMP-01). None of the design's escalation triggers fired: every e2e file could set its data dir before `initialize()`, and the build-dependent e2e cases left no new residue (IMP-06, RSK-001 closed).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. I reviewed the full branch diff against `origin/personal` for scope, assertion preservation, dead code, naming and teardown order.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Location variables on the command line; config `env` carries only test values; product env delivery still tested | `mcp-test-server-launcher.ts` `serverCommand('python')` → `stdioServerConfig` / `startHttpTestServer` | Done. The config `env` is only `{MCP_TEST_DUMMY_VALUE, MCP_TEST_SERVER_PID_FILE}` (IMP-02). A child env of only PATH and HOME still uses the temp venv (IMP-02). With env delivery removed, the env/cwd and pid cases fail and the fixture stays unchanged (IMP-03) |
| BEH-002 | Whole uv error block in the skip reason | `uvError` | Done. The console line and describe title carry the full block up to the `.whl` URL (IMP-04). Without `uv` the reason is still `uv unavailable (not on PATH)` (IMP-05) |
| BEH-003 | Core tests use OS temp dirs removed in teardown | five core test files + `agent-runtime.test.ts` | Done. No new entries after `pnpm -C autobyteus-ts test` (IMP-06) |
| BEH-004 | e2e files use a temp app data dir removed in teardown | five e2e files | Done. No `workspaces.json` and no new entry after `pnpm test:e2e` (IMP-06, IMP-09) |
| BEH-005 | Server unit leaves nothing (preserved) | — (unchanged) | Preserved (IMP-06) |
| BEH-006 | Each rejection payload is valid except its named field | `team-task-event-current-contract.e2e.test.ts` case 2 | Done. The file passes (IMP-07). Each mutation fails at its own `toThrow()` (IMP-08) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` (D-1, D-2)
- `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts`, `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts`, `autobyteus-ts/tests/integration/tools/file/{edit,read,write}-file.test.ts` (D-3)
- `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` (D-4)
- `autobyteus-server-ts/tests/e2e/file-explorer/{file-explorer-websocket-lifecycle,file-explorer-graphql,file-explorer-path-boundary,file-operations-graphql}.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` (D-5)
- `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` (D-6)

## Important Assumptions

- The e2e files run under vitest's per-file isolation (`pool: forks`), so `appConfigProvider.config` is not yet initialized when `beforeAll` runs. This held for all five files: none threw `Cannot set custom app data directory after initialize()`.
- The five e2e files now log `Config file not found in new data directory …/.env`. This is info-level and the same as other e2e files that use a temp data dir. No file needed a `.env` to pass, so none was written (D-5 allows this).

## Known Risks

- ASM-001 / RSK-001 are closed by IMP-06: the build-dependent e2e cases ran on a built server and left no new entry.
- FU-001 (`project-task-index-status.test.ts`) did not reproduce in IMP-06 (server unit: 752 files passed, 4 skipped; 6201 tests passed). Its cause is still not investigated, and the item stays a follow-up.
- `uvError` relies on uv's `×`/`help:` markers. If they change, the reason falls back to the last line, as it did before.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup` (test hygiene) + contract-test fixture fix
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every change stays in its existing owner (the launcher; each file's hooks). There is no new shared helper.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the location variables are only on the command line, not also in `env`)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. None was found. `lastLine` is still used (fallback and HTTP errors), and `attachMemory` is still used.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrails: `Yes`. Only test files changed; the launcher has 202 non-empty lines.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (test artifacts only)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- macOS (Darwin 25.5.0), node v22.23.1, uv 0.10.2 (Homebrew). Each core and e2e run used `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR"` (TESTING.md).
- I built the server (`pnpm -C autobyteus-server-ts build`, exit 0) at `33fc5f4e16` before `pnpm test:e2e`. The rebase changed no `src` (`git diff --name-only dc530fdcb0 HEAD -- autobyteus-server-ts/src autobyteus-ts/src` is empty), so that build is current for HEAD.
- Before IMP-06 I removed the base-probe residue: `autobyteus-ts/{mcp-config-*,tmp-*-file-*,memory/}` and `autobyteus-server-ts/workspaces.json`.
- Rebase: I rebased onto `origin/personal` `aac5da3112` with no conflicts, after IMP-01…IMP-06 had run. `personal` changed only two e2e files this branch does not touch, plus ticket docs. Following TESTING.md "Rerun by impact", IMP-01…IMP-06 stay valid for this branch's files. I reran the two changed e2e files in IMP-09.

## Checks Run

Evidence files are in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | `33fc5f4e16` (= `fc281c980a`) | macOS, node 22.23.1, uv 0.10.2 | launcher, stdio/http/registrar MCP tests (Python + Node) | AC-001, AC-003 | Pass | `IMP-01-mcp-integration.log` | `Tests  22 passed \| 1 skipped (23)` (the skip is the opt-in real-user test); `python: used: python via uv (…/T/autobyteus-mcp-test-server-venv-c0cbb4480f4e)`; the fixture folder lists only `pyproject.toml server.py uv.lock` |
| IMP-02 | Throwaway vitest probe (uncommitted; source saved): print the Python stdio config, then spawn its command/args with env `{PATH, HOME}` only and `python -c` printing `sys.prefix` | `33fc5f4e16` | same | `stdioServerConfig`, `serverCommand` | AC-001, AC-002 | Pass | `IMP-02-ac001-ac002-probe-output.txt`, `IMP-02-ac001-ac002-probe.test.ts.txt` | `AC001 command=/usr/bin/env`; `AC001 env={"MCP_TEST_DUMMY_VALUE":"x","MCP_TEST_SERVER_PID_FILE":"/tmp/p.pid"}`; `PREFIX=/var/folders/…/T/autobyteus-mcp-test-server-venv-c0cbb4480f4e`; `AC002 fixture entries=["pyproject.toml","server.py","uv.lock"]` |
| IMP-03 | Temporary uncommitted mutation: remove `env: config.env` in `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts`; run `stdio-managed-mcp-server.test.ts`; revert with `git checkout` | `33fc5f4e16` + mutation | same | product env delivery vs launcher | AC-002, AC-003 | Pass (expected failures) | `IMP-03-env-delivery-mutation.log` | `× delivers the configured env and cwd to the server` for both impls (`expected { value: null, …(1) } to deeply equal { value: 'test-dummy', …(1) }`), the two pid-file cases also fail, `✓ lists the tools and calls echo, add, fail and slow` (Python still starts); `Tests  6 failed \| 4 passed (10)`; fixture folder unchanged |
| IMP-04 | `env -i … UV_OFFLINE=1 UV_CACHE_DIR=<empty> UV_PROJECT_ENVIRONMENT=<fresh> pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp/stdio-managed-mcp-server.test.ts --reporter=verbose` | `33fc5f4e16` | same | `preparePython`, `uvError` | AC-004 | Pass | `IMP-04-skip-reason-offline.log` | Console and describe title: `uv could not prepare the fixture: × Failed to download \`cryptography==50.0.2\` ╰─▶ Network connectivity is disabled, but the requested data wasn't found in the cache for: \`https://files.pythonhosted.org/…/cryptography-50.0.2-cp311-abi3-macosx_11_0_arm64.whl\``; `Tests  5 passed \| 5 skipped (10)` |
| IMP-05 | Same file with `PATH` minus every dir that contains `uv` | `33fc5f4e16` | same | `preparePython` | AC-004 (alternate) | Pass | `IMP-05-skip-reason-no-uv.log` | `python: skipped: uv unavailable (not on PATH)` |
| IMP-06 | `ac005.sh` (in the evidence file): snapshot `git status --ignored --porcelain --untracked-files=all` (minus `node_modules`, `tickets/`) → `pnpm -C autobyteus-ts test` → `pnpm -C autobyteus-server-ts test:unit` → `pnpm test:e2e` (server built) → snapshot after each → diff | `33fc5f4e16` | same, clean env per run | all touched core and e2e files; full suites | AC-005, AC-006, REQ-006 | Pass for this ticket (e2e exit 1 from the two base files fixed by the rebase, see IMP-09) | `IMP-06-residue-diff.txt`, `IMP-06-core-library-test-excerpt.log`, `IMP-06-server-unit-excerpt.log`, `IMP-06-server-e2e-excerpt.log` | Diff empty (`(end of diff)` right after the heading); every snapshot has 6717 entries, and the only one outside `dist/` is `!! autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`. Core: `Test Files  387 passed \| 26 skipped (413)`, `Tests  2356 passed \| 78 skipped` (same file/test pass counts as the base probe P-3). Server unit: `752 passed \| 4 skipped`. e2e: the five D-5 files `✓`. `2 failed` = `memory-collaboration-graphql` (`rootTeam.taskExecutions[0] is missing required field(s): source.`) and `team-task-event-current-contract` case 1, both fixed on `personal` by `autobyteus-211` |
| IMP-07 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts --no-watch --reporter=verbose` | `9a1f560454` | same | D-6 | AC-007, AC-006 | Pass | `IMP-07-contract-file.log` | `✓ … rejects the retired task-record events and settlement fields`; `Tests  2 passed (2)` |
| IMP-08 | Two uncommitted mutations, one at a time, each reverted: A removes `settled_at: null`; B adds `delegator_agent_run_id` to the second payload; same command | `9a1f560454` + mutation | same | D-6 | AC-007 | Pass (expected failures) | `IMP-08-contract-mutations.log` | A: `AssertionError: expected [Function] to throw an error` at `91\|     })).toThrow();`. B: the same error at `108\|     })).toThrow();`. Each run: `Tests  1 failed \| 1 passed (2)` |
| IMP-09 | Snapshot → `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts --no-watch` → snapshot → diff | `9a1f560454` | same | the two files `personal` changed, now on the rebased branch | AC-005, AC-006 | Pass | `IMP-09-rebased-e2e-files.log` | `Test Files  2 passed (2)`, `Tests  10 passed (10)`; diff empty |

- Not run, and why: a full `pnpm test:e2e` on the rebased HEAD. Under TESTING.md "Rerun by impact", the rebase added only the two e2e files rerun in IMP-09, and I changed only the contract file. The full-suite rerun on the final commit is left to API/E2E if it wants one. Gated `RUN_*` suites and the opt-in `real-user-kind-mcp-server.test.ts` are out of scope.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: this is a test-only change with no rendered frontend.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005 on the final commit: repeat the IMP-06 before/after diff, at least around `pnpm test:e2e`.
- AC-002: the probe and the mutation recipes are in IMP-02 and IMP-03. Neither needs a product hook.
- AC-007: the mutation diffs are in IMP-08.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent validation of AC-001…AC-007 and confirmation of the AC-005 residue result on the final commit.
