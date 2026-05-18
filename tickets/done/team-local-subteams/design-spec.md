# Design Spec

## Current-State Read

Current product behavior supports nested team *membership* but not nested team *ownership*.

Current spine:

`team-config.json -> FileAgentTeamDefinitionProvider -> AgentTeamDefinitionService -> GraphQL agentTeamDefinitions -> Pinia store -> AgentTeamList root cards`

Important current facts:

- `TeamMember` supports `refType: "agent" | "agent_team"`.
- `refScope` exists, but current server and frontend code only treats it as meaningful for agents. `TeamMember` nulls it for `agent_team`, `team-definition-config.ts` forbids it for `agent_team`, and the frontend form rejects it.
- Team-local agents are stored under `<team>/agents/<agent-id>/` and resolved today through `team-local:<teamId>:<agentId>`.
- Shared teams are discovered from first-level directories under configured `agent-teams/` roots.
- Application-owned top-level teams are discovered from application bundles at `applications/<app>/agent-teams/<team-id>/` and currently treat nested team refs as same-application sibling refs with no persisted `refScope`.
- Runtime topology planning recursively resolves `agent_team` members and detects cycles, but resolves child team IDs by raw `node.ref`.
- Agent-definition lookup/list/cache code is coupled to the old local-agent ID helper and only walks local agents under root shared/application-owned team source paths.
- The frontend root Agent Teams page renders all fetched definitions, so any first-level folder appears as a root card.
- API/E2E browser validation later proved the migrated Northstar data model works, but found UX-001: `AgentTeamDetail` renders nested team rows and blueprint names without an explicit `View` / `View Details` action, even though direct navigation to the nested team detail route works.

The root problem is an ownership-boundary mismatch. The product has no authoritative way to say “this child team is local to this parent team,” and the agent-definition side cannot yet resolve local agents owned by local subteams. A frontend-only “hide referenced teams” filter would improve one screenshot but would incorrectly hide intentionally reusable shared teams whenever they are nested by another team.

## Intended Change

Add first-class team-local subteam support and explicit application-owned nested-team semantics:

- Allow `agent_team` members to use explicit `refScope`.
- Store local subteams under the owning team at `<owner-team>/agent-teams/<local-team-id>/`.
- Generalize canonical team-local definition identity so both local teams and local agents can have an owner team whose canonical ID may itself be team-local or application-owned.
- Resolve team and agent member references through scoped resolver owners before runtime, sync, detail display, launch defaults, and traversal.
- Mark team-local team definitions with `ownershipScope: "team_local"` plus owner-team metadata.
- Update agent-definition source lookup, visible listing, and cache bypass so local agents under local subteams resolve correctly.
- Update application-owned persisted config semantics: `application_owned` means same-application sibling resource; `team_local` means child resource under the containing team.
- Update the frontend root Agent Teams page to render root/catalog teams only, using explicit ownership/root projection.
- Update `AgentTeamDetail` so every resolvable `agent_team` member has a visible `View` / `View Details` action that navigates to the resolved canonical nested team detail route.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `team-definition-config.ts` forbids `refScope` on `agent_team`; `FileAgentTeamDefinitionProvider.getAll()` treats every first-level folder as a listed team; `AgentTeamList.vue` renders all definitions; `team-local-agent-definition-id.ts`, `agent-definition-source-paths.ts`, `team-local-agent-discovery.ts`, and `cached-agent-definition-provider.ts` are old local-agent-ID-specific; `application-owned-team-source.ts` rejects scoped nested team refs.
- Design response: Introduce scoped member-reference semantics, generalized local identity, local team discovery/source resolution, agent-definition recursive local-agent lookup/list/cache behavior, app-owned explicit `application_owned` vs `team_local` config semantics, graph validation, sync layout support, frontend root projection, and explicit nested-team detail navigation affordances.
- Refactor rationale: The requested behavior cannot be added cleanly by local UI changes because ownership, identity, persistence layout, agent lookup, runtime resolution, sync, app-owned bundles, and display all depend on the old “teams are top-level or app-owned only” model.
- Intentional deferrals and residual risk, if any: Rich visual nested-team authoring UX can be incremental if display/resolution/listing and explicit nested-team drill-in navigation are implemented first. Northstar package migration in `autobyteus-agents` may be a separate package-data step after product support. Since application-owned is not production-enabled, no compatibility wrapper for app-owned no-scope nested team configs should be added; update fixtures/source to the clean explicit scope.

## Terminology

- `Root/catalog team`: A team definition that should appear as a top-level card on the Agent Teams page.
- `Team-local subteam`: A team definition physically and semantically owned by another team.
- `Shared nested team`: A reusable shared/root team referenced as a nested member by another team.
- `Application-owned sibling team`: A top-level team resource in the same application bundle, e.g. `applications/my-app/agent-teams/review-team`.
- `Team-local definition identity`: Canonical runtime/sync/API ID for local agents and local teams.

## Design Reading Order

1. Data-flow spine and ownership model
2. Identity and source resolution
3. Backend team-definition and agent-definition paths
4. Application-owned semantics
5. Frontend root projection, detail navigation, and detail/form resolution
6. File mapping and migration sequence

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the agent-only `team-local:<teamId>:<agentId>` identity owner with a generalized team-local definition identity owner. Update imports/callers rather than retaining dual new-code helpers.
- Required action: remove the rule that forbids `refScope` for `agent_team` members; replace it with scoped member-reference validation.
- Required action: stop using raw `node.ref` for nested team resolution paths; route through the scoped team-reference resolver.
- Required action: stop rendering raw `store.agentTeamDefinitions` on the root Agent Teams page; render root/catalog projection.
- Required action: reject and update app-owned nested team configs that omit `refScope`; use `application_owned` for same-application sibling teams and `team_local` for child teams under the containing team.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team package files | Root Agent Teams page | Team Definition Catalog | Controls whether local subteams appear as root cards. |
| DS-002 | Primary End-to-End | Parent `team-config.json` member | Runtime `TeamRunConfig.memberTree` | Team Definition Topology Planner | Ensures scoped nested teams run correctly. |
| DS-003 | Primary End-to-End | Team detail/form node | Nested member display/navigation/edit validation | Frontend Team Definition Projection | Ensures UI understands local vs shared/application-owned subteams and exposes drill-in navigation. |
| DS-004 | Primary End-to-End | Sync source team selection | Target node team/local-agent file layout | Node Sync Definition Export/Import | Ensures local subteams and their local agents move with their parent. |
| DS-005 | Bounded Local | Scoped team member ref | Canonical team definition ID/source paths | Scoped Team Reference Resolver | Provides one backend owner for team refs. |
| DS-006 | Primary End-to-End | Local-agent canonical ID | AgentDefinition GraphQL/store lookup | Agent Definition Source Resolver | Required for agents owned by team-local subteams. |
| DS-007 | Primary End-to-End | Application-owned team config | Canonical app-owned/team-local refs | Application-Owned Team Source Normalizer | Prevents app-owned sibling refs from being confused with team-local child refs. |

