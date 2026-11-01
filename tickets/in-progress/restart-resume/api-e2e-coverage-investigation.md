# API/E2E Coverage Investigation — restart-resume (autobyteus-285)

The plan. Results are in `api-e2e-execution-coverage-report.md`. Paths are relative to
`/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/`.

**Safety:**
- Every server and desktop instance of this round runs on a temporary, run-owned data root.
- Resumed turns are real paid turns; they are spent only where a live runtime is the point (AC-002). Every other case uses scripted native inference (free).
- The user's running AutoByteus, its data and its node containers (`autobyteus-server-0/1/2`) are never touched.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, approved; DEC-001 = A: update restarts only, busy runs only)
- Investigation Notes: `investigation-notes.md` (G-01..G-07)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001..FU-004), `architecture-design-handoff.md`
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-002 Pass; untracked, owner's)
- Implementation Handoff: `implementation-handoff.md` (IR-001); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass 9.4); Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision ID: `API-REV-001`; Round 1
- Trigger: code reviewer, CRR-001 Pass (code `ab4ba6e7dc`, `b4d770d364`, `b50e2354ab`; handoff `15a978e22f`; review `400e4d5b9c`).

## Current Requirement And Design Basis

- **D1:** `dist/release-identity.json` = `{ version }`, written by `build:full`; the server reads it once (missing → `null`, so not an update).
- **D2:** the cleanup = `recorder.record()` → `app.close()`. The record is written only when there are busy entries (`initializing`/`running` with a root), merged with an unconsumed record, never deleted. Log: `Recorded <n> busy run(s) for restart resume`.
- **D3:** background stage after `recoverAfterListen`:
  - read → delete → per-entry update test (`entry.version ≠ current`, both non-null);
  - per root, wave 1 = delegated, wave 2 = host and members;
  - ≤ 3 posts at a time;
  - eligibility right before each post (live, missing/terminated/archived root row);
  - host → `postUserMessage`; member/delegated → `executeAgentCommand(post_message)`.

  Log: `Restart resume after the update to <X+1>: …`.
- **D4:** one SYSTEM notice per resumed run (`system.restart_resume`). The host's (or member's) notice lists the accepted delegated runs. Members are shown live as `SYSTEM_TASK_NOTIFICATION`; members' memory does not keep it (FU-004).
- **Version change method (design):** the same code stamped X+1. The stamp is the only difference: `dist/release-identity.json` is edited between runs, in a run-owned copy of the build.

## Supported Scenarios And Real Usage

- SCN (UC-001/002/003): "Install update and restart" or an automatic update with busy standalone, Team, Org and delegated runs. Emulated as a graceful quit of build X, then a start of build X+1 on the same data. A real Squirrel install is unsafe in an isolated instance (TESTING Rule 2; 284 API-14 / 339 API-06 precedent).
- SCN (AC-004): a plain quit and relaunch of the same build.
- SCN (AR-002/AC-003): while resumes queue (≤ 3 at a time), the user messages, Stops or archives a waiting run.
- SCN (AR-005): a quit right after an update relaunch, before the resumer ran.
- SCN (AC-005): a corrupt record; a crash during resume, then a start.
- Docker in-place update: see Not Tested.

## Changed Surface And Boundary Classification

