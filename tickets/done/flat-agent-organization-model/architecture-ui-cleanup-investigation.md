# Task Detail And History Heading Cleanup

- Package: AORG-FLAT-TEAM-001; date: 2026-09-11.
- Inquiry: UI-CLEAN-001; not a completed AD revision.
- Workspace: /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model
- Branch: requirements/flat-agent-organization-model.
- Inquiry requirements: RER-029@0f5014405eb028123afb37013b722acb2d12fe22.
- Resolution authority: RER-031@3b8c18a28af7674619a797a92a208dabfa851f54.
- Last completed design: AD-REV-020@a83fa7541e8648a5472493f214a3ba8ed14af6b6;
  ARCH-REV-018 Pass. Inspected source HEAD: 932c81b2261ffcc21ac540b0f25522ecfa1cb29a.

## Original User-Approved Presentation Direction (Heading Superseded By RER-032)

1. Remove the always-visible participant name/ID strip above task detail.
   Keep the familiar task heading, status, direction, timestamp and content.
   Preserve exact execution navigation through participant names; identity
   detail need not be permanently displayed. The user accepted this proposal:
   "yesss. i believe its simple change".
2. Change only the left Workspaces/history category heading from `Agent Orgs`
   to the user's exact requested `Org`, directly beneath `Teams`. The request
   and screenshot identify this heading, not the main navigation, domain/API
   names, category membership or run titles. Do not silently pluralize to `Orgs`.

## Read-Only Evidence And Responsibility

- `autobyteus-web/components/workspace/collaboration/CollaborationDelegatedTasksSection.vue:75–83`
  adds a nav before the shared detail pane, displaying participant label plus
  `agentRunId.slice(-6)`. Lines 129–139 route the exact execution on click.
- The earlier `TeamDelegatedTasksSection.vue` at immutable baseline
  5fb16658e7bd2aefd750f99eb596a17382e161ac renders the detail pane directly
  without that nav. This baseline and local origin/personal 5645b49d6 are
  identical for the compared section and item-detail files.
- `TeamDelegatedTaskItemDetail.vue` retains the original header/body template;
  only its type import differs from the earlier baseline. The extra strip is
  an Architecture/Implementation presentation choice, not task message content.
- DS-029 must retain exact task-Agent/task-Team selection and historical access
  when moving the controls. Labels alone are not identity. This needs no new
  backend, persistence, lifecycle, task policy, or Product prototype.
- `WorkspaceHistoryWorkspaceSection.vue` renders
  `WorkspaceAgentOrgHistoryCollection` below the Team collection. Its existing
  test asserts the `Agent Orgs` heading follows `Teams`.
- Canonical BEH-014, UC-016, REQ-031, AC-026, SCN-015 and DEC-017 expressly
  name `Agent Orgs`. The new literal copy requires Requirements-owned
  synchronization; this is not a missing user decision or an invitation to
  redesign the history surface.

## Prior Resolution — Approved RER-031 / AD-REV-021

RER-031@3b8c18a28af7674619a797a92a208dabfa851f54 includes the heading-only
RER-030 and explicitly approves all three presentation corrections: exact Org
history copy, compact Messages without permanent address/Task-ID additions,
and familiar task detail without the top participant strip. Exact identity stays
inspectable on demand; no accepted task-origin messages are filtered. No new
Product artifact or outstanding user decision remains.

DS-034 in design-spec.md is the completed AD-REV-021 technical correction;
VAL-051–053 self-validate messages, task participant navigation/retention and
history copy. Focused Small/Low; cumulative Large/High remains. Existing
AD-REV-020 authoring transition, runtime/task/message records and policies remain
unchanged. This inquiry is evidence/navigation only, not a competing UI spec.
Only architecture-owned artifacts change; no source/tests/upstream/delivery edits
or new executable pass. Independent review receives the cumulative package.

## Current Resolution — RER-032 / AD-REV-022

The user subsequently requested plural Orgs, matching Teams, and explicitly
asked Architecture to notify Implementation. That message was delivered to the
existing implementation execution. RER-032@ca04d7157 now commits the exact
plural heading; all RER-031 message/task cleanup is unchanged. AD-REV-022
synchronizes DS-034/VAL-053 and returns this Small/Low copy-only result directly
to Implementation. Parent AD-REV-021 / ARCH-REV-019 Pass is retained. Earlier
singular text above is historical only, not current implementation direction.
No Product gate, structural review reopening, new task or lifecycle change.

## User Evidence

Follow-up investigation (subsequently resolved by RER-031): the `Task · ed1f8a` badge inside
Messages is not a task record. `CollaborationMessagesPanel.vue:53–57` renders it
when the message counterpart is task-scoped; the suffix is the counterpart
AgentRun ID, not task ID. `agentOrgCommunicationPerspective.ts` projects only
the root communication message array, then annotates the counterpart using the
retained execution index. DS-029 deliberately added this identity badge.
REQ-034 requires ordinary accepted task-Agent communication to remain in
Messages; REQ-036 keeps formal assignment/submission/review records separate.
The user's subsequent direction is to keep the message presentation pure.
Include removal of the prominent Task/run-suffix badge from the default message
row in the presentation cleanup. Keep sender/receiver, content, time and
references; exact execution provenance stays inspectable on demand. This does
not hide task-origin messages or change message eligibility, identity, history,
or the separation of formal task records from ordinary communication.

- Task-strip screenshot: /home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/architecture_designer_6b8b3019214246e086957b3f395901bb/context_files/ctx_1b892b545fae__image.png
- Heading screenshot: /home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/architecture_designer_6b8b3019214246e086957b3f395901bb/context_files/ctx_5c796264f166__image.png
