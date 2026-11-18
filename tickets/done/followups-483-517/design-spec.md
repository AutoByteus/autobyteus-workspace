# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved baseline: `requirements-doc.md` SR-001 for REQ-001, REQ-002, REQ-003, REQ-005 (FU-002, FU-003, FU-005), approved by the Solution Designer within the direction (the Task's leads; the user's "continue" in the Solution Designer's conversation, 2026-11-18; user informed). **REQ-004 / FU-004 is not in this design**: DEC-003 needs the user.
- User approval of the design: `Not required`
- Design status: `Ready` (FU-002, FU-003, FU-005)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/followups-483-517/tickets/in-progress/followups-483-517/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`; `DESIGN.md` (rule 11); `TESTING.md` (File watching on a busy Mac; One heavy run at a time; Choosing the path).
- Conflicts: None.

## Current-State Read

See investigation notes (FU-002, FU-003, FU-005 sections). In short: wait limits of 3–5 s and vitest defaults (5 s test, 10 s hook) in tests whose latency is an OS file event or an in-process server start/close; AGY `list()` keeps running tasks only; `settings.md` carries a stale copy of the architecture doc.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` (one product file and its test for FU-003; test files and one shared test constant for FU-002; docs for FU-005).
- Architectural risk: `Low` — the only product change is which tasks one in-memory list returns (no contract change: the same `AgentBackgroundTask` shape); the rest is tests and docs.
- Escalation trigger: a test that still fails with generous waits because events never arrive (record as cause, do not widen further); any product change found needed for FU-002 returns a Design Impact.

## Intended Change

### FU-002 — waits that match the latency (REQ-001, REQ-002)

- Add one shared test constant module `autobyteus-server-ts/tests/helpers/os-latency-under-load.ts`:
  - `OS_FILE_EVENT_WAIT_MS = 30_000` — the longest a test waits for an OS file event (measured up to ~14.5 s under load 53–95, about 2× headroom);
  - `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS = 60_000` — vitest hook timeout for hooks that start or close an in-process server (which closes folder watchers on the main thread; seconds under an FSEvents backlog);
  - `FILE_EVENT_TEST_TIMEOUT_MS = OS_FILE_EVENT_WAIT_MS + 15_000` — a test that waits for one or more events.
  - Header comment: why (TESTING.md "File watching on a busy Mac"), that waits return as soon as the condition holds, and that a test proving *absence* of an event keeps its own short quiet window (do not use the long wait there).
