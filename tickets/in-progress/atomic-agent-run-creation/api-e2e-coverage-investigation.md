# API/E2E Coverage Investigation — atomic-agent-run-creation (autobyteus-349)

The plan. Results are in `api-e2e-execution-coverage-report.md`. Paths are relative to
`/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/`.

**Safety:** this change deletes persisted runs at every server startup. Every server, test and probe of this round runs on a **temporary data root** created by this run. The user's data (`~/.autobyteus/server-data`) is only *read*, once, for key names and file-name patterns (no values beyond `activationState`, nothing written). No build of this branch is ever started on the user's data.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, approved by the user; DEC-001 = A with the content check)
- Investigation Notes: `investigation-notes.md` (F-01..F-12; the read-only count)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001..FU-004)
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-002 Pass; untracked, owner's)
- Implementation Handoff: `implementation-handoff.md` (IR-001); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass 9.5); Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (after this round); Current API/E2E Revision ID: `API-REV-001`; Round 1
- Trigger: code reviewer, CRR-001 Pass (code `c533fc0b5b`, guard `93fa105819`, handoff `ded1b718e5`, review `1dca0e2ad6`).

## Current Requirement And Design Basis

- **D1 (REQ-001):** `createAgentRun` = prepare → `activate`; on an activation error → `cancelPreparedAgentRun` → rethrow. A refused or failed cancel logs `Run '<id>' failed to activate and was kept: <reason>`.
- **D2 (REQ-002):** startup stage after `buildStudioServer`, before `prepareBeforeListen`. A standalone run is removed only when: its record is readable; `preparedAt` is set and `startedAt` is absent; its folder holds only directories plus a top-level regular `run_metadata.json` (no-follow walk); and the cancel is accepted. Each removal logs `Removed empty never-started run '<id>' ('<title>')`. An unreadable record logs `Kept run '<id>': its record could not be read`. A walk error logs `Kept never-started run …`. Missing standalone records (task agents) are counted: `Empty never-started run removal skipped <n> folder(s) without a standalone run record`.
- **BEH-003:** the two-step flow (prepare → first message activates) and remote delegation are unchanged while the server runs. A prepared run left unsent across a restart is removed by D2 (DEC-001, approved).
- Base: `e87e6bb2b1` includes autobyteus-339's grace drain. A SIGTERM therefore lets an in-flight create finish within 2 s, and an interrupted create needs the process to end during activation: a crash, or a stuck activation that outlasts the grace and the 10 s bound.

## Supported Scenarios And Real Usage

