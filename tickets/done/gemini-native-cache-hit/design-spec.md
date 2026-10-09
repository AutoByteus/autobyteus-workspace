# Design Spec — Gemini Native Cache Hit (AGY usage semantic + Gemini 3.1 Pro prices)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-002, approved by the user on 2026-10-09 ("just fix them in this ticket"). Scope: REQ-001, REQ-002, REQ-004, REQ-005 (fix-forward). REQ-003 removed.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-09): `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2. `design-examples.md` not needed for this scope.
- Project design-principle conflicts or discrepancies: None

## Current-State Read

- **AGY usage (BEH-002).** `AgyStreamEventConverter` turns each AGY `result` event into one `TOKEN_USAGE_UPDATED` (`usage_scope: cumulative_snapshot`, series key = AGY conversation id). It declares `input_token_semantic: "gross_includes_cache"`. The token-usage pipeline then applies `resolveTokenUsageComponentBasis` in two places: the live `TokenUsageSnapshotDeltaNormalizer`, and the durable `foldTokenUsageObservation` through `TokenUsageComponentBasisResolver`. With the gross semantic, standard/miss = max(0, input − cache_read), and gross = input. AGY's `input_tokens` excludes cache reads (live probe: input 6,110, cache_read 307,003, total 6,111). So miss clamps to 0 and gross omits cache reads.
- **Native 3.1 Pro pricing (BEH-003).** `supported-model-definitions.ts` defines 3.1 Pro with `pricing(2.25, 18.0, {cachedInputReadTokenPricing: 0.225, inputTokenPricingTiers: [≤200K: 2.25/18/0.225, >200K: 4.5/27/0.45]})`. Official Google pricing (Vertex Global and AI Studio, read 2026-10-09) is ≤200K 2.00/12.00/0.20 and >200K 4.00/18.00/0.40. The tier mechanism itself is correct.
- Both owners are correct; only one value in each is wrong. No coupling problem.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: two production lines/blocks in two existing files: the semantic literal in `agy-stream-event-converter.ts` and the 3.1 Pro pricing block in `supported-model-definitions.ts`. Plus focused unit tests. No new files, owners, APIs or schema.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: both changes use existing, already-supported contracts. `base_excludes_cache` is an existing enum value, already used by Grok Build (`grok-build-call-usage.ts:37`) and handled by `resolveTokenUsageComponentBasis`. Price tiers use the existing `inputTokenPricingTiers` model. No persistence schema, migration, concurrency, security or ownership change. Existing rows are read unchanged (fix-forward).
- Escalation trigger if implementation or validation discovers new impact: (1) any token-usage consumer that hard-codes AGY as gross or depends on AGY `cache_miss = 0`; (2) the cumulative-snapshot fold rejecting or flagging a pre-upgrade AGY series as regressed after the change; (3) any need to rewrite stored rows. Return `Design Impact` in any of these cases.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live AGY probe | investigation-notes Source Log (agy 1.3.2) | `total_tokens = input + output`; `cache_read` is separate | Use `base_excludes_cache` | A future AGY format change |
| Code | `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts:80-140` | `base_excludes_cache`: standard = reported input; gross = reported + cache_read + creation; miss = provided miss ?? standard | No new accounting code needed | — |
| Code | `.../projections/token-usage-snapshot-delta-normalizer.ts`, `token-usage-run-fold.ts:134-200`, `cumulative-snapshot-reconciliation-metadata.ts` | Cumulative deltas are taken per field over stored basis-resolved source tokens, then the basis is re-resolved from the delta's reported input and cache read | Fix-forward is coherent for new series; see the transition note for series that span the upgrade | — |
| Code | `autobyteus-ts/src/llm/supported-model-definitions.ts:289-316` | Tier model correct, values wrong | Value-only correction | — |
| Web | Vertex pricing page, AI Studio pricing page (2026-10-09) | Official 3.1 Pro values | Target values | Prices may change later (normal catalog maintenance) |
| Tests | `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts`; `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | No current assertion on the AGY semantic or the 3.1 Pro prices | Add focused assertions in these files | — |

## Intended Change

1. In `AgyStreamEventConverter`, declare AGY usage as `input_token_semantic: "base_excludes_cache"`.
2. In the Gemini 3.1 Pro Preview catalog entry, set the official prices: base `pricing(2.0, 12.0, { cachedInputReadTokenPricing: 0.2, ... })`; tier `prompt_le_200k` 2.0 / 12.0 / 0.2; tier `prompt_gt_200k` 4.0 / 18.0 / 0.4.
3. Add focused unit tests for both.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002 | Contract | REQ-002; AC-002, AC-003 | AGY CLI `result.usage` per turn | Ingested as gross; miss clamped to 0 (F1) | Gross = input + cache_read; miss = input | DS-001 |
| BEH-003 | System | REQ-004; AC-005, AC-006 | Native Gemini usage recorded for 3.1 Pro | Overpriced (F5) | Official prices by tier; 3.8 Flash unchanged | DS-002 |
| BEH-001 | System | Preserved (REQ-003 removed) | Native Gemini calls | Correct (F2) | Unchanged | N/A |
| — | — | REQ-005; AC-007 | Existing stored rows | — | Read unchanged (fix-forward) | Transition decision below |
| — | — | REQ-001; AC-001 | Package explanation | investigation-notes Key Findings | Documented | N/A |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/gemini-cache-lab.mjs`, `probes/*.jsonl` | Live evidence; reusable native Gemini cache probe (needs `LAB_DATABASE_URL` pointing to an isolated vault) | REQ-001, AC-001 | Evidence for the root cause; optional for validation | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No`
- Structural triggers considered:
  - Duplicated policy: input semantics are owned once in `resolveTokenUsageComponentBasis`, and each runtime only declares its semantic, so the trigger does not fire.
  - Shared structure looseness: the enum already has the needed value, so it does not fire.
  - Legacy pressure: no dual path; this is a clean value change, so it does not fire.
- Root cause classification: `Local Implementation Defect` (a wrong semantic declaration; wrong catalog values)
- Refactor needed now: `No`
- Evidence: the owners and boundaries are correct (converter declares, ledger interprets; catalog declares, cost calculator applies). Grok Build already proves the `base_excludes_cache` path end to end.
- Design response: correct the two declarations; add tests at the declaring owners.
- Refactor rationale: N/A
- Intentional deferrals and residual risk: AGY model ids stay `price_missing` (out of scope). See the transition note for AGY series that span the upgrade.

## Terminology

- **Gross input:** uncached + cache-read (+ cache-creation) input.
- **Base input (`base_excludes_cache`):** the provider-reported input excluding cache reads.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths in scope: the wrong `gross_includes_cache` literal for AGY and the wrong 3.1 Pro values. They are replaced in place. No compatibility branch or version check is added.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject, location, representative shape, and approximate volume: `token_usage_run_records` (plus analytics facets) in the app SQLite DB. Since 2026-08-01: 34 AGY Gemini run records and 7 native 3.1 Pro run records. AGY records carry `snapshot_series_state_json` with basis-resolved cumulative source tokens (for example `accounting_input_tokens = reported`, `cache_miss_input_tokens = 0`).
- Relevant change: semantic declaration for new AGY events; catalog prices for new 3.1 Pro events. No schema or serialization change.
- Normal reader/writer behavior: readers display stored totals and costs as they are. Writers apply the new semantic and prices only to new observations.
- Required semantics and invariants under direct use: stored totals remain internally consistent; nothing is deleted; startup is unaffected.
- Constraints: user-approved fix-forward (DEC-001, DEC-002); the data migration guideline prefers tolerant readers over migrations.
- Decision: `Directly Usable — No Migration`
- Decision rationale: the user chose fix-forward. Historical rows stay as recorded, and the rows' meaning is unchanged (they are historical estimates). A repair would rewrite run records and facets for a small benefit on price-missing AGY rows.
- **Series that span the upgrade (bounded, accepted):** an AGY conversation started before the upgrade and continued after it has a stored checkpoint with `cache_miss_input_tokens = 0` and `standard_input_tokens = 0`. On the first new snapshot those fields become the cumulative reported input, so that one delta adds the conversation's earlier uncached input to miss/standard once. This moves the run's miss total to the true value. Gross for that run still lacks the pre-upgrade cache reads. No field regresses (all values increase), so the fold does not flag regression. This is accepted as fix-forward. Implementation must verify it with a unit test on `foldTokenUsageObservation` using an old-shape checkpoint, and must not add version-specific handling.
- Guideline §2 answers: (1) Need: no. (2) Availability: unaffected. (3) Source: inspected the DB rows above. (4) Disposition: all rows retained unchanged. (5) Commit: N/A. (6) Current-only boundary: no legacy interpretation added. (7) Cost: none. (8) References: none. (9) Evidence: unit tests below. (10) Review: per handoff rules.
- Acceptance criteria supported: AC-007.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 | AGY CLI `result.usage` | Token Meter run record and UI | `AgyStreamEventConverter` (declares semantic), `resolveTokenUsageComponentBasis` (interprets) | Truthful AGY gross/miss/read |
| DS-002 | Primary End-to-End | BEH-003 | Native `GeminiLLM` usage observation | Token Meter cost | Model catalog (`supported-model-definitions.ts`), consumed by the token price/cost calculators | Correct 3.1 Pro cost |

## Primary Execution Spine(s)

- DS-001: `AGY CLI result event -> AgyStreamEventConverter (TOKEN_USAGE_UPDATED, base_excludes_cache) -> TokenUsageSnapshotDeltaNormalizer / foldTokenUsageObservation -> resolveTokenUsageComponentBasis -> token_usage_run_records -> Token Meter`
- DS-002: `GeminiLLM usage -> TOKEN_USAGE_UPDATED -> pricing policy from model catalog (tier by prompt size) -> TokenCostCalculator -> run record cost -> Token Meter`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The converter states what AGY's numbers mean. The ledger computes gross = input + cache_read and miss = input, folds cumulative deltas, and the Token Meter shows truthful values | Converter, basis resolver, run fold | Converter (declaration), basis (interpretation) | Idempotency and series checkpoints (unchanged) |
| DS-002 | Native usage is priced from the catalog tier matching the prompt size | Catalog, cost calculator | Catalog | Pricing summary (unchanged) |

## Spine Actors / Main-Line Nodes

`AgyStreamEventConverter`, `resolveTokenUsageComponentBasis`, `foldTokenUsageObservation`; model catalog entry `gemini-3.1-pro-preview`, `TokenCostCalculator`.

## Ownership Map

- `AgyStreamEventConverter`: owns translating the AGY wire format into the token-usage contract, including the semantic declaration.
- `resolveTokenUsageComponentBasis`: owns the semantic interpretation (unchanged).
- Model catalog: owns model prices (value change only).

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `input_token_semantic: "gross_includes_cache"` in the AGY converter | Wrong semantic | `"base_excludes_cache"` in the same line | In This Change | — |
| 3.1 Pro values 2.25/18/0.225 and 4.5/27/0.45 | Wrong prices | Official values in the same block | In This Change | — |

No dead code was found in the touched blocks.

## Return Or Event Spine(s) (If Applicable)

N/A (DS-001 is itself the event path).

## Bounded Local / Internal Spines (If Applicable)

The cumulative-snapshot fold inside `foldTokenUsageObservation` (`checkpoint -> per-field delta -> regression check -> basis re-resolution -> cost`) is unchanged. It matters only for the spanning-series note above.

## Off-Spine Concerns Around The Spine

N/A. No new off-spine concern.

## Ownership Boundaries

The runtime adapter (converter) declares; the token-usage domain interprets. Neither crosses into the other.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TOKEN_USAGE_UPDATED` payload contract | Basis resolution, fold | AGY converter | Converter pre-computing `accounting_input_tokens` / `cache_miss_input_tokens` itself | N/A |

