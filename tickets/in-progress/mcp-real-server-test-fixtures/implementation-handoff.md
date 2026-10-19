# Implementation Handoff — mcp-real-server-test-fixtures

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures/tickets/in-progress/mcp-real-server-test-fixtures/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures`, branch `codex/mcp-real-server-test-fixtures`, base `origin/personal` @ `df73618d78`
- Commits:
  - `baaee3a150` `test(mcp): …` (test code and fixtures);
  - `c4b4a4dca4` `docs(testing): …` (the TESTING.md row only).
  - Ticket artifacts and evidence follow in the next commit; its hash is in the handoff message.
- Product source changed: **none**.

## Upstream Artifact Package

- Handoff-rule result: Small / Low, direct route. My `get_handoff_rules` result: direct API/E2E.
- Requirements doc: `requirements-doc.md` (SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001)
- Supplemental artifacts: none
- Design review report / architecture review revision record: `N/A — not applicable`
- Triggering rework: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related ARCH-REV / CRR / API-REV / DR: `N/A`
- Triggering finding IDs: `N/A`

What now exists:

- **Tiny MCP test server, two implementations with identical tools and output.**
  - Tools:
    - `echo(text)` returns the text;
    - `add(a, b)` returns structured content `{sum}`;
    - `fail(message)` returns a tool error (`isError: true`);
    - `slow(ms)` returns `slept <ms> ms` after the delay;
    - `report_env_and_cwd(name)` returns the JSON `{value, cwd}`.
  - Modes (`--mode`): `normal`, `exit-at-start` (exit 1), `hang-at-start` (never answers).
  - Transports: stdio, the default; or `--transport http --port N --require-token T`, streamable HTTP at `/mcp`, where any request without `Authorization: Bearer T` gets a 401.
    - The HTTP server prints `MCP_TEST_SERVER_READY <url>` and one `MCP_TEST_SERVER_REQUEST auth=ok|missing|wrong method=<M>` line per request to stderr. These are value-free.
  - `MCP_TEST_SERVER_PID_FILE` makes the server write its pid there first.
  - **Python** (`autobyteus-ts/tests/fixtures/mcp-test-server/server.py`, 125 lines): the official SDK `mcp` 2.3.0 (`MCPServer`), pinned in `uv.lock` (34 packages), with `package = false`. HTTP runs on uvicorn behind a small ASGI token check.
  - **Node** (`autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`, 95 lines): extended in place. With no arguments it is still a stdio server with `report_env_and_cwd`, as the unit test and the 181 matrix suite expect.
- **Launcher** (`tests/integration/tools/mcp/mcp-test-server-launcher.ts`). It is the only place that chooses and starts an implementation.
  - Choice and preparation:
    - `uv` is found on `PATH`; `uv sync --frozen --project <fixture>` runs once per test file;
    - `UV_PROJECT_ENVIRONMENT` defaults to `<os.tmpdir()>/autobyteus-mcp-test-server-venv-<lock hash>`;
    - `UV_CACHE_DIR` defaults to `<os.tmpdir()>/autobyteus-mcp-test-server-uv-cache`;
    - both can be overridden.
  - Skip reasons are logged as `[mcp-test-server] python: skipped: <reason>` and shown in the suite title: `uv unavailable (not on PATH)`, or `uv could not prepare the fixture: <uv's × line and cause>`. Node is always available.
  - Services: stdio configs, an HTTP server on a free port with readiness from the ready line, pid helpers, and process stop (SIGTERM, then SIGKILL after 5 s).
