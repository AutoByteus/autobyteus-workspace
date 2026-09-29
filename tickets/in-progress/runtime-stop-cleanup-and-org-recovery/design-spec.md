# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revised for ARCH-REV-001 round 1: AR-001, AR-002, notes R-1..R-8)
- Approved requirements baseline: `requirements-doc.md` SR-001, approved by the user 2026-09-29 (option A basic AGY cleanup + Org/Team recovery; DEC-001..DEC-006 resolved)
- Behavior-defining supplements: N/A — none
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/investigation-notes.md`

## Current-State Read

**A — AGY background processes.** `AgyStreamProcess` is the single owner of the AGY child. `stop()` sends `SIGTERM` to AGY only. AGY puts each background command in its own session/process group, so those groups survive AGY and are reparented to PID 1 (F-API-001). Every AutoByteus-initiated stop (user Stop via `AgyAgentRunBackend.interrupt`, `terminate`, dispatch failure, listener failure, and stream/protocol `fail()`) funnels into `AgyStreamProcess.stop()`. App/server shutdown reaches it through the run/Team/Org `stopAll*` paths → `terminate`.

**B — Org/Team recovery.** `ConfiguredAgentExecutionHandle` is the root-neutral owner of one member's `AgentRun`. It is used directly for Org root agents and via `FlatTeamAgentExecutionHandle` for every Team member (standalone Teams and Teams inside Orgs). When a member's runtime dies:

1. `AgentRunActivationRegistry.getActiveRun` removes the inactive run on discovery (`removeIfCurrent`, reason `inactive_discovery`, releases its resources). The handle keeps its stale `agentRun` reference.
2. **Terminate (B1):** `handle.prepareTermination()` calls `AgentRunManager.prepareAgentRunTermination(staleRun)`. That rejects with "not the current published run". The rejection escapes `AgentOrgRun.terminateOnce` after `lifecycle = "terminating"`. The Org caches the rejected `termination`, and its frozen scope caches `finishing`, so every retry fails the same way. The Org stays in `AgentOrgRunManager.active` while `isActive()` is false. Restore then throws "already active" (`assertNotActive`). `AgentTeamRunManager.restoreTeamRun` has the identical "already managed" guard. `RootTeamRun.terminate` already clears a failed attempt, but a retry hits the same stale handle.
3. **Continue a crashed member (B3):** `ensureReady()` correctly re-activates when `agentRun` is inactive. However the planner's `mode` is fixed at handle construction. It is `fresh` for newly created Orgs/Teams, so an external runtime with existing history is rejected with `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`, although the provider binding (`platformAgentRunId`) is persisted. `restore` mode would plan `restore_external`.

Evidence: investigation notes (Source Log; probes L1, L2).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale (SR-003: the file count grows by `team-run-service.ts` and `flat-team-execution-manager.ts`, and stays Medium): about 10 production files across two areas. AGY stream owner plus one new helper. Collaboration handle and planner. Org run domain and its frozen termination scope. Org and Team run managers. Plus focused unit tests and one doc. Everything stays inside existing owners.
- Architectural risk: `High`
- Risk rationale: changes shared lifecycle/termination semantics used by every Org and Team root and member across all runtimes. Concurrency and ordering (termination fencing, retry, restore-after-stuck) are affected. It also introduces OS-level signalling of process groups. Blast radius covers all collaboration roots.
- Escalation trigger: if a dead-member termination cannot be treated as completed without skipping required cleanup, or if restore-after-stuck needs changes beyond the manager transition, return `Design Impact`. The same applies if the planner mode change alters first-activation behavior of any runtime (native or external), or if process-group discovery can select a group outside the AGY run.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| API/E2E F-API-001 + raw probe | AGY background groups: pgid = sid ≠ AGY; found via ppid chain while AGY alive; group SIGTERM clears port | D-A1 |
| `agy-stream-process.ts` | all AutoByteus stops funnel into `stop()` | D-A1 placement |
| L1 + handle/manager code | stale `agentRun` → "not the current published run" → Org wedged | D-B1, D-B3, D-B4 |
| L2 + planner code | fixed `fresh` mode rejects re-activation with persisted binding | D-B2 |
| `root-team-run.ts` | Team root already clears failed termination; same handle | D-B1 covers Teams (DEC-004) |
| Team manager `restoreTeamRun` | "already managed" guard identical to Org | D-B4 applies to Teams |

## Intended Change

- **D-A1 — Stop AGY's background process groups with AGY.** Revision SR-003 adds R-1..R-3; see the Concrete Examples. A new small helper in the AGY stream folder does two things. First, it synchronously lists the process table (`ps -A -o pid=,ppid=,pgid=`, 2 s timeout). Second, it returns the distinct process-group ids of AGY's live descendants, excluding AGY's own group, the server's own group, and pgid ≤ 1. `AgyStreamProcess.stop()` calls it while the child is still alive, sends `SIGTERM` to each group (`process.kill(-pgid, "SIGTERM")`), then sends `SIGTERM` to AGY as today. After about 1.5 s, a non-blocking follow-up sends `SIGKILL` to any of those groups that still exist. The child counts as alive only when `child.exitCode === null && child.signalCode === null` (R-1). Groups are selected only when the group id equals the pid of a live AGY descendant (the group leader descends from AGY; R-3; PR-004). `signalProcessGroups` catches `ESRCH`/`EPERM` for each group independently (R-2). There is no `ps` re-verification before the delayed `SIGKILL`; the reviewer accepted the pgid-reuse risk (PR-003). The helper is skipped on `win32`, and when the child has already exited (crash: documented limitation, DEC-001). Any helper error is swallowed after a warning, and AGY is still stopped (fail-safe).
- **D-B1 — Dead-member termination completes.** In `ConfiguredAgentExecutionHandle`, a "stale run" is an `agentRun` that the manager no longer publishes (`manager.getActiveRun(runId) !== agentRun`). For a stale run, `prepareTermination()` and `tryPrepareTerminationIfQuiescent()` return the existing `completedLocalTermination(() => this.dispose())`, and `fenceForRootShutdown()` returns `{ accepted: true }`. In `fenceForRootShutdown`, `rootShutdownFenced = true` and the readiness wait stay **before** the stale short-circuit, so task-engine shutdown cannot re-activate a dead member through `ensureReady` (R-5). `getActiveRun` may throw `AgentRunRemovalCleanupError` on first discovery. Log it (`COLLABORATION_STALE_RUN_DISCOVERY_FAILED`) and let it surface; with D-B3 the retry then completes. The registry has already released the run's resources on discovery. Published runs keep today's path unchanged.
- **D-B2 — Re-activation after a death restores.** The handle's activation mode becomes per-attempt. The handle starts with its constructor mode and switches to `restore` after its first successful publication, at **both** publication sites: `initializeReady` (after `commitPublication()`) and `prepareConfiguredActivation().commitAfterDurability` (eager materialization) (R-4). `ConfiguredAgentActivationPlanner.prepare` receives the mode for the attempt (constructor-held mode removed). A crashed external member therefore plans `restore_external` with its persisted `platformAgentRunId`, and a native member plans `restore_native`. First activation is unchanged.
- **D-B3 — Org termination retry is not permanently cached.** `AgentOrgRun.terminate` follows `RootTeamRun`:
  - It clears `this.termination` when the attempt rejects or is not accepted.
  - The fail-stop origin is kept in a persistent private field `failStopped`. `enterFailStop` sets it, and every termination attempt reads it instead of deriving `wasFailStopped` from the current lifecycle. A retry after a failed fail-stop attempt therefore still uses the fail-stop settlement path (`taskEngine.drain()`, not `shutdownAndSettle`) and returns accepted (AR-002; matches `RootTeamRun.failStopped`).
  - `createFrozenAgentOrgTerminationScope` clears `fencing` and `finishing` when they reject or are not accepted.
  - Team frozen scope (`flat-team-execution-manager.ts` `createFrozenTerminationScope`): `finishing` is already cleared on failure, so apply the same rule to `fencing` only (R-8).
  - Clearing a scope's `fencing` does not reset a per-`AgentRun` root-shutdown fence (irreversible latch). A live, non-stale run whose fence settled as not accepted can still block retries. That is outside this ticket's dead-member scope and recorded as a residual risk (R-6).
- **D-B4 — Restore self-heals a registered-but-stopping root.** The manager is the single authority. For Teams, the pre-transition guard `if (this.manager.hasManagedTeamRun(normalized)) throw "already managed and cannot be restored"` in `TeamRunService.restoreTeamRun` (`team-run-service.ts`) is removed, so the product path GraphQL `restoreAgentTeamRun` → `TeamRunService.restoreTeamRun` → `AgentTeamRunManager.restoreTeamRun` reaches the self-heal (AR-001). The Org path already has no pre-guard (`AgentOrgRunService.restore` → manager). `TeamRunService.resolveActiveTeamRun` and `resolveManagedTeamRun` stay **unchanged**: they are not the UI's restore entry, and making them restore would let a message sent during a normal user Terminate bring the Team back. In `AgentOrgRunManager.restore` and `AgentTeamRunManager.restoreTeamRun`, inside the existing per-root transition, the manager first checks for a registered root whose `isActive()` is false (terminating / fail-stop). It awaits that root's `terminate()`. If accepted, it unregisters the root if still registered and proceeds with the normal restore. Otherwise it throws `…_STOP_INCOMPLETE: <reason>` and does not throw "already active". It must use the internal terminate logic without re-entering `withTransition` (no deadlock). A registered root that is still active keeps today's "already active/managed" error.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Existing | Change | Target path |
| --- | --- | --- | --- | --- | --- |
| BEH-A1 | REQ-A1, A2 / AC-A1..A3 | Stop, Terminate, shutdown, stream failure | CUR-1 | D-A1 | S-A: backend `interrupt`/`terminate`/failure → `AgyStreamProcess.stop()` → helper → group SIGTERM → AGY SIGTERM |
| BEH-A2 | REQ-A3 | AGY self-exit | CUR-2 | none (documented) | S-A `fail()` after close: helper finds no descendants |
| BEH-B1 | REQ-B1, B2, B4 / AC-B1, B2, B4 | Org/Team Terminate with dead member; then message | CUR-3 | D-B1, D-B3, D-B4 | S-B1: `terminateAgentOrgRun` → manager.terminate → `AgentOrgRun.terminate` → frozen scope → handle.prepareTermination (stale → completed) → unregister; then restore → S-B2 |
| BEH-B2 | REQ-B3 / AC-B3 | Message to dead member in active Org/Team | CUR-4 | D-B2 | S-B2: SEND_MESSAGE → handle.reserveInput/postMessage → ensureReady → planner.prepare(mode=restore) → restore_external/native |

## Relevant Supplemental Task Artifacts

| Path | Purpose | Relationship |
| --- | --- | --- |
| `probes/gql.sh`, `probes/org-send.mjs`, `probes/create-nested-classroom-agy-org.json` | Reproduce L1/L2 against a live server | Acceptance evidence for AC-B1..B3 (live) |
| `origin/personal:autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts` | Records `daemonListeningAfterTerminate/Stop` | Becomes pass/fail for AC-A1/A2 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (B) + `Behavior Change` (A)
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`. The handle assumes its `agentRun` stays published until the handle itself terminates it, and assumes activation mode never changes after construction. Neither holds once a runtime dies. A is a missing ownership rule: the AGY process owner doesn't own the processes AGY spawns into separate groups.
- Refactor needed now: `No` (targeted invariant fixes inside existing owners)
- Evidence: L1, L2, F-API-001, code references above.
- Design response: D-A1, D-B1..D-B4.
- Intentional deferrals: AGY crash orphan cleanup (DEC-001); Windows (DEC-003); detached commands (DEC-002); other runtimes (DEC-005). Residual: if the app process is killed hard (SIGKILL / crash), neither AGY nor its groups are cleaned. Only graceful shutdown is covered.

