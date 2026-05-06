# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

When a user selects the Claude Agent SDK runtime, starts an agent run, uses the frontend row-level **Terminate run** action, and then sends another message to continue that run, the run should recover cleanly like the Codex runtime does. The user clarified that this is **not** the chat Stop/interrupt button; Claude SDK interrupt/`STOP_GENERATION` already works. The failing case is the frontend agent-run-row terminate control.

## Investigation Findings

- Frontend history row terminate button calls `agentRunStore.terminateRun(runId)` through `WorkspaceAgentRunsTreePanel.vue` and `useWorkspaceHistoryMutations.ts`.
- Frontend running-panel row `×` calls `agentRunStore.closeAgent(runId, { terminate: true })`, which delegates to `terminateRun` and then removes the local context.
- `agentRunStore.sendUserInputAndSubscribe()` already restores persisted inactive runs with GraphQL `RestoreAgentRun` before reconnecting the WebSocket and sending a follow-up. A targeted frontend unit test for this restore-before-send behavior already exists and passes.
- Existing live GraphQL E2E coverage proves Claude and Codex can terminate **after an idle/completed turn**, restore, and continue.
- Existing live Claude interrupt E2E proves `STOP_GENERATION`/interrupt of an incomplete turn preserves/reuses Claude context and does not reproduce this terminate bug.
- A focused live probe for **Claude active terminate while awaiting tool approval -> restore -> reconnect -> continue** showed the follow-up could stream, but Vitest failed the run due to an unhandled Claude SDK rejection: `Error: Operation aborted` from `@anthropic-ai/claude-agent-sdk`. This is the terminate-specific defect: the active Claude terminate path aborts/closes provider control while a tool approval/control response is still settling.
- The difference from interrupt is local to the Claude SDK runtime adapter: interrupt uses `ClaudeSession.interrupt()` to clear pending approvals, flush the denial response, abort, close the active query, and await turn settlement; terminate currently bypasses that sequence and directly aborts/waits/closes in `ClaudeSessionManager.terminateRun()` / `ClaudeSessionCleanup`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, but small and local
- Evidence basis: Claude interrupt has the safe active-turn settlement order; Claude terminate duplicates a different active-turn cleanup order and causes a live SDK `Operation aborted` unhandled rejection in the terminate-row scenario.
- Requirement or scope impact: Row-level terminate must use the same safe active-turn settlement invariant as interrupt before removing the run session, then restore/send must remain unchanged.

## Recommendations

Unify Claude active-turn shutdown semantics: make `ClaudeSessionManager.terminateRun()` delegate active-turn settlement to `ClaudeSession.interrupt()` or an equivalent single owned helper before emitting `SESSION_TERMINATED` and closing the run session. Add regression coverage for active terminate while a Claude tool approval is pending, plus retain existing terminate/restore and interrupt/continue E2E coverage.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User starts a Claude Agent SDK run, terminates it from a frontend run row while an agent turn is active/pending, reopens or keeps the run selected as applicable, sends a follow-up, and receives streamed activity without backend unhandled rejection.
- UC-002: User terminates a Claude Agent SDK run after a completed/idle turn, restores/continues it, and receives a response.
- UC-003: User uses the chat Stop/interrupt control for Claude SDK and follow-up still works.
- UC-004: Codex terminate + restore/continue behavior is not regressed.
- UC-005: Frontend restore-before-send behavior for inactive persisted runs remains intact.

## Out of Scope

- Changing frontend button labels or layout.
- Changing Codex runtime lifecycle behavior except regression validation.
- Preserving partial work from a terminated, not-yet-session-identified Claude turn beyond what the Claude provider session can safely resume.
- Broad redesign of run history, run deletion, or archive flows.

## Functional Requirements

- FR-001: Claude SDK active terminate must settle any active turn using the same pending-tool-approval-safe sequencing as interrupt: deny/clear pending approvals, let the denial/control response flush, abort/close the active query, and await turn settlement before final session cleanup.
- FR-002: Claude SDK terminate must still emit `SESSION_TERMINATED` and remove the run session from `ClaudeSessionManager`.
- FR-003: Terminating an active Claude SDK run must not produce unhandled `Operation aborted` rejections from the Claude Agent SDK.
- FR-004: After `TerminateAgentRun` and `RestoreAgentRun`, a follow-up `SEND_MESSAGE` on a reconnected WebSocket must be accepted and stream normally.
- FR-005: Existing Claude interrupt behavior must remain unchanged and must still support follow-up on an interrupted incomplete turn.
- FR-006: Existing Claude/Codex completed-turn terminate/restore/continue behavior must remain passing.

## Acceptance Criteria

- AC-001: A unit/integration test proves `ClaudeSessionManager.terminateRun()` delegates active-turn settlement through the safe interrupt path or equivalent, with pending approvals cleared before abort/close and without direct duplicate abort/wait cleanup.
- AC-002: A live-gated or focused E2E/probe for Claude active tool-approval terminate -> restore -> reconnect -> follow-up completes without unhandled SDK rejection.
- AC-003: Existing live-gated Claude GraphQL terminate/restore/continue test remains passing.
- AC-004: Existing live-gated Claude `STOP_GENERATION`/interrupt resume test remains passing.
- AC-005: Existing frontend tests for row terminate delegation and inactive-run restore-before-send remain passing.

## Constraints / Dependencies

- Live Claude validation depends on `claude --version` being available and `RUN_CLAUDE_E2E=1`.
- Live Codex validation depends on `codex --version` and `RUN_CODEX_E2E=1`.
- The fix should stay in the Claude SDK backend/session subsystem; frontend restore/send orchestration already follows the expected lifecycle contract.
