# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — approved by user on 2026-05-18 after the initial nested-subteam analysis; refined on 2026-05-18 for downstream UX-001 discoverability gap found during API/E2E browser validation.

## Goal / Problem Statement

Support team-local nested subteams so a larger agent team can own local child teams in the same organizational sense that it already owns team-local agents. The concrete pressure case is the Northstar company package: department teams currently appear as separate root teams even though they conceptually belong inside the Northstar Operating Company team. The frontend root Agent Teams page must stop presenting owned subteams as independent root catalog teams, while parent team detail pages must still make those nested subteams discoverable and navigable.

## Investigation Findings

- `team-config.json.members[]` already supports nested team membership through `refType: "agent_team"`.
- Runtime execution already recursively resolves nested team members through `TeamDefinitionTopologyPlanner` and related mixed-team runtime paths.
- Current shared-team discovery treats every first-level folder under an `agent-teams/` root as a root/catalog team.
- Current team-local ownership exists only for agents: `refType: "agent"` plus `refScope: "team_local"`, with files stored under the owning team's `agents/` folder.
- Current parser/service/frontend form logic explicitly forbids `refScope` on `agent_team` members, so the product cannot express `agent_team` + `team_local`.
- The frontend root page lists all fetched agent-team definitions, so any first-level department team appears as a separate card.
- Local-agent canonical identity currently uses a colon-delimited `team-local:<teamId>:<agentId>` shape. True nested subteams require a generalized team-local identity model because a local subteam can itself own local agents and deeper local subteams.
- The agent-definition provider/source/list/cache path must be updated explicitly so agents under `<parent>/agent-teams/<child>/agents/<agent-id>/` are readable by ID, included in visible agent lists, and excluded from the shared-definition cache just like current team-local agents.
- Application-owned teams currently persist sibling team refs as local IDs with no `refScope`; the clean target must make those refs explicit as `refScope: "application_owned"` while reserving `refScope: "team_local"` for child teams physically under the containing team.
- API/E2E browser validation found UX-001: parent detail pages can render nested team rows and direct nested-team routes work, but the rows lack an explicit `View` / `View Details` control, making nested team detail navigation undiscoverable.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis: Inspected `team-definition-config.ts`, `file-agent-team-definition-provider.ts`, `team-definition-source-paths.ts`, team-local agent discovery/source-path code, `team-definition-topology-planner.ts`, `teamDefinitionMembers.ts`, `AgentTeamList.vue`, `AgentTeamCard.vue`, and user-created Northstar configs in `/Users/normy/autobyteus_org/autobyteus-agents`.
- Requirement or scope impact: The implementation must update definition identity, file-backed discovery, validation, runtime team resolution, sync dependency/file layout, GraphQL/domain models, frontend stores, root list rendering, detail/form UX, nested-team row navigation affordances, and tests.

## Recommendations

Implement first-class team-local subteams rather than only hiding referenced teams in the UI.

Preferred package shape:

```text
agent-teams/
  northstar-operating-company-team/
    team.md
    team-config.json
    agents/
      ceo/
      cto/
      ...
    agent-teams/
      engineering-org/
        team.md
        team-config.json
        agents/
          vp-engineering/
          platform-engineering-manager/
          ...
      product-org/
      revenue-org/
      operations-org/
      finance-people-org/
```

Preferred parent member shape:

```json
{
  "memberName": "engineering_org",
  "ref": "engineering-org",
  "refType": "agent_team",
  "refScope": "team_local"
}
```

Root Agent Teams page behavior should be driven by explicit definition ownership/root visibility, not by ad-hoc folder position or “referenced by another team” heuristics. Parent detail pages should then provide an explicit `View` / `View Details` action on nested team members so users can intentionally drill into local department detail pages.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: A root company-level team can own local child subteams as part of its package.
- UC-002: A team-local subteam can own its own local agents and, if needed, deeper local subteams.
- UC-003: Shared/reusable teams can still be referenced as nested members when they are intentionally independent catalog teams.
- UC-004: The root Agent Teams frontend page shows true root/catalog teams, not team-local child teams.
- UC-005: Team detail and run configuration can resolve nested local subteams and their leaf agents.
- UC-006: Sync/export/import includes local subteams and their local agents when syncing a parent team.
- UC-007: From a parent team detail page, a user can discover and navigate to a nested team member's own detail page using a visible control.

## Out of Scope

- Changing team runtime collaboration semantics beyond resolving local subteam identities correctly.
- Retaining legacy dual identity or compatibility wrappers for old local-agent ID shapes.
- Automatically rewriting untracked user-created Northstar files in the original `/Users/normy/autobyteus_org/autobyteus-agents` worktree without an explicit implementation/migration step.
- Changing unrelated agent/team package authoring rules.

## Functional Requirements

