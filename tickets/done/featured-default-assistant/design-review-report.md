# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant/tickets/featured-default-assistant/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant/tickets/featured-default-assistant/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant/tickets/featured-default-assistant/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review for independent `featured-default-assistant` ticket.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed requirements, investigation notes, design spec, current `AgentList.vue`, `AgentTeamList.vue`, `AgentCard`/`AgentTeamCard` run flow via `useRunActions`, frontend/server settings stores and GraphQL, `ServerSettingsService`, `server-runtime.ts`, and the existing default compactor bootstrapper precedent. Ran focused artifact grep for legacy/chat/runtime/hard-coded/category/featured-setting terms.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of settings-driven featured catalog design | N/A | 0 | Pass | Yes | Design is implementation-ready with residual implementation guardrails around duplicate handling and startup initialization semantics. |

## Reviewed Design Spec

- `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant/tickets/featured-default-assistant/design-spec.md`

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements classify the work as a focused catalog/settings feature with medium scope. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Requirements identify a narrow boundary/product information-architecture issue: featured placement is product/server preference, not agent metadata or frontend hard-code. Investigation cites current list, settings, run-action, and bootstrap code. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Small settings helper/card/list-composition extraction is in scope; broad catalog IA and team-local grouping are explicitly deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Design maps helper files, bootstrapper, Settings card, catalog joins, reuse of existing cards/run actions, and decommission of hard-coded/category/self-metadata alternatives. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | None. |

## Focused Requested Questions Verdict

