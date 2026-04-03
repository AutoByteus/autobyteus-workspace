# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Evaluated raw path-based team member references versus explicit scoped references; chose scoped references as the canonical contract. | 1 |
| v2 | Design hardening before implementation | Converted the slice to a clean canonical cut, added the scoped runtime identity model for team-local agents, mapped package-root renames, and finalized sync/skill/runtime ownership. | 1 |
| v3 | Manual-validation requirement gap | Reopened the design so team-local agents become visible and configurable from the Agents page with explicit ownership metadata and ownership-safe action gating. | 3 |
| v4 | User-requested reinvestigation of backend/frontend contract | Clarified the split between shared-only backend list semantics and the ownership-aware visible UI list, and locked the minimal UI treatment to one extra `Team: ...` line on team-owned cards. | 6 |

## Artifact Basis

- Investigation Notes: `tickets/done/agent-team-local-member-import-analysis/investigation-notes.md`
- Requirements: `tickets/done/agent-team-local-member-import-analysis/requirements.md`
- Requirements Status: `Refined`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

The filesystem layout becomes clearer by allowing team-owned agents inside `agent-teams/<team-id>/agents/`, while the team-config contract becomes stricter by requiring explicit agent scope.

The design is a clean cut:

- folders express ownership,
- team-config members express semantic scope,
- runtime/history use a derived scoped agent identity,
- agent-management surfaces show both shared and team-local agents with explicit ownership context,
- backend shared-only list semantics remain intact for sync/runtime/server policy,
- package-root naming replaces the old `definition source` surface everywhere touched in this slice.

## Goal / Intended Change

- Keep shared reusable agents in top-level `agents/`.
- Allow team-owned agents under `agent-teams/<team-id>/agents/`.
- Make team member references unambiguous for:
  - shared standalone agents,
  - team-local agents,
  - nested teams.
- Expose team-local agents on the main Agents page without pretending they belong to the shared standalone namespace.
- Keep the UI change minimal: team-owned agent cards gain only one extra line, `Team: <team name>`.
- Preserve collision-free runtime/history identities for local agents.
- Replace `definition source` / `Import` with `Agent Package Root`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove touched `definition source` API/UI/env naming and stop treating agent refs without explicit scope as valid in touched flows.
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `REQ-001` | Preserve top-level shared standalone agents | `AC-001`, `AC-010` | Shared agents stay supported as shared-only definitions | `UC-003`, `UC-013` |
| `REQ-002` | Support team-local agents inside team folders | `AC-002` | Team-local agents load from `agent-teams/<team-id>/agents/` | `UC-005`, `UC-006` |
| `REQ-004` | Make agent refs explicitly scoped | `AC-003`, `AC-011` | Agent refs use `refScope` and reject missing scope | `UC-006`, `UC-009` |
| `REQ-008` | Resolve local/shared members correctly at runtime | `AC-005`, `AC-006` | Team launch resolves the right agent source | `UC-007` |
| `REQ-010` | Preserve unique downstream runtime/history identity | `AC-007` | Local ids stay collision-free after projection | `UC-010` |
| `REQ-012` | Preserve team-local ownership during sync | `AC-008` | Sync bundle keeps local agents inside team payload | `UC-011` |
| `REQ-013` | Expose separate shared/local counts | `AC-019` | Package-root summaries show both count classes | `UC-001`, `UC-002` |
| `REQ-014` | Scan bundled skills in both shared and local folders | `AC-009` | Team-local `SKILL.md` files are discovered | `UC-012` |
| `REQ-015`, `REQ-029`, `REQ-030` | Show team-local agents in the main Agents surface with ownership-safe behavior | `AC-020` to `AC-022` | Agent list/detail/edit flows surface ownership metadata and gate shared-only actions | `UC-015` |
| `REQ-031`, `REQ-032` | Split visible-agent UI contract from shared-only backend semantics | `AC-023` to `AC-025` | Backend-visible payload carries ownership metadata, while shared-only selectors stay filtered | `UC-015`, `UC-006` |
| `REQ-017` | Replace the product naming surface | `AC-012` to `AC-018` | Package-root naming replaces old settings/API/env terms | `UC-014` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Team config stores only `ref` + `refType`; runtime later resolves `ref` through the global standalone registries. | `file-agent-team-definition-provider.ts`, `autobyteus-team-run-backend-factory.ts`, `team-run-service.ts`, `node-sync-selection-service.ts` | Final derived local-agent runtime id format |
| Current Ownership Boundaries | Filesystem ownership and runtime identity are conflated today through one global agent id namespace. | `file-agent-definition-provider.ts`, `file-agent-team-definition-provider.ts`, `team-run-service.ts` | Whether team-local agents ever need their own CRUD surface |
| Current Coupling / Fragmentation Problems | A change in ref semantics touches provider parsing, runtime hydration, run history identity, sync, skills, GraphQL, and settings naming. | Investigation artifact; source paths above | None |
| Existing Constraints / Compatibility Facts | Existing flat packages use bare shared refs today, but this slice will require explicit scope rather than carry a compatibility path. | `../autobyteus-agents`, requirements `AC-011` | External migration work is out of scope |
| Relevant Files / Components | Settings/UI/server naming is spread through component/store/GraphQL/service/config files. | `settings.vue`, `DefinitionSourcesManager.vue`, `definition-source-service.ts`, `app-config.ts` | None |

