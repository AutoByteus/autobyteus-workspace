# Handoff — mcp-real-server-test-fixtures (SR-001): Architecture Design Complete

- Result: **Architecture Design Complete**, `task_size=Small`, `architectural_risk=Low`
- Package: `mcp-real-server-test-fixtures`; Project Task `autobyteus-189` (part of `autobyteus-195`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures`, branch `codex/mcp-real-server-test-fixtures`, base `origin/personal` @ `df73618d78`; finalization target `origin/personal`
- Approval: Solution Designer within the Task's direction (user informed 2026-10-19); no `Needs user` decision
- Artifacts (in `tickets/in-progress/mcp-real-server-test-fixtures/`): `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, this file
- Architecture review: `N/A — not applicable` (Small / Low)

## Original request

Make the MCP integration tests self-contained with a tiny real MCP server of our own, run the way the user's servers run (`uv run`, Python SDK). Fall back to Node, and skip cleanly with a message when neither works. Add an HTTP server of the same shape and an opt-in check against a real server of the user's kind. Cover list, call (success, error, slow), exit and hang at start, a stop that ends the process, and HTTP auth headers. Remove `cert.pem`. TESTING.md says how. No product change. Done when the tests run or skip cleanly in a worktree and the main checkout, the opt-in check exercises a real `uv` server, the fixture is gone, and TESTING.md is updated; merged.

## Key points

- Python primary fixture (`tests/fixtures/mcp-test-server/`, pinned `uv.lock`); the Node fixture extended in place (keep its path and `report_env_and_cwd` for the 181 matrix suite).
- One launcher helper owns the implementation choice, `uv sync --frozen` into a venv outside the repository, free ports and skip reasons. A preparation failure means skip with the reason; after the server has started, any failure is real.
- The hang case is bounded at about 3 s, plus "close ends the pid" (no 60 s wait; autobyteus-194 can tighten it later).
- Opt-in check: `RUN_REAL_MCP_SERVER_E2E=1`, `AUTOBYTEUS_MCPS_DIR`, default folder `pptx-mcp`, list only, from a temp copy. The user's folder must stay unchanged.
- Rewrite `tool-registrar.test.ts` too (same defect).
- TESTING.md gets one row, in its own `docs(testing)` commit.

## Verification intent

AC-001…AC-009: runs with `uv`, without `uv`, with forced preparation failure, the opt-in run, `git status` checks, `tests/unit` and the 181 matrix suite.

## Route Record
- 2026-10-19: `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Recipient: `/software_engineering_team/implementation_engineer`.

## User confirmation, 2026-10-19 (Solution Designer conversation)

The user asked whether this ticket commits anything. Explained: it adds test code only (no product code). The user: "Or just test code. Test code should be fixed." So the commit is **test code only**:
- the test servers, the rewritten tests and the opt-in check;
- the removed `cert.pem`;
- the TESTING.md row.

No product source change and no release. If a new test exposes a product defect, that is not fixed here: route it as a failure or a follow-up per `ticket-scope.md`. Finalization: merge the test code into `personal`, no release, clean up the worktree.