| Surface | Affected | Boundary | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- | --- |
| Backend logic | Yes | recorder, resumer, `placeOf`, root resolver | IMP-01..03 (unit, mutations) | Real roots of every kind, real runtimes, real restore | Real server process |
| Process / lifecycle | Yes | shutdown cleanup order; startup background stage | IMP-03 (gate test) | Real SIGTERM/quit; real startup timing; crash during resume | Real server; isolated desktop |
| Persisted data | Yes (new file) | `<appDataDir>/restart-resume/busy-runs.json` | IMP-01 | Real write/consume on disk | Inspect the file between runs |
| Build packaging | Yes | `dist/release-identity.json` in packaged outputs | IMP-05 (server build only) | Desktop bundle, `pnpm deploy` package | N-2 checks |
| Desktop renderer | Indirect | Member notice display (`SYSTEM_TASK_NOTIFICATION`) | Unit (server mapping) | Rendering in the window; reload | Isolated desktop, DOM |
| External runtimes | Yes | Codex/Claude resumed turns | — | Real runtime restore and continuation | Live |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume`; builds from a **clean detached checkout** of `400e4d5b9c` in a run temp root (server, desktop), removed afterwards.
- Guidelines: `TESTING.md`; `docs/isolated-app-instances.md`.
- Live runtimes: Codex `gpt-6.1-terra` (effort medium, throwaway `CODEX_HOME`), Claude (host login).
- Scripted native inference (an LM Studio-compatible SSE server) for deterministic structures:
  - delegated copies via a real `delegate_task` call;
  - Task closure via a real `update_task` call;
  - busy turns via a real `run_bash`.
- Probes:
  - `evidence/API-285-server-probe.mjs`: real `dist/app.js` processes, record inspection, stamp edits, projections;
  - `evidence/API-285-desktop-probe.mjs`: isolated instance; stamp edit in a run-owned copy of the packaged app.

## Existing Durable Coverage Inventory

| Path | Intent | Validity | Action |
| --- | --- | --- | --- |
| `tests/unit/restart-resume/*` (6 files) | Recorder, resumer, notice, `placeOf`, resolver, member mapping | Still Valid | Reuse (IMP-01/02) |
| Startup gate, remote collaboration, Team and standalone root tests, agent memory | Order, shared resolver, `isDelegatedRun` | Still Valid | Reuse (IMP-03) |
| Full server unit suite; typecheck | Regression | Still Valid | Reuse (IMP-04/06) |
| `tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` (284) | Real-process shutdown with busy runs and relaunch; the cleanup now records first | Still Valid | Rerun (AC-006) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-003..AC-005 (unit), AC-006 | Repository | Reused | IMP-01..IMP-06 | Ran on `b50e2354ab` |
| API-00 | — | Builds | Setup | clean checkout; server + desktop builds | — |
| API-01 | N-2 | Packaging | Check | the desktop bundle's `Resources/server/dist/release-identity.json`; `pnpm --filter autobyteus-server-ts deploy <tmp> --legacy` (the Dockerfile's command) → `dist/release-identity.json` | Both packagers carry the stamp |
| API-02 | AC-002 (server), REQ-004 | Real server. Stamp X: busy Codex standalone, Claude standalone, Codex Team member, Claude Org agent, and a live standalone host (Claude) with a busy delegated copy (Codex); SIGTERM; inspect the record; stamp X+1; start; observe the resumes, notices and turns | Temporary Probe | `API-285-server-probe.mjs live-update` | Every root kind with real runtimes |
| API-03 | AR-001, AR-003, AR-005, AC-003 (idle; Task-closed copy), AC-004, AC-005 (corrupt record) | Real server, scripted native inference | Temporary Probe | `… scripted` (several restarts on one data root) | Deterministic structures for the edge cases |
| API-04 | AR-002, AC-003 (messaged / Stopped / archived while queued), AC-005 (crash during resume) | Real server; 3 slow live Claude entries first, then 3 scripted native targets; act on the targets right after start; a second sample SIGKILLs during the resume, then starts again | Temporary Probe | `… queue-race`, `… crash-resume` | Timing-dependent; the live check right before each post |
| API-05 | AC-002 (real app), CR-C2, FU-004 | Isolated desktop of the clean build (copy), stamp X: the same five roots busy; user quit; stamp X+1 in the copy; relaunch on the same data root; observe the resumes; open a Team member in the window (system notice, not a user message); reload | Journey | `API-285-desktop-probe.mjs` | The real desktop quit path and the renderer |
| API-06 | AC-006 | 284's gated stop-now E2E (cleanup now records first) | Existing Test | `RUN_BUSY_STOP_NOW_E2E=1 … busy-run-stop-now.e2e.test.ts` | Regression |

- Progress log: `Yes`.

## Durable Coverage To Add / Update / Remove

None planned (live runtimes, two stamped builds and the desktop make these probes; the unit layer is mutation-checked).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only | Follow-up |
| --- | --- | --- | --- | --- |
| Real "Install update and restart" (Squirrel) | Relaunches outside the isolated profile onto the user's data (Rule 2) | Covered by the quit + X+1 start; the install step is unchanged | Yes (the user's next real update with busy agents) | — |
| Docker in-place update (autobyteus-305 starter) | Needs a signed release feed and a release package; mounting this branch's `dist` into a released image is allowed only when the image differs in just the changed files (TESTING), which it does not (the base has moved since the last image) | The server-side detection is the same code; N-2 checks the deployed package carries the stamp | No | Recorded for delivery |

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes: `No`. Reroute: `No`.
- After execution (API-REV-001):
  - Result `Fail`: F-API-001, AC-003 under queue races (API-04/04C).
  - Failure-origin review requested from the code reviewer.
  - Added samples: API-04B/04C/04D (timing variants, crash during resume) and API-05T/05H (member and host display journeys).
  - AR-003's refused copy is not reachable live: closing a Task stops the copy before the quit.