## Terminology

- Stale run: an `AgentRun` referenced by a handle but no longer published by `AgentRunManager` (runtime died and was discovered inactive).
- AGY background group: a process group whose leader descends from the live AGY process and differs from AGY's own group.

## Legacy Removal Policy (Mandatory)

No compatibility paths. The planner's constructor-held `mode` is removed (replaced by the per-attempt argument), with no dual API. The AGY runtime doc's "known limitation / future fix" text for F-API-001 is replaced by the implemented behavior and the remaining documented limits.

## Persisted Data / State Transition Decision

`No Migration Required`. No schema change. Restore uses the persisted `platformAgentRunId` and execution trees as-is.

## Data-Flow Spine Inventory / Primary Spines

- S-A (AGY stop), S-B1 (root terminate with dead member), S-B2 (member re-activation), S-B3 (restore of a registered-but-stopping root) — see behavior map.

## Spine Narratives (Mandatory)

- **S-A:** Any AutoByteus-initiated stop calls `AgyStreamProcess.stop()`. If the child is alive and the platform isn't Windows, the helper lists descendants and sends `SIGTERM` to their groups. Then AGY gets `SIGTERM`, and a delayed `SIGKILL` sweep hits the same groups. `child = null` as today. Normal turn end never calls `stop()`, so daemons keep running (REQ-A2).
- **S-B1:** Org Terminate first fences handles; a stale handle returns accepted. The Team/Org scope then finishes, and the stale handle yields completed termination and disposes itself. Healthy handles terminate normally. Next the Org reaches `terminated`, `onTerminated` unregisters it, and history records the termination. If any step still fails, the cached attempt/scope are cleared so a later Terminate or restore (S-B3) re-runs them.
- **S-B2:** A message to a dead member calls `ensureReady()` (inactive `agentRun`). The planner prepares with `restore`, the external binding is reused, and the new `AgentRun` is published and bound. The member continues its AGY conversation (`--conversation <id>`) while other members are untouched.
- **S-B3:** The UI sees an inactive Org and calls restore. The manager, inside its transition, finds the root registered but not active, completes termination (S-B1), unregisters it, and restores as usual.

