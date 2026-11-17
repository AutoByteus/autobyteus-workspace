# Design Spec — Part 1: the restart reminder

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (DEC-008: cause-specific background-task line after an unexpected stop; SR-003 passed ARCH-REV-002) (answers ARCH-REV-001 AR-001 to AR-003; SR-002 was the first reviewed basis)
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the user on 2026-11-17 (DEC-003 wording; DEC-001 B, DEC-004 B, DEC-005 "Agreed, as recommended").
- Behavior-defining supplements: none.
- User approval of the design: `Not required`.
- Design status: `Ready` (part 1: UC-001). Part 2 (UC-002, the status shown) is designed in a later round of this ticket (DEC-007).
- Canonical investigation notes: `investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md` (updated version, including Principle 16 and The Approach), `/DESIGN.md` (unchanged since autobyteus-338; rules 7, 9, 10, 11; Data Migration Guideline pointer), `autobyteus-server-ts/docs/modules/restart_resume.md`.
- Conflicts or discrepancies: none.

## Current-State Read

- Shutdown: `server-runtime.ts` L209 runs `recorder.record()` then `app.close()`. `BusyRunRecorder` (`busy-run-recorder.ts` L36-46) writes `<appData>/restart-resume/busy-runs.json` once, only with runs whose status is `initializing`/`running` and that a collaboration root places (`placeOf`), merging with an unconsumed record (L25-28).
- Startup: after listen, `void restartResumer.resumeAfterUpdate()` (`server-runtime.ts` L233). The resumer reads and removes the record first (`restart-resumer.ts` L63-74), keeps only entries whose release differs from the server's (L77-80), and resumes them bottom-up along `delegatedFrom` (L92-134, 461 DS-9): closed-Task fence, root-history check, restore without posting, re-check, post the notice as first input only (L136-171).
- The notice (`restart-notice.ts` L20-30) names only an update and an interrupted turn.
- The node is not told why it stops (`shutdown/server-process-shutdown.ts` L40-80); a crash or kill runs no cleanup, so no record.
- Platform notices for the next input: `AgentRunPlatformNotices` (`agent-run-platform-notices.ts`) asks its sources in order; a source implements `AgentRunInputPreface` + `AgentRunLifecycleObserver` (`agent-run-input-preface.ts`); a delivered preface is published as the run's system notice and recorded in memory (`agent-run-input-preface-dispatch.ts`). The studio's slot is built at `build-studio-server.ts` L355, before `composeRestartResume` (L376), because the run supervisor needs it.
- Background tasks per run: `AgentRunBackend.hasRunningBackgroundTasks()` is real for AutoByteus, Claude, Antigravity; `false` for Codex and ACP (investigation runtime table). `AgentRun` has no facade for it (the idle-shutdown check reads the backend, `agent-run-termination.ts` L81). Codex tasks are visible only through `AgentRun.inspectBackgroundTasks()` (async snapshot).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: one subsystem (`restart-resume`) extended (record, recorder, resumer, notice) plus one new file pair (reminders), an `AgentRun` facade method, and the studio composition / startup order; docs. No runtime backend, web or contract change in part 1.
- Architectural risk: `High`
- Risk rationale: a transient record changes shape and becomes a live record written while the node runs (persistence + timer concurrency); a new persisted pending-reminder file; startup ordering changes (the previous record is taken before listen); a new platform notice source in the input path of every run; idle runs are woken after updates.
- Escalation trigger: if the live record measurably costs (more than one write per 2 s under load, or blocks the event loop), or the startup take must move, return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `busy-run-recorder.ts` L20-46 | shutdown-only, mid-turn-only recorder | Recorder extended: live session record + idle-with-background entries | — |
| Code | `restart-resumer.ts` L60-90 | update-only; record consumed at start | Cause per entry; non-update entries become reminders | — |
| Code | `server-runtime.ts` L205-233 | record at cleanup; resume after listen | Take the previous record before listen; start the live session after it | — |
| Code | `agent-run-platform-notices.ts`, `agent-run-input-preface*.ts` | ordered notice sources; preface published and recorded | Restart reminder = a notice source (next input) | — |
| Code | `build-studio-server.ts` L329-376 | notice slot built before the restart composition | Reminder service composed early (needs only the app-data dir), handed to the resumer later | — |
| Code | backends `hasRunningBackgroundTasks()`; `agent-run.ts` L194-205 | per-runtime facts | `AgentRun.hasRunningBackgroundTasks()` facade; Codex by inspection at graceful shutdown only | Codex not covered after a crash |
| Doc | 285 requirements DEC-001/003/005 | update-only, idle not recorded, app-owned excluded | DEC-001 B replaces 285 DEC-001/DEC-003 by the user's new decision; DEC-005 kept | — |

## Intended Change

The busy-run record becomes the node's live list of runs to tell after a restart: runs mid-turn or with a running background task, rewritten when that list changes (checked every 2 s) and marked `shutdownAt` at a graceful stop. At the next start, right after the server is built and before its cleanup is installed, the previous record is taken: every entry becomes a pending restart reminder, persisted, and only then is the record removed. Each entry's cause is an update (its release differs), a restart (graceful), or an unexpected stop (no `shutdownAt`). A pending reminder is delivered exactly once, by whichever comes first: the run's next external input (the reminder rides it as a preface), or, for an update entry, the wake after listen (the resumer claims the reminder and posts it as the run's first input). (ARCH-REV-001 AR-001, AR-002)

