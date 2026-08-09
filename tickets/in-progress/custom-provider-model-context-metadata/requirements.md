# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — `ARCH-REV-009` passed the prior SR-015 crash-perfect readable-ID design, but that decision is superseded by the user's later simplification. The current SR-016 target derives readable selector mappings, resets legacy custom-provider records to empty V3, never transfers credential values, and lets the user recreate providers through the existing frontend flow. It removes the reconnect extension and journal/backup/receipt/immediate-runner-recovery protocol. Fresh architecture review is required before implementation continues.

## Goal / Problem Statement

Custom OpenAI-compatible providers can return model identifiers without context-window metadata. AutoByteus therefore cannot derive a safe token budget or automatic compaction threshold. When an exact model value already exists in the built-in catalog, the custom model should reuse that metadata as an explicitly inferred fallback; otherwise its context stays unknown.

Alibaba/Qwen must be a useful native provider rather than forcing Token Plan or regional users through a custom provider. Settings must accept the Qwen Base URL and matching API key, and native Qwen must expose exact values `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2` with Alibaba-route metadata.

Custom identity must also be understandable. New provider IDs derive from the unique user-entered name; custom model identity remains provider plus exact model value. For legacy UUID providers, use the stored name only to map exact structured selections to the future readable ID, then publish empty V3 and let the user recreate the provider through the existing frontend form. Do not preserve or transfer legacy provider records, Base URLs, or secret values.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Custom discovery calls `GET {baseUrl}/models`; recognized optional context/input/output fields already reach the model. | Keep recognized advertised metadata as the highest-priority source. | URL/key validation, ID parsing, duplicate handling, timeout behavior, and last-known-good behavior remain. | REQ-001, REQ-008; AC-001, AC-002 |
| BEH-002 | The branch contains hardcoded Alibaba endpoint profiles and a provider-wire alias before exact built-in fallback. | Remove endpoint/region/plan/profile/alias policy. After advertised metadata, match only exact `SupportedModelDefinition.value`; otherwise return unknown. | No fuzzy, family, suffix, substring, display-name, case-folding, or nearest match. | REQ-002, REQ-003; AC-003, AC-004 |
| BEH-003 | Resolved limits flow through catalog, token budget, compaction, and token meter. | Preserve that path with `live`, `inferred_builtin`, `static_definition`, or `unknown`. | Budget policy, output reservation, user override, safety margin, and known/unknown UI remain. | REQ-004, REQ-009; AC-005, AC-006 |
| BEH-004 | Native Qwen hardcodes the Singapore pay-as-you-go URL; Settings saves only a key. | Qwen Settings saves a user-supplied Base URL and matching key after probe. The key commits first; strict URL persistence commits second; URL failure restores/removes the new key. | Qwen secret remains `provider.qwen.api-key`. | REQ-005, REQ-006, REQ-011; AC-007, AC-008, AC-012, AC-013 |
| BEH-005 | Native Qwen lacks `deepseek-v4-flash-0731`; prior custom logic contains `qwen3.8-max-preview`. | Remove preview behavior and expose exact native Qwen values `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`. | Direct DeepSeek/GLM ownership remains separate; exact wire values do not change. | REQ-007; AC-009, AC-010 |
| BEH-006 | Existing Qwen users can have a key but no saved URL; effective URL alone cannot prove whether the default was explicitly configured. | A Qwen-only status returns `effectiveBaseUrl`, `endpointSource: DEFAULT or CONFIGURED`, and `apiKeyConfigured`. | Existing key-only installs continue on the historical default until a URL is saved. | REQ-006, REQ-010, REQ-012; AC-011, AC-014 |
| BEH-007 | Custom creation generates `provider_<UUID>` despite a meaningful frontend name; the name check is outside the store commit. Legacy selectors embed that UUID. One application editor clears a temporarily unavailable selector. | Derive immutable readable IDs and enforce uniqueness atomically. During upgrade, derive exact old-to-future selector prefixes from valid legacy names, rewrite allowlisted structured selections, and publish empty V3 last. Do not preserve legacy provider records/Base URLs or any credential value. The user recreates the provider with the existing frontend form; missing selectors remain visible without fallback or silent clearing until recreation/reselection. | Browser still supplies no ID; model-value suffixes, history/traces/token identity, ordinary runner retry semantics, the existing custom-create UI/API, and V3-only runtime remain. No credential state, reconnect branch, UUID alias, or generalized recovery framework. | REQ-013–REQ-015; AC-015–AC-019 |

