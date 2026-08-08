# Design Spec

## Current-State Read

This ticket branch contains a completed but now superseded custom-provider metadata implementation. The supported custom-provider path is:

`Settings -> GraphQL -> LlmProviderService -> saved provider/key -> GET /models -> normalized rows -> custom metadata resolver -> custom LLMModel -> LLMFactory -> server catalog -> runtime/token UI`.

The branch correctly preserves advertised numeric metadata, exact built-in fallback, source-bearing `ModelInfo`, compaction behavior, last-known-good custom models, and the explicit unknown-capacity UI state. It incorrectly places Alibaba-specific endpoint, plan, and alias knowledge inside `openai-compatible-endpoint-model-metadata.ts`.

The native Qwen path is:

`Built-in supported-model definition -> LLMFactory -> QwenLLM -> OpenAI-compatible client`,

but `QwenLLM` hardcodes one Singapore pay-as-you-go Base URL. Settings only writes the existing Qwen key secret. The current code therefore cannot represent the user's Token Plan, workspace, or regional Qwen endpoint through the native provider.

The current data model already has the necessary concepts: provider `baseUrl`, secret consumer `provider.qwen.api-key`, exact model `value`, static metadata/provenance, and `modelIdentifierOverride`. No generalized model-offering schema is missing.

## Intended Change

1. Keep custom endpoint-advertised metadata normalization.
2. Simplify custom metadata resolution to per-field `advertised > exact built-in value as inferred > unknown`.
3. Remove endpoint profiles, URL identity, plan/region matching, and all alias/reference behavior.
4. Add native Qwen configuration for one user-supplied Base URL plus the existing secret API key.
5. Make newly constructed `QwenLLM` clients use the configured URL, with the current URL as the no-setting default.
6. Add Qwen-owned model definitions for exact values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2` with source-dated Alibaba-route context metadata.
7. Reuse `modelIdentifierOverride` for the two duplicated cross-provider values.
8. Preserve existing compaction, catalog, provenance projection, custom-provider persistence, and known/unknown UI behavior.
9. Make the two-owner Qwen pair command restart-durable and all-or-old for each individual write failure by adding one strict atomic AppConfig setter and bounded previous-secret compensation; never return success for a session-only URL change, and surface a bounded compensation double-failure as repair-required.
10. Add a Qwen-specific setup status `{effectiveBaseUrl, endpointSource, apiKeyConfigured}` so the browser can distinguish the historical default from an explicitly configured endpoint without generalized provider/model attributes.

### Minimal representation constraint

The design adds only one required non-secret configuration value, `QWEN_BASE_URL`, and one Qwen-specific save command carrying `{baseUrl, apiKey}`. It reuses every model/provider field already present. It must not add producer, origin provider, inference provider, offering, deployment, route, plan, region, revision, alias, or per-model override attributes.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Intent / IDs | Approved Trigger | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-008; AC-001, AC-002 | User probes/saves/reloads a custom provider | Discovery already normalizes strict optional fields and preserves stale models | Preserve generic discovery and live metadata | DS-003 |
| BEH-002 | System/Contract | REQ-002, REQ-003; AC-003, AC-004 | A discovered field is absent | Current resolver performs profiles/aliases then exact fallback | Delete profiles/aliases; exact `value` fallback only | DS-003, LS-001 |
| BEH-003 | System/User | REQ-004, REQ-009; AC-005, AC-006 | Runtime consumes a resolved model | Canonical fields already drive budget/compaction/UI | Preserve with reduced source union | DS-003, DS-004 |
| BEH-004 | User | REQ-005, REQ-008, REQ-011; AC-007, AC-012, AC-013 | User saves Qwen URL/key in Settings | Qwen currently uses generic key-only form; `AppConfig.set` can report session-only success | Add one probe, key-first, strict durable URL commit with bounded key compensation and truthful errors | DS-001 |
| BEH-005 | System | REQ-006; AC-008, AC-011 | Runtime constructs a Qwen client | Constructor literal always chooses Singapore paygo | Resolve configured URL or historical default | DS-002 |
| BEH-006 | User/System | REQ-007, REQ-012; AC-009, AC-010, AC-014 | Catalog/selection or Qwen Settings requests Qwen state/models | Required values are absent; effective URL + key flag cannot distinguish default from explicitly configured | Add three Qwen definitions and one Qwen-specific configured/default status | DS-001, DS-002, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md` | Qwen Base URL/key journey, states, labels, and error recovery | REQ-005, REQ-006, REQ-008, REQ-010–REQ-012; AC-007, AC-008, AC-011–AC-014 | Defines the frontend/GraphQL observable contract for DS-001 | Refined; user-approved and aligned by SR-011 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change / Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes`
- Evidence: The custom resolver owns a Token Plan URL table and a DeepSeek alias even though endpoint selection and Alibaba-served model support belong to native Qwen. Qwen endpoint ownership is hidden in a constructor literal. `ARCH-REV-004` additionally proved that the initial Qwen save contract could pair a new key with a non-durable/old URL and that effective URL plus key flag could not represent default versus configured state.
- Design response: Delete route-specific custom machinery; make `LlmProviderService` the Qwen configuration command owner; make a small core Qwen endpoint resolver the runtime owner; keep model facts in Qwen `SupportedModelDefinition`s; add one strict atomic AppConfig write and bounded secret compensation; return one Qwen-specific setup status.
- Refactor rationale: Leaving profiles dormant would retain two conflicting sources of Alibaba truth and violate the user's simplification.
- Intentional deferrals / residual risk: Multiple simultaneous Qwen endpoints and dynamic native model discovery remain out of scope. Public documentation for the production Qwen3.8 rename may lag and requires future provenance refresh, not compatibility with the preview value.

## Terminology

- **Qwen connection:** The single effective native Qwen Base URL plus the existing Qwen API-key secret for one installation.
- **Qwen-served model:** A model invoked through the configured Qwen/Alibaba endpoint, including third-party-produced values such as DeepSeek and GLM.
- **Exact built-in fallback:** A custom model lookup keyed only by exact `SupportedModelDefinition.value`, irrespective of which built-in provider owns a matching candidate.
- **Effective Qwen Base URL:** Saved `QWEN_BASE_URL`, or the historical default when the setting is absent.
- **Endpoint source:** `DEFAULT` when `QWEN_BASE_URL` is absent; `CONFIGURED` when any non-empty configured value exists, even when it equals the default string.
- **Strict durable AppConfig write:** A setting write that atomically replaces `.env`, surfaces failure, and updates runtime memory only after persistent replacement succeeds.

## Implementation Contracts Required Before Coding

### Custom metadata contract

```ts
type ResolvedMetadataSource =
  | { kind: 'live' }
  | {
      kind: 'inferred_builtin';
      provider: LLMProvider;
      value: string;
      provenance: StaticModelMetadataProvenance;
    }
  | { kind: 'static_definition'; provenance: StaticModelMetadataProvenance }
  | { kind: 'unknown' };
