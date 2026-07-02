# UI Specification — Token Meter Calculation Details

## Status

Draft UI recommendation for implementation planning.

## Purpose

Add transparent pricing calculation details to the right-side Token Meter without cluttering the existing high-level meter. The user should be able to trust and manually verify the displayed estimated API cost by opening an explicit details section.

## Recommendation Summary

Use an inline expandable disclosure inside the existing **Pricing details** card:

```text
Pricing details
  Latest model       gpt-5.5
  Runtime            codex_app_server
  Price status       Complete estimate
  Usage reports      90 model calls

  Calculation details  ▸
```

When expanded:

```text
Calculation details  ▾
Estimated API cost is calculated from server-accounted token components.
Formula: tokens ÷ 1,000,000 × unit price.

Component                         Tokens        Unit price        Cost
Uncached / full-price input        943,918       $5.00 / 1M       $4.72
Cache hits / discounted input   11,381,248       $0.50 / 1M       $5.69
Output                              85,526      $30.00 / 1M       $2.57
Thinking / reasoning                24,156      same as output    included

Input total                                                     $10.41
Output total                                                     $2.57
Total estimate                                                  $12.98
```

## Placement Decision

### Chosen placement: inside `Pricing details`

This is the preferred location because:

- The content explains **how price was calculated**, so it belongs near model/runtime/price-status metadata.
- It avoids crowding the top summary cards (`Gross input`, `Output`, `Total estimate`).
- It keeps the `Input breakdown` focused on token/cost components while the calculation panel explains unit prices and formula.
- The user naturally looks at `Pricing details` when asking, “Where did this price come from?”

### Avoided placements

| Placement | Decision | Why |
| --- | --- | --- |
| Always-on unit-price column in `Input breakdown` | Avoid for default UI | Adds density and may overwhelm normal users. |
| Modal dialog | Avoid for first implementation | Adds interaction complexity; inline details are easier to inspect while comparing visible totals. |
| Tooltip-only formula | Avoid | Tooltips are hidden, hard to compare, and not transparent enough for manual validation. |
| Separate top-level card above Pricing details | Avoid for now | Makes the Token Meter feel more pricing-heavy by default. |

## User Journey

### Journey 1: normal usage, no extra detail needed

1. User opens the right-side **Token** tab.
2. User sees the same high-level Token Meter:
   - Latest prompt
   - Gross input
   - Output
   - Total estimate
   - Input breakdown
   - Pricing details
3. `Calculation details` is visible but collapsed.
4. Main UI stays clean and readable.

### Journey 2: user wants to verify calculation

1. User sees a total estimate, e.g. `$12.98`.
2. User opens **Pricing details** if needed.
3. User clicks **Calculation details**.
4. Inline panel expands and shows:
   - formula explanation;
   - token components;
   - unit price per 1M tokens;
   - component cost;
   - input/output/total subtotals.
5. User can manually verify:
   - `943,918 ÷ 1,000,000 × 5.00 = 4.71959 ≈ 4.72`
   - `11,381,248 ÷ 1,000,000 × 0.50 = 5.690624 ≈ 5.69`
   - `85,526 ÷ 1,000,000 × 30.00 = 2.56578 ≈ 2.57`

### Journey 3: thinking tokens are present

1. User opens calculation details.
2. The panel shows `Thinking / reasoning` as an output sub-breakdown.
3. The UI must explicitly say it is **included in output cost**.
4. User is not encouraged to add thinking cost a second time.

Recommended copy:

```text
Thinking / reasoning tokens are included in output tokens and output cost.
```

or, in compact row form:

```text
Thinking / reasoning    24,156    same as output    included in output cost
```

### Journey 4: price is missing or partial

1. User opens calculation details.
2. Missing components show `price missing` or `not available` in the unit-price column.
3. Existing `Missing price dimensions` remains visible in Pricing details.
4. The cost line should not silently show `$0` unless status is `local_no_api_bill`.

Example:

```text
Component                         Tokens        Unit price        Cost
Uncached / full-price input         4,000       price missing     —
Output                                600       $30.00 / 1M       $0.02

Price status: Partial estimate
Missing: standard_input_price
```

### Journey 5: mixed pricing

If an aggregate has mixed model/provider/currency/pricing-policy state, do not display a single misleading unit price.

Recommended copy:

```text
Calculation varies by model/provider call. A single unit price is not available for this aggregate.
```

Rows may show:

```text
Unit price: varies by call
Cost: mixed / unavailable
```

