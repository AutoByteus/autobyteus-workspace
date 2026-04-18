# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/done/autobyteus-ts-custom-openai-compatible-endpoint-support/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/done/autobyteus-ts-custom-openai-compatible-endpoint-support/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/done/autobyteus-ts-custom-openai-compatible-endpoint-support/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/done/autobyteus-ts-custom-openai-compatible-endpoint-support/design-review-report.md`

## What Changed

Implemented the round-7 reviewed scope on top of the already-shipped provider-centered baseline.

### Provider-centered baseline retained

- Kept the reviewed provider-centered public shape:
  - `availableLlmProvidersWithModels`
  - `ProviderWithModels`
  - `reloadLlmProviderModels`
  - `reloadLlmModels`
  - `setLlmProviderApiKey`
- Kept `ProviderWithModels.provider` as the upgraded provider object payload.
- Kept write-only fixed-provider secret handling and configured-status-only frontend hydration.
- Kept normalized built-in + custom provider-name uniqueness enforcement.
- Kept selector-visible refresh on the real catalog-serving cache path.

### New round-7 delete lifecycle

Added saved custom-provider deletion end to end.

Server:
- `CustomLlmProviderStore.deleteProvider(providerId)` removes the persisted custom-provider record.
- `LlmProviderService.deleteCustomProvider(providerId, runtimeKind?)`:
  - rejects built-in provider ids,
  - validates custom-provider existence,
  - deletes persistence first,
  - triggers authoritative full refresh through `ModelCatalogService.reloadLlmModels(runtimeKind)`.
- GraphQL now exposes `deleteCustomLlmProvider(providerId, runtimeKind?)`.

Web:
- `autobyteus-web/stores/llmProviderConfig.ts` now exposes `deleteCustomProvider(providerId, runtimeKind?)`.
- `ProviderAPIKeyManager` now renders a dedicated saved custom-provider details card.
- Saved custom-provider details now expose the remove action.
- After delete, the provider browser selects the next available provider row and the deleted provider disappears after authoritative refresh.

### New round-7 custom-only friendly-label correction

Implemented the approved custom-provider label rule while leaving built-in label behavior unchanged.

- `autobyteus-web/utils/modelSelectionLabel.ts` now prefers `model.name` only for custom `OPENAI_COMPATIBLE` models.
- Built-in AutoByteus label behavior still uses `modelIdentifier`.
- `ProviderModelBrowser` now shows friendly labels for custom-provider models but keeps built-in identifier labels.
- `CompactionConfigCard` now uses the same rule, so the stored value remains `modelIdentifier` while the displayed custom label is friendly.
- General selector consumers inherit the same custom-only rule through the shared label utility.

### Post-round-7 UI follow-up: visible draft row label

Applied the follow-up sidebar cleanup requested after delivery-blocking feedback.

- Reverted the draft provider row in `ProviderModelBrowser` back to the normal rectangular provider-list row.
- Renamed the visible draft row label from `New Custom Provider` to `New Provider`.
- Removed the compact plus/add-only affordance so the draft row is immediately legible in the provider browser.
- The selected panel flow remains unchanged: once clicked, the full custom-provider editor still opens with normal copy and structure.

### Generated artifact sync

- Regenerated `autobyteus-web/generated/graphql.ts` against the updated server schema.
- The generated client now includes `deleteCustomLlmProvider` and the current provider-centered operations.

## Key Files Or Areas

### Server

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-server-ts/tests/unit/llm-management/llm-providers/llm-provider-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts`

### Web state / GraphQL

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/graphql/mutations/llm_provider_mutations.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/stores/llmProviderConfig.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/generated/graphql.ts`

### Web settings UI / label policy

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/ProviderAPIKeyManager.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/CompactionConfigCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/utils/modelSelectionLabel.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/localization/messages/en/settings.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/localization/messages/zh-CN/settings.ts`

### Updated focused tests

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/autobyteus-web/utils/__tests__/modelSelectionLabel.spec.ts`

## Important Assumptions

- Custom-provider delete is intentionally scoped to saved custom providers only; built-in providers remain non-deletable.
- Delete continues to be meaningful only on the AutoByteus runtime path; the implementation preserves the reviewed `runtimeKind` parameter surface but uses the authoritative full-catalog refresh path for the custom-provider removal effect.
- The custom-only label correction is intentionally narrow:
  - custom `OPENAI_COMPATIBLE` providers display `model.name`,
  - built-in provider label behavior is unchanged,
  - stored/runtime values remain `modelIdentifier`.

## Known Risks

