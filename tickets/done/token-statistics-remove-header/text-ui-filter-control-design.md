# Text UI Design — Token Statistics Filter / Control Area

## Purpose

This document shows the intended text-based UI layout for the Settings > Token Statistics top control area after the scope expansion.

The key design decision is that `Task` / `Model` is a **result grouping selector**, not page navigation. It should be a compact select/dropdown at the start of the filter row. The date range follows it. The fetch action remains at the end.

The visible UI should stay clean: no redundant helper text, no redundant visible labels, and no explanatory words that users can infer from the controls.

## Current Layout To Replace

The current/previous layout separates related controls and includes redundant text:

```text
[Settings sidebar: Token Statistics selected]

Main content:

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Select Date Range: [ 23.06.2026 📅 ] to [ 30.06.2026 📅 ]  Usage during period ⓘ  [ Fetch Statistics ] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

By Task     By Model
───────

┌──────────────────────────────────────────────────────────────────────────────┐
│ Task / Run        Type        Runtime        Model(s)        Input ...       │
│ ...                                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Problems:

- `By Task` / `By Model` behaves like a result grouping choice but is visually separated as if it were page navigation.
- `Usage during period ⓘ` is redundant because selecting a date range already communicates that the data is for that period.
- `Select Date Range:` is heavier than needed in this context; the two date inputs and `to` already communicate a range.
- The separate row and divider consume vertical space between filters and results.

## Target Desktop Layout

Use one cohesive, compact top filter card:

```text
[Settings sidebar: Token Statistics selected]

Main content begins directly with controls:

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ Task ▾ ]   [ 23.06.2026 📅 ]  to  [ 30.06.2026 📅 ]                         [ Fetch Statistics ] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Task / Run        Type        Runtime        Model(s)        Input        Output        Cost ... │
│ ...                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

When `Model` is selected:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ Model ▾ ]  [ 23.06.2026 📅 ]  to  [ 30.06.2026 📅 ]                         [ Fetch Statistics ] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Runtime        Model        Input        Output        Input Cost        Output Cost ...      │
│ ...                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Target Narrow / Wrapped Layout

At narrower widths, the same controls remain in one card and wrap cleanly:

```text
┌──────────────────────────────────────────────────────────────┐
│ [ Task ▾ ]                                                │
│ [ 23.06.2026 📅 ]  to  [ 30.06.2026 📅 ]                     │
│ [ Fetch Statistics ]                                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Task / Run        Type        Runtime        Model(s) ...     │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

The important requirement is not exact row placement at every width; it is that grouping, date range, and fetch are all part of one compact filter/control card.

## Control Order

Use this order:

```text
[ grouping select ] [ start date ] to [ end date ] [ fetch button ]
```

Rationale:

1. The grouping select chooses the result perspective: task view or model view.
2. The date range then scopes that chosen result perspective.
3. Fetch executes the current selection.

## Visible Copy Rules

Allowed visible text in the filter card:

```text
Task
Model
to
Fetch Statistics
```

Do **not** add visible copies such as:

```text
By Task
By Model
Group by:
Select Date Range:
Usage during period
Usage during period ⓘ
Tasks created in period
```

If accessibility needs a label for the grouping select or date inputs, use non-visible labels or ARIA labels instead of adding redundant visible text.

## Grouping Select Shape

Recommended visible control:

```text
[ Task ▾ ]
```

Options:

```text
Task
Model
```

Suggested semantics:

- Use a normal compact select/dropdown control or visually equivalent select component.
- The selected value is visible.
- Use the clean visible option labels `Task` and `Model`; do not include `By` in the dropdown options.
- Do not use a two-button segmented control for this revised design; the user specifically asked for a selection/dropdown style.

## Behavior Requirements Reflected In The UI

- Default selected value: `Task`.
- Selecting `Model` changes the result projection/table, not the selected dates.
- Changing the grouping select does not add a new API argument and does not alter the existing fetch call shape.
- `Fetch Statistics` continues to fetch using start date and end date only.
- Loading, error, empty state, task table, and model table behavior remain unchanged.

## Explicitly Avoid

Do not keep this structure:

```text
┌ filter card with date range only and redundant usage helper ┐
└─────────────────────────────────────────────────────────────┘

By Task     By Model
───────

┌ results table ┐
└───────────────┘
```

Do not replace it with this over-explained structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Group by: [ Task ▾ ]  Select Date Range: [date] to [date] │
│ Usage during period ⓘ                         [ Fetch ]      │
└──────────────────────────────────────────────────────────────┘
```

Why avoided:

- It keeps redundant visible labels.
- It underestimates that users understand date ranges and `By ...` choices.
- It wastes horizontal and vertical space.

## Acceptance Visual Summary

A reviewer should be able to say:

- The page has no duplicate visible `Token Statistics` main-content title.
- The top card is the single token statistics filter/control surface.
- The first control is a `Task` / `Model` select/dropdown, not `By Task` / `By Model`.
- The date range follows the grouping select.
- `Usage during period ⓘ` is gone.
- `Select Date Range:` is gone from the visible card.
- The old tab row is gone.
- Results start directly after the controls card spacing.
