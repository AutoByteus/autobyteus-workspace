# Requirements

- Status: `Design-ready`
- Ticket: `team-math-message-rendering`
- Last Updated: `2026-02-28`

## Goal / Problem Statement

Student-side team message rendering does not display professor-sent LaTeX math content nicely. Math delimiters and escape sequences are shown as raw text (for example `\\(`, `\\[`, `\\frac`) instead of rendered math.

## In-Scope Use Cases

- `UC-001`: Professor sends a math problem to Student via `send_message_to` with inline and block LaTeX delimiters.
- `UC-002`: Student receives and reads the message in team conversation view.

## Out of Scope

- External channel rendering (WhatsApp/WeChat/etc.).
- Non-team chat surfaces outside the team conversation panel.

## Requirements

- `R-001`: Student-side inter-agent message content must render Markdown+math consistently with professor-side preview style for the same content payload.
- `R-002`: Escaped LaTeX delimiters in transferred content must be normalized so KaTeX/markdown renderer can parse and render formulas.
- `R-003`: Non-math plain text messages must remain unchanged.

## Acceptance Criteria

- `AC-001`: Given a received team message containing `\\(...\\)` inline math, Student view renders KaTeX markup (`.katex`) instead of raw delimiters in the content body.
- `AC-002`: Given a received team message containing `\\[...\\]` block math, Student view renders display math markup (`.katex-display`) instead of raw LaTeX command text.
- `AC-003`: Given a received plain text team message with no math delimiters, Student view still shows readable plain text content and sender label.
- `AC-004`: Unit tests cover inter-agent math rendering behavior and sender/metadata behavior in the same component.

## Constraints / Dependencies

- Reuse existing markdown rendering components in `autobyteus-web` where possible.
- Keep change scoped to web frontend unless investigation proves server-side normalization is required.

## Assumptions

- Team message content currently arrives as escaped markdown string from tool arguments or runtime serialization.
- Student message card uses a different rendering path from standard assistant conversation markdown rendering.

## Open Questions / Risks

- Rendering spacing may differ slightly after moving from plain text to markdown container.
- If some upstream messages intentionally include literal escaped LaTeX, rendering may interpret it as math.

## Requirement Coverage Map (Requirement -> Use Case)

- `R-001` -> `UC-001`, `UC-002`
- `R-002` -> `UC-001`, `UC-002`
- `R-003` -> `UC-002`

## Acceptance Criteria Coverage Map (AC -> Stage 7 Scenario placeholder)

- `AC-001` -> `AV-001`
- `AC-002` -> `AV-002`
- `AC-003` -> `AV-003`
- `AC-004` -> `AV-004`

## Scope Triage

- Confirmed classification: `Small`
- Rationale: expected to touch a limited set of frontend rendering/parser files and tests; no schema/API change anticipated.
