# Investigation Notes — Agent Org Display-Name Stability

## Investigation Meta

- Package identifier: `AGENT-ORG-DISPLAY-NAME-STABILITY-20260921-001`
- Request / ticket: `agent-org-display-name-stability`
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability` / `requirements/agent-org-display-name-stability`
- Resolved base remote / branch / revision: `origin/personal` / `8af2ec935028f9fe7bc912b6bd2b9552c625c253`
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Fresh `origin/personal` fetched; isolated worktree created and verified clean. Initial checkout exceeded the command yield but its still-running Git process completed normally; worktree is not locked and status is clean before ticket artifacts.
- Bootstrap blocker: None
- Current solution revision ID: `SR-005`
- Investigation status: Requirements SR-004 explicitly approved; architecture investigation complete and design ready for downstream implementation.

## Initial Request And Clarifications

- Original request: The user reports that Agent Org list member names first appear lowercase and later change to uppercase/canonical names; detail initially shows a long `agent org owned agent`-like name and immediately changes to the short name. They asked for a ticket bootstrapped from `personal`, root-cause analysis, and a correct fix design.
- Clarifications received: Two screenshots show the list before and after exact-name hydration. No separate detail screenshot was supplied. The user asked why the lookup exists, requested comparison with the Agent Team list, then clarified that Agent Org list and detail should display the local role/member names just like the Team list rather than referenced Agent/Team definition names.
- User-supplied facts and constraints: The visible UI substitution itself is the problem. Work should be isolated in one ticket based on the current `personal` branch. Org-local `memberName` is the desired browsing identity on list and detail; the user does not want the additional referenced definition-name wording.
- Initial ambiguity: “uppercase” could imply CSS/text transformation, but evidence shows the final values are exact authored definition names with casing and punctuation; the initial values are different fields. The reported long detail value is inferred to be a member reference rather than the Org header.

## Product And Domain Understanding

- Product area: AutoByteus Web Agent Org management, list/catalog and detail views.
- Affected actors or systems: Users scanning Org member chips or opening Org details; frontend reference hydration; exact Agent/Team definition reads.
- Existing user or operational purpose: Org definitions store member address roles and opaque references. The UI resolves the referenced Agent/Team definitions to show authored human-readable names without treating owned definitions as shared-catalog entries.
- Relevant terminology:
  - **definition name**: authoritative authored Agent/Team display name, for example `Product Design & Prototyping Team`.
  - **memberName**: Org- or Team-local role/address segment, for example `product_design_prototyping_team`; not the same as a definition display name. SR-004 proposes this as the authoritative browsing label, formatted for readability.
  - **ref**: stable opaque definition identity, sometimes shaped like `agent-org-owned-agent:*`; never intended as a display name.
  - **verified snapshot**: a current view-local result that passed exact ID/scope/owner validation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Runtime`/`Data`/`Contract`/`Web`/`User`/`Command`/`Other`) | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-21 | User/Runtime | Supplied `ctx_ff97de4da4fd__image.png`, copied to `evidence/agent-org-list-provisional-labels.png` (SHA-256 `988aa128...647efcf`) | Observe initial list state | Member chips show role-like lowercase labels such as `ceo`, `chief of staff`, `product design prototyping te...`, and `software engineering team`. | Compare with settled screenshot and source. |