## Change Scope (Mandatory)

- In scope: UC-001 (part 1). Areas: `autobyteus-server-ts/src/restart-resume/` (record, recorder, resumer, notice; new reminders store and service), `agent-execution/domain/agent-run.ts` (one facade method), `compositions/restart-resume-composition.ts`, `compositions/build-studio-server.ts`, `server-runtime.ts`; docs `docs/modules/restart_resume.md`, `GLOSSARY.md` (restart reminder).
- Derived consumers: `busy-runs.json` has one reader (the resumer) and one writer (the recorder); tests and the restart-resume E2E fixtures that build records follow the new shape.
- Deliberately left alone: the standalone application host (no restart resume today, 285 DEC-005); runtime backends (no change; Codex keeps `hasRunningBackgroundTasks(): false`, which the idle-shutdown check also reads); the status shown (part 2); the 338 completion notices.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change | Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001-003, 005; AC-002, AC-004 | update restart, mid-turn | woken with the old notice | woken with the reminder | DS-001, DS-002, DS-003 |
| BEH-002 | Operational | REQ-001-004; AC-001, AC-003 | update restart, idle with a background task | nothing | woken with the reminder | DS-001, DS-002, DS-003 |
| BEH-003 | Operational | REQ-001-003; AC-001 | graceful non-update restart | nothing | reminder with the next input | DS-001, DS-002, DS-004 |
| BEH-004 | Operational | REQ-001-003; AC-001 | crash, kill, power loss | nothing | reminder with the next input (record ≤ 2 s old) | DS-001, DS-002, DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers:
  - Capability-area reuse: persistence (atomic JSON writer), notices (`AgentRunPlatformNotices`, preface path), shutdown (existing cleanup hook), resume (existing resumer). Reused/extended.
  - Behavior by absence: today "not an update" and "no record" both silently mean "tell nobody"; the design gives each cause an explicit rule and result.
  - Several kinds or forms: causes (update, restart, unexpected stop) and run states (mid-turn, idle with background) are traced separately (DS-002 classification); runtimes per REQ-004.
  - Hidden dependency: the recorder keeps reading the process `AgentRunManager` passed in by the composition (existing); the reminder service is created in the composition root and passed to both the notice slot and the resumer (no new lookup).
  - Backward dependency: none new; the resumer depends on the reminder service (one way).
- Deliberate deviations: None.
- Root cause classification: `Missing Invariant` — the restart-resume owner exists but does not hold the rule "every run that was working, by a turn or a background task, is told after any restart".
- Refactor needed now: `No` beyond the extensions below; the subsystem's ownership is right.
- Evidence: Current-State bullets 1-4.
- Design response: below.

## Terminology

- **Restart reminder**: the platform notice a run receives after a restart (sender `system.restart_resume`, the existing restart notice sender): cause, an interrupted-turn line when it was mid-turn, the background-task reminder line. Woken after an update; otherwise given with the next input. Added to `GLOSSARY.md`.
- **Busy run** (record term, kept): a run that was mid-turn or had a running background task. The record's file name `busy-runs.json` keeps its meaning (DESIGN.md rule 10: no rename, the meaning is widened in the same direction, no second meaning).
- **Restart cause**: `update`, `restart`, `unexpected_stop`.

## Legacy Removal Policy (Mandatory)

- Obsolete: the recorder's merge with an unconsumed record (the previous record is always taken before the live session starts); `resumeAfterUpdate()` (replaced by `takePreviousSession()` + `resumeAfterRestart()`); the old notice text.
- Compatibility kept: `None`. The record reader is tolerant of the previous shape (missing fields default), which is a generic reader policy, not a version branch (Principle 5).

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- `busy-runs.json`: transient, at most one per node, consumed at the next start. New shape `{ entries: [{root, agentRunId, place, status: "initializing"|"running"|"idle", backgroundTasks: boolean, recordedAt, version}], shutdownAt?: string }`. A file written by the previous release (only `initializing`/`running` entries, no `backgroundTasks`, no `shutdownAt`) reads as mid-turn entries without background tasks and no `shutdownAt`; its entries' release differs from the new one, so they are update entries and are woken, exactly as the previous release intended. Decision: `Directly Usable — No Migration`.
- `restart-reminders.json` (new, `<appData>/restart-resume/`): pending reminders `{ reminders: [{root, agentRunId, place, cause, version, restartedAt, interruptedTurn}] }` until delivered; runtime state, not user data; an unreadable file is logged and replaced (it only holds reminders). Decision: `Not Affected` (new transient state).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | 001-004 | live session tick (2 s) or graceful shutdown | `busy-runs.json` written | `BusyRunRecorder` | the record survives a crash |
| DS-002 | Primary | 001-004 | server start | each previous entry woken or turned into a pending reminder | `RestartResumer` | the cause decides wake or reminder |
| DS-003 | Primary | 001, 002 | update entry | run woken with the reminder | `RestartResumer` (existing resume path) | unattended updates continue |
| DS-004 | Primary | 003, 004 | the run's next external input | reminder delivered in front of it, removed from the store | `RestartReminderService` | no cost until someone talks to the run |

