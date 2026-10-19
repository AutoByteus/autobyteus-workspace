# Investigation Notes — Self-contained MCP integration tests on tiny real servers

## Investigation Meta

- Package identifier: `mcp-real-server-test-fixtures`
- Request / ticket: Project Task `autobyteus-189` (part of `autobyteus-195`; follow-ups 2 and 3 of the autobyteus-181 delivery)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures`
- Repository mode: `Git`
- Branch: `codex/mcp-real-server-test-fixtures`
- Base: `origin/personal` @ `df73618d78d5d9f562e9a3cc5f01204b79cb5ad4` (fetched 2026-10-19)
- Finalization target: `origin/personal`
- Bootstrap: worktree created; no blocker
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-19, this conversation): the updated `SKILL.md`, `references/ticket-scope.md`, `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, the updated `templates/requirements-doc-template.md`, `DESIGN.md`, `TESTING.md`
- Status: Complete for design

## Initial Request And Clarifications

- The Task (corrected by my autobyteus-181 finding): the MCP integration tests against real servers cannot run anywhere; make them self-contained with a tiny real MCP server of our own, skip cleanly when a tool is missing, and remove the unused certificate fixture.
- The user's direction: "I think we can use a very simple MCP … as long as it works. We can even create one by ourselves for testing."
- The Task's direction:
  - a repository-owned tiny server with read-only, structured, failing and slow tools, run the way the user's servers run (`uv run` + the official MCP Python SDK);
  - a Node fallback when `uv` is unavailable, and a clean skip when neither is;
  - an HTTP server of the same shape;
  - an opt-in check against a real server of the user's kind from `autobyteus_mcps`;
  - cover list, call (success, error, slow), exit-at-start, hang-at-start, a stop that ends the process, and HTTP auth headers;
  - TESTING.md says how; no product change.

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-10-19 | Code | `autobyteus-ts/tests/integration/tools/mcp/{stdio-managed-mcp-server,http-managed-mcp-server,tool-registrar}.test.ts` | All three resolve `path.resolve(<autobyteus-ts>, '..', 'autobyteus_mcps')` = `<repository root>/autobyteus_mcps`, which exists in no layout. stdio and tool-registrar use `pdf_mcp` (`uv run python -m pdf_mcp.server`). HTTP uses `streamable_http_mcp_toy` on **fixed port 8764**. All three hard-code `uv` candidate paths. No skip logic, so they fail with ENOENT |
| 2026-10-19 | Code | `tool-registrar.test.ts` | Not named in the Task, but the same defect (pdf_mcp dependency), so it belongs to this ticket (`ticket-scope.md`: a problem in the functionality the ticket changes) |
| 2026-10-19 | Data | `git -C /Users/normy/autobyteus_org/autobyteus_mcps log`, `ls-files` | The toy repo changed: `video-audio-mcp` became a skill (`a947f1a`, `cc2d549`, moved to `autobyteus-skills`). `pdf_mcp` is no longer tracked (only `pdf_mcp_server.egg-info` left). `streamable_http_mcp_toy` never existed. Tracked servers: alexa-mcp, browser-mcp, moss-ttsd-mcp, neutts-air-mcp, pptx-mcp, ssh-mcp, tts-mcp. So the opt-in check must not hard-code a server |
| 2026-10-19 | Data | `autobyteus_mcps/pptx-mcp/pyproject.toml`, `uv.lock` | A real `uv` project: `requires-python >=3.10`, deps `mcp`, `python-pptx`; entry point `start-pptx-mcp` (`app.main:run_server`); pinned `uv.lock`. Listing its tools is side-effect free, so it is a suitable documented default for the opt-in check (list only) |
| 2026-10-19 | Code | `grep -rn "certificates\|cert.pem\|key.pem"` in `autobyteus-ts`, `autobyteus-server-ts` (excluding `node_modules`, `dist`) | No reference. `autobyteus-ts/tests/fixtures/certificates/cert.pem` (added in `32a216a848`) is dead |
| 2026-10-19 | Code | `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` (from 181) | Node SDK stdio server with one tool `report_env_and_cwd`. Used by `tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` and `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` L50 (tool `report_env_and_cwd`, prefixed `matrix_stdio_`) |
| 2026-10-19 | Code | `autobyteus-ts/vitest.config.ts`; `package.json` scripts | No test script; tests run via `pnpm -C autobyteus-ts exec vitest run <path>`; default timeout 20 s |
| 2026-10-19 | Doc | `TESTING.md` L28-44, L7-26, L102-104 | The layers table lists core tests as `vitest run tests/unit` only. Integration tests "inherit the shell" and need a clean env. TESTING.md may change only for every-future-task facts ("a test layer, tool or harness is added …"), and must be committed on its own as `docs(testing): …`. Suite details belong in the test file header |
| 2026-10-19 | Contract | PyPI `mcp` | 2.3.0, `requires_python >=3.10`, includes `uvicorn`, `starlette` (streamable HTTP) |
| 2026-10-19 | Command | `uv --version`; `uv python list --only-installed`; `uv cache dir` | uv 0.10.2; CPython 3.11–3.14 present; cache at `~/.cache/uv` |
| 2026-10-19 | Code | `.github/workflows/` | Release workflows only; no CI test job. These tests run locally |
| 2026-10-19 | Code | SDK `StdioClientTransport` (1.32.1) | Spawns the configured command; `close()` ends the child. The pid is not exposed through our managed server, so a fixture-written pid file is the clean way to prove the process ended |

## Relevant Existing Behavior

| ID | Behavior | Evidence |
| --- | --- | --- |
| BEH-001 | No MCP integration test runs against a real server in any layout | Source Log rows 1, 3 |
| BEH-002 | An unused certificate fixture exists | Source Log row 5 |
| BEH-003 | The unit test and the 181 matrix suite use the Node stdio fixture | Source Log row 6 |

## Risks

| ID | Description | Resolution |
| --- | --- | --- |
| R-001 | `uv` needs the network the first time it resolves the fixture's dependencies | Pinned `uv.lock`; prepare with `uv sync --frozen` in `beforeAll`. A preparation failure is a **skip with the reason**, not a pass and not a red test. A start or tool failure after preparation is a real failure |
| R-002 | `uv` writing `.venv` into the repository or into the user's folders | `UV_PROJECT_ENVIRONMENT` set to a temp or cache directory outside the repository. The opt-in check runs from a temp copy of the user's server folder |
| R-003 | A hang-at-start test waiting on the SDK's 60 s default | Assert "not connected within a short bound" and that `close()` ends the process; the shorter product timeout is autobyteus-194 |
| R-004 | Renaming the Node fixture breaks the 181 matrix suite | Keep the file path and the `report_env_and_cwd` tool; only add tools |

## Prerequisite Check

None. `uv` and Python ≥3.10 are present, the official SDKs exist for both languages, and no product code is needed.
