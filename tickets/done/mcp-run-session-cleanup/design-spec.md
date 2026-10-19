# Design Spec — Close a run's MCP server sessions when the run ends

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the direction; user informed 2026-10-19)
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup/tickets/in-progress/mcp-run-session-cleanup/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup/DESIGN.md`, `TESTING.md`
- Conflicts or discrepancies: none

## Current-State Read

MCP server instances live in the `autobyteus-ts` singleton `McpServerInstanceManager`, keyed by agent id, which is the run's `runId` on every runtime (investigation F-1/F-2). `AgentRunResourceManager.release(runId, run)` in `autobyteus-server-ts` is the single path every run removal goes through. It already releases the run's Agent Tools MCP sessions, but not the run's MCP **server** instances. Only native agents close theirs, in their own shutdown step.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale:
  - 1 core method changed (`cleanupMcpServerInstancesForAgent`: detach first, then close);
  - 1 server class gains one dependency and one call (`AgentRunResourceManager`);
  - 2 compositions pass the dependency;
  - tests (unit, plus e2e with the 189 test server).
- Architectural risk: `Low`
- Risk rationale:
  - The change extends an existing owner along an existing lifecycle boundary. No contract, persistence or deployment change.
  - The one concurrency aspect (a wake during a close) is removed by ordering (detach before close), not by new coordination.
- Escalation trigger: if some removal path does not go through `release()`, or some runtime keys instances by an id other than `runId`, return a Design Impact.

## Architecture Investigation Evidence

Investigation notes Source Log rows 2–10 (the instance map and cleanup, the caller list, the configured-MCP execution id, `agentRunId: this.runId`, native `agentId === runId`, `release()` and its callers, the two compositions).

## Intended Change

`release(runId)` also closes the run's MCP server instances, without blocking. The instance manager detaches a run's entries before closing them.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003.
  - `autobyteus-ts/src/tools/mcp/server-instance-manager.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts`
  - the two compositions: `agent-execution/runtime/general-process-run-supervisor.ts` and `application-platform/execution/application-execution-scope-kernel-builder.ts`
  - tests; a docs note in `autobyteus-server-ts/docs/modules/mcp_server_management.md`
- Deliberately left alone:
  - the gateway's shared scope (DEC-004);
  - `managedDiscoverySession`;
  - the native shutdown step (DEC-005);
  - `cleanupAllMcpServerInstances` (no caller; app-exit cleanup is out of scope).
- Follow-ups: `cleanupAllMcpServerInstances` has no caller. Either wire it into server shutdown or remove it as dead code. It's in a touched file, so per Core Principle 7 it **must be decided here**: see the Removal Plan.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Outcome | Spine |
| --- | --- | --- | --- | --- |
| BEH-001/002 | REQ-001/002; AC-001…004, AC-007, AC-008 | Run ends (any path) | Instances closed, processes exit | DS-001 |
| BEH-003 | REQ-003; AC-005 | Wake after or during the close | New instances | DS-002 |
| BEH-004 | REQ-004; AC-006 | Another run ends | Unaffected | DS-001 |

## Relevant Supplemental Task Artifacts

None. The test server comes from autobyteus-189 (`autobyteus-ts/tests/fixtures/mcp-test-server/`, `mcp-stdio-fixture-server.mjs`, pid file `MCP_TEST_SERVER_PID_FILE`).

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (resource leak)
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`. The owner of run removal (`AgentRunResourceManager`) releases every run resource except MCP server instances; their only cleanup sits in a native-only shutdown step.
- Refactor needed now: `No`. Extend the existing owner.
- Structural triggers:
  - Authoritative boundary: the server calls the instance manager's public cleanup method only.
  - Repeated coordination: none added.
- Design response: add "MCP server instances" to the run resources released in `release()`.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

`Not Affected`: in-memory only.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Run end (stop/terminate, idle shutdown, delete, replacement) | MCP server processes and sessions closed | `AgentRunResourceManager` | The leak |
| DS-002 | Bounded local | `cleanupMcpServerInstancesForAgent(runId)` | Map detached, then closes | `McpServerInstanceManager` | Wake-during-close safety |

## Primary Execution Spine(s)

- DS-001: `User stop / idle shutdown / delete → AgentRunManager / AgentRunActivationRegistry → AgentRunResourceManager.release(runId, run) → [existing: Agent Tools sessions, file changes, relay, memory, journal] + McpServerInstanceManager.cleanupMcpServerInstancesForAgent(runId) (started, not awaited) → StdioManagedMcpServer / HttpManagedMcpServer.close() → child process exits / HTTP session ends`
- DS-002: `cleanupMcpServerInstancesForAgent(agentId) → take and delete activeServers[agentId] → close each (await all, settle errors) → done`; a concurrent `getServerInstance(agentId, …)` sees no entry and creates a new instance.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | When a run is released, after deactivating its Agent Tools sessions, the resource manager asks the MCP closer to close every MCP server instance of `runId`. The close runs in the background; a failure is logged with the run id and does not change the release result. The step runs once per run, guarded like the existing `mcpReleased` flag. |
| DS-002 | The instance manager first removes the run's map, then closes the removed instances. Anything asking for the run's instances afterwards gets fresh ones. |

## Spine Actors / Main-Line Nodes

