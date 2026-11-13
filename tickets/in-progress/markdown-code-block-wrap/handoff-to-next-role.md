# Handoff: Architecture Design Complete — markdown-code-block-wrap (autobyteus-23)

- Result: `Architecture Design Complete`, `task_size: Small`, `architectural_risk: Low` → direct implementation route (handoff rule: Small/Medium and Low → `/software_engineering_team/implementation_engineer`).
- Package: `markdown-code-block-wrap`; Project Task `autobyteus-23` in Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`; requested by `/project_task_manager` for the user.
- Solution revision: `SR-001`.
- Worktree: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap`, branch `codex/markdown-code-block-wrap`, base `origin/personal` @ `188369c71452b27f4a793afecf9f72902e180629`; finalization target `origin/personal`.
- Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/`

## Original request

The user, 2026-11-13: "is it possible to make the markdown rendering instead of using scroll but make it wrap? in the event monitor area?" and "also when i open one markdown … both mobile and desktop version should automatically wrap, instead of showing the horizontal scroll, if its possible." Done when: in the chat and in an opened markdown file, on desktop and mobile layouts, code blocks with long lines show all their text wrapped without sideways scrolling, at narrow and wide sizes; copying still gives the original text; shown by tests and rendered checks (screenshots); merged on personal, verified, cleaned up, follow-ups recorded.

## Approval basis

Requirements approved by the Solution Designer within the Task's direction (no `Needs user` decision; the open points were delegated to the team), user informed 2026-11-13. Design approval not required by the direction.

## What to build (summary; the design spec is authoritative)

1. `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` `<style>`: one rule for every fenced code block (`.markdown-body pre`, `pre > code`: `white-space: pre-wrap; overflow-wrap: anywhere`), replacing the language-only `white-space`/`word-wrap` declarations; `.markdown-table-scroll { max-width: 100%; overflow-x: auto }`; `.katex-display { max-width: 100%; overflow-x: auto; overflow-y: hidden }`.
2. New `autobyteus-web/utils/markdownItScrollableTables.ts` (markdown-it plugin wrapping each table in `div.markdown-table-scroll`), used on `mdWithPrism` in `composables/useMarkdownSegments.ts`.
3. Unit tests and the `docs/content_rendering.md` section, per the design spec's Guidance For Implementation.

Root cause (Reproduced and Measured, PRB-001): only `code[class*="language-"]` wraps; a fence without a language keeps `white-space: pre`. Candidate measured: all code fits at 390/700/1280 px, selection copy equals the source, a 60 KB unbroken run lays out in 7–36 ms.

## Decisions (requirements-doc DEC-001…DEC-006)

Source code (blocks with a language) wraps the same way (it already did); no toggle; plain soft wrap with each line's original indentation kept at its start; every surface that shares `MarkdownRenderer.vue` changes the same way; no copy button exists, selection copy gives the original text; wide tables and long display equations scroll inside their own box.

## Validation expectation

Unit tests for structure and text fidelity; rendered checks in real Chromium for the desktop chat and Files preview (≈1280/≈700 px) and the phone bundle chat and Files screen (≈390 px, `test:e2e:mobile-shell` per TESTING.md), with screenshots. Details in the design spec.

## Open risks

RSK-001 (a host container overflowing on its own), RSK-002 (tall KaTeX glyph clipping): both checked by the rendered cases. Escalation trigger in the design spec.

## Follow-ups

FU-001 (unused `FileDisplay.vue`) in `follow-ups.md`; not part of this ticket.

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md` (ticket folder above)
- Evidence: `evidence/solution-probe/` (`probe.cjs`, `perf.cjs`, `fix.css`, `before/`, `candidate-fix/`), `evidence/user-report-screenshot.png`

## Route record

Handoff rules applied 2026-11-13: matched "Small or Medium and architectural_risk=Low" → sent to `/software_engineering_team/implementation_engineer`.
