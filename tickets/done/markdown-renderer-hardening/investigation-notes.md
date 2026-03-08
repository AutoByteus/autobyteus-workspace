# Investigation Notes - markdown-renderer-hardening

## Last Updated

- `2026-03-08`

## Scope Triage

- Classification: `Small`
- Reasoning:
  - Scope is isolated to the frontend markdown rendering pipeline.
  - No backend contract or storage schema changes are required.
  - Primary impact is one normalization utility, one markdown composition path, and focused renderer tests.
  - Although the failure mode is architectural, the implementation surface remains small.

## Sources Consulted

### Local Files

- `autobyteus-web/composables/useMarkdownSegments.ts`
- `autobyteus-web/utils/markdownMath.ts`
- `autobyteus-web/utils/__tests__/markdownMath.spec.ts`
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
- `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`
- `autobyteus-web/docs/content_rendering.md`
- `tickets/in-progress/team-math-message-rendering/requirements.md`
- `tickets/in-progress/team-math-message-rendering/implementation-plan.md`

### External References

- `markdown-it` API docs: `https://markdown-it.github.io/markdown-it/`
- `@mdit/plugin-katex` docs: `https://mdit-plugins.github.io/katex.html`

## Current Pipeline Findings

1. `useMarkdownSegments.ts` runs `normalizeMath(sourceStringRaw)` before `markdown-it` parses the markdown source.
2. `normalizeMath` currently rewrites raw source text using regex heuristics, including inline equation detection over entire lines.
3. Because this rewrite happens before markdown parsing, the normalizer cannot distinguish plain text from markdown structure such as links, code spans, and URLs.
4. The observed regression is reproducible when markdown links contain underscore-heavy filenames and filesystem paths. The previous heuristic inserted `$` around path fragments, which changed the markdown syntax before `markdown-it` tokenized it.
5. The active KaTeX plugin already supports explicit math delimiters directly (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`) when configured with `delimiters: "all"`.

## Structure / Ownership Findings

- `autobyteus-web/utils/markdownMath.ts`
  - Canonical owner for source normalization helpers.
  - Current inline guessing behavior lives here and is the main regression source.
- `autobyteus-web/composables/useMarkdownSegments.ts`
  - Canonical owner for markdown parsing orchestration and segment extraction.
  - Correct place to keep parser-first decisions and plugin composition.
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
  - Presentation layer only; should not absorb parsing heuristics.
- `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
  - Consumer of the renderer; good regression target but not the place to solve parsing policy.

## Constraints

- Existing math rendering must continue for explicitly-delimited content already emitted by providers or preserved in stored content.
- The renderer still needs to support mermaid fences and code highlighting without cross-interference.
- Any normalization retained in `markdownMath.ts` should be narrowly-scoped and markdown-safe.

## Key Risks

- Keeping inline auto-math guessing in a raw-string preprocessor will continue to create collisions with ordinary markdown constructs.
- Replacing the current behavior with a parser-aware plugin would be structurally safer, but is more invasive than needed for this ticket.
- Removing inline auto-detection may stop rendering some previously “helpful” implicit math cases; this needs to be explicit in requirements and tests.

## Recommended Design Direction

1. Treat explicit math delimiters as the canonical supported path.
2. Retain only narrowly-scoped normalization that does not rewrite inline markdown prose:
   - preserve `\[...\]` and `\(...\)` for the KaTeX plugin,
   - optionally convert safe standalone block forms,
   - do not auto-wrap inline prose equations.
3. Keep parser ownership inside `markdown-it`; avoid pre-parse heuristics that guess over raw markdown source.
4. Record a follow-up design note that a future markdown-it token-level plugin would be the correct place for any advanced math inference, if that feature is ever reintroduced.

## Unknowns

- Whether any user-facing flow currently depends on inline implicit math guessing without delimiters.
- Whether other markdown entry points outside the message renderer should receive dedicated regression tests after this hardening.

## Implications For Requirements / Design

- Requirements should be refined to favor explicit math delimiters and markdown-safe behavior over inline inference.
- Tests should shift from validating heuristic inline auto-wrap behavior to validating explicit math support plus protection against markdown-link/file-path regressions.
