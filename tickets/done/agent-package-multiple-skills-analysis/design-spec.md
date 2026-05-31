# Design Spec

## Review Revision Log

| Round | Trigger | Revision Summary |
| --- | --- | --- |
| 1 | Initial design | Proposed `AgentDefinition.sourceInfo` plus contextual `SkillService.resolveConfiguredSkillsForAgent`. |
| 2 | Architecture review `Design Impact` findings `AR-DI-001`, `AR-DI-002` | Explicitly decommissions global package-root bundled scans from `SkillService.getSkill/listSkills` and `skill-discovery.ts`; adds safe single-segment configured-name validation and metadata-name matching for every contextual candidate. |
| 2b | User Codex materializer follow-up clarification | Confirms duplicate skill names are product-excluded; Codex uses the normal materialization path from resolved `Skill.rootPath` into `.codex/skills/<name>` with no special same-name handling. |

## Current-State Read

Agent definitions already model configured skills as an array:

- GraphQL create/update inputs expose `skillNames?: string[]`.
- `agent-config.json` persists `skillNames?: string[]`.
- Codex, Claude, and native AutoByteus runtime paths already iterate resolved `Skill[]`.

The unhealthy boundary is skill resolution. Runtime callers currently resolve configured skills by flat names, for example `SkillService.getSkills(agentDefinition.skillNames)`. `SkillService.getSkill/listSkills` also include package-root bundled scans through `searchBundledSkillDirectory(...)` and `scanBundledSkillsFromDefinitionRoot(...)`, which make `agents/<agentId>/SKILL.md` and `agent-teams/<teamId>/agents/<localAgentId>/SKILL.md` behave like global skills. That violates the new private-skill model because a resolver fallback can accidentally cross into another agent's private root skill.

Existing source path ownership is already present in the agent-definition subsystem:

- `findAgentSourcePaths(...)` returns the exact `agentDir`, `mdPath`, `configPath`, `rootPath`, and ownership scope for shared, team-local, and application-owned agents.
- Team-local agent discovery already receives the owning `teamSourcePaths.teamDir`.

The target design must reuse source path knowledge from agent-definition providers, make configured-skill resolution contextual, and make global skill lookup truly global-only.

Codex runtime materializes resolved skills into the workspace under `.codex/skills/<sanitizedSkillName>`. The materializer uses `Skill.rootPath` as the source root and creates a workspace symlink. Contextual package placement therefore has no special Codex impact once the resolver returns the correct `Skill.rootPath`. Duplicate skill names are product-excluded for this ticket, so no same-name collision path or source-aware preflight special case is required.

## Intended Change

Introduce contextual configured-skill resolution for one loaded agent definition. Runtime callers should ask for the configured skills for that specific agent/source context, not for globally named skills only.

Supported first-slice contextual layouts:

```text
agents/<agentId>/SKILL.md
agents/<agentId>/skills/<skillName>/SKILL.md
agent-teams/<teamId>/agents/<localAgentId>/SKILL.md
agent-teams/<teamId>/agents/<localAgentId>/skills/<skillName>/SKILL.md
agent-teams/<teamId>/skills/<skillName>/SKILL.md
```

`agent-config.json.skillNames` remains authoritative. The resolver resolves only configured names, validates each configured name as a safe skill path segment, and verifies that every loaded contextual candidate's frontmatter `name` equals the configured name.

Global `SkillService.getSkill/listSkills` target behavior becomes global-only:

- Search/list default skills directory and explicit additional skill directories.
- Continue supporting normal standalone skill-source shapes such as `<skillsDir>/<skillName>/SKILL.md` and nested `<skillsDir>/skills/<skillName>/SKILL.md`.
- Do **not** scan agent package definition roots (`agents/*`, `agent-teams/*/agents/*`, or `agent-teams/*/skills/*`) as global skills.
- Do **not** let contextual resolver global fallback call any helper that can resolve another agent/team's private or team-shared skills.

Codex runtime-specific target behavior:

