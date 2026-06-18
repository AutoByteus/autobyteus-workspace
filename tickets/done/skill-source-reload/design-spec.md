# Design Spec

## Current-State Read

The Skills page already has a healthy basic catalog spine, but it lacks a user-facing reload command. `autobyteus-web/components/skills/SkillsList.vue` fetches all skills only on mount through `skillStore.fetchAllSkills()`. `SkillSourcesModal.vue` refreshes the list after add/remove source, but there is no action for the user case where a previously-added source folder changes on disk.

On the backend, `autobyteus-server-ts/src/skills/services/skill-service.ts` is the authoritative skill catalog owner. It reads the default skills directory, additional skill directories from `AUTOBYTEUS_SKILLS_PATHS`, app-data definition roots, and additional agent-package roots through `skill-discovery.ts`. `SkillLoader.loadSkill()` reads `SKILL.md` and counts files from disk each time. Therefore the backend does not currently have a stale skill cache for the Skills page; stale visible data is caused by frontend Pinia state not being refreshed by an explicit user command.

The analogous agent-package reload flow is implemented as an explicit command boundary (`AgentPackageService.reloadAgentPackage()` -> GraphQL `reloadAgentPackage` -> `agentPackagesStore.reloadAgentPackage()` -> reload button in `AgentPackagesManager.vue`). The skill reload design should use the same command-boundary principle, but not copy agent-package cache behavior wholesale because skill catalog scans are already filesystem-backed.

Constraints the target design must respect:

- Preserve existing skill discovery precedence and malformed-skill warning/skip behavior.
- Preserve disabled-skill state application by skill name.
- Do not imply active running agents reload already-materialized prompt/skill content.
- Keep source management add/remove behavior intact.
- Use existing `SkillService`, `SkillResolver`, `skillStore`, and `skillSourcesStore` ownership rather than adding a parallel reload coordinator.

## Intended Change

Add an explicit global `reloadSkillCatalog` capability. The backend mutation rescans all configured skill sources using `SkillService`, returns both refreshed skills and refreshed skill source metadata, and the frontend applies both slices to Pinia state. The Skills page gets a Reload button beside the existing Sources and Create Skill controls, with loading, success, and error feedback.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior gap
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, small command-boundary gap
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor; only focused extension of existing owners
- Evidence: `SkillService` and `skill-discovery.ts` already own discovery; `SkillLoader` reads disk every call; frontend state is only refreshed on mount/add/remove; agent-package reload has explicit command precedent.
- Design response: Add one explicit reload command to the skill catalog boundary and wire it into existing stores/UI.
- Refactor rationale: Creating a new reload service or redesigning discovery would duplicate ownership. A frontend-only button would solve current stale state but would bypass the backend semantic command boundary and make future cache invalidation harder.
- Intentional deferrals and residual risk, if any: Automatic file watching, per-source reload, and active-run hot reload are deferred because they are materially different behaviors. Residual risk is user expectation: UI copy/docs must avoid implying active sessions reload their already-loaded skill content.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design from the reload data-flow spine first, then the backend/frontend ownership allocation, then concrete files and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no obsolete reload path exists. This is additive behavior over existing source add/remove and query flows.
- In-scope removals: none.
- Compatibility rejection: do not add a compatibility-style frontend-only reload that silently calls existing queries while leaving no backend reload command; that would preserve the current missing command boundary.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks Reload on Skills page | Updated skill cards and source counts in Pinia/UI | Skill catalog reload command (`SkillService` + `skillStore`) | Core requested behavior. |
| DS-002 | Return-Event | Backend reload result | Frontend success/error feedback | `skillStore.reloadSkillCatalog()` | Determines how refreshed catalog data and failures return to UI. |
| DS-003 | Bounded Local | `SkillService.reloadSkillCatalog()` | Rescanned `skills` + `skillSources` result | `SkillService` | Keeps filesystem scan and future invalidation inside backend owner. |

## Primary Execution Spine(s)