A future per-call detail viewer can show each call's rate, but that is out of scope for this UI spec.

### Journey 6: local/no-bill runtime

For `local_no_api_bill`, the panel should explain that no provider API bill applies.

Recommended copy:

```text
Local runtime: no provider API unit prices apply.
```

Do not show paid-provider `$0 / 1M` unit prices unless the server explicitly provides local zero pricing with `local_no_api_bill` status.

## Default Collapsed State

In the `Pricing details` card, after current rows:

```text
Calculation details  ▸
```

Behavior:

- Click expands inline.
- Chevron rotates or switches from `▸` to `▾`.
- Expanded state may be local UI state only; it does not need persistence across reloads.
- Accessible button with `aria-expanded` and `aria-controls`.

Suggested button style:

- text size: same as details row text or slightly smaller;
- color: blue or slate with hover underline;
- placed after `Usage reports` and after `Missing price dimensions` if present.

## Expanded Panel Content

### Header

```text
Calculation details
```

Optional helper text:

```text
Estimated API cost is calculated from server-accounted token components.
Formula: tokens ÷ 1,000,000 × unit price.
```

### Table columns

| Column | Meaning | Formatting |
| --- | --- | --- |
| Component | Token category / billing component | Human-readable label |
| Tokens | Component token count | Locale integer, e.g. `943,918` |
| Unit price | Server-provided unit price | Currency per 1M tokens, e.g. `$5.00 / 1M` |
| Cost | Server-provided component cost | Existing cost formatting |

Optional formula text can be either:

1. a separate helper line under the table; or
2. a per-row tooltip/title; or
3. a compact formula column on wide screens only.

Preferred first implementation: no always-visible formula column on narrow screens; show one global formula line and use row titles for exact arithmetic.

## Component Rows

Rows should appear only when meaningful.

| Component Row | Show When | Token Source | Unit Price Source | Cost Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Uncached / full-price input | `standardInputTokens > 0` or input cost exists | `standardInputTokens` | `inputPricePerMillion` summary field | `estimatedApiStandardInputCost` | Main full-price input row. |
| Cache hits / discounted input | `cacheReadInputTokens > 0` or cache state positive | `cacheReadInputTokens` | `cachedInputReadPricePerMillion` summary field | `estimatedApiCacheReadInputCost` | Show missing price if tokens positive but price unavailable. |
| Cache writes | `cacheCreationInputTokens > 0` | `cacheCreationInputTokens` | `cachedInputWritePricePerMillion` or subtype fields | `estimatedApiCacheCreationInputCost` | If 5m/1h subtypes exist, prefer subtype rows. |
| Cache write 5m | `cacheCreation5mInputTokens > 0` | `cacheCreation5mInputTokens` | `cachedInputWrite5mPricePerMillion` | `estimatedApiCacheCreation5mInputCost` | Provider-specific cache-write TTL. |
| Cache write 1h | `cacheCreation1hInputTokens > 0` | `cacheCreation1hInputTokens` | `cachedInputWrite1hPricePerMillion` | `estimatedApiCacheCreation1hInputCost` | Provider-specific cache-write TTL. |
| Output | `outputTokens > 0` or output cost exists | `billableOutputTokens` if it differs meaningfully, otherwise `outputTokens` | `outputPricePerMillion` | `estimatedApiOutputCost` | Label should avoid double-counting. |
| Thinking / reasoning | `reasoningOutputTokens > 0` | `reasoningOutputTokens` | same as output price | `estimatedApiReasoningOutputCost` or `included` | Explain included in output cost. |

## Totals Area

Below component rows, show subtotal lines:

```text
Input total      $10.41
Output total      $2.57
Total estimate   $12.98
```

Rules:

- These totals should reuse existing server-provided summary costs.
- If status is mixed, show mixed/unavailable using existing cost formatter.
- Add a small rounding note when needed:

```text
Displayed costs are rounded; exact internal values may differ by less than one cent.
```

## Copy / Localization Keys

Suggested new English messages:

