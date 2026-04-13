Status: Baseline Ready
Scope: Small

# Solution Sketch

1. Add a small HTML-entity decoder inside `autobyteus-web/localization/runtime/localizationRuntime.ts`.
2. Decode the translated message after interpolation and before returning it from `translate()`.
3. Support named entities needed by current catalog content (`amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, `larr`, `rarr`, `times`) plus numeric entities for future resilience.
4. Add focused runtime tests proving entity-backed strings decode correctly while normal translations and interpolation still work.

# Why Here

- The bug exists at the boundary where extracted localization data becomes user-visible text.
- Fixing the runtime covers all existing affected labels without fragile per-component workarounds.
- The output remains plain text, so the fix does not require `v-html` or any unsafe rendering.

# Risks

- Over-decoding intentionally literal entity text.

# Mitigation

- Decode only standard HTML entities into plain text characters.
- Keep translated output as text nodes rather than HTML.
- Validate with focused unit tests.
