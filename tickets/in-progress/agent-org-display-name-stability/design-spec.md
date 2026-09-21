# Design Spec — Agent Org Role-Name Stability

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` baseline `SR-004`, explicitly approved by the user's 2026-09-21 message: “Yeah, just do it similarly like agent team list and agent team ... detail page ... let's use member name ... we don't need that extra ... asynchronous lookup.”
- Behavior-defining supplements and their approval references: None. The two screenshots are current-state evidence only.
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/investigation-notes.md`

## Current-State Read

The Agent Org GraphQL catalog already returns each direct member's local `memberName`, stable `ref`, type, and scope. The frontend nevertheless has two display-identity paths:

1. Each `AgentOrgCatalogMemberChips.vue` instance creates its own exact-reference request lifecycle, renders a humanized role while pending, and then substitutes `definition.name`.
2. `AgentOrgExperience.vue` reduces detail members to refs, clears a shared resolved-reference map, and initially converts missing definitions into ref-based names. Completion substitutes definition names and supplies Team/coordinator/handoff topology.

The component also loads Agent and Team catalogs for every route view and shares one full-reference watcher across detail and create/edit. This mixes three distinct concerns: stable browsing labels, read-only detail topology, and mutable-form reference validation.

The target must preserve exact reference validation for create/edit, launch configuration, and Org-return Team detail. It must also preserve detail coordinator/handoff content. The existing `agentOrgEndpointCatalog(id)` contract already provides admitted direct/nested role names, addresses, definition IDs, and Team coordinator roles in one Org-level response, so no backend contract change is needed.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: The change touches two Agent Org components, one existing reference service, one new small frontend endpoint-catalog adapter, one shared presentation utility, focused component/service tests, and Agent Org documentation. It activates an existing GraphQL query but does not alter its schema or backend implementation.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: All changes remain within existing frontend capability boundaries. No persistence, migration, security policy, ownership boundary, route, deployment, or backend API contract changes. Existing owner/scope/full-graph validation remains in its current service for create/edit and other consumers. Detail reuses an already admitted server projection.
- Escalation trigger if implementation or validation discovers new impact: Reclassify and return a Design Impact if `agentOrgEndpointCatalog` cannot preserve existing detail handoff/coordinator behavior, if removing unconditional Agent/Team catalog loads breaks a supported non-authoring route, or if a backend/schema change becomes necessary.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Catalog chip source | `autobyteus-web/components/agentOrgs/AgentOrgCatalogMemberChips.vue` | The chip owns its own watcher, request key, exact queries, and role-to-definition-name substitution. | Make the chip presentational and delete the shallow display loader. | None. |
| Agent Org experience source | `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` | One watcher serves detail/create/edit; detail row view models discard `memberName`; all catalogs load on mount. | Split view-specific orchestration and retain membership context in detail rows. | Exact implementation shape must preserve existing form-generation cleanup. |
| Reference service import inventory | Repository grep recorded in `investigation-notes.md` | Shallow loader is used only by catalog chips; full loader has multiple structural consumers. | Remove only `loadAgentOrgMemberReferences`; retain `loadAgentOrgDefinitionReferences`. | None. |
| Existing endpoint projection | `autobyteus-web/graphql/queries/agentOrgDefinitionQueries.ts`; `autobyteus-server-ts/src/api/graphql/types/agent-org-definition.ts`; `src/agent-collaboration/definition/definition-endpoint-catalog.ts` | One admitted Org query returns role/address/coordinator topology without definition display names. | Use it for read-only detail secondary topology instead of per-definition graph reads. | Frontend adapter currently absent. |
| Handoff presentation | `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue`; `types/collaboration/handoffs.ts` | View mode needs role labels/addresses; edit mode needs full selectable topology and coordinator addresses. | Map endpoint catalog for detail; retain full reference validation for editable drafts. | None. |
| Agent Team comparison | `AgentTeamList.vue`, `AgentTeamCard.vue`, `AgentTeamDetail.vue` | Primary membership labels are local `memberName`; handoff endpoints are role-based. | Apply equivalent semantic ownership to Agent Org browsing. | Agent Team's secondary definition-name line is out of scope and not copied. |
| Focused test attempt | `pnpm -C autobyteus-web test:nuxt ...` in investigation log | No baseline suite ran because `pnpm` was not on PATH and this worktree has no installed dependencies. | Do not claim runtime validation; define downstream test obligations explicitly. | API/E2E must execute with the configured Corepack/dependency environment. |