- **Integration tests**, each running per available implementation, with `python` or `node` in the suite title:
  - `stdio-managed-mcp-server.test.ts` (5 cases):
    - list the tools, then call `echo`, `add` (structured), `fail` (tool error; still connected) and `slow`;
    - env and cwd delivery;
    - closing a connected server ends its pid;
    - exit-at-start rejects, and the state is `FAILED`;
    - hang-at-start is not settled after 3 s and is still `CONNECTING`; closing it ends its pid.
  - `http-managed-mcp-server.test.ts` (3 cases):
    - with the token, list and call work, and every request the server saw had `auth=ok` (at least 4 requests);
    - without a token, or with a wrong one, connect fails and the server saw `missing` or `wrong`.
  - `tool-registrar.test.ts` (3 cases): register with prefix and argument schema; execute `ts_add` through the registry (structured `{sum: 5}`); preview without registering.
- **Opt-in check** `real-user-kind-mcp-server.test.ts`.
  - Inputs: `RUN_REAL_MCP_SERVER_E2E=1`, `AUTOBYTEUS_MCPS_DIR` (required) and `REAL_MCP_SERVER_FOLDER` (default `pptx-mcp`). Optional: `REAL_MCP_SERVER_COMMAND`, `REAL_MCP_SERVER_CALL` and `UV_CACHE_DIR`.
  - Steps:
    1. At collection time, copy the folder to temp without `.venv`.
    2. Run `uv sync --frozen` there with a temp `UV_PROJECT_ENVIRONMENT`. A failure becomes the skip reason.
    3. List the tools; call one only if `REAL_MCP_SERVER_CALL` is given.
    4. Assert that the source folder's files outside `.venv` are unchanged, by path, size and mtime.
  - Missing gate or folder: skip with a message.
- `tests/fixtures/certificates/` deleted (no references anywhere: grep of `ts`, `mjs`, `json`, `md`, `py`).
- `TESTING.md`: one "Core library MCP integration" row with the command, pointing to the file header for the opt-in gate. It is committed on its own as `docs(testing): …`.

### Deviations from the package, both recorded here for the Solution Designer and Delivery

1. **The opt-in default command.**
   - REQ-005 and the design name `start-pptx-mcp`, with the default command `uv run --frozen start-pptx-mcp`. That command cannot start: `pptx-mcp`'s `uv.lock` has `source = { virtual = "." }` (no `[build-system]`), so uv never installs the project's scripts. A temp-copy probe gave `error: Failed to spawn: start-pptx-mcp … No such file or directory`.
   - The default is now `uv run --frozen python app/main.py`. That is the command `pptx-mcp`'s README documents, and it answered `initialize` in the same probe.
   - The target (`pptx-mcp`, list only, from a temp copy) is unchanged, and the command stays overridable. The requirement's wording should say "entry `app/main.py`" when the docs are next touched.
2. **The unit test assertion.** `tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` asserted exactly `['report_env_and_cwd']`. REQ-001's extra tools make that false, so it now asserts the full sorted list. REQ-008 holds: same path, same tool, same behavior.

## Routing Classification (Mandatory)

- Task size: `Small`. Architecture risk: `Low`.
- Design classification section: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence: test code and fixtures only; no product source change; the shared Node fixture's default behavior is unchanged (IMP-05 unit and IMP-06 matrix pass). No real failure surfaced after a server started, so the escalation trigger did not fire.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Real servers exercised, or a clear skip | Launcher → the three tests → product `StdioManagedMcpServer`, `HttpManagedMcpServer`, `McpToolRegistrar` → fixture processes | IMP-01: 22 pass (Python + Node). IMP-02: Node 11 pass, Python skipped "uv unavailable". IMP-03: Node 11 pass, Python skipped with uv's offline error |
| BEH-002 | `cert.pem` removed | `git rm` of `tests/fixtures/certificates/` | Gone; no references |
| BEH-003 | Unit test and matrix suite unchanged | Node fixture default (stdio, `report_env_and_cwd`) | IMP-05: 2047 pass. IMP-06: AGY matrix cell passes |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The two deviations above are corrections inside it.

## Key Files Or Areas