## Current State (As-Is)

- Shared agent discovery is global and flat.
- Team discovery is top-level only.
- Team-config parsing is permissive and does not understand local/shared agent ownership.
- Team runtime, run-history metadata, and sync dependency expansion all assume `member.ref` is a globally unique agent id.
- The Agents page lists only shared standalone agents, so team-owned agents disappear from the generic configuration surface once they move under team folders.
- The backend exposes only one `getAll()` agent list shape today, even though the product now needs both shared-only server semantics and an ownership-aware visible UI list.
- Package-root summaries count only top-level agents and teams.
- Bundled skill discovery only scans `agents/*/SKILL.md`.
- The settings/API/env naming still reflects an implementation term instead of the product concept.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Team definition load or update | In-memory team member model with explicit scope | `agent-team-definition` provider/service | All downstream behavior depends on the normalized member contract |
| `DS-002` | `Primary End-to-End` | Team launch preset or team runtime creation | Runtime `AgentConfig` / `TeamRunMetadata` with unique member identities | `agent-team-execution` runtime services | This is where scoped refs become executable members |
| `DS-003` | `Primary End-to-End` | Node sync selection/export/import | Team payload plus preserved local-agent folders | `sync` services | Ownership must survive export/import |
| `DS-004` | `Primary End-to-End` | Settings page list/add/remove root | Canonical package-root API and persisted env value | settings GraphQL + server settings service | User-facing naming and package-root registration must be coherent |
| `DS-005` | `Bounded Local` | Skill scan across definition roots | `Skill[]` loaded from shared and local agent folders | `skills` service | Local agent `SKILL.md` files must be discoverable without polluting the shared agent registry |
| `DS-006` | `Primary End-to-End` | Agents page list/detail/edit | Ownership-aware agent management surface for shared and team-local agents | `agent-definition` + web agent-management UI | Users must be able to configure team-owned agents after moving them under team folders |

## Primary Execution / Data-Flow Spine(s)

