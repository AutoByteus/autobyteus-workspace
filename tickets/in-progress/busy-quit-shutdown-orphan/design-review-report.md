# Design Review Report — busy-quit-shutdown-orphan

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/investigation-notes.md` (E1–E9, RC-1–RC-5, E-A1–E-A7)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/solution-revision-record.md` (SR-001–SR-003)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed:
  - `evidence/`, the E1–E9 logs (relied on as summarized in the investigation notes);
  - `evidence/e6-electron-quit/`.
- Relevant Solution Revision IDs: SR-002 (approval), SR-003 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: SR-003 `Architecture Design Complete` (Large/High) from `/solution_designer`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/busy-quit-shutdown-orphan` @ `5f3aefd24` (docs only on top of `424a33147`), base `02d6ddf05`. Code read:
  - Server:
    - `agent-run-manager.ts` 185–320: `prepareAgentRunTermination`, `terminateAgentRun`, `stopAllAgentRuns`.
    - Every caller of those three methods in `src`:
      - the GraphQL `agent-run.ts:184` → `agent-run-service.ts:140`;
      - `standalone-agent-run-lifecycle-service.ts:108`;
      - `configured-agent-execution-handle.ts:201`;
      - `general-process-run-supervisor.ts:427`;
      - `application-orchestration-host-service.ts:340` (`terminateRunBinding`, reached from `application-engine-context-capability-handler.ts:44`);
      - `application-execution-scope.ts:47` (the application SDK's `terminateAgentRun`);
      - `application-execution-shutdown-coordinator.ts:30` (scope close).
    - `application-platform-lifecycle.ts:166-181`: the platform stops, including execution scope close.
    - `build-studio-server.ts:282-287`: `onClose` runs the application lifecycle stop, then `closeProcessResources`.
    - `server-runtime.ts:29-46`.
  - Runtimes and tools:
    - `autobyteus-ts/.../shell-command-executor.ts:36-41, 80-110`: `detached: true`, with an abort-signal stop of the group.
    - `autobyteus-ts/.../background-process-manager.ts:204-240`: `detached: true`. `stopAll()` has **no caller** in `autobyteus-ts` or `autobyteus-server-ts` `src`.
    - `background-process-context.ts`: one manager per agent context.
    - `agy-stream-process.ts:36, 66-85`: AGY is spawned in the server's group. Per the `stop()` doc comment, its background daemons are in their own groups and "survive a SIGTERM of AGY alone".
  - Desktop:
    - `electronApplication.ts:331-345, 391-408`: `stop()` returns early on re-entry (`hasShutdownRun`) and clears the before-quit timer.
    - `baseServerManager.ts:184-245`: a single-PID SIGTERM, then SIGKILL after 5 s.
    - `macOSServerManager.ts:39-59`: not detached.
    - `updater/appUpdater.ts:252`: `quitAndInstall(false, true)`.
    - `main.ts:56`: `app.exit(1)` only on a startup failure.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Agreed:
  - three process layers: the server run lifecycle, the server process and the Electron quit lifecycle;
  - stop semantics change for every standalone run on every runtime;
  - process-group signalling is added.
- Independent Architecture Review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed with gaps`. The approved intent is clear. Two parts of the production-path map are incomplete: the callers of the changed entry points (AR-001), and process ownership outside the server's group (AR-003).
- Approved intent:
  - REQ-001: Terminate interrupts, for user Terminate and server shutdown.
  - REQ-002: shutdown is bounded at 10 s.
  - REQ-003: no runtime CLI or tool command started by the server outlives shutdown, graceful or forced, on every runtime that spawns processes. ASM-002 is explicitly assigned to architecture investigation.
  - REQ-004: quit waits up to 15 s, then force-stops.
  - REQ-005: continuity is preserved.
- Scope guardrail: DEC-003 (Codex Stop gap) and DEC-004 (data-root guard) are out of scope, as are the root-hosted child fence semantics.

