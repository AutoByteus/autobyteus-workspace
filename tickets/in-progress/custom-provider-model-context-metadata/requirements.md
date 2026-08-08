# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — the user approved the simplified custom-provider policy, native Qwen endpoint configuration, and the required initial Qwen-served model values through the conversation culminating on 2026-08-06. `SR-011` resolves the two blocking `ARCH-REV-004` findings by defining a restart-durable Qwen pair save with all-or-old handling for each individual write failure, a truthful repair-required result for the bounded compensation double-failure, and a minimal Qwen-specific configured/default status projection. Architecture re-review is required before implementation rework.

## Goal / Problem Statement

Custom OpenAI-compatible providers can return model identifiers without context-window metadata. AutoByteus therefore cannot derive a safe token budget or automatic compaction threshold. When the exact model value is already known by an internal provider, the custom model should reuse that internal metadata as an explicitly inferred fallback; otherwise its context must remain unknown.

Alibaba/Qwen must also be a usable native provider rather than requiring users to create a custom provider for Token Plan or regional endpoints. A user must be able to configure the Qwen Base URL and matching API key in Settings, and the native Qwen catalog must include the current exact model values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2` with Alibaba-route context metadata.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Custom discovery calls `GET {baseUrl}/models`; the branch already normalizes recognized optional context/input/output fields. | Preserve recognized provider-advertised metadata as the highest-priority source. | Existing URL validation, credential handling, ID extraction, duplicate handling, timeout behavior, and last-known-good model preservation remain unchanged. | REQ-001, REQ-008; AC-001, AC-002 |
| BEH-002 | The branch currently applies hardcoded Alibaba endpoint/model profiles and an endpoint-scoped DeepSeek alias before exact built-in fallback. | Remove all endpoint profiles, URL/region/plan matching, and alias references. After advertised metadata, resolve only by exact `SupportedModelDefinition.value`; if no exact value exists, resolve `null`. | No fuzzy, substring, family, display-name, suffix-stripping, case-folding, or nearest-model matching. | REQ-002, REQ-003; AC-003, AC-004 |
| BEH-003 | Resolved custom model limits flow through `LLMModel`, model catalog projection, token-budget calculation, compaction, and the token meter. | Preserve this path with the simpler source set: `live`, `inferred_builtin`, `static_definition`, or `unknown`. | Compaction policy, output reservation, safety margin, user overrides, and the known/unknown token-meter behavior remain unchanged. | REQ-004, REQ-009; AC-005, AC-006 |
| BEH-004 | Native `QwenLLM` always calls the hardcoded Singapore pay-as-you-go URL `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`; Settings can save only a Qwen API key. | Qwen Settings accepts a user-supplied OpenAI-compatible Base URL and matching API key. The server probes first, commits the new key, then durably commits the URL; a durable-URL failure restores the previous key before returning failure. `QwenLLM` uses the configured URL for every newly constructed Qwen-owned runtime. | Existing secret-vault ownership for `provider.qwen.api-key` remains unchanged. | REQ-005, REQ-006, REQ-011; AC-007, AC-008, AC-012, AC-013 |
| BEH-005 | Native Qwen exposes `qwen3.7-max` and `qwen3-max`; the branch has a custom-provider-only `qwen3.8-max-preview` profile. DeepSeek and GLM models are owned only by their direct providers. | Remove the preview profile and add native Qwen offerings with exact wire values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`. The two third-party values remain model values served through Qwen/Alibaba, not producer aliases. | Existing direct DeepSeek and GLM definitions remain valid. Existing identifiers must remain unambiguous even when provider values duplicate. | REQ-007; AC-009, AC-010 |
| BEH-006 | Existing Qwen installations may already have a saved API key but no saved Base URL because the URL was compiled into `QwenLLM`. Effective URL plus `apiKeyConfigured` alone cannot distinguish this default state from an explicitly configured URL equal to the default. | Such installations continue using the current pay-as-you-go URL until the user saves a Qwen Base URL. A Qwen-specific server projection reports the effective URL and whether its source is `DEFAULT` or `CONFIGURED`, so the UI does not infer or duplicate endpoint policy. | No secret migration or provider-record migration is required. | REQ-006, REQ-010, REQ-012; AC-011, AC-014 |