- `Settings UI -> GraphQL package-root resolver -> agent-package-root service -> server settings store -> config roots -> provider/service cache refresh`
- `Team config JSON -> team-definition provider normalization -> team-definition service -> team runtime service -> backend factory -> agent definition lookup -> runtime agent config`
- `Selected team ids -> sync selection service -> sync export/import service -> team folder writer -> local agent folder writer`
- `Agents page -> agentDefinitions query -> ownership-aware agent cards -> detail/edit -> updateAgentDefinition mutation -> shared or team-local file write`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `AgentPackageRoot` settings surface | Entry and user-facing naming owner | Root registration and summary display |
| `TeamMember` domain model | Canonical scoped member contract | Shared vs local identity intent |
| `FileAgentTeamDefinitionProvider` | File-boundary normalizer | Strict parse/write of `refScope` and team-local ownership |
| `FileAgentDefinitionProvider` | Filesystem-backed agent loader | Shared-agent reads plus synthetic-id resolution for local agents |
| `TeamRunService` | Leaf-member projection owner | Unique member configs for runtime/history |
| `AutoByteusTeamRunBackendFactory` | Runtime hydrator | Shared/local lookup to real `AgentConfig` |
| `NodeSyncService` | Ownership-preserving sync writer | Team payloads that contain local agent files |
| `SkillService` | Bundled-skill scanner | Shared and team-local `SKILL.md` discovery |
| `AgentDefinitionResolver` + web Agents UI | Ownership-aware agent management entrypoint | Lists visible agent definitions and routes detail/edit behavior by ownership metadata |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A team definition enters through disk or GraphQL, and the provider converts raw team-config members into a strict domain shape where `refType: agent` always carries `refScope`. | `TeamMember`, `AgentTeamDefinition` | `agent-team-definition` | GraphQL enum conversion and tool-input parsing |
| `DS-002` | A launch request expands the team graph into leaf agent members; shared agents keep their standalone id, local agents receive a derived scoped id, and runtime hydration resolves the proper file-backed definition for each member. | `TeamRunConfig`, `AgentConfig`, `TeamRunMetadata` | `agent-team-execution` | Run-history name lookup and nested-team recursion |
| `DS-003` | Sync selection validates team dependencies using scoped member semantics, then team export/import carries local-agent files inside the owning team payload so ownership survives transport. | `ResolvedNodeSyncSelection`, `SyncAgentTeamDefinition` | `sync` | Deletes/tombstones remain shared-team oriented |
| `DS-004` | Settings users list, add, and remove filesystem roots through the renamed package-root API, and summaries reflect shared agents, local agents, and teams separately. | `AgentPackageRootInfo` | settings GraphQL + package-root service | Server settings persistence and config/env naming |
| `DS-005` | Skill discovery scans top-level shared agents and team-local agent folders so local `SKILL.md` assets are available without making those agents globally listable. | `Skill` | `skills` service | Readonly-path detection |
| `DS-006` | The Agents page loads shared and team-local agent definitions together, exposes ownership metadata to the web store, and only enables actions whose write/sync semantics preserve the agent's ownership boundary. | `AgentDefinition`, ownership metadata, web view models | `agent-definition` + web agent-management UI | Shared-only actions must not silently apply to local agents |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `agent-team-definition` subsystem | Team member contract, team-config parsing/writing, team-local ownership semantics | Runtime hydration, sync serialization policy, skill scanning | This is the canonical ref-shape owner |
| `agent-definition` provider | Reading filesystem-backed agent definitions from shared or scoped-local folders | Team graph traversal or package-root summaries | Local-agent resolution lives here only as agent-file loading |
| `agent-definition` service layer | Distinguishing shared-only backend lists from the ownership-aware visible UI list | Team-config parsing or UI formatting rules | This is the authoritative contract split owner |
| agent-management web UI | Ownership-aware rendering, action gating, and duplicate-name disambiguation | Raw filesystem layout or sync payload rules | This surface consumes ownership metadata; it does not invent it |
| `agent-team-execution` subsystem | Converting scoped team members into unique runnable members | File parsing or settings naming | This owns derived runtime ids |
| `sync` subsystem | Preserving team-local ownership in bundle shape | Runtime identity format decisions outside exported data | Bundle stays file-ownership oriented |
| settings + package-root module | Root registration API and root summaries | Team member resolution | Naming cleanup is isolated here |
| `skills` subsystem | Bundled skill scanning | Team runtime or sync ownership | Local-skill discovery is off-spine support |

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `agent-team-execution`
- Start and end: `Team definition leaf traversal -> unique runnable member config list`
- Arrow chain: `TeamRunService:collectLeafAgentMembers -> buildTeamLocalAgentDefinitionId? -> TeamMemberRunConfig[]`
- Why it must be explicit in the design: this is where local-agent collisions are prevented before history/runtime persistence.