- `CodexThreadBootstrapper` still consumes resolved `Skill[]`; it should not inspect package layout.
- `CodexWorkspaceSkillMaterializer` should continue materializing each resolved skill source root into workspace `.codex/skills/<sanitizedSkillName>`.
- Existing Codex discoverable-skill preflight may remain name-based because duplicate skill names are out of scope by product constraint.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Shared Structure Looseness / Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Skill configuration is array-shaped, but current resolution is flat/name-only and current package-root bundled discovery globally exposes private root `SKILL.md` files.
- Design response: Add agent source metadata to loaded `AgentDefinition` objects; add a contextual configured-skill resolver; narrow global skill discovery to true skill sources only; replace runtime configured-skill calls with the contextual boundary.
- Refactor rationale: Without narrowing global bundled discovery, the new resolver would still be able to resolve the wrong agent's private skill through fallback. Without configured-name validation, `skillNames` can become unsafe path segments.
- Intentional deferrals and residual risk, if any: Package-root shared `skills/<skillName>` is deferred. UI authoring for private/team-shared skills is deferred. Auto-inference from files when `skillNames` is empty is explicitly out of scope.

## Terminology

- `Contextual skill`: a skill resolved only for one owning agent/team source directory.
- `Global skill`: a standalone installed skill from the default skills directory or explicit additional skill directories.
- `Configured skill name`: one string from `agent-config.json.skillNames` after validation as a safe single directory segment.

## Design Reading Order

1. Source context propagation from agent-definition providers.
2. Contextual configured-skill resolution.
3. Global skill discovery narrowing/decommissioning.
4. Runtime call-site migration.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/narrow global package-root bundled scans from global skill lookup/listing. Private and team-shared package skills are contextual-only in this slice.
- Existing standalone/global skill directories remain supported as fallback because they are true in-scope global skills, not a legacy compatibility wrapper.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent run/team-member runtime bootstrap | Runtime receives resolved `Skill[]` | SkillService contextual configured-skill boundary | Main behavior: configured private/team-shared skills reach runtime. |
| DS-002 | Primary End-to-End | Agent definition provider loads definition | `AgentDefinition.sourceInfo` is available | Agent-definition provider | Resolution needs the exact agent/team source directory. |
| DS-003 | Bounded Local | Resolve one configured skill name | First matching validated `Skill` or skipped warning | Contextual skill resolver | Precedence, validation, metadata matching, and source-context lookup live here. |
| DS-004 | Bounded Local | Global skill lookup/listing | True global skill source result set | SkillService / skill-discovery | AC-9 depends on private/team-shared skills not leaking globally. |

## Primary Execution Spine(s)

`Runtime Bootstrap -> AgentDefinitionService -> AgentDefinition(sourceInfo) -> SkillService.resolveConfiguredSkillsForAgent -> Runtime Skill Materializer / Prompt Injection`

`SkillService.getSkill/listSkills -> global-only skill-discovery -> default/additional skill dirs -> standalone Skill[]`


## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Runtime bootstrap asks for an agent definition, then asks SkillService to resolve that definition's configured skill names using source context. The backend receives the same `Skill[]` shape it already supports. | Runtime Bootstrap, AgentDefinitionService, SkillService, Runtime Materializer | SkillService for skill resolution; runtime backend for exposure | Warnings for missing/invalid skills; access-mode handling remains in runtime. |
| DS-002 | Providers attach non-persisted source metadata while reading `agent.md` and `agent-config.json`. That metadata follows the definition through cache/service layers. | FileAgentDefinitionProvider, AgentDefinition | Agent-definition subsystem | No GraphQL exposure required unless future UI needs it. |
| DS-003 | For each configured name, the resolver validates it as one safe segment, checks private multi-skill directory, colocated root `SKILL.md`, team-shared directory, then true global-only fallback. Every contextual candidate must load successfully and have `Skill.name === configuredName`. | ConfiguredAgentSkillResolver | SkillService | Metadata-name matching; source-context lookup; warn-and-skip for invalid names. |
| DS-004 | Global APIs list/load only actual standalone skill-source directories. Old package-root bundled scans are removed from this path so private/team-shared skills cannot appear as unqualified globals. | SkillService, skill-discovery | SkillService | Package package roots are excluded from global fallback/listing. |

