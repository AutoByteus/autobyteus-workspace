# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Enable imported agent packages to carry agent-private skills in the agent folder itself. A packaged agent with one private skill may place `SKILL.md` directly in its agent folder. A packaged agent with multiple private skills may place individual skill folders under `skills/`. Team-local packaged agents need the same private-skill behavior, and packaged teams need a team-shared `skills/` folder that local agents in that team can use.

## Investigation Findings

Backend agent definition input and persisted config already support multiple `skillNames`. Runtime exposure also iterates multiple resolved skills. The current limitation is in imported agent-package skill discovery/resolution: current package-root skill discovery only recognizes a colocated root `SKILL.md` as a global/bundled skill shape and does not resolve agent-private multi-skill folders (`agents/<agentId>/skills/*`) or team-shared folders (`agent-teams/<teamId>/skills/*`) in the context of the owning agent/team.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `skillNames` is array-shaped in backend agent input/config/runtime, while skill resolution is currently name-only and package-root discovery lacks agent/team source context.
- Requirement or scope impact: Add contextual configured-skill resolution for agents, not a runtime multi-skill rewrite. Runtime callers should ask for configured skills for an agent definition/source context, not plain global `getSkills(skillNames)`.

## Recommendations

Support these layouts first:

1. Shared packaged agent single private skill:
   - `agents/<agentId>/SKILL.md`
2. Shared packaged agent multiple private skills:
   - `agents/<agentId>/skills/<skillName>/SKILL.md`
3. Team-local packaged agent single private skill:
   - `agent-teams/<teamId>/agents/<localAgentId>/SKILL.md`
4. Team-local packaged agent multiple private skills:
   - `agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md`
5. Team-shared skills for local agents in a packaged team:
   - `agent-teams/<teamId>/skills/<skillName>/SKILL.md`

Keep `agent-config.json.skillNames` as the authoritative binding from an agent to the skills it should use. Do not infer skills just because files exist. Resolve those configured names with source context and precedence: agent-private `skills/` folder, colocated root `SKILL.md`, owning team shared `skills/`, then existing global/default skill sources.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-1: A shared packaged agent with one private `SKILL.md` can resolve that configured skill when run.
- UC-2: A shared packaged agent with multiple private `skills/<skillName>/SKILL.md` folders can resolve all configured private skills when run.
- UC-3: A team-local packaged agent with one private `SKILL.md` can resolve that configured skill when run as a team member.
- UC-4: A team-local packaged agent with multiple private `skills/<skillName>/SKILL.md` folders can resolve all configured private skills when run as a team member.
- UC-5: A local agent in a packaged team can resolve skills from the owning team folder's `skills/<skillName>/SKILL.md` when configured by name.
- UC-6: Existing globally installed/default skills remain resolvable after private and team-shared resolution checks.

## Out of Scope

- Auto-attaching skills when `agent-config.json.skillNames` is empty.
- Package-root shared skills at `<packageRoot>/skills/<skillName>/SKILL.md` in this first slice.
- New scoped skill-reference syntax in `skillNames`; names remain simple strings.
- Application-package-owned agent/team skill layouts unless already naturally covered by the same source-context structures without extra branching.
- UI authoring flow for creating private/team-shared skills; this ticket is backend/runtime resolution first.

## Functional Requirements

List each item with a stable `requirement_id`.

- REQ-1: Agent private single-skill layout `agents/<agentId>/SKILL.md` must be resolvable for that agent's configured `skillNames` without relying on global package-root lookup by agent id.
- REQ-2: Agent private multi-skill layout `agents/<agentId>/skills/<skillName>/SKILL.md` must be resolvable for that agent's configured `skillNames`.
- REQ-3: Team-local agent private single-skill layout `agent-teams/<teamId>/agents/<localAgentId>/SKILL.md` must be resolvable for that local agent's configured `skillNames`.
- REQ-4: Team-local agent private multi-skill layout `agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md` must be resolvable for that local agent's configured `skillNames`.
- REQ-5: Team-shared layout `agent-teams/<teamId>/skills/<skillName>/SKILL.md` must be resolvable for local agents owned by that team after agent-private locations are checked.
- REQ-6: Private/team-shared skill resolution must not merge all private skills into the global skill namespace as unqualified catalog entries.
- REQ-7: Runtime callers must use contextual configured-skill resolution for an agent definition/source context instead of only global `SkillService.getSkills(skillNames)`.
- REQ-8: Existing default/global skill directories must remain fallback resolution sources for configured `skillNames`.
- REQ-9: Missing or malformed configured private/team-shared skills must be handled consistently with current missing configured skills: warn and skip unresolved names without failing run startup.
- REQ-10: Configured skill names used for contextual private/team-shared path lookup must be validated as safe single path segments; empty, absolute, traversal, or path-separator-containing names must warn and skip.
- REQ-11: Every contextual candidate loaded from `SKILL.md` must have frontmatter `name` exactly matching the validated configured skill name; mismatches must warn and skip.

