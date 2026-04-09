# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Metadata

- Ticket: `skill-source-removal-refresh`
- Owner: `Codex`
- Branch: `codex/skill-source-removal-refresh`
- Last Updated: `2026-04-09`

## Goal / Problem Statement

The desktop skills page can keep showing a skill after its backing source entry has been removed. The stale skill remains visible in the main list, but opening it attempts to load missing content and leaves the detail view stuck in a loading state. The expected experience is that removing a skill source immediately reconciles the visible skill list and any current selection so deleted-source skills disappear without requiring manual refresh.

## Scope Classification

- Classification: `Small`
- Rationale:
  - The bug appears confined to frontend state coordination between the skill sources UI, the skill list store, and the selected detail state.
  - The user expectation is a local UI refresh/reconciliation change rather than a new product surface.

## In-Scope Use Cases

- `UC-001`: User removes a skill source from the Sources modal while viewing the skills list, and the list refreshes so removed-source skills disappear promptly.
- `UC-002`: User removes a skill source while a skill from that source is selected, and the page exits or clears the stale detail state instead of hanging on loading.
- `UC-003`: Remaining skill sources and skills continue to render normally after source removal.

## Out Of Scope / Non-Goals

- Changing backend skill discovery semantics.
- Adding new polling or background file-watch infrastructure unless required by the existing frontend architecture.
- Redesigning the skills page layout or source-management UX beyond the stale-state fix.

## Constraints / Dependencies

- The fix should preserve the existing GraphQL-based data flow for `skills` and `skillSources`.
- The frontend should stay resilient if a requested skill disappears between list and detail fetches.
- The user expects the main page to update automatically after source removal.

## Assumptions

- Removing a skill source already succeeds server-side and returns updated source data.
- The stale skill card is caused by client-side state not being invalidated or refreshed after source removal.
- The endless loading behavior comes from the detail view not recovering cleanly when `fetchSkill` returns no skill or throws for a removed skill.

## Risks To Track

- Refreshing the global skills list after every source change could unintentionally reset in-progress page state if done too broadly.
- Detail-view recovery needs to avoid breaking legitimate loading for existing skills.

## Requirements (Verifiable)

- `REQ-001` (Skill List Reconciliation):
  - Expected outcome: after a skill source is removed, the visible skills list refreshes against current server state and no longer shows skills that only existed in the removed source.

- `REQ-002` (Selection Reconciliation):
  - Expected outcome: if the currently selected skill is no longer available after a source removal or reload, the UI clears or exits the detail state instead of leaving the page in an indefinite loading state.

- `REQ-003` (No Manual Refresh Requirement):
  - Expected outcome: the user does not need to navigate away or manually reload the page to see the updated skill list after removing a source.

- `REQ-004` (Graceful Missing Skill Handling):
  - Expected outcome: if a skill lookup returns no skill because it was removed, the page handles that state explicitly and stops loading.

## Acceptance Criteria

- `AC-001` Source removal updates list:
  - Measurable outcome: removing a source causes the skills list to refresh and omit skills from that source.

- `AC-002` Removed selected skill does not hang:
  - Measurable outcome: when the open skill is removed via source deletion, the page returns to a stable non-loading state.

- `AC-003` Remaining skills still work:
  - Measurable outcome: skills from unaffected sources still open and load after a source removal.

- `AC-004` Direct missing-skill load is recoverable:
  - Measurable outcome: if a missing skill is requested directly, the detail view renders a non-loading recovery state with a way back.
