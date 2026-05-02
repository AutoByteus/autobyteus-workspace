# Runtime Observation Addendum

## Context

After the refined segment-first Activity projection implementation, code review, API/E2E validation, and a latest Electron build, the user tested the live Codex/browser-tool behavior again on 2026-05-02.

## User Observation

The user initially thought `open_tab` / browser tool cards still appeared only in the middle transcript and not in the right-side Activity panel. After retesting, the user reported this was a mistake: the behavior is actually working. The user noted possible intermittent instability but did not provide a deterministic reproduction.

## Design / Scope Impact

No new requirement or design change is required from this observation.

The authoritative requirement remains:

- when an eligible tool-like `SEGMENT_START` creates a visible middle transcript tool card, the right-side Activity store/panel must receive the same invocation immediately;
- later lifecycle events must update the same Activity entry without duplicates or terminal-status regression.

This is already covered by the refined requirements/design and validated by the current source/API-E2E artifacts.

## Follow-up If Instability Recurs

If the intermittent behavior becomes reproducible, capture a focused run with frontend streaming debug and backend runtime logs enabled, then compare:

1. `SEGMENT_START` / `TOOL_*` websocket messages;
2. `agentActivityStore` entries for the active run id;
3. whether the UI is displaying the same active run/member as the middle transcript.

Until then, this addendum should not block delivery-stage finalization.