## Investigation Findings

- The observed Alibaba `/models` response returned model identifiers but no context, input, or output limits. A successful completion response returned usage counts but no model-limit metadata.
- The branch implementation already carries recognized advertised metadata and resolved per-field source through `LLMModel`, server catalog enrichment, GraphQL, runtime token budgeting, and the explicit unknown-capacity UI state.
- The branch implementation also contains the now-rejected `OPENAI_COMPATIBLE_ENDPOINT_MODEL_PROFILES`, canonical endpoint matching, and the `deepseek-v4-flash-0731` reference. Those are the primary removal targets.
- `QwenLLM` currently hardcodes one Singapore pay-as-you-go URL. Alibaba documents that Base URLs vary by region/workspace and that subscription-plan credentials must be used with their corresponding endpoint.
- `LlmProviderRecord` and GraphQL `LlmProviderObject` already expose `baseUrl`; `LLMModel` already exposes `hostUrl`; therefore no new general provider or model relationship schema is needed.
- `AppConfig.set` currently mutates process/config memory first and swallows `.env` write failures as session-only success. A Qwen pair command using it after replacing the key can therefore report success but restart with an old/default URL plus the new key. A strict durable setting operation must write an atomic same-directory replacement before changing runtime state and must surface failure.
- The secret service can read the previous Qwen `SecretValue`, replace it, and restore it (or remove the newly created secret when no previous key existed). This supports narrow compensation without exposing plaintext or adding a generalized transaction manager.
- The approved Settings UX requires the effective historical default to be distinguishable from a configured endpoint. This state belongs in a Qwen-specific status projection rather than in generalized provider/model fields.
- Built-in API model identifiers are globally keyed by `LLMModel.modelIdentifier`. Native Qwen definitions for `deepseek-v4-pro` and `glm-5.2` must use the existing `modelIdentifierOverride` so they do not collide with the direct-provider definitions while their exact `value` remains unchanged.
- Current official Alibaba Model Studio tables list `deepseek-v4-pro` at 1M context and `glm-5.2` at 198k context for the Alibaba route. The current public material for the newly non-preview `qwen3.8-max` ID is still catching up; the user explicitly requires the production value and the preceding QwenCloud model line documented 1M context. The design uses 1M for the production replacement and requires source-dated provenance.
- See `investigation-notes.md` for exact source paths, runtime evidence, URLs, commands, and the current branch/worktree state.

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Approval |
| --- | --- | --- | --- |
| `qwen-native-provider-setup-ui-spec.md` | Defines the Base URL + API key Settings journey and observable states. | REQ-005, REQ-006, REQ-008, REQ-010–REQ-012; AC-007, AC-008, AC-011–AC-014 | Approved by the user's explicit endpoint/key configuration direction culminating 2026-08-06; aligned with the architecture-required failure/default projections by SR-011. |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change / Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` plus `Duplicated Policy Or Coordination`
- Refactor posture: `Needed`
- Evidence basis: Custom-provider endpoint profiles encode Alibaba routing facts in the wrong owner and duplicate native-provider model knowledge. Qwen runtime endpoint ownership is also hidden in one constructor literal rather than in provider configuration.
- Requirement or scope impact: Move Alibaba route selection and curated model facts into native Qwen configuration/definitions; reduce custom metadata resolution to generic advertised fields plus exact internal value fallback.

## Recommendations

1. Keep custom discovery's strict advertised-metadata normalization.
2. Replace custom endpoint profile resolution with one exact built-in value index: `advertised > exact built-in value as inferred > null` per field.
3. Delete canonical endpoint/profile matching, all Alibaba endpoint literals in the custom resolver, and every explicit wire-alias mapping.
4. Add a dedicated Qwen Settings form that saves Base URL and API key together after validating the pair against `GET {baseUrl}/models`.
5. Keep the existing key in the secret vault; persist only the non-secret Qwen Base URL as `QWEN_BASE_URL` through a strict AppConfig durable-write operation. Save the key first only after retaining the previous secret; if the URL write fails, restore/remove the key before returning failure.
6. Make `QwenLLM` resolve the effective endpoint at construction time from `QWEN_BASE_URL`, falling back to the current pay-as-you-go URL only when no URL was saved.
7. Add Qwen-owned definitions for the three exact required values. Use existing `modelIdentifierOverride` for the two values already owned by direct providers.
8. Expose one Qwen-specific setup status with `effectiveBaseUrl`, `endpointSource: DEFAULT | CONFIGURED`, and `apiKeyConfigured`; do not expand the general provider/model schema.