## Ownership Map

| Concern | Owner |
| --- | --- |
| AGY child + its background groups | `AgyStreamProcess` (+ private helper `agy-background-process-groups.ts`) |
| Member AgentRun lifecycle, stale detection, activation mode | `ConfiguredAgentExecutionHandle` |
| Plan selection from mode + conversation state | `ConfiguredAgentActivationPlanner` (mode per call) |
| Org termination attempt/retry | `AgentOrgRun`, `createFrozenAgentOrgTerminationScope` |
| Root registration, restore self-heal | `AgentOrgRunManager`, `AgentTeamRunManager` |
| Team restore entry (no competing pre-guard) | `TeamRunService.restoreTeamRun` delegates to the manager |

## Removal / Decommission Plan (Mandatory)

| Item | Action |
| --- | --- |
| `ConfiguredAgentActivationPlanner` constructor `mode` field | Replace with per-call argument |
| F-API-001 "known limitation / future fix" paragraph in `docs/modules/antigravity_cli_runtime.md` | Replace with implemented behavior + remaining limits |
| Caching of rejected/unaccepted Org termination attempt and frozen-scope promises | Remove (clear on failure) |

## Off-Spine Concerns

- History: `recordTerminated` / `recordRestored` flows unchanged.
- Presentation/stream: the Org/Team lifecycle events published on termination are unchanged.
- Logging: warn once when the process-group helper fails (`AGY_BACKGROUND_GROUP_STOP_FAILED`); no user-facing change.

