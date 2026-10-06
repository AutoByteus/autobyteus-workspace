# Implementation Revision Record — mention-delegation-dismissal

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer, design-review-report.md, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | SR-003, SR-005, ARCH-REV-002; CRR/API-REV/DR N/A | Implementation complete; Large/High confirmed; routed to Code Review |

## Revision Entries

### IR-001 — `@` resolves and steers to delegate_task; ad-hoc Tasks make every delegated copy closable

- Triggering role, report path, and round: `/architecture_reviewer`; `tickets/in-progress/mention-delegation-dismissal/design-review-report.md`; ARCH-REV-002 (round 2, Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation of design SR-005 on approved requirements SR-003 is complete. The local checks are green except for failures that also occur at baseline (see the handoff's full-suite comparison).
- Related solution revision IDs: SR-003, SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..009; REQ-001..013; AC-001..015 (AC-014 preserved)
- Implementation delta:
  - `@` resolution replaces admission in all three roots and both entry paths, and the note wording changed.
  - Unowned described delegation joins a new ad-hoc Task (`adHocTask` link variant), and `task_id` is returned by join variant only.
  - New `ad-hoc-tasks/` storage (`AdHocTask`, `AdHocTasksLayout`, `AdHocTaskStore`). `TaskLocation` has `projectId: string | null`, and one resource view covers both roots.
  - `ProjectTaskService.updateTaskById` and a shared DONE closure; `deleteAdHocTasksHostedBy`.
  - Strict two-mode `create_or_update_task`, which is now an automatic tool.
  - Post-delete cleanup in the three delete owners.
  - LLM contract text, plus docs in server and web.
- Changed files or areas: see implementation-handoff.md § Key Files Or Areas (34 production source files changed or added, plus contracts `src`/`dist`, docs, tests).
- Local validation and result: source typecheck exit 0; contracts 10/10; all focused server unit, integration and in-process E2E suites listed in the handoff pass; web note specs 127/127. Full server suite compared against the unmodified source; residual failures are pre-existing (handoff § Full-suite comparison).
- Next recipient or routing: `get_handoff_rules` → Code Review (Large/High)
- Remaining limitations or risks:
  - The breaking update-mode contract for the external Project Task Manager skill.
  - Copies owned by different Tasks cannot message each other (approved).
  - Orphan `task.json` on a crash between create and link.
  - The stale live probe `cross-scope-agent-mentions-live-probe.mjs`, left for API/E2E.
  - Unchanged UI copy ("Bring into this run", "Couldn't add …").
  - The baseline-broken `typecheck` script (TS6059).