- Parent owner: `skills`
- Start and end: `Definition root scan -> bundled skill load`
- Arrow chain: `SkillService:listSkills -> scanBundledSkillsFromDefinitionRoot -> scan shared agents + scan team-local agents`
- Why it must be explicit in the design: the skill scan is not part of the main team runtime spine, but it is required product behavior for local agent folders.

- Parent owner: `agent-definition` + web agent-management UI
- Start and end: `agentDefinitions query -> agent detail/edit mutation round-trip`
- Arrow chain: `AgentDefinitionResolver:agentDefinitions -> AgentDefinitionConverter:toGraphql -> agentDefinitionStore -> AgentList/AgentDetail/AgentEdit -> updateAgentDefinition -> FileAgentDefinitionProvider:update`
- Why it must be explicit in the design: the manual-validation bug proved configurability breaks unless the generic Agents surface understands team-local ownership.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| GraphQL enum/input mapping | `agent-team-definition`, package-root settings API | Translate between domain strings and GraphQL enums/inputs | `Yes` |
| Derived team-local agent id helpers | `agent-team-execution`, `agent-definition` lookup | Stable scoped runtime/history identity | `No` |
| Package-root summary counting | package-root service | Count shared agents, local agents, and teams for settings | `Yes` |
| Bundled skill scan recursion | `skills` service | Find local `SKILL.md` files | `Yes` |
| Ownership-aware agent display metadata | `agent-definition` GraphQL boundary + web agent store | Distinguish local vs shared agents and gate invalid actions | `No` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Scoped team-member contract | `agent-team-definition` | `Extend` | Team-config parsing and domain model already live here | N/A |
| Synthetic local-agent id parsing/loading | `agent-definition` provider | `Extend` | Agent file parsing already lives here | N/A |
| Package-root registration naming cleanup | current `definition-sources` surface | `Extend` as renamed module | Same concern, wrong name | N/A |
| Team-local sync payloads | `sync` | `Extend` | Sync already owns export/import bundle shape | N/A |
| Team-local bundled skill scanning | `skills` | `Extend` | Bundled skill discovery already lives here | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-definition` | `refScope`, strict team-config parsing, GraphQL/team-tool schema updates | `DS-001` | Team-definition users | `Extend` | Main semantic contract owner |
| `agent-definition` | Shared/local filesystem reads by canonical or derived id plus ownership-aware listing/write behavior | `DS-002`, `DS-006` | Runtime/history services, agent-management UI | `Extend` | Service layer keeps separate shared-only and visible-list semantics |
| `agent-team-execution` | Unique leaf-member ids, runtime hydration by scoped ref | `DS-002` | Team launch/history | `Extend` | Uses shared/local lookup, does not own file parsing |
| `sync` | Team payload local-agent serialization and validation | `DS-003` | Node sync | `Extend` | Preserves team ownership |
| `agent-package-roots` | Root summaries, add/remove root, GraphQL resolver naming | `DS-004` | Settings UX | `Rename/Extend` | Replaces legacy naming |
| `skills` | Local bundled skill recursion | `DS-005` | Skill registry | `Extend` | No new subsystem needed |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - settings GraphQL -> package-root service -> config/settings service
  - team runtime -> team-definition service and agent-definition service
  - sync -> team-definition and agent-definition services
  - agent-management GraphQL -> agent-definition visible-list service API -> provider visible-list read path
  - skills -> config only
- Authoritative public entrypoints versus internal owned sub-layers:
  - Team runtime callers use `TeamRunService` / backend factories, not provider internals directly.
  - Settings callers use the package-root GraphQL resolver, not raw server settings keys.
- Forbidden shortcuts:
  - Do not let runtime or sync parse `team-config.json` directly.
  - Do not replace shared-only backend lists with the visible ownership-aware list.
  - Do not merge local agents into the Agents page without ownership metadata.
  - Do not reintroduce `definition source` aliases in touched paths.
- Boundary bypasses that are not allowed:
  - UI components should not keep old `definition-sources` active-section ids while using renamed components.
  - Sync selection should not validate local agents through the shared-agent map.
- Temporary exceptions and removal plan:
  - `None`.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Scoped semantic references plus derived team-local runtime identity, not raw filesystem paths and not compatibility aliases.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: `refScope + ref` is simpler than path parsing and simpler than preserving old and new shapes together.
  - `testability`: strict scope validation and a deterministic derived local-agent id make provider/runtime/sync tests direct.
  - `operability`: moving a package root or syncing it to another machine does not rewrite domain references.
  - `evolution cost`: future filesystem layout changes stay behind the resolver boundary.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Boundary encapsulation assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Move`, `Remove`

