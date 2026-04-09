# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

## Scope Classification

- Classification: `Small`
- Reasoning:
  - The fix is isolated to the skills frontend page, modal, detail view, and store behavior.
  - No backend contract or schema change is needed because missing skills already resolve to GraphQL `null`.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/skill-source-removal-refresh/workflow-state.md`
- Investigation notes: `tickets/done/skill-source-removal-refresh/investigation-notes.md`
- Requirements: `tickets/done/skill-source-removal-refresh/requirements.md`
- Runtime call stacks: `tickets/done/skill-source-removal-refresh/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/skill-source-removal-refresh/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Execution Complete`
- Notes:
  - Stage 5 reached `Go Confirmed` on `2026-04-09`.
  - Stage 6 implementation and targeted validation are complete for the stale skill-source removal fix.

## Plan Baseline (Freeze Until Replanning)

### Preconditions

- `requirements.md` is at least `Design-ready`: `Yes`
- `workflow-state.md` is current and Stage 5 review evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` Remove a skill source and immediately reconcile the skills list.
  - `UC-002` Remove a source while one of its skills is selected and automatically leave the stale detail state.
  - `UC-003` Request a skill that no longer exists and show an explicit non-loading recovery state.
- Spine Inventory In Scope:
  - `DS-001` Skill source mutation -> skills list refresh -> page selection reconciliation.
  - `DS-002` Skill detail fetch -> missing skill recovery.
- Primary Owners / Main Domain Subjects:
  - `SkillSourcesModal` owns source add/remove success handling.
  - `skills.vue` owns the selected-skill page state and should reconcile it against the current `skills` list.
  - `SkillDetail` owns detail-load presentation and must distinguish loading from not-found/error.
  - `skillStore.fetchSkill` owns the canonical missing-skill store state for one-skill fetches.
- Target Architecture Shape:
  - After successful `removeSkillSource`, the modal immediately triggers `skillStore.fetchAllSkills()` and awaits the refresh.
  - The page watches `skills` plus `selectedSkillName`; when the selected name is absent from the refreshed list, it clears the selection and returns to the main list view.
  - `SkillDetail` replaces the implicit `!skill => loading` rule with explicit `isLoading` and `loadError`/missing-skill state.
  - `fetchSkill` clears `currentSkill` when the backend returns `null` so store state stays truthful.
- New Owners/Boundary Interfaces To Introduce:
  - None. The change stays within existing component/store boundaries.
- API/Behavior Delta:
  - Skill source removal now refreshes the visible skills inventory immediately.
  - Missing skill detail no longer renders an infinite spinner.
- Key Assumptions:
  - `GET_SKILLS` after source removal returns the authoritative post-removal list.
  - Clearing the stale selection is the preferred experience rather than retaining a broken detail shell.
- Known Risks:
  - A global list refresh during source removal could momentarily toggle loading state.
  - Missing-skill recovery must not break normal loading for existing skills.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Implementation can start: `Yes`

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Action | Implementation Status | Planned Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `DS-001` | `SkillSourcesModal` | Refresh the main skills list after successful source removal | `autobyteus-web/components/skills/SkillSourcesModal.vue` | Modify | Completed | `SkillSourcesModal.spec.ts` |
| C-002 | `DS-001` | `skills.vue` | Clear `selectedSkillName` when the refreshed skills list no longer contains it | `autobyteus-web/pages/skills.vue` | Modify | Completed | `pages/__tests__/skills.spec.ts` |
| C-003 | `DS-002` | `SkillDetail` | Separate loading from missing/error state so removed skills do not spin forever | `autobyteus-web/components/skills/SkillDetail.vue` | Modify | Completed | `SkillDetail.spec.ts` |
| C-004 | `DS-002` | `skillStore` | Clear stale `currentSkill` when `GET_SKILL` resolves to `null` | `autobyteus-web/stores/skillStore.ts` | Modify | Completed | `stores/__tests__/skillStore.spec.ts` |

### Test Strategy

- Unit/component tests:
  - `SkillSourcesModal` should refresh the list after remove.
  - `skills.vue` should clear stale selection when the skills array drops the selected item.
  - `SkillDetail` should render a recoverable message when the skill is missing.
  - `skillStore.fetchSkill` should clear `currentSkill` when GraphQL returns `null`.
- Stage 7 note:
  - Targeted vitest coverage is sufficient for this small frontend state fix; no separate API/E2E harness change is planned unless the component/store tests prove insufficient.

## Execution Tracking (Stage 6+)

- 2026-04-09: Stage 5 reached `Go Confirmed`; Stage 6 unlocked.
- 2026-04-09: Implemented the source-removal refresh in `SkillSourcesModal.vue`.
- 2026-04-09: Added page-level stale-selection reconciliation in `pages/skills.vue`.
- 2026-04-09: Reworked `SkillDetail.vue` to distinguish loading from missing/error state and added a recovery action.
- 2026-04-09: Updated `skillStore.fetchSkill` to clear stale `currentSkill` when the GraphQL lookup returns `null`.
- 2026-04-09: Added targeted regression coverage in:
  - `autobyteus-web/components/skills/SkillSourcesModal.spec.ts`
  - `autobyteus-web/components/skills/SkillDetail.spec.ts`
  - `autobyteus-web/pages/__tests__/skills.spec.ts`
  - `autobyteus-web/stores/__tests__/skillStore.spec.ts`
- 2026-04-09: Executable validation passed:
  - `./node_modules/.bin/nuxi prepare`
  - `./node_modules/.bin/vitest run components/skills/SkillSourcesModal.spec.ts components/skills/SkillDetail.spec.ts pages/__tests__/skills.spec.ts stores/__tests__/skillStore.spec.ts`
