# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/instruction-panel-expand-collapse/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/instruction-panel-expand-collapse/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Plan Baseline -> Solution Sketch`
  - Ownership sections: `Plan Baseline -> File Placement Plan`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.
- Every use case declares which spine(s) it exercises from the approved design basis.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | detail pages | Requirement | R-001,R-005 | N/A | Short instructions render fully without affordance noise | Yes/N/A/N/A |
| UC-002 | DS-001,DS-002 | Primary End-to-End | shared instruction component | Requirement | R-001,R-002,R-003,R-005 | N/A | Long instructions render in collapsed preview with fade and downward chevron | Yes/Yes/N/A |
| UC-003 | DS-003 | Bounded Local | shared instruction component | Requirement | R-003,R-004 | N/A | Chevron toggle expands and collapses inline content | Yes/N/A/N/A |

## Transition Notes

- No temporary migration behavior is needed.
- Existing inline instruction paragraphs in both detail views are replaced directly by the shared component integration.

## Use Case: UC-001 [Short Instructions Render Fully]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentDetail.vue` / `AgentTeamDetail.vue`
- Why This Use Case Matters To This Spine: short content should remain simple and avoid unnecessary affordances.

### Goal

Render instruction content directly when the content height does not exceed the preview threshold.

### Preconditions

- Detail page has loaded a definition with non-overflowing instruction text.

### Expected Outcome

- Full instruction text is visible.
- No fade overlay is shown.
- No chevron button is shown.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/agents/AgentDetail.vue:render()
└── autobyteus-web/components/common/ExpandableInstructionCard.vue:setup(props)
    ├── autobyteus-web/components/common/ExpandableInstructionCard.vue:measureOverflow() [STATE]
    └── autobyteus-web/components/common/ExpandableInstructionCard.vue:renderExpandedOrFullBody() [STATE]

[ENTRY] autobyteus-web/components/agentTeams/AgentTeamDetail.vue:render()
└── autobyteus-web/components/common/ExpandableInstructionCard.vue:setup(props)
    ├── autobyteus-web/components/common/ExpandableInstructionCard.vue:measureOverflow() [STATE]
    └── autobyteus-web/components/common/ExpandableInstructionCard.vue:renderExpandedOrFullBody() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] none
N/A
```

```text
[ERROR] none
N/A
```

### State And Data Transformations

- `definition.instructions` -> component `content` prop
- measured content height -> `isOverflowing = false`
- local UI state -> render full body with no toggle

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-002 [Long Instructions Render Preview With Fade And Downward Chevron]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `ExpandableInstructionCard.vue`
- Why This Use Case Matters To This Spine: this is the core requested UX for long instructions.

### Goal

Render long instruction content in a bounded preview state with a soft bottom fade and a centered downward-chevron affordance.

### Preconditions

- Detail page has loaded a definition whose instruction content exceeds the preview threshold.

### Expected Outcome

- Only the preview region is visible initially.
- Fade overlay is visible at the bottom of the preview.
- Chevron button is visible and points down.
- No internal scrollbar is shown.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/agents/AgentDetail.vue:render()
└── autobyteus-web/components/common/ExpandableInstructionCard.vue:setup(props)
    ├── autobyteus-web/components/common/ExpandableInstructionCard.vue:measureOverflow() [STATE]
    ├── autobyteus-web/components/common/ExpandableInstructionCard.vue:applyCollapsedViewport() [STATE]
    └── autobyteus-web/components/common/ExpandableInstructionCard.vue:renderChevronToggle() [STATE]

[ENTRY] autobyteus-web/components/agentTeams/AgentTeamDetail.vue:render()
└── autobyteus-web/components/common/ExpandableInstructionCard.vue:setup(props)
    ├── autobyteus-web/components/common/ExpandableInstructionCard.vue:measureOverflow() [STATE]
    ├── autobyteus-web/components/common/ExpandableInstructionCard.vue:applyCollapsedViewport() [STATE]
    └── autobyteus-web/components/common/ExpandableInstructionCard.vue:renderChevronToggle() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the measured height changes after mount or resize
autobyteus-web/components/common/ExpandableInstructionCard.vue:observeViewportChanges()
└── autobyteus-web/components/common/ExpandableInstructionCard.vue:measureOverflow() [STATE]
```

```text
[ERROR] none
N/A
```

### State And Data Transformations

- `definition.instructions` -> component `content` prop
- rendered content height -> `isOverflowing = true`
- collapsed state -> bounded viewport + fade + downward chevron

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-003 [Chevron Toggle Expands And Collapses Inline Content]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `ExpandableInstructionCard.vue`
- Why This Use Case Matters To This Spine: the user explicitly asked for intentional expand/collapse behavior instead of nested scrolling.

### Goal

Allow the user to toggle between collapsed preview and full inline content using the chevron affordance.

### Preconditions

- Instruction content is overflowing and the chevron button is visible.

### Expected Outcome

- First activation expands the body inline to natural height and rotates/swaps the chevron upward.
- Second activation returns to the collapsed preview state.
- Focus remains on the button.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/common/ExpandableInstructionCard.vue:handleToggle()
├── autobyteus-web/components/common/ExpandableInstructionCard.vue:setExpandedState() [STATE]
└── autobyteus-web/components/common/ExpandableInstructionCard.vue:renderChevronToggle() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] none
N/A
```

```text
[ERROR] none
N/A
```

### State And Data Transformations

- `expanded = false` -> `expanded = true`
- `expanded = true` -> `expanded = false`
- `aria-expanded` and visual chevron direction follow `expanded`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
