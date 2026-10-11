# Implementation Handoff — Claude Sonnet 5.5 and Claude Haiku 5.5 support

- Package: `claude-sonnet-haiku-5-5-model-support`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`
- Branch: `codex/claude-5-5-model-support`. Base: `origin/personal` @ `228cd9b5e` (rebased in IR-002; was `ff227eb72`).
- Commits on the base: `bc1777e02` (feature, was `22c3c89fa`), `68269cfae` (live E2E, was `30541612c`), `b38d0a909` (SR-007 refactor). The branch is unpublished. The ticket folder stays untracked.
- Uncommitted on purpose: `autobyteus-server-ts/docs/modules/token_usage.md` (Delivery commits it, D-SR7-6).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: SR-007 is Small/Low, so the route is direct implementation with no independent architecture review. That review is `N/A — not applicable` under the route rule.
- Requirements doc (Approved 2026-10-09, unchanged): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/requirements-doc.md`
- Investigation notes (AF-001..AF-022): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/investigation-notes.md`
- Solution revision record (current `SR-007`): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/solution-revision-record.md`
- Design spec (Ready, SR-007 section "Revision SR-007"): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/solution-handoff.md`
- Supplemental task artifacts: None.
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: independent code review CRR-001, `/Users/normy/autobyteus_org/independent-reviews/claude-sonnet-haiku-5-5-model-support/independent-code-review-report.md` (CR-001..CR-006), turned into design items D-SR7-1..D-SR7-6 by SR-007.

## Current Implementation Summary

- Implementation cycle: `Rework` (design revision SR-007)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-004`..`SR-007`
- Related code-review revision IDs: `CRR-001` (independent review). Architecture-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `API-REV-001`, `API-REV-002` (earlier validation). Delivery revision IDs: `DR-001`, `DR-002` (earlier delivery).
- Triggering finding IDs: `CR-001` (rebase part), `CR-002`, `CR-003`, `CR-004`

### IR-002 delta (SR-007)

1. **D-SR7-4 / CR-001, rebase.** I discarded the uncommitted `TESTING.md` edit (the `tcgetattr` note; its text is kept in design-spec D-SR7-6). Then I rebased both commits onto `origin/personal` @ `228cd9b5e` (newer than `d72d2018b`) with `--autostash`. The only conflict was `TESTING.md` in the E2E commit. I resolved it with origin's version, so `git diff 228cd9b5e HEAD -- TESTING.md` is empty and both per-suite rows are gone. The `token_usage.md` edit survived the autostash. Since `ff227eb72`, origin changed only one file in the escalation-sensitive areas: `autobyteus-server-ts/tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts` (+4 lines, unrelated agy test). Nothing changed in `autobyteus-ts/src/llm`, token-usage pricing, `tests/e2e/helpers` or the Anthropic live E2E files. `git merge-tree --write-tree HEAD origin/personal` is clean.
2. **D-SR7-1 / CR-002.** `AnthropicModelRequestPolicy` is now a union keyed by `thinkingMode`. Only the `adaptive` variant has `thinkingOffShape`, and `rejectsForcedToolChoice` is on all three variants. The mode descriptions moved onto the variants. I removed `AnthropicThinkingMode`, which had no references. The Opus 5.5 row is now `{ thinkingMode: 'adaptive_required', rejectsForcedToolChoice: true }` and `LEGACY_BUDGET_POLICY` is `{ thinkingMode: 'legacy_budget', rejectsForcedToolChoice: false }`. The adapter needed no logic change: both readers of `thinkingOffShape` (`sanitizeExplicitThinking` after its `!== 'adaptive'` early return, and the `case 'adaptive'` branch of `buildThinkingFromToggle`) narrow without casts.
3. **D-SR7-2 / CR-003.** In `validateStrictRequestRules`, the two `adaptive_required` errors now read `Anthropic model ${modelValue} supports adaptive thinking only; disabled and manual thinking are unavailable.` and `Anthropic model ${modelValue} does not support explicit sampling parameters.` The existing substring assertions in `anthropic-llm.test.ts` pass unchanged. I added one small test (`anthropic-llm-claude-5-5.test.ts`, "adaptive-required local errors") that asserts both full Opus 5.5 messages and that no SDK call is made.
4. **D-SR7-3 / CR-004.** I added an explicit `'claude-sonnet-4-6': LEGACY_BUDGET_POLICY` row. That one constant serves as both the row and the resolver's result for a value without a row. The resolver stays total, and its comment now says the fallback is reached only by non-catalog test fixtures. I kept the `hasOwnProperty` guard. I deleted the `it.each` unsupported-ID block from the policy test, and its helpers now use `AnthropicThinkingOffShape`. Docs:
   - `provider_model_catalogs.md`: the dated-snapshot sentence now says "Every Anthropic catalog row has an explicit entry; a unit test pins each row's policy.", and the `any other value (e.g. claude-sonnet-4-6)` row is now `claude-sonnet-4-6`.
   - `llm_module_design_nodejs.md`: the line now reads "every catalog row has an explicit entry, including the fixed-budget `claude-sonnet-4-6`".
