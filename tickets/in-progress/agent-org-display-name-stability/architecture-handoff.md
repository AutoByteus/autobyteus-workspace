# Architecture Handoff — Agent Org Role-Name Stability

## Result

- Package identifier: `AGENT-ORG-DISPLAY-NAME-STABILITY-20260921-001`
- Current solution revision: `SR-005`
- Classification: `Architecture Design Complete`
- Task size: `Medium`
- Architectural risk: `Low`
- Approval state: Requirements baseline `SR-004` explicitly approved by the user on 2026-09-21
- Result owner: Solution Designer

## Original Request And Approved Goal

The user reported that Agent Org list labels first appear as lowercase roles and then change into differently cased Agent/Team definition names; detail can briefly show a long internal `agent-org-owned-*` reference before changing. They requested a ticket from current `personal`, root-cause analysis, comparison with the Agent Team list, and a correct fix.

After reviewing the Team list/detail behavior, the user explicitly selected local role/member names as the Agent Org browsing identity: use `memberName` on list and detail like the Agent Team experience, and remove redundant asynchronous name lookups. The approved goal is stable human-readable role labels, never referenced definition names or opaque refs.

## Workspace And Finalization Context

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability`
- Branch: `requirements/agent-org-display-name-stability`
- Resolved base: `origin/personal@8af2ec935028f9fe7bc912b6bd2b9552c625c253`
- Finalization target: `origin/personal`
- Repository status: Solution artifacts are uncommitted in the isolated worktree; implementation has not started.

## Approved Scope And Constraints

- List and direct detail labels use humanized `AgentOrgMember.memberName` from the first rendered frame.
- Team coordinator/nested endpoint labels use Team-local `memberName`/`coordinatorMemberName` when shown.
- No member-name location displays a referenced Agent/Team definition name or opaque `ref`.
- List performs zero per-member exact Agent/Team queries and does not preload Agent/Team catalogs solely for labels.
- Reference/topology reads remain only for evidenced non-label detail/authoring/navigation/launch behavior; results never rename member labels.
- Preserve exact ID/scope/owner validation, Team topology, authoring selectors, handoffs, navigation/actions, ordering/types, launch readiness, stale-result rejection, and package/persistence state.
- No backend schema/enrichment, persistence/migration, global cache, route redesign, runtime activation, or Product prototype.

## Root Cause And Architecture Decision

The current UI combines two identities: Org/Team-local role names and referenced definition names. Catalog chips own N-per-member transport and deliberately swap from role to definition name. Detail drops membership context and reconstructs names from refs/resolved definitions. One component watcher also mixes read-only detail topology with mutable authoring validation.

The completed design makes a clean ownership split:

1. Add one pure collaboration role-label formatter.
2. Make catalog chips transport-free and delete the shallow display-name loader/refresh token.
3. Retain `AgentOrgMember` context in detail row models; refs remain action keys only.
4. Reuse the existing admitted `agentOrgEndpointCatalog` query for read-only detail Team coordinator/handoff role topology, only when mounted Teams require it.
5. Keep the existing full exact-reference service for create/edit, run configuration, and Org-return Team detail; remove only its obsolete shallow display-reader export.
6. Scope Agent/Team catalog loading to create/edit instead of every Agent Org view.

## Supported Scenarios And Verification Contract

- `SCN-001`: Cold/cached Agent Org list and search show stable humanized roles with zero exact definition-name operations.
- `SCN-002`: Direct/linked detail shows direct Org roles; coordinator/handoff secondary content uses Team-local roles and truthful loading/unavailable states.
- `SCN-003`: Reference settlement/failure, Reload, route change, and backend-binding change cannot rename labels or publish stale topology.
- Acceptance criteria: `AC-001`–`AC-005` in the approved requirements.

Implementation validation must include deferred first-frame tests, list GraphQL-operation counts, role/accessibility equality, detail endpoint-catalog success/failure/stale cases, authoring/full-reference preservation, Team-return navigation, Reload, localization, and browser network/UI verification.

## Evidence And Sources

- User screenshots:
  - `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/evidence/agent-org-list-provisional-labels.png`
  - `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/evidence/agent-org-list-canonical-labels.png`
- Current list/detail source: `autobyteus-web/components/agentOrgs/AgentOrgCatalogMemberChips.vue`, `AgentOrgExperience.vue`
- Current reference service/query: `autobyteus-web/services/agentOrgDefinition/agentOrgDefinitionReferences.ts`, `graphql/queries/agentOrgDefinitionQueries.ts`
- Existing endpoint projection: `autobyteus-server-ts/src/api/graphql/types/agent-org-definition.ts`, `src/agent-collaboration/definition/definition-endpoint-catalog.ts`
- Comparison source: Agent Team page/list/card/detail/store/query files recorded in `investigation-notes.md`
- Prior historical package: `tickets/done/readable-org-catalog-member-names/`

## Canonical Artifacts

- Requirements: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/requirements-doc.md`
- Investigation: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/investigation-notes.md`
- Design: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/design-spec.md`
- Revision history: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/solution-revision-record.md`
- Approval record: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/requirements-approval-request.md`
- This handoff: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/architecture-handoff.md`

## Risks, Evidence Limits, And Blockers

- Controlled risks: preserve full structural validation while deleting display hydration; keep membership context in detail rows; use mounted address rather than repeated definition ID to match Team endpoint entries; preserve definition names in authoring selection.
- Evidence uncertainty: No separate detail screenshot was supplied; source inspection strongly identifies the reported long text as a ref-based member/coordinator fallback (`ASM-001`).
- Validation limit: The focused baseline test attempt did not run because `pnpm` was absent from PATH and this isolated worktree has no installed frontend dependencies. No test pass or implementation claim is made.
- Blockers: None for implementation. Escalate if the existing endpoint catalog cannot preserve coordinator/handoff detail or if a backend contract change becomes necessary.

## Expected Downstream Output

Implement the approved SR-005 design in this isolated task workspace, validate implementation-scoped behavior and rendered frontend quality, and produce the Implementation Engineer's durable handoff package. Preserve the `Medium`/`Low` direct route unless implementation discovers a material design impact.

## Handoff Rule Outcome

Matched: Architecture Design Complete with `task_size=Medium` and `architectural_risk=Low`.

- Selected direct route: `/software_engineering_team/implementation_engineer`
- Required action: Implement and validate the approved SR-005 package using the canonical artifacts above.
