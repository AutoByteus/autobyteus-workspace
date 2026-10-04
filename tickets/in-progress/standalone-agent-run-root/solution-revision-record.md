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

## SR-005 — 2026-10-04 — Base refresh onto latest `origin/personal` (evidence and design deltas)
- Trigger: the user's 2026-10-04 request to update this worktree branch onto the latest `origin/personal`, revise the
  design as needed, then hand off. The user asked for it to go on to code review.
- Prior status: SR-004 Ready (ARCH-REV-002 Pass); implementation in progress, uncommitted, with no implementation
  handoff. Current status: design Ready (SR-005).
- Workspace: backup at `/Users/normy/autobyteus_org/solution-designer-reports/standalone-agent-run-root-backup-20261004/`
  and branch `backup/standalone-agent-run-root-pre-rebase-20261004`. Checkpoint commit rebased onto `b37d7a934`; head
  `9c3080a20` before this record. Three conflicts resolved (E-15).
- Evidence: E-15–E-21 added. E-10's failure mode no longer exists on the base (E-16); REQ-010 stands.
- Design deltas D-R1–D-R7 ("Base Refresh Deltas (SR-005)" in `design-spec.md`):
  - no `containsRunId`;
  - the moved instruction keeps upstream's work-request section;
  - REQ-009 includes two upstream guard drifts (AFB-004 allocator inventory; `registerProjectTaskTools`);
  - 26 base failures are out of scope;
  - General Agent terminology;
  - `chat.md` reference moved to line 295;
  - fixture ownership and the relocated cleanup test.
- Requirements: unchanged. Only factual workspace and terminology notes were added to `requirements-doc.md`; no
  REQ/AC edits. No renewed approval needed; the approval basis remains SR-002.
- Classification: unchanged, `Large` / `High`.
- Routing: the handoff rules route a revised Large/High package to `/architecture_reviewer`. ARCH-REV-002 covered SR-004
  on the old base. There is no rule from Solution Designer to code review. Code review follows the implementation
  engineer's handoff once implementation is complete (E-21 lists the remaining work).
- 2026-10-04 note (no new SR round): ARCH-REV-003 gave **Pass** on SR-005 (requirements basis SR-002); report
  `design-review-report.md`, record `architecture-review-revision-record.md`. D-R3 confirmed as REQ-009 guard
  maintenance, with reviewer conditions: narrow the AFB-004 obligation to `agentDefinitionService` (do not delete it);
  add `project_tasks` to the readiness list in source order. Residual: compare base failures by test identity and
  message, not count. The reviewer delivered the implementation handoff to `/implementation_engineer`; not repeated here.