5. Request payloads did not change for any model. No existing test's expected payload or matched substring changed, so the escalation trigger did not fire.

What was built (IR-001, still current except where IR-002 above supersedes it):

1. **New `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts`.** It holds one exact-value table of per-model request rules: `thinkingMode`, `thinkingOffShape` and `rejectsForcedToolChoice`. The pure resolver `resolveAnthropicModelRequestPolicy(modelValue)` returns the row for a model, and any value without a row gets the legacy fixed-budget policy. The file has no imports.
2. **`anthropic-llm.ts` request shaping now reads only that policy.** Shaping runs in this order:
   1. `validateStrictRequestRules`: the `adaptive_required` preflight (Opus 5.5 messages kept verbatim) and the generic forced-`tool_choice` rejection;
   2. `sanitizeExplicitThinking`;
   3. `buildThinkingFromToggle`;
   4. strip sampling parameters, or inject the legacy `temperature: 0`.

   Removed: `matchesAnthropicModelFamily`, the old local policy type and resolver, and both `modelValue === 'claude-opus-5-5'` blocks.
3. **New catalog rows.**
   - `claude-sonnet-5-5`, placed after `claude-opus-4.7`, uses the new `claudeSonnet55Schema` (toggle defaults to off, display defaults to `summarized`).
   - `claude-haiku-5-5`, the last Anthropic row, uses the existing `claudeAdaptiveThinkingSchema`.
   - Both have 1M/1M/128k limits (`maxOutputTokens: 128_000`, per AF-012), image input, and Standard pricing. Haiku's pricing has the `prompt_le_100k` / `prompt_gt_100k` tiers.
4. **Tests.**
   - New: `anthropic-model-request-policy.test.ts` and `anthropic-llm-claude-5-5.test.ts`.
   - Updated: `supported-model-definitions.test.ts`.
   - New server cases: Haiku 5.5 tier selection in `token-cost-calculator.test.ts`.
5. **Docs.** Updated `autobyteus-ts/docs/provider_model_catalogs.md` (rows, policy table, pricing) and `autobyteus-ts/docs/llm_module_design_nodejs.md`.

## Routing Classification (Mandatory)

- Task size: `Small` (SR-007 delta; the cumulative ticket was `Medium`)
- Architecture risk: `Low`
- Design classification reference: design-spec.md, sections "Task Size And Architectural Risk (Mandatory)" and "Revision SR-007 → Classification (SR-007)"
- Classification confirmed or changed: `Confirmed` (IR-002)
- IR-002 evidence:
  - Three source/test files changed: type-only, message-only and one row. Plus two doc paragraphs and one new 13-line test.
  - The rebase conflict was docs-only (`TESTING.md`).
  - No payload change. The five existing Anthropic test files are byte-identical to the base.
  - No new origin change touches the escalation areas.
- IR-001 evidence and rationale:
  - The change stayed inside `src/llm` (one new 45-line leaf file, the adapter refactor and two catalog rows), plus tests and docs.
  - No API, GraphQL, persistence, security, concurrency or deployment change.
  - The escalation trigger did not fire. The five existing Anthropic test files (`anthropic-llm`, `anthropic-llm-prompt-caching`, `anthropic-signed-tool-continuation`, `anthropic-conversation-prefix-flow`, `provider-native-request-payloads`) pass with **no expected-payload changes**, 59/59. The only existing test edited is the catalog order and slice bounds, which the design anticipated.
  - The live API accepted every shape the adapter generated (see AC-011).
