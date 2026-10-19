# Requirements Document — Close a run's MCP server sessions when the run ends

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-run-session-cleanup`
- Request / ticket: Project Task `autobyteus-193`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user, 2026-10-19 ("autobyteus-193 requirements approved within the Task's direction …").
- Exact approved baseline: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: the MCP server sessions a run opens (stdio child processes and HTTP client sessions) stay alive after the run ends, until the app exits. Over a long desktop session this piles up idle server processes.
- Desired outcome: when a run ends on any runtime, its MCP server sessions close and their processes exit. Other runs are unaffected, and a run that is woken later gets its tools again.

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System | Non-native runs' MCP instances are never closed (F-1) | Closed when the run is released | Tool calls during the run |
| BEH-002 | System | Native runs close in the agent shutdown step (F-2) | Closed on release as well, so every removal path is covered | Native shutdown behavior |
| BEH-003 | System | A wake during a close may reuse the closing instance (F-3) | A woken run always gets a fresh, working instance | Lazy creation |
| BEH-004 | System | Instances are per run; the gateway shares one per server | Unchanged | Gateway reuse; preview/registration closing their own |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | A run that used MCP tools ends (stop/terminate, idle shutdown of a delegated copy, delete, replacement) on any runtime | SCN-001 |
| UC-002 | A run is woken after ending and uses its MCP tools again | SCN-002 |
| UC-003 | Two runs use the same MCP server; one ends | SCN-003 |

### Out Of Scope

- The gateway's shared `mcp-gateway/default` instances (bounded; one per server).
- App-exit cleanup (`cleanupAllMcpServerInstances` has no caller; child processes already end with the app, per the parity evidence "no process left after stop").
- The start timeout (autobyteus-194), the vault, and other MCP follow-ups.

### Non-Goals

No idle timeout for live runs; no pooling or sharing of servers across runs.

### Prerequisites

None.

### Preserved Behavior Boundary

BEH-004; MCP tool behavior during a run; native agent shutdown; `release()`'s existing results and idempotency.

### Review Authority

Standard (`ticket-scope.md` applies).

## Requirements

| ID | Requirement | Behaviors | Priority |
| --- | --- | --- | --- |
| REQ-001 | When a run is released (every way a run ends or is removed), all MCP server instances opened for that run close: stdio child processes exit and HTTP client sessions end. This holds for native, Claude, Codex, AGY and Grok runs. | BEH-001, BEH-002 | Must |
| REQ-002 | Closing a run's MCP instances never delays or fails the run's release. A close error is logged with the run id and server id. | BEH-001 | Must |
| REQ-003 | A run woken after release gets new, working MCP instances on its next tool call, even if the wake happens while the old instances are still closing. | BEH-003 | Must |
| REQ-004 | Ending one run does not close or disturb another run's MCP instances, nor the gateway's shared instances. | BEH-004 | Must |
| REQ-005 | Tests use the repository's real MCP test server (autobyteus-189) with its pid file, plus one isolated-app check with a copy of a user-kind `uv` server definition (never the user's configuration). Dummy values only. | — | Must |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Unit: `AgentRunResourceManager.release(runId)` with an MCP closer dependency | The closer is asked to close for `runId` exactly once; a second release (`already_released`) does not ask again | Server unit test |
| AC-002 | REQ-001 | SCN-001 | Server e2e: a run calls a stdio tool of the real test server (pid file), then is terminated | The pid is gone within a few seconds of termination; before the change it stays (red first) | Server e2e with the scripted AGY CLI (no model) |
| AC-003 | REQ-001 | SCN-001 | The same per runtime available here (native via LM Studio; Claude, Grok via live gates; Codex via its MCP client as in 181 if its model turn is unavailable) | Pid gone after termination in every available runtime; an unavailable runtime is reported "not run" with the reason | Gated e2e (extend the 181 matrix suite or a sibling) |
| AC-004 | REQ-001 | SCN-001 | Delete of a stopped run, and idle shutdown of a delegated copy | Pid gone | Server e2e |
| AC-005 | REQ-003 | SCN-002 | Terminate a run, then immediately wake it and call the stdio tool | The call succeeds on a new pid. Core unit: `getServerInstance` during a pending cleanup returns a new instance, not the closing one | Core unit + server e2e |
| AC-006 | REQ-004 | SCN-003 | Runs A and B both use the stdio test server; terminate A | B's pid stays alive and B's next call works; a gateway call still works | Server e2e |
| AC-007 | REQ-002 | SCN-001 | A closer that throws | `release` still returns `released`; a warning names the run and server | Server unit |
| AC-008 | REQ-001, REQ-005 | SCN-001 | Isolated app (worktree build), a copied user-kind `uv` server (e.g. a copy of `pptx-mcp`, list/read-only), two runs on two runtimes, then stop both | Child process count back to the baseline after stop (`ps`), before stopping the app | Isolated-app evidence |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | User or the system (idle shutdown) | End a run | Stop, terminate, delete, idle shutdown of a delegated copy, replacement | The run's MCP processes exit | Supported Normal |
| SCN-002 | User | User | Continue a stopped run | Send a message to it (restore) | Tools work again | Supported Normal; wake right after stop: Supported Explicit Edge |
| SCN-003 | User | Several runs | Work in parallel | One ends | Others unaffected | Supported Normal |

## UI, Interaction, And Experience Requirements

Not applicable.

## Quality And Non-Functional Requirements

| ID | REQ | Area | Constraint |
| --- | --- | --- | --- |
| QR-001 | REQ-001 | Reliability | No stdio MCP child process of an ended run is alive 10 s after its release |

## Data Continuity And Acceptable Loss

Not affected (in-memory sessions only).

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Where to hook the cleanup | `AgentRunResourceManager.release()` is the documented path every run removal goes through, and it already releases the run's Agent Tools MCP sessions. MCP instances are keyed by the run's `runId` on every runtime (`agentRunId: this.runId`; native `agentId === runId`). One hook there covers all runtimes and all end paths | Solution Designer | Decided |
| DEC-002 | Block release on the close? | No: `release` is synchronous and must not fail on a close error. Start the close, log failures | Solution Designer | Decided |
| DEC-003 | Wake during close | Remove the run's entries from the instance map before closing them, so a wake always creates new instances | Solution Designer | Decided |
| DEC-004 | Gateway shared instances | Leave them: bounded, intended reuse, not per run | Solution Designer | Decided |
| DEC-005 | Remove the native shutdown step's cleanup as now redundant? | No: native agents can also shut down outside a run release (e.g. agent-level shutdown inside `autobyteus-ts`). The two cleanups are idempotent | Solution Designer | Decided |

## Traceability

| REQ | UC | AC | SCN |
| --- | --- | --- | --- |
| REQ-001 | UC-001 | AC-001…AC-004, AC-008 | SCN-001 |
| REQ-002 | UC-001 | AC-007 | SCN-001 |
| REQ-003 | UC-002 | AC-005 | SCN-002 |
| REQ-004 | UC-003 | AC-006 | SCN-003 |
| REQ-005 | all | AC-002…AC-006, AC-008 | all |

## Readiness Check

All checks: Yes. All decisions are within the direction. Approval recorded. Ready for design.
