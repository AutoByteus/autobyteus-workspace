# Code Review Report

## Latest Round: Part 2 Base Integration Review, round 6 (CRR-008) — Pass

- Review Entry Point: `Implementation Review` (delivery-stage Local Fix: base integration, DR-002 → IR-005)
- Review Scope: `Targeted Delta Review` of `b9caddc57e..a9e5676630`:
  - `990ff9a3d4` merges `origin/personal` @ `ff13782f36` (71 base commits: autobyteus-483 end reasons and exit codes, 458 phone run settings, 515).
  - `ca1979b206` gives the test doubles 483's fields.
  - `a9e5676630` holds documents and evidence.
  Reviewed through `git show --remerge-diff`: only the conflict resolutions and this ticket's follow-on edits. The base's own changes were reviewed in their tickets.
- Trigger: implementation engineer, IR-005, from delivery DR-002
- Delivery revision record reviewed: `delivery-revision-record.md` (DR-002)

Checks:
- **`MobileRunTargetView.vue` / `MobileRunSettings.vue` / `mobileRunSubjectLine.ts`.**
  - Part 2's DEC-004 status line now lives in the base's one builder, which both phone surfaces use: `mobileRunActivityLabel` for the text and `agentStatusDotClass(status, count)` for the dot.
  - Both pass `AgentRunState.backgroundTasksRunning`.
  - An unreachable run shows only its error, as part 2 had it.
  - The spec adds the DEC-004 cases (1, 2, running wins, unreachable). It keeps the base's three cases, now through the real translator.
  - Correct, and the base's single-builder rule (Principle 11) is kept.
- **`autobyteus-background-tasks.test.ts`.** The base's `[status, summary, exit_code]` assertion is kept, and the removed backend boolean is replaced by `runningBackgroundTaskCount(...)`. Correct.
- **`agent_execution.md`.** 483's `exitCode` / `end_reason` text is kept, with the boolean wording replaced by the count. Correct.
- **Contract `dist` maps** rebuilt from the merged source. The contract tests pass (22/14/37).
- **Semantic interplay with 483.** An ended task, whatever its `endReason`, has a non-`running` status, so it is not counted. No decision was needed.
- **Removed APIs.** `git grep` at `a9e5676630` finds no backend `hasRunningBackgroundTasks`, `hasRunningTasks`, `.hasRunning()` or `remote-task-execution-dtos` in source. The only remaining `hasRunningBackgroundTasks` is `AgentRun`'s facade (restart recorder). The `remoteTaskExecutions` hits are unrelated stored-link names in frozen migrations.
- **Sizes.** `agent-run.ts` is unchanged by the merge (500 → 500 non-empty lines). `mobileRunSubjectLine.ts` is 22 lines.
- **Evidence:**
  - IMP-16: both typechecks at baseline (1012 / 87); contracts pass.
  - IMP-17: full server unit `2 failed | 8302 passed`. Both failures are 5 s timeouts under load in files this ticket does not touch (`tracked-imports`, `agent-memory-explorer-service`); the reruns pass (`IMP-17-merge-timeout-reruns.log`). Integration: only `package-auto-refresh` (the known `fs.watch` environment failure).
  - IMP-18: web `764 files | 5750 tests` pass.
  - IMP-19: fresh-start desktop build passes.
  - IMP-20: probes TS-008, MSP-59 (483) and MSP-67 (part 2, renumbered) pass.
- **Scorecard** carries forward from round 5 (9.34; every category ≥ 9.3). Findings: none.
- **Result:** `Pass`. Recommended Recipient: API/E2E engineer (`/api_e2e_engineer`) to reconfirm on the merged build:
  - the base's phone Settings screen with a run idle with a background task;
  - 483's background-task end paths beside the count;
  - the part 2 suites (BTS-01..03, PBS-01) and the renumbered MSP-67.
  Then the proportional test review, then delivery.

## Earlier Round: Part 2 Implementation Review, round 5 (CRR-006) — Pass

- Review Entry Point: `Implementation Review` (part 2)
- Review Scope: `Targeted Delta Review`. `75d687f612..ce06c415cc`: `2990b6a8ac` touches only `autobyteus-agent-presentation-contracts` (`src/remote-task-execution-dtos.ts` and its test removed; `src/remote-agent-status.ts` + test added; `index.ts` re-export; `dist/` rebuilt). `ce06c415cc` is documents only. No spine, route, shape or consumer change: the removed exports had no users.
- Trigger: implementation engineer, IR-004 (CR-002 Local Fix)
- Prior Review Round Reviewed: `4` (CRR-005, Fail)

