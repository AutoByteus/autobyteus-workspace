# Design — ORG-CATALOG-NAMES-20260916-001 / DS-001

## Solution And Approval Basis
SR-002 Architecture Design Complete; design Ready. Approved SR-001 requirements REQ/AC001–003, BEH001/002, SCN001/002. User confirmed same actual-definition-name behavior as shared chips and explicitly both Agent and Team members. Approval wording in requirements-doc.md. No Product prototype requested. Evidence authority: investigation-notes.md; screenshots are current-state evidence, not redesign specifications.

## Current-State Read
Org list card maps members down to kind/ref, then uses detail-only reference maps/public catalog getters, falling back to ID. List deliberately loads no exact references; owned subjects are deliberately absent public lists. Shared names succeed by catalog lookup. Correct the catalog projection, not ownership or stored data. Earlier completed ticket fixed launch/detail resolution, not this presentation path.

## Task Size And Architectural Risk
**task_size Small / architectural_risk Low.** Bounded catalog display/read-lifetime correction: one component addition, existing Experience integration, local shared reader extraction and focused tests/localization. Existing exact queries/owner checks and Vue cleanup absorb it; no wire/schema/security/permissions/runtime/persistence/global-cache change. Escalate if implementation requires new backend admission, source identity/ownership policy, global caching, independent owned-Team actions or runtime change. Do not silently widen this display ticket.

## Architecture Investigation Evidence
See investigation-notes SR-002: Experience catalog/render/reload, shared reference service/query metadata, window binding revision and existing shared-only catalog test. Source-confirmed cause plus user screenshot; no fresh browser/test pass claimed. Detail/full launch reader semantics are a preservation boundary.

## Intended Change
Render actual referenced definition.name for both direct Agents and Team members, shared and owned. During pending/failed exact read, humanize member.memberName by replacing underscores/hyphens with spaces and trimming (do not force casing); if absent use localized Agent/Team noun. Actual fetched name is never humanized or rewritten. No opaque reference in visible or accessible copy. Keep icons/styles/member order and existing Run/View Details unchanged.

## Relevant Behavior And Production-Path Map
|Behavior / scenario|REQ/AC|Trigger and target path|Preserved outcome|
|---|---|---|---|
|BEH001 / SCN001|001,003|Open/search Org list -> visible card -> exact immediate-member read -> name badges (DS001)|Both Agent/Team, shared/owned; correct owner, no detail prerequisite|
|BEH002 / SCN002|002,003|Pending/failure/reload -> local current snapshot/fallback (DS002)|Readable fallback, no false deletion or runtime action|

## Relevant Supplemental Task Artifacts
bootstrap-handoff.md records isolated base; evidence/user-org-list.png and user-org-list-detail.png supplied by user show defect. No normative external Product artifact. Prior completed org-owned-team-local-agent-loading package is historical context only, not reused approval or new validation.

## Task Design Health Assessment
Bug Fix; Missing Invariant: catalog presentation treats a non-exhaustive public list as complete exact-name authority. **Refactor needed now, bounded:** separate list chip lifetime from the already multi-view Experience; factor common validated reference-read internals within the existing service so list and full selected-Org reads do not duplicate ownership/query policy. Do not refactor stores/runtime. The larger list pagination/caching strategy is not needed for this scope; no performance claim. Independent owned-Team actions remain unrelated.

## Terminology / Design Reading Order
Definition name is authored display name; memberName is Org role/address segment and only temporary readable fallback. ref is opaque identity, never a label parser. Read requirements/evidence -> spines/ownership -> interfaces/lifecycle -> files/tests.

## Legacy Removal Policy
No backward compatibility; remove in-scope obsolete paths. Remove list's calls to agentById/teamById and list-only memberAriaLabel plus lossy CatalogMember/CatalogOrg/toCatalogOrg mapping if no longer used. Keep detail/editor helpers unchanged. No compatibility aliases, dual old/new list renderer or ID-prefix stripping.

## Persisted Data / State Transition Decision
**Not Affected.** Existing definition names, memberName/ref/type/scope and ownership are read only through current query/schema. No writer/schema/DB/history/package changes. Local Vue snapshot is transient; no migration, rebuild or repair. IDs and package bytes preserved (AC003).

