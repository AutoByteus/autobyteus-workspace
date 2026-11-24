# Implementation Handoff — autobyteus-638 A restart keeps a person's runs running

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (`Medium`/`High`);
  ARCH-REV-002 Pass on SR-003. Handoff rule for a completed implementation with High risk → `/code_reviewer`.
- Requirements doc: [requirements-doc.md](requirements-doc.md) (Approved, SR-002)
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Solution revision record: [solution-revision-record.md](solution-revision-record.md)
- Design spec (required on every route): [design-spec.md](design-spec.md) (Ready, SR-003)
- Supplemental task artifacts: [follow-ups.md](follow-ups.md) (FU-001, new)
- Design review report: [design-review-report.md](design-review-report.md) (ARCH-REV-002; the reviewer's round-2 edits,
  not committed by me)
- Architecture review revision record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
  (the reviewer's edits, not committed by me)
- Triggering rework report, revision record, or evidence: N/A (initial).

## Current Implementation Summary

A new running-run record (`<appDataDir>/restart-resume/running-runs.json`, C-1) lists the Agent and Team runs a person
started whose entry agent runs. `RunningRunRecorder`, its only writer, records `running ∪ pending` every 2 s and at the
graceful stop. `RunningRunRestorer` takes the record at startup without removing it, and after the update wake brings
each run back, at most 3 at a time: root restored, entry agent made ready (a Team's coordinator through the new
`RootTeamRun.ensureAgentReady`, C-2), no input posted. Skips and failures are logged and isolated.

- Implementation cycle: `Initial`
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: AR-002 (non-blocking; fixed: the recorder's last-written set starts unknown, so the first
  check always writes or removes; test "AR-002: the first check removes a stale or invalid file …")

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change stayed in the named owners (three new files in
  `restart-resume/` plus a shared limiter, one new Team-root method through its chain, composition and startup wiring).
  The High drivers are the designed ones: startup lifecycle on every node, a new transient persisted record, runtime
  processes started at startup, concurrency with the update wake and first input.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No run that was not running at the stop is brought back, nothing is
  posted, `busy-runs.json`, `BusyRunRecorder` and `RestartResumer`'s behavior are unchanged (the resumer only imports
  the extracted limiter).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 | The node knows which runs a person started were running at a stop or crash (≤ 2 s lost) | `RunningRunRecorder.tick/record` → `RunningAgents.liveRoots/statusesOf/teamCoordinatorOf` → `RunOwnAgentsReader.listingFactsOf` (once per live root) → `∪ RunningRunRestorer.pending()` → `writeRunningRunRecord` | Unit (recorder), E2E RUN-01/RUN-02 (record within the 2 s check; final write at SIGTERM; last live write at SIGKILL) |
| BEH-001 / REQ-002 | After the start each such run is running, idle, without input (Agent run's agent; Team's coordinator) | `server-runtime` → `resumeAfterRestart(...).then(() => restore())` → `RunningRunRestorer.restoreOne` → `resolveOrRestore` → `StandaloneAgentRunRoot.ensureAgentReady()` / `RootTeamRun.ensureAgentReady(coordinator)` → `TeamRun.ensureDirectAgentReady` → `FlatTeamExecutionManager.ensureDirectAgentReady` → handle `getOrCreateAgentRun()` | Unit (restorer, Team root), E2E: "2 brought back", no model call for either run, `list_running_agents` lists both, `send_message_to` delivers to both |
| REQ-003 | Archived, stopped, gone, delegated, Org, already-running: not brought back | restorer skips (`rootHistory` before and after the restore, `startedByPerson`, `rootOf`); recorder never records Orgs or non-person runs | Unit; E2E: a stopped run stays stopped and unlisted |
| REQ-004 | A failure is logged with run and reason; others and the server go on | restorer `fail(...)`, per-run try/catch; recorder per-root try/catch | Unit (resolver throws, Team without coordinator, root not on this node) |
| REQ-005 / AC-005 | Reminders and the update wake as today | `RestartResumer` behavior unchanged; restorer runs after it and skips runs it woke | Unit (already-running skip), existing restart-reminder E2E (IMP-06; RR-10 see FU-001) |
| AC-006 | A run unloaded before the stop stays unloaded | not live → not recorded | Recorder unit test (offline / not live) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New: `src/restart-resume/running-run-record.ts`, `running-run-recorder.ts`, `running-run-restorer.ts`,
  `concurrency-limiter.ts` (the resumer's limiter, extracted verbatim and renamed `createConcurrencyLimiter`; the
  design allowed extraction; one call site in `restart-resumer.ts` changes).
