# Solution Handoff — Stopped AgentOrg History Archive/Delete

## Result

- Result classification: `Architecture Design Complete`
- Package identifier: `ORG-HISTORY-ARCHIVE-DELETE-20260921-001`
- Current solution revision: `SR-002`
- Requirements baseline: `SR-001 Approved`
- Task size: `Medium`
- Architectural risk: `High`
- Route selected by current handoff rules: `Architecture Design Complete` with `architectural_risk=High` -> `/software_engineering_team/architecture_reviewer`.
- Expected next action: Perform independent architecture review of the approved cumulative solution package before implementation.

## Original Request And Goal

The user reported that stopped AgentOrg history rows have no Archive/Delete buttons while stopped standalone Agent Team rows do, supplied screenshots of both surfaces, and requested a new ticket based on `origin/personal`. The desired result is Team-parity user behavior for the AgentOrg root: non-destructive Archive, confirmed permanent Delete, stopped-only eligibility, exact-root lifecycle protection, truthful feedback, and no cross-root/definition/workspace mutation.

## Approval Basis

- Exact approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/requirements-doc.md`
- Approval reference: User message on 2026-09-21 — “basically, this functionality is similar to agent team, please now work on it”.
- Approved scope: `BEH-001`–`BEH-005`, `REQ-001`–`REQ-009`, `AC-001`–`AC-005`, `SCN-001`–`SCN-004`.
- Product/UI basis: Existing stopped Agent Team row, confirmation, pending and feedback behavior is the approved comparator. Product Design was not requested and no new visual concept is introduced.
- Renewal status: No approval gap remains; `SR-002` changes technical design only, not approved intent.

## Workspace And Repository Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions`
- Branch: `codex/org-history-archive-delete-actions`
- Resolved base remote/branch/revision: `origin/personal` / `personal` / `8db5101f413a88216b90d55ec563e3b5f80b1c9b`
- Finalization target: `origin/personal`
- Isolation: Fresh isolated worktree; unrelated modified/untracked files in the shared `personal` checkout were not touched.
- Implementation status: Not started. Current changes are Solution Designer-owned ticket documents only.

## Investigation Result

This is not a CSS-only omission:

- `WorkspaceAgentOrgHistoryCollection.vue` renders active Stop only and has no stopped Archive/Delete path.
- Tree/index formats already include `archivedAt`, and the mixed history reader already hides inactive archived AgentOrg rows.
- `AgentOrgRunHistoryCatalogService` contains an unused `deleteStored`, but no archive command and no supported service/GraphQL/web wiring for either operation.
- The unused delete pre-checks `manager.getActive` outside the manager transition lane, so exposing it directly would permit a restore/configuration/termination race.
- `AgentOrgRunManager` already owns an exact-root `withTransition` lane; the AgentOrg catalog owns tree/index/package persistence; `AgentOrgRunService`/resolver own the public subject boundary.
- The web already has Agent/Team mutation, confirmation, pending and toast owners plus exact AgentOrg context disconnect and router-aware composition.
- Existing formats are directly usable. No migration, compatibility layer or new archive representation is needed.

Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/investigation-notes.md`.

## Architecture Result

The design uses four spines:

- `DS-001`: stopped AgentOrg Archive from row through explicit API to manager-gated catalog tree/index commit and post-success client reconciliation.
- `DS-002`: confirmed Delete through explicit API to manager-gated exact index/package removal with compensation and post-success reconciliation.
- `DS-003`: bounded manager exact-root transition that rejects active/conflicting roots before catalog mutation.
- `DS-004`: GraphQL return to target-only row/context cleanup, quiet refresh and selected-route exit; failure preserves local state.

Key decisions:

1. Add `AgentOrgRunManager.withInactiveHistoryMutation`; do not expose private transition internals or rely on a loose active pre-check.
2. Keep `AgentOrgRunHistoryCatalogService` as the only tree/index/package mutation owner; replace its old unsafe delete body and add archive with bounded durable readback/compensation.
3. Expose `archiveStoredAgentOrgRun(orgRunId)` and `deleteStoredAgentOrgRun(orgRunId)` through `AgentOrgRunService` and the AgentOrg resolver. Keep `CollaborationRootHistoryService` read-only.
4. Add subject-specific web mutation documents/store actions, prune/disconnect only the exact root after server success, and keep route navigation in the router-aware history panel.
5. Extend the shared mutation interaction using a discriminated delete target instead of adding a third parallel nullable ID.
6. Render stopped-only Team-aligned icons with accessible localized copy and `@click.stop`; active roots retain Stop only.
7. Use existing tree/index `archivedAt`; direct use, no migration.

Canonical design: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/design-spec.md`.