- Selected route: `Direct API/E2E` (Small/Medium + Low)
- Lightweight implementation self-review completed: `Yes` (see "Self-review notes" below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, 002, 005, 008, 013 / AC-001, AC-006, AC-012) | Two new selectable rows with schemas | `anthropic-supported-model-definitions.ts` → `supported-model-definitions.ts` aggregate → `LLMFactory.buildSupportedModels` (staticMetadata → `maxOutputTokens` 128000) → server catalog → schema-driven web thinking menu | Done. Both schemas carry exactly `thinking_enabled` + `thinking_display`, the same keys as Sonnet 5. `llmThinkingConfigAdapter.ts` derives the Off/On toggle from `thinking_enabled` and the display options from `thinking_display`, so the control set is the same. |
| BEH-002 (REQ-005..012 / AC-004..011) | Per-model request shaping; existing shapes preserved | `AnthropicLLM.buildRequestParams` → `applyAnthropicRequestParams` → `resolveAnthropicModelRequestPolicy` (`anthropic-model-request-policy.ts`) | Done. Sonnet 5.5 off → `{type:'between_tools'}`; Haiku 5.5 off → `{type:'disabled'}`; on → `{type:'adaptive'[, display:'summarized']}`. No sampling and no manual budget. Forced `tool_choice` on Sonnet 5.5 throws `Anthropic model claude-sonnet-5-5 does not support forced tool choice.` before the SDK call. Existing models are unchanged (AC-010). Native-turn continuation is unchanged and works for both models (AC-009). |
| BEH-003 (REQ-003, 004 / AC-002, AC-003) | New prices and tiers; calculator unchanged | Catalog `pricingConfig` → server `TokenCostCalculator.selectTier` (gross `accounting_input_tokens`, `<=`) | Done. The server calculator code is untouched; new test cases prove cache reads **and** cache writes count toward the 100k boundary. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Untouched: effort parameter, beta `display:"updates"`, Bedrock/Vertex/Batch/Fast pricing, Opus 5 `disabled`, Fable 5.1 forced tool choice, prompt caching, native-history policy, server calculator code, finish table, output-limit recovery.

## Key Files Or Areas

- `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` (new, 45 effective lines)
- `autobyteus-ts/src/llm/api/anthropic-llm.ts` (request-shaping region about L101-235; 370 effective lines)
- `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` (`claudeSonnet55Schema`, two rows)
- `autobyteus-ts/tests/unit/llm/api/anthropic-model-request-policy.test.ts` (new)
- `autobyteus-ts/tests/unit/llm/api/anthropic-llm-claude-5-5.test.ts` (new)
- `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`
- `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts`
- `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md`

## Important Assumptions

- Prices, limits and accepted thinking shapes are taken from the Anthropic docs read on 2026-10-09 (requirements and design evidence). The live smoke confirms the accepted request shapes, not the prices.
- Model values are exact catalog values; there are no dated snapshot IDs (AF-003). After IR-002, every catalog row has an explicit policy entry. The resolver's fixed-budget result for a value without a row is reached only by non-catalog test fixtures, and it is neither tested nor documented as a product behavior (SR-007).

## Known Risks

- **Edge-behavior tightening from the design's rule matrix.** On adaptive models, an explicit caller `thinking` value now survives only if its type is `adaptive` or the model's own off shape. Before, any non-`enabled` value passed through, except `disabled` on models that don't support it. This affects:
  - a non-object `thinking`;
  - an unknown type such as `between_tools` on Sonnet 5 or Haiku 5.5.

  These are no longer forwarded. No supported caller sends these, and no existing test covers them.
- ~~Opus-named messages keyed to the mode~~: resolved in IR-002 (CR-003). All three local errors now name the model value.
- **Live signed-thinking replay.** My IR-001 smoke didn't exercise it; API/E2E later did (Sonnet Off 2, Sonnet On 3, Haiku On 4 signed blocks; CRR-001 AC-009).
- **No live re-run after IR-002.** No payload changed, so the earlier live evidence still applies to the request shapes. API/E2E decides whether the rebase warrants a re-run (D-SR7-5).
- **Out of scope, unchanged:** reviewer residual risks 1–4 and C-10 (Opus 5.5 rejecting `thinking_enabled: false`).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` (with `Shared Structure Looseness`)
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`
- Routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The policy extraction removed the three scattered mechanisms (prefix family list, Sonnet-5 prefix rule, two Opus 5.5 blocks).
  - The adapter shrank: 76 lines added, 80 removed.
  - `rejectsSamplingParameters` is gone; it is now derived from `thinkingMode !== 'legacy_budget'`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed `matchesAnthropicModelFamily`, the old policy type and resolver, `sanitizeThinkingParam` and `buildThinkingParam` (replaced), and both Opus 5.5 blocks.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. Since IR-002 the policy is a union keyed by `thinkingMode`, and `thinkingOffShape` exists only on the `adaptive` variant, so every field has one meaning (CR-002).