- `autobyteus-web` repo-wide `nuxi typecheck` still fails on unrelated pre-existing issues outside this ticket.
- Accepted upstream residual risks remain unchanged:
  - custom-provider edit lifecycle is still out of scope,
  - manual `/models` fallback/manual entry is still a future follow-up,
  - broader secret-store migration remains future work,
  - deeper cleanup/renaming of low-level superseded internals remains follow-up work.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `useProviderApiKeySectionRuntime.ts` remains under the changed-source guardrail.
  - The earlier general-selector fallback branches remain removed; this round did not reintroduce compatibility shims.

## Environment Or Dependency Notes

### Local checks run

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/graphql/types/llm-provider.test.ts tests/unit/llm-management/llm-providers/llm-provider-service.test.ts`
- `pnpm -C autobyteus-server-ts build`
- `node --input-type=module -e "import 'reflect-metadata'; import { writeFileSync } from 'node:fs'; import { printSchema } from 'graphql'; import { buildGraphqlSchema } from './dist/api/graphql/schema.js'; const schema = await buildGraphqlSchema(); writeFileSync('/tmp/autobyteus-ts-custom-openai-compatible-endpoint-support-schema.graphql', printSchema(schema));"` (run from `autobyteus-server-ts`)
- `BACKEND_GRAPHQL_BASE_URL=/tmp/autobyteus-ts-custom-openai-compatible-endpoint-support-schema.graphql pnpm -C autobyteus-web codegen`
- `pnpm -C autobyteus-web exec nuxi prepare`
- `pnpm -C autobyteus-web exec vitest run tests/stores/llmProviderConfigStore.test.ts components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts components/settings/__tests__/ProviderAPIKeyManager.spec.ts components/settings/__tests__/CompactionConfigCard.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts utils/__tests__/modelSelectionLabel.spec.ts`
- `pnpm -C autobyteus-web exec vitest run components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts`
- `pnpm -C autobyteus-web exec vitest run components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts components/settings/__tests__/ProviderAPIKeyManager.spec.ts`
- `pnpm -C autobyteus-web exec vitest run components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts components/settings/__tests__/ProviderAPIKeyManager.spec.ts`
- `pnpm -C autobyteus-web exec nuxi prepare`
- Attempted: `pnpm -C autobyteus-web exec nuxi typecheck`

### Typecheck note

- Latest typecheck log: `/tmp/autobyteus-round7-web-typecheck.log`
- Result: still blocked by pre-existing repo-wide web issues.
- The latest log does **not** report the changed round-7 files:
  - `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
  - `components/settings/providerApiKey/ProviderModelBrowser.vue`
  - `components/settings/ProviderAPIKeyManager.vue`
  - `components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue`
  - `components/settings/CompactionConfigCard.vue`
  - `stores/llmProviderConfig.ts`
  - `utils/modelSelectionLabel.ts`

## Validation Hints / Suggested Scenarios

- Query `availableLlmProvidersWithModels(runtimeKind: "autobyteus")`, create a custom provider, then delete it through `deleteCustomLlmProvider(providerId, runtimeKind)` and verify:
  - the persisted provider disappears,
  - selector-visible provider rows lose the deleted provider,
  - deleted-provider models disappear after refresh.
- Recheck that `reloadLlmProviderModels(providerId)` still uses provider-targeted refresh while delete uses the full catalog refresh path.
- In API Key Management:
  - verify the provider browser shows a normal `New Provider` sidebar row instead of the earlier plus-only affordance,
  - click `New Provider` and confirm the draft custom-provider editor flow opens,
  - save a custom provider,
  - confirm the saved details card exposes the remove action,
  - delete it and verify selection falls back cleanly.
- Recheck label behavior on AutoByteus runtime selectors:
  - built-in providers still show identifier labels,
  - custom `OPENAI_COMPATIBLE` providers show `provider.name / model.name`.
- Recheck compaction model selection labels for the same custom-only rule.
- Confirm `autobyteus-web/generated/graphql.ts` contains the delete mutation/types/hooks and no stale mismatch with the reviewed server schema.

## What Needs Validation

- Server GraphQL delete lifecycle (`deleteCustomLlmProvider`) and persistence removal ordering.
- Selector-visible disappearance of deleted custom providers after authoritative refresh.
- Provider settings UX for saved custom-provider delete.
- Custom-only friendly-label behavior in:
  - Provider API Key Management model browser,
  - launch/runtime selectors,
  - team selectors,
  - compaction selector,
  - messaging launch-preset selector flows.
- Regression check that built-in label behavior and write-only fixed-provider secret handling remain unchanged.