Checks:
- **CR-002 resolved.**
  - My rerun of the same `rg -w` search over the repository finds no reference to any removed name.
  - `rg "remote-task-execution-dtos"` (without `node_modules` and `tickets`) finds nothing, so no deep import or path reference remains.
  - The package's `exports` map exposes only `.` (the root index), so no subpath import could have reached the removed module.
  - The kept `remoteAgentStatusSchema` / `RemoteAgentStatus` (users: `peer-run-view-answers.ts`, `paired-agent-access.ts`) now live in `src/remote-agent-status.ts` with a small test, re-exported from the index.
- **Evidence** (`evidence/IMP-15-*`):
  - Contract tests pass: 22, 14 and 37.
  - Server typecheck: 0 production errors; test-file errors 1012, equal to the baseline.
  - Web typecheck: 0 production errors; 87, equal to the baseline.
  - `tests/unit/remote-collaboration`: 154 pass.
- **FU-005** is marked resolved in this ticket.
- **Scorecard** carries forward from round 4, except Cleanup Completeness 8.8 → 9.4 (the dead exports and their test are removed). Overall `9.34`; every category ≥ 9.3.
- **Findings:** none open. Follow-ups: FU-006, FU-007 stand.
- **Result:** `Pass`. Recommended Recipient: API/E2E engineer (`/api_e2e_engineer`) for part 2 (AC-005 per runtime on an isolated node including live Claude, AC-006, the two-node peer case, the server E2E suite); then the informational notice to the implementation engineer.

## Earlier Round: Part 2 Implementation Review, round 4 (CRR-005) — Fail (Local Fix)

### Meta

- Review Entry Point: `Implementation Review` (part 2, UC-002: show an agent with a running background task)
- Requirements: `requirements-doc.md` REQ-006, REQ-007, AC-005, AC-006, DEC-004, DEC-005
- Design: `design-spec.md` "Part 2" (SR-005, SR-006); `design-review-report.md` ARCH-REV-005 Pass
- Implementation: `implementation-handoff.md` (IR-003), `implementation-revision-record.md`, `follow-ups.md` (FU-005 to FU-007)
- Code Review Revision ID: `CRR-005`; Review Round: `4`
- Review Scope: `Full Review` of part 2 (`895cf3992d..75d687f612`, 212 files: server domain and routes, three contract packages and their `dist/`, six backends, autobyteus-ts manager, web stores/presentation/desktop/phone, localization, docs, tests and probes). Part 1 (rounds 1–3) is unaffected.
- Task size / risk: `Large` / `High`, confirmed (five wire routes in three strict contract packages, a backend contract method removed from six backends, every status surface).
- Shared design guidance: the updated `design-principles.md` (The Approach; Principles 7, 11, 13, 16) and the updated report template.

### Behavior basis

| Behavior | Status | Evidence |
| --- | --- | --- |
| BEH-005 / REQ-006 / DEC-004 (DS-101..103) | Confirmed | `runningBackgroundTaskCount(inspection)` is the one derivation. `AgentRun` sets `AgentTurnLifecycleState.backgroundTasksRunning` inside the dispatch queue before each batch (`dispatch-processed-agent-run-events.ts`) and before `getStatusSnapshot`. `buildAgentStatusPayload` requires the count, and the transformer and `dispatchCanonicalStatus` read the state. Routes 1–5 carry it (route 5 through `RemoteRunSummary.statuses`, deviation 2). `RunStatusEntry.state` sums the counts per run. On the web, `agentActivityPresentation` and `teamActivityOf` (busy > background > error > idle > offline; offline never shows background). Example sequence tested per event-stream runtime (IMP-08) |
| BEH-006 / REQ-007 / AC-006 (DEC-005) | Confirmed | input path unchanged; `resolveAgentPrimaryAction` reads the status word; server and web tests; probes `stop: 0` |
| Codex / ACP | Confirmed | `snapshot`/`unsupported` → 0 |

### Scenario and candidate gate