| 2026-09-21 | User/Runtime | Supplied `ctx_88c0ba0d1544__image.png`, copied to `evidence/agent-org-list-canonical-labels.png` (SHA-256 `a49eacff...77ee18`) | Observe settled list state | The same chips show exact authored display names such as `CEO`, `Chief of Staff`, `Northstar Engineering Org Team`, and `Product Design & Prototyping ...`. This is field substitution, not a uniform uppercase transform. | Define no-provisional-label outcome. |
| 2026-09-21 | Command | `git fetch origin personal`; `git worktree add -b requirements/agent-org-display-name-stability ... origin/personal` | Establish isolated source basis | Base is fresh `origin/personal@8af2ec935028f9fe7bc912b6bd2b9552c625c253`; finalization target is `personal`. | Keep all authoring in isolated worktree. |
| 2026-09-21 | Code | `autobyteus-web/components/agentOrgs/AgentOrgCatalogMemberChips.vue` lines 25–50 | Trace list transition | Watcher sets `resolved.value = null` before every exact read. `memberLabel` then renders humanized `member.memberName`; completion replaces it with `definition.name`. | Architecture must change readiness presentation without weakening validation. |
| 2026-09-21 | Code | `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` lines 60–96 and 225–322 | Trace detail transition | Detail shows its members section while `referencesLoading` is true. `toAgentView` and `teamById` use the unresolved `id/ref` as `name`; async completion replaces reference maps and recomputes rows. Only handoffs are currently hidden while loading. | Detail member-dependent presentation needs a real loading boundary. |
| 2026-09-21 | Code | `autobyteus-web/services/agentOrgDefinition/agentOrgDefinitionReferences.ts`; `graphql/queries/agentOrgDefinitionQueries.ts` | Verify data authority | Exact queries return authored names and ownership metadata. Service validates ID/scope/owner, retires unavailable entries, and separates shallow list-name reads from full selected-Org graph reads. | Preserve security/identity/full-graph semantics. |
| 2026-09-21 | Test | `autobyteus-web/components/agentOrgs/__tests__/AgentOrgCatalogNames.spec.ts` | Check current intended behavior | Test explicitly asserts readable role fallback while requests are pending and exact names after completion; Reload currently causes a fresh read. Late-result and owner-isolation coverage already exists. | The new request intentionally changes the pending-presentation contract and needs updated timing assertions. |
| 2026-09-21 | Test | `AgentOrgExperience.spec.ts`; `AgentOrgOwnedAuthoring.spec.ts` | Check detail/owned behavior coverage | Tests generally await all promises before asserting final names; they do not reject the transient raw-reference detail frame. Existing tests protect navigation, ownership, edit state, and reference-read lifetime. | Add deferred detail first-frame coverage downstream. |
| 2026-09-21 | Doc/History | `tickets/done/readable-org-catalog-member-names/{requirements-doc.md,investigation-notes.md,design-spec.md}`; commit `4fa5c393e` | Understand why the behavior exists | The previous ticket fixed persistent opaque list IDs by deliberately showing readable `memberName` fallback while pending/unavailable and fetching exact names asynchronously. Current docs codify that transition. | Treat current request as a new requirement that revises pending presentation, not as an unexplained race. |
| 2026-09-21 | Doc | `autobyteus-web/docs/agent_orgs.md` lines 12–19 | Verify product contract | Docs state pending/unavailable list references show readable Org member roles and later exact definition names. | Documentation will need synchronization after implementation. |
| 2026-09-21 | Command | `pnpm -C autobyteus-web test:nuxt ... --run` | Attempt focused baseline test | Command could not run because `pnpm` is not directly available in the worktree shell PATH. No test pass or runtime reproduction is claimed. Existing checked-in tests and user runtime screenshots remain evidence. | Downstream validation can use Corepack/dependency setup in its owned workflow. |
| 2026-09-21 | Code/Contract | `autobyteus-server-ts/src/api/graphql/types/agent-org-definition.ts`; `collaboration-definition-admission/services/definition-admission-service.ts` | Assess API source shape before approval | Org list payload carries `memberName/ref/type/scope` but no resolved display name. Admission validates referenced topology; frontend performs separate exact reads for display names. | Under SR-004, `memberName` is already sufficient for the desired label; no resolved-name projection is needed. |
| 2026-09-21 | Code/Contract | `autobyteus-web/graphql/queries/agentOrgDefinitionQueries.ts` lines 2–35; `autobyteus-server-ts/src/api/graphql/types/agent-org-definition.ts` lines 12–17 and 89–110 | Answer whether the initial response contains member display names | `GetAgentOrgDefinitions` requests and the backend projects `memberName`, `ref`, `refType`, and `refScope` for each member. There is no referenced definition-name field in that payload. | Under SR-004 this is sufficient: `memberName` is the desired browsing label and the remaining fields preserve operational identity. |
| 2026-09-21 | Code/Contract | `AgentOrgCatalogMemberChips.vue` lines 33–50; `agentOrgDefinitionReferences.ts` lines 33–79; exact `agentDefinition(id)` / `agentTeamDefinition(id)` resolvers | Trace the second network phase | The second phase is asynchronous, not synchronous. The component starts one operation whose member reads run concurrently with `Promise.all`; each read uses a `network-only` exact GraphQL query and validates identity/scope/owner before the component publishes the collected result. | Explain current behavior to the user without selecting target architecture. |
| 2026-09-21 | User | API design direction following the data-flow explanation | Resolve the behavior boundary before approval | The user rejected per-member follow-up reads for display completion and directed that the frontend receive enough data to render. | Historical SR-003 direction; later role-name clarification establishes that the existing Org payload is already sufficient, so API enrichment is unnecessary. |
| 2026-09-21 | Code/Contract | `autobyteus-web/pages/agent-teams.vue`; `components/agentTeams/AgentTeamList.vue`; `AgentTeamCard.vue`; `stores/agentTeamDefinitionStore.ts`; `graphql/queries/agentTeamDefinitionQueries.ts` | Compare the Agent Team list request and rendering lifecycle | The page/store obtains Team definitions through `GetAgentTeamDefinitions`; the list shows an initial loading state before cards; each card renders `teamDef.name` and `node.memberName` directly from that response. It performs no per-node Agent lookup to complete its displayed chip labels. | Use the one-response-per-view pattern while preserving the semantic distinction between a Team node role and an Agent definition name. |
| 2026-09-21 | Code/Contract | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts`; Team definition converter; `collaboration-definition-admission/services/definition-admission-service.ts` | Trace the Agent Team list backend | The resolver scans admitted definitions, filters Org-owned Teams from the root catalog, and converts each available Team definition into the list DTO. Admission validates dependencies, while the response remains the authored Team projection required by the current card. | The relevant current precedent is direct use of authored local member roles; SR-004 does not require an Agent Org resolved-name projection. |
| 2026-09-21 | Code | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Check whether Team detail is also one-response rendering | Team detail waits behind a whole-view loading gate while Team and Agent data (or an Org-owned graph) are fetched, then resolves node refs from those datasets. It therefore hides provisional refs but is not itself a single aggregate API model. | Preserve truthful loading for any reference-dependent secondary content; do not use resolved definitions to rename roles. |
| 2026-09-21 | User | Role-name clarification after Agent Team comparison | Resolve which identity is actually desired on Agent Org browsing surfaces | The user chose the Org/Team-local role (`memberName`) for list and detail and explicitly said referenced Agent/Team definition names are unnecessary. | Supersede SR-003's resolved-name API proposal; revise the requirements around stable role labels and narrow/remove display-only lookups. |
| 2026-09-21 | Code | `AgentOrgExperience.vue` lines 225–321; `agentOrgDefinitionReferences.ts` | Separate label needs from structural reference needs | Direct Org membership already contains the desired role plus stable ref/type/scope. Detail currently discards the role when building Agent/Team rows and uses resolved definitions/ref fallbacks. Full reference loading also supports Team topology, coordinators, handoff options, authoring validation, and save readiness, so it cannot be deleted wholesale solely from the display decision. | Architecture must preserve non-label consumers while ensuring reference state never renames browsing labels. |
| 2026-09-21 | User | Explicit SR-004 approval message | Authorize architecture design | The user approved matching Agent Team list/detail role-name semantics and eliminating redundant asynchronous name lookup complexity. | Record SR-004 as the approved requirements basis. |
| 2026-09-21 | Code | `AgentOrgExperience.vue` `onMounted`, `referencedMembers` watcher, detail/form computed models | Trace view-specific fetch ownership after approval | The component unconditionally loads Org, Agent, and Team catalogs for every view and uses one full-reference watcher for detail/create/edit. List will no longer need Agent/Team catalogs; detail needs role topology but not definition-name hydration; create/edit still needs full definitions and validation. | Split view-specific loading: Org catalog always, endpoint-role topology for detail with Teams, full catalogs/references only for create/edit. |
| 2026-09-21 | Code/Contract | `GetAgentOrgEndpointCatalog`; `AgentOrgDefinitionResolver.agentOrgEndpointCatalog`; `DefinitionEndpointCatalog.projectOrg` | Find an existing authoritative source for detail coordinator/handoff roles | The existing admitted endpoint-catalog query returns direct/nested role `memberName`, address, definition ID, and Team coordinator role/address in one Org-level response. It contains no referenced definition display names and is currently unused by the frontend. | Reuse this existing contract for reference-dependent detail secondary content instead of the client full per-definition graph reader. No backend change is required. |
| 2026-09-21 | Code | `HandoffManager.vue`; `types/collaboration/handoffs.ts` | Verify detail endpoint presentation needs | View mode renders endpoint labels/addresses from `HandoffEndpointOption`; edit validation additionally needs complete selectable endpoint sets and coordinator addresses. | Map endpoint-catalog roles to view-mode options; keep full draft/reference validation for create/edit. |
| 2026-09-21 | Code | Repository-wide imports of `loadAgentOrgMemberReferences` and `loadAgentOrgDefinitionReferences` | Establish safe removal boundary | The shallow loader is used only by catalog chips and its tests. The full loader is also used by Agent Team Org-return detail, Agent Org run configuration, Agent Org create/edit, and tests. | Delete the shallow display loader; retain the full loader and limit Agent Org Experience use to create/edit. |
| 2026-09-21 | Code | `AgentTeamList.vue`, `AgentTeamCard.vue`, `AgentTeamDetail.vue` | Confirm approved comparison target | Team list/detail primary membership text comes from `node.memberName`; Team detail gates its reference-dependent view and uses roles for handoff endpoints/coordinator badge. | Align Agent Org primary labels with local roles without changing Agent Team surfaces. |
| 2026-09-21 | Code | Search for `/[_-]+/g` role/address formatting in web source | Check reuse before adding formatting policy | Role/address humanization is duplicated in multiple unrelated presentation paths; no current shared member-role formatter owns the approved label rule. | Add one narrowly named collaboration role-label formatter and use it in the changed Agent Org list/detail path; broader deduplication is out of scope. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Navigate to Agent Org list | Org cards render from store; one `AgentOrgCatalogMemberChips` instance per card immediately starts exact member reads; while pending it derives labels from `memberName`; current completion publishes exact definition names | User sees a role-alias-to-definition-name change; exact ID/scope/owner validation and member order are preserved | Two supplied screenshots; component/service/tests | High confidence |
| BEH-002 | User | Select View Details | Selected Org renders; reference watcher clears maps and starts full graph read; members section derives view objects from unresolved refs; current completion replaces maps and recomputes rows | Owned refs can appear as long names/initials before exact names; loading status exists but does not gate the section | User report and exact source path | High confidence for mechanism; no separate runtime detail screenshot |
| BEH-003 | System/User | Explicit Reload or component/context key change | Parent refetches Orgs, increments refresh key; list chip watcher clears its snapshot and rereads network-only; component/watch cleanup prevents stale adoption | Reload freshness works, but verified labels temporarily regress to role fallback. Backend/org/member/revision keying protects ownership/lifecycle boundaries. | Code and tests | High confidence |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agentOrgs/AgentOrgCatalogMemberChips.vue` | Currently owns per-card exact-name reads, role fallback rendering, aria labels, request key, and cleanup | Exact-name reads are unnecessary because the role fallback is now the required settled label | Make the component presentational (or inline it) and share a deterministic role formatter. |
| `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` | Owns list/detail/create/edit, selected Org, detail/full references, member view models, handoff options, and reload | Detail currently loses `memberName` when mapping by ref and therefore exposes ref/definition names | Keep each Org member alongside its ref/type; derive row labels from the role, while retaining structural reference data only for secondary features. |
| `agentOrgDefinitionReferences.ts` | Owns exact per-reference queries, deduplication and ID/scope/owner validation for catalog labels and full selected-Org graphs | The shallow catalog-label loader becomes obsolete; the full loader may still be required by Team topology, handoff, edit, or launch behavior | Inventory all full-loader consumers before narrowing the service; do not conflate removing display hydration with removing validation. |
| `agentOrgDefinitionStore.ts` / GraphQL Org query | Already carries persisted `memberName`, ref, type, and scope | Existing payload is sufficient for direct list/detail labels | No resolved-name API field is required for the approved role-label direction. |
| Backend definition-admission scan and Org GraphQL projection | Admits valid definitions and returns the authored Org membership fields | No new presentation projection is required for direct roles | Preserve current contract; architecture should not add computed definition names that the UI no longer displays. |
| Agent Team list page/store/query/card | Renders Team-local `node.memberName` directly from the Team response without per-node Agent-name lookup | Establishes the selected semantic precedent: browsing shows local roles | Apply the same role-label principle to Agent Org list/detail while keeping Org-specific formatting and validation boundaries. |
| `windowNodeContextStore.bindingRevision` | Invalidates snapshots when backend binding changes | Old verified names must not cross a backend boundary | Preserve key participation and late-result cleanup. |
| `tickets/done/readable-org-catalog-member-names` | Prior approved package for exact list names plus pending/failure fallback | New behavior must explicitly supersede only the visible pending fallback allowance | Preserve actual-name, owner-isolation, reload freshness, and failure fallback outcomes. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: Agent Org definition payload (`members` includes `memberName`, `ref`, `refType`, `refScope`); Agent and Team exact definition payloads include authored `name` plus ownership metadata; existing English/Simplified Chinese localization messages; prior ticket docs; supplied screenshots.
- Existing readers, writers, or contracts that consume them: Agent Org definition store, Experience component, member-chip component, reference service, Apollo exact queries, authoring mutations, detail/launch readers.
- Evidence paths: source paths above; `autobyteus-server-ts/src/api/graphql/types/agent-org-definition.ts`; `autobyteus-web/graphql/queries/agentOrgDefinitionQueries.ts`.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: Vue Agent Org components; Pinia stores; stateless reference service; GraphQL exact definition queries; definition admission and owner checks; route-query-driven view; backend binding revision.
- Existing structural surfaces that can support the approved behavior: Existing Org payload, card/detail member collections, current humanization fallback, Team-local role fields, reference service separation, route-query-driven view, and localized messages.
- Evidence paths: `AgentOrgExperience.vue`, `AgentOrgCatalogMemberChips.vue`, `agentOrgDefinitionReferences.ts`, corresponding tests.

