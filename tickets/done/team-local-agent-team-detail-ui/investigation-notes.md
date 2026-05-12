# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements updated after user UI clarification on 2026-05-12; design spec revised for architecture review.
- Investigation Goal: Determine current frontend ownership, data flow, and affected files for making Agent Team detail the primary view/edit surface for team-local agent members while leaving application-owned behavior unchanged.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change is frontend-only but touches two product surfaces: Agent Team detail member rendering/editing and Agents page catalog/search behavior. It also requires tests and docs updates.
- Scope Summary: Team-local agent members get compact inline expandable detail and edit in Agent Team detail; shared/global agent members get a compact route-to-Agent-Detail view action; team-local definitions are removed from default/normal Agents-page discovery. Application-owned behavior remains as-is.
- Primary Questions To Resolve:
  - How does Agent Team detail currently resolve team-local member definitions?
  - Can existing agent detail/edit components or store paths be reused inside team context?
  - Where are team-local agents currently shown in the Agents page?
  - What behavior must remain unchanged for application-owned agents?

## Request Context

The user identified that team-local agents conceptually belong to their owning Agent Team. Current UX forces users to leave Agent Team detail, go to the Agents page, and search through a crowded catalog to inspect or edit a member. Through discussion, scope was narrowed to team-local agents plus a compact view action for shared/global agent members. Application-owned behavior should remain unchanged for now, and featured catalog shortcuts are not part of this first change. On 2026-05-12, the user clarified that the team-local member action should be visually compact rather than a large repeated `View member agent details` button, and agreed that shared/global member cards should be able to navigate to the existing Agent Detail page.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail/tickets/done/team-local-agent-team-detail-ui`
- Current Branch: `codex/team-local-agent-team-detail`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully during bootstrap on 2026-05-09, and the task branch was fast-forwarded to the current `origin/personal` on 2026-05-12; current base commit `be56cab9b41b850c92690d79a8dfa70c52c369a0`.
- Task Branch: `codex/team-local-agent-team-detail`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work must continue in the dedicated worktree above, not the shared superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-09 | Command | `git remote -v && git branch --show-current && git status --short --branch && git symbolic-ref refs/remotes/origin/HEAD` | Discover repository and base branch context | Current checkout was `personal`; remote HEAD is `origin/personal`. | No |
| 2026-05-09 | Command | `git fetch origin --prune` | Refresh tracked remote state before creating task worktree | Fetch completed; `origin/personal` commit `263e89c595f6942e7e826daf19cea9a9fd254459`. | No |
| 2026-05-09 | Setup | `git worktree add -b codex/team-local-agent-team-detail /Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created and branch tracks `origin/personal`. | No |
| 2026-05-12 | Command | `git fetch origin --prune && git merge --ff-only origin/personal` | Refresh task worktree after user approval before architecture handoff | Fast-forwarded task branch from `263e89c5` to `be56cab9`; artifacts remain untracked in task folder. | No |
| 2026-05-12 | Other | User clarification with Agent Team member screenshots in conversation | Refine member-card UI and shared/global member behavior | Team-local detail action should be compact (`Details`/chevron/icon) rather than a large repeated full-width button; shared/global individual-agent members should get a compact `View` action that opens the existing Agent Detail page. Application-owned remains unchanged. | Update requirements/design and resend for architecture review. |
| 2026-05-09 | Code | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Inspect current team detail member rendering | Fetches team and agent definitions; resolves team-local avatar/name with `buildTeamLocalAgentDefinitionId`; member cards are shallow and do not expand/edit agent details. | Yes, design component split/reuse. |
| 2026-05-09 | Code | `autobyteus-web/components/agents/AgentDetail.vue` | Inspect full agent detail display fields | Shows ownership badge, team/application provenance, category, default runtime/model, instructions, skills, tools, optional processors. | Yes, reuse/detail extraction decision. |
| 2026-05-09 | Code | `autobyteus-web/components/agents/AgentEdit.vue` and `autobyteus-web/components/agents/AgentDefinitionForm.vue` | Inspect current agent edit path | Edit uses `AgentDefinitionForm` and `agentDefinitionStore.updateAgentDefinition` by id. Form is full-size and includes option/tool/skill loading. | Yes, decide whether to embed or extract a team-local editor. |
| 2026-05-09 | Code | `autobyteus-web/components/agents/AgentList.vue` | Inspect current Agents page browse/search | Browse renders `originSections.teamLocalGroups`; flat search includes all agent definitions including team-local ones. | Yes, adjust filtering/rendering. |
| 2026-05-09 | Code | `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | Inspect origin grouping owner | Utility classifies `TEAM_LOCAL`, `APPLICATION_OWNED`, and shared definitions. Application grouping should remain unchanged. | Yes, likely leave utility intact but change AgentList consumption. |
| 2026-05-09 | Code | `autobyteus-web/stores/agentDefinitionStore.ts` | Inspect agent definition type and update path | `AgentDefinition` includes ownership/provenance and `defaultLaunchConfig`; update input supports fields needed for edit. | No |
| 2026-05-09 | Code | `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Inspect team node shape | `TeamMemberInput` has `refType` and `refScope`; team-local members represented as agent nodes with `refScope: 'TEAM_LOCAL'`. | No |
| 2026-05-09 | Code | `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | Inspect team-local id use in team edit form | Uses `parseTeamLocalAgentDefinitionId` and `buildTeamLocalAgentDefinitionId`; `node.ref` for team-local members is local agent id component. | No |
| 2026-05-09 | Test | `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Inspect existing team detail coverage | Covers member avatar fallback and instruction expansion; no member detail expansion/edit coverage yet. | Yes, add tests. |
| 2026-05-09 | Test | `autobyteus-web/components/agents/__tests__/AgentList.spec.ts` and `autobyteus-web/utils/catalog/__tests__/agentDefinitionOriginGroups.spec.ts` | Inspect existing catalog grouping coverage | Existing tests expect team-local groups in Agents page; tests must be updated to new exclusion behavior while application-owned remains. | Yes |
| 2026-05-09 | Doc | `autobyteus-web/docs/agent_management.md` | Inspect current documented behavior | Docs say team-local agents are shown and editable in generic Agents list/detail/edit. | Yes, update after implementation. |
| 2026-05-09 | Doc | `autobyteus-web/docs/agent_teams.md` | Inspect current team-local team docs | Docs mention team-local badges in team detail, not inline member details/editing. | Yes, update after implementation. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `/agent-teams?view=team-detail&id=<team-id>` renders `AgentTeamDetail.vue`; `/agents` renders `AgentList.vue`.
- Current execution flow:
  - Agent Team detail loads team definitions and agent definitions.
  - Team detail renders a member card for each `teamDef.nodes` entry.
  - For a team-local agent member, `AgentTeamDetail.vue` derives the canonical definition id with `buildTeamLocalAgentDefinitionId(teamDef.id, node.ref)` for avatar/name only.
  - To see or edit full team-local agent details, the user must use the generic `/agents` detail/edit surface.
  - The Agents page browse mode shows team-local groups before application/shared groups; search mode filters all agent definitions without excluding team-local agents.
