# Design Spec

## Current-State Read

The current Skills page is fed by the normal global skill catalog:

`/skills route -> SkillsList.vue -> skillStore.fetchAllSkills() -> GraphQL GET_SKILLS -> SkillResolver.skills() -> SkillService.listSkills()`

Before commit `716a570374c4e86abab8bd53ab9555f2c4aaed15`, `SkillService.listSkills()` and `SkillService.getSkill(name)` also scanned definition/package roots, so bundled package skills appeared as normal Skills page rows.

Current code removed that package-root scanning from the normal catalog. `SkillService.listSkills()` now scans only `getSkillsDir()` and `getAdditionalSkillsDirs()` through `scanSkillDirectory()`. `scanSkillDirectory()` loads direct child skill dirs and nested literal `skills/` folders, but it does not scan agent package layouts.

Runtime still resolves package/private skills through `SkillService.resolveConfiguredSkillsForAgent()` and `ConfiguredAgentSkillResolver`, using `AgentDefinition.sourceInfo.agentDirPath` and `teamDirPath`. That runtime resolver is useful and should stay, but it does not satisfy the user-facing Skills page browsing requirement.

## Intended Change

Restore original Skills page/catalog behavior by reintroducing bundled package/definition-root skill discovery into the normal `SkillService` catalog, while extending it for all currently supported package skill layouts.

Package/private skills should appear and open like normal Skills page entries. No separate read-only catalog, catalog ID, or special package-only UI is required for this ticket.

Supported bundled layouts:

- `agents/<agent-id>/SKILL.md`
- `agents/<agent-id>/skills/<skill-name>/SKILL.md`
- `agent-teams/<team-id>/agents/<agent-id>/SKILL.md`
- `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`
- `agent-teams/<team-id>/skills/<skill-name>/SKILL.md`

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / behavior restoration after false refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Git history shows package-root scan helpers were removed from `SkillService`/`skill-discovery` in `716a5703`; current UI still depends on `SkillService.listSkills()`; user confirmed original normal Skills page behavior should be restored.
- Design response: Restore package/definition-root bundled skill discovery into `SkillService` global catalog, with layout support for colocated root skills, multi-skill folders under agents, team-local agent skills, multi-skill folders under team-local agents, and team-shared `skills/` folders.
- Refactor rationale: The refactor overcorrected by making package skills runtime-contextual only and removing user-facing catalog visibility. The right response is to restore the existing catalog owner instead of adding a separate display system.
- Intentional deferrals and residual risk, if any: Duplicate-name UX remains simple first-seen de-duplication, matching current catalog behavior. Rich provenance UI can be future work.

## Terminology

- `Global skill`: A skill under the default skills dir or `AUTOBYTEUS_SKILLS_PATHS`.
- `Definition root`: A root containing `agents/` and/or `agent-teams/`; includes app data dir and configured agent package roots.
- `Bundled skill`: A skill directory found under an agent/team definition layout.
- `Colocated root skill`: A `SKILL.md` directly in an agent directory.
- `Multi-skill folder`: A `skills/<skill-name>/SKILL.md` directory under an agent or team.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the hidden-from-Skills-page behavior introduced by the false refactor.
- Treat removal as first-class design work: tests/docs that assert package skills are absent from the normal skill catalog must be updated or removed.
- Decision rule: do not keep a separate compatibility catalog for package skills; restore normal catalog behavior directly.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Skills page list load | Render global + bundled package skill cards | SkillService normal catalog | Restores missing Skills page entries. |
| DS-002 | Primary End-to-End | User opens bundled skill | Skill Detail/File Explorer displays bundled skill root | SkillService + SkillWorkspace | Restores existing view/edit path for package skills. |
| DS-003 | Primary End-to-End | Agent runtime bootstrap | Contextual package skills resolved for execution | ConfiguredAgentSkillResolver | Ensures runtime multi-skill support remains intact. |
| DS-004 | Bounded Local | Catalog scan | De-duped sorted skill list | Skill discovery helpers | Defines precedence and supported layouts. |

## Primary Execution Spine(s)

