# Frontend Nested Team UI Design Rework Note

## Trigger

API/E2E full-stack browser validation on 2026-05-13 failed because the backend produced correct recursive nested-team state but the frontend active workspace/run UI flattened the nested `BuildSquad` team into leaf agents and omitted the subteam node.

Primary evidence:

- Validation failure note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/fullstack-nested-team-ui-validation-failure.md`
- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/api-e2e-validation-report.md`
- Screenshot: `/Users/normy/.autobyteus/browser-artifacts/995de5-1778644109170.png`

## Design Decision

Nested teams must be first-class frontend team members. The frontend may derive leaf-agent maps for conversations and projections, but the visible UI and selection model must be recursive.

Target behavior for the seeded fixture:

```text
Nested Mixed Runtime Delivery Team
  program_manager
  BuildSquad [team]
    BuildSquad/review_lead
    BuildSquad/qa_specialist
```

The flat parent-level display below is rejected:

```text
Nested Mixed Runtime Delivery Team
  program_manager
  review_lead
  qa_specialist
```

## Required Design Updates

The durable design artifacts were updated to require:

1. Frontend `TeamMemberNode` / `TeamMemberTreeNode` recursive tree as the display contract.
2. `AgentTeamContext.memberTree`, `memberNodesByRouteKey`, `leafAgentContextsByRouteKey`, and `focusedMemberRouteKey`.
3. Launch config overrides keyed by canonical nested route keys, e.g. `BuildSquad/review_lead`.
4. Subteam focus/group UI and composer targeting the subteam route key.
5. Run history/restore display from backend `metadata.memberTree`.
6. Streaming, activity, tool approval, and team communication display by `sourcePath`, member route key, and sender/receiver participant kind/path/route.

## Updated Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`