## Ownership Boundaries / Encapsulation / Dependency Rules

- The helper is private to the AGY stream folder. It may import only `node:child_process` and `node:process`, and must not be imported outside `backends/antigravity`.
- The handle uses only `AgentRunManager` public methods (`getActiveRun`), with no new registry access.
- Managers must not reach into Org/Team internals beyond `isActive()` and `terminate()`.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `AgyStreamProcess.stop(): void` | Unchanged signature; also stops background groups |
| `ConfiguredAgentActivationPlanner.prepare(config, platformAgentRunId, mode)` | Adds `mode`; constructor loses `mode` |
| Handle public methods | Unchanged signatures |
| `TeamRunService.restoreTeamRun` | Unchanged signature; pre-transition `hasManagedTeamRun` guard removed (manager decides) |
| `TeamRunService.resolveActiveTeamRun` / `resolveManagedTeamRun` | Unchanged (explicit) |
| `AgentOrgRunManager.restore`, `AgentTeamRunManager.restoreTeamRun` | Unchanged signatures; new self-heal and a new error code `AGENT_ORG_STOP_INCOMPLETE` / `TEAM_RUN_STOP_INCOMPLETE` in place of "already active/managed" for non-active registered roots |
| GraphQL / WebSocket / web | No change |

## Existing Capability Reuse Check

