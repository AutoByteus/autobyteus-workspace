# Design Spec — restart-resume (autobyteus-285)

## Solution And Approval Basis
- Current solution revision ID: `SR-003`.
- Approved requirements: `requirements-doc.md` SR-002, approved by **the user** on 2026-11-01 (DEC-001 = A: only
  update restarts resume; busy runs only).
- User approval of the design, when the direction requires it: `Not required`. The Task's direction asks for the user's
  decisions, and those were taken; this design adds no product behavior beyond them. The user is informed in the
  routing message.
- Design status: `Ready`.
- Authorities read (this conversation):
  - the skill's `architecture-design.md`, `design-principles.md`, `ticket-scope.md`, and the current templates;
  - project `DESIGN.md` (rules 1, 4, 7, 9), `GLOSSARY.md`, `TESTING.md`.
  - The Data Migration Guideline does not apply: new data only, no change to stored shapes.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume`, branch `codex/restart-resume`, base
  `origin/personal` @ `efd28d5c4a`.

## Current-State Read (Read; file:line at the base)
- **Shutdown.** `ServerProcessShutdown.request()` (`src/shutdown/server-process-shutdown.ts`) runs `cleanupOnce()`,
  which is `app.close()` (`server-runtime.ts:205`, `shutdown.setCleanup(() => app.close())`). Nothing is interrupted
  before it: the native drain is the first `preClose` hook, and run fencing is in `onClose` (autobyteus-284/339).
- **Live runs.**
  - `AgentRunManager.listActiveRuns()` / `getActiveRun(id).getStatusSnapshot().status` (`initializing | running` =
    busy; 283 F-05, F-06).
  - Collaboration roots are registered in `ActiveCollaborationRootDirectory`
    (`agent-collaboration/execution/services/active-collaboration-root-directory.ts:47-115`) with
    `boundary.hasAgentExecution(agentRunId)` (same-root membership, delegated children included). There is no list
    accessor.
  - A collaboration-eligible standalone run always runs through its standalone root (`AgentRunService.activate` →
    `resolveRootAndEnsureHost`, `agent-run-service.ts:310-313`; eligibility `standalone-agent-run-eligibility.ts`:
    not application-owned, not system-owned).
- **Restore by kind** (the existing dispatcher, `compositions/remote-collaboration-composition.ts:51-53`):
  - standalone: `getStandaloneAgentRunRootManager().resolveRoot(hostRunId)` (restores);
  - team: `teamRuns.resolveManagedTeamRun(teamRunId)`;
  - org: `orgRuns.getActive(id) ?? orgRuns.restore(id)`.
- **Waking a member with input.** Every root kind has `executeAgentCommand(agentRunId, { kind: "post_message",
  message })`: `standalone-agent-run-root.ts:369`, `root-team-run.ts:287`, `agent-org-run.ts:399`. Operator input
  wakes a shut-down delegated child ("exactly like send_message_to", `agent-org-run-message-delivery.ts:213`).
  - Fences refuse it for a Task-closed copy (283 F-09).
- **System input precedent.** Model Routing posts `new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
  sender_id, ...platformInputPrefaceMetadata(...) })` (`model-routing/services/model-router.ts:200-209`). Sender ids
  live in `agent-execution/domain/system-task-notification-senders.ts`. Agent memory records only listed sender ids
  (`agent-memory/services/runtime-memory-event-accumulator.ts:25-29`).
- **Stopped on purpose.** Only explicit Stop/delete/archive write `terminatedAt` (283 F-03; 284 BEH-007). Archived and
  deleted runs are in the history catalogs.
- **Version.** The server does not know its release version (G-06). The release version is
  `autobyteus-web/package.json` `version` (`RELEASE.md:187, 347`). Both server packagers run the server build first:
  the desktop's `prepare-server.mjs:178` (`pnpm -C <server> build`), and the Docker builder (`Dockerfile.monorepo`).
- **Startup.** After `listen`: `recoverAfterListen` (`server-runtime.ts:221`), then `scheduleStudioBackgroundTasks`
  (`:227`).

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Large`.**
  - A new capability area: `src/restart-resume/` (the record, the version identity, the recorder, the resumer).
  - Wiring in shutdown and startup.
  - A small list accessor on the root directory.
  - A build stamp.
  - Tests, plus a real-app proof across two builds.