- Use them in the files of the investigation notes: `agent-package-folder-watcher.test.ts` (`waitFor` default), `skill-folder-watcher.test.ts` (`vi.waitFor` timeouts), `package-auto-refresh.integration.test.ts` (wait limit; DEC-002: the `elapsedMs < AC_BOUND_MS` assertions become the wait — remove `AC_BOUND_MS` and its `toBeLessThan` uses), `file-system-watcher.integration.test.ts` (its 8000/12000 event waits; keep the 800 ms "no event" windows), `studio-server-http-contract.integration.test.ts` (start hook timeout), `agent-package-definitions-live-refresh.e2e.test.ts` (DCF-E2E-002's event wait), `grok-build-runtime-replay.e2e.test.ts` (afterAll hook timeout). Set test/hook timeouts on those tests or their `describe` with the constants; no change to `vitest.config.ts` (keep the defaults for every other test).
- Fixed sleeps that only let watchers settle (e.g. `settleQuietly`, 500–1000 ms) stay unless a measured failure shows them too short.

### FU-003 — AGY keeps ended tasks (REQ-003)

- `agy-background-task-monitor.ts`: keep one `tasks` map (all tasks of the run, by step) next to the `running` map; `list()` returns every task in the map in start order (running and ended), each as its latest snapshot; `poll()` and `stopAll()` update the stored snapshot instead of only deleting; the doc comment of `list()` says "every task of this run, running and ended". Emissions unchanged.
- Update `agy-background-task-monitor.test.ts:42-56` to the new list (ended task present with `completed`/`failed` + exit code; after `stopAll()` present with `stopped` + `run_ended`); the "running count" helper at :56 keeps filtering by status.

### FU-005 — `settings.md` (REQ-005)

- Retitle `# Agent Execution Architecture` to `# Settings` and fix the Overview paragraph to describe the settings pages.
- Remove the copied sections (from `## Level 1: Orchestration Layer (Stores)` through the copied `## Related Documentation`), except `### Existing Run Configuration`, which moves up as a settings section (`## Existing Run Configuration` or under a fitting settings heading; keep the anchor `#existing-run-configuration` working).
- Repoint `agent_execution_architecture.md:1416` from `./settings.md#run-workspace-choice-on-start-surfaces` to `#start-surfaces-and-run-workspace-choice` (same document).
- Run a link check over `autobyteus-web/docs`, `autobyteus-server-ts/docs`, `autobyteus-ts/docs` and the AGENTS/GEMINI index lines for `settings.md#…` and `agent_execution_architecture.md#…`; every anchor resolves.
- If `Existing Run Configuration` text refers to sections that only existed in the copy, point them at the canonical doc.

## Change Scope (Mandatory)

- In scope: UC-002, UC-003, UC-005; files listed above.
- Derived consumers (Principle 11): AGY `list()` feeds only `backgroundTaskInspection.current()` → GraphQL `currentTasks` → panel seed (the web already shows ended tasks with their end line for Claude/native); no other reader.
- Deliberately left alone: FU-004 (awaits DEC-003); product watcher code and latency; the Grok CLI probe wording (524 FU-002); TESTING.md shutdown row (524 FU-003); `vitest.config.ts`.
- Follow-ups: None new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Change |
| --- | --- | --- |
| BEH-002 | REQ-001/002, AC-001 | test waits/timeouts |
| BEH-003 | REQ-003, AC-002 | AGY list keeps ended |
| BEH-005 | REQ-005, AC-004 | docs |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` + small `Behavior Change` (AGY late view).
- Current design issue found: `No` (AGY list was narrower than its peers; aligned).
- Structural triggers: *Several kinds or forms* (1): three event-stream runtimes serve one `current()` contract — AGY now matches Claude and native. *Reusable owned structures* (11): one shared test constant module instead of per-file numbers. Others ruled out (no contracts, persistence, indirection).
- Deviations: None. Root cause: `No Design Issue Found`. Refactor needed now: `No`.

## Legacy Removal / Persisted Data

- Removed: `AC_BOUND_MS` elapsed assertions (DEC-002); the copied doc sections. No compatibility paths.
- Persisted data: `Not Affected`.

## Spines, Ownership, Interfaces

- AGY: `AgyBackgroundTaskMonitor` stays the single owner of AGY task snapshots; `list()` contract widened (all tasks of the run), same type.
- Test constants: off-spine test support; no product dependency.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `AC_BOUND_MS` and its `toBeLessThan` | times OS latency (DEC-002) | shared wait |
| `settings.md` Level 1–3 copy | stale duplicate | canonical doc |

## Backward-Compatibility Rejection Log (Mandatory)

N/A.

## Change / Refactor Sequence

1. FU-003 product + unit test. 2. FU-002 constant module + the listed files. 3. FU-005 docs + link check. 4. Verification (AC-001: base vs branch under an imposed load, as TESTING.md's file-watching rule describes how to measure; AC-002: unit + the AGY live background suite case that reads `currentTasks` after an exit, or a probe; AC-004: link check).

## Guidance For Implementation

- Reproduction for FU-002: run the listed files under load (e.g. a few CPU hogs and a file-event backlog in a temp folder) on base: failures as in the investigation notes; then on the branch.
- Respect TESTING.md "One heavy run at a time" when imposing load; record `fseventsd` CPU and the load average with the result.
