# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready (revised after CR-001 requirement-gap review)

## Goal / Problem Statement

When the configured default image model is Gemini 3.1 Flash Image, the
`generate_image` / `edit_image` tool schema currently exposes only the common
prompt, reference-image, and output-path parameters. Gemini model-specific
output controls are absent because the built-in Gemini image catalog entries
use empty parameter schemas. Confirm the cause and expose the documented
aspect-ratio and output-size controls through the existing tool and provider
path without adding an alternate image transport.

## Investigation Findings

- The current image tool schema is dynamic: `addGenerationConfigParameter()`
  reads the resolved catalog model's `parameterSchema` and adds
  `generation_config` only when that schema has parameters.
- `ImageClientFactory` gives all built-in Gemini native image models an empty
  schema (`parameterSchema: null`, normalized by `ImageModel` to an empty
  `ParameterSchema`), so `generate_image` has only its three common top-level
  parameters when Gemini is the selected default. This is the direct reason the
  model-specific controls do not appear.
- The current `GeminiImageClient` forwards the merged config to
  `models.generateContent` but does not translate tool-facing snake_case image
  controls into the installed JavaScript SDK's `imageConfig` shape. Adding
  catalog fields without this client normalization would make the schema look
  correct while not reliably applying the selected controls.
- Current official Google documentation for native Gemini image generation
  documents the `aspect_ratio` and `image_size` controls. The installed
  `@google/genai` Generate Content SDK serializes their JavaScript request shape
  as `config.imageConfig.aspectRatio` and `config.imageConfig.imageSize`.
  Gemini 3.1 Flash Image supports 14 aspect ratios and `512`, `1K`, `2K`, `4K`;
  the exact model matrix is retained in the supplemental schema artifact.
- Implementation-source review finding `CR-001` identified a stale Lite
  capability row in the approved matrix. The current Gemini 3.1 Flash Lite
  model page and Generate Content image guide describe Lite as supporting all
  14 aspect ratios, including `1:4`, `1:8`, `4:1`, and `8:1`; the corrected
  matrix and acceptance basis now include those values. Lite remains `1K`-only
  because the model page and guide prose say 2K/4K/512 are not supported; the
  guide's conflicting 512 resolution-table cell is recorded as a residual
  provider-documentation risk rather than exposed speculatively.
- The current active built-in IDs on this branch are
  `gemini-2.5-flash-image`, `gemini-3.1-flash-lite-image`,
  `gemini-3.1-flash-image`, and `gemini-3-pro-image`. No model ID change is
  required.

## Supplemental Artifact Inventory

| Artifact | Purpose | Scope | Status | Approval Applicability | Supports |
| --- | --- | --- | --- | --- | --- |
| [`gemini-image-schema-matrix.md`](./gemini-image-schema-matrix.md) | Exact official model/control matrix and provider field translation | Native Gemini image generation/editing configuration | Current | Yes; defines intended tool behavior | REQ-001 through REQ-005, AC-001 through AC-006 |

## Request Context

User request: “i think i got one problem, the generate image for gemini 3.1 image schema actuall contains much more dimentions, but i dont know why it seems we have only 3 dimtntions, could you have a look why? is it true that we didnt include enough or something, i am not sure you have to check”

Interpreted request: investigate whether the Gemini 3.1 image controls are
missing from the generated tool schema, explain why, and correct the supported
schema/request path if the evidence confirms the gap.

## In-Scope Use Cases

- **UC-001 — Gemini 3.1 schema discovery:** When Gemini 3.1 Flash Image is the
  resolved default image-generation or image-editing model, its media tool
  schema exposes an optional `generation_config` object with the documented
  `aspect_ratio` and `image_size` fields.
- **UC-002 — Gemini 3.1 configurable generation:** A caller can provide one or
  both supported fields to `generate_image`; the requested output controls are
  translated into the provider SDK's `imageConfig` request shape.
- **UC-003 — Gemini 3.1 configurable editing:** A caller can provide the same
  controls to `edit_image`; the existing reference-image/editing flow remains
  intact while the output controls are applied.
- **UC-004 — Native Gemini family correctness:** The retained Gemini 2.5,
  Gemini 3.1 Flash Lite, and Gemini 3 Pro entries expose only the values
  documented for their own model, rather than inheriting one over-broad schema.
- **UC-005 — Existing model preservation:** OpenAI image models, Imagen
  registration, common media-tool arguments, default-model selection, and
  Gemini response extraction continue to work as before.

## Out of Scope

- New provider model IDs, default-model changes, or model deprecations.
- A new client, transport, Interactions API migration, or server-side direct
  use of `@google/genai` outside `GeminiImageClient`.