### Potential Structural Impacts To Investigate

- API or external-contract change: Not required for direct role labels; the existing Org response already includes `memberName`. Any unrelated detail-topology API change would require separate architecture evidence.
- Persistence schema or invariant change: Confirmed absent.
- Security or privacy boundary change: Must remain absent; existing exact identity/scope/owner checks remain for structural consumers even though labels no longer depend on them.
- Concurrency or lifecycle change: Remove list label-request concurrency. Detail reference lifecycle may remain for non-label features but cannot mutate member labels or expose refs during pending/error states.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: No deployment/migration/API ownership change expected. Frontend display view-model and service-consumer cleanup are expected.
- Confirmed absent, present, or unknown: Persistence/migration/API/security-policy changes absent; frontend label-source and request cleanup present; exact full-reference service narrowing remains for architecture design.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| User-captured before/after screenshots | SCN-001 list first render to settled names | Identical cards change from role-like lowercase labels to exact authored names | Loading state must not present role aliases as final labels | `evidence/agent-org-list-provisional-labels.png`; `evidence/agent-org-list-canonical-labels.png` |
| Source/test lifecycle trace | SCN-001/SCN-003 pending and reload | `resolved = null` synchronously forces fallback; async result forces exact label | Cause is deterministic state modeling, not random race or CSS | Component/service/test paths above |
| Source lifecycle trace | SCN-002 detail entry | Maps are cleared and loading set, but rows still render from ref fallback | Gate/name projection must respect readiness | `AgentOrgExperience.vue` lines recorded in Source Log |
| Focused test command attempt | Baseline unit suite | Did not execute because `pnpm` executable was not in PATH | No validation claim; downstream must run tests with configured toolchain | Command recorded in Source Log |

