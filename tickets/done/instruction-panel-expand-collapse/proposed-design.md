# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined shared collapsed/expanded instruction UX for agent and team detail pages | 1 |
| v2 | User UX feedback | Refined the affordance to emphasize a downward-arrow expand control with soft fade treatment | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/instruction-panel-expand-collapse/investigation-notes.md`
- Requirements: `tickets/done/instruction-panel-expand-collapse/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `software-engineering-workflow-skill/shared/design-principles.md` (consulted conceptually)
- Common Design Practices: `software-engineering-workflow-skill/shared/common-design-practices.md` (consulted conceptually)

## Summary

Introduce one shared frontend component that renders instruction content in either:

1. a compact preview state for overflowing content, with a soft bottom fade and explicit `Show full instructions` control, or
2. a fully expanded inline state that grows to the content’s natural height and exposes a `Collapse instructions` control.

Short instructions stay fully visible and do not show any extra controls. The solution is intentionally scoped to detail-page presentation and avoids backend/store changes.

## Goal / Intended Change

Reduce page heaviness for long agent/team instructions while preserving easy access to the full content and avoiding inner scrollbars.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove duplicated inline instruction-preview behavior from the two detail views once the shared component is implemented.
- Gate rule: design is invalid if it adds duplicate logic independently to both detail screens.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Shared instruction UX across agent/team detail views | AC-001 | Same interaction model on both pages | UC-001, UC-002, UC-003 |
| R-002 | Default collapsed preview for long instructions | AC-002, AC-004 | Preview threshold and explicit affordance for overflowing content | UC-001 |
| R-003 | No internal scrollbar and full inline expansion | AC-003, AC-005 | Expansion grows card height instead of creating nested scroll | UC-002 |
| R-004 | Reversible and accessible control | AC-006, AC-008 | User can collapse again and interact via keyboard/assistive tech | UC-003 |
| R-005 | Short-content simplicity and existing rendering preservation | AC-007 | Short instructions remain fully visible without extra control noise | UC-004 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Each detail page renders instructions directly inside its own template | `autobyteus-web/components/agents/AgentDetail.vue`, `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | None |
| Current Ownership Boundaries | No shared ownership exists for instruction display behavior | same files | Shared component path naming |
| Current Coupling / Fragmentation Problems | Duplicate markup would require duplicate overflow logic if changed in place | same files | None |
| Existing Constraints / Compatibility Facts | Current rendering is plain text with preserved line breaks and monospace styling | same files | Whether future markdown rendering should reuse the same wrapper |
| Relevant Files / Components | Existing tests cover only basic rendering/avatar behavior | `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts`, `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Final test granularity |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Detail route renders selected definition | User sees instruction section in collapsed or full form | Detail page component | Main UX path |
| DS-002 | Bounded Local | Instruction content mounts or changes | Overflow state is measured and control visibility is derived | Shared instruction component | Determines whether expand/collapse UI appears |
| DS-003 | Bounded Local | User activates expand/collapse control | Local state toggles and the card height updates inline | Shared instruction component | Delivers the requested interaction |

## Primary Execution / Data-Flow Spine(s)

