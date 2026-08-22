# Token Statistics Analytics — UI/UX Specification

## Status

`Approved` — explicitly approved by the user on 2026-08-22 as intended-behavior authority.

## UX Goal

Let a user understand consumption in under ten seconds, investigate the dominant cause in under one minute, and export the exact selected evidence without confusing application-observed token usage with a provider invoice or quota entitlement.

The hierarchy is question-first:

1. **How much?** — summary cards.
2. **Faster than before?** — chronological and cumulative comparison.
3. **What drove it?** — ranked runtime/provider/model breakdown.
4. **Can I verify it?** — exact table, pricing/coverage notes, CSV export.

## Related Requirements And Acceptance Criteria

- Requirements: REQ-001–REQ-025 in [`requirements.md`](./requirements.md).
- Acceptance criteria: AC-001–AC-035 in [`requirements.md`](./requirements.md).
- Eventual rendered reference: [`prototype.html`](./prototype.html).
- Visible-field/source audit: [`token-usage-analytics-data-contract.md`](./token-usage-analytics-data-contract.md).

The HTML prototype is the normative visual/hierarchy reference for implementation. Its embedded values are a reconciled illustrative fixture, not production usage; field availability and derivations are governed by the linked data-contract audit.

## Users / Personas / Contexts

- Individual developer using Codex, Claude, AutoByteus, local, and custom-compatible runtimes who wants to control usage and cost.
- Power user comparing month-to-month consumption because an external allowance appears to drain unusually fast.
- User preparing evidence for provider support or public discussion and needing explicit dates, identities, token definitions, price status, and coverage limits.
- User with unpriced/local usage who still needs token analytics even when cost analytics are incomplete or inapplicable.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Returning user | Opens Settings > Token Statistics | See this month's consumption and comparison immediately | Current-month totals and comparison are visible with coverage status | REQ-001–REQ-008; AC-001–AC-012 |
| UXJ-002 | User investigating a spike | Analytics has all usage selected | Identify the runtime/provider/model driving the spike | Filters and ranked breakdown isolate the largest driver | REQ-005, REQ-009–REQ-012; AC-005, AC-013–AC-016 |
| UXJ-003 | User comparing periods | Current month selected | See whether consumption is accumulating faster | Pace chart compares aligned cumulative paths and exact endpoints | REQ-006, REQ-008; AC-008–AC-012 |
| UXJ-004 | User checking evidence | Filtered analytics visible | Inspect exact facts and export them | Exact rows and CSV share the same selection/context | REQ-024–REQ-025; AC-030–AC-031 |
| UXJ-005 | User needs task-level detail | Analytics visible | Find a costly run/team | Run details preserves task hierarchy and cost drilldown | REQ-001, REQ-019; AC-006, AC-024 |
| UXJ-006 | New/upgraded user | Selected period predates tracking | Understand why history is absent | Coverage state says tracking start instead of reporting zero | REQ-017–REQ-018; AC-021–AC-023, AC-033 |

## Journey Details

### UXJ-001 — Immediate monthly understanding

1. User selects `Token Statistics` in Settings.
2. `Analytics` is selected; `This month` and the visible fixed `UTC` time basis are applied.
3. Controls remain visible while summary/chart skeletons load.
4. Summary cards resolve first as one coherent result: Total tokens, Estimated cost/status, Tokens per active day, and change vs prior comparable period.
5. Trend and pace charts resolve using the same range/filter result; a compact coverage line reads `Tracking since <timestamp>` or `Partial coverage from <timestamp>`.
6. User can read totals without hover. Hover/focus adds exact bucket detail rather than being the sole access path.

### UXJ-002 — Find the driver

1. User looks at `Where usage went`, default grouped by `Runtime + model`.
2. Horizontal bars are ordered largest first and show value/share at the bar end when space allows.
3. User switches grouping to Provider or Model, or applies Runtime/Provider/Model filters.
4. All cards, charts, exact rows, and Export reflect the intersection; a visible filter summary and `Clear filters` prevent hidden context.
5. If low-share categories are collapsed to Other in the chart, the exact table below remains exhaustive.

