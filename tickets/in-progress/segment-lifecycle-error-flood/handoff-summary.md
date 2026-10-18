# Handoff Summary — segment-lifecycle-error-flood (SR-002, architecture re-review)

- Result: `Architecture Design Complete` (revised for ARCH-REV-001)
- Round 2 changes (SR-002), for re-review focused on AR-001..AR-003:
  - AR-001: design-spec "Rejection accounting lifecycle". Accounts are kept per turn plus one no-turn account for the run's lifetime, so late rejections never re-trigger a detailed warning. Pending counts are flushed as one summary per account at every run lifecycle boundary: a turn terminal seen by the segment transformer, in-pipeline release, and termination release. `releaseRun()` returns the pending summaries; the transformer and `AgentRunTermination` log them via the new `agent-segment-rejection-log.ts`. The state has no I/O. Examples added for late rejections, Terminate and the no-turn account. REQ-004/QR-001/AC-005 clarified within the direction (DEC-003): log volume is bounded by boundaries, never by event count, normally ≤2 lines per turn, and late counts are reported at the next boundary instead of being dropped.
  - AR-002: the two intentionally changed integration tests are named with their new expectations; other diagnostic tests expected to stay at 1; `streaming_parsing_architecture.md` added to the docs list; AC-006 notes the intentional changes.
  - AR-003: the rule is scoped to the snapshot's turn naming. Snapshot offline / `phase: error` still end the active turn as today (Terminology, DS-003, example row).
  - MP-002: the FU-002 note now says the window comes from the new rule on async backends.
- Classification (unchanged in SR-002): `task_size = Medium`, `architectural_risk = High` (changes which evidence may end a turn in run-owned lifecycle state shared by every runtime; drives status, command targeting and root-shutdown quiescence)
- Route applied: handoff rule "task_size=Large or architectural_risk=High → `/software_engineering_team/architecture_reviewer`"
- Package identifier: `segment-lifecycle-error-flood`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood`, branch `codex/segment-lifecycle-error-flood`, base `origin/personal` @ `1c718202b2` (contains v1.5.6-beta.2). No source changes on the branch yet; ticket artifacts are untracked in the ticket folder.
- Finalization target: `origin/personal` (RELEASE.md); the fix should ship with the next beta (DEC-005; the release decision is Delivery's per RELEASE.md).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/`

## Original request

Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's report of 2026-10-18. A Claude Agent SDK implementation engineer (team run `software_engineering_team_842188724b884b62adaa0decfd93278b`, member `implementation_engineer_f54d90f354554c45bf4f180a2f4f9dca`, user on v1.5.6-beta.1) showed a chat full of "An Error Occurred — A runtime segment event violated the canonical lifecycle contract." while showing Idle. Questions: why; is content lost; is it a regression; what should the user see; fix it if it is a clear product bug, with tests, shipping with the next beta or release. The user then asked the Solution Designer to run experiments on whether the existing design is sound or needs a refactor.

## Findings (evidence in investigation-notes.md)

1. **Cause (Claude):** Claude starts turns on its own after background tasks. The CLI can run a task-notification turn and immediately another turn. AgentRun processes runtime events through a per-run queue, but both run-owned lifecycle states reconcile with the runtime's *live* snapshot, which can be ahead of the queued events. The snapshot opens turn 2; turn 1's queued `TURN_STARTED` then "supersedes" and permanently retires turn 2. Every text segment event of turn 2 is rejected, each one becoming a red card, and status shows idle during turn 2. A second variant drops turn 1's queued text (snapshot retires turn 1). Reproduced exactly with real `ClaudeSession` → backend → `AgentRun` on a scripted SDK stream, instrumented, with a control (queue drained → no errors).
2. **Content loss: yes.** In the user's run, the self-started turn `…0cd1e66e` (10:58:46–11:02:53) has 30 tool calls/results but **0 assistant text records** in run memory. Tool cards still show. Text already lost is not recoverable from AutoByteus data.
3. **Not a recent regression.** Segment admission dates from 2026-08-13 (v1.4.53); Claude's self-started turns arrived with the streaming session (v1.4.85, 2026-09-25). The skill-update notice, input-state cadence and memory refactor are unrelated.
4. **Codex rejections are a different defect** (Codex thread gate, before conversion, logged per event, never a chat card). Follow-up FU-001 in the design spec.
5. **Server log is silent** for these rejections: the generic transformer logs nothing.

## Decisions (requirements-doc.md)

Fix the cause (DEC-001). Notice at most once per turn, plain language, only in the current turn (DEC-002). First-per-turn log with reason plus end-of-turn count (DEC-003). Codex out of scope (DEC-004).

## Design (design-spec.md, experiments/experiment-results.md)

Experiments E1–E4 against a six-case scoring probe and the server suites:

- E1, no snapshot turns: breaks 22 command-side tests.
- E3, snapshot captured at batch arrival: relies on synchronous backend emission, which Codex explicitly does not guarantee.
- E2 (rule in two copies) and E4 (rule in one owner) both fix everything.

**Chosen: E4.** A new `AgentTurnLedger` holds the evidence rule: ordered stream evidence may supersede and end turns, while a runtime snapshot is provisional and never ends a turn. Both states use their own ledger instance, and the duplicated turn-tracking code is removed. Plus the single notice and bounded logging in the segment state and transformer. E4 prototype: full server unit 721 passed / 4 skipped (base 720 + probe), related integration 20 passed / 3 skipped (= base).

## Expected output from the receiver

Independent architecture review of the package (requirements basis, design, classification). On pass, the implementation route per the team rules.

## Open risks

- FU-002: Stop during the millisecond-scale queue lag may target the turn that just ended (existing rejection, second Stop works).
- ASM-001: re-confirm full suites on the final implementation.
- AC-007 needs a signed-in Claude in an isolated app; if not available, AC-001..AC-003 remain the executable proof, with the gap recorded.

## Artifacts

- `requirements-doc.md` (Approved, SR-002)
- `investigation-notes.md`
- `design-spec.md` (Ready, SR-002)
- `solution-revision-record.md` (SR-001, SR-002)
- Supplements: `experiments/experiment-results.md`, `experiments/E4-shared-turn-identity.patch`, `experiments/turn-race-experiment.probe.test.ts`, `probes/claude-provider-turn-segment-race.probe.test.ts`, `evidence/probe-run-base-1c718202b2.txt`, plus `experiments/E2-provisional-snapshot-turn.patch` and `experiments/E3-arrival-snapshot.patch`
- Independent review artifacts: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001, Fail — reviewed basis SR-001)