- Grounding/search tools, thinking controls, output MIME/delivery controls,
  multi-turn interaction state, arbitrary provider passthrough, or image-quality
  tuning not represented in the current tool contract.
- Model-aware maximum reference-image validation or a redesign of the shared
  `ParameterDefinition` array-bound model.
- Imagen-specific configuration expansion; Imagen remains a separate follow-up
  because this task is about the native Gemini 3.1 image schema.

## Functional Requirements

- **REQ-001 — Dynamic schema exposure:** For a resolved native Gemini image
  model with a non-empty catalog schema, the existing media-tool schema builder
  must expose `generation_config` as an optional object. For
  `gemini-3.1-flash-image`, that object must contain optional
  `aspect_ratio` and `image_size` enum properties from the supplemental matrix.
- **REQ-002 — Model-specific allowlists:** The schema for each native Gemini
  image model must use only that model's documented aspect ratios and sizes.
  For `gemini-3.1-flash-lite-image`, the aspect-ratio allowlist is the full
  documented 14-value set, including `1:4`, `1:8`, `4:1`, and `8:1`, while the
  image-size allowlist remains exactly `1K`. Unsupported fields and values
  must not be presented as supported controls.
- **REQ-003 — Provider request translation:** `GeminiImageClient` must merge
  catalog defaults and per-call generation config, remove the tool-facing
  snake_case controls from the direct SDK config, and add them under
  `imageConfig` as `aspectRatio` and `imageSize`. If neither field is supplied,
  the client must preserve current provider-default behavior.
- **REQ-004 — Shared generation/editing path:** Both `generateImage()` and
  `editImage()` must use the same normalization and the existing
  `models.generateContent` boundary. Reference-image loading, response modality
  defaults, image response extraction, and safety/region error handling remain
  unchanged.
- **REQ-005 — No accidental default behavior change:** `aspect_ratio` and
  `image_size` remain optional with no forced aspect-ratio default. Existing
  Gemini calls without these fields continue to let the provider choose its
  default based on input references or model defaults.
- **REQ-006 — Regression protection:** Add deterministic tests for schema
  contents per native Gemini model and for outbound request translation,
  including generation and editing/reference-image paths. Preserve existing
  catalog, mapping, and response parsing coverage.
- **REQ-007 — Documentation alignment:** Durable provider-model documentation
  must record the model-specific schema owner and the supported control scope,
  or delivery must explicitly record no-impact if an existing document is
  updated to cover it.

## Behavior Baseline

| Behavior ID | Current evidence-backed behavior | Desired behavior | Must remain unchanged |
| --- | --- | --- | --- |
| B-IMG-SCHEMA-001 | `generate_image`/`edit_image` builds three common parameters; `generation_config` is omitted for Gemini because `parameterSchema` is empty. Evidence: `media-tool-parameter-schemas.ts`, `ImageClientFactory`. | Gemini native model selection adds a documented nested `generation_config` schema. | Common prompt, input-image, mask, and output-path arguments. |
| B-IMG-SCHEMA-002 | `GeminiImageClient` merges config and forwards it to `models.generateContent`; no schema-backed aspect/size translation exists. Evidence: `gemini-image-client.ts`. | `aspect_ratio`/`image_size` become SDK `config.imageConfig.aspectRatio`/`imageSize`. | Model runtime mapping, response modality defaults, response extraction, and errors. |
| B-IMG-SCHEMA-003 | Native Gemini model IDs and factory ownership are already correct. | Extend their model metadata only; no ID or owner change. | Active model IDs and API-key/Vertex runtime resolution. |
| B-IMG-SCHEMA-004 | OpenAI image schemas already expose model-specific generation parameters. | Keep OpenAI schemas and client behavior unchanged. | OpenAI image generation/editing behavior. |
| B-IMG-SCHEMA-005 | The initial Lite matrix exposed only 10 ratios, so the reachable default-Lite tool path rejected four currently documented ratios. Evidence: implementation review `CR-001`, current Google Lite model page and Generate Content guide. | Lite exposes all 14 documented aspect ratios while retaining only the verified `1K` image-size value; the provider-docs 512 conflict remains explicit risk. | Existing Lite model identity, 1K-only conservative size boundary, and all non-Lite behavior. |

## Acceptance Criteria

- **AC-001:** With `gemini-3.1-flash-image` resolved as the default image
  generation model, the generated `generate_image` schema contains the common
  fields plus optional `generation_config.aspect_ratio` and
  `generation_config.image_size`.
- **AC-002:** The Gemini 3.1 Flash Image aspect-ratio enum contains exactly the
  14 values in the supplemental matrix, including `1:4`, `4:1`, `1:8`, and
  `8:1`; its image-size enum contains exactly `512`, `1K`, `2K`, and `4K`.
