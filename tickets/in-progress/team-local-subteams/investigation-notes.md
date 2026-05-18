# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements/design refined for UX-001 nested-team detail navigation gap after API/E2E validation
- Investigation Goal: Design implementation support for team-local nested subteams and frontend root-page filtering.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Requires coordinated changes across TypeScript shared identity utilities, server domain/provider/GraphQL/sync/runtime code, frontend stores/components/forms/tests, and possibly package data migration.
- Scope Summary: Add first-class team-local subteams; stop team-local child teams from appearing as independent root Agent Teams page cards.
- Primary Questions Resolved:
  - Does nested team runtime already exist? Yes.
  - Is team-local subteam ownership expressible today? No.
  - Why do Northstar departments appear as root cards? They are first-level shared team folders and the root page lists all fetched teams.
  - Is frontend work required? Yes, the root list must use root/catalog definition projection instead of all definitions.
  - Is nested-team drill-in discoverability required? Yes. UX-001 showed that parent detail renders nested team rows but lacks an explicit view action despite routable child detail pages.

## Request Context

The user approved the proposal to model subteams as team-local owned teams and explicitly requested frontend improvement because department teams currently appear as separate root Agent Teams page cards despite belonging to a company team.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams`
- Current Branch: `codex/team-local-subteams`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-18
- Task Branch: `codex/team-local-subteams`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None. No `AGENTS.md` was present at the superrepo root of the dedicated worktree.
- Notes For Downstream Agents: The original `autobyteus-agents` repo has untracked Northstar package directories. Do not modify or delete them from this product-code worktree. If package migration is included later, use a separate explicit package worktree or carefully copy intentional changes.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-18 | Command | `git status --short`, `git remote -v`, `git symbolic-ref refs/remotes/origin/HEAD`, `git worktree list` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap product repo safely | Base repo clean on `personal`; remote default is `origin/personal`; many existing worktrees but no `codex/team-local-subteams`. | No |
| 2026-05-18 | Command | `git fetch origin --prune`; `git worktree add -b codex/team-local-subteams /Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams origin/personal` | Create dedicated task worktree | Product task worktree created successfully at `d2b4f433`. | No |
| 2026-05-18 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/northstar-operating-company-team/team-config.json` | Inspect Northstar pressure case | Parent has 8 team-local agents and 5 nested `agent_team` refs; nested refs have no `refScope`. | Package migration decision pending |
| 2026-05-18 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/northstar-*-org-team/team-config.json` | Inspect department team shape | Five departments are first-level folders and have local agents only. | Package migration decision pending |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | Check shared team config schema | `agent_team` members are allowed but `refScope` is forbidden for them; agent members require `refScope`. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Check team member/domain shape | `TeamMember.refScope` exists but constructor nulls it for `agent_team`; ownership scope lacks `team_local`. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Check discovery | `getAll()` scans first-level shared directories plus application-owned sources; no team-local team discovery. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-source-paths.ts` | Check source resolution | Source resolver recognizes shared top-level and application-owned IDs only. | Must extend |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Check local-agent precedent | Local agents are discovered under `<team>/agents/<agent-id>` and carry owner team metadata, but listing only walks root shared teams and application-owned teams, not team-local subteams. | Must recursively extend for AR-001 |
| 2026-05-18 | Code | `autobyteus-ts/src/agent-team/utils/team-local-agent-definition-id.ts` | Check local identity precedent | Existing ID format `team-local:<teamId>:<agentId>` cannot cleanly support local teams owning local agents if owner IDs contain colons. | Replace/generalize |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts` | Recheck AR-001 | `findAgentSourcePaths()` currently parses only old team-local agent IDs and then asks `findTeamSourcePaths(teamId, ...)`; it must parse generalized local-agent IDs whose owner can itself be a team-local team. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Recheck AR-001 | `getById()` and `getAllVisible()` depend on old parser/listing; `readTeamLocalAgent()` can work if `findTeamSourcePaths()` resolves local owner teams. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` | Recheck AR-001 | Cache bypass/update exclusion currently recognizes only `parseTeamLocalAgentDefinitionId`; new local-agent IDs must also bypass the exhaustive shared/app cache. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Check runtime topology | Recursively resolves `agent_team` members and detects cycles, but resolves child team by raw `node.ref`. | Extend resolver |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts` | Check frontend/run support traversal | Recursively resolves nested teams by raw `node.ref`; local agent ID uses current team id. | Extend resolver |
| 2026-05-18 | Code | `autobyteus-web/utils/teamDefinitionMembers.ts` | Check frontend nested member tree | Frontend recursively resolves nested team by raw `node.ref`; local agent ID uses current definition id. | Extend resolver |
| 2026-05-18 | Code | `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Check root list | Uses `store.agentTeamDefinitions` for list; no root/catalog projection. | Must change |
| 2026-05-18 | Code | `autobyteus-web/components/agentTeams/AgentTeamCard.vue` | Check card counts | Nested team count is computed from `nodes.refType === 'AGENT_TEAM'`. | Retain, add scope-aware display if needed |
| 2026-05-18 | Code | `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | Check form validation | Team library excludes only current team; form forbids `refScope` on nested teams and only rejects direct self-reference. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts` and `node-sync-file-layout.ts` | Check sync dependencies and layout | Sync expands nested `agent_team` refs by raw ID and writes team-local agents, but has no team-local subteam layout handling. | Must change |
| 2026-05-18 | Code | `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` and `application-owned-team-integrity-validator.ts` | Check application-owned team precedent | Application-owned nested team refs are validated to stay in same app; nested team refs currently have no scope. | Align with new explicit scope semantics |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` and `utils/application-owned-team-ref-normalizer.ts` | Recheck AR-002 | App-owned persisted configs currently allow `agent` `team_local`, reject scoped nested teams, and canonicalize all team refs to application-owned sibling IDs. | Must split `application_owned` sibling vs `team_local` child semantics |
| 2026-05-18 | Code | `applications/*/agent-teams/*/team-config.json` | Check current bundled app configs | Existing bundled apps only use local agent members; no current app-owned nested team example blocks clean-cut scoped team refs. | Tests/fixtures still need migration |
| 2026-05-18 | Architecture review | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/design-review-report.md` | Rework failed design findings | Review required explicit agent-definition local-agent lookup/list/cache design and explicit application-owned `refScope` semantics. | Addressed in revised design |
| 2026-05-18 | User clarification | Chat: `applications/my-app/agent-teams/main-team/agent-teams/drafting-cell/` | Clarify app-owned semantics | `main-team` is `application_owned`; `drafting-cell` is `team_local` to `main-team`. Sibling app teams use `refScope: application_owned`. | Incorporated in revised design |
| 2026-05-18 | Validation report | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/api-e2e-validation-report.md` | Investigate downstream UX-001 requirement gap | Backend/API and browser data behavior passed for Northstar; parent detail page renders nested teams but no explicit `View` / `View Details` action for nested team rows. | Refine requirements/design |
| 2026-05-18 | Code | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Check current detail affordances | Current detail component has an explicit shared-agent `View` action and team-local-agent inline `Details` toggle, but `agent_team` rows only show member name/blueprint; helper already computes resolved team IDs through `getTeamDefinitionIdForNode()`. | Add nested-team view action design |
| 2026-05-18 | Code | `autobyteus-web/pages/agent-teams.vue` | Check existing navigation boundary | Page already owns `/agent-teams` route transitions through `handleNavigation({ view: 'team-detail', id })`; component should emit navigation rather than push routes directly. | Reuse route boundary |
| 2026-05-18 | Code | `autobyteus-web/localization/messages/en/agentTeams.ts`, `zh-CN/agentTeams.ts`, and `components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Check UI label/test owners | Existing labels/tests cover shared-agent view and team-local-agent details; nested-team view labels/tests must be added. | Add frontend tests/localization design |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: File-backed team discovery starts in `FileAgentTeamDefinitionProvider.getAll()`. Frontend root list starts in `AgentTeamList.vue` from `store.agentTeamDefinitions`.
- Current execution flow: `team-config.json` -> `normalizeTeamConfigRecord()` -> `AgentTeamDefinition.nodes` -> GraphQL `agentTeamDefinitions` -> Pinia `agentTeamDefinitions` -> `AgentTeamList`/`AgentTeamCard`; runtime uses `TeamDefinitionTopologyPlanner` to recursively resolve `agent_team` nodes.
- Ownership or boundary observations: Current code has nested-team membership, but no team-local nested-team ownership. Team-local agents and root/application-owned teams have owners; nested shared team references do not.
- Current behavior summary: If a child department is stored as a first-level team folder, it is both a root catalog team and a nested member when referenced by a company team. The frontend is faithfully showing this ambiguous model.