`SkillsList Reload Button -> skillStore.reloadSkillCatalog() -> GraphQL reloadSkillCatalog mutation -> SkillResolver.reloadSkillCatalog() -> SkillService.reloadSkillCatalog() -> skill-discovery/SkillLoader filesystem scan -> SkillCatalogReloadResult -> Pinia skill/source state -> refreshed skill cards/source counts`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user invokes reload from the Skills page. The frontend store sends one mutation to the backend skill catalog boundary. Backend scans current configured sources and returns refreshed skills plus source metadata. The store updates both catalog slices, causing cards and source counts to reflect disk state. | Skills page action, skill store reload command, GraphQL skill reload boundary, SkillService catalog owner, filesystem discovery, Pinia catalog state | `SkillService` for backend catalog; `skillStore` for frontend skill list state | Localization, success/error presentation, generated GraphQL artifacts |
| DS-002 | The mutation either returns a complete reload result or errors. On success, old state is replaced with returned slices and a success message is shown. On failure, previous list state remains and error is exposed. | Mutation response, store state update, UI feedback | `skillStore.reloadSkillCatalog()` | Error normalization, duplicate-submit guard |
| DS-003 | Inside the backend owner, reload gathers `listSkills()` and `getSkillSources()` using existing discovery helpers. It does not duplicate scanning rules or refresh unrelated agent/team definition caches. | SkillService reload method, discovery dependencies, loader, disabled-store application | `SkillService` | Existing warning/skip policy for invalid skills |

## Spine Actors / Main-Line Nodes

- `SkillsList.vue` reload control: initiates the user action.
- `skillStore.reloadSkillCatalog()`: frontend command owner for updating skill list state from reload.
- GraphQL `reloadSkillCatalog`: transport boundary for the reload command.
- `SkillResolver.reloadSkillCatalog()`: backend GraphQL adapter and DTO mapper.
- `SkillService.reloadSkillCatalog()`: authoritative backend owner for rescan semantics.
- `skill-discovery.ts` / `SkillLoader`: internal filesystem scan/load mechanisms.
- Pinia `skills` and `skillSources`: visible frontend catalog state.

## Ownership Map

- `SkillsList.vue` owns placement and user feedback for the list-page reload action. It must not own filesystem/source scan semantics.
- `skillStore.ts` owns frontend skill catalog state and the reload command lifecycle (`reloading`, error propagation, state replacement).
- `skillSourcesStore.ts` owns source metadata state and exposes a narrow setter/replacer used by reload.
- `SkillResolver` is a thin transport adapter: it maps backend domain models to GraphQL object types.
- `SkillService` owns source/list discovery semantics, disabled flag application, and the explicit reload command. It is the governing owner behind the GraphQL boundary.
- `skill-discovery.ts` and `SkillLoader` remain internal mechanisms behind `SkillService`, not public reload boundaries.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `reloadSkillCatalog` mutation | `SkillService.reloadSkillCatalog()` | Transport/API boundary for frontend | Filesystem scan rules, disabled state policy |
| `SkillsList.vue` button | `skillStore.reloadSkillCatalog()` | User-facing trigger and feedback | Backend reload semantics or source counting |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| N/A | No existing reload path exists. | N/A | In This Change | Additive feature. |

## Return Or Event Spine(s) (If Applicable)

`SkillService reload result -> SkillResolver mapping -> GraphQL mutation payload -> skillStore state replacement -> SkillsList success/error rendering`

The return payload must be complete enough for frontend state replacement. Do not return only a boolean and force the UI to issue separate follow-up queries; that would spread reload coordination across callers.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `SkillService`

`reloadSkillCatalog() -> listSkills() -> scanSkillDirectory()/scanBundledSkillsFromDefinitionRoot() -> SkillLoader.loadSkill() -> apply disabled flags/deduplicate/sort -> getSkillSources()/countSkillsInSourceDirectory() -> result`