```

`endpoint_profile` is removed. The custom resolver input contains the discovered row only; Base URL is not part of metadata identity.

For each of `maxContextTokens`, `maxInputTokens`, and `maxOutputTokens`:

```text
valid advertised JSON integer
  ?? lowest valid exact SupportedModelDefinition.value candidate (inferred)
  ?? null/unknown
```

The exact fallback index:

- keys only non-empty `SupportedModelDefinition.value` without case or prefix transformation;
- retains all provider/value candidates;
- selects the lowest valid value independently per numeric field;
- uses deterministic provider/source tie-breaking;
- carries the selected candidate's provider, exact value, source URL, and verification date.

### Qwen configuration contract

```ts
type QwenConfigurationInput = {
  baseUrl: string;
  apiKey: string;
};
```

One authoritative `LlmProviderService.saveQwenConfiguration` command:

1. require and normalize both values;
2. probe the normalized pair through existing `OpenAICompatibleEndpointDiscovery.probeEndpoint`;
3. if probe fails, write nothing;
4. read the old Qwen secret status; when configured, resolve the previous `SecretValue` and retain it only within this command scope;
5. save the new key under the existing Qwen secret consumer;
6. call `AppConfig.setDurably(QWEN_BASE_URL, normalizedBaseUrl)`;
7. when the URL commit succeeds, return the Qwen setup status and discard the previous-secret reference;
8. when the URL commit fails, restore the prior secret with `saveForConsumer`, or remove the newly created secret when no prior secret existed;
9. after successful compensation, throw sanitized code `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED`;
10. if compensation also fails, throw `QWEN_CONFIGURATION_REPAIR_REQUIRED`; never claim rollback or success.

Key-first is deliberate: strict URL failure guarantees the URL remains old, while vault compensation is independent of the failed filesystem path. A probe or new-key failure touches no URL. The command must not return the key, previous key, or raw probe payload. An in-flight Qwen client is not mutated; newly constructed clients use the new URL.

### Strict AppConfig write contract

`autobyteus-server-ts/src/config/app-config.ts` adds one narrow operation; the existing best-effort `set` remains for callers that explicitly accept session-only behavior.

```ts
export type DurableAppConfigWriteResult = { persisted: true };

setDurably(key: string, value: string): DurableAppConfigWriteResult;
```

`setDurably` must:

1. apply the existing forbidden-sensitive-key guard;
2. require an initialized configuration-file path;
3. serialize the updated environment contents with the existing assignment/line-ending rules;
4. create a unique sibling temporary file with exclusive creation and the existing `.env` file mode, write the full replacement, and fsync the open temporary file;
5. atomically rename the temporary file over `.env` and clean up any pre-rename temporary file on failure;
6. only after rename succeeds, update `configData[key]` and `process.env[key]`;
7. return `{persisted:true}`; throw `AppConfigError` on any pre-commit failure instead of logging session-only success.

The successful rename is the commit point. No fallible persistence operation follows it, so the method never reports failure after replacing the authoritative file. The method is synchronous like the current setter, which serializes calls through the server event loop; its private implementation closes the temporary descriptor in every path and never logs the setting value.

The scope does not add a generalized transaction or multi-setting API. The all-or-old guarantee for the Qwen pair is composed specifically in `LlmProviderService` with the old-secret snapshot and compensation above.

### Effective endpoint contract

Add a small core-owned Qwen endpoint configuration file or equivalent cohesive owner containing:

```ts
export const QWEN_BASE_URL_ENV_VAR = 'QWEN_BASE_URL';
export const DEFAULT_QWEN_BASE_URL =
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export function resolveQwenBaseUrl(
  configured = process.env[QWEN_BASE_URL_ENV_VAR],
): string;
```

The resolver uses the existing OpenAI-compatible absolute HTTP(S) normalization. `QwenLLM` calls it during construction and passes the result to `OpenAICompatibleLLM`. The URL literal is removed from `QwenLLM` itself.

### Qwen setup-status contract

The server projects Qwen configuration through one Qwen-specific status rather than expanding `LlmProviderRecord` or general model/provider fields:

```ts
type QwenEndpointSource = 'DEFAULT' | 'CONFIGURED';