- DS-001: `SkillsList -> skillStore.fetchAllSkills -> GraphQL skills -> SkillService.listSkills -> GlobalSkillDiscovery + BundledSkillDiscovery -> Skill cards`
- DS-002: `Skill card(name) -> SkillDetail(skillName) -> GraphQL skill(name) -> SkillService.getSkill -> SkillWorkspace(skillName) -> FileExplorer`
- DS-003: `Runtime bootstrap -> AgentDefinitionService -> SkillService.resolveConfiguredSkillsForAgent -> ConfiguredAgentSkillResolver -> materializer/runtime config`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Skills page keeps using the normal skills query. The backend normal catalog again includes bundled package/definition-root skills. | Skills page, GraphQL skills, SkillService, discovery helpers | SkillService | Sorting, duplicate-name de-dup |
| DS-002 | Opening a bundled skill works through existing name-based detail/workspace flow. `getSkill(name)` uses the same discovery precedence as the list and returns the bundled root. | Skill card, SkillDetail, SkillService, SkillWorkspace | SkillService / SkillWorkspace | File explorer existing permissions |
| DS-003 | Runtime uses the context-first resolver and remains independent of list-order-only catalog discovery. | Runtime bootstrap, agent definition, resolver | ConfiguredAgentSkillResolver | Path safety, metadata name validation |
| DS-004 | Discovery scans global skill roots first, then app-data/package definition roots, adding unseen skill names in deterministic order. | Discovery helpers, SkillLoader, de-dupe set | SkillService | Layout traversal |

## Spine Actors / Main-Line Nodes

- `SkillsList.vue`: user-facing catalog list.
- `skillStore.fetchAllSkills()`: existing frontend catalog loader.
- `SkillResolver.skills()`: GraphQL boundary for the normal skill catalog.
- `SkillService.listSkills()` / `getSkill(name)`: authoritative normal catalog owner.
- `skill-discovery` helpers: filesystem discovery implementation.
- `SkillWorkspace.create(skillName)`: existing file explorer workspace for a skill root.
- `ConfiguredAgentSkillResolver`: runtime context-first resolver.

## Ownership Map

- `SkillService` owns the normal skill catalog, including global and bundled package skills.
- `skill-discovery` owns reusable filesystem scanning helpers, not UI or runtime policy.
- `ConfiguredAgentSkillResolver` owns runtime context-first resolution and should not replace Skills page catalog scanning.
- `SkillWorkspace` owns opening a discovered skill root for File Explorer.
- Frontend Skills components own display/search only.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `skills` query | `SkillService.listSkills()` | API boundary for normal Skills page catalog | Layout-specific scan policy outside service/discovery |
| GraphQL `skill(name)` query | `SkillService.getSkill(name)` | API boundary for normal skill detail | Runtime contextual owner selection |
| `SkillWorkspace.create(skillName)` | `SkillService.getSkill(name)` | Workspace creation for File Explorer | Separate package catalog identity |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Hidden-only package skill catalog behavior | User explicitly rejected the false refactor behavior | Restored `SkillService` bundled discovery | In This Change | Update tests/docs. |
| E2E assertions that package skills are absent from `skills`/`skill(name:)` | They encode the unwanted regression | New E2E assertions that package skills are present and openable | In This Change | Keep runtime context tests. |
| Separate read-only `SkillCatalogService` proposal | No longer matches clarified requirement | Normal SkillService catalog | In This Change | Do not implement. |

## Return Or Event Spine(s) (If Applicable)

No event spine is required.

## Bounded Local / Internal Spines (If Applicable)

