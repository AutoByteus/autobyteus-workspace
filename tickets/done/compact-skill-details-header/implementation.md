# Implementation: Compact Skill Details Header

## Scope Classification

- Classification: `Small`
- Reasoning: Local Vue/Nuxt UI change to a single skill-detail view plus adjacent localization and unit tests; no backend/API/storage/workspace architecture changes.
- Workflow Depth: `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> review to `Go Confirmed` -> finalize baseline -> implementation execution.

## Upstream Artifacts

- Workflow state: `tickets/in-progress/compact-skill-details-header/workflow-state.md`
- Investigation notes: `tickets/in-progress/compact-skill-details-header/investigation-notes.md`
- Requirements: `tickets/in-progress/compact-skill-details-header/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/compact-skill-details-header/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/compact-skill-details-header/future-state-runtime-call-stack-review.md`
- Proposed design: `N/A for Small scope`

## Document Status

- Current Status: `Re-entry Design Updated`
- Notes: Stage 7 user validation rejected the overlay/popover disclosure. Design is revised to inline `More`/`Less` expand-collapse before re-entering implementation.

## Re-entry Design Update

| Date | Trigger | Classification | Design Decision |
| --- | --- | --- | --- |
| 2026-06-13 | User rejected overlay screenshot during Stage 7 validation | Requirement Gap | Replace full-description overlay/popover with inline disclosure: `More` expands the description inside normal header flow, `Less` collapses it. The expanded state may temporarily push the workspace down, but it must never cover file explorer/editor content. |

## Plan Baseline

### Preconditions

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed`: `Yes`
- Missing-use-case discovery sweeps completed for final two clean rounds: `Yes`
- No newly discovered use cases in final two clean rounds: `Yes`

### Solution Sketch

#### Use Cases In Scope

- `UC-001`: Open skill detail page and see compact two-line header above existing workspace.
- `UC-002`: Open full description through inline `More` expansion and collapse it with `Less`, without covering the workspace.
- `UC-003`: Validate the compact header with unit/static/browser evidence.

#### Spine Inventory In Scope

| spine_id | Scope | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Skills detail view | Existing file workspace renders below compact header | `SkillDetail.vue` | Governs the persistent layout and header height reduction. |
| DS-002 | Bounded Local | User clicks `More`/`Less` in header | Full description expands/collapses inline | `SkillDescriptionSummary.vue` local disclosure state | Governs on-demand description behavior without overlaying or covering workspace content. |
| DS-003 | Validation | Developer runs tests/browser check | Acceptance criteria evidence recorded | Tests + Stage 7 artifact | Ensures the UX behavior is durable and verifiable. |

#### Primary Owners / Main Domain Subjects

- `pages/skills.vue`: owns list/detail switching and selected skill identity. It should remain unchanged.
- `SkillDetail.vue`: authoritative owner of the skill-detail view layout and skill metadata header.
- `SkillVersioningPanel.vue`: authoritative owner of versioning controls. It already exposes compact mode and should not be bypassed or duplicated.
- `SkillDescriptionSummary.vue`: local child owned by the skill-detail UI for description summary and inline disclosure state.
- `SkillWorkspaceLoader`, `FileExplorer`, `FileExplorerTabs`: authoritative owners of workspace resolution and file workspace UI. They should remain unchanged.

#### Requirement Coverage Guarantee

All requirements `REQ-001` through `REQ-007` map to `UC-001`, `UC-002`, or `UC-003` in `requirements.md` and to `DS-001`, `DS-002`, or `DS-003` here.

#### Design-Risk Use Cases

- `DR-001`: Avoid overlay/popover implementation that covers workspace content. Expected observable outcome: full description expands inline only after explicit `More`, collapses with `Less`, and no absolute overlay is rendered.
- `DR-002`: Avoid duplicating versioning controls. Expected observable outcome: `SkillDetail.vue` continues to delegate versioning UI to `SkillVersioningPanel mode="compact"`.

#### Target Architecture Shape

Keep a flat, local view-level design because ownership is already clear:

```text
pages/skills.vue
  -> SkillDetail.vue
      -> compact metadata header (owned locally)
      -> SkillVersioningPanel compact mode (existing versioning owner)
      -> SkillDescriptionSummary (description summary + inline More/Less disclosure)
      -> SkillWorkspaceLoader
          -> FileExplorer
          -> FileExplorerTabs
```

No shared overlay/popover abstraction is introduced. The existing local `SkillDescriptionSummary.vue` child remains appropriate because only the skill-detail header needs this inline disclosure behavior.

