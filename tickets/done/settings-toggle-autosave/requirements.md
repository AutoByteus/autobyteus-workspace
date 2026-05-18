# Requirements: Settings Toggle Auto-Save

Status: Design-ready

## User intent
- In Settings > Server basics, the Codex full access and Streaming parser cards should behave like the Applications card.
- Their toggle controls should persist immediately when toggled, without requiring an explicit save button.
- Save buttons that remain elsewhere should show a clearer highlighted/dirty state when user action is required.

## Acceptance criteria
- AC1: Codex full access toggle invokes persistence immediately on toggle.
- AC2: Streaming parser toggle invokes persistence immediately on toggle.
- AC3: Codex full access and Streaming parser cards no longer require or display an explicit save/check button for pending toggle changes.
- AC4: Existing manual-save cards still work, and their dirty save button styling is visually obvious.
- AC5: Existing tests/build checks pass or any pre-existing failures are documented.
