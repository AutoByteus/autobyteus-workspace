# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / ARCH-REV-004 Pass on design-spec SR-008 / round 1 | N/A (DI-001 resolved before code) | `Initial Baseline` | SR-008, ARCH-REV-004 | Adoption implemented; ready for Code Review |
| IR-002 | Code Reviewer / code-review-report.md / CRR-001 round 1 | CR-001, CR-002, CR-003 | `Local Fix` | SR-008, ARCH-REV-004, CRR-001 | Today's refusal kept for runs that are no run the user started; refusal e2e run; unused declarations removed; doc step wording |
| IR-003 | Code Reviewer / code-review-report.md / CRR-003 failure-origin review of API-REV-001 | F-001, F-003 (F-002 held) | `Local Fix` | SR-008, ARCH-REV-004, CRR-003, API-REV-001 | Live token summary claims the observation's current root; adoption-specific Task message |

## Revision Entries

### IR-001 — Adoption of runs the user started (initial implementation)

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md` (ARCH-REV-004 Pass, SR-008), round 1. DI-001 (`implementation-design-impact.md`) was raised before any code and resolved in SR-008.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `delegate_task` existing-run mode adopts an idle agent / team run the user started in the delegator's workspace (standalone agent delegators only); steps 1–4 recognized from the files and resumable; undo on Task close / delete and Project delete; texts and docs updated.
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first complete implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-003; REQ-001..REQ-005, REQ-007; DEC-104, DEC-108, DEC-109; AC-001..AC-004, AC-006.
- Implementation delta: see `implementation-handoff.md` (Key Files Or Areas; trace table). Two size-driven extractions with no behaviour change (agent catalog state; existing-run assignments).
- Changed files or areas: server `src` (agent-collaboration task, standalone root, run-history stores and catalogs, projects services, compositions), tests (4 new files, 2 pinned-text updates, 1 shared fixture), docs (`projects.md`, `collaboration_model.md`).
- Local validation and result: build typecheck clean; unit 723 files green after the planned hash update; integration green apart from the 2 known agent-status failures.
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: three implementation decisions where SR-008 was silent (undo discriminator, recognition after the link, closing a reverted entry on Task delete); the sidebar's own-group row leaves on its next history read (no server push); the real-app check (AC-001..003) and the beta / user check (AC-007) are downstream.

### IR-002 — CRR-001 local fixes (today's refusal kept, refusal e2e, unused declarations, doc wording)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`, CRR-001 (Fail — Local Fix, 9.0/10).
- Triggering finding IDs: CR-001, CR-002, CR-003
- Classification: `Local Fix`
- Prior authoritative result: IR-001.
- Current authoritative result: IR-001 with the refusal boundary restored (AC-006 / Preserved Behavior Boundary) and the cleanup; classification unchanged (Large / High).
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewer's Local Fix findings.
- Approved behavior or requirement IDs affected: none changed; REQ-005 refusals now limited to runs the user started, AC-006 preserved.
- Implementation delta:
  - CR-002: `HandStartedRunLookup` not-found = `refusal: string | null`; `null` (no run the user started) → `notACopyOfThisRun` (also for a non-host delegator); the team-member hint only for admitted team runs; the "agent run's id" hint only for an agent run the user started (G1 + history row); organization runs keep their refusal; the generic "not a run the user started" text removed.
  - CR-001: unused import and parameter properties removed (arguments kept).
  - CR-003: `projects.md` step wording.
- Changed files or areas: `hand-started-runs.ts`, `hand-started-run-adoption.ts`, `active-collaboration-root-directory.ts`, both history catalogs, `projects.md`; tests `hand-started-run-adoption.test.ts`, `hand-started-run-adoption-root.test.ts`; handoff; evidence log.
- Local validation and result: build typecheck clean; unused-declaration check clean for touched files; affected unit folders 185 files green; the three refusal-pinning e2e files pass (24 / 3 skipped by gate).
- Next recipient or routing: Code Reviewer (Targeted Delta Review of CR-001..CR-003).
- Remaining limitations or risks: unchanged from IR-001.

### IR-003 — CRR-003 local fixes (adopted run's token usage under its current root; adoption Task message)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`, CRR-003 (failure-origin review of API-REV-001, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/api-e2e-execution-report.md`).
- Triggering finding IDs: F-001 (High), F-003 (Low). F-002 held by the reviewer; no action.
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (CRR-002 Pass).
- Current authoritative result: IR-002 plus: an adopted run's live token usage is published under its current root, so the PM's Agent root keeps running (ADO-4); the Task message to an adopted run no longer says an earlier Task closed. Classification unchanged (Large / High).
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewer's Local Fix findings.
- Approved behavior or requirement IDs affected: none changed; REQ-002 (the Task as the run's next work) and REQ-004 (earlier records left as they are) now hold for an adopted team's usage.
- Implementation delta:
  - F-001: `TokenUsageRunAccumulator.recordObservation` sets `run_summary_after_event.root_team_run_id` from the observation (the current execution context) instead of the run's stored record. The record is unchanged: its `rootTeamRunId` stays the run's earlier team (REQ-004). For a run that never changes root the two are equal, so nothing else changes.
  - F-003: `buildAdoptedRunTaskMessage` (first line `New Task assigned to you: <key>. This is the work to do now.`) next to `buildExistingCopyTaskMessage` (shared body); `deliverAssignedTask` picks it when the assignment is an adoption (also a resumed one).
- Changed files or areas: `src/token-usage/services/token-usage-run-accumulator.ts`, `src/agent-collaboration/execution/task/task-execution-input.ts`, `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (485 → 487 non-empty lines); tests `tests/unit/token-usage/services/token-usage-run-accumulator.test.ts` (new regression case), `tests/unit/standalone-agent-run-root/hand-started-run-adoption-root.test.ts` (message text asserted); handoff; evidence log.
- Local validation and result: build typecheck clean; the new accumulator case fails without the fix (`expected 'hand-started-team' to be null`) and passes with it; `vitest run tests/unit` 724 files / 5883 tests passed (4 files / 7 tests skipped); API/E2E's ADO file (uncommitted, theirs) in a clean env: 4/4 passed including ADO-4 (`evidence/implementation/IR-003-ADO-e2e.log`).
- Next recipient or routing: Code Reviewer (source-review delta of F-001 and F-003), then API/E2E reruns.
- Remaining limitations or risks: the token-meter observation in the handoff (Known Risks), reported, not decided; F-002 held.