- `Detail page -> shared instruction component -> overflow measurement -> collapsed preview or full render`
- `User clicks expand/collapse -> shared instruction component local state -> instruction card height updates inline`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When an agent/team detail view renders, it passes its instruction text into one shared component that decides whether the content fits directly or needs preview treatment. | Detail view, instruction component | detail view -> shared instruction UI owner | measurement, responsive threshold |
| DS-002 | After the instruction body renders, the shared component measures natural content height against the preview threshold and decides whether to show the expand affordance. | instruction component internals | shared instruction UI owner | resize/content-change handling |
| DS-003 | When the user chooses to expand, the component reveals the full content inline and swaps the control to collapse; when collapsed again, the bounded preview returns. | instruction component state + button | shared instruction UI owner | accessibility semantics, motion |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AgentDetail.vue` | Agent-specific detail composition | Overflow logic details | Should only provide title/content and place the shared section |
| `AgentTeamDetail.vue` | Team-specific detail composition | Overflow logic details | Same as agent detail |
| New shared instruction component | Preview height, overflow detection, fade treatment, toggle semantics | Store lookups or page-level routing concerns | Concrete repeated UI concern; justified abstraction |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Overflow measurement | shared instruction component | Detect whether the expand control is needed | Yes |
| Accessibility semantics | shared instruction component | `button`, `aria-expanded`, `aria-controls` | Yes |
| Responsive preview height | shared instruction component | Keep collapsed preview readable across widths | Yes |
| Visual fade treatment | shared instruction component | Communicate truncation without inner scroll | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent detail composition | `autobyteus-web/components/agents` | Reuse | Existing detail owner remains correct | N/A |
| Team detail composition | `autobyteus-web/components/agentTeams` | Reuse | Existing detail owner remains correct | N/A |
| Shared instruction preview behavior | `autobyteus-web/components/common` | Extend | Cross-cutting detail UI concern shared by two owners | Avoids domain duplication without inventing a generic empty abstraction |

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add one focused shared instruction-preview component and replace duplicated inline instruction rendering in both detail views`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): keeps complexity local, makes overflow behavior unit-testable once, and avoids future divergence between agent/team pages
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Remove`

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Agent/team detail templates duplicate the instruction card concern | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | No | Detail pages are not overloaded yet, but shared behavior would become duplicated | Keep page ownership shallow |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | New component owns concrete overflow/toggle behavior | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | Measurement, fade, and accessibility all belong to the new shared component | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | Existing detail pages stay in place; common folder takes the reusable concern | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | New shared instruction component removes duplicate behavior | Extract |
| Current structure can remain unchanged without spine/ownership degradation | No | Leaving logic duplicated in two pages would degrade future maintainability | Change |

### Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Collapsed preview with bottom fade plus explicit expand/collapse button | Matches user request, avoids inner scroll, preserves inline reading | Requires overflow detection and small local state | Chosen | Best fit for requested UX and current architecture |
| B | Fixed-height internal scroll region | Low implementation effort | User explicitly dislikes inner scroll; poor nested-scroll UX | Rejected | Violates stated UX requirement |
| C | Native `<details>` summary wrapper around the whole section | Minimal semantics | Weak truncation affordance and less control over preview styling | Rejected | Less intentional UX and less visually clear |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-web/components/common/ExpandableInstructionCard.vue` | Own shared preview/expand behavior once | frontend shared UI | Focused abstraction, not generic card framework |
| C-002 | Modify | `autobyteus-web/components/agents/AgentDetail.vue` | same | Replace inline instruction `<p>` with shared component | agent detail UI | Preserve existing page structure |
| C-003 | Modify | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | same | Replace inline instruction `<p>` with shared component | team detail UI | Preserve existing page structure |
| C-004 | Modify | `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | same | Add long/short instruction behavior coverage | frontend tests | Verify shared integration from agent page |
| C-005 | Modify | `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | same | Add instruction preview/expand coverage | frontend tests | Verify shared integration from team page |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Duplicated inline instruction-card behavior in `AgentDetail.vue` | Shared behavior should not live separately per page | `ExpandableInstructionCard.vue` | In This Change | Keep page-specific section placement only |
| Duplicated inline instruction-card behavior in `AgentTeamDetail.vue` | Shared behavior should not live separately per page | `ExpandableInstructionCard.vue` | In This Change | Keep page-specific section placement only |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/common/ExpandableInstructionCard.vue` | shared frontend components | reusable instruction UI boundary | Overflow detection, bounded preview, fade treatment, toggle semantics | One repeated UI concern with one owner | N/A |
| `autobyteus-web/components/agents/AgentDetail.vue` | agent detail UI | agent detail page | Compose agent-specific metadata sections and supply instruction text | Keeps page-level layout with agent context | Yes |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | team detail UI | team detail page | Compose team-specific metadata sections and supply instruction text | Keeps page-level layout with team context | Yes |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `components/common/ExpandableInstructionCard.vue` | Add | DS-001, DS-002, DS-003 | shared instruction UI | Accept instruction text, preview-height props, and own local expanded/overflow state | `props.content`, optional `props.previewHeightClass` or constant, `expanded` local state | Control only shows when overflow exists |
| `components/agents/AgentDetail.vue` | Modify | DS-001 | agent detail | Render shared instruction card in place of raw paragraph | content prop from `agentDef.instructions` | No store changes |
| `components/agentTeams/AgentTeamDetail.vue` | Modify | DS-001 | team detail | Render shared instruction card in place of raw paragraph | content prop from `teamDef.instructions` | No store changes |
| page/unit tests | Modify | DS-002, DS-003 | verification | Assert long-content preview state, control visibility, and expansion/collapse | Vue Test Utils assertions | Needed after user confirmation |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| shared instruction component | N/A | `autobyteus-web/components/common/ExpandableInstructionCard.vue` | shared frontend presentation concern | Yes | Low | Promote Shared | Used by at least two unrelated page owners |
| agent detail page | `autobyteus-web/components/agents/AgentDetail.vue` | same | agent definition detail composition | Yes | Low | Keep | Page ownership remains valid |
| team detail page | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | same | team definition detail composition | Yes | Low | Keep | Page ownership remains valid |

## Concrete UX Proposal

### Collapsed State

- The section header remains `Instructions`.
- Content is shown in a bounded preview region, targeting roughly `14rem` on small widths and `18rem` on larger widths.
- The preview ends with a soft bottom fade so truncation is visually obvious without looking broken.
- A compact footer action appears only when the content overflows:
  - primary affordance: downward chevron
  - supporting label: `Show full instructions`
  - placement: directly under the faded content, visually attached to the instruction card
- The arrow should read as the first visual cue, with the label reinforcing the action.
- No internal scrollbar is shown.

### Expanded State

- Clicking the action expands the card inline to the content’s natural height.
- The full instruction body becomes visible in the same card and reading continues naturally down the page.
- The footer action remains available and changes to:
  - primary affordance: upward chevron
  - supporting label: `Collapse instructions`
- A subtle height transition is acceptable if it remains fast and does not create jarring motion; no transition is also acceptable if implementation simplicity is better.

### Short-Content Behavior

- If the content fits within the preview threshold, the card renders fully with no fade and no toggle action.

### Accessibility / Interaction Notes

- Use a real `button`.
- Expose `aria-expanded`.
- Connect the button to the content region with `aria-controls`.
- Keep keyboard focus on the toggle after activation; do not auto-scroll the page.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep current duplicated rendering and add local logic twice | Lowest immediate code movement | Rejected | One shared instruction component |
| Add internal scroll container for long content | Simple overflow management | Rejected | Inline expansion with bounded preview |

## Pending User Gate

- User-only gate: `Confirm the proposed collapsed/expanded UX before implementation.`
- Code-edit status: `Locked`
- Next action after approval: implement shared component, integrate both detail views, and add targeted tests.