No first-class model offering, producer, deployment, route, plan, region, alias, or serving-override attributes are required.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the custom resolver becomes smaller, while native Qwen configuration crosses core runtime, server configuration/GraphQL, and Settings UI boundaries.

## In-Scope Use Cases

- UC-001: A custom endpoint advertises recognized model limits; those values reach runtime and take precedence.
- UC-002: A custom endpoint omits limits but returns an exact built-in model value; exact built-in static metadata supplies an inferred fallback.
- UC-003: A custom endpoint returns an unknown or differently suffixed value; limits remain unknown and the UI says the context limit is unavailable.
- UC-004: A user configures native Qwen with a Base URL and matching API key copied from Alibaba; subsequent Qwen calls use that URL.
- UC-005: The user selects native Qwen offerings for `qwen3.8-max`, `deepseek-v4-pro`, or `glm-5.2`; their exact wire values and curated Alibaba-route context metadata are used.
- UC-006: An existing Qwen user with only a stored API key continues using the prior default pay-as-you-go endpoint.

## Out of Scope

- Endpoint, region, workspace, plan, hostname, or path profiles in custom-provider metadata resolution.
- Explicit or automatic model aliases, including dated/version suffix stripping.
- Fuzzy, family, display-name, case-insensitive, or nearest-model fallback.
- Discovering arbitrary new native Qwen models from `/models`; the native catalog remains code-curated.
- Supporting multiple simultaneous Qwen connections/endpoints in one installation.
- User-editable per-model context limits.
- Pricing, tokenizer, modality, or capability inference for the newly added Qwen offerings.
- A general provider-offering/producer/deployment data model or new custom-provider persistence attributes.
- Changing compaction algorithms or user override behavior.

## Functional Requirements