## Refined Design Decision

### Backend Contract Split

- Keep server-internal `getAllAgentDefinitions()` semantics shared-only.
- Add a second service/provider path for a visible ownership-aware list used by the GraphQL agent-management query.
- The ownership-aware visible payload includes:
  - resolved `id`,
  - `ownershipScope`,
  - `ownerTeamId` for team-owned agents,
  - `ownerTeamName` for clean UI rendering.
- The frontend never receives raw filesystem paths.

### Frontend Contract

- The generic Agents page consumes the ownership-aware visible list.
- The store exposes a derived shared-only subset for team-authoring and other shared-only selection surfaces.
- Team-owned cards remain visually clean:
  - unchanged agent name,
  - one extra line only: `Team: <team name>`.

### Ownership-Safe Actions

- Team-owned agents remain:
  - visible,
  - runnable,
  - editable.
- Shared-only actions are not assumed safe for team-owned agents by default.
- For this slice, sync/duplicate/delete stay gated until an ownership-aware policy is explicitly designed.

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Semantic identity over storage path | Team member refs and visible ownership metadata | Keeps authoring stable and portable while still making UI ownership obvious | `agent-team-definition` + agent-management UI | User-approved direction |
| Derived compound identity for local-only subjects | Team local run/history ids | Prevents collisions without making local agents global | `agent-team-execution` | Internal runtime shape only |
| Split contract by consumer semantics | Agent-definition service + web store | Preserves safe backend shared-only behavior while giving the UI the richer visible list it needs | `agent-definition` | Avoids polluting sync/runtime/team-authoring callers |
| Renamed canonical module boundary | Package-root API/service | Removes vague terminology at the module edge | settings/package-root module | Clean cut, no aliases |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `Yes` | Runtime, sync, and UI all need the same member-resolution semantics | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | `No` | Each touched subsystem already exists and can be extended locally | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | `Yes` | Derived local-agent id helpers and package-root rename both own real policy | Keep |
| Every off-spine concern has a clear owner on the spine | `Yes` | Package-root counts, skill scan, GraphQL mapping all have owners | Keep |
| Authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | `Yes` | Runtime callers keep using services/factories instead of parsing files | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | `Yes` | No new subsystem is needed | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | `Yes` | Team-local id helper stays shared where safe, while web-only ownership-display formatting stays web-owned | Extract |
| Current structure can remain unchanged without spine/ownership degradation | `No` | Legacy naming and flat global-only ids are the core problem | Change |

### Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Store raw file paths in `team-config.json` for agent refs | Mirrors folder layout directly | Leaks storage layout into the domain model; brittle under moves; ugly in hand-authored configs | `Rejected` | Good intuition, weak product contract |
| B | Keep current bare `ref` contract and infer local-vs-shared during resolution | Smaller patch at first glance | Ambiguous precedence, collision risk, hidden lookup rules, impossible clean sync/history semantics | `Rejected` | Not explicit enough |
| C | Require `refScope` and derive a scoped runtime id for local agents | Clear ownership and stable runtime identity | Requires coordinated schema/runtime/sync changes | `Chosen` | Cleanest end-to-end model |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `agent-team-definition/domain/models.ts` and related GraphQL/store shapes | same paths | Add `refScope` to the team-member contract | provider, GraphQL, UI, tooling | `agent_team` refs keep no scope |
| `C-002` | `Add` | N/A | shared helper in runtime/provider paths | Create deterministic team-local runtime id helpers | runtime, history, provider lookup | Format: `team-local:<teamId>:<agentId>` |
| `C-003` | `Modify` | `file-agent-team-definition-provider.ts` | same path | Strict parse/write of `refScope`; local-agent-aware delete still works by folder ownership | provider | Reject invalid agent members |
| `C-004` | `Modify` | `file-agent-definition-provider.ts` | same path | Resolve synthetic local-agent ids on `getById`, include team-local agents in the visible listing, and route updates to the correct shared or team-local folder | provider, runtime, history, agent management | Shared-vs-local ownership metadata is emitted with each definition |
| `C-004a` | `Modify` | `agent-definition-service.ts`, `cached-agent-definition-provider.ts`, `agent-definition-persistence-provider.ts` | same paths | Keep `getAllAgentDefinitions()` shared-only for backend semantics and add a separate visible-list path for UI consumption | service, cache, GraphQL | Contract split belongs in the service boundary |
| `C-005` | `Modify` | runtime services/factories | same paths | Build collision-free leaf-member ids and hydrate local/shared agents correctly | team launch, history | Nested teams preserve owner team id |
| `C-006` | `Modify` | sync services | same paths | Preserve local-agent files inside team payloads | export/import, selection validation | Shared selection list remains shared-only |
| `C-007` | `Rename/Move` | `definition-sources/*` surfaces | `agent-package-roots/*` surfaces | Canonical naming cleanup | server, GraphQL, web settings | Clean cut rename |
| `C-008` | `Modify` | settings UI and summaries | same paths/new names | Show package-root naming and separate shared/local counts | web settings | Route id becomes `agent-package-roots` |
| `C-009` | `Modify` | `skill-service.ts` | same path | Scan team-local bundled skills | skills | Shared skill discovery remains intact |
| `C-010` | `Modify` | agent-definition GraphQL + web agent-management files | same paths | Surface ownership metadata, disambiguate duplicate names, and gate shared-only actions for team-local agents | server GraphQL, Pinia store, Agents UI | Team-local agents become configurable from the main Agents page |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `definition source` naming in touched service/API/UI files | Product concept is package-root registration, not abstract definition sourcing | renamed package-root module/surfaces | `In This Change` | Includes GraphQL names and settings labels |
| Bare agent refs with implicit shared meaning in touched team-config parsing | Clean scoped contract must be explicit | `refScope` on `TeamMember` | `In This Change` | Invalid config is rejected |
| Top-level-agent-only bundle assumption for team export/import | Local agents belong to team ownership | extended team sync payload | `In This Change` | Keeps shared-agent sync separate |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-team-definition/domain/models.ts` | `agent-team-definition` | Team member contract | Add `refScope` | Canonical domain shape | Yes |
| `agent-team-definition/providers/file-agent-team-definition-provider.ts` | `agent-team-definition` | File boundary | Strict parse/write of scoped members | Team-config IO owner | Yes |
| `agent-definition/providers/file-agent-definition-provider.ts` | `agent-definition` | File boundary | Shared/local filesystem-backed agent reads | All agent-file parsing already lives here | Yes |
| `agent-definition/services/agent-definition-service.ts` | `agent-definition` | Service boundary | Shared-only list vs visible ownership-aware list contract split | This is the authoritative consumer-semantics owner | Yes |
| runtime factories/services | `agent-team-execution` | Runtime boundary | Scoped leaf-member and runtime hydration logic | Execution concern owner | Yes |
| `sync/services/*` | `sync` | Bundle boundary | Ownership-preserving export/import and validation | Sync owns payload shape | Yes |
| renamed package-root files | settings/package-root | API/UI boundary | Renamed root list/add/remove surface | User-facing root management owner | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Team-local runtime id build/parse logic | shared helper under runtime/provider-reachable ownership | `agent-team-execution` or shared adjacent utility | Runtime, history, and provider lookup all need the same format | `Yes` | `Yes` | A generic misc helper |
| Shared vs local display label logic in web | existing team-definition UI/store helpers | web team-definition UI | Avoid repeating label rules | `Yes` | `Yes` | A detached formatting utility with no owner |
| Shared-only filtering for team-authoring | web agent-definition store getter | web store boundary | Prevent visible local agents from polluting shared-only pickers | `Yes` | `Yes` | Per-component ad hoc filtering everywhere |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `TeamMember.refScope` | `Yes` | `Yes` | `Low` | `Yes` | Keep nullable only for `agent_team` |
| team-local runtime id string | `Yes` | `Yes` | `Low` | `Yes` | Keep internal-only; do not expose as authoring contract |
| package-root summary counts | `Yes` | `Yes` | `Low` | `Yes` | Expose `sharedAgentCount` and `teamLocalAgentCount` separately |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | `agent-team-definition` | Domain contract | Scoped team-member shape | Canonical team model | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `agent-team-definition` | File boundary | Scoped team-config parse/write | Team-config filesystem owner | Yes |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | `agent-definition` | File boundary | Shared/local agent-definition reads | Agent file IO owner | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `agent-team-execution` | Runtime projection owner | Leaf-member ids for runtime/history | Central leaf-member expander | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` | `agent-team-execution` | Runtime hydrator | Shared/local runtime agent hydration | Backend runtime owner | Yes |
| `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts` | `sync` | Validation boundary | Scoped team dependency expansion | Selection owner | Yes |
| `autobyteus-server-ts/src/sync/services/node-sync-service.ts` | `sync` | Bundle boundary | Team-local ownership export/import | Sync payload owner | Yes |
| renamed package-root files on server/web | package-root settings surface | API/UI boundary | Canonical root management naming | Product naming owner | No |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | `Modify` | `DS-001` | owner | Add `refScope` to `TeamMember` | constructor, type fields | strict domain shape |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | `Modify` | `DS-001` | off-spine mapping | Expose `refScope` enum/input | GraphQL team member types | agent-only scope |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | `Modify` | `DS-002` | owner | Resolve shared or synthetic local ids on read | `getById` | `getAll` stays shared-only |
| `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts` | `Modify` | `DS-006` | owner | Split shared-only list semantics from visible ownership-aware list semantics | `getAllAgentDefinitions`, visible-list method | service boundary owns consumer semantics |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `Modify` | `DS-002` | owner | Build unique local runtime ids | `collectLeafAgentMembers` | nested team aware |
| `autobyteus-server-ts/src/sync/services/node-sync-service.ts` | `Modify` | `DS-003` | owner | Add `localAgents` to team sync payload | export/import helpers | no global flattening |
| `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | `Rename/Move` | `DS-004` | owner | Canonical package-root summaries and mutation methods | list/add/remove roots | includes separate counts |
| `autobyteus-web/components/settings/AgentPackageRootsManager.vue` | `Rename/Move` | `DS-004` | owner | Renamed settings panel and new labels/counts | component methods | new section id |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| package-root service | `definition-sources/services/definition-source-service.ts` | `agent-package-roots/services/agent-package-root-service.ts` | package-root registration | `No` | `Low` | `Move` | current path/name are misleading |
| package-root GraphQL type | `api/graphql/types/definition-sources.ts` | `api/graphql/types/agent-package-roots.ts` | package-root GraphQL boundary | `No` | `Low` | `Move` | matches canonical naming |
| web settings manager | `components/settings/DefinitionSourcesManager.vue` | `components/settings/AgentPackageRootsManager.vue` | settings UI | `No` | `Low` | `Move` | aligns file name with feature |
| runtime/sync files | existing subsystem paths | same paths | runtime/sync concerns | `Yes` | `Low` | `Keep` | concern ownership is correct already |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shared standalone agent ref | `{ "memberName": "architect", "refType": "agent", "refScope": "shared", "ref": "architect-designer" }` | `{ "memberName": "architect", "refType": "agent", "ref": "architect-designer" }` | Scope must be explicit |
| Team-local agent ref | `{ "memberName": "reviewer", "refType": "agent", "refScope": "team_local", "ref": "reviewer" }` | `{ "memberName": "reviewer", "refType": "agent", "refPath": "./agents/reviewer" }` | Ownership is semantic, not path-based |
| Derived local runtime id | `team-local:software-engineering-team:reviewer` | `reviewer` | Downstream runtime/history ids must be collision-free |
| Package-root summary | `{ "sharedAgentCount": 4, "teamLocalAgentCount": 7, "agentTeamCount": 3 }` | `{ "agentCount": 4, "agentTeamCount": 3 }` | Local agents must not be hidden |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep `definitionSources` GraphQL fields as aliases | Existing clients may still call the old names | `Rejected` | rename GraphQL to `agentPackageRoots` and update in-repo callers/tests |
| Keep `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` fallback | Existing envs may still use the old key | `Rejected` | canonical key becomes `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` |
| Treat missing `refScope` as implicit shared | Existing team configs omit the field | `Rejected` | explicit `refScope` is required for agent refs |
| Preserve `definition-sources` settings section id | Existing deep links may use the old id | `Rejected` | use `agent-package-roots` consistently |

## Derived Interface Boundary Mapping

| Owning File | Mapped Spine ID | Owner / Off-Spine Concern | Subject Owned | Concern / Responsibility | Interfaces / APIs / Methods | Accepted Identity Shape(s) | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-definition` provider layer | `DS-001` | owner | Team member target identity | Parse/store scoped refs from `team-config.json` | team-config reader/writer | `agent(shared,id)`, `agent(team_local,id)`, `agent_team(id)` | JSON <-> domain model | filesystem parser |
| `agent-definition` provider layer | `DS-002` | owner | Filesystem-backed agent definition lookup | Load shared agents and scoped local agents by canonical or derived id | `getById` | shared agent id or `team-local:<teamId>:<agentId>` | id -> agent definition | filesystem |
| `agent-team-execution` runtime layer | `DS-002` | owner | Executable member definition | Resolve scoped refs to shared or local definitions and derived runtime ids | leaf-member projection, team build | same scoped identity shapes | domain model -> runtime config/history metadata | agent-definition/team-definition services |
| `sync` layer | `DS-003` | owner | Sync payload shape | Preserve team-local members inside team-owned sync payload | export/import bundle methods | same scoped identity shapes | node sync bundle | provider/services |
| package-root settings API | `DS-004` | owner | Registered package-root paths | List/add/remove canonical root paths | `agentPackageRoots`, `addAgentPackageRoot`, `removeAgentPackageRoot` | absolute root path | settings UI <-> GraphQL | config/settings service |

## Scope-Appropriate Separation Of Concerns Check

- UI/frontend scope: responsibility is clear at settings component/store and team-definition UI/store boundaries.
- Non-UI scope: responsibility is clear at team-definition parse, runtime resolution, sync bundle, and skill scan boundaries.
- Integration/infrastructure scope: package-root registration remains isolated from team runtime and sync logic.
- Ownership note: local-agent resolution belongs to agent/team-definition and runtime owners, not to the settings surface.
- File-placement note: the misleading `definition-sources` module is moved to the correct named boundary.

## Interface Boundary Check (Mandatory)

| Interface / API / Query / Command / Method | Subject Owned | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous-ID Or Generic-Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Team member ref in `team-config.json` | Team member target identity | `Yes` | `Yes` | `Low` | Add required `refScope` |
| Agent definition lookup by id | Shared or local filesystem-backed agent definition | `Yes` | `Yes` | `Low` | Support derived local-agent id parsing in `getById` |
| Package-root settings API | Registered package-root paths | `Yes` | `Yes` | `Low` | Rename cleanly to package-root terminology |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Product term | `Definition Source` | `Agent Package Root` | Clearer user-facing meaning | chosen canonical term |
| Settings component | `DefinitionSourcesManager.vue` | `AgentPackageRootsManager.vue` | Matches product meaning | rename in this slice |
| GraphQL surface | `definitionSources` | `agentPackageRoots` | Align API with product term | clean cut |
| Team member schema field | none | `refScope` | Encodes shared vs local intent directly | required for agents |
| Local runtime/history id helper | none | `buildTeamLocalAgentDefinitionId` | States exactly what it builds | internal only |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `definition-source-service` | package-root registration and summary | `No` | `Rename` | `C-007` |
| `DefinitionSourcesManager` | package-root settings UI | `No` | `Rename` | `C-007` |
| bare `ref` for agents | ambiguous shared/local agent selector | `No` | `Split` | `C-001` |
