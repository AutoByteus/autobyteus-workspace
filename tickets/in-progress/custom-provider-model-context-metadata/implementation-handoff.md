# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental task artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Triggering code review: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`
- Code-review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Triggering rework evidence: `CRR-006` / `CR-003`; `CR-002` is resolved, and code review otherwise passed the exact-only metadata, native Qwen runtime/catalog, durable pair command, sanitized errors, and setup projection. Earlier downstream evidence remains obsolete for `SR-010`/`SR-011`.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Current implementation revision ID: `IR-006`
- Related solution revision IDs: `SR-010`, `SR-011`
- Related architecture-review revision IDs: `ARCH-REV-004`, `ARCH-REV-005`
- Related code-review revision IDs: `CRR-005`, `CRR-006`
- Related API/E2E revision IDs: `N/A` — all prior execution evidence predates the material replacement.
- Related delivery revision IDs: `N/A` — prior delivery evidence is obsolete for this implementation.
- Triggering finding IDs: `CR-003` (`CR-002` remains resolved)

The current implementation cleanly removes the rejected custom endpoint-profile/URL/alias policy, retains only advertised metadata followed by exact built-in `value` fallback, adds native Qwen endpoint resolution and the three required Qwen-served model definitions, and adds one authoritative Qwen URL/key setup journey. The Qwen command probes first, retains the prior `SecretValue` only within command scope, saves the new key, atomically and synchronously commits `QWEN_BASE_URL`, compensates the key on URL failure, and exposes only the two approved sanitized failure codes. Query and successful mutation return the same Qwen-only `{ effectiveBaseUrl, endpointSource, apiKeyConfigured }` projection; the UI renders `DEFAULT|CONFIGURED` directly and contains no default-URL comparison. `IR-005` makes that committed mutation status final for the save lifecycle. `IR-006` completes the advertised recovery contract: Reload Models unconditionally reissues both the model catalog and provider-settings refresh, even after a failed provider-settings request cleared its fetched flag.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Preserve advertised optional numeric metadata and discovery resilience. | `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` -> `openai-compatible-endpoint-provider.ts` -> exact resolver. | Existing normalization, duplicate handling, timeouts, authentication, and last-known-good behavior remain unchanged; advertised positive integers still win per field. |
| `BEH-002` | Delete endpoint/region/plan profiles and aliases; use exact built-in `value` fallback only. | `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`; `model-metadata-resolver.ts`; `openai-compatible-endpoint-provider.ts`. | Resolver input is only the discovered model. The index preserves every exact definition candidate, selects the lowest valid value independently per field with deterministic provenance, and returns unknown for case/suffix/other near matches. `endpoint_profile`, URL canonicalization, profile tables, references, and alias machinery are gone. |
| `BEH-003` | Preserve resolved metadata through runtime, catalog, compaction, and known/unknown token presentation. | Core `LLMModel`/`ModelInfo` path retained; `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` uses the reduced source union; existing token-budget/Token Meter owners remain unchanged. | `live`, `inferred_builtin`, `static_definition`, and `unknown` remain truthful. Focused token-budget/compaction and known/unknown Token Meter regressions pass. |
| `BEH-004` | Configure the native Qwen endpoint and key as one durable pair with bounded compensation. | `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` -> secret vault + `AppConfig.setDurably`; GraphQL Qwen command/status -> web store/runtime. | Sequence is normalize -> probe -> prior status/secret snapshot -> new-key save -> strict URL commit -> shared status. URL failure restores the prior secret or removes a newly created one. Successful compensation returns `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED`; compensation failure returns `QWEN_CONFIGURATION_REPAIR_REQUIRED`. The browser treats the returned status as committed success before separately refreshing provider views. Generic key-only Qwen saves are rejected. |
| `BEH-005` | Add exact Qwen-served values and remove preview compatibility. | `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts`; `supported-model-definitions.ts`. | Adds `qwen3.8-max` (1M), `deepseek-v4-pro` (1M), and `glm-5.2` (198k), with null input/output limits and source-dated provenance. Cross-provider collisions use only `qwen:deepseek-v4-pro` and `qwen:glm-5.2` identifier overrides; exact wire values remain unchanged. No preview alias exists. |
| `BEH-006` | Preserve key-only installations on the historical default while distinguishing absent from explicitly configured state. | `autobyteus-ts/src/llm/qwen-provider-config.ts`; `QwenLLM`; server `getQwenSetupStatus`; GraphQL `QwenSetupStatus`; frontend store/form/reload actions. | Blank/absent `QWEN_BASE_URL` resolves to the historical default. `endpointSource` derives from normalized setting presence, so an explicitly configured URL equal to the default remains `CONFIGURED`. The browser does not embed or compare the default. If the post-save provider-settings refresh fails, Reload Models retries both provider settings and catalog and reports success only after both recover. |

