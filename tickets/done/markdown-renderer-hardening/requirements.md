# Requirements - markdown-renderer-hardening

## Status

- Current Status: `Design-ready`
- Last Updated: `2026-03-08`

## Goal / Problem Statement

The frontend markdown rendering path for conversation and event-monitor content must render explicit markdown and math correctly without corrupting ordinary markdown links, file paths, or prose. Recent math-normalization changes introduced rendering regressions where underscore-heavy file links and path text are misinterpreted as KaTeX input.

## In-Scope Use Cases

| Use Case ID | Description |
| --- | --- |
| UC-001 | Render explicit inline and block math in inter-agent message content. |
| UC-002 | Render markdown links that contain underscore-heavy filenames and filesystem paths without converting any part of the link or URL into math. |
| UC-003 | Preserve plain prose, code spans, and non-math markdown content without visual corruption after math normalization. |
| UC-004 | Keep the markdown rendering architecture maintainable so future math-related changes do not silently break unrelated markdown constructs. |

## Requirements

| Requirement ID | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | Explicit math delimiters supported by the renderer must continue to render through the markdown + KaTeX pipeline. | Inline and block math remain visually rendered where delimiters are present. |
| R-002 | Markdown links and URLs containing underscores, slashes, periods, and filesystem-like path fragments must remain syntactically intact through preprocessing and rendering. | Link text and href values render exactly as authored without inserted math delimiters or KaTeX output. |
| R-003 | Plain prose, filenames, and path-like text that are not explicitly marked as math must not be auto-promoted into math by the renderer. | Non-math content keeps normal typography and markdown semantics. |
| R-004 | The renderer hardening must favor parser-safe behavior over broad raw-string heuristics. | Future renderer changes are constrained to markdown-aware handling or narrowly-scoped normalization rules. |
| R-005 | Inline implicit equation guessing is not a required compatibility surface for this fix. | The implementation may remove raw-string inline auto-wrap behavior if explicit math rendering and markdown safety are preserved. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Scenario | Expected Result |
| --- | --- | --- | --- |
| AC-001 | R-001 | Inter-agent content contains `\\(a+b\\)` inline math. | Rendered DOM includes `.katex` output for the inline formula. |
| AC-002 | R-001 | Inter-agent content contains `\\[ ... \\]` block math. | Rendered DOM includes `.katex-display` output for the block formula. |
| AC-003 | R-002 | Markdown content contains links such as `[evidence_extract.md](/Users/.../evidence_extract.md)`. | Link text remains `evidence_extract.md`, href remains unchanged, and no KaTeX nodes appear for the link. |
| AC-004 | R-003 | Plain prose contains filenames, slashes, and underscores without explicit math delimiters. | Content renders as normal text with no injected `$...$` wrappers or KaTeX styling. |
| AC-005 | R-004 | Renderer hardening design is reviewed for structure and future-safety. | Design artifacts justify why markdown structure is preserved before math transformations are applied. |
| AC-006 | R-005 | Prose contains expressions such as `I_n=1/(2n)+O(1/n^2)` or `x=e^{-t/n}` without explicit delimiters. | Renderer leaves the prose untouched instead of auto-wrapping it as math. |

## Constraints / Dependencies

- Frontend stack is `markdown-it` with `@mdit/plugin-katex`, Prism highlighting, DOMPurify sanitization, and Vue rendering.
- Existing message content may contain explicit math delimiters from upstream providers.
- Scope should remain frontend-only unless investigation proves an upstream normalization move is required.

## Assumptions

- Explicit math delimiters are the canonical supported path for math rendering.
- The current regression is localized to frontend markdown normalization rather than backend serialization.
- A small-scope workflow is sufficient unless investigation reveals a cross-layer requirement gap.
- For this ticket, correctness of markdown structure is more important than convenience inference for implicit inline math.

## Open Questions / Risks

- Whether the current raw-string normalization should be reduced further or replaced with a markdown-it plugin/token pass.
- Whether other renderer entry points besides `InterAgentMessageSegment` depend on the same normalization behavior.
- Whether Stage 7 needs browser/E2E validation beyond focused frontend renderer tests for this scope.

## Requirement To Acceptance Coverage

| Requirement ID | Covered By Acceptance Criteria |
| --- | --- |
| R-001 | AC-001, AC-002 |
| R-002 | AC-003 |
| R-003 | AC-004, AC-006 |
| R-004 | AC-005 |
| R-005 | AC-006 |