## Dependency Rules

- The converter must only declare raw reported fields and the semantic. It must not compute gross or miss itself.
- No AGY-specific branch may be added to the token-usage domain.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TOKEN_USAGE_UPDATED.input_token_semantic` | Usage semantics | Declare the input meaning | Enum | Existing |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `input_token_semantic` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

N/A. No new names.

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Net-input accounting | `token-usage-component-basis.ts` `base_excludes_cache` | Reuse | Already implemented and used by Grok Build | — |
| Tiered pricing | Catalog `inputTokenPricingTiers` | Reuse | Already implemented | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY backend (server) | Semantic declaration | DS-001 | Converter | Extend (value) | — |
| LLM catalog (`autobyteus-ts`) | Prices | DS-002 | Catalog | Extend (values) | — |

## Draft File Responsibility Mapping

See the final mapping (identical for this scope).

## Reusable Owned Structures Check

N/A. No repeated structures.

## Shared Structure / Data Model Tightness Check

N/A. No shared-structure changes.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | AGY backend | Converter | Change the semantic literal (line ~230) | Existing owner | Yes (enum) |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | LLM catalog | Catalog | 3.1 Pro values (lines ~295–312) | Existing owner | Yes (pricing helper) |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` | Tests | — | AGY usage payload declares `base_excludes_cache` and carries raw input/cache_read | Existing test file | — |
| `autobyteus-server-ts/tests/unit/token-usage/...` (existing component-basis or run-fold test file) | Tests | — | AGY-shaped observation (input 6,110, cache_read 307,003) gives gross 313,113 and miss 6,110. A spanning-series case with an old-shape checkpoint is not flagged as regressed | Existing test area | — |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Tests | — | 3.1 Pro tier values; 3.8 Flash unchanged | Existing test file | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