## Key Files Or Areas

- `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`: exact-only per-field custom metadata fallback.
- `autobyteus-ts/src/llm/qwen-provider-config.ts` and `api/qwen-llm.ts`: single configured/default endpoint owner used at Qwen client construction.
- `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts`: cohesive Qwen catalog definitions, extracted so changed implementation sources remain below 500 effective lines.
- `autobyteus-server-ts/src/config/environment-assignment-file.ts` and `app-config.ts`: shared assignment serialization plus strict same-directory temporary write, fsync, atomic rename, cleanup, and post-commit runtime update.
- `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`: authoritative Qwen status and pair command.
- `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`: exact `QwenSetupStatus`, `QwenConfigurationInput`, query/mutation, and failure-code allowlist.
- `autobyteus-web/components/settings/providerApiKey/QwenSetupForm.vue`, section runtime, Pinia store, GraphQL operations/generated types, and locales: server-owned status rendering and save journey.
- `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` and `stores/llmProviderConfig.ts`: committed save outcome and post-commit provider-view refresh are separate lifecycle stages; refresh failure is a warning, not a mutation failure; global and provider-specific Reload Models actions refresh both the catalog and Settings provider groups without relying on stale cache flags.
- `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue` and `ProviderAPIKeyManager.vue`: narrow-screen stacking/padding polish plus a visually distinct amber post-commit warning.

## Important Assumptions

- One native Qwen endpoint is active per installation, as approved.
- `QWEN_BASE_URL` remains non-secret AppConfig state; `provider.qwen.api-key` remains secret-vault state.
- Newly constructed Qwen runtimes are the activation boundary; in-flight clients are intentionally not mutated.
- The existing secret-vault single-secret write is the authoritative key persistence operation. The Qwen service adds only command-local compensation and no generalized transaction abstraction.
- Existing Qwen keys require no migration; absence of the new setting has an explicit default interpretation.

## Known Risks

- API/E2E still needs to validate a real synthetic `/models` probe, actual persisted URL/key failure injection across the GraphQL boundary, restart behavior, and a Qwen request targeting the configured URL. These are not claimed by implementation-local checks.
- Existing integration/E2E token-usage fixtures still contain `qwen3.8-max-preview` as an arbitrary historical custom-model string. The required downstream coverage investigation must decide whether those fixtures remain valid or should be updated/removed; they are not native Qwen definitions or compatibility aliases.
- Repository-wide server and web typecheck commands are not clean on this base for unrelated configuration/baseline reasons noted below. Production builds compile successfully.
- Vendor context metadata remains time-sensitive and should be revisited when Alibaba publishes definitive production `qwen3.8-max` material.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change / Refactor`
- Reviewed root-cause classification: `Boundary Or Ownership Issue` plus `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: Alibaba route policy was removed from the generic custom resolver. Qwen runtime endpoint ownership now lives in one core resolver, pair sequencing in `LlmProviderService`, strict non-secret persistence in `AppConfig`, and user-visible state in a Qwen-only projection/form. No caller above these boundaries coordinates their internals directly.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — endpoint profiles, URL/region/plan identity, `endpoint_profile`, reference/alias handling, and the preview definition path were removed rather than preserved.
- Shared structures remain tight: `Yes` — only Qwen receives its three-field setup projection; no general offering/producer/deployment/route fields or generalized transaction were added.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — `supported-model-definitions.ts` was split by extracting the cohesive Qwen definition owner; the largest changed effective counts are `AppConfig` 496, supported definitions 479, provider service 474, GraphQL resolver 417, and frontend runtime 401.
- Notes: `environment-assignment-file.ts` owns the reusable file serialization/replacement concern; `AppConfig` remains the authoritative setting boundary.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: “Persisted Data / State Transition Decision” and the Qwen configuration contract.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: Existing `provider.qwen.api-key` lookup is unchanged. Missing/blank `QWEN_BASE_URL` is handled by the normal core resolver as `DEFAULT`; no stored record shape changes.
- Migration implementation: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- GraphQL types were regenerated from a locally built server schema; the schema exposes exact `QwenConfigurationInput`, `QwenSetupStatus`, and `QwenEndpointSource` names.
- Browser self-validation used the repository Nuxt development renderer, a locally built server with isolated temporary app data/SQLite storage, and local Playwright/Chrome. Mutation outcomes were intercepted with sanitized GraphQL fixtures so no real provider credential or configuration was written.
- No new package dependency was added.

## Local Implementation Checks Run

