# ORG-LOCAL-AGENT-20260916-001 — Org-owned Team-local Agent loading

## Status and approval
Approved conversational requirements, formalized as SR-001, 2026-09-16. User explicitly affirmed the preceding explanation and requested continuation: “Yeah, exactly. I think the requirement is clear. Please continue.” Approval covers repairing the application reader while preserving Org-local Teams and Team-local Agents; comparing original personal implementation; no shared-package workaround. No new UI or automatic definition conversion is requested.

## Scope guardrail
Fix supported self-contained Agent Org loading: an Org may reference shared or Org-local Teams/Agents; an Org-owned flat Team may contain Team-local Agents. Preserve exact ownership, identity, existing shared/application-owned reading and invalid-reference rejection. No nested-Team revival, package rewriting, history migration/repair, startup-performance changes, runtime activation redesign, deletion redesign, provider rollout or release. Separate completed external conversion work is input, not this ticket's implementation.

## Scenarios / behaviors
- SCN-001 / BEH-001 Supported Normal Scenario: user imports/reloads an existing self-contained Org package or starts the app with it registered; Org, owned Team, and that Team's local Agents resolve; the Org is available rather than excluded. Observed Northstar/Classroom failure is evidence. Existing catalog/detail/launch selection should consume the same correct definitions.
- SCN-002 / BEH-002 Supported Normal Scenario: existing Org referencing shared Teams (Software Development Department), direct Org-local Agents, standalone Teams and application-owned Teams keep existing behavior.
- SCN-003 / BEH-003 Supported Explicit Edge Scenario: a registered package has a genuinely missing referenced owned Team/Agent. Existing admission must reject that invalid dependency, not substitute a same-named definition from a different owner; unrelated packages remain usable. This preserves existing reference integrity, not new policy.

## Requirements and acceptance
- REQ-001 / AC-001 (BEH-001): actual production file provider resolves Team-local Agents under Org-local Teams using current exact identities and existing files; import/reload/startup admission and catalog/detail make valid self-contained Orgs available. Synthetic filesystem-resolver success alone is insufficient.
- REQ-002 / AC-002 (BEH-001/002): owned Teams/Agents remain inside their Org package, same references/roles/handoffs, no extraction to shared definitions, no package/data writes during reads. Team-local scope is relative to immediate Team owner. No conversion/migration required.
- REQ-003 / AC-003 (BEH-002/003): preserve shared, application-owned, direct Org-local Agent resolution and same-name owner isolation; missing members remain unavailable without cross-owner fallback; unrelated valid packages remain admitted.
- REQ-004 / AC-004 (BEH-001/002): ordinary mounted member launch/read can use the resolved definition without introducing eager provider startup during catalog reads. Validate production resolution chain, not mocks that manually supply unavailable definitions.

## Verification intent / constraints
Durable tests must exercise real temporary authored packages, actual owned index and file providers, topology/handoff admission, positive and negative reference cases. API/E2E validates isolated import/reload/catalog/detail and mounted-member ordinary launch with an owned test runtime; do not touch user's running Electron, servers, conversations or external package bytes. Use synthetic equivalent fixtures for committed tests; private Classroom contents must never enter Git. Full provider/browser matrix, Electron rebuild and global strict-clean claims are not implied.

## Workspace
Isolated /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading; branch codex/org-owned-team-local-agent-loading. Fresh fetched base origin/requirements/flat-agent-organization-model = 65fc02a99d0a9608ba4da195cf108dc8aef255e7. Eventual finalization target same feature branch, not personal. No finalization authorization implied.

## Readiness
Current/desired/preserved outcomes, evidence, scenarios and scope are explicit. No material behavior decision outstanding. Product prototype N/A: no new visual experience. Architecture follows this approved basis. Related evidence: investigation-notes.md; no behavior-defining external supplement.

## CRR-001 recovery applicability (SR-003)
Approved SR-001 remains unchanged. REQ-004/AC-004 already includes ordinary frontend Run configuration and mounted-member use; the omitted frontend exact-reference consumption is Design Impact, not a new intended behavior. DS-REV-002 supplies the missing technical path. No renewed user approval, new Product surface, shared-catalog publication or runtime-policy change is authorized/implied. API-REV-001 remains Fail until ordinary launch/Send acceptance is rerun.

## SR-006 internal design refinement applicability
User explicitly requests updating design after the personal-branch improvement assessment. Intended user behavior in SR-001 remains unchanged. DS-REV-003 makes catalog-only lookup, exact reference resolution and ownership explicit in internal contracts and audited consumers; it does not approve new public visibility, standalone owned-Team actions, whole-inventory loading, global cache, schema/writer/runtime changes. Existing AC001–004 and ordinary enclosing-Org launch/Send remain acceptance authority.
