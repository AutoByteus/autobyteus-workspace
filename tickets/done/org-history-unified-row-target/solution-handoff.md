# Solution Handoff

## Result

- Result classification: Architecture Design Complete
- Package identifier: ORG-HISTORY-UNIFIED-ROW-20260921-001
- Current solution revision: SR-002
- Task size / architectural risk: Small / Low
- Selected route: Direct implementation via /software_engineering_team/implementation_engineer under the Small-or-Medium / Low Architecture Design Complete rule.
- Requirements state: Approved
- Design state: Complete
- Product Design: Not requested and not required

## Original Request And Approval

The user checked the newly delivered AgentOrg history row and observed that its arrow is still an independently clickable control. They compared it with the Agent Team history row, where the arrow is part of one primary row button, and asked for the AgentOrg row to feel like the same single unit.

After the source-backed comparison was reported, the user explicitly approved a new ticket: “Yes. Yeah. Please, the bootstrap are another small ticket.”

## Goal

Make each AgentOrg history run expose one primary semantic control containing its chevron, lifecycle dot and summary. Pointer or native keyboard activation anywhere in that control must toggle the exact run and invoke the existing open/select action once. Stop remains a separate isolated control.

## Evidence And Root Cause

- Current Org source renders two sibling buttons: a dedicated disclosure button and a primary open/toggle button.
- Current Team source renders the chevron icon inside one primary Team run button.
- The prior ticket deliberately preserved the separate Org chevron; the current implementation was correct for that former requirement.
- The new approved requirement supersedes only the top-level Org run control shape.
- Root cause for the current mismatch is a duplicated local interaction path, not state, routing, backend or persistence architecture.

## Approved Behavior And Scope

- One primary AgentOrg run button; chevron is presentational inside it.
- Clicking the chevron area or text area follows the same exact toggle/open path.
- Space/Enter continue through native button semantics.
- Only the primary button owns aria-expanded and conditional aria-controls.
- Stop remains separate and cannot toggle/open/select.
- Selection, open workspace, conversation, draft, siblings, mounted rows, Agent Team behavior and all stored data remain unchanged.
- No backend/API/store/routing/persistence/migration/release work is in scope.

## Technical Design

- Remove the dedicated AgentOrg run disclosure button from WorkspaceAgentOrgHistoryCollection.vue.
- Move the existing rotating chevron Icon node into the existing primary button.
- Keep openRun(run) as the single activation sequence: toggle exact rootRunId, then call onOpenAgentOrgRun(run).
- Keep Stop as the existing sibling button with click.stop.
- Update WorkspaceAgentOrgDisclosure.spec.ts to prove:
  - exactly one primary run control;
  - chevron belongs to that control and is not separately focusable;
  - icon-target and text-target activation cause exactly one toggle/open;
  - accurate ARIA and native button semantics;
  - Stop, sibling, mounted-Team, selection and draft/conversation preservation.
- Do not change shared state/actions or create a generic row component.

## Canonical Artifacts

- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/requirements-doc.md
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/investigation-notes.md
- Design: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/design-spec.md
- Revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/solution-revision-record.md
- This handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/solution-handoff.md

## Workspace And Repository Context

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target
- Branch: codex/org-history-unified-row-target
- Fresh resolved base: 9a0d2c3fd0d13a28e00e8649c515a7d56c673a32
- Base remote/branch: origin/requirements/flat-agent-organization-model
- Finalization target: origin/requirements/flat-agent-organization-model, not personal
- Bootstrap state: isolated worktree clean before solution artifacts were authored

## Classification Rationale

Small:
- one Vue component and its focused rendered test are the implementation surface.

Low risk:
- no new or changed API, persistence, state owner, routing identity, security, concurrency, deployment or migration behavior;
- existing component/state/action boundaries absorb the change;
- the Team comparator provides an established pattern.

Escalation trigger:
- any need to change shared history state, navigation actions, backend/API behavior, persisted state or a generic cross-surface component must return as Design Impact.

## Expected Implementation Output

A bounded source/test implementation package, focused and adjacent test evidence, rendered desktop-browser validation of pointer/keyboard/ARIA/Stop isolation, preservation evidence, and an implementation handoff suitable for the direct API/E2E route. No Electron build or finalization is part of implementation.