## Spine Actors / Main-Line Nodes

- Runtime bootstrapper/factory: requests configured skills for the agent being launched.
- AgentDefinitionService/provider: supplies agent metadata plus source context.
- SkillService contextual resolver: owns lookup precedence, safe configured-name validation, metadata-name matching, and global-only fallback.
- Skill-discovery global helpers: own true global skill directory traversal only.
- Runtime-specific materializer/prompt injector: consumes resolved `Skill[]` unchanged.

## Ownership Map

- `AgentDefinition` owns agent configuration data and non-persisted source context needed by downstream runtime setup.
- `FileAgentDefinitionProvider` owns deriving that source context from actual file paths.
- `SkillService` owns skill discovery and configured-skill resolution. It must encapsulate private/team/global precedence and forbid private leakage into global lookup.
- `skill-discovery.ts` owns global skill-source traversal only after this change; it must not own contextual package-private discovery.
- Runtime backends own exposure of already-resolved skills. They must not inspect package folder layout.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentDefinitionService.getAgentDefinitionById` | Agent-definition provider/cache | Stable service API for runtime callers | Skill path resolution. |
| `SkillService.resolveConfiguredSkillsForAgent` (new) | SkillService contextual resolver | Stable runtime-facing skill-resolution API | Runtime materialization/prompt formatting. |
| `SkillService.getSkill/listSkills` | Global skill discovery | Public global skill catalog API | Contextual private/team-shared skill discovery. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Runtime calls to `SkillService.getSkills(agentDefinition.skillNames)` for configured agent skills | Name-only global lookup cannot resolve private/team-shared skills safely | `SkillService.resolveConfiguredSkillsForAgent(agentDefinition)` | In This Change | Update native single-agent, native team-member, Codex, and Claude bootstrap paths. |
| `SkillService.findSkillLocation` fallback through `getAllDefinitionRoots()` / `searchBundledSkillDirectory(...)` | It lets global lookup resolve private root `SKILL.md` from any package/agent | Contextual resolver for private/team-shared paths; global-only lookup for global fallback | In This Change | `findSkillLocation` should search only default/additional skill directories. |
| `SkillService.listSkills()` loop over `getAllDefinitionRoots()` / `scanBundledSkillsFromDefinitionRoot(...)` | It exposes private/team-shared skills as ambiguous global entries | Global-only `scanSkillDirectory(...)` over true skill source dirs | In This Change | Satisfies AC-9. |
| `skill-discovery.ts` exported/called package-root bundled helpers `searchBundledSkillDirectory` and `scanBundledSkillsFromDefinitionRoot` | They encode the old global bundled-skill model | Remove them or make them unused/private only if tests require temporary comparison | In This Change | Do not use them from global fallback or contextual resolver. |
| `scanSkillDirectory(...)` calling `scanBundledSkillsFromDefinitionRoot(directory, ...)` | Adding an agent package root as a skill source would leak `agents/*/SKILL.md` globally | Standalone-only `scanSkillDirectory` | In This Change | It may still discover `<directory>/<skillName>` and `<directory>/skills/<skillName>` standalone shapes. |
| `searchDirectoryRecursive(...)` calling `searchBundledSkillDirectory(...)` | Global `getSkill` could cross into private package roots | Standalone-only recursive search | In This Change | It may still search direct and nested `skills/` standalone dirs. |
| Tests that require private package skills to appear as global unqualified skill entries | Private skills should be contextual, not global | Contextual resolver tests and AC-9 tests | In This Change | Update/delete old bundled-global tests. |

## Return Or Event Spine(s) (If Applicable)

Not applicable. Resolution is synchronous during bootstrap.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: SkillService contextual resolver
- Arrow chain: `raw configured skill name -> safe single-segment normalization -> agentDir/skills/<name> metadata match -> agentDir/SKILL.md metadata match -> teamDir/skills/<name> metadata match -> global-only fallback -> resolved Skill or warning`
- Why it matters: This local lookup order is the invariant that prevents private/team source confusion and path traversal.

- Parent owner: SkillService global discovery
- Arrow chain: `global skill name/list request -> default skills dir/additional skills dirs -> direct skill dir or nested skills dir -> loaded Skill[]`
- Why it matters: Global fallback/listing must not use package roots or private/team directories.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Source metadata construction | DS-002 | AgentDefinition | Attach exact agent/team directories while reading definitions | Runtime should not rediscover source paths | Runtime would bypass provider ownership. |
| Configured name validation | DS-003 | SkillService | Reject empty, absolute, path-like, traversal, or multi-segment configured names | Configured names become path segments | Path traversal or wrong folder lookup. |
| Skill metadata-name matching | DS-003 | SkillService | Ensure every contextual candidate's loaded `Skill.name` equals configured name | Prevents wrong skill materialization when folder/name disagree | Wrong skill could be exposed. |
| Missing/malformed-skill warning | DS-003 | SkillService | Keep startup non-fatal for invalid/unresolved configured names | Preserves current missing-skill tolerance | Runtime-specific duplicated logging. |
| Global-only fallback | DS-003, DS-004 | SkillService | Preserve default/additional skill sources after private checks without scanning package roots | Existing global configured skills must keep working while AC-9 holds | Private resolution would cross into another agent. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Source path lookup | Agent-definition providers/source-paths | Extend | They already own file source discovery. | N/A |
| Skill loading | Skills subsystem / `SkillLoader` | Reuse | Loader already parses `SKILL.md` into `Skill`. | N/A |
| Safe configured-skill path/name policy | Skills subsystem | Create focused resolver logic | Existing `normalizeStringArray` only checks string type; resolver needs stronger invariants. | Existing global discovery is intentionally too broad. |
| Global skill discovery | `skill-discovery.ts` | Narrow | Keep true skill-source traversal but remove package-root bundled scans. | N/A |
| Runtime skill exposure | Runtime backends | Reuse | They already consume `Skill[]`. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Definition | Source metadata on definitions | DS-002 | Runtime bootstrap, SkillService | Extend | Add non-persisted source info. |
| Skills | Contextual configured-skill lookup, global-only fallback, safe-name validation, metadata matching | DS-001, DS-003, DS-004 | Runtime bootstrap, skill catalog API | Extend / Narrow | New resolver file plus narrowed discovery helpers. |
| Runtime Execution | Uses contextual API and consumes resolved skills | DS-001 | Codex, Claude, native runtime | Modify | No package path logic here. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-definition/domain/models.ts` | Agent Definition | AgentDefinition | Add optional non-persisted `sourceInfo` shape | Domain object carries runtime-useful source context | Yes |
| `agent-definition/providers/file-agent-definition-provider.ts` | Agent Definition | File provider | Populate sourceInfo when reading shared agents | Source path is known here | Yes |
| `agent-definition/providers/team-local-agent-discovery.ts` | Agent Definition | Team-local discovery | Pass owning `teamDir` into sourceInfo | Team-local source context is known here | Yes |
| `agent-definition/providers/application-owned-agent-source.ts` | Agent Definition | Application-owned reader | Populate agent sourceInfo when natural | Keeps shape complete without expanding scope | Yes |
| `skills/services/configured-agent-skill-resolver.ts` | Skills | Contextual resolver | Resolve configured names with precedence, validation, and metadata checks | Keeps lookup policy out of broad service file | Yes |
| `skills/services/skill-service.ts` | Skills | Public skill service | Expose contextual API; expose/use global-only lookup helpers; stop global bundled fallback | Public runtime and catalog boundary | Yes |
| `skills/services/skill-discovery.ts` | Skills | Global skill discovery | Remove/narrow bundled package-root scans; keep standalone skill-source traversal | Current owner of obsolete global bundled behavior | Yes |
| Runtime bootstrap files | Runtime Execution | Runtime bootstraps | Replace `getSkills(skillNames)` calls | They should use authoritative SkillService boundary | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Agent source metadata | `agent-definition/domain/models.ts` | Agent Definition | Provider and SkillService both need a stable shape | Yes | Yes | A full persistence DTO. |
| Configured skill name validation | `skills/services/configured-agent-skill-resolver.ts` | Skills | All contextual candidates use same safe name | Yes | Yes | Generic slugifier that rewrites names silently. |
| Configured skill lookup result/warnings | `skills/services/configured-agent-skill-resolver.ts` | Skills | Runtime callers need simple `Skill[]`; resolver owns warnings | Yes | Yes | A runtime-specific adapter. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentDefinitionSourceInfo` | Yes | Yes | Low | Keep only `agentDirPath`, optional `teamDirPath`, and optional descriptive ownership fields if needed. Do not duplicate every provider path. |
| Validated configured skill name | Yes | Yes | Low | Do not transform unsafe input into a different name; trim then accept/reject. |
| Resolver input | Yes | Yes | Low | Use `AgentDefinition` or a narrow pick of `skillNames`, `sourceInfo`, and `name/id`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-definition/domain/models.ts` | Agent Definition | Domain model | Add `AgentDefinitionSourceInfo` and optional `sourceInfo` property | Central shape for loaded definitions | N/A |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Agent Definition | File provider | Populate sourceInfo for shared agents and pass team/application source context | Provider knows physical source paths | `AgentDefinitionSourceInfo` |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Agent Definition | Team-local discovery | Include `teamDirPath` for team-local agents | Team ownership is resolved here | `AgentDefinitionSourceInfo` |
| `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts` | Agent Definition | Application-owned source reader | Populate sourceInfo where source paths are already known | Prevents future divergence | `AgentDefinitionSourceInfo` |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Skills | Contextual resolver | Private/team/global-only precedence, safe configured-name validation, and metadata-name matching for all contextual candidates | Concrete policy merits its own file | `Skill`, `AgentDefinitionSourceInfo` |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Skills | Public service | Delegate contextual resolution; expose global-only lookup/listing; remove global package-root bundled lookup/listing | Existing service boundary used by runtime and UI | Resolver, narrowed discovery |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Skills | Global discovery helpers | Remove or stop exporting package-root bundled scan helpers; make `searchDirectoryRecursive`/`scanSkillDirectory` standalone-skill-source-only | Current owner of old global leakage path | `SkillLoader` dependencies |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Runtime Execution | Native single-agent bootstrap | Use contextual configured-skill resolver | Runtime consumes `Skill[]` only | SkillService |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts` | Runtime Execution | Native team-member bootstrap | Use contextual configured-skill resolver | Team-local agents need source context | SkillService |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Runtime Execution | Codex bootstrap | Use contextual configured-skill resolver | Codex materializer already supports arrays | SkillService |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Runtime Execution | Claude bootstrap | Use contextual configured-skill resolver | Claude materializer already supports arrays | SkillService |

## Ownership Boundaries

Agent-definition providers are the authoritative boundary for where an agent definition came from. SkillService is the authoritative boundary for resolving skill names to skill directories. Runtime backends must not depend on both agent definition files and skill directory internals; they should depend on AgentDefinitionService and SkillService only.

Global skill catalog APIs are not a private package discovery API. Private/team-shared package skill discovery belongs behind the contextual configured-skill resolver only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| AgentDefinitionService / providers | Source path discovery and sourceInfo construction | Runtime bootstraps, SkillService resolver inputs | Runtime manually guessing `agents/` or `agent-teams/` paths | Add fields to `sourceInfo`. |
| SkillService contextual configured-skill API | Private/team/global-only lookup precedence, safe-name validation, metadata-name matching | Runtime bootstraps | Runtime directly checks `agentDir/skills`; runtime calls `getSkill(name)` for configured private skills | Add resolver options or methods to SkillService. |
| SkillService global catalog API | True standalone global skill discovery | Skills UI/global tools | Global API scanning package `agents/*` or `agent-teams/*` private paths | Add contextual UI/API separately if private skill browsing is needed. |

## Dependency Rules

Allowed:

- Runtime bootstraps may depend on `AgentDefinitionService` and `SkillService`.
- SkillService may depend on `AgentDefinition` source metadata types and `SkillLoader`.
- Agent-definition providers may populate domain source metadata.
- Contextual resolver may check exact source paths provided by `sourceInfo`.

Forbidden:

- Runtime backends must not inspect `agents/<id>/skills` or `agent-teams/<id>/skills` directly.
- SkillService must not mutate agent definitions or infer `skillNames` from files.
- Private/team-shared skills must not be inserted into a flat global catalog as standalone skills.
- Global fallback must not call `searchBundledSkillDirectory`, `scanBundledSkillsFromDefinitionRoot`, or any equivalent package-root private scan.
- Contextual resolver must not use raw configured names as path segments until they pass safe single-segment validation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillsForAgent(agentDefinition)` | Agent-configured skills | Resolve selected names for one agent context | `AgentDefinition` with `skillNames` and optional `sourceInfo` | Returns `Skill[]`, skipping invalid/unresolved. |
| `ConfiguredAgentSkillResolver.resolve(input)` | Lookup policy | Apply source-aware precedence for one agent | `{ skillNames, sourceInfo, agentName/id }` | Internal to skills subsystem. |
| `validateConfiguredSkillName(rawName)` (internal) | Configured skill name | Trim and accept/reject one safe directory segment | string | Reject empty, absolute, `.`, `..`, path separators, traversal, and multi-segment names. |
| `loadContextualCandidate(expectedName, candidateDir)` (internal) | Contextual candidate | Load `SKILL.md` and require `Skill.name === expectedName` | validated name + exact directory | Applies to private folder, colocated root, and team-shared folder. |
| `SkillService.getSkill(name)` | Global standalone skill | Global skill lookup by name | plain skill name | Searches only true global skill sources. Not used for private configured lookup except via global-only helper. |
| `SkillService.listSkills()` | Global standalone skill catalog | List global skills | none | Does not list private/team-shared package skills. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveConfiguredSkillsForAgent` | Yes | Yes | Low | Requires sourceInfo for private/team resolution; otherwise global-only fallback. |
| `validateConfiguredSkillName` | Yes | Yes | Low | Accept/reject only, no silent slugging. |
| `getSkill(name)` | Yes for global lookup | Plain name | Low after narrowing | Remove package-root bundled scans from this path. |
| `listSkills()` | Yes for global catalog | N/A | Low after narrowing | Remove package-root bundled scans from this path. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Contextual resolver | `ConfiguredAgentSkillResolver` | Yes | Low | Owns configured-agent-specific skill resolution. |
| Source metadata | `AgentDefinitionSourceInfo` | Yes | Low | Keep non-persisted and path-focused. |
| Global-only fallback | `findGlobalSkillLocation` / `getGlobalSkill` helper | Yes | Medium | Name must include `Global` to avoid accidental contextual use. |

## Applied Patterns (If Any)

- Contextual resolver: local strategy-like resolver inside SkillService. It centralizes lookup policy and prevents runtime duplicated path checks.
- Safe path-segment validation: explicit guard before filesystem path construction.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | File | Skills subsystem | Source-aware configured skill resolution, validation, metadata matching | Same subsystem as `SkillService` and discovery | Runtime backend logic; global catalog listing. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | File | Skills subsystem | Standalone global skill-source traversal only | Current discovery helper file | Package-root private/team-shared scans. |
| `autobyteus-server-ts/src/agent-definition/domain/models.ts` | File | Agent-definition domain | Non-persisted source metadata shape | Domain object carries loaded definition context | File read/write logic. |
| `autobyteus-server-ts/src/agent-definition/providers/*` | Files | Agent-definition providers | Populate sourceInfo from real source paths | Providers know source paths | Skill lookup precedence. |
| Runtime backend files | Files | Runtime execution | Call contextual resolver and consume resolved skills | Runtime owns exposure only | Filesystem layout checks. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `skills/services` | Main-Line Domain-Control / Off-Spine Concern | Yes | Low | Skill resolution and discovery are service concerns. |
| `agent-definition/providers` | Persistence-Provider | Yes | Low | Source metadata comes from file provider reads. |
| Runtime backend folders | Runtime-specific adapters | Yes | Low | Only call SkillService; no resolver logic. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shared agent private multi-skill | `agents/writer/agent-config.json` has `skillNames: ["tone", "outline"]`; resolver checks `agents/writer/skills/tone` and `agents/writer/skills/outline`, loading only if each `SKILL.md` has matching `name`. | `SkillService.getSkill("tone")` scans every package globally | Supports agent-private skill folders without global catalog leakage. |
| Team-shared fallback | `agent-teams/editorial/agents/reviewer` references `review-rubric`; resolver falls back to `agent-teams/editorial/skills/review-rubric` and verifies frontmatter `name: review-rubric`. | Copying `review-rubric` into every local agent; or global `getSkill("review-rubric")` finding another team's rubric | Team owns shared policy once without cross-team leakage. |
| Single root private skill | `agents/writer/SKILL.md` has `name: writer-style`; config references `writer-style`; resolver loads colocated root only for that agent. | Resolving `writer-style` by guessing `agents/writer-style` | Supports root single-skill layout without folder-name coupling. |
| Global-only fallback | Missing private `tone` falls back only to `<defaultSkillsDir>/tone/SKILL.md` or explicit skill source dirs. | Fallback calls `searchBundledSkillDirectory` and finds `agents/other-agent/SKILL.md` | AC-9 and contextual privacy depend on this. |
| Path-unsafe configured names | `skillNames: ["tone"]` accepted; `skillNames: ["../tone", "foo/bar", "/tmp/x", ""]` warn and skip. | Joining raw `skillName` into `path.join(agentDir, "skills", skillName)` | Prevents traversal and ambiguous multi-segment lookup. |
| Codex materialization | Resolved private `tone` at `/pkg/agents/writer/skills/tone` is passed as a normal `Skill` with `rootPath`; Codex materializer symlinks it into `.codex/skills/tone`. | Runtime directly checks package paths or rewrites Codex skill layout | Codex needs no private-skill-specific path logic beyond consuming resolved `Skill[]`. |
| Metadata mismatch | Folder `skills/tone/SKILL.md` with `name: other` warns/skips for configured `tone`. | Materializing folder path regardless of frontmatter | Configured identity must match loaded skill identity. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep runtime configured skills on flat `getSkills(skillNames)` only | Lowest code churn | Rejected | Runtime callers use contextual `resolveConfiguredSkillsForAgent`. |
| Keep global package-root bundled scans in `getSkill/listSkills` | Existing tests may expect bundled root skills in global catalog | Rejected | Remove/narrow those scans; private/team-shared package skills are contextual only. |
| Auto-infer colocated `SKILL.md` when `skillNames` is empty | Convenient for one-skill packages | Rejected for this slice | Keep `skillNames` authoritative; add separate requirement if desired. |
| Merge private/team-shared skills into global list | Easy discovery implementation | Rejected | Contextual resolver resolves private/team-shared skills only for owning agent context. |
| Silently slug or normalize unsafe configured names | Could make user input more forgiving | Rejected | Trim then accept/reject; warn and skip invalid names. |

## Derived Layering (If Useful)

`GraphQL/API -> AgentDefinitionService -> AgentDefinitionProvider(sourceInfo) -> Runtime Bootstrap -> SkillService contextual resolver -> Runtime-specific skill exposure`

`Skills UI/global tools -> SkillService global catalog API -> global-only skill-discovery -> default/additional skill dirs`

## Migration / Refactor Sequence

1. Add `AgentDefinitionSourceInfo` to `AgentDefinition` domain constructor/options.
2. Populate `sourceInfo` in shared agent reads, team-local agent reads, and application-owned reads where source paths are already available.
3. Narrow `skill-discovery.ts` global helpers:
   - Remove/stop exporting `searchBundledSkillDirectory` and `scanBundledSkillsFromDefinitionRoot`, or leave them unused only until tests are migrated.
   - Remove bundled-scan calls from `searchDirectoryRecursive` and `scanSkillDirectory`.
   - Ensure `scanSkillDirectory` searches only direct standalone skill dirs and nested `skills/` dirs.
4. Narrow `SkillService` global APIs:
   - `findSkillLocation` / `getSkill` search only default/additional skill dirs.
   - `listSkills` scans only default/additional skill dirs.
   - Add an internal `getGlobalSkill` or equivalent helper with a name that makes global-only behavior explicit.
5. Add `ConfiguredAgentSkillResolver` with lookup helpers:
   - Validate configured name: trim; reject empty, absolute, `.`, `..`, path separators `/` or `\\`, traversal-like or multi-segment values.
   - For each contextual candidate, load the skill and require `skill.name === configuredName`.
   - Check `agentDir/skills/<skillName>`.
   - Check colocated `agentDir/SKILL.md` by loading `agentDir` and matching metadata name.
   - Check `teamDir/skills/<skillName>` when `teamDir` exists.
   - Fall back through global-only skill lookup.
6. Add `SkillService.resolveConfiguredSkillsForAgent` and delegate to the resolver.
7. Replace runtime configured-skill calls in native single-agent, native team-member, Codex, and Claude bootstraps.
8. Keep Codex materialization on the normal path: `CodexThreadBootstrapper` consumes resolved `Skill[]`, and `CodexWorkspaceSkillMaterializer` symlinks each resolved `Skill.rootPath` into `.codex/skills/<sanitizedSkillName>`.
9. Update/remove tests that assert private bundled skills appear as flat global package skills.
10. Add tests for:
   - AC-1 through AC-11.
   - Resolver fallback does not cross into another agent/team private root `SKILL.md`.
   - `getSkill/listSkills` exclude package private/team-shared skills.
   - Invalid/path-like configured names warn and skip.
   - Metadata mismatch in agent-private folder and team-shared folder warns and skips.
11. Run targeted unit/integration tests for skills service, skill discovery, agent definition provider, and runtime bootstraps.

## Key Tradeoffs

- Keeping `skillNames` authoritative avoids hidden behavior and preserves explicit package config, but package authors must list private skills.
- Context-aware resolution is more work than scanning all folders globally, but it keeps private/team-shared package layout ownership clear while relying on product-level unique skill names.
- Removing package-root bundled scans from global APIs is a behavior change, but it is necessary for AC-9 and contextual privacy.
- Package-root shared `skills/` is deferred to keep this slice focused on the user's clarified first layouts.

## Risks

- Existing UI or tests may currently assume bundled root `SKILL.md` is global. The implementation must intentionally adjust tests and any UI assumptions to the contextual private model.
- If some runtime path receives an `AgentDefinition` without `sourceInfo`, private/team-shared resolution will fall back to global skills only. Tests should cover provider-loaded definitions, not only hand-built definitions.
- Root or folder `SKILL.md` with metadata name different from configured name will no longer resolve; this may expose malformed package configs.
- Additional skill sources pointed at an agent package root will no longer globally expose `agents/*/SKILL.md`. This is intended for AC-9; users should use contextual agent package resolution for private skills.

## Guidance For Implementation

- Keep runtime code simple: resolve agent definition, call `skillService.resolveConfiguredSkillsForAgent(agentDef)`, pass returned `Skill[]` to existing materialization/exposure logic.
- Do not add package path checks to Codex/Claude/native runtime classes.
- Prefer unit tests for the resolver with temporary directory fixtures because precedence, validation, and metadata matching are the most important behavior.
- Add explicit tests proving `SkillService.getSkill/listSkills` are global-only and cannot see package private/team-shared layouts.
- Add at least one integration-style provider/runtime bootstrap test proving team-local `teamDir/skills` resolution.