## Investigation Findings

- Alibaba's observed `/models` and completion responses include model IDs/usage but no context limit; exact built-in fallback is the only generic safe inference.
- Qwen endpoint URLs vary by region/plan/user configuration; one compiled URL cannot represent Token Plan.
- `modelIdentifierOverride` already prevents global collisions for Qwen-served DeepSeek/GLM values without changing API model values.
- `AppConfig.set` can report session-only success after file failure. Native Qwen therefore needs one strict durable setter plus command-local secret compensation.
- Custom models already compose `openai-compatible:<providerId>:<exact-model-value>`; only the provider component needs improvement.
- The store currently creates UUIDs; the service accepts `{name,baseUrl,apiKey}` and does a non-atomic name precheck. Store-local derivation/uniqueness closes the race without a new field.
- Legacy names are deterministic enough to derive future readable selector prefixes. The user accepts discarding legacy provider records/Base URLs and recreating providers. V1 inline keys and V2 vault keys must not transfer.
- `saveProviderApiKey` exists end-to-end but rejects non-built-ins, and the custom details card has no key editor. Because the user accepts recreation, extending that path would add unnecessary special logic; the existing add-custom-provider flow is the target repair path.
- Missing custom models are already opaque-string failures: definitions/bindings/configs still parse, while `LLMFactory.createLLM` throws `Model with identifier ... not found`; inactive-run commands surface `ACTIVATION_FAILED`. No silent fallback exists.
- Agent/team definition forms and channel bindings retain raw missing selectors. Team application setup blocks on unavailable models. `ApplicationAgentLaunchProfileEditor` alone clears a non-catalog selector on initial load and must be corrected to retain-and-block.
- `TokenUsageProviderNameSnapshotBackfillMigration` consumes the old UUID-to-name map. It must finish before V3 publication. Three existing migrations write selector files and must finish before the readable migration, which remains final.
- The ordinary runner continues after failed/recent-running definitions and retries a stale `RUNNING` after 15 minutes. The user accepts that limitation; no special timestamp bypass, receipt, or immediate crash recovery remains.

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Status |
| --- | --- | --- | --- |
| `qwen-native-provider-setup-ui-spec.md` | Qwen Base URL + key journey and durable/default states. | REQ-005, REQ-006, REQ-008, REQ-010–REQ-012; AC-007, AC-008, AC-011–AC-014 | Approved/refined through SR-011 |
| `custom-provider-readable-id-migration-spec.md` | Name-derived identity, legacy-provider reset, exact selectors/order, optimistic execution, provider-absent interval, and existing recreation flow. | REQ-013–REQ-015; AC-015–AC-019 | Replaced for SR-016; pending fresh architecture review |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change / Refactor`
- Initial design issue signal: `Yes`
- Root cause: `Boundary Or Ownership Issue`, `Missing Invariant`, `Unnecessary Coordination`
- Refactor posture: `Needed`
- Evidence: endpoint profiles own native Qwen facts in the wrong subsystem; UUID creation ignores the existing name; the prior secret-preserving migration accumulated crash-perfect coordination that the user no longer wants.
- Scope impact: retain Qwen/exact-fallback/readable-ID product behavior; replace secret transfer and crash recovery with exact selector migration, empty-V3 publication, and ordinary frontend recreation. No generalized provider/model attribute is added.

## Recommendations

1. Keep strict advertised-metadata normalization.
2. Resolve custom metadata per field as `advertised > exact built-in value as inferred > null`.
3. Delete endpoint profiles, Alibaba URL matching, region/plan logic, and wire aliases from the custom resolver.
4. Give native Qwen a paired Base URL/key Settings form and server-owned default/configured status.
5. Persist Qwen URL durably and retain bounded key compensation; do not create a generalized transaction owner.
6. Add the four exact Qwen offerings and use existing identifier overrides for third-party duplicates.
7. Derive every new custom ID from normalized `name`; keep `openai-compatible:<providerId>:<exact-value>`.
8. Use valid legacy names only to derive future readable selector prefixes; rewrite exact active/default/resumable selectors, then publish empty V3 last.
9. Never resolve/copy/re-encrypt a legacy custom-provider key. Remove V1 inline secrets by secretless staging; clean old vault entries best-effort after V3.
10. Keep the existing add-custom-provider flow unchanged. After reset, the user re-enters name, Base URL, and key there; do not add an existing-provider reconnect branch or credential-state attribute.
11. Keep unavailable selectors stored and visible; never silently substitute another model. Correct the application-agent setup exception.
12. Keep only the fixed prerequisite guard, final registry position, V3-last ordering, ordinary retry, and one terminal-status startup gate. Remove journal, backups, receipt, runner bypass, and crash matrix.

No producer, offering, deployment, route, region, plan, alias, credential-state, or serving-override attribute is required.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large` — Qwen and metadata changes are bounded, but readable identity touches provider persistence, existing startup migrations, several active/resumable selector owners, frontend recreation, and missing-model UX. The reset design is materially smaller than SR-015 because it removes secret transfer, reconnect specialization, and crash-perfect recovery.

