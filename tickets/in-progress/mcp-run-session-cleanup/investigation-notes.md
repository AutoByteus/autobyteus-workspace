# Investigation Notes — Close a run's MCP server sessions when the run ends

## Investigation Meta

- Package identifier: `mcp-run-session-cleanup`
- Request / ticket: Project Task `autobyteus-193` (follow-up 3 of the autobyteus-181 round-2 parity validation)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup`, branch `codex/mcp-run-session-cleanup`, base `origin/personal` @ `fc93276e6f99c1f34843e5d4de7f656581850fc4` (fetched 2026-10-19); finalization target `origin/personal`
- Bootstrap: OK
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-19, this conversation): `SKILL.md` (updated), `references/ticket-scope.md`, `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`; `autobyteus-server-ts/docs/design/collaboration_model.md` not needed (no membership/delegation semantics change)
- Status: Complete for design

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-10-19 | Evidence | `origin/personal:tickets/done/mcp-sdk-1-32-upgrade/api-e2e-execution-coverage-report.md` L86, L155 | "4 VideoAudioServer sessions per side alive until stop (observation 3)", the same on 1.30.0 and 1.32.1, so pre-existing. One per runtime run in the matrix |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` | Instances are cached per `agentId` → `serverId` (`activeServers`), created lazily by `getServerInstance`. `cleanupMcpServerInstancesForAgent(agentId)` closes each and then deletes the map entry **after** awaiting the closes. `cleanupAllMcpServerInstances()` has no caller |
| 2026-10-19 | Code | `grep cleanupMcpServerInstancesForAgent` in `autobyteus-ts/src`, `autobyteus-server-ts/src` | The only caller is `autobyteus-ts/src/agent/shutdown-steps/mcp-server-cleanup-step.ts`, wired in `agent-shutdown-orchestrator.ts` L15: native AutoByteus agents only |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/tool.ts` L55-57; `server/proxy.ts` L21 | An MCP tool call creates or gets the instance for `context.agentId` |
| 2026-10-19 | Code | `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts` L44, L61-62 | Claude, Codex, AGY and Grok runs call configured MCP tools through the Agent Tools MCP endpoint with `agentId = session.owner.collaborationIdentity?.agentRunId || session.owner.runId`. **Nothing closes these instances**: the leak |
| 2026-10-19 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` L150, L236 | `runId` from context; the collaboration identity sets `agentRunId: this.runId`. So the MCP instance key for configured tools **is the AgentRun's `runId`** |
| 2026-10-19 | Code | `…/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` L208-218 | The native agent id must equal `runId`. Same key |
| 2026-10-19 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` L46-138 | `release(runId, run)`: "Told after a run's attachments are released, **which every removal of a run goes through**". It already deactivates the run's Agent Tools MCP sessions (`runSessions.deactivateForRun`), detaches file changes, artifact relay, memory and journal, then notifies a lifecycle observer. Synchronous, idempotent per run (`released` WeakSet) |
| 2026-10-19 | Code | `agent-run-activation-registry.ts` L161-249 | All `release` callers: termination, failed activation, replacement, removal |
| 2026-10-19 | Code | `general-process-run-supervisor.ts` L206; `application-platform/execution/application-execution-scope-kernel-builder.ts` L99 | The two compositions that construct `AgentRunResourceManager` |
| 2026-10-19 | Code | `src/mcp-gateway/mcp-gateway-tool-executor.ts` L7, L39 | The gateway uses one fixed scope `mcp-gateway/default`: one instance per server shared by all gateway calls, bounded by the number of servers, not per run. Not a per-run leak |
| 2026-10-19 | Code | `server-instance-manager.ts` `managedDiscoverySession` | Preview and registration close their own instance (`finally close`). Not a leak |
| 2026-10-19 | Code | `autobyteus-ts/src/agent/bootstrap-steps/mcp-server-prewarming-step.ts` L52 | Native agents prewarm instances under their `agentId` (= `runId`) |
| 2026-10-19 | Code (189) | `autobyteus-ts/tests/fixtures/mcp-test-server/server.py`, `mcp-stdio-fixture-server.mjs`, `MCP_TEST_SERVER_PID_FILE` | A real stdio test server with a pid file exists for process-exit proofs |

## Findings

- F-1 (the leak): MCP server instances created for non-native runs (Claude, Codex, AGY, Grok) through the Agent Tools endpoint are never closed when the run ends. A child process per run and server (stdio), or an open client session (HTTP), stays until the app exits.
- F-2 (native): native runs close their instances in the agent shutdown step, **if** every native termination path runs the shutdown orchestrator. Not proven for every path (stop, delegated-copy idle shutdown, delete); the universal release hook covers it either way.
- F-3 (race): `cleanupMcpServerInstancesForAgent` deletes the map entry only after the closes finish. A run woken (restored) during the close would get the closing instance from `getServerInstance` and fail. A wake right after a stop is a supported sequence.
- F-4 (shared): instances are per run, so closing run A's instances never affects run B, even for the same server. The gateway's shared scope is separate and bounded.

## Prerequisite Check

None: the owner (`AgentRunResourceManager.release`) and the closer (`McpServerInstanceManager`) both exist.