type QwenSetupStatus = {
  effectiveBaseUrl: string;
  endpointSource: QwenEndpointSource;
  apiKeyConfigured: boolean;
};
```

`LlmProviderService.getQwenSetupStatus` reads `QWEN_BASE_URL` through `AppConfig`, normalizes optional whitespace, and determines source from the presence of that non-empty configured value, not equality with the default. It passes that same optional value to the core URL resolver for `effectiveBaseUrl` and uses the existing Qwen secret status for `apiKeyConfigured`. Thus an explicitly configured value equal to the default string is still `CONFIGURED`, while a missing/blank setting is `DEFAULT`.

GraphQL exposes `qwenSetupStatus: QwenSetupStatus!` and `saveQwenConfiguration(input: QwenConfigurationInput!): QwenSetupStatus!`. The successful mutation returns the same service projection. The GraphQL boundary allowlists the two command failure codes as sanitized `GraphQLError.extensions.code` values—`QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED` and `QWEN_CONFIGURATION_REPAIR_REQUIRED`—and never forwards the AppConfig/vault cause. The browser consumes the enum and error code directly; it never embeds or compares the default URL.

### Native Qwen definition contract

| Display / Identifier | Exact `value` | Provider | Static context | Input / Output | Notes |
| --- | --- | --- | ---: | --- | --- |
| `qwen3.8-max` | `qwen3.8-max` | `QWEN` | 1,000,000 | `null` / `null` unless route-specific evidence is recorded | No preview value or compatibility alias |
| `DeepSeek V4 Pro (Qwen)` / `qwen:deepseek-v4-pro` | `deepseek-v4-pro` | `QWEN` | 1,000,000 | `null` / `null` unless route-specific evidence is recorded | Existing direct DeepSeek entry remains distinct |
| `GLM-5.2 (Qwen)` / `qwen:glm-5.2` | `glm-5.2` | `QWEN` | 198,000 | `null` / `null` unless route-specific evidence is recorded | Existing direct GLM entry remains distinct |

Names may follow local display conventions, but identifiers and exact values must satisfy the table. Do not change a wire value to create uniqueness.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove every custom endpoint profile and alias path rather than deprecating it.
- Remove `qwen3.8-max-preview`; do not map it to `qwen3.8-max`.
- Preserve existing key-only Qwen users through the semantics of an absent new optional setting, not a preview/model compatibility branch.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject/location: Qwen API-key secret under `provider.qwen.api-key`; server `.env` managed by `AppConfig`; custom provider V2 records.
- Change: add optional non-secret `QWEN_BASE_URL`; no secret shape or custom-provider record change.
- Normal reader/writer: secret resolver continues returning the existing Qwen key; `AppConfig.get` returns saved/env settings; absent URL selects the constant default.
- Required invariants: secrets never enter non-secret config; saved URL is absolute HTTP(S); successful mutation means both values are durable; probe/new-key failure leaves the prior pair active; strict URL failure restores the prior key before reporting previous-restored failure.
- Physical/privacy constraints: key remains in secret vault; URL is safe to expose in provider settings.
- Decision: `Directly Usable — No Migration`.
- Rationale: Existing data already has correct semantics. Rewriting the key or custom-provider records has no benefit and adds operational risk.
- Supported criteria: AC-011–AC-014.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — no transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-004, BEH-006 | Qwen Settings query/submit | Truthful Qwen status or sanitized failure with no false success | `LlmProviderService` | Establishes a durable user-supplied route/key and authoritative default/configured state |
| DS-002 | Primary End-to-End | BEH-005, BEH-006 | User selects/starts Qwen model | Alibaba OpenAI-compatible completion call | `LLMFactory` model registry and `QwenLLM` adapter | Proves exact model value and dynamic endpoint reach runtime |
| DS-003 | Primary End-to-End | BEH-001–BEH-003 | Custom provider probe/reload | Runtime token budget/compaction state | Custom discovery/model provider | Preserves generic context recovery with no route-specific policy |
| DS-004 | Return/Event | BEH-003, BEH-006 | LLMFactory model projection/token usage | GraphQL catalog and token meter | Server catalog/token projection owners | Makes provider/model identity and known/unknown capacity observable |
| LS-001 | Bounded Local | BEH-002 | One discovered custom row | Three resolved metadata fields | Exact custom metadata resolver | Centralizes per-field precedence and conservative duplicate handling |

## Primary Execution Spine(s)

- **DS-001:** `QwenSetupForm -> Qwen setup query/save mutation -> LlmProviderService -> normalize/probe -> old-secret snapshot -> new secret -> AppConfig.setDurably -> success status OR secret compensation -> sanitized failure`
- **DS-002:** `Model selection -> Qwen catalog definition -> LLMFactory.createLLM -> QwenLLM -> effective Base URL resolver -> OpenAI-compatible client -> Alibaba endpoint`
- **DS-003:** `Custom provider Settings/reload -> endpoint discovery -> exact-value metadata resolver -> custom LLMModel -> LLMFactory -> resolveTokenBudget -> compaction decision`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The form first reads server-owned effective/default status. On save, the server probes, snapshots/replaces the secret, and strictly commits the URL. URL failure restores/removes the secret before returning previous-restored failure; double failure returns repair-required; success returns `CONFIGURED`. | Form, GraphQL query/command, provider configuration command, secret vault, strict AppConfig write | `LlmProviderService` | URL normalization, discovery probe, atomic file replacement, sanitized notifications |
| DS-002 | A selected Qwen-owned definition supplies the exact provider wire value. `QwenLLM` resolves the effective endpoint at construction and calls it with the existing secret resolver. | Catalog definition, registry, Qwen adapter, client | `LLMFactory` / `QwenLLM` | Static metadata provenance, unique identifier override |
| DS-003 | Custom discovery retains any advertised fields. A pure exact-value resolver fills only missing fields from the conservative built-in index; runtime consumes canonical fields unchanged. | Discovery, resolver, model construction, registry, token budget | Custom endpoint model provider | Stale-model preservation, source provenance |
| DS-004 | Models and token state are projected through existing server/GraphQL/UI owners without new inference. | ModelInfo, catalog enrichment, GraphQL, UI | Existing catalog/token projection services | Coarse provenance mapping, localization |
| LS-001 | Each numeric field independently checks live value, exact candidates, then unknown. | Row, fallback index, field result | Custom metadata resolver | Deterministic tie-breaking |

## Spine Actors / Main-Line Nodes

- `QwenSetupForm`: owns editable two-field UI state and client validation.
- Qwen GraphQL query/mutation: thin transport boundaries for setup status and one explicit command.
- `LlmProviderService`: owns validation/probe/key-first save sequencing, secret compensation, success gate, and Qwen setup-status projection.
- Secret vault: owns Qwen key persistence.
- `AppConfig.setDurably`: owns strict atomic non-secret Qwen Base URL persistence and its durable result.
- Qwen endpoint resolver: owns effective URL/default semantics.
- `SupportedModelDefinition`: owns code-curated model value and route-specific static metadata.
- `LLMFactory`: owns registry construction and unique model identifiers.
- `QwenLLM`: owns Qwen OpenAI-compatible client construction.
- Custom discovery/resolver/provider: own custom row normalization, exact inference, and model construction.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `QwenSetupForm` | Form state, server-projected endpoint-source presentation, validation, submit event, sanitized failure recovery | Secret persistence, URL comparisons, probing, model facts |
| `LlmProviderService` | Qwen status, probe, previous-secret snapshot, key-first save, strict URL commit, compensation, success/failure semantics | Runtime request construction, provider profile tables |
| `AppConfig.setDurably` | Atomic `.env` replacement and post-commit runtime update | Secret compensation, Qwen-specific sequencing |
| Qwen endpoint resolver | Setting name, historical default, URL normalization | Secrets, GraphQL, model catalog |
| `QwenLLM` | Client creation using effective URL/key resolver | Static model catalog, region/plan guessing |
| Qwen supported definitions | Exact values, unique identifiers, static metadata/provenance | User endpoint configuration |
| Custom metadata resolver | Exact built-in index and per-field precedence | Endpoint URLs, provider aliases, regional policy |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Qwen save GraphQL mutation | `LlmProviderService` | Schema/auth/transport | Probe/write sequencing |
| `OpenAICompatibleEndpointDiscovery.probeEndpoint` | Discovery boundary | Reusable normalized HTTP probe | Qwen persistence or model selection |
| `LLMFactory.createLLM` | Registry/model owner | Stable runtime construction entry | Qwen endpoint literals |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `OPENAI_COMPATIBLE_ENDPOINT_MODEL_PROFILES` | Route-specific policy rejected | Native Qwen definitions/config | In This Change | Delete constant and tests |
| `CanonicalEndpointIdentity` and URL profile parser/matcher | Resolver no longer uses endpoint identity | Exact value resolver | In This Change | Endpoint URL removed from resolver input |
| `EndpointModelProfile`, profile provenance/reference functions | No profile or alias source remains | Built-in fallback candidate/index | In This Change | Tighten source union |
| `deepseek-v4-flash-0731` alias/reference | User selected `deepseek-v4-pro`; no aliases | Exact native/built-in value | In This Change | Near values remain unknown |
| `endpoint_profile` source kind and server mapping branches | No producer remains | `live`/`inferred_builtin`/`static_definition`/`unknown` | In This Change | Update tests |
| Qwen constructor URL literal | Prevents dynamic endpoints | Qwen endpoint resolver | In This Change | Default constant retained in one owner |
| Generic key-only Qwen editor branch | Cannot save URL/key pair | `QwenSetupForm` | In This Change | Other providers retain generic editor |
| `qwen3.8-max-preview` profile/tests/docs | User requires production exact value | `qwen3.8-max` Qwen definition | In This Change | No compatibility alias |

## Return Or Event Spine(s) (If Applicable)

- **DS-004 catalog:** `LLMModel.toModelInfo -> ModelMetadataProvisioningService -> GraphQL ModelDetail/LlmProviderObject -> provider browser/model selector`.
- **DS-004 token state:** `runtime token usage -> token summary projection -> GraphQL -> TokenUsageMeterPanel`; capacity remains known or explicitly unavailable.
- **DS-001 status/save response:** setup query supplies effective URL/source/key flag; successful mutation returns the same `CONFIGURED` status and clears plaintext; previous-restored and repair-required failures preserve the input and show distinct messages.

## Bounded Local / Internal Spines (If Applicable)

- **LS-001 parent:** custom metadata resolver.
- **Flow:** `advertised field validation -> exact value candidate set -> lowest valid candidate + provenance -> unknown`.
- **Why:** Keeps all fallback policy deterministic and prevents endpoint/provider heuristics from reappearing in callers.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves Owner | Responsibility | Why It Exists | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| URL normalization | DS-001, DS-002 | Provider configuration / endpoint resolver | Absolute HTTP(S), normalized trailing slash | Same user/runtime URL semantics | Duplicated validation |
| Secret hygiene | DS-001, DS-002 | Secret vault / provider service | Write-only key and sanitized errors | Security contract | Secret leakage |
| Strict file replacement | DS-001 | AppConfig | Temp write/fsync/atomic rename before memory update | Prevent session-only false success | Provider service duplicates file persistence |
| Secret compensation | DS-001 | `LlmProviderService` | Restore old key/remove new key after URL failure | All-or-old for individual failures | General transaction abstraction or UI guesses |
| Static provenance | DS-002, DS-003 | Definitions/resolver | Source URL/date per numeric fact | Vendor facts change | Unreviewable constants |
| Stale custom models | DS-003 | Custom runtime sync | Preserve last-known-good on failure | Existing resilience | Resolver owns lifecycle incorrectly |
| Coarse GraphQL provenance | DS-004 | Server enrichment | Map source without exposing internal detail | Existing public API | UI guesses source |
| Localization/accessibility | DS-001, DS-004 | Frontend components | Labels, errors, unknown state | User-facing quality | Backend concerns mixed into UI |

## Ownership Boundaries

- GraphQL delegates the Qwen command to `LlmProviderService`; it does not directly write AppConfig or the secret vault.
- `LlmProviderService` delegates probing to the shared discovery boundary; it does not parse raw `/models` payloads.
- `LlmProviderService` is the only boundary composing the secret and URL owners. `AppConfig` reports strict persistence but knows nothing about the Qwen secret; the vault knows nothing about the URL.
- Qwen setup query/mutation return the server-owned endpoint source; the browser does not infer source from URL equality or general provider records.
- `QwenLLM` depends on the effective endpoint resolver and existing API-key resolver, not server configuration services.
- Custom model construction depends on one resolved metadata result; callers must not inspect built-in definitions themselves.
- Runtime/compaction/UI consume canonical model/token fields and must not infer provider limits by model strings.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulated Mechanisms | Required Callers | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LlmProviderService.saveQwenConfiguration` | normalization, probe, old-secret snapshot, key write, strict URL write, compensation, result | GraphQL resolver | Resolver writes vault/AppConfig directly | Strengthen command result/status |
| `LlmProviderService.getQwenSetupStatus` | configured/default source and effective URL/key flag | GraphQL query/mutation return mapping | Browser compares URLs or reads AppConfig | Strengthen Qwen-specific status only |
| `AppConfig.setDurably` | atomic persistent setting replacement and post-commit memory update | Qwen provider command | Command calls private file writer or best-effort `set` | Strengthen strict write result |
| Qwen endpoint resolver | env key, default, normalization | Qwen runtime and Qwen status projection | Duplicate URL literal/default logic | Export stable constant/resolver |
| Custom metadata resolver | exact index, candidate selection, sources | Custom model provider | Constructor/runtime reads definitions | Strengthen typed resolver output |
| `ModelMetadataProvisioningService` | internal source merge/coarse mapping | Catalog service | GraphQL merges fields | Preserve source-bearing ModelInfo |