- Team readiness (C-2): `src/agent-team-execution/domain/root-team-run.ts` (+ `ensureAgentReady`, 491 non-empty lines,
  under 500), `domain/team-run.ts`, `backends/team-run-backend.ts`, `local/flat-team-run-backend.ts`,
  `local/flat-team-execution-manager.ts`.
- Wiring: `src/compositions/restart-resume-composition.ts` (restorer first, then recorder with `pending`; exports
  `runningRuns: { recorder, restorer }`), `compositions/build-studio-server.ts` (passes `running.runningAgents` and a
  `RunOwnAgentsReader` over the memory dir), `server-runtime.ts` (order below).
- Tests: `tests/unit/restart-resume/running-run-record.test.ts`, `running-run-recorder.test.ts`,
  `running-run-restorer.test.ts` (incl. walk 4b: stop and crash during the restore),
  `tests/unit/agent-team-execution/team-root-ensure-agent-ready.test.ts`, `team-run.test.ts` (+1 case),
  `tests/unit/server-runtime-app-data-migration-gate.test.ts` (startup and cleanup order), and the built-server E2E
  `tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts` (gate `RUN_RUNNING_RUNS_E2E=1`).
- Docs: `docs/modules/restart_resume.md` (Scope line, TS Source, startup order, new section "Running runs come back"),
  `docs/design/collaboration_model.md` §1 Running agent.

Startup order in `server-runtime.ts`: `takePreviousSession()` → `runningRunRestorer.take()` → `recorder.startSession()`
→ `runningRecorder.startSession()`; cleanup: `recorder.record()` → `runningRecorder.record()` →
`stopFileWatchesForProcessExit()` → `app.close()`; after listen and recovery:
`void restartResumer.resumeAfterRestart(previous).then(() => runningRunRestorer.restore())`.

## Important Assumptions

