# Design Spec

## Current-State Read

Package-contained configured skills currently have two active structural interpretations:

1. **Runtime configured-skill resolution** in `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts`:
   - validates each `agent-config.json.skillNames` entry as a safe single path segment;
   - tries `<agentDirPath>/skills/<skillName>/SKILL.md`;
   - then tries `<agentDirPath>/SKILL.md` as an `agent colocated root skill`;
   - then tries `<teamDirPath>/skills/<skillName>/SKILL.md` for team-local agents;
   - then falls back to configured/global skill directories.

2. **Skills catalog bundled discovery** in `autobyteus-server-ts/src/skills/services/skill-discovery.ts`:
   - `getAgentSkillDirectories(...)` iterates package agent folders;
   - when `agents/<agent-id>/SKILL.md` exists, it adds the agent directory itself as a bundled skill root;
   - it also adds each direct child skill folder under `agents/<agent-id>/skills/<skill-name>/`;
   - the same helper is used for shared agents and team-local agents.

This makes `agents/<agent-id>/` carry two responsibilities: agent definition root (`agent.md`, `agent-config.json`) and skill root (`SKILL.md`, skill assets). It also forces authors and runtime/debugging tools to remember a one-skill versus many-skills layout distinction.

The downstream runtime consumers are already cleaner than the current package resolution policy:

- native AutoByteus collects `Skill.rootPath` values returned by `SkillService.resolveConfiguredSkillsForAgent(...)`;
- Codex and Claude workspace materializers symlink the resolved `Skill.rootPath` into runtime workspace skill folders and only assert `SKILL.md` exists there;
- `SkillLoader` is package-layout agnostic and loads any explicit directory containing `SKILL.md`.

The target design should therefore change the two package-layout policy owners only, then update tests/docs around them. Runtime materializers and `SkillLoader` should remain generic consumers.

## Intended Change

Make this the only supported package-contained agent-owned private skill layout:

```text
<agent-dir>/skills/<skill-name>/SKILL.md
```

For shared/package-owned agents:

```text
agents/<agent-id>/
  agent.md
  agent-config.json
  skills/
    <skill-name>/
      SKILL.md
      templates/
      references/
      scripts/
```

For team-local agents:

```text
agent-teams/<team-id>/agents/<agent-id>/
  agent.md
  agent-config.json
  skills/
    <skill-name>/
      SKILL.md
```

Keep team-shared skills unchanged:

```text
agent-teams/<team-id>/skills/<skill-name>/SKILL.md
```

Root-level agent `SKILL.md` is not a supported package skill layout. Do not keep a fallback, migration branch, compatibility wrapper, root-skill warning mode, or dual read path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift / Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `ConfiguredAgentSkillResolver` contains an explicit root-level fallback candidate labeled `agent colocated root skill`.
  - `skill-discovery.ts` adds an entire agent directory as a bundled skill root when `agents/<agent-id>/SKILL.md` exists.
  - Existing docs/tests present root-level agent `SKILL.md` as a supported layout.
- Design response:
  - Remove the root-level package skill branch from runtime contextual resolution.
  - Remove the root-level package skill branch from bundled catalog discovery.
  - Keep `skills/<skill-name>` package private skill folders, team-shared folders, and global skill fallback.
  - Update durable tests/docs to encode the new invariant and negative root-only behavior.
- Refactor rationale:
  - The code currently preserves a structural shortcut that directly conflicts with the desired invariant. A clean-cut removal is simpler than warnings/fallbacks and keeps ownership obvious: agent root owns agent definition; skill root owns skill assets.
- Intentional deferrals and residual risk, if any:
  - Manual migration of external/private package files is deferred to package authors and explicitly out of scope. Existing root-layout packages will stop resolving until migrated; this is accepted by the user requirement.

## Terminology

- **Agent directory / agent root**: folder containing an agent's `agent.md` and `agent-config.json`.
- **Agent-owned package skill**: skill content private to one package agent, referenced by that agent's `agent-config.json.skillNames`.
- **Canonical private skill root**: `<agent-dir>/skills/<skill-name>/`, containing `SKILL.md` and skill assets.
- **Team-shared skill root**: `<team-dir>/skills/<skill-name>/`, shared by team-local agents.
- **Global skill directory**: configured/default skill source outside package source context.

