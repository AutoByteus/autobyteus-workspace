# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-338, user comment 2026-11-09) | N/A | N/A | Approved (user, 2026-11-09) | BEH-001-015, REQ-001-015, DEC-001-011 | User decided DEC-001 to DEC-005 |
| SR-002 | Design | Architecture design after approval | N/A | Requirements Approved | Design Ready | REQ-006, QR-004 wording (output file lifetime) | `design-spec.md` Ready; Large / High |
| SR-003 | Mixed | User decision 2026-11-10 (DEC-006) | N/A | Requirements Approved; Design Ready | Requirements Approved (user); Design Ready (revised) | BEH-014, REQ-011, AC-010, SCN-012, DEC-006 | Plain `&` jobs become background tasks too |
| SR-004 | Mixed | ARCH-REV-001 (Fail, Design Impact) | AR-001 to AR-008 | Requirements Approved; Design Ready (SR-003) | Requirements Approved (user, DEC-012); Design Ready (revised) | REQ-002, REQ-007, REQ-011, AC-010, DEC-012, DEC-013 | Wrapper contract, delivery rules, narrowing |
| SR-005 | Design | ARCH-REV-002 (Fail, narrow) | AR-003 (IFS), AR-007 (chain), AR-010 | Design Ready (SR-004) | Design Ready (SR-005) | REQ-002, REQ-011 (wording), DEC-013 interface | Three items fixed; no intended-behavior change |

## Revision Entries

### SR-001 — Baseline: run_bash background option, completion notice, tool retirement

- Phase and classification: Requirements, `Initial Baseline`
- Triggering evidence: Task autobyteus-338 description and the user's comment of 2026-11-09; investigation and prototype P1-P5 (`investigation-notes.md`, `prototype/prototype-run.log`)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not started
- IDs affected: all (baseline)
- Scenario basis: SCN-001 to SCN-012 recorded; SCN-005 is a behavior change pending DEC-003
- Why recorded: first coherent baseline presented to the user
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md`; `options-report.md`
- Supplements: prototype, run log, package file list, options report
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: awaiting the user's decisions DEC-001 to DEC-005; nothing approved
- Behavior-defining supplement versions: none
- Design/review basis: N/A
- Task-size/risk classification: N/A (before design)
- Handoff outcome: none; held at `Ready for Approval` in the conversation with the user
- Downstream impact: none yet
- Remaining gaps: DEC-001 to DEC-005; ASM-001 (448 text)
- Next action: the user's answers; then approve, design, classify, hand off
- Update 2026-11-09 (same round, no content change): the user replied confirming the direction: reuse the background task manager, send a finish notification to the LLM, show background tasks in the frontend, run several at once for parallelism. This matches REQ-002/003/004/010 and SCN-003/009. DEC-001, DEC-003, DEC-004, DEC-005 and the idle-wake part of DEC-002 are still open.
- Update 2026-11-09 (same round): the user decided DEC-004: autobyteus-448 (notify agents that are idle but have a running background task after an automatic update) is a separate Task; this Task focuses on simplifying. REQ-010/REQ-013 stay in scope as 448's input. Open: DEC-001, DEC-002 (idle wake), DEC-003, DEC-005.
- Update 2026-11-09 (same round): the user decided DEC-001 = option B: run_bash returns the pid; the agent stops a command with `kill <pid>` through run_bash; all four tools are retired. Evidence added: `prototype/kill-pid-probe.{mjs,log}` (plain launch: `kill <pid>` leaves the command's children running; with a TERM-forwarding wrapper nothing remains). Requirements changed: BEH-005, REQ-005, REQ-007, REQ-008, AC-005; added REQ-015 and DEC-011 (an end during the agent's own run_bash call is reported in that result, avoiding the extra turn). Open: DEC-002 (idle wake), DEC-003, DEC-005.
- Approval 2026-11-09: the user agreed to the recommended DEC-002 (wake idle agent), DEC-003 (run end stops its commands), DEC-005 (FU-003/FU-006 in a separate Task after this one). With DEC-001 (B) and DEC-004 (448 separate) all decisions are the user's. Requirements `Approved` by the user at this SR-001 baseline. Next: architecture design (SR-002).

### SR-002 — Architecture design

- Phase and classification: Design (with one requirements refinement within the Solution Designer's own DEC-007)
- Trigger: requirements approved by the user (SR-001)
- Prior status: requirements Approved; design N/A
- Current status: design `Ready`
- IDs affected: all REQs mapped to DS-001 to DS-006; REQ-006 and QR-004 wording refined: the output file lives while the run is live and is removed at run end (it lives in the OS temp area because memory folders are synced, `memory-sync-path-policy.ts`), instead of "as long as the run exists" (which would need a run-deletion cleanup hook). The notice carries the last lines, so nothing the agent needs is lost. Detail of the Solution Designer's DEC-007; the user is told in the result.
- Canonical sections changed: `design-spec.md` (new); requirements REQ-006, QR-004; investigation notes (architecture rows already in the Source Log)
- Intended behavior changed: only the output-file lifetime detail above
- Approval impact: within DEC-007 (Solution Designer); reported to the user with the result
- Task-size/risk: Large / High (design-spec Task Size section)
- Next action: handoff per the rules

### SR-003 — Both ways: `run_in_background` and plain `&` jobs

- Phase and classification: Mixed; `Requirement Gap` raised by the user (changed intended behavior)
- Trigger: the user's question how a parent could know `&` jobs; shell-stays-parent probe (bash 3.2: foreground done +0.01 s; jobs reported with exit 3 at +0.33 s and 7 at +1.04 s; disowned job unknown); the user's decision 2026-11-10: "why not to support both at the same time … we do it in this ticket … the bash explicitly trying to get off the parent, that's not our control"
- Prior status: requirements Approved (SR-001), design Ready (SR-002)
- Current status: requirements Approved by the user at this revision; design revised and Ready
- IDs affected: BEH-014, REQ-011, AC-010, SCN-012, DEC-006; Non-Goals (detached jobs)
- Intended behavior changed: Yes (foreground `&` jobs are now background tasks with exit codes and notices instead of untracked)
- Approval: the user, 2026-11-10, in the Solution Designer conversation
- Design impact: every run_bash call runs through one wrapper that signals "foreground done" and stays the parent of its jobs; `run_in_background` is the same path with the whole command as the job. Design spec revised (DS-001/003, wrapper, executor completion rule, risks)
- Next action: handoff to architecture review (Large / High); the user's "we do it in this ticket" taken as: build under 338 (user informed)

### SR-004 — Revision for ARCH-REV-001

- Phase and classification: Mixed: `Design Impact` (AR-001, AR-003 to AR-008) and one `Requirement Gap` (AR-002) taken to the user
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`), Fail, 2026-11-10
- Finding IDs: AR-001 to AR-008; residual R-1 to R-5
- Prior status: requirements Approved (SR-003); design Ready (SR-003)
- Current status: requirements Approved by the user at SR-004; design Ready (SR-004)
- Evidence: `prototype/wrapper-skeleton-probe.sh` + `.log` (bash 3.2.57, 11 cases pass, including set -e, set -x, user EXIT trap, `exec >/dev/null 2>&1`, background form under bash and sh, kill timing 13 ms, narrowed case)
- Resolution per finding:
  - AR-001: background form is `( trap …; { <cmd>\n} & wait $! ) &` (design-spec Command Wrapper Contract)
  - AR-002: the user approved the narrowing (DEC-012, 2026-11-10: "I will approve your recommendation"): REQ-007 full stop for `run_in_background`; for `&` jobs `kill <pid>` stops that process only; REQ-011, AC-010 updated
  - AR-003: shell-state contract (silent `set -x` off, `+e +u +o pipefail`, ERR/DEBUG cleared, `builtin`, `unset -f jobs`, user EXIT trap run at the foreground end); `sh` fallback: foreground unwrapped, background form POSIX; regression list R-0 extended
  - AR-004: frames and the stdout end marker on fds 63/62 duplicated before the user block; call boundary rule per stream; frame grammar digits-only, body ≤ 2,048 bytes; `exec` fallback to RESULT
  - AR-005: one log per call (`call-<startMs>-<anchorPid>.log`); every task of the call names it; `lastLines` = the log's tail at that task's end (may include other tasks of the call)
  - AR-006: end-of-call settle: tasks whose pid is gone get up to 300 ms for their `JOB_ENDED` (probe: pid gone 13 ms after `kill`); WSL falls back to the notice
  - AR-007: the notice service holds a taken batch until delivered; `prefaceReturned`/`failed` return it to Pending; dropped only on `cancelled`/run release; ends with stop reason `host-shutdown` or run end are recorded never reportable
  - AR-008: terminology, P3 and rejection rows, `BackgroundTaskStart` / `backgroundTasksStarted`, `manager.run`, three `outcome` variants with their meaning, requirements header SR-004
  - R-1, R-2, R-4, R-5 stated in Risks; the shell-stays-parent idea is kept as the skeleton probe file
