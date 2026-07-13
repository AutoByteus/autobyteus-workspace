# UI/UX Specification

Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions/tickets/in-progress/claude-agent-sdk-model-descriptions/ui-ux-spec.md`

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined` — approved by the user on 2026-07-13.

## UX Goal

Let users understand what each Claude Agent SDK model alias currently resolves to and what it is best suited for at the moment of selection, using the live plain-text description already returned by Claude's SDK.

## Related Requirements And Acceptance Criteria

- Requirements: REQ-003, REQ-004, REQ-005, REQ-006, REQ-008, REQ-010.
- Acceptance criteria: AC-003, AC-004, AC-005, AC-007, AC-008, AC-009.
- Authoritative scope/behavior source: [`requirements.md`](./requirements.md).

## Users / Personas / Contexts

- Agent/team authors selecting a global runtime model before a run.
- Users selecting member-specific runtime/model overrides.
- Application or messaging launch-profile authors selecting runtime-scoped models.
- Desktop and mobile users of the shared runtime/model configuration surface.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Team/agent author | Runtime is `Claude Agent SDK`; model picker closed | Compare the available Claude aliases | Open list shows each live description with its primary name | REQ-003, REQ-004, REQ-006; AC-003, AC-005 |
| UXJ-002 | User searching models | Descriptive model list is open | Find a model by version or intended use | Only options matching name/id/description remain | REQ-005; AC-004 |
| UXJ-003 | User selecting a model | Described option is visible | Choose it without changing runtime identity semantics | Picker closes; saved/emitted value is the option identifier | REQ-007; AC-006 |
| UXJ-004 | User with a description-less runtime/model | List is open | Choose the available model | Existing one-line option remains usable | REQ-008, REQ-010; AC-008, AC-009 |

## Journey Details

### UXJ-001 — Compare Claude models

1. User selects `Claude Agent SDK` as runtime.
2. AutoByteus loads the runtime-scoped model catalog through the existing loading path.
3. User opens the model picker.
4. Each model row presents:
   - primary line: the existing display name, such as `Default (recommended)` or `Sonnet`;
   - secondary line when available: the SDK description, such as `Sonnet 5 · Efficient for routine tasks`.
5. Description text wraps instead of being forced into a single truncated line.
6. The selection checkmark remains aligned and does not cover either line.

### UXJ-002 — Search by description

1. User types a concrete version (`Sonnet 5`) or intended use (`quick answers`).
2. Filtering checks the identifier, primary name, selected label, and description case-insensitively.
3. Matching rows remain with both lines visible; unmatched groups disappear if empty.
4. If nothing matches, the current localized `No options found` state remains.

### UXJ-003 — Select

1. User clicks a described row.
2. The existing `update:modelValue` event emits the model identifier only.
3. The picker closes and clears the search term as it does today.
4. The closed trigger keeps the existing compact selected label (`provider / display name`), allowing the layout to remain stable. Reopening reveals the current description.

### UXJ-004 — Missing description

1. A model has `null`, absent, whitespace-only, or empty description metadata.
2. No empty secondary line, placeholder, or duplicated primary name is rendered.
3. The option keeps the current one-line spacing and interaction.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `RuntimeModelConfigFields` and other `useRuntimeScopedModelSelection` consumers | Runtime-scoped model selection | Catalog loaded for chosen runtime | Closed, open, described rows, description-less rows, search result, empty result, disabled | Select model or change runtime |
| `SearchableGroupedSelect` | Generic grouped option picker | Receives grouped options | Optional description, wrapping, selected checkmark, search, no match | Emit selected item id |
| Closed picker trigger | Compact current selection | Model selected | Provider/display-name label, truncated using existing behavior if needed | Reopen picker |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Runtime changes to Claude | Select runtime | Existing catalog loading/disable behavior | Claude groups/options become available | Live catalog fetched | Open picker |
| Open described list | Click trigger | Popover opens and search focuses | Names plus optional secondary descriptions visible | None | Search/select/close |
| Search by description | Type search text | Rows filter immediately | Matching described rows/groups remain | None | Refine/select/clear |
| Select described model | Click row | Popover closes | Compact selected label appears | Identifier emitted; search reset | Run/reopen/change |
| No description | Open list | No empty placeholder line | Current one-line row | None | Select normally |
| No matching option | Type unmatched search | Existing empty result message | `No options found` | None | Edit/clear/close |
| Disabled/unavailable | Runtime/model selection disabled | Existing disabled styling | Popover cannot open | None | Resolve upstream state |

## Markdown Wireframes / Visual Structure

Described option:

```text
ANTHROPIC
  Sonnet                                      [check when selected]
  Sonnet 5 · Efficient for routine tasks

  Opus
  Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet
```

Description-less option:

```text
OPENAI
  Some Model                                  [check when selected]
```

The exact text is vendor-provided. The visual hierarchy, not the sample wording, is normative.

## Non-Happy-Path States

### Loading

No new loading state. Preserve the current runtime catalog loading/disabled behavior.

### Empty

- Catalog empty: preserve current disabled/empty model-selector behavior.
- Search empty result: preserve localized `No options found`.
- Description empty: omit the secondary line only.

### Error And Recovery

Preserve existing catalog-fetch error behavior. This task does not add stale hard-coded descriptions as a fallback. A subsequent successful catalog load supplies current descriptions.

### Disabled / Unavailable

The description feature must not enable a selector disabled by runtime availability, form read-only state, or missing catalog rows.

### Permission / Authentication

No UI change. The shown description reflects whatever model catalog the existing runtime/auth environment returns.

## Responsive And Platform Behavior

- Use a flexible text column (`min-width: 0`) and a separate non-shrinking selection indicator.
- Secondary text wraps within the popover width on narrow/mobile surfaces.
- Do not introduce horizontal scrolling for normal SDK descriptions.
- The popover's existing placement/max-height behavior remains unchanged.
- Rows without description retain compact one-line height.

## Accessibility And Keyboard Behavior

- Description is plain visible text in the same option row as its name so assistive technology reading the row can encounter both.
- Do not render vendor text as HTML.
- Preserve current focus, outside-click close, and pointer selection behavior.
- Full listbox/arrow-key semantics are a pre-existing gap and explicitly out of scope, but the change must not remove focus visibility or make pointer selection ambiguous.

## Content, Labels, And Validation Messages

- Primary content: current `displayName`/option name.
- Secondary content: trimmed SDK description verbatim.
- Do not add punctuation that duplicates vendor separators.
- Do not translate or reinterpret model names, versions, recommendations, prices, or usage wording.
- Do not show a generic `No description available` label.

## Data And API Dependencies

- Claude Agent SDK `supportedModels()` descriptor `description`.
- Optional description on shared `ModelInfo` and GraphQL `ModelDetail`.
- Frontend model store/query description field.
- `useRuntimeScopedModelSelection` maps description to `SearchableGroupedSelect.SelectItem`.

## Out Of Scope

- Closed-trigger long-form description.
- Tooltips or modal model comparison.
- Sorting/ranking changes.
- Translation/localization of vendor descriptions.
- Keyboard interaction redesign.

## Open Decisions / Risks

None blocking. Vendor text can change dynamically and can be longer or include cost/usage guidance; wrapping and plain-text rendering address this variability.

## Approval Status

`Approved by the user on 2026-07-13 together with requirements.md.`