Scenarios: SCN-005, SCN-006 (Supported Normal, requirements).

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- |
| C-10 | `remote-task-execution-dtos.ts`, which this change edits, is mostly dead. `remoteTaskExecutionSummaryDtoSchema` (extended here with the count) and its type have no producer or consumer, and neither do `remoteTaskExecutionDtoSchema`, `RemoteTaskExecutionDto`, `remoteAgentLaunchDtoSchema`, `RemoteAgentLaunchDto`, `remoteRowOpenTargetDtoSchema`, `RemoteRowOpenTargetDto`, `remoteTaskExecutionRunIdOf` and `remoteTaskExecutionAgentsOf`. Only `remoteAgentStatusSchema` (`peer-run-view-answers.ts`) and `RemoteAgentStatus` (`paired-agent-access.ts`) have users | Core Principle 7 (dead code in touched files is this ticket); ticket-scope.md "Dead code" | `rg -w <name>` over the repository (`*.ts`, `*.vue`, `*.mjs`, without `node_modules`, `dist`, `tickets`): only the file itself and `tests/remote-task-execution-dtos.test.mjs`. No consumer outside the repository: the package is consumed only via `workspace:*`, and a search of the org folder found only vendored source snapshots in a design worktree | Promote | This ticket | CR-002 |
| C-11 | A terminated run's `offline` status may carry the last observed count (`terminate()` does not reset it) | DEC-004 display | Every display reads the count only for `idle` (`agentActivityPresentation`), and `teamActivityOf` excludes `offline`. For native, the run-end ends' batches are queued before termination's status (count 0) | Reject | — | No supported scenario shows it |
| C-12 | A listed agent run's count comes from its live context (choice 3) | REQ-006 lists | Listed active runs are hydrated and their stream connected (`runHistoryLoadActions.ts` L264, L330-346), so the context receives the count. A run not live shows its stored status, with nothing to show | Reject | — | Holds |
| C-13 | A Team run's stable member rows read the count from the run-status feed while the status word comes from the team context | REQ-006 | Both are live, server-derived; the list that shows the Team run holds it on the feed | Reject | — | Two transports of one server fact, not two derivations |
| C-14 | `current()` is evaluated per source batch | cost | O(tasks of the run), in-memory | Reject | — | Proportionate |
| C-15 | FU-006: a stale doc bullet in `autobyteus-web/docs/agent_execution_architecture.md` (touched) | docs | `follow-ups.md` | Reject as a code finding | Follow-up (recorded) | Delivery's docs sync may fix it, since the file is touched |
| C-16 | FU-007: unmounted running-panel components | Principle 7 elsewhere | files not touched by this change | — | Follow-up (recorded) | Correct placement |

### Structural / design checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health preserved | Pass | the duplicate backend boolean is removed; one derivation | — |
| Matches behavior-defining artifacts | Pass | DEC-004 wording (en, zh-CN), the dot styles, no Stop | — |
| Data-flow spine clarity | Pass | DS-101 → DS-102 (five routes) → DS-103 | — |
| Ownership boundaries | Pass | `AgentRun` owns the count; the server sums for teams and orgs (no client derivation) | — |
| Off-spine concerns | Pass | `backgroundTasksRunningOf` normalizer, `agentActivityPresentation` mapping | — |
| Capability reuse | Pass | existing routes extended; the existing team fold kept | — |
| Reusable owned structures | Pass | one normalizer, one web mapping | — |
| Shared-structure tightness | Pass | one field per status shape, one word by contract casing | — |
| Repeated coordination ownership | Pass | the Team rule lives in `teamActivityOf` only | — |
| Empty indirection | Pass | `AgentRun.hasRunningBackgroundTasks()` is a one-line predicate over the derivation, used by part 1's recorder (existing facade) | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | — | — |
| Visible dependencies (P16) | Pass | the count is passed in (`getBackgroundTasksRunning`); the derivation is a pure function; the required field fails at compile time | — |
| Authoritative Boundary Rule | Pass | consumers read `AgentRun`, not backends | — |
| File placement | Pass | — | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `pairedAgentStatusFrame(status, count)`; required builder field | — |
| Naming / one vocabulary | Pass | `backgroundTasksRunning` / `background_tasks_running` everywhere | — |
| No unjustified duplication | Pass | the web per-status switch tables were replaced by the one mapping | — |
| Patch-on-patch control | Pass | `e259944b13` fixes a source mismatch at its cause | — |
| Dead code removed in touched files (P7) | **Fail** | C-10: the touched contract file keeps (and extends) exports nobody uses | CR-002 |
| Test scenarios requirement-aligned | Pass | example sequence per runtime, sum case, Team rule, AC-006, probes TS-008 / MSP-59 | — |
| Test fixtures reusable / coherent | Pass | fixtures carry the required count | — |
| No stale or compat-only tests | Fail (with CR-002) | `remote-task-execution-dtos.test.mjs` tests only dead exports | remove with CR-002 |
| API/E2E readiness | Pass after CR-002 | — | — |

### Size audit (changed implementation sources, non-empty lines)

`agent-run.ts` 493 → 500 (at the limit, not over; 465 without comments). `configured-agent-execution-handle.ts` 493 → 494, `claude-session.ts` 495 → 492 (shrank). Every other file is ≤ 445, and no delta exceeds 220 (largest `run-status-service.ts` +41/−27; new `agentActivityPresentation.ts` 67 lines). Result: Pass. Note for the next change: `agent-run.ts` has no room left.

### Legacy / persisted data

No compatibility path (strict schemas, required fields; DESIGN.md rule 9). Persisted data `Not Affected` (the count is live only). Pass.

### Scorecard

- Overall: `9.28/10` (average; not the decision rule)

