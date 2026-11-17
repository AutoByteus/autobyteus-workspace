# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-002 (Pass), implementation round 1 (part 1) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002, CRR N/A, API-REV N/A, DR N/A | Part 1 implemented; local checks pass; ready for code review |
| IR-002 | Architecture reviewer, `design-review-report.md` ARCH-REV-003 (Pass, SR-004, the user's DEC-008), round 2 | F-1 (API/E2E), CRR-002 | `Requirement Gap` resolved upstream; text-only implementation | SR-004, ARCH-REV-003, CRR-001/CRR-002, API-REV-001, DR N/A | Cause-specific background-task line; IMP-04 passes |

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

### IR-002 — DEC-008: the background-task line after an unexpected stop

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` (ARCH-REV-003, Pass at SR-004), round 2; origin API/E2E F-1 (`api-e2e-execution-coverage-report.md`, API-REV-001) and CRR-002.
- Triggering finding IDs: F-1, CRR-002
- Classification: Requirement Gap resolved by the user (DEC-008); text-only implementation change
- Prior authoritative result: IR-001 (code review Pass CRR-001; API/E2E Fail API-REV-001: after a SIGKILL the reminder said the background tasks were stopped while they kept running)
- Current authoritative result: the reminder's background-task line follows the cause; Medium / High unchanged.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the user's DEC-008 wording for `unexpected_stop`.
- Approved behavior or requirement IDs affected: REQ-002 (DEC-008), BEH-004.
- Implementation delta: `restart-notice.ts` picks the background-task line by cause: `unexpected_stop` → DEC-008 text word for word; `update`/`restart` → the DEC-003 line (unchanged). Unit tests assert the exact line per cause and that a mid-turn run after an unexpected stop gets the interrupted line plus the DEC-008 line. RR-02 (API/E2E e2e) asserted the old line after a SIGKILL; it now asserts the DEC-008 line and not the stopped line. `restart_resume.md` and `GLOSSARY.md` follow.
- Changed files or areas: `autobyteus-server-ts/src/restart-resume/restart-notice.ts`; `tests/unit/restart-resume/restart-notice.test.ts`; `tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` (RR-02 assertion only); `docs/modules/restart_resume.md`; `GLOSSARY.md`. Commit `b78555d7bb`.
- Local validation and result: IMP-04 (typecheck PASS; 120 restart-resume, startup order and handle tests pass).
- Next recipient or routing: code reviewer (High risk), per `get_handoff_rules`.
- Remaining limitations or risks: stopping a crashed session's surviving command groups at the next start is FU-004 (not this ticket). RR-02 is to be rerun by API/E2E on the built server.

### IR-003 — Part 2: show an agent with a running background task

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` (ARCH-REV-005, Pass at SR-006), part 2 round 1.
- Triggering finding IDs: N/A (first implementation of part 2)
- Classification: new part of the ticket (DEC-007); Large / High
- Prior authoritative result: IR-002 (part 1 delivered, DR-001 at `895cf3992d`)
- Current authoritative result: every status carries the running background task count; the web shows an idle agent or Team with tasks as "Background task running" with the active dot and no Stop.
- Related solution revision IDs: SR-005, SR-006
- Related architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: part 2 of the ticket (REQ-006, REQ-007; AC-005, AC-006; DEC-004, DEC-005).
- Approved behavior or requirement IDs affected: REQ-006, REQ-007, AC-005, AC-006.
- Implementation delta: `runningBackgroundTaskCount` (the one derivation); `AgentTurnLifecycleState.backgroundTasksRunning` set per batch and per snapshot; `buildAgentStatusPayload` requires the count; the backend boolean and four per-runtime helpers removed; the count on every status route (plus the Org view's status DTO and the peer channel's summary, deviations 1 and 2 in the handoff); `RunStatusService` sums per run state; web `agentActivityPresentation`, `teamActivityOf`, store and run-state counts, every status surface on desktop and phone; en and zh-CN; docs.
- Changed files or areas: listed in the handoff's "Key Files Or Areas".
- Local validation and result: IMP-05 to IMP-12 in the handoff.
- Next recipient or routing: code reviewer (High risk), per `get_handoff_rules`.
- Remaining limitations or risks: Codex idle with background terminals shows Idle; per-batch count granularity (R-13); live per-runtime validation and the two-node peer case left to API/E2E.

### IR-004 — CR-002: the dead exports of the touched remote-task-execution contract file

- Triggering role, report path, and round: code reviewer, `code-review-report.md` "Latest Round: Part 2" (CRR-005, round 4).
- Triggering finding IDs: CR-002
- Classification: Local Fix (Core Principle 7, dead code in a touched file; this ticket, not a follow-up)
- Prior authoritative result: IR-003 (code review Fail CRR-005, CR-002 only)
- Current authoritative result: the touched contract file keeps only its used exports; Large / High unchanged.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-005
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: CR-002 requires removing the dead exports and resolving FU-005 here.
- Approved behavior or requirement IDs affected: none (no behavior change).
- Implementation delta: `autobyteus-agent-presentation-contracts/src/remote-task-execution-dtos.ts` removed; `remoteAgentStatusSchema` and `RemoteAgentStatus` (used by `peer-run-view-answers.ts`, `paired-agent-access.ts`) move to `src/remote-agent-status.ts`; `index.ts` exports it; `tests/remote-task-execution-dtos.test.mjs` replaced by `tests/remote-agent-status.test.mjs`; `dist/` rebuilt (the old `remote-task-execution-dtos.*` removed). FU-005 marked resolved.
- Changed files or areas: `autobyteus-agent-presentation-contracts/{src,tests,dist}`; `follow-ups.md`; `implementation-handoff.md`.
- Local validation and result: IMP-15 (contract tests 22/14/37, both typechecks PASS at baseline, server remote-collaboration unit 154 pass).
- Next recipient or routing: code reviewer (High risk), per `get_handoff_rules`.
- Remaining limitations or risks: none new.

### IR-005 — Integration of the refreshed base (delivery DR-002)

- Triggering role, report path, and round: delivery engineer, `delivery-revision-record.md` DR-002 (base refresh blocked by conflicts).
- Triggering finding IDs: DR-002
- Classification: Local Fix (integration; no requirement or design change)
- Prior authoritative result: IR-004 (code review Pass CRR-006/CRR-007; API/E2E Pass API-REV-003)
- Current authoritative result: `origin/personal` @ `ff13782f36` merged; conflicts resolved; part 2's count on 458's phone surfaces; 483's end reasons and exit codes kept; no backend-level boolean left.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-005, CRR-006, CRR-007
- Related API/E2E revision IDs: API-REV-003
- Related delivery revision IDs: DR-002
- Why this implementation revision is recorded: delivery cannot finalize until the refreshed base is integrated.
- Approved behavior or requirement IDs affected: REQ-006 / DEC-004 on the base's new phone Settings screen (same approved behavior).
- Implementation delta: merge `990ff9a3d4` (phone subject-line helper takes the count and the translator; the native background-task test keeps the base's exit-code assertion with the count; `agent_execution.md` keeps both facts; contract maps rebuilt); `ca1979b206` (doubles carry 483's `endReason`/`exitCode`); part 2's phone probe case renumbered MSP-67.
- Changed files or areas: listed in the handoff's "Integration Of The Refreshed Base".
- Local validation and result: IMP-16 to IMP-20 (typechecks, contracts, full server unit, related integration, full web unit, fresh-start desktop build, desktop and phone probes).
- Next recipient or routing: code reviewer (High risk, Local Fix requested by delivery), per `get_handoff_rules`.
- Remaining limitations or risks: API/E2E to reconfirm the phone Settings screen and 483's background-task paths live as it needs; the `fs.watch` environment failures and load time-outs recorded in IMP-17.

### IR-006 — Phone probe case ID collision after the next base refresh (delivery DR-003)

- Triggering role, report path, and round: delivery engineer, `delivery-revision-record.md` DR-003 (`evidence/DEL-R2-post-integration/DEL-04-phone-probe-start-check.log`).
- Triggering finding IDs: DR-003 (DEL-04)
- Classification: Local Fix (test code only; no product change)
- Prior authoritative result: IR-005 (CRR-008, API-REV-004, CRR-009 Pass)
- Current authoritative result: part 2's phone probe case is MSP-73; the phone probe starts and its part 2, 522, 483 and 458 cases pass on the merged base.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-008, CRR-009
- Related API/E2E revision IDs: API-REV-004
- Related delivery revision IDs: DR-002, DR-003
- Why this implementation revision is recorded: autobyteus-522 added MSP-67..MSP-72, and the probe refuses to start while an ID is used twice.
- Approved behavior or requirement IDs affected: none.
- Implementation delta: `mobile-shell-probe.mjs`: `runCase('MSP-73')`, its header comment (with the earlier IDs) and its four screenshot names (`d7fdd7db6f`); rename notes in the handoff and the API/E2E coverage, execution and test-review reports.
- Changed files or areas: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`; ticket documents.
- Local validation and result: IMP-21 (nine phone cases Pass on fresh server and phone builds).
- Next recipient or routing: code reviewer (Local Fix requested by delivery, High risk), per `get_handoff_rules`.
- Remaining limitations or risks: a later base can take MSP-73; starting the probe with any one case runs the duplicate-ID check.
