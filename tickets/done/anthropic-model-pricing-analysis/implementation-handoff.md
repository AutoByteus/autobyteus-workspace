# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-spec.md`
- Design-impact rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-impact-rework-logical-conversation-id.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-review-report.md`

## What Changed

Implemented the reviewed Anthropic latest-model support plus Round 2 provider-boundary rework in `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis`:

- Added exact static Anthropic catalog rows for `claude-sonnet-5` and `claude-fable-5`; retained/fixed `claude-opus-4.8`.
- Did not add `claude-sonnet-4.8` or any alias/fallback.
- Added/refreshed Anthropic standard pricing with explicit cache read, 5-minute cache write, and 1-hour cache write dimensions for Fable 5, Opus 4.8, and Sonnet 5.
- Used durable standard Sonnet 5 pricing (`$3` input / `$15` output per MTok), not temporary launch pricing.
- Replaced the Opus-4.7-only Anthropic request predicate with a provider-local current-model request policy for Opus 4.8, Opus 4.7, Sonnet 5, and Fable 5.
- Added `src/llm/api/provider-request-kwargs.ts` as the shared external-provider request kwarg sanitizer for internal AutoByteus invocation fields including `logicalConversationId`.
- Updated `AnthropicLLM` to use the sanitizer in sync and streaming request paths while preserving provider-safe kwargs such as `tools`, `metadata`, and provider-valid `thinking`.
- De-duplicated `OpenAICompatibleRequestBuilder` onto the shared sanitizer while preserving existing `tools` / `tool_choice` behavior.
- Applied the same sanitizer to `MistralLLM` sync and streaming request construction; no implementation blocker appeared, so no Mistral follow-up is needed for this specific raw-kwargs leak.
- Kept `logicalConversationId` intact for `LlmPhase` / `AutobyteusLLM`; the fix is only at external provider request boundaries.
- Added deterministic tests for sanitizer behavior, Anthropic payload filtering, Mistral payload filtering, OpenAI-compatible builder regression, catalog/pricing rows, metadata, and server-facing model/pricing surfaces.
- Added and ran the approved minimal non-Fable live Anthropic `logicalConversationId` streaming validation.
- Updated durable docs for exact Anthropic IDs, static reload behavior, Fable caveats, current-model request shape, and the shared provider request kwarg boundary.

## Key Files Or Areas

Source:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/src/llm/api/provider-request-kwargs.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/src/llm/api/anthropic-llm.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/src/llm/api/mistral-llm.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/src/llm/supported-model-definitions.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`

Tests:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/provider-request-kwargs.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/openai-compatible-request-builder.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/integration/llm/llm-reloading.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts/tests/unit/llm-management/providers/autobyteus-llm-model-provider.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts`

Docs:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/docs/provider_model_catalogs.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/docs/llm_module_design_nodejs.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/docs/llm_module_design.md`

## Important Assumptions

- Official Anthropic docs were rechecked on 2026-07-07 in the earlier implementation pass and remain the basis for the model/pricing rows:
  - `https://platform.claude.com/docs/en/about-claude/models/overview`
  - `https://platform.claude.com/docs/en/about-claude/pricing`
  - `https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5`
  - `https://platform.claude.com/docs/en/build-with-claude/working-with-messages`
- Static catalog support remains the correct ownership boundary; no dynamic Anthropic discovery was implemented.
- `logicalConversationId` is intentionally retained for hosted `AutobyteusLLM` routing and is filtered only before external provider SDK requests.
- Fable 5 is catalog-available only. No default/fallback routing was added.
- The live Anthropic validation was limited to the user-approved non-Fable `logicalConversationId` runtime bug. No Fable or Anthropic model-matrix live tests were run.

## Known Risks