Run lifecycle (`AgentRunActivationRegistry`); `AgentRunResourceManager`; `McpServerInstanceManager`; the managed servers.

## Ownership Map

- `AgentRunResourceManager` owns *when* (release of a run).
- `McpServerInstanceManager` owns *which instances and how* (per-agent map, detach, close).

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Scope |
| --- | --- | --- |
| `McpServerInstanceManager.cleanupAllMcpServerInstances()` | Dead: no caller in `autobyteus-ts/src` or `autobyteus-server-ts/src` (grep). The file is touched, so it is decided here | In This Change. **Remove it**, unless implementation finds a caller (tests excepted). App-exit cleanup is out of scope, and child processes end with the app |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

DS-002.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Close error logging | `AgentRunResourceManager` | `console.warn` naming the run id and the error; never throws into `release` |

## Ownership Boundaries

`autobyteus-server-ts` may call only the public `cleanupMcpServerInstancesForAgent(agentId)` (through a narrow dependency type). It must not reach into `activeServers`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden |
| --- | --- | --- |
| `McpServerInstanceManager` | Instance map, detach and close order | Server code iterating or closing instances itself |

## Dependency Rules

- `AgentRunResourceManager` gets a dependency typed `mcpServerInstances: Pick<McpServerInstanceManager, "cleanupMcpServerInstancesForAgent">`, injected by both compositions with `McpServerInstanceManager.getInstance()` from `autobyteus-ts`.
- Unit tests inject a fake.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `AgentRunResourceManager` constructor dependencies | Adds `mcpServerInstances` |
| `AgentRunResourceManager.release()` result | Unchanged shape. Optional: no new field needed, since the close is asynchronous and its result is not part of release |
| `McpServerInstanceManager.cleanupMcpServerInstancesForAgent(agentId)` | Same signature; detach first, then close all with settled errors (`Promise.allSettled`) |

## Interface Boundary Check

Singular; the identity is the run id, explicit.

## Main Domain Subject Naming Check

`mcpServerInstances` (dependency name): natural.

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Per-run release point | Reuse `AgentRunResourceManager.release` |
| Closing per agent | Reuse `cleanupMcpServerInstancesForAgent` |
| Real process proof | Reuse the 189 test server and pid file; reuse or extend the 181 matrix suite for runtimes |

## Subsystem / Capability-Area Allocation

`autobyteus-ts` MCP tools (the detach order); server agent-execution (the release step).

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

`ResourceRecord` gains `mcpServersReleased: boolean`, alongside the existing `mcpReleased`. The name must make the difference from the Agent Tools sessions clear. Or rename the existing flag to `mcpSessionsReleased`, if implementation prefers clarity.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` | `cleanupMcpServerInstancesForAgent`: take the map, `delete` it, then `Promise.allSettled(close)`. Remove `cleanupAllMcpServerInstances` (dead) |
| `autobyteus-ts/tests/unit/tools/mcp/server-instance-manager.test.ts` | Detach-before-close: `getServerInstance` during a pending close returns a new instance |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | New dependency; in `release`, after the Agent Tools sessions, start the close once per run; log failures |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts`, `…/application-platform/execution/application-execution-scope-kernel-builder.ts` | Pass `McpServerInstanceManager.getInstance()` |
| `autobyteus-server-ts/tests/unit/agent-execution/services/agent-run-resource-manager.test.ts` (existing or new) | AC-001, AC-007 |
| `autobyteus-server-ts/tests/e2e/…/mcp-run-session-cleanup.e2e.test.ts` (new) | AC-002, AC-004, AC-005, AC-006 with the scripted AGY CLI and the 189 stdio fixture (pid file). The "before" proof: red on the base commit |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | Extend each runtime cell to terminate the run and assert the stdio pid is gone (AC-003) |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Note: a run's MCP server instances close when the run is released; the gateway's are shared |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

Existing folders.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Detach | `const map = this.activeServers.get(id); if (!map) return; this.activeServers.delete(id); await Promise.allSettled([...map.values()].map(s => s.close()));` | Closing first, deleting after (wake race) |
| Release | `void this.deps.mcpServerInstances.cleanupMcpServerInstancesForAgent(runId).catch(e => console.warn(\`MCP server close failed for run '${runId}': ${String(e)}\`))` | Awaiting it in `release`, or throwing |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `cleanupAllMcpServerInstances` "for later" | Rejected (dead code) |

## Change / Refactor Sequence

1. Core: detach-before-close, the unit test, removal of the dead method.
2. Server: the dependency and the release step, unit tests, wiring.
3. E2e: write it red first on the base, then green.
4. Extend the matrix suite.
5. Isolated-app process count (AC-008) in API/E2E.

## Key Tradeoffs

A non-blocking close keeps release fast and safe. The cost: a process may live a few seconds after release (QR-001 bounds it at 10 s).

## Risks

- A removal path that bypasses `release()` (escalation trigger).
- Closing an instance during an in-flight tool call of a run being terminated: the call fails. Acceptable, since the run is ending.

## Guidance For Implementation

- Prove red first: the e2e on the base commit shows the pid alive after termination.
- Use the 189 fixtures; dummy values; never the user's configuration.
- For AC-003, follow the 181 matrix gates. Report unavailable runtimes as "not run".
