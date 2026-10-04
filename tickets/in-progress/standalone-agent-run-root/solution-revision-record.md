# Solution Revision Record — standalone-agent-run-root

## SR-001 — 2026-10-02 — First requirements baseline (Ready for Approval)
- Trigger: the code reviewer's follow-up request (user-agreed scope and naming) and the user's "continue please with the
  improvement".
- Prior status: N/A. Current status: Ready for Approval.
- IDs: UC-001–010, REQ-001–010, AC-001–010. Open: Q-1–Q-4.
- Approval: pending. Design: not started.

## SR-002 — 2026-10-02 — Requirements approved (single ticket)
- Trigger: the user said "no splitting. i think do it in this ticket. lets do it".
- Q-1–Q-4 accepted as recommended:
  - sender-address wording;
  - roll-up also applies to existing runs, from the collaboration tree;
  - the refactor is invisible;
  - no hardening for malformed packages (principle 6).
- Status: Approved. Next: architecture design.

## SR-003 — 2026-10-02 — Architecture design complete
- Design:
  - `StandaloneAgentRunRoot` owns the host through `StandaloneHostAgentHandle` (lazy `ensureReady` over the lifecycle's
    `activateHost`);
  - `StandaloneAgentRunRootManager` (`resolveRoot`, `stopRoot`, `endRoot`, `stopAll`);
  - the binding, the old manager and statics, the wake path, and the liveness special case are removed;
  - the module moves to `src/standalone-agent-run-root/`;
  - a coordinator port avoids an import cycle;
  - `TeamRootCollaboratorAgentRegistry`;
  - Org delivery extraction;
  - the self-delegation check;
  - the sender address header;
  - a token roll-up service plus GraphQL;
  - earlier-events inter-agent rendering;
  - the host label uses the agent name;
  - catalog injection;
  - the model-save root cause.
- Persisted data: Not Affected. Evidence E-11–E-14. Large/High. Routing: architecture reviewer.

## SR-004 — 2026-10-02 — Design revision for ARCH-REV-001 (Fail, Design Impact)
- AR-001 (option a, preserve):
  - stream connect → `resolveRoot` → `root.ensureHostReady()`, as today;
  - `isActive` reflects the real host state;
  - the Key Tradeoffs claim is corrected;
  - a failed mention on a stopped run still leaves the host active.
- AR-002: `StandaloneRunCommandPort.postUserMessage` defined.
  - It passes `postOptions` (`lifecycleObserver`) through, calls `onActiveRunReady` after `ensureReady` and before
    posting, and returns the run, admission and post result for the coordinator.
  - Interrupt and approval act on a live host only; they never start it.
- AR-003: entry-point dispositions.
  - Eligible create/activate/restore/resolve go through the root.
  - `activateHost` requires the member context for eligible runs and throws otherwise.
- Residual: the web header parser accepts both header forms.
- Requirements unchanged. Large/High. Routing: architecture reviewer.
- 2026-10-02 note (no new SR round): ARCH-REV-002 gave **Pass** on SR-004 (requirements basis SR-002). The reviewer
  delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; not repeated here.
  Editorial alignment per the reviewer's non-blocking note: the dependency rule now names `AgentRunService`'s injected
  `StandaloneRunLifecyclePort` alongside the coordinator's `StandaloneRunCommandPort`. The design substance is unchanged
  (the AR-003 dispositions and `stopRoot` were already specified).