#### New Owners / Boundary Interfaces To Introduce

- None. Keep disclosure state local to `SkillDescriptionSummary.vue`:
  - `isDescriptionExpanded`
  - computed `skillDescription`
  - `toggleDescriptionExpansion` / collapse via the same toggle
  - no document-level outside-click listener because this is not an overlay.

#### API / Behavior Delta

- Replace header template structure:
  - From: back row + main row + full paragraph.
  - To: row 1 identity/actions + row 2 one-line description summary with `More`.
- Add local inline expand/collapse behavior for the full description.
- Add localized strings for `More`, `Less`, and inline disclosure ARIA copy.
- Add tests for loaded skill header and inline description expand/collapse interaction.

#### Key Assumptions

- `skill.description` is a string; if empty, use existing no-description copy and omit `More`.
- Existing versioning panel remains layout-compatible in row 1.
- No click-outside behavior is needed because expanded text is inline content controlled by `More`/`Less`.

#### Known Risks

- On narrow viewports, title/actions may need wrapping. The layout should allow row 1 to wrap while preserving row 2 truncation.
- Existing Electron/frontend server may not serve this worktree's code; Stage 7 must record validation environment accurately.

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
  - Final review gate line: `Implementation can start: Yes`

### Principles

- Bottom-up: update tests/localization primitives before/with component behavior.
- Test-driven: add component tests for the new interaction.
- No backward-compatibility shims or legacy branches.
- Preserve authoritative boundaries: do not duplicate versioning or workspace behavior in `SkillDetail.vue`.
- Keep file placement under existing skill UI owners.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-003 | Skill localization | `localization/messages/{en,zh-CN}/skills.ts` | Requirements | New visible text must be localized before component uses it. |
| 2 | DS-001, DS-002 | Skill detail view | `components/skills/SkillDetail.vue` | Localized copy | Main behavior/layout change. |
| 3 | DS-003 | Component tests | `components/skills/SkillDetail.spec.ts` | Component implementation | Durable validation for rendering and inline expansion behavior. |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Skill detail layout | `autobyteus-web/components/skills/SkillDetail.vue` | same | Skill detail web UI | Keep + Modify | Unit/browser validation |
| Skill detail tests | `autobyteus-web/components/skills/SkillDetail.spec.ts` | same | Skill detail component tests | Keep + Modify | Vitest |
| English strings | `autobyteus-web/localization/messages/en/skills.ts` | same | Skill UI English localization | Keep + Modify | Guard/audit/source inspection |
| Chinese strings | `autobyteus-web/localization/messages/zh-CN/skills.ts` | same | Skill UI Chinese localization | Keep + Modify | Guard/audit/source inspection |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-003 | Skill localization | New `More`/`Less` inline disclosure strings | `autobyteus-web/localization/messages/en/skills.ts`, `autobyteus-web/localization/messages/zh-CN/skills.ts` | same | Modify | Stage 5 Go | Completed | N/A | N/A | N/A | N/A | Planned | Updated user-visible and ARIA strings for inline disclosure. |
| C-002 | DS-001, DS-002 | Skill detail view | Compact two-line header shell delegating description row to owned child component | `autobyteus-web/components/skills/SkillDetail.vue` | same | Modify | C-001 | Completed | `SkillDetail.spec.ts` | Passed | N/A | N/A | Planned | Workspace subtree preserved; source file remains below 500 non-empty lines. |
| C-003 | DS-003 | Skill detail tests | Unit coverage for header and inline expansion | `autobyteus-web/components/skills/SkillDetail.spec.ts` | same | Modify | C-002, C-004 | Completed | `SkillDetail.spec.ts` | Passed | N/A | N/A | Planned | Covers AC-001..AC-005 for inline expand/collapse. |
| C-004 | DS-002 | Skill description summary | Owned child component for one-line summary and inline full-description expansion | N/A | `autobyteus-web/components/skills/SkillDescriptionSummary.vue` | Create/Rework | C-001 | Completed | `SkillDetail.spec.ts` | Passed | N/A | N/A | Planned | Removed overlay code and implemented inline disclosure. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | AC-001 | DS-001 | Solution Sketch | UC-001 | C-002 | Unit/source/browser | SCN-001, SCN-003 |
| REQ-002 | AC-002 | DS-001 | Solution Sketch | UC-001 | C-002 | Unit/source/browser | SCN-001 |
| REQ-003 | AC-003 | DS-002 | Solution Sketch | UC-002 | C-002 | Unit/source/browser | SCN-001, SCN-003 |
| REQ-004 | AC-004, AC-005 | DS-002 | Solution Sketch | UC-002 | C-002, C-003 | Unit/browser | SCN-002, SCN-003 |
| REQ-005 | AC-006 | DS-001 | Solution Sketch | UC-001 | C-002 | Source/browser | SCN-001, SCN-003 |
| REQ-006 | AC-007 | DS-002 | Solution Sketch | UC-002 | C-001, C-002 | Static/source | SCN-004 |
| REQ-007 | AC-008, AC-009 | DS-003 | Test Strategy | UC-003 | C-003 | Unit/browser | SCN-001..SCN-004 |

### Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | DS-001 | Two-line compact header renders | SCN-001, SCN-003 | Unit + Browser-E2E | Planned |
| AC-002 | REQ-002 | DS-001 | Core controls remain visible | SCN-001 | Unit | Planned |
| AC-003 | REQ-003 | DS-002 | Summary is one-line truncated | SCN-001, SCN-003 | Unit + Browser-E2E | Planned |
| AC-004 | REQ-004 | DS-002 | More expands full description inline without overlay | SCN-002, SCN-003 | Unit + Browser-E2E | Planned |
| AC-005 | REQ-004 | DS-002 | Less collapses inline description | SCN-002 | Unit | Planned |
| AC-006 | REQ-005 | DS-001 | Workspace subtree unchanged | SCN-001, SCN-003 | Unit + Browser-E2E | Planned |
| AC-007 | REQ-006 | DS-002 | Localization strings present | SCN-004 | Static | Planned |
| AC-008 | REQ-007 | DS-003 | Unit tests pass | SCN-001, SCN-002 | Unit | Planned |
| AC-009 | REQ-007 | DS-003 | Browser/Electron visual evidence captured | SCN-003 | Browser-E2E | Planned |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| N/A | No obsolete files expected | N/A | Ensure rejected overlay/popover styles and handlers are removed, not retained | Low |

### Step-By-Step Plan