## Design Health Assessment Evidence

- Change posture: Larger Requirement / Feature
- Candidate root cause classification: Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness
- Refactor posture evidence summary: Refactor needed now because adding only a frontend filter would leave the authoritative definition model unable to express owned local subteams and would confuse shared nested references with local organizational ownership.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `team-definition-config.ts` | Nested team members must not include `refScope`. | The domain cannot express the requested ownership relation. | Change schema/model |
| `file-agent-team-definition-provider.ts` | First-level folders are root teams. | Physical layout and catalog visibility are currently coupled. | Add team-local discovery and ownership metadata |
| `team-local-agent-definition-id.ts` | Existing ID shape is agent-specific and colon-delimited. | Needs semantic tightening before local teams can own local agents. | Add generalized identity utility |
| `AgentTeamList.vue` | Root list uses all definitions. | Frontend root page will continue to show local children unless it uses explicit root projection. | Update store/list |
| Runtime topology planner | Nested runtime already exists. | Product does not need a new runtime mode; it needs correct identity/source resolution. | Extend resolver |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/utils/team-local-agent-definition-id.ts` | Team-local agent canonical ID helper | Agent-specific and cannot represent team-local teams. | Replace with generalized local definition identity owner. |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Team definition domain model | `refScope` is nulled for team refs; ownership lacks `team_local`. | Must own explicit team member scope semantics. |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | Shared config parser/writer | Forbids `refScope` on `agent_team`. | Must canonicalize explicit scopes for all member kinds. |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-source-paths.ts` | Resolve team ID to source files | Does not resolve local subteam IDs. | Must become the authoritative team source resolver. |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Team definition provider | Lists roots and application-owned teams only. | Must read/list team-local subteams and root projection. |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Team-local agent discovery/listing | Currently scans root/application-owned teams only. | Must recursively include team-local subteam source paths so local subteam agents are visible. |
| `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts` | Agent source resolver | Parses old local-agent IDs and resolves owner team to file paths. | Must parse generalized local-agent IDs and rely on team source resolver for local owner teams. |
| `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` | Agent definition cache wrapper | Bypasses cache for old team-local agents. | Must bypass/cache-exclude all generalized local-agent IDs. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Runtime team tree builder | Resolves child teams by raw ref only. | Must use scoped team member resolver. |
| `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts` | Sync dependency expansion | Expands nested teams by raw ref. | Must resolve scoped local team IDs. |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Frontend definition cache | Has no `TEAM_LOCAL` ownership/root projection. | Must expose root definitions and lookup all definitions. |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Root Agent Teams page | Renders all definitions. | Must render root/catalog definitions only. |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Team detail member display | Original design required scoped nested team display; current implementation computes resolved nested team IDs for blueprint/avatar, but lacks a visible nested-team navigation action. | Must retain scoped lookup and add `View` / `View Details` for resolvable team rows. |
| `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | Team edit/create validation | Forbids nested-team scope and lacks ancestor-cycle validation. | Must expose scoped team library and validation. |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Frontend agent definition cache | Already groups local agents by `ownerTeamId`; backend must populate agents owned by local subteam canonical IDs. | Add tests for local subteam agent lookup/listing. |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Team detail member rendering | Current implementation renders nested team member name/blueprint but no explicit nested-team detail navigation action. | Must add a visible `View` / `View Details` action for resolvable `agent_team` rows using resolved canonical team IDs. |
| `autobyteus-web/pages/agent-teams.vue` | Agent Teams page route boundary | Existing `handleNavigation` supports `{ view: 'team-detail', id }`. | Nested team row actions should emit existing navigation payload rather than bypassing the page router. |
| `autobyteus-web/localization/messages/en/agentTeams.ts` / `zh-CN/agentTeams.ts` | UI copy | Existing shared-agent view labels exist; nested-team view labels do not. | Add localized nested-team view action and aria/title labels. |
| `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Detail component tests | Existing tests cover shared-agent view and local-agent inline details; no test for nested-team view action. | Add test for visible nested-team action and emitted canonical ID. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-18 | Script | Parsed `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/northstar*-team/team-config.json` | Six Northstar team folders exist; five are referenced by the company team. Filtering referenced teams would leave only the company as root for Northstar. | Confirms the screenshot issue, but explicit local ownership is the cleaner fix. |