- **Architectural risk: `High`.**
  - Automatic, unattended agent turns cost money.
  - New persisted data.
  - Shutdown and startup sequencing.
  - Cross-root delivery for every root kind.
- **Escalation triggers:**
  - a resume that duplicates work (a run resumed twice, or resumed while also messaged);
  - a stopped-on-purpose run resumed;
  - the record delaying shutdown or startup.

## Intended Change
- **D1, Release identity.** The server build writes `dist/release-identity.json` = `{ "version": <autobyteus-web
  package version> }`, through one small script run by `build:full`. `src/restart-resume/release-identity.ts` reads it
  once and returns `version | null` (missing or unreadable → `null`, logged). This is one writer and one reader; dev
  builds stamp the workspace version, and a server without a stamp never counts a restart as an update.
- **D2, Record at shutdown (REQ-001).** `server-runtime.ts` sets the cleanup to
  `() => recordBusyRunsThenClose()`: `await busyRunRecorder.record().catch(log)` first, then `app.close()`.
  - It runs inside 284's 10 s bound, before any `preClose` hook, so before any interrupt.
  - `BusyRunRecorder.record()`:
    1. snapshot `AgentRunManager.listActiveRuns()`;
    2. keep the runs whose status is `initializing` or `running`;
    3. for each, find its root through `ActiveCollaborationRootDirectory.rootOf(agentRunId)` (new: iterates the
       active roots and asks `hasAgentExecution`); a run with no root (application-owned, system-owned) is not
       recorded (DEC-005);
    4. write `<appDataDir>/restart-resume/busy-runs.json` atomically (`atomicWriteJsonFile`) as
       `{ recordedAt, version: releaseIdentity.version, entries: [{ root: { rootSubjectKind, rootRunId }, agentRunId,
       status }] }`.
  - With no busy runs it writes nothing and removes any old file.
- **D3, Resume after an update (REQ-002 to REQ-006).** A new background stage, after `recoverAfterListen`, that never
  blocks or fails startup:
  `RestartResumer.resumeAfterUpdate()`:
  1. read the record. Missing → nothing. Unreadable or invalid → log it and remove it (DESIGN rule 7: it is our own
     transient file, not run data);
  2. **consume it at once**: delete the file before any resume (REQ-005 once; a crash during resume does not repeat);
  3. update test: `record.version !== null && current !== null && record.version !== current`. Otherwise log
     "restart was not an update; nothing resumed" and stop (DEC-001 = A);
  4. eligibility per entry (REQ-003): skip when the run is already live (`AgentRunManager.getActiveRun`), has
     `terminatedAt`, is archived, or is gone (no history row). A Task-closed copy is refused by its root's fence when
     posted, and that is logged;
  5. resume up to **3 at a time** (DEC-002), root by root:
     - `root = await resolveOrRestore(entry.root)`, through the same three manager APIs as
       `remote-collaboration-composition.ts:51-53`, moved behind one function `resolveOrRestoreRoot` that both use
       (no copy);
     - `root.executeAgentCommand(entry.agentRunId, { kind: "post_message", message: restartNotice(entry, others) })`;
     - a result that is not accepted, or a throw, is logged; the run stays stopped (REQ-006).
  - Each entry is attempted once; a run that already got input from the user first is skipped by the live check, and
    the notice's dedupe key `restart-resume:<recordedAt>:<agentRunId>` prevents a double send.
