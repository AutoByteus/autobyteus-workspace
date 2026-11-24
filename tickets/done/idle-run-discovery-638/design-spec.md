# Design Spec — autobyteus-638 A restart keeps a person's runs running

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (ARCH-REV-001 AR-001: the restore window is owned; residuals R-1..R-3 taken in)
- Approved requirements: [requirements-doc.md](requirements-doc.md) SR-002, approved by the founder on 2026-11-24 in conversation (quotes there)
- User approval of the design: `Not required` (the Task asked for approval before implementing; the founder approved the approach)
- Design status: `Ready`
- Investigation notes: [investigation-notes.md](investigation-notes.md) (§1 incident, §3 volume, §3a memory, §3b code facts)
- Authorities read (2026-11-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 1, 5, 7, 9, 10, 11), `autobyteus-server-ts/docs/modules/restart_resume.md`, `docs/design/collaboration_model.md` (CM-3, CM-5..7, CM-13, §1 terms)
- Conflicts: none

## Current-State Read

- A run is brought back after a restart only by `RestartResumer`, and only when it was busy and the restart was an update. Its record (`busy-runs.json`, `BusyRunRecorder`) holds busy runs only.
- An idle run a person started is unloaded by every restart (notes §1, §3b).

## Task Size And Architectural Risk (Mandatory)

- task_size: `Medium`. Changes:
  - two new owners in `restart-resume/` plus one record file;
  - one new method on the Team root, through its backend and manager;
  - composition and startup wiring;
  - tests and docs.
- architectural_risk: `High`:
  - startup lifecycle on every node;
  - a new persisted (transient) record;
  - resource use, since each run brought back is a runtime process (notes §3a);
  - concurrency with the update wake and with first input.
- Escalation trigger: any need to bring back a run that was not running at the stop, to post input, or to change `busy-runs.json`.

## Intended Change

A new **running-run record** lists the runs a person started whose entry agent is running:

- an Agent run's agent;
- a Team run's coordinator.

It is kept like the busy-run record: rewritten on change while the node runs (2 s checks) and written last at a graceful stop.

At the next start, after the update wake, a **running-run restorer** brings each recorded run back. It restores the root, then makes its entry agent ready without posting anything. A run is skipped when:

- it is already running;
- it is archived, stopped or gone;
- it was not started by a person.

Each failure is logged with the run and the reason.

## Change Scope (Mandatory)

- **In scope:** UC-001, UC-002.
  - `autobyteus-server-ts/src/restart-resume/` (new record, recorder, restorer);
  - `compositions/restart-resume-composition.ts`, `compositions/build-studio-server.ts`, `server-runtime.ts`;
  - Team root readiness: `agent-team-execution/domain/root-team-run.ts`, `domain/team-run.ts`, `backends/team-run-backend.ts`, `local/flat-team-run-backend.ts`, `local/flat-team-execution-manager.ts`;
  - docs: `restart_resume.md`, `collaboration_model.md` §1 "Running agent" note.
- **Derived consumers:** none. Nothing reads the new file but the restorer. `list_running_agents` and `send_message_to` read live state as today.
- **Deliberately left alone:**
  - `busy-runs.json`, `BusyRunRecorder`, `RestartResumer` and reminders (REQ-005);
  - delegated-run idle shutdown;
  - Org runs;
  - application-owned runs;
  - the 492 tool rules;
  - the web UI.
- **Follow-ups:** none.

## Data Contract (Mandatory)

- Location: this section.
- Shown to the founder: in the result message after this design.

### C-1 `<appDataDir>/restart-resume/running-runs.json` (new, transient)

```json
{ "runs": [
  { "rootSubjectKind": "agent", "rootRunId": "project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0" },
  { "rootSubjectKind": "agent_team", "rootRunId": "marketing_team_9c1e…" }
] }
```

| Field | Meaning | Writer | Reader |
| --- | --- | --- | --- |
| `runs[]` | The root identities of the runs a person started whose entry agent was running when written | `RunningRunRecorder` | `RunningRunRestorer` |
| `rootSubjectKind` | `agent` or `agent_team` (never `agent_org`) | recorder | restorer: which root, and which entry agent to make ready |
| `rootRunId` | The run's ID | recorder | restorer |

- Nothing else is stored:
  - the entry agent comes from the root itself (a standalone root's own agent; a Team's coordinator from its tree);
  - no time, status or version is stored, because nothing reads them. The cause of the restart doesn't matter (DEC-005).