- Canonical shared design guidance reapplied: `Yes`
- Dead code removed in IR-002: the unreferenced `AnthropicThinkingMode` type, and the unsupported-ID test cases.
- Changed source files within size guardrails: `Yes`. `anthropic-llm.ts` has 374 effective lines (under 500); the IR-002 delta is +4/−2. `anthropic-model-request-policy.ts` has 48 effective lines.
- Notes: the policy file is a leaf with no imports, as the dependency rule requires.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec "Persisted Data / State Transition Decision")
- Implementation follows it: `Yes`. Static catalog rows and request shaping only; stored token-usage records keep their captured prices.
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree had no `node_modules`, so I ran `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` (the server tests and typecheck need the generated client). The lockfile did not change.
- The install/prepare step left untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. These are build outputs, not committed and not part of this change.
- No SDK change: `@anthropic-ai/sdk@0.132.1` already types `between_tools` (AF-004), and the build passes.
- AC-011 live smoke used `ANTHROPIC_API_KEY` from the agent environment. The script is outside the repo at `/tmp/c55-smoke/smoke.mjs`, with results in `/tmp/c55-smoke/result.json`. The key was not logged.

## Local Implementation Checks Run

All are implementation-scoped local checks, not API/E2E sign-off.

IR-002 (on HEAD `b38d0a909`, base `228cd9b5e`):

| Check | Command | Result |
| --- | --- | --- |
| Core typecheck (the union must narrow without casts) | `npx tsc -p tsconfig.build.json --noEmit` in `autobyteus-ts` | Clean |
| LLM unit suite | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` | 74 files / 524 tests pass (528 − 5 deleted unsupported-ID cases + 1 new Opus 5.5 error case) |
| Full core unit suite | `pnpm -C autobyteus-ts exec vitest run tests/unit` | 305 files / 1974 tests pass |
| Server calculator | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/pricing/token-cost-calculator.test.ts --no-watch` | 15/15 |
| Existing Anthropic test files unchanged | `git diff --stat 228cd9b5e -- <anthropic-llm, -prompt-caching, -signed-tool-continuation, -conversation-prefix-flow, provider-native-request-payloads>` | Empty |
| `TESTING.md` equals origin | `git diff 228cd9b5e HEAD -- TESTING.md` | Empty |
| Merge with origin | `git merge-tree --write-tree HEAD origin/personal` | No conflict |

Testing-guideline note (IR-002): origin's rewritten `TESTING.md` lists `pnpm -C autobyteus-ts exec vitest run tests/unit` for the core library and one-file server runs with `exec vitest run <path> --no-watch`. I used both. No discrepancy found.

IR-001:

| Check | Command | Result |
| --- | --- | --- |
| Existing Anthropic tests, unchanged (escalation trigger) | `pnpm -C autobyteus-ts exec vitest run` on the 5 existing Anthropic files | 59/59 pass, no expected-payload edits |
| New policy table test | `.../anthropic-model-request-policy.test.ts` | 6/6 |
| New Claude 5.5 adapter test (sync + stream, AC-004..AC-009) | `.../anthropic-llm-claude-5-5.test.ts` | 24/24 |
| Catalog test | `.../supported-model-definitions.test.ts` | 19/19 |
| LLM unit suite | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` | 74 files / 528 tests pass |
| Full core unit suite | `pnpm -C autobyteus-ts exec vitest run tests/unit` | 305 files / 1978 tests pass |
| Core build/typecheck | `pnpm -C autobyteus-ts build` | Pass (`tsc -p tsconfig.build.json`, runtime-deps OK) |
| Server pricing/token-usage unit tests | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage --no-watch` | 17 files / 111 tests pass, including 4 new Haiku tier cases |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Pass |
| AC-011 live smoke through the built `AnthropicLLM` (models built the same way as `LLMFactory`) | `node /tmp/c55-smoke/smoke.mjs` | 13/13 PASS (see below) |

