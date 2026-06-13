# Future-State Runtime Call Stacks: Compact Skill Details Header

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/compact-skill-details-header/requirements.md` (`Refined`)
- Source Artifact: `tickets/in-progress/compact-skill-details-header/implementation.md`
- Source Design Version: `v2-inline-disclosure`
- Re-entry Context: Stage 7 user validation rejected the overlay/popover disclosure because it covered the workspace. This version models inline `More`/`Less` expand-collapse only.
- Referenced Sections:
  - `Re-entry Design Update`
  - `Solution Sketch`
  - `Spine Inventory In Scope`
  - `Primary Owners / Main Domain Subjects`
  - `Implementation Work Table`

## Future-State Modeling Rule

This document models the corrected target post-change behavior. Overlay/popover disclosure is explicitly out of scope for the accepted future state.

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `SkillDetail.vue` | Requirement | REQ-001, REQ-002, REQ-005 | N/A | Open skill details with compact header and existing workspace | Primary/Fallback/Error |
| UC-002 | DS-002 | Bounded Local | `SkillDescriptionSummary.vue` | Requirement | REQ-003, REQ-004, REQ-006 | N/A | Read full description via inline `More`/`Less` expansion | Primary/Fallback/Error |
| UC-003 | DS-003 | Validation | Tests + Stage 7 validation artifact | Requirement | REQ-007 | N/A | Validate compact header behavior | Primary/Fallback/Error |
| DR-001 | DS-002 | Bounded Local | `SkillDescriptionSummary.vue` | Design-Risk | REQ-004 | Ensure full description does not render as an overlay and never covers workspace content. | Inline disclosure must replace overlay | Primary/N/A/Error |
| DR-002 | DS-001 | Primary End-to-End | `SkillDetail.vue` + `SkillVersioningPanel.vue` | Design-Risk | REQ-002 | Ensure versioning UI is delegated to existing compact versioning owner, not duplicated. | Preserve versioning boundary | Primary/N/A/Error |

## Transition Notes

- No temporary migration behavior is needed.
- The rejected overlay/popover behavior is removed in scope; no compatibility branch is retained.
- The existing workspace subtree remains unchanged.
- Inline expansion may temporarily push the workspace down only while explicitly expanded; collapsed state returns to compact two-line height.

## Use Case: UC-001 Open Skill Details With Compact Header And Existing Workspace

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-web/components/skills/SkillDetail.vue`
- Why This Use Case Matters: The page should preserve the skill detail workflow while moving the workspace upward in the default collapsed state.

### Goal

Render a loaded skill detail page with a compact metadata header above the unchanged workspace.

### Preconditions

- `pages/skills.vue` has selected a skill name.
- `SkillDetail.vue` receives `props.skillName`.
- `useSkillStore().fetchSkill()` returns a skill object.

### Expected Outcome

- Header row 1 contains back button, title/disabled badge, and compact versioning panel.
- Header row 2 contains one-line description summary and optional `More` control.
- Workspace remains composed by `SkillWorkspaceLoader -> FileExplorer + FileExplorerTabs`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/pages/skills.vue:showSkillDetail(skillName)
└── autobyteus-web/components/skills/SkillDetail.vue:onMounted(...)
    ├── SkillDetail.vue:loadSkillDetails(...) [ASYNC]
    │   ├── skillStore.ts:fetchSkill(name) [IO]
    │   ├── SkillDetail.vue:skill.value = loadedSkill [STATE]
    │   └── SkillDetail.vue:loadVersions(...) [ASYNC]
    │       ├── [FALLBACK] if !skill.isVersioned -> return without fetching versions
    │       └── skillStore.ts:fetchSkillVersions(name) [IO]
    ├── SkillDetail.vue:<template compact-header>
    │   ├── button.btn-back -> $emit('back')
    │   ├── h2.skill-title render [STATE read]
    │   ├── SkillVersioningPanel.vue:<template mode="compact">
    │   └── SkillDescriptionSummary.vue:<template :description="skill.description">
    └── SkillWorkspaceLoader.vue:<default slot>(workspaceId)
        ├── FileExplorer.vue:<template :workspaceId="workspaceId">
        └── FileExplorerTabs.vue:<template :workspaceId="workspaceId">