- **D4, Notice (REQ-004).** `new AgentInputUserMessage(text, SenderType.SYSTEM, null, { sender_id:
  RESTART_RESUME_NOTICE_SENDER_ID, ...platformInputPrefaceMetadata({ content: text, senderId }) })`.
  - `RESTART_RESUME_NOTICE_SENDER_ID = "system.restart_resume"` is added to `system-task-notification-senders.ts` and
    to the recorded set in `runtime-memory-event-accumulator.ts`, so the notice is in the run's history.
  - The text, built by one function, says:
    - The application restarted at <time> after an update to <version>.
    - Your previous turn was interrupted.
    - Tool calls that were running have unknown results; check before repeating any of them.
    - If other runs of the same root were resumed with you: "Also resumed in this <team/org/run>: <names>."
      This tells a Project Task Manager which of its copies are already back, so it does not dispatch again.

## Change Scope (Mandatory)
- In scope: UC-001 to UC-003.
  - New: `src/restart-resume/` (`release-identity.ts`, `busy-run-record.ts` (shape, read, write), `busy-run-recorder.ts`,
    `restart-resumer.ts`, `restart-notice.ts`); `scripts/write-release-identity.mjs`.
  - Modified: `server-runtime.ts` (the cleanup wrapper; one background stage), `active-collaboration-root-directory.ts`
    (`rootOf`), `system-task-notification-senders.ts`, `runtime-memory-event-accumulator.ts`,
    `remote-collaboration-composition.ts` (uses the shared `resolveOrRestoreRoot`), `package.json` (`build:full`
    runs the stamp script).
  - Tests and docs.
- Deliberately left alone:
  - the desktop app and the Docker starter (the server detects updates by itself);
  - 284's shutdown order and bound;
  - the root fences and delivery rules;
  - Application platform runs and system-owned runs (Model Router);
  - idle runs;
  - the delegating node's observation reconnect (283 FU-003);
  - any setting (286) or update-click choice (287).
- Follow-ups: FU-001 (a hard kill or power loss leaves no record: a later step); FU-002 (a resume while the runtime's
  CLI is missing or signed out is only logged, with nothing shown to the user).

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Kind | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001; AC-001 | Any graceful shutdown (SIGTERM/IPC) | Record busy runs before cleanup | DS-001 |
| BEH-002 | System | REQ-002, REQ-005, REQ-006; AC-002, AC-004, AC-005 | Start of a new version on the same data | Consume the record; resume eligible runs | DS-002 |
| BEH-003 | System | REQ-003; AC-003 | — | Fenced runs skipped | DS-002 |
| BEH-004 | User | REQ-004; AC-002 | — | One system notice per resumed run | DS-002 |

## Task Design Health Assessment (Mandatory)
- Change posture: `Feature`.
- Root cause classification: `No Design Issue Found`. The existing owners already provide every piece: restore by
  kind, wake by `post_message`, system input, the live-run registry. The feature composes them in one new capability
  area.
- Refactor needed now: `Yes, small`. The by-kind root resolution in `remote-collaboration-composition.ts:51-53` gets
  one shared function, so remote messages and restart resume do not keep two copies.
- Residuals: FU-001, FU-002; the cost of an unattended resume, accepted by the user (DEC-001); runs resumed on a
  rolled-back Docker trial are resumed again by the restored version (correct: their work continues).

## Persisted Data / State Transition Decision
- New file `<appDataDir>/restart-resume/busy-runs.json`: transient, consumed at the next start, absence means "nothing".
- No existing data changes; no migration.
- Its reader tolerates a bad file (log, remove, continue).
- `dist/release-identity.json` is build output, not data.

## Data-Flow Spines
- DS-001: `SIGTERM | IPC → ServerProcessShutdown.request → cleanup = recordBusyRunsThenClose: BusyRunRecorder.record (AgentRunManager live runs → busy filter → ActiveCollaborationRootDirectory.rootOf → atomic write) → app.close() (284 order: native drain, fences, stops) → sweep → exit`
- DS-002: `startup … listen → recoverAfterListen → ★ RestartResumer.resumeAfterUpdate (read → delete → update test → eligibility → [≤3 at a time] resolveOrRestoreRoot → root.executeAgentCommand(post_message, restart notice)) → runs continue`

## Ownership
- `src/restart-resume/` owns:
  - the record's shape;
  - its one writer (the recorder) and its one reader (the resumer);
  - the update test;
  - the notice text.
