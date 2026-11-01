# Design Spec — restart-resume (autobyteus-285)

## Solution And Approval Basis
- Current solution revision ID: `SR-004` (ARCH-REV-001: AR-001 to AR-006). SR-003 is in git history.
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
- **Waking with input.**
  - Every root kind has `executeAgentCommand(agentRunId, { kind: "post_message", message })` for its **children and
    members**: `standalone-agent-run-root.ts:369`, `root-team-run.ts:287`, `agent-org-run.ts:399`. Operator input wakes
    a shut-down delegated child ("exactly like send_message_to", `agent-org-run-message-delivery.ts:213`).
  - A **standalone host is not reachable that way**: "Commands for children only; the host's commands come through its
    own Agent stream" (`standalone-agent-run-root.ts:368-375`). `standalone-root-message-delivery.ts:254-259` returns
    `AGENT_ROOT_HOST_COMMAND_REJECTED`.
  - The host takes `postHostUserMessage({ message, postOptions })` (`:315-320`), or
    `StandaloneAgentRunRootManager.postUserMessage({ runId, ... })` (`standalone-agent-run-root-manager.ts:182-187`;
    resolves or restores the root first). Remote paired access uses it (`standalone-paired-agent-access.ts:88`).
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
  - `placeOf` on the root directory, with the `isDelegatedRun` boundary query in the three root kinds; the shared root resolver (D5).
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
    1. snapshot `AgentRunManager.listActiveRuns()` (the process manager; application scopes have their own managers,
       so DEC-005 holds, N-3);
    2. keep the runs whose status is `initializing` or `running`;
    3. for each, find its root and its place in it through `ActiveCollaborationRootDirectory.placeOf(agentRunId)`.
       This is new: it iterates the active roots, asks `hasAgentExecution`, and then the new boundary query
       `isDelegatedRun(agentRunId)`, answered by each root from its task-execution adapter (a delegated Agent by its
       run id, or a member of a delegated Team). It returns `{ root, place: "host" | "member" | "delegated" }`:
       - `host`: root kind `agent` and `agentRunId === rootRunId`;
       - `delegated`: a delegated run (copy);
       - `member`: a Team or Org member.
       A run with no root (application-owned, system-owned) is not recorded (DEC-005);
    4. **only when there are entries (AR-005):** read an existing record if valid, keep its entries whose run is not in
       the new set, add the new ones, and write `<appDataDir>/restart-resume/busy-runs.json` atomically
       (`atomicWriteJsonFile`) as `{ entries: [{ root: { rootSubjectKind, rootRunId }, agentRunId, place, status,
       recordedAt, version }] }`. **`version` is per entry**, so entries from an earlier, not-yet-resumed update
       keep their own version.
  - The recorder never deletes. With no busy runs it does nothing, so a cleanup that runs before the resumer (a quit
    right after an update relaunch, or the startup-failure path's `cleanupOnce()`) cannot remove an unconsumed record.
- **D3, Resume after an update (REQ-002 to REQ-006).** A new background stage, after `recoverAfterListen`, that never
  blocks or fails startup. `RestartResumer.resumeAfterUpdate()`:
  1. read the record. Missing → nothing. Unreadable or invalid → log it and remove it (DESIGN rule 7: it is our own
     transient file, not run data). **The resumer is the only deleter;**
  2. **consume it at once**: delete the file before any resume (REQ-005 once; a crash during resume does not repeat);
  3. **update test per entry:** `entry.version !== null && current !== null && entry.version !== current`. Entries
     that fail it are dropped with one log line, "restart was not an update" (DEC-001 = A);
  4. group the remaining entries by root, and order each root's entries in **two waves (AR-003)**: first its
     `delegated` and `member` entries, then its `host` entry;
  5. run at most **3 posts at a time** (DEC-002; the limiter counts posts, and a host waiting for its wave holds no slot, N-7). For each entry, **immediately before posting (AR-002)**,
     check eligibility:
     - skip when the run is live (`AgentRunManager.getActiveRun(id)` is not null): something, the user or a
       coordinating run, already started it. This is what REQ-003's "already received new input" means: any input
       restores and activates a run, so a live run has had new input or is otherwise running, and a second turn must
       not be started;
     - skip when it has `terminatedAt`, is archived, or is gone (no history row, or no Team/Org history row for a
       member);
     - a Task-closed delegated run is refused by its root's fence, and that is logged;
  6. dispatch by place (**AR-001**):
     - `host`: `standaloneRootManager.postUserMessage({ runId, message, postOptions: { lifecycleObserver } })`. A
       standalone host's commands do not go through `executeAgentCommand`, which rejects them
       (`standalone-root-message-delivery.ts:254-259`, `AGENT_ROOT_HOST_COMMAND_REJECTED`);
     - `member` and `delegated`: `root = await rootResolver.resolveOrRestore(entry.root)` (AR-004), then
       `root.executeAgentCommand(entry.agentRunId, { kind: "post_message", message })`. That wakes a shut-down
       delegated child and keeps the root's fences;
     - a result that is not accepted, or a throw, is logged, and the run stays stopped (REQ-006). Only accepted
       entries count as resumed.
- **D4, Notice (REQ-004, AR-001).** It is built by one function, `buildRestartNotice({ entry, resumedDelegated })`, in
  the same shape as the Model Router's system request (`model-routing/services/model-router.ts:200-209`):
  - `new AgentInputUserMessage(text, SenderType.SYSTEM, null, metadata)` with
    `metadata = { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, message_id, dedupe_key,
    ...platformInputPrefaceMetadata({ content: text, senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: null
    }) }`;
    - `RESTART_RESUME_NOTICE_SENDER_ID = "system.restart_resume"`, added to `system-task-notification-senders.ts` and
      to the recorded set in `runtime-memory-event-accumulator.ts:25-29`, so the notice is kept in the run's memory
      and history;
    - `message_id = "restart-resume:" + entry.recordedAt + ":" + entry.agentRunId`;
    - `dedupe_key = "agent_run_input:" + agentRunId + ":" + message_id` (the web's scheme,
      `autobyteus-web/stores/agentRunStore.ts:170`). Both are read by the pending-input snapshot and the history
      projection (`run-projection-dedupe.ts:93`); they are display and projection keys, **not** a send guard (AR-002).
      The guard is the live check in D3.5.
  - **How it shows:**
    - host: as the Model Router does, the `lifecycleObserver` publishes `SYSTEM_TASK_NOTIFICATION { sender_id,
      content, turn_id }` when the input is forwarded, so the window shows a system notice, not a user message;
    - member and delegated: the root publishes the posted message as the member's input
      (`configured-agent-execution-handle.ts:147-152`, `member_input`). That event must show a `SYSTEM`-sender message
      as a system notice; the implementation checks the member presentation and adds the sender mapping if it is
      missing (test).
  - Text:
    - The application restarted at <time> after an update to <version>.
    - Your previous turn was interrupted.
    - Tool calls that were running have unknown results; check before repeating any of them.
    - For a `host` or `member` entry whose root had `delegated` entries accepted in wave 1: "These runs you delegated
      were resumed too and are working: <names>". It lists only accepted ones; a refused one is not listed.
  - Recipients of that list (AR-003):
    - in a standalone root, its host, the coordinating run of its delegated runs;
    - in a Team or an Org, every resumed `member`, because the coordinating member of each delegated run is not
      recorded in the task reference (`task-execution-reference.ts:2`). Telling all resumed members is harmless and
      prevents a re-dispatch.
- **D5, Shared root resolver (AR-004).** `src/compositions/collaboration-root-resolver.ts`:
  `createCollaborationRootResolver({ standaloneRoots, teamRuns, orgRuns }): CollaborationRootResolver`, built once in
  `build-studio-server.ts`, where the team and org run services exist, and passed to the remote-collaboration
  composition and to restart resume.
  - `resolveOrRestore(root: RootExecutionIdentity): Promise<ResolvedRoot | null>`, where `ResolvedRoot` is tagged by
    kind: `{ kind: "agent", root: StandaloneAgentRunRoot } | { kind: "agent_team", root: RootTeamRun } | { kind:
    "agent_org", root: AgentOrgRun }`.
  - One failure contract:
    - `null` means "no such root here": deleted history, a non-eligible run (`resolveRoot` returns null), or the
      managers' not-found errors (`StandaloneRootUnavailableError`, the team and org not-found errors), which are
      mapped to `null`;
    - any other error is thrown, as a restore failure.
  - `RemoteRootDirectory.standalone/team/org` delegate to it. The remote receiver keeps its own error handling
    (`this.resolve(...)`), so remote behavior is unchanged.

## Change Scope (Mandatory)
- In scope: UC-001 to UC-003.
  - New: `src/restart-resume/` (`release-identity.ts`, `busy-run-record.ts` (shape, read, write), `busy-run-recorder.ts`,
    `restart-resumer.ts`, `restart-notice.ts`); `scripts/write-release-identity.mjs`.
  - Modified: `server-runtime.ts` (the cleanup wrapper; one background stage), `active-collaboration-root-directory.ts`
    (`placeOf`; the `isDelegatedRun` boundary query, implemented by the standalone, Team and Org roots), the member input presentation if it does not yet show a SYSTEM sender as a notice, `build-studio-server.ts` (builds the root resolver); new `src/compositions/collaboration-root-resolver.ts`, `system-task-notification-senders.ts`, `runtime-memory-event-accumulator.ts`,
    `remote-collaboration-composition.ts` (its `RemoteRootDirectory` delegates to the shared resolver, D5), `package.json` (`build:full`
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
  CLI is missing or signed out is only logged, with nothing shown to the user); FU-003 (a Docker trial rollback with a
  data copy, AR-006).

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
- Residuals:
  - FU-001 and FU-002;
  - the cost of an unattended resume, accepted by the user (DEC-001);
  - **Docker trial rollback (AR-006):**
    - without a data copy, runs resumed on a failed trial are resumed again by the restored version, from the trial's
      own record. That is correct: their work continues;
    - **with a data copy** (`needsCopy`), `dataCopy.restore()` brings back the pre-trial data, including the record as
      it was before the trial consumed it, with entries of the old version. The old version then resumes nothing,
      because its entries carry its own version. The turns the trial ran may leave external side effects while
      their history is reverted.
    - This is accepted as a rare residual of a failed update and recorded as FU-003.

## Persisted Data / State Transition Decision
- New file `<appDataDir>/restart-resume/busy-runs.json`: transient, consumed at the next start, absence means "nothing".
- No existing data changes; no migration.
- Its reader tolerates a bad file (log, remove, continue).
- `dist/release-identity.json` is build output, not data.

## Data-Flow Spines
- DS-001: `SIGTERM | IPC → ServerProcessShutdown.request → cleanup = recordBusyRunsThenClose: BusyRunRecorder.record (AgentRunManager live runs → busy filter → ActiveCollaborationRootDirectory.placeOf → only with entries: merge and atomic write) → app.close() (284 order: native drain, fences, stops) → sweep → exit`
- DS-002: `startup … listen → recoverAfterListen → ★ RestartResumer.resumeAfterUpdate (read → delete → per-entry update test → group by root, delegated and members before host → [≤3 at a time] re-check eligibility → host: standaloneRootManager.postUserMessage | member, delegated: rootResolver.resolveOrRestore → root.executeAgentCommand(post_message) → host notice lists accepted delegated runs) → runs continue`

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
| `CollaborationRootResolver.resolveOrRestore(root): Promise<ResolvedRoot \| null>` | One function (D5), used by remote messages and restart resume; null = not here, throw = restore failure |
| `ActiveRootMessageBoundary.isDelegatedRun?(agentRunId): boolean` | New boundary query, answered by each root kind's task-execution adapter |
| `ActiveCollaborationRootDirectory.placeOf(agentRunId): { root, place } \| null` | Replaces the SR-003 `rootOf` |
| `buildRestartNotice(input): AgentInputUserMessage` | The only producer of the notice |

## Removal / Decommission Plan (Mandatory)
- The three inline resolvers in `remote-collaboration-composition.ts:51-53` are replaced by delegation to `CollaborationRootResolver` (D5).

## Concrete Examples
| Topic | Good | Avoided |
| --- | --- | --- |
| Once | read → delete file → resume from memory | resume, then delete (a crash repeats every resume) |
| Update test | per entry: `entry.version && current && entry.version !== current` | a timestamp or "file exists" test (resumes after every quit) |
| Wake | host → `standaloneRootManager.postUserMessage`; member or delegated → `root.executeAgentCommand(id, post_message)` | `executeAgentCommand` for a host (rejected, AR-001); posting to an `AgentRun` directly (bypasses the root's fences) |
| Eligibility | re-checked immediately before each post (live, `terminatedAt`, archived, gone) | checking once before the queue (AR-002) |
| Order | per root: delegated and members first, then the host with the accepted list | one flat queue (a host can re-dispatch before its copies are back, AR-003) |
| Record | recorder writes only with entries and merges; resumer is the only deleter | the recorder removing the file (AR-005) |

## Backward-Compatibility Rejection Log
| Candidate | Decision |
| --- | --- |
| A version env variable set by each launcher | Rejected: two writers; an old Docker starter would not set it after an in-place update |

## Change / Refactor Sequence
1. D1: the stamp script and reader, with tests.
2. `placeOf` with `isDelegatedRun` in the three root kinds; the shared `CollaborationRootResolver` (D5); remote collaboration delegates to it, and its tests stay green.
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
   - **N-2:** check that the deployed server package (`pnpm deploy`) carries `dist/release-identity.json`, in the desktop app bundle and in the Docker package.
   - **New cases (AR-001 to AR-005):** a busy standalone host with no children; a run the user messages, Stops or archives while it waits in the queue (not resumed); a root with one delegated run refused (the host's list excludes it); a quit right after an update relaunch, before the resumer ran (the record survives and is resumed at the next start).
   - **AC-003:** a stopped-on-purpose busy run, an archived run, a Task-closed copy, an idle run, and a run messaged by
     the user first.
   - **AC-004:** a plain quit and relaunch of the same build resumes nothing.
   - **AC-005:** a corrupt record; a crash during resume, then a start.
   - Codex uses `gpt-6.1-terra`.

## Key Tradeoffs
- **Why a dist stamp although Docker packages carry `server-package.json.version` (N-1):** the desktop's packaged server has no such file. One stamp written by the server build serves both, and the server reads one source.
- **The update is detected by the server itself (a version stamp)** rather than by the launchers: it covers the
  desktop install, the Docker in-place update, an image upgrade and a manual reinstall, with one writer and no
  cross-process contract.
- **Delete the record before resuming:** a resume never repeats, at the price of no retry after a crash (REQ-005,
  intended).
- **Wake through the root:** fences and delegated-child rules apply unchanged.

## Risks
- A record write slower than expected eats into 284's 10 s bound: it is one in-memory scan and one small file.
- Many busy Claude runs resume at once: capped at 3 (memory ~260–480 MB each, 283).
- Duplicate work: the live check immediately before each post (AR-002); 284 guarantees one server.

## Guidance For Implementation
- Never resume without the update test; never resume from a file that was not deleted first.
- Tests only on temporary data roots; never the user's data.
