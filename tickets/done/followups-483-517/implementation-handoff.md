# Implementation Handoff — followups-483-517

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/followups-483-517`, branch `codex/followups-483-517`, base `origin/personal` @ `24d438fa31`. Paths relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (`task_size=Small`, `architectural_risk=Low`). IR-001 returned a Design Impact; SR-002 resolved it. IR-002 → `get_handoff_rules` → `/api_e2e_engineer` (direct API/E2E).
- Requirements doc: `tickets/in-progress/followups-483-517/requirements-doc.md` (SR-001; REQ-004/FU-004 not in scope)
- Investigation notes: `tickets/in-progress/followups-483-517/investigation-notes.md`
- Solution revision record: `tickets/in-progress/followups-483-517/solution-revision-record.md`
- Design spec: `tickets/in-progress/followups-483-517/design-spec.md` (SR-001)
- Design review report / architecture review revision record: `N/A — not applicable`

## Current Implementation Summary

- Implementation cycle `Rework` (after the SR-002 decision); revision record `tickets/in-progress/followups-483-517/implementation-revision-record.md`; current `IR-002`; related `SR-001`, `SR-002`; others `N/A`; triggering finding: the IR-001 Design Impact (resolved).
- Commits: `1224f6498c` FU-003, `b55ce60b5e` FU-002, `807951b6e0` FU-005, `e61300a086` IR-001 documents, then the IR-002 commit (test change + documents).

### FU-003 — Antigravity view keeps ended tasks (REQ-003) — done

`agy-background-task-monitor.ts` keeps `tasks` (every task of the run by step, latest snapshot, start order) and `running` (the steps still running). `list()` returns every task: running, then completed/failed with the exit code, or stopped + `run_ended` after `stopAll()`. A step that a later turn reports open again is not brought back as running. Emissions are unchanged. The running count (`agent-background-task-count.ts`) filters by status, so it is unchanged.

### FU-005 — `settings.md` (REQ-005) — done

- `settings.md` is titled `# Settings`, with an overview of the settings pages. The copied Level 1–3 / Error Event Nuance / Related Documentation sections (old lines 868–2302) are removed. `## Existing Run Configuration` (one section, its anchor unchanged) follows the settings sections. 2302 → 1230 lines.
- **One addition beyond the design:** the copy's newer section *Run Workspace Choice On Start Surfaces* exists nowhere else. It describes what the user sees: the temp-workspace default, Browse/Use folder states, a New-chat Team using one workspace for every member, and placed Org Teams. Repointing line 1416 at its own section would have dropped that. I checked its claims against the code (`launchTeamChat`, `sendMessageToFocusedMember`, `chat.workspace.openingPicker`, `showFolderDialog`). It moved into `agent_execution_architecture.md` as `#### Run Workspace Choice On Start Surfaces` under *Start Surfaces And Run Workspace Choice*, with its links made same-document. Line 1416 (now 1456) points at it.
- Link check (AC-004): pass.

### FU-002 — waits that match the latency (REQ-001, REQ-002) — done as designed; AC-001 partly met

- `autobyteus-server-ts/tests/helpers/os-latency-under-load.ts`: `OS_FILE_EVENT_WAIT_MS = 30_000`, `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS = 60_000`, `FILE_EVENT_TEST_TIMEOUT_MS = 45_000`, with the header the design asks for.
- Used in the seven files:
  - `agent-package-folder-watcher.test.ts`: `waitFor` default; the real-FS `describe` test timeout; the `afterEach` that closes the monitor.
  - `skill-folder-watcher.test.ts`: four `vi.waitFor` limits and two test timeouts.
  - `package-auto-refresh.integration.test.ts`: the `waitFor` default and `describe` timeout; the watcher-closing `afterEach`. `AC_BOUND_MS` and its four `toBeLessThan` uses are removed (DEC-002); the unused `elapsedMs` is gone; the test title no longer says "within 5 s".
  - `file-system-watcher.integration.test.ts`: the three helper defaults; explicit 4000/12000/2000 event waits; test timeouts; the `beforeEach`/`afterEach` that start and close the watcher. The 800/1000 ms "no event" windows and the 500 ms stream-unwinding guards are unchanged.
  - `studio-server-http-contract.integration.test.ts`: the `beforeAll`/`afterAll` timeouts.
  - `agent-package-definitions-live-refresh.e2e.test.ts`: the `waitFor` default and five `until(…)` limits.
  - `grok-build-runtime-replay.e2e.test.ts`: the `afterAll` timeout.
- **Extension of DEC-002 (flag for the Solution Designer):** in `agent-package-definitions-live-refresh.e2e.test.ts` the elapsed-time bound appears four times, not only in DCF-E2E-002 (`:387`). It also appears in DCF-E2E-009 (`broken`, `cleared`) and the creator case (`Date.now() - writtenAt`). Each compares OS file-event latency with 5 s, the same defect DEC-002 removes, and DCF-E2E-002 cannot pass under load without its bound gone (base failed it with "expected 24175 to be less than 5000"). All four are removed; the measured times stay in the evidence records.
- `vitest.config.ts` unchanged; the fixed settle sleeps unchanged.