## Design Reading Order

1. Data-flow spine: configured skill resolution and catalog discovery.
2. Ownership: resolver owns runtime contextual lookup; discovery owns catalog directory enumeration.
3. File responsibilities: remove root layout from those owners; keep consumers layout-agnostic.
4. Folder/path mapping: canonical package authoring paths and test fixture paths.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove root-level package agent `SKILL.md` discovery/resolution.
- Obsolete legacy paths/files included in this scope:
  - runtime candidate `<agentDirPath>/SKILL.md` in `ConfiguredAgentSkillResolver`;
  - catalog candidate `agents/<agent-id>/SKILL.md` / `agent-teams/<team-id>/agents/<agent-id>/SKILL.md` in `skill-discovery.ts`;
  - positive tests/docs for colocated/root agent skills.
- Decision rule: root-level package `SKILL.md` may physically exist in a source folder, but it is unsupported and must not be loaded by package contextual resolution or bundled catalog discovery.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent runtime bootstrap with `agent-config.json.skillNames` | Runtime receives `Skill.rootPath` values | `ConfiguredAgentSkillResolver` through `SkillService.resolveConfiguredSkillsForAgent(...)` | This is the runtime path that must stop resolving root-level package `SKILL.md`. |
| DS-002 | Primary End-to-End | Skills catalog GraphQL/API request | Catalog row or skill detail root path | `skill-discovery.ts` through `SkillService.listSkills()` / `getSkill(name)` | This is the browse/open path that must stop exposing root-level package `SKILL.md`. |
| DS-003 | Primary End-to-End | Runtime-specific skill materialization/config assembly | Codex/Claude symlink or native AutoByteus `AgentConfig.skills` | Runtime backend/materializer consuming resolved `Skill[]` | This should remain downstream and layout-agnostic while receiving canonical roots. |

## Primary Execution Spine(s)

- DS-001: `AgentDefinition.skillNames -> SkillService.resolveConfiguredSkillsForAgent -> ConfiguredAgentSkillResolver -> Canonical contextual skill candidates -> Runtime Skill[]`
- DS-002: `GraphQL Skills API -> SkillService catalog method -> skill-discovery package scan -> SkillLoader -> Catalog Skill row/detail`
- DS-003: `Runtime backend bootstrap -> Resolved Skill[] -> Runtime materializer/config builder -> Workspace/runtime sees skill root`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Runtime bootstrap asks the Skills service to resolve the agent's configured logical skill names. The resolver checks only canonical agent-private folders, then owning-team shared folders, then global fallback. | Agent definition, configured skill name, contextual skill candidate, resolved `Skill` | `ConfiguredAgentSkillResolver` | Safe name validation, frontmatter name validation, disabled-skill state, missing-skill warnings. |
| DS-002 | Catalog APIs ask the Skills service for available skills or one skill by name. Discovery scans global skills first, then package roots. Package agent private skills are enumerated only from each agent's `skills/<skill-name>` folder. | Skill catalog request, definition root, skill directory, loaded `Skill` | `skill-discovery.ts` plus `SkillService` catalog boundary | Deterministic duplicate precedence, read-only detection, file tree/content browsing. |
| DS-003 | Runtimes consume already-resolved skills. Native AutoByteus passes root paths to `AgentConfig.skills`; Codex/Claude symlink the root path into workspace skill folders. | Resolved `Skill`, runtime config/materialized workspace path | Runtime backend/materializer | Workspace path collision handling, `SKILL.md` existence assertion, cleanup. |

## Spine Actors / Main-Line Nodes

- `AgentDefinition.skillNames`: explicit configured logical skills for one agent.
- `SkillService`: public boundary for skill catalog and configured runtime resolution.
- `ConfiguredAgentSkillResolver`: runtime contextual resolution policy owner.
- `skill-discovery.ts`: catalog/package directory enumeration policy owner.
- `SkillLoader`: generic explicit skill root loader.
- Runtime backend/materializer: downstream consumer of already-resolved roots.

## Ownership Map

- `ConfiguredAgentSkillResolver` owns:
  - configured skill name safety validation;
  - contextual candidate order;
  - candidate metadata name-match validation;
  - warning/skip behavior for invalid/missing contextual skills;
  - disabled state projection onto resolved skills.