## Data-Flow Spine Inventory / Primary Execution Spine
- DS001 Primary End-to-End (BEH001): user opens catalog -> Experience's visible Org cards -> AgentOrgCatalogMemberChips -> immediate-member reference operation -> existing Apollo exact queries/server admitted provider -> validated definition names -> badges.
- DS002 Return/Bounded Local (BEH002): request captures card identity/revision/members/backend binding/reload token -> pending readable fallback -> validated completion for current scope or ignored stale result -> resolved/fallback presentation. Component lifecycle owns adoption.

## Spine Narratives / Actors
Experience continues fetching Org catalog, filtering and navigating. Each rendered card's member component reads only that Org's direct members, using their exact refs and expected scope/Org owner. Response returns through existing service validation. Names change presentation only. While waiting/failing, known member role is a readable placeholder; failure never activates runtime or substitutes another owner's definition. Reload refreshes name snapshots even when parent Org revision is unchanged. Removed/filtered cards unmount and retire pending publication; no background registry.

## Ownership Map / Boundaries
- Experience: list/filter/card identity, explicit Reload cycle and existing navigation.
- Member-chip component: one card's local names, rendering/accessibility, watcher lifetime, no definitions publication or launch authority.
- Definition reference service: exact query, id/scope/owner validation, result collection; private internals shared by two public read operations.
- Apollo/server: existing bound transport/cache/admission/provider authority, unchanged.
No new thin facade/global store. Display availability is not launch readiness.

## Return / Bounded Local Lifecycle
Component props: `org: AgentOrgDefinition`, `refreshKey: number`. Own immediate watcher keyed by Org id/revision/memberName/ref/type/scope, refreshKey and existing window bindingRevision. Clear prior snapshot on key change, invalidate old completion via watcher cleanup and captured-key match; unmount cleanup ignores completion. Handle unexpected rejection as current fallback, never unhandled stale mutation. No timers/retry loops/generation service.
Parent increments refreshKey in existing reload completion (finally), causing one fresh name read after explicit Reload, even if fetched Org objects/revision are unchanged. Existing root loading/error behavior stays. Do not refetch for unrelated component state/model changes. Returning to list mounts current names without detail state. No cached cross-card state; same-name separate Org refs cannot collide.

## Off-Spine Concerns
Existing icons/style/localization serve rendering, not identity; existing bound-client selection serves query transport. Existing full selected-Org loader serves detail/editor/launch separately, not catalog label readiness. Avoid making Team child-Agent resolution a prerequisite for displaying Team's name.

## Boundary Encapsulation / Dependency Rules
Member chips call service, never raw Apollo/files or decode owned IDs. Service privately owns ownership checks reused by full and immediate reads. Experience passes full Org members, not a second invented identity model. Do not seed owned subjects into Agent/Team public catalogs. Do not alter model/launch admission or detail/editor query callers.

## Interface Boundary Mapping
Retain `loadAgentOrgDefinitionReferences(orgId, members, catalogLookup)` and its full result/semantics for existing consumers.
Add explicit `loadAgentOrgMemberReferences(orgId, members)` in SAME agentOrgDefinitionReferences.ts. Returns existing AgentOrgDefinitionReferences shape (agents/teams/unavailable), resolving direct Org members only. It uses existing exact queries with network-only policy for both shared and owned refs, expected kind/refScope/owner metadata, and does not traverse Team.nodes. Query errors, wrong id/scope/owner produce unavailable result; never parse error strings as deletion. Agent and Team names come from returned definition objects, not ref fragments.
Extract the existing private validated-read primitive in-place, shared by both operations; no copied validation policy or new resolver module. Full loader retains eligible catalog lookup, Team topology/coordinator checks, child reads, unavailable aggregation and readiness result semantics exactly. New direct operation intentionally doesn't claim full graph validity. Use per-call deduplication for identical kind/ref/scope/owner tuples if repeated; not a persistent cache. No optional skip-validation/depth flags. Capture normal bound query context at read entry as appropriate; no new transport policy.

## Interface / Naming / Reuse Checks
Two concrete operations: immediate member definitions vs complete reference graph. Existing result shape reused; no extra DTO, persisted fields or compatibility option. Full graph caller cannot accidentally receive shallow readiness. Actual names are current-schema data, no new server list payload. Preserve shared catalog getter names introduced previously.