Reuses `completedLocalTermination`, `manager.getActiveRun` (with its inactive discovery and resource release), planner `restore` mode, and the `RootTeamRun` retry pattern.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` (new) | `listAgyBackgroundProcessGroups(agyPid, ownPgid)` and `signalProcessGroups(pgids, signal)`; `ps` parsing, filtering, win32 skip |
| `.../antigravity/stream/agy-stream-process.ts` | `stop()` uses the helper before killing AGY; delayed SIGKILL sweep (unref'd timer) |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Stale-run detection (D-B1); per-attempt activation mode (D-B2) |
| `.../backends/configured-agent-activation-planner.ts` | Mode per `prepare` call |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` | Clear failed termination attempt; persistent `failStopped` field (D-B3, AR-002) |
| `.../agent-org-execution/domain/frozen-agent-org-termination-scope.ts` | Clear failed `fencing`/`finishing` (D-B3) |
| `.../agent-org-execution/services/agent-org-run-manager.ts` | Restore self-heal (D-B4) |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Restore self-heal (D-B4) |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Remove the pre-transition `hasManagedTeamRun` restore guard (AR-001); `resolveActiveTeamRun`/`resolveManagedTeamRun` unchanged |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts` | Frozen scope: clear failed `fencing` (R-8) |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` (+ Org/Team module docs if they describe termination) | Doc sync |
| Tests (unit) | Helper (fake `ps` output incl. unrelated processes, own group, pgid 1, win32); `AgyStreamProcess.stop` ordering; handle stale-run terminate/fence/re-activation with fake manager; planner mode per call; Org terminate retry after a failing then succeeding handle; fail-stop → first attempt fails → retry takes the fail-stop path and returns accepted (AR-002); Org/Team manager restore self-heal; **Team service-level**: registered-but-inactive root → `TeamRunService.restoreTeamRun` → restored (AR-001); still-active managed Team → `restoreTeamRun` rejects as today; helper `ESRCH`/`EPERM` per group continues with the others (R-2); handle mode switch at both publication sites (R-4); fence ordering, where a fenced stale handle never calls `ensureReady` (R-5) |

## Concrete Examples / Shape Guidance

```ts
// agy-background-process-groups.ts (shape)
export const listAgyBackgroundProcessGroups = (agyPid: number, ownPgid: number): number[] => {
  if (process.platform === "win32") return [];
  const out = execFileSync("ps", ["-A", "-o", "pid=,ppid=,pgid="], { encoding: "utf8", timeout: 2000 });
  const rows = parse(out);                          // {pid, ppid, pgid}[]
  const agyPgid = rows.find(r => r.pid === agyPid)?.pgid;
  const descendants = walk(rows, agyPid);            // BFS over ppid
  const descendantPids = new Set(descendants.map(r => r.pid));
  return unique(descendants.map(r => r.pgid))
    .filter(g => g > 1 && g !== agyPgid && g !== ownPgid && descendantPids.has(g)); // R-3: leader descends from AGY
};
export const signalProcessGroups = (pgids: number[], signal: NodeJS.Signals): void => {
  for (const g of pgids) { try { process.kill(-g, signal); } catch (e) { /* ESRCH/EPERM: skip this group only (R-2) */ } }
};

// AgyStreamProcess.stop()
stop(): void {
  const child = this.child; this.child = null;
  if (!child) return;
  let groups: number[] = [];
  if (child.exitCode === null && child.signalCode === null && child.pid) {   // R-1
    try { groups = listAgyBackgroundProcessGroups(child.pid, ownProcessGroupId()); signalProcessGroups(groups, "SIGTERM"); }
    catch { console.warn("AGY_BACKGROUND_GROUP_STOP_FAILED"); }
  }
  child.kill("SIGTERM");
  if (groups.length) setTimeout(() => signalProcessGroups(groups, "SIGKILL"), 1500).unref();
}

// ConfiguredAgentExecutionHandle
private isStale(run: AgentRun): boolean { return this.manager.getActiveRun(run.runId) !== run; }
async prepareTermination() {
  if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
  const run = this.agentRun;
  if (!run || this.isStale(run)) return completedLocalTermination(() => this.dispose());
  return this.wrapPreparedTermination(await this.manager.prepareAgentRunTermination(run));
}
// ensureReady → initializeReady: planner.prepare(config, this.platformAgentRunId, this.activationMode);
// after commitPublication() in initializeReady AND in prepareConfiguredActivation().commitAfterDurability: this.activationMode = "restore"; (R-4)
// fenceForRootShutdown(): this.rootShutdownFenced = true; await readiness; THEN if (!run || this.isStale(run)) return { accepted: true }; (R-5)

// AgentOrgRun (AR-002)
private failStopped = false;
private enterFailStop() { if (terminated || this.failStopped) return; this.failStopped = true; this.lifecycle = "fail_stop"; /* existing */ }
terminate() { ...; const attempt = this.terminateOnce(this.failStopped); this.termination = attempt;
  void attempt.then(r => { if (!r.accepted && this.termination === attempt) this.termination = null; },
                    () => { if (this.termination === attempt) this.termination = null; }); return attempt; }
```