This local spine matters because it prevents reload from inventing a second discovery path. Future cache invalidation can be inserted inside this owner without changing callers.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization keys | DS-001, DS-002 | `SkillsList.vue` | User-facing labels/messages for Reload, Reloading, success/failure | Existing Skills module localizes strings | Hard-coded strings can fail localization guard and reduce UX consistency |
| Error normalization | DS-002 | `skillStore` | Convert GraphQL errors into store error string | Store already owns errors | UI components duplicate GraphQL error parsing |
| Source metadata replacement | DS-001 | `skillSourcesStore` | Replace source list with reload result | Keeps source state owner authoritative | `skillStore` mutates another store's internal refs directly |
| Generated GraphQL artifact | DS-001 | Frontend GraphQL integration | Keep generated schema/types in sync if project workflow requires | Some stores consume generated types | Stale generated artifact can break typed consumers or codegen checks |
| Documentation update | DS-001 | Delivery docs sync | Explain manual reload and active-run limitation | Avoids user expectation mismatch | Users may expect active runs to hot-reload skills |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend skill rescan command | Skills backend (`SkillService`) | Extend | Already owns list/source discovery and disabled state | N/A |
| GraphQL API | Existing `SkillResolver` | Extend | Existing skill/source queries and mutations live here | N/A |
| Frontend skill list state | `skillStore` | Extend | Owns skill list and current skill | N/A |
| Frontend source state | `skillSourcesStore` | Extend | Owns source list | N/A |
| UI action | `SkillsList.vue` | Extend | Header already owns list-level actions | N/A |
| Discovery rules | `skill-discovery.ts` | Reuse | Existing scan rules are correct | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Skills Catalog | Reload method, source/list scan result, disabled state application | DS-001, DS-003 | `SkillService` | Extend | No separate reload service. |
| Backend GraphQL Skills API | Reload result type and mutation | DS-001, DS-002 | `SkillResolver` -> `SkillService` | Extend | Resolver remains a mapper. |
| Frontend Skills State | Reload action, loading/error state, skill list replacement | DS-001, DS-002 | `skillStore` | Extend | Imports source store for setter only. |
| Frontend Skill Sources State | Source list replacement | DS-001 | `skillSourcesStore` | Extend | Add narrow setter. |
| Frontend Skills UI | Reload button and feedback | DS-001, DS-002 | `SkillsList.vue` | Extend | Same header group as Sources/Create. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Backend Skills Catalog | `SkillService` | Add reload method returning skills and source metadata | Existing catalog owner | Uses existing `Skill` and `SkillSourceInfo` |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Backend GraphQL Skills API | `SkillResolver` | Add result object type and mutation mapper | Existing skill GraphQL owner | Reuses `Skill`, `SkillSource` GraphQL types |
| `autobyteus-web/graphql/skillSources.ts` or `skills.ts` | Frontend GraphQL Documents | GraphQL document boundary | Add reload mutation document | Existing handwritten docs | Reuse existing skill/source fields |
| `autobyteus-web/stores/skillStore.ts` | Frontend Skills State | `skillStore` | Add reload action and state | Existing skill state owner | Reuse `Skill` type; import source setter |
| `autobyteus-web/stores/skillSourcesStore.ts` | Frontend Skill Sources State | `skillSourcesStore` | Add source list replacement method | Existing source state owner | Existing `SkillSource` interface |
| `autobyteus-web/components/skills/SkillsList.vue` | Frontend Skills UI | Skills list page | Add reload button/feedback | Existing list actions live here | Store action only |
| `autobyteus-web/localization/messages/en/skills.ts` and `zh-CN/skills.ts` | Localization | Translation catalogs | Add labels/messages | Existing manual skills catalog | N/A |
| `autobyteus-web/generated/graphql.ts` | Generated GraphQL | Codegen output | Regenerate if feasible | Existing generated artifact | N/A |
| Tests | Coverage | Backend/frontend tests | Prove reload behavior | Existing test seams | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Skill GraphQL field selection repeated in multiple documents | Optional existing `SKILL_FIELDS` fragment in `graphql/skills.ts` if implementation chooses | Frontend GraphQL Documents | The reload mutation will need same fields as `GET_SKILLS` | Yes, if extracted | Yes | A broad mixed fragment with unrelated detail-only fields |
| Skill source field selection repeated in source docs and reload mutation | Optional existing/new `SKILL_SOURCE_FIELDS` fragment in `graphql/skillSources.ts` if implementation chooses | Frontend GraphQL Documents | Same path/count/default fields recur | Yes, if extracted | Yes | A generic catalog fragment containing both source and skill fields without clear subject |