## Primary Execution Spine(s)

- DS-001: `Package roots -> Team source resolver -> Definition service -> GraphQL/store -> Root definition projection -> AgentTeamList cards`
- DS-002: `Parent team config -> Scoped team ref resolver -> TeamDefinitionTopologyPlanner -> TeamRunConfig member tree -> runtime backend`
- DS-003: `Team detail/form -> scoped nested member lookup -> local/shared/application badges + visible nested-team action -> route/detail display or validation result`
- DS-004: `Sync selection -> scoped dependency expansion -> sync payload -> scoped file layout writer -> target package files`
- DS-006: `Canonical local-agent ID -> Agent source resolver -> team source resolver for owner team -> local agent files -> GraphQL/store lookup`
- DS-007: `App team-config member -> app-owned normalizer -> domain/API member -> integrity validator -> writer localizer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Server reads root and local team definitions, annotates ownership, frontend filters root cards by explicit ownership. | Team source resolver, definition service, frontend store, root list | Team Definition Catalog | Ownership metadata, root projection, featured split |
| DS-002 | Runtime resolves each nested team member relative to its containing team context, producing stable route keys and child member trees. | Parent definition, scoped resolver, topology planner, run config | TeamDefinitionTopologyPlanner | Identity utility, cycle validation, local-agent lookup |
| DS-003 | UI displays local subteams under their parent, exposes a visible drill-in action for resolvable nested teams, and validates edits using the same scoped model. | Detail component, form state, store lookup, page navigation boundary | Frontend Team Definition Projection | Badges, breadcrumbs, self/ancestor cycle validation, localization |
| DS-004 | Sync follows resolved team dependency graph and writes local children and their local agents below their owning parents. | Selection service, payload builder, file layout writer | Node Sync Definition Export/Import | Dependency graph, local file paths, delete/import semantics |
| DS-005 | One team resolver converts a containing team context plus `{refType, refScope, ref}` into canonical team IDs and file source paths. | Identity utility, team source path resolver | Scoped Team Reference Resolver | URI/segment encoding, path traversal prevention |
| DS-006 | Agent lookup parses local-agent IDs, resolves the owner team source path even when the owner is a local subteam, and reads `<owner>/agents/<agent>`. | Agent source resolver, local-agent discovery, cache wrapper | Agent Definition Source Resolver | Cache bypass, owner labels, recursive local-team list |
| DS-007 | App-owned parsing differentiates same-application sibling refs from child team refs and writes the same explicit distinction back to config. | App-owned source, normalizer, integrity validator | Application-Owned Team Source Normalizer | Same-app validation, no-scope rejection, bundle scanning |

## Spine Actors / Main-Line Nodes

- Team-local definition identity owner
- Scoped team reference resolver
- Team source-path resolver
- Agent source-path resolver
- File agent-team definition provider
- File agent-definition provider / local-agent discovery / cache wrapper
- Application-owned team source normalizer/integrity validator
- AgentTeamDefinitionService / graph validator
- TeamDefinitionTopologyPlanner
- NodeSync selection/file layout services
- Frontend AgentTeamDefinitionStore and AgentDefinitionStore
- AgentTeamList / AgentTeamDetail / AgentTeamDefinitionForm

## Ownership Map

| Owner | Owns |
| --- | --- |
| Team-local definition identity owner | Canonical ID building/parsing for local agents and local teams, safe segment encoding, subject distinction. |
| Scoped team reference resolver | Converts containing team context and team member ref into canonical child team ID. |
| Team source-path resolver | Mapping canonical team IDs to source file paths for shared, application-owned, and team-local teams. |
| Agent source-path resolver | Mapping canonical agent IDs to source file paths, including local agents whose owner team is shared, application-owned, or team-local. |
| Team-local agent discovery | Reading/listing local agents under every discovered team source, including recursively discovered local subteams. |
| File agent-team definition provider | Reading, listing, creating/updating/deleting writable team definitions across root/local/application-owned layouts. |
| File agent-definition provider / cache wrapper | Reading local agents by canonical ID, visible listing, and cache bypass/exclusion for local agents. |
| Application-owned team source normalizer | Persisted app-owned config semantics and canonicalization/localization of app sibling vs child local teams. |
| AgentTeamDefinitionService / graph validator | Member-scope invariants, coordinator validation, missing-ref validation, self/cycle rejection. |
| TeamDefinitionTopologyPlanner | Runtime nested member tree, route keys, local-agent/local-team ID resolution. |
| Node Sync Definition Export/Import | Dependency closure and target file layout for selected team definitions and local agents. |
| Frontend stores | Cached all-definition lookup, root/catalog projection, local-agent lookup by owner team. |
| AgentTeamList | Root card rendering only; must not infer ownership from raw folders. |
| AgentTeamDetail/Form | Scoped member display, visible nested-team detail navigation action, and edit validation. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `agentTeamDefinitions` | AgentTeamDefinitionService | API transport for definitions | Identity resolution, root filtering policy, or detail navigation policy beyond returned fields/projections |
| GraphQL `agentDefinitions` | AgentDefinitionService | API transport for visible agents | Local-agent source walking policy beyond service/provider output |
| Frontend store getters | Pinia stores | Reactive lookup/projection for components | File/source semantics |
| `AgentTeamList.vue` | AgentTeamDefinitionStore root projection | Present root cards | Deciding local ownership by scanning refs/folders |
| `AgentTeamDetail.vue` | AgentTeamDefinitionStore + page navigation boundary | Present member rows and emit navigation | Resolving child files, pushing router paths directly, or inventing alternate IDs |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Agent-only `team-local-agent-definition-id.ts` API as authoritative local identity | Too narrow and colon-delimited for nested local teams | Generalized team-local definition identity utility | In This Change | Update all imports/callers; no old-ID generation. |
| `TeamMember` constructor nulling `refScope` for `agent_team` | Blocks team-local/app-owned explicit team refs | Scoped member-ref validation | In This Change | Team refs must preserve explicit scope. |
| Parser/form rule forbidding nested-team `refScope` | Blocks requested model | `TeamMemberRefScope` by subject and owner context | In This Change | Require/canonicalize scope for all members. |
| Raw `node.ref` nested-team resolution | Cannot resolve local/app-owned semantics | Scoped team-reference resolver | In This Change | Update backend and frontend traversal. |
| Cache local-agent detection via old parser only | Misses local agents owned by local subteams | Generalized local-agent ID parser | In This Change | Cache bypass/update exclusion must use new parser. |
| App-owned no-scope nested team convention | Ambiguous with team-local subteams | Explicit `application_owned` or `team_local` scope | In This Change | Feature not production-enabled; update fixtures/source cleanly. |
| `AgentTeamList` rendering all definitions | Shows local subteams as roots | Store root/catalog projection | In This Change | Keep all-definition lookup for detail/run. |

## Return Or Event Spine(s) (If Applicable)

Runtime and streaming return/event spines already support nested member route keys. The required change is upstream definition resolution; no new event protocol is required unless implementation finds a route-key identity mismatch.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Team source-path resolver
  - `canonical team id -> parse kind -> parent source path if local -> child teamDir -> md/config paths`
  - Matters because all other owners must not reconstruct local subteam paths themselves.
- Parent owner: Agent source-path resolver
  - `canonical agent id -> parse local-agent id -> resolve owner team source path -> owner/agents/localAgentId files`
  - Matters because local subteam-owned agents require the owner team source resolver.
- Parent owner: Graph validator
  - `root definition -> resolve scoped member refs -> visit child teams -> visited stack -> errors`
  - Matters because cycles should fail before runtime surprises.
- Parent owner: Application-owned normalizer
  - `persisted local ref + scope -> canonical domain ref -> validate -> localize for write`
  - Matters because app sibling refs and child subteam refs have different ownership.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Segment encoding/decoding | DS-005, DS-006 | Identity owner | Safe canonical IDs for nested local ownership | Avoid colon/path ambiguity | Each caller invents incompatible local IDs |
| Owner metadata labels | DS-001, DS-003, DS-006 | Provider/store/detail | Show local team's owner context | User clarity | Root list/detail guesses ownership |
| Recursive local-team source collection | DS-006 | Team-local agent discovery | Include local agents under local subteams | Required for AC-009 | Local subteam agents disappear from GraphQL/store |
| Cache bypass | DS-006 | Cached agent provider | Read local agents directly from persistence provider | Cache is exhaustive only for shared/app top-level definitions | Stale/missing local agents |
| App-owned localize/canonicalize | DS-007 | App-owned source normalizer | Persist local app IDs while exposing canonical IDs | Keep package files readable and API unambiguous | App sibling teams confused with child teams |
| Cycle validation | DS-002, DS-003 | Service/form | Reject invalid graph | Prevent runtime recursion errors | Runtime becomes first validation point |
| Featured catalog split | DS-001 | AgentTeamList | Keep existing featured behavior after root projection | Preserve UX | Featured local child could appear as root |
| Sync local layout writer | DS-004 | Node sync | Place local subteams/agents under parent | Preserve ownership on target | Sync flattens local teams into root catalog |
| Nested-team detail action | DS-003 | AgentTeamDetail | Show a visible `View` / `View Details` control for resolvable `agent_team` members | Users need a discoverable path from parent to child team detail | Child detail route exists but is invisible to users |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Local file ownership precedent | Team-local agent discovery | Extend / mirror | Same owner metadata and nested folder pattern | N/A |
| Local agents under local subteams | Agent-definition source paths/discovery/cache | Extend | Existing subsystem already owns agent lookup/list/cache | N/A |
| Team graph recursion | TeamDefinitionTopologyPlanner / TraversalService | Extend | Already owns nested runtime topology | N/A |
| App sibling-team integrity | Application-owned team source + integrity validator | Extend | Existing app-owned validator already owns same-app constraints | N/A |
| Dependency closure | NodeSyncSelectionService | Extend | Already expands nested teams | N/A |
| Root page projection | AgentTeamDefinitionStore | Extend | Store owns cached definitions and computed lists | N/A |
| Nested-team detail navigation | AgentTeamDetail + existing page navigation | Extend | Detail component already owns member row actions; page already owns route transitions | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` agent-team utilities | Canonical team-local identity | DS-005, DS-006 | Server/frontend/shared callers | Extend | Subject-specific encoded IDs for local agents and local teams. |
| Server agent-team-definition | Domain model, config parsing, provider, source paths, graph validation | DS-001, DS-002, DS-005, DS-007 | Definition service/provider | Extend | Primary backend team owner. |
| Server agent-definition | Local-agent source resolution, recursive listing, cache bypass/update exclusion | DS-006 | AgentDefinitionService/provider | Extend | Required by AR-001. |
| Server application-bundles/app-owned source | Persisted app-owned scope semantics and bundle validation | DS-007 | App-owned normalizer/validator | Extend | Required by AR-002. |
| Server agent-team-execution | Runtime topology/traversal | DS-002 | Topology planner | Extend | No new runtime mode. |
| Server sync | Dependency expansion and file layout | DS-004 | Node sync services | Extend | Must preserve parent-owned layout and local subteam agents. |
| Frontend agentTeams/agents | Store projection, root list, detail navigation, form, local-agent lookups | DS-001, DS-003, DS-006 | Frontend store/components | Extend | Required by user screenshot, AR-001, and UX-001. |