- **Lifecycle:**
  - Taken (read, **not removed**) once at startup, before this session's recorder starts. The taken runs are **pending** in the restorer until each is restored, skipped or failed (SR-003, AR-001).
  - The recorder is the file's only writer. Its set is `running ∪ pending`, so a stop or crash during the restore window keeps every run not yet handled.
  - Rewritten by the recorder only when the set changes; removed when the set is empty (nothing running, nothing pending).
  - Final write at the graceful stop, before the close stops anything: `running ∪ pending`. It first awaits the startedByPerson reads in flight, bounded at 1 s in total (R-1); a root whose read did not finish in time is left out and logged.
  - Absent means nothing to bring back.
  - An invalid file is logged and nothing is brought back; the recorder's first write replaces or removes it.
- **Invariants:**
  - one entry per root, sorted by kind then ID, so equal sets compare equal;
  - only runs a person started (`startedByPerson`), never delegated runs or Org units. `agent_org` roots from `liveRoots()` are skipped explicitly (R-3).
  - "Running" is the entry agent's live status as `RunningAgents.statusesOf` gives it: `initializing`, `running`, `idle` or `error`, never `offline`. A run whose agent is in `error` is recorded and comes back like the others; it was loaded, and the restore retries its start (R-2).

### C-2 New Team root method

```ts
/** Makes this member's agent ready (activated or restored), without input; the live run when it already runs. */
RootTeamRun.ensureAgentReady(agentRunId: string): Promise<AgentRun>
```

The chain is RootTeamRun → `TeamRun` → `TeamRunBackend.ensureDirectAgentReady(agentRunId)` → `FlatTeamExecutionManager` → `ConfiguredAgentExecutionHandle.getOrCreateAgentRun()`.

- It refuses as `executeAgentCommand` does for an unknown member: `RUN_NOT_FOUND`.
- It runs in the root's materialization gate. The closed-Task fence doesn't apply, because a person-started Team has no delegating Task. The method is not called for delegated Teams.

### Data Contract Validation

Walks:

1. **Graceful restart, idle Agent run (the incident).**
   - Recorder entry `{agent, project_task_manager_2f41…}`; final write at the stop.
   - Start: taken. Restorer: history `present`; `startedByPerson` true; not live; `resolveOrRestore`, then `ensureAgentReady()`.
   - The agent becomes `idle`, so `list_running_agents` lists it and messages reach it.
2. **Crash.** The live record is at most 2 s old (last change), and the same walk follows. A run that started in the last 2 s may be missed (accepted, REQ-001).
3. **Idle Team run.** Entry `{agent_team, …}`. Restorer: `resolveOrRestore(team root)`, then `root.ensureAgentReady(coordinatorAgentRunId)`. The coordinator becomes `idle` and the Team is listed by its coordinator ID.
4. **Update with a busy run.** The run is in both records. The resumer runs first: it restores the run and posts the reminder. Then the restorer finds it already live and skips it.
4b. **A stop or crash during the restore window (AR-001).** The file still holds every taken run. The recorder's first write is `running ∪ pending`, and each run leaves `pending` only when restored (it is then running, so still recorded), skipped (retired, so rightly dropped) or failed (logged). A second stop writes `running ∪ pending`; a crash leaves the last write. The next start brings back what wasn't handled.
5. **Plain restart with a busy run.** It is in both records; the resumer posts nothing. The restorer restores it idle, and the reminder rides its next input, exactly once, as today (REQ-005).
6. **Archived or stopped while down.** That can't happen while the node is down. If the person archives or stops the run during the restore window, the restorer re-reads history after the restore and stops nothing; the person's action wins through its own path. Before the restore, history `archived`/`terminated` means skip.
7. **Delegated run or Org unit.** Never recorded (`startedByPerson` false). Their own lifecycle applies (BEH-003).
8. **A run that was unloaded before the stop.** Not live, so not recorded and not brought back (AC-006).
9. **Unrestorable run** (runtime missing, file unreadable). `resolveOrRestore` or ready throws: logged `Running run '<kind>:<id>' was not brought back: <reason>`, and the next one goes on (REQ-004, DESIGN rule 7).

- Checks against real data and dependencies (read-only):
  - The PTM run files on docker-8001 have `terminatedAt: null` after a restart, so a shutdown doesn't mark runs stopped (notes §3b).
  - The standalone restore-without-post path runs in production: "Restart resume resumed member run …", line 758285.
  - The memory a run brought back costs (notes §3a).
- Contract changes from the validation: no `entryAgentRunId` (the root knows its entry agent); no `recordedAt`/`shutdownAt`/`version` (no reader).

## Persisted Data / State Transition Decision

- Subject: the new transient file only. Existing data: `Not Affected` (a node upgrading has no file; the first session writes it).

## Data-Flow Spine Inventory

