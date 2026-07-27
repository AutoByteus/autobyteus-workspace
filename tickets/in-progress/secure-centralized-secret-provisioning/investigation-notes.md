# Investigation Notes — Secure Centralized Secret Provisioning (Clean-State Revision)

## Investigation Status

`Complete — user-approved for architecture review. The prior clean-state basis remains approved, and this value-free investigation adds the observed packaged custom-provider-v1 failure plus an availability-first migrate-or-delete target. Implementation, API/E2E, and delivery remain unauthorized until a passing architecture gate.`

The earlier 551-line incremental investigation artifact is superseded. This file records the clean baseline, exact retained evidence, and target pressure without carrying forward obsolete design assertions.

## Request Context

The user reported two concrete product symptoms and one architectural concern:

1. a packaged Electron candidate initially failed to start its server and lacked a sufficiently direct value-safe diagnostic path;
2. after startup succeeded, API Settings displayed only `New Provider (0)` and `No Models Found`;
3. the accumulated security design appeared to couple catalog/model provisioning, credential configuration, separate Store selection, and test scenario configuration.

Through follow-up discussion, the user approved these clean directions:

- supported functionality must continue working; security must not remove or silently change it;
- model/provider catalogs are not credential records and must not disappear when keys are missing;
- concrete provider clients should resolve their own API keys at point of use through a small injected resolver;
- one application database per environment should contain both ordinary application data and encrypted secret tables;
- `DATABASE_URL` selects that database for production/test/E2E;
- every standalone importer invocation must instead receive its target explicitly through required `--database-url`; the assignment source and ambient/application/test configuration cannot select or override it;
- the API-key Settings read must return each provider once with its LLM/audio/image/video models grouped beneath it, reuse the established `LlmProviderObject` and `ModelDetail` contracts, and avoid both four-array provider merging and unnecessary replacement DTOs;
- one external key sidecar is derived from the canonical database file rather than separately configured;
- test scenarios/models/capabilities belong in test code, not Store configuration;
- Gemini mode is one explicit non-secret setting selected through a concise `Use this mode` UI; absent mode is closed rather than priority-based;
- the current ticket stays, but the active documents are rewritten wholesale instead of receiving more corrections;
- the fixed application-owned custom-provider-v1 file should normally migrate automatically to secret-free v2 metadata plus encrypted vault records;
- if that bounded preservation fails, delete the legacy custom-provider file, expose an empty current state, and let the user reconfigure through **New Provider**; one legacy custom-provider failure must never block startup, built-ins, catalogs, or unrelated provider configuration;
- do not create a hidden recovery/quarantine copy. The user explicitly prefers simple reconfiguration over retaining a plaintext file that ordinary users would not know how to find or use.

## Environment Discovery / Bootstrap Context

