# Handoff — Architecture Design Complete

- Package identifier: `delegated-copy-model-change`
- Result: `Architecture Design Complete`
- Revision: `SR-007` (revisions for ARCH-REV-001 and ARCH-REV-002, plus the user's SR-007 UI simplification)
- Classification: `task_size=Large`, `architectural_risk=High`
- Applied handoff rule: Large or High → `/software_engineering_team/architecture_reviewer`
- Date: 2026-10-13

## Original Request

Project Task `project_task_025b20cb-3fcb-438e-b910-cad1cd0c286b` from `/project_task_manager`: let the user change the model of a delegated copy (task agent or task agent team) from its Settings, within its runtime, with the change persisted, recorded as the user's choice, and visible. User precedence: user choice → configured default → routing → inherit.

## Approved Behavior (authority: requirements-doc.md, SR-004)

- **Per-copy Stop:** each delegated copy and collaborator (Agent or Team) can be stopped on its own. The Stop icon sits on its sidebar row (like parent runs) and on its Settings row. Stop interrupts the copy's turn and stops its agents and the copies it started. The rest of the run continues, and the Task stays open.
- **Edit while stopped:** a stopped copy's agents (one member, or the whole team for followers) can have their model and model settings changed in Settings. The runtime stays fixed. While running, the controls are locked with a hint. A Save on a copy woken meanwhile is refused.
- **Resume by message:** a message (from the user or an agent) resumes the copy in the same conversation on its current settings, including the user's choice.
- **Persistence and display:** the choice is recorded per instance and survives idle shutdown/wake, stop/reopen and restart. After Save the row shows the model like any edited member (no label, no separate Reset, SR-007). Later copies are unaffected. Validation is the same as stopped-run model switching.

## Approval Basis

- SR-002: the user approved the baseline ("okayyy. approve. i think you have good judgement").
- SR-004: the user proposed stop-then-edit and confirmed the restated plan: "Yeah, exactly. And the stop button can appear on the dedicated task agent copy or task agent team copy itself, just like … the parents" (2026-10-13).
- The SR-003 next-turn clarification was withdrawn.

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/solution-revision-record.md`
- Prior review: `design-review-report.md` (ARCH-REV-001, Fail, SR-001..SR-004) and `architecture-review-revision-record.md` in the same folder
- Supplements, Product Design: N/A — not applicable

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change`, branch `codex/delegated-copy-model-change`
- Base `origin/personal` @ `a609de982a`; finalization target `origin/personal`
- Ticket files are uncommitted.

## Key Points For Review

- **Stop:** a forced per-copy shutdown through the root task lifecycle queue, nested copies first, ending in the idle-shutdown restorable state (not the Task-close state). Collaborators get a forced runtime release with input left open.
- **Records:** optional `userLaunchSelection` on four agent-level records and `userTeamLaunchSelection` on two team-level records; `Directly Usable — No Migration`.
- **Launch rule:** one `effectiveCopyAgentLaunch` (agent selection > team selection for followers > started value), also mirrored in the contract packages for the web.
- **Edit command:** `updateDelegatedLaunchSelections`, gated on the targets being offline (`COPY_RUNNING` otherwise), with live and stopped paths for Team, Org and standalone roots. Validation reuses `RunModelSelectionService`.
- **Web:** Stop icons on sidebar and Settings rows; editable rows when stopped; "Your choice"; Reset.

## Response To ARCH-REV-001

See design-spec.md → Revision Notes (SR-005):
- AR-001: serialized check/commit/swap; stopped defined per copy.
- AR-002: Stop set by lineage, innermost first; lease wait.
- AR-003: follows-team from the recorded fact.
- AR-004: combined stopped-root Save.
- AR-005: started values for extra/teammate copies.

## Response To ARCH-REV-002 (SR-006)

AR-006: Stop marks the set stopping; new leases on it are refused with `TASK_EXECUTION_STOPPING`; held leases drain outside the queue; then a non-waiting `stop` step runs per copy, innermost first. See design-spec.md → Revision Notes (SR-006).

## SR-007 (user)

No "Your choice" label and no separate Reset; reuse the existing stop icon, stopped-member editing and Save one to one (DEC-010). The reset form of the command is removed.

## Open Risks

- Stop interrupts work in progress and background processes (the user's explicit action).
- An agent can wake a copy before Save; that Save is refused.
- Related: bug `b2d9b725`; routing `871c0af0`.

## Expected Next Action

Independent architecture review.