- Catalog scan cycle: `global skill dirs -> app data definition root -> configured agent package roots -> bundled layout scanners -> SkillLoader -> de-dupe by skill.name -> sorted list`.
- Detail lookup cycle: `skill name -> global dirs -> definition roots -> first matching bundled layout -> SkillLoader`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Duplicate-name de-dupe | DS-001, DS-004 | SkillService | Preserve first-seen skill by `name` | Matches existing catalog shape | UI would show ambiguous duplicates |
| Layout scanning helpers | DS-001, DS-002, DS-004 | SkillService | Find bundled skill directories in supported package layouts | Keeps discovery testable | Runtime resolver would become display owner |
| Runtime context safety | DS-003 | ConfiguredAgentSkillResolver | Prefer owning agent/team private skills at runtime | Preserves new multi-skill runtime support | Catalog order could alter runtime behavior unexpectedly |
| E2E fixture setup | DS-001, DS-002, DS-003 | Validation | Import/configure local package and verify UI/API | Prevents another false refactor | Unit-only coverage misses page regression |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Normal skill listing/detail | `SkillService` | Extend/restore | It already governs Skills page and workspaces | N/A |
| Filesystem skill loading | `SkillLoader` | Reuse | Existing SKILL.md parser/root loader | N/A |
| Runtime configured skills | `ConfiguredAgentSkillResolver` | Reuse unchanged | Correct owner for agent execution | N/A |
| Skills page UI | Existing frontend Skills module | Reuse unchanged/minimal | Existing behavior should return naturally from backend data | N/A |
| File browsing/editing | Existing SkillWorkspace/File Explorer | Reuse | User wants original behavior, not new view-only mode | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills backend subsystem | Global + bundled catalog discovery, skill detail lookup | DS-001, DS-002, DS-004 | SkillService | Extend/restore | Main implementation area. |
| Agent runtime subsystem | Context-first configured skill resolution | DS-003 | ConfiguredAgentSkillResolver | Reuse | Keep existing tests. |
| Frontend Skills module | List/detail UI | DS-001, DS-002 | SkillsList, SkillDetail | Reuse | Ideally little/no change. |
| Validation suite | Unit + GraphQL/E2E coverage | All | Tests | Extend | Mandatory E2E coverage. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/skills/services/skill-discovery.ts` | Skills backend | Discovery helpers | Restore/extend definition-root bundled skill scan helpers | Existing discovery file | SkillLoader |
| `src/skills/services/skill-service.ts` | Skills backend | SkillService | Include definition roots in list/get lookup with first-seen precedence | Existing catalog owner | Discovery helpers |
| `src/config/app-config.ts` | Config | App config | Existing `getAdditionalAgentPackageRoots()` used by discovery | Existing config owner | N/A |
| `tests/unit/skills/services/skill-service.test.ts` | Tests | Unit validation | Cover all layouts and duplicate precedence | Existing service tests | Fixtures |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` or new e2e | Tests | E2E validation | Import package, verify skills catalog/detail/open content | Existing package-skill E2E area | Fixtures |
| `autobyteus-web/docs/skills.md` | Docs | Skills docs | Restore normal package skill visibility docs | Existing docs owner | N/A |
| `autobyteus-web/docs/settings.md` | Docs | Settings docs | Remove hidden-only claim | Existing docs owner | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Definition-root enumeration | `skill-discovery.ts` helper such as `getAllDefinitionRoots` | Skills backend | Used by list and get lookup | Yes | Yes | A package service dependency blob |
| Bundled layout scan | `scanBundledSkillsFromDefinitionRoot` / related helpers | Skills backend | Unit-testable layout scan | Yes | Yes | Runtime resolver replacement |
| Single skill lookup in bundled layouts | `searchBundledSkillDirectory` or equivalent | Skills backend | Used by `getSkill(name)` | Yes | Yes | Recursive arbitrary path search |

## Shared Structure / Data Model Tightness Check