## Scoped Resolution Context Contract (AR-001 / AR-002)

Scoped member resolution must not be modeled as `ownerTeamId + member` only. That is too thin for application-owned packages because the same persisted member `ref` can mean either a sibling app-owned team or a child team owned by the containing team. Use an explicit containing-team context whenever resolving team or agent members:

```ts
type DefinitionResolutionContext = {
  containingTeamId: string;
  containingTeamSourcePaths: ResolvedTeamSourcePaths;
  containingTeamOwnershipScope: 'shared' | 'application_owned' | 'team_local';
  ownerApplicationId?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
};
```

Resolution contract:

- `member.refScope === "shared"`: `member.ref` is already a shared/root definition ID. The resolver validates that the target is not a team-local child and returns the shared ID.
- `member.refScope === "team_local"`: `member.ref` is a local child ID relative to `containingTeamSourcePaths.teamDir`; the team resolver builds a canonical team-local team ID from `containingTeamId` plus the local child ID, and the agent resolver builds a canonical team-local agent ID from `containingTeamId` plus the local agent ID.
- `member.refScope === "application_owned"`: `member.ref` must resolve inside `ownerApplicationId`; for app-owned package files it may be persisted as the local app team ID, but domain/API output must expose the canonical application-owned team ID after normalization.
- Missing `refScope` is invalid for all new canonical member configs. Shared references must say `shared`; app sibling references must say `application_owned`; local child references must say `team_local`.
- Source/path resolution must return both the canonical target ID and the target source paths. Callers that need files must consume the resolver result instead of reconstructing paths from `ref`.

The same context object is the input to backend topology planning, graph validation, sync dependency expansion, application-owned bundle validation, and frontend tree projection equivalents. Frontend utilities can use the GraphQL projection of this context, but must preserve the same semantics.

## Team-Local Definition Identity Contract

Replace the current agent-only local ID shape with a subject-specific encoded identity file such as `autobyteus-ts/src/agent-team/utils/team-local-definition-id.ts`:

```ts
type TeamLocalDefinitionSubject = 'agent' | 'agent_team';

buildTeamLocalAgentDefinitionId(ownerTeamId: string, localAgentId: string): string;
buildTeamLocalTeamDefinitionId(ownerTeamId: string, localTeamId: string): string;
parseTeamLocalDefinitionId(id: string):
  | { subject: 'agent'; ownerTeamId: string; localDefinitionId: string }
  | { subject: 'agent_team'; ownerTeamId: string; localDefinitionId: string }
  | null;
```

Target wire shape should be subject-specific and nested-safe, for example `team-local-agent:<encodedOwnerTeamId>:<encodedLocalAgentId>` and `team-local-team:<encodedOwnerTeamId>:<encodedLocalTeamId>`. The exact encoder can be percent-encoding or base64url, but it must round-trip canonical owner IDs that contain colons or other separators.

No caller should manually split on `:` or construct `team-local:<teamId>:<agentId>` strings. Identity tests must prove a local subteam canonical ID can own both a local agent and a deeper local subteam.

## Agent-Definition Local-Agent Resolution Path (AR-001)

Local agents owned by team-local subteams are part of the first implementation, not a follow-up. The agent-definition subsystem must be updated in lockstep with team-local subteam discovery.

Required backend behavior:

1. `agent-definition-source-paths.ts` parses generalized local-agent IDs with `parseTeamLocalDefinitionId()`. When the subject is `agent`, it resolves `ownerTeamId` by calling `findTeamSourcePaths(ownerTeamId, ...)`, then resolves files at `<ownerTeamDir>/agents/<localAgentId>/agent.md` and `<ownerTeamDir>/agents/<localAgentId>/agent-config.json`.
2. `team-local-agent-discovery.ts` must enumerate local agents under every discovered team source context: shared root teams, application-owned top-level teams, and recursively discovered team-local subteams. Introduce or reuse a team-definition helper such as `listAllTeamSourceContexts()` / `listAllDiscoveredTeamSources()` so local-agent discovery does not duplicate team-recursion policy.
3. Each discovered local agent must have `ownerTeamId` equal to the canonical containing team ID. For `applications/my-app/agent-teams/main-team/agent-teams/drafting-cell/agents/planner/`, the owner is the canonical team-local ID for `drafting-cell`, not the app-owned `main-team` ID.
4. `file-agent-definition-provider.ts` must update `getById()`, `getAllVisible()`, `create/update/delete` validation, and any owner-label metadata to use the new local-agent parser and source resolver.
5. `cached-agent-definition-provider.ts` must bypass and exclude every generalized local-agent ID. The cache remains an index of shared/application-owned non-local agent definitions; it must not try to be exhaustive for team-local agents because local agents are source-file-owned by their containing teams.
6. GraphQL `agentDefinitions` must return local subteam-owned local agents with the canonical local-subteam `ownerTeamId`, and `autobyteus-web/stores/agentDefinitionStore.ts` must continue to resolve them via `getTeamLocalAgentDefinitionsByOwnerTeamId(ownerTeamId)`.
7. Sync dependency expansion must include these agents when their owner local subteam is included, and the file layout writer must write them back under the local subteam's `agents/` folder, not the parent root team's `agents/` folder.

Required acceptance tests for this path:

- A generalized local-agent canonical ID owned by a generalized local-team canonical ID resolves to `<parent>/agent-teams/<child>/agents/<agent-id>/`.
- `getAllVisible()` / GraphQL visible listing includes the local subteam-owned local agent with the local subteam owner ID.
- The cache wrapper does not cache or hide that agent.
- Frontend agent store lookup by the local subteam canonical owner ID returns the agent.
- Runtime topology and sync dependency closure see the same local agent through the scoped member resolver.

## Application-Owned Scope Semantics (AR-002)

Application-owned is an application-package ownership scope, not a parent-team ownership scope.

Canonical rules:

| Containing Team Ownership | Member Type | Persisted `refScope` | Persisted `ref` Meaning | Domain/API `ref` Meaning | Allowed? |
| --- | --- | --- | --- | --- | --- |
| `application_owned` | `agent` | `team_local` | Agent under current team's `agents/` folder | local agent id; resolver builds local-agent canonical ID from containing team | Yes |
| `application_owned` | `agent_team` | `application_owned` | Sibling team under `applications/<app>/agent-teams/<ref>/` | canonical application-owned team ID | Yes |
| `application_owned` | `agent_team` | `team_local` | Child team under current team's `agent-teams/<ref>/` | local team id; resolver builds team-local team ID from containing team | Yes |
| `application_owned` | `agent_team` | missing/null | Legacy no-scope sibling convention | N/A | No, clean-cut reject/update fixtures |
| `application_owned` | `agent_team` | `shared` | Shared catalog team outside app bundle | N/A | Reject for app-owned bundle integrity in this change |
| `shared` or `team_local` | `agent_team` | `shared` | Shared/root catalog team ID | shared team ID | Yes |
| `shared` or `team_local` | `agent_team` | `team_local` | Child team under current team's `agent-teams/` | local team id; resolver builds local team ID | Yes |
| `shared` or `team_local` | `agent_team` | `application_owned` | Application-owned canonical team ID | canonical application-owned team ID | Only when caller context intentionally allows app-owned references; default shared package validation should reject unless existing product use requires it. |

Concrete examples:

```text
applications/my-app/
  agent-teams/
    main-team/
    review-team/
```

`main-team/team-config.json` referencing sibling `review-team`:

```json
{
  "memberName": "review_team",
  "ref": "review-team",
  "refType": "agent_team",
  "refScope": "application_owned"
}
```

Domain/API member after normalization:

```json
{
  "memberName": "review_team",
  "ref": "<canonical application-owned team id for my-app/review-team>",
  "refType": "agent_team",
  "refScope": "application_owned"
}
```

Child local team under app-owned main team:

```text
applications/my-app/
  agent-teams/
    main-team/
      agent-teams/
        drafting-cell/
```

`main-team/team-config.json`:

```json
{
  "memberName": "drafting_cell",
  "ref": "drafting-cell",
  "refType": "agent_team",
  "refScope": "team_local"
}
```

`main-team` remains `ownershipScope = application_owned`; `drafting-cell` becomes `ownershipScope = team_local` and `ownerTeamId = <canonical application-owned id for main-team>`.

Normalizer and validator responsibilities:

- `application-owned-team-source.ts` must parse `agent_team` scopes explicitly.
- `application-owned-team-ref-normalizer.ts` must canonicalize `application_owned` sibling refs with `buildCanonicalApplicationOwnedTeamId()` and preserve `team_local` child refs for the scoped local-team resolver.
- `localizeApplicationOwnedTeamMembers()` must write sibling app-owned refs back to local app team IDs with `refScope: "application_owned"`; child local team refs remain local child IDs with `refScope: "team_local"`.
- `application-owned-team-integrity-validator.ts` must validate app sibling refs against the same application ID and local child refs against the current team's local `agent-teams/` folder.
- `file-application-bundle-provider.ts` must keep top-level application-owned team discovery limited to direct app `agent-teams/` folders and validate local child teams recursively through the team-local team source resolver, not by adding children to the app catalog.

