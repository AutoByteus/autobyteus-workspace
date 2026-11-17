# Code Review Report

## Latest Round: API/E2E Failure-Origin Review (round 2, CRR-002)

This round is the latest authoritative result. The implementation-review content further below is round 1 (CRR-001, Pass) and stands unchanged, except where this section says otherwise.

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

- Review Decision: `Fail` (round 2, failure-origin; round 1 implementation review was `Pass`)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-004 is supported; RR-02 reaches it through a real SIGKILL)
- Material-Premise Gate: `Fail` (the premise "the restart stopped the background tasks" does not hold for an unexpected stop)
- Score Summary: round 1 scorecard unchanged (9.43); not repeated for a failure-origin round
- Failure Origin: `Requirement Gap` (CR-001 / F-1)
- Recommended Recipient: Solution Designer
- Notes: Part 1 implements SR-003 as designed. For API/E2E: AC-001 (before/after on base `4cbf9e7881`; update, graceful restart, kill), AC-002, AC-003 per runtime, AC-004 on an isolated node.