## External / Public Source Findings

None used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None during design.
- Required config, feature flags, env vars, or accounts: None during design.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/team-local-subteams /Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams origin/personal`.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree should remain until delivery finalization.

## Findings From Code / Docs / Data / Logs

1. Nested-team runtime is already present and should be extended, not replaced.
2. The current domain has a mixed-level boundary: root folder discovery is acting as both package ownership and catalog visibility.
3. The existing local-agent model is a strong precedent but its identity helper is too narrow for nested local team ownership.
4. AR-001 recheck: local subteam agents must be handled in the agent-definition subsystem, not only in team-definition runtime/source resolution.
5. AR-002 recheck: application-owned persisted configs need explicit `application_owned` sibling-team refs versus `team_local` child-team refs.
6. The frontend root page needs explicit root/catalog projection; otherwise team-local subteams will continue to appear as root teams.
7. UX-001: parent detail pages need a visible nested-team `View` / `View Details` affordance; direct routes working is insufficient for discoverability.
8. Sync and application-owned validation already contain nested dependency concepts and should be reused/extended rather than duplicated.

## Constraints / Dependencies / Compatibility Facts

- Use clean-cut target behavior; do not keep dual old/new local ID resolution in new code paths.
- Existing generated/compiled `dist` artifacts should not be manually patched unless this repo convention requires it during implementation.
- The implementation must be coordinated across packages in the superrepo because server imports shared utilities from `autobyteus-ts` and frontend has its own matching utility today.

## Open Unknowns / Risks

- Implementation must check whether persisted run-history records need read-only historical tolerance for old IDs. New behavior should not generate old IDs.
- Northstar package migration may require a separate `autobyteus-agents` worktree after product support lands.
- The frontend create/edit UX for authoring team-local subteams may need an incremental first version: display/resolve existing local subteams first, then richer nested authoring if needed.
- UX-001 should be resolved by a small detail-page affordance, not by changing backend ownership or root-list projection semantics.

## Notes For Architect Reviewer

Review for boundary correctness around canonical identity, source-path resolution, root-list projection, avoiding an insufficient frontend-only filter, and the UX-001 nested-team view action staying inside the frontend detail/navigation boundary.
