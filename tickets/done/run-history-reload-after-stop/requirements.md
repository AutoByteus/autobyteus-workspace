# Requirements

- Ticket: `run-history-reload-after-stop`
- Status: `Design-ready`
- Last Updated: `2026-03-03`

## Goal / Problem Statement

When a user starts an agent run in the installed Electron app, stops/terminates the run, closes the app, and reopens it, selecting the run row should load persisted run conversation/activity history. Current behavior shows empty history for affected runs even though the run row exists.

## Scope Triage

- Final Triage: `Medium`
- Rationale: fix requires runtime memory-path wiring changes and multi-layer regression tests across integration/e2e paths.

## In-Scope Use Cases

- `UC-001` New single-agent autobyteus runtime run is created, executes at least one turn, and is reopened from history after restart.
  - Expected: `getRunProjection` returns non-empty conversation and UI hydrates it.
- `UC-002` Team-member memory layout behavior remains unchanged.
  - Expected: team member run memory still resolves via member-specific memory directories.

## Out of Scope

- Any backward-compatibility fallback for legacy root-level single-agent traces.
- UI redesign of activity/conversation panels.
- Broad run-history schema redesign.

## Functional Requirements

- `REQ-001` Single-agent run creation/restoration must write memory to run-scoped path `memory/agents/<runId>/...`.
- `REQ-002` Run-history projection for autobyteus runtime must continue to read canonical run-scoped memory by run id.
- `REQ-003` Team-member explicit memory directories must not regress.
- `REQ-004` Regression tests must cover forward fixed path.

## Acceptance Criteria

- `AC-001` Root-cause evidence links explicit mismatch between persisted run index/manifest path and actual trace file location in installed profile.
- `AC-002` After fix, newly created autobyteus runs persist traces under `memory/agents/<runId>/` (not memory root).
- `AC-003` Team run/member behavior remains passing on existing tests.
- `AC-004` Added integration/e2e tests fail before fix and pass after fix for covered scenarios.

## Constraints / Dependencies

- Must not change run-history manifest/index schema.
- Must avoid breaking team member memory isolation semantics.

## Assumptions

- `AUTOBYTEUS_MEMORY_DIR` remains the canonical base memory directory.

## Risks

- Refactoring memoryDir wiring could accidentally impact restore behavior.

## Requirement Coverage Map

- `REQ-001` -> `UC-001`, `AC-002`, `AC-004`
- `REQ-002` -> `UC-001`, `AC-002`, `AC-004`
- `REQ-003` -> `UC-002`, `AC-003`, `AC-004`
- `REQ-004` -> `UC-001`, `UC-002`, `AC-004`

## Acceptance Criteria -> Stage 7 Scenario Coverage Map

- `AC-001` -> `S7-001` (artifact evidence of path mismatch)
- `AC-002` -> `S7-002` (integration assertion for agent config memory layout)
- `AC-003` -> `S7-003` (targeted existing tests for unaffected team/runtime behavior)
- `AC-004` -> `S7-004` (new + existing targeted suite passes)
