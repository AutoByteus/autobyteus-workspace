# Investigation Notes

## Package And Workspace

- Package identifier: ORG-HISTORY-UNIFIED-ROW-20260921-001
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target
- Branch: codex/org-history-unified-row-target
- Finalization target: origin/requirements/flat-agent-organization-model
- Fresh base revision: 9a0d2c3fd0d13a28e00e8649c515a7d56c673a32
- Bootstrap evidence: origin/requirements/flat-agent-organization-model was fetched on 2026-09-21; the new isolated worktree was created from that exact remote revision and was clean.

## User Request And Approval

The user observed that the delivered AgentOrg run row still exposes its arrow as a separate clickable control, while the Agent Team row feels like one unit. After the source comparison was reported, the user explicitly approved a new small ticket: “Yes. Yeah. Please, the bootstrap are another small ticket.”

This is a new, approved behavior refinement. It does not invalidate the correctness of the prior delivery against its then-approved requirements: the prior package explicitly required the dedicated chevron to remain disclosure-only. The new request supersedes only that control-shape decision.

## Evidence Sources And Commands

### Canonical prior package read

- tickets/done/org-history-row-toggle/handoff-summary.md
- tickets/done/org-history-row-toggle/requirements-doc.md
- candidate commit c2b64742bf082da128163757235f777339616a63

Commands:
- sed -n on the prior handoff and requirements.
- git show c2b64742bf082da128163757235f777339616a63 for the exact delivered source/test delta.

Observation:
- Prior BEH-002, REQ-003 and the non-goals intentionally preserved a dedicated disclosure chevron.
- The prior implementation therefore matched the approved baseline, but the user's new clarification changes that intended interaction.

### Current AgentOrg source

Path:
- autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue

Observed current shape at base revision:
- Lines 27–38 render a dedicated chevron button with its own aria-expanded, aria-controls, aria-label and click.stop handler.
- Lines 39–53 render a separate primary open/toggle button with treeitem semantics.
- openRun toggles the exact rootRunId and invokes onOpenAgentOrgRun.
- Stop remains a separate button with click.stop.

Consequence:
- The arrow and summary are two focusable interactive controls even though both now toggle disclosure.
- Clicking the arrow toggles disclosure without opening/selecting; clicking the primary summary toggles and opens/selects.
- This is exactly the inconsistency the user identified.

### Current Agent Team comparator

Path:
- autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue

Observed shape at lines 231–253:
- One primary Team run button contains the chevron icon, activity dot and run label.
- The icon is not an independent button.
- The button invokes the existing Team selection action.
- Lifecycle/archive/delete controls remain outside and propagation-isolated.

Conclusion:
- The user's comparison is source-confirmed.
- Exact parity requires merging the Org chevron glyph into the Org primary button rather than adding another handler.

### Existing regression coverage

Path:
- autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts

Observed coverage:
- Dedicated-chevron tests currently assert disclosure-only activation with no open action.
- Primary-row tests assert bidirectional toggle, open invocation, ARIA state, Stop isolation, mounted-Team isolation and selection reveal.
- The test already uses the real tree-state composable and rendered component.

Required test change:
- Replace the obsolete separate-chevron contract with a single-primary-control structural assertion.
- Prove that activation on the chevron area bubbles through the same primary button and causes one toggle/open action, not two.
- Preserve Stop, sibling, selection, draft/conversation and mounted-Team assertions.

## Scenario Basis

| Scenario | Validity | Evidence |
| --- | --- | --- |
| Pointer activation of the unified primary Org run row | Supported Normal Scenario | Explicit user request; current Team comparator; current Org primary action |
| Space/Enter activation of the primary button | Supported Normal Scenario | Native button contract and prior browser validation |
| Stop isolation | Supported Normal Scenario | Current source and prior validation |
| Clicking timestamp as part of the primary row | Unsupported for this request | Timestamp remains outside the primary button in both current shapes |
| Changing nested Team/member disclosure | Out of scope | User requested top-level Org run row parity only |

## Architecture Investigation

### Current execution path

Pointer or native keyboard activation -> AgentOrg primary button -> openRun(run) -> tree state toggleAgentOrgRun(rootRunId) -> existing onOpenAgentOrgRun(run) selection/navigation action.

The dedicated-chevron path currently bypasses openRun and calls tree state directly. The requested design removes that parallel path.

### Ownership and boundaries

- WorkspaceAgentOrgHistoryCollection.vue owns the rendered AgentOrg history-row composition and local handler binding.
- useWorkspaceHistoryTreeState remains the disclosure-state owner.
- Workspace history selection actions remain the navigation/selection owner.
- No backend, API, persistence or runtime owner participates.

### Design-health finding

- Change posture: Behavior Change / local UI correction.
- Root cause: duplicated local interaction path created by preserving a dedicated chevron while later adding primary-row toggling.
- The duplicate path now exposes two semantic controls for one conceptual action.
- A clean-cut removal is preferable to a compatibility wrapper or dual handler.

## Persisted Data And Operational Evidence

- No persisted model, serialization, API or storage shape changes.
- No migration, reset, fallback or compatibility behavior is required.
- Existing run history and selection state are read and manipulated through unchanged owners.
- Previous browser/API evidence established that these renderer interactions do not mutate history data or invoke inference; downstream validation should carry this preservation expectation.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Status / Approval |
| --- | --- | --- | --- | --- |
| requirements-doc.md | Solution Designer | Approved intended behavior and ACs | Current ticket | Approved SR-001 |
| tickets/done/org-history-row-toggle/requirements-doc.md | Prior Solution package | Historical reason for separate chevron | Prior ticket | Read-only, superseded only for control shape |
| tickets/done/org-history-row-toggle/handoff-summary.md | Delivery | Prior delivered behavior/evidence | Prior ticket | Read-only |
| WorkspaceAgentOrgHistoryCollection.vue | Frontend | Current two-control Org row | Current production path | Read |
| WorkspaceHistoryWorkspaceSection.vue | Frontend | Team one-control comparator | Existing comparator | Read |
| WorkspaceAgentOrgDisclosure.spec.ts | Frontend tests | Current regression owner | Current test path | Read |

## Unknowns And Risks

- No material product or architecture unknown remains.
- The exact CSS spacing/focus class may need a minor adjustment after rendering because moving the icon changes which element owns focus. This is bounded to the same component and must preserve the established row geometry.
- If implementation discovers a shared component or broader navigation contract change is necessary, it must return as Design Impact rather than silently expand scope.