AC-011 live smoke detail. For each model, I ran thinking off (schema defaults) and thinking on (`summarized`). Each run was a plain sync call, then a streaming `tool_use` turn, then a streaming continuation with the tool result and the stored native assistant turn.
- `claude-sonnet-5-5`, off (`between_tools`): pong; `finish=tool_calls`; the continuation answered.
- `claude-sonnet-5-5`, on: pong; `tool_calls`; the continuation answered.
- `claude-haiku-5-5`, off (`disabled`): pong; `tool_calls`; the continuation answered.
- `claude-haiku-5-5`, on: pong; `tool_calls`; the continuation answered.
- Sonnet 5.5 with `tool_choice:{type:'any'}`: rejected locally with the generic message, and no API call was made.

Testing-guideline discrepancy: none found. TESTING.md says the `autobyteus-ts` `test` script is a placeholder, so I used `exec vitest run` as it directs.

## Self-review notes (direct-route lightweight review)

IR-002:
- The union matches design-spec D-SR7-1 exactly. No optional `thinkingOffShape?` and no `'not_applicable'` value. Narrowing compiles with no casts.
- The policy table values are unchanged except the added `claude-sonnet-4-6` row, which has the same value the fallback gave. So every model resolves to the same policy facts as before (the catalog-pinning test passes).
- The error texts match D-SR7-2 word for word, and the forced-tool-choice message is unchanged.
- I left the out-of-scope items (D-SR7-5 headers, D-SR7-6 docs sync, `token_usage.md` commit) to their owners.

IR-001:

- The policy table exactly matches the design-spec table, and the table test pins every catalog row so a new row can't go unclassified.
- I mapped the adapter rule matrix row by row: toggle on/off/absent, explicit `thinking`, `thinking_budget_tokens`, sampling, forced `tool_choice`. Opus 5.5 behavior and messages are preserved (existing test passes). Opus 5.5's forced-tool-choice error now uses the generic message, which existing tests match by substring.
- `between_tools` is sent as exactly `{type:'between_tools'}` (a test proves an extra `display` field is stripped). `display` is only ever sent with `type:'adaptive'`.
- Untouched, as required: `anthropic-native-history-policy.ts`, prompt caching, server calculator code, finish table, output-limit recovery.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`. No frontend code changed. The thinking UI is driven by the schema (AF-007). The new schemas have the same keys and types as Sonnet 5's schema, which the existing UI already renders as `Off · On` + display. Sonnet 5.5's schema differs only in its `summarized` default, which the start surfaces write explicitly. I did not visually inspect the rendered menu for the new rows; that remains a downstream check if wanted.

## Downstream Coverage Hints / Suggested Scenarios

- Through the real server: with Sonnet 5.5 and Haiku 5.5, run an agent that makes at least one tool call, with thinking off and on. Expect no 400 errors, and Sonnet 5.5 progress notes visible when display is `summarized`.
- The Anthropic prompt-caching live E2E with `ANTHROPIC_CACHE_E2E_MODEL=claude-sonnet-5-5`, then `claude-haiku-5-5`. It uses the strict preserved-thinking check, which would also exercise signed-thinking replay with a prompt that actually triggers thinking.
- Token Meter: a Haiku 5.5 run whose gross input (including cache) crosses 100k should be costed at the `prompt_gt_100k` rates.
- Frontend: the model picker lists both rows. The Thinking menu shows Off/On + display, with Sonnet 5.5's display preselected as Summarized and Haiku's as Omitted.
- Native output limit: unconfigured streaming requests for both models carry `max_tokens: 128000`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

IR-002, for `api_e2e_engineer`:
- D-SR7-5 (CR-001, CR-006): put the exact run commands, plus the corrected size and cost, in both live E2E test headers. That is `autobyteus-claude-5-5-live.e2e.test.ts` (about 22 calls, one ~240K-gross Haiku call costing about $0.24) and `autobyteus-anthropic-prompt-caching-live.e2e.test.ts`. The command text is in design-spec D-SR7-4.
- Validate the revised package, and decide whether the rebase warrants a live re-run (no payload changed).
- Downstream for Delivery: D-SR7-6, i.e. commit `token_usage.md`, place or drop the `tcgetattr` note in `secret_management.md`, and re-run docs sync.

IR-001: API/E2E validation by `api_e2e_engineer` is still required: real-server runs, the frontend picker and Thinking menu, signed-thinking continuation with real thinking output, and Token Meter tier costing. The local unit tests and the adapter-level live smoke above are implementation self-checks only.