| Review Question | Verdict | Evidence | Required Action |
| --- | --- | --- | --- |
| Are server settings the correct owner for featured catalog placement? | Pass | Featured placement is server/product preference, must be user-configurable, and must not be intrinsic agent/team definition metadata. Existing server settings infrastructure already owns editable server preference strings and Settings → Basics exposes comparable product configuration cards. | None. |
| Is including agent teams in the same setting and adding `Featured teams` properly scoped? | Pass | Requirements include team entries, Settings card supports `AGENT` and `AGENT_TEAM`, and design adds matching Agent Teams consumption so the setting has no hidden no-op entries. The single setting is safe because each row has explicit `resourceKind`. | None. |
| Is setting shape/versioning/validation implementation-safe? | Pass | Shape is versioned (`version: 1`), row identity is explicit (`resourceKind`, `definitionId`), order is explicit (`sortOrder`), unknown references are non-fatal, and validation plan requires rejecting invalid JSON/resource kinds/empty ids/duplicates. | None. Implementation should use the strict interpretation: server saves reject duplicate `(resourceKind, definitionId)` rows; safe read paths may ignore/coalesce only to avoid crashes. |
| Is seed + setting initialization boundary clear enough to avoid overwriting user settings? | Pass | Requirements and design repeatedly state seed missing Super Assistant files only, initialize featured setting only when unset/blank, preserve existing setting including empty `items: []`, and preserve user-edited seed files. | None. |
| Are there remaining legacy assumptions, hard-coded featured-id risks, or ownership leaks? | Pass | Artifact grep found no chat/product-entry coupling. Remaining `autobyteus-super-assistant` references are backend seed/default-initialization examples, not frontend placement source. Design forbids frontend hard-coded featured lists, category overload, agent-config self-promotion, special run paths, and unrelated product-entry experiments. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Server startup to seeded Super Assistant and default featured setting | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002/003 | Settings Basics card to persisted featured setting | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Agents page to featured/regular agent sections | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Agent Teams page to featured/regular team sections | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Featured card run to existing workspace run flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Search to full-list ungrouped results | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend server settings | Pass | Pass | Pass | Pass | Correct authority for server/product preference and user customization. |
| Backend agent-definition defaults | Pass | Pass | Pass | Pass | New default Super Assistant bootstrapper mirrors existing seed-if-missing pattern without mixing with compaction behavior. |
| Frontend Settings Basics | Pass | Pass | Pass | Pass | Dedicated `FeaturedCatalogItemsCard` is cleaner than expanding raw settings UI. |
| Agents catalog list | Pass | Pass | Pass | Pass | List-composition owner may split featured/regular cards without owning persistence or run behavior. |
| Agent Teams catalog list | Pass | Pass | Pass | Pass | Properly consumes only `AGENT_TEAM` entries from shared setting. |
| Card/action runtime | Pass | Pass | Pass | Pass | Existing `AgentCard`, `AgentTeamCard`, and `useRunActions` remain the run/detail/sync owners. |
| Frontend catalog helper | Pass | Pass | Pass | Pass | Local parse/join/sort helper avoids duplicating split logic across list and settings UI. |
| Localization | Pass | Pass | Pass | Pass | Labels/errors remain presentation concern. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Featured setting key/types/default/parser/serializer | Pass | Pass | Pass | Pass | Backend helper owns persisted JSON contract. |
| Frontend featured setting parse/join/sort | Pass | Pass | Pass | Pass | Frontend helper owns UI-safe reading and joining loaded definitions. |
| Catalog featured/regular split | Pass | Pass | Pass | Pass | Split logic is applied in each list by subject kind; common helper can stay subject-agnostic over loaded definition arrays. |
| Settings row selection/reordering | Pass | Pass | Pass | Pass | Dedicated card owns UI row editing, not raw settings manager. |
| Super Assistant seed file copy | Pass | Pass | Pass | Pass | New bootstrapper owns one agent's seed lifecycle; generic overreach is avoided. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `FeaturedCatalogItemsSetting` | Pass | Pass | Pass | Pass | Pass | `version` is schema version, `items` is the ordered featured rows list. |
| `FeaturedCatalogItem` | Pass | Pass | Pass | Pass | Pass | `resourceKind` disambiguates agent vs team identity; `definitionId` is subject id; `sortOrder` is display ordering only. |
| `FeaturedCatalogResourceKind` | Pass | Pass | Pass | N/A | Pass | Explicit union prevents generic id ambiguity. |
| Default featured value | Pass | Pass | Pass | N/A | Pass | The Super Assistant id is allowed as backend initialization data, not frontend source of truth. |
| Joined featured item view model | Pass | Pass | Pass | Pass | Pass | Should compose raw row + resolved definition/unresolved status rather than mutating agent/team definition models. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicate featured cards in regular grid | Pass | Pass | Pass | Pass | List split excludes featured cards while grouping is visible. |
| Frontend hard-coded featured id list | Pass | Pass | Pass | Pass | Server setting is replacement source. |
| Agent/team config self-declared featured metadata | Pass | Pass | Pass | Pass | Server Basic Settings is replacement owner. |
| Existing `category` overload for featured placement | Pass | Pass | Pass | Pass | Explicitly rejected to preserve category semantics. |
| Special/hero runtime path | Pass | Pass | Pass | Pass | Existing cards and `useRunActions` remain. |
| Broad catalog IA/team-local grouping changes | Pass | Pass | Pass | Pass | Explicitly deferred and not mixed into this ticket. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/featured-catalog-items-setting.ts` | Pass | Pass | Pass | Pass | Backend setting contract/helper. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Pass | Pass | Pass | Pass | Registers and validates the setting before persistence. |
| `autobyteus-server-ts/src/agent-definition/default-agents/default-super-assistant-bootstrapper.ts` | Pass | Pass | Pass | Pass | Seeds the normal shared agent and initializes setting only if unset/blank. |
| `autobyteus-server-ts/src/agent-definition/default-agents/super-assistant/agent.md` | Pass | Pass | N/A | Pass | Seed template content only. |
| `autobyteus-server-ts/src/agent-definition/default-agents/super-assistant/agent-config.json` | Pass | Pass | N/A | Pass | Seed config only; no featured metadata. |
| `autobyteus-server-ts/src/server-runtime.ts` | Pass | Pass | N/A | Pass | Startup orchestration. |
| `autobyteus-web/utils/catalog/featuredCatalogItems.ts` | Pass | Pass | Pass | Pass | UI parse/serialize/join/sort helper. |
| `autobyteus-web/components/settings/FeaturedCatalogItemsCard.vue` | Pass | Pass | Pass | Pass | Settings card UI only. |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Pass | Pass | Pass | Pass | Hosts the card in Basics; should not absorb row editing logic. |
| `autobyteus-web/stores/serverSettings.ts` | Pass | Pass | N/A | Pass | Existing fetch/save actions; optional typed helpers only if they do not bypass the setting helper. |
| `autobyteus-web/components/agents/AgentList.vue` | Pass | Pass | Pass | Pass | Agent subject list composition. |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Pass | Pass | Pass | Pass | Team subject list composition. |
| Localization files | Pass | Pass | N/A | Pass | Labels and validation text only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend startup/bootstrapper | Pass | Pass | Pass | Pass | May call seed and settings initialization; must not overwrite files/settings. |
| Server settings service | Pass | Pass | Pass | Pass | Persists string setting and validates via helper; does not discover/render definitions. |
| Settings card | Pass | Pass | Pass | Pass | May load definition stores for selector labels; must not own run behavior. |
| Agent/Team list components | Pass | Pass | Pass | Pass | May read settings and loaded definitions; must not persist settings or hard-code featured ids. |
| Cards/run actions | Pass | Pass | Pass | Pass | Existing run action path only; no direct backend run creation. |
| Agent/team definitions | Pass | Pass | Pass | Pass | No featured self-metadata and no category overload. |
| Other product-entry/chat work | Pass | Pass | Pass | Pass | Explicitly independent; no dependency on in-progress product-entry experiments. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Featured setting backend helper | Pass | Pass | Pass | Pass | Should expose parse/serialize/default/validate functions rather than scattered JSON handling. |
| `ServerSettingsService.updateSetting` | Pass | Pass | Pass | Pass | Existing GraphQL path remains persistence boundary. |
| `DefaultSuperAssistantBootstrapper.bootstrap` | Pass | Pass | Pass | Pass | Encapsulates seed-if-missing and default setting initialization. |
| `FeaturedCatalogItemsCard` | Pass | Pass | Pass | Pass | Encapsulates row editing and save flow. |
| `AgentList` / `AgentTeamList` list composition | Pass | Pass | Pass | Pass | Encapsulates featured/regular split per subject list. |
| `useRunActions` | Pass | Pass | Pass | Pass | Cards/lists do not bypass it for runtime prep. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `FEATURED_CATALOG_ITEMS_SETTING_KEY` | Pass | Pass | Pass | Low | Pass |
| `parseFeaturedCatalogItemsSetting(raw)` | Pass | Pass | Pass | Low | Pass |
| `serializeFeaturedCatalogItemsSetting(setting)` | Pass | Pass | Pass | Low | Pass |
| `validateFeaturedCatalogItemsSetting(raw)` | Pass | Pass | Pass | Low | Pass |
| `getFeaturedCatalogItemsSetting()` / setting lookup | Pass | Pass | Pass | Low | Pass |
| `updateServerSetting(AUTOBYTEUS_FEATURED_CATALOG_ITEMS, json)` | Pass | Pass | Pass | Medium | Pass |
| `bootstrapDefaultSuperAssistant()` | Pass | Pass | Pass | Low | Pass |
| Frontend `joinFeaturedCatalogItems(...)` helper | Pass | Pass | Pass | Medium | Pass |
| Existing `prepareAgentRun` / `prepareTeamRun` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/featured-catalog-items-setting.ts` | Pass | Pass | Low | Pass | Settings contract near existing config helpers. |
| `autobyteus-server-ts/src/agent-definition/default-agents/` | Pass | Pass | Low | Pass | More suitable than compaction folder for a general seeded agent. |
| `autobyteus-web/utils/catalog/featuredCatalogItems.ts` | Pass | Pass | Low | Pass | Catalog helper, not settings component internals. |
| `autobyteus-web/components/settings/FeaturedCatalogItemsCard.vue` | Pass | Pass | Low | Pass | Settings UI component. |
| `autobyteus-web/components/agents/AgentList.vue` | Pass | Pass | Low | Pass | Existing list owner remains correct. |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Pass | Pass | Low | Pass | Existing team list owner remains correct. |
| Localization paths | Pass | Pass | Low | Pass | Follows existing message structure. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent run launch | Pass | Pass | N/A | Pass | Reuse `useRunActions.prepareAgentRun` and `/workspace`. |
| Team run launch | Pass | Pass | N/A | Pass | Reuse `prepareTeamRun` and `/workspace`. |
| Card display/actions | Pass | Pass | N/A | Pass | Reuse existing cards. |
| Server preference persistence | Pass | Pass | Pass | Pass | Extend existing settings validation for JSON. |
| Settings quick/basic UI | Pass | Pass | Pass | Pass | Dedicated card under existing Basics layout. |
| Default seeded agent | Pass | Pass | Pass | Pass | New bootstrapper justified by compactor seed precedent but separate subject. |
| Definition discovery/loading | Pass | Pass | N/A | Pass | Existing stores/queries provide IDs needed for joins. |
| Search | Pass | Pass | N/A | Pass | Existing matching fields are reused when grouping hidden. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Frontend hard-coded featured IDs | No | Pass | Pass | Explicitly forbidden. |
| Agent config featured metadata | No | Pass | Pass | Explicitly forbidden. |
| Category-as-featured placement | No | Pass | Pass | Explicitly forbidden. |
| Special featured-card runtime | No | Pass | Pass | Existing run path only. |
| Product-entry/chat direction | No | Pass | Pass | Design states ticket is independent and grep found no chat/workspace-draft leakage. |
| Private Super Assistant runtime dependency | No | Pass | Pass | Private path is template source only; runtime uses product-owned seed files. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend setting helper and validation | Pass | Pass | Pass | Pass |
| Super Assistant seed and setting initialization | Pass | Pass | Pass | Pass |
| Settings card | Pass | Pass | Pass | Pass |
| Agent list featured split | Pass | Pass | Pass | Pass |
| Agent team list featured split | Pass | Pass | Pass | Pass |
| Tests/manual validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Setting JSON shape | Yes | Pass | Pass | Pass | Shows versioned object with agent and team rows; rejected hard-code/config/category alternatives are stated. |
| Agents page layout | Yes | Pass | N/A | Pass | Shows Featured and All sections. |
| Agent Teams layout | Yes | Pass | N/A | Pass | Shows matching Featured teams section. |
| Settings card layout | Yes | Pass | N/A | Pass | Shows row editing and up/down order controls. |
| Search behavior | Yes | Pass | N/A | Pass | Empty vs non-empty behavior is explicit. |
| Invalid/missing setting behavior | Yes | Pass | Pass | Pass | Missing/blank, empty, invalid JSON, unknown IDs are covered. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Duplicate row handling has one loose phrase in design line 68 (`invalid or normalized`) | Implementation should not diverge between server save behavior and UI expectations. | Treat duplicates as invalid for server saves and Settings UI validation, matching the validation plan; safe read paths may ignore/coalesce only to prevent crashes on already-corrupt raw values. | Non-blocking implementation guardrail. |
| Startup initialization should not be gated only on newly seeded files | A user may already have the Super Assistant files but lack the featured setting. | Bootstrapper should attempt featured-setting initialization whenever the setting is unset/blank and the Super Assistant definition resolves, whether files were just seeded or already existed. | Non-blocking implementation guardrail. |
| Backend and frontend setting helpers will duplicate schema knowledge across packages | Divergent parsers could cause UI/server mismatch. | Keep constants and tests aligned; backend is persistence authority, frontend parser is UI safety/serialization helper. | Non-blocking implementation risk. |
| Unknown referenced IDs in Settings | Users need a way to remove stale entries. | Show unresolved rows in Settings and ignore unresolved rows on catalog pages, as designed. | Covered by design. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Follow the stricter validation contract: server-side save should reject invalid JSON, invalid `resourceKind`, empty `definitionId`, and duplicate `(resourceKind, definitionId)` rows; frontend should prevent these before save where practical.
- `autobyteus-super-assistant` may appear in backend seed/default-initialization data and tests, but frontend catalog placement must come from `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`, not an in-component hard-coded featured list.
- Preserve user settings exactly: missing/blank setting may be initialized, but an existing empty `items: []` or otherwise user-provided non-blank value must not be overwritten by startup.
- Preserve user-edited seeded agent files: seed missing files only.
- Keep featured cards normal: no special hero-card runtime, no direct backend run creation, no new runtime/model/workspace controls.
- Keep this ticket independent from chat/product-entry experiments and from broader catalog IA cleanup.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 1 is authoritative. Server settings are the correct source of truth; team entries are properly scoped because the ticket also renders `Featured teams`; setting shape is safe with the strict validation guardrails above; seed/setting initialization boundary protects user settings; no blocking legacy or hard-coded ownership leakage found.
