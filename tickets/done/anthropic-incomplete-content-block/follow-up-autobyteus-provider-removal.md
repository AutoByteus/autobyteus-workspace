# Follow-up Ticket Request — Remove the AutoByteus remote provider

- **Created:** Project Task `project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546`, "Remove the AutoByteus remote-server LLM provider integration (clean-cut deletion)". Status TODO (not dispatched), confirmed by `/project_task_manager` on 2026-10-10.

- Requested by: the user, 2026-10-10, in the anthropic-incomplete-content-block conversation ("ask project task manager to create a follow up ticket").
- Origin: Project Task `project_task_3c6c098c-2a8b-4f46-b020-1c2f30eeb5f9` (anthropic-incomplete-content-block), Solution Designer `/software_engineering_team/solution_designer`.

## User facts

- "we do not have any more autobyteus provider now"
- "i dont have that remote server anymore actually"

The remote AutoByteus LLM server no longer exists, so the provider integration cannot work for anyone. The user wants it removed.

## Proposed goal

Remove the AutoByteus remote-server provider integration completely (clean-cut deletion; no backward compatibility). The new ticket's requirements phase must confirm the scope with the user, in particular whether the AutoByteus **image and audio** providers are included (the investigation below suggests yes, since they depend on the same remote server).

## Known footprint (preliminary, from a grep on 2026-10-10 at `origin/personal` `d28c56d5d`; to be verified)

- `autobyteus-ts`:
  - LLM: `src/llm/api/autobyteus-llm.ts`, `src/llm/autobyteus-provider.ts`, `src/llm/api/autobyteus-conversation-payload.ts`, `src/llm/api/autobyteus-token-usage-normalizer.ts`, `src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` (plus the `prompt-renderers/index.ts` export), `src/llm/provider-display-names.ts`, `LLMProvider.AUTOBYTEUS` in `src/llm/providers.ts`;
  - client: `src/clients/autobyteus-client.ts` (plus `clients/index.ts`);
  - multimedia: `src/multimedia/audio/api/autobyteus-audio-client.ts`, `src/multimedia/audio/autobyteus-audio-provider.ts`, `src/multimedia/image/api/autobyteus-image-client.ts`, `src/multimedia/image/autobyteus-image-provider.ts`.
  - Note: `LLMRuntime.AUTOBYTEUS = "autobyteus"` in `src/llm/runtimes.ts` is the **native runtime name**, not the remote provider. It must stay.
- `autobyteus-server-ts`:
  - `src/llm-management/services/autobyteus-remote-model-discovery-service.ts`;
  - `src/llm-management/services/model-availability-service.ts`, `model-catalog-service.ts`;
  - `src/llm-management/llm-providers/services/llm-provider-service.ts`;
  - `src/services/server-settings-service.ts` (AutoByteus server host setting);
  - `src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts`;
  - `src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.ts`.
- `autobyteus-web`:
  - `components/settings/ServerSettingsEndpointCards.vue`, `stores/serverSettings.ts`;
  - Electron server env (`electron/server/__tests__/serverRuntimeEnv.spec.ts` suggests env wiring);
  - their tests.
- Docs that mention the provider (to be searched).

## Open questions for the new ticket

1. Is the scope the LLM provider only, or also the image and audio providers? (Expected: all of them.)
2. Saved data: agent/team definitions or runs that select an AutoByteus model, and saved server settings for AutoByteus hosts. Apply the Data Migration Guideline (`autobyteus-server-ts/docs/design/data_migration_guideline.md`) and verify that the existing "model not available" handling covers them, so no migration is needed. Do not assume it.
3. Settings UI: remove the AutoByteus endpoint card.

## Coordination

- Independent of anthropic-incomplete-content-block and can run in parallel.
- That ticket's Step 2 touches `autobyteus-ts/src/llm/api/autobyteus-llm.ts` only minimally: a compile-only update for the new `CompleteResponse.finish` field, with no new behavior (SR-008). Whichever change lands second rebases. If the removal lands first, that ticket simply drops its compile-only edit.
- Estimated size: Medium (mostly deletion across 3 packages, plus one data check).