- The root managers own restore; the roots own delivery and fences.
- `ActiveCollaborationRootDirectory` owns the "which root holds this run" lookup.
- `server-runtime.ts` owns the order: record before close; resume after listen.

## Interface Boundary Mapping
| Interface | Responsibility |
| --- | --- |
| `readReleaseIdentity(): string \| null` | The server's release version (cached) |
| `BusyRunRecorder.record(): Promise<void>` | Never throws to the caller; logs; bounded by 284's bound |
| `RestartResumer.resumeAfterUpdate(): Promise<ResumeReport>` | Never throws; returns counts for logs and tests |
| `ActiveCollaborationRootDirectory.rootOf(agentRunId): RootExecutionIdentity \| null` | Read-only |
| `resolveOrRestoreRoot(root: RootExecutionIdentity)` | One function, used by remote messages and restart resume |
| `buildRestartNotice(input): AgentInputUserMessage` | The only producer of the notice |

## Removal / Decommission Plan (Mandatory)
- The three inline resolvers in `remote-collaboration-composition.ts:51-53` are replaced by calls to
  `resolveOrRestoreRoot`.

## Concrete Examples
| Topic | Good | Avoided |
| --- | --- | --- |
| Once | read → delete file → resume from memory | resume, then delete (a crash repeats every resume) |
| Update test | `record.version && current && record.version !== current` | a timestamp or "file exists" test (resumes after every quit) |
| Wake | `root.executeAgentCommand(id, post_message(system notice))` | posting to an `AgentRun` directly for a Team/Org member (bypasses the root's fences) |
| Eligibility | skip live, `terminatedAt`, archived, gone | resuming every recorded id |

## Backward-Compatibility Rejection Log
| Candidate | Decision |
| --- | --- |
| A version env variable set by each launcher | Rejected: two writers; an old Docker starter would not set it after an in-place update |

## Change / Refactor Sequence
1. D1: the stamp script and reader, with tests.
2. `rootOf` and the shared `resolveOrRestoreRoot`; remote collaboration uses it, and its tests stay green.
3. D2: the recorder and the cleanup wrapper, with tests (record before `preClose`; busy only; no root → skipped).
4. D4: the notice and the sender id, with the memory accumulator test.
5. D3: the resumer and the startup stage, with tests: no file; bad file; not an update; update with every eligibility
   case; once (the file is deleted before the first resume); concurrency 3; a throw is logged.
6. Docs: `agent_execution.md` (restart resume) and a new module doc `restart_resume.md`.
7. Validation (API/E2E), on separate data only:
   - **AC-002 real app:** build version X; busy standalone Codex, standalone Claude, a Team member, an Org agent, and a
     standalone root with a busy delegated copy; quit. Rebuild the same code stamped X+1 (the stamp is the only
     difference); start it on the same isolated data root. All of them continue, each with one notice, and the root
     host's notice lists its copy.
   - The Docker in-place update on a test container (the autobyteus-305 path) where feasible.
   - **AC-003:** a stopped-on-purpose busy run, an archived run, a Task-closed copy, an idle run, and a run messaged by
     the user first.
   - **AC-004:** a plain quit and relaunch of the same build resumes nothing.
   - **AC-005:** a corrupt record; a crash during resume, then a start.
   - Codex uses `gpt-6.1-terra`.

## Key Tradeoffs
- **The update is detected by the server itself (a version stamp)** rather than by the launchers: it covers the
  desktop install, the Docker in-place update, an image upgrade and a manual reinstall, with one writer and no
  cross-process contract.
- **Delete the record before resuming:** a resume never repeats, at the price of no retry after a crash (REQ-005,
  intended).
- **Wake through the root:** fences and delegated-child rules apply unchanged.

## Risks
- A record write slower than expected eats into 284's 10 s bound: it is one in-memory scan and one small file.
- Many busy Claude runs resume at once: capped at 3 (memory ~260–480 MB each, 283).
- Duplicate work: the live check and the dedupe key; 284 guarantees one server.

## Guidance For Implementation
- Never resume without the update test; never resume from a file that was not deleted first.
- Tests only on temporary data roots; never the user's data.
