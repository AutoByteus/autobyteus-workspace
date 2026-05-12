# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The workspace history/sidebar run row for a single-agent run must display the run's initial user message as the stable task title. In the reported Codex single-agent run, the row under `Workspaces > <workspace> > Codex` shows `do it`, which is a later follow-up message. Agent-team rows already behave as expected by keeping the opening/coordinator message as the run label. Single-agent behavior must be made consistent and stable.

## Investigation Findings

- The screenshot is the workspace history tree, not the separate compact running-run list. The displayed text is rendered from `RunTreeRow.summary` through `WorkspaceHistoryWorkspaceSection.vue`.
- Single-agent history rows come from `RunHistoryItem.summary`, which is populated by the backend run-history index and then projected by `buildRunHistoryTreeNodes` / `mergeRunTreeWithLiveContexts`.
- The single-agent backend already intends first-summary behavior: `AgentRunHistoryIndexService.recordRunActivity` calls `resolveFirstSummary(existing?.summary, input.summary)` and has a sequential unit test asserting later summaries do not replace the first.
- That invariant is not fully protected at the owning boundary because `recordRunActivity` reads the existing row before it enters the store write queue; overlapping activity writes can both observe an empty summary and the later message can win.
- Agent-team history has extra recovery behavior in `TeamRunHistoryService.resolveSummary`, which can recover an empty team summary from the coordinator member's first message. Single-agent history lacks an equivalent recovery/read-side guard.
- The frontend active-history merge overlays status and `lastActivityAt` from a live `AgentContext`, but does not protect/derive the summary from the live conversation's first user message for persisted active rows.
- Focused test execution in the isolated worktree was blocked because the worktree did not have local `node_modules`/`tsc` available.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with small duplicated-policy pressure between agent/team run-history summary handling
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, narrowly scoped
- Evidence basis: `AgentRunHistoryIndexService` first-summary policy is outside the atomic write path; team history has recovery logic that single-agent history lacks; frontend live merge does not guard summaries for active persisted single-agent rows.
- Requirement or scope impact: The fix must place the stable-title invariant at run-history ownership boundaries and add frontend live-row guardrails, not only change label rendering.

## Recommendations

- Treat `summary` for workspace history rows as `initialRunTitle` semantics: first non-empty user message/opening task, not latest activity text.
- Make first-summary preservation atomic inside the run-history index write path for single-agent runs, and avoid leaving the read/resolve/write sequence split across queue boundaries.
- Add single-agent read-side recovery from the canonical run projection when the row is active or the stored summary is missing/incorrect for a live row.
- Add a frontend live-context overlay for single-agent history rows that chooses the first non-empty user message from the live conversation when available, never the latest user message.
- Keep agent-team behavior unchanged, except for shared helper/test adjustments if needed to avoid duplicating first-summary policy.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A newly created single-agent run appears under its agent in the workspace history tree with a title derived from the first/initial user message.
- UC-002: Follow-up user messages sent to an existing single-agent run do not change the workspace history tree row title.
- UC-003: Active Codex single-agent runs retain the opening message title in the workspace tree while live status/time updates continue.
- UC-004: Reloading/refetching workspace history does not replace a single-agent row title with the latest user message.
- UC-005: Agent-team run row title behavior remains unchanged.

## Out of Scope

- Manual run-title editing.
- Changing conversation transcript rendering.
- Changing activity/event rendering.
- Renaming agent/team definitions or run IDs.
- Broad historical migration for every old inactive run; targeted repair for active/missing/incorrect current rows is in scope.

## Functional Requirements

- FR-001: Single-agent workspace history row labels must use the first non-empty user message associated with the run when available.
- FR-002: Accepted follow-up user messages must update `lastActivityAt`/status but must not overwrite the stored or displayed stable run summary.
- FR-003: The first-summary invariant must be enforced by the backend run-history/index owner with an atomic read-modify-write or equivalent single-owner operation.
- FR-004: Active/live single-agent frontend projection must not let a backend stale/latest summary override a known first user message in the live conversation.
- FR-005: Agent-team row title behavior must remain stable and unchanged.
- FR-006: Focused tests must cover the backend first-summary invariant and the frontend live-row summary overlay.

## Acceptance Criteria

- AC-001: Given a single-agent Codex run created with initial message `First task`, when the user later sends `do it`, the workspace tree row still displays `First task` or its existing truncation, not `do it`.
- AC-002: Given a single-agent run with multiple follow-up user messages, refreshing/refetching the workspace history tree while the run is active still shows the first/initial message-derived title.
- AC-003: Backend index activity recording preserves the first non-empty summary under both sequential and overlapping/concurrent activity writes.
- AC-004: Frontend tree projection for an active persisted single-agent row uses the live conversation's first non-empty user message when the live context is available, and never the latest user message.
- AC-005: Existing agent-team summary behavior and tests continue to pass.
- AC-006: Focused validation is documented; if local test execution is blocked by environment setup, the blocker is recorded with the exact command and error.

## Constraints / Dependencies

- Work is isolated in `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message` on branch `codex/single-agent-run-title-initial-message`.
- Base/finalization target is `origin/personal` / `personal`.
- The run-history GraphQL contract currently exposes `summary`; this change should preserve the field name and tighten its semantics rather than introduce a new public API.
- Avoid broad UI rewrites; the visible bug is in workspace history projection/title semantics.

## Assumptions

- “First message” means the first non-empty user message that initiated the run, not the latest follow-up message.
- The screenshot row is the workspace history tree row under the `Workspaces` section.
- Codex is the reported runtime, but the single-agent invariant should be runtime-agnostic.
- There is no supported manual user title that should override the first-message title.

## Risks / Open Questions

- Some already-mutated inactive persisted rows may remain wrong without a broader migration; current scope prioritizes new runs and active/current rows.
- Concurrent write reproduction may require a controlled unit harness because the race is timing-dependent.
- If compaction/internal agent runs intentionally use non-user-message summaries, implementation must avoid breaking those labels or explicitly document why first-message semantics apply there too.

## Requirement-To-Use-Case Coverage

- FR-001 covers UC-001, UC-003, and UC-004.
- FR-002 covers UC-002.
- FR-003 covers UC-002 and UC-004 at the backend persistence boundary.
- FR-004 covers UC-003 and immediate live UI correctness.
- FR-005 covers UC-005.
- FR-006 supports all use cases through regression coverage.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 verifies the user-reported Codex single-agent scenario.
- AC-002 verifies history refresh/reload behavior.
- AC-003 verifies the owning backend invariant, including the likely race not covered by existing sequential tests.
- AC-004 verifies the frontend projection guard.
- AC-005 verifies no team regression.
- AC-006 preserves validation traceability.

## Approval Status

Design-ready based on the user's problem statement and explicit request to continue after interruption. No product clarification is blocking design.
