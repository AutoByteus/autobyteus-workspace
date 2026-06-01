# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; no code changed.
- Investigation Goal: Determine why private skills from imported agent packages are not included in the Skills page inventory after recent refactoring.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The behavior spans frontend Skills page query path, backend GraphQL/API service path, agent-package import/definition source paths, and runtime configured-skill resolution.
- Scope Summary: Skills page now queries only the global skill catalog (`SkillService.listSkills()`), while package-private/team-shared skills were moved behind contextual runtime resolution (`ConfiguredAgentSkillResolver`).
- Primary Questions Resolved:
  - Which backend/frontend path populates the Skills page? `autobyteus-web/pages/skills.vue` -> `SkillsList.vue` -> `skillStore.fetchAllSkills()` -> GraphQL `skills` -> `SkillService.listSkills()`.
  - Which path imports and indexes package-origin skills? Agent packages are registered through `AgentPackageService`; agent definitions keep `sourceInfo.agentDirPath`/`teamDirPath`; runtime resolves configured skills through `SkillService.resolveConfiguredSkillsForAgent()` and `ConfiguredAgentSkillResolver`.
  - Where did recent refactoring change source set/filter semantics? Commit `716a570374c4e86abab8bd53ab9555f2c4aaed15` removed package/definition-root bundled skill scanning from the global skill catalog and added context-bound runtime resolution.
  - Why do agent definitions still show package skills? The detail page displays `agentDef.skillNames` from `agent-config.json`, not the Skills page catalog; runtime can still resolve those names contextually.

## Request Context

User reports that the Skills page currently does not include private skills from imported agent packages. Previously, after importing an agent package, unloaded skills and package skills were visible on the Skills page. Screenshots show the Skills page listing personal skills such as `bilingual-style-article-writer`, `deep-research-article`, `pdf`, etc., while the agent/team-member detail page still shows `solution-designer` assigned as a skill.