| BEH | Alignment | Evidence | Target Path | Status | Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 User Terminate | Pass | Pass (E8; code) | Pass in substance, but the D1 entry point has unmapped application callers | Confirmed with gap | AR-001 |
| BEH-002 Bounded shutdown | Pass | Pass (E1, E5, E7; code) | Pass. D1 fences all, then the D2 10 s race | Confirmed | — |
| BEH-003 No leftover processes | Pass | Partial: Codex and Claude established; native, AGY and non-leader forced exit not | Partial | Gap | AR-003 |
| BEH-004 Quit waits | Pass | Pass (E6) | The semantics are right, but the shape allows a re-entrant early exit | Gap | AR-002 |
| BEH-005 Continuity | Pass | Pass (T-08c) | Pass. Persistence is untouched | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/` (E1–E9, Electron probe) | Pass | Pass | Pass for Codex, Claude and Electron. Not run for native or AGY (see AR-003) | Pass | Evidence | — |

## Task Design Health Assessment Verdict

Pass.
- `Missing Invariant` in existing owners is evidence-backed:
  - the stop-now owners lack "interrupt before terminate";
  - the process owners lack "bounded exit, no survivors".
- No new subsystem is needed. One small new file is justified.

## Spine Inventory Verdict

| Spine | Verdict | Notes |
| --- | --- | --- |
| DS-001 Terminate | Pass, with AR-001 | The spine is correct for user Terminate. The application-initiated terminate spines that enter the same owner are not listed. |
| DS-002 Server shutdown | Pass | `onClose` runs the application platform stop (scope close → per-scope `stopAllAgentRuns`, which also gets D1), then `closeProcessResources`. Add the application step to the spine for accuracy. |
| DS-003 Desktop quit | Fail (AR-002) | The re-entry state is not owned by a single in-flight stop promise. |
| Bounded: `stopServer` state machine; server forced exit | Pass | The timeline is coherent: the server forces itself at 10 s, plus 1.5 s grace, which is under the desktop's 15 s. |

## Boundary / Dependency / Interface Verdicts

| Item | Verdict | Notes |
| --- | --- | --- |
| D1 in `AgentRunManager` (owner of stop-now); callers do not fence themselves | Pass | `prepareTermination` is unchanged, which preserves the Team/Org/copy drain-and-cancel flows (E-A2 verified at `configured-agent-execution-handle.ts:201`). |
| `server-process-shutdown.ts` owns the bound and the forced exit | Pass | Injectable timers, kill and exit. |
| `BaseServerManager.stopServer` owns signals and escalation; `ElectronApplication` owns quit sequencing | Pass, with AR-002 | — |
| Env flag `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER` | Pass (see N-1) | — |

## Review-Focus Verdicts

1. **Limiting D1 to `terminateAgentRun` and `stopAllAgentRuns`:**
   - **Correct.** The Team, Org, task-copy and Mixed-Team flows use `prepareAgentRunTermination`/`tryPrepare…` with cancellation. Changing `prepareTermination` would break their drain-and-cancel contract.
   - **Incomplete map.** The two entry points have more callers than the design lists (AR-001). The application-scope `stopAllAgentRuns` is part of server close, so it is correctly in SCN-002. The application-initiated `terminateAgentRun` paths need an explicit disposition.
2. **Process group versus a per-runtime registry:**
   - **Correct for runtime CLIs.** CLIs inherit the server's group and clean their tool commands on SIGTERM (E3, E9). The Claude CLI is SDK-spawned, so a global registry cannot enumerate it (E-A4).
   - **Not sufficient alone.** Group signalling cannot reach processes deliberately placed in other groups, whose owner does not clean them on SIGTERM: native AutoByteus shell and background commands, and AGY daemons. Those need their existing owners invoked, not a new global registry (AR-003).
3. **Env-flag contract:** sound. The spawner knows it created a group leader, and the server never signals a group it does not lead. See N-1 for scoping and the rationale wording.
4. **Deferring `will-quit`:**
   - The semantics are sound: defer, stop once, then `app.quit()`.
   - The shape guidance is unsafe given today's `stop()` (AR-002).
   - The update path needs verification (N-2).

## Existing Capability Reuse / Allocation / File Mapping

- Pass for the fence reuse, the new `server-process-shutdown.ts` and the desktop manager extensions.
- AR-003 may add calls into existing native and AGY owners. That is reuse, not a new subsystem.

## Removal / Legacy Verdict

Pass. The unbounded close, the 5 s single-PID SIGKILL and the non-deferred `will-quit` are replaced. There are no compatibility flags.

## Persisted-Data Transition Verdict

Pass: `Not Affected`. Losing the interrupted turn's partial work is an approved acceptable loss.

## Change / Refactor Safety Verdict

Pass for D1 and D2 sequencing and tests. D3 needs AR-002's re-entry test.

## Example Adequacy Verdict

Fail for the deferred-quit example (AR-002). The other examples are good: stop-now ordering, the concurrent fence, flag-gated group signalling, and grace before kill.

## Material Premise Validation

### `P-001`: the user quits again while a busy quit is still waiting (AR-002)

- Requirement: REQ-004, AC-004.
- Initiating basis: `User`.
  - Surface: the app menu or dock **Quit** (Cmd+Q). The app keeps running while `will-quit` is deferred.
  - Action: press Quit again because the app has not exited. A second OS SIGTERM to main is the same path.
- Forward path:
  1. Quit #1: `before-quit` arms the 8 s timer → `will-quit` is prevented → `stop()` sets `hasShutdownRun` and clears the timer → `stopServer` (up to 15 s; the busy forced path is about 11.5 s).
  2. Quit #2: `before-quit` re-arms a new 8 s timer → `will-quit`, where the design's example calls `this.stop()` again.
  3. `stop()` returns at once (`if (this.hasShutdownRun) return`, `electronApplication.ts:392`).
  4. `.finally` sets `serverStopped = true` and calls `app.quit()`.
  5. `will-quit` passes through, and Electron exits while `stopServer` is still pending.
  6. The re-armed 8 s timer reaches the same state even without a second press, if the stop takes more than 8 s after quit #2.
- Consequence: main exits before the server's group escalation, and the server or its CLIs are orphaned. This recreates RC-3/E6, in the busy case this ticket targets.
- Reachability: `Reachable`. It drives AR-002.

### `P-002`: forced exit, or plain termination, leaves server-spawned detached processes (AR-003)

- Requirement: REQ-003, AC-002, AC-003, ASM-002.
- Governing contract: REQ-003 ("graceful or forced … every runtime that spawns processes"). SCN-002 names `kill`/Docker stop. AC-003 defines the forced path with a test double.
- Code facts:
  - Native AutoByteus foreground shell commands and background processes are spawned `detached: true`, each in its own group. The server's group SIGTERM/SIGKILL cannot reach them.
  - `BackgroundProcessManager.stopAll()` has no caller. Native background processes started by the `start_background_process` tool are not stopped by run termination or shutdown on *any* path.
  - AGY daemons survive a SIGTERM to AGY alone (code comment). On the forced path the group SIGTERM reaches AGY but not its daemons.
  - Non-leader forced exit (`kill <pid>` of a CLI-launched server): the server exits alone. The Claude CLI survives EOF (E9).
- Reachability:
  - Native background processes: `Reachable` on every shutdown. The agent uses the product's `start_background_process` tool, then the user quits.
  - Native foreground command and AGY daemons on the forced path: `Unclear`. It depends on whether a native or AGY interrupt ends the turn; this is the ASM-002 investigation the requirements assigned to architecture.
  - Non-leader forced path: conditional on the forced path, which the approved AC-003 governs.

### `P-003`: an application terminates a busy run (AR-001)

- Basis: governing contract.
  - The application backend SDK's `terminateRunBinding` goes through `application-engine-context-capability-handler.ts:44` to `ApplicationOrchestrationHostService.terminateRunBinding` and then `terminateAgentRun`.
  - The application execution scope also exposes `terminateAgentRun`.
- No bundled application calls these, but the SDK surface is public.
- Consequence: an application's explicit terminate changes from drain to interrupt with D1. This is benign and consistent with REQ-001's "Terminating a run … interrupts", but it is not mapped or dispositioned.
- Reachability: `Reachable` (contract). Low consequence.

## Unresolved Approved-Behavior Or Current-State Gaps

- The ASM-002 investigation is incomplete for native AutoByteus and AGY (AR-003).

## Review Decision

`Fail`

## Findings

### `AR-001` (Low; Design Impact; not blocking on its own): the D1 production-path map omits application callers

- Protects: REQ-001, and preserved behavior (Terminate results).
- Evidence:
  - `application-orchestration-host-service.ts:340`, reached from the application engine capability (`application-engine-context-capability-handler.ts:44`);
  - `application-execution-scope.ts:47`;
  - `application-execution-shutdown-coordinator.ts:30`, through `application-platform-lifecycle.ts:178` and `build-studio-server.ts:284`.
- Proportionate response:
  - Add these callers to the behavior map and DS-001/DS-002.
  - State the disposition: application-initiated terminate intentionally shares stop-now semantics under REQ-001, and the application-scope stop is part of SCN-002.
  - If the designer considers application-initiated terminate outside REQ-001's approved meaning, route it as a Requirement Gap rather than leaving it implicit.

### `AR-002` (Medium; blocking; Design Impact): deferred `will-quit` must be keyed to one in-flight stop promise

- Protects: REQ-004, AC-004 (P-001).
- Evidence: `electronApplication.ts:391-395`. `stop()` returns immediately on re-entry and clears only the first before-quit timer. The design's shape example (`void this.stop().finally(() => { this.serverStopped = true; app.quit(); })`) therefore marks the app stopped on a second quit, or on the re-armed timer, while the first stop is pending.
- Proportionate response:
  - Make the quit deferral depend on a single memoized stop promise, for example `this.stopping ??= this.stopOnce()`, with `stop()` returning it.
  - Set "stopped" and call `app.quit()` only when *that* promise settles.
  - Re-entrant `will-quit` (a second Cmd+Q, a second SIGTERM, the re-armed 8 s timer) stays prevented until then.
  - Correct the example and the "before-quit 8 s timer stays harmless" sentence to rest on this invariant.
  - Add a unit test: a second `app.quit()` during a pending `stopServer` does not exit before it settles.

### `AR-003` (Medium; blocking; Design Impact with an Unclear part): REQ-003 coverage outside the server's process group is not established

- Protects: REQ-003, AC-002, AC-003. ASM-002 was assigned to architecture by the requirements.
- Evidence: P-002 code facts.
- Proportionate response: complete ASM-002 by code read and, where needed, a probe, then disposition each case.
  - **(a) Native foreground commands.** Does the native interrupt or terminate abort the running `ShellCommandExecutor` (its `signal` → group stop) so the graceful path leaves nothing? Record the evidence.
  - **(b) Native background processes.** `BackgroundProcessManager.stopAll()` is never called, so these survive Terminate and shutdown today on every path.
    - Either give them a stop owner in the existing native termination path (for example, the native backend's terminate stops its context's manager), or
    - if the product intends them to outlive the run, return it as a Requirement Gap (it conflicts with BEH-003 as approved).
  - **(c) Forced path (desktop leader).** Server-owned detached groups (native) and AGY daemons are not reached by the group signal.
    - Either signal the server-tracked groups synchronously in the forced exit, using the existing owners' known PGIDs and no new global registry, or
    - record an explicit residual with user approval.
  - **(d) Forced path (non-leader, `kill <pid>`).** The Claude CLI survives EOF. Either state a mechanism, or record the residual explicitly against SCN-002/AC-003 for approval. E-A7 covers Docker and terminals, not a plain `kill`.
- Keep process-group signalling as the primary mechanism for runtime CLIs. This finding does **not** ask for a global process registry.

## Classification

`Design Impact`. AR-003's investigation part is `Unclear` until ASM-002 is completed. AR-003(b) or (d) may become a `Requirement Gap` if the designer proposes narrowing REQ-003.

## Recommended Recipient

`/solution_designer`

## Residual Risks / Non-Blocking Notes

- **N-1 (env flag).**
  - Read `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER` once at startup and remove it from `process.env`. Otherwise runtime CLIs and tool commands inherit it; for example, an agent launching a development AutoByteus server as a tool command.
  - Treat `ESRCH` from `process.kill(-pid)` as "already gone".
  - Correct the rationale in the shape table:
    - `process.kill(-process.pid)` can only target a group whose ID equals the server's own PID, so it cannot signal a parent shell's group.
    - The real hazard of an unconditional group signal is killing co-members of a shell job the server happens to lead, such as pipeline peers.
- **N-2 (updater).** Verify `autoUpdater.quitAndInstall(false, true)` (`appUpdater.ts:252`) with the deferred `will-quit` on macOS and Windows, as the design's Risks already list.
- **N-3 (user Terminate bound).**
  - Terminate has no D2-style bound. An accepted interrupt whose turn never ends still leaves Terminate pending; that is today's unbounded wait narrowed to a non-ending runtime.
  - AC-001's live Codex/Claude check is the gate. Acceptable as a residual.
- **N-4 (second signal to the server).** With the `once` handlers kept, a second SIGTERM in the first 10 s takes Node's default action and skips the CLI-cleanup grace. This is acceptable as today's operator escape hatch, provided the desktop never sends a second SIGTERM (AR-002's single stop promise ensures that).
- Carried: the DEC-003/DEC-004 follow-ups; Windows relies on the existing `taskkill /t` with the new 15 s bound.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate:
  - P-001: `Reachable`, drives AR-002.
  - P-002: partly `Reachable` (native background processes), partly `Unclear` (native/AGY forced path); drives AR-003.
  - P-003: `Reachable` (contract), low consequence; drives AR-001.
- Notes: D1 and D2 are structurally sound. AR-002 is a small, concrete correction. AR-003 requires completing ASM-002 and dispositioning each process owner outside the server's group.
