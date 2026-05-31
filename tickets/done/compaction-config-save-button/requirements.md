# Requirements: Compaction Config Save Button Styling

Status: Design-ready

## Goal / Problem Statement

The frontend `Compaction config` settings card currently renders its save icon as an active blue button even when no changes are pending. Peer settings cards render their save icons in a gray/white idle disabled style until the card has valid unsaved changes. Align the Compaction config save button with the same visual and interaction convention while preserving the existing save payload.

## Scope Classification

- Classification: `Small`
- Rationale: One Vue component and its existing unit spec own the UI presentation/dirty-state behavior. No server, API, data model, routing, or cross-subsystem design changes are required.

## In-Scope Requirements

| Requirement ID | Requirement | Rationale |
| --- | --- | --- |
| R-001 | The Compaction config save button must show the peer-card idle save style when the draft form matches the current server settings. | Fixes the screenshot discrepancy and aligns with settings UI conventions. |
| R-002 | The Compaction config save button must show the peer-card ready/blue save style only when there are unsaved draft changes and the card is not saving. | Prevents the save affordance from implying pending work when there is none. |
| R-003 | The button must be disabled while there are no unsaved changes or while a save is in progress. | Matches peer-card interaction behavior and prevents redundant saves. |
| R-004 | The existing save action must keep writing the same four server settings with the same normalization rules. | Ensures this is a presentation/interaction consistency fix, not a settings semantics change. |
| R-005 | Regression tests must cover idle/disabled state, dirty/ready state, and unchanged save payload behavior. | Prevents the styling regression from returning. |

## Out of Scope

- Changing server settings keys or storage semantics.
- Changing Compaction config form layout beyond the save-button style/disabled affordance.
- Adding a shared save-button component across all settings cards in this ticket.
- Adding notification behavior for successful/failed compaction setting saves.

## Acceptance Criteria

| Acceptance Criteria ID | Requirement IDs | Acceptance Criteria | Validation Intent |
| --- | --- | --- | --- |
| AC-001 | R-001, R-003 | On initial render with store-synced values, `[data-testid="compaction-config-save"]` is disabled and has the idle gray/white classes used by peer card save icons. | Unit/component test. |
| AC-002 | R-002, R-003 | After changing any compaction draft input, the save button becomes enabled and uses the ready blue classes used by peer card save icons. | Unit/component test. |
| AC-003 | R-004 | Saving changed values still calls `updateServerSetting` for trigger ratio, compactor agent id, active context override, and detailed logs with existing normalized values. | Existing unit test kept passing. |
| AC-004 | R-005 | The targeted CompactionConfigCard test file passes in the frontend test runner. | `pnpm test:nuxt -- components/settings/__tests__/CompactionConfigCard.spec.ts --run` or equivalent targeted Vitest command. |
| AC-005 | R-001, R-002 | A local browser/screenshot or component-render inspection confirms the saved/idle visual is no longer a permanently blue button. | Browser/manual visual evidence if dev runtime is feasible; otherwise rendered/component evidence plus class assertions. |

## Requirement-to-Use-Case Coverage

| Use Case ID | Description | Covered Requirements |
| --- | --- | --- |
| UC-001 | User opens Settings > Basics and views Compaction config without changing fields. | R-001, R-003 |
| UC-002 | User edits a compaction field and needs a clear save affordance. | R-002, R-003 |
| UC-003 | User saves changed compaction fields. | R-004 |
| UC-004 | Future developer changes save-button classes. | R-005 |

## Acceptance-Criteria-to-Scenario Intent

| Scenario ID | Acceptance Criteria | Scenario Intent |
| --- | --- | --- |
| S-001 | AC-001 | Mount component with current settings; assert disabled idle button. |
| S-002 | AC-002 | Change `compaction-ratio-input`; assert enabled ready button. |
| S-003 | AC-003 | Change all fields and click save; assert normalized payload order unchanged. |
| S-004 | AC-004 | Run targeted component test. |
| S-005 | AC-005 | Inspect UI or component-render output for visual consistency evidence. |

## Constraints / Dependencies

- Must preserve the `useServerSettingsStore` boundary and existing four settings keys.
- Must avoid touching unrelated dirty work outside the ticket worktree.
- Must keep code edits locked until Stage 6 unlock per workflow.
- Peer style source of truth for this ticket is the existing inline class pattern in `MediaDefaultModelsCard.vue`, `WebSearchConfigurationCard.vue`, and `FeaturedCatalogItemsCard.vue`.

## Assumptions

- The expected "other cards" save style is the idle gray/white disabled icon until valid unsaved changes exist, then blue when save is possible.
- Comparing normalized draft values to normalized store values is sufficient dirty-state detection for this component.
- Unit/component test coverage is sufficient for the primary regression; visual browser evidence is complementary.

## Open Questions / Risks

- Open questions: None blocking.
- Risks: Store updates during editing could overwrite draft state through the existing `watch` on `store.settings`; this is pre-existing behavior and not changed by this ticket.