Reference images supplied by user:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_0049e625/solution_designer_13cd9a56bd9bad67/context_files/ctx_d9749de6f4b9__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_0049e625/solution_designer_13cd9a56bd9bad67/context_files/ctx_4046779427cd__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_0049e625/solution_designer_13cd9a56bd9bad67/context_files/ctx_f7a8af64ac26__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-private-skills-page-regression`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-package-private-skills-page-regression`
- Current Branch: `codex/agent-package-private-skills-page-regression`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-private-skills-page-regression`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-01.
- Task Branch: `codex/agent-package-private-skills-page-regression` from `origin/personal` at `fb22bc830cdbf78764fef6fc1a47ffd297812149`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): Not specified; likely `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The root superrepo is the active repo; relevant app code is under `autobyteus-web` and `autobyteus-server-ts`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-01 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repo context | Main checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, branch `personal`, tracking `origin/personal`. | No |
| 2026-06-01 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task worktree creation | Completed successfully. | No |
| 2026-06-01 | Command | `git worktree add -b codex/agent-package-private-skills-page-regression /Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-private-skills-page-regression origin/personal` | Create dedicated task workspace | Dedicated branch/worktree created from `origin/personal`. | No |
| 2026-06-01 | Command | `git status --short --branch && git rev-parse HEAD && git branch --show-current` | Verify dedicated worktree | Branch `codex/agent-package-private-skills-page-regression` at `fb22bc830cdbf78764fef6fc1a47ffd297812149`, tracking `origin/personal`. | No |
| 2026-06-01 | Code | `autobyteus-web/pages/skills.vue` | Find Skills page entrypoint | Page renders `SkillsList` and reads `skillStore.skills`; it does not add package-specific data. | No |
| 2026-06-01 | Code | `autobyteus-web/stores/skillStore.ts:52-69` and `autobyteus-web/graphql/skills.ts` | Trace frontend data query | `fetchAllSkills()` runs GraphQL `GET_SKILLS` with `skills { ... }`; no frontend filter excludes package skills. | No |
| 2026-06-01 | Code | `autobyteus-server-ts/src/api/graphql/types/skills.ts:189-194` | Trace GraphQL resolver | GraphQL `skills` returns `SkillService.getInstance().listSkills()`. | No |
| 2026-06-01 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts:70-114` | Trace catalog owner | Current catalog lookup is explicitly named `findGlobalSkillLocation` and `listSkills()` scans only `getAllSkillDirectories(config)`, not agent package roots. | No |
| 2026-06-01 | Code | `autobyteus-server-ts/src/skills/services/skill-discovery.ts:22-84` | Inspect scanner semantics | Scanner only checks direct child skill dirs and a nested literal `skills/` folder. It does not recurse into package `agents/` or `agent-teams/*/agents/` layouts. | No |
| 2026-06-01 | Code | `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts:42-145` | Trace runtime package-skill resolution | Runtime resolver resolves `agentDir/skills/<name>`, colocated `agentDir/SKILL.md`, and `teamDir/skills/<name>` before global fallback. | No |
| 2026-06-01 | Code | `autobyteus-web/components/agents/AgentDefinitionDetailSections.vue:27-35` | Explain why detail page still shows `solution-designer` | Agent detail renders raw `agentDef.skillNames`, not resolved `Skill` catalog rows. | No |
| 2026-06-01 | Command | `git show --unified=100 716a5703 -- autobyteus-server-ts/src/skills/services/skill-service.ts autobyteus-server-ts/src/skills/services/skill-discovery.ts ...` | Identify regression/refactor commit | Commit `716a5703` removed `getAllDefinitionRoots`, `searchBundledSkillDirectory`, and `scanBundledSkillsFromDefinitionRoot` from global lookup/listing and introduced `ConfiguredAgentSkillResolver`. | No |
| 2026-06-01 | Command | `git show 716a5703^:autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Verify previous behavior | Parent commit had scanner functions for `agents/<name>/SKILL.md` and `agent-teams/<team>/agents/<name>/SKILL.md`, and `SkillService.listSkills()` added `scanBundledSkillsFromDefinitionRoot()` for package roots. | No |
| 2026-06-01 | Code | `autobyteus-web/docs/skills.md:16-19`, `autobyteus-web/docs/settings.md:231-234` | Check documented current product behavior | Docs now explicitly state package-private/team-shared skills are runtime contextual and not listed on Skills page/global catalog. | No |
| 2026-06-01 | Code | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts:735-741`, `918-922` | Check durable validation | E2E tests now assert private and team-shared package skills are absent from GraphQL `skills` and `skill(name:)`, while runtime resolution works. | No |
| 2026-06-01 | Data | `/Users/normy/.autobyteus/server-data/.env` | Inspect current user configuration | `AUTOBYTEUS_SKILLS_PATHS=/Users/normy/autobyteus_org/autobyteus-agents,/Users/normy/.codex/skills`; `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-private-agents,/Users/normy/autobyteus_org/autobyteus-agents`. | No |
| 2026-06-01 | Data | `/Users/normy/.autobyteus/server-data/agent-packages/registry.json` | Confirm package import registration | `autobyteus-agents` and `autobyteus-private-agents` are registered as local agent packages. | No |
| 2026-06-01 | Data | `find /Users/normy/autobyteus_org/autobyteus-agents -path '*/SKILL.md'` | Confirm package skill layout | `solution-designer` exists at `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md`. | No |
| 2026-06-01 | Probe | Python script emulating current `scanSkillDirectory` for `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/.codex/skills` | Reproduce why screenshot only shows personal skills | Current scan returns count `0` for `/Users/normy/autobyteus_org/autobyteus-agents`; returns the 10 visible `~/.codex/skills` entries including `software-tutorial-video-maker`, but not `solution-designer`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User-visible Skills page at `/skills`.
- Current execution flow:
  1. `pages/skills.vue` renders `SkillsList`.
  2. `SkillsList.vue` calls `skillStore.fetchAllSkills()` on mount.
  3. `skillStore.fetchAllSkills()` executes GraphQL query `GET_SKILLS`.
  4. GraphQL `SkillResolver.skills()` returns `SkillService.listSkills()`.
  5. `SkillService.listSkills()` scans only default skills dir and `AUTOBYTEUS_SKILLS_PATHS` directories through `scanSkillDirectory()`.
  6. `scanSkillDirectory()` only loads direct child folders containing `SKILL.md` and nested literal `skills/` trees. It does not scan `agents/` or `agent-teams/*/agents/` layouts.