No new shared DTO is needed. Continue using existing `Skill` model. The restored behavior intentionally treats bundled skills as normal skill entries.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Skills backend | Skill discovery | Reintroduce definition-root helpers and scan/search all supported bundled layouts | Existing discovery owner | `SkillLoader` |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Skills backend | SkillService | Use global dirs first, then definition roots, for list and get lookup; preserve de-dupe | Existing catalog owner | Discovery helpers |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | Tests | SkillService tests | Layout, getSkill, listSkills, duplicate precedence coverage | Existing unit test owner | Fixtures |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` or new file | Tests | E2E validation | Package import + skills catalog/detail verification | Existing E2E area matches package skill work | Fixtures |
| `autobyteus-web/docs/skills.md` | Docs | Skills behavior docs | State package/private skills appear normally in Skills page | Existing docs | N/A |
| `autobyteus-web/docs/settings.md` | Docs | Package settings docs | Remove/update claim that package skills are hidden from global Skills page | Existing docs | N/A |

## Ownership Boundaries

- `SkillService` is the authoritative boundary for normal Skills page listing and name-based skill detail lookup.
- `skill-discovery` provides filesystem scan/search helpers under `SkillService`; callers outside skills subsystem should not bypass `SkillService` to scan package roots.
- `ConfiguredAgentSkillResolver` remains the authoritative boundary for runtime configured skill resolution and source-context priority.
- Frontend remains a consumer of `skills`/`skill(name)` and should not grow package-specific scanning logic.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillService.listSkills()` | Global + definition-root scan, de-dupe, sort | GraphQL `skills`, agent form current global listing, Skills page | Frontend scans package directories | Extend discovery helpers under SkillService |
| `SkillService.getSkill(name)` | Global + bundled search precedence | GraphQL `skill(name)`, SkillWorkspace | Workspace scans package roots independently | Extend `getSkill` search helpers |
| `ConfiguredAgentSkillResolver` | Context-first private/team skill lookup | Runtime bootstrappers | Runtime depends on `listSkills()` ordering for contextual private skills | Extend resolver only for runtime-specific needs |

## Dependency Rules

Allowed:

- `SkillService` may depend on `getAllSkillDirectories()` and restored `getAllDefinitionRoots()`/bundled discovery helpers.
- `SkillService` may use `appConfigProvider.config.getAdditionalAgentPackageRoots()` through its config interface.
- Runtime bootstrappers continue using `resolveConfiguredSkillsForAgent()`.

Forbidden:

- Do not add package-skill scanning in frontend components.
- Do not replace runtime context resolver with global catalog lookup.
- Do not create a separate catalog ID API for this restoration ticket.
- Do not remove existing multi-skill runtime support.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SkillService.listSkills()` | Normal skill catalog | List global + bundled skills | none | Restore package roots here. |
| `SkillService.getSkill(name)` | Normal skill lookup | Resolve first matching skill by name | `name` | Restore bundled lookup here. |
| `GraphQL skills` | Normal skill catalog API | Return `listSkills()` | none | Existing UI keeps working. |
| `GraphQL skill(name)` | Normal skill detail API | Return `getSkill(name)` | `name` | Existing detail/workspace keeps working. |
| `resolveConfiguredSkillsForAgent(agentDefinition)` | Runtime contextual skills | Resolve configured skills for one agent | agent definition context + names | Keep context-first. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- For this ticket, the product accepts normal name-based catalog behavior and first-seen duplicate precedence.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `listSkills()` | Yes | N/A | Medium due duplicate names | Preserve first-seen de-dupe; future provenance UX optional. |
| `getSkill(name)` | Yes | Name only | Medium | Use same precedence as list. |
| `resolveConfiguredSkillsForAgent` | Yes | Agent context + names | Low | Keep context-first path. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Normal catalog owner | `SkillService` | Yes | Low | Restore previous responsibility. |
| Discovery helpers | `skill-discovery.ts` | Yes | Low | Keep filesystem scanning here. |
| Runtime resolver | `ConfiguredAgentSkillResolver` | Yes | Low | Keep runtime-specific. |

## Applied Patterns (If Any)

- Registry/catalog pattern: `SkillService` remains the normal skill catalog registry.
- Discovery helper pattern: `skill-discovery.ts` owns scan/search helpers that feed the catalog.
- Contextual resolver pattern: `ConfiguredAgentSkillResolver` remains separate for runtime context priority.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | File | Discovery helpers | Scan/search global and bundled skill layouts | Existing discovery file | UI behavior |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | File | SkillService catalog | Combine scan sources in correct precedence for list/get | Existing catalog owner | Frontend concerns |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | File | Unit tests | Layout and precedence coverage | Existing skill service tests | E2E import flow |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | File | E2E tests | Package import + Skills catalog/detail coverage | Existing package-private skills E2E | UI-only fragile selectors unless already available |
| `autobyteus-web/docs/skills.md` | File | Docs | Skills page behavior | Existing docs | False hidden claim |
| `autobyteus-web/docs/settings.md` | File | Docs | Agent package behavior | Existing docs | False hidden claim |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/skills/services` | Main-Line Domain-Control | Yes | Low | Skill catalog/discovery already lives here. |
| `tests/e2e/agent-definitions` | Validation | Yes | Low | Existing package-private skill E2E lives here. |
| `autobyteus-web/docs` | Docs | Yes | Low | Existing product docs live here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Restored listing | `SkillService.listSkills()` includes `solution-designer` from `agent-teams/software-engineering-team/agents/solution-designer/SKILL.md`. | `solution-designer` only appears in agent detail raw `skillNames`. | Restores the user-facing Skills page. |
| Multi-skill folder support | `agents/writer/skills/tone/SKILL.md` and `agents/writer/skills/outline/SKILL.md` both appear. | Only scanning `agents/writer/SKILL.md`. | Preserves newer package feature. |
| Team-shared skills | `agent-teams/editorial/skills/rubric/SKILL.md` appears in normal Skills catalog. | Only runtime resolver can find `rubric`. | User can browse team-shared skill content. |
| Duplicate names | Global `rubric` wins over later package `rubric`; only first appears. | UI shows two indistinguishable `rubric` cards. | Matches simple existing catalog identity. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Separate read-only skill catalog API | Proposed after reviewer noted workspace mutation paths | Rejected after user clarification | Restore normal SkillService catalog behavior. |
| Keep package skills hidden and only visible in agent detail | Current refactor behavior | Rejected | Reintroduce bundled skill scanning. |
| Add frontend-only package scan | Could show cards quickly | Rejected | Backend SkillService remains catalog owner. |

