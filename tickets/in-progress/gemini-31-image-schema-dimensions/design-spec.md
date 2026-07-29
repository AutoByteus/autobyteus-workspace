# Design Spec

## Status

Implementation Ready (revised after CR-001 requirement-gap review)

## Design Summary

Extend the existing built-in image catalog with tight, model-specific
parameter schemas for native Gemini image models and add a provider-owned
normalization step in `GeminiImageClient`. The public tool contract uses
snake_case `generation_config.aspect_ratio` and `generation_config.image_size`.
Only the Gemini client converts those values into the current JavaScript
Generate Content shape `config.imageConfig.aspectRatio` and
`config.imageConfig.imageSize`.

No new service, client, transport, compatibility wrapper, or default-model
change is needed.

## Requirements / Supplement Basis

- Requirements: [`requirements.md`](./requirements.md)
- Schema matrix: [`gemini-image-schema-matrix.md`](./gemini-image-schema-matrix.md)
- Investigation: [`investigation-notes.md`](./investigation-notes.md)

## Relevant Behavior and Production-Path Map

| Behavior ID | Approved change / preserved outcome | Target production path | Spine IDs |
| --- | --- | --- | --- |
| B-IMG-SCHEMA-001 | Gemini native model selection exposes a nested model-specific generation schema instead of only common fields. | Default model setting / tool discovery -> `MediaModelResolver` -> `ImageClientFactory` -> `ImageModel.parameterSchema` -> `buildMediaToolParameterSchema` -> generated tool schema. | DS-001, DS-004 |
| B-IMG-SCHEMA-002 | Supported aspect/size inputs are applied to Gemini requests using the SDK's canonical `imageConfig` fields. | Tool call -> parser -> `MediaGenerationService` -> `GeminiImageClient` normalization -> `models.generateContent`. | DS-002, DS-003 |
| B-IMG-SCHEMA-003 | Editing/reference-image flow shares the same config normalization and keeps current image extraction/output behavior. | Edit tool -> service input/reference resolution -> `GeminiImageClient.editImage` -> `generateImage` -> provider response -> file writer -> tool result. | DS-002, DS-003 |
| B-IMG-SCHEMA-004 | Existing models and no-config calls preserve current behavior. | Existing catalog selection -> existing model client -> existing request/response path. | DS-001, DS-002, DS-003 |
| B-IMG-SCHEMA-005 | Gemini 3.1 Flash Lite exposes all 14 currently documented aspect ratios, including the four narrow ratios omitted by the initial matrix, while retaining its verified 1K-only size boundary. | Lite catalog schema -> media tool enum -> shared Gemini normalizer -> provider request. | DS-001, DS-002, DS-004 |

## Spine Inventory

| Spine ID | Scope | Start | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary — model/tool configuration | Default image-model setting or catalog discovery | Generated `generate_image` / `edit_image` argument schema | `ImageClientFactory` for model schema; `MediaModelResolver` for selected model | Explains why the missing schema reaches the agent tool and where the fix belongs. |
| DS-002 | Primary — image generation | Agent image-tool invocation | Saved output file and `{ file_path }` result | `MediaGenerationService` for orchestration; `GeminiImageClient` for provider request | Covers the full real generation path, not only the edited client method. |
| DS-003 | Return/event — provider response | `models.generateContent` response | `GeminiImageClient` image URL -> service writer -> tool result | `GeminiImageClient` then `MediaGenerationService` | Confirms response parsing, persistence, and error behavior remain connected. |
| DS-004 | Bounded local — schema projection | Resolved `ImageModel.parameterSchema` | `generation_config` JSON schema | `buildMediaToolParameterSchema` | Shows the existing conditional adapter that currently suppresses empty Gemini schemas. |

### DS-001: Model/tool schema spine

```text
Default image-model setting or catalog query
  -> MediaModelResolver.resolve(image_generation/image_edit)
  -> ImageClientFactory.listModels / ImageModel
  -> model.parameterSchema
  -> buildMediaToolParameterSchema
  -> generate_image/edit_image generation_config schema
```

`ImageClientFactory` is the authoritative built-in model/schema owner. The
server tool builder adapts its result and must not duplicate Gemini values.

### DS-002 / DS-003: Runtime generation/editing and return spine

