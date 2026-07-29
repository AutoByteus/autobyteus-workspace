# Gemini Native Image Schema Matrix

## Purpose

This supplement records the provider-backed image controls that the current
`GeminiImageClient` can expose through the existing `generation_config`
boundary. It is the requirements/design authority for model-specific schema
values; it does not authorize arbitrary undocumented Gemini configuration.

## Provider contract checked on 2026-07-29

Source: [Gemini Generate Content image-generation guide](https://ai.google.dev/gemini-api/docs/generate-content/image-generation).
The current JavaScript `models.generateContent` shape is:

```ts
config: {
  responseModalities: ['IMAGE'],
  responseFormat: {
    image: {
      aspectRatio: '16:9',
      imageSize: '2K',
    },
  },
}
```

The AutoByteus tool-facing names remain `aspect_ratio` and `image_size` so
agent tool arguments follow the repository's snake_case contract. The Gemini
client owns the translation to `responseFormat.image.aspectRatio` and
`responseFormat.image.imageSize` before calling `@google/genai`.

### Contract reconciliation (CR-001)

The implementation-source review identified that the initial Lite row was
stale: the current [Gemini 3.1 Flash Lite model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image)
states that Lite supports a discrete set of **14** aspect ratios, including
`1:4`, `1:8`, `4:1`, and `8:1`. The current [Generate Content image guide](https://ai.google.dev/gemini-api/docs/generate-content/image-generation)
also lists those 14 ratios for Lite. The matrix is corrected below; this is a
requirements/design correction, not a new ownership or transport design.

The Lite size remains `1K` only. The model page and the guide's surrounding
prose state that Lite does not support 2K/4K and is 1K-only. The guide's
resolution table currently shows a `512` cell for Lite, which conflicts with
that model-page/prose limit. Until Google resolves that documentation
inconsistency, `512` is deliberately not exposed for Lite and the discrepancy
is retained as a delivery/API-E2E verification risk rather than guessed into
the public tool contract.

## Supported controls

| Model | `generation_config.aspect_ratio` | `generation_config.image_size` | Notes |
| --- | --- | --- | --- |
| `gemini-3.1-flash-image` | `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` | `512`, `1K`, `2K`, `4K` | The target model; 512 is the Generate Content API value for the 0.5K option. |
| `gemini-3.1-flash-lite-image` | `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` | `1K` | Lite supports all 14 documented ratios and is retained as 1K-only pending resolution of the guide's conflicting 512 table cell. |
| `gemini-3-pro-image` | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` | `1K`, `2K`, `4K` | Pro supports the standard 10 aspect ratios and up to 4K. |
| `gemini-2.5-flash-image` | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` | Not exposed | The current docs describe fixed 1K output for this retained legacy model. |

## Deliberately not exposed

- `response_modalities` / `responseModalities`: the image client owns the
  response modality default because the tool's meaningful result is an image.
- `thinking_config`, grounding tools, search types, and multi-turn interaction
  identifiers: these are separate provider capabilities, not image output
  dimensions, and are not part of the current `generate_image` contract.
- Arbitrary provider fields: the schema must remain a documented, model-specific
  allowlist rather than a free-form passthrough surface.
- Reference-image counts: `input_images` already carries reference inputs; this
  task does not add an artificial `maxItems` because the shared parameter model
  has no model-aware array bound and the client accepts the provider's input
  contract.

## Approval applicability

This supplement defines intended user-visible tool behavior and is part of the
requirements basis. It requires the same approval as the requirements doc.