- REQ-001: The domain model must allow `agent_team` members to declare an explicit `refScope`, including `team_local`.
- REQ-002: A team-local subteam must be stored under its owning team at `<owner-team>/agent-teams/<local-team-id>/`.
- REQ-003: Canonical IDs must distinguish team-local agents from team-local teams and must support nested local ownership without ambiguous colon-delimited parsing.
- REQ-004: File-backed team discovery must load root teams and team-local subteams with correct ownership metadata.
- REQ-005: Team member resolution must resolve `agent_team` + `team_local` relative to the containing team definition before runtime topology planning, traversal, launch defaults, and sync.
- REQ-006: Validation must reject missing local subteams, missing local agents, direct self-reference, and graph cycles before or during definition/run planning with clear errors.
- REQ-007: The frontend root Agent Teams page must render only root/catalog definitions by default and must not show team-local subteams as independent root cards.
- REQ-008: Frontend detail/form utilities must resolve, display, and validate nested local subteams distinctly from shared nested teams.
- REQ-009: Node sync must include team-local subteams and their local agents when syncing a parent team and must write them back to the owned nested folder layout.
- REQ-010: Existing standalone root teams must continue to appear and run normally after the clean-cut model update.
- REQ-011: Agent-definition lookup, visible listing, provider cache behavior, GraphQL output, and frontend agent store lookup must support local agents owned by team-local subteams.
- REQ-012: Application-owned team configs must use explicit `refScope` semantics: `application_owned` for same-application sibling teams and `team_local` for parent-owned child teams.
- REQ-013: `AgentTeamDetail` must render a visible nested-team navigation action for resolvable `agent_team` members, routing to the resolved canonical team definition ID for shared, application-owned, and team-local nested teams.

## Acceptance Criteria

- AC-001: Given a Northstar Operating Company team with five team-local department subteams, the root Agent Teams page shows the company as a root card and does not show those five departments as peer root cards.
- AC-002: The company team card/detail reports nested team count from its member model and can navigate/display nested team members without treating them as root catalog entries.
- AC-003: Running a parent team with a team-local subteam builds the same nested member route-key tree as a shared nested team, with local subteam agents resolved from the local subteam folder.
- AC-004: A team-local subteam can own team-local agents without local-agent canonical ID parsing failure.
- AC-005: A shared root team can still reference a separate shared team as a nested member when `refScope` is `shared`.
- AC-006: Creating/editing a team rejects invalid nested-team self-reference and cycles.
- AC-007: Syncing a parent team includes team-local subteams and writes them under the parent team's `agent-teams/` folder on the target node.
- AC-008: Existing standalone teams such as the Software Engineering Team continue to load, list, and run as root teams.
- AC-009: Given a team-local subteam with a local agent, querying that local agent by canonical ID resolves `<parent>/agent-teams/<child>/agents/<agent-id>/`, and the frontend can find it by `ownerTeamId` equal to the local subteam canonical ID.
- AC-010: Given an application-owned team referencing a sibling application-owned team, the persisted config uses `refScope: "application_owned"`; given a child team under the current team, persisted config uses `refScope: "team_local"`; GraphQL/domain/frontend mappings preserve this distinction.
- AC-011: Given a parent team detail page with a team-local department member, the nested team row shows a visible `View` / `View Details` action; activating it navigates to `/agent-teams?view=team-detail&id=<resolved canonical child team id>` and displays the child team detail page.

## Constraints / Dependencies

- Product implementation worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams` on branch `codex/team-local-subteams`, based on `origin/personal`.
- Prior package analysis artifacts live in `/Users/normy/autobyteus_org/autobyteus-agents-codex-nested-subteams-analysis/scratch/nested-subteams-analysis`.
- User-created Northstar folders are currently untracked in `/Users/normy/autobyteus_org/autobyteus-agents`; implementation must not overwrite them accidentally.
- The frontend/backend product repository is required for the root-page and model changes.

## Assumptions

- The product should keep a distinction between reusable shared nested teams and owned team-local subteams.
- The root page should hide only team-local subteams, not every shared team that happens to be referenced by another team.
- Clean-cut identity migration is acceptable for in-scope new behavior; durable tests should lock the new ID shape.

## Risks / Open Questions

- Need implementation review of all persisted run-history/sync references to ensure the clean-cut local ID change does not leave new behavior dependent on old IDs.
- Need decide whether to include a Northstar package migration in this same change or as a follow-up once product support lands.
- Need ensure frontend forms do not accidentally allow adding a child team as its own ancestor.
- Need ensure nested-team detail actions are shown only for resolvable team members and do not create broken navigation for missing definitions.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-003
- REQ-002 -> UC-001, UC-002
- REQ-003 -> UC-002, UC-005, UC-006
- REQ-004 -> UC-001, UC-002, UC-004
- REQ-005 -> UC-002, UC-005
- REQ-006 -> UC-001, UC-002, UC-005
- REQ-007 -> UC-004
- REQ-008 -> UC-004, UC-005
- REQ-009 -> UC-006
- REQ-010 -> UC-003, UC-004
- REQ-011 -> UC-002, UC-005, UC-006
- REQ-012 -> UC-001, UC-002, UC-003, UC-005
- REQ-013 -> UC-005, UC-007

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the root frontend catalog problem shown in the screenshots.
- AC-002 validates nested team visibility within the parent team boundary.
- AC-003 and AC-004 validate runtime identity and topology behavior.
- AC-005 validates reusable shared nested teams remain possible.
- AC-006 validates graph integrity.
- AC-007 validates sync completeness.
- AC-008 validates standalone-team non-regression.
- AC-009 validates AR-001: local agents under local subteams resolve through the agent-definition path.
- AC-010 validates AR-002: application-owned sibling refs and team-local child refs remain distinct.
- AC-011 validates UX-001: parent detail pages expose an explicit nested-team detail navigation control and route through the resolved canonical child team ID.

## Approval Status

Approved by user in chat on 2026-05-18; refined on 2026-05-18 after API/E2E validation surfaced UX-001 nested-team navigation discoverability gap.