- Ownership or boundary observations:
  - The Skills page is currently governed by the global skill catalog owner (`SkillService.listSkills()`), not by agent package import or agent-definition source ownership.
  - Runtime package skills are governed by `ConfiguredAgentSkillResolver`, which requires an owning agent/team source context.
- Current behavior summary: Imported package skills still travel with agent definitions and resolve at runtime, but they are intentionally invisible to global catalog APIs and therefore invisible to the Skills page.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / behavior regression relative to user expectation.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with a product behavior change in `716a5703`.
- Refactor posture evidence summary: The previous global catalog mixed package-root bundled skill discovery with standalone skill-source discovery. The refactor introduced a clearer contextual runtime boundary but removed the package-skill inventory path that the Skills page depended on.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Skills page shows personal/global skills only; agent detail still shows `solution-designer`. | Confirms separation between global skill catalog and agent config display. | No |
| `SkillResolver.skills()` | Uses only `SkillService.listSkills()`. | Missing package skills must be fixed in service/catalog source, not frontend card rendering. | If fixing, update backend API/service. |
| `SkillService.listSkills()` | Scans only `getAllSkillDirectories()`. | Agent package roots are no longer an input to global list. | Restore definition-root/package-root discovery into the normal SkillService catalog. |
| `ConfiguredAgentSkillResolver` | Resolves private/team skills only with `sourceInfo`. | Runtime path was preserved but page catalog visibility was removed. | Keep runtime resolver but restore normal catalog discovery separately. |
| Commit `716a5703` | Removed global bundled scanning and added context resolver/tests. | Recent refactoring is the direct cause of the changed Skills page behavior. | Decide whether product should restore page visibility. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/skills.vue` | Skills route shell | Renders `SkillsList`; no package-specific filtering. | Not root cause. |
| `autobyteus-web/components/skills/SkillsList.vue` | Search/list UI | Displays store `skills`; only filters by search text. | Not root cause. |
| `autobyteus-web/stores/skillStore.ts` | Frontend skills data store | `fetchAllSkills()` uses GraphQL `skills`. | Missing data originates upstream. |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | GraphQL skills resolver | `skills()` delegates to `SkillService.listSkills()`. | Backend catalog API is the page authority. |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Global skill catalog + runtime configured skill resolver facade | `listSkills()` and `getSkill()` are now global-only; runtime contextual resolution is separate. | Boundary split is the direct behavior change. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Global skill-source directory scanning | Does not scan agent package definition layouts. | Cannot discover `agent-teams/.../agents/.../SKILL.md`. |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Runtime/contextual configured skill resolution | Loads private/team package skills using `sourceInfo`. | Explains why agent runs still work. |
| `autobyteus-web/components/agents/AgentDefinitionDetailSections.vue` | Agent detail rendering | Shows `agentDef.skillNames` raw names. | Explains screenshot mismatch. |
| `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Actual package skill file | File exists in package layout. | Missing from page because scanner excludes this layout. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-01 | Probe | Python script emulating current `scanSkillDirectory()` over configured skill paths | `/Users/normy/autobyteus_org/autobyteus-agents` produced 0 skills; `/Users/normy/.codex/skills` produced the 10 visible screenshot skills and omitted `solution-designer`. | The current scanner logic reproduces the user-visible missing package skill. |
| 2026-06-01 | Git history probe | `git show 716a5703^:autobyteus-server-ts/src/skills/services/skill-discovery.ts` vs current | Parent had package/definition-root scan helpers; current does not. | Regression source is the refactor, not data corruption. |

