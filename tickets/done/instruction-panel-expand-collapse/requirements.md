# Requirements

- Ticket: `instruction-panel-expand-collapse`
- Status: `Design-ready`
- Last Updated: `2026-03-31`
- Scope: `Small`
- Compatibility Policy: `No internal scrolling for long instruction content; preserve existing instruction readability and editing flows unless explicitly redesigned`

## Objective

Improve the instruction-reading experience for both agent instructions and team instructions by showing a compact default view for long content, with an explicit user action that expands the card to fit the full content without introducing an inner scrollbar.

## Problem

Long instruction blocks currently force users to scroll through a large amount of content inline. This makes the detail page feel heavy and creates poor reading ergonomics, especially when the user only needs a quick scan before deciding whether to read the entire instruction body.

## User Intent

The user wants:

1. A limited default preview for long instruction content.
2. No inner scrollbar for the instruction panel.
3. An explicit affordance such as expand/show more that grows the content area to fit the full instruction.
4. A shared solution for both agent instruction and team instruction surfaces.
5. A design review first, then implementation only after explicit confirmation.

## In Scope

1. Investigate current agent/team instruction rendering surfaces and shared components.
2. Define UX behavior for collapsed and expanded instruction states.
3. Define state, layout, accessibility, and implementation approach for a reusable solution.
4. Update both detail views to use the same interaction pattern after user confirmation.

## Out of Scope

1. Source-code implementation before user confirmation of the proposed UX.
2. Redesigning unrelated metadata/layout outside the instruction presentation pattern.
3. Introducing internal scroll regions inside the instruction card.

## Initial Constraints

1. The compact state must still communicate that more instruction text exists.
2. Expanding must reveal full content inline by increasing the card height.
3. The design should avoid surprising layout instability where reasonably possible.
4. The same interaction pattern should work for both agent and team instruction sections.

## Functional Requirements

### FR-001 Shared Detail-View Instruction Pattern
Agent detail and team detail pages must use the same long-instruction interaction pattern.

### FR-002 Compact Default State For Long Instructions
When instruction content exceeds the preview threshold, the detail page must render a collapsed preview by default instead of immediately rendering the full height.

### FR-003 No Internal Scroll Region
The instruction card must not introduce its own vertical scrollbar in either collapsed or expanded state.

### FR-004 Explicit Expand Affordance
The collapsed state must show a visible affordance that makes it clear additional content exists and can be expanded.

### FR-005 Inline Expansion To Natural Height
Activating the expand affordance must reveal the full instruction content inline by increasing the card height to fit the content.

### FR-006 Reversible Expansion
After expansion, the user must have a clear way to collapse the instruction back to the preview state.

### FR-007 Short Content Stays Fully Visible
If the instruction content does not exceed the preview threshold, the card must render the full content directly and omit expand/collapse controls.

### FR-008 Existing Content Rendering Preserved
The task must preserve current instruction text formatting semantics unless a follow-up task explicitly changes the rendering system.

### FR-009 Accessible Toggle Semantics
The expand/collapse control must be keyboard reachable and expose expanded/collapsed state to assistive technology.

## Non-Functional Requirements

### NFR-001 Minimal Scope
The solution should stay within frontend detail-view presentation and avoid unnecessary store, API, or backend changes.

### NFR-002 Reusable Frontend Ownership
Shared instruction-preview behavior should be owned by one reusable frontend component rather than duplicated across both detail views.

### NFR-003 Responsive Behavior
The preview state must remain readable on desktop and narrower viewport widths without introducing internal scrolling.

## Use Cases

### UC-001 Quick Scan Of Long Instructions
A user opens an agent/team detail page and sees a compact preview of a long instruction body without needing to scroll past the entire text immediately.

### UC-002 Intentional Full Read
A user decides to read everything and expands the instruction card, which grows inline to show the full instruction.

### UC-003 Return To Compact Layout
A user collapses the expanded instruction body to restore the shorter page layout.

### UC-004 Short Instruction Display
A user opens a detail page with short instructions and sees the full content with no extra control noise.

## Acceptance Criteria

### AC-001 Shared UX Across Agent And Team Detail Views
Both detail views present long instructions using the same collapsed/expanded interaction.

### AC-002 Default Preview For Long Content
Long instruction content renders in a bounded preview state by default.

### AC-003 No Inner Scrollbar
The instruction card never shows an internal vertical scrollbar.

### AC-004 Expand Control Visibility
Long instruction content clearly shows an expand affordance in collapsed state.

### AC-005 Full Inline Expansion
Expanding the instruction reveals the complete content inline and fits natural content height.

### AC-006 Collapse Control Availability
Expanded content can be returned to the bounded preview state.

### AC-007 Short-Content Simplicity
Short instruction content renders fully without expand/collapse controls.

### AC-008 Accessible Toggle Contract
The control is keyboard operable and exposes expanded state semantics.

## Requirement Coverage Map

| Requirement | Acceptance Criteria | Primary Implementation Areas |
| --- | --- | --- |
| FR-001 | AC-001 | `autobyteus-web/components/agents/AgentDetail.vue`, `autobyteus-web/components/agentTeams/AgentTeamDetail.vue`, shared frontend component |
| FR-002, FR-004 | AC-002, AC-004 | shared frontend component |
| FR-003, FR-005 | AC-003, AC-005 | shared frontend component |
| FR-006 | AC-006 | shared frontend component |
| FR-007 | AC-007 | shared frontend component |
| FR-008 | AC-001, AC-007 | shared frontend component + detail views |
| FR-009 | AC-008 | shared frontend component |
| NFR-001..003 | AC-001..AC-008 | `autobyteus-web/components/**`, frontend tests |

## Acceptance Criteria Coverage Map (Stage 7)

| Acceptance Criteria | Requirement(s) | Scenario ID(s) | Scenario Intent |
| --- | --- | --- | --- |
| AC-001 | FR-001 | AV-001 | Agent and team detail pages share the same interaction model. |
| AC-002 | FR-002 | AV-002 | Long content is preview-limited on initial render. |
| AC-003 | FR-003 | AV-003 | No internal scrollbar is introduced in the instruction card. |
| AC-004 | FR-004 | AV-004 | Overflowing content shows a clear expand affordance. |
| AC-005 | FR-003, FR-005 | AV-005 | Expanding reveals the full content inline. |
| AC-006 | FR-006 | AV-006 | Expanded content can be collapsed back to preview. |
| AC-007 | FR-007, FR-008 | AV-007 | Short content renders fully without extra controls. |
| AC-008 | FR-009 | AV-008 | Toggle semantics remain keyboard- and accessibility-friendly. |

## Assumptions

1. Instruction rendering remains plain text with preserved line breaks for this task.
2. Expanded/collapsed state only needs to live locally in the detail view and does not need persistence across navigation.
3. The preview threshold can be height-based rather than line-count-based so the pattern can continue to work if rendering becomes richer later.

## Open Questions / Risks

1. Exact preview height may need minor visual tuning after implementation.
2. If instructions later move to rich Markdown rendering, overflow measurement must still work with multi-element content.
3. Expanding a very large instruction will still lengthen the page, but only when the user explicitly requests full content.

## Explicit Decisions

1. The preview uses bounded height plus hidden overflow, not an internal scrolling region.
2. The expand/collapse control is shown only when content actually overflows the preview threshold.
3. User confirmation is required before implementation or source-code edits beyond ticket artifacts.
