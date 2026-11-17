# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/requirements-doc.md` (Approved at SR-004: DEC-008 added by the user, 2026-11-17; SR-003 clarifications within DEC-001 B / DEC-003)
- Upstream Investigation Notes: `.../background-task-restart-notice/investigation-notes.md`
- Upstream Solution Revision Record: `.../background-task-restart-notice/solution-revision-record.md` (SR-004)
- Reviewed Design Spec: `.../background-task-restart-notice/design-spec.md` (SR-004, `Ready`, part 1)
- Supplemental Task Artifacts Reviewed: `architecture-design-handoff.md` (Round 3 section), `follow-ups.md` (FU-001, FU-002, FU-004), `evidence/API-05-14-restart-suite/RR-02.json`; no behavior-defining supplements
- Relevant Solution Revision IDs: `SR-001` to `SR-004`
- Architecture Review Revision Record: `.../background-task-restart-notice/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: SR-004, a Requirement Gap from validation (code review CRR-002 / API-E2E F-1, evidence RR-02) resolved by the user (DEC-008), from the Solution Designer, 2026-11-17
- Prior Review Round Reviewed: `2` (ARCH-REV-002, Pass)
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: worktree `codex/background-task-restart-notice` @ `4cbf9e7881`. The round-1 code reads stand: `server-runtime.ts` startup/cleanup order; `busy-run-recorder.ts`; `busy-run-record.ts` reader; `restart-resumer.ts` L60-171 (live pre-filter L140, `onlyAsFirstInput`, NOT_FIRST L166); `build-studio-server.ts` notice slot and `composeRestartResume`; `restart-resume-composition.ts`; `agent-run.ts` background facades; 285 design D3.6.3 (first-input rule purpose: no duplicate turn).

## Round 3 (SR-004) Delta

- Change: one cause-specific line in the reminder text (`restart-notice.ts`). After `unexpected_stop` the background-task line says tasks may still be running, are no longer tracked, and should be checked with `ps` and the pids from the conversation; stop and restart them to track them again, or continue (DEC-008, the user). The update and restart wording is unchanged. No spine, owner, interface, stored shape or ordering changes: the cause is already a stored fact on each pending reminder, and the text builder already branches on it.
- Basis: the premise the old line rested on (a restart stops background tasks) is contradicted for a crash by RR-02. The server was SIGKILLed; the native command (pid 18615, group 18285) was still running 13 s later, and its parent 18613 was still alive at reminder time. A graceful stop leaves nothing (RR-01, `leftAfterStop: []`). So the line is now true for each cause.
- Technical accuracy of the advice: after a server SIGKILL only the server dies. The anchor exits when its IPC channel closes (`posix-command-anchor-script.ts`: `disconnect` → exit), but nothing signals its group. So the shell processes of the 338 background form survive with the command (RR-02 shows the command's parent alive). The pid the agent was given (the background form's trap shell) can therefore be found with `ps`, and `kill <pid>` still forwards TERM to the whole group, as in 338. For a plain `&` job, `kill <pid>` stops that process only (338 DEC-012), unchanged.
- Scope: stopping survivors at the next start was declined by the user. It is FU-004, correctly a follow-up: the ticket's reminder is correct without it. FU-001 and FU-002 are follow-ups recorded with their evidence.
- Verdicts: every structural verdict below is unaffected and stands. Basis rows BEH-004 and SCN-004: `Confirmed` with the DEC-008 line. Validation reruns RR-02.

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High` (unchanged; confirmed)
- Independent Architecture Review required: `Yes`
- Classification correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements: as round 1. SR-003 rewords REQ-005: each run gets the reminder exactly once, whichever comes first, the wake after an update or its next input. 285's first-input rule, which prevents a second turn, is kept. This matches the user's DEC-001 B (every run told; woken after an update) and the rule's purpose (285 D3.6.3). It is a clarification within the approved intent, not new behavior. AR-003 text is aligned with DEC-003.
- Every prospective blocking finding traceable: `Yes` (none remain)
- Remaining material ambiguity: None

| Behavior ID | Kind | Alignment | Trigger / Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Operational | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None (no supplements). Requirements internal consistency: `Pass` (outcome, observable definition, AC-001, AC-003, AC-004 agree with DEC-003 and the reworded REQ-005).

## Task Design Health Assessment Verdict

All rows `Pass`: `Missing Invariant`, evidence-backed; no refactor beyond the extensions; reflected in spines and ownership.

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner Per Node | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass (`record()` inert before `startSession()`, waits for an in-flight tick; comparison ignores `recordedAt`) |
| DS-002 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass (take right after `buildStudioServer`: reminders persisted, then the record removed; then `startSession()`, then `setCleanup`) |
| DS-003 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass (claim → post → settle delivered or returned) |
| DS-004 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Exactly-once check, traced:
- Input first: the preface takes the pending reminder, the claim is null, and nothing is posted.
- Wake first: the claimed reminder is not pending, so input arriving meanwhile carries none. A NOT_FIRST refusal returns it, and the next input carries it.
- Failed post: returned.
- Run end or closed Task: never delivered; pruned at the next take.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `BusyRunRecorder` | Pass | Pass | Pass | Pass | Only ever writes its own session |
| `RestartResumer` | Pass | Pass | Pass | Pass | Reads/removes the record; hands every entry to reminders; wakes update entries through a claim |
| `RestartReminderService` | Pass | Pass | Pass | Pass | Sole owner of "still to tell" (pending, claimed, in flight) and of `restart-reminders.json` |
| `AgentRun.hasRunningBackgroundTasks()` | Pass | Pass | Pass | Pass | Method on the existing boundary |