| Spine | Start | End | Owner | Why |
| --- | --- | --- | --- | --- |
| DS-001 record | 2 s check / graceful stop | `running-runs.json` | `RunningRunRecorder` | Know what was running (REQ-001) |
| DS-002 restore | Server start (after listen, after the update wake) | Entry agents ready, idle | `RunningRunRestorer` | Bring them back (REQ-002, REQ-003) |

## Primary Execution Spines

- DS-001: `interval / cleanup → RunningRunRecorder.tick/record → RunningAgents.liveRoots (agent_org skipped) + statusesOf + teamCoordinatorOf (entry agent not offline?) → startedByPerson (RunOwnAgentsReader.listingFactsOf, once per root, remembered) → ∪ RunningRunRestorer.pending() → writeRunningRunRecord`
- DS-002: `server-runtime (after listen) → RestartResumer.resumeAfterRestart (unchanged) → RunningRunRestorer.restore(taken) → per run, max 3 at a time: rootHistory → listingFactsOf.startedByPerson → already live? → CollaborationRootResolver.resolveOrRestore → StandaloneAgentRunRoot.ensureAgentReady() | RootTeamRun.ensureAgentReady(coordinator) → log`

## Ownership Map

| Owner | Owns |
| --- | --- |
| `running-run-record.ts` | C-1 shape: path, tolerant reader (`missing`/`invalid`/`present`), atomic writer, remove |
| `RunningRunRecorder` | Which runs are recorded and when (`running ∪ pending`); the startedByPerson fact per root, remembered for the root's life in this session; the only writer of the file |
| `RunningRunRestorer` | `take()` at startup (read only); the **pending** set and its shrinking per outcome; `restore()`: skips, restore, ready, logging, concurrency 3 |
| `RootTeamRun.ensureAgentReady` | Making one member ready in its root's gate |
| `server-runtime.ts` | Order: take both previous records → start both recorders → cleanup writes both first → after listen: wake, then restore |

## Removal / Decommission Plan

None. Nothing becomes unnecessary, and no dead code was found in the touched files.

## Off-Spine Concerns

- **Logging:**
  - one info line per start: `Running runs after the restart: N brought back, S skipped, F failed`;
  - one line per skip or failure, naming the run.
- **Concurrency limiter:** the same 3-slot pattern as `RestartResumer`. Extracting `createPostLimiter` for reuse is allowed if done verbatim; otherwise it is duplicated. Implementer's choice, recorded in the handoff.

## Dependency Rules

- `restart-resume` → `agent-collaboration/running` (RunningAgents), `run-history/store` (RunOwnAgentsReader), `compositions/collaboration-root-resolver` (as the resumer).
- The Team root method does not depend on restart-resume.

## Interface Boundary Mapping

```ts
// restart-resume/running-run-record.ts
export type RunningRunRecord = Readonly<{ runs: readonly RootExecutionIdentity[] }>;   // kinds agent | agent_team
export const runningRunRecordPath = (appDataDir: string): string;
export const readRunningRunRecord / writeRunningRunRecord / removeRunningRunRecord;

// restart-resume/running-run-recorder.ts
export class RunningRunRecorder {
  constructor(deps: { running: Pick<RunningAgents, "liveRoots" | "statusesOf" | "teamCoordinatorOf">;
    runFiles: Pick<RunOwnAgentsReader, "listingFactsOf">; recordPath: string; intervalMs?: number });
  startSession(): void;          // as BusyRunRecorder
  record(): Promise<void>;       // final write; never throws
}

// restart-resume/running-run-restorer.ts
export class RunningRunRestorer {
  constructor(deps: { recordPath: string; rootHistory: (root) => Promise<RootHistoryState>;
    runFiles: Pick<RunOwnAgentsReader, "listingFactsOf">; running: Pick<RunningAgents, "rootOf" | "teamCoordinatorOf">;
    rootResolver: CollaborationRootResolver; concurrency?: number });
  take(): Promise<void>;                                  // reads the file into pending (never removes it); invalid → logged, pending empty (the recorder's first write replaces or removes the file; it stays the only writer)
  pending(): readonly RootExecutionIdentity[];            // the taken runs not yet restored, skipped or failed (the recorder's question)
  restore(): Promise<Readonly<{ restored: number; skipped: number; failed: number }>>;  // works through pending; never throws
}
```

- The recorder receives `pending: Pick<RunningRunRestorer, "pending">` (a question it asks; the restorer owns the set). The composition builds the restorer first, then the recorder with it.
- The recorder's check is synchronous on live state. The startedByPerson read is async and happens once per newly live root; the write is skipped while it is pending (as `BusyRunRecorder` skips during a write).
- `rootHistory` is the existing function in `restart-resume-composition.ts`, passed in (one owner).

## Existing Capability Reuse Check

