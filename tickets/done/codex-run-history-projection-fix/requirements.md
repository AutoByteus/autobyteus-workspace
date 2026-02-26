# Requirements

## Status
- Design-ready

## Date
- 2026-02-25

## Goal / Problem Statement
- Ensure historical Codex runs return non-empty canonical projection conversation when Codex `thread/read` has message turns.

## Scope Triage
- Scope: Medium
- Rationale:
  - Backend projection adapter behavior change.
  - Cross-check with live Codex E2E behavior.
  - Workflow artifact + regression test updates required.

## In-Scope Use Cases
- UC-001: Codex thread payload with `userMessage` + `agentMessage` items is projected into user/assistant conversation entries.
- UC-002: Codex thread payload with reasoning summary includes reasoning text in assistant message content.
- UC-003: Historical run open uses `getRunProjection` and returns non-empty conversation for Codex runs with available thread turns.
- UC-004: Legacy method-based payload parsing remains supported.
- UC-005: Historical projection remains available even if original run workspace path no longer exists.

## Acceptance Criteria
- R-001 (`requirement_id: R-001-codex-item-type-projection`)
  - Given `thread/read` payload with `item.type=userMessage|agentMessage`
  - Then provider builds canonical conversation entries with user and assistant messages.
- R-002 (`requirement_id: R-002-reasoning-summary-projection`)
  - Given `item.type=reasoning` with summary text
  - Then assistant projection content includes reasoning block and is non-empty.
- R-003 (`requirement_id: R-003-history-open-non-empty`)
  - Given a completed Codex run with valid thread history
  - Then `getRunProjection(runId).conversation.length > 0`.
- R-004 (`requirement_id: R-004-legacy-shape-compat`)
  - Given legacy method-based item payload
  - Then existing projection behavior remains valid.
- R-005 (`requirement_id: R-005-missing-workspace-fallback`)
  - Given a run manifest points to a workspace path that no longer exists
  - Then Codex history read falls back to a safe current-process cwd and still attempts projection.

## Constraints / Dependencies
- No frontend runtime-specific changes.
- Keep canonical run projection contract unchanged (`conversation` entries).

## Risks
- Over-parsing might duplicate user/assistant text if multiple fields are read without precedence.
- Reasoning aggregation could become noisy; must keep deterministic formatting.

## Requirement Coverage Map
- R-001 -> UC-001
- R-002 -> UC-002
- R-003 -> UC-003
- R-004 -> UC-004
- R-005 -> UC-005