## In-Scope Use Cases

- UC-001: Advertised custom context is used.
- UC-002: Missing advertised context uses an exact built-in model value.
- UC-003: Unknown/near-match custom model remains unknown.
- UC-004: User saves a Qwen Base URL/key pair and Qwen calls use it.
- UC-005: User selects any of the four exact Qwen offerings.
- UC-006: Existing key-only Qwen install continues on the default route.
- UC-007: User creates `Alibaba Cloud Token Plan` and receives `provider_alibaba_cloud_token_plan`.
- UC-008: Legacy UUID records are removed while exact structured selectors move to future readable IDs; the user recreates a provider through the existing frontend and resumes use when the same name-derived ID and exact model are advertised.

## Out Of Scope

- Automatic/fuzzy model-family mapping.
- Custom endpoint/region/plan profiles or URL-derived metadata.
- General producer/offering/deployment schema.
- Provider rename, Base-URL edit, or existing-provider reconnect UX.
- Custom secret preservation, copy, re-encryption, or old-secret alias.
- Runtime UUID aliases, dual V2/V3 readers, or `{providerId,value}` registry refactor.
- General migration transaction/dependency/recovery/reset framework.
- Immediate post-crash convergence.
- Rewriting traces, token identifiers/accounting, arbitrary text, or model-free history indexes.

## Functional Requirements

- **REQ-001 — Preserve advertised metadata:** Recognized positive provider-advertised limits remain authoritative per field.
- **REQ-002 — Use exact built-in fallback only:** When advertised data is absent, index built-in definitions by exact case-sensitive `value`; choose the lowest valid duplicate value per field and mark it inferred.
- **REQ-003 — Keep unknown values unknown:** Differently suffixed/cased/family-related/unknown values resolve `null`; Base URL does not affect fallback.
- **REQ-004 — Preserve runtime propagation:** Resolved limits/source continue through model, GraphQL/catalog, token budget, compaction, and token meter.
- **REQ-005 — Configure native Qwen endpoint:** Settings accepts required absolute HTTP(S) Base URL plus write-only key and probes the pair before mutation.
- **REQ-006 — Use effective Qwen endpoint:** New Qwen runtime instances resolve saved `QWEN_BASE_URL`, falling back only when absent.
- **REQ-007 — Provide exact Qwen catalog:** Native Qwen owns exact values `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`; preview is absent; third-party duplicates use stable Qwen-prefixed identifiers while wire values remain exact.
- **REQ-008 — Preserve security/resilience:** Secrets/raw responses never enter provider records, non-secret config, GraphQL, logs, or durable fixtures. Probe failure does not replace a working Qwen pair or create a custom provider with a bad key.
- **REQ-009 — Simplify source truth:** Remove `endpoint_profile`; remaining meanings are `live`, `inferred_builtin`, `static_definition`, and `unknown`.
- **REQ-010 — Preserve existing Qwen key-only state:** Existing Qwen key is directly usable; absent URL means historical default and needs no data migration.
- **REQ-011 — Commit Qwen pair durably:** Save key after retaining prior `SecretValue`, then atomically/fsync durably replace `.env` before runtime mutation. URL failure restores/removes key; compensation failure returns repair-required; success requires both commits.
- **REQ-012 — Project Qwen endpoint source:** Qwen-only status exposes exactly `effectiveBaseUrl`, `endpointSource`, and `apiKeyConfigured`; browser does not infer source from URL equality.
- **REQ-013 — Derive readable custom identity:** Browser still submits only name/Base URL/key. Backend derives ASCII-safe `provider_<name-slug>`, uses deterministic non-ASCII code-point tokens, rejects empty/colliding derivation with no suffix, and keeps ID immutable. Store commit atomically owns canonical-name/ID uniqueness.
- **REQ-014 — Perform the secretless reset-and-selector transition:** For valid uniquely derivable legacy names, rewrite exact allowlisted active/default/resumable selector prefixes to the future readable provider ID with byte-identical model suffixes, then atomically publish empty V3 last. Do not preserve legacy provider records or Base URLs. V1 inline secrets are omitted rather than vaulted; V2 secrets are never resolved/copied; old UUID vault entries are deleted only best-effort after V3. Malformed/non-derivable/colliding legacy data also publishes empty V3 with warnings, without selector mapping. Individual unreadable/read-only/changed selector targets are skipped with warnings and remain stale. No journal, backups, receipt, special runner API, runtime alias, credential state, or historical rewrite is added.
- **REQ-015 — Order, gate, recreate, and preserve unavailable selections:** Readable identity is final and requires terminal status for the five exact prerequisite migrations. Token provider-name snapshot uses a migration-only missing/V2/V3 `{id,name}` reader. After `runPending`, startup accepts readable `SUCCEEDED | SUCCEEDED_WITH_WARNINGS` and blocks otherwise. No migrated provider or credential-state record is listed: the user uses the unchanged add-custom-provider form to re-enter name, Base URL, and key. Reusing the same canonical name recreates the same readable ID. Missing selectors stay stored/visible, never fall back, and launches/resumes fail until recreation/reselection; application-agent setup must not clear them on initial load.