- **REQ-001 — Preserve advertised metadata:** Custom `/models` normalization must continue accepting only the existing fixed top-level aliases whose values are positive finite JSON integers. Invalid optional fields must not reject a valid model row.
- **REQ-002 — Exact built-in fallback only:** For each missing numeric field, custom metadata resolution must consult a separate index keyed only by exact non-empty `SupportedModelDefinition.value`. Multiple exact candidates select the lowest valid positive value independently per field and preserve the selected candidate's provider/value/provenance.
- **REQ-003 — Remove endpoint and alias policy:** The custom resolver must not receive or inspect endpoint URLs for metadata purposes and must contain no endpoint profile, region/plan table, canonical endpoint identity, or provider-wire alias/reference.
- **REQ-004 — Preserve metadata flow:** Custom resolved fields and per-field source must be present before runtime construction and must remain intact through `ModelInfo`, server enrichment, GraphQL coarse provenance, token-budget calculation, compaction, and token usage projection.
- **REQ-005 — Configure Qwen endpoint and key:** Settings must expose one Qwen Base URL input and one API-key input. Saving requires non-empty values, normalizes the URL with the existing OpenAI-compatible URL normalizer, probes `GET {baseUrl}/models` with the submitted key, and invokes one server-owned durable pair command only after the probe succeeds.
- **REQ-006 — Resolve native Qwen endpoint:** `QwenLLM` must use the saved `QWEN_BASE_URL` for all Qwen-owned models. When absent, it must use `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. The API key continues to resolve through `provider.qwen.api-key`.
- **REQ-007 — Provide the required Qwen model values:** Add native Qwen definitions whose exact `value` fields are `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`. Use source-dated Alibaba-route static context values of 1,000,000; 1,000,000; and 198,000 respectively. Leave input/output fields `null` unless an unambiguous Alibaba-route source is recorded. Use existing unique identifier support for duplicate cross-provider values.
- **REQ-008 — Preserve resilience and security:** No API key, authorization header, or raw provider payload may enter GraphQL responses, logs, durable fixtures, provider records, or non-secret app config. Probe failure must not replace a previously working Qwen URL/key pair.
- **REQ-009 — Simplify source truth:** Remove `endpoint_profile` from the internal source union. The remaining meanings are `live`, `inferred_builtin`, `static_definition`, and `unknown`. Existing coarse GraphQL provenance continues mapping live provider data to `LIVE` and inferred/static values to the applicable curated classification.
- **REQ-010 — Preserve existing Qwen configuration:** Existing `provider.qwen.api-key` secrets remain directly usable. No database or app-data migration is introduced; absent `QWEN_BASE_URL` selects the prior default endpoint.
- **REQ-011 — Commit the Qwen pair durably:** The server command must snapshot the previous Qwen secret without serializing it, save the new key, then call an AppConfig strict durable setter that atomically replaces the `.env` file before updating `configData`/`process.env` and throws on failure. If the URL commit fails, the command must restore the previous secret or remove the newly created secret before returning a sanitized failure. A successful mutation is allowed only after both new values are committed. If compensation itself fails, return a distinct repair-required error and never claim the previous pair was restored.
- **REQ-012 — Project configured versus default state:** A Qwen-specific setup status must expose only `effectiveBaseUrl`, `endpointSource` (`DEFAULT` when `QWEN_BASE_URL` is absent, otherwise `CONFIGURED`), and `apiKeyConfigured`. Query and successful mutation results use this same server-owned projection. The browser must not compare URLs or embed the default URL to infer this state.

## Acceptance Criteria

- **AC-001:** Existing advertised metadata alias/type/fall-through and duplicate-row tests remain green.
- **AC-002:** A custom discovered row with advertised context uses that value even when an exact built-in value differs.
- **AC-003:** A custom `deepseek-v4-pro` or `glm-5.2` row with no advertised context resolves by exact built-in value; an unknown value and a suffixed near-match remain `null`.
- **AC-004:** The custom metadata implementation and tests contain no endpoint-profile table, Alibaba URL, endpoint canonicalization, or alias reference; the resolver result is independent of custom Base URL.
- **AC-005:** Known custom capacity yields the existing non-null token budget and compaction threshold; unknown capacity remains `null` unless an explicit runtime/user override supplies a budget.
- **AC-006:** The token meter preserves percentage rendering for known capacity and “context limit unavailable” with no denominator/percentage for unknown capacity.
- **AC-007:** The Qwen Settings surface shows Base URL and masked API key, validates required/absolute HTTP(S) values, disables duplicate submission, and exposes actionable probe/save errors.
- **AC-008:** A successful Qwen save causes subsequent Qwen chat-completion calls for all three required model values to target the saved Base URL and use the Qwen secret; the compiled Singapore URL is not used when a saved URL exists.
- **AC-009:** The native Qwen catalog contains exact values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`; `qwen3.8-max-preview` is absent from profiles and Qwen definitions.
- **AC-010:** Direct-provider and Qwen-served `deepseek-v4-pro`/`glm-5.2` entries have unique model identifiers while retaining their exact shared wire values and correct provider ownership.
- **AC-011:** With an existing Qwen key and no `QWEN_BASE_URL`, Qwen calls still target `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`; saving a new configuration does not require data migration.
- **AC-012:** A failed Qwen probe or failed new-key write leaves the previously saved Base URL and key usable and unchanged; no credential or raw response is exposed.
- **AC-013:** If strict durable URL persistence fails after the new key is saved, the command restores the previous key (or removes the new key when none existed), returns `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED`, does not update in-memory URL state, and does not return success. A forced compensation failure returns `QWEN_CONFIGURATION_REPAIR_REQUIRED`; the UI presents it as requiring a new successful save and does not claim the old configuration is active.
- **AC-014:** The Qwen setup query distinguishes `{ effectiveBaseUrl: historicalDefault, endpointSource: DEFAULT }` from `{ effectiveBaseUrl: historicalDefault, endpointSource: CONFIGURED }`. The Qwen form labels these states from the server value, not URL comparison, and a successful save returns `CONFIGURED`.