Fragment extraction is optional. For this small change, duplicating the short field lists is acceptable if it matches current code style. If repeated field lists expand during implementation, extract subject-specific fragments only.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Backend reload result `{ skills, skillSources }` | Yes | Yes | Low | Keep only refreshed data slices; do not add redundant counts already available on source entries. |
| Frontend reload response typing | Yes | Yes | Low | Use existing `Skill` and `SkillSource` shapes. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Backend Skills Catalog | `SkillService` | Add `reloadSkillCatalog()` returning `{ skills: Skill[]; skillSources: SkillSourceInfo[] }` by calling existing list/source methods | Existing owner of discovery and sources | `Skill`, `SkillSourceInfo` |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Backend GraphQL Skills API | `SkillResolver` | Add `SkillCatalogReloadResult` object type and `reloadSkillCatalog` mutation | Existing skill API owner | Existing `mapSkill`, `mapSkillSource` |
| `autobyteus-web/graphql/skillSources.ts` (preferred) | Frontend GraphQL Documents | Skill source/catalog document boundary | Add `RELOAD_SKILL_CATALOG` mutation returning `skills` and `skillSources` | Source reload concept belongs beside source management docs; result still includes skills | Existing field shapes |
| `autobyteus-web/stores/skillSourcesStore.ts` | Frontend Skill Sources State | `skillSourcesStore` | Add `replaceSkillSources(nextSources: SkillSource[])` or `setSkillSources` | Keeps source state mutation owned by source store | `SkillSource` |
| `autobyteus-web/stores/skillStore.ts` | Frontend Skills State | `skillStore` | Add `reloading` ref and `reloadSkillCatalog()` mutation action; update skills and call source-store setter | Existing skill list owner | `Skill`, source-store setter |
| `autobyteus-web/components/skills/SkillsList.vue` | Frontend Skills UI | Skills list | Add Reload button, disabled/loading label, success/error alert handling | Existing header/action owner | Store action |
| `autobyteus-web/localization/messages/en/skills.ts` | Localization | EN skills catalog | Add reload labels/messages | Existing manual EN messages | N/A |
| `autobyteus-web/localization/messages/zh-CN/skills.ts` | Localization | zh-CN skills catalog | Add reload labels/messages | Existing manual zh-CN messages | N/A |
| `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` or `skill-service.test.ts` | Backend unit coverage | SkillService tests | Add reload rescan test | Existing temp-dir seam | Existing helpers |
| `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` | Backend GraphQL coverage | Skills API test | Add mutation result test if feasible | Existing GraphQL schema seam | Existing temp app data setup |
| `autobyteus-web/stores/__tests__/skillStore.spec.ts` | Frontend store coverage | skillStore tests | Add reload mutation state replacement/error/loading test | Existing Apollo mock seam | Existing fixtures |
| `autobyteus-web/components/skills/SkillsList.spec.ts` or existing relevant test | Frontend component coverage | SkillsList UI tests | Verify reload button invokes store and shows loading/success | Existing Vue test pattern | Store stub |

## Ownership Boundaries

The authoritative backend boundary is `SkillService.reloadSkillCatalog()`. GraphQL callers must not call discovery helpers directly or compose separate `skills` and `skillSources` queries as the semantic reload implementation. The authoritative frontend skill-list boundary is `skillStore.reloadSkillCatalog()`. Components should not call Apollo directly for reload or mutate `skillSourcesStore.skillSources` internals.