## Acceptance Criteria

- **AC-001:** Existing advertised metadata field-alias/type/fall-through/duplicate tests remain green.
- **AC-002:** Advertised context wins over a different exact built-in value.
- **AC-003:** Exact `deepseek-v4-pro`, `deepseek-v4-flash-0731`, or `glm-5.2` may infer built-in limits; unknown and near-match values stay `null`.
- **AC-004:** Custom metadata code/tests contain no endpoint profiles, Alibaba URL, region/plan matching, canonical endpoint, or alias reference.
- **AC-005:** Known capacity yields token budget/compaction; unknown capacity remains null without explicit override.
- **AC-006:** Token meter keeps known percentage and unknown “context limit unavailable” behavior.
- **AC-007:** Qwen Settings validates Base URL/key, prevents duplicate submission, and shows actionable errors.
- **AC-008:** Successful Qwen save routes all four required exact values through the saved URL/key.
- **AC-009:** Native Qwen contains the four exact values and no `qwen3.8-max-preview`.
- **AC-010:** Qwen third-party entries have stable Qwen-prefixed identifiers and unchanged exact wire values.
- **AC-011:** Existing Qwen key with no URL continues on `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`.
- **AC-012:** Qwen probe/key-write failure leaves prior pair unchanged and exposes no sensitive data.
- **AC-013:** Strict URL failure restores/removes key and returns previous-restored; forced compensation failure returns repair-required; neither returns success.
- **AC-014:** Qwen query/UI distinguishes default from explicitly configured equal URL by server source.
- **AC-015:** `Alibaba Cloud Token Plan` becomes `provider_alibaba_cloud_token_plan`; exact custom model identity and API wire value are correct.
- **AC-016:** Codec/store tests prove deterministic normalization, non-ASCII tokens, empty/collision rejection, no suffix, and one winner for concurrent duplicate creates.
- **AC-017:** Valid V1 and V2 fixtures derive mappings from legacy names, rewrite every exact managed selector with unchanged model suffixes, and publish an empty V3 provider list; no legacy provider/Base URL or secret value is preserved, no old secret is resolved/copied, and no new readable secret exists. V1 inline key is absent after staging; old UUID cleanup begins only after V3.
- **AC-018:** Provider-publication failure blocks startup. Pre-V3 interruption converges only through the ordinary stale-run retry and idempotent exact rewrites; post-V3 interruption may wait for that same ordinary retry. Cleanup failure returns warnings while V3 remains usable and no old-secret fallback exists. No journal/backup/receipt/runner-bypass file or API exists.
- **AC-019:** A direct multi-version fixture proves the five prerequisites finish before empty-V3 publication, the old UUID token identifier remains unchanged while missing `provider_name` can be filled, and current selector writers' changes survive. Recreation tests prove the existing form rejects a bad pair without a record/secret, accepts a valid same-name pair with the expected readable ID, reloads models, and makes migrated defaults/bindings/application/resume selectors usable again without silent fallback; a different name or unavailable suffix requires manual reselection.

