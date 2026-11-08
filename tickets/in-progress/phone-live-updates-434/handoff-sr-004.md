# Handoff — autobyteus-434, SR-004: Architecture Design Complete (revision for ARCH-REV-002)

- Package: `phone-live-updates-434` (Project Task `autobyteus-434`)
- Result: `Architecture Design Complete`, revised; `task_size: Medium`, `architectural_risk: High` (unchanged)
- Route (`get_handoff_rules`, 2026-11-08): `/software_engineering_team/architecture_reviewer`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`, base `origin/personal` at `eebbc2b8ee`; finalization target `origin/personal`. No product code is changed yet. The ticket documents are on disk, not committed.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/`
- Approval basis: requirements at SR-001, unchanged.

## What changed for ARCH-REV-002

See `design-spec.md`: § "SR-004 changes at a glance" and the new § "Agent Connect Rule".

- **AR-001(c1) / P-004:** `agentRunStore.connectToAgentStream` → `reconnection.requestConnect()`:
  - waiting → `attemptNow()` (catch-up, then open);
  - held or attempting → nothing;
  - connected → nothing;
  - idle → `startOver()` + plain connect.
  
  This covers the real caller, `reconcileDiscoveredActiveRuns` (`runHistoryLoadActions.ts:323-329`, after every history read). The wrong "active-run recovery" caller is removed from the design.
- **AR-001(c2) / P-005:** every success point calls `connected()`, whoever started the connect.
- **N-4:** `isRecovering()` (waiting, held or attempting) replaces `isWaiting()`.
- **N-5:** FU-002 records the dead `activeRunRecoveryCoordinator.ts`.
- **N-6:** `AgentStreamingService.dropConnection(reason)`: the loss bookkeeping (pending admissions and interrupts rejected) without the loss notification.
- **N-7:** every `attempt` exit ends in one scheduler call: `connected()`, `connectionLost()` or `startOver()`.
- Step-5 tests added: P-004, P-005, N-6, N-7.

## Re-review scope

The agent row of the per-owner table, DS-003, the Agent Connect Rule, the step-5 tests.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`; review: `design-review-report.md`, `architecture-review-revision-record.md`.