## Agent Team List Comparison

### Request And Loading Lifecycle

- The `/agent-teams` page starts workspace, Agent-definition, and Team-definition catalog reads on mount. `AgentTeamList.vue` also ensures the Team catalog is loaded when entered directly.
- `AgentTeamDefinitionStore.fetchAllAgentTeamDefinitions()` issues `GetAgentTeamDefinitions`. During the first read, `AgentTeamList.vue` shows its loading state instead of incomplete cards. During explicit Reload, the current complete cards remain visible because the reload path is distinct from initial loading, and the settled list is replaced when the new result arrives.
- There is no chip-level network lifecycle in `AgentTeamCard.vue`.

### API Payload And Rendering

- `GetAgentTeamDefinitions` returns all Team fields currently displayed by a catalog card, including Team `name`, description, coordinator member name, ownership/default metadata, and `nodes { memberName ref refScope }`.
- `AgentTeamCard.vue` renders the Team display name from `teamDef.name` and each chip from `node.memberName` directly. It does not query `agentDefinition(id)` for each node.
- This is semantically sufficient for that surface because Team-list chips represent the Team's authored node/member roles. It is not proof that `node.memberName` equals the referenced Agent definition name; the Agent Org product requirement is explicitly to show the latter.

### Backend Behavior

- The Team resolver obtains the current definition-admission snapshot, selects available `agent_team` definitions, excludes `agent_org_owned` Teams from the root Team catalog, and converts each admitted domain definition to its GraphQL DTO.
- Admission validates referenced Agents before the Team appears as available, but the list converter returns the authored Team DTO needed by the card rather than a resolved dependency graph.
- Therefore, the useful semantic precedent is that the catalog displays local member roles directly instead of replacing them with referenced Agent names. Agent Org's existing response already contains its corresponding local roles.