## External / Public Source Findings

None.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static root-cause confirmation.
- Required config, feature flags, env vars, or accounts: Existing `/Users/normy/.autobyteus/server-data/.env` includes `AUTOBYTEUS_SKILLS_PATHS` and `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` pointing at `autobyteus-agents`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The frontend Skills page is data-passive. It asks for all backend `skills` and displays the result.
2. The backend `skills` GraphQL query is global-catalog-only because it delegates to `SkillService.listSkills()`.
3. Current `SkillService.listSkills()` no longer includes agent package roots or definition roots. It scans only `getSkillsDir()` and `getAdditionalSkillsDirs()`.
4. Current `scanSkillDirectory()` does not scan package definition layouts. Adding `/Users/normy/autobyteus_org/autobyteus-agents` to `AUTOBYTEUS_SKILLS_PATHS` is insufficient because the package skills sit under `agents/<agent-id>/SKILL.md` or `agent-teams/<team-id>/agents/<agent-id>/SKILL.md`, not as direct children with `SKILL.md` under the skill source root.
5. Commit `716a5703` is the recent refactor that changed behavior. It removed global bundled-skill discovery and introduced `ConfiguredAgentSkillResolver` for context-bound runtime resolution.
6. The current docs and E2E tests explicitly encode the new hidden-from-global-catalog behavior. This means the present behavior is not an accidental frontend filter; it is an intentional or accidentally-overcorrected backend product/design change.

## Constraints / Dependencies / Compatibility Facts

- Existing personal/global skills in `/Users/normy/.codex/skills` must continue to appear.
- Agent/team-member detail and runtime skill composition must continue resolving package-assigned skills.
- User clarified that restoring original normal catalog behavior is the explicit product decision, even if package/private skills become name-resolvable through the normal skill catalog again.
- Current tests assert non-visibility; implementation must update these tests and docs, and add E2E validation for restored visibility.

## Open Unknowns / Risks

- Duplicate skill names across package/private/global scopes remain name-only; user accepted restoring the simple original behavior. The implementation should preserve deterministic first-seen de-duplication.
- Restoring `getSkill(name)` package lookup reintroduces normal name-based access to bundled package skills, as before the refactor. This is now accepted product behavior.
- E2E coverage must guard against future refactors removing package-root discovery from the normal Skills page path again.

## Notes For Architect Reviewer

Superseded by the user clarification below: the earlier separate read-only catalog design is no longer the target. Review should focus on restoring normal `SkillService` bundled discovery with current package layout support and mandatory E2E coverage.

## User Clarification / Revised Requirement Decision

On 2026-06-01, after discussing the architecture reviewer's preliminary read-only concern, the user clarified the product requirement:

- Do not introduce a separate strict view-only package skill catalog.
- Restore the original behavior where package/private skills appear as normal entries in the Skills page.
- Existing edit/view behavior can remain as-is; the dominant use case is viewing, but there is no product objection to editing if the underlying files/workspace allow it.
- The restored discovery must include current package layouts:
  - `agents/<agent-id>/SKILL.md`
  - `agents/<agent-id>/skills/<skill-name>/SKILL.md`
  - `agent-teams/<team-id>/agents/<agent-id>/SKILL.md`
  - `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`
  - `agent-teams/<team-id>/skills/<skill-name>/SKILL.md`
- End-to-end validation must explicitly test that imported package skills appear in the Skills area and can be opened/viewed.

This supersedes the earlier proposed separate read-only `SkillCatalogService` design direction. The target design is now a simpler restoration: reintroduce package/definition-root bundled skill scanning into the normal `SkillService` catalog, extended for the newer multi-skill folder layouts.