- SCN (UC-001): a client creates a run in one call (GraphQL `createAgentRun`, as the mobile app, applications and Model Routing do) and its runtime cannot start → AC-001.
- SCN (UC-002): the server starts on data holding never-started runs of every real shape → AC-003.
- SCN (UC-001 + UC-002): a create is in progress when the server process ends (crash, or a stuck activation cut by shutdown), then the server restarts → AC-004.
- SCN (BEH-003): the web first message: `prepareAgentRun`, then the first message activates it → AC-005 (live check of the two-step flow on the real server).
- Real-use additions: a runtime whose CLI is not installed (`codex` absent from the server's PATH) as the activation failure; a node with many runs (N-4).

## Changed Behavior Summary

| Behavior | Change | Evidence | Coverage |
| --- | --- | --- | --- |
| BEH-001 one-call create undo | Changed | IMP-02 (temp-root catalog) | Real server: codex not installable → error to the caller, no row or folder; base contrast |
| BEH-002 startup removal | Added | IMP-01/03 (unit, temp root) | Real startup on a seeded temp root with the five shapes + task agent + collaboration root; log lines; history and disk |
| BEH-001/002 interrupted create | Changed | — | Crash mid-create and stuck activation + SIGTERM → relaunch; base contrast on a copy of the same data |
| BEH-003 two-step | Preserved | IMP-05 | Real server: prepare → first message → started; survives a restart |

## Changed Surface And Boundary Classification

| Surface | Affected | Boundary | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- | --- |
| Backend logic | Yes | `createAgentRun`, `removeEmptyNeverStartedRuns` | IMP-01, IMP-02 | Real runtime activation failure; real startup composition | Real server process |
| API / transport | Yes | GraphQL `createAgentRun` result on failure | — | Error text to the caller | Real server |
| Process / lifecycle | Yes | Startup order (stage before listen) | IMP-03 | Real startup timing, logs | Real server |
| Persisted data | **Yes (deletion)** | Run folders and history rows | IMP-01 (synthetic shapes) | Shapes produced by real code | Seed through real code + minimal structure edits learned read-only |
| Desktop / browser | No | — | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation`; builds from **clean detached checkouts** of `1dca0e2ad6` and of the base `e87e6bb2b1` in a run temp root, removed afterwards.
- Guideline: `TESTING.md` (migrations/data rule: synthesized data with the released structure, learned by reading real data read-only; never run on real data; a test-owned data root).
- Native inference: scripted LM Studio-compatible SSE server (credential-free), as in 284's durable fixture.
- Activation failure: a server started with `PATH=/usr/bin:/bin:/usr/sbin:/sbin` has no `codex` binary, so the codex run's activation cannot spawn it.

## Existing Durable Coverage Inventory

| Path | Intent | Validity | Action |
| --- | --- | --- | --- |
| `tests/unit/agent-execution/agent-run-empty-never-started-removal.test.ts` | AC-003 shapes, AR-002 (temp root) | Still Valid | Reuse (IMP-01) |
| `tests/unit/agent-execution/agent-run-create-undo.test.ts`, `agent-run-create-service.test.ts` | AC-001, AC-002 | Still Valid | Reuse (IMP-02) |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts`, architecture guard | Stage order | Still Valid | Reuse (IMP-03) |
| Full server unit suite | AC-005 | Still Valid | Reuse (IMP-05) |
| `tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` (284) | Real-process create/terminate/shutdown with relaunch | Still Valid (creates runs, relaunches: now passes through the stage) | Rerun |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Command / Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001..AC-003 (unit), AC-005 | Repository | Reused | IMP-01..IMP-05 | Ran on these commits |
| API-00 | — | Build | Setup | clean checkouts; server builds | — |
| API-01 | AC-001 | Real server; codex not on PATH; GraphQL `createAgentRun` | Temporary Probe | `evidence/API-349-probe.mjs ac001 <server>`; and on base | The caller gets the activation error; history row and folder absent; base leaves an empty run |
| API-02 | AC-003, N-4 | Real startup on a temp root seeded through real code (prepare, create, native turn) plus minimal edits: E1 empty; E2 empty with empty subfolders; May shape; context-file only; started; unreadable record; task-agent folder; never-started root with a collaboration tree | Temporary Probe | `… ac003 <server>` | Only E1/E2 removed (row + folder) with the log line; others untouched; stage time on a root with ~600 runs (temporary `[349-DIAG]` around the stage, restored) |
| API-03 | AC-004 | (a) SIGKILL during staggered creates (crash); (b) stuck codex activation (`codex app-server` SIGSTOPped) + SIGTERM → grace → bound; then relaunch on the new build; the same data copy relaunched on the base | Temporary Probe | `… ac004 <server> <base server>` | No empty run after relaunch on the new build; base keeps it |
| API-04 | AC-005 | Real server: `prepareAgentRun` → WS first message (native scripted) → run started; restart → kept and listed | Temporary Probe | `… ac005 <server>` | Two-step flow unchanged; restart does not remove a started run |
| API-05 | AC-005 (regression) | 284's gated stop-now E2E | Existing Test | `RUN_BUSY_STOP_NOW_E2E=1 … busy-run-stop-now.e2e.test.ts` | Real-process create/terminate/relaunch through the new stage |

- Progress log: `Yes`.

## Durable Coverage To Add / Update / Remove

None planned (IMP-01..03 cover the rules deterministically on temp roots; the real-server cases need scripted servers and runtime-PATH control and stay probes).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only | Follow-up |
| --- | --- | --- | --- | --- |
| Remote delegation two-step across nodes | Needs two nodes; code unchanged (BEH-003); unit suite green | Low | No | — |
| First start on the user's real data (removes the 6 empty runs) | Never run on real data (TESTING) | Approved, logged | Yes (the user sees the log lines at first start) | — |

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes: `No`. Reroute: `No`.