### Detail Caveat

- `AgentTeamDetail.vue` waits behind a whole-view loading gate while it obtains Team and Agent datasets, or an exact Org-owned graph, and only then renders reference-derived names. This avoids visible raw-ref substitution in normal cold loading.
- It is not a one-response aggregate API for shared Team detail. For Agent Org detail, the new requirement is narrower: any retained reference/topology work must not determine or change the direct member role labels.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Current user request | UI should not visibly change from lowercase/long identifier to another name after navigation | Direct explicit complaint plus screenshots | Stable member labels on list/detail | Confirm the complete SR-004 role-label baseline |
| User role-name direction | Agent Orgs also have roles, so list and detail should display `memberName`; Agent/Team definition names and extra wording are unnecessary | Direct explicit clarification after Team comparison | Treat local role/member names as authoritative browsing labels; remove list display hydration and prevent detail reference results from renaming rows | Explicit approval of the full revised baseline is still required before design |
| Prior ticket approval | Exact Agent and Team definition names were previously desired; readable role fallback was accepted for pending/unavailable | Durable repository artifact with approval wording | That browsing-label policy is superseded if SR-004 is approved; preserve its identity/owner validation findings | Historical approval does not approve SR-004 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Agent Org GraphQL read surface | Current `origin/personal@8af2ec9` | Existing member fields include the required direct browsing label and stable operational identity | Current Org query/resolver and user role-name direction | Do not add resolved-name fields solely for presentation |
| Definition admission/ownership | Current server/client contract | Wrong identity/scope/owner is rejected; available Orgs have valid referenced topology | Server admission and frontend validation source | Keep checks for non-label structural consumers while decoupling labels from resolution |
| Agent Team list GraphQL surface | Current `origin/personal@8af2ec9` | Cards display local Team node/member roles and perform no per-node Agent-name lookup | Team page/store/query/card/resolver source | Selected semantic precedent for Agent Org browsing |
| Vue/Apollo view lifecycle | Current implementation | Watchers clear/publish reference maps and can currently rename computed rows | Agent Org components/tests | Reference lifecycle must not affect role labels; stale-result controls remain for dependent features |

