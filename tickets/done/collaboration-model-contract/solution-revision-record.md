# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline from Project Task 259ddae7 and the user's direction (2026-10-15) | N/A | N/A | Approved (user, 2026-10-15) | BEH-001..BEH-012; REQ-001..REQ-007; AC-001..AC-010; DEC-001..DEC-007 | Approved; DEC-005 (a), DEC-006 (a) |
| SR-002 | Design | Architecture design on base `8878625d94` | N/A | Requirements Approved; design N/A | Design Ready; Large / High | all | Architecture Design Complete |
| SR-003 | Mixed | Architecture review ARCH-REV-001 (Fail) | ARCH-F-001..004 | Design Ready (SR-002) | Requirements Approved (SR-003, Solution Designer within the direction, user informed); Design Ready | REQ-001 (DEC-008), DEC-005 evidence, AC-007, AC-011 (new), ASM-001, Out Of Scope; design data/migration/own-Team rule; model doc CM-6 status | Revised; back to review |

## Revision Entries

### SR-001 — Requirements baseline: delegate outside, message inside

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Project Task `project_task_259ddae7-36ec-4c26-81f4-40c08ee1b601`; the user's direction in the Solution Designer conversation (2026-10-15).
- Finding IDs: N/A.
- Prior status: N/A.
- Current status: `Approved`.
- IDs: BEH-001..BEH-012, UC-001..UC-006, REQ-001..REQ-007, AC-001..AC-010, SCN-001..SCN-008, DEC-001..DEC-007.
- Why recorded: first coherent baseline.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md`.
- Supplements: `collaboration_model.draft.md`, `doc-consolidation.draft.patch` (drafts), `new-task-proposal.md`, `temp-task-removal-proposal.md` (sent to the PM; Task ee74d72b, not in this scope).
- Intended behavior changed: N/A (baseline).
- Approval: the user approved on 2026-10-15 ("I completely agree. Turn each one into a normal dedicated copy … Your recommendation is good."): DEC-005 (a) convert collaborators into delegated copies; DEC-006 (a) keep teammate copies as they are. DEC-001 and DEC-003 are the user's own decisions; DEC-002, DEC-004, DEC-007 are the Solution Designer's within the direction.
- Ordering (PM, 2026-10-15): this Task → ee74d72b (same team) → paused memory refactor 8641c0ac. On 2026-10-15 the user revised ee74d72b from "remove temp Tasks" to "split `create_or_update_task` into `create_task`/`update_task`, no automatic exposure; temp Tasks stay" (`temp-task-tool-split-proposal.md`, sent to the PM). Evidence-only for this ticket: its Out Of Scope and ASM-001 wording were updated; no requirement of this ticket changed.
- Next action: architecture design.

- Base update (evidence only, 2026-10-15): branch fast-forwarded to `origin/personal` `8878625d94` after Task ee74d72b landed (tool split; collaboration texts already tool-neutral about closing). No requirement changes.

### SR-002 — Architecture design: one refusal rule, resolution-only messaging, collaborator conversion

- Phase: Design. Requirements unchanged (SR-001 approval applies).
- Design: `isOwnTeamAddress` index port + CM-1 refusal in the shared `resolveDelegationPlacement` (self check centralized; teammate-from-snapshot step removed; new copies always root-hosted); `resolveMessageRecipient` reduced to resolution (no helper, no bring-in); collaborator instances removed from runtime, schemas, contracts, GraphQL and web; startup migration `20261015_collaborators_to_delegated_runs_v1` converts stored collaborators into unowned root-level delegated runs (tree-only, frozen entry schema); stored `broughtIn` Task records stay readable; Team-hosted teammate copies keep restoring (DEC-006).
- Model document published in the worktree (`autobyteus-server-ts/docs/design/collaboration_model.md`) with the three clarifications and "messaging never creates anything"; `DESIGN.md`, design index and module pointers updated; module mechanics updated by implementation.
- Classification: `task_size=Large`, `architectural_risk=High`.
- Handoff: `handoff-architecture-review.md`.

### SR-003 — Review fixes: corrected inventory, own-Team depth, sourceless copies, CM-6 exception

- Phase and classification: Mixed (`Requirement Gap` ARCH-F-001; `Design Impact` ARCH-F-002..004).
- Trigger: `design-review-report.md` ARCH-REV-001 (Fail).
- ARCH-F-001: inventory corrected — 9 collaborators in 7 trees (2 Team collaborators in Agent roots; 4 Agents + 3 Teams at the root of 5 Team roots), not 2 (the first scan missed `rootTeam.collaborators`); the reviewer's count of 10 was rechecked with two independent scans (9). DEC-005's decision (convert every collaborator) is unchanged; its evidence, AC-007 and the real-data proof now cover both families; memory locations verified equal; Out Of Scope and ASM-001 updated (tool split landed).
- ARCH-F-002: migration stamps `source` on stored copies without `source` at a collaborator (or collaborator-Team member) address; absent `source` now means configured placement only; new AC-011.
- ARCH-F-003: DEC-008 — "own Team" = any address inside a Team instance containing the sender, at any depth (same boundary as message resolution), plus the root Team's configured placements for its configured members; REQ-001 reworded; examples in the design.
- ARCH-F-004: model document §5 notes the CM-6 exception (unowned delegated runs: pre-Task copies and converted collaborators).
- Residual: availability sentence corrected; memory-folder equality tests per family added to verification.
- Intended behavior changed: `Yes` (clarifications within the direction). Approval: Solution Designer within the direction; user informed in the Solution Designer's conversation; the user's DEC-005 choice is unchanged in substance (the corrected count is reported to the user).
- Classification unchanged (`Large`, `High`).

- Review outcome (informational): ARCH-REV-002 **Pass** on SR-003 (2026-10-15); inventory count of 9 confirmed by the reviewer; the reviewer handed the package to `/software_engineering_team/implementation_engineer`. Non-blocking recommendation applied: CM-1 in the model document now states DEC-008's any-depth boundary.