## Acceptance Criteria

List each item with a stable `acceptance_criteria_id`.

- AC-1: A packaged shared agent whose `agent-config.json.skillNames` references the name inside its colocated `SKILL.md` resolves that skill through contextual resolution.
- AC-2: A packaged shared agent whose `agent-config.json.skillNames` references two entries under its `skills/` folder resolves both skills in runtime bootstrap.
- AC-3: A packaged team-local agent whose `agent-config.json.skillNames` references the name inside its colocated `SKILL.md` resolves that skill in team-member runtime bootstrap.
- AC-4: A packaged team-local agent whose `agent-config.json.skillNames` references two entries under its private `skills/` folder resolves both skills in team-member runtime bootstrap.
- AC-5: A packaged team-local agent can resolve a configured skill from the owning team folder's `skills/` directory when no agent-private skill with that name exists.
- AC-6: Contextual resolution checks agent-private locations before team-shared locations in the documented lookup order.
- AC-7: Different agents resolve configured private skills only from their own source context and do not rely on global package-root scans.
- AC-8: Global/default skills still resolve as fallback when no matching agent-private or team-shared skill exists.
- AC-9: The global skills list does not expose agent-private/team-shared skills as ambiguous unqualified global entries unless a future contextual UI explicitly asks for them.
- AC-10: Path-like configured skill names such as `../x`, `a/b`, `a\\b`, absolute paths, `.`, `..`, or empty strings are skipped with warning behavior and are never joined into contextual filesystem paths.
- AC-11: Metadata-name mismatches in `agents/<agentId>/skills/<skillName>/SKILL.md`, `agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md`, and `agent-teams/<teamId>/skills/<skillName>/SKILL.md` are skipped and do not materialize the wrong skill.

## Constraints / Dependencies

- Existing `agent-config.json.skillNames` remains a simple string array and the authoritative binding.
- Runtime-specific Codex/Claude/native materialization already supports arrays of resolved `Skill` objects and should not be reworked beyond using the contextual resolver. Codex materialization should continue to consume resolved `Skill.rootPath` values and symlink them into the workspace `.codex/skills/` directory.
- Agent/team definition providers already know source paths; contextual skill resolution must reuse or carry that source context rather than rediscovering package layout ad hoc from runtime code.

## Assumptions

- Package authors will list private/team-shared skill names in `agent-config.json.skillNames`.
- `SKILL.md` frontmatter `name` is the configured skill name. A colocated root `SKILL.md` should only satisfy a configured name when its metadata name matches that configured name.
- Duplicate skill names across configured/default/private/team-shared skill sources are a product-excluded case for this ticket. Skill names are assumed unique, including for Codex's flat `.codex/skills/<name>` workspace representation; no special duplicate-name handling is required.
- Team-shared skills are intended for agents local to that team folder; shared/global agents referenced by a team do not automatically gain that team's shared skills unless their own configured resolution context is team-local.

## Risks / Open Questions

- If users expect automatic inference from `SKILL.md` when `skillNames` is empty, that is a separate requirement and should be decided explicitly.
- Existing tests/UI may assume colocated package `SKILL.md` appears in the global skill catalog. This ticket should deliberately move configured runtime resolution to context-aware private resolution; any global catalog behavior should be updated intentionally.
- Nested team-local teams may need the same team-shared resolution rule recursively; implementation should use the owning team source directory already resolved for the local agent.

## Requirement-To-Use-Case Coverage

- REQ-1 -> UC-1
- REQ-2 -> UC-2
- REQ-3 -> UC-3
- REQ-4 -> UC-4
- REQ-5 -> UC-5
- REQ-6 -> UC-1, UC-2, UC-3, UC-4, UC-5
- REQ-7 -> UC-1, UC-2, UC-3, UC-4, UC-5, UC-6
- REQ-8 -> UC-6
- REQ-9 -> UC-1, UC-2, UC-3, UC-4, UC-5, UC-6
- REQ-10 -> UC-1, UC-2, UC-3, UC-4, UC-5
- REQ-11 -> UC-1, UC-2, UC-3, UC-4, UC-5

## Acceptance-Criteria-To-Scenario Intent

- AC-1 validates UC-1.
- AC-2 validates UC-2.
- AC-3 validates UC-3.
- AC-4 validates UC-4.
- AC-5 validates UC-5.
- AC-6 validates documented lookup ordering.
- AC-7 validates context-bound private skill resolution without global package-root scans.
- AC-8 validates global fallback.
- AC-9 validates that private/team-shared skills do not become ambiguous global entries.
- AC-10 validates safe configured-name handling.
- AC-11 validates metadata-name matching for contextual candidates.

## Approval Status

Approved by user direction on 2026-05-31: user clarified the target layouts and requested kickoff.