## Derived Layering (If Useful)

- Frontend UI/state: unchanged normal Skills page path.
- GraphQL API: unchanged `skills` and `skill(name)` path.
- Backend service: `SkillService` restored to include bundled discovery.
- Discovery helper: `skill-discovery.ts` extended for package layouts.
- Runtime: `ConfiguredAgentSkillResolver` unchanged context-first path.

## Migration / Refactor Sequence

1. Use Git history before `716a5703` to recover the previous definition-root helper shape.
2. Reintroduce `getAllDefinitionRoots(config)` using app data dir plus `getAdditionalAgentPackageRoots()` with path de-duplication.
3. Extend bundled scan/search helpers to support all five required layouts.
4. Update `SkillService` config type to include `getAdditionalAgentPackageRoots()`.
5. Update `SkillService.listSkills()` to scan global skill dirs first, then definition roots, using existing `seen` de-dup by skill name.
6. Update `SkillService.getSkill(name)` to search global skill dirs first, then bundled definition roots.
7. Preserve `ConfiguredAgentSkillResolver` behavior and tests.
8. Replace tests that assert bundled package skills are absent from global catalog with tests asserting presence.
9. Add/adjust E2E coverage to import/configure a local agent package fixture and verify package skills appear in `skills`, resolve via `skill(name)`, and expose content/root path.
10. Update docs to describe package skills as normal Skills page entries again.

## Key Tradeoffs

- This is simpler and closer to original product behavior than a separate display catalog.
- Name-only identity remains imperfect for duplicates, but it is accepted as current/simple behavior and matches existing `seen` de-dup.
- Package skills may be editable when the underlying files are writable, matching the user's preference to restore original behavior and avoid unnecessary permission complexity.

## Risks

- Duplicate names may hide later package skills. Mitigated by deterministic precedence; future provenance UI can improve this separately.
- Restoring `getSkill(name)` package lookup may allow name-based package skill access outside the owning runtime context, as before. This is accepted for restoring original Skills page functionality.
- E2E must be robust enough to catch future refactors that accidentally remove package-root scanning again.

## Guidance For Implementation

- Prefer restoring code shape from pre-`716a5703`, but extend it for the newer multi-skill layouts instead of copying it blindly.
- Do not introduce a new catalog identity or read-only workspace system for this ticket.
- Keep frontend changes minimal unless generated GraphQL types or tests require updates.
- Make E2E validation mandatory and explicit: imported package skill visible in catalog and openable/readable through normal skill detail API/path.
- Update docs/tests that currently encode the false hidden behavior.