## Nested-Team Detail Navigation Affordance (UX-001)

UX-001 is a frontend discoverability requirement, not a backend ownership-model change. Backend/API validation already proves nested team definitions are resolvable and direct child detail routes work. The gap is that parent detail rows do not expose the route as an obvious user action.

Target behavior:

- For every `TeamMemberNode` with `refType === 'AGENT_TEAM'`, `AgentTeamDetail` resolves the child canonical team ID using the same scoped lookup used for blueprint/avatar display.
- If the child team definition is resolvable in `AgentTeamDefinitionStore`, the row renders a visible `View` or `View Details` action with localized label/title/aria text.
- Activating the action emits the existing page navigation payload `{ view: 'team-detail', id: resolvedChildTeamId }`; `pages/agent-teams.vue` remains the router owner.
- For `TEAM_LOCAL` nested teams, the resolved ID must be the canonical local-team ID built from the current parent team ID and the local member `ref`, for example `team-local-team:<encoded northstar-operating-company-team>:<encoded engineering-org>`.
- For shared and application-owned nested teams, the action uses the normalized/canonical `node.ref` already provided by GraphQL/store projection.
- If the nested team cannot be resolved, do not emit a broken route. The implementation may omit the action or render a disabled/unresolved state, but tests must cover the chosen behavior.
- This action is separate from team-local agent inline `Details`; agent rows can continue using inline expand/edit or agent-detail navigation, while team rows navigate to the child team detail page.

Required frontend test shape:

- Mount `AgentTeamDetail` with a parent team and a `TEAM_LOCAL` nested team member plus the corresponding canonical child team definition in the store.
- Assert a visible nested-team view control exists on the member row.
- Trigger it and assert `navigate` emits `{ view: 'team-detail', id: <canonical child team id> }`.
- Add a shared-team member variant if existing fixture coverage does not already prove non-local nested team navigation.

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/utils/team-local-definition-id.ts` | Shared utilities | Identity owner | Build/parse local agent and local team IDs | One canonical local definition identity concern | N/A |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-source-paths.ts` | Server definitions | Team source resolver | Shared/app/local team source paths | Existing team source owner | Identity utility |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-local-team-discovery.ts` | Server definitions | Local team discovery | Read/list team-local subteam definitions and ownership metadata | Avoids bloating provider | Identity/source paths |
| `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts` | Server agent definitions | Agent source resolver | Resolve local-agent IDs owned by root/app/local teams | Existing agent source owner | Identity + team source resolver |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Server agent definitions | Local-agent discovery | Recursively list local agents under all team sources, including local subteams | Existing local-agent owner | Team-local team discovery |
| `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` | Server agent definitions | Cache wrapper | Bypass/exclude generalized local-agent IDs | Existing cache owner | Identity utility |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | Server app-owned definitions | App-owned parser/writer | Explicit app sibling vs child local team scopes | Existing app-owned file owner | Normalizer |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-ref-normalizer.ts` | Server app-owned definitions | App-owned normalizer | Canonicalize/localize `application_owned` and `team_local` team refs | Existing normalizer owner | Identity/source resolver |
| `autobyteus-server-ts/src/agent-team-definition/services/team-definition-graph-validator.ts` | Server definitions | Graph validator | Missing refs, self refs, cycles | Keeps validation out of provider/runtime planner | Source resolver |
| `autobyteus-web/utils/teamDefinitionMembers.ts` | Frontend projection | Member tree builder | Scoped nested team lookup | Existing frontend traversal owner | Identity utility |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Frontend agents | Agent lookup/projection | Local agents by local subteam owner ID | Existing agent cache owner | Backend ownership metadata |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Local definition ID parse/build | `team-local-definition-id.ts` | `autobyteus-ts` agent-team utilities | Used by server runtime/sync/provider and frontend utilities | Yes | Yes | A generic opaque string helper with no subject distinction |
| Scoped team-member ref resolution | `scoped-team-member-ref.ts` or team source resolver methods | Server definitions | Used by provider/service/topology/sync | Yes | Yes | Duplicated `if refScope` branches everywhere |
| Agent local-source lookup | `agent-definition-source-paths.ts` | Server agent definitions | Used by provider/update/delete/read | Yes | Yes | Local path joins in runtime/sync callers |
| App-owned ref canonicalization | `application-owned-team-ref-normalizer.ts` | Server app-owned definitions | Used by read/write/bundle validation | Yes | Yes | Missing-scope legacy fallback |
| Frontend root projection | Store computed getter | Frontend store | Used by list and possibly launch pickers | Yes | Yes | Component-local filter heuristic |
| Nested-team detail navigation | `AgentTeamDetail.vue` using store/scoped utility | Frontend detail component | Used by parent detail member rows | Yes | Yes | Hidden route knowledge or direct router pushes inside row markup |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamMember.refScope` | Yes after change: where `ref` resolves | Yes | Medium current risk | Rename/semantically treat as `TeamMemberRefScope`, preserve explicit scope for team refs. |
| `AgentTeamDefinition.ownershipScope` | Yes after adding `team_local` | Yes | Low | Add owner team metadata for local teams. |
| Team-local canonical ID | Yes if subject-specific and encoded | Yes | High current risk | Replace agent-only colon helper with subject-specific encoded identity. |
| App-owned nested team refs | Yes after explicit `application_owned` vs `team_local` | Yes | High current risk | Reject no-scope nested team configs and update tests/fixtures. |
| Agent local ownership metadata | Yes if `ownerTeamId` is canonical containing team ID | Yes | Medium | Populate local subteam agent owners with local subteam canonical IDs. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/utils/team-local-definition-id.ts` | Shared utilities | Team-local identity | Build/parse `team-local-agent` and `team-local-team` IDs with encoded parts | One identity concern | N/A |
| `autobyteus-ts/tests/unit/agent-team/team-local-definition-id.test.ts` | Shared utilities tests | Identity tests | Subject distinction, nested owner IDs, invalid IDs | Durable contract | N/A |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Server definitions | Domain model | `TeamMemberRefScope`; team-local ownership metadata | Domain owner | Identity utility |
| `autobyteus-server-ts/src/agent-team-definition/domain/enums.ts` | Server definitions | Enum source | Add `TEAM_LOCAL` to team ownership and keep `APPLICATION_OWNED` member scope | Existing enum owner | N/A |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | Server definitions | Shared config parser/writer | Explicit member scope for agents and teams | Existing config owner | N/A |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | Server app-owned definitions | App-owned parser/writer | Parse/write app-owned sibling and child local team scopes | Existing app-owned config owner | Normalizer |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-ref-normalizer.ts` | Server app-owned definitions | App-owned normalizer | Canonicalize/localize `application_owned` and `team_local` team refs | Existing normalizer owner | Identity utility |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts` | Server app-owned definitions | App-owned validation | Same-app sibling validation and child local team validation | Existing validator owner | Source resolver |
| `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | Application bundles | Bundle scanner/validator | Validate explicit app-owned/team-local nested refs; do not catalog local child teams as app-owned roots | Existing bundle owner | App-owned validator |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-source-paths.ts` | Server definitions | Team source resolver | Resolve shared/application-owned/team-local team IDs to source paths | Existing source owner | Identity utility |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-local-team-discovery.ts` | Server definitions | Local team discovery | Read/list local subteam definitions and ownership metadata | Keeps provider thin | Source resolver |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Server definitions | Definition provider | Integrate local team read/list/write/delete | Existing provider owner | Discovery helper |
| `autobyteus-server-ts/src/agent-team-definition/services/team-definition-graph-validator.ts` | Server definitions | Graph validation | Missing refs, self/cycles, owner boundary checks | Isolates validation | Source resolver |
| `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts` | Server agent definitions | Agent source resolver | Parse generalized local-agent IDs and resolve owner team source path | Required by AR-001 | Team source resolver |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Server agent definitions | Local-agent discovery | Recursively include agents under root/app/local team sources | Required by AR-001 | Team-local team discovery |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Server agent definitions | Agent provider | Read/update/delete local agents whose owner team may be local | Existing provider owner | Agent source resolver |
| `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` | Server agent definitions | Cache wrapper | Bypass/exclude generalized local-agent IDs | Existing cache owner | Identity parser |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | Server GraphQL | API schema | Add `TEAM_LOCAL` team ownership; preserve `APPLICATION_OWNED` member scope | Existing GraphQL owner | Domain enums |
| `autobyteus-server-ts/src/api/graphql/converters/agent-team-definition-converter.ts` | Server GraphQL | API converter | Map scoped team member refs and team-local ownership metadata | Existing converter owner | Domain model |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Runtime | Topology planner | Use scoped team resolver for `agent_team` refs | Existing runtime owner | Identity utility |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts` | Runtime | Traversal | Use scoped team resolver for leaf/default launch paths | Existing traversal owner | Identity utility |
| `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts` | Sync | Dependency selection | Resolve local/app/shared team refs and include local subteam agents | Existing sync owner | Identity/source resolver |
| `autobyteus-server-ts/src/sync/services/node-sync-file-layout.ts` | Sync | File layout | Write local subteams and local agents under canonical owner teams | Existing layout owner | Source resolver |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Frontend | Store/projection | Add `TEAM_LOCAL` ownership, owner-team fields, root definitions getter | Existing store owner | N/A |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Frontend | Agent cache/projection | Lookup local subteam-owned agents by canonical `ownerTeamId` | Existing store owner | Backend metadata |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Frontend | Root list | Render root/catalog definitions only | Existing page owner | Store projection |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Frontend | Detail display/navigation | Scope-resolve local/app/shared subteam member names/avatars and expose visible nested-team `View` action | Existing detail owner | Utility |
| `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | Frontend | Form state | Allow scoped team refs and cycle/self validation | Existing form owner | Utility |
| `autobyteus-web/pages/agent-teams.vue` | Frontend | Page route boundary | Continue owning `/agent-teams?view=team-detail&id=<id>` transitions emitted by detail/list components | Existing page owner | Vue router |
| `autobyteus-web/localization/messages/en/agentTeams.ts` / `zh-CN/agentTeams.ts` | Frontend | UI copy | Add nested-team view action, title, and aria labels | Existing i18n owner | N/A |
| `autobyteus-web/utils/teamDefinitionMembers.ts` | Frontend | Member tree projection | Resolve local/app/shared team refs in browser tree building | Existing projection owner | Identity utility |

## Ownership Boundaries

- `Team source-path resolver` is the authoritative backend boundary for turning a team definition ID into files. Callers must not path-join local subteam paths themselves.
- `Agent source-path resolver` is the authoritative backend boundary for turning an agent definition ID into files. It must consume the team source resolver for local-agent owners.
- `Team-local definition identity owner` is the authoritative boundary for canonical local IDs. Callers must not concatenate local IDs manually.
- `Application-owned team source normalizer` is the authoritative boundary for translating app package local refs to domain/API canonical refs and back.
- `AgentTeamDefinitionStore` is the frontend boundary for root/catalog projection. Components must not infer root visibility by scanning references.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Team-local identity utility | Encoding/parsing/local subject distinction | Provider, topology, sync, frontend utilities | Manual `team-local:${teamId}:${id}` strings | Add build/parse method |
| Team source-path resolver | Root/app/local file path resolution | Provider, graph validator, agent source resolver, sync | Direct path joins for local subteams | Add resolver result/method |
| Agent source-path resolver | Shared/app/local agent file path resolution | Agent provider, sync file layout, update/delete | Direct `owner/agents/ref` path joins outside resolver/layout owner | Add scoped local-agent resolver |
| App-owned normalizer | Persisted app-local refs and canonical domain refs | App-owned source, bundle validator, writer | Treat no-scope app nested team refs as valid | Add explicit scope parser/writer |
| Definition service/graph validator | Ref validity and cycles | GraphQL mutations, provider update/create, sync selection | Runtime-only validation | Add validation entrypoint |
| Frontend store root projection | Ownership-based root list | AgentTeamList, featured split | Component filters all definitions by raw refs | Add computed getter |
| AgentTeamDetail nested-team navigation | Resolved nested-team ID action | AgentTeamDetail member rows | Hiding child detail behind undiscoverable direct URL knowledge | Add visible action and navigation helper |

## Dependency Rules

Allowed:

- Server providers may depend on shared identity utilities and source-path helpers.
- Agent source resolver may depend on team source resolver to resolve the local owner team.
- Runtime topology/traversal may depend on definition service/source resolution APIs, not provider internals.
- Sync may depend on definition service/projections and sync file layout helpers.
- Frontend components may depend on store getters and frontend utility functions.

Forbidden:

- Components must not decide root visibility by “referenced by another team.”
- `AgentTeamDetail` must not direct-push router paths from row markup; it should emit the existing page navigation payload with the resolved canonical team ID.
- Runtime/sync/frontend traversal must not resolve `agent_team` members with raw `node.ref` without scope.
- Agent lookup/update/delete must not parse local-agent IDs with the old agent-only parser.
- Callers must not manually construct local definition IDs.
- App-owned normalizer must not silently accept no-scope nested team refs.
- File layout writers must not flatten team-local subteams into root `agent-teams/`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildTeamLocalAgentDefinitionId(ownerTeamId, localAgentId)` | Local agent identity | Build encoded local agent ID | owner canonical team ID + local id | Replaces old helper. |
| `buildTeamLocalTeamDefinitionId(ownerTeamId, localTeamId)` | Local team identity | Build encoded local team ID | owner canonical team ID + local id | Supports nested local ownership. |
| `parseTeamLocalDefinitionId(id)` | Local definition identity | Parse local subject/owner/local id | subject-specific encoded IDs | Used by cache/source resolvers. |
| `findTeamSourcePaths(teamId, ...)` | Team source | Resolve team ID to source paths | shared ID, application-owned ID, team-local team ID | Authoritative team source resolver. |
| `findAgentSourcePaths(agentId, ...)` | Agent source | Resolve agent ID to source paths | shared ID, application-owned ID, team-local agent ID | Authoritative agent source resolver. |
| `resolveScopedTeamMemberRef(context, member)` | Scoped team ref | Resolve team member ref to canonical child team ID | context includes containing team id, ownership, package/app ids, source paths | Avoids app-owned ambiguity. |
| `canonicalizeApplicationOwnedTeamMembers(nodes, context)` | App-owned normalizer | Convert persisted app refs to domain refs | explicit `application_owned` or `team_local` | Reject missing scope. |
| Store `rootAgentTeamDefinitions` | Root projection | Return root/card candidates | Definitions with non-local ownership | Frontend root page uses this. |
| `viewNestedTeamMember(node)` | Detail navigation | Emit parent-page navigation to child team detail | Resolved canonical team ID from scoped team member lookup | Visible row action uses this. |
| Store `getTeamLocalAgentDefinitionsByOwnerTeamId(ownerTeamId)` | Agent projection | Return local agents for canonical owner team | canonical ownerTeamId | Must work for local subteam IDs. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team-local identity utility | Yes | Yes | Low after change | Encode parts and subject prefix. |
| `TeamMember.refScope` | Yes after tightening | Yes | Medium current | Require/canonicalize explicit scope. |
| App-owned normalizer | Yes after change | Yes | Low | Split `application_owned` sibling and `team_local` child behavior. |
| Agent source resolver | Yes | Yes | Low after change | Use generalized local-agent parser and team source resolver. |
| Root list getter | Yes | Yes | Low | Filter by ownership metadata only. |
| Nested-team view action | Yes | Yes | Low | Resolve child team ID once, show action only when resolvable, emit existing navigation payload. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent member scope | `AgentMemberRefScope` -> `TeamMemberRefScope` | Yes after rename | High current | Rename in TS/domain/frontend where feasible. |
| Local subteam | `team_local` `agent_team` | Yes | Low | Use consistently in docs/UI. |
| App-owned sibling team | `application_owned` `agent_team` | Yes | Medium | Add persisted/domain examples and tests. |
| Root list | `rootAgentTeamDefinitions` or `catalogAgentTeamDefinitions` | Yes | Low | Choose one and use consistently. |