## Subsystem / Draft-To-Final File Responsibility Mapping
All paths relative autobyteus-web:
|Action / file|Responsibility|
|---|---|
|Add components/agentOrgs/AgentOrgCatalogMemberChips.vue|Single card chip group, exact-name read snapshot, fallback/aria and cleanup; reuse existing classes/icons/data-test convention|
|Modify components/agentOrgs/AgentOrgExperience.vue|Replace inline chip group with component; use full Org members; remove lossy catalog mapping/list-only aria helper; local explicit reload token; keep detail/editor/Run unchanged|
|Modify services/agentOrgDefinition/agentOrgDefinitionReferences.ts|Shared private exact-read core; new immediate-member operation; existing full operation preserved|
|Modify localization/messages/en/agentOrgs.ts and zh-CN/agentOrgs.ts if needed|Localized type-only fallback nouns; reuse existing aria templates|
|Add/modify colocated component/service tests and existing Experience catalog test|Real rendering/read boundary success, fallback, lifetime, full-reader preservation|
No server/store/schema/runtime/source-index changes. docs/agent_orgs.md may get concise catalog presentation clarification after implementation; no broad docs rewrite.

## Shared Structure / Folder Boundary Check
Keep AgentOrgMember intact: memberName/ref/refType/refScope each has distinct meaning. Reuse AgentOrgDefinitionReferences; no new duplicated name/ownership DTO. Components belong agentOrgs UI; stateless read semantics belong agentOrgDefinition service; localized copy stays catalogs. Compact placement, no module hierarchy or generic helper folder.

## Applied Patterns / Derived Layering
Existing scoped Vue watcher + stateless async read. No new framework. UI -> existing definition read boundary -> Apollo/API, then return to current UI snapshot.

## Removal / Decommission Plan
Remove obsolete list projection/helper and inline group when component owns rendering. Extract—not copy—nested read policy so full and direct functions share it. No removal of full graph validation or detail/editor helpers. No legacy compatibility wrapper.

## Concrete Shape / Backward-Compatibility Rejection
Org role `research_group`, opaque owned Team ref -> exact Team.name `Research Team`; chip/aria says Research Team. Pending fallback `research group`; eventual name always wins. Do not cut `agent-org-owned-team:` from IDs, show raw ref in tooltip/aria, or insert owned definition into shared catalog. Legacy/current-schema conversion N/A; all these are current definitions.

## Change / Refactor Sequence
1. Add failing direct-list regression with owned Agent AND Team absent from public catalog; retain shared control and definition names different from role names.
2. Factor validated-read core, add immediate operation; prove full loader still performs child/coordinator validation and unchanged owner checks.
3. Add scoped chip component and integrate actual list/Reload, remove old projection; localize minimal fallback.
4. Run relevant component/service/detail/editor/owned-launch tests, inspect rendered result at ordinary/narrow width; no opaque visible/accessible IDs.
5. Independent API validates actual direct catalog entry/reload with owned/shared test refs and preserved navigation/read laziness; no user package edits/provider startup just for labels. Normal delivery requires separate user finalization authority.

## Key Tradeoffs / Risks
Fresh immediate-reference queries add read traffic on rendered card mount/Reload but avoid traversing all Team child Agents or treating public catalogs as exhaustive. Existing full query payload is reused; a separate summary API/pagination/global cache is unjustified here. Search remount may re-read; no unmeasured speed claim. Full-loader refactor risks changing readiness: require preservation regressions. Late responses and same-revision referenced name edits require explicit reload/key coverage. Network failure not nameless data. No new broad concurrency/permissions mechanism.

## Guidance / Acceptance Coverage
Use real component plus actual service at Apollo response seam, not mocked resolved-name array or owned-catalog insertion. Cover both direct Agent and Team, shared/owned mixed card, role/name difference, exact owner mismatch, pending/rejected query, same-named member in another Org, unchanged Org revision + renamed referenced subject on Reload, removed card/late response, empty members and unchanged search/navigation. Assert no child Agent queries needed for Team label; full loader still rejects missing child for launch. Preserve styling/order/icons and human-readable aria labels. Run pnpm test:nuxt affected paths --run; rendered browser verification required, source checks are not a test Pass. No server/Electron build/restart/data mutation in design work. Escalate discovered material boundary change, don't widen scope silently.
