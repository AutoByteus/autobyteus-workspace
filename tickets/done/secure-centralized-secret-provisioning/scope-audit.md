# Scope Audit — Narrow Credential-Custody Boundary

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Complete evidence for the user-approved cumulative narrow-scope correction submitted for architecture review; implementation/API-E2E/delivery remain unauthorized until Pass` |
| Purpose | Audit the complete ticket delta against `origin/personal`, identify source that is necessary for secure credential custody, and require removal of unrelated or redundant behavior |
| Baseline | `origin/personal` at `d6983612c5a77fb94d9266df85a9d03fe2d1c68b` |
| Audited ticket HEAD | `3244a7c6fc2eb4472ad25c3e0607182f35ad7f4f` |
| Merge base | `d6983612c5a77fb94d9266df85a9d03fe2d1c68b` |
| Approval applicability | `N/A` as evidence; the user-approved behavior and cleanup authority are in [requirements.md](./requirements.md) and [design-spec.md](./design-spec.md) |

No credential value, secret-bearing `.env`, database/vault content, root key, authentication state, or installed user-profile data was opened for this audit.

## Audit Question And Decision

The ticket is authorized to change:

1. custody of API keys/tokens/credentials from plaintext configuration to the encrypted vault in the selected application database;
2. point-of-use retrieval by the existing provider/runtime consumer;
3. write-only provider Settings and value-free configured status;
4. the explicit Gemini setup UI/configuration needed because Gemini has three distinct supported connection modes;
5. the one operator-invoked importer, custom-provider-v1 credential migration, and minimum database/root-key lifecycle needed to preserve existing users;
6. the provider-centric API-key Settings grouping needed to show one provider-owned configured fact without coupling model catalogs to credentials;
7. proportionate tests, documentation, dependency integration, and the separately approved DB/key file-root and value-safe-output controls.

It is **not** authorized to redesign general child-process environments, Codex, Claude tools/MCP/session behavior, Electron account/home semantics, built-in-agent defaults, application reset semantics, or unrelated product behavior.

The audited HEAD does **not** yet satisfy that narrow boundary. It still contains four classes of product-source delta that must be removed or narrowed before delivery:

- residual empty-base/synthetic environment changes in packaged Electron launchers and the isolated PTY bridge;
- an unrelated Claude in-process MCP/session/diagnostic refactor;
- an unrelated built-in-agent runtime-default persistence change;
- standalone ordinary-provider and Gemini key-removal UI/API behavior that the user rejected as redundant.

The retained vault, importer, explicit Gemini mode, provider-centric Settings, custom-provider migration, provider point-of-use resolver, exact `repository_prisma@1.0.8`, and associated lifecycle/test work remain in scope.

## Complete Change-Class Inventory

| Change class | Representative/current paths | Product effect | Audit disposition | Exact causal necessity |
|---|---|---|---|---|
| One-database encrypted vault | `prisma/schema.prisma`, vault migration, `src/secret-management/**`, `ApplicationDatabaseLocation`, configured Prisma factory/startup | Stores ciphertext in the selected application DB and keeps the root key adjacent/outside | **Retain** | Core ticket purpose |
| Provider-owned point-of-use resolution | core `ProviderApiKeyResolver`/`SecretValue`; LLM/media/search/AutoByteus/explicit-Claude-api-key adapters | Replaces direct managed-key reads from plaintext environment at the existing use point | **Retain** | Core ticket purpose with minimal runtime substitution |
| Provider Settings grouping | provider service/GraphQL/web Settings store and components | Emits provider identity/configured status once and keeps model catalogs subordinate/credential-independent | **Retain, remove only redundant key-removal branches** | Minimum correct UI/read composition for vault status |
| Gemini explicit setup | Gemini configuration/runtime resolver, exact SDK construction, metadata strategy, focused UI | Persists one explicit supported mode while keeping credentials provider-owned and catalogs independent | **Retain, remove only standalone configuration removal** | User-approved Gemini-specific functionality |
| Importer | `secrets:import`, source reader, alias registry, immutable explicit database target, preview/execute owners | Imports recognized populated assignments into an explicitly named application DB | **Retain** | User-approved onboarding/development workflow |
| Custom-provider-v1 transition | app-data migration, fixed legacy file owner, current v2 store, compensation/containment | Migrates legacy plaintext custom-provider keys once or resets to reconfiguration without blocking Settings | **Retain** | Existing-user availability and credential custody |
| Database lifecycle alignment | startup migration inputs, lazy configured Prisma clients in migration/token repositories | Prevents import-time/default-DB capture and keeps every repository on the selected application DB | **Retain** | Required by the one-DB design; no token behavior change is authorized |
| File-root/value-safe controls | DB/key denied paths in file tools; stable value-free errors/logging | Prevents agent file tools from reading vault artifacts and avoids secret-bearing output | **Retain as separately user-approved bounded controls** | Direct protection of the new DB/key assets and output boundary |
| Exact dependency replacement | root workspace lock, `repository_prisma@1.0.8`, obsolete patch removal | Uses upstream default-off query logging/no-dotenv package without Prisma ORM upgrade | **Retain** | Explicit user-approved dependency request |
| Test/runtime configuration | `.env.test`, `TestRuntimeBootstrap`, one-DB real-E2E runners/scenarios, evidence scanner | Exercises the actual server/frontend against a separate ignored application DB | **Retain** | Proportionate executable validation; no production profile/backend is introduced |
| Product/docs/test evidence | server/web/root docs, focused unit/integration/E2E tests, ticket reports/evidence | Documents and validates retained behavior | **Retain only when aligned to the narrowed target** | Supporting, not independent product behavior |
| Electron launch environment | `linuxServerManager.ts`, `macOSServerManager.ts`, `windowsServerManager.ts` | Replaces inherited environment/home with synthetic app-data HOME/TMP and a small allowlist | **Restore exact `origin/personal` environment construction** | Not required by vault custody and conflicts with the user’s explicit scope |
| Electron app-data mechanics | `AppDataService.ts` and tests | Adds `tmp` as required app data and changes reset from remove/recreate-root to child-by-child deletion | **Restore exact `origin/personal` behavior** | Exists only to support the rejected synthetic-home launcher policy |
| Isolated PTY bridge environment | `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts` | Filters the bridge environment to a short allowlist | **Restore exact `origin/personal` process-environment inheritance** | Not required by vault custody |
| Claude agent-tools/MCP/session refactor | Claude `agent-tools-mcp` and `session` files, diagnostic formatter | Replaces the existing HTTP MCP descriptor/materializer with in-process SDK MCP creation and changes error/diagnostic behavior | **Restore exact `origin/personal` behavior** | Unrelated to resolving `ANTHROPIC_API_KEY` for explicit API-key mode |
| Claude credential substitution | `claude-sdk-auth-environment.ts`, narrow changes in `claude-sdk-client.ts` | Keeps `auto|cli|api-key`; only explicit `api-key` resolves the Anthropic slot and overrides one variable immediately before launch | **Retain only this narrow delta** | Minimum runtime wiring for the vault |
| Built-in agent settings defaults | built-in bootstrapper, server-settings runtime-default map, smoke/test changes | Changes a persistent application setting into an in-memory default | **Restore base behavior; remove only the runtime-default hunks** | Unrelated to credential custody |
| Ordinary provider key removal | provider service/GraphQL/web mutation/store/components/localization/tests | Adds a standalone Remove Key action absent from `origin/personal` | **Remove completely** | Save already creates/overwrites; user rejected the extra function |
| Gemini configuration removal | Gemini service/GraphQL/web actions/cards/localization/tests | Adds per-option removal and active-removal behavior | **Remove completely** | User approved Save/overwrite and explicit Use mode only |
| Custom-provider Delete | existing custom-provider entity lifecycle plus vault cleanup | Deletes the custom provider entity and its linked vault credential | **Retain** | Existing `origin/personal` product action; not a standalone key-removal feature |

## Exact Required Restorations And Removals

### Restore to `origin/personal`

The following current deltas have no retained ticket-owned behavior and must match the baseline again:

- `autobyteus-web/electron/server/linuxServerManager.ts`
- `autobyteus-web/electron/server/macOSServerManager.ts`
- `autobyteus-web/electron/server/windowsServerManager.ts`
- `autobyteus-web/electron/server/services/AppDataService.ts`
- `autobyteus-web/electron/server/services/__tests__/AppDataService.spec.ts`
- `autobyteus-web/electron/server/__tests__/BaseServerManager.spec.ts`
- `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts`
- `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue`
- `autobyteus-web/components/settings/providerApiKey/__tests__/ProviderApiKeyEditor.spec.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-process-diagnostics.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-mcp-server-config.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts`
- `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs`
- `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`

Restoration is concern-scoped when a file also contains retained ticket work. No whole-file base checkout is allowed for a mixed file.

### Narrow mixed files

- `autobyteus-server-ts/src/services/server-settings-service.ts` and its tests: remove the runtime-default map/API; retain sensitive generic-setting rejection and value-free logging/errors.
- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`, auth-environment helper, and tests: retain only the one explicit-api-key resolver/override while preserving all baseline selector/options/settings/tools/MCP/account/environment behavior.
- provider service/GraphQL/web Settings files: remove ordinary and Gemini removal branches while retaining provider-centric grouping, Save/overwrite, status, Gemini Save/Use, custom-provider Delete, and catalog behavior.
- generated GraphQL, localization, documentation, and durable tests: remove only obsolete removal operations/labels/scenarios and regenerate/rewrite against the narrowed schema.

### Delete new redundant files

- `autobyteus-web/components/settings/providerApiKey/providerApiKeyRemoval.ts`
- `autobyteus-web/localization/messages/en/providerApiKey.ts`
- `autobyteus-web/localization/messages/zh-CN/providerApiKey.ts`

Remove their index/generated imports and do not add wrappers or tombstone exports.

## Mixed-File Safety Rules

1. Never restore a whole mixed file merely because one hunk is out of scope.
2. Preserve the one-database location/vault lifecycle in AppConfig, startup, migrations, and Prisma owners.
3. Preserve provider-centric Settings, point-of-use resolution, explicit Gemini mode, and custom-provider migration.
4. Preserve exact base launcher/session behavior first; then apply only the one credential substitution at the provider/explicit-Claude-api-key use point.
5. Ordinary provider Save remains create-or-overwrite. No removal mutation, button, helper, store action, localization, generated operation, or test remains.
6. Gemini retains Save, Save-and-use, and Use-this-mode. No standalone option-removal behavior remains.
7. Custom-provider Delete remains and internally cleans up only its own credential.

## Evidence And Commands

- `git rev-parse HEAD`
- `git rev-parse origin/personal`
- `git merge-base HEAD origin/personal`
- `git log --oneline --reverse origin/personal..HEAD`
- `git diff --name-status origin/personal...HEAD`
- `git diff --numstat origin/personal...HEAD -- ':(exclude)tickets/**'`
- focused direct diffs for Electron managers/AppDataService, isolated PTY bridge, Claude session/MCP, built-in bootstrap/server settings, provider/Gemini removal surfaces, AppConfig, Prisma lifecycle, provider resolver, and web Settings
- focused source scans for `removeProviderApiKey`, `removeGeminiConfiguration`, synthetic HOME/TMP environment construction, runtime defaults, and Claude MCP materialization

At the audited HEAD, `git diff --name-status origin/personal...HEAD` reports 617 changed paths: 306 ticket-package paths and 311 repository product/dependency/documentation/test paths. Ticket-package reports/evidence are preserved workflow records, not additional product behavior. The product-path inventory is exhausted by the change classes and exact cleanup lists above; no other changed product path establishes an independently approved feature.

## Audit Conclusion

The branch is not delivery-ready merely because Round 19 executable/source review passed. The retained implementation is mostly within the secure credential scope, but the exact residual out-of-scope and redundant deltas above must be removed. After that cleanup, the intended product change is narrow:

```text
existing configuration UI / importer
  -> encrypted application-database vault
  -> narrow provider API-key resolver
  -> existing provider/client use point
```

All other application behavior follows `origin/personal`, except the explicitly approved Gemini setup, provider-centric API-key Settings grouping, custom-provider migration, dependency update, and bounded DB/key/output controls named in this artifact.

## Exhaustive Non-Ticket Path Manifest

This manifest assigns every one of the 311 non-ticket paths in the audited Git delta to one disposition. `RETAIN` does not bypass source review; it means the path belongs to one of the retained change classes above. `PARTIAL_CLEANUP` requires hunk-level preservation.

| Disposition | Count |
|---|---:|
| `RETAIN` | 259 |
| `PARTIAL_CLEANUP` | 31 |
| `RESTORE_BASE` | 18 |
| `REMOVE_FILE` | 3 |

| Disposition | Git status | Path |
|---|---|---|
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/docs/modules/llm_management.md` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` |
| `PARTIAL_CLEANUP` | `A` | `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/src/services/server-settings-service.ts` |
| `PARTIAL_CLEANUP` | `A` | `autobyteus-server-ts/tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts` |
| `PARTIAL_CLEANUP` | `A` | `autobyteus-server-ts/tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` |
| `PARTIAL_CLEANUP` | `A` | `autobyteus-server-ts/tests/unit/llm-management/gemini-configuration-service.test.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/tests/unit/llm-management/llm-providers/llm-provider-service.test.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` |
| `PARTIAL_CLEANUP` | `A` | `autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/components/settings/providerApiKey/GeminiSetupForm.vue` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` |
| `PARTIAL_CLEANUP` | `A` | `autobyteus-web/components/settings/providerApiKey/providerApiKeyGeminiActions.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/generated/graphql.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/graphql/mutations/llm_provider_mutations.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/localization/messages/en/index.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/localization/messages/en/settings.generated.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/localization/messages/en/settings.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/localization/messages/zh-CN/index.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/localization/messages/zh-CN/settings.generated.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/localization/messages/zh-CN/settings.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/stores/llmProviderConfig.ts` |
| `PARTIAL_CLEANUP` | `M` | `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` |
| `REMOVE_FILE` | `A` | `autobyteus-web/components/settings/providerApiKey/providerApiKeyRemoval.ts` |
| `REMOVE_FILE` | `A` | `autobyteus-web/localization/messages/en/providerApiKey.ts` |
| `REMOVE_FILE` | `A` | `autobyteus-web/localization/messages/zh-CN/providerApiKey.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` |
| `RESTORE_BASE` | `D` | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-process-diagnostics.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-mcp-server-config.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue` |
| `RESTORE_BASE` | `M` | `autobyteus-web/components/settings/providerApiKey/__tests__/ProviderApiKeyEditor.spec.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/electron/server/__tests__/BaseServerManager.spec.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/electron/server/linuxServerManager.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/electron/server/macOSServerManager.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/electron/server/services/AppDataService.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/electron/server/services/__tests__/AppDataService.spec.ts` |
| `RESTORE_BASE` | `M` | `autobyteus-web/electron/server/windowsServerManager.ts` |
| `RETAIN` | `M` | `README.md` |
| `RETAIN` | `M` | `autobyteus-server-ts/.env.example` |
| `RETAIN` | `A` | `autobyteus-server-ts/.env.test` |
| `RETAIN` | `M` | `autobyteus-server-ts/.gitignore` |
| `RETAIN` | `M` | `autobyteus-server-ts/README.md` |
| `RETAIN` | `M` | `autobyteus-server-ts/docs/README.md` |
| `RETAIN` | `M` | `autobyteus-server-ts/docs/modules/README.md` |
| `RETAIN` | `M` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| `RETAIN` | `A` | `autobyteus-server-ts/docs/modules/secret_management.md` |
| `RETAIN` | `M` | `autobyteus-server-ts/package.json` |
| `RETAIN` | `D` | `autobyteus-server-ts/pnpm-lock.yaml` |
| `RETAIN` | `A` | `autobyteus-server-ts/prisma/migrations/20260726090000_add_secret_vault/migration.sql` |
| `RETAIN` | `M` | `autobyteus-server-ts/prisma/schema.prisma` |
| `RETAIN` | `A` | `autobyteus-server-ts/scripts/run-sanitized-built-in-agents-bootstrap-smoke.mjs` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/agent-tools/search/register-search-tool.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/agent-tools/search/search-provisioning-service.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/api/graphql/schema.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/api/graphql/types/gemini-configuration.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/api/graphql/types/secret-storage.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-migration-file.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/app-data-migrations/repositories/app-data-migration-record-repository.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/config/app-config.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/config/application-database-location.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/config/environment-assignment-lines.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/config/prisma-client-factory.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/llm-providers/services/custom-llm-provider-runtime-sync-service.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/providers/cached-autobyteus-llm-model-provider.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/services/autobyteus-model-catalog.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/llm-management/services/gemini-runtime-resolver-adapter.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/multimedia-management/providers/audio-model-provider.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/multimedia-management/providers/cached-audio-model-provider.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/multimedia-management/providers/cached-image-model-provider.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/multimedia-management/providers/image-model-provider.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/multimedia-management/services/audio-model-service.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/multimedia-management/services/image-model-service.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/persistence/file/store-utils.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-auth-environment.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/bootstrap/secret-vault-bootstrap.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/cli/import-local-environment-secrets.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/crypto/secret-vault-crypto.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/domain/secret-id.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/domain/secret-vault-types.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/index.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/persistence/secret-vault-prisma-repository.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/provisioning/local-environment-secret-import-service.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/provisioning/local-environment-secret-import.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/provisioning/local-environment-source-reader.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/provisioning/local-import-credential-alias-registry.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/root-key/secret-root-key-file.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/secret-vault-runtime.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/services/secret-management-service.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/services/secret-vault-inspection-service.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/src/secret-management/windows-exclusive-acl.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/server-runtime.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/startup/migrations.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/e2e/secret-management/current-database-import-lifecycle.e2e.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-v1-startup-migration.e2e.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/setup/prisma-env.js` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/setup/prisma-env.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/api/graphql/types/server-settings.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/app-data-migrations/custom-provider-v1-app-data-migration.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/config/app-config.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/config/prisma-import-lifecycle.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/llm-management/autobyteus-remote-model-discovery-service.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/llm-management/model-metadata-provisioning-service.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/llm-management/providers/autobyteus-llm-model-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/llm-management/services/model-catalog-service.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/logging/prisma-query-log-policy.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/multimedia-management/providers/audio-model-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/multimedia-management/providers/image-model-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/import-local-environment-secrets-cli.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/legacy-source-non-authority.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/local-environment-secret-import-service.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/local-environment-source-reader.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/secret-catalog-autobyteus.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/secret-management-provider-api-key-resolver.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/secret-vault-inspection-service.test.ts` |
| `RETAIN` | `A` | `autobyteus-server-ts/tests/unit/secret-management/secret-vault-lifecycle.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/startup/migrations-prisma-engine-env.test.ts` |
| `RETAIN` | `M` | `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/clients/autobyteus-client-utils.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/clients/autobyteus-client.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/clients/autobyteus-discovery-authentication.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/index.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/anthropic-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/autobyteus-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/deepseek-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/gemini-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/glm-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/grok-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/kimi-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/lmstudio-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/minimax-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/mistral-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/ollama-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/openai-compatible-endpoint-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/openai-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/openai-responses-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/api/qwen-llm.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/autobyteus-provider.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/custom-llm-provider-config.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/index.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/llm-factory.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/metadata/anthropic-model-metadata-provider.ts` |
| `RETAIN` | `R068` | `autobyteus-ts/src/llm/metadata/gemini-developer-api-model-metadata-provider.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/metadata/mistral-model-metadata-provider.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/models.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/llm/supported-model-definition.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/llm/supported-model-definitions.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/audio/api/autobyteus-audio-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/audio/api/gemini-audio-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/audio/api/openai-audio-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/audio/audio-model.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/audio/autobyteus-audio-provider.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/image/api/autobyteus-image-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/image/api/openai-image-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/image/autobyteus-image-provider.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/image/image-client-factory.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/image/image-model.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/video/api/gemini-video-client.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/video/video-client-factory.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/multimedia/video/video-model.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/secrets/index.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/secrets/secret-value.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/file/workspace-path-utils.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/index.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/search-tool.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/search/factory.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/search/serpapi-strategy.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/search/serper-strategy.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/search/vertex-ai-search-strategy.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/tools/terminal/execution-cwd.ts` |
| `RETAIN` | `M` | `autobyteus-ts/src/utils/gemini-helper.ts` |
| `RETAIN` | `A` | `autobyteus-ts/src/utils/gemini-runtime.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/audio/api/autobyteus-audio-client.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/audio/api/gemini-audio-client.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/audio/api/openai-audio-client.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/audio/autobyteus-audio-provider.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/image/api/autobyteus-image-client.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/image/api/gemini-image-client.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/image/api/openai-image-client.test.ts` |
| `RETAIN` | `D` | `autobyteus-ts/tests/integration/multimedia/image/autobyteus-image-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/tools/search-tool.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/tools/search/factory.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/tools/search/serpapi-strategy.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/tools/search/serper-strategy.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/integration/tools/search/vertex-ai-search-strategy.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/setup.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/clients/autobyteus-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/autobyteus-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/deepseek-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/glm-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/grok-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/lmstudio-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/openai-llm.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` |
| `RETAIN` | `A` | `autobyteus-ts/tests/unit/llm/autobyteus-gateway-routing.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/autobyteus-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/llm-factory-config-composition.test.ts` |
| `RETAIN` | `A` | `autobyteus-ts/tests/unit/llm/metadata/gemini-developer-api-model-metadata-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-provider.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/audio/api/autobyteus-audio-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/audio/api/gemini-audio-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/audio/api/openai-audio-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/audio/audio-client-factory.test.ts` |
| `RETAIN` | `A` | `autobyteus-ts/tests/unit/multimedia/autobyteus-gateway-routing.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/image/api/autobyteus-image-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/image/api/gemini-image-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/image/api/openai-image-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/video/api/gemini-video-client.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/multimedia/video/video-client-factory.test.ts` |
| `RETAIN` | `A` | `autobyteus-ts/tests/unit/provider-api-key-resolver-test-helpers.ts` |
| `RETAIN` | `A` | `autobyteus-ts/tests/unit/secrets/secret-value.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/file/insert-in-file.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/file/replace-in-file.test.ts` |
| `RETAIN` | `A` | `autobyteus-ts/tests/unit/tools/file/workspace-path-utils.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/search-tool.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/search/factory-drift.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/search/factory.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/search/serpapi-strategy.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/search/serper-strategy.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/search/vertex-ai-search-strategy.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts` |
| `RETAIN` | `M` | `autobyteus-ts/tests/unit/utils/gemini-helper.test.ts` |
| `RETAIN` | `M` | `autobyteus-web/components/settings/WebSearchConfigurationCard.vue` |
| `RETAIN` | `M` | `autobyteus-web/components/settings/__tests__/MediaDefaultModelsCard.spec.ts` |
| `RETAIN` | `M` | `autobyteus-web/components/settings/__tests__/WebSearchConfigurationCard.spec.ts` |
| `RETAIN` | `A` | `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` |
| `RETAIN` | `M` | `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue` |
| `RETAIN` | `M` | `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderEditor.vue` |
| `RETAIN` | `M` | `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderProbePreview.vue` |
| `RETAIN` | `M` | `autobyteus-web/docs/electron_packaging.md` |
| `RETAIN` | `M` | `autobyteus-web/docs/settings.md` |
| `RETAIN` | `M` | `autobyteus-web/graphql/mutations/server_settings_mutations.ts` |
| `RETAIN` | `M` | `autobyteus-web/graphql/queries/llm_provider_queries.ts` |
| `RETAIN` | `M` | `autobyteus-web/graphql/queries/server_settings_queries.ts` |
| `RETAIN` | `M` | `autobyteus-web/nuxt.config.ts` |
| `RETAIN` | `A` | `autobyteus-web/stores/llmProviderConfigSupport.ts` |
| `RETAIN` | `M` | `autobyteus-web/stores/serverSettings.ts` |
| `RETAIN` | `M` | `autobyteus-web/tests/stores/serverSettingsStore.test.ts` |
| `RETAIN` | `M` | `package.json` |
| `RETAIN` | `D` | `patches/repository_prisma@1.0.6.patch` |
| `RETAIN` | `M` | `pnpm-lock.yaml` |
| `RETAIN` | `A` | `test-support/live-e2e/live-e2e-evidence-scanner.d.mts` |
| `RETAIN` | `A` | `test-support/live-e2e/live-e2e-evidence-scanner.mjs` |
| `RETAIN` | `A` | `test-support/live-e2e/live-e2e-evidence-scanner.ts` |
| `RETAIN` | `A` | `test-support/live-e2e/live-e2e-harness.ts` |
| `RETAIN` | `A` | `test-support/live-e2e/live-e2e-scenarios.d.mts` |
| `RETAIN` | `A` | `test-support/live-e2e/live-e2e-scenarios.mjs` |
| `RETAIN` | `A` | `test-support/live-e2e/run-live-e2e.mjs` |
| `RETAIN` | `A` | `test-support/live-e2e/run-test-dev.mjs` |
| `RETAIN` | `A` | `test-support/live-e2e/run-test-server.mjs` |
| `RETAIN` | `A` | `test-support/live-e2e/run-test-web.mjs` |
| `RETAIN` | `A` | `test-support/live-e2e/test-runtime-bootstrap.d.mts` |
| `RETAIN` | `A` | `test-support/live-e2e/test-runtime-bootstrap.mjs` |