- `skill-discovery.ts` owns:
  - which physical directories are considered skill roots in global and package catalog scans;
  - deterministic package skill directory enumeration order.
- `SkillService` owns:
  - public API composition around global first/package second catalog precedence;
  - configured skill resolution delegation;
  - read-only state checks and skill CRUD/file operations.
- `SkillLoader` owns:
  - parsing/loading a directory already chosen as a skill root;
  - counting files and returning `Skill.rootPath`.
- Runtime backends/materializers own:
  - runtime consumption of resolved skills;
  - materialization/config assembly, not package source layout decisions.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillsForAgent(...)` | `ConfiguredAgentSkillResolver` | Stable public boundary for runtime callers. | Additional package path fallbacks or package-wide private scans. |
| `SkillService.listSkills()` / `getSkill(name)` | `skill-discovery.ts` plus `SkillLoader` | Stable catalog API for GraphQL/UI. | Agent-contextual runtime fallback policy. |
| Codex/Claude materializer methods | Runtime materializer | Runtime workspace setup. | Package layout interpretation or root fallback. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime root candidate `<agentDirPath>/SKILL.md` in `ConfiguredAgentSkillResolver.resolveContextualSkill(...)` | Agent-owned skills now always live under `skills/<skill-name>`. | Canonical candidate `<agentDirPath>/skills/<skillName>/SKILL.md`. | In This Change | Do not leave a warning-only or fallback branch. |
| Catalog root candidate `if (isSkillDirectory(agentDir)) skillDirectories.push(agentDir)` in `getAgentSkillDirectories(...)` | Agent directories are not package skill roots. | `getSkillFolderDirectories(path.join(agentDir, "skills"))`. | In This Change | Applies to shared agents and team-local agents. |
| Positive root/colocated skill unit and E2E fixtures | They encode obsolete supported behavior. | Canonical single-skill fixtures under `skills/<skill-name>`. | In This Change | Root-only fixtures may remain only as explicit negative tests. |
| Docs describing `agents/<agent-id>/SKILL.md` as supported | Misleads package authors and future design. | Canonical package authoring docs. | In This Change or delivery docs sync | Delivery owns final durable docs sync if not done earlier. |

## Return Or Event Spine(s) (If Applicable)

Not applicable. The change affects lookup/discovery spines, not event return flows.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ConfiguredAgentSkillResolver`
  - Local spine: `raw skill name -> safe segment validation -> contextual candidates -> global fallback -> warn/skip or resolved Skill`
  - Why it matters: the root candidate must be removed without weakening unsafe-name validation or name-match validation.
- Parent owner: `skill-discovery.ts`
  - Local spine: `definition root -> agents directory -> each agent's skills folder -> skill folders -> SkillLoader`
  - Why it matters: the scan should continue to support package private folders and team-shared folders while ignoring direct agent roots.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Safe configured-name validation | DS-001 | `ConfiguredAgentSkillResolver` | Reject absolute/path-like/traversal skill names before path construction. | Prevents unsafe filesystem candidate construction. | Moving to callers would duplicate policy and weaken runtime boundary. |