## Dependency Direction / Forbidden Shortcut Verdict

`Pass`. `restart-resume` imports no runtime backend; the resumer depends on the reminder service, one way.

Composition (Principle 16): `Pass`. The reminder service is created in the composition root and passed to the notice slot and the resumer. The startup order is visible in `server-runtime.ts` (take → `startSession()` → `setCleanup` → listen → `resumeAfterRestart`). Existing lookups are used unchanged.

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `recorder.startSession()` / `record()` | Pass | Pass | N/A | Low | Pass |
| `resumer.takePreviousSession()` / `resumeAfterRestart(previous)` | Pass | Pass | Pass | Low | Pass |
| `reminders.add` / `claim` / `settleClaim` / `prune`; preface source | Pass | Pass | Pass (`agentRunId`) | Low | Pass |
| `AgentRun.hasRunningBackgroundTasks()` | Pass | Pass | Pass | Low | Pass |
| `buildRestartNoticeText(...)` | Pass | Pass | N/A | Low | Pass |

Empty indirection check (Principle 13): `Pass` (no new port, adapter or wrapper).

## Existing Capability / Subsystem Reuse, Allocation, Structures, Files, Placement

`Pass` (unchanged from round 1). Vocabulary: `Pass`. Derived consumers: `Pass`.

## Removal / Decommission Completeness Verdict

`Pass`. The recorder's merge is now safely removable: `record()` cannot write before the take, and the take makes the entries durable before removing the record. `resumeAfterUpdate()`, the old notice text and 285's "non-update notifies nothing" tests are removed or rewritten.

## Legacy / Backward-Compatibility Verdict

`Pass` (the tolerant reader is a generic policy).

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict |
| --- | --- | --- | --- | --- | --- |
| `busy-runs.json` | Directly Usable — No Migration | Pass | Pass | N/A | Pass |
| `restart-reminders.json` (new) | Not Affected (new transient state) | Pass | Pass | N/A | Pass |

## Change / Refactor Safety Verdict

`Pass`.

## Example Adequacy Verdict

`Pass` (record, reminder texts per cause, ordering line now including `setCleanup`).

## Material Premise Validation

- MP-001 (input first after an update): resolved by the single delivery path (claim / preface).
- MP-002 (stop or startup failure around the take): resolved. `record()` is inert before `startSession()`, the take happens before `setCleanup`, and entries are durable before the record is removed.
- No new premise. A failed `reminders.add` at the take (disk or permission failure) is an infrastructure failure, outside scope by default (Principle 6); see R-6.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-001, AR-002 and AR-003 are resolved (see ARCH-REV-002 in the revision record).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer.

## Residual Risks

- R-8 (text, non-blocking): REQ-002 still says, for every cause, "that any background tasks it started were stopped by the restart". The desired-outcome line, BEH-001 ("names its background tasks") and UC-001 ("which background tasks were stopped") still carry pre-DEC-003/DEC-008 wording. DEC-008 and the design-spec example are the authority for the text. Align these lines so a later reviewer does not read the `unexpected_stop` line as a mismatch.
- R-3 (for the part 2 design): `hasRunningBackgroundTasks()` (all runtimes) beside 338's native-only `listRunningBackgroundTasks()`; part 2's counts should use one source. The Solution Designer has noted it.
- R-4, R-5: Codex idle runs only at a graceful stop; ACP only mid-turn; a dev build without a release stamp never counts an update (accepted).
- R-6: if `reminders.add` fails at the take, the record is kept, but the new session's first tick (2 s later) rewrites `busy-runs.json`, so the kept entries are lost anyway. This only happens on a disk or permission failure (out of scope); the log line is the useful outcome. Implementation should not promise more than that.
- R-7 (text, non-blocking): the Final File Responsibility Mapping still says `restart-resumer.ts` "update entries woken, others and failed wakes → reminders" and `server-runtime.ts` "take previous before listen". The spines, interface rows and ordering example are authoritative (every entry → reminder at the take; take right after `buildStudioServer`, before `setCleanup`). The handoff's package line still says SR-002.
- Implementation should test the exactly-once paths in the DS-003/DS-004 trace above (input first; wake first with input arriving during the post; NOT_FIRST return; failed post) and the startup-failure path (record untouched before `startSession()`).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: round 3 (SR-004): the DEC-008 wording change is a text-only change in the existing builder and is technically accurate per RR-02; structure unchanged. Earlier: SR-003 makes the reminder service the single owner of "still to tell". The wake and the next input deliver through it exactly once, and the record cannot be lost around startup. Ready for implementation as Medium / High.