- A standalone root's run ID is its agent's run ID (as the design's example and `createAgentRootExecutionIdentity`).
- The restorer re-reads the root's history after `resolveOrRestore` and before making the entry agent ready, so a
  person's Archive or Stop during the restore window starts no runtime for that run; it stops nothing (walk 6).
- A run file that cannot be read when the recorder asks "started by a person" counts as not started by a person
  (logged), so a failing read never blocks the record.

## Known Risks

- **Startup load** (design Risks): every recorded run's runtime starts within seconds of listening, 3 at a time.
- **Native runtime only in the E2E.** The built-server E2E uses the native runtime with a scripted model; external
  runtimes (Claude, Antigravity) take the same root restore path that production restart resume uses, but are not run
  here (left to API/E2E).
- **FU-001** (not caused by this ticket): RR-10 of the restart-reminder E2E expects each reminder shown before its input;
  autobyteus-628 D-2 (`1c6f493625`) shows a preface notice after its input. RR-10 fails the same way on the base build
  (IMP-08); the stored traces are as expected.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: per design-spec (no design issue requiring a refactor)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the limiter extraction is the design's allowed option, not a refactor of the resumer.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found; the resumer's local limiter
  moved, not duplicated)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (C-1 holds root identities only)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`. Choices recorded: the limiter is extracted
  (design: implementer's choice); the restorer re-reads history after the restore before the ready call (walk 6); a
  Team already running (its coordinator live) is skipped after the restore as "already running".
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (`root-team-run.ts` 491
  non-empty lines; new files ≤ 140 lines)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (a new transient file only)
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: a node upgrading has no file; the first session writes it
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Node v22.23.1, macOS. `pnpm install --frozen-lockfile` was run in the worktree (it had no dependencies installed).
- The built-server E2Es run with `env -i` and a throwaway HOME; nothing touched `~/.autobyteus`.
- Untracked `*/dist/` folders are build output; not committed.

## Checks Run

Evidence files are in [evidence/](evidence/). Commit tested: `ae1e36cded` (implementation; IR-001). Each log has its
command, commit, environment and date in its header.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | ae1e36cded | macOS, Node 22 | server src + tests | — | Pass | `IMP-01-server-typecheck.log` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | ae1e36cded | macOS, Node 22, no test vault | whole server unit suite: record, recorder (AR-002, R-1..R-3), restorer (skips, failures, concurrency, pending, walk 4b), Team `ensureAgentReady`, `TeamRun`, startup/cleanup order, the resumer's existing suites | AC-001…AC-006 | Pass | `IMP-02-server-unit.log` | `Tests  9077 passed \| 9 skipped (9086)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | ae1e36cded | macOS, Node 22 | whole integration suite (team backends incl. `mixed-team-run-backend`) | — | Pass | `IMP-03-server-integration.log` | `Tests  523 passed \| 71 skipped (594)` |
| IMP-04 | `pnpm -C autobyteus-server-ts build` | ae1e36cded | macOS, Node 22 | the built server the E2Es run | — | Pass | `IMP-04-server-build.log` | `exit=0` |
| IMP-05 | `RUN_RUNNING_RUNS_E2E=1 … vitest run tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts` (env -i, throwaway HOME) | ae1e36cded | built server, own data roots, scripted LM Studio model | DS-001 + DS-002 end to end: RUN-01 SIGTERM, RUN-02 SIGKILL; Agent run + Team run brought back, stopped run not; `list_running_agents` lists both, `send_message_to` delivers to both; no model call by the restore | AC-001, AC-002, AC-003, REQ-002 | Pass | `IMP-05-running-runs-e2e.log`, `IMP-05-running-runs-e2e/RUN-01.json`, `RUN-02.json` | `2 passed`; `"summary": "Running runs after the restart: 2 brought back, 0 skipped, 0 failed"` |
| IMP-06 | `RUN_RESTART_REMINDER_E2E=1 … vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | ae1e36cded | built server, scripted model | the existing restart reminder (AC-005 preserved) | AC-005, REQ-005 | Pass for RR-01…RR-06, RR-12; **RR-10 Fail, pre-existing (FU-001)** | `IMP-06-restart-reminder-e2e.log` | RR-01…RR-06, RR-12 `✓`; RR-10's diff is only the shown order of reminder vs input |
| IMP-08 | RR-10 against a build of the base `c1147c8917` (`RESTART_REMINDER_SERVER_DIR`) | base c1147c8917 | as IMP-06 | the base's projection | FU-001 | Fail on the base too (same diff) | `IMP-08-rr10-on-base.log` | the same `- "reminder" / + "reminder"` diff as IMP-06 |
| IMP-07 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown tests/e2e/agent-team-runs --no-watch` | ae1e36cded | macOS, Node 22 | shutdown order and Team run E2Es touched by the wiring and C-2 | — | Pass | `IMP-07-startup-shutdown-team-e2e.log` | `Tests  10 passed \| 15 skipped (25)` (gated files skipped) |
| — | `git merge-tree --write-tree HEAD origin/personal` | ae1e36cded | — | merge with the 8 newer base commits | — | Clean | — | no conflict |
| — | `gitleaks protect --staged` before the commit | ae1e36cded | local | the diff | — | Pass | — | `no leaks found` |

- Not run, and why: external runtimes and Docker across a real restart (left to API/E2E); the live restart-reminder
  cases RR-07..RR-09 (gated, credentials); the whole server E2E suite (the affected folders ran).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no frontend change (the web UI is out of scope; the run list shows a restored run green as any live run).

## Downstream Coverage Hints / Suggested Scenarios

- External runtimes (Claude, Antigravity) on a built server across a restart: the incident's runs (docker-8001's
  Project Task Managers) came back unloaded; with this change they should show idle and be listed from a peer
  (`list_running_agents(node: …)`).
- A Docker node `docker stop`/start (the incident's restart kind).
- An update restart with a busy run: woken once by the resumer, then skipped by the restorer (unit covers the skip).
- A run whose runtime is missing at the start: logged, others come back, server serves.
- Memory after the start equals before the stop (QR-001): only the runs that were running are loaded.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- External runtimes and Docker across a real restart (above).
- FU-001 is a follow-up for the restart-reminder E2E's RR-10 expectation, not this ticket's behavior.
