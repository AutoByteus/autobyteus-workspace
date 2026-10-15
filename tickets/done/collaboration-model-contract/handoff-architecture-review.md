# Handoff — Architecture Design Complete

- Package identifier: `collaboration-model-contract`
- Result: `Architecture Design Complete` (revised after ARCH-REV-001); current SR `SR-003`
- Classification: `task_size=Large`, `architectural_risk=High`
- Route: `get_handoff_rules` → Large/High → `/software_engineering_team/architecture_reviewer`; delivered 2026-10-15 (accepted by run `architecture_reviewer_d2af87d46b0c4b3dafa46389c06d9241`)
- From: `/software_engineering_team/solution_designer`, 2026-10-15

## Original Request

Project Task `project_task_259ddae7-36ec-4c26-81f4-40c08ee1b601` "Make collaboration follow one simple model (delegate outside, message inside)" from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's direction (2026-10-15): inside your run you message; outside you delegate first and then message by run ID; never delegate to yourself, a teammate or your own Team; an Org is a container of independent units; messaging never creates runs (collaborators and Task helper copies go away); one canonical model document governs orchestration.

## Approval Basis

Requirements SR-001 approved by the user on 2026-10-15: DEC-005 (a) convert the 2 stored collaborators into delegated runs; DEC-006 (a) keep the 4 stored teammate copies as they are. DEC-002, DEC-004, DEC-007 by the Solution Designer within the direction.

## Revision (SR-003) For ARCH-REV-001

- ARCH-F-001: inventory corrected to 9 collaborators in 7 trees (rechecked twice; the report's 10 could not be reproduced — Team roots hold 4 Agents + 3 Teams); AC-007 and the proof cover both families; Out Of Scope/ASM-001 fixed.
- ARCH-F-002: sourceless-copy stamping in the migration; absent `source` = configured placement only; AC-011.
- ARCH-F-003: DEC-008 any-depth own-Team rule (same boundary as message resolution) with examples.
- ARCH-F-004: CM-6 exception in the model document §5.
- Residual: availability sentence corrected; memory-folder equality tests.

## Review Focus (original)

1. CM-1 as one rule in the shared `resolveDelegationPlacement` with an `isOwnTeamAddress` index port (Team-root rule for configured root members), before any side effect.
2. `resolveMessageRecipient` reduced to resolution; removal of helper copies and bring-in.
3. Collaborator removal across runtime, schemas, contracts, GraphQL and web; what stays (catalog machinery, `@`, `list_available_agents`).
4. Migration `20261015_collaborators_to_delegated_runs_v1`: tree-only lossless conversion, frozen entry schema, dispositions, no lockout.
5. Retained restore of Team-hosted teammate copies (DEC-006) while their creation path is removed.
6. The published model document (`autobyteus-server-ts/docs/design/collaboration_model.md`) and consolidation.

## Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/solution-revision-record.md`
- Model document (worktree, ships with the change): `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/autobyteus-server-ts/docs/design/collaboration_model.md`; doc pointers in `DESIGN.md`, `autobyteus-server-ts/docs/design/README.md`, six module docs (uncommitted worktree changes)
- Supplements: `new-task-proposal.md` (origin), `related-task-tool-split-receipt.md` (base update); drafts `collaboration_model.draft.md`, `doc-consolidation.draft.patch` are superseded
- Prior review artifacts: N/A — not applicable

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract`, branch `codex/collaboration-model-contract`, base `origin/personal` at `8878625d94` (includes the tool split), finalization target `origin/personal`.

## Open Risks

- Large removal surface (server, web, two contracts packages).
- Agents that used a collaborator by address get "not found" after upgrade (guidance included).
- Paused Task 8641c0ac (memory refactor) must be redesigned on this base afterwards.

## Next Expected Action

Architecture review, then its own handoff rules.