- `autobyteus-ts/tests/fixtures/mcp-test-server/{server.py,pyproject.toml,uv.lock}` (new)
- `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` (extended)
- `autobyteus-ts/tests/integration/tools/mcp/{mcp-test-server-launcher.ts,real-user-kind-mcp-server.test.ts}` (new)
- `autobyteus-ts/tests/integration/tools/mcp/{stdio-managed-mcp-server,http-managed-mcp-server,tool-registrar}.test.ts` (rewritten)
- `autobyteus-ts/tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` (one assertion)
- `TESTING.md` (one row)

## Important Assumptions

- `uv` forwards termination to its child: closing a Python stdio server (spawned as `uv run … python server.py`) ends the **Python** pid, which the pid file records. This was observed in IMP-01: the close and hang cases pass for Python.
- A preparation failure is a skip, not a pass (DEC-002). The suite title and the log say why.

## Known Risks

- R-001: the first Python preparation needs the network (PyPI) to fill the uv cache. Offline with an empty cache, the Python cases skip with the reason (IMP-03); Node still runs.
- The prepared environment and the uv cache intentionally persist under `os.tmpdir()`, outside the repository (REQ-004), so later runs are fast and offline. They are about 30 MB and can be deleted at any time.
- The hang case takes about 5.2–5.9 s: a 3 s bound plus the SDK's stdin-close wait and SIGTERM. That is well under the 20 s test timeout. autobyteus-194 can tighten it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (test hygiene)
- Reviewed root-cause classification: Duplicated Policy Or Coordination + Legacy Or Compatibility Pressure (tests)
- Reviewed refactor decision: `Refactor Needed Now` (bounded to the test folder)
- Implementation matched: `Yes`. One launcher owns choice, preparation and skip, and the three duplicated `resolveUvCommand` copies are gone.
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files removed: `Yes`:
  - the `autobyteus_mcps` paths and the `pdf_mcp`/`streamable_http_mcp_toy` dependencies;
  - the hard-coded `uv` candidate list and `UV_BIN` (replaced by a `PATH` lookup);
  - fixed port 8764 (free ports);
  - the `IMAGE_BYTES` fixtures;
  - `cert.pem`.
- Dead code found elsewhere: none new.
- Shared structures remain tight: `Yes`. One tool contract across both implementations.
- Size guardrails: `Yes`. Test files and fixtures are under 210 lines, and the fixtures are under 150 (design guidance).

## Persisted Data Transition Check