### UXJ-003 — Compare consumption pace

1. With This month selected, user reads `Consumption pace`.
2. Solid current-period and dashed previous-period lines share an elapsed-day x-axis.
3. The legend includes exact range labels (for example, `Aug 1–22` and `Jul 1–22`), not only `Current`/`Previous`.
4. Endpoint labels match the summary totals. A textual callout reports percentage and absolute change.
5. When the prior period is uncovered or zero, the chart/callout explains `No comparable data` rather than inventing a rate.

### UXJ-004 — Verify and export

1. User expands `Exact breakdown` if not already visible.
2. Rows expose identity, selected-period token components, cost/currency/status, and share; exact trend-bucket dates remain available through chart focus/text alternatives and CSV.
3. User selects Export CSV.
4. A local file downloads with deterministic range in the filename; no upload occurs.
5. The file records exact half-open UTC range timestamps, filters, grouping, identity snapshots, coverage start, and cost status so a third party can understand limitations.

### UXJ-005 — Inspect runs

1. User selects `Run details`.
2. A clear range note says this view selects runs by creation time and shows lifetime usage.
3. Existing Task and Runtime/model detail controls/tables remain available.
4. Returning to Analytics preserves the Analytics selection within the session.

### UXJ-006 — Interpret unavailable history

1. User selects a date before tracking activation.
2. If wholly before coverage, the result says `Analytics tracking began <timestamp>; earlier monthly usage cannot be reconstructed from current stored data.`
3. If the range crosses the start, data after the start renders with a `Partial coverage` banner.
4. The UI does not show a normal zero state for uncovered time and does not offer a fake backfill action.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| View switch (`Analytics`, `Run details`) | Separate observed-period analytics from lifetime-by-created-run investigation | Token Statistics open | Selected, keyboard focus | Change workflow without conflating date semantics |
| Analytics control bar | UTC range preset/custom dates, filters, metric, export | Analytics selected | Default, edited, validation error, loading, filters active | Refresh analytics, clear filters, export |
| Coverage/status strip | Declare tracking start, partial coverage, price completeness | Result available | Full coverage, partial coverage, unavailable history, pricing partial/mixed | Inspect explanatory details |
| Summary cards | Answer absolute totals and comparison | Covered result | Complete, partial cost, no comparison, loading, empty | Move to trend/breakdown |
| Usage over time | Non-cumulative temporal distribution | Covered result | Daily/weekly/monthly, tokens/cost, empty, partial cost | Focus bucket, inspect exact table |
| Consumption pace | Compare aligned cumulative periods | Covered current and prior result | Comparable, no comparison, partial coverage | Focus elapsed position |
| Where usage went | Rank drivers and shares | Covered result | Runtime+model, Runtime, Provider, Model, Other, filtered | Apply group/filter, inspect rows |
| Exact analytics table | Text/evidence equivalent for charts | Analytics result | Sorted, expanded columns on desktop, horizontal scroll on narrow | Export or filter |
| Run details | Preserve current task/model tables | Run details selected | Loading, empty, migration error, task expansion | Inspect lifetime run cost |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Initial entry | Open Token Statistics | Analytics skeleton and default controls | Current month result | One analytics query/context | Filter, change range, inspect, export |
| Preset change | Select preset | Selected pill updates; result area marks loading | New coherent result replaces prior | Fetch selected and comparable periods | Continue investigation |
| Custom range | Select Custom and dates | Inline validation; Apply disabled until valid | Applied range visibly labeled | Fetch only after valid apply | Adjust/clear |
| Filter change | Select runtime/provider/model | Filter chip appears; affected surfaces load together | Consistent filtered dashboard | Fetch or recompute server aggregate | Clear one/all filters |
| Metric switch | Tokens ↔ Estimated cost | Toggle changes immediately; chart loading only if needed | Same context, new metric | No hidden range reset | Compare metric |
| Grouping switch | Change breakdown dimension | Control updates and rows/bars refresh | Ranked new grouping | Uses same selected totals | Apply filter from a row if supported |
| Chart focus | Hover or keyboard-focus data point | Tooltip/popover with exact values/status | Focused point remains identifiable | No persistence | Move point, inspect table |
| Export | Select Export CSV | Button shows preparing then browser download | Success toast/announcement | Local file only | Open/share file |
| View switch | Select Run details | Run detail controls/results render | Secondary lifetime workflow | Existing queries | Return to Analytics |
| Error | Query fails | Inline alert; current selection stays visible | Results hidden or clearly stale, Retry enabled | No export of failed/stale result | Retry/change range |

