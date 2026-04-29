# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement

Add support in `autobyteus-ts` for the currently confirmed latest model identifiers across the providers named by the user: OpenAI LLM/image, Anthropic Claude, DeepSeek, Moonshot/Kimi, and Google/Gemini TTS. The implementation must update the existing model registries/catalogs and tests so the new models appear in runtime model selection and can be used through the existing provider adapters. Provider adapter behavior should remain unchanged unless current official docs require a new request shape for a new model.

## Investigation Findings

Bootstrap and current-state investigation are complete in a dedicated ticket worktree. The main findings are:

- Worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models` on branch `codex/autobyteus-ts-latest-provider-models` from `origin/personal` commit `cef8446452af13de1f97cf5c061c11a03443e944`.
- Per user request, `.env.test` was copied from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test` to `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/autobyteus-ts/.env.test`. It remains ignored/untracked and must not be printed or committed.
- Official/provider docs as of 2026-04-25 confirm these in-scope additions:
  - OpenAI LLM: `gpt-5.5`.
  - OpenAI image: `gpt-image-2`.
  - Anthropic LLM: `claude-opus-4-7` API alias, exposed in this project as user-facing `claude-opus-4.7` to match existing dotted Claude names.
  - DeepSeek LLM: `deepseek-v4-flash` and `deepseek-v4-pro`.
  - Kimi/Moonshot LLM: `kimi-k2.6`.
  - Gemini TTS: `gemini-3.1-flash-tts-preview`; also register the currently documented `gemini-2.5-pro-preview-tts` via a user-facing `gemini-2.5-pro-tts` model, because the runtime mapping already contains the API/Vertex values but the audio catalog currently omits it.
- Official docs do not confirm a newer OpenAI speech-generation endpoint model than the already registered `gpt-4o-mini-tts`; do not add Chat Completions audio models to the speech-generation `OpenAIAudioClient` path as part of this task.
- Official Gemini docs do not confirm a “Gemini TTS 2.0 preview” API identifier; use the current documented TTS model IDs instead.
- `Claude Opus 4.7` requires Anthropic request-shape handling: fixed extended-thinking budgets are invalid, adaptive thinking replaces them, and non-default sampling parameters such as `temperature`, `top_p`, and `top_k` must not be injected by the adapter for this model.
- DeepSeek V4 uses the existing OpenAI-compatible Chat Completions base URL, so model registration plus optional config schema/test coverage should be sufficient.

## Recommendations

- Implement as a focused model-catalog and adapter-correctness change, not a provider subsystem redesign.
- Add exact official API IDs as `value`s; do not add fuzzy aliases such as `kimi-2.6` or `gemini-tts-2.0-preview`.
- Preserve existing registered models for now. DeepSeek’s old `deepseek-chat`/`deepseek-reasoner` names are scheduled for discontinuation on 2026-07-24, and Kimi’s old K2 series is scheduled for discontinuation on 2026-05-25, but both are still current enough on 2026-04-25 that removal is out of scope for this support task.
- Keep existing defaults unless a downstream product decision explicitly asks to switch default models. This task should add selectable support and validation, not silently change cost/latency defaults.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases

- UC-001: Users can select and run newly supported LLM models for OpenAI, Anthropic, DeepSeek, and Moonshot/Kimi through existing `autobyteus-ts` runtime configuration flows.
- UC-002: Users can select and run newly supported Google/Gemini TTS models through existing audio model flows.
- UC-003: Users can select and run newly supported OpenAI image models through existing image model flows.
- UC-004: Implementers can validate provider integrations when corresponding API keys are available in the copied `.env.test`; invalid/missing credentials should not block catalog support.
- UC-005: Existing supported models continue to be listable and creatable unless they are explicitly removed in a future deprecation task.

## Out of Scope

- Adding support for providers not named by the user.
- Adding video, realtime, transcription, Chat Completions audio-output, or other modalities not already represented by the existing LLM/audio/image catalog paths.
- Creating fuzzy/backward-compatible aliases for unconfirmed or misremembered model names.
- Removing old DeepSeek or Kimi models before their provider deprecation dates.
- Persisting or exposing API keys in artifacts, logs, test snapshots, or documentation.
- Broad UI redesign. Existing model list/configuration surfaces should pick up catalog additions.
- Full capability modeling for models whose supported operations differ from the current abstractions, except for minimal adapter guards needed to avoid known provider errors.

## Functional Requirements

