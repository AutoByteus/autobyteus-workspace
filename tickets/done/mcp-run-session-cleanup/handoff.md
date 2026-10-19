# Handoff — mcp-run-session-cleanup (SR-001): Architecture Design Complete

- Result: **Architecture Design Complete**, `task_size=Small`, `architectural_risk=Low`
- Package: `mcp-run-session-cleanup`; Project Task `autobyteus-193`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup`, branch `codex/mcp-run-session-cleanup`, base `origin/personal` @ `fc93276e6f`; finalization target `origin/personal`
- Approval: Solution Designer within the Task's direction (user informed 2026-10-19)
- Artifacts (in `tickets/in-progress/mcp-run-session-cleanup/`): `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, this file
- Architecture review: `N/A — not applicable`

## Original request

Close a run's stdio MCP server sessions when the run terminates (stop, idle shutdown of a delegated copy, delete), without breaking runs that share a server or a run woken later. Check HTTP sessions and the shared registry too. Verify with a child-process count on a real stdio server of the user's kind (isolated app, copied configuration). Done when a terminated run leaves no stdio MCP child process, a woken run still gets its tools, it's merged, and it ships with the next release.

## Design summary

- `AgentRunResourceManager.release(runId)`, the single removal path, also starts `McpServerInstanceManager.cleanupMcpServerInstancesForAgent(runId)`. It does so once per run, non-blocking, logging failures. This covers native, Claude, Codex, AGY and Grok, since all of them key instances by the run's `runId`. HTTP sessions close the same way.
- `cleanupMcpServerInstancesForAgent` detaches the map entry **before** closing, so a run woken during the close gets fresh instances.
- Remove the dead `cleanupAllMcpServerInstances`.
- The gateway's shared instances and preview/registration stay as they are.

## Verification intent

AC-001…AC-008:
- unit tests (release step, detach order);
- e2e red-first with the 189 stdio fixture and its pid file: terminate, delete, idle shutdown, wake right after stop, two runs sharing a server;
- the runtime matrix suite extended to check that the pid is gone after termination;
- an isolated-app child-process count with a copied user-kind `uv` server.

## Route Record
- 2026-10-19: `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Recipient: `/software_engineering_team/implementation_engineer`.