## Dependency Rules

- Frontend Qwen form -> Qwen setup GraphQL query/mutation only; no embedded default or URL comparison.
- GraphQL -> `LlmProviderService`; no direct secret/config dependency.
- `LlmProviderService` -> shared URL normalization/discovery, secret vault, `AppConfig.setDurably`, catalog invalidation/refresh.
- `AppConfig.setDurably` -> existing environment serialization/filesystem only; it must not import Qwen or secret management.
- Core Qwen endpoint resolver -> shared OpenAI-compatible URL normalizer only; no server import.
- `QwenLLM` -> Qwen endpoint resolver + existing OpenAI-compatible base class.
- Supported definitions -> QwenLLM/static metadata; no AppConfig or endpoint probing.
- Custom resolver -> supported definitions/static metadata; no network, URL, server, GraphQL, or UI.
- Server/UI/runtime must not introduce endpoint profiles or alias matching elsewhere.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `saveQwenConfiguration({baseUrl, apiKey})` | Qwen connection | Validate, probe, key-first commit, strict URL commit, compensation, truthful result | One Base URL + one write-only key | Returns setup status only on success |
| `getQwenSetupStatus()` | Qwen configuration state | Project effective URL, source, and key flag | Singleton native Qwen provider | No secret or generic provider expansion |
| `AppConfig.setDurably(key, value)` | Persistent setting | Atomic file replacement before runtime mutation | One allowed key/value | Throws; never session-only success |
| `resolveQwenBaseUrl(configured?)` | Qwen endpoint | Return normalized configured/default URL | Optional string | Same semantics in runtime/status |
| `QwenLLM(model, config, apiKeyResolver)` | Qwen runtime | Build OpenAI-compatible client | Qwen-owned model | Uses exact `model.value` |
| `resolve({discoveredModel})` | Custom metadata | Per-field live/exact/unknown result | Exact discovered `value` | No endpoint identity |
| `SupportedModelDefinition` | Native model fact | Exact value, provider, identifier, metadata | Provider + exact value | Existing structure only |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Qwen save command | Yes | Yes | Low | Reject generic provider-setting bag |
| Qwen setup status | Yes | Yes | Low | Use `DEFAULT|CONFIGURED`, not URL comparison |
| Strict AppConfig setter | Yes | Yes | Low | Keep one-setting result; no transaction API |
| Qwen URL resolver | Yes | Yes | Low | Keep one default constant |
| Custom resolver | Yes | Yes | Low | Remove endpoint input |
| Qwen definitions | Yes | Yes | Medium | Require unique identifier override for duplicate values |

