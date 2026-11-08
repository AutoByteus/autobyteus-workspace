# Handoff — autobyteus-434, SR-003: Architecture Design Complete (revision for ARCH-REV-001)

- Package: `phone-live-updates-434` (Project Task `autobyteus-434`)
- Result: `Architecture Design Complete`, revised; `task_size: Medium`, `architectural_risk: High` (unchanged)
- Route (`get_handoff_rules`, 2026-11-08): `/software_engineering_team/architecture_reviewer` (a revised package with High risk goes to independent architecture review)
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`, base `origin/personal` at `eebbc2b8ee`; finalization target `origin/personal`. No product code is changed yet. The ticket documents are on disk, not committed.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/`
- Approval basis: requirements at SR-001, approved by the Solution Designer within the Task's direction with the user informed. SR-003 changes no intended behavior.

## What changed for ARCH-REV-001

See `design-spec.md` § "SR-003 changes at a glance" and § "Per-Owner Scheduler Adoption".

- **AR-001:**
  - The agent catch-up runs **before** the socket opens (load stored state → commit → open). No live event can race it, so there is no guard loop and no conflict end state.
  - A narrow `loadRunStoredState` reads the projection and file changes, without config or workspace resolution.
  - The commit keeps config and status.
  - Only scheduler-driven attempts catch up; `onReconnected` is dropped.
- **AR-002:**
  - Success points: snapshot accepted for Team, Org and collaboration; socket open after the catch-up for the agent.
  - A failure after open but before the success point counts as a failed attempt.
  - The schedule starts at 1 s.
  - Org re-sync: retire the generation (intentional close), then `attemptNow()`, which runs `reopenOwned(null)`. Collaboration: `closeSocket`, then `attemptNow()`.
  - Owner `connect()` → `startOver()`. `requestRecovery()` is guarded by `isWaiting()`.
  - `WebSocketClient` becomes a plain socket and is `DISCONNECTED` while waiting (`RECONNECTING` removed).
- **N-1:** recorded as established.
- **N-2:** `agentRunStore.ts` must not grow; construction moves into the factory. `TeamStreamingService.ts` stays ≤ 500 lines, with a named extraction if needed.
- **N-3:** stated.

## Re-review scope

AR-001, AR-002 and the sections they touch: DS-002, DS-003, per-owner table, Interfaces, Files, Removal plan, Sequence, Risks. The parts ARCH-REV-001 passed are unchanged in substance.

## Open items

- ASM-001 (Android WebView visibility) is for validation.
- FU-001 (heartbeat) is a follow-up.
- The agent read-to-open window is stated in the design's Risks. It equals the window of today's open path.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/repro/phone-live-repro.mjs`; review: `design-review-report.md`, `architecture-review-revision-record.md`.
