# Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `runtime-stop-cleanup-and-org-recovery`
- Current solution revision: `SR-004` (requirements; AC-B1 alternate clarified). The authoritative design is `SR-003` (unchanged).
- From: Solution Designer (`/solution_designer`), 2026-09-29
- Classification: `task_size=Medium`, `architectural_risk=High`
- Route applied (via `get_handoff_rules`): independent architecture review → `/architecture_reviewer` (rule: Large or High risk). Prior review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001 round 1, Fail / Design Impact, basis SR-001 and SR-002).

## Original Request

1. The user asked, relayed by `/api_e2e_engineer` on 2026-09-29, that when the Antigravity (AGY) runtime is stopped, the background processes it started are stopped too. This is predecessor finding F-API-001: daemons such as `pnpm dev` survive Stop/Terminate, orphaned and holding ports.
2. The user instructed on 2026-09-29 that this ticket also fixes the Agent Org termination defect diagnosed on 2026-09-28, if it still exists. It does: reproduced live on beta.5 (probe L1). A related recovery gap was also found (probe L2).

## Approval Basis

- `requirements-doc.md` SR-001, Approved by the user 2026-09-29. The user chose the simple option A: stop AGY's background process groups when AutoByteus stops a live AGY, with no process tracking. AGY crash cleanup, Windows and detached commands are documented limits. The user also approved Org/Team recovery (Terminate succeeds with dead members; restore works; a crashed member can be continued directly; standalone Teams included). No behavior-defining supplements.

## Workspace / Base / Finalization

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery`
- Branch: `codex/runtime-stop-cleanup-and-org-recovery`
- Base: `origin/personal` @ `5d6179797`; finalization target `personal`

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/solution-revision-record.md`
- Supplements: `…/probes/gql.sh`, `…/probes/org-send.mjs`, `…/probes/create-nested-classroom-agy-org.json` (live reproduction of L1/L2), `…/predecessor-delivery-receipt-verification.md`
- Predecessor (read-only): `origin/personal:tickets/done/agy-background-task-turn-liveness/` (F-API-001 evidence in `api-e2e-execution-coverage-report.md`, `evidence/`)

## Design Summary

- D-A1: `AgyStreamProcess.stop()` lists the live AGY's descendant process groups via `ps` (excluding AGY's and the server's own group and pgid ≤ 1), sends `SIGTERM` to them, then to AGY, then a delayed `SIGKILL` sweep. Skipped on win32 and when AGY has already exited. Fail-safe.
- D-B1: `ConfiguredAgentExecutionHandle` treats a stale (no longer published) `agentRun` as already terminated, in prepare/tryPrepare termination and in the root-shutdown fence.
- D-B2: Activation mode per attempt: `restore` after the handle's first successful publication. The planner's `prepare` takes the mode, so a crashed member resumes its conversation.
- D-B3: `AgentOrgRun.terminate` and the Org frozen termination scope no longer cache failed attempts (aligns with `RootTeamRun`).
- D-B4: Org and Team manager restore self-heals a registered-but-not-active root: it completes its termination and then restores, instead of the "already active/managed" dead end.

## SR-003 Revision (response to ARCH-REV-001 round 1)

- AR-001: `TeamRunService.restoreTeamRun` no longer pre-guards `hasManagedTeamRun`; `AgentTeamRunManager.restoreTeamRun` (inside `withRootTransition`) is the single authority for "already managed" versus "self-heal". `resolveActiveTeamRun`/`resolveManagedTeamRun` are unchanged. A Team service-level test is added.
- AR-002: `AgentOrgRun` has a persistent `failStopped` field (set in `enterFailStop`) that is used by every termination attempt. A retry after a failed fail-stop attempt uses the drain path and returns accepted. Unit test added.
- R-1..R-8 are folded into D-A1, D-B1, D-B2, D-B3, Risks, Change Sequence and tests. See `design-spec.md` and `solution-revision-record.md` SR-003.
- Requirements are unchanged; no renewed approval is needed.

## SR-004 Revision (response to CRR-002 / CR-001)

- Origin: API/E2E F-API-B1-ALT. A second Terminate on an already-stopped Org/Team returns `success:false` "…not found.", while the literal AC-B1 alternate said "no-op success". The code reviewer classified this as Design Impact with a contributing Requirement Gap.
- Decision (user-approved 2026-09-29, "Accept your suggestion."): option (b). AC-B1 now reads: "Retrying Terminate after a failed or stuck attempt completes the stop. Terminate on an already-stopped Org/Team changes nothing and causes no harm; its existing response is kept."
- There is no design or production code change. Downstream, only the API/E2E durable test assertion for the second Terminate follows the clarified AC, then goes to test-code review, and the flow continues. All other live results (API-REV-001) stand.
- Uncommitted API/E2E durable tests in the worktree: `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts`, updated `agy-background-task-live.e2e.test.ts`.

## Evidence Highlights

- L1 (beta.5): after a member crash, Org Terminate fails "not the current published run". Registered = true, inspection active = false. Retry fails identically, and restore fails "already active".
- L2 (beta.5): a message to the crashed member in an active Org is rejected `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`, although `platformAgentRunId` is persisted.
- F-API-001: AGY background daemons survive Stop/Terminate. SIGTERM to AGY's descendant process groups clears them (raw probe).

## Review Focus Requested

- Safety of treating a stale run as terminated (no skipped cleanup; registry release on inactive discovery).
- Per-attempt mode switch: effect on first activation, native runtime, and failed first activations.
- Retry semantics of the Org termination and frozen-scope clearing (concurrency with fail-stop auto-terminate).
- Restore self-heal inside `withTransition` (no re-entrant deadlock; ordering with history recording).
- Process-group selection safety (no collateral kills) and the delayed-SIGKILL pgid-reuse risk.

## Open Risks

- Hard-killed app leaves AGY and daemons (existing limitation).
- Team frozen scope failure caching: resolved (R-8; only `fencing` was cached and is now cleared on failure).

## Next Expected Action

Independent architecture review. On Pass, route per the reviewer's rules. Return Design Impact / Requirement Gap / Unclear findings to the Solution Designer.
