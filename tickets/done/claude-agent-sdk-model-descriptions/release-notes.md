# Release Notes — Claude Agent SDK Model Descriptions

## Summary

Claude Agent SDK model pickers now show the live model descriptions supplied by Claude's runtime catalog, making alias, model/version, and intended-use guidance visible before selection.

## Highlights

- Claude model descriptions flow through the shared model catalog and GraphQL contract as optional display metadata.
- Runtime-scoped model selectors show descriptions as wrapping secondary text while keeping compact closed labels.
- Search matches model identifiers, names, selected labels, and descriptions case-insensitively.
- Selecting a model still emits and persists only the existing Claude alias identifier such as `default`, `sonnet`, `opus`, or `haiku`.
- Models without descriptions keep the existing name-only presentation and remain selectable.
- Description text is sourced from the live Claude Agent SDK catalog rather than hard-coded, so wording can reflect the current installed runtime and authenticated account.

## Validation

- Live Claude SDK catalog and built GraphQL schema validation passed.
- Real HTTP GraphQL validation passed against an isolated local server.
- Desktop-width and narrow-width browser journeys passed for rendering, search, wrapping, selection identity, close/reopen, runtime changes, shared selectors, and name-only fallback.
- Focused server/frontend regression suites and production builds passed.
- A fresh macOS ARM64 Electron package with the integrated backend built successfully for local user verification.
- Final API/E2E confidence: `96.9%`; proportional durable-test review passed with no findings.
