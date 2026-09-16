# Definition lookup / inventory assessment — ORG-LOCAL-AGENT-20260916-001

## Current applicability — SR-006
After this assessment, the user explicitly requested a design update. DS-REV-003 now adopts its bounded catalog/exact contract clarification after caller audit. Original SR-005 text below is historical rationale, not a competing instruction to hold the old design. IR-001/002 work is preserved. A new global inventory/cache and independent owned-Team actions remain outside scope.

## Original SR-005 purpose / authority
2026-09-16, user asks whether current design can improve based on original personal. Assessment only, not new implementation authority. Approved SR-001 and DS-REV-002 remain unchanged; no pause or extra assignment. Existing IR-002 source/evidence are another owner's work and preserved. Current API acceptance not inferred from implementation local checks.

## Evidence and correction of comparison
Pinned original personal5645b49d6 source had recursive backend Team discovery, a full loaded definition array including nested local Teams, and root visibility filtering separately. Current source has deliberate list API exclusion of agent_org_owned Teams (`agentTeamDefinitions` resolver) and exact admitted read API (`agentTeamDefinition(id)`). Frontend store still exports broad-sounding `getAgentTeamDefinitionById` which actually searches only the public array. Many consumers call it, but existence of calls does not prove each accepts owned IDs or is defective. Confirmed failing consumer was Org launch, now corrected in IR-002 pending actual API retest.

Important distinctions: indexing/loading an owned definition is not making it shared; root visibility is a projection, not evidence of definition existence; ownership also constrains mutation, not just display. The original approach is simpler for synchronous callers because the inventory is populated. It still has loading/refresh/invalidation work elsewhere; it does not eliminate async complexity globally. We have not benchmarked either design or performed historical runtime replay, so no universal performance/robustness superiority claim.

## Assessment / recommendation
Recover the original separation of concerns, not its obsolete nested topology or necessarily eager whole-inventory loading:
1. Exact reference access answers which definition an exact identity denotes (subject, backend context, ownership checked).
2. Catalog listing answers what can be displayed/selected as standalone/shared items; absence from catalog is not absence from storage.
3. Ownership determines containment/identity and permitted mutation, independent of whether data is cached or visible.
4. Views project resolved data and own local pending/error state; do not each reimplement path/identity/scope resolution.

Current bounded design already does the useful part: backend exact provider handles owner-aware lookup; shared frontend AgentOrgDefinitionReferences is reused by detail/edit/owned Team detail/launch; public catalogs are not mutated; panel retains local UX readiness. No need to replace this with a new generic resolver framework to finish approved ticket.

Remaining architectural clarity issue: frontend store naming blurs a catalog-only getter and exact definition read. Potential future cleanup is explicit catalog-only naming/contracts and a consistent exact-read boundary for consumers that legitimately accept owned identities. Audit actual callers first; do not treat all Team-detail/mobile/runtime callers as confirmed defects or apply a bulk mechanical replacement. This may be a bounded API naming/consumer refinement or a wider store design depending on evidence, not approved scope yet.

An internal normalized inventory could also preserve ownership while filtering visible roots, as personal did. However introducing it now entails completeness, refresh/invalidation after package reload/delete, backend/window scoping, missing/error semantics and interaction with existing Apollo cache. Those responsibilities need investigation/approval; no concrete evidence yet that whole-inventory preload is required, faster, or simpler overall for current product. Do not equate internal inventory with public publication, and do not use performance speculation to dismiss it.

## Current work / next action
Keep current reviewed recovery design and finish actual ordinary Run/Send validation. Do not restart/replace active implementation or validation based on this assessment. If user wants broader simplification, scope a deliberate follow-up around exact access versus catalog semantics using real consumers; explicit intended-behavior changes require approval. No source/test/Git/runtime/data changes made for this assessment.

## Sources
All current paths relative to /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading:
- autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts269–299
- autobyteus-web/stores/agentTeamDefinitionStore.ts (public fetch/getter/root list/invalidation)
- autobyteus-web/services/agentOrgDefinition/agentOrgDefinitionReferences.ts (IR-002 in-progress shared exact-reader source)
- autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue (IR-002 local scope readiness)
- investigation-notes.md SR-004 historical path chain (canonical ticket directory)
- implementation-revision-record.md IR-002 (reported local results only)
Historical source paths/pin and actual API F-001 evidence remain in canonical investigation notes. No new test Pass or additional runtime defect inferred.
