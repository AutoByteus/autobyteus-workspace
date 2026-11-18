# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited through the design; not re-audited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (Ready, SR-005)
- Supplemental Task Artifacts Reviewed As Context: `prototype/wrapper-skeleton-probe.sh` (via the design's contract), `prototype/kill-pid-probe.*`
- Relevant Solution Revision IDs: SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the fix commit `ddd594d07b` (diff from `3e4fdbefcb`, the ticket-documents commit on top of `e26460bf57`) changes two files only: `command-wrapper.ts` (the last line of `__ab_fg_end`, `builtin exit "$__ab_rc"` → `__ab_status "$__ab_rc"`, plus a comment) and `run-bash-wrapper.test.ts` (one new case). `070c294845` touches only `tickets/`. No shared interface, data shape or spine change; the delta stays within CR-001's file and behavior. Round 1 evidence for every other check is carried forward.
- Trigger: implementation engineer, IR-002 (CR-001 Local Fix), 2026-11-10
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `2`
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Failure Evidence Paths: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Two packages; model-facing tool contract (new parameter and result fields, four tools removed); every `run_bash` call now ends at a wrapper frame; a shared backend capability; waking asynchronous delivery; run-end lifecycle change. No correction.

## Review Scope

- Changed implementation and behavior reviewed: round 1 `374e35a60e..e26460bf57` (74 files; `6a4df1c54b` is a baseline test fix in an unrelated test). Round 2: `3e4fdbefcb..ddd594d07b` (CR-001 fix), plus the IR-002 handoff and revision-record updates in `070c294845`.
- Files / areas reviewed: autobyteus-ts `command-wrapper.ts`, `anchor-control-protocol.ts`, `anchored-command-launcher.ts`, `shell-command-executor.ts`, `native-command-process-scope.ts`, `process-group-observer.ts`, `non-interactive-shell-resolver.ts`, `background-process-manager.ts`, `background-output-log.ts`, `background-process-context.ts`, `types.ts`, `tools/run-bash.ts`, `register-tools.ts`, the exports, `background-process-cleanup-step.ts` + orchestrator; server `agent-run-backend.ts` and all five backends, `autobyteus-background-task-reporter.ts`, `agent-run.ts`, `system-task-notification-senders.ts`, `background-task-notices/**`, `platform-notice-sources.ts`, both hosts, `runtime-memory-event-accumulator.ts`, `autobyteus-translation.ts`, Daily Assistant template, `GLOSSARY.md`; the new and rewritten tests (wrapper R-0 suite, manager, notice service, reporter, launcher/output lifetime), and the two e2e shutdown fixtures.
- Explicit exclusions: docs prose read only for consistency with the code (delivery owns docs sync); WSL not executable here.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001 to REQ-015 with the user's decisions DEC-001 B, DEC-002, DEC-003, DEC-006, DEC-012; preserved behavior BEH-005/010/011/012/013 and "without it, run_bash behaves as today" (REQ-001).
- Design-spec behavior map verified against the implementation: yes, BEH-001 to BEH-014 (table below).
- Design review report and round confirmed: ARCH-REV-003 Pass, round 3.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `run-bash.ts` L601-606 → `manager.run(…, {background:true})` → `wrapCommand('background')` → executor returns at `FOREGROUND_DONE` → `{pid, status, effectiveCwd, outputFile}`; start failure throws | — |
| BEH-002 | Confirmed | `JOB_ENDED` → `stderrFrame` → `onJobEnded` → `manager.recordEnd` (outcome, duration, `log.lastLines()`); `{error}` from `own()` when the wrapper exits without a frame | — |
| BEH-003 | Confirmed | `BackgroundTaskNoticeService.onEvent/settleIfIdle/flush` → `AgentRun.postUserMessage(SYSTEM)` | — |
| BEH-004 | Confirmed | `BackgroundOutputLog` under `os.tmpdir()/autobyteus-background-tasks/<agentId>/`, removed by `stopAllForRunEnd` | — |
| BEH-005 | Confirmed | background form `trap 'trap - TERM; kill -TERM 0' TERM … & wait $!`; wrapper `trap '' TERM` | — |
| BEH-006 | Confirmed | four tool files and registrations removed; no `src` reference left except the journal converters for historical rows | — |
| BEH-007 | Confirmed | orchestrator → `BackgroundProcessCleanupStep` (first) → `stopAllForRunEnd` (scope stop `run-end`, `runEnded` makes ends non-reportable, logs closed, folder removed) | — |
| BEH-008/009 | Confirmed | reporter → `BACKGROUND_TASK_UPDATED` via the backend's source listeners; `hasRunningBackgroundTasks()` = `manager.hasRunning()`; inspection `event-stream` | — |
| BEH-010 | Confirmed | `manager.list()`; backend `listRunning()`; `AgentRun.listRunningBackgroundTasks()` | — |
| BEH-011 | Confirmed | executor `interrupt` is a no-op once `foreground` is set | — |
| BEH-012 | Confirmed | resolver unchanged; template names removed | — |
| BEH-013 | Confirmed | `autobyteus-translation.ts` `runBash` → `backgroundCommand` when `run_in_background === true`; retired converters kept | — |
| BEH-014 | Confirmed | foreground wrapper `FOREGROUND_DONE:<rc>:<pids>` → `backgroundTasksStarted`; later bytes to `laterOutput` → call log | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001..SCN-012 | REQ-001..015 | as in requirements | as in requirements | as in requirements | as in requirements | Normal | as in the behavior table | as in requirements | requirements-doc, design-spec | Supported Normal Scenario | Use |
| CR-SCN-01 | REQ-001 (preserved foreground), BEH-001 preserved column, design R-0 / escalation trigger | System | native agent | run an ordinary foreground command | `run_bash` (every call) on a host whose user has a `~/.bash_logout` (shipped by the Debian/Ubuntu home skeleton, so also every WSL Ubuntu distro, which runs every Windows call) | Normal | `run_bash` → manager → foreground wrapper under `bash --noprofile --norc -lc` → `__ab_fg_end` → `builtin exit "$__ab_rc"` → bash reads `~/.bash_logout` | the user's logout script runs once per call; on the base branch it did not (no `exit` builtin) | `evidence/CR-001-bash-logout-probe.md` | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The wrapper's final `builtin exit` makes the login shell read `~/.bash_logout` on every foreground call | CR-SCN-01; REQ-001 "without it, run_bash behaves as today"; design R-0 ("every call goes through the wrapper") | an ordinary agent `run_bash` call | `command-wrapper.ts` L57 → bash `exit` in a `-l` shell → logout file runs (side effects such as `clear_console`, `ssh-agent -k`, history writes) after each call; output lands in `laterOutput` (dropped, or in the call log when it has jobs) | probe: `runBash('echo hi')` ran the logout script once; base invocation runs it zero times | Promote | This ticket | Bounded wrapper fix plus an R-0 regression case (CR-001) |
| C-02 | `lastLines` may miss a task's final stdout line, since `JOB_ENDED` comes on stderr and the job's output on stdout (two pipes) | SCN-001 / AC-002 | background command ends | `recordEnd` reads the tail when the frame is decoded | reviewer probe: 40 background + 40 `&` jobs ending with a final line right after output, 0/80 misses (macOS) | Reject | — | Not reproduced; ordering in practice holds (the job's exit and the wrapper's `wait` follow its last write). API/E2E checks last lines on Linux in AC-002 anyway |
| C-03 | `own()` may record `{error}` when `RESULT` (IPC) is decoded before the last `JOB_ENDED` (stderr pipe) | SCN-001 | last job ends, wrapper exits | `own` → `retireCompleted` (a `ps` read) runs before the lost-end check | the `ps` read gives the pipe time; wrapper suite asserts exact outcomes 25/25 (macOS) and 22/22 (Linux) | Reject | — | No evidence of the race; no mechanism required |
| C-04 | A run-end stop could show in the panel as `failed` ("Stopped when the run ended") rather than `stopped` | SCN-005 | Terminate | wrapper ignores TERM and normally reports `JOB_ENDED` 143 (→ `stopped`) before the `{error}` fallback | code read | Reject | — | The `{error}` path is only the fallback; the panel of a terminated run is not an acceptance criterion |
| C-05 | `resolver.shell()` and `resolvePosix` each find bash | design contract | every call | same `findExecutable` on the same env inside one resolver instance; cannot diverge | code read | Reject | — | One owner, one rule; no consequence |
| C-06 | Default timeout 30 written in both `runBash` and `manager.run` | engineering contract | — | — | code read | Reject | — | Cosmetic; not worth a round |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | manager is the one owner of records, report state and run-end stop; output log split out | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | wrapper text follows the Command Wrapper Contract; 15 deviations read, none changes behavior or ownership (1, 3, 6, 11, 15 checked in code) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-006 traced in code (behavior table) | — |
| Ownership boundary preservation and clarity | Pass | facts in autobyteus-ts, publication/delivery in server | — |
| Off-spine concern clarity | Pass | wrapper, decoder, output log, reporter mapping, notice builder each serve one owner | — |
| Existing capability/subsystem reuse | Pass | `BACKGROUND_TASK_UPDATED`, `AgentRunPlatformNotices`, `postUserMessage`, shutdown orchestrator, `AnchorControlDecoder` extended | — |
| Reusable owned structures | Pass | `BackgroundTaskStart`/`BackgroundTaskEnd` in `terminal/types.ts`, used by result, capability, notice, mapping | — |
| Shared-structure/data-model tightness | Pass | three-variant `outcome`; `BackgroundTaskState` = start + nullable end | — |
| Repeated coordination ownership | Pass | notice-source wiring for both hosts in one composition (`platform-notice-sources.ts`) | — |
| Empty indirection | Pass | `AgentRun` facade is the designed boundary; `background-task-notices.ts` mirrors sibling subsystems | — |
| Separation of concerns and file responsibility | Pass | largest new file 196 effective lines | — |
| Ownership-driven dependency | Pass | service → `AgentRun` only; backend → `getBackgroundManager` only; no server vocabulary in autobyteus-ts | — |
| Authoritative Boundary Rule | Pass | no caller uses both the manager and the scope for background commands (`run-bash.ts` calls only the manager) | — |
| File placement | Pass | as the Final File Responsibility Mapping, plus the justified `compositions/platform-notice-sources.ts` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | `manager.run/markCallStart/takeEndsSince/takeUnreported/list/hasRunning/onChange/stopAllForRunEnd`; capability `{unsupported} \| {platform}` | — |
| Naming quality; one vocabulary | Pass | background task (platform) / background process (native layer), glossary entries added | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | deviations 6 and 15 are root-cause fixes with comments | — |
| Dead code removed in touched files | Pass | four tools, old types, dead manager methods, survivor listing, `isProcessRunning`; `OutputBuffer` still used by `TerminalSessionManager` | — |
| Test scenarios and assertions requirement-aligned | Pass | wrapper suite maps to probe cases 1-12 and the R-0 list; round 2 adds the CR-001 case, which compares each command's logout reads and exit code with the plain login shell | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale/duplicated/compat-only tests | Pass | tests naming the retired tools rewritten | — |
| API/E2E readiness | Pass | CR-001 resolved (round 2); wrapper suite 26/26 macOS, 23/23 Linux bash 5.2 + dash at `ddd594d07b` | — |

## Source File Size And Structure Audit

Effective non-empty lines (base → after), changed implementation sources only:

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `server/.../domain/agent-run.ts` | 471 | 484 | Pass | Pass (+16) | Pass | — | — |
| `server/compositions/build-studio-server.ts` | 500 | 483 | Pass (shrank) | Pass | Pass | — | — |
| `server/.../autobyteus-agent-run-backend.ts` | 344 | 367 | Pass | Pass | Pass | — | — |
| `server/background-task-notices/services/background-task-notice-service.ts` | 0 | 196 | Pass | Pass (new file, 221 raw lines incl. blanks; one owner) | Pass | — | — |
| `ts/.../anchored-command-launcher.ts` | 138 | 198 | Pass | Pass | Pass | — | — |
| `ts/.../background-process-manager.ts` | 102 | 187 | Pass | Pass (+193/-85) | Pass | — | — |
| `ts/.../command-wrapper.ts` | 0 | 82 | Pass | Pass | Pass | — | — |
| other changed sources | ≤ 336 | ≤ 336 | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | no aliases or name mapping |
| No legacy old-behavior retention | Pass | journal converters for retired names render historical rows (REQ-012) |
| Dead code removed in touched files | Pass | see above |
| Approved persisted-data decision followed | Pass | Directly Usable — No Migration |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (already in the change: terminal tools, agent execution/tools/journal/team docs, notice docs, glossary).
- Why: model-facing tool contract and new notice subsystem.
- Files likely affected after CR-001: `autobyteus-ts/docs/terminal_tools.md` only if it describes the wrapper's ending.

## Additional Material Premise Validation

None new; upstream MP-001..MP-009 unchanged.

## Review Scorecard (Mandatory)

- Overall score: `9.42/10` (simple average; not the decision rule). Round 2 changes only rows 7 and 8; the others carry over from round 1 (the delta does not touch them).

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001..006 visible in code with one owner each | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | manager owns facts; service reaches it only through `AgentRun` | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | explicit manager API and capability union | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | wrapper, decoder, log, reporter, builder split by concern; composition helper removes duplicated wiring | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | two tight shared types, three-variant outcome | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | clear names, glossary added; wrapper script dense but commented | wrapper text is hard to read | — |
| 7 | API/E2E Readiness | 9.3 | strong local evidence (wrapper suites on macOS and Linux at the fix commit, full suites at `e26460bf57`) with clear hints for live, WSL and fixture runs | WSL and live-model behavior are not yet exercised (inherent to this stage) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | probe cases, R-0 list, kill-in-place, run-end stop evidenced; CR-001 fixed: logout reads and exit codes equal the plain login shell for six commands, including the `set -e` and EXIT-trap paths | the stdout-tail vs `JOB_ENDED` ordering is only probe-checked (0/80) | API/E2E compares notice last lines on Linux |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | dead code removed with evidence; `OutputBuffer` decision recorded | — | — |

## Findings

### CR-001 — The wrapper's final `exit` runs the user's `~/.bash_logout` after every foreground `run_bash` call

- Candidate: C-01 (Promote). Protects REQ-001 ("without it, run_bash behaves as today"), BEH-001 preserved column, the design's R-0 risk and escalation trigger.
- Evidence: production runs every call as `bash --noprofile --norc -lc <script>` (`non-interactive-shell-resolver.ts`, unchanged). A login shell reads `~/.bash_logout` when the `exit` builtin runs; `--noprofile` does not stop it. The foreground wrapper's `__ab_fg_end` ends with `builtin exit "$__ab_rc"` (`command-wrapper.ts` L57), so the logout file now runs once per call. Through `runBash(ctx, 'echo hi')` with a temp HOME, the logout script ran once (`evidence/CR-001-bash-logout-probe.md`). On the base branch the same call ran it zero times; only commands that called `exit` themselves did.
- Consequence: the Debian/Ubuntu home skeleton ships a `~/.bash_logout` (`clear_console` when `SHLVL` is 1), and Windows runs every call in WSL `bash -lc`. Users' logout scripts commonly kill the ssh-agent, write history or print text. These now run after every agent command, in the agent's environment. The result JSON is unchanged (the bytes go to `laterOutput`), so no existing test sees it. With `&` jobs, the logout output is appended to the call's output log after the last job.
- Required action (implementation's choice of mechanism): end the wrapper's normal path without the `exit` builtin, for example by returning the status through `__ab_status "$__ab_rc"` as the script's last command, with the exit code unchanged. Keep the EXIT-trap path's semantics: when the user's own command ran `exit`, bash already read the logout file as on base; check that the wrapper does not add a read on the `set -e` path either, or record why it is unavoidable. Add an R-0 case to `run-bash-wrapper.test.ts` (temp HOME with a `.bash_logout` writing a marker): an ordinary command, a command leaving an `&` job, and `exit 3` read it as often as on base. Run it on macOS and in the Linux harness (IMP-02, IMP-08).
- Classification: `Local Fix`, implementation-owned.
- Status (round 2): **Resolved** in `ddd594d07b`. `__ab_fg_end` now ends with `__ab_status "$__ab_rc"`. As the script's last command, that status is the shell's exit code. From the EXIT trap, the shell keeps the status that ended it, so only the user's own `exit` reads the logout file, as on base. The new R-0 case compares six commands with plain `bash --noprofile --norc -lc`: ordinary, `&` job, `exit 3`, `set -e; false`, `trap 'exit 4' EXIT`, and trap + job + `exit 5`. It reports the same exit code and logout reads for each. The implementer reports the case failing on `e26460bf57`; it passes at the fix on macOS (`evidence/IMP-02-wrapper-suite-macos.log`, 26/26) and Linux bash 5.2 (`evidence/IMP-08-linux-wrapper.log`, 23/23, CR-001 row printed). Not rerunning IMP-01/04/05/07 is justified: the change is shell text inside the wrapper, with no type, export or server change; IMP-03 terminal suites were rerun (211 pass).

## Follow-ups

- Follow-ups this review added: None

## Classification

- Round 2: none (Pass). Round 1 was `Local Fix` (CR-001), implementation-owned; now resolved.

## Recommended Recipient

- API/E2E engineer (`/software_engineering_team/api_e2e_engineer`, rule: implementation review passes), then the informational pass notice to the implementation engineer.

## Residual Risks

- WSL is not executable here; R-0/R-6 on WSL and the bridge exit when a detached process outlives a call stay for API/E2E (handoff hints).
- C-02/C-03 orderings (stdout tail vs `JOB_ENDED`, `RESULT` vs last `JOB_ENDED`) were not reproduced; API/E2E should still compare notice last lines with the output file on Linux (AC-002/AC-007).
- FU-003 start robustness under load (DEC-005) unchanged; a failed start now names its reason.
- ASM-002 (models use `tail`) only in live E2E.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, CRR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.42 average; every category ≥ 9.3.
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: The structure, ownership and removal work are sound and match SR-005. The 15 deviations, plus deviation 16 (the CR-001 fix), are justified. Code reviewed through `ddd594d07b`. For API/E2E: AC-001 to AC-013 with a live model, WSL (R-0/R-6 and the bridge exit), the changed shutdown e2e fixtures, the panel, and notice last lines compared with the output file on Linux.
