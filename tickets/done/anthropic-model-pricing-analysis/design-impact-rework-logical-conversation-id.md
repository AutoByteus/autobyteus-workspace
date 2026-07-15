# Design Impact Rework: Anthropic `logicalConversationId` Runtime Failure

## Status

Design-impact rework prepared by `solution_designer` on 2026-07-07 after user reported a live Anthropic streaming failure.

## Trigger

User-provided screenshot showed Anthropic rejecting an AutoByteus Claude request with:

`logicalConversationId: Extra inputs are not permitted`

The user requested investigation with Claude LLM integration tests, noting that `.env.test` from the main checkout likely already contains an Anthropic API key.

## Investigation Summary

- Copied `.env.test` from the main checkout to the dedicated ticket worktree without printing secret values.
- Confirmed `ANTHROPIC_API_KEY` exists by key name only.
- Ran existing Anthropic integration suite:
  - Command: `pnpm exec vitest run tests/integration/llm/api/anthropic-llm.test.ts --reporter=verbose`
  - Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts`
  - Result: passed all existing tests.
  - Finding: existing tests do not pass `logicalConversationId`, so they missed the reported runtime path.
- Ran a temporary focused live probe calling `streamUserMessage(..., { logicalConversationId: "agent_probe" })` with `claude-opus-4.7`.
  - Result: reproduced the Anthropic rejection pattern for `logicalConversationId` reaching the provider request.
  - Temporary probe file was removed after reproduction.

## Root Cause

`autobyteus-ts/src/agent/loop/llm-phase.ts` intentionally adds `logicalConversationId` to LLM invocation kwargs so `AutobyteusLLM` can route hosted conversations.

`autobyteus-ts/src/llm/api/anthropic-llm.ts` currently forwards invocation kwargs into Anthropic SDK params after deleting only `stream`. This leaks AutoByteus-internal runtime fields into Anthropic's Messages API, which rejects extra fields.

`autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` already filters these internal kwargs, so the boundary rule exists but is duplicated/fragmented and absent in Anthropic.

## Required Design Update

The target design now includes a provider-boundary invariant:

- External provider adapters must filter internal AutoByteus invocation kwargs before SDK request construction.
- `logicalConversationId` remains valid and required for `AutobyteusLLM`; do not remove it from `LlmPhase`.
- Anthropic must preserve provider-valid kwargs such as `tools` and valid `thinking` overrides while filtering internal runtime kwargs.
- Prefer extracting/reusing a shared provider-request kwarg sanitizer over adding another private deny-list only in Anthropic.

## Updated Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-spec.md`

## Review Request

Architecture review should reassess the updated design for:

1. Whether the shared provider-request kwarg sanitizer is the right owner for the duplicated filtering policy.
2. Whether applying the sanitizer to `MistralLLM` in the same implementation is appropriate, given it also spreads raw kwargs and has the same latent leak risk.
3. Whether the minimal non-Fable Anthropic live validation for `logicalConversationId` is acceptable alongside deterministic mocked model-support tests.