## Intended Change

Make role identity explicit and single-source:

- Direct list/detail labels come from the enclosing `AgentOrgMember.memberName` through one pure readable-role formatter.
- Team-local coordinator and nested endpoint labels come from endpoint-catalog `memberName`/`coordinatorMemberName` through the same formatter.
- Stable refs remain operational keys for navigation and validation but never become labels.
- List rendering performs no reference query and no Agent/Team catalog bootstrap.
- Read-only detail uses the existing Org endpoint catalog only when a mounted Team makes nested/coordinator topology necessary. Create/edit continues using the full exact-reference service because draft validation and selectable endpoints require it.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003, REQ-004, REQ-006 / AC-001, AC-005 | Navigate/search/Reload Agent Org list | Chip source and screenshots in investigation | Humanized Org roles render directly and never resolve to definition names; zero list label queries. | `/agent-orgs` → Org store/query → cards → presentational chips → role formatter (`DS-001`, `DS-004`) |
| BEH-002 | User | REQ-002, REQ-003, REQ-005, REQ-006 / AC-002, AC-004, AC-005 | Open Agent Org detail | Detail computed models/watcher and endpoint-catalog evidence | Direct rows use Org roles immediately; coordinator/handoff secondary content uses admitted Team-local roles and never refs/definition names. | Route → selected Org membership → role rows; optional endpoint catalog → secondary role topology (`DS-002`, `DS-003`) |
| BEH-003 | System | REQ-003–006 / AC-003–005 | Reference settlement/failure, Reload, route or backend-binding change | Current cleanup/watch behavior | Reference lifecycle cannot rename labels; stale detail topology is retired; authoring validation remains exact. | Store replacement and view-local guarded topology/form lifecycles (`DS-003`, `DS-004`, `DS-005`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/agent-org-list-provisional-labels.png` | Captures current initial role labels | REQ-001 / AC-001 | Demonstrates the desired semantic label before current substitution; layout is preserved. | Evidence only |
| `evidence/agent-org-list-canonical-labels.png` | Captures current resolved definition-name labels | REQ-003 / AC-001 | Demonstrates the substitution that must be removed. | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` plus bounded `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: A leaf chip owns transport and identity validation solely to replace its role label; detail drops membership context and then reconstructs presentation from a different entity; one watcher combines read-only detail and mutable authoring responsibilities.
- Design response: Put role formatting in one pure presentation utility, keep chip rendering transport-free, retain Org membership in detail view models, and split read-only endpoint topology from authoring full-reference validation.
- Refactor rationale: Merely forcing the rendered text to use `memberName` would leave N-per-member requests, refresh tokens, and mixed lifecycle ownership active. Those are the complexity the approved change explicitly removes.
- Intentional deferrals and residual risk: Other role/address formatter duplicates outside Agent Org browsing are not consolidated. Agent Team's secondary Agent definition-name line is unchanged. Residual risk is limited to inconsistent formatting elsewhere, not this ticket's labels.

## Terminology

- **Role label**: Human-readable presentation of a local `memberName`, replacing separator runs with spaces and trimming without forced case conversion.
- **Definition name**: Authored name of the referenced Agent/Team entity; retained in authoring selectors but not used as Agent Org browsing membership identity.
- **Endpoint topology**: Admitted direct/nested addresses and Team coordinator roles returned by `agentOrgEndpointCatalog` for handoff/detail presentation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Delete the shallow list display-name loader, chip request lifecycle, refresh token plumbing, and tests/docs that assert definition-name substitution. Do not retain a feature flag, dual role/name mode, or fallback to referenced names.
- The full exact-reference reader is not legacy; it remains for create/edit, run configuration, and Org-return Team detail.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: Agent Org/Team definition package data, including `memberName`, ref/type/scope, handoffs, and revisions; volume is irrelevant because no records change.
- Relevant code-model, serialization, semantic, or physical-store change: Presentation-source change only; no model/schema/serialization change.
- Normal reader/writer behavior and representative evidence: Existing GraphQL readers already return roles; mutations continue sending unchanged membership fields.
- Required semantics and invariants under direct use: Role/address identity, ordering, refs, ownership, and revision remain exact.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No store access, rewrite, reset, or downtime.
- Decision: `Not Affected`
- Decision rationale: Existing data is already the authoritative input; only frontend interpretation changes.
- Acceptance criteria or design constraints supported: AC-001–005; no migration section applies.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | User opens Agent Org list | Stable role chips | Agent Org list presentation | Removes display hydration entirely. |
| DS-002 | Primary End-to-End | BEH-002 | User opens Agent Org detail | Stable direct member rows | Agent Org detail presentation | Preserves membership context as label authority. |
| DS-003 | Primary End-to-End | BEH-002, BEH-003 | Detail contains mounted Team(s) | Coordinator/handoff role presentation | Detail topology adapter | Supplies only role topology required beyond the Org payload. |
| DS-004 | Return-Event | BEH-001, BEH-003 | User triggers Reload | Store replacement recomputes role chips once | Agent Org store/list view | Proves refresh no longer has a second label lifecycle. |
| DS-005 | Primary End-to-End | BEH-003 | User enters create/edit and changes members | Validated form/handoff/save state | Agent Org authoring flow | Preserves full exact-reference validation outside browsing labels. |

## Primary Execution Spine(s)

- `DS-001`: `/agent-orgs route → AgentOrgExperience → agentOrgDefinitionStore.fetchAll → GetAgentOrgDefinitions → Agent Org cards → AgentOrgCatalogMemberChips → formatMemberRoleLabel → stable chips`
- `DS-002`: `/agent-orgs?view=org-detail → selected AgentOrgDefinition → membership-aware row projection → formatMemberRoleLabel → stable Agent/Team rows`
- `DS-003`: `detail Team membership → loadAgentOrgEndpointCatalog → existing agentOrgEndpointCatalog GraphQL boundary → admitted endpoint projection → role-only coordinator/handoff mapping → secondary detail content`
- `DS-005`: `create/edit route → Agent/Team catalog bootstrap + formMembers → loadAgentOrgDefinitionReferences → exact identity/scope/owner/topology validation → editable handoff options/save gate`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Org catalog response already contains each direct role. Cards pass membership to a transport-free chip component, which formats role text and accessible labels deterministically. | Org definition, Org member, role label | List presentation | Localization fallback, member type icon |
| DS-002 | Detail projects each selected Org member into a row that retains `memberName`, ref, and type. Role text and initials derive from the role; ref is used only for actions. | Selected Org, membership-aware row | Detail presentation | Localization, Team navigation |
| DS-003 | Only details with mounted Teams request the existing admitted endpoint catalog. A view-local generation guard accepts the current response, maps Team coordinator/nested endpoints to role labels, and reveals dependent content. | Org endpoint catalog, Team role topology | Detail topology adapter | Loading/error feedback, HandoffManager mapping |
| DS-004 | Reload refreshes the Org store. Card labels recompute from returned membership exactly once; there is no refresh key or child request phase. | Org catalog snapshot | Org store/list | Reload button state, stale store request behavior |
| DS-005 | Authoring continues to resolve the current draft's definitions and Team children, because selection, validation, and save readiness require more than labels. | Form membership, resolved definition graph | Authoring flow | Catalog fetches, stale watcher cleanup, save gate |

## Spine Actors / Main-Line Nodes

- Agent Org route and `AgentOrgExperience`: select the active view and orchestrate only the data needed by that view.
- `agentOrgDefinitionStore`: own the admitted Org catalog snapshot and refresh lifecycle.
- `AgentOrgCatalogMemberChips`: render membership chips without transport or identity resolution.
- `formatMemberRoleLabel`: own the approved separator/trim transformation only.
- Detail membership projection: keep role and operational ref together.
- `loadAgentOrgEndpointCatalog`: own one view-local transport boundary for admitted role topology.
- `loadAgentOrgDefinitionReferences`: retain exact draft/launch/reference validation outside display-label ownership.

## Ownership Map

- Org backend/store owns authored membership data and stable operational identity.
- Role formatter owns deterministic readable presentation, not fallback policy, localization, fetching, or entity resolution.
- Chip/detail components own localized fallback and semantic markup.
- Detail topology adapter owns GraphQL request/response shape and stale-result handoff to the view; it does not produce definition display names.
- `AgentOrgExperience` owns route/view orchestration and maps endpoint roles into HandoffManager options.
- Full reference service owns exact ID/scope/owner and Team-child validation for structural consumers.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentOrgCatalogMemberChips` | Agent Org list presentation | Encapsulates chip markup/type/accessibility | Network requests, caches, identity validation |
| `loadAgentOrgEndpointCatalog(orgId)` | Existing GraphQL endpoint-catalog boundary | Gives detail a typed, singular request entrypoint | Definition-name hydration, UI localization, mutation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `loadAgentOrgMemberReferences` export and shallow-read branch/tests | List labels no longer require referenced definitions | `formatMemberRoleLabel` + presentational chip | In This Change | Keep exact GraphQL queries for full reader consumers. |
| Chip watcher, request key, resolved snapshot, binding-revision dependency | No child request lifecycle exists | Direct prop rendering | In This Change | Remove, do not leave dormant. |
| `refreshKey` prop and `catalogRefreshKey` state/increment | It existed only to retrigger name hydration | Org store Reload response | In This Change | Reload still uses `fetchAll(true)`. |
| Definition-name/ref fallback in detail direct rows | Wrong identity source | Membership-aware detail row projection | In This Change | Refs remain action keys only. |
| Full per-definition reference loading for read-only Org detail | Endpoint catalog owns detail role topology more cohesively | `loadAgentOrgEndpointCatalog` | In This Change | Full loader remains for create/edit and external consumers. |
| Unconditional Agent/Team catalog fetch on list/detail | Those views no longer need definition catalogs | View-scoped create/edit bootstrap | In This Change | Do not affect other pages' stores. |
| Exact-definition-name catalog tests/docs | Assert superseded behavior | Stable-role tests/docs | In This Change | Preserve historical ticket only as history. |

## Return Or Event Spine(s)

- `DS-004`: `Reload click → reloading=true → orgStore.fetchAll(true) → definitions replaced or prior snapshot/error retained by existing store policy → role chips recompute from membership → reloading=false`.
- Detail topology return: `endpoint response → current generation/org key check → publish endpoint snapshot → coordinator/handoff role content appears`; late responses are discarded.

## Bounded Local / Internal Spines

- Parent owner: Agent Org detail topology lifecycle.
- Chain: `view/org/team-membership key changes → mark topology loading → capture request generation → request endpoint catalog when Teams exist → accept only current generation → publish roles/error → retire on cleanup`.
- Why it matters: It isolates asynchronous secondary topology from synchronous direct role identity and prevents cross-Org results.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization fallback | DS-001, DS-002 | Chip/detail presentation | Supply Agent/Team generic text only when formatted role is empty | Keeps formatter pure and locale-independent | Utility would become coupled to Vue/i18n |
| Accessible labels | DS-001, DS-002 | Presentation | Use the exact same role label as visible text | Prevents hidden name/ref divergence | Screen reader still announces substituted identity |
| Endpoint option grouping | DS-003, DS-005 | `AgentOrgExperience` | Map role/address topology to existing HandoffManager groups | HandoffManager expects UI-ready options | Transport adapter becomes UI-specific |
| Stale-result cleanup | DS-003, DS-005 | View orchestration | Reject retired route/form results | Existing supported lifecycle invariant | Cross-Org topology leak |
| Owner/scope validation | DS-005 | Full reference service | Preserve exact definition graph authority | Required for edit/launch correctness | Presentation layer weakens validation |

## Ownership Boundaries

The Agent Org definition payload is authoritative for direct membership roles and refs. The frontend must not bypass it by asking referenced definitions for a display identity. The endpoint-catalog GraphQL boundary is authoritative for admitted nested role/address topology; the adapter must not reconstruct Team children from raw IDs. The full reference service remains authoritative for exact mutable-draft/launch graph validation and must not be weakened or replaced by the display formatter.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentOrgDefinition.members` | Stored role/ref/type/scope | List and direct detail rows | Fetch definition name to decide row/chip identity | Change presentation mapping, not backend identity |
| `agentOrgEndpointCatalog(id)` | Admission, resolved Org/Team topology, addresses/coordinator roles | Read-only detail secondary topology | Per-Team/per-Agent reads solely to build detail role options | Extend typed frontend adapter only; backend contract already sufficient |
| `loadAgentOrgDefinitionReferences` | Exact queries, dedupe, owner/scope/team-child validation | Create/edit, run configuration, Org-return Team detail | Replace validation with formatted role presence | Extend service under a genuine structural need |

## Dependency Rules

- Chips may depend on Org member types, localization, icons, and role formatter; they must not depend on Apollo, context binding, stores, or reference services.
- Detail row labels may depend on the membership object only. They may use refs for navigation but not for text/initials.
- Endpoint adapter may depend on Apollo and `GetAgentOrgEndpointCatalog`; it must not import Vue components or localization.
- `AgentOrgExperience` may map endpoint DTOs into `HandoffEndpointOption`; HandoffManager remains generic.
- Create/edit may depend on Agent/Team catalogs and full reference service. List/detail must not bootstrap those catalogs merely for labels.
- No backend source changes are authorized by this design.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `formatMemberRoleLabel(value)` | Local member-role presentation | Separator-to-space + trim | Authored `memberName: string` | Returns empty string for unusable input; caller localizes fallback. |
| `AgentOrgCatalogMemberChips(org)` | List membership presentation | Render ordered typed chips | Full `AgentOrgDefinition` or readonly members | Remove `refreshKey`. |
| `loadAgentOrgEndpointCatalog(orgId)` | Read-only Org endpoint topology | Fetch typed admitted role/address catalog | Non-empty Org definition ID | `network-only`; one request per current detail identity when Teams exist. |
| `loadAgentOrgDefinitionReferences(orgId, members, catalogLookup)` | Exact definition graph | Validate structural references | Org ID + typed member set + catalog lookups | Retained; no longer used by Org list/detail browsing. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Role formatter | Yes | Yes | Low | Keep it string-only and pure. |
| Endpoint catalog adapter | Yes | Yes | Low | Validate required DTO fields and reject malformed responses. |
| Full reference service | Yes | Yes | Low | Remove shallow display overload/export. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Formatted role | `formatMemberRoleLabel` | Yes | Low | Avoid generic `formatName`. |
| Detail direct Agent row | `directAgentMembers` | Yes | Low | Do not reuse definition-oriented `AgentView`. |
| Detail mounted Team row | `referencedTeamMembers` or `orgTeamMembers` | Yes | Medium | Prefer `orgTeamMembers` to emphasize membership identity. |
| Detail topology DTO | `AgentOrgEndpointCatalog` | Yes | Low | Mirror established server/query language. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Direct role data | Agent Org GraphQL/store | Reuse | Already authoritative and sufficient | N/A |
| Nested/coordinator roles | Agent Org endpoint catalog | Reuse | Existing admitted aggregate projection exactly matches need | N/A |
| Editable graph validation | Agent Org reference service | Reuse | Existing exact ownership/topology policy | N/A |
| Shared label transformation | No current owned utility | Create New | Same approved transformation is needed by list, detail, coordinator, and handoff labels | Existing scattered address formatters have broader/different subjects |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Org presentation | List chips, detail rows, route-specific loading | DS-001–005 | `AgentOrgExperience` | Extend | Existing component remains feature owner. |
| Collaboration presentation utilities | Role-label normalization | DS-001–003 | Chips/detail/handoff mapping | Create New small utility | Pure, framework-free. |
| Agent Org definition services | Endpoint transport; full reference validation | DS-003, DS-005 | Detail and authoring flows | Extend | Separate files/interfaces by responsibility. |
| Shared HandoffManager | Render role endpoint options | DS-003, DS-005 | Detail/form | Reuse | No component change expected. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `utils/collaboration/memberRoleLabel.ts` | Collaboration presentation | Pure formatter | Readable local role labels | Reused across list/detail mappings | N/A |
| `services/agentOrgDefinition/agentOrgEndpointCatalog.ts` | Agent Org definition services | Endpoint-catalog adapter | Typed GraphQL transport and response validation | Singular remote-read concern | Uses existing query |
| `AgentOrgCatalogMemberChips.vue` | Agent Org presentation | Chip boundary | Presentational role chips | Existing cohesive markup | Uses formatter |
| `AgentOrgExperience.vue` | Agent Org presentation | View orchestrator | Membership-aware detail and view-specific data lifecycles | Existing route owner | Uses formatter/adapter/full service |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Separator-to-space member role formatting | `utils/collaboration/memberRoleLabel.ts` | Collaboration presentation | Applied to chips, direct rows, coordinator, and endpoint labels | Yes | Yes for changed path | Generic address parser or localization service |
| Endpoint catalog DTO | `services/agentOrgDefinition/agentOrgEndpointCatalog.ts` | Agent Org definition services | One typed transport shape used by detail | Yes | Yes | Duplicate domain model or mutable cache |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `formatMemberRoleLabel` input/output | Yes | Yes | Low | Keep fallback outside. |
| `AgentOrgEndpointCatalogItem` | Yes | Yes | Low | Mirror query fields; do not add definition display names. |
| Membership-aware detail row | Yes | Yes | Low | Store one role label plus operational ref/type; do not carry a second display name. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/collaboration/memberRoleLabel.ts` | Collaboration presentation | Pure presentation policy | Format authored member roles | One stable transformation | N/A |
| `autobyteus-web/services/agentOrgDefinition/agentOrgEndpointCatalog.ts` | Agent Org definition services | Remote read adapter | Fetch/validate current detail endpoint roles | Separate from exact definition graph | Existing GraphQL query |
| `autobyteus-web/components/agentOrgs/AgentOrgCatalogMemberChips.vue` | Agent Org presentation | List chip component | Render role-based chips/accessibility | Transport-free leaf | Formatter |
| `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` | Agent Org presentation | Route/view orchestrator | View-specific data loading, detail role rows, endpoint option mapping, authoring preservation | Existing cohesive feature surface | Formatter, endpoint adapter, full reference service |
| `autobyteus-web/services/agentOrgDefinition/agentOrgDefinitionReferences.ts` | Agent Org definition services | Exact graph validation | Full reference reader only | Removes mixed shallow/display responsibility | Existing exact queries |
| Focused specs under existing `__tests__` folders | Test capability | Behavioral contracts | Role stability, zero list lookups, topology lifecycle, preserved authoring | Mirrors production ownership | Shared fixtures as currently appropriate |
| `autobyteus-web/docs/agent_orgs.md` | Product docs | Durable behavior contract | Document role-based browsing and structural lookup boundary | Existing canonical feature doc | N/A |

## Applied Patterns

- **Presentational leaf component:** catalog chips receive complete display input and own no data fetching.
- **Membership-aware view model:** label authority and operational identity remain together instead of reconstructing one from the other.
- **Purpose-specific read adapters:** endpoint role topology and exact definition graph validation have separate entrypoints and consumers.
- **Generation-guarded view-local async state:** existing Vue watcher cleanup pattern remains for endpoint/form requests.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/collaboration/` | Folder | Collaboration presentation utilities | Small framework-free role formatting | Role is shared collaboration vocabulary | Apollo, Vue stores, localization state |
| `.../memberRoleLabel.ts` | File | Role presentation | Pure formatting function | Concrete reusable concern | Ref parsing, definition lookup |
| `autobyteus-web/services/agentOrgDefinition/agentOrgEndpointCatalog.ts` | File | Agent Org endpoint transport | Query/types/response guard | Same service capability as reference readers but separate subject | UI groups/components |
| `autobyteus-web/components/agentOrgs/AgentOrgCatalogMemberChips.vue` | File | List presentation | Role chips | Existing feature component | Async watchers/Apollo/store bindings |
| `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` | File | Agent Org route views | Orchestrate list/detail/create/edit with separated lifecycles | Existing feature owner | Per-chip transport; backend domain policy |
| `autobyteus-web/services/agentOrgDefinition/agentOrgDefinitionReferences.ts` | File | Exact definition graph | Full structural validation only | Existing service consumers remain | Shallow display-name reader |
| `autobyteus-web/docs/agent_orgs.md` | File | Durable documentation | Updated catalog/detail/reference semantics | Canonical docs location | Historical dual behavior |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `utils/collaboration` | Off-Spine Concern | Yes | Low | One pure cross-component presentation rule. |
| `services/agentOrgDefinition` | Transport/provider | Yes | Low | Separate endpoint and exact-graph files keep interface meanings distinct. |
| `components/agentOrgs` | Mixed Justified | Yes | Medium | Existing feature surface intentionally owns route/view orchestration and markup; do not add transport internals to leaf components. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Direct member label | `{ label: formatMemberRoleLabel(member.memberName), ref: member.ref }` | `resolvedAgent?.name ?? member.ref` | Keeps presentation and operational identity separate. |
| Catalog chip | `memberName → formatter → chip` | `memberName → temporary chip → network query → definition.name chip` | Removes the visible substitution and N-per-member work. |
| Detail Team label | Org role `software engineering`; coordinator role `architecture designer` from endpoint catalog | Team definition name plus resolved Agent definition name | Matches approved local-role semantics. |
| Authoring boundary | Definition names in chooser; roles in current membership rows | Replace picker definition names with roles before a member exists | Preserves clarity about which entity a new role references. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Optional `preferDefinitionName` prop/feature flag | Could preserve old tests/screens | Rejected | One role-label policy on list/detail; update tests/docs. |
| Keep shallow requests but ignore results | Minimal template diff | Rejected | Delete watcher, refresh key, loader export, and shallow tests. |
| Fall back to `ref` when role/topology unavailable | Existing detail behavior | Rejected | Localized type fallback for invalid direct roles; truthful loading/unavailable state for secondary topology. |
| Dual full-reader/endpoint-catalog detail path | Rollout convenience | Rejected | Use endpoint catalog only for read-only detail; full reader only for create/edit and its other established consumers. |

## Derived Layering

`GraphQL/store membership data → feature view orchestration → pure role presentation → Vue markup`, with a parallel secondary branch `GraphQL endpoint topology → typed adapter → feature option mapping → coordinator/handoff markup`. Exact definition graph validation remains a separate service branch used only by structural consumers.

## Change / Refactor Sequence

1. Add and unit-test `formatMemberRoleLabel`.
2. Simplify `AgentOrgCatalogMemberChips.vue` to direct role rendering; remove `refreshKey`, async watcher, and reference imports.
3. Remove `catalogRefreshKey` from `AgentOrgExperience` and update list tests to assert immediate stable roles and zero exact-reference operations.
4. Add typed `loadAgentOrgEndpointCatalog` around the existing query, including malformed/error behavior and `network-only` freshness.
5. Split `AgentOrgExperience` data lifecycles: Org catalog always; detail endpoint topology only when Team members exist; Agent/Team catalogs plus full reference graph only for create/edit.
6. Replace detail Agent/Team row models with membership-aware role models; map coordinator and handoff endpoint labels from endpoint roles. Preserve ref-based navigation only.
7. Delete `loadAgentOrgMemberReferences` and its shallow-reader tests; retain and rerun full-reader tests for all remaining consumers.
8. Update detail, localization, Reload, stale-response, authoring, Team-return, and run-config regression tests.
9. Update `autobyteus-web/docs/agent_orgs.md`; run focused Nuxt tests, relevant broader suites, type/build checks, and browser network/UI verification.

No temporary dual presentation path may remain after step 7.

## Key Tradeoffs

- Reusing `agentOrgEndpointCatalog` adds one aggregate detail request when Team topology is present, but removes many exact Agent/Team reads from read-only detail and uses the server's existing admitted role projection. Direct member rows do not wait for it.
- Keeping full graph resolution for create/edit retains some complexity, but that complexity enforces real draft/ownership/topology invariants and is not redundant display hydration.
- A shared pure formatter creates one small file; this is preferable to repeating the approved rule across chips, rows, coordinator text, and handoff labels.

## Risks

- Endpoint catalog failure could hide coordinator/handoff secondary content. Mitigation: preserve direct role rows, show truthful existing localized loading/unavailable feedback, and test failure.
- Splitting one watcher into view-specific lifecycles could regress create/edit hydration. Mitigation: keep full-reader logic and form-generation cleanup intact; add route transition and authoring regressions.
- Matching Team endpoint items only by definition ID can be ambiguous if the same Team is mounted twice. Mitigation: use the mounted Org address `/${member.memberName}` as the primary key and treat `definitionId` as corroborating identity.
- Formatting an empty/invalid role could produce blank output. Mitigation: formatter returns empty and the component uses the existing localized Agent/Team fallback; never use ref.

## Guidance For Implementation

- Do not alter server GraphQL types/resolvers or persisted definition models.
- Do not remove `GetAgentOrgReferencedAgent`/`GetAgentOrgReferencedTeam`; the retained full reader still uses them.
- Treat `memberName` as label authority and `ref` as operation/navigation identity. Keep both in row models with names that make that distinction visible.
- Key endpoint topology by current Org ID/revision, current mounted Team roles, and backend binding/generation. Reject late results through watcher cleanup before publishing.
- When mapping endpoint addresses, use supported address segments only for role hierarchy display; never parse opaque definition refs.
- Test the first rendered frame before deferred promises settle, then after success/failure, and assert identical role labels plus zero list exact-definition operations.
- Browser verification must inspect both visible/accessible labels and the GraphQL operation ledger on list/detail/Reload.