```

### Branching / Fallback Paths

```text
[FALLBACK] if skill is not found
SkillDetail.vue:loadSkillDetails(...)
├── skillStore.fetchSkill(name) -> null
├── SkillDetail.vue:loadError.value = t('...not_found') [STATE]
└── SkillDetail.vue:<template error-state>
    └── button.btn-recover -> $emit('back')
```

```text
[FALLBACK] if skill is disabled
SkillDetail.vue:<template compact-header>
└── render badge-disabled next to compact title
```

```text
[ERROR] if fetchSkill throws
SkillDetail.vue:loadSkillDetails(...)
├── catch(e)
├── loadError.value = e.message || t('...failed_to_load_skill') [STATE]
└── SkillDetail.vue:<template error-state>
```

### State And Data Transformations

- `props.skillName` -> `skillStore.fetchSkill(name)` -> `skill.value`.
- `skill.description` -> `SkillDescriptionSummary.description` prop.
- `skill.isVersioned` -> `loadVersions` branch and compact versioning panel props.

### Observability And Debug Points

- Unit tests inspect rendered DOM classes for compact header and description summary.
- Browser validation captures DOM measurements for compact header, workspace top, and absence of overlay/popover elements.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`.
- Tight coupling/cyclic dependency introduced: `No`; existing component boundaries are preserved.
- Naming drift detected: `No`; names describe inline description disclosure behavior.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Read Full Description Via Inline `More`/`Less` Expansion

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Bounded Local`
- Governing Owner: `autobyteus-web/components/skills/SkillDescriptionSummary.vue`
- Why This Use Case Matters: This keeps the default header compact while making full context available without covering the file workspace.

### Goal

Allow the user to read the full description on demand through inline expansion, then collapse back to the compact row.

### Preconditions

- A skill is loaded.
- `skill.description` has non-empty text.
- The compact header is visible.

### Expected Outcome

- Collapsed state: summary is one line with truncation and a `More` control.
- Expanded state: the full description is rendered inline in normal document flow below/within the description row, with a `Less` control.
- No `.description-popover`, absolute overlay, document-level close handler, or close icon is rendered.
- The workspace is never covered by description content; it may shift down only while expanded.

### Primary Runtime Call Stack

```text
[ENTRY] SkillDescriptionSummary.vue:<button.description-more @click>
└── SkillDescriptionSummary.vue:toggleDescriptionExpansion(...)
    ├── isDescriptionExpanded.value = !isDescriptionExpanded.value [STATE]
    ├── [COLLAPSED TEMPLATE]
    │   ├── span.description-text one-line/truncated [STATE read]
    │   └── button.description-more aria-expanded="false" text=t('...more_description')
    └── [EXPANDED TEMPLATE]
        ├── p.description-expanded-text full description [STATE read]
        └── button.description-less aria-expanded="true" text=t('...less_description')
```

### Branching / Fallback Paths

```text
[FALLBACK] if description is empty or whitespace
SkillDescriptionSummary.vue:skillDescription computed
├── returns t('skills.components.skills.SkillCard.no_description_provided')
└── SkillDescriptionSummary.vue:<template description-row>
    └── render fallback summary without `More`/`Less` control