`ownProcessGroupId()`: use `process.getpgid?.(process.pid)` if available; otherwise read it from the same `ps` output (`pid === process.pid`).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Reason |
| --- | --- | --- |
| Background-process registry / tracking during the run (crash cleanup) | Rejected | DEC-001; user asked for no process-management system |
| Spawn AGY detached and kill its group | Rejected | AGY moves background commands into new sessions; AGY's own group doesn't contain them |
| Change UI to avoid restore for stuck roots | Rejected | Server self-heal (D-B4) removes the dead end without UI/contract change |
| Keep constructor planner mode and add an override | Rejected | Two sources of truth; per-call mode is simpler |

## Change / Refactor Sequence

1. D-B1 + D-B2 (handle, planner) with unit tests.
2. D-B3 (Org run + frozen scope retry) with tests; confirm the Team frozen scope's caching and align if needed.
3. D-B4 (Org/Team manager restore self-heal) with tests.
4. D-A1 (helper + `stop()`) with tests.
5. Doc sync.
6. Live checks (API/E2E): probes L1/L2 must now pass (AC-B1..B3), and `agy-background-task-live.e2e.test.ts` daemon assertions become pass/fail (AC-A1/A2). Also cover user **Stop** as the cause of the dead member (R-7), for both an Org root agent and a Team member inside an Org: Stop → Org Terminate (AC-B1), and Stop → message the member (AC-B3). Include a standalone Team case: registered-but-inactive Team → restore (AC-B1/REQ-B4 via DEC-004).

## Key Tradeoffs

- Synchronous `ps` (≤ 2 s timeout) inside `stop()` avoids making `stop()` async across the backend. The cost is typically a few ms.
- Stale detection via `manager.getActiveRun` relies on its existing inactive-discovery release instead of duplicating cleanup.

## Risks

- `SIGTERM`-ignoring daemons can survive an app quit, because the unref'd `SIGKILL` sweep may not run before the process exits (R-2; documented limit).
- A live, non-stale member whose irreversible root-shutdown fence settled as not accepted can still block Org/Team termination retries (R-6; outside scope).
- `AgentRunRemovalCleanupError` on first stale discovery surfaces once; the retry completes (R-5).

- Delayed SIGKILL might hit a reused pgid within 1.5 s. Accepted by the reviewer (PR-003 not reachable); no re-verification.
- Hard-killed app (no graceful shutdown) leaves AGY and daemons, an existing limitation.
- Planner mode switch must not affect runs whose first activation fails (mode switches only after a successful publication).

## Guidance For Implementation

- Keep each change inside the listed owners; no UI, GraphQL or schema changes.
- Do not alter healthy-path termination ordering; only short-circuit stale runs.
- Tests must include an unrelated process in the fake `ps` output to prove no collateral kill (QR-001).
