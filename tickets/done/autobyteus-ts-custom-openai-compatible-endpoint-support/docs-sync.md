# Docs Sync Report

## Scope

- Ticket: `autobyteus-ts-custom-openai-compatible-endpoint-support`
- Trigger: Round-5 validation passed on `2026-04-18` for the reviewed round-7 provider-centered custom OpenAI-compatible provider package, including the saved custom-provider delete lifecycle, custom-only friendly-label behavior, and the restored visible rectangular `New Provider` draft row.

## Why Docs Were Updated

- Summary: Long-lived docs were stale on the provider-centered public contract, the saved custom OpenAI-compatible provider lifecycle, provider-owned model metadata, targeted reload semantics, delete/removal behavior, warm-cache failure isolation, custom-only friendly selector labels, and the final Settings UI flow for saved custom providers, including the visible rectangular `New Provider` draft row.
- Why this should live in long-lived project docs: These behaviors are now part of the durable runtime and user-facing contract across `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`; leaving them only in ticket artifacts would preserve obsolete architecture and UX understanding.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/llm_module_design.md` | Canonical shared LLM architecture doc needed to reflect provider identity, runtime, reload semantics, and deletion-driven registry removal. | `Updated` | Added authoritative saved-provider-set sync behavior so deleted custom providers disappear from future sync/cold-start registry state. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Node.js-specific LLM doc needed the concrete TS ownership and identifier shape for saved custom providers. | `Updated` | Rewrote the TS-specific document around the final provider-centered implementation and added delete-driven registry removal semantics. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Server module doc needed the real GraphQL/provider lifecycle owners and persistence/sync behavior. | `Updated` | Replaced stale placeholder content with the authoritative provider lifecycle contract, including delete semantics and full-refresh removal behavior. |
| `autobyteus-web/docs/settings.md` | User-facing Settings doc needed the new provider browser/custom-provider flow and status semantics. | `Updated` | Added saved-provider delete behavior, custom-only friendly labels, the visible rectangular `New Provider` draft row, probe-before-save, duplicate-name protection, and write-only built-in secret handling. |
| `autobyteus-server-ts/README.md` | Checked whether top-level server setup docs needed end-user setup changes for this ticket. | `No change` | Current README remains accurate; the ticket changes provider-management behavior, not base server setup/bootstrap. |
| `autobyteus-web/README.md` | Checked whether top-level frontend setup docs needed custom-provider onboarding updates. | `No change` | Feature detail belongs in the canonical Settings doc rather than the high-level web README. |
| `README.md` | Checked whether workspace-level docs needed repository-wide release/setup updates. | `No change` | No workspace bootstrap/release workflow changes were introduced by this ticket. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/llm_module_design.md` | Architecture refresh | Documented provider identity vs provider type vs runtime, custom provider model identifiers, actual directory owners, provider-scoped reload/failure isolation, and authoritative removal of deleted custom-provider models from future sync/cold-start registry state. | The previous doc no longer matched the reviewed implementation or the validated delete lifecycle behavior. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Node.js implementation refresh | Documented official OpenAI Responses-path preservation, custom OpenAI-compatible provider sync, provider-owned identifiers, and the saved-provider-set rule that removes deleted custom providers from later sync/cold-start state. | Future TS maintainers need the final implementation shape, not the pre-refactor mental model. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Module contract rewrite | Added provider lifecycle owners, GraphQL queries/mutations, custom-provider persistence path, delete semantics, status semantics, runtime-kind scope, targeted reload behavior, and the full-refresh path used after delete. | The server module doc had only placeholder content and would mislead future work. |
| `autobyteus-web/docs/settings.md` | User-facing feature doc update | Added the unified provider browser, built-in write-only secret behavior, the visible rectangular `New Provider` draft row, custom-provider draft/probe/save flow, saved-provider delete behavior, duplicate-name validation, custom-only friendly label behavior, and custom-provider status meanings. | The Settings doc is the durable user/product reference for this flow. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Provider-centered public contract | Provider identity now lives on provider objects and model metadata (`providerId`, `providerName`, `providerType`) instead of endpoint/source overlays. | `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-server-ts/docs/modules/llm_management.md` |
| Saved custom OpenAI-compatible provider lifecycle | Probe-before-save, dedicated secret-bearing persistence, provider-targeted refresh, and runtime-kind scope belong to the server LLM management contract. | `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/llm_management.md` |
| Saved custom-provider delete lifecycle | Delete removes the persisted record first, then uses authoritative refresh so the deleted provider/models disappear immediately and stay absent after cold start. | `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/llm_management.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| Reload failure isolation | One broken custom provider must not wipe healthy providers; warm-cache failures can surface as `STALE_ERROR` while preserving last-known-good models. | `requirements.md`, `design-spec.md`, `validation-report.md` | `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-server-ts/docs/modules/llm_management.md` |
| Settings UX contract | Built-in providers stay write-only for secret hydration, custom providers are added through the standard visible rectangular `New Provider` row in the provider browser, saved custom providers can be removed from a details card, and save requires a fresh successful probe. | `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-web/docs/settings.md` |
| Custom-only friendly label rule | Custom `OPENAI_COMPATIBLE` models show friendly `provider.name / model.name` labels across shared selector consumers while built-ins keep identifier-based labels. | `implementation-handoff.md`, `validation-report.md` | `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Separate endpoint-specific public LLM subject for custom OpenAI-compatible entries | Provider-centered GraphQL/provider lifecycle contract under `LlmProviderService` and `ProviderWithModels.provider` object payloads | `autobyteus-server-ts/docs/modules/llm_management.md` |
| Source-aware / `providerInstance*` / `modelSource*` overlay mental model for LLM models | Provider-owned model metadata (`providerId`, `providerName`, `providerType`) and provider-specific model identifiers | `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| Separate custom-endpoint manager UX expectation | One provider browser with an `Add custom provider` draft flow inside Settings | `autobyteus-web/docs/settings.md` |

## Round-5 Reassessment

- Trigger: `Round-5 API / E2E validation passed after refreshing the stale UI-specific evidence for the restored visible New Provider draft row.`
- Additional long-lived docs updated in this handoff: `None`
- Current docs truthfulness check: `Pass`
- Notes: Existing canonical docs already match the current implementation state: the provider browser shows the standard visible rectangular `New Provider` draft row, the compact plus-only affordance is gone, and clicking that row still opens the draft custom-provider editor flow.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the round-5 UI delta on top of the round-3 provider-centered baseline, `handoff-summary.md` has been refreshed, and archival/commit/push/merge/deployment work remains blocked only on explicit user verification.
