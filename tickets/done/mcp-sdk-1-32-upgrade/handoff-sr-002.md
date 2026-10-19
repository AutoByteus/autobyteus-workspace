# Handoff — mcp-sdk-1-32-upgrade SR-002: regression parity validation

- Result: **Architecture Design Complete** for a validation-only round; `task_size=Small`, `architectural_risk=Low`. No product source change is designed.
- Package: `mcp-sdk-1-32-upgrade`; Project Task `autobyteus-181` (still open)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the user's words
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity`, branch `codex/mcp-sdk-1-32-upgrade-parity`, base `origin/personal` @ `f59055f13f`. The ticket folder was moved back to `tickets/in-progress/mcp-sdk-1-32-upgrade/` (uncommitted `git mv`). Finalization target `origin/personal`.
- Approval: SR-002 additions approved by the user (his words, relayed): "we have to make sure that the mcp upgrade doesn't break. Upgrading a library should make things better instead of breaking things." Plus check 3.
- Artifacts (in `tickets/in-progress/mcp-sdk-1-32-upgrade/`):
  - `requirements-doc.md` (SR-002: REQ-008…010, AC-010…016, DEC-005…006);
  - `investigation-notes.md` (section "SR-002 Investigation");
  - `design-spec.md` (section "SR-002 Addendum");
  - `solution-revision-record.md` (SR-002);
  - this file. SR-001's archived artifacts (implementation, API/E2E and delivery records) are in the same folder.

## What to do (the design addendum is authoritative)

1. Toy integration tests, before (`bf3c550c18`, SDK 1.30.0) and after (`f59055f13f`, 1.32.1), with a test-owned `<worktree>/autobyteus_mcps` link to copied toy folders. The HTTP toy doesn't exist, so report it as "cannot run on either".
2. Isolated apps of both commits:
   - copied and env-stripped `VideoAudioServer` (call one read-only tool) and `media-downloader` (list only), from test-owned folder copies;
   - a test-owned HTTP MCP server;
   - an exit-at-start server and a hang-at-start server;
   - native runtime plus Codex or Claude.

   Then stop the instance and check for orphan processes.
3. Own endpoints:
   - plain code statement: no SDK in `autobyteus-server-ts/src`; the Agent Tools MCP server and `/mcp/gateway` are hand-written, and they reach the SDK only for external MCP-origin tools;
   - live: Claude and Codex runs calling `create_task`/`update_task` through the Agent Tools MCP server;
   - a `/mcp/gateway` call of an external MCP-origin tool.

   All of it on both commits.
4. A plain-words report: same/different per check, every difference as a finding, and everything that could not run.

## Safety

Never the user's app, data or MCP folders (copies only). No SSH, download, paid or heavy-model calls. Dummy values only.

## Route Record
- 2026-10-19: `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Recipient: `/software_engineering_team/implementation_engineer`. With no code change expected, the Implementation Engineer runs check 1 as implementation-scoped evidence and passes the round on to API/E2E through its own route.

## SR-003 addition (2026-10-19)

The user, in the Solution Designer conversation: "we should make sure the project MCP still works. So later the testing should at least make sure the different runtime for different MCP still works." Added REQ-011 / AC-017: a runtime × MCP matrix. Every available runtime (native, Claude, Codex, AGY, Grok if installed) × {project tools `create_task`/`update_task` via Agent Tools MCP, external stdio tool, external HTTP tool}, before (1.30.0) and after (1.32.1). See the design-spec section "SR-003". Sent to the Implementation Engineer, which holds the round.
