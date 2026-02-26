# Requirements

## Status
- Design-ready

## Goal / Problem Statement
- Eliminate empty `Thinking` UI blocks for Codex runtime while preserving valid reasoning-summary rendering when available.

## Scope Triage
- Scope: Medium
- Rationale: Cross-layer behavior (backend runtime-event adapter + frontend segment lifecycle + test coverage in multiple modules).

## In-Scope Use Cases
- UC-REQ-001: Codex emits reasoning lifecycle with empty payload (`summary=[]`, `content=[]`) -> no empty thinking block in UI.
- UC-REQ-002: Codex emits reasoning summary text in completion payload -> thinking content is rendered.
- UC-REQ-003: Codex emits reasoning content delta without prior explicit segment start -> frontend fallback still creates reasoning segment (not text).
- UC-REQ-004: Existing non-reasoning streaming behavior remains unchanged.

## Out of Scope
- Redesign of Activity panel semantics beyond this bug.
- Adding new user-facing thinking policy controls.

## Acceptance Criteria
- R-001 (`requirement_id: R-001-empty-reasoning-no-ui-noise`)
  - Given empty reasoning payload from Codex
  - When run streams complete
  - Then frontend must not show residual empty thinking segment.
- R-002 (`requirement_id: R-002-summary-visible-when-present`)
  - Given non-empty reasoning summary from Codex payload
  - Then backend emits segment content usable by frontend and UI renders it.
- R-003 (`requirement_id: R-003-reasoning-fallback-type-correct`)
  - Given a reasoning content event arrives before start
  - Then frontend fallback creates a reasoning (`think`) segment, not text.
- R-004 (`requirement_id: R-004-no-regression-text-stream`)
  - Existing text/tool stream tests continue to pass.

## Constraints / Dependencies
- Must keep current runtime adapter architecture (Codex adapter maps to platform stream messages).
- Tests must run in repository test framework (Vitest).

## Assumptions
- Codex may legitimately return no reasoning summary for some turns.

## Risks
- Over-filtering could hide valid reasoning content if extraction logic is incorrect.

## Requirement Coverage Map
- R-001 -> UC-REQ-001
- R-002 -> UC-REQ-002
- R-003 -> UC-REQ-003
- R-004 -> UC-REQ-004