- Only one minimal live Anthropic non-Fable runtime path was validated. Broader provider behavior is covered by deterministic request-payload tests and remains for downstream coverage investigation if needed.
- No live Mistral validation was run; Mistral sanitizer adoption is covered by deterministic payload tests only, as approved by architecture review.
- Fable 5 cost, data-retention, and refusal behavior caveats may need future UX/fallback work if product wants more than catalog availability.
- Sonnet 5 temporary launch pricing through 2026-08-31 is documented but not encoded; the static catalog intentionally uses durable standard pricing.
- Other external adapters beyond Anthropic, OpenAI-compatible, and Mistral were not broadly audited in this rework.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + bug fix.
- Reviewed root-cause classification: Missing provider-boundary invariant plus duplicated provider-kwarg filtering policy; initial Anthropic model-support issue remains missing invariant with local implementation defect.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, targeted to LLM provider request-building boundaries.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes for the prior `logicalConversationId` discovery; Round 2 design passed and this rework implements it. No new design-impact issue found during rework.
- Evidence / notes: Shared sanitizer owns the internal kwarg deny-list once, Anthropic and Mistral no longer raw-spread invocation kwargs into external SDK params, OpenAI-compatible uses the shared helper, and `AutobyteusLLM` still consumes `logicalConversationId` unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: No `claude-sonnet-4.8` source catalog row or stale `isClaudeOpus47` source predicate remains. Changed source line counts: `provider-request-kwargs.ts` 48, `anthropic-llm.ts` 306, `openai-compatible-request-builder.ts` 77, `mistral-llm.ts` 147, `supported-model-definitions.ts` 428, `curated-model-metadata.ts` 198.

## Environment Or Dependency Notes

- Dependencies were already restored with `pnpm install --frozen-lockfile` in the earlier implementation pass; no lockfile changes resulted.
- Existing `autobyteus-ts/.env.test` was used by Vitest for the approved live Anthropic validation. No secret values were printed.
- No commits were created by implementation.

## Local Implementation Checks Run

Implementation-scoped checks:

- `pnpm exec vitest run tests/unit/llm/api/provider-request-kwargs.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/anthropic-llm.test.ts tests/unit/llm/api/provider-native-request-payloads.test.ts tests/unit/llm/supported-model-definitions.test.ts tests/integration/llm/llm-factory-metadata-resolution.test.ts`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts`
  - Result: passed, 6 files / 46 tests.
  - Note: expected mocked timeout warning appears in the metadata fallback test.
- `pnpm exec vitest run tests/unit/llm/api/openai-compatible-llm.test.ts`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts`
  - Result: passed, 1 file / 12 tests.
- `pnpm exec vitest run tests/integration/llm/api/anthropic-llm.test.ts -t logicalConversationId --reporter=verbose`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts`
  - Result: passed, 1 live non-Fable Anthropic test passed / 4 non-matching tests skipped.
- `pnpm run build`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts`
  - Result: passed; `tsc -p tsconfig.build.json` and runtime dependency verification OK.
- `pnpm exec vitest run tests/unit/llm-management/providers/autobyteus-llm-model-provider.test.ts tests/unit/token-usage/pricing/token-price-config-provider.test.ts tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts`
  - Result: passed, 3 files / 6 tests.
- `git diff --check`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis`
  - Result: passed.
- Source/catalog guard checks:
  - `grep -R "claude-sonnet-4\.8\|claude-sonnet-4-8" -n autobyteus-ts/src || true` produced no source matches.
  - `grep -R "isClaudeOpus47" -n autobyteus-ts/src autobyteus-ts/tests || true` produced no matches.

## Downstream Coverage Hints / Suggested Scenarios

- Confirm API/E2E coverage investigation treats the new shared sanitizer as durable coverage for external provider request boundaries.
- Suggested scenario focus:
  - Anthropic model browser/static catalog exposes `claude-fable-5`, `claude-opus-4.8`, and `claude-sonnet-5`, and does not expose `claude-sonnet-4.8`.
  - Anthropic targeted reload remains static-count behavior, not dynamic discovery.
  - Token pricing consumers see Anthropic cache dimensions (`cached_input_read`, `cached_input_write_5m`, `cached_input_write_1h`) for Fable 5, Opus 4.8, and Sonnet 5.
  - Runtime payload construction omits manual fixed-budget thinking and sampling fields for target current Anthropic models in streaming and non-streaming paths.
  - External provider payloads do not include internal kwargs such as `logicalConversationId`, while `AutobyteusLLM` still requires and consumes that kwarg.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. Downstream coverage investigation/execution is still required. The implementation did run the approved minimal non-Fable live Anthropic `logicalConversationId` validation, but no Fable/model-matrix live tests were run and broader coverage ownership remains downstream.