| # | Category | Score | Why / Weak / Improve |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | One derivation through one run-owned field, read by every producer |
| 2 | Ownership / Boundaries | 9.5 | Server-owned count and sums; the web only maps |
| 3 | API / Interface | 9.3 | Required field everywhere. Weak: route 5's named schema was dead (CR-002) |
| 4 | Separation / Placement | 9.4 | — |
| 5 | Shared-Structure Tightness | 9.4 | — |
| 6 | Naming / Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.3 | Strong local evidence, desktop and phone probes |
| 8 | Runtime Correctness | 9.4 | Example sequence, Team rule, AC-006; the count fix in `e259944b13` |
| 9 | No Backward Compatibility | 9.5 | — |
| 10 | Cleanup Completeness | 8.8 | The four helpers and the backend boolean were removed, but a touched contract file keeps a set of unused exports and their test (CR-002). Improve: remove them |

### Findings

#### CR-002 — Dead exports in a touched contract file were extended instead of removed

- Candidate C-10 (Promote). Basis: Core Principle 7 (no dead code in touched files; ticket-scope.md: this ticket). The problem it causes: this change spent work keeping a dead schema in step (a new required field, a test), and the next reader of the peer contract finds two "summary" shapes for one concept, only one of which travels (Principle 15 drift).
- Evidence: the `rg -w` search above. `remoteAgentStatusSchema` and `RemoteAgentStatus` have users; every other export of `autobyteus-agent-presentation-contracts/src/remote-task-execution-dtos.ts` is used only by the file and its own test.
- Required action:
  - Remove from that file: `remoteTaskExecutionSummaryDtoSchema`, `RemoteTaskExecutionSummaryDto`, `remoteTaskExecutionDtoSchema`, `RemoteTaskExecutionDto`, `remoteAgentLaunchDtoSchema`, `RemoteAgentLaunchDto`, `remoteRowOpenTargetDtoSchema`, `RemoteRowOpenTargetDto`, `remoteTaskExecutionRunIdOf`, `remoteTaskExecutionAgentsOf`.
  - Remove or trim `tests/remote-task-execution-dtos.test.mjs` to what remains.
  - Rebuild and commit `dist/`.
  - Mark FU-005 as resolved in this ticket (it is no longer a follow-up).
  - Before deleting, confirm with the compiler and the three contract test suites, plus the server and web typechecks, that nothing reaches them. If something outside the search does (for example a dynamic import), keep that export and record why.
- Classification: `Local Fix`, implementation-owned. No design revision is needed: deviation 2 already records that route 5 travels on `RemoteRunSummary.statuses`.

### Follow-ups

None added. FU-005 becomes this ticket's work (CR-002); FU-006 and FU-007 stand.

### Result

- Review Decision: `Fail` (one Local Fix)
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass`
- Recommended Recipient: implementation engineer (`/implementation_engineer`). After the fix, a targeted delta review, then API/E2E for part 2 (AC-005 per runtime on an isolated node including live Claude; the two-node peer case; the server E2E suite).

---

## Earlier Round: Implementation Review, round 3 (CRR-003) — Pass

- Review Entry Point: `Implementation Review`
- Review Scope: `Targeted Delta Review`. `cf5ce8d109..b78555d7bb` touches `restart-notice.ts` (one cause-dependent line and two constants), its unit test, one RR-02 assertion in the e2e suite, `restart_resume.md` and `GLOSSARY.md`. `55523ed38e` is documents only. No spine, interface or data-shape change: the cause was already stored on each reminder.
- Trigger: implementation engineer, IR-002 (DEC-008 change), resolving CR-001 / API/E2E F-1
- Basis: SR-004 (DEC-008, decided by the user 2026-11-17: option (a), cause-specific wording; stopping the survivors is FU-004), ARCH-REV-003 Pass
- Relevant Implementation Revision IDs: IR-002
- Prior Review Round Reviewed: `2` (CRR-002, failure origin, Requirement Gap)

Checks:
- **CR-001 resolved.** `buildRestartNoticeText` picks the background line by cause. `unexpected_stop` gets `UNEXPECTED_STOP_BACKGROUND_LINE`; `update` and `restart` keep the DEC-003 line unchanged. Checked by evaluating the constant: it is identical to the requirements-doc DEC-008 text (L137). A mid-turn run after an unexpected stop gets the interrupted-turn line plus the DEC-008 line, never the "stopped" line. The unit tests assert the exact lines per cause (`evidence/IMP-04-dec008-rerun.log`: 10 files, 120 tests pass at `b78555d7bb`).
- **BEH-004** is `Confirmed` again against the revised REQ-002: the reminder no longer claims the tasks were stopped after an unexpected stop.
- **RR-02 assertion.** The e2e test asserted the old line after a SIGKILL; it now expects the DEC-008 line and not the "stopped" line. Correcting a test this change makes untrue belongs to this ticket (ticket-scope.md). The built-server rerun is for API/E2E; the change goes to the proportional test-code review after it passes.
- **Not rerunning IMP-01..03 is justified.** Only string content and its selection changed; the type and server surfaces are untouched. IMP-04 reran the typecheck and the affected suites.
- **Docs** (`restart_resume.md`, `GLOSSARY.md`) state both lines by cause.
- **Scope.** Stopping a crashed session's surviving command groups is recorded as FU-004 (the Solution Designer's row), per the user's decision.
- **Scorecard.** Round 1's scorecard carries forward (9.43). Runtime Correctness stays 9.4: the round-2 premise defect was upstream and is now resolved in the approved text. Every category is ≥ 9.3.
- Findings: none open.
- Recommended Recipient: API/E2E engineer (`/api_e2e_engineer`): rerun RR-02 on the built server (and the reminder-text assertions of RR-01/RR-03); then the informational notice to the implementation engineer.

## Earlier Round: API/E2E Failure-Origin Review (round 2, CRR-002)

Superseded by round 3 above. The implementation-review content further below is round 1 (CRR-001, Pass).

- Review Entry Point: `API/E2E Failure-Origin Review`
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E engineer, API-REV-001 Fail (F-1), 2026-11-17
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (Finding F-1)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Project testing guideline applied: `/TESTING.md` (as recorded in the coverage investigation); no conflict
- Failing Scenario IDs: API-06 / RR-02 (AC-001 kill variant; SCN-004; REQ-002; DEC-003 wording)
- Exact Failing Command / Execution Mode: in `autobyteus-server-ts` after `pnpm -C autobyteus-server-ts build`: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" USER="$USER" RUN_RESTART_REMINDER_E2E=1 RESTART_REMINDER_E2E_EVIDENCE_DIR=<dir> pnpm exec vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts -t RR-02 --no-watch` (built server, real processes; product code at `d5e9f350cf`)
- Failure Evidence Paths: `evidence/API-05-14-restart-suite/RR-02.json`, `RR-01.json` (contrast), `vitest-results.log`
- Task size / risk: `Medium` / `High`, unchanged