1. Update localized strings from overlay popover copy to inline `More`/`Less` disclosure copy.
2. Keep `SkillDetail.vue` as a two-line compact header while preserving workspace subtree.
3. Rework `SkillDescriptionSummary.vue` from overlay popover state/styles to inline expand/collapse state/styles.
4. Remove absolute popover, document listener, close icon, and overlay-specific styles.
5. Add/extend component unit tests for inline expansion and collapse.
6. Run targeted tests and static validation.
7. Validate visually in browser/Electron frontend runtime in Stage 7.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No planned`
- Shared data structures remain tight: `Yes; none introduced`
- Shared design-principles guidance reapplied during implementation: `Pending Stage 6`
- Authoritative Boundary Rule preserved: `Yes; versioning/workspace owners are reused`
- Decoupling impact assessment completed: `Yes for design basis`
- New tight coupling or cyclic dependency introduced: `No planned`
- Changed source implementation files kept within proactive size-pressure guardrails: `Pending Stage 6`

### Code Review Gate Plan

- Gate artifact path: `tickets/in-progress/compact-skill-details-header/code-review.md`
- Scope: changed Vue component, adjacent component tests, localization catalogs.
- Line count commands:
  - `rg -n "\\S" <file-path> | wc -l`
  - `git diff --numstat origin/personal...HEAD -- <file-path>`
- Expected size risk: low; only one source implementation file is modified.

### Test Strategy

- Unit tests:
  - `SkillDetail.spec.ts` loaded-skill compact header rendering.
  - `SkillDetail.spec.ts` `More`/`Less` inline expand-collapse behavior.
- Static/localization:
  - localization guard/audit where feasible.
- Browser/Electron validation:
  - Use available frontend runtime to open Skills page/detail and capture evidence that header is compact and inline expansion does not overlay or cover workspace content.
  - If existing Electron frontend is not serving this worktree, run local dev server from this worktree and record fallback.

## Execution Tracking

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes for re-entry implementation`
- Scope classification confirmed: `Small`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-06-13: Stage 3 small-scope solution sketch drafted.

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/compact-skill-details-header/api-e2e-testing.md` | `Pending re-run` | 2026-06-13 | Re-entry Stage 6 complete; rerun planned scenarios AV-001..AV-004. |
| 8 Code Review | `tickets/in-progress/compact-skill-details-header/code-review.md` | `Not Started` | 2026-06-13 | Review after Stage 7 pass. |
| 9 Docs Sync | `tickets/in-progress/compact-skill-details-header/docs-sync.md` | `Not Started` | 2026-06-13 | Likely no long-lived docs impact; decide after review. |

- 2026-06-13: Stage 5 review reached Go Confirmed; baseline ready for Stage 6 source implementation.


### Stage 6 Implementation Update Log

| Date | Change ID | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 2026-06-13 | C-001 | Completed | Localization guard/audit passed. | English and Chinese strings now use inline `More`/`Less` disclosure copy. |
| 2026-06-13 | C-002 | Completed | `SkillDetail.vue` source inspection; targeted tests passed. | Header remains two persistent rows and workspace subtree remains below the header. |
| 2026-06-13 | C-004 | Completed | Source line counts: `SkillDetail.vue` 355 non-empty, `SkillDescriptionSummary.vue` 109 non-empty after rework. | Removed overlay/popover code and kept the owned child component as inline disclosure. |
| 2026-06-13 | C-003 | Completed | Targeted Vitest passed for inline expand/collapse. | Tests updated and rerun. |

### Stage 6 Verification Log

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-13 | `pnpm install --frozen-lockfile` | Passed | Installed workspace dependencies in the ticket worktree. |
| 2026-06-13 | `pnpm --dir autobyteus-web exec nuxi prepare` | Passed | Generated `.nuxt` types required by Vitest in new worktree. |
| 2026-06-13 | `pnpm --dir autobyteus-web exec vitest --run components/skills/SkillDetail.spec.ts components/skills/SkillVersioningPanel.spec.ts pages/__tests__/skills.spec.ts` | Passed | 8 tests passed. |
| 2026-06-13 | `pnpm --dir autobyteus-web guard:localization-boundary` | Passed | Localization boundary preserved. |
| 2026-06-13 | `pnpm --dir autobyteus-web audit:localization-literals` | Passed | No unresolved product literals. |
| 2026-06-13 | `pnpm --dir autobyteus-web exec nuxi typecheck` | Failed (pre-existing unrelated errors) | Broad typecheck reports many existing project-wide errors, including pre-existing `SkillVersioningPanel.spec.ts` fixture type mismatches and unrelated stores/components. Targeted Vitest and localization checks passed. |

### Stage 6 Source-File Size Guard Evidence

| Source File | Effective Non-Empty Lines | Changed-Line Pressure | Result |
| --- | ---: | --- | --- |
| `autobyteus-web/components/skills/SkillDetail.vue` | 355 | 55 additions / 31 deletions in tracked diff | Pass; below 500 and below 220-delta pressure. |
| `autobyteus-web/components/skills/SkillDescriptionSummary.vue` | 187 | 217 added lines as new source file | Pass; below 500 and below 220-delta pressure. |

### Stage 6 Re-entry Implementation Update Log

| Date | Change ID | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 2026-06-13 | C-001 | Completed | Localization guard/audit passed. | Replaced popover/close copy with `More`, `Less`, expand, and collapse strings in English and Chinese. |
| 2026-06-13 | C-004 | Completed | `SkillDescriptionSummary.vue` source inspection; targeted tests passed. | Removed absolute popover, close icon, document listeners, and outside-click behavior; added inline `isDescriptionExpanded` state. |
| 2026-06-13 | C-003 | Completed | Targeted Vitest passed. | Tests now assert inline expansion/collapse and absence of `.description-popover`. |

### Stage 6 Re-entry Verification Log

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-13 | `pnpm --dir autobyteus-web exec vitest --run components/skills/SkillDetail.spec.ts components/skills/SkillVersioningPanel.spec.ts pages/__tests__/skills.spec.ts` | Passed | 8 tests passed across 3 files; inline More/Less behavior covered. |
| 2026-06-13 | `pnpm --dir autobyteus-web guard:localization-boundary` | Passed | Localization boundary preserved after copy changes. |
| 2026-06-13 | `pnpm --dir autobyteus-web audit:localization-literals` | Passed | No unresolved product literals. |

### Stage 6 Re-entry Source-File Size Guard Evidence

| Source File | Effective Non-Empty Lines | Changed-Line Pressure | Result |
| --- | ---: | --- | --- |
| `autobyteus-web/components/skills/SkillDetail.vue` | 355 | 55 additions / 31 deletions in tracked diff | Pass; below 500 and below 220-delta pressure. |
| `autobyteus-web/components/skills/SkillDescriptionSummary.vue` | 109 | 124 added lines as new source file | Pass; below 500 and below 220-delta pressure. |
| `autobyteus-web/components/skills/SkillDetail.spec.ts` | 130 | 70 additions / 0 deletions in tracked diff | Pass; below 500 and below 220-delta pressure. |