- Restore: `CollaborationRootResolver.resolveOrRestore` and `ensureAgentReady` (the resumer's path).
- History states: `rootHistory`.
- Person-started: `listingFactsOf`.
- Running: `RunningAgents`.
- Atomic write: `atomicWriteJsonFile`.
- Not reused: `busy-runs.json`. Adding non-busy runs to it would give "busy" a second meaning (P15) and change the resumer's reader.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `src/restart-resume/running-run-record.ts` | New: C-1 |
| `src/restart-resume/running-run-recorder.ts` | New: DS-001 |
| `src/restart-resume/running-run-restorer.ts` | New: DS-002 |
| `src/compositions/restart-resume-composition.ts` | Compose both, with `running` and `runFiles`; export `runningRuns: { recorder, restorer }` |
| `src/compositions/build-studio-server.ts` | Pass `running` (the `RunningAgents` already built there) and the run-files reader |
| `src/server-runtime.ts` | `takePreviousSession()` and `runningRestorer.take()`, then both recorders start. Cleanup: `await recorder.record(); await runningRecorder.record();` first. After listen: `void restartResumer.resumeAfterRestart(previous).then(() => runningRestorer.restore())` |
| `src/agent-team-execution/domain/root-team-run.ts`, `domain/team-run.ts`, `backends/team-run-backend.ts`, `local/flat-team-run-backend.ts`, `local/flat-team-execution-manager.ts` | C-2 |
| `docs/modules/restart_resume.md` | New section "Running runs come back" |
| `docs/design/collaboration_model.md` | §1 "Running agent": a restart doesn't end one a person started (since autobyteus-638) |

## Concrete Examples

Restorer, per run (good shape: explicit skips, nothing posted):

```ts
const state = await this.deps.rootHistory(root);
if (state !== "present") return skip(root, state);
if (!(await this.deps.runFiles.listingFactsOf(root))?.startedByPerson) return skip(root, "not started by a person");
const entry = root.rootSubjectKind === "agent" ? root.rootRunId : null;        // a Team's coordinator is read after the restore
if (entry && this.deps.running.rootOf(entry)) return skip(root, "already running");
const resolved = await this.deps.rootResolver.resolveOrRestore(root);
if (!resolved) return fail(root, "its root is not on this node");
if (resolved.kind === "agent") await resolved.root.ensureAgentReady();
else {
  const coordinator = this.deps.running.teamCoordinatorOf(root.rootRunId);
  if (!coordinator) return fail(root, "its Team has no coordinator");
  await resolved.root.ensureAgentReady(coordinator);
}
```

Bad shape (avoided): posting an empty or "you were restarted" input to make the agent live. That spends a model call and breaks the reminder's exactly-once rule.

## Backward-Compatibility Rejection Log

- None needed. No old file exists, and no version branches.

## Change Sequence

1. C-2 (Team readiness) with a unit test.
2. Record file and its tests.
3. Recorder.
4. Restorer.
5. Composition and runtime wiring.
6. Built-server E2E across a graceful restart and a kill (AC-001, AC-002).
7. Docs.

## Key Tradeoffs

- **Separate record vs extending `busy-runs.json`.** One word, one meaning; the resumer stays untouched. Cost: a second 2 s check over the live roots (synchronous, in memory).
- **Running at the stop (DEC-003 (1)) vs every unarchived run.** Memory stays as it was before the stop (notes §3a). Runs already unloaded wait for their person, as today.

## Risks

- **Startup load.** Every recorded run's runtime starts within seconds of listening, at most 3 at a time. On docker-8001 that is the same set that was running, a few hundred MB each.
- **First input racing the restore.** Both go through the root's gate. The resumer's restore path already handles the same race.
- **A Team root with a failed coordinator start.** Logged; the Team stays registered with its coordinator not running, as a failed start today.

## Guidance For Implementation

- Tests:
  - unit tests for the record reader (missing, invalid, present) and the recorder (set changes, Orgs, delegated runs, coordinator not started, final write);
  - unit tests for the restorer (every skip, failure isolation, concurrency, order after the resumer, pending shrinking per outcome);
  - **a stop in the middle of the restore keeps the unrestored runs** (recorder final write = running ∪ pending), and so does a crash (the last write) (AR-001);
  - the recorder's final write awaits an in-flight startedByPerson read (R-1); `agent_org` roots are never recorded (R-3); an `error` entry agent is recorded (R-2);
  - the Team `ensureAgentReady` unit test;
  - a built-server E2E: start a run and let it go idle, restart gracefully, then `list_running_agents` lists it and `send_message_to` delivers. Then kill -9 and the same. A Team case as well.
- Keep `busy-runs.json` and `RestartResumer` untouched (existing suites green).