## Primary Execution Spine(s)

- DS-001: `Recorder tick -> AgentRunManager (active runs) -> per run: placeOf, getStatusSnapshot, hasRunningBackgroundTasks -> entries -> changed? -> atomic write (or remove when empty)`; graceful: `ServerProcessShutdown cleanup -> recorder.record() (stop ticks; Codex idle runs: inspectBackgroundTasks, ≤ 1 s total) -> write with shutdownAt -> app.close()`
- DS-002: `server-runtime: buildStudioServer -> resumer.takePreviousSession() (read; reminders.add(all entries with cause) persisted; then remove the record) -> recorder.startSession() -> setCleanup(record + close) -> … listen … recoverAfterListen -> resumer.resumeAfterRestart(previous) -> update entries: fences -> DS-003`
- DS-003: `resumer -> fences (closed Task, root history) -> root resolver restore -> re-check -> reminders.claim(agentRunId) (null: input came first and carried it → skip) -> post the claimed reminder as first input -> accepted: reminders.settleClaim(delivered) | NOT_FIRST or failed: reminders.settleClaim(returned) (pending again for the next input)`
- DS-004: `external input -> AgentRun -> AgentRunPlatformNotices.takePreface -> RestartReminderService.takePreface (pending for this run? → preface, in flight) -> combined dispatch -> prefaceDelivered (remove, persist) | prefaceReturned (pending again)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | While the node runs, every 2 s the recorder lists the placed general runs that are mid-turn or have a running background task; when the list differs from the last written one it rewrites the record (or removes it when empty). At a graceful stop it stops ticking, takes a final accurate list (Codex idle runs asked through their background-task view, bounded) and writes it with `shutdownAt`. | recorder, manager, run | recorder | record store |
| DS-002 | Right after the server is built, before the cleanup that writes the record is installed, the resumer takes the previous record: it gives every entry its cause (update when its release differs from this server's, otherwise restart when `shutdownAt` is set, otherwise unexpected stop), hands all entries to the reminder service, which persists them, and only then removes the record; if persisting fails the record stays (logged) for the next start. Then the recorder starts its session. After listening, the update entries are woken (DS-003) bottom-up as today. | resumer | resumer | cause rule |
| DS-003 | The existing fences and restore-recheck-post path. Before posting, the resumer claims the run's pending reminder; if input came first, that input already carried it and the claim is empty, so nothing is posted. A refused (NOT_FIRST) or failed post returns the reminder to pending, so the next input carries it. Exactly once whichever comes first. | resumer, reminder service, root, run | resumer | notice builder |
| DS-004 | The reminder service keeps the pending reminders (persisted), each Pending, Claimed (by the wake) or InFlight (as a preface); only a Pending reminder can be taken. When a run takes its next external input, the slot asks the service first after the runtime hand-over; it returns the reminder text built from the stored facts. Delivered: removed and persisted; returned: pending again. A newer restart replaces an older pending reminder for the same run, keeping `interruptedTurn` if either had it. | reminder service, AgentRun | reminder service | reminder store, notice builder |

## Spine Actors / Main-Line Nodes

`BusyRunRecorder`, `RestartResumer`, `RestartReminderService`, `AgentRunPlatformNotices` (existing), `AgentRun`.

## Ownership Map

- `BusyRunRecorder`: sole writer of `busy-runs.json`; the session's live list; the graceful final write. `record()` writes nothing before `startSession()` (a startup failure or a quit before the take cannot overwrite the previous record), and waits for an in-flight tick write (R-2). Tick comparison ignores `recordedAt` (R-1).
- `RestartResumer`: sole reader/remover of `busy-runs.json`; the cause rule; hands every entry to the reminder service at the take; fences and wake of update entries (claiming their reminders).
- `RestartReminderService`: sole owner of `restart-reminders.json`; pending reminders; their delivery through the preface port.
- `restart-notice.ts`: the reminder text (one builder for wake and preface).
- `AgentRun.hasRunningBackgroundTasks()`: thin facade over the backend.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| `AgentRun.hasRunningBackgroundTasks()` | backend | callers depend on `AgentRun`, not backends (part 2 reads it too) | policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| Recorder merge with an unconsumed record (`busy-run-recorder.ts` L25-28) | the previous record is taken before the session starts | `takePreviousSession()` ordering | — |
| `RestartResumer.resumeAfterUpdate()` | update-only rule replaced by the cause rule | `takePreviousSession()`, `resumeAfterRestart()` | tests follow (DESIGN.md rule 11) |
| Old notice text | DEC-003 | `buildRestartNoticeText` new text | — |
| 285 tests asserting "a non-update restart notifies nothing" (AC-004) | the user's DEC-001 B replaces it | new tests | rewrite, do not keep |

## Return Or Event Spine(s) (If Applicable)

Preface settle (DS-004): `prefaceDelivered` / `prefaceReturned` back to the service.

## Bounded Local / Internal Spines (If Applicable)

DS-001 (recorder tick). Parent `BusyRunRecorder`: `tick -> collect -> compare with last written (stable order by agentRunId) -> write/remove -> remember`; stops on `record()` (shutdown). One write in flight at a time; a tick during a write is skipped.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `busy-run-record.ts` | DS-001/002 | recorder, resumer | shape, tolerant read, atomic write, remove | one file format | — |
| `restart-reminder-record.ts` | DS-004 | reminder service | shape, tolerant read, atomic write | — | — |
| restart cause rule (`restartCauseOf(entry, shutdownAt, currentVersion)`) | DS-002 | resumer | update / restart / unexpected_stop | explicit rule, not absence | in two places it would drift |
| `restart-notice.ts` | DS-003/004 | resumer, reminder service | reminder text; SYSTEM message for the wake | one wording | — |

## Ownership Boundaries

The resumer never writes reminders' file; it calls `reminders.add()`. The reminder service never reads `busy-runs.json`. The recorder never reads the previous session.

## Boundary Encapsulation Map

| Boundary | Internals | Callers | Forbidden | Fix |
| --- | --- | --- | --- | --- |
| `RestartReminderService` | reminder record file | resumer (`add`, `prune`), notice slot (preface port) | anyone writing `restart-reminders.json` | extend the service |
| `BusyRunRecorder` | record writes | server runtime (`startSession`, `record`) | other writers | — |

## Dependency Rules

`server-runtime -> resumer, recorder`; `resumer -> reminders, root resolver, fences, notice builder`; `reminder service -> notice builder, record store`; `recorder -> AgentRunManager, root directory, record store`. Nothing in `restart-resume` imports a runtime backend.

Composition (Principle 16): `build-studio-server.ts` creates `RestartReminderService` (input: app-data dir) before the notice slot and passes it to `new AgentRunPlatformNotices([runtimeHandoverNotices, restartReminders, ...platformNotices.sources])` and later to `composeRestartResume({ …, reminders })`. No new process-wide lookup; the existing `AgentRunManager.getInstance()` and `getActiveCollaborationRootDirectory()` stay where they are, read once in the composition (unchanged).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `recorder.startSession(): void` / `recorder.record(): Promise<void>` | this node's session | live ticks / final write | — | `record()` never throws (as today) |
| `resumer.takePreviousSession(): Promise<PreviousSession \| null>` | previous session | read, give causes, `reminders.add` (durable), then remove | — | `PreviousSession = { updateEntries }` kept for the wake; the rest live only in the reminder store |
| `resumer.resumeAfterRestart(previous): Promise<ResumeReport>` | previous session | classify, wake, hand over | per entry `agentRunId` | report adds `reminded` |
| `reminders.add(reminders): Promise<void>` (persisted before it resolves; throws on a write failure), `reminders.claim(agentRunId): ClaimedReminder \| null`, `reminders.settleClaim(claim, "delivered" \| "returned")`, `reminders.prune(isPresent)` | pending reminders | merge (newer replaces, `interruptedTurn` OR) / claim for the wake / drop gone roots at the take | `agentRunId` | persisted after each change |
| `RestartReminderService` as `AgentRunPlatformNoticeSource` | a run's next input | preface | `run.runId` | a reminder rides either dispatch kind (turn start or append); `runPublished`/`runReleased` do nothing |
| `AgentRun.hasRunningBackgroundTasks(): boolean` | a run | facade | run | — |
| `buildRestartNoticeText({cause, version, restartedAt, interruptedTurn, resumedDelegated})` | reminder text | — | — | used by wake and preface |

## Interface Boundary Check

All singular, explicit identity (`agentRunId`), low ambiguity.

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere | Action |
| --- | --- | --- | --- | --- |
| reminder | restart reminder | Yes | Yes (sender `system.restart_resume` unchanged) | glossary |
| record | busy-run record | Yes (widened, same meaning direction) | Yes | — |
| cause | restart cause | Yes | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| next-input notice | `AgentRunPlatformNotices`, preface dispatch | Reuse |
| wake | restart resumer path | Reuse |
| atomic write | `atomicWriteJsonFile` | Reuse |
| shutdown hook | `server-runtime.ts` cleanup | Reuse |
| pending reminders | — | Create New (in `restart-resume`) |

## Subsystem / Capability-Area Allocation

`autobyteus-server-ts/src/restart-resume/` (Extend): record, recorder, resumer, notice, reminders. `agent-execution/domain` (Extend): facade. `compositions`, `server-runtime.ts` (Modify): order.

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

| Structure | File | Owner | Why | Tight |
| --- | --- | --- | --- | --- |
| `RestartCause` + `restartCauseOf` | `restart-resume/restart-cause.ts` | restart-resume | used by resumer and stored in reminders | Yes |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field | Notes |
| --- | --- | --- |
| `BusyRunEntry` | Yes: `status` is the run status at record time; `backgroundTasks` whether it had a running task | `interruptedTurn = status !== "idle"` derived once, in the resumer |
| `PendingRestartReminder` | Yes | facts only; text built at delivery |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `restart-resume/busy-run-record.ts` | Modify | new shape, tolerant reader, `shutdownAt` |
| `restart-resume/busy-run-recorder.ts` | Modify | `startSession()` ticks (2 s), `record()` final with `shutdownAt`, Codex inspection at shutdown (≤ 1 s total), include idle runs with background tasks |
| `restart-resume/restart-cause.ts` | Add | cause type and rule |
| `restart-resume/restart-resumer.ts` | Modify | `takePreviousSession` (causes; every entry → `reminders.add`, durable, then remove the record), `resumeAfterRestart` (update entries: fences, restore, claim the reminder, post as first input, settle the claim) |
| `restart-resume/restart-notice.ts` | Modify | reminder text (DEC-003) for wake and preface |
| `restart-resume/restart-reminder-record.ts` | Add | reminders file |
| `restart-resume/restart-reminder-service.ts` | Add | pending reminders; preface source |
| `agent-execution/domain/agent-run.ts` | Modify | `hasRunningBackgroundTasks()` |
| `compositions/restart-resume-composition.ts` | Modify | take `reminders`; return recorder, resumer |
| `compositions/build-studio-server.ts` | Modify | create reminders early; slot order; pass to composition |
| `server-runtime.ts` | Modify | after `buildStudioServer`: `takePreviousSession()`, `startSession()`, then `setCleanup(record + close)`; after `recoverAfterListen`: `resumeAfterRestart(previous)` |
| `docs/modules/restart_resume.md`, `GLOSSARY.md` | Modify | docs |

## Applied Patterns (If Any)

Periodic recorder (bounded loop, one owner). Notice source (existing port).

## Target Subsystem / Folder / File Mapping

As above; all new files in `autobyteus-server-ts/src/restart-resume/`.

## Folder Boundary Check

`restart-resume/` stays one subsystem folder; Low risk.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Example |
| --- | --- |
| Record during a session | `{"entries":[{"root":{"rootSubjectKind":"agent","rootRunId":"r1"},"agentRunId":"r1","place":"host","status":"idle","backgroundTasks":true,"recordedAt":"…","version":"1.5.14"}]}` (no `shutdownAt`: a crash now reads as an unexpected stop) |
| Reminder, update, mid-turn | `[Platform notice — application restarted]` / `The application restarted at 22:20 (reason: an update to v1.5.14).` / `Your previous turn was interrupted; check the results of any tool calls that were running before you repeat them.` / `If you started any background tasks, the restart stopped them. Check what you still need: restart it, or continue your work.` (+ the resumed-delegates line when any) |
| Reminder, unexpected stop, idle | no interrupted line; reason `an unexpected stop (a crash, a forced quit or a power loss)`; the background-task line is DEC-008's: `If you started any background tasks, some may still be running: the application stopped unexpectedly and could not stop them, and any that are still running are no longer tracked, so you will not be told when they finish. Check them (for example with `ps` and the pids you were given); stop any you still need and start them again so they are tracked, or continue your work.` (a crash runs no cleanup, so native command groups can outlive the server: RR-02) |
| Ordering (`server-runtime.ts`) | `buildStudioServer` → `takePreviousSession()` → `startSession()` → `setCleanup(record + close)` → … `listen` → `recoverAfterListen` → `resumeAfterRestart()` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Rename `busy-runs.json` and read both names | Rejected | same file; tolerant reader |
| Keep update-only resume beside the new rule | Rejected | cause rule |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Cause rule, record shape and reader; notice text; unit tests.
2. Reminder record + service (preface port) with tests (deliver, return, replace, prune, persist).
3. Recorder session ticks + final write (+ Codex inspection), tests with fake clock.
4. Resumer split and classification; rewrite 285 tests that asserted update-only.
5. `AgentRun` facade; composition and startup order.
6. Docs, glossary. Validation: isolated-node before/after (AC-001), update restart (AC-002), runtimes (AC-003), fences (AC-004); the shutdown E2E fixtures in `tests/e2e/shutdown/` and 285's restart E2E are the starting points.

## Key Tradeoffs

- One delivery path: every recorded run is told through the reminder store; the wake after an update is only an earlier delivery of the same reminder, so no run is told twice or missed when input comes first (ARCH-REV-001 AR-001).
- Polling every 2 s instead of subscribing to every run's events: one small loop over in-memory state, writes only on change; a crash loses at most the last 2 s.
- Reminder on next input after non-update restarts: no unasked spend (285's rule), but an agent nobody talks to stays waiting until someone does (the user's choice B).

## Risks

- Codex runs idle with background terminals are covered only at a graceful stop, not after a crash.
- After an unexpected stop, background commands can survive untracked (measured for native, RR-02); the reminder says so (DEC-008) and the agent checks with the pids from its conversation. Stopping survivors at the next start is follow-up FU-004.
- Part 2 (R-3): `AgentRun.hasRunningBackgroundTasks()` (every runtime) and 338's native `listRunningBackgroundTasks()` coexist; part 2's count will come from one source per run (decided in the part 2 design).
- ACP runtimes report no background tasks: their runs are reminded only when mid-turn (REQ-004).
- A dev build without a release stamp never counts an update; an old-release record read by such a build reads as an unexpected stop (harmless wording).

## Guidance For Implementation

- Reproduction to start from: none in code yet; validation reproduces "before" on base `4cbf9e7881` with a native agent idle on `run_bash(run_in_background: true, "sleep 600")` and a graceful restart (no message), then "after".
- Keep the recorder's `record()` never-throwing and bounded inside the 10 s shutdown budget.

---

# Part 2 — Show an agent with a running background task (SR-005, revised SR-006 for ARCH-REV-004)

## Basis

- Requirements: REQ-006, REQ-007, AC-005, AC-006, DEC-004 (the user: "Background task running", "N background tasks running", styled like an active agent, no Stop for it; a run in a turn shows "Running"), DEC-005 (messages delivered at once: no change). Approved 2026-11-17.
- Part 1 delivered (DR-001, `895cf3992d`); this round starts from that state. Authorities as above (same date).

## Current-State Read (part 2)

- A run's status is its turn: `AgentRun.dispatchCanonicalStatus()` publishes `AGENT_STATUS` with `buildAgentStatusPayload({ status, agentId, recoverableBlock })` (`agent-run.ts` L525-540; `agent-status-payload.ts` L4-48). Nothing about background tasks travels with it.
- The same fact is derived twice per backend: `hasRunningBackgroundTasks()` (contract `agent-run-backend.ts` L73; AutoByteus manager `hasRunning()`, Claude registry `hasRunningTasks()`, Antigravity monitor `hasRunningTasks()`; Codex and ACP `false`) and `backgroundTaskInspection.current()` (event-stream runtimes; Codex `snapshot`, ACP `unsupported`). For the three event-stream runtimes the boolean equals "any `current()` task is running" (Claude registry L239-247, AGY monitor L73-76, native backend L110-118, L201-203). Readers of the boolean: idle-shutdown quiet check (`agent-run-termination.ts` L81), part 1's recorder via `AgentRun.hasRunningBackgroundTasks()`.
- Status reaches the screens by five routes, all carrying only the status word:
  1. single-agent stream `AGENT_STATUS` (`agent-run-event-message-mapper.ts` L99; egress `AgentStatusTransitionFilter` suppresses exact repeats only, so a changed payload is forwarded);
  2. collaboration presentation `AGENT_STATUS` (`agent-presentation-contracts` `status` block, strict; server adapter `collaboration-agent-presentation-adapter.ts` L318-319; `AgentPresentationStatusDetails`);
  3. the per-run status feed `/ws/run-status` (`collaboration-stream-contracts/run-status-dtos.ts`: `agentStatus {agentRunId, status}`, run state `{answer, node, status}` with a team's/org's status folded on the server by `foldTeamAggregateStatus`, `run-status-service.ts` L115-122, L195-205): what the web's run lists, trees and Task cards read (`runStatusStore.ts`);
  4. team stream `AGENT_STATUS` / `TeamAgentStatusDto` (`team-stream-contracts` `team-execution-view-dtos.ts` L90-96, strict);
  5. peer-node summaries (`remote-task-execution-dtos.ts` `statuses: [{agent_run_id, status}]`).
- Web presentation: status words map to text/dot/icon in `useStatusVisuals.ts` (header, `AgentStatusDisplay.vue`) and `workspaceStatusDotPresentation.ts` (dots in trees and the phone run list), Team rows by `resolveTeamStatus` (`workspaceTeamAggregateStatus.ts`), phone header in `MobileRunTargetView.vue`, phone rows `mobileRunListRows.ts`. The Stop button and input handling read the status word (`running`), which this part does not change.

## Intended Change (part 2)

`AgentRun` becomes the one owner of a run's running-background-task count, derived from its backend's background-task view; it publishes the count with every status and republishes the status when the count changes. Every status route carries the count beside the status word; a Team's/Org's run state carries the sum over its own agents (folded on the server). The web shows an idle (not running) agent or Team whose count is above zero as "Background task running" / "N background tasks running", with the active (blue) dot and no Stop; a running one stays "Running". The duplicate backend boolean is removed (one fact, one derivation).

## Task Size And Architectural Risk (part 2)

- Task size: `Large` — server domain + five wire contracts in three contract packages + six backends (removal) + web presentation in the desktop and phone surfaces + localization.
- Architectural risk: `High` — shared wire contracts change (strict schemas, clean cut, DESIGN.md rule 9), a duplicate fact is removed from the backend contract, every status surface changes presentation.
- Escalation trigger: a status route found that this inventory misses, or a consumer whose logic (not presentation) reads the count.

## Task Design Health Assessment (part 2)

- Root cause: `Shared Structure Looseness` + `Missing Invariant` — the backend contract derives one fact twice (boolean and view), and status DTOs have no place for work that outlives a turn.
- Refactor needed now: `Yes`, bounded: remove `AgentRunBackend.hasRunningBackgroundTasks()`; derive the count once (`runningBackgroundTaskCount(inspection)` in `agent-execution/domain`, used by `AgentRun` and the quiet check).
- Triggers: Derived data (one derivation), Several kinds or forms (five routes and three runtimes kinds: event-stream counts, Codex `snapshot` and ACP `unsupported` give 0, as the quiet check already treats them), Vocabulary (one word: `backgroundTasksRunning`), Legacy cleanup (the removed boolean). Deviations: None.

## Spines (part 2)

| Spine ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-101 | Primary | every source batch of the run (a task starts or ends, a turn starts or ends, any runtime event) | every `AGENT_STATUS` the run publishes carries the current count | run-owned lifecycle state (`AgentTurnLifecycleState`), set by `AgentRun` from the one derivation |
| DS-102 | Return-Event | `AGENT_STATUS` | each route's DTO with the count; run-status feed agent entry and run state (sum) | route owners (mapper, presentation adapter, run-status service, team projector, peer summary) |
| DS-103 | Primary | a web store receives a status | the row/header shows the DEC-004 text and active dot | web presentation owner |

- DS-101 (SR-006): `backend source batch -> AgentRun: lifecycleState.observeBackgroundTasksRunning(runningBackgroundTaskCount(backend.backgroundTaskInspection)) -> dispatchProcessedAgentRunEvents -> LifecycleStatusEventTransformer (status event before each runtime event and at turn end, built from the same lifecycle state) -> buildAgentStatusPayload({status, backgroundTasksRunning: state.backgroundTasksRunning, …})`. `AgentRun.dispatchCanonicalStatus()` and `getStatusSnapshot()` read the same state (the snapshot recomputes the count first, like it reconciles the runtime snapshot). No separate "republish on change": a `BACKGROUND_TASK_UPDATED` event already gets a status event before it from the transformer, now with the new count.
- DS-102: `AGENT_STATUS -> (1) stream mapper | (2) presentation adapter -> run-status service (agent entry; run state folds status as today and sums counts) | (4) team projector | (5) peer summary`
- DS-103: `runStatusStore / agent stream state -> agentActivityPresentation({status, backgroundTasksRunning}) -> StatusDot / AgentStatusDisplay / Team row / phone row / phone header`

## Ownership (part 2)

- `runningBackgroundTaskCount(inspection)` (new, `agent-execution/domain/agent-background-task-count.ts`): `event-stream` → `current()` tasks with status `running`; `snapshot`/`unsupported` → 0. The only derivation.
- `AgentTurnLifecycleState` (run-owned, shared by `AgentRun` and `LifecycleStatusEventTransformer`, `agent-run.ts` L66, L102, L112): holds `backgroundTasksRunning` beside `status`; `AgentRun` sets it from the one derivation before each source batch runs the pipeline and before a snapshot is read.
- `buildAgentStatusPayload` requires `backgroundTasksRunning: number` (no default), so no producer can leave it out; the type checker finds every producer. `AgentRun.hasRunningBackgroundTasks()` (part 1) becomes `runningBackgroundTaskCount() > 0` through the same function. The quiet check (`agent-run-termination.ts` L81) calls the same function on its backend.
- Route owners map the count; `run-status-service` sums per run state (server-side, never a client, G-A4).
- Web: `utils/agentActivityPresentation.ts` (new) is the one mapping from `{status, backgroundTasksRunning}` to `{labelKey, labelParams, dotClass, transientDotClass, iconName}`; `useStatusVisuals.ts` and `workspaceStatusDotPresentation.ts` delegate to it (or are replaced by it where they only map status); Team rows use the run state's count from the feed.

## Status Payload Producers And Their Count (SR-006)

| Producer (file:line at `895cf3992d`) | What it builds | Count source |
| --- | --- | --- |
| `LifecycleStatusEventTransformer.buildStatusEvent` (`lifecycle-status-event-transformer.ts` L58-63) | status before each runtime event, at turn end, for explicit statuses | `state.backgroundTasksRunning` (run-owned lifecycle state) |
| `AgentRun.dispatchCanonicalStatus` (`agent-run.ts` L525-540) | canonical status | same state |
| `AgentRun.getStatusSnapshot` (`agent-run.ts` L207-210) | snapshot for lists, reconnects, the run-status feed's first read | count recomputed from the derivation, then the state |
| stream mapper `normalizeStatusPayload` (`agent-run-event-message-mapper.ts` L13) | wire normalization of an `AGENT_STATUS` | the incoming payload's `background_tasks_running` (always present from the producers above) |
| command status overlay (`agent-run-command-status-overlay-store.ts` L64) | `initializing` / `error` before the run is active | `0` (no run activity yet) |
| status projection metadata fallback (`agent-run-status-projection-service.ts` L182) | offline/historical run | `0` (an offline run has none); its live branch uses `getStatusSnapshot()` |
| collaboration presentation adapter, live (`collaboration-agent-presentation-adapter.ts` L318-319) | member `AGENT_STATUS` | the run's payload |
| collaboration presentation adapter, status overlay (`collaboration-agent-presentation-event-adapter.ts` L76) | overlay snapshot (`initializing`/`error`) | the snapshot details' count (`0` for these overlays) |
| `team-agent-status.ts` L55-75 (`TeamAgentStatusSnapshot.details`) | team member status snapshot/event | details gain `backgroundTasksRunning`, filled from the member's payload |
| `pairedAgentStatusFrame(status)` (`paired-agent-access.ts` L13) | a peer-paired agent's status frame | becomes `pairedAgentStatusFrame(status, backgroundTasksRunning)`; `PairedAgentStatus` gains the count; `offline` at run end sends `0` |
| run-status service (`run-status-service.ts` L35-36, L115-122, L195-205) | agent entry; run state | agent entry from the frame; run state sums its own agents |

## Example Sequence (SR-006): task started in a turn, turn ends, task ends

| Step | Event | Status payload published |
| --- | --- | --- |
| 1 | turn starts | `{status: "running", background_tasks_running: 0}` → "Running" |
| 2 | `run_bash(run_in_background)` starts; `BACKGROUND_TASK_UPDATED (running)` | status event before it: `{running, 1}` → "Running" (the turn wins) |
| 3 | turn ends (`TURN_COMPLETED`) | `{status: "idle", background_tasks_running: 1}` → "Background task running" (blue, no Stop) |
| 4 | list reloads / client reconnects | `getStatusSnapshot()` → `{idle, 1}` → same |
| 5 | task ends; `BACKGROUND_TASK_UPDATED (completed)` | `{idle, 0}` → "Idle" |
| 6 | 338's notice wakes the run | `{running, 0}` → "Running" |

## AGENT_STATUS Readers Checked (ARCH-REV-004 R-10)

Harmless for a status event that differs only in the count (checked by the reviewer and listed so later stages do not re-check): idle-shutdown re-arm, `TaskWorkerStatusNotice`, command overlay `clear`, the background-task notice service settle, the model router (`model-router-agent.ts` L156), segment-lifecycle and file-change processors, the egress `AgentStatusTransitionFilter` (forwards a changed payload).

## Interfaces And Wire (part 2)

| Route | Field added | Notes |
| --- | --- | --- |
| `AgentStatusPayload` (server) / stream `AGENT_STATUS` | `background_tasks_running: number` (integer ≥ 0) | snake case like the payload's other fields |
| `agent-presentation-contracts` status block / `AgentPresentationStatusDetails` | `background_tasks_running` / `backgroundTasksRunning` | strict schema extended |
| `collaboration-stream-contracts` `agentStatus` and run state | `backgroundTasksRunning: number` (agent: its own; run state: sum of its own agents; `0` when not answered) | camel case like that contract |
| `team-stream-contracts` `teamAgentStatusDtoSchema`, live `AGENT_STATUS` | `background_tasks_running` | |
| `remote-task-execution-dtos` `statuses[]` | `background_tasks_running` | peer node of the same release (rule 9) |

Display rule (DEC-004): `status` is `running`/`initializing` → as today; else `status` is `idle` and count > 0 → "Background task running" (count 1) / "{count} background tasks running", blue dot (not pulsing, so a turn still reads differently), icon `heroicons:arrow-path`; `offline`/`error` → as today (an offline run has 0). Team row: busy > background (sum > 0) > error > idle > offline. Localization keys in `en` and `zh-CN` ("后台任务运行中" / "{count} 个后台任务运行中").

## Removal Plan (part 2)

| Item | Why | Replaced By |
| --- | --- | --- |
| `AgentRunBackend.hasRunningBackgroundTasks()` and its six implementations (AutoByteus, Claude, Antigravity, Codex, ACP, test doubles) | duplicate derivation of the view's fact | `runningBackgroundTaskCount(inspection)` |
| `ClaudeSession.hasRunningBackgroundTasks()`, AGY `hasRunningTasks()`, native `manager.hasRunning()` if then unused | Dead after the removal (check callers). Equivalence checked: native `current()` vs `hasRunning()` and Claude `list()` vs `hasRunningTasks()` (reviewer); AGY monitor keeps only running tasks in `running` (set L64, deleted L107, `list()` returns them, L73-76) so `running.size > 0` equals "a running task in `current()`" (R-12) | — |

## Persisted Data (part 2)

`Not Affected`: the count is live only (an offline run reads 0).

## Change Sequence (part 2)

1. `runningBackgroundTaskCount`; `AgentTurnLifecycleState.backgroundTasksRunning`; `buildAgentStatusPayload` requires the count (the compiler lists every producer; table above); quiet check and part 1 recorder switched; backend boolean removed (tests follow, rule 11).
2. Contracts: the five routes; server mappers; run-status sum.
3. Web: `agentActivityPresentation` + stores carry the count; desktop header, trees, Team rows, phone rows and header; localization.
4. Validation: native, Claude, Antigravity (scripted) idle with a task → desktop and phone lists and headers show the text and dot, and back to "Idle" at the end; a running turn still "Running"; Codex/ACP unchanged; messages delivered at once (AC-006). Desktop and phone probes (TESTING.md).

## Risks (part 2)

- Codex idle with background terminals shows "Idle" (no live count; as the quiet check today).
- Status republish per task start/end adds `AGENT_STATUS` frames; bounded by task changes.