```ts
'shell.tokenUsage.calculationDetails': 'Calculation details',
'shell.tokenUsage.calculationDetailsHelp': 'Estimated API cost is calculated from server-accounted token components.',
'shell.tokenUsage.calculationFormula': 'Formula: tokens ÷ 1,000,000 × unit price.',
'shell.tokenUsage.component': 'Component',
'shell.tokenUsage.unitPrice': 'Unit price',
'shell.tokenUsage.pricePerMillionTokens': '{{price}} / 1M tokens',
'shell.tokenUsage.sameAsOutputPrice': 'same as output',
'shell.tokenUsage.includedInOutputCost': 'included in output cost',
'shell.tokenUsage.variesByCall': 'varies by call',
'shell.tokenUsage.mixedCalculationDetails': 'Calculation varies by model/provider call. A single unit price is not available for this aggregate.',
'shell.tokenUsage.localNoUnitPrices': 'Local runtime: no provider API unit prices apply.',
'shell.tokenUsage.roundingNote': 'Displayed costs are rounded; exact internal values may differ slightly.',
```

## Data Requirements

The frontend needs unit-price values from the server-owned summary path. Do not hard-code frontend provider prices.

Recommended additions to `TokenUsageRunSummary` / aggregate summary:

```ts
inputPricePerMillion: number | null;
outputPricePerMillion: number | null;
cachedInputReadPricePerMillion: number | null;
cachedInputWritePricePerMillion: number | null;
cachedInputWrite5mPricePerMillion: number | null;
cachedInputWrite1hPricePerMillion: number | null;
unitPriceSummaryStatus: 'single' | 'mixed' | 'missing' | 'local_no_api_bill';
```

Alternative: reuse `apiCostStatus` plus nullable price fields, but an explicit unit-price status is clearer for mixed summaries.

## Interaction Details

- Initial state: collapsed.
- Click/tap: toggles expanded state.
- Keyboard: button reachable with Tab, toggles on Enter/Space.
- Screen reader: button has `aria-expanded` and names the controlled panel.
- No network call should be required to expand if the summary already includes unit prices.

## Responsive Behavior

### Wide panel

Use a compact table with four columns:

```text
Component | Tokens | Unit price | Cost
```

### Narrow panel

Rows can stack:

```text
Uncached / full-price input
943,918 tokens · $5.00 / 1M · $4.72
```

Avoid horizontal scrolling inside the right-side panel if possible.

## Visual Hierarchy

- Keep summary cards unchanged.
- Keep `Input breakdown` unchanged or only lightly adjusted.
- Put calculation details inside `Pricing details` as secondary detail.
- Use subtle background such as `bg-slate-50` for expanded panel.
- Use `tabular-nums` for tokens/prices/costs.
- Keep component labels aligned with existing Token Meter terminology.

## Error / Edge States

| State | UI Behavior |
| --- | --- |
| Complete estimate | Show rows with unit prices and costs. |
| Partial estimate | Show available rows; missing unit prices as `price missing`; keep missing dimensions visible. |
| Price missing | Show formula explanation but unit prices/costs unavailable. |
| Mixed | Show `varies by call`; do not show one unit price. |
| Local/no API bill | Show local/no-bill explanation. |
| No usage yet | No calculation details, because there is no summary. |

## Example Using User Screenshot

Given:

- latest model: `gpt-5.5`
- uncached input: `943,918`
- cached input: `11,381,248`
- output: `85,526`
- thinking: `24,156`
- unit prices: input `$5.00/M`, cached input `$0.50/M`, output `$30.00/M`

Expanded details should communicate:

```text
Calculation details
Formula: tokens ÷ 1,000,000 × unit price.

Uncached / full-price input
943,918 tokens · $5.00 / 1M = $4.72

Cache hits / discounted input
11,381,248 tokens · $0.50 / 1M = $5.69

Output
85,526 tokens · $30.00 / 1M = $2.57

Thinking / reasoning
24,156 tokens · same as output · included in output cost

Input total: $10.41
Output total: $2.57
Total estimate: $12.98
```

## Implementation Guardrails

- The frontend must not import model catalogs or calculate authoritative prices.
- The expanded details can calculate display-only formula strings from server-provided values, but must not replace server-provided component costs.
- Unit prices must come from GraphQL/live summary data.
- Mixed pricing must not be flattened into a fake blended unit price unless a future backend field explicitly names it as a blended/effective rate.
- Thinking/reasoning must not be double-counted.

## Acceptance Checklist For UI Review

- [ ] Main Token Meter remains visually similar when calculation details are collapsed.
- [ ] `Calculation details` appears in `Pricing details`.
- [ ] Expanded details show formula, token components, unit prices, and costs.
- [ ] Screenshot example can be manually reconciled.
- [ ] Missing/partial/mixed/local states are understandable.
- [ ] Keyboard and screen-reader basics are handled.
- [ ] No frontend pricing catalog or hard-coded provider price table is introduced.
