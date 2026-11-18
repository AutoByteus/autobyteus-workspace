# Implementation Handoff — autobyteus-524 round 2: FU-006 and FU-007

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2`, branch `codex/native-follow-ups-524-r2`, base `origin/personal` `0570c47fd9`.
Commits: `a5b24ea3b7` (FU-006), `9b97a39dc2` (IR-001), `2e5b0198e2` (FU-007), and the documents commit carrying this file (it also holds the migration-gate test update).
Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low → direct implementation, then direct API/E2E (no Code Reviewer)
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md` (caller row corrected in SR-002)
- Solution revision record: `solution-revision-record.md` (SR-001, SR-002)
- Design spec (required on every route): `design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: `evidence/built-server-stop-probe.mjs`, `evidence/RF-00*.jsonl`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: DI-001 (`implementation-revision-record.md` IR-001), resolved by SR-002

## Current Implementation Summary

- FU-006: the available-agent-runtimes E2E points `DEEPSEEK_HARNESS_COMMAND` at a missing command, so an installed `dsh` is not listed.
- FU-007: both in-process watchers have a process-exit stop. It ends event handling at once and leaves the OS watches to the exit. Only the process-shutdown cleanups call the studio's `stopFileWatchesForProcessExit()`, right before they close. Every other close still releases the OS watches.

- Implementation cycle: `Initial` (on SR-002, after the IR-001 Design Impact)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: DI-001 (resolved)

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change removes work at process exit only; one function moved unchanged to a new file for the size rule; no contract, persistence or concurrency change
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`. SR-002's trigger was checked: every process-shutdown path reaches the studio through one of the two cleanups that call the exit operation. `onCleanupOwnershipTransferred` is passed only by `server-runtime.ts:199`, and `app.close()` in production only by its cleanup.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `dsh` hidden in the AAR suite | `available-agent-runtimes-graphql.e2e.test.ts` hoisted setup: `DEEPSEEK_HARNESS_COMMAND=<fake root>/not-installed/dsh`, restored on dispose | AC-001: before 4 of 6 fail (`deepseek_harness` listed), after 6/6 (IMP-01) |
| BEH-002 (exit) | At process shutdown the watchers end without the OS close | `server-runtime.ts` cleanup: `recorder.record()` → `studioServer.stopFileWatchesForProcessExit()` → `app.close()`. During startup the handover close calls it before `nativeShutdown.close(...)` (`build-studio-server.ts`). The exit operation (`studio-process-resources.ts` `stopStudioFileWatchesForProcessExit`) calls `feed.watcher.stopForProcessExit()` and `platformNotices.stopFileWatchesForProcessExit()` → `SkillFolderWatcher.stopForProcessExit()` | AC-002: stop 0.6–4.0 s → 48–76 ms, 10/10 exit 0 (IMP-02). AC-003 (IMP-03). Order record → stop → close asserted in the migration-gate unit test |
| BEH-002 (other closes) | Every other close releases the OS watches (REQ-003) | `close()` unchanged in behavior; Fastify `onClose`, the startup-failure path, in-process test servers and folder removal while running use it | Unit: ordinary `close()` closes every OS watch; studio closed without the exit stop closes both watchers normally (IMP-03) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-package-definitions/monitor/agent-package-folder-watcher.ts`, `src/skill-update-notices/monitor/skill-folder-watcher.ts` (process-exit stops)
- `src/compositions/platform-notice-sources.ts` (exposes the skill watcher's stop)
- `src/compositions/studio-process-resources.ts` (new: `closeStudioProcessResources`, moved unchanged, and `stopStudioFileWatchesForProcessExit`)
- `src/compositions/build-studio-server.ts` (`StudioServer.stopFileWatchesForProcessExit`, the handover close calls it), `src/server-runtime.ts` (the cleanup calls it)
- Tests: both watcher test files (new cases), `tests/unit/compositions/studio-file-watch-exit.test.ts` (new), `tests/unit/server-runtime-app-data-migration-gate.test.ts` (fake studio + order), the AAR E2E (FU-006)
- `docs/design-cases.md` Case 23 (Solution Designer, committed with FU-007)

## Important Assumptions

- ASM-001 carried: other platforms are unmeasured. The change only removes work; the explicit exit (`server-process-shutdown.ts:79`) releases the OS watches on every platform.

## Known Risks

- K-1: real-filesystem watcher tests (`agent-package-folder-watcher.test.ts` cases that wait for OS events, 5 s timeouts) fail on this machine under load, on the old source too (IMP-04). That family (448 FU-001) is out of scope.
- K-2 (implementation decision): `closeStudioProcessResources` moved unchanged from `build-studio-server.ts` (499 effective lines before; the operation's wiring would have taken it over 500) into `studio-process-resources.ts`, together with the exit operation (the same concern: how the studio's process resources end). `build-studio-server.ts` is now 435 lines. The architecture tests, which read source by path, pass (IMP-07).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect
- Reviewed refactor decision: No Refactor Needed (K-2 is a move for the size rule, not a redesign)
- Implementation matched the reviewed assessment: Yes (on SR-002)
- If challenged, routed as `Design Impact`: Yes: DI-001 (IR-001), resolved by SR-002
- Evidence / notes: —

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found; the imports used only by the moved function moved with it)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (K-2; package watcher 403 → 416 effective lines)
- Notes: lightweight self-review: `stopForProcessExit` drops entries and bumps each entry's generation, so a late chokidar or `fs.watch` callback is ignored, and clears the catch-up timers. The skill watcher clears its settle timer, pending changes and listeners, and stops new syncs. `close()` after either stop has no watches left to close. The exit operation's `?.` covers resources not yet built during startup, the same as `closeStudioProcessResources`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Load average from other processes: 53–107 during these checks. `~/.local/bin/dsh` is installed on this Mac.
- The server is built in the worktree from `2e5b0198e2` (the probe and the E2E files use `dist/`).
- The application restarted once (update to v1.5.13-beta.10) during the evidence step; the interrupted step was rerun (IMP-03).

## Checks Run

Evidence in `evidence/` of the ticket folder.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | AAR E2E with `dsh` on PATH, before and after | `0570c47fd9` / `a5b24ea3b7` | env -i, temp HOME | the suite's runtime hiding | AC-001 | Fails before, passes after | `IMP-01-aar-before.log`, `IMP-01-aar-after.log` | before `4` ×, `deepseek_harness`; after `Tests  6 passed (6)` |
| IMP-02 | `built-server-stop-probe.mjs <worktree> 10 3000`, before and after | base build / `2e5b0198e2` build | load 67–86 | the built server's SIGTERM stop | AC-002 | Before 640–4008 ms; after 48–76 ms, 10/10 exit 0 | `IMP-02-stop-probe.log` | `"stopMs": 76` max after |
| IMP-03 | the new unit cases (verbose) + the migration-gate test | `2e5b0198e2` + test update | — | watchers, studio exit operation, server-runtime cleanup order | AC-003 | Pass 6/6 + 21/21 | `IMP-03-fu007-unit-cases.log` | six `✓` lines; `Tests  21 passed (21)` |
| IMP-04 | whole server unit suite; focused rerun; package-watcher file on the old source | `2e5b0198e2` | load 53–107 | server unit | AC-004 | Suite: 8 failed / 8337 passed. 6 migration-gate (fake studio, fixed → 21/21) + 2 FS-timing (K-1, also on old source) | `IMP-04-server-unit-suite.log` | `Tests  8 failed | 8337 passed`; old source `4 failed` |
| IMP-05 | the nine built-server start/stop E2E files of 493 FU-005 | `2e5b0198e2` build | env -i, load 73–82 | built server start/stop | AC-004 | Pass 9 files / 29 tests | `IMP-05-built-server-e2e.log` | `Tests  29 passed (29)` |
| IMP-06 | server and web typechecks | `2e5b0198e2` | — | all TypeScript | — | Pass at baseline | `IMP-06-typechecks.log` | `production errors: 0` both |
| IMP-07 | server architecture tests | `2e5b0198e2` | — | source-by-path rules (file split) | — | Pass 71/71 | `IMP-07-architecture-tests.log` | `Tests  71 passed (71)` |

- Not run, and why: the whole `test:integration` and `pnpm test:e2e` suites (left to API/E2E); other platforms (ASM-001).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: no frontend change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 at the designer's measured load (100–125): the stop probe, plus the desktop app quitting its embedded server (the same `server-runtime` cleanup).
- An in-process E2E server closed by a test: its watches are released (the full close path); a test process that starts several servers still exits cleanly.
- A package folder removed while the server runs: its watch is closed (REQ-003).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-004 beyond the files above: the whole server E2E suite (the 9 built-server files passed here).