`Not Affected` (tests only).

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` in the fresh worktree; no lockfile change.
- `uv lock` created the fixture lock (network).
- The `autobyteus-ts` build and `autobyteus-server-ts prebuild` ran before IMP-06.
- Test-inclusive typecheck (`pnpm -C autobyteus-ts exec tsc -p tsconfig.json --noEmit`): it reports pre-existing errors in other test files (268 with only my new files, 262 with all changes). There are **0 errors in the changed or new files**. The build config (`tsconfig.build.json`) excludes tests.
- Probe folders used to learn the SDK 2.x API and the pptx command were removed.

## Checks Run

Evidence is in `tickets/in-progress/mcp-real-server-test-fixtures/evidence/`. Every log has a header with the command, commit, environment and date. Environment: macOS 26, node v22, uv 0.10.2. All rows ran on `baaee3a150`; HEAD `c4b4a4dca4` adds only the TESTING.md row.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | `baaee3a150` | clean env, `uv` on PATH | launcher, both fixtures, the three tests, product MCP classes | AC-001, AC-004, QR-001 | Pass | `IMP-01-integration-with-uv.log` | `Tests  22 passed \| 1 skipped (23)` (the skip is the ungated opt-in); `python: used: python via uv`; `Duration  17.67s` |
| IMP-02 | same, with `PATH=<temp bin with only node, pnpm>:/usr/bin:/bin` | `baaee3a150` | `command -v uv` empty | Node path | AC-002 | Pass | `IMP-02-integration-without-uv.log` | `python: skipped: uv unavailable (not on PATH)`; `Tests  11 passed \| 12 skipped (23)` |
| IMP-03 | same as IMP-01, plus `UV_PROJECT_ENVIRONMENT=<fresh temp> UV_CACHE_DIR=<empty temp> UV_OFFLINE=1` | `baaee3a150` | uv present, preparation forced to fail | skip policy | AC-003 | Pass | `IMP-03-integration-forced-prep-failure.log` | `python: skipped: uv could not prepare the fixture: × Failed to download … Network connectivity is disabled`; `Tests  11 passed \| 12 skipped (23)` |
| IMP-04 | `env -i … RUN_REAL_MCP_SERVER_E2E=1 AUTOBYTEUS_MCPS_DIR=/Users/normy/autobyteus_org/autobyteus_mcps pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts`, with the user repo's `git status`/HEAD and a pptx-mcp file fingerprint before and after | `baaee3a150` | clean env | opt-in check against real `pptx-mcp` (Python mcp 1.25.0) | AC-005, AC-006 | Pass | `IMP-04-opt-in-real-user-kind-pptx-mcp.log` | `pptx-mcp: 4 tools: create_ppt_from_images, replace_slide_with_image, append_images_as_slides, combine_images`; `diff before/after git status: identical`; `… (outside .venv, 13 files): identical`. The ungated skip is in IMP-01 |
| IMP-05 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `baaee3a150` | local | core unit incl. the Node fixture's stdio unit test | AC-009 | Pass | `IMP-05-core-unit.log` | `Tests  2047 passed (2047)` |
| IMP-06 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts --no-watch`, after the core build and prebuild | `baaee3a150` | clean env, scripted AGY | the 181 matrix suite using the extended Node fixture | AC-009 | Pass (AGY; other runtimes gated off) | `IMP-06-e2e-runtime-mcp-matrix-agy-scripted.log` | `✓ agy (scripted CLI): all three tool kinds through autobyteus_agent_tools`; `Tests  1 passed \| 5 skipped (6)` |
| AC-005 | `git status --short` in the worktree after all runs; `ps` for fixture, `pptx`/`app/main.py` processes | `baaee3a150` | local | REQ-004 | AC-005 | Pass | (this row) | only `?? tickets/in-progress/mcp-real-server-test-fixtures/`; no leftover processes |
| AC-007 | `ls autobyteus-ts/tests/fixtures`; grep for `certificates`/`cert.pem` | `baaee3a150` | local | — | AC-007 | Pass | (this row) | `mcp-stdio-fixture-server.mjs  mcp-test-server  memory`; no matches |
| AC-008 | `git show --stat c4b4a4dca4` | `c4b4a4dca4` | local | TESTING.md | AC-008 | Pass | (this row) | one file, one row, subject `docs(testing): add the core library MCP integration test layer` |

- New tests were developed against the fixtures directly; no red-on-base run applies, since the old tests could not run at all (no toys).
- No credential values appear: only the dummy `test-dummy-token`/`test-wrong-token` in test source, and the logs contain neither (`grep -c` = 0).
- Not run, and why:
  - the matrix suite's live runtimes (LM Studio, Claude, Codex, Grok): gated, use models or paid plans, and are owned by API/E2E;
  - any other server e2e: no server code changed.

## Frontend Rendered-Result Check

`Not Applicable`: tests and fixtures only.

## Downstream Coverage Hints / Suggested Scenarios

- Rerun IMP-01..IMP-03 in the **main checkout** layout as well as this worktree (the Task's "worktree and main checkout"). The launcher uses only paths relative to the test files, so the result should be the same.
- Run the folder a second time with `uv` to confirm it uses the cached environment offline (fast, no network).
- Run the opt-in check against another user-kind folder via `REAL_MCP_SERVER_FOLDER` and `REAL_MCP_SERVER_COMMAND`, list only, and check its source folder is unchanged.
- Optionally, the matrix suite with a live runtime, to confirm the extra fixture tools do not disturb tool selection.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent confirmation of AC-001..AC-006 and AC-009, reusing IMP-01..IMP-06 where nothing changed.
- The main-checkout run.
