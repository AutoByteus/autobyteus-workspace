# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for corrected solution rework; implementation
  handoff pending
- Investigation Goal: Verify why Gemini 3.1 image generation appears to have
  only three schema dimensions, compare the local path with the current Google
  contract, and define the smallest correct fix.
- Scope Classification: Medium-small
- Scope Summary: Add model-specific native Gemini image output schema and map
  the selected snake_case controls into the existing Generate Content request.
- Requirements Basis: [`requirements.md`](./requirements.md)
- Supplemental Evidence / Intended Behavior: [`gemini-image-schema-matrix.md`](./gemini-image-schema-matrix.md)

## Environment / Bootstrap Context

- Project type: Git super-repository with TypeScript, server, and web packages.
- Authoritative task workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions`.
- Current branch: `codex/gemini-31-image-schema-dimensions`.
- Bootstrap base: `origin/personal`.
- Expected finalization target: `personal`.
- Remote refresh: `git fetch origin personal` completed on 2026-07-29 before
  worktree creation.
- Worktree creation: `git worktree add -b codex/gemini-31-image-schema-dimensions /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions origin/personal`.
- Starting worktree state: clean, at `origin/personal` commit
  `ca97fa2f537f5bf31c4adbddc3d094c5bd7c7e96`.
- Shared checkout was dirty and behind; no authoritative artifacts were
  created there.
- Local dependency state: this fresh worktree has no package `node_modules`
  links, so executable tests were not run during solution design. Implementation
  and API/E2E must prepare dependencies in the dedicated worktree.

## Source Log

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- |
| 2026-07-29 | Skill / design | `cat .../solution-designer/SKILL.md`; `cat .../shared/design-principles.md` | Load mandatory workflow and architecture principles | Dedicated worktree, cumulative artifacts, behavior/spine/ownership mapping, and implementation-readiness checks are required. |
| 2026-07-29 | Git / setup | `git status --short --branch`; `git fetch origin personal`; `git worktree add ...` | Resolve clean task workspace and current base | Dedicated branch/worktree is clean and based on refreshed `origin/personal`. |
| 2026-07-29 | Code | `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | Find the source of the visible tool schema | `generation_config` is added only when the resolved catalog model has a non-empty `parameterSchema`; otherwise only common parameters are returned. |
| 2026-07-29 | Code | `autobyteus-ts/src/multimedia/image/image-model.ts` | Verify empty-schema normalization | `null`/undefined becomes `new ParameterSchema()`; no schema fields survive for Gemini entries. |
| 2026-07-29 | Code | `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Inspect built-in model metadata | OpenAI models have explicit schemas; `imagen-4`, `gemini-2.5-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, and `gemini-3-pro-image` use `parameterSchema: null`. |
| 2026-07-29 | Code | `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Inspect provider request owner | Client merges `generationConfig` into SDK config and calls `models.generateContent`; it currently has no image-control normalization. |
| 2026-07-29 | Code | `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts`, `media-tool-input-parsers.ts` | Trace tool call into provider | `generation_config` is intentionally passed through the service to the selected image client for both generation and editing. |
| 2026-07-29 | Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` and `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Check catalog/listing surfaces | Server model details can serialize multimedia `parameterSchema`; the current agent tool schema is generated server-side from the resolved default model. Image model listing queries do not request configSchema, but no image-config UI dependency was found in scope. |
| 2026-07-29 | Code/history | `git blame` on `image-client-factory.ts`; prior ticket `tickets/done/gemini-latest-image-model-support/review-report.md` | Check why schema was previously absent | Earlier Gemini model support deliberately deferred optional image schema; the prior review explicitly named future `imageConfig` exposure as follow-up. |
| 2026-07-29 | Web / SDK probe | `https://ai.google.dev/gemini-api/docs/image-generation`; installed `@google/genai` declarations and serializer | Verify current Generate Content request shape | Provider docs cover the image controls; the installed JavaScript SDK serializes them as `config.imageConfig.aspectRatio` and `imageSize`. 3.1 Flash supports 14 ratios and `512`, `1K`, `2K`, `4K`; Lite is 1K-only; Pro supports standard ratios and 1K/2K/4K; 2.5 exposes ratios with fixed 1K output. |
| 2026-07-29 | Web | `https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image` | Verify target model capabilities | Current stable model is `gemini-3.1-flash-image`; docs call out new 0.5K/2K/4K output options and new 1:4/4:1/1:8/8:1 ratios. |
| 2026-07-29 | Web | `https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image` | Verify Lite limits | The current model page says Lite supports a discrete set of 14 ratios, including `1:4`, `1:8`, `4:1`, and `8:1`, and supports only `1024px (1K)` output. This supersedes the initial 10-ratio assumption. |
| 2026-07-29 | Web | `https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image` | Verify Pro limits | Pro supports standard ratios and up to 4K. |
| 2026-07-29 | Source review | `code-review-report.md`, finding `CR-001` | Reconcile implementation against the current provider contract | Review result was `Fail / Requirement Gap`: the code followed the initial matrix, but the reachable Lite default path rejected four currently documented ratios. Requirements, matrix, and design must be corrected before implementation rework. |
| 2026-07-29 | Web / reconciliation | `https://ai.google.dev/gemini-api/docs/image-generation`; `https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image` | Resolve CR-001 and verify Lite size | The current provider capability statement supports the 14-ratio Lite interpretation, while the visible model-page bullet list contains ten values. The guide's resolution table shows a conflicting 512 cell, while the model page and guide prose state Lite is 1K-only; retain only `1K`, preserve the dated ratio/list discrepancy, and record both as residual documentation risk. |

