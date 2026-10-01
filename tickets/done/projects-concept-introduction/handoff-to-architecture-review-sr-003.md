# Handoff — Architecture Design Complete (SR-003, revision for ARCH-REV-001)

- Result classification: `Architecture Design Complete` (revised)
- Package identifier: `PROJ-CONCEPT-20260926-001` (`projects-concept-introduction`)
- Current solution revision: `SR-003` (supersedes the `SR-002` design basis reviewed in `ARCH-REV-001`)
- Classification: `task_size=Large`, `architectural_risk=High` (unchanged)
- Route: `get_handoff_rules` → rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`
- Expected output: Narrow re-review of `AR-001` and `AR-002` resolution. Areas: `DS-003`, `DS-004`/`DS-004b`, and the affected file-mapping rows. Result is Pass, Fail or Blocked.

## Approval Basis

- Requirements: `Approved` (`SR-001`, `APPROVAL-PROJ-CONCEPT-20260926-001`). `SR-003` does not change intended behavior, so no renewed approval is needed.
- Behavior-defining supplements: none.

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`
- Branch: `codex/projects-concept-introduction`
- Base: `origin/personal@1676bede9d910ca40dc0331390a35f203206fd41`
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/requirements-doc.md`
- Investigation notes (SR-003 evidence table at the end of Architecture Investigation Findings): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Design spec (`SR-003`): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-spec.md`
- Solution revision record (`SR-003` entry): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/solution-revision-record.md`
- Prior review report (`ARCH-REV-001`, basis `SR-001` + `SR-002`): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/architecture-review-revision-record.md`

## Finding Resolution

### AR-001 — link candidates

- Chosen mechanism: option (a), narrowed.
- The candidate policy is owned by Projects: new `autobyteus-web/utils/projects/linkableWorkspaces.ts` `selectLinkableWorkspaceIds(workspaces, linked)`. It keeps only workspaces where `kind === 'filesystem'`, `isTemp !== true`, the id starts with `agent_ws_`, and the workspace is not already linked.
- `WorkspaceSelector.vue` gains one opt-in prop, `candidateWorkspaceIds?: readonly string[] | null` (default `null`). When it is non-null:
  - only those ids are listed;
  - no temp entry is prepended;
  - there is no auto-select.
- The dialog also passes `autoSelectDefault=false`.
- The `null` default leaves all 7 run-configuration callers and the existing `WorkspaceSelector.spec.ts` unchanged.
- Already-linked workspaces are excluded rather than shown disabled, because `SearchableSelect` has no per-option disabled state.
- The server stays authoritative: it re-validates inside the locked updater.
- Where to find it:
  - design sections: `DS-003`, its narrative, the Ownership Map, the Reuse Check, the mapping rows, and a new Concrete Example;
  - Change Sequence steps 5–7.

### AR-002 — Advanced-table refresh

- `stores/serverSettings.ts`: the `APPLICATIONS_SETTING_KEY` branch is replaced by `CAPABILITY_STORE_BY_SETTING_KEY`, which maps `ENABLE_APPLICATIONS` → `useApplicationsCapabilityStore` and `ENABLE_PROJECTS` → `useProjectsCapabilityStore`. The store is resolved lazily inside the action.
- `ENABLE_SKILL_IMPROVEMENT` is left out on purpose, so SI behavior does not change. A test asserts this.
- Test intent:
  - the existing L387 test still passes;
  - a new `ENABLE_PROJECTS` refresh test is added;
  - the SI no-refresh test is added.
- Where to find it:
  - new spine `DS-004b`;
  - Removal Plan row, mapping row and example;
  - Change Sequence step 4.

### Residual notes adopted

- Uniqueness and duplicate-link checks run inside the `updateJsonArrayFile` updater.
- The route-gate table holds `use…Store` functions that are evaluated inside the middleware.
- `FeatureCapabilityToggleCard` takes a `testIdPrefix` prop, which keeps the inner `*-feature-status` and `*-feature-toggle` ids.

## Open Risks

- Run-config picker regression: mitigated by the `null` default and the unchanged existing spec.
- `P-002` (transient `skill_ws_*` visibility): no dependency, because the policy excludes non-`agent_ws_` ids.
- The existing risks from SR-002 are unchanged.