## Applied Patterns (If Any)

- Recursive graph traversal inside graph validator, local-team discovery, local-agent discovery, and topology planner.
- Source resolver pattern for file-backed shared/application/local definitions.
- Store computed projection pattern for frontend root list and local-agent lookup.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/utils/team-local-definition-id.ts` | File | Team-local identity | Canonical local agent/team ID functions | Shared runtime package | File path logic |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-local-team-discovery.ts` | File | Local team discovery | Read/list local team definitions | Mirrors local-agent discovery | Runtime topology |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | File | Local-agent discovery | Recursively read/list agents under every team source | Existing agent local-discovery owner | Team runtime planning |
| `autobyteus-server-ts/src/agent-team-definition/services/team-definition-graph-validator.ts` | File | Definition validation | Ref/cycle validation | Service owns invariants | File read/write implementation |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | File | Frontend projection | Root/all/local getters | Existing definition cache | Component rendering rules |
| `autobyteus-web/stores/agentDefinitionStore.ts` | File | Frontend agent projection | Local agent lookup by canonical owner team | Existing agent cache | Backend source logic |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | File | Frontend detail navigation | Nested team member `View` action and navigation emit | Existing detail row owner | Store identity resolution |
| `<team>/agent-teams/<local-team-id>/` | Folder | Parent team package | Team-local subteam files | Mirrors `<team>/agents/` pattern | Root catalog teams |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `<owner-team>/agent-teams/` | Persistence-provider/local child definitions | Yes | Low | Parallel to `<owner-team>/agents/`. |
| `<local-subteam>/agents/` | Persistence-provider/local child agents | Yes | Low | Existing local-agent layout works once owner team source resolves. |
| `agent-team-definition/providers/` | Persistence/source mapping | Yes | Medium | Keep graph validation in services to avoid provider god-object. |
| `agent-definition/providers/` | Agent source/list/cache | Yes | Medium | Required for local subteam-owned local agents. |
| `agentTeams` frontend components | UI projection/display/navigation | Yes | Medium | Store owns projection; components render and emit page navigation. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Local subteam config | `{ "refType": "agent_team", "refScope": "team_local", "ref": "engineering-org" }` | `{ "refType": "agent_team", "ref": "northstar-engineering-org-team" }` for an owned department | Distinguishes ownership from shared reference. |
| App-owned sibling config | `{ "refType": "agent_team", "refScope": "application_owned", "ref": "review-team" }` in app package files | `{ "refType": "agent_team", "ref": "review-team" }` no scope | Removes app-owned ambiguity. |
| App-owned child local config | `{ "refType": "agent_team", "refScope": "team_local", "ref": "drafting-cell" }` under `main-team` | Treating `drafting-cell` as app top-level team | Captures application-owned parent with team-local child. |
| Local subteam-owned agent ID | `team-local-agent:<encoded team-local-team id>:planner` resolves to `<parent>/agent-teams/drafting-cell/agents/planner` | `team-local:<team-local:parent:child>:planner` colon parsing | Proves nested owner IDs work. |
| Root list | `store.rootAgentTeamDefinitions` | `store.agentTeamDefinitions.filter(team => !referencedIds.has(team.id))` | Shared teams can be nested and still root-visible. |
| Nested team row navigation | `View ↗` on an Engineering Org member emits `{ view: 'team-detail', id: 'team-local-team:<encoded northstar-operating-company-team>:<encoded engineering-org>' }` | Only making the route work through a manually typed URL | Makes local subteam detail pages discoverable from the parent. |
| Local ID | `team-local-team:<encodedOwner>:<encodedLocalTeam>` | `team-local:${teamId}:${teamId}` | Subject-specific, nested-safe identity. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old `team-local:<teamId>:<agentId>` helper and add a second local-team helper | Reduces immediate local-agent churn | Rejected | Replace with generalized local definition identity and update callers. |
| Hide any team referenced by another team from root page | Quick screenshot fix | Rejected as final design | Hide team-local owned definitions based on ownership scope; keep shared nested teams root-visible. |
| Allow `agent_team` refs with missing `refScope` forever | Existing app-owned source convention and Northstar draft have no scope | Rejected | Canonical configs must include explicit `refScope`; migrate intentional data/tests. |
| Treat app-owned sibling teams as `team_local` | Simplifies enum usage | Rejected | App-owned sibling and parent-owned child are different ownership boundaries. |

