# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer pass (ARCH-REV-003, round 3) → implementation | N/A | `Initial Baseline` | SR-003, SR-006, ARCH-REV-003 | Implemented S1–S8; ready for code review |
| IR-002 | code_reviewer failure-origin review (CRR-002, round 2) of API/E2E F-001 (API-REV-001) | CR-001 (F-001, EXC-E2E-006) | `Local Fix` | SR-006, ARCH-REV-003, CRR-002, API-REV-001 | A copy whose start failed is refused as never started; back to code review |

## Revision Entries

### IR-001 — Follow-up Task to an existing copy; explicit copy IDs; task execution resource rename

- Triggering role, report path, and round: `architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-review-report.md`, round 3 (Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete for design S1–S8; local implementation checks pass; routed to code review.
- Related solution revision IDs: SR-003 (requirements), SR-006 (design)
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-001..009; REQ-001..014; AC-001..018 (implementation side); QR-001..003.
- Implementation delta:
  - S1 (commit `c395e24a5`): pure rename of the Task "agent run resource" vocabulary to "task execution resources"; persisted names mapped only in the schema.
  - S2–S6 (commit `1e5d757a9`): current-entry rule in `TaskExecutionResourceService`; append-only assignment periods with relaxed per-file rule; existing-copy eligibility and commit under copy → Task locks; DONE releases only current-Task copies; reopen hint (AC-010); runtime `assignToExistingCopy` with shared resume step; three roots and capability split; `send_message_to` team-run refusal; tool modes, explicit-ID result union, `closedAssignments`; agent-facing texts.
  - Implementation finding fixed in scope: adapter `taskExecutionTargetOf` requires an exact reference kind (indexes are keyed by run ID alone).
  - S7 (commit `1e676ca54` + agents repo `0bd84e0`): docs, `TESTING.md`, PTM skill and board template.
  - `24056ffdd`: baseline timing fix for two load-sensitive tests (own commit, not caused by this change).
  - `1aa02f256`: integration/E2E text and shape assertions aligned with the new contract.
  - Final commit: handoff artifacts and the solution package.
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: src typecheck clean; no new test type errors vs baseline; unit + architecture pass (two pre-existing load-timeouts fixed in a baseline commit); TESTING.md integration suites pass; full server build passes; smoke runs of existing scripted-AGY E2E suites pass (details in the handoff).
- Next recipient or routing: `/software_engineering_team/code_reviewer`
- Remaining limitations or risks: see `implementation-handoff.md` → Known Risks; AC-level API/E2E with a real runtime not run here; cross-repo skill branch not pushed.

### IR-002 — Never-started copy refused with its specific reason (CR-001)

- Triggering role, report path, and round: `code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/code-review-report.md`, round 2 (CRR-002, failure-origin review of API-REV-001 F-001)
- Triggering finding IDs: CR-001 (F-001 / EXC-E2E-006)
- Classification: `Local Fix`
- Prior authoritative result: IR-001. A copy whose start failed was refused with the generic "…is not a delegated copy in this run" because it never reaches the root's tree and the lookup ran before the Task-side eligibility check, so eligibility item 5 (never started) was unreachable in real use.
- Current authoritative result: on a tree miss (after the AC-008 wrong-kind, coordinator and member checks), `RootTaskExecutionLifecycle.refuseCopyOutsideTree` asks the Task side (`assertAssignable`) about a copy that the existing port lists as closed and hosted by this root (`closedTaskExecutionsIn(root)`), and returns its specific refusal (never started, another assigner, already this Task). Every other ID keeps the generic refusal (unknown, or another root's copy). No port contract changed.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: implementation-owned Local Fix from failure-origin review.
- Approved behavior or requirement IDs affected: AC-009, REQ-005 (design eligibility item 5 / R-2); AC-008 and the outside-root refusal preserved.
- Implementation delta: `existing-copy-target.ts` returns `null` on a tree miss and exports `notACopyOfThisRun`; `root-task-execution-lifecycle.ts` adds `refuseCopyOutsideTree`. Tests: the runtime fixture (`tests/fixtures/root-task-copy-resume-fixtures.ts`) can leave a copy out of the tree (`control.absent`), as a failed start does; the old never-started table row (copy still in the fake tree) is replaced by a case with the copy absent (open F → generic, closed F → never started, other sender → assigner-only, wrong kind → generic) and an other-root closed copy → generic; `task-reactivation-backends.test.ts` adds a failed-start copy absent from the actual tree for all three root kinds.
- Changed files or areas: commit `88e59f500` (5 files).
- Local validation and result: src typecheck clean; no new test type errors in my files; unit suites for agent-collaboration, projects, Team/Org/standalone roots and agent-tools pass (137 files); the API/E2E owner's `EXC-E2E-006` (scripted AGY, Team root) passes locally (implementation check, not API/E2E sign-off).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted review of CR-001), then API/E2E rerun.
- Remaining limitations or risks: while the failed copy's Task (F) is still open, the copy is not closed work of this root and the existing port cannot show its host root, so it gets the generic refusal; once F is DONE or CANCELLED (needed before any reassignment anyway) the never-started reason applies. Telling that case apart would need a new port contract (host root of an open copy); not done (Design Impact if wanted).