- REQ-001: Register OpenAI `gpt-5.5` as an OpenAI LLM using the existing Responses API adapter path and docs-backed metadata/pricing.
- REQ-002: Register Anthropic `claude-opus-4.7` with API value `claude-opus-4-7`, docs-backed metadata/pricing, and an Anthropic request path that does not send invalid Opus 4.7 fixed thinking budgets or adapter-injected sampling parameters.
- REQ-003: Register DeepSeek `deepseek-v4-flash` and `deepseek-v4-pro` using the existing `DeepSeekLLM` OpenAI-compatible adapter and docs-backed metadata/pricing.
- REQ-004: Register Kimi/Moonshot `kimi-k2.6` using the existing `KimiLLM` OpenAI-compatible adapter, docs-backed metadata, and the same tool-workflow thinking normalization used for Kimi models that support non-thinking mode.
- REQ-005: Register OpenAI `gpt-image-2` in the image model catalog using `OpenAIImageClient`, with generation and edit endpoint support preserved as documented by OpenAI.
- REQ-006: Register Gemini TTS `gemini-3.1-flash-tts-preview` and the missing documented `gemini-2.5-pro-preview-tts` model in the audio catalog, and update Gemini runtime mapping when a runtime-specific value is required.
- REQ-007: Preserve existing model identifiers and defaults unless the implementation uncovers a direct conflict with a confirmed official provider deprecation/removal.
- REQ-008: Update unit/integration tests and fixtures that assert available model lists, metadata, provider-specific request payloads, and Gemini runtime mappings.
- REQ-009: Run focused integration tests for providers whose API keys are present and valid in the copied ticket-worktree `.env.test`; if a key is missing, invalid, quota-blocked, or model-access-blocked, record the skip/block reason rather than treating catalog support as failed.
- REQ-010: Do not print, copy into artifacts, snapshot, or commit `.env.test` values.

## Acceptance Criteria

- AC-001: `LLMFactory`/model list output includes `gpt-5.5`, `claude-opus-4.7`, `deepseek-v4-flash`, `deepseek-v4-pro`, and `kimi-k2.6` with correct provider classification and API `value`s.
- AC-002: `ImageClientFactory`/model list output includes `gpt-image-2`; existing `gpt-image-1.5` remains available.
- AC-003: `AudioClientFactory`/model list output includes `gemini-3.1-flash-tts-preview` and `gemini-2.5-pro-tts`; existing `gemini-2.5-flash-tts` and `gpt-4o-mini-tts` remain available.
- AC-004: Anthropic unit tests prove Opus 4.7 requests omit fixed-budget `thinking`, omit adapter-injected `temperature`, and can map an explicit adaptive-thinking config if exposed by the schema.
- AC-005: Kimi unit tests prove tool-workflow requests for `kimi-k2.6` get `thinking: { type: 'disabled' }` only when no explicit thinking override is present.
- AC-006: Gemini runtime mapping tests cover the newly registered TTS API value(s) for API-key and Vertex runtimes.
- AC-007: Existing catalog/runtime behavior and all touched unit tests pass locally.
- AC-008: Focused integration tests are run for valid available credentials, or skipped/recorded for invalid/missing/access-blocked credentials per provider.
- AC-009: `git status` does not include `.env.test`, and no artifact contains API key values.

## Constraints / Dependencies

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models`.
- Target package: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/autobyteus-ts`.
- Base branch: `origin/personal` at bootstrap time, commit `cef8446452af13de1f97cf5c061c11a03443e944`.
- User requested `.env.test` copying from the main checkout into the ticket worktree before testing.
- Latest model availability is time-sensitive; if implementation starts after a long delay, re-check official provider docs before coding.
- Live integration tests may consume paid provider quota; keep smoke tests minimal.

## Assumptions

- “workthree” in the request means the dedicated ticket worktree.
- “autobyteus-ts project” refers to `autobyteus-ts/` inside the superrepo.
- The user’s screenshot names examples/desired surfaces, not an exhaustive source of truth.
- Provider API contracts for OpenAI image, DeepSeek V4, Kimi K2.6, and Gemini TTS remain compatible with the current SDK/client paths unless live tests prove otherwise.

## Risks / Open Questions

- Some new models may be account-gated, quota-gated, region-gated, or unavailable to the copied test credentials even with correct code.
- OpenAI docs currently show `gpt-5.5-pro` as an official model, but its model-specific page indicates long-running/background-mode and streaming constraints; adding it is out of scope unless the implementation also adds explicit capability/streaming handling. Required OpenAI LLM support for this task is `gpt-5.5`.
- Anthropic Opus 4.7 has real request-shape differences; simply reusing the existing `claudeSchema` would create provider 400 errors.
- Gemini’s current official TTS docs do not match the user’s “2.0 preview” wording; the implementation should add current official IDs rather than an unconfirmed 2.0 alias.
- OpenAI `gpt-image-2` supports generation and editing, but image-size/quality option support should be verified against docs/SDK during implementation before widening schema enum values.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-001 |
| REQ-003 | UC-001 |
| REQ-004 | UC-001 |
| REQ-005 | UC-003 |
| REQ-006 | UC-002 |
| REQ-007 | UC-005 |
| REQ-008 | UC-001, UC-002, UC-003, UC-005 |
| REQ-009 | UC-004 |
| REQ-010 | UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | LLM model-selection support is visibly/catalog-wise available for each named LLM provider. |
| AC-002 | OpenAI latest image model is selectable without removing previous image support. |
| AC-003 | Gemini current TTS models are selectable through the audio factory. |
| AC-004 | Claude Opus 4.7 avoids known provider request errors. |
| AC-005 | Kimi K2.6 tool workflows preserve the existing safe non-thinking behavior. |
| AC-006 | Gemini API-key/Vertex runtime names resolve correctly for new TTS models. |
| AC-007 | Existing catalog/runtime behaviors remain stable under local checks. |
| AC-008 | Live-provider validation is attempted only when credentials allow it. |
| AC-009 | Secret handling remains safe. |

## Approval Status

Proceeding under the user’s direct implementation request. No additional clarification is required before architecture review, but downstream agents should route back to `solution_designer` if official provider docs contradict the confirmed target list above.