| Frontmatter name-match validation | DS-001 | `ConfiguredAgentSkillResolver` | Ensure contextual candidate's declared name equals configured name. | Prevents accidental resolution of wrong private/team skill. | Omitting it would make folder names authoritative without metadata guard. |
| Duplicate catalog precedence | DS-002 | `SkillService` catalog boundary | Global skills win before bundled package skills. | Existing deterministic catalog behavior. | Putting this in discovery alone would blur global/package ordering authority. |
| Read-only detection | DS-002 | `SkillService` | Mark external/unwritable roots read-only. | UI/edit/version constraints. | Not part of package layout enumeration. |
| Runtime workspace path collision handling | DS-003 | Codex/Claude materializers | Prevent conflicting workspace symlink paths. | Runtime safety. | Not part of package layout resolution. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime configured skill lookup | Skills / `ConfiguredAgentSkillResolver` | Reuse/Modify | Existing owner already encapsulates contextual candidate order. | N/A |
| Bundled package skill catalog enumeration | Skills / `skill-discovery.ts` | Reuse/Modify | Existing owner already enumerates package skill directories. | N/A |
| Generic skill parsing/loading | Skills / `SkillLoader` | Reuse unchanged | It should remain layout-agnostic. | N/A |
| Runtime materialization/config | Runtime backend/materializer owners | Reuse unchanged | They consume resolved roots and need no package policy. | N/A |
| Package source validation/migration | Agent packages | Do not create | Requirement explicitly rejects compatibility/migration; import should not mutate source folders. | A new migration/validator would add complexity for an unsupported old layout. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills runtime resolution | Configured skill source-context lookup. | DS-001 | Runtime bootstraps | Reuse/Modify | Remove root candidate only. |
| Skills catalog discovery | Global/package skill directory scans. | DS-002 | GraphQL/UI skill catalog | Reuse/Modify | Remove direct agent-root package scan only. |
| Runtime execution backends | Runtime consumption/materialization of resolved skills. | DS-003 | AutoByteus/Codex/Claude runs | Reuse unchanged | Update tests/docs expectations for canonical roots. |
| Documentation | Durable module behavior docs. | DS-001, DS-002, DS-003 | Developers/package authors | Reuse/Modify | Update in delivery/docs sync. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/skills/services/configured-agent-skill-resolver.ts` | Skills runtime resolution | Resolver | Contextual configured-skill candidate policy. | Existing cohesive runtime lookup owner. | `Skill`, `SkillLoader`, `isSkillDirectory`. |
| `src/skills/services/skill-discovery.ts` | Skills catalog discovery | Discovery helpers | Enumerate skill directories from global and definition roots. | Existing cohesive scan policy owner. | `SkillLoader`, `isSkillDirectory`. |
| `tests/unit/skills/services/skill-service.test.ts` | Tests | Unit coverage | Positive canonical and negative root-only resolver/catalog behavior. | Existing unit coverage for `SkillService`. | Existing `writeSkillDirectory` helper. |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | Tests | E2E package private skills | Runtime/catalog package-private skill behavior across imported packages. | Existing durable E2E owner for this domain. | Existing fixture writers. |
| `docs/modules/*.md` | Documentation | Module docs | Package skill authoring/runtime behavior. | Existing durable module docs. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical package private skill path construction `path.join(agentDir, "skills", skillName)` | No new shared file | Skills runtime/discovery | Existing local repetition is small and already in correct owners. | Yes | Yes | A generic path helper that reintroduces root-layout alternatives. |
| Test fixture canonical skill writer | Existing test-local helpers | Tests | Local helpers can be updated in-place. | Yes | Yes | Production abstraction. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `Skill.rootPath` | Yes | Yes | Low after change | It remains the exact resolved skill root. The root should now be canonical package `skills/<skill-name>` for package-private skills. |
| `agent-config.json.skillNames` | Yes | Yes | Low | Continue treating entries as logical skill names, not paths. |
| Package skill root physical layouts | Yes after change | Yes | Low after change | Remove root-level package agent skill representation. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Skills runtime resolution | Runtime configured-skill resolver | Resolve `skillNames` from canonical agent-private folders, team-shared folders, then global fallback. | This is the existing authoritative contextual resolution boundary. | `Skill`, `SkillLoader`, `isSkillDirectory`. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Skills catalog discovery | Package/global skill directory discovery | Enumerate package private skill folders only from `agentDir/skills/*`; enumerate team-shared folders from `teamDir/skills/*`; preserve global scans. | This is the existing authoritative catalog directory enumeration boundary. | `SkillLoader`, `isSkillDirectory`. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | Tests | Unit tests | Assert canonical discovery/resolution and unsupported root-only behavior. | Existing tests already instantiate `SkillService` with temp roots. | Test helpers. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` | Tests | Unit tests | Ensure added package roots as skill sources count canonical package-local skills. | Existing test owns skill source count behavior. | Test helper updated to canonical path. |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | Tests | E2E tests | Assert imported package runtime/catalog behavior with canonical single and multi skills. | Existing E2E owner for package private skills. | Existing fixture writers. |
| `autobyteus-server-ts/docs/modules/skills.md` | Documentation | Skills module docs | Canonical skill layouts and runtime resolution order. | Existing durable docs owner. | N/A |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Documentation | Agent package docs | Package-contained skill authoring and runtime behavior. | Existing durable docs owner. | N/A |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Documentation | Runtime docs | Resolved skill roots wording. | Existing durable runtime docs owner. | N/A |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Documentation | Codex docs | Codex materializer source-root wording and coverage description. | Existing durable Codex docs owner. | N/A |

## Ownership Boundaries

- `ConfiguredAgentSkillResolver` is the authoritative boundary for **runtime source-context-first configured skill resolution**. Runtime callers must not use package-wide catalog lookup as a fallback for private skills.
- `skill-discovery.ts` is the authoritative boundary for **which package directories appear as catalog skills**. It should not make runtime context decisions.
- `SkillLoader` is the authoritative boundary for **loading a chosen skill root**, not choosing package roots.
- Runtime materializers are authoritative for **workspace materialization/config** after skill resolution; they must not inspect package source layout to find alternate roots.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillsForAgent(...)` | `ConfiguredAgentSkillResolver` candidate order and validation | Runtime backends/bootstrap factories | Runtime caller manually probes `agentDirPath/SKILL.md` or package-wide catalog. | Add resolver API behavior, not caller-side probing. |
| `SkillService.listSkills()` / `getSkill(name)` | Global scans, package scans, duplicate precedence, loader calls | GraphQL Skills API/UI/tooling | GraphQL directly scans package roots. | Extend `SkillService` catalog behavior. |
| `SkillLoader.loadSkill(...)` | Frontmatter parsing, file counting, rootPath creation | Resolver/discovery/materializer tests | Loader decides package layout validity. | Keep layout policy in resolver/discovery. |
| Runtime materializer | Symlink/config path setup and cleanup | Runtime bootstrap | Materializer searches `agentDir/skills` or `agentDir/SKILL.md`. | Ensure resolver returns correct roots before materialization. |

## Dependency Rules

Allowed:

- Runtime backends -> `SkillService.resolveConfiguredSkillsForAgent(...)` -> `ConfiguredAgentSkillResolver`.
- GraphQL Skills APIs -> `SkillService` catalog methods -> `skill-discovery.ts` -> `SkillLoader`.
- `ConfiguredAgentSkillResolver` / `skill-discovery.ts` -> `SkillLoader` for directories they have already selected.
- Runtime materializers -> resolved `Skill.rootPath`.

Forbidden:

- No runtime backend may add root-level package skill probing.
- No catalog scan may add direct package agent directory roots as skill directories.
- No compatibility helper may check both `agentDir/SKILL.md` and `agentDir/skills/<skillName>/SKILL.md`.
- No package import/reload service may mutate user source folders to migrate root-level skills in this ticket.
- No root-level package agent `SKILL.md` should be documented as supported.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillsForAgent(agentDefinition)` | Runtime configured skills for one agent definition | Resolve logical names to `Skill[]` in source context. | Full `AgentDefinition` with `sourceInfo.agentDirPath` and optional `teamDirPath`. | Must use canonical private folders only. |
| `ConfiguredAgentSkillResolver.resolve({ skillNames, sourceInfo, agentLabel })` | Resolver internals for one source context | Validate names and resolve candidates. | Logical skill names plus source directory metadata. | Candidate order changes to private folder -> team shared -> global. |
| `SkillService.listSkills()` | Catalog skill list | Expose global and bundled package skills. | No source-context identity. | Package bundled skills only from canonical folders/team shared. |
| `SkillService.getSkill(name)` | Catalog skill detail | Resolve one catalog skill by logical name. | Logical skill name string. | Catalog precedence remains global before package. |
| `CodexWorkspaceSkillMaterializer.materializeConfiguredCodexWorkspaceSkills(...)` | Codex workspace skills | Symlink resolved roots. | `Skill[]` with `rootPath`. | Must stay layout-agnostic. |
| Native AutoByteus `AgentConfig.skills` assembly | Native runtime skill roots | Pass root paths to runtime. | `Skill.rootPath` strings. | Expected package roots now canonical. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveConfiguredSkillsForAgent(...)` | Yes | Yes | Low | Remove root fallback to keep source-context meaning singular. |
| `listSkills()` / `getSkill(name)` | Yes | Yes | Medium current, Low after change | Remove root package scan so one package private skill physical shape remains. |
| Materializer methods | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent private skill folder | `agent-private skill folder` | Yes | Low | Keep label. |
| Agent colocated root skill | Remove | No longer valid | High if retained | Delete branch/label. |
| Team-shared skill folder | `team-shared skill folder` | Yes | Low | Keep label. |
| Canonical private skill root | `skills/<skill-name>` | Yes | Low | Use in docs/tests. |

## Applied Patterns (If Any)

- **Resolver pattern**: `ConfiguredAgentSkillResolver` remains the policy resolver for configured names. The change narrows its candidate set.
- **Directory discovery helper pattern**: `skill-discovery.ts` remains the catalog scan helper. The change narrows package agent skill directory enumeration.
- **Adapter/materializer pattern**: Codex/Claude materializers remain adapters from resolved skill roots to runtime workspace shape and do not own package policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | File | Skills runtime resolution | Remove root candidate; resolve canonical private folders, team-shared folders, global fallback. | Existing resolver owner. | Root-level agent `SKILL.md` fallback. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | File | Skills catalog discovery | Remove direct agent root discovery; keep `agentDir/skills/*` and `teamDir/skills/*`. | Existing discovery owner. | Direct `isSkillDirectory(agentDir)` package scan. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | File | Unit tests | Canonical positive and root-only negative tests. | Existing SkillService test owner. | Positive colocated/root private skill expectations. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` | File | Unit tests | Skill source counts with canonical package-local skill fixture. | Existing skill source management test owner. | Root-level package skill helper. |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | File | E2E validation | Imported package private skills across runtime/catalog surfaces. | Existing durable E2E owner. | Positive root-level package private skill layout. |
| `autobyteus-server-ts/docs/modules/skills.md` | File | Docs | Canonical Skills module behavior. | Existing docs. | Root-level package skill support. |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | File | Docs | Canonical package authoring behavior. | Existing docs. | Root-level package skill support. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | File | Docs | Runtime resolved skill root wording. | Existing docs. | Colocated private root wording. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | File | Docs | Codex materialization wording. | Existing docs. | Colocated package root wording. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agents/<agent-id>/` | Main-Line Domain-Control / definition root | Yes after change | Low after change | Contains agent definition/config only. |
| `agents/<agent-id>/skills/<skill-name>/` | Off-Spine Concern serving agent runtime | Yes | Low | Contains skill instructions/assets. |
| `agent-teams/<team-id>/skills/<skill-name>/` | Off-Spine Concern shared by team members | Yes | Low | Existing team-shared pattern remains. |
| `autobyteus-server-ts/src/skills/services/` | Capability service folder | Yes | Low | Existing compact service layout remains clearer than new folders for this narrow change. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Single agent-owned package skill | `agents/writer/skills/writer-style/SKILL.md` with `agent-config.json` `"skillNames": ["writer-style"]` | `agents/writer/SKILL.md` | The same shape works for one skill and many skills. |
| Multiple agent-owned package skills | `agents/writer/skills/tone/SKILL.md` and `agents/writer/skills/outline/SKILL.md` | One skill at `agents/writer/SKILL.md` plus another under `skills/` | Avoids mixed path rules. |
| Team-local private skill | `agent-teams/review/agents/reviewer/skills/private-rubric/SKILL.md` | `agent-teams/review/agents/reviewer/SKILL.md` | Keeps agent member definition separate from skill assets. |
| Team-shared skill | `agent-teams/review/skills/shared-rubric/SKILL.md` | N/A | This already follows the canonical foldered skill model and remains supported. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep resolver fallback from `agentDir/skills/<name>` to `agentDir` | Would preserve existing root-layout packages. | Rejected | Remove branch; packages must move skill content into `skills/<skill-name>`. |
| Keep catalog scan of `agents/<agent-id>/SKILL.md` | Would preserve Skills page visibility for old packages. | Rejected | Remove direct agent-dir scan; catalog only sees canonical folders/team-shared/global. |
| Add import warning for root-level `SKILL.md` | Could help migration. | Rejected for this scope | Unsupported root layout is simply not resolved/cataloged; existing missing-skill warnings remain when configured skill names cannot resolve. |
| Auto-migrate root skill files on package reload | Could reduce manual migration. | Rejected | Package import/reload must not mutate user-owned source folders; user said manual text migration is fine. |
| Support both layouts behind a path helper | Would centralize dual behavior. | Rejected | The requirement is to remove dual behavior, not hide it. |

## Derived Layering (If Useful)

Layering is simple and unchanged:

- Definition/source context layer: agent definition providers attach `sourceInfo.agentDirPath` / `teamDirPath`.
- Skills service layer: resolver/discovery choose skill roots.
- Runtime/catalog consumer layer: runtime materializers and GraphQL/UI consume `Skill` records.

The change tightens the Skills service layer so package source layout policy is singular.

## Migration / Refactor Sequence

1. Modify `ConfiguredAgentSkillResolver.resolveContextualSkill(...)`:
   - keep validation and canonical private candidate;
   - remove the colocated/root `agentDirPath` candidate and label;
   - keep team-shared candidate and global fallback behavior.
2. Modify `skill-discovery.ts`:
   - remove direct `isSkillDirectory(agentDir)` package scan;
   - keep `getSkillFolderDirectories(path.join(agentDir, "skills"))`;
   - keep team-shared `getSkillFolderDirectories(path.join(teamDir, "skills"))`;
   - keep global `scanSkillDirectory(...)` / `searchDirectoryRecursive(...)` unchanged.
3. Update unit tests:
   - convert single package-private skill fixtures to `agentDir/skills/<skillName>`;
   - add/assert root-only package `SKILL.md` is not listed or resolved;
   - update skill source count expectations to canonical root paths.
4. Update E2E tests:
   - convert Codex single-skill fixture to canonical path and expect symlink target/captured paths under `skills/<skillName>`;
   - convert native AutoByteus single-skill fixture similarly;
   - convert shared-agent catalog single-skill fixture similarly;
   - convert team-local single-skill fixture similarly;
   - keep cross-agent/private context guards and global/team-shared fallback assertions.
5. Update durable docs:
   - `skills.md`, `agent_packages.md`, `agent_execution.md`, `codex_integration.md`.
6. Run targeted validation:
   - `pnpm -C autobyteus-server-ts test tests/unit/skills/services/skill-service.test.ts tests/unit/skills/services/skill-sources-management.test.ts`
   - targeted package private skills E2E if environment allows: `pnpm -C autobyteus-server-ts test tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts typecheck` if feasible.

Temporary seams: none. The code should not contain dual paths between steps in final state.

## Key Tradeoffs

- **Chosen**: clean-cut removal of root-level package skill support.
  - Benefit: simpler invariant, less cognitive burden, stable absolute skill root shape.
  - Cost: existing packages must be manually migrated before reload.
- **Rejected**: legacy fallback/warning/migration code.
  - Benefit if kept: smoother old package behavior.
  - Cost if kept: preserves exactly the dual-layout complexity the requirement rejects.
- **Chosen**: keep `SkillLoader` and runtime materializers layout-agnostic.
  - Benefit: package layout policy remains in resolver/discovery owners.

## Risks

- Existing package repositories with root-level agent `SKILL.md` will fail to resolve those skills until migrated. This is accepted by scope.
- If tests are only rewritten from root to canonical without adding negative root-only checks, future code could accidentally reintroduce root support. Add explicit negative unit coverage.
- Docs in separate package repositories may remain stale; current repository durable docs should be updated, external package file migration is out of scope.

## Guidance For Implementation

- Do not add a new helper that accepts both `agentDir` and `agentDir/skills/<name>`.
- Do not add import-time package validation or source mutation for this change.
- Prefer renaming test variables/descriptions from `root` to `single` or `canonical` where the case is now a one-skill canonical folder. If a variable named `rootSkillName` remains, ensure it no longer implies root-level layout.
- In tests, assert expected `rootPath` values point to `.../skills/<skillName>`, not the agent directory.
- Leave global standalone skill tests untouched unless they are package-root-specific.
- After implementation, run `rg -n "colocated|agent colocated|agents/<agent-id>/SKILL|agent root skill|root private skill" autobyteus-server-ts/src autobyteus-server-ts/docs autobyteus-server-ts/tests` and ensure remaining matches are either unrelated English usage or explicit negative unsupported-layout assertions.