### Failure context

A native run is idle with `run_bash(run_in_background)` running a tagged `node -e setInterval(...)`. The server is killed with SIGKILL, restarted on the same data, and the run's next input is sent. The run gets the reminder with cause `unexpected_stop` and the line "If you started any background tasks, the restart stopped them." At that moment the command is still alive in the dead server's process group. RR-02.json shows `leftAfterKill: [18615]` and `stillRunningWhenReminded: ["18615 18613 18285 00:13 …RR02_5dbccd76"]`, 13 s after the kill. After a graceful stop the command is gone: RR-01 shows `leftAfterStop: []`, and the desktop app's Restart server and a quit/relaunch also left none.

### Origin analysis (Read, with the API/E2E reproduction as the measured evidence)

- **Scenario basis.** SCN-004 (crash, forced kill, power loss) is a Supported Normal scenario in the approved requirements; the user named crashes. Its trigger is independent: a real SIGKILL of the built server process, through normal production startup.
- **Implementation fidelity.** The code does what the approved basis says. `restartCauseOf` gives `unexpected_stop` when `shutdownAt` is missing, and `buildRestartNoticeText` adds the DEC-003 background line for every cause (`restart-notice.ts`). The design's Concrete Examples specify the same text for "Reminder, unexpected stop, idle" (design-spec L275). This is not an implementation defect.
- **Where the false statement comes from.** The approved text rests on the premise that the restart stopped the background tasks. That holds for a graceful stop: the cleanup closes the host scope, and 338's run end stops command groups. It does not hold for an unexpected stop: a crash runs no cleanup, the anchored command groups outlive the server, and nothing at the next start stops them. That orphaning is older than this ticket, but this ticket is what tells the agent the opposite. The requirements carry the premise too: SCN-002's steps say "stop kills the task" for every restart kind, including SCN-004's.
- **Consequence in real use.** After a crash, the agent believes its build or dev server is gone. Following the reminder ("restart it"), it starts a second copy, which can collide on a port or run two builds into the same output. Meanwhile the orphans keep running unseen.
- **Ticket scope.** This is not a pre-existing problem unrelated to this change. The false claim is introduced by this ticket's reminder, and it makes the in-scope REQ-002 / AC-001 (kill variant) outcome wrong. Either fix needs behavior the approved requirements do not contain:
  - (a) different wording for the unexpected-stop cause. DEC-003's wording is the user's decision.
  - (b) stopping the previous session's surviving command groups at the next start. This is new lifecycle behavior in the native terminal process scope (338/333 functionality, not this ticket's). It would be a prerequisite if chosen.

  So the classification is `Requirement Gap`, owned by the Solution Designer. Under (b), the designer would also decide whether it becomes its own prerequisite Task (ticket-scope.md).
