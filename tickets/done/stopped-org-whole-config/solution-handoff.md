# Solution Handoff — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Result

- Classification: `Architecture Design Complete`
- Current solution revision: `SR-003`
- Approved requirements basis: `SR-002`
- Task size: `Medium`
- Architectural risk: `High`
- Architecture review state: pending current-rule routing.

## Original Request And Goal

The user observed that stopped AgentOrg Settings opens only the selected Agent configuration, while stopped Agent Team Settings opens the complete enclosing Team configuration. They requested Team/original-personal parity: clicking Settings on any configured Agent in a stopped AgentOrg must show the whole AgentOrg configuration, including root/global settings, direct Agents, mounted Teams, and their configured Agents. They clarified and approved that the visible form should be the same familiar AgentOrg launch configuration form, with existing-run locks and Save semantics.

## Approval

- User clarification: the UI should show the same AgentOrg configuration form as launch because that is the natural Team-consistent experience.
- Exact approval reference, 2026-09-17: “Yes ... when we click one individual agent ... it also loads the same configuration form for the whole agent team. So we should use the same behavior for AgentOg.”
- Approved behavior includes Team-consistent inheritance/change policy, same-runtime model/model-parameter editing, fixed runtime/workspace/tool policy, one coherent Save, stopped-only guard, no provider activation on inspect/save, and full run-data preservation.

## Workspace And Repository Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config`
- Branch: `codex/stopped-org-whole-config`
- Fresh resolved base: `64852674b5f003aea2a169233093f12a9f80ffba`
- Base/finalization target: `origin/requirements/flat-agent-organization-model`, not `personal`.
- Current changes: solution artifacts only under `tickets/in-progress/stopped-org-whole-config`; no production/test implementation authored by Solution Designer.
- No user app, runtime, profile, provider, history, database, or external definition package was modified.

## Authoritative Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config/design-spec.md`
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config/solution-handoff.md`

## Evidence Summary

- The previous completed ticket intentionally implemented member-only Settings; this is a new approved behavior change, not a regression against that scope.
- Current AgentOrg configured-member Settings is an exact-member panel/composable/client/GraphQL/domain/mutator path.
- Current stopped Team Settings uses one canonical whole-Team editor, parent-linked override planner, multi-scope validation, one tree write/readback, and reconciliation.
- AgentOrg execution-tree schema v1 already stores root, direct Agent, mounted Team, and Team-member resolved launch configuration. Tasks are separate and excluded.
- AgentOrg launch already owns the familiar form hierarchy, but its controller is new-run-specific. A shared presentational form body is the correct reuse seam.
- The pinned `personal` comparison confirms one enclosing-Team editor for nested-Team-era interaction; it is evidence only, not target architecture.

## Intended Technical Result

1. Normalize Settings entry from either configured placement to explicit `{ kind: 'agent_org', orgRunId }`.
2. Extend the existing-run editor/store to AgentOrg rather than duplicate a second save/reconcile state machine.
3. Extract one `AgentOrgRunConfigForm` body used by launch and stopped Settings; controllers retain `Run` versus `Save` ownership.
4. Extract a shared hierarchical model-config draft policy. AgentOrg adapter creates root → direct Agent/mounted Team → Team-Agent links; propagation recurses only through linked, not-directly-edited descendants.
5. Replace exact-member Org read/update with whole-run canonical read, batched options query, and aggregate update mutation.
6. Under `AgentOrgRunManager.withTransition`, resolve all configured targets, reject task/kind/address mismatches, `validateMany`, apply one immutable next tree, write once, read back once, and return canonical/failure/indeterminate state.
7. Generalize retained context adoption to defensively validate and publish a whole model-only tree in place without replacing conversation, Activity, drafts, attachments, selection, or identities.
8. Remove exact-member UI/API/domain paths completely; no dual behavior or sequential fallback.

## Persisted Data Decision

`Directly Usable — No Migration`. The execution-tree schema and storage shape do not change; only existing model identifier/config fields can change after explicit Save. No startup scan, rewrite, migration, reset, or compatibility reader is authorized.

## Required Verification Emphasis

- Direct and mounted configured-member gear both open the same whole Org form.
- Launch and existing modes use the same form structure while existing locked fields and Save semantics remain truthful.
- Root and Team changes recursively affect linked descendants; explicit/directly edited overrides remain independent; existing Team behavior does not regress.
- Root plus multiple member changes save atomically; invalid/unavailable scope applies none; persistence loss/uncertainty requires canonical refresh without replay.
- Active root/offline leaf, stale target, binding change, submission pending, application-owned/ineligible, archived, and task-address controls remain safe.
- Successful Save→reopen→ordinary Send uses saved scope configurations with no provider activation during inspect/save.
- Identities, topology, locked fields, history/conversation, Activity, attachments, drafts, tasks, handoffs, application binding, and untouched values remain preserved.
- AgentOrg `+`, launch, standalone Agent, and Team paths remain unchanged.

## Constraints And Non-Goals

- No definition/package edits, task configuration, runtime/workspace/tool-policy changes, migration/data repair, release/deployment, or Electron build.
- Stopped canonical projection must not depend on current mutable definition catalogs.
- Direct API tests do not replace actual supported UI reachability validation.
- No implementation/finalization authority is implied by requirements approval.

## Open Risks

- High-risk items are aggregate persistence, concurrent lifecycle transitions, recursive inheritance correctness, canonical context publication, and launch-form extraction regression. The design contains explicit owners and tests for each; no unresolved requirement/design decision remains.

## Expected Next Output

Apply the current handoff rule for a completed `Medium / High` design. If architecture review applies, review the approved behavior-to-spine mapping, ownership boundaries, persistence/no-migration decision, clean removal plan, shared-form extraction, and verification sufficiency. On Pass, forward the same cumulative package through the rule-selected next stage. On a finding, return it to the correct owner without expanding requirements silently.

## Handoff Routing

- Fresh `get_handoff_rules` lookup on 2026-09-17 selected the rule: a completed or revised `Architecture Design Complete` package with `task_size=Large` or `architectural_risk=High`, backed by current explicit user approval, routes to independent architecture review.
- Applied recipient: `/software_engineering_team/architecture_reviewer`.
- No implementation, API/E2E, Delivery, or additional recipient is authorized concurrently by this handoff.