## Current Supported Behavior / Production Path Map

| Behavior ID | Supported trigger / contract | Current path | Current outcome | Evidence |
| --- | --- | --- | --- | --- |
| B-IMG-SCHEMA-001 | Agent uses `generate_image` or `edit_image` with a configured default image model | Tool manifest -> `buildMediaToolParameterSchema` -> `MediaModelResolver` -> selected `ImageModel.parameterSchema` | Common schema has prompt/input/output (plus mask for edit); Gemini's `generation_config` is absent because its schema is empty. | `media-tool-parameter-schemas.ts`, `media-tool-model-resolver.ts`, `image-client-factory.ts` |
| B-IMG-SCHEMA-002 | Caller supplies `generation_config` | Parser -> `MediaGenerationService` -> `GeminiImageClient` | Config is passed to client, then shallow-merged into SDK config; no documented image output fields are generated or translated. | `media-tool-input-parsers.ts`, `media-generation-service.ts`, `gemini-image-client.ts` |
| B-IMG-SCHEMA-003 | Gemini image generation/edit request reaches provider | `GeminiImageClient` -> runtime resolver -> `models.generateContent` -> response-part scan | Model/runtime/response handling works for active Gemini IDs; controls are not part of the current catalog schema. | `gemini-image-client.ts`, `gemini-model-mapping.ts` |
| B-IMG-SCHEMA-004 | Non-Gemini or existing media model is selected | Same tool boundary -> model-specific catalog schema/client | OpenAI image schemas already expose three model-specific fields; video/audio schemas demonstrate nested dynamic schema behavior. | `image-client-factory.ts`, `audio-client-factory.ts`, `video-client-factory.ts` |
| B-IMG-SCHEMA-005 | Gemini 3.1 Flash Lite is selected as the configured/default image model and caller uses one of the four narrow documented ratios | Lite catalog schema -> media tool enum -> Gemini client validation -> SDK `imageConfig` | The initial implementation exposed only 10 ratios and therefore rejected `1:4`, `1:8`, `4:1`, and `8:1`; corrected implementation expands the allowlist to all 14 while retaining `1K` only. | `code-review-report.md` CR-001; current Google Lite model page and image-generation guide |

## Root Cause / Design Health Evidence

- The symptom is real, not a provider limitation: the schema builder's
  conditional is correct, but all native Gemini image catalog entries give it
  an empty schema.
