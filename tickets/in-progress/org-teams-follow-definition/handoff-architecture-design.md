# Handoff — Architecture Design Complete (org-teams-follow-definition)

- Package: `org-teams-follow-definition`; Project Task `autobyteus-29` (FU-002, FU-003 of autobyteus-22), requested by `/project_task_manager` on the user's "work on the follow-up immediately".
- Result: `Architecture Design Complete`, revision `SR-015` (SR-015 CRR-004 A-1 / DEC-007; SR-014 after ARCH-REV-008; SR-013 after CRR-001 CR-001; SR-012 contract aligned after ARCH-REV-006; SR-011 storage contract and validation; SR-010 after ARCH-REV-004; SR-009 after ARCH-REV-003; SR-006 after ARCH-REV-001; SR-007 the user's DEC-006; SR-008 after ARCH-REV-002); task_size `Large`, architectural_risk `High` (migration of every stored Org run; collaboration-contract change; runtime ownership moves; cross-run wake inside a container; peer protocol addition).
- Route: independent architecture review.

## Request and approval

The user chose (SR-002) to restructure Org runs as containers: each mounted Team a Team run, each direct Org agent an agent run, so autobyteus-22's following applies to Org Teams; existing Org runs converted by migration (DEC-001), the Org also follows its Org definition (DEC-002), FU-003 stays in this ticket (DEC-003). Approved 2026-11-21 (requirements SR-004).

## Artifacts (absolute paths)

- /home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md
- /home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md
- /home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md
- /home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/follow-ups.md

## Workspace

- Worktree `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`, base `origin/personal` `9f6add773b`; finalization target `origin/personal`.

## Open risks

- Composed Org view ordering; cross-run wake inside a container (new rule); migration cost on large histories (renames, one log pass).
- The 28 `agent_org` sites get dispositions in implementation by the rule in Change Scope.

## Route Applied

- 2026-11-21: rule "task_size=Large or architectural_risk=High" matched; sent to `/architecture_reviewer` (run `architecture_reviewer_10c7315fd51048c3873b8b6fffa6924c`), delivered.
- 2026-11-22: SR-006/SR-007 sent to `/architecture_reviewer` for re-review.
- 2026-11-22: SR-008 sent to `/architecture_reviewer` for re-review.
- 2026-11-22: SR-009 sent to `/architecture_reviewer` for re-review.
- 2026-11-22: SR-010 sent to `/architecture_reviewer` for re-review.
- 2026-11-22: SR-011 (storage contract, validated) sent to `/architecture_reviewer`.
- 2026-11-22: SR-012 sent to `/architecture_reviewer`.
- 2026-11-22: SR-013 (after CRR-001 CR-001) sent to `/architecture_reviewer`; CR-002..CR-004 and N-1 are implementation local fixes for the same round.
- 2026-11-22: SR-014 sent to `/architecture_reviewer`.
- 2026-11-22: SR-015 (CRR-004 A-1, DEC-007) sent to `/architecture_reviewer`.