`skill-discovery.ts` and `SkillLoader` remain internal owned mechanisms of the backend catalog. They are reusable functions, but not user-command boundaries.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillService.reloadSkillCatalog()` | `listSkills()`, `getSkillSources()`, `skill-discovery.ts`, `SkillLoader`, disabled-store application | `SkillResolver.reloadSkillCatalog()` | Resolver directly imports discovery helpers or loader for reload | Extend `SkillService` result shape |
| `SkillResolver.reloadSkillCatalog()` GraphQL mutation | Domain-to-GraphQL mapping | Frontend Apollo documents | Frontend executes separate `skills` + `skillSources` as the reload command | Return complete reload result |
| `skillStore.reloadSkillCatalog()` | Apollo mutation, skill state replacement, source-store setter, loading/error state | `SkillsList.vue` | Component directly calls Apollo and mutates stores | Add store state/result needed by UI |
| `skillSourcesStore.replaceSkillSources()` | Source ref mutation | `skillStore.reloadSkillCatalog()` | `skillStore` writes `skillSourcesStore.skillSources.value` internals directly | Add/adjust setter method |

## Dependency Rules

Allowed:

- `SkillResolver` may depend on `SkillService` and mapping helpers inside the resolver file.
- `SkillService` may depend on existing discovery helpers, loader, disabled store, versioning service only as it already does.
- `skillStore` may import the reload GraphQL document and call `useSkillSourcesStore().replaceSkillSources()` after a successful reload.
- `SkillsList.vue` may depend on `skillStore` state/actions and localization.

Forbidden:

- Do not make `SkillsList.vue` call Apollo directly for reload.
- Do not make GraphQL resolver duplicate filesystem traversal or import `SkillLoader`/`skill-discovery.ts` directly for reload.
- Do not add a second skill-source config parser or path scanner in frontend code.
- Do not refresh agent/team definition caches as part of skill source reload unless implementation discovers a concrete requirement; current skill source reload is catalog rescan, not package definition reload.
- Do not alter running agent sessions or runtime backend state as part of this UI reload.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SkillService.reloadSkillCatalog()` | Skill catalog | Rescan and return refreshed skills and sources | No input; all configured sources | Future cache invalidation lands here. |
| GraphQL `reloadSkillCatalog: SkillCatalogReloadResult!` | Skill catalog reload command | Transport command for frontend | No input | Returns complete result, not boolean. |
| `skillStore.reloadSkillCatalog()` | Frontend skill catalog state | Execute reload and replace state | No input | Also updates source store through setter. |
| `skillSourcesStore.replaceSkillSources(nextSources)` | Source metadata state | Replace source list from authoritative response | `SkillSource[]` | Narrow state mutation API. |

Rule: do not accept a generic source selector for this first version. Per-source identity is out of scope and would need separate requirements because duplicate precedence is global.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `reloadSkillCatalog` GraphQL mutation | Yes | Yes, no-input global command | Low | Keep name catalog-scoped. |
| `SkillService.reloadSkillCatalog()` | Yes | Yes, no-input global command | Low | Return only skills/sources. |
| `skillStore.reloadSkillCatalog()` | Yes | Yes, no-input global command | Low | Use source store setter for sources. |
| `replaceSkillSources` | Yes | Yes, array of source records | Low | Do not add skill list behavior here. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Backend reload command | `reloadSkillCatalog` | Yes | Low | Prefer catalog over source to reflect returned skill list. |
| Backend result | `SkillCatalogReloadResult` | Yes | Low | Keep fields `skills`, `skillSources`. |
| Frontend loading state | `reloading` | Yes | Low | Separate from initial list `loading`. |
| Source setter | `replaceSkillSources` or `setSkillSources` | Yes | Low | Pick one existing store naming style; prefer `replaceSkillSources` for clarity. |

## Applied Patterns (If Any)