## Persisted Data And State Facts

- Affected stored or external subject: None; current definitions are read-only for this behavior.
- Location and representative shape: Agent Org members in package `org-config.json` and GraphQL payload with role/ref/type/scope; exact Agent/Team definitions provide names.
- Approximate volume: Not needed for requirements; list already issues exact reads per visible card/member.
- Current readers and writers: Definition providers/admission/GraphQL, frontend stores/services/components; authoring mutations are unrelated and must remain unchanged.
- Current unknown/extra-field behavior: Not material; mutation projection intentionally strips response metadata.
- Required semantics or data that must be preserved: All authored names, refs, roles, ownership, revision, ordering, handoffs, package bytes.
- Acceptable loss, reset, rebuild, or regeneration: Only transient view-local loading state.
- Privacy, retention, compliance, downtime, or operational constraints: No change.
- Remaining evidence gap: Architecture must identify every non-label consumer of the full reference service and determine whether detail coordinator/handoff secondary content needs the full graph or a narrower existing source.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: Analyze why the visible names change and design a correct fix.
- Requirement / behavior IDs involved: BEH-001–003; REQ-001–006.
- Product decision, uncertainty, or experience to understand or evolve: Stable role/member-name presentation on existing list/detail layouts; proposed directly for user approval without a separate prototype.
- Critical journey and states: Initial list, detail navigation, reference pending/resolved/unavailable, explicit Reload, and context change.
- Known constraints and non-goals: No layout redesign, no guessed/parsed refs, no ownership/persistence change, no per-member list display queries, and no new resolved-name API fields.
- Relevant existing-product or frontend context supplied or established: Current screenshots and production source.
- Product Design request artifact / message reference: N/A.
- Established separate prototype repository/root and ticket reference, when applicable: N/A.

