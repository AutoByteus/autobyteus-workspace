# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale:
  - The stale-state bug is contained to the skills frontend data flow and selection handling.
  - The existing backend already removes the source and returns updated source metadata; no backend contract change appears necessary.
- Investigation Goal:
  - Confirm why a removed skill source leaves stale skill cards and why opening a removed skill hangs in loading.
- Primary Questions To Resolve:
  - Does source removal refresh the main skills list the same way source addition does?
  - What does the backend return when a skill no longer exists?
  - How does the detail page behave when the requested skill is missing?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-09 | Code | `autobyteus-web/components/skills/SkillsList.vue` | Verify how the list is loaded and how detail selection starts | Skills list loads only on mount; it emits `viewDetail` with the selected skill name. | No |
| 2026-04-09 | Code | `autobyteus-web/components/skills/SkillSourcesModal.vue` | Compare add/remove source flows | `handleAdd` triggers `skillStore.fetchAllSkills()`, but `confirmRemove` only removes the source and never refreshes the skills list. | No |
| 2026-04-09 | Code | `autobyteus-web/components/skills/SkillDetail.vue` | Verify removed-skill detail behavior | Template renders a loading state whenever local `skill` is falsy; if `fetchSkill` returns `null`, loading never ends. | No |
| 2026-04-09 | Code | `autobyteus-web/pages/skills.vue` | Check whether page selection is reconciled with list state | `selectedSkillName` is page-local and only changes on `showSkillDetail` or manual back; there is no watcher to clear selection when the skill disappears from `skills`. | No |
| 2026-04-09 | Code | `autobyteus-web/stores/skillStore.ts` | Verify missing-skill store behavior | `fetchSkill` returns `null` when GraphQL returns `null`, but it does not clear `currentSkill` in that branch. | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Confirm backend contract for missing skill lookup | `skill(name)` is nullable and explicitly returns `null` when the skill is absent. | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts` | Confirm remove-source server behavior | `removeSkillSource` updates configured source paths and returns updated source entries; it does not push a separate skills refresh to the client. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/pages/skills.vue`
  - `autobyteus-web/components/skills/SkillsList.vue`
  - `autobyteus-web/components/skills/SkillSourcesModal.vue`
  - `autobyteus-web/components/skills/SkillDetail.vue`
- Execution boundaries:
  - Pinia store boundary: `autobyteus-web/stores/skillStore.ts`
  - Pinia store boundary: `autobyteus-web/stores/skillSourcesStore.ts`
  - GraphQL boundary: `autobyteus-web/graphql/skills.ts`, `autobyteus-web/graphql/skillSources.ts`
  - Server GraphQL boundary: `autobyteus-server-ts/src/api/graphql/types/skills.ts`
- Owning subsystems / capability areas:
  - Skills page UI in `autobyteus-web/components/skills/`
  - Skills data store in `autobyteus-web/stores/`
- Optional modules involved:
  - None beyond the page, modal, detail component, and store layers.
- Folder / file placement observations:
  - The stale-state issue belongs in the existing skills UI/store layer; no new subsystem is needed.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillSourcesModal.vue` | `confirmRemove` | Removes a skill source | Missing the list refresh that `handleAdd` already performs | Source-change reconciliation should stay here or in nearby page/store flow |
| `autobyteus-web/pages/skills.vue` | `selectedSkillName` | Controls list vs detail view | No reconciliation when backing skill disappears | Parent page should own selection invalidation |
| `autobyteus-web/components/skills/SkillDetail.vue` | `loadSkillDetails` and root template | Loads and displays selected skill | `null` skill is rendered as loading forever | Detail component needs explicit missing-skill handling |
| `autobyteus-web/stores/skillStore.ts` | `fetchSkill` | Reads one skill by name | Returns `null` without clearing `currentSkill` | Store should avoid stale selected-skill metadata |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-09 | Probe | `sed -n '1,320p' autobyteus-web/components/skills/SkillSourcesModal.vue` | Remove-source flow updates only `skillSources`, not `skills` | Explains stale cards on the main list |
| 2026-04-09 | Probe | `sed -n '1,320p' autobyteus-web/components/skills/SkillDetail.vue` | Falsy `skill` is always treated as active loading | Explains endless spinner when the requested skill no longer exists |
| 2026-04-09 | Probe | `sed -n '180,240p' autobyteus-server-ts/src/api/graphql/types/skills.ts` | Missing skill returns `null` instead of throwing | Frontend must explicitly handle `null` as “not found” |

## Constraints

- Technical constraints:
  - Keep the fix within existing Pinia + GraphQL patterns.
  - Avoid introducing polling or file-watch infrastructure for a one-step source-management action.
- Environment constraints:
  - The repo currently has unrelated untracked files in the original `personal` worktree, so the ticket work is isolated in a dedicated worktree.
- Third-party / API constraints:
  - Apollo query for `GET_SKILL` can legitimately return `null` because the GraphQL schema marks `skill` nullable.

## Unknowns / Open Questions

- Unknown:
  - Whether any other UI entry points can land on `SkillDetail` with a removed skill name besides source removal.
- Why it matters:
  - The detail component should remain robust for any missing-skill navigation path, not only this modal flow.
- Planned follow-up:
  - Add direct missing-skill handling in the detail/page flow, not just source-removal refresh.

## Implications

### Requirements Implications

- Requirements must explicitly cover both list reconciliation after source removal and safe handling when a selected skill disappears.

### Design Implications

- The smallest defensible design is:
  - refresh the skills list after source removal,
  - reconcile `selectedSkillName` against the current `skills` store state at the page level,
  - treat `null`/errors in `SkillDetail` as a recoverable missing-skill state instead of infinite loading.

### Implementation / Placement Implications

- The fix should stay in:
  - `autobyteus-web/components/skills/SkillSourcesModal.vue`
  - `autobyteus-web/pages/skills.vue`
  - `autobyteus-web/components/skills/SkillDetail.vue`
  - `autobyteus-web/stores/skillStore.ts`
- Targeted frontend component tests should cover source removal refresh and missing-skill recovery.