- Ownership or boundary observations:
  - Product ownership says a team-local agent belongs to the team, but current primary detail/edit UX is the global Agents catalog.
  - Agent Team detail already crosses the necessary data boundary by loading agent definitions, but does not expose that data beyond shallow cards.
- Current behavior summary: Team-local members are visible in Agent Team detail but not inspectable/editable there; they are prominently discoverable in the Agents catalog, creating crowding and ownership confusion.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: A bounded frontend refactor is likely needed to avoid duplicating agent detail rendering/edit submission logic inside `AgentTeamDetail.vue` while making team-local ownership explicit.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentTeamDetail.vue` | Has team-local id resolution but only shallow member cards. | Correct page has data access but lacks owned member-detail UI. | Add owned expandable member detail/edit composition. |
| `AgentList.vue` | Browse/search currently include team-local definitions. | Generic catalog is carrying ownership that should be primary in team context. | Exclude team-local definitions from default/normal Agents discovery. |
| `AgentDetail.vue` / `AgentDefinitionForm.vue` | Existing detail/edit logic is page-sized and reusable conceptually. | Direct copy into team page would risk duplication; reusable subcomponent or careful composition is needed. | Design exact extraction/reuse. |
| User scope clarification | Application-owned behavior should remain as-is. | Do not broaden ownership redesign beyond team-local. | Guard requirements/tests against app-owned regressions. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Team definition detail surface and member card rendering | Resolves team-local definitions for avatar/name; no inline expanded member details/edit. | Primary owner for team-local member inspection UX. |
| `autobyteus-web/components/agents/AgentDetail.vue` | Full agent read-only detail page | Contains desired read-only fields and ownership labels. | Rendering concepts should be reused/extracted for team-local expanded view. |
| `autobyteus-web/components/agents/AgentEdit.vue` | Full-page agent editing | Uses `AgentDefinitionForm` and update store. | Existing save path should be reused; page navigation should not. |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | Agent create/edit form | Full form, has submit/cancel, supports default launch config and tool/skill/processor fields. | Possible inline reuse but may be visually heavy; design must decide. |
| `autobyteus-web/components/agents/AgentList.vue` | Agents catalog browse/search | Renders team-local groups and flat search includes team-local. | Must exclude team-local from default/normal discovery. |
| `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | Agent definition grouping by origin | Keeps team-local/application/shared classification separate. | Can remain as classification utility; AgentList can choose not to render/use team-local. |
| `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | Canonical team-local id builder/parser | Existing id rule. | Must be authoritative id shape. |
| `autobyteus-web/docs/agent_management.md` | Agents module docs | Says team-local agents are generic Agents-page visible/editable. | Needs update. |
| `autobyteus-web/docs/agent_teams.md` | Agent Teams module docs | Mentions team-local badges only. | Needs update. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-09 | Static probe | `rg -n "TEAM_LOCAL|teamLocal|AgentTeamDetail|AgentList" autobyteus-web` plus direct file reads | Relevant behavior is frontend static/component state; no backend/API probe needed for draft requirements. | Design can proceed after approval with frontend component/test focus. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This task is internal product UX and current-code design; external browsing was not needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not required for requirements draft. Component tests likely use Vitest/Vue Test Utils and testing Pinia.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation listed in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Team-local definitions are first-class `AgentDefinition` records with `ownershipScope: 'TEAM_LOCAL'` and owner-team provenance.
- Team-local team node `ref` differs from the canonical `AgentDefinition.id`; canonical resolution uses `buildTeamLocalAgentDefinitionId(teamId, node.ref)`.
- Agent Team detail already imports `useAgentDefinitionStore` and fetches all agent definitions, so no new backend query is required for basic detail rendering.
- The current Agents page grouping utility supports separate classification, making it possible to hide team-local groups without disrupting application-owned classification.
- Existing docs currently present generic Agents page as a team-local management surface and must be corrected after implementation.

## Constraints / Dependencies / Compatibility Facts

- Do not alter application-owned behavior for this task.
- Do not alter backend GraphQL schema or server settings.
- Do not change featured catalog behavior in this task.
- Existing direct agent detail/edit URLs can remain functional even if team-local agents are no longer discoverable in normal Agents list/search.
- Tests expecting team-local visibility in Agents page need intentional updates to reflect the new ownership rule.

## Open Unknowns / Risks

- Exact UI composition for inline edit: full `AgentDefinitionForm` reuse may be too large inside an accordion; extraction of read-only detail and/or a constrained edit panel may be cleaner.
- Missing team-local definition handling should be specified in design to prevent broken UI if data is inconsistent.
- Whether normal Agents search should have an advanced “include team-local” option is deliberately out of scope per current simplification; this can be reconsidered later.

## Notes For Architect Reviewer

- Requirements are approved by the user as of 2026-05-12.
- The key design questions are component ownership and member-card action density: avoid duplicating a second agent detail/editor implementation while keeping team-local interaction inside `AgentTeamDetail.vue`, and keep member actions compact/scannable. Shared/global member `View` navigation should reuse the existing Agent Detail route rather than inline shared-agent rendering.
- Application-owned behavior is explicitly unchanged and should be protected in review.