## Derived Layering (If Useful)

- Shared identity layer: `autobyteus-ts` utility.
- Server definition layer: domain/config/source/provider/service validation.
- Server agent-definition layer: agent source/list/cache consumes team source resolver.
- Runtime/sync layer: uses definition/source layers, does not own identity construction.
- Frontend projection layer: stores + utilities resolve display tree from GraphQL model.

## Test Strategy And Acceptance Coverage

| Test Area | Required Coverage | Acceptance Criteria Covered |
| --- | --- | --- |
| Shared identity utility | Build/parse local agent and local team IDs; encoded nested owner IDs; invalid subject/segment rejection | AC-004, AC-009 |
| Team source resolver/provider | Shared root, app-owned top-level, team-local child under shared parent, team-local child under app-owned parent, deeper local child | AC-001, AC-003, AC-008, AC-010 |
| Agent source resolver/provider/cache | Local agent under local subteam read by ID, visible list metadata, cache bypass/exclusion, update/delete owner resolution | AC-003, AC-004, AC-009 |
| App-owned source/normalizer/validator | Sibling `application_owned` team ref canonicalizes/localizes correctly; child `team_local` team ref resolves under containing team; missing scope rejected | AC-010 |
| Graph validator/topology/traversal | Missing local child, missing local agent, direct self-ref, ancestor cycle, shared nested team non-regression | AC-003, AC-005, AC-006 |
| Sync | Parent selection includes local subteams and their local agents; target writes `<parent>/agent-teams/<child>/agents/<agent>` | AC-007, AC-009 |
| Frontend stores/components | Root list hides `TEAM_LOCAL` definitions; detail/member tree resolves scoped subteams; visible nested-team `View` action routes to canonical child IDs; agent store returns local subteam-owned agents; form validates scopes/cycles | AC-001, AC-002, AC-005, AC-006, AC-009, AC-010, AC-011 |

The Northstar-shaped fixture should include one root company team with multiple team-local department teams and local agents in each department. The application-owned fixture should include `applications/my-app/agent-teams/main-team/`, sibling `review-team/`, and child `main-team/agent-teams/drafting-cell/`.

## Migration / Refactor Sequence

1. Add generalized team-local identity utility and tests in `autobyteus-ts`; update server imports and frontend utility mirror/import. Ensure local-agent owner IDs can themselves be local-team IDs.
2. Extend domain models/enums/GraphQL/store types for `TEAM_LOCAL` team ownership and `TeamMemberRefScope` applying to agents and teams.
3. Update config parsers/writers to preserve explicit `refScope` for `agent_team` and write canonical scopes for all members.
4. Update app-owned source/normalizer/validator/bundle-provider tests first: app sibling team refs use `application_owned`; child teams under current app-owned team use `team_local`; no-scope nested team configs fail.
5. Extend team source-path resolution to resolve team-local team IDs recursively from an owner team source path.
6. Add team-local team discovery/list/read support and ownership metadata in `FileAgentTeamDefinitionProvider`.
7. Update agent-definition source path parsing to use generalized local-agent IDs; resolve owner teams through the team source resolver.
8. Update team-local agent discovery to recursively walk root shared teams, application-owned top-level teams, and all discovered team-local subteams; populate `ownerTeamId` with the canonical owner team ID.
9. Update cached agent-definition provider cache bypass/update exclusion to recognize generalized local-agent IDs.
10. Add graph validation for scoped member refs, missing refs, self-reference, and cycles; wire into create/update/import/sync paths.
11. Update runtime topology/traversal/application launch helpers to use scoped team and agent member resolution.
12. Update sync selection and file layout to include/write team-local subteams and local agents under canonical parent folders.
13. Update frontend stores with root/catalog team projection and local-agent lookup by owner team including local subteam owners.
14. Update `AgentTeamList.vue` to render root/catalog definitions only; preserve featured split after root filtering.
15. Update detail/form/member-tree utilities to resolve local/app/shared subteams, show local/application/shared badges, and validate cycles/self-reference.
16. Add a visible nested-team `View` / `View Details` action in `AgentTeamDetail`, backed by resolved canonical team IDs and existing page navigation payloads.
17. Add/adjust tests across `autobyteus-ts`, server app-owned source, server agent-team definitions, server agent definitions, sync, runtime topology, and frontend components/stores.
18. Optional package-data step: migrate Northstar department folders in `autobyteus-agents` into `northstar-operating-company-team/agent-teams/` and update parent refs to `refScope: "team_local"`.

## Key Tradeoffs

- A clean generalized identity refactor is broader than a minimal UI filter, but it prevents nested-local ownership from breaking local agents inside local subteams.
- Filtering root list by ownership scope preserves reusable shared nested teams, while reference-based filtering would produce false negatives.
- Application-owned is not production-enabled, so clean-cut explicit scope semantics are less risky now than after release.
- Rich nested authoring can be incremental, but display/run/sync/lookup and child-detail drill-in navigation must be coherent in the first implementation.

## Risks

- Local identity refactor touches many call sites; tests must cover runtime, sync, frontend tree projection, source lookup, and cache behavior.
- Persisted historical data may contain old local IDs. The implementation should avoid generating old IDs and only add read-only tolerance if a validation run proves historical views break and cannot be migrated safely.
- Application-owned fixtures/tests with old no-scope nested team refs must be updated to explicit `application_owned`; no compatibility branch should be introduced for unreleased production behavior.

## Guidance For Implementation

- Start with identity and source resolver tests before touching UI.
- Implement app-owned scoped normalizer tests early to lock `application_owned` sibling vs `team_local` child behavior.
- Keep one authoritative helper for resolving scoped team refs; avoid spreading `if refScope === ...` across unrelated files.
- Extend agent-definition path in the same implementation slice as team-source resolver; otherwise local subteam agents will be invisible.
- Update frontend root list only after backend/store ownership metadata is available.
- Add a Northstar-shaped fixture/test: parent with five team-local departments, each with local agents; assert root list excludes departments, runtime leaf projection includes department agents, and parent detail exposes a visible nested-team view action.
- Add an app-owned fixture/test: `main-team` references sibling `review-team` with `application_owned` and child `drafting-cell` with `team_local`.
- Do not modify the original untracked Northstar package folders until product implementation is reviewed or the migration is explicitly included.