```

```text
[FALLBACK] user clicks `Less`
SkillDescriptionSummary.vue:toggleDescriptionExpansion(...)
├── isDescriptionExpanded.value = false [STATE]
└── collapsed one-line summary is restored
```

```text
[ERROR] SSR/test environment has no document
SkillDescriptionSummary.vue
└── no document-level listener exists; component is safe without browser document APIs
```

### State And Data Transformations

- `props.description` string -> trimmed display string or localized fallback.
- `isDescriptionExpanded` boolean drives collapsed vs expanded text, control copy, and `aria-expanded`.

### Observability And Debug Points

- Unit test clicks `More`, verifies inline expanded text appears and no popover element exists.
- Unit test clicks `Less`, verifies summary returns to one-line compact state.
- Browser validation verifies workspace is visible and not covered, and no overlay/popover selector exists.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`.
- Tight coupling/cyclic dependency introduced: `No`; state is local to the owning child component.
- Naming drift detected: `No`; names align to description expansion concern.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Validate Compact Header Behavior

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Validation`
- Governing Owner: `SkillDetail.spec.ts` plus Stage 7 validation artifact.
- Why This Use Case Matters: The change is visual/interactions-heavy; evidence must include durable component tests and browser verification.

### Goal

Prove acceptance criteria through unit/static/browser evidence.

### Preconditions

- Stage 6 re-entry implementation is complete.
- Dependencies are installed or available in `autobyteus-web`.

### Expected Outcome

- Targeted component tests pass.
- Localization checks pass.
- Browser/Electron validation records successful skill detail UI evidence using the already-started Electron backend or documented frontend fallback.

### Primary Runtime Call Stack

```text
[ENTRY] shell:pnpm --dir autobyteus-web exec vitest --run components/skills/SkillDetail.spec.ts
├── SkillDetail.spec.ts:mount(SkillDetail)
├── SkillDetail.vue:loadSkillDetails(...) [ASYNC mocked]
├── SkillDetail.spec.ts:expect compact header summary/actions
├── SkillDetail.spec.ts:trigger More and expect inline expansion/no popover
└── SkillDetail.spec.ts:trigger Less and expect collapsed summary
```

```text
[ENTRY] Browser:open frontend Skills page
├── navigate to Skills page served from this worktree
├── select/open skill detail if needed
├── inspect DOM/screenshot for `.compact-header`, `.description-summary`, `.description-expanded-text`
├── verify `.description-popover` does not exist
└── record result in `api-e2e-testing.md`
```

### Branching / Fallback Paths

```text
[FALLBACK] already-started Electron frontend does not serve this worktree
Stage7 api-e2e-testing.md
├── record exact runtime constraint
├── start local Nuxt dev frontend from this worktree
├── point it at already-started Electron backend
└── run browser validation against that frontend
```

```text
[ERROR] targeted test failure
Stage7 api-e2e-testing.md
├── record failed scenario
├── classify failure
└── route to the correct re-entry stage before patching
```

### State And Data Transformations

- Requirements acceptance criteria -> scenario matrix -> test/static/browser evidence.
- Browser DOM measurements -> Stage 7 artifact evidence.

### Observability And Debug Points

- Targeted Vitest output.
- Localization guard/audit output.
- Browser DOM measurements and screenshot when useful.

### Design Smells / Gaps

- Manual-only validation required: `No`.
- Durable validation missing: `No; component tests cover the local interaction`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Design-Risk: DR-001 Inline Disclosure Must Replace Overlay

### Risk

A large overlay/popover can cover the file explorer/editor and make the user experience worse than the original tall header.

### Required Future-State Guard

- No absolute/fixed description disclosure element.
- No `.description-popover` rendered in the accepted implementation.
- No document-level outside-click listener for description disclosure.
- Full description is inline content and visually attached to the header.
- Collapsed state returns the workspace to the compact top position.

### Validation Target

- Unit: assert `More` creates inline expanded content and no popover element.
- Browser: inspect real skill details page after clicking `More`; workspace remains visible and not covered.

## Design-Risk: DR-002 Preserve Versioning Boundary

### Risk

Moving the header could accidentally duplicate or bypass versioning controls.

### Required Future-State Guard

- `SkillDetail.vue` continues to render `SkillVersioningPanel` with `mode="compact"`.
- No duplicated versioning status/action implementation in the skill detail header.

### Validation Target

- Unit and source inspection confirm `SkillVersioningPanel` remains the versioning UI owner.