```text
Agent generate_image/edit_image call
  -> media input parser
  -> MediaGenerationService
  -> ImageClientFactory.createImageClient
  -> GeminiImageClient.generateImage/editImage
  -> Gemini runtime resolver + @google/genai models.generateContent
  -> GeminiImageClient image-part extraction
  -> MediaGenerationService output writer
  -> { file_path }
```

### DS-004: Bounded local schema projection

```text
Resolved ImageModel
  -> non-empty ParameterSchema check
  -> nested generation_config ParameterDefinition
  -> JSON Schema properties / enums
```

This local bounded path is additive detail; it does not replace the full
runtime spines.

## Main-Line Owners and Responsibilities

| Main-line node | Owns | Explicit non-responsibility |
| --- | --- | --- |
| `MediaModelResolver` | Selecting the configured model identity for the tool kind | Does not define provider fields or construct clients. |
| `ImageClientFactory` / `ImageModel` | Built-in image model identity, provider, client class, and tight model-specific parameter schema/default config | Does not execute provider requests or duplicate server tool schema logic. |
| `MediaGenerationService` | Resolving paths, selecting client, invoking generation/editing, writing returned media, cleanup | Does not translate provider-specific image controls. |
| `GeminiImageClient` | Gemini runtime selection, input-content assembly, provider config normalization, request dispatch, response extraction, and Gemini errors | Does not own model catalog registration or server tool schema projection. |
| `buildMediaToolParameterSchema` | Adapting the selected catalog schema into the `generation_config` tool argument | Does not hardcode Gemini aspect/size values. |

## Interface and Data-Shape Design

### Tool-facing schema

For native Gemini models, the catalog schema is a flat `ParameterSchema` with
optional fields:

```text
generation_config: {
  aspect_ratio?: enum(...),
  image_size?: enum(...)
}
```

This keeps the existing tool contract consistent with video/audio schemas and
avoids exposing provider SDK camelCase names to agents. No field is required;
when absent, the provider's normal default behavior remains in effect.

### Provider-facing normalization

`GeminiImageClient` should own a small, concrete normalizer in the same file
(or a semantically tight private function in the image API module) that:

1. Merges `this.config.params` and the per-call `generationConfig` with the
   existing precedence (per-call values win).
2. Reads `aspect_ratio` and `image_size` only as documented schema fields.
3. Removes those tool-facing keys from the top-level SDK config.
4. If either is present, merges an `imageConfig` object into the SDK config
   using `aspectRatio` / `imageSize`; existing provider-shaped `imageConfig`
   fields, if present, are preserved.
5. Leaves the existing `responseModalities` default logic and all unrelated
   config fields unchanged.
6. Does not create `imageConfig` when neither image field is supplied.

Illustrative result:

```ts
// Tool input
{ aspect_ratio: '21:9', image_size: '4K' }

// SDK request config
{
  responseModalities: ['IMAGE'],
  imageConfig: { aspectRatio: '21:9', imageSize: '4K' },
}
```

The normalizer should validate only at the catalog/schema boundary where
possible. The client should still reject malformed direct programmatic values
with a clear `generation_config.<field>` error rather than silently forwarding
invalid enum values. The exact validation strategy must remain local and
proportionate; no general schema-validation framework is introduced.

### Per-model catalog schema

Use a small factory-local schema builder to avoid duplicating the same
`ParameterDefinition` construction while passing model-specific enum arrays.
The builder returns a tight `ParameterSchema`:

- 3.1 Flash: 14 ratios; size `512`, `1K`, `2K`, `4K`.
- 3.1 Flash Lite: 14 ratios, including `1:4`, `1:8`, `4:1`, and `8:1`; size
  `1K` only. The current guide's conflicting 512 table cell is not exposed
  until provider documentation is reconciled.
- 3 Pro: 10 ratios; sizes `1K`, `2K`, `4K`.
- 2.5 Flash: 10 ratios; no `image_size` field.

No shared kitchen-sink schema should be used for all models.

## Dependency Direction and Forbidden Shortcuts

Allowed:

- `ImageClientFactory` -> `ParameterSchema` / `ParameterDefinition`.
- `MediaModelResolver` -> `ImageClientFactory` for lookup.
- `media-tool-parameter-schemas.ts` -> resolved catalog model schema.
- `GeminiImageClient` -> Gemini SDK and runtime/model mapping.
- `MediaGenerationService` -> image client boundary.

Forbidden:

- Server media tool code importing `@google/genai` or duplicating Gemini
  aspect/size arrays.