## Constraints / Dependencies

- One active native Qwen endpoint per installation.
- Provider values may duplicate, but global identifiers cannot.
- Readable custom IDs retain `provider_`, exclude `:`, and fit current secret-ID grammar.
- Normal provider store/runtime are V3-only; legacy parsing stays in app-data migration files.
- Exact prerequisite IDs are `20260727_custom_provider_v1_secret_migration`, `20260706_remove_global_skill_discovery_mode`, `20260517_team_run_metadata_member_tree`, `20260730_token_usage_provider_name_snapshot_backfill`, and `20260623_remove_self_evolution_run_metadata`.
- The historical V1 migration ID remains for installed record compatibility even though its new direct-upgrade behavior no longer migrates secrets.
- `SUCCEEDED_WITH_WARNINGS` is terminal for prerequisites and for the readable startup gate, matching ordinary runner behavior.
- Delivery owns refresh against the current tracked base.

## Persisted Data Outcome

- Qwen key/optional URL: `Directly Usable — No Migration`.
- Valid legacy provider records/Base URLs: `Discard / Recreate` as empty V3; names are used transiently only for selector mapping.
- Exact structured current/default/resumable selectors: `Migration Required` to future readable prefixes.
- Invalid/ambiguous legacy provider data: `Reset / Recreate` to empty V3.
- Historical traces/token identities/accounting and model-free indexes: `Directly Usable — No Rewrite`.

## Risks / Open Questions

- Vendor model documentation remains time-sensitive; source-dated static facts require maintenance.
- Deterministic slugs can collide; new creation rejects, while ambiguous legacy data resets rather than inventing a suffix.
- Skipped read-only/malformed selector targets remain stale by design. Generic missing-model behavior must keep them visible/actionable.
- Process death can leave runner `RUNNING` for its normal 15-minute window. The user explicitly accepts no immediate recovery; startup may remain blocked until ordinary retry.
- Old vault entries can remain orphaned after cleanup failure/crash. They are not reachable through V3/runtime and no compatibility lookup is allowed.
- Recreation restores a migrated selector only when the user enters the same canonical provider name and the endpoint still advertises the exact model suffix; otherwise manual reselection is required.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 | UC-007 | UC-008 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | X |  | X |  |  |  |  |  |
| REQ-002 |  | X | X |  | X |  |  |  |
| REQ-003 |  | X | X |  |  |  |  |  |
| REQ-004 | X | X | X |  | X |  | X | X |
| REQ-005 |  |  |  | X |  |  |  |  |
| REQ-006 |  |  |  | X | X | X |  |  |
| REQ-007 |  | X |  |  | X |  |  |  |
| REQ-008 | X |  | X | X |  | X | X | X |
| REQ-009 | X | X | X |  | X |  | X | X |
| REQ-010 |  |  |  |  |  | X |  |  |
| REQ-011 |  |  |  | X |  | X |  |  |
| REQ-012 |  |  |  | X |  | X |  |  |
| REQ-013 |  |  |  |  |  |  | X | X |
| REQ-014 |  |  |  |  |  |  |  | X |
| REQ-015 |  |  |  |  |  |  |  | X |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001–AC-004 | Custom discovery/resolution and profile/alias removal |
| AC-005–AC-006 | Runtime compaction and known/unknown meter behavior |
| AC-007–AC-014 | Qwen Settings/runtime durability/default state/catalog identity |
| AC-015–AC-016 | Readable identity and atomic uniqueness |
| AC-017–AC-019 | Secretless provider reset plus selector transition, ordinary-failure/retry, ordering, recreation, and missing-selector behavior |

## Approval Status

- User-approved product scope: exact-only custom fallback, configurable native Qwen, exact Qwen model list, name-derived custom ID, and the SR-016 simplification that preserves exact structured selections but resets legacy providers/credentials for frontend recreation.
- Architecture: `ARCH-REV-009` is historical evidence for the superseded secret-preserving design. SR-016 requires a new architecture decision before implementation.
- All implementation/code/API-E2E/delivery evidence predating the SR-016 decision is superseded for readable identity and must be repeated after a pass.