- **Other runtimes (Unclear, for the designer).** Only the native runtime's crash case was measured. Whether Claude, Antigravity or Codex background work survives a server SIGKILL is not evidenced either way. The wording or cleanup decision should cover each runtime the reminder names (REQ-004).
- **Review gap.** Round 1 marked BEH-004 `Confirmed` from code-to-design fidelity. It did not validate the material premise that an unexpected stop stops background tasks; neither did the design or the architecture review (no MP record covers it). The premise lies outside the changed code (crash survival of 338's command groups), so the changed source could not show it. A premise check per restart cause would have exposed it. Round 1's BEH-004 row is reclassified below; no score is reopened, because the classification is upstream.

### Candidate gate (this round)

| Candidate ID | Observation | Scenario | Independent Trigger | Path / Consequence | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-07 | After an unexpected stop, the reminder says background tasks were stopped while they still run | SCN-004, REQ-002, AC-001 (kill) | SIGKILL of the server process | no cleanup → command group survives → next input carries the `unexpected_stop` reminder with the stopped-tasks line → agent may start duplicates; orphans run unseen | RR-02.json (`leftAfterKill`, `stillRunningWhenReminded`), contrast RR-01 | Promote | Requirement Gap | Solution Designer decides: cause-specific wording (user's DEC-003) or stopping the previous session's surviving groups at start (new behavior, possibly a prerequisite Task) |
| C-08 | FU-002 (a restored native run reuses `turn_0001`, so the reminder card shows twice in the web view) | — | — | pre-existing, also on base; recorded by API/E2E | `follow-ups.md` FU-002 | Not reviewed here | Follow-up (already recorded) | Outside this entry point; the designer may choose to pull it in |
| C-09 | 13 `test:integration` failures in two file-watcher files; "Command did not start" under load | — | machine load | environment (fseventsd saturation; FU-003 of autobyteus-333) | execution report | Not reviewed here | — | Outside this failure; recorded by API/E2E |

### Round 2 result

- Review Decision: `Fail` (failure origin found upstream)
- Failure Origin: `Requirement Gap`. The approved reminder text's premise is false for the `unexpected_stop` cause, and either fix needs an unapproved behavior decision. It is not an implementation defect, a test problem or an environment problem.
- Recommended Recipient: Solution Designer (`/solution_designer`)
- After the designer's decision: an implementation change returns through source review and API/E2E; a wording-only change through implementation, a targeted source review, then API/E2E (RR-02 re-run).

---

## Round 1 Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; SR-001 basis, REQ-005/AC clarified at SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (through the design's citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (Ready, SR-003, part 1)
- Supplemental Task Artifacts Reviewed As Context: `architecture-design-handoff.md` (context only); no behavior-defining supplements
- Relevant Solution Revision IDs: SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation engineer, IR-001 (part 1) ready for source review, 2026-11-17
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Report / API/E2E Revision Record / Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. One subsystem extended plus a new file pair, with a facade, composition and startup order changes. The record is now live while the node runs (timer and persistence), a new persisted file is added, startup order changes, and a new notice source sits in every run's input path. No correction.

## Review Scope

- Changed implementation and behavior reviewed: `4cbf9e7881..d5e9f350cf` (23 files: 11 source, 7 tests, 5 docs)
- Files / areas reviewed: `restart-resume/{busy-run-record,busy-run-recorder,restart-cause,restart-notice,restart-reminder-record,restart-reminder-service,restart-resumer}.ts`, `agent-execution/domain/agent-run.ts`, `compositions/{build-studio-server,restart-resume-composition}.ts`, `server-runtime.ts`; the changed unit and integration tests; `closed-task-fence.ts` and `collaboration-composition.ts` (read, to check the prune's inputs at take time); the docs (read for consistency)
- Explicit exclusions: part 2 (UC-002, not built yet); the FU-001 watcher test (unrelated)

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001..REQ-005 with DEC-001 B, DEC-002, DEC-003, DEC-006; preserved: 285's resume order, closed-Task fence, first-input rule, concurrency cap; 338's "no completion notice for shutdown stops".
- Design-spec behavior map verified against the implementation: yes.
- Design review report and round confirmed: ARCH-REV-002 Pass, round 2.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | recorder `entries()` (mid-turn) → `takePreviousSession` (cause `update`, `interruptedTurn`) → `reminders.add` → `resumeAfterRestart` → `resumeOne`: pre-filter, closed-Task fence, root history, restore, re-check, `claim`, post `onlyAsFirstInput`, `settleClaim` | — |
| BEH-002 | Confirmed | `entries()` records `idle` + `hasRunningBackgroundTasks()`; at a graceful stop, Codex idle runs are added through `inspectBackgroundTasks()` (≤ 1 s); then the same path without the interrupted line | — |
| BEH-003 | Confirmed | `restartCauseOf` → `restart` (`shutdownAt` set) → pending → `AgentRunPlatformNotices` slot after the runtime hand-over → `takePreface` → `prefaceDelivered` | — |
| BEH-004 | Contradicted (round 2) | tick-written record without `shutdownAt` (≤ 2 s old) → `unexpected_stop` → as BEH-003 | Round 2: the reminder's "the restart stopped them" is false after an unexpected stop; background commands survive a server SIGKILL (RR-02). See the round-2 section above |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001..SCN-004 | REQ-001..005, AC-001..004 | Operational | update / user / none (crash) | restart of the node | install-and-restart, quit and relaunch, Restart server, `docker stop`, crash | Normal | as in the behavior table | told per DEC-001 B, exactly once | requirements-doc, design-spec | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Reminder time reads `2026-11-17 22:20 UTC`; DEC-003's sample shows `22:20` | DEC-003 wording (the user's) | every reminder | `timeOf()` in `restart-notice.ts` | handoff choice 2 | Reject | — | Adding the date and zone keeps the approved content and makes the time unambiguous for an agent that does not know the node's zone. It is visible in the handoff; delivery can mention it in the release notes |
| C-02 | Is the closed-Task / root-history prune correct at take time, before listen? | REQ-005 | the take | `composeTaskSide` loads the Task resources and builds the `DelegationIndex` inside `buildStudioServer` (`collaboration-composition.ts` L104-111), before the take | code read | Reject | — | The fence's inputs are loaded when the prune runs. Damaged Task data fails closed (`TASK_AGENT_RESOURCES_UNAVAILABLE`), as the input fence does for that run |
| C-03 | Pending reminders whose root was later deleted are pruned only at a take that has a record | REQ-005 | node restarts with no busy runs | stale entries stay in `restart-reminders.json` until a later take; never delivered (no input reaches a gone run) | code read | Reject | — | No behavior consequence; a few bytes of transient state |
| C-04 | At least once (not exactly once) when the node crashes between a delivery and its save (choice 7) | REQ-005 | crash right after delivery | the reminder is told again at the next start | handoff choice 7 | Reject | — | A crash in that window is an infrastructure failure, outside scope by default (Principle 6); recorded in the handoff |
| C-05 | `ResumeReport.reminded` counts non-update entries before the prune | — | log line | count only | code read | Reject | — | Log wording; no behavior |
| C-06 | The recorder calls `getStatusSnapshot()` (a lifecycle reconcile) on every live run every 2 s | escalation trigger (cost) | live session | in-memory reconcile already used by other callers; writes only on change | `agent-run.ts` L129; termination check uses the same | Reject | — | Within the design's cost bound |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | `Missing Invariant` closed by the explicit cause rule and one reminder owner | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | DEC-003 text (with C-01's time refinement); seven implementation choices read, none changes ownership or behavior | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-004 visible in recorder, resumer, service, `server-runtime.ts` order (take → `startSession` → `setCleanup` → … → `resumeAfterRestart`) | — |
| Ownership boundary preservation and clarity | Pass | recorder sole writer of `busy-runs.json`; resumer sole reader/remover; service sole owner of `restart-reminders.json` | — |
| Off-spine concern clarity | Pass | record, reminder record, cause rule, notice builder each serve one owner | — |
| Existing capability reuse | Pass | `AgentRunPlatformNotices`, preface dispatch, `atomicWriteJsonFile`, cleanup hook, the 285 resume path | — |
| Reusable owned structures | Pass | `RestartCause`/`restartCauseOf` in one file, used by resumer and stored facts | — |
| Shared-structure tightness | Pass | `PendingRestartReminder` = facts only; text built at delivery; `interruptedTurn` derived once | — |
| Repeated coordination ownership | Pass | one delivery owner for wake and preface (claim vs take on one state) | — |
| Empty indirection | Pass | `AgentRun.hasRunningBackgroundTasks()` is the designed facade | — |
| Separation of concerns and file responsibility | Pass | largest file 215 effective lines | — |
| Ownership-driven dependency | Pass | `restart-resume` imports no runtime backend; resumer → service one way | — |
| Authoritative Boundary Rule | Pass | the resumer uses `reminders.add/prune/claim/settleClaim`, never the reminder file | — |
| File placement | Pass | all new files in `restart-resume/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | `claim()` async (choice 1) is a sound refinement: no answer before the file is loaded | — |
| Naming quality; one vocabulary | Pass | "restart reminder", "restart cause"; `busy-runs.json` kept with a widened, same-direction meaning (DESIGN.md rule 10, as designed); glossary updated | — |
| No unjustified duplication | Pass | the record and reminder-record readers share a pattern but have different shapes and owners | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files | Pass | recorder merge, `resumeAfterUpdate`, `RestartNoticeInput`, old text and the 285 "non-update notifies nothing" tests removed or rewritten | — |
| Test scenarios and assertions requirement-aligned | Pass | exactly-once paths (input first; wake first with input during the post; NOT_FIRST; failed post), MP-002, R-2, R-6, the prune, the cause rule, the previous-release record, startup order via `invocationCallOrder`, preface through a real `AgentRun` | — |
| Test fixtures/helpers reusable, coherent | Pass | — | — |
| No stale/duplicated/compat-only tests | Pass | — | — |
| API/E2E readiness | Pass | clear hints for AC-001..004 on an isolated node | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/agent-run.ts` | 491 | 493 | Pass | Pass (+3) | Pass | — | — |
| `compositions/build-studio-server.ts` | 488 | 492 | Pass | Pass | Pass | — | — |
| `server-runtime.ts` | 229 | 235 | Pass | Pass | Pass | — | — |
| `restart-resume/restart-resumer.ts` | 177 | 215 | Pass | Pass | Pass | — | — |
| `restart-resume/busy-run-recorder.ts` | 44 | 127 | Pass | Pass (+112/-21) | Pass | — | — |
| `restart-resume/restart-reminder-service.ts` | 0 | 114 | Pass | Pass | Pass | — | — |
| other changed sources | ≤ 90 | ≤ 90 | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The tolerant reader defaults missing fields; it is a generic policy, not a version branch |
| No legacy old-behavior retention | Pass | update-only rule replaced |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `busy-runs.json` Directly Usable (tested with a previous-release record); `restart-reminders.json` new transient state |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already in the change (`restart_resume.md` rewritten, `agent_execution.md`, `agent_team_execution.md`, module README, `GLOSSARY.md`).
- Files likely affected later: none beyond delivery's docs sync.

## Additional Material Premise Validation

None new. MP-001/MP-002 from ARCH-REV-002 confirmed in code and tests (MP-002: `record()` is inert before `startSession()`; the take comes before `setCleanup`).

## Review Scorecard (Mandatory)

- Overall score: `9.43/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001..004 readable in code; the startup order is explicit in `server-runtime.ts` and asserted by test | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | one owner per file; reminder state (pending/claimed/inFlight) held only by the service | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | small, explicit methods; the claim and the preface work on one state | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | record, cause, notice, service, recorder, resumer split by concern | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | facts-only reminder; one derived field | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | clear names and comments | the resumer's multi-level wake loop stays dense (inherited from 285) | — |
| 7 | API/E2E Readiness | 9.4 | 119 targeted tests; precise E2E hints | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | exactly-once paths traced and tested; startup failure leaves the previous record intact; never-throwing take and record | at least once across a crash right after a delivery (accepted, C-04) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | clean replacement | — | — |
| 10 | Cleanup Completeness | 9.5 | removed paths and rewritten 285 tests | — | — |

## Findings

Round 1: none.

### CR-001 (round 2; API/E2E F-1) — After an unexpected stop, the reminder says background tasks were stopped while they keep running

- Candidate C-07 (Promote). Scenario SCN-004; REQ-002; AC-001 (kill variant); DEC-003 wording.
- Evidence: RR-02.json (`leftAfterKill`, `stillRunningWhenReminded`); contrast RR-01.json (`leftAfterStop: []`).
- Classification: `Requirement Gap`, owned by the Solution Designer. The reasoning, the fix options and the review gap are in the round-2 section above.

## Follow-ups

- Follow-ups this review added: None. FU-001 (the implementer's, an unrelated flaky watcher test) stands as recorded.

## Classification

- Round 1: N/A (Pass). Round 2: `Requirement Gap` (CR-001).

## Recommended Recipient

- Round 2: Solution Designer (`/solution_designer`, rule: Design Impact, Requirement Gap or Unclear needs upstream revision). Round 1 went to the API/E2E engineer.

## Residual Risks

- R-4/R-5: Codex idle runs are recorded only at a graceful stop; ACP runs only when mid-turn; a dev build without a release stamp never counts an update.
- R-6: if the reminders cannot be saved at the take, only the log line is certain.
- C-04: at least once across a crash right after a delivery.
- C-01: the reminder's time format adds the date and `UTC` to DEC-003's sample.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, CRR-003; round 2 was a failure-origin `Requirement Gap`, now resolved by SR-004 / DEC-008 and IR-002)
- Review Entry Point: `Implementation Review` (targeted delta)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (the unexpected-stop line no longer asserts that the tasks were stopped)
- Score Summary: 9.43 average carried forward; every category ≥ 9.3
- Failure Origin: N/A (round 2's Requirement Gap resolved)
- Recommended Recipient: API/E2E engineer
- Notes: Part 1 implements SR-003 as designed. For API/E2E: AC-001 (before/after on base `4cbf9e7881`; update, graceful restart, kill), AC-002, AC-003 per runtime, AC-004 on an isolated node.
