# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Backend/package input code inspection pending
- Investigation Goal: Determine whether imported agent/agent-team packages support multiple bundled skills per agent and identify the limitation/change surface.
- Scope Classification (`Small`/`Medium`/`Large`): Medium if implementation follows; current pass is investigation.
- Scope Classification Rationale: Package import touches schema/DTO validation, archive extraction, persistence, runtime exposure, and possibly UI/package authoring surfaces.
- Scope Summary: Inspect backend agent input, agent package input, package importer, skill materialization, and runtime skill configuration paths.
- Primary Questions To Resolve:
  - Does package input model skills as one root `SKILL.md`, a single `skill`, or an array/list?
  - Is a `skills/` folder scanned during package extraction/import?
  - Are agent-team package members handled differently from single-agent packages?
  - Can runtime configuration expose more than one configured skill for one agent after import?

## Request Context

User suspects a limitation: imported agent or agent-team packages include agent config and may include an agent skill, but currently appear to place `SKILL.md` directly in the root agent package. User wants to know whether an agent package supports more than one skill, for example via a `skills/` folder, because they want an agent to have two skills and may have found a limitation. User specifically directed investigation toward backend agent input and agent package input.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis/tickets/in-progress/agent-package-multiple-skills-analysis`
- Current Branch: `codex/agent-package-multiple-skills-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-31.
- Task Branch: `codex/agent-package-multiple-skills-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): likely `personal` if implementation is requested later.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is an investigation-only bootstrap unless the user requests implementation/design handoff.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-31 | Command | `git fetch origin --prune` | Refresh tracked remote before creating task worktree | Completed successfully | No |
| 2026-05-31 | Command | `git worktree add -b codex/agent-package-multiple-skills-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis origin/personal` | Create isolated investigation workspace from latest base | Worktree created at `aea805ae` | No |
| 2026-05-31 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design reference read | Authoritative boundary and shared-structure tightness principles apply if schema/import ownership needs redesign | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Pending code inspection.
- Current execution flow: Pending code inspection.
- Ownership or boundary observations: Pending code inspection.
- Current behavior summary: Pending code inspection.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior gap investigation
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Unclear pending code evidence.
- Refactor posture evidence summary: Pending code evidence.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Pending | Pending | Pending | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| Pending | Pending | Pending | Pending |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

None.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static code investigation so far.
- Required config, feature flags, env vars, or accounts: None so far.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: worktree creation commands in Source Log.
- Cleanup notes for temporary investigation-only setup: No temp files beyond durable ticket artifacts.

## Findings From Code / Docs / Data / Logs

Pending.

## Constraints / Dependencies / Compatibility Facts

Pending.

## Open Unknowns / Risks

- Whether single-agent and agent-team package imports share one parser or diverge.
- Whether runtime configured skill support is already array-shaped despite package import being single-skill-shaped.
- Whether UI/package authoring allows a `skills/` folder but backend rejects or ignores it.

## Notes For Architect Reviewer

No design handoff yet; investigation is still in progress.

## Investigation Update - 2026-05-31

### Source Log Additions

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-31 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | Inspect backend agent input shape | `CreateAgentDefinitionInput` and `UpdateAgentDefinitionInput` expose `skillNames?: string[]`, so backend agent definition input is already multi-skill by name. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts` | Inspect persisted agent config | `AgentConfigRecord.skillNames?: string[]`; normalization preserves arrays. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` and `autobyteus-server-ts/src/agent-packages/types.ts` | Inspect package import input | Import package input only has `sourceKind` and `source`; no explicit skills payload or skills folder option. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts` | Inspect package-root validation/summary | Valid package roots require `agents`, `agent-teams`, or `applications`; `skills` is not recognized as a package root capability in summary/validation. | Yes, if implementing top-level package skills support. |
| 2026-05-31 | Code | `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Trace skill discovery from agent package roots | Agent-package roots are scanned for bundled skills only at `agents/<agent-id>/SKILL.md` and `agent-teams/<team-id>/agents/<local-agent-id>/SKILL.md`; no scan of `agents/<agent-id>/skills/*` or package-root `skills/*` for imported agent package roots. | Yes, if implementing multi-bundled-skill support. |
| 2026-05-31 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts` | Trace `skillNames` resolution | `getSkills(skillNames)` iterates an array and resolves each via `getSkill`; multiple configured skills are supported once individually discoverable. | No for runtime; yes for package discovery. |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Verify runtime multi-skill consumption | Runtime bootstrap resolves all configured skills and materializers iterate all `configuredSkills`; runtime is not the one-skill bottleneck. | No |
| 2026-05-31 | Test | `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | Check intended package-root behavior | Tests cover one root `SKILL.md` per shared agent directory and one root `SKILL.md` per team-local agent directory. | Add tests for package-root `skills/*` and `agents/<agent>/skills/*` if behavior is expanded. |
| 2026-05-31 | Test | `autobyteus-server-ts/tests/integration/agent-definition/md-centric-provider.integration.test.ts` | Check relationship between bundled root skill and `agent-config.json` | Tests explicitly assert bundled root `SKILL.md` is not inferred into `skillNames`; `agent-config.json.skillNames` remains authoritative. | No |

### Current Behavior / Current Flow

- Agent package import is registry-root based:
  - GraphQL import accepts only `sourceKind` and `source`.
  - Package validation only requires at least one of `agents`, `agent-teams`, or `applications`.
  - Local or GitHub import registers the root as an additional agent package root and refreshes agent/team caches.
- Agent definition reading is config-driven:
  - Shared package agents are read from `<packageRoot>/agents/<agentId>/agent.md` and `<packageRoot>/agents/<agentId>/agent-config.json`.
  - Team-local package agents are read from `<packageRoot>/agent-teams/<teamId>/agents/<agentId>/agent.md` and `agent-config.json`.
  - `agent-config.json.skillNames` is the authoritative list; a colocated `SKILL.md` is not automatically added to the agent definition's skill names.
- Skill discovery has two different source categories:
  - Skill sources (`AUTOBYTEUS_SKILLS_PATHS` and default app-data `skills`) use `scanSkillDirectory`, which can scan a nested `skills/` directory.
  - Agent package roots (`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`) use `scanBundledSkillsFromDefinitionRoot` / `searchBundledSkillDirectory`, which only recognize root-level `SKILL.md` in shared agent folders and team-local agent folders.
- Runtime exposure is array-shaped:
  - Agent `skillNames` is an array in GraphQL and persisted config.
  - Runtime code resolves each configured name and materializes/exposes each resolved `Skill`.

### Findings From Code / Docs / Data / Logs

1. Backend agent input supports multiple skills by reference: `skillNames` is a string array in create/update inputs and in `agent-config.json`.
2. The imported package format does not currently model package-owned standalone skills as a first-class package capability. Package import input only registers a root; package summary/validation ignore `skills/`.
3. Current agent-package bundled-skill support is effectively **one discoverable bundled skill per agent directory** because the discoverable skill directory is the agent directory itself if it contains `SKILL.md`.
4. Current team-local bundled-skill support is the same pattern: one discoverable root `SKILL.md` per local agent directory under a team.
5. A package layout such as `agents/my-agent/skills/skill-a/SKILL.md` and `agents/my-agent/skills/skill-b/SKILL.md` is not scanned when the root is imported as an agent package root.
6. A package-root layout such as `skills/skill-a/SKILL.md` and `skills/skill-b/SKILL.md` is not scanned through agent package import alone. It can be discovered only if the package root, or the package root's `skills` folder, is also added as a skill source, which is a separate settings path.
7. Root `SKILL.md` does not mutate or populate `agent-config.json.skillNames`; explicit `skillNames` remains authoritative.
8. The runtime can handle more than one configured skill once those skills are resolvable by `SkillService`; the limiting layer is discovery/package layout, not Codex/Claude/native runtime consumption.
9. There is an additional identity sharp edge: `searchBundledSkillDirectory(definitionRoot, name)` maps a requested skill name to `agents/<name>` or `agent-teams/<team>/agents/<name>`. Therefore a bundled root `SKILL.md` should have a name matching its containing agent/local-agent directory if it needs to be resolved reliably through `agent-config.json.skillNames`.

### Design Health Assessment Evidence

- Change posture: Feature / behavior gap if multi-bundled-skills in agent packages is desired.
- Candidate root cause classification: Boundary or ownership issue plus shared structure looseness.
- Evidence:
  - Agent definition input and runtime are already array-shaped.
  - Agent package import/discovery treats package roots as definition roots, not as skill-source roots.
  - Skill discovery logic has two parallel directory concepts (`additional skill directories` vs `additional agent package roots`) with different scanning behavior.
- Refactor posture evidence summary: Implementation should likely be a focused refactor/extension in skill discovery and package summary/validation, not runtime bootstrap.

### Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | Backend GraphQL input/output for agent definitions | `skillNames` is `string[]` for create/update/output | Agent input is not the bottleneck. |
| `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts` | Agent config persistence shape | `AgentConfigRecord.skillNames?: string[]` | Persisted agent config already supports multiple configured skill names. |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | GraphQL import package input | Only `sourceKind/source`; no skill layout mode | Package import does not directly describe skills. |
| `autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts` | Package root validation and summary | Recognizes `agents`, `agent-teams`, `applications`, not `skills` | Top-level package skills are not first-class package resources. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Skill discovery path policy | Package roots scan only root `SKILL.md` in agent/local-agent dirs | This is the main limitation for multi-skill package layouts. |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Resolve/list skill domain objects | Resolves arrays once names are discoverable | Runtime-facing skill service can already return multiple skills. |
| `autobyteus-server-ts/src/agent-execution/backends/*` | Runtime skill exposure | Codex/Claude/native code iterate configured skills | Runtime supports multiple resolved configured skills. |

### Constraints / Dependencies / Compatibility Facts

- Existing packages may rely on colocated root `SKILL.md` in an agent directory. Any expansion should preserve that layout unless intentionally superseded.
- `agent-config.json.skillNames` is the authoritative binding between agent and skills; code/tests avoid inferring bundled skills into that list.
- The clean target should define one authoritative package skill layout instead of requiring users to import the same folder both as an agent package root and as a skill source.

### Open Unknowns / Risks

- Need product decision: Should package-owned skills live at package root (`<packageRoot>/skills/<skillName>/SKILL.md`) and be referenced by `agent-config.json.skillNames`, or should each agent own private nested skills under `agents/<agentId>/skills/<skillName>/SKILL.md`?
- If private agent-owned skills are supported, identity must avoid collisions across agents/teams because `skillNames` is currently a flat string list.
- If package-root skills are supported, package summary and validation should likely count/report package skills so users can see them in package management UI.

## Recommendation Update - 2026-05-31

Recommended target policy:

1. Support package-root shared skills as first-class agent-package content:
   - `<packageRoot>/skills/<skillName>/SKILL.md`
   - Agents in `<packageRoot>/agents/*/agent-config.json` can reference these via `skillNames`.
   - Team-local agents in `<packageRoot>/agent-teams/<teamId>/agents/*/agent-config.json` can reference these via `skillNames`.
   - This should be the primary answer for multiple skills bundled with one imported agent package because it preserves one flat skill namespace and avoids per-agent duplicate copies.

2. Preserve existing colocated root agent skill discovery:
   - `<packageRoot>/agents/<agentId>/SKILL.md`
   - `<packageRoot>/agent-teams/<teamId>/agents/<localAgentId>/SKILL.md`
   - Treat this as backward-compatible existing layout, not the recommended multi-skill layout.

3. Do not introduce per-agent private nested skill directories as the first implementation unless a separate product need requires private same-name skills:
   - `<packageRoot>/agents/<agentId>/skills/<skillName>/SKILL.md`
   - `<packageRoot>/agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md`
   - These create identity/collision questions because `agent-config.json.skillNames` is currently a flat string array, not a scoped reference shape.

4. If private nested agent/team-local skills are later required, add a scoped identity model first, for example package/agent/team-qualified references or a canonical naming convention, rather than silently merging all nested skills into the global skill namespace.

Rationale:
- Package-root shared `skills/` matches the existing standalone skill-source convention and lets one package provide reusable skill assets for many packaged agents/teams.
- It fixes the user's multi-skill use case without changing runtime, because runtime already accepts multiple resolved skills.
- It keeps `agent-config.json.skillNames` authoritative and avoids implicit inference from directory presence.
- It avoids ambiguous ownership when two agents in one package both define `skills/research/SKILL.md` with different content.

## Requirement Refinement - 2026-05-31 - Agent-private skills

User clarified that agent-private skills are important and should be supported as first-class package content. Revised recommendation:

1. Support agent-private skills as the primary multi-skill layout for packaged agents:
   - Shared package agent private skills:
     - `<packageRoot>/agents/<agentId>/skills/<skillName>/SKILL.md`
   - Team-local agent private skills:
     - `<packageRoot>/agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md`

2. Private skill resolution must be context-aware, not global-only:
   - `agent-config.json.skillNames` remains the authoritative configured list.
   - When resolving skills for one agent, look in that agent's own `skills/<skillName>` directory first.
   - Then optionally resolve package-root shared skills, existing colocated root `SKILL.md`, and global skill sources according to a documented precedence order.
   - Do not scan all agent-private skills into the global skill catalog as plain unqualified names, because two agents can validly have private skills with the same `skillName`.

3. Support package-root shared skills as a complementary layout, not a replacement for private skills:
   - `<packageRoot>/skills/<skillName>/SKILL.md`
   - Useful for skills intentionally shared by multiple agents/teams in one package.

4. Preserve existing colocated root single-skill layout for compatibility:
   - `<packageRoot>/agents/<agentId>/SKILL.md`
   - `<packageRoot>/agent-teams/<teamId>/agents/<localAgentId>/SKILL.md`

5. Main design implication:
   - Current runtime calls `SkillService.getSkills(agentDefinition.skillNames)` without source context. Supporting private skills correctly requires a contextual resolver such as `resolveConfiguredSkillsForAgent(agentDefinition)` or passing agent source paths into skill resolution.
   - The resolver owner should know how to derive the agent's package/team/application source directory and apply private/shared/global precedence.

Recommended precedence for initial implementation:
1. Agent-private skill folder for the exact agent source directory.
2. Package-root shared `skills/<skillName>` for the package/root that owns the agent, when applicable.
3. Existing colocated root `SKILL.md` layout if the configured name maps to that agent's colocated skill.
4. Global/default/additional skill sources.

Open design point: whether existing global `listSkills()` should display private skills. Recommendation: do not list agent-private skills as global catalog entries unless displayed in an agent detail context with qualified ownership metadata.

## Final Requirement Lock - 2026-05-31

User clarified the first implementation slice:

- If a packaged agent has one private skill, keep `SKILL.md` directly in that agent folder:
  - `agents/<agentId>/SKILL.md`
  - `agent-teams/<teamId>/agents/<localAgentId>/SKILL.md`
- If a packaged agent has multiple private skills, use an agent-local `skills/` folder:
  - `agents/<agentId>/skills/<skillName>/SKILL.md`
  - `agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md`
- For agent teams, support team-shared skills in the team folder:
  - `agent-teams/<teamId>/skills/<skillName>/SKILL.md`

This supersedes the earlier package-root shared-skill-first recommendation. Package-root shared skills (`<packageRoot>/skills/<skillName>/SKILL.md`) are now out of scope for the first slice. The design should focus on contextual agent-private and team-shared skill resolution.

Important locked assumptions for design:

- `agent-config.json.skillNames` remains authoritative; this ticket does not infer configured skills from files when `skillNames` is empty.
- Context-aware resolution is required because source context is needed to find agent-local and team-local skill folders; duplicate skill names are now product-excluded by user clarification.
- Runtime backends already accept arrays of resolved skills; the new owner should be a contextual configured-skill resolver or a new `SkillService` boundary method, with runtime callers switched to that boundary.

## Design Review Response - 2026-05-31 - Round 1 Findings

Architecture reviewer returned `Design Impact` findings in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis/tickets/in-progress/agent-package-multiple-skills-analysis/design-review-report.md`.

Revisions applied:

- `AR-DI-001` response:
  - Design now explicitly decommissions global package-root bundled scans from `SkillService.getSkill`, `SkillService.listSkills`, `findSkillLocation`, `searchDirectoryRecursive`, `scanSkillDirectory`, `searchBundledSkillDirectory`, and `scanBundledSkillsFromDefinitionRoot`.
  - Target global lookup/listing is true global-only: default skills dir and explicit additional skill dirs only, with direct skill dirs and nested `skills/` dirs allowed as standalone skill-source shapes.
  - Contextual private/team-shared resolution must not call any helper that can scan another agent or team's package-private paths.
  - Test guidance now explicitly covers AC-9 and cross-agent/private leakage prevention.

- `AR-DI-002` response:
  - Design now requires configured skill names to be trimmed then accepted/rejected as safe single path segments before path construction.
  - Rejected names include empty, absolute, `.`, `..`, path-separator-containing, traversal, and multi-segment values.
  - Every contextual candidate must be loaded and checked with `Skill.name === configuredName`, including agent-private folders and team-shared folders, not only colocated root `SKILL.md`.
  - Requirements were refined with `REQ-10`, `REQ-11`, `AC-10`, and `AC-11` for safe names and metadata matching.

Updated artifacts:
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis/tickets/in-progress/agent-package-multiple-skills-analysis/requirements.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-multiple-skills-analysis/tickets/in-progress/agent-package-multiple-skills-analysis/design-spec.md`

## User Follow-up Analysis - 2026-05-31 - Codex Skill Materializer Impact

User asked whether the latest private/team-shared skill design affects Codex runtime skill materialization, then clarified that duplicate skill names should not be considered for this ticket. Product constraint: skill names are unique across configured/default/private/team-shared sources, including Codex's flat `.codex/skills/<name>` representation. No same-name collision special case is required.

Relevant current code checked:

- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
  - Bootstrap resolves agent definition, calls `skillService.resolveConfiguredSkillsForAgent(agentDefinition)`, then passes resolved `Skill[]` to `prepareWorkspaceSkills`.
  - Existing discoverable-skill preflight is name-based; under the unique-name product constraint this remains acceptable.
- `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts`
  - Materializes each configured `Skill` by symlinking `path.resolve(skill.rootPath)` into `<workingDirectory>/.codex/skills/<sanitizedSkillName>`.
  - This already works for contextual skill roots such as `agents/<agentId>/skills/<skillName>`, colocated `agents/<agentId>`, or `agent-teams/<teamId>/skills/<skillName>` once the resolver returns the correct `Skill.rootPath`.
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts`
  - Existing tests cover symlink materialization and cleanup behavior.

Conclusion:

- No extra Codex materializer design is needed beyond switching Codex bootstrap to contextual skill resolution.
- Codex should follow the normal path: resolved `Skill[]` -> `CodexWorkspaceSkillMaterializer` -> `.codex/skills/<sanitizedSkillName>` symlink.
- Do not add duplicate-name/collision/source-disambiguation requirements for Codex in this ticket.

Design/requirements updates applied after clarification:

- Removed the prior `REQ-12`/`AC-12` source-aware Codex preflight addendum.
- Removed DS-005 and Codex same-name collision guidance from the design spec.
- Added an explicit assumption that duplicate skill names are product-excluded and no special duplicate-name handling is required.