Only the files above are modified. No new folders or files are created.

## Folder Boundary Check

N/A. No folder changes.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| AGY accounting | AGY usage `{input_tokens: 6110, cache_read_tokens: 307003}` gives the Token Meter gross 313,113, miss 6,110, read 307,003, hit ≈98.0% | Converter computing `accounting_input_tokens = input + cache` itself, or an `if (runtime === "antigravity_cli")` branch in the token-usage domain | Keeps the semantic owner single |
| 3.1 Pro tiers | Prompt 150K gives 2.00 / 0.20 / 12.00; prompt 250K gives 4.00 / 0.40 / 18.00 | Changing only the base `pricing(...)` and leaving the tiers stale | The tiers drive the actual cost |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Detecting old-shape AGY checkpoints and back-filling pre-upgrade cache reads | Spanning-series gross gap | Rejected | Fix-forward accepted by the user; no version branch |
| Re-pricing stored 3.1 Pro costs | Historical accuracy | Rejected (DEC-002) | Fix-forward |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. Change the AGY semantic literal and add the converter test.
2. Add the token-usage test for AGY-shaped accounting and the spanning-series fold.
3. Correct the 3.1 Pro catalog values and add the catalog test.
4. Run `pnpm -C autobyteus-ts test` (focused LLM catalog tests), `pnpm -C autobyteus-server-ts test:unit` (or the focused files), and `pnpm -C autobyteus-server-ts typecheck`.
5. Optional live check (AC-003): one short AGY Gemini run in an isolated app instance; the Token Meter shows gross ≥ cache reads and hit < 100%.

## Key Tradeoffs

- Fix-forward instead of repair: simplicity and zero migration risk, in exchange for historical AGY rows keeping inflated hit and historical 3.1 Pro costs staying overstated. User-approved.

## Risks

- A future AGY CLI version may change usage semantics. This is detectable by the live AGY E2E; no mitigation is added now.
- Price changes by Google are ordinary catalog maintenance.

## Guidance For Implementation

- Touch only the two production locations. Do not alter `resolveTokenUsageComponentBasis`, the run fold, or the Gemini native runtime.
- Keep the tier ids (`prompt_le_200k`, `prompt_gt_200k`) and the 200,000 boundary.
- Never print or commit credentials. The lab vault at `~/.autobyteus/investigations/gemini-cache-lab/` is outside the repository and must not be referenced by committed tests.
