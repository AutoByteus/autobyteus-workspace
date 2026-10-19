# Implementation Revision Record — mcp-run-session-cleanup

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |

## Revision Entries

### IR-001 — Close a run's MCP server instances on release

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup/tickets/in-progress/mcp-run-session-cleanup/handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: commit `a8b849af79` on `codex/mcp-run-session-cleanup`
- Related solution revision IDs: SR-001
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-004; REQ-001..REQ-005; AC-001..AC-007 (AC-003 live runtimes and AC-008 are for API/E2E)
- Implementation delta:
  - `McpServerInstanceManager.cleanupMcpServerInstancesForAgent`:
    - detaches the agent's map before closing;
    - closes everything with `Promise.allSettled`;
    - warns per failed close, naming the agent and server.
  - `cleanupAllMcpServerInstances` removed. It had no product caller; the three test call sites now clean up the ids they open.
  - `AgentRunResourceManager`:
    - new required dependency `mcpServerInstances`;
    - `release()` starts the close once per run (the `mcpServersReleased` flag), after deactivating Agent Tools sessions, never awaited;
    - failures, including a synchronous throw, are warned with the run id;
    - the `mcpReleased` flag is renamed `mcpSessionsReleased`.
  - Both compositions inject `McpServerInstanceManager.getInstance()`.
  - Test constructions pass a no-op closer.
  - Docs: "Server Instance Lifetime" in `autobyteus-server-ts/docs/modules/mcp_server_management.md`.
- Changed files or areas: see the handoff's Key Files
- Local validation and result:
  - the new e2e was red on the base (IMP-00: 5 of 5 failed at their process assertions) and is green on the change;
  - see the handoff's Checks Run.
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small / Low)
- Remaining limitations or risks: an in-flight tool call of a run being terminated fails when its server closes; this is accepted, since the run is ending.
