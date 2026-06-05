# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Agent package skill authoring currently supports two agent-owned private skill layouts:

- single/colocated: `agents/<agent-id>/SKILL.md` or `agent-teams/<team-id>/agents/<agent-id>/SKILL.md`
- foldered/multi-skill: `agents/<agent-id>/skills/<skill-name>/SKILL.md` or `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`

This distinction creates unnecessary mental overhead and makes absolute skill-root pinning less predictable. The requirement is a clean-cut layout simplification: every agent-owned package skill must live under the owning agent's `skills/<skill-name>/` folder, even when the agent has only one skill. Root-level agent `SKILL.md` is not a supported package skill layout and must not be kept as a legacy fallback.

## Investigation Findings

- Runtime configured skill resolution is owned by `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` through `SkillService.resolveConfiguredSkillsForAgent(...)`.
- The current resolver first checks `<agentDirPath>/skills/<skillName>/SKILL.md`, then falls back to `<agentDirPath>/SKILL.md`, then checks the owning team shared skill folder, then global skills. The second step is the root-level legacy path to remove.
- Package skill catalog discovery is owned by `autobyteus-server-ts/src/skills/services/skill-discovery.ts`. `getAgentSkillDirectories(...)` currently adds an agent directory itself when that directory contains `SKILL.md`, then adds skill directories under `agentDir/skills/`. The direct agent-dir scan is the catalog legacy path to remove.
- Runtime consumers such as native AutoByteus, Codex, and Claude consume resolved `Skill.rootPath` values and do not need package-layout-specific branching once the resolver returns canonical skill roots.
- Durable tests and docs currently encode the two-layout model and must be updated to the single canonical model.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift / Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Current code lets the same agent directory be both an agent definition folder and a skill root. That mixes responsibilities and forces callers/authors to remember one-skill versus many-skills behavior.
- Requirement or scope impact: Remove root-level agent skill support from runtime resolution and catalog discovery. Do not add compatibility warnings, migrations, dual reads, or fallback branches for old root-level `SKILL.md` package skills.

## Recommendations

- Adopt this canonical package-contained agent-owned skill invariant:

  ```text
  <agent-dir>/skills/<skill-name>/SKILL.md
  ```

- Keep `agent-config.json.skillNames` as the explicit runtime attachment contract; each configured name must match the corresponding `SKILL.md` frontmatter `name`.
- Keep team-shared package skills supported under:

  ```text
  <team-dir>/skills/<skill-name>/SKILL.md
  ```

- Keep configured/global skill directory behavior unchanged for standalone skill sources.
- Update tests to prove root-level agent `SKILL.md` is ignored/not resolved, not tolerated as legacy behavior.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A shared/package-owned agent has one private skill under `agents/<agent-id>/skills/<skill-name>/SKILL.md`; runtime resolves that exact skill root.
- UC-002: A shared/package-owned agent has multiple private skills under `agents/<agent-id>/skills/<skill-name>/SKILL.md`; runtime resolves each configured skill name in order.
- UC-003: A team-local agent has one or more private skills under `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`; runtime resolves those exact roots.
- UC-004: A team-local agent uses an owning-team shared skill under `agent-teams/<team-id>/skills/<skill-name>/SKILL.md`; runtime still resolves that after agent-private canonical folders miss.
- UC-005: A configured skill not present in the agent/team context still falls back to configured/global skill directories.
- UC-006: The Skills catalog exposes package-contained skills from canonical `skills/<skill-name>` folders and omits root-level agent `SKILL.md` files.
- UC-007: Codex, Claude, and native AutoByteus runtime setup consume canonical `Skill.rootPath` values without package-layout-specific compatibility branches.

## Out of Scope

- Manual migration of external/private agent package files. Package authors can move existing root-level `SKILL.md`, `templates/`, `references/`, `scripts/`, and related skill-local assets into `skills/<skill-name>/` and reload packages outside this ticket.
- Backward compatibility for root-level agent `SKILL.md`.
- Import-time mutation of user package folders.
- New package schema/versioning machinery.
- Changing logical skill name syntax or `agent-config.json.skillNames` semantics.
- Changing standalone/global skill source discovery behavior.

## Functional Requirements

- FR-001: Runtime configured skill resolution must resolve agent-owned package skills only from `<agentDirPath>/skills/<skillName>/SKILL.md`.
- FR-002: Runtime configured skill resolution must not check or load `<agentDirPath>/SKILL.md` for shared/package-owned or team-local agents.
- FR-003: Runtime configured skill resolution must preserve the existing configured-name safety validation and frontmatter name-match validation for canonical contextual candidates.
- FR-004: Runtime configured skill resolution must preserve owning-team shared skill fallback from `<teamDirPath>/skills/<skillName>/SKILL.md` for team-local agents.
- FR-005: Runtime configured skill resolution must preserve configured/global skill-directory fallback after contextual canonical candidates miss.
- FR-006: Package bundled skill catalog discovery must scan shared-agent and team-local-agent private skills only from each agent's `skills/<skill-name>/SKILL.md` folders.
- FR-007: Package bundled skill catalog discovery must not expose root-level agent `SKILL.md` as a bundled package skill.
- FR-008: Team-shared package skills under `<teamDirPath>/skills/<skillName>/SKILL.md` must remain catalog-visible.
- FR-009: Native AutoByteus runtime config, Codex workspace materialization, and Claude workspace materialization must receive/use canonical `Skill.rootPath` values returned by the resolver without adding layout compatibility branches.
- FR-010: Durable tests must cover canonical single-skill and multi-skill package layouts and must prove root-level agent `SKILL.md` is not supported.
- FR-011: Durable project documentation must describe only the canonical package-contained agent-owned skill layout, plus unchanged team-shared/global behavior.