| Item | Value |
|---|---|
| Repository mode | Git super-repository worktree |
| Authoritative worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning` |
| Ticket branch | `codex/secure-centralized-secret-provisioning` |
| Current HEAD at CR-027 investigation | `36fc5af434e8321965854a1235f2f36aa154bd38` |
| Resolved tracked base/finalization branch | `origin/personal` |
| Refreshed base HEAD (2026-07-26) | `d6983612c5a77fb94d9266df85a9d03fe2d1c68b` |
| Merge base | `d6983612c5a77fb94d9266df85a9d03fe2d1c68b` (exact latest base) |
| Ticket artifact root | `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning` |
| Workspace decision | Keep this dedicated ticket/worktree; replace active solution artifacts from first principles |
| Alternative worktree | A briefly bootstrapped empty `single-database-encrypted-secret-vault` worktree/branch was removed after the user selected the current-ticket rewrite. It contained no work. |
| Current downstream gate | Architecture, implementation, API/E2E, and delivery paused pending a new approved/reviewed package |

No remote base/default/shared checkout was used for authoritative edits.

## Supplemental Task Artifact Inventory

| Artifact | Canonical path | Purpose/scope | Status | Approval applicability |
|---|---|---|---|---|
| Requirements | `./requirements.md` | Mandatory clean-state behavior basis plus custom-provider-v1 transition | Design-ready for architecture review | User-approved |
| Investigation notes | `./investigation-notes.md` | Mandatory evidence/context | Complete for architecture review | `N/A` (evidence) |
| Design spec | `./design-spec.md` | Mandatory clean-state architecture authority | Design-ready for architecture review | User-approved |
| Encrypted vault contract | `./encrypted-secret-vault-contract.md` | One-database schema, identity, key, crypto, migration batch, lifecycle, failure, and value-free Settings integration contract | Requirements-ready for architecture review | User-approved |
| Gemini UI/UX specification | `./gemini-setup-ui-ux-spec.md` | Concise explicit mode/configuration surface, state transitions, labels, accessibility, and API projection | Retained approved behavior | Unchanged by this revision |
| Credential consumer mapping | `./credential-consumer-mapping.md` | Provider/slot/SecretId/import-alias/custom-v1 migration/authorization and API-key-read ownership mapping | Design-ready for architecture review | User-approved |
| Live test provisioning | `./live-test-secret-provisioning.md` | One-test-database setup/custom-v1 migration/provider-centric API-key proof/execution/cleanup journey | Design-ready for architecture review | User-approved |
| Custom-provider-v1 migration contract | `./custom-provider-v1-migration-contract.md` | Fixed-path one-time migration, collision, rollback, delete-and-reconfigure reset, and Settings-containment behavior | Requirements-ready for architecture review | User-approved |
| Repository Prisma assessment | `./repository-prisma-1.0.8-assessment.md` | Exact package provenance/import/log evidence | Retained evidence | `N/A` |
| Use-case spine validation | `./use-case-spine-validation.md` | Complete 43-spine target inventory and traceability | Design-ready for architecture review | `N/A` additional behavior; architecture review applies |
| Secret storage architecture | `./secret-storage-architecture.md` | One-DB/provider-resolver/provider-group/custom-v1 migration/Gemini/test/deployment diagrams | Design-ready for architecture review | `N/A` additional behavior; architecture review applies |
| Backend contract | `./secret-storage-backend-contract.md` | Path-stable tombstone for old report links | Superseded/non-authoritative | No longer active |
| Threat model/option analysis | `./threat-model-and-option-analysis.md` | Assurance/trust boundaries/custom-v1 reset/options/residual risks | Design-ready for architecture review | `N/A` additional behavior; architecture review applies |

Reviewer-owned and downstream reports/evidence remain preserved and are not reclassified as active intended-behavior supplements.

## Source Log

### Repository and branch commands

- `git fetch origin personal`
- `git rev-parse HEAD`
- `git rev-parse origin/personal`
- `git merge-base HEAD origin/personal`
- `git status --short`
- `git diff --stat origin/personal...HEAD`
- `git worktree list --porcelain`

### Current source files inspected

- `autobyteus-server-ts/prisma/schema.prisma`
- `autobyteus-server-ts/src/config/app-config.ts`
- `autobyteus-server-ts/src/config/application-database-location.ts`
- `autobyteus-server-ts/src/app.ts`
- `autobyteus-server-ts/src/config/prisma-client-factory.ts`
- `autobyteus-server-ts/src/startup/migrations.ts`
- `autobyteus-server-ts/src/server-runtime.ts`
- `autobyteus-server-ts/src/secret-management/bootstrap/secret-vault-bootstrap.ts`
- `autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.ts`
- `autobyteus-server-ts/src/secret-management/crypto/secret-vault-crypto.ts`
- `autobyteus-server-ts/src/secret-management/domain/secret-id.ts`
- `autobyteus-server-ts/src/secret-management/domain/secret-vault-types.ts`
- `autobyteus-server-ts/src/secret-management/persistence/secret-vault-prisma-repository.ts`
- `autobyteus-server-ts/src/secret-management/root-key/secret-root-key-file.ts`
- `autobyteus-server-ts/src/secret-management/secret-vault-runtime.ts`
- `autobyteus-server-ts/src/secret-management/services/secret-management-service.ts`
- `autobyteus-server-ts/src/secret-management/services/secret-vault-inspection-service.ts`
- `autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.ts`
- `autobyteus-server-ts/src/secret-management/provisioning/local-environment-secret-import*.ts`
- `autobyteus-server-ts/src/secret-management/provisioning/local-import-credential-alias-registry.ts`
- `autobyteus-server-ts/src/secret-management/cli/import-local-environment-secrets.ts`
- `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts`
- `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts`
- `autobyteus-ts/src/llm/custom-llm-provider-config.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`
- `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-types.ts`
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts`
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
- `autobyteus-server-ts/src/app-data-migrations/repositories/app-data-migration-record-repository.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.ts`
- `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
- `autobyteus-server-ts/src/api/graphql/schema.ts`
- `autobyteus-ts/src/secrets/provider-api-key-resolver.ts`
- `autobyteus-ts/src/llm/llm-factory.ts`
- `autobyteus-ts/src/llm/models.ts`
- representative concrete LLM/media clients under `autobyteus-ts/src/llm/api` and `autobyteus-ts/src/multimedia`
- `autobyteus-ts/src/utils/gemini-helper.ts`
- tracked `test-config/live-e2e.json` at the inspected implementation HEAD (now correctly marked for clean-cut removal in the preserved downstream state)
- root `package.json`
- `autobyteus-server-ts/package.json`
- `autobyteus-server-ts/.gitignore`
- `autobyteus-server-ts/vitest.config.ts`
- `autobyteus-server-ts/tests/setup/prisma-env.ts`
- `autobyteus-server-ts/tests/setup/prisma-global-setup.ts`
- `autobyteus-server-ts/tests/setup/prisma-test-config.ts`
- `test-support/live-e2e/run-live-e2e.mjs`
- `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts`
- `test-support/live-e2e/live-e2e-harness.ts`
- `autobyteus-web/electron/server/services/AppDataService.ts`
- `autobyteus-web/electron/server/serverRuntimeEnv.ts`
- `autobyteus-web/nuxt.config.ts`
- `autobyteus-web/graphql/queries/llm_provider_queries.ts`
- `autobyteus-web/graphql/mutations/llm_provider_mutations.ts`
- `autobyteus-web/stores/llmProviderConfig.ts`
- `autobyteus-web/stores/llmProviderConfigSupport.ts`
- `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
- `autobyteus-web/components/settings/providerApiKey/providerApiKeyGeminiActions.ts`
- `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderEditor.vue`
- `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderProbePreview.vue`
- `autobyteus-web/components/settings/useMediaDefaultModelsCard.ts`
- `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`
- `autobyteus-web/plugins/30.apollo.client.ts`
- every supported `useLLMProviderConfigStore`, `providersWithModelsForSelection`, and capability-specific provider-model consumer found by repository search
- `tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/238-post-delivery-existing-user-api-key-failure-origin.log`
- `tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/240-post-delivery-custom-provider-v1-requirement-gap.md`

### `origin/personal` comparisons

Value-free `git show`/`git grep` comparison covered:

- `autobyteus-ts/src/llm/llm-factory.ts`
- `autobyteus-ts/src/llm/api/openai-llm.ts`
- `autobyteus-ts/src/utils/gemini-helper.ts`
- `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.ts`
- `autobyteus-web/graphql/queries/llm_provider_queries.ts`
- `autobyteus-web/stores/llmProviderConfig.ts`
- `autobyteus-web/stores/llmProviderConfigSupport.ts`
- `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
- `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue`
- `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue`
- `autobyteus-web/utils/modelSelectionLabel.ts`

### Package validation commands

- Python exact-set checks over `requirements.md` for `BEH-001`–`BEH-017`, `REQ-001`–`REQ-018`, `AC-001`–`AC-015`, and `UC-001`–`UC-018`.
- Python exact unique-spine extraction over `use-case-spine-validation.md`.
- Python Markdown relative-link existence and balanced-fence checks over every active core/supplemental artifact.
- focused `rg` scans for stale architecture-authorization metadata, obsolete no-custom-migration decisions, runtime-v1/compatibility wording, stale spine counts, and invalid evidence paths.
- extraction of every active `mermaid` block from `encrypted-secret-vault-contract.md` and `secret-storage-architecture.md`, followed by `PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm --silent dlx @mermaid-js/mermaid-cli` rendering for each block.
- `git diff --check`.
- concrete Anthropic/OpenAI/Gemini metadata/media environment reads

### Public primary sources

- Google Gen AI JS SDK overview: <https://googleapis.github.io/js-genai/>
- `GoogleGenAI` service selector: <https://googleapis.github.io/js-genai/release_docs/classes/client.GoogleGenAI.html>
- Gemini Developer API Models reference (`models.list`): <https://ai.google.dev/api/models>
- Gemini Enterprise Agent Platform Express overview: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/express-mode/overview>
- Gemini Enterprise Agent Platform Express REST reference: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/express-mode/api-reference>
- Node.js environment variables and `.env` files: <https://nodejs.org/api/environment_variables.html>
- Vitest environment-variable guidance: <https://vitest.dev/guide/features.html#environment-variables>
- Vitest configuration/mode guidance: <https://vitest.dev/config/>

Observed on 2026-07-26:

- the current Gemini Developer API reference publishes `models.list` at the Generative Language endpoint;
- the current Express overview and REST reference are both marked Preview and were revalidated at their current `Last updated 2026-07-23 UTC` revision; the reference publishes `countTokens`, `generateContent`, and `streamGenerateContent`, not a model-list method;
- the SDK uses explicit service-selection options rather than inferring a service from a model definition.
- Node documents target-named `.env.*` files as the conventional naming family;
- Node 22.23.1 in the task environment supports the built-in `--env-file` and `--env-file-if-exists` launch options;
- Vitest runs with test mode and documents explicit loading when unprefixed variables such as `DATABASE_URL` are required;
- shared `.env.test` defaults do not replace per-test infrastructure isolation; existing AutoByteus test setup already creates/assigns test DB URLs programmatically.

Previously retained official Anthropic/Codex findings remain downstream release evidence. This reset does not reopen either authentication decision.

## Stable Architecture Evidence Register

| Evidence ID | Exact source / command family | Value-free observation used by the design |
|---|---|---|
| `EVID-CATALOG-001` | `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`, GraphQL provider types, web provider store/UI; screenshot supplied by user | Current provider/model response assembly also carries credential/setup state; the packaged user path reached `New Provider (0)` / `No Models Found`. Catalog and credential subjects must be separated rather than standardized into one broad DTO. |
| `EVID-PROVIDER-READ-001` | Current/base `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`, `autobyteus-web/graphql/queries/llm_provider_queries.ts`, `llmProviderConfig*.ts`, `useProviderApiKeySectionRuntime.ts`, `ProviderModelBrowser.vue`, `CustomProviderDetailsCard.vue`, `modelSelectionLabel.ts`, Apollo client, direct evidence `180`–`182`, and exact consumer searches | One GraphQL operation currently returns four repeated `ProviderWithModels` collections and Apollo can overwrite OpenAI configured state. Direct origin/current comparison also proves the existing `LlmProviderObject` and `ModelDetail` types already serve working product consumers. The clean correction is therefore organizational: one provider-centric Settings group, one provider credential fact, and four existing model lists. GraphQL selection sets can request only the fields this page renders without creating replacement DTOs. Existing catalog queries must remain because many selectors, media defaults, runtime, history, workspace, and E2E consumers use them. |
| `EVID-DB-001` | `src/config/app-config.ts`, `src/config/prisma-client-factory.ts`, `src/startup/migrations.ts`, `src/server-runtime.ts`, `prisma/schema.prisma` | `DATABASE_URL` and normal Prisma migration already govern application SQLite data. Current secret bootstrap runs as a separate pre-migration lifecycle and no vault tables exist in Prisma. |
| `EVID-STORE-001` | complete current `src/secret-management/backends/**`, `configuration/**`, runtime/bootstrap/reset/provisioning files; file/count and import searches | Current ticket source implements a second SQLite DB/key/config/backend/access-mode/default-E2E subsystem. Those responsibilities duplicate the application DB selector/lifecycle. |
| `EVID-CRYPTO-001` | current Local Store crypto/schema/initializer/repository source | Existing code provides value-free evidence for CSPRNG, HKDF-SHA-256, AES-256-GCM, verifier, nonce/tag, and pair-state concepts; the clean design rehomes them behind Prisma/application-DB ownership. |
| `EVID-SETTINGS-001` | provider GraphQL resolvers/services, `gemini-configuration.ts`, AppConfig projection, web API-key query/mutations/components/stores | Provider-specific save/remove/status surfaces and write-only UI patterns exist, but current status/catalog coordination is too broad. Ordinary provider results echo caller-owned identity, custom request/results repeat constant/echo fields, and Gemini commands expose a second seven-field operation protocol even though the resulting setup state is sufficient. |
| `EVID-RESOLVER-001` | `autobyteus-ts/src/secrets/provider-api-key-resolver.ts`, `llm-factory.ts`, representative LLM/media clients, server resolver adapter; `origin/personal` concrete provider comparison | The current branch already injects a narrow storage-neutral resolver and concrete providers resolve lazily. `origin/personal` read credentials in the concrete provider, supporting a point-of-use replacement rather than model authentication metadata. |
| `EVID-GEMINI-001` | current/origin `autobyteus-ts/src/utils/gemini-helper.ts`, Gemini LLM/media clients, server Gemini configuration service, GraphQL operation/result types, Pinia/action helper, and Vue form | Exact Google SDK shapes work. Current helper uses key/config priority; original Settings clears other options. The user intentionally approved independent option persistence plus explicit mode activation instead. Field-use audit proved the specialized UI needs active mode, two key-configured facts, and nullable complete project/location; the same state can be returned by every command without operation/outcome/stage/instruction attributes. |
| `EVID-METADATA-001` | current metadata provisioning/resolver/provider source plus Google primary references listed above | Gemini Developer API publishes model listing; current Express REST publishes generation/token methods but no model-list contract. AI Studio may enrich live; Vertex stays curated-only. |
| `EVID-CUSTOM-001` | current custom-provider v1/v2 metadata store, runtime sync, create/probe/list/use/delete service paths, GraphQL input/results, web draft/probe/details components; direct `origin/personal` comparison | Current v2 metadata is secret-free. Neither current product nor the approved user discussion introduces persisted-provider update; `updateCustomProviderDraft` is only pre-create form state. The UI enters only name/base URL/key, Probe displays only discovered model ID/name, and Create needs the assigned ID before canonical refetch; provider type/runtime and echoed inputs are redundant. Clean create/delete retains bounded compensation/idempotency without inventing an update surface or plaintext fallback. |
| `EVID-CUSTOM-MIG-001` | `origin/personal:autobyteus-ts/src/llm/custom-llm-provider-config.ts`, current v1/v2 config model and `custom-llm-provider-store.ts`, existing app-data migration registry/runner/repository, `server-runtime.ts`, custom-provider store utilities/locking, and value-free evidence `238`/`240` | The fixed application-owned v1 shape contains plaintext `apiKey`; current v2 removes it; and the current v2-only store throws `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`. The assembled `listProviderSettings` awaits custom-provider listing, so this supported packaged existing-user state can reject the entire API-key page. The existing app-data migration runner already records non-critical migration failures and allows startup to continue. A migration boundary is therefore justified, but general Settings containment is independently required. No real custom-provider file content, API-key value, vault row, DB, or root key was opened. |
| `EVID-IMPORT-001` | current importer domain/service/source reader/alias registry/CLI, current `LocalSecretStoreProvisioningService.inspectExact`, retained value-free execution evidence, round-27 source review, `execution-evidence/171-round14-real-source-import-preview.log`, `172-round14-import-target-failure-origin.log`, and `173-round14-import-failure-evidence-scan.log` | Parser already recognizes positive aliases, ignores unrelated names, and treats empty recognized values as absent. Current separate-Store code also proves the useful distinction between inspection and mutation, but the clean one-DB package must own it explicitly: one internal secret-management inspection service classifies absent/pre-feature/ready/closed targets without mutation, while execution alone migrates/bootstraps/writes and rechecks status transactionally. The round-14 dry-run expected the test DB but inherited a parent production `DATABASE_URL`; it performed no write, yet proved that AppConfig/`.env.test`/ambient target inference is ambiguous. The user therefore selected a required explicit importer `--database-url` as sole target authority. Target/default-E2E routing and a special test-import wrapper are obsolete. |
| `EVID-LEGACY-001` | non-secret environment projection, startup scans, explicit user decisions recorded in requirements | Arbitrary legacy sources such as `.env` receive no automatic credential migration and have no runtime authority. The newly approved exception is only the fixed application-owned custom-provider-v1 app-data source, isolated behind `EVID-CUSTOM-MIG-001`. |
| `EVID-E2E-001` | `test-config/live-e2e.json`, root/server package scripts, `src/app.ts`, `src/config/app-config.ts`, `autobyteus-server-ts/vitest.config.ts`, `tests/setup/prisma-env.ts`, current real-E2E runner/harness, Electron `AppDataService`, server `.gitignore`; official Node environment-file and Vitest guidance; synthetic `.env.test` launch probe on Node 22.23.1 | Current JSON combines DB/key/access mode with scenario/provider/model/capability policy. The actual server accepts host/port/data-dir and correctly requires `<data-dir>/.env`; the real-E2E path opens a harness-only Store rather than the normal server; and deterministic tests set DB URLs programmatically. The synthetic probe proved that `.env.test` is appropriate test-runner input but not an actual-server config file: AppConfig becomes ready only after the test tooling supplies the ordinary runtime `.env`. The clean target therefore keeps production server configuration unchanged and makes one backend-E2E bootstrap explicitly read `.env.test`, materialize/reconcile an ignored runtime `.env`, start the actual server, and drive normal APIs. |
| `EVID-CLAUDE-001` | current Claude runtime/auth/launch policy source and retained review reports | Two explicit modes are already approved: external `cli` and exact-child `managed-secret`; no redesign is needed. |
| `EVID-CODEX-001` | current Codex client/manager and direct `origin/personal` comparison | Codex uses established external login state and must preserve real home/environment rather than enter the governed empty-base boundary. |
| `EVID-CHILD-001` | governed child environment/file-root/MCP/application launcher source and retained tests/reports | Bounded empty-base/allowlisted child controls are reusable for governed launchers; DB/key/credential descriptors must remain excluded. |
| `EVID-AUTOBYTEUS-001` | AutoByteus discovery/provider/client source, Settings reload/hosts paths, retained endpoint evidence | Remote LLM/audio/image discovery and invocation are supported, share one AutoByteus provider credential, and permit exact endpoint-unavailable reporting. |
| `EVID-PRISMA-001` | manifests/lock, `repository-prisma-1.0.8-assessment.md`, exact package probes retained downstream | Exact unpatched 1.0.8 is import-safe and default-off for query logging; Prisma/client remain 5.22 and current repositories remain owners. |
| `EVID-ELECTRON-001` | Electron server manager/runtime env/logger/loading/status code; delivery build logs; user startup/settings observations | Electron already forwards server output and exposes logs, but packaging validation did not launch the complete isolated app/server/Settings lifecycle. |

No evidence row was produced by opening a real credential value, root key, secret-bearing assignment file, Store, or application database.

## Relevant Existing Behavior And Production Paths

| behavior_id | Supported trigger / governing contract | Evidence-backed current path | Clean target pressure |
|---|---|---|---|
| `BEH-001` | User opens API Settings or model selector | Web query -> GraphQL -> `LlmProviderService`/catalog -> provider cards/models | Catalog must be assembled before/without credential resolution. |
| `BEH-002` | Server/Electron/Docker startup | `AppConfig` -> `DATABASE_URL` -> `runMigrations()` -> repository-specific Prisma clients | Add secret tables to this same lifecycle; remove separate Store bootstrap/config. |
| `BEH-003` | First start or restart after migrations | Superseded separate Local Store initializer opens DB/key pair and verifies metadata | Reuse crypto concepts, but bind them to the selected application DB and derived sidecar. |
| `BEH-004` | User saves/removes a provider key | Web -> GraphQL provider resolver -> app/config or superseded `SecretManagementService` | Keep provider-specific API and write-only status; persist through one service/repository. |
| `BEH-005` | Agent/media/search invokes a concrete provider | Factory -> concrete provider -> environment read (`origin`) or injected resolver (current branch) -> SDK client | Keep injected resolver; provider owns provider/slot selection and JIT reveal. |
| `BEH-006` | Gemini LLM/media invocation | Original helper uses implicit Vertex Express -> project/location -> AI Studio priority and exact `GoogleGenAI` options | Preserve exact SDK construction, but replace implicit priority with one explicit non-secret active mode and independent option persistence. |
| `BEH-007` | Provider/model list/reload | Metadata provisioning -> optional provider call -> resolver/catalog fallback | Make live enrichment total/optional and keep curated output authoritative. |
| `BEH-008` | Packaged existing-user startup, then custom provider create/use/delete | Fixed v1 JSON -> current v2-only store error -> assembled Settings rejection; current create path separately coordinates v2 metadata plus encrypted secret | Add one migration-owned v1-to-v2/vault transition before provider consumers, plus delete-and-reconfigure fallback and Settings containment. Normal runtime remains v2-only; current create/use/delete owns only current data. |
| `BEH-009` | Operator runs importer | PNPM command -> CLI -> source reader -> alias registry -> target resolver -> separate Store provisioning service with non-mutating `inspectExact` before write | Delete target resolver/Store selection; target the same canonical DB as the command; retain the inspection-versus-execution separation through one clean internal inspection service and one normal write lifecycle. |
| `BEH-010` | Upgrade/start with legacy `.env` aliases | AppConfig/non-secret projection plus no-migration behavior | Keep `.env` credentials untouched/non-authoritative and preserve no runtime fallback; do not confuse this with the fixed custom-provider migration in `BEH-008`. |
| `BEH-011` | Developer starts backend E2E, manual test server/front end, importer, or real-provider E2E | Direct `app.ts` startup correctly loads only `<data-dir>/.env`; the large JSON drives a separate read-only harness/backend/scenario plan; deterministic Vitest setup separately creates test DB URLs; the test-import wrapper can inherit a parent production DB | Keep actual server startup unchanged. Add one backend-E2E bootstrap that reads immutable server-root `.env.test`, materializes/reconciles an ignored ordinary writable runtime `.env`, starts the actual built server and normal frontend/API path, uses fresh runtime roots for deterministic E2E, preserves an explicit provisioned root for real providers/manual testing, and keeps scenarios in code. Keep the importer separate and require its target DB URL explicitly. |
| `BEH-012` | User selects Claude runtime | Claude backend -> auth mode -> exact child | Preserve two-mode boundary. |
| `BEH-013` | User selects Codex runtime after `codex login` | Codex manager/client -> established home/environment | Preserve unchanged and exclude from governed child claim. |
| `BEH-014` | Agent invokes file/tool/MCP/application children | Governing launcher -> child environment/file roots -> child | Retain bounded hardening; remove credential/database/root-key exposure. |
| `BEH-015` | Settings hosts/reload or remote invocation | AutoByteus discovery/client -> configured hosts + one key | Preserve, with point-of-use resolver and catalog independence. |
| `BEH-016` | Install/import/build | package manifest/lock -> exact `repository_prisma@1.0.8` | Retain exact dependency evidence; do not make it a new owner. |
| `BEH-017` | Delivery builds and user launches candidate | electron-builder -> `.app` -> embedded server -> Settings | Add complete isolated packaged lifecycle and value-safe technical-details path. |

## Design Health Assessment Evidence

### Change posture

Large refactor and cleanup with security behavior, persisted schema, test configuration, packaging validation, and strict functionality preservation.

### Root causes

1. **Boundary/ownership issue:** catalog/model data acquired credential/authentication fields even though provider clients own actual credential use; provider identity/status is also repeated inside four capability collections rather than owned once.
2. **Duplicated policy/coordination:** `DATABASE_URL` selects application state while a second configuration system selects secret state; test target logic duplicates environment selection.
3. **Shared-structure looseness:** construction contexts/authentication unions let unrelated model, provider, mode, and secret concerns travel together, while `ProviderWithModels` duplicates one provider subject and status across capability collections.
4. **File/responsibility drift:** the secret subsystem contains backend selection, physical Store lifecycle, reset, access mode, provisioning, import target resolution, and runtime selection for a single local implementation.
5. **Legacy/compatibility pressure:** iterative findings accumulated compatibility statements and dual ownership rather than making obsolete machinery first-class removals.

### Refactor decision

`Refactor required now.` A local fix to the empty Settings screen would leave the second database/configuration system and catalog/auth coupling intact. The reviewed target must remove those causes, not mask the symptom.

## Relevant Files / Components

### Healthy owners to retain/extend

- `AppConfig`: canonical non-secret application configuration, including `DATABASE_URL` normalization.
- Prisma migration lifecycle: creates current application schema before services start.
- `createConfiguredPrismaClient`: configured application database client factory.
- `SecretManagementService`: provider-facing secret lifecycle authority, after simplification.
- `ProviderApiKeyResolver` port: storage-neutral core capability.
- concrete provider clients: provider/slot selection and trusted SDK reveal point.
- provider/model catalogs: credential-independent definitions and curated models.
- one API-key Settings read owner that projects only screen-consumed fields, plus a separate credential-free rich catalog owner.
- Gemini pure runtime selector and exact SDK construction helper.
- provider-specific GraphQL/Settings owners.
- existing governed launcher/file-root/redaction owners.
- existing Claude and Codex runtime owners.

### Superseded structures expected to be removed or collapsed

- separate `local-store-schema.ts` physical database schema;
- `secret-storage-configuration*.ts` backend/config file selection;
- separate database/key/access-mode `LocalStoreConfiguration`;
- `local-secret-store-reset-service.ts` exact-Store reset surface;
- local Store provisioning/target resolver concepts tied to `default|e2e`;
- generic registered backend selection/capability UI for this delivery;
- `READ_ONLY`/`READ_WRITE` Store access modes;
- `test-config/live-e2e.json` as Store/scenario authority;
- model authentication requirements, credential-provider IDs, construction targets/contexts, and resolved-auth unions;
- old `provider.gemini.ai-studio-api-key` identity and any compatibility alias;
- implicit Gemini priority/fallback and save-order authority;
- environment credential fallback and runtime legacy aliases.
- credential/configured fields repeated through `available*ProvidersWithModels`, the parallel web `providerConfigs` map, API-key aggregation/cross-provider fallback, and Apollo-order/cache repair logic. Rich credential-free catalog reads remain for their real consumers.

The final file map is design work and is not locked in this investigation artifact.

## Runtime / Probe Findings

1. Packaged Electron eventually started, proving the earlier server exit was not a permanent package-architecture failure, but Settings displayed no usable providers/models. This is a real supported UI path and makes catalog/auth separation material.
2. Direct source comparison proves `origin/personal` constructs OpenAI/Gemini credentials at the concrete client layer; this supports the narrow resolver replacement rather than construction orchestration.
3. Direct source comparison proves original Gemini runtime priority is Vertex Express -> complete project/location -> AI Studio; this is current-state evidence, not the newly approved target authority.
4. Direct source comparison also proves original Settings clears non-selected Gemini options. The user deliberately replaces both behaviors with independent option persistence/removal plus one explicit active-mode setting and a concise configured-versus-active UI.
5. Current `test-config/live-e2e.json` combines backend DB/key/access mode with 12 scenario plans, models, secret assertions, hosts, and expected capabilities. The user’s concern is evidenced directly.
6. Current direct server startup intentionally does **not** auto-load `.env.test`. `app.ts` accepts only host, port, and data-dir, while `AppConfig.initialize()` requires `<data-dir>/.env`. The user confirmed this is the correct real-server contract. The current real-E2E runner instead launches Vitest with the JSON manifest and its harness directly opens the separate Store; that path does not prove the normal built server/frontend lifecycle.
7. A value-free synthetic probe used a temporary directory, only synthetic non-secret assignments, the built `AppConfig`, and Node 22.23.1 `--env-file=<temp>/.env.test`. With only `.env.test`, initialization failed exactly because `<data-dir>/.env` was absent. After adding an ordinary writable runtime `.env`, the same probe reached `READY` and selected the test `DATABASE_URL`. Both temporary cases were removed after the probe. The conclusion is not to change AppConfig; it is to make the backend-E2E runner materialize the normal runtime file before server start.
8. `AppConfig.set()` and `.delete()` mutate its configured `.env`. Pointing it directly at the tracked `.env.test` would therefore make ordinary Settings actions dirty a committed file. The tracked backend-E2E template and ignored writable runtime settings must remain distinct.
9. The practical clean server/test contract is one `TestRuntimeBootstrap`, not another profile: parse the fixed tracked `.env.test`; canonicalize its DB location relative to the server root; materialize/reconcile only fixed launch keys into an ignored `<test-data-dir>/.env`; preserve mutable Settings keys for persistent test roots; and launch the unchanged actual built server with `--data-dir`. The server child receives no test application settings through ambient `process.env`. `GEMINI_SETUP_MODE` and project/location are mutable Settings data and must not be committed into `.env.test`. The importer is intentionally separate: it receives the canonical absolute test DB URL explicitly and never asks the bootstrap/AppConfig/parent environment to infer it.
10. Current production source has no secret models in `schema.prisma`; the separate Store creates `store_metadata` and `secret_records` outside Prisma migrations.
11. Current server starts the separate secret configuration service before `runMigrations()`. The clean target requires the reverse: canonical application DB migration first, then vault key/domain initialization.
12. No real Store/database/key/credential was opened. The audit was source-, schema-, filename-, and value-free evidence only.
13. Round-14 API/E2E evidence proved a concrete target-authority bug without writing: `secrets:local:import:test` was expected to select the project test DB but an in-process AppConfig inherited the normal application database from parent application variables. The selected source’s contents did not select the DB. The user rejected another implicit wrapper rule and required every import to accept the database URL explicitly.
14. Round-15 assembled GraphQL/browser evidence proved a separate provider-read ownership defect. The current query is one network operation but returns `availableLlmProvidersWithModels`, `availableAudioProvidersWithModels`, `availableImageProvidersWithModels`, and `availableVideoProvidersWithModels`. All repeat provider identity. OpenAI's LLM row has `CONFIGURED`; media rows have `credentialStatus: null`; default Apollo normalization uses the shared `LlmProviderObject:OPENAI` cache key, so a later media occurrence can mask the LLM status.
15. The web store retains four parallel provider/model arrays plus a second `providerConfigs` map. `useProviderApiKeySectionRuntime` builds a third provider map, seeds it only from LLM rows, adds media counts only for already-seeded providers, and its selected-status fallback may take the first non-null status from another provider. This is not a catalog defect; it is duplicated provider/status authority.
16. Supported consumers split into two real usage contexts, but not two new schema type families. API-key Settings needs provider identity/configured/custom facts and a small GraphQL selection from the model type; media defaults, runtime/launch selectors, messaging, agent/run-history hydration, and workspace forms select richer fields from the same established `ModelDetail`. A new reduced model DTO would create unnecessary parallel authority. The target therefore reuses the current provider/model schema types, adds only the provider-centric group, and preserves existing credential-free catalog queries for their current consumers.
17. Direct `origin/personal` comparison confirms the repeated provider rows were already present. They appeared consistent because every occurrence derived the same `.env` boolean. The prior behavior is not evidence that provider identity belongs four times; the vault exposed the latent normalized-cache collision because only one occurrence had the new status projection.
18. Architecture round 31 resolved the provider-centric design but identified one unsupported partial-failure assertion: no product-supported trigger established that exactly one of the four catalog acquisitions can fail while the others remain usable. The target therefore retains four required non-null model lists, uses `[]` only for a successful acquisition with no matching models, and defines no nullable per-list result, availability wrapper, or speculative independent-recovery machinery.
19. Post-delivery existing-user execution established a distinct reachable failure: the fixed custom-provider file is v1, the v2-only store throws, and the assembled provider-settings path propagates that error. The user selected an availability-first result: attempt automatic preservation once; if it cannot complete safely, delete the legacy v1 file, reset only the custom-provider current state, and keep startup, built-ins, catalogs, and New Provider usable.
20. The existing app-data migration runner is the natural lifecycle owner because it runs after application migration/vault initialization, records `SUCCEEDED|SUCCEEDED_WITH_WARNINGS|FAILED`, and does not need to teach the normal store to understand v1. The custom-provider store remains current-v2-only.
21. Cross-resource atomicity cannot be one physical transaction across SQLite and JSON. The bounded protocol therefore uses a complete staged v2 file, one create-only encrypted DB batch, atomic file publish, same-process conditional compensation by exact receipt, and restart collision reset. This is proportionate because any unsafe/interrupted state deletes the legacy configuration and falls back to user reconfiguration rather than overwriting a current secret.
22. The user explicitly accepts destructive removal of the legacy custom-provider file on the rare failed-migration path because custom providers are simple to add again from the frontend. A hidden owner-only recovery file was rejected as operationally useless and as unnecessary retained plaintext. No real source value was inspected to reach this decision.

## External / Public Source Findings

### Google service boundaries

- Gemini Developer API supports a live `models.list` contract.
- Express REST currently has an explicit generation/token surface and no published model-list method in the current reference.
- Exact SDK service options remain the correct invocation boundary.

**Design consequence:** AI Studio live metadata is optional enrichment; Vertex Express/Project remain curated-only. This decision prevents an API key from being sent to the wrong service while keeping catalog availability independent.

### Database/cryptography

No external cryptography novelty is required. The current branch already demonstrates Node cryptographic primitives for random bytes, HKDF-SHA-256, and AES-256-GCM. The clean design retains those standard primitives and changes ownership/identity/path binding.

## Reproduction / Environment Setup

No real secret setup or live-provider execution occurred in this revision.

Safe investigation setup:

1. refreshed `origin/personal`;
2. inspected current branch and base source;
3. compared exact source blobs with `git show`/`git grep`;
4. listed current files and schema/config references;
5. inspected only committed configuration names/structure, never right-hand-side credential values;
6. preserved all downstream dirty tests/reports/evidence without reset.

## Findings From Code / Docs / Data / Logs

### One application database is a natural existing boundary

- `AppConfig.getOperationalDatabaseUrl()` already governs SQLite application data.
- `runMigrations()` already receives the same URL.
- `createConfiguredPrismaClient()` already injects it into repository clients.
- Adding secret models/repository to this lifecycle removes a database selector rather than adding one.

### A second Store is not required for test isolation

A test process already selects a test application database. When the DB itself is disposable/test-owned, a secret-specific `READ_ONLY` mode does not add custody isolation. Write-safety should come from using an isolated test DB and explicit fixture lifecycle, not from another configuration axis.

### Two tables remain justified inside one database

- `secret_entries` owns encrypted records keyed by stable `secret_id`.
- `secret_encryption_metadata` owns the database/key encryption-domain verifier and format version.

Combining both into one row family would mix singleton domain state with repeated secret records and weaken constraints. The user’s simplification request was one database, not one table.

### Root key remains external

If the root key were committed or stored in the same DB, possession of the DB would also provide the decrypting key. The open-source repository should ship generation/lifecycle code only. The root key is generated per installed/test database on first use and must be backed up/moved with that database outside Git.

### Secret IDs are provider credential slots, not model identities

Examples:

- `provider.openai.api-key`
- `provider.anthropic.api-key`
- `provider.google.ai-studio.api-key`
- `provider.google.vertex-express.api-key`
- `provider.autobyteus.api-key`
- future `integration.github.access-token`

This keeps one OpenAI key shared across LLM/audio/image and permits Google’s legitimately separate credential options without putting credentials on models.

### API-key Settings needs one provider-centric grouping, not replacement domain types

The original/current API-key screen, schema, Pinia store, runtime composable, model browser, custom-provider details card, and model-label helper were compared directly with `origin/personal`.

Observed facts:

- `availableLlmProvidersWithModels`, `availableAudioProvidersWithModels`, `availableImageProvidersWithModels`, and `availableVideoProvidersWithModels` each repeat `LlmProviderObject` for the same provider identity;
- `origin/personal` made those repeats appear safe only because every occurrence computed the same `.env` boolean;
- the current secret-store path populated credential status on the LLM occurrence but not the media occurrences, so Apollo's shared `LlmProviderObject:<id>` cache identity allowed a later media occurrence to mask the configured state;
- `LlmProviderObject` already carries the provider facts used by the existing Settings experience, including custom-provider identity/base URL/catalog state;
- `ModelDetail` is an established working catalog contract. The API-key screen renders only `modelIdentifier`, `name`, and where needed `providerType`, while other consumers legitimately select its richer fields;
- GraphQL selection sets already let each consumer request only the fields it needs, so creating `ProviderApiKeyModelSummary` would duplicate schema authority without reducing the established model type;
- current non-Settings consumers rely broadly on the four existing catalog query fields, so deleting or compatibility-wrapping those queries would be a breaking and unnecessary cleanup.

Approved design result:

```graphql
type ProviderSettingsGroup {
  provider: LlmProviderObject!
  llmModels: [ModelDetail!]!
  audioModels: [ModelDetail!]!
  imageModels: [ModelDetail!]!
  videoModels: [ModelDetail!]!
}

providerSettings(runtimeKind: String): [ProviderSettingsGroup!]!
```

The group is the only new read shape. It has one provider subject and four capability-owned model collections. The backend composition owner obtains provider identity plus one value-free `apiKeyConfigured` fact for that exact provider, groups existing catalog results by exact provider ID, and emits `[]` for a capability with no models. It never invents a provider from an orphan model and never derives credential state from catalog occurrence or result order.

The API-key page makes one `providerSettings` request and uses one `ProviderSettingsGroup[]`. Its selection set requests only the existing provider/model fields the page renders. It does not merge four provider arrays, keep a second `providerConfigs` credential map, or scan another provider for status. Existing catalog query fields remain supported for their existing non-Settings consumers.

This is intentionally a minimal structural refactor:

- retain `LlmProviderObject` rather than create a second provider DTO;
- restore one origin-compatible `apiKeyConfigured` Boolean on that provider object, computed from the vault rather than `.env`;
- retain current `ModelDetail`, including current metadata fields, rather than create a two-field summary type;
- add no availability, capability-wrapper, instruction-code, vault-health, or status-message protocol solely for credential custody;
- retain existing custom-provider fields because the current custom-provider UI uses them;
- keep catalog membership independent of credential presence.

The API-key command surfaces remain narrow: ordinary provider Save/Remove returns Boolean command completion and refetches `providerSettings`; custom-provider Probe/Create input remains name/base URL/transient key, Probe returns its existing small `{id,name}` discovery result, Create returns the assigned provider ID, and every Gemini command returns the specialized authoritative `GeminiSetupState`.

### Custom-provider update was accidental scope

Direct current/base inspection confirms create, probe, list, runtime use, and delete. There is no persisted-provider update mutation; the similarly named draft update is only local pre-create form editing. The user required supported functionality preservation and did not request a new custom-provider update feature. Therefore round-27 `AR-020` is resolved by removing the accidental word `update`, not by inventing a new surface or lifecycle.

### Import preview needs a distinct non-mutating lifecycle

The target application DB may be nonexistent, may predate the secret tables, may contain a complete current vault, or may contain a closed partial/incompatible pair. A dry-run cannot use normal migrate/bootstrap because those operations create or modify the DB/key/metadata. The clean design therefore introduces one internal `SecretVaultInspectionService`:

- absent DB+key, pre-feature DB with no secret artifacts, or complete migrated secret tables with zero metadata/entries and either no key or one valid secure interrupted-initialization key -> `INITIALIZATION_REQUIRED`, all selected IDs `MISSING/CREATE`;
- complete schema+metadata+secure key with valid verifier -> `READY`, exact read-only entry existence and planned actions;
- any partial, unsafe, incompatible, verifier-failed, or unreadable state -> value-free closed state, all selected IDs `UNAVAILABLE/BLOCKED`;
- no DB/key/metadata/permission/settings mutation;
- execution alone performs normal migration/bootstrap, re-evaluates entry existence in the write path, and reports actual counts.

Preview remains an observation rather than a lock. Conditional create/skip enforces no-overwrite if another process writes after preview; replace remains possible only with explicit overwrite.

### Import target selection must be explicit, singular, and independent

The standalone importer is not a running application server and therefore does not need to inherit the application’s ambient configuration authority. Reusing AppConfig made the target depend on whichever `.env`/parent variables happened to win in that process. A named `import:test` wrapper did not solve the underlying ambiguity.

The clean target is one command and one required target argument:

```text
pnpm secrets:import -- --source <absolute-assignment-file> --database-url <absolute-sqlite-file-url>
```

- `--database-url` is the importer’s sole database authority;
- it must be a supported absolute SQLite `file:` URL and is canonicalized by `ApplicationDatabaseLocation`;
- missing, duplicate, relative, non-SQLite, or malformed arguments fail before target access;
- `.env`, `.env.test`, parent `process.env`, the current working directory, and a `DATABASE_URL` line inside the source have no target authority;
- the same command can intentionally target production, test, or a temporary DB without profiles or multiple implementations;
- dry-run and confirmation display the canonical target identity before any execution path can write;
- the old `secrets:local:import` name, special `secrets:local:import:test` wrapper, and target-inference script are removed; the sole command is `secrets:import`.

This keeps one database model while separating two concerns cleanly: server/test launch configuration chooses a running application DB, while an operator import command explicitly chooses its write target.

## Persisted Data Transition Evidence (When Applicable)

| Data set | Evidence | Decision | Reason |
|---|---|---|---|
| Existing production application SQLite DB | Current schema uses Prisma migrations and `DATABASE_URL`; new tables are additive | `Directly Usable — No Migration` | Normal schema migration adds tables without transforming existing records. |
| Superseded separate Local Store DB/key | Feature is not final-delivered; user is replacing the architecture | `Discard or Rebuild` | Carrying it forward would require the exact migration/compatibility machinery the user rejected. |
| Legacy plaintext `.env` credential aliases | Existing installations may contain them; user rejected automatic migration | `Discard or Rebuild` as authority; file untouched | User can explicitly import/reconfigure; runtime has no fallback. |
| Fixed application-owned custom-provider-v1 file | Supported historical plaintext shape plus observed packaged Settings failure; user requests normal preservation and simple non-blocking fallback | `Migration Required` | Preserve complete valid providers automatically into v2 metadata plus encrypted entries. If transformation cannot complete safely, delete the legacy file and rebuild only the current custom-provider state so the user can reconfigure. |
| Non-secret application config | Current projection exists | `Directly Usable — No Migration` | Recognized non-secret values remain valid. |
| Large live-E2E JSON scenario manifest | Mixes location and test behavior | `Discard or Rebuild` | DB selection becomes small config; scenarios become code fixtures. |
| New DB/key pair | Generated at first use | Preserve together | Established pair is required for future decryption. |

No persisted secret value was inspected to reach these decisions.

## Constraints / Dependencies / Compatibility Facts

- `origin/personal` is the supported functional baseline, except explicit approved changes.
- No automatic migration of arbitrary credential sources and no legacy/runtime fallback. The only migration is the fixed-path custom-provider-v1 app-data transition.
- Clean-cut removal: no compatibility re-exports or dual ID/database/config paths.
- `LOCAL_HARDENED` only; Codex excluded; strong isolation deferred.
- Claude modes unchanged; Anthropic policy is release recheck only.
- Exact unpatched `repository_prisma@1.0.8` retained without new ownership.
- Prisma/@prisma-client remain 5.22.
- Docker topology unchanged.
- Database and key files are never committed.
- Relative SQLite URLs require one canonical resolution rule before any consumer uses them.
- JavaScript runtime copies cannot be guaranteed fully zeroized; exposure must be minimized and never intentionally serialized.

## Resolved Decisions / Remaining Risks

1. The user approved the availability-first direction: automatic custom-provider-v1 preservation should normally succeed, while rare failure deletes the legacy file, leaves the app usable, and permits frontend reconfiguration. After inspecting the final documented behavior, the user authorized architecture review.
2. The design selects one `ApplicationDatabaseLocation` and exact `<canonical-db-path>.secret.key` convention. Implementation must prove every DB/key consumer uses it.
3. The exact current provider/slot/alias map is now canonical in [credential-consumer-mapping.md](./credential-consumer-mapping.md).
4. The packaged technical-details contract is deliberately value-free: stable phase/code/message plus the existing application log location. Exact visual placement can reuse the current Application Error/status surface.
5. Downstream uncommitted implementation/test state must be reconciled only after a passing architecture gate.

## Architecture Handoff State

- Do not review the old incremental design as the current target.
- The package now contains 43 active spines: the prior 41 clean-state spines plus a primary custom-provider-v1 migrate-or-delete spine and its bounded cross-resource publish/compensation spine.
- Final validation passed the exact 17 behavior / 18 requirement / 15 acceptance-criterion / 18 use-case sets, 43 active spines (32 primary, four return, seven bounded-local), all 15 active Mermaid blocks, every active relative link, balanced fences, focused stale-contradiction scans, current-source evidence-path checks, and `git diff --check`.
- Architecture review should focus on the fixed-path-only migration boundary, create-only collision policy, all-or-nothing publish/compensation, delete-and-reconfigure fallback, current-v2-only runtime, and Settings availability containment without adding wrapper/status DTOs.
- Old downstream reports remain historical evidence and must not re-authorize obsolete Store/configuration machinery.
- The user authorized architecture review of this revision. Implementation, API/E2E, and delivery remain unauthorized until a passing architecture gate.