## IR-002 — SR-002 resolution: option (a) + (c) done

The Solution Designer resolved the Design Impact below (SR-002). AC-001 is refined: every base failure whose cause is a test wait or an elapsed bound passes on the branch, and the rest are recorded with their cause. FU-001 and FU-002 are in `follow-ups.md`. Test-only work this round:

- **DCF-E2E-002:** the `waitFor` for the broken-Team diagnostic accepts only the diagnostic of the final state: `DEFINITION_CONTRACT_INVALID`, `definitionPath` = `team.md`, `usingLastGood: false`. Before, it took the first diagnostic for that Team, which on a busy machine can be read between the test's two writes.
- **DCF-E2E-005:** test timeout `60_000 + 2 * OS_FILE_EVENT_WAIT_MS` (120 s). That is its own import, check and update work (the 60 s it already had) plus its two file-event waits ("Update published", root re-armed). It is **not** `FILE_EVENT_TEST_TIMEOUT_MS` (45 s), which is below its existing 60 s and would have shortened it.
- **Results (IMP-07, load ~26–50, `fseventsd` 160–168%; the load had dropped since IMP-03):**
  - DCF-E2E-002 and DCF-E2E-005 alone: `Tests  2 passed`.
  - The whole live-refresh suite: 7 passed, 1 failed. The failure is **DCF-E2E-003**: after the package root is renamed back, the watcher stays `FOLDER_MISSING` for the whole 30 s ("WATCHING again: not met within 30000 ms"). It reproduces alone.
  - The **base** test file fails the same case earlier, at its 5 s wait for `FOLDER_MISSING`.
  - Cause: the restored root's event is not seen within 30 s. That is product behaviour of the agent-package folder watcher under load, the same class as FU-001, and it passed in IMP-03's branch run. Recorded as **FU-003** in `follow-ups.md`.
- Accepted by the Solution Designer as done: the four 5 s elapsed bounds removed in the live-refresh suite; the *Run Workspace Choice On Start Surfaces* move.

## Design Impact (IR-001, resolved by SR-002) — AC-001 cannot be fully met by test waits

AC-001: "the listed tests pass under an imposed load where base fails". Measured (IMP-03, IMP-04): under the same load, **base: 24 failed in 6 files; branch: 9 failed in 3 files**. The four files with only wait causes are fixed: both unit files, `package-auto-refresh` and `studio-server-http-contract`. What remains is not a wait:

1. `file-system-watcher` (alone: 3 fail). Two tests time out after the full 30 s ("Timed out waiting for event"): the OS event never reached the watcher. One (`emits move/rename event`) gets `delete` first: the rename arrived as an unlink and an add too far apart for the watcher to pair them into one move. That is the product's pairing window under load, which the design leaves alone.
2. `grok-build-runtime-replay` (6/6 tests pass; its `afterAll` times out at 60 s). Timed: `app.close()` took **296,921 ms** at load ~60. The in-process server's close stalls for minutes, not the "seconds" the design assumed. Raising the hook limit to minutes would hide a product stall.
3. `agent-package-definitions-live-refresh`:
   - DCF-E2E-002 failed under load > 100 at `:365` (the broken-Team diagnostic's contents) and passes alone. Likely cause, **not established**: the test writes `team.md` and `team-config.json` separately, and `waitFor` accepts the first broken-Team diagnostic, which can be read between the two writes.
   - DCF-E2E-005 exceeded its own unchanged 60 s test budget under load.

By the design's own escalation rule ("events never arrive: record as cause, do not widen"; "any product change found needed … returns a Design Impact"), I stopped here. Decisions for the Solution Designer:

- **(a)** Accept AC-001 as met for the wait-caused failures, and record items 1–2 (and the possible product follow-ups: file-event delivery or pairing under load; the in-process server close stall) as follow-ups.
- **(b)** Bring a product change into scope.
- **(c)** Tighten DCF-E2E-002's accept condition (wait for the final diagnostic) and give DCF-E2E-005 the file-event test budget. Both are test-only, if wanted. I did not do these, because the cause of (c) is not established and widening (d) was ruled out.

## Routing Classification (Mandatory)

- `Small` / `Low` (design-spec) — `Confirmed` for the code delivered. The open question is AC-001's scope (above), not risk.
- Selected route: IR-001 `Solution Designer` (Design Impact, resolved by SR-002); IR-002 `Direct API/E2E`. Self-review: `Yes`.

## Reviewed Behavior Implementation Trace

| Behavior | Requirement / AC | Path / Files | Result |
| --- | --- | --- | --- |
| BEH-003 | REQ-003 / AC-002 | `agy-background-task-monitor.ts` → `backgroundTaskInspection.current()` → GraphQL `currentTasks` | unit (IMP-01); scripted AGY regression (IMP-02); a durable E2E of an ended AGY task in `currentTasks` not written (API/E2E's) |
| BEH-002 | REQ-001/002 / AC-001 | the constants module and seven files | base 24 → branch 9 failures under the same load (IMP-03); causes of the 9 in IMP-04 |
| BEH-005 | REQ-005 / AC-004 | `settings.md`, `agent_execution_architecture.md` | link check pass (IMP-05) |

- Scope Guardrail kept: `Yes` (product change only in the AGY monitor, as designed). The doc move and the DEC-002 extension are noted above.

## Legacy / Compatibility / Size

- No compatibility paths. Dead code removed in touched files: `AC_BOUND_MS`, `elapsedMs` in package-auto-refresh, the stale doc copy. Test files and docs only besides the monitor (+24 lines).
- Persisted data: `Not Affected`.

## Checks Run

Evidence: `tickets/in-progress/followups-483-517/evidence/`. macOS 26.5.2, 10 cores, Node 22.23.1. The machine carried load from other processes throughout (load average 54–135, `fseventsd` 138–172% CPU). I imposed no extra load: the existing load already exceeded the failing condition the investigation measured (53–95).

| Check ID | Command Or Steps | Commit | Code It Exercises | Criteria | Result | Evidence | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | `807951b6e0` | AGY monitor and backend units | AC-002 | Pass | `IMP-01-agy-unit.log` | `Tests  327 passed \| 6 skipped` |
| IMP-02 | scripted AGY: `background-step-stop-own-view.e2e` (`RUN_AGY_FAILURE_E2E=1`) and `background-task-status-count.e2e` (`RUN_BACKGROUND_TASK_STATUS_E2E=1`, throwaway HOME, `AGY_FAKE_CASE=linked_skills`) | `807951b6e0` | the view and the running count with ended AGY tasks kept | AC-002 regression | Pass | `IMP-02-agy-view-e2e.log` | `BTS-03: Antigravity: an open daemon step reads idle 1, then idle 0 when it exits` ✓; `Tests  4 passed \| 2 skipped`; own-view 1 passed |
| IMP-03 | `evidence/run-fu002-base-vs-branch.sh` (the seven files at base `24d438fa31`, then at the branch, one vitest run each) | `807951b6e0` | FU-002 | AC-001 | Partly met | `IMP-03-fu002-base-vs-branch.log` | base `Tests  24 failed \| 54 passed`, load 128.75…, fseventsd 157.5; branch `Tests  9 failed \| 69 passed`, load 104.06…, fseventsd 147.7–172.0 |
| IMP-04 | the three still-failing files alone; DCF-E2E-002 alone; Grok `afterAll` timed (temporary 600 s limit and timing, reverted) | `807951b6e0` | causes of the 9 | AC-001 | Diagnosed | `IMP-04-remaining-failures-diagnosis.log` | `Timed out waiting for event`; `expected [ 'move', 'rename' ] to include 'delete'`; `app.close done at 296921 ms`; DCF-E2E-002 `1 passed` alone |
| IMP-05 | `python3 tickets/in-progress/followups-483-517/evidence/check-doc-anchors.py .` (base, branch, and a negative control) | `807951b6e0` | doc links into settings.md / agent_execution_architecture.md, repository-wide | AC-004 | Pass | `IMP-05-link-check.log`, `check-doc-anchors.py` | branch `checked 50 links … RESULT PASS`; control `RESULT FAIL (1 broken)` |
| IMP-06 | `pnpm -C autobyteus-server-ts typecheck` (rerun after the IR-002 change) | IR-002 commit content | server src + tests | — | Pass | `IMP-06-server-typecheck.log` | `(baseline 1012 in 316 files)`, `PASS` |
| IMP-07 | live-refresh e2e: `-t "DCF-E2E-00(2\|5)"` alone; the whole suite; DCF-E2E-003 alone; the base test file's DCF-E2E-003 alone | IR-002 commit content (base file `24d438fa31` for the last) | the (c) changes; DCF-E2E-003 cause | AC-001 (refined) | Pass for (c); DCF-E2E-003 → FU-003 | `IMP-07-dcf-002-005.log` | `Tests  2 passed \| 8 skipped`; suite `1 failed \| 7 passed`; `WATCHING again: not met within 30000 ms`; base `FOLDER_MISSING: not met within 5000 ms` |

- Not run: the web typecheck (no web code changed; docs only). No live AGY run reading `currentTasks` after an exit (the design allows unit plus a probe; left to API/E2E for durable coverage).

## Frontend Rendered-Result Check

`Not Applicable` — server code, tests and docs.

## Downstream Coverage Hints

- AC-002 durable coverage: a scripted-AGY E2E case that reads `agentBackgroundTaskView … currentTasks` after a `BACKGROUND_STEP` exit and finds the task `failed` with its exit code (BTS-03 is the natural place).
