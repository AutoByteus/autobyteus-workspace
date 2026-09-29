# Investigation Notes

## Investigation Meta

- Package identifier: `runtime-stop-cleanup-and-org-recovery`
- Owner: Solution Designer (`/solution_designer`)
- Date: 2026-09-29
- Task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery`
- Branch: `codex/runtime-stop-cleanup-and-org-recovery` (created as `codex/agy-background-process-cleanup`, renamed before any artifact commit when the user expanded the scope)
- Base: `origin/personal` @ `5d6179797` (fetched 2026-09-29)
- Finalization target: `personal`
- Live environment probed: installed AutoByteus `1.4.91-beta.5` (server `--port 29695`, data dir `/Users/normy/.autobyteus/server-data`), AGY CLI 1.2.12, model `gemini-3.8-flash-high`.
- Predecessor package (read-only): `origin/personal:tickets/done/agy-background-task-turn-liveness/` (delivered; receipt verified — see `predecessor-delivery-receipt-verification.md`).

## Initial Request And Clarifications

1. Request relayed by `/api_e2e_engineer` (2026-09-29): "When the Antigravity runtime is stopped, the background process it started should also be stopped." The user previously deferred F-API-001 and now wants it fixed.
2. User instruction (2026-09-29): in this new ticket, also fix the Agent Org termination problem diagnosed earlier, if it still exists.

## Source Log

| Source | Observation |
| --- | --- |
| `origin/personal:tickets/done/agy-background-task-turn-liveness/api-e2e-execution-coverage-report.md` (F-API-001) + `evidence/live-bg-001-scn-001.json`, `live-bg-003-stop.json` | After `terminateAgentRun` on an idle AGY run, a daemon started via `run_command IsDaemon` keeps listening (`daemonListeningAfterTerminate: true`, 2 runs). Raw AGY SIGTERM after `result` and mid-turn: daemon survives, reparented to PID 1. The Stop case only killed the daemon because Stop came 0.4 s after start, before AGY backgrounded it. |
| API/E2E raw-AGY feasibility probe (relayed) | AGY starts each background command in its own session/process group (pgid = sid = shell pid ≠ AGY pid); the command tree shares that group; while AGY is alive, AGY's descendants (ppid chain) reveal those groups; SIGTERM to each group then to AGY closed the port with no leftovers. macOS only. |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` @ base | `stop()` = `child.kill("SIGTERM")`; also called from `fail()` (process close/error/protocol failure). Single owner of the AGY child. |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` lines ~168–176 | Documents F-API-001 as a known limitation and the process-group mechanism for a future fix. |
| `git diff personal origin/personal` over org/team/agent-execution termination code | No change since the 2026-09-28 diagnosis. |
| Live probe L1 (below) | Org Terminate defect still reproduces on beta.5 without any watchdog. |
| Live probe L2 (below) | A crashed member inside an active Org cannot be continued by messaging it. |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts` | Handle activation mode is fixed at Org materialization. In `fresh` mode an external-runtime member with existing local history is rejected with `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING` even when `platformAgentRunId` is persisted. `restore` mode would use `restore_external`. |
| `agent-execution/services/agent-run-manager.ts` `prepareAgentRunTermination` / `isCurrentPublishedRun`; `agent-execution/runtime/agent-run-activation-registry.ts` `getActiveRun` | Registry drops an inactive run on discovery; a later termination of the stale run object is rejected "not the current published run". |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` `prepareTermination` | Handle keeps its stale `agentRun` and calls `manager.prepareAgentRunTermination(this.agentRun)` → rejection. |
| `agent-org-execution/domain/agent-org-run.ts` `terminate` / `terminateOnce`; `frozen-agent-org-termination-scope.ts` | Lifecycle set to `terminating` before local teardown; `finish()` rejection escapes `terminateOnce` before `lifecycle = "terminated"` / `onTerminated`; `this.termination` caches the rejected attempt → every retry fails identically; Org stays in the manager's active map. |
| `agent-org-execution/services/agent-org-run-manager.ts` | `restore` → `assertNotActive` (map membership) → "already active"; `getActive`/inspection use `run.isActive()` (lifecycle) → inactive. UI (`autobyteus-web/stores/agentOrgContextsStore.ts` `accessFor`) treats the Org as historical/continuable and calls restore. |

## Relevant Existing Behavior

- CUR-1 (AGY daemons): Stop/Terminate/app shutdown end the AGY process but AGY-backgrounded commands survive (F-API-001). Predecessor ASM-001 and CUR-6 are falsified.
- CUR-2 (AGY crash): if AGY exits on its own, its background commands are already orphaned; the descendant walk can no longer find them.
- CUR-3 (Org Terminate with a dead member): Terminate fails "Agent run '…' is not the current published run."; Org left registered but inactive; retries fail identically; restore fails "already active"; only an app restart recovers.
- CUR-4 (message a crashed member in an active Org): rejected `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING` although the provider conversation id is persisted.
- CUR-5: A normal turn end leaves AGY daemons running (approved in predecessor REQ-003; preserved).

## Runtime, Probe, Or Reproduction Findings

Probe helpers are preserved in `probes/` (`gql.sh`, `org-send.mjs` (org WebSocket `SEND_MESSAGE` client), `create-nested-classroom-agy-org.json`). The Org used is the `nested-classroom-test` fixture with every member on `antigravity_cli`, workspace `/tmp/agy-probe/org-ws`.

- L1 (Org `nested_classroom_test_org_5362f2f961c94cb7bda36beb30c332ab`): create → message `/Teacher` ("Reply with exactly OK") → AGY pid 87984 started, turn completed → `kill -9 87984` (simulated crash) → config `isActive:true`, inspection `is_active:true` → `terminateAgentOrgRun` = `success:false` "Agent run 'test_teacher_a6dfd612201649208d2ebe9b940b7cce' is not the current published run." → config `isActive:true`, inspection `is_active:false` → second terminate: same failure → `restoreAgentOrgRun`: "AgentOrg '…' is already active." Exact incident signature, reproduced on beta.5 without the removed watchdog.
- L2 (Org `nested_classroom_test_org_78c9853167404e13a594a961a4e48b77`): create → message `/Teacher` → AGY pid 92893 → `kill -9` → new `SEND_MESSAGE` to `/Teacher` → ACK `state:"rejected"`, `code:"COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING"`; persisted `platformAgentRunId` = `3c225dda-2086-4c41-b137-77c640d98f84` (binding exists).
- Both disposable Orgs remain in the running app (L1 stuck; L2 active with a dead member). They clear from memory on app restart and can then be deleted from history.
- The crashed member in L1/L2 is a root-level Org agent (`/Teacher`); Team-member placement was not probed (same handle type is used for Team members; to be confirmed during design).

## External Contracts And Dependencies

- AGY 1.2.12 background-task process model (own process group per background command) — observed, undocumented.
- `ps`-style process table access on macOS/Linux; no Windows-specific AGY handling exists in the codebase.

## Persisted Data And State Facts

- Org execution tree persists `platformAgentRunId` per member (L2). No schema change anticipated.

## Assumptions, Unknowns, And Risks

- Commands that detach themselves further (`setsid` inside the command, Docker containers, launchd/systemd services) leave AGY's process groups and cannot be found — candidate documented limit.
- Windows behavior not probed.
- Codex/Claude background-process behavior on stop not probed (out of this package unless the user adds it).
- Team (non-Org) roots likely share the handle/termination code and defect; to be confirmed in design.

## Supplemental Artifact Inventory

| Path | Purpose | Status |
| --- | --- | --- |
| `probes/gql.sh`, `probes/org-send.mjs`, `probes/create-nested-classroom-agy-org.json` | Reproduce L1/L2 against a running server | Evidence; reusable by API/E2E |
| `predecessor-delivery-receipt-verification.md` | Terminal verification of `agy-background-task-turn-liveness` | Record |

## Requirement Implications

- New intended behavior for both areas; explicit user approval required (see `requirements-doc.md`, Ready for Approval).