- Command boundary: `reloadSkillCatalog` is a command-like mutation even though current backend implementation is a rescan wrapper. This mirrors agent-package reload's user-command shape.
- Facade/adapter: `SkillResolver` adapts the domain service result to GraphQL. It owns no discovery policy.
- Store-owned state mutation: Pinia stores remain state owners; components trigger actions only.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | File | Backend skill catalog | Reload method using existing list/source scan | Existing catalog owner | GraphQL DTOs, UI state |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | File | GraphQL skills API | Result type and mutation | Existing skills resolver | Discovery implementation |
| `autobyteus-web/graphql/skillSources.ts` | File | Frontend GraphQL docs | Reload catalog mutation document | Existing source management docs | Store state mutation |
| `autobyteus-web/stores/skillStore.ts` | File | Frontend skill state | Reload action/state | Existing skill store | Component presentation |
| `autobyteus-web/stores/skillSourcesStore.ts` | File | Frontend source state | Source replacement setter | Existing source store | Skill list mutation |
| `autobyteus-web/components/skills/SkillsList.vue` | File | Skills list UI | Reload button and feedback | Existing list action area | Apollo calls/discovery logic |
| `autobyteus-web/localization/messages/en/skills.ts` | File | EN localization | New labels/messages | Existing Skills EN catalog | Hard-coded nonlocalized UI |
| `autobyteus-web/localization/messages/zh-CN/skills.ts` | File | zh-CN localization | New labels/messages | Existing Skills zh-CN catalog | Hard-coded nonlocalized UI |
| `autobyteus-web/generated/graphql.ts` | File | Generated GraphQL artifact | Regenerated schema/docs if feasible | Existing codegen output | Manual business logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/skills/services` | Main-Line Domain-Control | Yes | Low | `SkillService` owns catalog behavior. |
| `src/api/graphql/types` | Transport | Yes | Low | Resolver maps transport to service. |
| `autobyteus-web/stores` | Frontend state | Yes | Low | Pinia stores own frontend state slices. |
| `autobyteus-web/components/skills` | UI | Yes | Low | Skills list owns presentation/action trigger only. |
| `autobyteus-web/graphql` | Transport documents | Yes | Low | Handwritten documents separated from stores. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Reload command shape | `SkillsList -> skillStore.reloadSkillCatalog() -> GraphQL reloadSkillCatalog -> SkillService.reloadSkillCatalog()` | `SkillsList -> Apollo GET_SKILLS + Apollo GET_SKILL_SOURCES` | Keeps semantic reload behind one authoritative command boundary. |
| Backend ownership | `SkillService.reloadSkillCatalog() { return { skills: this.listSkills(), skillSources: this.getSkillSources() } }` | Resolver directly calls `scanSkillDirectory()` and manually maps disabled state | Avoids boundary bypass and duplicated discovery policy. |
| Return payload | `{ skills, skillSources }` | `{ success: true }` followed by UI issuing two independent queries | Prevents repeated coordination in callers and keeps reload response authoritative. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend-only Reload button calling existing queries | It would solve current stale UI because queries already rescan disk | Rejected | Add backend `reloadSkillCatalog` mutation and store action. |
| Per-source reload input while also keeping global reload | User mentioned a certain source/skill update | Rejected for this scope | Use one global reload; per-source behavior requires separate scope and duplicate-precedence analysis. |
| Active-run skill hot reload | User said reload skills generally | Rejected for this scope | Reload catalog only; document next-run/visible-catalog behavior. |

## Derived Layering (If Useful)

- UI layer: `SkillsList.vue`.
- Frontend state/API document layer: `skillStore.ts`, `skillSourcesStore.ts`, `graphql/skillSources.ts`.
- Backend transport layer: `api/graphql/types/skills.ts`.
- Backend domain-control layer: `skills/services/skill-service.ts`.
- Backend internal filesystem mechanisms: `skill-discovery.ts`, `loader.ts`.

Layering follows ownership; no layer should bypass the owner immediately below it.

## Migration / Refactor Sequence

1. Backend service:
   - Add a small result type or inline TypeScript return shape for `SkillService.reloadSkillCatalog()`.
   - Implement it by calling existing `listSkills()` and `getSkillSources()`.
2. Backend GraphQL:
   - Add `SkillCatalogReloadResult` TypeGraphQL object type with `skills: [Skill]` and `skillSources: [SkillSource]`.
   - Add `@Mutation(() => SkillCatalogReloadResult) reloadSkillCatalog()` in `SkillResolver`.
   - Map skills through existing `mapSkill(skill, versioningService)` and sources through `mapSkillSource`.
3. Frontend GraphQL/store:
   - Add `RELOAD_SKILL_CATALOG` document returning the same fields as `GET_SKILLS` plus source fields.
   - Add `replaceSkillSources()` to `skillSourcesStore`.
   - Add `reloading` and `reloadSkillCatalog()` to `skillStore`; on success replace `skills` and call the source-store setter.
4. Frontend UI/localization:
   - Add a secondary Reload button to `SkillsList.vue` header actions, with icon such as `heroicons:arrow-path`.
   - Disable while `reloading` or initial `loading`; show localized loading label.
   - Show localized success message; existing store error can render through the error state or a local alert.
   - Add EN and zh-CN localization keys.
5. Generated artifacts:
   - Run GraphQL codegen against an updated backend if feasible and update `autobyteus-web/generated/graphql.ts`; if not feasible, record why and verify handwritten documents compile/tests pass.
6. Coverage:
   - Add backend unit and/or GraphQL tests for reload after external file changes.
   - Add frontend store and component tests for reload behavior/loading/success.
7. Docs:
   - Update `autobyteus-web/docs/skills.md` during delivery docs sync if implementation changes user-facing behavior documentation.

No temporary compatibility seams are required.

## Key Tradeoffs

- Global reload vs per-source reload: global is simpler, matches duplicate-precedence semantics, and solves the user problem. Per-source reload can be designed later if real need appears.
- Backend mutation vs frontend-only query refresh: mutation is slightly more work but creates the correct command boundary and future-proofs cache invalidation.
- Return both skills and sources vs boolean: returning both slices avoids repeated frontend coordination and immediately updates source counts.
- Separate `reloading` vs reuse `loading`: separate state avoids turning a quick reload into the full initial page loading state and allows clearer button feedback.

## Risks

- Codegen may require a running backend and may produce unrelated generated drift. Implementation should record this in handoff if it occurs.
- If a source path has disappeared, existing config parsing filters it. Reload may show updated sources that omit missing paths; this follows current behavior.
- If a skill is renamed, disabled state keyed by old name will not transfer. This is existing name-based disabled-state behavior and is not changed here.
- Users may expect active agents to immediately use changed skills. The feature must be described as catalog/UI/future-run reload only.

## Guidance For Implementation

- Keep `SkillService.reloadSkillCatalog()` intentionally small. Do not add caches or watchers.
- Use existing mapper functions in the resolver; avoid new duplicate GraphQL mapping logic.
- Do not change `scanSkillDirectory`, `scanBundledSkillsFromDefinitionRoot`, or duplicate precedence unless tests reveal a regression.
- Preserve existing `addSkillSource` and `removeSkillSource` flows. It is acceptable to leave their current `fetchAllSkills()` refresh as-is, or later refactor them to reuse `reloadSkillCatalog()` only if the implementation remains simpler and tests confirm behavior.
- Suggested localization keys:
  - `skills.components.skills.SkillsList.reload`: `Reload`
  - `skills.components.skills.SkillsList.reloading`: `Reloading...`
  - `skills.components.skills.SkillsList.reload_success`: `Skills reloaded.`
  - `skills.components.skills.SkillsList.reload_error`: `Failed to reload skills.`
- Suggested targeted checks after implementation:
  - `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/skills/services/skill-service.test.ts tests/unit/skills/services/skill-sources-management.test.ts tests/e2e/skills/skills-graphql.e2e.test.ts`
  - `pnpm -C autobyteus-web exec vitest --run stores/__tests__/skillStore.spec.ts components/skills/SkillSourcesModal.spec.ts pages/__tests__/skills.spec.ts` plus any new `SkillsList` reload test.
  - `pnpm -C autobyteus-web run guard:localization-boundary` and `pnpm -C autobyteus-web run audit:localization-literals` if user-facing strings changed.
