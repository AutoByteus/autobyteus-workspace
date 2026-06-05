# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Design investigation complete
- Investigation Goal: Identify current root-level versus `skills/<skill-name>` package skill handling and define the clean-cut removal path for colocated root skills.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Behavior spans package skill discovery, configured runtime resolution, tests, runtime-facing docs, and package authoring docs, but the target model is a narrow filesystem-layout simplification.
- Scope Summary: Make `skills/<skill-name>/SKILL.md` the only supported agent-owned package skill layout; remove root-level agent `SKILL.md` support with no legacy fallback.
- Primary Questions To Resolve:
  - Which runtime and catalog paths currently support root-level agent `SKILL.md`?
  - Which docs/tests/examples encode root-level agent skill support?
  - What must remain unchanged for global skills and team-shared skills?

## Request Context

The user confirmed that colocated root agent skills should not remain as a legacy path. The desired invariant is: whether an agent has one skill or many, every agent-owned skill lives under `skills/<skill-name>/SKILL.md`, and the skill folder name matches the logical skill name. The user explicitly rejected adding legacy/compatibility behavior because it would make the code structure ugly and harder to maintain.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/canonical-agent-skill-folders`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/canonical-agent-skill-folders/tickets/canonical-agent-skill-folders`
- Current Branch: `codex/canonical-agent-skill-folders`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/canonical-agent-skill-folders`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-06-05; `origin/personal` at `bd4803d457a1a0ba681cc2b7ccac63486f677a34`.
- Task Branch: `codex/canonical-agent-skill-folders`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The user's main checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated uncommitted changes (`index.html`, `test.txt`); all ticket work must remain in the dedicated task worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-05 | Command | `git rev-parse --show-toplevel && git branch --show-current && git status --short --branch && git remote show origin ... && git worktree list --porcelain` | Bootstrap repository/worktree state | Main checkout on `personal` with unrelated uncommitted files; no existing dedicated worktree for this task. | No |
| 2026-06-05 | Command | `git fetch origin personal --prune && git rev-parse origin/personal` | Refresh tracked base branch before worktree creation | Fetch succeeded; `origin/personal` at `bd4803d457a1a0ba681cc2b7ccac63486f677a34`. | No |
| 2026-06-05 | Command | `git worktree add -b codex/canonical-agent-skill-folders /Users/normy/autobyteus_org/autobyteus-worktrees/canonical-agent-skill-folders origin/personal` | Create mandatory dedicated task worktree/branch | Dedicated task branch/worktree created cleanly. | No |
| 2026-06-05 | Command | `rg -n "colocated\|root private\|root skill\|agent colocated\|agents/<agent-id>/SKILL\|isSkillDirectory\(agentDir\)" autobyteus-server-ts docs README.md scripts applications -S --glob '!node_modules' --glob '!**/dist/**'` | Find root-level agent skill support and docs/tests | Found active root support in `configured-agent-skill-resolver.ts` and `skill-discovery.ts`, plus root-layout docs and tests. | Yes: remove/update these references. |
| 2026-06-05 | Code | `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Inspect runtime configured skill resolution owner | Resolver checks `agentDirPath/skills/<configuredName>` then `agentDirPath` as `agent colocated root skill`, then `teamDirPath/skills/<configuredName>`, then global fallback. | Yes: remove `agentDirPath` root candidate. |
| 2026-06-05 | Code | `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Inspect package bundled skill catalog discovery | `getAgentSkillDirectories(...)` adds `agentDir` itself when `isSkillDirectory(agentDir)` then adds `agentDir/skills/*`. Same function is used for shared agents and team-local agents. | Yes: remove direct `agentDir` scan; keep `agentDir/skills/*` and team `skills/*`. |
| 2026-06-05 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts` | Inspect catalog/runtime boundary | `SkillService.listSkills()` and `getSkill(name)` use `scanBundledSkillsFromDefinitionRoot(...)`/`searchBundledSkillDirectory(...)`; `resolveConfiguredSkillsForAgent(...)` delegates to `ConfiguredAgentSkillResolver`. | Yes: no direct code change expected here unless names/comments need tightening. |
| 2026-06-05 | Code | `autobyteus-server-ts/src/skills/loader.ts` and `autobyteus-server-ts/src/skills/domain/models.ts` | Check skill root abstraction | `SkillLoader` loads any explicit directory containing `SKILL.md`; `Skill.rootPath` is an opaque resolved skill root. No package-specific layout policy belongs here. | No code change expected. |
| 2026-06-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Inspect native runtime skill consumption | Native AutoByteus builds `AgentConfig.skills` from `skillService.resolveConfiguredSkillsForAgent(agentDef)` returned `Skill.rootPath` values. | No direct layout logic change expected; tests must expect canonical paths. |
| 2026-06-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` and `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Inspect runtime materializer layout dependencies | Materializers symlink the already-resolved `Skill.rootPath` and only assert `SKILL.md` exists at that root. They should remain layout-agnostic. | No code change expected; docs/tests should update expected source roots. |
| 2026-06-05 | Test | `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | Identify unit coverage requiring update | Tests currently cover listing/retrieving bundled root skills, root collision precedence, resolving colocated private root skills, and team-local root private skills. | Yes: rewrite positive root cases to canonical folder layout and add explicit negative root-only cases. |
| 2026-06-05 | Test | `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` | Identify skill source package-count coverage | `writeBundledAgentSkill(...)` writes `agents/<name>/SKILL.md`; expected root path is the agent dir. | Yes: update helper to `agents/<name>/skills/<name>/SKILL.md` and expected root. |
| 2026-06-05 | Test | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | Identify E2E coverage requiring update | E2E tests currently materialize/pass root private skill paths for Codex and native AutoByteus, catalog colocated shared root skills, and team-local root skills. | Yes: move single-skill fixtures under `skills/<skillName>` and update expected roots/descriptions; add/retain negative guard for unsupported root-only layout if practical. |
| 2026-06-05 | Doc | `autobyteus-server-ts/docs/modules/skills.md` | Inspect durable skill docs | Docs list both shared/team-local colocated skills and multi-skill folders, and runtime order includes root fallback. | Yes: rewrite to canonical only. |
| 2026-06-05 | Doc | `autobyteus-server-ts/docs/modules/agent_packages.md` | Inspect package docs | Docs list root-level and multi-skill layouts; runtime wording mentions package private roots and multi-skill roots. | Yes: rewrite to canonical only. |
| 2026-06-05 | Doc | `autobyteus-server-ts/docs/modules/agent_execution.md` and `autobyteus-server-ts/docs/modules/codex_integration.md` | Inspect runtime docs | Docs mention exact colocated private skill roots and Codex symlink targets that may be colocated agent roots. | Yes: update wording to canonical package skill roots. |
| 2026-06-05 | Command | `cat autobyteus-server-ts/package.json` | Identify likely validation commands | Server package uses `pnpm test`, `pnpm typecheck`; tests are Vitest. | Downstream implementation/API-E2E should run targeted tests and typecheck as appropriate. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `agent-config.json.skillNames` enters runtime through `AgentDefinition.skillNames`; runtime callers use `SkillService.resolveConfiguredSkillsForAgent(agentDefinition)`.
- Current execution flow:
  - Runtime: `AgentDefinition.skillNames` -> `SkillService.resolveConfiguredSkillsForAgent(...)` -> `ConfiguredAgentSkillResolver.resolve(...)` -> contextual path candidates -> global fallback -> runtime backend consumes `Skill.rootPath`.
  - Catalog: GraphQL Skills APIs -> `SkillService.listSkills()` / `SkillService.getSkill(name)` -> global skill directory scan -> bundled package definition root scan -> `SkillLoader.loadSkill(...)`.
- Ownership or boundary observations:
  - `ConfiguredAgentSkillResolver` owns contextual configured-skill lookup policy.
  - `skill-discovery.ts` owns package/catalog directory enumeration policy.
  - `SkillLoader` owns only the generic `SKILL.md` parsing/loading contract and should stay package-policy-free.
  - Runtime materializers/backends own consumption of resolved roots, not package layout interpretation.
- Current behavior summary: A package agent directory can be treated as both an agent definition folder and a skill root when it contains `SKILL.md`. That is the dual-responsibility path to remove.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift / Legacy Or Compatibility Pressure
- Refactor posture evidence summary: Refactor needed now. The current resolver and discovery owner contain dual-layout branches that preserve an old structural shortcut. Keeping those branches would directly violate the user's no-legacy requirement and keep agent directories in a mixed responsibility role.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User requirement | User rejects legacy fallback and wants all agent skills in `skills/<skill-name>/`. | Target design must remove colocated root-skill support rather than add warnings or dual paths. | Implement clean-cut removal. |
| `configured-agent-skill-resolver.ts` | Root fallback branch loads `agentDirPath` as `agent colocated root skill`. | Runtime owner currently encodes legacy/compatibility pressure. | Remove branch. |
| `skill-discovery.ts` | `getAgentSkillDirectories(...)` includes `agentDir` itself if it contains `SKILL.md`. | Catalog owner currently treats agent definition folders as skill roots. | Remove direct agent-dir scan. |
| Tests/docs | Multiple tests/docs call root-level package skills supported. | Durable expectations would preserve the old model if not updated. | Rewrite positive cases and add negative unsupported-root cases. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Resolve configured `skillNames` in source context before global fallback. | Has root-level agent fallback branch. | Primary runtime code change owner. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Enumerate global and bundled package skill directories for catalog lookup/listing. | Has root-level agent directory scan. | Primary catalog code change owner. |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Public Skills service boundary for catalog and configured runtime skill resolution. | Delegates to resolver/discovery; no direct layout branch found. | Likely unchanged except tests exercise its API. |
| `autobyteus-server-ts/src/skills/loader.ts` | Parse/load one explicit skill root. | Layout-agnostic. | Must not receive package-specific policy. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Native runtime config assembly. | Consumes resolver output roots. | No layout branching; update expectations only. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Symlink resolved skills into `.codex/skills/<skill>`. | Consumes resolved roots; asserts `SKILL.md` at root. | No layout branching; update docs/tests only. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Symlink resolved skills into `.claude/skills/<skill>`. | Consumes resolved roots; asserts `SKILL.md` at root. | No layout branching; preserve layout-agnostic behavior. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | Unit coverage for Skills service and contextual resolution. | Encodes root positives. | Rewrite and add root-negative coverage. |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | End-to-end package private skill import/runtime/catalog coverage. | Encodes root positives across Codex/native/catalog/team-local cases. | Rewrite single-skill fixtures to canonical `skills/<name>` roots. |
| `autobyteus-server-ts/docs/modules/skills.md` | Durable Skills module docs. | Documents dual layout and root runtime order. | Update during docs sync. |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Durable package module docs. | Documents dual layout. | Update during docs sync. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime docs. | Mentions colocated private roots. | Update during docs sync. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime docs. | Mentions symlink target may be colocated agent root. | Update during docs sync. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-05 | Static probe | `rg` searches listed in Source Log | Root-layout behavior appears localized to resolver/discovery plus tests/docs. | Code change is narrow; validation must cover runtime/catalog surfaces. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not applicable; local product behavior.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: Not applicable.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit tests use temp filesystem fixtures. E2E package-private skill tests bootstrap temp package roots and runtime probes.
- Required config, feature flags, env vars, or accounts: No new config expected. Some existing E2E/runtime tests may require existing test setup/model availability; implementation should prefer targeted unit tests before broader E2E.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation listed in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- There are two authoritative package skill layout owners:
  - runtime configured resolution: `ConfiguredAgentSkillResolver`
  - catalog bundled discovery: `skill-discovery.ts`
- The exact root-level runtime branch is:
  - candidate `path.join(agentDirPath, "skills", configuredName)` labeled `agent-private skill folder`
  - then candidate `agentDirPath` labeled `agent colocated root skill`
- The exact root-level catalog branch is:
  - `if (isSkillDirectory(agentDir)) { skillDirectories.push(agentDir); }`
- Root support applies to both shared agents and team-local agents because `getAgentSkillDirectories(...)` is used for `definitionRoot/agents` and `teamDir/agents`.
- Team-shared skills are already represented only as `teamDir/skills/<skill-name>` and should remain unchanged.
- Global skill directory scan is separate (`scanSkillDirectory`, `searchDirectoryRecursive`) and should remain unchanged.
- Materializers/backends are correctly downstream of `Skill.rootPath`; they should not gain package path branching.

## Constraints / Dependencies / Compatibility Facts

- No legacy root-level agent skill fallback should remain for package-contained agent-owned skills.
- Root-level `SKILL.md` may still be a valid explicit skill root when passed directly to `SkillLoader` or as a standalone configured skill source root outside package-contained agent ownership; this ticket only changes package contextual resolution and bundled package catalog discovery.
- Package import/reload should not mutate user-owned package folders.
- Existing tests that manually construct `Skill` objects with arbitrary `rootPath` values for materializer behavior do not necessarily need changing because materializers are layout-agnostic.

## Open Unknowns / Risks

- Existing external packages using root-level agent `SKILL.md` will stop resolving until migrated. This is accepted by the user's no-legacy requirement.
- The separate `/Users/normy/autobyteus_org/autobyteus-agents` package repository contains current root-level `SKILL.md` examples, but manual migration of package text files is out of scope per user direction.
- Broader full test execution may be expensive; downstream implementation should at minimum run targeted unit tests for `SkillService`/skill source management and targeted E2E or integration coverage for package private skills if environment allows.

## Notes For Architect Reviewer

The design should keep package layout policy in the existing resolver/discovery owners. Do not introduce a new compatibility validator, migration service, or package mutator. The clean ownership model is: agent directory owns `agent.md`/`agent-config.json`; skill directory owns `SKILL.md` and skill assets.