## Constraints / Dependencies

- One active native Qwen endpoint per AutoByteus installation.
- Qwen Base URL is non-secret app configuration; Qwen API key remains secret-vault data.
- The pair command composes two existing persistence owners using strict URL durability plus bounded secret compensation; no generalized cross-store transaction framework is introduced.
- Provider model values may duplicate across built-in providers, but global model identifiers must not collide.
- Vendor model facts are time-sensitive and must retain source URL and verification date.
- Delivery must refresh against the recorded base branch before finalization; the current branch is behind the latest tracked remote and contains prior delivery artifacts.

## Persisted Data Outcome (When Applicable)

- Stored subject: existing Qwen API-key secret and server `.env` configuration.
- Decision: `Directly Usable — No Migration`.
- Existing key semantics remain unchanged. `QWEN_BASE_URL` is a new optional non-secret setting; absence has a defined current-default interpretation.
- No custom-provider schema, database schema, or persisted model-metadata migration is required.

## Assumptions

- The exact production wire ID supplied by the user is `qwen3.8-max`.
- The configured Qwen endpoint is OpenAI-compatible and exposes `/models` for pair validation.
- The user configures the Base URL and API key supplied together by Alibaba for the same endpoint/plan.

## Risks / Open Questions

- Alibaba documentation may lag the production rename from `qwen3.8-max-preview` to `qwen3.8-max`; the code-owned metadata provenance must be deliberately refreshed when the vendor publishes the final production table.
- Alibaba documentation has previously disagreed about GLM-5.2 capacity. The Alibaba text-generation overview's 198k value is used because it is route-specific and conservative; direct GLM metadata remains separately owned.
- AppConfig persists non-secret values in `.env` while the secret vault stores the key. The new strict setter and secret compensation must make normal write failures all-or-old; the distinct repair-required outcome covers the bounded double-failure case without a false success claim.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | X |  | X |  |  |  |
| REQ-002 |  | X | X |  | X |  |
| REQ-003 |  | X | X |  |  |  |
| REQ-004 | X | X | X |  | X |  |
| REQ-005 |  |  |  | X |  |  |
| REQ-006 |  |  |  | X | X | X |
| REQ-007 |  | X |  |  | X |  |
| REQ-008 | X |  | X | X |  | X |
| REQ-009 | X | X | X |  | X |  |
| REQ-010 |  |  |  |  |  | X |
| REQ-011 |  |  |  | X |  | X |
| REQ-012 |  |  |  | X |  | X |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001–AC-004 | Durable unit coverage for generic custom discovery/resolution and complete removal of endpoint/alias behavior. |
| AC-005–AC-006 | Runtime compaction and token-meter known/unknown behavior. |
| AC-007, AC-012 | Qwen Settings form validation, loading, failure, and unchanged-configuration recovery. |
| AC-008, AC-011 | Server/runtime tests proving configured and default endpoint selection. |
| AC-009–AC-010 | Catalog/GraphQL tests proving exact values, static metadata, provider ownership, and unique identifiers. |
| AC-013 | Fault-injection coverage for strict AppConfig failure, old-secret restoration/removal, no false success, and repair-required compensation failure. |
| AC-014 | GraphQL/component coverage for server-owned `DEFAULT` versus `CONFIGURED` endpoint source, including an explicitly configured URL equal to the default. |

## Approval Status

- Requirements status: `Approved / Refined` through the user's explicit simplification and exact model-list directions, including the 2026-08-06 correction from preview to production `qwen3.8-max` and selection of `glm-5.2` plus `deepseek-v4-pro`.
- Supplemental UI/UX specification: approved by the same explicit Base URL + API-key frontend direction.
- Architecture status: `ARCH-REV-004` failed on `ARCH-DESIGN-004` and `ARCH-DESIGN-005`. `SR-011` supplies the durable pair-commit and configured/default projection contracts and is pending architecture re-review.