## Acceptance Criteria

- AC-001: Given an agent with `agent-config.json.skillNames: ["tone"]` and `agents/writer/skills/tone/SKILL.md` whose frontmatter name is `tone`, `SkillService.resolveConfiguredSkillsForAgent(...)` returns a `Skill` with `rootPath === path.resolve("agents/writer/skills/tone")`.
- AC-002: Given an agent with `agent-config.json.skillNames: ["tone"]` and only `agents/writer/SKILL.md`, `SkillService.resolveConfiguredSkillsForAgent(...)` does not return that root skill and instead follows the existing missing-skill warning/skip behavior unless a team/global fallback exists.
- AC-003: Given a package definition root containing only `agents/writer/SKILL.md`, `SkillService.listSkills()` and `SkillService.getSkill(...)` do not expose that root-level skill as a package bundled skill.
- AC-004: Given a package definition root containing `agents/writer/skills/tone/SKILL.md`, the Skills catalog exposes `tone` with `rootPath === path.resolve("agents/writer/skills/tone")`.
- AC-005: Given a team-local agent with `agent-teams/review/agents/reviewer/skills/private-tone/SKILL.md`, runtime resolution returns the canonical private skill root.
- AC-006: Given a team-local agent with no matching private skill and an owning-team shared skill at `agent-teams/review/skills/shared-rubric/SKILL.md`, runtime resolution still returns the team-shared skill.
- AC-007: Given no contextual canonical match and a configured global skill with the same logical name, runtime resolution still returns the global skill.
- AC-008: Codex package-private skill materialization symlinks `.codex/skills/<skill-name>` to the canonical package source root under `skills/<skill-name>`, including the single-skill case.
- AC-009: Native AutoByteus receives `AgentConfig.skills` paths pointing to canonical package skill roots under `skills/<skill-name>`, including the single-skill case.
- AC-010: Existing root-level private skill test fixtures are removed or rewritten to canonical layout; any remaining root-level agent `SKILL.md` fixture exists only as an explicit negative/unsupported-layout assertion.
- AC-011: Documentation no longer presents `agents/<agent-id>/SKILL.md` or `agent-teams/<team-id>/agents/<agent-id>/SKILL.md` as supported package-contained agent-owned skill layouts.

## Constraints / Dependencies

- No backward compatibility path, migration layer, dual resolver branch, or root-level fallback should remain for package-contained agent-owned skills.
- `SkillLoader` should remain a generic loader for any explicit skill root; it should not gain package-context policy.
- Global standalone skill source discovery must remain able to load normal skill folders such as `<skills-root>/<skill-name>/SKILL.md`.
- Runtime materializers must continue validating that the resolved `Skill.rootPath` contains `SKILL.md`.
- Package import/reload should not mutate user-owned local package folders.

## Assumptions

- Existing package authors can migrate filesystem layouts manually and reload packages.
- `agent-config.json.skillNames` remains the authoritative list of attached skills; presence of any `SKILL.md` file does not auto-attach a skill.
- Root-level agent `SKILL.md` files may physically exist in user folders after this change, but they are unsupported and should be ignored by catalog discovery and runtime contextual resolution.

## Risks / Open Questions

- Risk: Existing external packages using root-level `SKILL.md` will stop resolving until migrated. This is accepted by requirement and should not be mitigated with legacy fallback.
- Risk: Docs in separate package repositories may remain stale if not migrated alongside app code; this ticket should update only durable docs in this repository unless implementation scope is explicitly expanded.
- Open question: none for design; implementation should verify exact affected tests with targeted unit and E2E coverage.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| FR-001 | UC-001, UC-002, UC-003 |
| FR-002 | UC-001, UC-002, UC-003, UC-006 |
| FR-003 | UC-001, UC-002, UC-003 |
| FR-004 | UC-004 |
| FR-005 | UC-005 |
| FR-006 | UC-006 |
| FR-007 | UC-006 |
| FR-008 | UC-004, UC-006 |
| FR-009 | UC-007 |
| FR-010 | UC-001 through UC-007 |
| FR-011 | UC-001 through UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Positive runtime resolution for canonical shared-agent single skill. |
| AC-002 | Negative runtime assertion that root-level agent `SKILL.md` is unsupported. |
| AC-003 | Negative catalog assertion that root-level agent `SKILL.md` is unsupported. |
| AC-004 | Positive catalog discovery for canonical shared-agent private skill. |
| AC-005 | Positive runtime resolution for canonical team-local private skill. |
| AC-006 | Regression guard for team-shared skill fallback. |
| AC-007 | Regression guard for global skill fallback. |
| AC-008 | Codex runtime materialization uses canonical roots. |
| AC-009 | Native AutoByteus runtime config uses canonical roots. |
| AC-010 | Test suite no longer encodes root-level private skill support. |
| AC-011 | Durable docs align with the canonical no-legacy layout. |

## Approval Status

Approved as design input. User confirmed on 2026-06-05 that the requirement is clear, explicitly rejected legacy fallback, and asked to kick off the ticket.
