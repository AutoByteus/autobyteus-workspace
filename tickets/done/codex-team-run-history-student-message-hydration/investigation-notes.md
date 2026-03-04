# Investigation Notes

## Ticket

`codex-team-run-history-student-message-hydration`

## Stage

`1 Investigation + Triage` (Completed)

## Confirmed Reproduction Evidence

- Team: `team_class-room-simulation_f509bd27`
- Professor projection query returns conversation entries (`count=12`).
- Student projection query returns empty conversation (`count=0`).
- Team manifest contains both member thread IDs:
  - professor: `019cb985-7cf2-7453-986e-8d296a1a0671`
  - student: `019cb985-7d2f-7eb1-8d59-e0c204c58193`
- Direct Codex thread read succeeds for professor thread and fails for student thread with:
  - `no rollout found for thread id 019cb985-7d2f-7eb1-8d59-e0c204c58193`

## Root Cause

1. On Codex team continuation, `TeamRunContinuationService` calls `restoreCodexTeamRunSessions(manifest)` when no active member bindings exist.
2. `restoreCodexTeamRunSessions` can return refreshed member runtime references (including a new `threadId`) when a resume fallback starts a new thread.
3. `TeamRunContinuationService` currently ignores returned bindings and does not persist updated member runtime references back into team history manifest.
4. Team member projection later reads stale `runtimeReference.threadId` from persisted team manifest; Codex projection fallback uses stale thread ID and fails for that member.
5. Why professor works but student fails: professor's persisted thread ID remained readable; student's persisted thread ID became stale/unreadable, so only student projects empty.

## Scope Triage

- Classification: `Medium`
- Reason:
  - Backend continuation + run-history persistence logic update.
  - Requires targeted regression tests in continuation/history flows.
  - No frontend contract change required.

## Affected Paths

- `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `autobyteus-server-ts/tests/unit/run-history/team-run-continuation-service.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/team-run-history-service.test.ts`

## Existing Test Gap Confirmed

- No existing test asserts Codex team multi-member restart/hydration for both professor and student.
- Existing tests primarily assert professor path only.