- `GeminiImageClient` importing server tool schema code.
- A generic “image config” bag that exposes unsupported provider controls.
- Bypassing `GeminiImageClient` from `MediaGenerationService` or callers.
- Changing the runtime mapping or model IDs as part of schema support.

## Subsystem / File Responsibilities and Path Mapping

| Change | Path | Responsibility / action |
| --- | --- | --- |
| Modify | `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Add schema constants/builder and attach per-model schemas to native Gemini entries. |
| Modify | `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Normalize snake_case schema fields into SDK `imageConfig`; preserve request/response owner. |
| Modify | `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` | Assert exact model-specific schema values and no over-broad inheritance. |
| Modify | `autobyteus-ts/tests/unit/multimedia/image/api/gemini-image-client.test.ts` | Assert no-config preservation, generation translation, and edit/reference translation. |
| Modify or add focused | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` or a focused media schema test | Prove resolved Gemini default exposes nested `generation_config` if existing test setup supports it without new environment machinery. |
| Update during delivery | `autobyteus-ts/docs/provider_model_catalogs.md` | Record schema/control ownership and current Google verification date. |

No file rename, new subsystem, migration, compatibility artifact, or removal is
required.

## Change / Refactor Sequence

1. Add the schema matrix/builder to `ImageClientFactory` and attach the exact
   per-model schemas without changing model IDs/default settings.
2. Add the provider-owned config normalizer in `GeminiImageClient` and use it
   for both generation and editing.
3. Add/update deterministic unit and server schema tests.
4. Run implementation-scoped build/tests; API/E2E validates schema projection,
   mocked outbound request shape, and live provider access when available.
5. Delivery rechecks official docs and syncs durable provider documentation.

## Removal / Compatibility Posture

- No legacy model identifiers or aliases are removed or retained.
- No compatibility wrapper is introduced.
- No current no-config behavior is changed.
- The previously empty Gemini `parameterSchema` metadata is replaced with the
  current documented schema; this is a clean current-schema change, not a
  persisted-data migration.

## Persisted-Data Transition

`Not Affected`. Model metadata and tool schemas are runtime/catalog objects; no
stored record is transformed. Existing saved settings contain model IDs only,
and those IDs remain unchanged.

## Task Design Health Assessment

- Design issue: **No structural refactor needed**.
- Root cause: local metadata omission plus missing provider config mapping.
- Current owner health: healthy. The catalog owns model capability metadata;
  the client owns provider request translation; the server tool builder already
  acts as a thin schema adapter.
- Proportionality: a small schema builder and one client normalizer address the
  actual user-visible gap. A new generic configuration framework would be
  disproportionate and create a second ownership boundary.
- Residual risk: provider docs can change enum values; tests and durable docs
  must make future refreshes explicit.

## Rework from CR-001

The implementation-source review returned `Fail / Requirement Gap` because
the implementation matched the initial matrix but the initial Lite row was
stale. Current Google documentation describes Lite as supporting 14 total
aspect ratios, so the requirements basis, supplement, and this design now
expand Lite to the complete 14-value enum. This is a local catalog/test data
correction; the existing ownership, provider normalizer, shared generation and
editing path, and no-config behavior remain unchanged. Lite remains `1K` only
based on the model page and guide prose; the conflicting guide table cell is a
tracked residual risk for API/E2E and delivery verification.

Implementation rework must update the Lite catalog allowlist and exact schema
assertions, then produce a new implementation handoff/revision entry. The
package must return to source review and must not advance to API/E2E until that
review passes.

## Implementation Readiness

- Approved use cases represented: **Pass** — UC-001 through UC-005 are mapped
  to B-IMG-SCHEMA-001 through B-IMG-SCHEMA-005 and DS-001 through DS-004;
  AC-005 explicitly covers the corrected Lite 14-ratio matrix.
- Complete production-path coverage: **Pass** — schema discovery, tool call,
  provider dispatch, and response/file return paths are all represented.
- Shared design-principle validation: **Pass** — ownership remains explicit,
  no boundary bypass or duplicated provider policy is introduced, model schemas
  are tight rather than kitchen-sink, no persisted data is affected, and no
  compatibility machinery is added.
- Blocking gaps: **None after SR-002 correction**; implementation source must
  still be reworked and re-reviewed for CR-001 before API/E2E.
- Implementation outcome: **Implementation Ready for bounded rework**.