## Scope And Preserved Boundaries

In scope:
- Archive one stopped top-level AgentOrg history root.
- Confirm and permanently delete one stopped top-level AgentOrg history root.
- Reject stale/racing active/conflicting commands at the authoritative manager boundary.
- Exact post-success list/context/route cleanup and localized feedback.

Out of scope:
- AgentOrg definition deletion, shared definition deletion or workspace removal.
- Mounted Agent/Team lifecycle controls.
- Archived-history browser, unarchive, bulk retention, trash/recovery, export or backup.
- Changes to Stop, restore-by-Send, whole-Org Settings, startup or standalone Agent/Team behavior.
- Schema/version changes, migration, repair scans, provider inference, release/deployment.

Preserve:
- Row disclosure/open/member navigation and sibling state.
- Stop-only active-root policy.
- Every unrelated context, selection, draft, conversation, task, Activity record, attachment, provider binding, history row and package.
- No activation/restore/provider call merely to archive/delete.

## Persisted Data Decision

- Decision: `Directly Usable — No Migration`.
- Archive changes only the exact target tree/index `archivedAt` projections and retains the complete package.
- Delete's only acceptable loss is the explicitly confirmed exact target package/index row.
- Exact safe `orgRunId` and path derivation are mandatory; definitions/workspaces/siblings are not mutation subjects.

## Classification Evidence

- `task_size=Medium`: Several existing backend and frontend owners change, but no new subsystem, schema, route family or migration is introduced.
- `architectural_risk=High`: The change introduces destructive persisted-data behavior plus material lifecycle concurrency, API and ownership-boundary requirements.
- Escalation: Schema/migration, definition/workspace mutation, generic cross-family APIs, archive browsing/unarchive, mounted-Team lifecycle, or a new owner is a Design Impact or Requirement Gap as specified in the design.

## Validation Expectations

Implementation/review should preserve the focused inventory in `design-spec.md`, including:

- Manager serialization and stale-active rejection tests.
- Catalog archive/delete success, unsafe/unknown/active rejection, target/sibling preservation, and injected compensation/readback failure tests.
- Service/GraphQL exact-identity tests and no activation/provider effects.
- Web store/composable/component tests for stopped/active controls, click isolation, confirmation cancel/confirm, pending exclusion, exact cleanup, route exit and Agent/Team regression.
- en/zh-CN localization guard/audit and server/web builds.
- Actual browser/API validation against isolated disposable data with before/after filesystem/index inventory; do not delete or archive retained user history.

## Risks And Blockers

- Current blockers: None for review.
- Main risks: same-root lifecycle race, partial multi-file mutation, unsafe identity/path, stale selected context after success, click propagation, and regression in shared Agent/Team confirmation policy.
- Mitigation: manager transition boundary; catalog-owned readback/compensation; safe identity resolution; post-success exact cleanup; component/store/concurrency/preservation tests.
- Residual qualification: Catastrophic failure during compensation must be reported as indeterminate and never as success; it does not authorize a compatibility path or optimistic local removal.

## Canonical Artifact Inventory

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/solution-handoff.md`
- User AgentOrg screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_eb5d81993043__image.png`
- User Team comparator screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_95c5df976e09__image.png`

## Expected Output From The Next Owner

Review the approved Medium/High architecture against the requirements, source evidence, ownership boundaries, lifecycle/data-continuity rules, file mapping and validation plan. If it passes, route the same existing ticket execution to implementation under current rules. If a finding changes intended behavior, return a Requirement Gap; if it changes only structure/ownership, return Design Impact with exact IDs and source evidence.
