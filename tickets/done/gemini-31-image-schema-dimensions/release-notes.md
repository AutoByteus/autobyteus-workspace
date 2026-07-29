# v1.4.28

## Fixes

- Expanded native Gemini image tool schemas with model-specific aspect-ratio and output-size controls for generation and editing.
- Corrected Gemini request serialization to use the installed SDK's `imageConfig` boundary, preserving requested controls through generation and edit requests.
- Preserved Gemini 3.1 Flash Lite's full 14-ratio allowlist and conservative 1K-only size boundary.
- Documented native Gemini image schema ownership and the dated Lite provider-documentation discrepancy.

## Validation

- Focused image, server media, and media E2E suites passed.
- Database-backed and live Vertex Express validation passed for Gemini 3.1 Flash Image and Flash Lite generation/editing.