- **AC-003:** A mocked Gemini `generateContent` request with
  `{ aspect_ratio: '16:9', image_size: '2K' }` contains
  `config.imageConfig.aspectRatio === '16:9'` and
  `config.imageConfig.imageSize === '2K'`, and does not send those snake_case
  keys as top-level SDK config fields.
- **AC-004:** The same normalization is used by `editImage()` and preserves
  inline reference-image content and image response extraction.
- **AC-005:** Native Gemini model schemas match the matrix; in particular Lite
  exposes exactly the 14 documented aspect ratios (including `1:4`, `1:8`,
  `4:1`, and `8:1`) and only `1K`, while Gemini 2.5 cannot advertise a
  configurable size.
- **AC-006:** Calls with no image-specific config do not inject an explicit
  aspect ratio or alter existing modality/model/response behavior.
- **AC-007:** Existing image catalog, runtime mapping, OpenAI schema, media-tool
  parser/service, and Gemini response tests remain passing.
- **AC-008:** Durable provider-model documentation is synchronized or an
  explicit no-impact decision is recorded by delivery.

## Constraints / Dependencies

- Repository: Git worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions`.
- Branch: `codex/gemini-31-image-schema-dimensions`; bootstrap base and expected
  finalization target: `origin/personal` / `personal`.
- `ImageClientFactory` remains the built-in model/schema owner;
  `GeminiImageClient` remains the Gemini request/response owner;
  `media-tool-parameter-schemas.ts` remains the dynamic tool-schema adapter.
- Tool-facing fields use repository snake_case; provider-facing fields use the
  installed Generate Content SDK's current JavaScript camelCase `imageConfig`
  contract.
- Provider documentation is temporally unstable and must be rechecked by
  API/E2E/delivery at execution time.

## Persisted-Data Transition Decision

`Not Affected`. This change modifies in-memory model metadata, generated tool
schemas, and outbound request shaping only. No database/file schema or stored
user data is changed.

## Design Health Assessment (Mandatory)

- Change posture: **Bug fix / behavior expansion**.
- Initial design issue signal: **No structural design issue**.
- Root cause classification: **Local implementation defect / missing model
  invariant** — native Gemini model entries do not carry the documented image
  parameter schema, and the client lacks the corresponding field translation.
- Refactor posture: **Likely not needed**. Existing owners and boundaries are
  coherent; the fix extends the catalog schema and provider request normalizer
  rather than adding a generic helper/service chain.
- Residual risk: Google may revise model-specific aspect ratios or size labels;
  the schema matrix and docs must be refreshed when provider contracts change.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-006 |
| UC-002 | REQ-001 through REQ-006 |
| UC-003 | REQ-003, REQ-004, REQ-006 |
| UC-004 | REQ-001, REQ-002, REQ-006, REQ-007 |
| UC-005 | REQ-004 through REQ-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001/AC-002 | Build the tool schema with Gemini 3.1 selected and inspect exact nested properties/enums. |
| AC-003 | Mock `models.generateContent` and assert provider request translation and snake_case removal. |
| AC-004 | Mock image loading and response parts through `editImage()`; assert config plus reference content. |
| AC-005 | Inspect every native Gemini catalog schema for model-specific allowlists, including all 14 Lite ratios and its conservative 1K-only size. |
| AC-006 | Execute the existing no-config client path and compare request defaults. |
| AC-007 | Run focused TS/server media tests and builds. |
| AC-008 | Review canonical provider docs during delivery. |

## Contract Reconciliation (Solution Rework SR-002)

The implementation-source review returned `Fail / Requirement Gap` with
finding `CR-001`: the implementation correctly followed the initial matrix,
but that matrix incorrectly limited the supported Lite ratios to the standard
10. This is a real contract miss on a reachable path (Lite default -> media
tool schema -> client enum validation -> provider request), not an optional
enhancement. The requirements and supplement now correct Lite to the current
14-ratio provider contract. No new transport, owner, or API boundary is
introduced; implementation rework is limited to the catalog allowlist and
its exact schema assertions. Lite size remains `1K` only based on the stronger
current model-page/prose evidence, with the guide's contradictory 512 table
cell explicitly retained as a residual verification risk.

## Approval Status

Design-ready after SR-002 correction. The requested investigation explicitly
asked whether the missing dimensions were a real omission; official
documentation and local code confirm the omission, and source review exposed
one additional stale capability assumption for the default Lite path. The
supplemental matrix is part of the intended behavior and is included for the
same approval context. Implementation must be source-reviewed again before
API/E2E.