- Also: DEC-013 (Solution Designer, the user asked for reasonable recommendations): each notice lists tasks still running (answers the user's question about seeing what runs after compaction)
- Intended behavior changed: Yes (REQ-007/REQ-011 narrowing for `&` jobs; notice lists still-running tasks)
- Approval: the user, 2026-11-10 (narrowing); DEC-013 within the direction, user informed
- Task-size/risk: unchanged, Large / High
- Next action: re-review by the architecture reviewer

### SR-005 — ARCH-REV-002 items

- Phase and classification: Design (`Design Impact`, narrow)
- Trigger: ARCH-REV-002, 2026-11-10 (AR-001/002/004/005/006/008 resolved; AR-003, AR-007, AR-010 open; R-6 to R-9 non-blocking)
- Resolution:
  - AR-003: wrapper resets `IFS` (`builtin unset IFS`) with the other shell state; probe case 12 (strict mode `set -euo pipefail; IFS=$'\n\t'`, two jobs) now reports 3 and 7; all 12 probe cases pass (`prototype/wrapper-skeleton-probe.log`); R-0 list extended
  - AR-007: DS-006 arrow chain rewritten to the state list and return rules (failed → Pending; cancelled/release → drop)
  - AR-010: `listRunning()` on the `backgroundTaskNotices` capability and `AgentRun.listRunningBackgroundTasks()`, backed by `manager.list()`; `BackgroundTaskStart` gains `startedAt`; the manager is the one owner of the running set
  - R-6, R-7 stated in Risks; R-8: REQ-011 and the contract's `sh` wording corrected (no requirement change: survivor listing removal was already approved in SR-003); R-9: handoff file refreshed
- Intended behavior changed: No (wording correction only in REQ-011)
- Approval impact: none
- Next action: third-round review of the three items
- Review result 2026-11-10: ARCH-REV-003 Pass on SR-005 (AR-003, AR-007, AR-010 resolved; report `design-review-report.md`). The architecture reviewer routed the package to `/software_engineering_team/implementation_engineer`; recorded as informational, no duplicate handoff.
