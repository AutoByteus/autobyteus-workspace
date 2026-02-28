# Investigation Notes - team-math-message-rendering

- Date: `2026-02-28`
- Scope: Student-side display of professor-sent math content in team inter-agent messages.

## Sources Consulted

- `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
- `autobyteus-web/components/conversation/segments/TextSegment.vue`
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `autobyteus-web/composables/useMarkdownSegments.ts`
- `autobyteus-web/utils/markdownMath.ts`
- `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts`
- `autobyteus-ts/src/agent/message/send-message-to.ts`
- `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`

## Key Findings

1. Inter-agent messages are rendered as plain text today.
- `InterAgentMessageSegment.vue` uses `{{ segment.content }}` in a plain `<p>` block.
- This bypasses the Markdown + KaTeX pipeline used by regular AI text segments.

2. Regular AI text segments already support math rendering.
- `TextSegment.vue` uses `MarkdownRenderer`.
- `MarkdownRenderer` + `useMarkdownSegments` + `normalizeMath` support `\(...\)` and `\[...\]` delimiters and KaTeX rendering.

3. Message payload path preserves message text and does not intentionally strip math delimiters.
- `teamHandler.ts` forwards `payload.content` directly into `InterAgentMessageSegment.content`.
- `send-message-to.ts` only forwards tool `content`; no frontend-friendly formatting is applied.

## Root Cause

The student-side inter-agent message component does not use the markdown/math renderer. As a result, LaTeX syntax is displayed literally instead of rendered.

## Constraints / Risks

- UI style should stay compact and preserve sender/metadata controls.
- Need to ensure plain text content remains readable after switching renderer.

## Scope Triage

- Classification: `Small`
- Rationale: localized to one rendering component + tests in `autobyteus-web`, no API or persistence changes expected.

## Implications for Requirements/Design

- Fix should be frontend rendering-path only.
- Prefer reusing existing `MarkdownRenderer` to avoid duplicated math parsing logic.
