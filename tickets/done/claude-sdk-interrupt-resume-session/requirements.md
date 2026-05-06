# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

When a user is running an agent through the Claude Agent SDK runtime, presses interrupt, then sends a follow-up message in the same visible agent/team conversation, the follow-up must continue the existing Claude SDK session and retain conversation context. The user-observed bug is that the follow-up starts as a completely fresh Claude conversation, causing the agent to say it has no prior context even though the prior turn is visible in the frontend. This is critical because interrupt is unusable if users cannot refine or continue the interrupted work.

## Investigation Findings

- The frontend sends `STOP_GENERATION` and subsequent `SEND_MESSAGE` on the same agent/team WebSocket/run; it does not intentionally create a new visible conversation.
- The Claude runtime stores a local placeholder `sessionId` equal to `runId` for fresh runs, then adopts the real Claude SDK `session_id` from streamed chunks via `ClaudeSession.adoptResolvedSessionId(...)`.
- `ClaudeSession.executeTurn(...)` currently resumes the Claude SDK only when `hasCompletedTurn` is true: `sessionId: this.hasCompletedTurn ? this.sessionId : null`.
- An interrupted first/incomplete turn can already have an adopted real Claude SDK session id, but `hasCompletedTurn` remains false because the turn was intentionally interrupted. The next same-session message therefore calls the SDK without `resume`, creating a fresh Claude conversation.
- Claude Agent SDK 0.2.71 local typings document `options.resume` as the session id that loads conversation history; SDK messages carry `session_id`, and a query control object exposes `sessionId` after the first message/resume.
- Codex runtime does not have the same guard; it sends the stable thread id on every turn. The bug is therefore specific to the Claude Agent SDK path.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, as a missing runtime invariant inside the Claude session owner.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Current-code read of `ClaudeSession`, `ClaudeSessionManager`, Claude SDK client options, frontend WebSocket send/stop paths, existing tests, and focused repro probe.
- Requirement or scope impact: Fix the Claude session continuation decision to depend on real provider-session identity availability, not on turn completion; add targeted regression validation.

## Recommendations

Implement a targeted Claude runtime fix in `ClaudeSession`: the next turn should pass the real adopted Claude SDK session id to `ClaudeSdkClient.startQueryTurn(...)` whenever the session has a provider session id distinct from the local placeholder run id, even if the prior turn ended by interrupt instead of completion. Keep placeholder run ids out of SDK `resume`. Add deterministic tests around interrupt + follow-up resume, and add API/E2E or integration coverage with a fake Claude SDK query so the scenario is durable without live credentials.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user interrupts an in-progress Claude Agent SDK run after the SDK has produced a real `session_id`, then sends a follow-up in the same single-agent conversation.
- UC-002: A user interrupts an in-progress Claude Agent SDK team member run after the SDK has produced a real `session_id`, then sends a follow-up to that same focused member in the same team run.
- UC-003: Validation verifies the Claude Agent SDK interrupt + follow-up path passes `resume` and retains prior context.

## Out of Scope

- Changing Codex or AutoByteus runtime semantics, except for no-regression checks.
- Reconstructing a provider transcript when the Claude SDK never emitted any real session id before interrupt; in that edge case no provider session is available to resume.
- Redesigning frontend thread selection, team layout, or message rendering.
- Live Claude network validation as the only required regression test; live-gated coverage may be added, but deterministic fake-SDK validation must exist.

## Functional Requirements

- REQ-001: For Claude Agent SDK runtime runs, interrupting an active turn must preserve any real adopted Claude SDK session id.
- REQ-002: The next same-run user message after interrupt must pass the real adopted Claude SDK session id as the SDK resume identity, even when the interrupted turn did not complete.
- REQ-003: The resume decision must not pass the local placeholder run id as a Claude SDK resume id when no real provider session id is known.
- REQ-004: The resumed Claude Agent SDK turn must retain provider conversation context from before the interrupt.
- REQ-005: The fix must apply to both standalone Claude agent runs and Claude team member runs, since both share `ClaudeSession`.
- REQ-006: The fix must not regress completed-turn resume, restore-from-history resume, or non-Claude runtime send/interrupt behavior.
- REQ-007: Repository validation must include deterministic executable coverage for Claude Agent SDK interrupt followed by same-session follow-up resume; API/E2E or integration-level coverage should exercise the WebSocket/manager path with a fake SDK when feasible.

## Acceptance Criteria

- AC-001: Given a Claude SDK session whose first turn has adopted `session_id = S` from a stream chunk and is then interrupted before `TURN_COMPLETED`, when the next message is sent on the same `ClaudeSession`, `ClaudeSdkClient.startQueryTurn(...)` receives `sessionId: S` and therefore builds SDK options with `resume: S`.
- AC-002: Given a Claude SDK session that has not yet adopted a provider session id and still has only the local placeholder `runId`, a follow-up does not pass that placeholder as SDK `resume`.
- AC-003: Given a normal completed Claude SDK turn with an adopted provider session id, the next turn continues to resume as before.
- AC-004: Given a restored Claude SDK run/team member with persisted provider session id, the next turn continues to resume against that id.
- AC-005: Given the frontend/team WebSocket path sends `STOP_GENERATION` followed by `SEND_MESSAGE` for the same run/member, backend validation shows the second Claude SDK query uses `resume` instead of starting fresh.
- AC-006: Existing targeted Claude session tests pass, and representative non-Claude interrupt/send tests are not broken.

## Constraints / Dependencies

- The Claude Agent SDK package in this workspace is `@anthropic-ai/claude-agent-sdk` `0.2.71` per `autobyteus-server-ts/package.json` and `pnpm-lock.yaml`.
- The SDK contract uses `options.resume` for session continuation and emits `session_id` in SDK messages.
- The current runtime has a local placeholder id (`runId`) before a provider `session_id` is observed; implementation must distinguish these identities.
- Existing team and single-agent WebSocket paths should remain the authoritative frontend/backend command boundaries.

## Assumptions

- The user-reported screenshot occurred after Claude had emitted at least one stream chunk with a real `session_id`, because visible tool/text events had already appeared before interrupt.
- The correct behavior is clean-cut session continuity for the current Claude runtime path, not a compatibility branch that treats interrupted turns as fresh starts.
- Deterministic fake-SDK validation is preferred over relying on live Claude credentials for CI stability.

## Risks / Open Questions

- Risk: If the SDK emits no `session_id` before a very early interrupt, provider-level resume is impossible. This is out of scope unless implementation finds a safe existing provider API for pre-first-message session ids.
- Risk: Live Claude behavior may vary; live E2E tests should remain gated by `RUN_CLAUDE_E2E` if added.
- Open: Whether to additionally persist provider session id immediately for standalone run metadata on adoption. Not required for the same-active-session bug, but worth noting if API/E2E finds restore-after-interrupt metadata gaps.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-003, REQ-004, REQ-006
- UC-002: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
- UC-003: REQ-007

## Acceptance-Criteria-To-Scenario Intent

- AC-001 targets the user-reported same-session interrupt/follow-up regression.
- AC-002 prevents an invalid cleanup/regression where a placeholder local id is passed as Claude resume.
- AC-003 protects normal completed-turn resume behavior.
- AC-004 protects restore/history behavior.
- AC-005 covers the frontend/API/WebSocket path the user exercised.
- AC-006 covers regression safety.

## Approval Status

Design-ready based on explicit user-provided critical bug scope and completed investigation; no user-only scope decision remains open.
