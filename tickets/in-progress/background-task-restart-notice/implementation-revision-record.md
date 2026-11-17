# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-002 (Pass), implementation round 1 (part 1) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002, CRR N/A, API-REV N/A, DR N/A | Part 1 implemented; local checks pass; ready for code review |

## Revision Entries

### IR-001 — Part 1: the restart reminder

- Triggering role, report path, and round: architecture reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/design-review-report.md` (ARCH-REV-002, Pass); implementation round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: part 1 (UC-001) implemented against SR-003; Medium / High confirmed.
- Related solution revision IDs: SR-003 (SR-001, SR-002 underlying)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of part 1. Part 2 (UC-002, the status shown) is a later round of this ticket (DEC-007).
- Approved behavior or requirement IDs affected: BEH-001 to BEH-004; REQ-001 to REQ-005; AC-001 to AC-004 (local level).
- Implementation delta: the busy-run record becomes a live list (2 s checks, change-only writes, `shutdownAt` at a graceful stop) of runs mid-turn or with a running background task; the restart cause rule; persisted pending restart reminders (`RestartReminderService`) delivered exactly once by the next input's preface or the wake after an update (claim/settle); `takePreviousSession()` right after the build, then `startSession()`, then the cleanup; `resumeAfterRestart(previous)` after recovery; the DEC-003 reminder text; `AgentRun.hasRunningBackgroundTasks()`; docs and glossary. Refinements over the design text are listed in the handoff.
- Changed files or areas: `autobyteus-server-ts/src/restart-resume/` (record, recorder, resumer, notice; new cause, reminder record, reminder service), `agent-execution/domain/agent-run.ts`, `compositions/restart-resume-composition.ts`, `compositions/build-studio-server.ts`, `server-runtime.ts`; tests in `tests/unit/restart-resume/`, `tests/integration/restart-resume/`, `tests/unit/server-runtime-app-data-migration-gate.test.ts`, `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`; `docs/modules/{restart_resume,agent_execution,agent_team_execution,README}.md`, `GLOSSARY.md`.
- Local validation and result: IMP-01 to IMP-03 in the handoff.
- Next recipient or routing: code reviewer (High risk), per `get_handoff_rules`.
- Remaining limitations or risks: live restart E2E on an isolated node (AC-001 to AC-004) left to API/E2E; Codex idle runs covered at a graceful stop only; ACP runs only when mid-turn.