- `autobyteus-ts`: focused metadata/Qwen/catalog/provider unit tests — `25 passed`; token-budget/compaction preservation tests — `8 passed`; `pnpm build` — passed.
- `autobyteus-server-ts`: focused AppConfig/Qwen service/GraphQL/provisioning unit tests — `63 passed`; `pnpm build` — passed, including shared-package build, Prisma generation, TypeScript build, and sanitized built-module/bootstrap smoke.
- `autobyteus-web`: current Qwen form/manager/runtime/Apollo-contract plus provider-store tests — `5 files / 32 tests passed`, including the full successful-mutation -> failed provider-settings refresh -> actual Reload Models -> recovered provider settings/catalog/view regression; Token Meter preservation tests from IR-004 — `9 passed`; web boundary, localization boundary, and localization literal audit — passed; GraphQL code generation from IR-004 — passed; current production `pnpm build` — passed.
- `git diff --check` — passed; forbidden endpoint-profile/alias identifiers are absent from changed production paths.
- `autobyteus-server-ts pnpm typecheck` — attempted, not passed: the repository `tsconfig.json` includes `tests` while `rootDir` is `src`, producing broad pre-existing `TS6059` errors. The production build/typecheck path passes.
- `autobyteus-web NODE_OPTIONS=--max-old-space-size=8192 pnpm exec nuxi typecheck` — attempted, not passed: it reports thousands of broad pre-existing generated/Electron/resource/test type errors and missing optional Apollo declaration packages; no changed Qwen component/store/runtime file was named. The focused suites and production build pass.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings > API Keys > Qwen; default/key-only state, validation, show/hide, previous-restored failure, repair-required failure, successful configured state, and responsive reachability.
- Approved references: `qwen-native-provider-setup-ui-spec.md`, `REQ-005`, `REQ-006`, `REQ-008`, `REQ-010`–`REQ-012`, and `AC-007`, `AC-008`, `AC-011`–`AC-014`.
- Existing design system / adjacent surfaces reviewed: `ProviderAPIKeyManager`, `ProviderModelBrowser`, generic key editor, Gemini setup form, existing Tailwind/card/badge/notification language, and localization structure.
- Rendered surface used: repository Nuxt dev renderer at `/settings` with the locally built server schema/catalog/status and Chrome via Playwright.
- States and interactions inspected: 1440x1000 desktop and 390x844 narrow viewport; server-supplied default endpoint badge; masked key and keyboard-focusable visibility control; invalid absolute URL message and disabled save; duplicate-submit disabled state; previous-restored message with inputs preserved; repair-required message without prior-active claim; successful configured badge with key cleared and effective URL retained; post-commit provider-settings rejection with the key still cleared, configured status retained, no save-error panel, amber warning, and visible Reload Models retry; actual top-level retry issuing both GraphQL refreshes, restoring the configured Qwen provider row and model, and showing success; zero horizontal overflow; narrow layout stacked with the form reachable by vertical scroll.
- Visual/interaction fixes made during inspection: added blur-triggered inline validation, changed the visibility icon to statically discoverable icon classes, stacked the provider browser/narrowed manager padding for small screens, and added an amber warning treatment for the separate post-commit refresh failure.
- Supporting evidence: `/tmp/qwen-settings-selected.png`, `/tmp/qwen-settings-repair.png`, `/tmp/qwen-settings-success.png`, `/tmp/qwen-settings-mobile-form.png`, `/tmp/qwen-settings-postcommit-refresh-warning-ir006.png`, and `/tmp/qwen-settings-refresh-retry-recovered.png` from the local implementation sessions. These temporary screenshots support self-validation only and are not durable API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Exact resolver: advertised-over-fallback precedence, duplicate exact candidates with independent lowest-valid fields/provenance, case/suffix near matches unknown, and no endpoint URL influence.
- Catalog/runtime: exact Qwen values and identifier uniqueness; preview absent; default versus configured Qwen client construction; configured call uses the Qwen secret and saved URL.
- Strict AppConfig: existing mode/line endings, exclusive sibling temp, full write/fsync/rename, pre-rename cleanup, no runtime mutation on failure, and sensitive/pre-initialize guards.
- Pair command: probe failure and key-write failure leave URL untouched; prior-key restoration; no-prior-key removal; repair-required double failure; no causes/secrets/raw payloads in GraphQL/logs.
- Setup projection/UI: explicitly configured default-equal URL remains `CONFIGURED`; query and successful mutation are identical projections; only approved failure codes receive specialized UI claims; a rejected post-commit provider-data refresh must preserve successful form reset and show only the retry warning; both visible Reload Models paths must reissue provider settings plus catalog refresh before reporting recovery success.
- Coverage inventory: review historical preview-string integration/E2E fixtures rather than treating prior SR-009 execution evidence as current.

## API / E2E / Executable Coverage Investigation And Execution Still Required

`api_e2e_engineer` must first produce the mandatory coverage investigation artifact against this current implementation. API/E2E, broader executable checks, and independent browser/system evidence have not been signed off here. Any repository-resident durable coverage added, updated, or removed downstream must return through `code_reviewer` before delivery.