## Main Domain Subject Naming Check

| Subject | Name | Clear | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Native configuration form | `QwenSetupForm` | Yes | Low | Do not call it custom provider form |
| Server command | `saveQwenConfiguration` | Yes | Low | Avoid generic map settings |
| Server state | `QwenSetupStatus` | Yes | Low | Do not add general provider route attributes |
| Durable setting operation | `setDurably` | Yes | Low | Differentiate from best-effort `set` |
| Effective endpoint | `resolveQwenBaseUrl` | Yes | Low | Keep plan/region out of name |
| Custom resolver | `OpenAICompatibleEndpointModelMetadataResolver` | Yes | Medium | Name remains acceptable after simplification; no profile types |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Effective/saved state | Qwen-specific GraphQL status | Create narrow | General `baseUrl` cannot express `DEFAULT` vs `CONFIGURED`; three fields exactly serve the form |
| Key storage | Secret vault Qwen consumer | Reuse | Existing authoritative owner |
| Non-secret persistence | AppConfig | Extend narrowly | Existing `.env` owner gains one strict atomic single-setting operation |
| Key compensation | Secret management methods | Reuse | Existing status/resolve/save/remove operations support bounded rollback |
| Pair validation | OpenAI-compatible discovery | Reuse | Already calls `/models` with key |
| Static model facts | Supported definitions | Reuse/extend | Existing canonical catalog |
| Unique duplicated identifier | `modelIdentifierOverride` | Reuse | Avoids schema change |
| Custom exact fallback | Current metadata resolver/index | Simplify | Generic useful part already implemented |
| Runtime compaction/UI | Existing token budget/meter | Reuse | Already correct once context exists |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM provider configuration | Qwen pair command/setup status/compensation | DS-001 | `LlmProviderService` | Extend | One provider-specific command/query projection |
| Server app configuration | Strict atomic setting persistence | DS-001 | `AppConfig` | Extend | One single-setting durable method, no transaction layer |
| Core Qwen adapter | Default/effective URL and client | DS-002 | Qwen endpoint resolver / `QwenLLM` | Extend | No server dependency |
| Supported model catalog | Three required Qwen offerings | DS-002, DS-004 | Definitions/LLMFactory | Extend | Existing fields only |
| Custom endpoint metadata | Advertised + exact fallback | DS-003, LS-001 | Discovery/resolver/provider | Simplify | Delete route-specific policy |
| Server catalog | Source projection | DS-004 | Metadata provisioning | Simplify | Remove endpoint-profile branch |
| Settings UI | Qwen form | DS-001 | Provider manager/form/runtime/store | Extend | Consume Qwen setup status, not inferred provider data |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/qwen-provider-config.ts` | Core Qwen | Endpoint resolver | Env key, default, normalization | Cohesive non-secret endpoint policy | Existing URL normalizer |
| `qwen-llm.ts` | Core Qwen | Runtime adapter | Use effective URL | Existing adapter owner | Resolver |
| `supported-model-definitions.ts` | Catalog | Definitions | Three Qwen entries | Existing catalog owner | Static metadata helper |
| `openai-compatible-endpoint-model-metadata.ts` | Custom metadata | Resolver | Exact index and per-field fallback | Existing pure owner, now smaller | Resolved metadata types |
| `model-metadata-resolver.ts` | Shared metadata | Source contract | Remove obsolete variant | Existing canonical type | N/A |
| `app-config.ts` | Server config | Strict persistence | Atomic single-setting write/result | Existing file/env owner | Environment helpers |
| `llm-provider-service.ts` | Provider config | Command/status owner | Probe/snapshot/save/strict commit/compensate/project | Existing provider setup owner | Discovery/vault/AppConfig |
| GraphQL `llm-provider.ts` | Transport | Resolver | Qwen input, setup query, mutation/status, allowlisted failure-code mapping | Existing provider API | Service command/status |
| `QwenSetupForm.vue` | Settings UI | Form | Two-field UX | Distinct from generic key editor | Existing styles |

## Reusable Owned Structures Check

| Repeated Structure | Candidate Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Qwen URL key/default/normalization | `qwen-provider-config.ts` | Core Qwen | Runtime and server projection need identical semantics | Yes | Yes | General provider setting bag |
| Positive integer/source field | Existing metadata types | LLM metadata | Discovery, definitions, server use same semantics | Yes | Yes | Raw vendor payload |
| Qwen configuration projection | `QwenSetupStatus` in provider domain/GraphQL | Provider configuration | The form needs one explicit state across query and mutation | Yes | Yes | General provider/model route schema |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `QwenConfigurationInput` | Yes | Yes | Low | Only baseUrl/apiKey |
| `QwenSetupStatus` | Yes | Yes | Low | Only effectiveBaseUrl/endpointSource/apiKeyConfigured |
| `LlmProviderRecord` | Yes | Yes | Low | Leave general record unchanged; no plan/region/source fields |
| `SupportedModelDefinition` | Yes | Yes | Low | Reuse exact value/identifier override |
| `ResolvedMetadataSource` | Yes after deletion | Yes | Low | Remove `endpoint_profile` completely |
| Built-in fallback index | Yes | Yes | Low | Key exact value only |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern | Why One File | Reuse |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/qwen-provider-config.ts` (add) | Core Qwen | Endpoint policy | Setting constant, default, effective normalized URL | One cohesive policy | URL normalizer |
| `autobyteus-ts/src/llm/api/qwen-llm.ts` (modify) | Core Qwen | Runtime adapter | Remove literal and use resolver | Existing adapter | Endpoint policy |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` (modify) | Catalog | Model facts | Add three Qwen definitions and unique overrides | Existing authority | Static helper |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` (rewrite/simplify) | Custom metadata | Exact resolver | Remove profiles/URLs/aliases; retain exact index/field resolution | One pure boundary | Definitions/source types |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` (modify) | Shared metadata | Source contract | Remove endpoint-profile type | Existing type owner | N/A |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` (modify) | Custom lifecycle | Model provider | Call resolver without endpoint | Existing coordinator | Resolver |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` (modify) | Server catalog | Source projection | Remove obsolete source branch | Existing owner | Source type |
| `autobyteus-server-ts/src/config/app-config.ts` (modify) | Server config | Strict persistence | Add atomic single-setting `setDurably` and result | Existing owner | Env serialization/fs |
| `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts` (modify) | Provider config | Qwen status type | Three-field internal status and source enum | Existing provider domain | No generalized route fields |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` (modify) | Provider config | Command/status owner | Probe, previous-secret snapshot, key write, strict URL write, compensate, project status | Existing owner | Discovery/vault/AppConfig |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` (modify) | GraphQL | Transport | `qwenSetupStatus`, save mutation/input/status, and allowlisted error-code mapping | Existing provider schema | Service |
| `autobyteus-web/components/settings/providerApiKey/QwenSetupForm.vue` (add) | Settings UI | Form | Two-field UX | Distinct configured provider | Existing form patterns |
| `ProviderAPIKeyManager.vue`, section runtime, store, GraphQL operations, generated types/locales/tests (modify) | Settings UI | Orchestration | Query Qwen status; route form/mutation; map prior-restored/repair-required errors | Existing settings flow | Qwen status |
| Existing custom metadata/server/UI tests (modify/remove) | Coverage | Behavior proof | Replace profile cases with exact-only and Qwen cases | Align durable suite | Test helpers |

## Applied Patterns (If Any)

- Command boundary for validate-before-commit Qwen configuration.
- Atomic replace plus bounded compensation for the two-owner Qwen command; not a generalized transaction pattern.
- Existing adapter pattern for `QwenLLM` over `OpenAICompatibleLLM`.
- Code-curated supported-model definitions with source-dated static metadata.
- Pure exact index/resolver for custom metadata.
- Existing write-only secret plus non-secret app configuration composition.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | Folder | LLM domain | Qwen endpoint policy and supported definitions | Existing provider/core area | Server GraphQL/UI |
| `autobyteus-ts/src/llm/api/qwen-llm.ts` | File | Qwen adapter | Client construction | Existing adapter | Hardcoded route profile |
| `autobyteus-ts/src/llm/metadata/` | Folder | Metadata | Exact custom fallback/source types | Existing metadata owner | Alibaba endpoints/aliases |
| server `llm-management/llm-providers/services/` | Folder | Provider configuration | Qwen command | Existing setup owner | Runtime client construction |
| server `config/app-config.ts` | File | App configuration | Strict atomic single-setting persistence | Existing `.env` owner | Qwen/secret sequencing |
| server GraphQL `types/llm-provider.ts` | File | Transport | Qwen query/mutation/status | Existing provider API | Persistence logic |
| web `components/settings/providerApiKey/` | Folder | Settings UI | Qwen form/runtime integration | Existing provider setup area | Secret reads/model metadata policy |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | Main-Line Domain-Control | Yes | Low | Small endpoint policy belongs beside Qwen adapter/catalog |
| `autobyteus-ts/src/llm/metadata/` | Off-Spine Concern | Yes | Low | Exact inference remains generic metadata policy |
| server provider services | Main-Line Domain-Control | Yes | Low | Existing authoritative settings command area |
| web providerApiKey | UI | Yes | Low | Existing component/runtime grouping remains readable |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoid | Why |
| --- | --- | --- | --- |
| Dynamic Qwen URL | `resolveQwenBaseUrl(process.env.QWEN_BASE_URL)` | Alibaba hostname switch/region enum | User already supplies the correct endpoint |
| Qwen DeepSeek entry | identifier `qwen:deepseek-v4-pro`, value `deepseek-v4-pro`, provider `QWEN` | Rename wire value or add producer field | Unique product identity without changing request contract |
| Custom fallback | exact `glm-5.2` candidates -> lowest valid field | endpoint/region/profile lookup or `glm-*` family match | Conservative, generic, minimal |
| Unknown custom ID | `deepseek-v4-pro-0713` -> null absent exact definition/live field | Strip suffix to `deepseek-v4-pro` | No alias guessing |
| Configuration commit | probe -> snapshot old key -> save new key -> `setDurably` URL -> success | Best-effort `AppConfig.set` after replacing key | Successful response is restart-durable |
| URL persistence failure | strict URL write leaves URL old -> restore old key/remove new -> previous-restored error | Report session-only success | Individual failures are all-or-old |
| Default state | server returns `endpointSource=DEFAULT`; equal explicitly set URL returns `CONFIGURED` | Browser compares URL with embedded default | Truthful observable state with no duplicated endpoint policy |
| Production rename | add `qwen3.8-max`, delete preview profile | Keep preview alias for compatibility | User requested exact current value |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean Replacement |
| --- | --- | --- | --- |
| Map `qwen3.8-max-preview` to `qwen3.8-max` | Preserve old profile ID | Rejected | Remove preview and use exact production definition |
| Retain endpoint profiles but stop adding new ones | Minimize deletion | Rejected | Exact fallback-only resolver |
| Keep generic key-only Qwen save plus separate URL save | Smaller UI delta | Rejected | One pair command prevents mismatch |
| Add plan/region dropdown and synthesize URL | Vendor has regions/plans | Rejected | User pastes authoritative Base URL |
| Add provider-offering schema | Model producer differs from inference provider | Rejected | Existing provider + exact value + identifier override |
| Rewrite existing Qwen secrets | New URL setting added | Rejected | Absent URL uses historical default |
| General cross-store transaction manager | Two owners need coordination | Rejected | One strict AppConfig method plus Qwen-command-local secret compensation |
| Add endpoint-source to every provider/model record | Qwen form needs default/configured state | Rejected | Qwen-specific three-field setup status |

## Derived Layering (If Useful)

`Settings -> provider configuration command -> configuration/secret owners -> core Qwen endpoint resolver -> Qwen runtime client`, and separately `custom discovery -> exact metadata resolver -> canonical model -> runtime/catalog/UI`.

## Change / Refactor Sequence

1. Replace profile/alias tests with approved exact-only custom-resolution tests.
2. Simplify `ResolvedMetadataSource` and custom resolver; remove endpoint input, profiles, URL canonicalization, alias references, and obsolete tests/docs.
3. Update custom model provider and server provenance mapping to the reduced source union; rerun existing custom discovery, stale reload, GraphQL, compaction, and token-meter regressions.
4. Add the Qwen endpoint config constant/resolver and make `QwenLLM` use it; cover configured/default/invalid manual-env behavior.
5. Add the three Qwen definitions with exact values, source-dated context, and unique identifier overrides; cover registry/catalog collisions and custom exact fallback across duplicate values.
6. Add `AppConfig.setDurably` with temp-file write/fsync/atomic rename, post-commit memory update, cleanup, and injected failure coverage; retain existing best-effort `set` for unrelated callers.
7. Add `LlmProviderService.getQwenSetupStatus` and `saveQwenConfiguration`: probe, old-secret snapshot, new-key write, strict URL commit, old-key restoration/removal on URL failure, and distinct previous-restored/repair-required errors. Add the Qwen setup GraphQL query/mutation/status.
8. Add `QwenSetupForm` and connect the store/runtime/mutation/localization; consume server `DEFAULT|CONFIGURED`, validate loading/configured/failure/repair/success/accessibility/responsive states, and never compare URLs.
9. Re-run implementation review, mandatory coverage investigation, API/E2E/system/browser validation, code review for any durable coverage edits, and delivery integration/docs/build. All prior downstream evidence is obsolete for SR-010/SR-011.

## Key Tradeoffs

- **Static curated Qwen catalog vs dynamic discovery:** Static definitions are simpler and provide reviewed context facts. The user asked for three major models, not arbitrary native discovery.
- **One endpoint vs multiple routes:** One configurable endpoint meets the stated user journey without new collections or provider instances. Multiple simultaneous Qwen plans are deferred.
- **Exact duplicate values vs canonical producer model:** Keeping exact wire values allows custom fallback and provider calls to work. Existing identifier override solves UI/runtime identity without new attributes.
- **Conservative GLM context:** 198k is safer for Alibaba inference than reusing the direct GLM 1M definition when official pages conflict.
- **Separate URL/key storage:** Reuses current owners and security boundaries. One strict URL primitive plus bounded secret compensation is more code than a best-effort save but far smaller and clearer than a generalized transaction framework.
- **Qwen-specific status vs general provider fields:** Three explicit Qwen setup fields avoid ambiguous UI inference without expanding every provider/model record.

## Risks

- A manually supplied invalid `QWEN_BASE_URL` environment value can bypass the UI probe; the core resolver must fail clearly rather than silently use another endpoint.
- Strict AppConfig failure after new-key save requires compensation. Tests must inject URL failure and verify old-key restoration/removal plus no runtime URL mutation.
- A second failure during secret compensation cannot prove all-old. It must return `QWEN_CONFIGURATION_REPAIR_REQUIRED`, never success or a prior-active claim; the user must save a valid pair again.
- Duplicate exact values affect custom fallback. Lowest-valid-per-field is deliberately conservative but may understate a custom provider's real capacity.
- Vendor context documentation changes; provenance dates and future review are required.
- Removing `endpoint_profile` affects server tests and documentation that were already delivered on this branch; all references must be cleaned.

## Guidance For Implementation

- Keep the Qwen API key in the current secret consumer. Never put it in `QWEN_BASE_URL`, provider records, GraphQL return objects, logs, or fixtures.
- Use the shared OpenAI-compatible Base URL normalizer and discovery probe; do not write a second HTTP parser or `/models` parser.
- Keep `QWEN_BASE_URL` and its default in one core-owned file used by runtime and server projection.
- Use `AppConfig.setDurably`, not best-effort `set`, in the Qwen command. The strict method must update runtime memory only after atomic persistent replacement succeeds.
- Snapshot the previous Qwen `SecretValue` only inside the save command; never reveal, serialize, log, cache globally, or return it. Restore it or remove the newly created secret when URL commit fails.
- Map Qwen setup query and successful mutation to `{effectiveBaseUrl, endpointSource, apiKeyConfigured}`. Do not add source fields to general provider/model records and do not compare URLs in the browser.
- Do not add endpoint URLs to static model definitions; all Qwen-owned models use the single effective Qwen connection.
- Use `modelIdentifierOverride` only to prevent direct-provider collisions. Keep exact request `value`s unchanged.
- Remove every `endpoint_profile` switch branch, type, test, doc example, and profile-specific provenance reference.
- Preserve existing `live`, `inferred_builtin`, `static_definition`, and `unknown` source semantics and coarse GraphQL mapping.
- Preserve existing custom last-known-good behavior, compaction algorithm, explicit override semantics, and unknown token-meter rendering.
- Treat `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2` as the required new/updated Qwen offerings. Do not add a preview alias.
