# Investigation Notes: Compaction Config Save Button Styling

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The reported issue is isolated to one Vue settings card's save-button presentation and can be fixed by aligning existing local computed button state with the already-used pattern in peer cards. No backend/API shape changes are needed.
- Investigation Goal: Identify why the Compaction config save icon appears visually different from peer save icons and determine the minimal frontend fix.
- Primary Questions To Resolve:
  - Which component renders the Compaction config card and save button?
  - How do peer cards style and enable their save buttons?
  - Is the issue behavioral, styling-only, or both?

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-31 | Setup | `git fetch origin --prune`; `git worktree add -b codex/compaction-config-save-button ... origin/personal` | Establish workflow worktree from fresh base | Ticket worktree created from `origin/personal` at `ecf283ac` | No |
| 2026-05-31 | Code | `autobyteus-web/components/settings/CompactionConfigCard.vue` | Locate reported save button | Save button class is driven only by `isSaving`; when not saving it always uses the blue ready/success style and remains enabled, regardless of whether form values changed. | Yes: align with dirty/can-save pattern |
| 2026-05-31 | Code | `autobyteus-web/components/settings/MediaDefaultModelsCard.vue` | Compare peer card save style | Peer save button has base, idle, and ready classes; idle is gray/white and disabled when not dirty. | Use as style reference |
| 2026-05-31 | Code | `autobyteus-web/components/settings/WebSearchConfigurationCard.vue` | Compare peer card save style | Peer save button uses the same blue ready class only when valid changed input can be saved; otherwise idle gray/white. | Use as style reference |
| 2026-05-31 | Code | `autobyteus-web/components/settings/FeaturedCatalogItemsCard.vue` | Compare peer card save style | Peer save button is disabled when `!canSave` and receives idle styling while unchanged/invalid/busy. | Use as style reference |
| 2026-05-31 | Code | `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | Check existing coverage | Tests cover syncing, agent summaries, and save payload, but do not assert idle/dirty button state or style. | Add regression coverage |
| 2026-05-31 | Code | `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` | Confirm composition with other cards | Compaction config is rendered beside cards whose save buttons follow the dirty/idle convention. | No |
| 2026-05-31 | Image | User screenshot path `/Users/normy/.autobyteus/server-data/memory/agents/7a8f6e8f-9daa-438f-94c9-0a301797d1e9/context_files/ctx_d68d50a8d88c__image.png` | Observe visual issue | Compaction config save icon appears as a prominent blue active square even with no evident unsaved edits, unlike peer card idle save buttons. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoint: `autobyteus-web/components/settings/CompactionConfigCard.vue` renders the reported card and owns its local form draft state and save action.
- Execution boundaries: Vue component state -> Pinia `useServerSettingsStore().updateServerSetting(...)`; no server contract changes needed.
- Owning subsystem / capability area: `autobyteus-web/components/settings` frontend settings UI.
- Folder / file placement observations: Existing card and existing spec are already in the correct settings component/test folders.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | `saveButtonClass` | Computes save icon classes | Uses blue ready class whenever `!isSaving`; lacks idle styling and dirty/can-save gating. | Fix belongs in this component. |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | `syncFromStore` and form refs | Populate local editable values from server settings | Local draft values exist and can be compared against normalized current setting values. | Dirty detection can be computed locally without new dependencies. |
| `autobyteus-web/components/settings/MediaDefaultModelsCard.vue` | `saveButtonBaseClass`, `saveButtonIdleClass`, `saveButtonReadyClass` | Peer save button style pattern | Shows expected style: base + idle unless dirty and not saving, disabled when no save is possible. | Mirror class split and disabled behavior. |
| `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | Component tests | Regression coverage for card behavior | Missing assertions for initial disabled idle state and dirty ready state. | Add focused tests. |

### Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-31 | Static probe | `rg -n "CompactionConfigCard|iconSaveButtonClass|saveButtonClass" autobyteus-web/components/settings` | Peer cards all gate active save styling by dirty/can-save state; compaction card does not. | Root cause identified without needing backend runtime. |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: N/A.
- Version / tag / commit / release: N/A.
- Files, endpoints, or examples examined: N/A.
- Relevant behavior, contract, or constraint learned: N/A.
- Confidence and freshness: High; local repository code on ticket branch `codex/compaction-config-save-button`.

### Reproduction / Environment Setup

- Required services, mocks, or emulators: Component unit tests can validate class/disabled state with Pinia test store.
- Required config, feature flags, or env vars: `NUXT_TEST=true` is set by `pnpm test:nuxt`; targeted vitest can be run from `autobyteus-web`.
- Required fixtures, seed data, or accounts: Existing `CompactionConfigCard.spec.ts` fixtures are sufficient.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands materially affecting investigation: Created dedicated git worktree from `origin/personal`.
- Cleanup notes: Ticket worktree remains active until user verification/finalization per workflow.

## External / Internet Findings

None. This is a local repository styling bug and current behavior was confirmed from local source and user-provided screenshot.

## Constraints

- Technical constraints: Preserve existing save payload and server settings keys; avoid backend changes.
- Environment constraints: Existing working directory had unrelated uncommitted work, so all changes must stay in the dedicated ticket worktree.
- Third-party / API constraints: None.

## Unknowns / Open Questions

None blocking. The visual discrepancy is explained by the Compaction config save button always using the ready/blue style.

## Implications

### Requirements Implications

- Add explicit requirement that the Compaction config save button uses idle/disabled styling when there are no unsaved changes and ready/blue styling only when saveable changes exist.

### Design Implications

- Add local normalized original/current comparison for the four existing settings fields.
- Keep source-of-truth save behavior in the same component and Pinia store boundary.

### Implementation / Placement Implications

- Update `CompactionConfigCard.vue` only for component behavior.
- Update `CompactionConfigCard.spec.ts` with regression tests for idle/dirty style and disabled state.
