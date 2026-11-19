# Handoff — followups-483-517, SR-001

- Result: `Architecture Design Complete` for FU-002, FU-003, FU-005; `task_size=Small`, `architectural_risk=Low` → direct implementation. FU-004 is not included (DEC-003 awaits the user).
- Package: `followups-483-517`; Project Task `autobyteus-517` (part of `autobyteus-530`), round 2
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/followups-483-517`, branch `codex/followups-483-517`, base `origin/personal` @ `24d438fa31`; no dependencies installed yet (`pnpm install`, then `pnpm -C autobyteus-server-ts prebuild`). Ticket documents not committed yet.

## What to build (design-spec.md is authoritative)

- FU-002: shared test constants (`tests/helpers/os-latency-under-load.ts`) for OS file-event waits and in-process server hooks, used in the seven listed test files; remove the `AC_BOUND_MS` elapsed assertions (DEC-002).
- FU-003: `AgyBackgroundTaskMonitor.list()` returns every task of the run (running and ended) with its latest snapshot; update its unit test.
- FU-005: `settings.md` retitled to Settings, the Level 1–3 copy removed, `Existing Run Configuration` kept, one link repointed, link check.

## Verification

AC-001 (base vs branch under imposed load; record load and `fseventsd`), AC-002 (unit + a live/probe check of `currentTasks` after an AGY exit), AC-004 (link check). Release only on the founder's word. After delivery: full cleanup and a record copy.

## Route record

- 2026-11-18: rule "Small or Medium and Low" → `/implementation_engineer`.
