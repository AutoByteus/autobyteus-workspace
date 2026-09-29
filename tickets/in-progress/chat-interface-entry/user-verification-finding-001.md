# User Verification Finding UVF-001: Chat model menu labels differ from the launch form

- Reported: 2026-09-29, by the user while testing the local build `AutoByteus_personal_macos-arm64-1.4.91-beta.4` (built from `4b440e719`).
- User report: the Chat footer model menu is "not as intuitive" as the agent/team launch form. For Claude Agent SDK it shows a bare `opus`, where the launch form shows `claude-opus-5-5` / "Opus 5.5". The user asked whether something is missing.
- Delivery classification: `Requirement Gap`. Recommended owner: `/solution_designer` (the user also named the Solution Designer).

## Evidence

Live catalog from the running app's backend (`providerModelCatalogSnapshots`, raw JSON in `delivery-evidence/catalog-claude_agent_sdk.json` and `catalog-codex_app_server.json`):

| `modelIdentifier` (Chat label) | `canonicalName` (launch form label) | `name` (launch form description / Chat hover) | recommended |
| --- | --- | --- | --- |
| `opus` | `claude-opus-5-5` | Opus 5.5 | **true** |
| `sonnet` | `claude-sonnet-5` | Sonnet 5 | false |
| `haiku` | `claude-haiku-4-5-20251001` | Haiku 4.5 | false |
| `claude-fable-5-1[1m]` | `claude-fable-5-1` | Fable 5.1 | false |
| `claude-opus-4-6` … `claude-opus-5`, `claude-sonnet-4-6`, `claude-fable-5` | same as the id | Opus 4.6 … | false |
| Codex `gpt-6-astra` (and 6 others) | `gpt-6-astra` | `GPT-6-Astra (default reasoning: medium)` | n/a |

**Nothing is missing.** Both surfaces show the same 10 Claude Agent SDK rows and the same 7 Codex rows, because both read `llmProviderConfigStore.providersWithModelsForSelection(runtimeKind)`. Only the labelling differs.

## Root cause

- The launch form (`RuntimeModelConfigFields.vue` → `useRuntimeScopedModelSelection` → `utils/modelSelectionOptions.ts` `buildModelSelectionGroups`) applies the product's shared label policy in `utils/modelSelectionLabel.ts`:
  - **Claude Agent SDK:** the label is `canonicalName`; the description is the display name plus the description; the `Recommended` badge comes from `selectionPresentation.recommended`; recommended rows are sorted first.
  - **Codex, AGY, Grok and other non-AutoByteus runtimes:** the label is the display `name`.
  - **AutoByteus:** the label is `modelIdentifier`.
  - **OpenAI-compatible and Qwen:** the label is the display `name`.
  - The selected label is `<Provider> / <label>`.
- The Chat menu (`composables/chat/useChatModelCatalog.ts` `modelGroups`, added in `797d49d6a`) does not use that policy. It always sets `name: model.modelIdentifier` (the code comment reads "Compact label ... the model identifier (never wraps)"). It shows the display name only as a hover title, and it ignores `canonicalName`, `selectionPresentation.recommended` and the recommended-first order. Chat search, the footer trigger (`modelLabel`) and the persisted-run fixed menu all inherit these identifier labels.
- The approved UI spec treats model names as illustrative and only requires "Model names never wrap". The requirements, the design and the spec never say that Chat must reuse `modelSelectionLabel` / `buildModelSelectionGroups`, so no review gate caught the divergence. API/E2E checked the menu structure, not label parity with the launch form.

## Decision needed (Solution Designer)

1. Should Chat reuse the shared label policy (canonical label, display-name description, `Recommended` badge and recommended-first order for Claude Agent SDK; display names for Codex and the others)?
2. How should the "never wrap" rule treat long display names such as `GPT-6-Astra (default reasoning: medium)` on the footer trigger and in the side submenu? Options: truncate with a tooltip, use a compact trigger label with full menu rows, or something else.
3. Should search match `canonicalName` and the display name as well as the identifier? Currently it matches the identifier, the display name, the provider and the runtime.

The likely implementation is small (web only, `useChatModelCatalog` plus the menu components and tests). The label and wrap rules are a product decision, which is why this goes upstream rather than to a local fix.

## Delivery state

Finalization stays on hold. Nothing was pushed, merged or released. Delivery resumes at a renewed integration refresh and user verification after the reworked package returns.
