# Implementation Handoff — gemini-native-cache-hit

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low, so the package came directly from Solution Designer with no independent architecture review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/requirements-doc.md` (SR-002, approved 2026-10-09)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/design-spec.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/probes/` (evidence only)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/handoff-architecture-design-complete.md`

## Current Implementation Summary

Two value fixes in their existing owners, plus focused unit tests. They are committed on branch `codex/gemini-native-cache-hit` (see the commit in `git log origin/personal..HEAD`).

1. **AGY usage semantic.** `AgyStreamEventConverter` now declares `input_token_semantic: "base_excludes_cache"`. The converter still emits only the raw reported fields (input, output, total, cache read, thinking). The existing `resolveTokenUsageComponentBasis` computes gross = input + cache read and miss = input.
2. **Gemini 3.1 Pro Preview prices.** The base is now `pricing(2.0, 12.0, { cachedInputReadTokenPricing: 0.2, ... })`. Tier `prompt_le_200k` is 2.0 / 12.0 / 0.2, and tier `prompt_gt_200k` is 4.0 / 18.0 / 0.4. The tier ids and the 200,000 boundary are unchanged. Reasoning output is billed at the tier's output price by the existing cost calculator, so REQ-004's reasoning-output price follows from the output values.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` › Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the production change is 9 changed lines in 2 existing files. It uses an existing enum value and the existing tier model, with no schema, API, ownership or persistence change. None of the three escalation triggers fired:
  1. No consumer hard-codes AGY as gross or depends on AGY miss = 0. A search of the server and web code found `antigravity_cli` only in runtime-selection and config code, not in token-usage logic.
  2. The fold does not flag a spanning AGY series as regressed (unit test below).
  3. No stored-row rewrite is needed.
