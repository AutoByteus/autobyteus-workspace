# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (Task autobyteus-448 + 481, dispatched 2026-11-17) | N/A | N/A | Approved (user, 2026-11-17) | all | Presented to the user with DEC-001, DEC-003, DEC-004, DEC-005 |
| SR-002 | Design | Part 1 design after approval | N/A | Requirements Approved | Design Ready (part 1) | REQ-001-005 | `design-spec.md`; Medium / High |
| SR-003 | Mixed | ARCH-REV-001 (Fail) | AR-001, AR-002, AR-003 | Design Ready (SR-002) | Design Ready (SR-003) | REQ-005, AC-001, AC-003, AC-004 wording | one delivery path; durable take; wording |
| SR-004 | Requirements + Design | CRR-002 / API-E2E F-1 | CR-001 | Approved; Design Ready (SR-003) | Approved (user, DEC-008); Design Ready (SR-004) | REQ-002 (wording for unexpected stop), BEH-004 | cause-specific line |

## Revision Entries

### SR-001 — Baseline

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: the Task (description and comments 2026-11-09 to 2026-11-17); re-check against 461 done (resume bottom-up per run, closed-Task fence, places host/member)
- Prior status: N/A; current: `Ready for Approval`
- Key evidence: recorder records only mid-turn runs at graceful stop; resumer acts only after an update (285 DEC-001, the user's); crashes leave no record; runtime coverage per runtime
- Approval impact: awaiting the user
- Next action: the user's decisions, then approval and design of part 1
- Update 2026-11-17 (same round): the user decided DEC-003: a short reminder, no list of tasks ("the agent is very smart, it just needs a reminder"). REQ-001 now keeps a yes/no per run; REQ-002, REQ-004, DEC-006 adjusted. Open: DEC-001, DEC-004, DEC-005.
- Approval 2026-11-17: the user approved DEC-001 (B), DEC-004 ("Background task running", styled active, no Stop), DEC-005 (at once): "Agreed, as recommended". Requirements `Approved` by the user at SR-001. Next: design of part 1 (DEC-007), then part 2.

### SR-002 — Part 1 design (the restart reminder)

- Phase: Design. Trigger: requirements approved 2026-11-17. Status: design `Ready` for part 1; part 2 designed later (DEC-007)
- Decisions: live busy-run record (2 s ticks, write on change, `shutdownAt` at a graceful stop) so crashes are covered; previous record taken before listen; cause rule (update / restart / unexpected stop); update entries woken through the 285 path with the new reminder; other entries and failed wakes become pending reminders delivered by a new notice source in front of the next input; `AgentRun.hasRunningBackgroundTasks()` facade; Codex covered at graceful stop only
- Persisted data: `busy-runs.json` directly usable (tolerant reader); new `restart-reminders.json` transient runtime state
- Classification: Medium / High
- Next action: architecture review

### SR-003 — ARCH-REV-001 answers

- Classification: `Design Impact` (AR-001, AR-002) and `Requirement Gap` resolvable within DEC-003 (AR-003)
- AR-001: every recorded run gets a pending reminder at the take; the update wake claims and posts it as first input, input that comes first carries it as its preface; exactly once either way. REQ-005 reworded: the 285 first-input rule (no second turn) is kept; a reminder riding the first input starts no turn. This is the approved intent (every run told; DEC-001 B wake after update); no change to intended behavior beyond removing an unintended gap
- AR-002: take right after `buildStudioServer`, before `setCleanup`; reminders persisted before the record is removed (record kept if that fails); `record()` writes nothing before `startSession()` and waits for an in-flight tick (R-2); tick comparison ignores `recordedAt` (R-1)
- AR-003: requirement text aligned with DEC-003 (no task names); AC-003 states what is verified per runtime; AC-001/AC-004 updated
- Intended behavior changed: No (clarifications within the user's approved decisions)
- Next action: re-review
- Review result 2026-11-17: ARCH-REV-002 Pass on SR-003; the reviewer routed part 1 to `/implementation_engineer` (informational, no duplicate handoff). Non-blocking text fixes applied after the pass: R-7 (two file-mapping cells now match the spines) and the handoff file's package line; no design change.

### SR-004 (in progress) — Requirement Gap from validation: unexpected stop does not stop background tasks

- Trigger: code review CRR-002 (failure origin of API/E2E F-1), 2026-11-17: RR-02 measured a native background command still alive 13 s after a server SIGKILL while the reminder said the restart had stopped it
- Classification: `Requirement Gap` (the premise of BEH-004/SCN-004 and the DEC-003 line for `unexpected_stop` is contradicted); the implementation matches the approved text
- Proposed: DEC-008 (a) a cause-specific line for `unexpected_stop`; (b) orphan cleanup as follow-up FU-004
- Status: resolved. The user decided DEC-008 on 2026-11-17: option (a) with the improved wording (survivors may still run and are no longer tracked; check with `ps` and the pids from the conversation; restart to track, or continue). He declined recording and stopping survivors in this ticket. Requirements `Approved` again at SR-004; design-spec SR-004 (wording only, `restart-notice.ts`); FU-004 stays a follow-up; FU-002 stays a follow-up
- Route: revised package, still Medium / High → architecture reviewer per the handoff rules; then implementation (text change), code review, API/E2E rerun of RR-02
- Review result 2026-11-17: ARCH-REV-003 Pass on SR-004; the reviewer routed it to `/implementation_engineer` (informational, no duplicate handoff). Non-blocking R-8 applied: desired outcome, BEH-001, UC-001 and REQ-002 text aligned with DEC-003/DEC-008 (wording only, no behavior change).