- The missing schema and missing request translation are coupled local defects.
  Fixing only the catalog would expose controls that the current client does
  not turn into the documented provider request.
- The initial solution package contained a requirements gap: it transcribed
  only the standard 10 Lite ratios even though the current provider contract
  documents 14 total ratios. Because Lite is a supported default-model path,
  this is reachable behavior and must be corrected upstream rather than
  treated as an optional edge case.
- Ownership is already coherent:
  - `ImageClientFactory` owns static built-in model definitions and schemas.
  - `ImageModel` owns model identity/default configuration.
  - `media-tool-parameter-schemas.ts` adapts the resolved schema to the tool
    contract.
  - `GeminiImageClient` owns Gemini request/response shaping.
  - `MediaGenerationService` owns orchestration and output persistence, not
    provider fields.
- No design-level refactor is needed. A new generic schema service or a server
  duplicate would weaken the existing authority boundary.
- No compatibility wrapper or legacy model path is needed. Existing callers
  with no image-specific config retain current behavior; the new snake_case
  fields are a new documented contract.

## Runtime / Probe Findings

No executable product probe was run in solution design because the dedicated
worktree has no dependency links. The following static reproduction is
conclusive:

1. `ImageClientFactory` resolves `gemini-3.1-flash-image` to an `ImageModel` whose
   `parameterSchema` is normalized to an empty `ParameterSchema`.
2. `getMediaModelResolver().resolve('image_generation')` returns that model when
   the default setting selects it.
3. `addGenerationConfigParameter()` returns early on the empty schema.
4. The generated image tool therefore contains only the three common fields.
5. Existing `generation_config` values, if manually supplied, reach
   `GeminiImageClient`, but the client only shallow-merges them and does not
   create the SDK's `imageConfig` request object.

Downstream must execute a focused schema inspection and mocked request probe
after dependency setup.

## Relevant Files / Components

| Path | Current responsibility | Target implication |
| --- | --- | --- |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Built-in image model catalog | Add tight per-model native Gemini parameter schemas. |
| `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Gemini image request/response owner | Add one normalization step from tool fields to SDK `imageConfig`; keep client boundary. |
| `autobyteus-ts/src/multimedia/image/image-model.ts` | Schema/default config storage | No change expected; existing `ParameterSchema` is sufficient. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | Dynamic tool-schema adapter | No change expected; it already consumes non-empty catalog schemas. |
| `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` | Tool-to-client orchestration | No change expected; it already passes generation config for generation/editing. |
| `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` | Catalog/client tests | Add exact per-model schema assertions. |
| `autobyteus-ts/tests/unit/multimedia/image/api/gemini-image-client.test.ts` | Gemini response-path test | Add generation/edit request-shaping assertions. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` or focused media schema test | Server tool schema projection | Add/extend schema visibility coverage if the existing setup can select a native Gemini default. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Durable model ownership guidance | Delivery should record schema/control ownership and provider verification. |

## Open Unknowns / Risks

- `@google/genai` SDK version and current dependency setup must be verified by
  implementation/API-E2E; the repository's requested config shape follows the
  current official JS docs.
- Live provider access may be unavailable or quota/region/model-access gated;
  deterministic schema and mocked request checks must not be treated as live
  output-quality validation.
- Google may revise model-specific limits. The current guide has an unresolved
  Lite `512` table-versus-prose/model-page inconsistency; delivery/API-E2E must
  recheck it and record the exact verification date. The current conservative
  runtime contract exposes Lite ratios 14 and size `1K` only.

## Notes For Downstream Agents

- The requirements and schema matrix are corrected and implementation-ready;
  treat their Lite 14-ratio allowlist and 1K-only size as authoritative for
  this rework.
- Do not add `imageConfig` or `response_format` as arbitrary user-facing
  fields. The tool-facing contract is `generation_config.aspect_ratio` and
  `generation_config.image_size`; the client translates them into the current
  Generate Content SDK shape.
- Keep common tool schema behavior and all non-Gemini models unchanged.
- Use explicit test scenario IDs from `requirements.md`; report live provider
  blockage separately from local schema/request failures.