## Markdown Wireframes / Visual Structure

### Desktop analytics

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [ Analytics ] [ Run details ]                                               │
│                                                                             │
│ [This month] [Last month] [3 months] [12 months] [Custom]            UTC   │
│ Runtime [All ▾]  Provider [All ▾]  Model [All ▾]  [Tokens|Est. cost]       │
│ Active: Codex · OpenAI                           [Clear] [Export CSV]        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Full analytics coverage for the selected UTC range                         │
├────────────────┬────────────────┬────────────────┬──────────────────────────┤
│ TOTAL TOKENS   │ EST. API COST  │ TOKENS/ACTIVE │ VS PRIOR PERIOD          │
│ 300.0M         │ $82.41 partial │ 25.0M / day   │ +214.3M  (+250%)         │
│ 280M in · 20M  │ some unpriced  │ 12 active days│ Jul 1–22: 85.7M          │
├───────────────────────────────────────┬─────────────────────────────────────┤
│ Usage over time                      │ Consumption pace                    │
│ daily bars/line, exact tooltip       │ solid current / dashed prior        │
│                                      │ aligned elapsed days                 │
├───────────────────────────────────────┴─────────────────────────────────────┤
│ Where usage went                       Group by [Runtime + model ▾]        │
│ Codex · gpt-5.6-sol       ███████████████████  225M · 75%                  │
│ Claude · claude-sonnet     █████                54M · 18%                  │
│ Autobyteus · deepseek      ██                   15M · 5%                   │
│ Other                      ▏                     6M · 2%                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Exact breakdown / accessible chart data table                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Narrow layout

```text
[Analytics] [Run details]
[This month ▾] [UTC]
[Runtime ▾] [Provider ▾] [Model ▾]
[Tokens | Cost]       [Export]
[coverage/status]
[Total tokens]
[Estimated cost]
[Tokens/active day]
[Vs prior]
[Usage over time — full width]
[Consumption pace — full width]
[Where usage went — full width]
[Exact rows — scrollable]
```

## Non-Happy-Path States

### Loading

- Keep controls and applied-selection summary interactive except Apply/Export actions that would target an unresolved result.
- Replace result values with skeletons or a clear loading state; do not leave old values unlabeled after the effective selection changes.
- Announce loading/result completion through an appropriate polite live region.

### Empty

- **Covered but no usage:** `No tracked token usage in this period.` Offer wider range and Clear filters.
- **Filters exclude all:** include `Clear filters` and preserve the unfiltered coverage context.
- **Wholly before tracking:** explain tracking start and inability to reconstruct earlier monthly history; never label it zero.
- **Partial coverage:** render available results plus persistent coverage warning.

### Error And Recovery

- Query error: inline alert with Retry; preserve current controls.
- Migration readiness error: preserve current localized guidance and do not expose unusable historical results.
- Export preparation error: non-destructive inline/toast error; dashboard remains.
- If one analytical section cannot be computed without invalidating cross-surface consistency, fail the coherent result rather than mix ranges/filters.

### Disabled / Unavailable