- Selected route: Direct API/E2E (to be confirmed by `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes`. Checked: the converter declares and does not compute (no `accounting_*`, `standard_*` or `cache_miss_*` fields; the test asserts this). There is no AGY or version branch in the token-usage domain. `resolveTokenUsageComponentBasis`, the run fold and `GeminiLLM` are unchanged. 3.8 Flash is unchanged. No credentials or lab-vault references are in committed code or tests.
- New design impact or escalation trigger: `None`. One clarification for the record (not a design impact): in a spanning series, only the cache **miss** catches up to the true cumulative value. The design text said "miss/standard". `standard_input_tokens` is re-derived from the reported-input delta when the fold re-resolves the basis, so it does not catch up. AGY models are `price_missing`, so this affects no cost. It is a bounded one-time effect within the accepted fix-forward.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002 (REQ-002, AC-002) | AGY gross = input + cache read; miss = input | `agy-stream-event-converter.ts` (semantic literal) → `TokenUsageComponentBasisResolver` / `TokenUsageSnapshotDeltaNormalizer` → `foldTokenUsageObservation` (all unchanged) | Implemented. Unit test drives the real converter output through the production basis and snapshot steps into the fold: input 6,110 + cache read 307,003 gives gross 313,113, miss 6,110 and standard 6,110. A second cumulative snapshot adds the correct deltas. AC-003 (live Token Meter) is for user verification |
| BEH-003 (REQ-004, AC-005, AC-006) | Official 3.1 Pro tier prices; 3.8 Flash unchanged | `supported-model-definitions.ts` (3.1 Pro block) → `LLMFactory.getModelPricingInfo` → server price provider and `TokenCostCalculator` (unchanged) | Implemented. Catalog test asserts the base and both tiers through `getModelPricingInfo`. The existing 3.8 Flash test still passes unchanged |
| BEH-001 | Native Gemini runtime preserved | — | Untouched |
| REQ-005 / AC-007 | Fix-forward, no migration | No migration code; stored rows untouched | Spanning-series unit test with a pre-upgrade checkpoint: not flagged as regressed, miss catches up, and gross lacks the pre-upgrade cache reads, as accepted |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` (1 line)
- `autobyteus-ts/src/llm/supported-model-definitions.ts` (3.1 Pro pricing block, 8 lines)
- Tests:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts`: the AGY usage payload declares `base_excludes_cache` and carries only the raw counts.
  - `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-run-fold.test.ts`: the `agyResult` helper (real converter → basis resolver → snapshot normalizer), the AGY accounting case and the spanning-series case.
  - `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`: 3.1 Pro official tier prices.

## Important Assumptions

- The pre-upgrade checkpoint in the spanning test is built the way production built it: the same converter payload with the old `gross_includes_cache` semantic, passed through the production basis resolver and snapshot normalizer.
- The official 3.1 Pro prices are taken from the design (Vertex and AI Studio pricing pages, read 2026-10-09).

## Known Risks

- **AGY conversations that span the upgrade** (accepted fix-forward). On the first post-upgrade snapshot, the run's cache miss jumps once to the conversation's true cumulative miss. Gross never includes the pre-upgrade cache reads. Standard input does not catch up (see the clarification above); this has no cost effect because AGY is `price_missing`. Example from the test: before the upgrade, input 6,110 and cache read 307,003; after it, cumulative input 9,000 and cache read 400,000. The run then shows miss 9,000, read 400,000 and gross 101,997, where the true gross is 409,000.
- A future AGY CLI usage-format change (unchanged risk; the live AGY E2E would detect it).
- Historical 3.1 Pro costs stay overstated and historical AGY rows keep their inflated hit rate (DEC-001, DEC-002).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: both fixes are value-only changes in the declaring owners. The interpreting owners are unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The wrong literal and the wrong values were replaced in place.
- Dead code in the touched files and modules removed: `Yes`. None was found in the touched blocks.
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes` (no structure changes)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. The converter has 253 and the catalog 382 effective non-empty lines; the change delta is ≤ 8 lines.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` › Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: the spanning-series unit test on `foldTokenUsageObservation` with an old-shape checkpoint (`accounting = reported`, `standard = miss = 0`). The fold reads it with no regression flag, and the outcome matches the accepted fix-forward behavior.
- Migration implementation: N/A
- Deviation from the reviewed transition decision: `None`. See the standard-input clarification under Routing Classification.

## Environment Or Dependency Notes

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit`, branch `codex/gemini-native-cache-hit`, base `origin/personal` @ `927796780`.
- The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` folders are build output from the investigation and typecheck prebuild. Do not stage them.
- No credentials were used or written. The lab vault is not referenced by any test.

## Local Implementation Checks Run

These are implementation-scoped local checks only, not API/E2E sign-off. Logs are under `/tmp/gnch-*.log`.

| Check | Command | Result |
| --- | --- | --- |
| New tests fail without the fix | Production changes stashed, then the three focused test files run | 4 new tests failed against the old values, as expected; all other tests passed |
| Focused server tests | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-run-fold.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts --no-watch` | 89 / 89 passed |
| Server token-usage and AGY unit areas | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage tests/unit/agent-execution/backends/antigravity --no-watch` | 38 files passed, 4 skipped (gated); 415 tests passed, 6 skipped |
| Server unit baseline | `pnpm -C autobyteus-server-ts test:unit` | Passed: 666 files passed, 4 skipped; 5,103 tests passed, 7 skipped (gated) |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Passed |
| Catalog test | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/supported-model-definitions.test.ts --no-watch` | 17 / 17 passed |
| `autobyteus-ts` LLM unit area | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm --no-watch` | 399 / 400 passed. The 1 failure is pre-existing and unrelated (below) |

**Pre-existing base failure (TESTING.md Rule 9: cause found; product change outside this ticket, reported to the accountable owner).**

- Test: `autobyteus-ts/tests/unit/llm/api/compaction-single-attempt-transport.test.ts` › "sets Gemini retries on its isolated client after user extras, leaving the parent client unchanged". It times out after 20 s, with or without this change, and also with all Gemini environment variables unset.
- Cause: `GeminiLLM.buildGenerationConfig` copies the user's `extraParams` (here `httpOptions.retryOptions.attempts = 7`) into the per-request `generateContent` config. That request-level `httpOptions` overrides the `retryOptions.attempts = 1` that the isolated single-attempt client sets (`initializeGeminiClientWithRuntime`). The SDK (`@google/genai` 2.24.0) therefore retries the 503 several times with backoff. Removing the user retry extra from a throwaway copy of the test made it pass.
- Fix: a product change in `GeminiLLM`. The single-attempt retry must win over user `httpOptions` extras. This ticket's design forbids changing `GeminiLLM`, so the fix needs its own item.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`. These are backend and catalog value changes only; the Token Meter UI code is unchanged. The live Token Meter check (AC-003) is planned as user verification.

## Downstream Coverage Hints / Suggested Scenarios

- AGY fake-CLI E2E (`agy-*-transport.e2e.test.ts` with `tests/fixtures/agy-failure-cli.mjs`): a `result` event with `usage.cache_read_tokens` should reach the token-usage run record as gross = input + cache read and miss = input.
- 3.1 Pro tier selection through the server cost path: a prompt of 150K should price at 2.00 / 0.20 / 12.00, and a prompt of 250K at 4.00 / 0.40 / 18.00. The tier mechanism is unchanged; only the catalog values are new.
- AC-003 (user verification): one short live AGY Gemini run in an isolated app instance. The Token Meter should show gross ≥ cache reads, and a hit rate below 100% when any uncached input was reported.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Executable validation of BEH-002 through the server ingestion path (fake-CLI AGY E2E or the integration layer), and of BEH-003 through server pricing.
- AC-003 live check (user).