## Product Design Findings

- Product Design package path (external Product Design & Prototyping repository): N/A
- Visualizer or prototype source path: N/A
- Approved UI/UX specification path, when applicable: N/A
- Review URL: N/A
- Explicit user-confirmation reference: User's 2026-09-21 explicit approval of SR-004 role/member-name semantics
- Journeys and scenarios validated: N/A
- Final visual-reference paths: N/A
- Product decisions supported by evidence: The initial screenshot already demonstrates the desired role-label content, and the Team list uses the same local-role concept. No new visual concept or prototype is required.
- Alternatives rejected or still open: Referenced definition names—whether client-hydrated or server-enriched—are rejected as Agent Org browsing labels. Architecture must decide only how far structural reference loading can be narrowed without affecting non-label behavior.
- Mocked boundaries and production gaps: N/A
- Requirements sections affected: UI, Interaction, And Experience Requirements

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/evidence/agent-org-list-provisional-labels.png` | User / copied by Solution Designer | Current-state runtime evidence | List pending frame | REQ-001 / AC-001 | Read and checksummed | Evidence only |
| `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/evidence/agent-org-list-canonical-labels.png` | User / copied by Solution Designer | Current-state runtime evidence | List settled frame | REQ-003 / AC-001 | Read and checksummed | Evidence only |
| `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/done/readable-org-catalog-member-names/` | Historical solution package | Establish prior intent and preservation boundaries | List exact-name behavior | REQ-003–006 | Read | Historical approved basis only; does not approve this new change |

## Assumptions, Unknowns, And Risks

| ID | Type (`Assumption`/`Unknown`/`Risk`) | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Reported long detail name is a member `ref` fallback, not the Org header | Determines the affected region | User approval/browser verification / Solution Designer + API/E2E | Evidence-backed, pending confirmation |
| ASM-002 | Assumption | The desired role presentation is the current humanized form (`product_design` → `product design`), not raw snake case | Affects exact visible output | Explicit SR-004 approval / User | Open |
| UNK-001 | Unknown | Which full-reference reads remain necessary for detail handoffs, Team coordinator data, edit, and launch after label hydration is removed | Determines safe cleanup scope | Architecture investigation after approval / Solution Designer | Open |
| RSK-001 | Risk | Removing the shared full-reference watcher wholesale could weaken current owner/scope or Team-topology validation | Domain correctness and launch/edit safety | Inventory consumers and remove only display-only reads / Solution Designer + implementer | Open, controlled by REQ-005/006 |
| RSK-002 | Risk | Detail view models keyed only by `ref` may continue to lose the Org `memberName` and accidentally render definition/ref values | Direct recurrence of the defect | Preserve membership context in each row model and test deferred results / Solution Designer + implementer | Open |
| RSK-003 | Risk | Applying role labels inside authoring selection could make it unclear which underlying Agent/Team is being chosen | Authoring usability | Limit the change to browsing/member rows; preserve definition names in selectors / Solution Designer | Open |

## Architecture Investigation Findings

- Change posture: bounded frontend behavior correction and cleanup within the existing Agent Org capability; no server schema, persistence, security-policy, route, or deployment change.
- Current execution spine is over-coupled by view: `AgentOrgExperience` loads all three definition catalogs on every view and uses one full-reference watcher for detail and authoring, while each list chip independently owns exact-name transport and lifecycle.
- Root cause: presentation identity is sourced from two different domain concepts. List chips and detail view models treat the local role as fallback and the referenced definition name as settled truth, even though the approved browsing contract selects the role. Detail also discards `AgentOrgMember` context too early by mapping rows from `ref` alone.
- Existing capability reuse: the current Org payload is sufficient for direct roles; the existing `agentOrgEndpointCatalog` contract is the authoritative admitted projection for nested Team roles, coordinator roles, and handoff addresses; the existing full reference service remains appropriate for mutable create/edit drafts and other launch/Team-detail consumers.
- Selected clean cut: remove the shallow catalog-name loader and per-chip request lifecycle; make chip rendering presentational; retain membership context in detail row models; replace detail's full per-definition reads with the existing endpoint-catalog response only when Team topology is needed; scope Agent/Team catalog/full-reference loading to create/edit.
- Concurrency/lifecycle: direct role rows never wait for topology. Endpoint-catalog results are view-local and key/cleanup guarded; reference-dependent coordinator/handoff content retains truthful loading/unavailable states. Reload replaces Org membership through the existing store and no longer increments a name-hydration token.
- Persisted-data decision: `Not Affected`; role/member values and all identity fields are read without modification.
- Design-health decision: `Refactor needed now` because leaving the shallow loader, refresh token, or mixed detail/form watcher would preserve obsolete ownership and redundant requests even if labels were locally overridden.
- Completed classification evidence: several frontend components/services/tests/docs change inside one existing capability; one existing query is activated; no new backend/API contract or cross-subsystem owner is introduced. `task_size=Medium`, `architectural_risk=Low`.

## Requirement Implications

The visible change is not caused by CSS casing or data mutation. Two different values are intentionally rendered at two readiness stages: list `memberName` then definition `name`, and detail `ref` then definition `name`. The user's clarification changes the intended settled identity: Org/Team-local member roles are the desired browsing labels, not referenced definition names. The existing Agent Org payload already supplies each direct member's `memberName`, so list label hydration and any server name-enrichment proposal are unnecessary. Detail must retain the membership object when building rows rather than reducing it to `ref`. Reference reads may still be legitimate for Team topology, coordinator roles, handoffs, edit, or launch validation, but their pending/completed results must not determine direct labels. The Agent Team list is now a semantic precedent because it displays local roles without per-node Agent-name lookup.

## Notes For Architecture Design

After approval, design the smallest clean frontend correction: use one shared human-readable role formatter; make catalog chips presentational; carry each `AgentOrgMember` into detail row view models so labels come from `memberName`; use Team-local `coordinatorMemberName`/node member names for secondary Team role labels; and prevent pending/completed reference state from changing those labels. Inventory `loadAgentOrgMemberReferences` and `loadAgentOrgDefinitionReferences` consumers, delete the shallow list display reader if unused, and retain/narrow full-graph validation only for evidenced handoff/edit/navigation/launch needs. Preserve authoring selectors' definition names and existing identity/owner checks. No API enrichment, cache, or migration should be introduced without new evidence.