- Apply disabled for invalid/missing custom dates.
- Export disabled until a current successful result exists.
- Cost mode remains selectable when partially priced but must disclose partiality. If all selected usage is local/no API bill, show the local status rather than a false monetary comparison.
- Prior comparison control/content is unavailable with explanatory text when there is no covered comparison.

### Permission / Authentication

- No additional permission/authentication state is introduced. The feature uses the same local Settings access as current Token Statistics.

## Responsive And Platform Behavior

- Desktop: four summary cards in one row when space allows; two primary charts side by side only when each retains legible minimum width.
- Tablet: cards in 2×2; charts stacked if labels would collide.
- Narrow/mobile-equivalent: controls and cards stack; charts full width; long identity labels wrap or truncate with full accessible/title text; exact tables use contained horizontal scroll.
- Electron/browser behavior remains equivalent; download uses the established browser/Electron file-download mechanism.

## Accessibility And Keyboard Behavior

- View, preset, metric, and grouping switches use buttons/radiogroup/listbox semantics appropriate to their interaction, not clickable divs.
- Every control has a visible label or unambiguous programmatic name.
- Chart canvases have descriptive names and text equivalents. The exact data table is the authoritative accessible alternative.
- Data points/categories must be reachable through a maintained accessible interaction pattern or fully represented in the adjacent table; hover is never required.
- Current/prior series differ by line style/markers plus color. Pricing/coverage status uses icon/text plus color.
- Focus order follows controls → coverage → summary → trend → pace → breakdown → exact rows.
- Number abbreviations in visual labels retain exact values in accessible text/tooltips/table.

## Content, Labels, And Validation Messages

Preferred labels:

- `Analytics`, `Run details`
- `This month`, `Last month`, `Last 3 months`, `Last 12 months`, `Custom`
- `Tokens`, `Estimated cost`
- `Usage over time`, `Consumption pace`, `Where usage went`, `Exact breakdown`
- `Runtime + model`, `Runtime`, `Provider`, `Model`
- `Total tokens`, `Estimated API cost`, `Tokens per active day`, `Compared with prior period`
- `Tracking since {{dateTime}}`
- `Partial coverage: analytics tracking began {{dateTime}}.`
- `Analytics tracking began {{dateTime}}; earlier monthly usage cannot be reconstructed from current stored data.`
- `Estimated API cost; not a provider invoice or quota statement.`
- `No comparable data`
- `No tracked token usage in this period.`
- `Some usage is unpriced; cost totals are partial.`
- `Multiple currencies cannot be combined.`

Validation:

- `Choose a start date on or before the end date.`
- `Choose both dates to apply a custom range.`

## Data And API Dependencies

- One coherent analytics result should carry: applied UTC range, comparison range, coverage start/status, summary aggregates, trend buckets, comparison buckets, breakdown rows, available filter dimensions, and cost-quality metadata, as specified in [`token-usage-analytics-data-contract.md`](./token-usage-analytics-data-contract.md).
- The UI must not independently infer coverage, currency compatibility, cost completeness, or comparison boundaries from loosely related calls.
- Run details may continue through its existing dedicated query because it has intentionally different range semantics.
- Export may serialize the successful analytics contract locally if it contains all required exact rows/metadata; it must not derive from pixel/chart state.

## Out Of Scope

- Quota target input/overlay, forecast exhaustion date, alerts, notifications, scheduled reports, public links, invoice reconciliation, currency conversion, and task/workspace/team filters.
- A graphical redesign of the live Token Meter.

## Open Decisions / Risks

- Exact category-collapse threshold (`Top N + Other`) is a design-level choice; the exhaustive table is mandatory.
- Chart rendering can reuse Chart.js, but accessibility must be satisfied through component semantics and the exact table rather than canvas alone.
- The final visual styling should follow current Settings tokens/components; this spec governs hierarchy and behavior, not a new brand system.

## Approval Status

Approved by the user on 2026-08-22 together with [`requirements.md`](./requirements.md), [`prototype.html`](./prototype.html), and [`token-usage-analytics-data-contract.md`](./token-usage-analytics-data-contract.md).
