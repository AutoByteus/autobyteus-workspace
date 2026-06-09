# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement

Fix a Codex-runtime-only Electron/team-chat bug where server notifications that lack explicit thread/turn identity are rendered as error cards inside active agent team chats when more than one team thread is active. The user reported this in the Electron app built from `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`; the visible errors include Codex app server notifications such as `account/rateLimits/updated` and `mcpServer/startupStatus/updated` failing to route among `2 active team threads`.

## Investigation Findings

The error text is emitted by `CodexClientThreadRouter.emitAmbiguousMessageError(...)` on the ticket branch. The branch also intentionally shares one Codex app-server client across same-team Codex member threads. Unscoped Codex app-server telemetry methods such as `mcpServer/startupStatus/updated` and `account/rateLimits/updated` therefore hit the router with `registrations.length > 1`, fail thread/turn matching, and are converted into user-visible `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` runtime errors. `origin/personal` did not emit such errors for no-delivery global notifications, so the regression is the new ambiguity-error branch lacking a global-vs-thread-scoped classification invariant.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: User screenshots match the exact router error string; code comparison shows the ticket branch added no-delivery ambiguity errors; a focused two-thread router probe reproduces the `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` emission for unscoped `mcpServer/startupStatus/updated`.
- Requirement or scope impact: Requirements must distinguish targetable turn/team messages from client-global/runtime telemetry notifications at the Codex shared-client router boundary and prevent global notifications from polluting team chat transcripts.

## Recommendations

Implement a router-owned route-scope classification invariant: known client-global Codex notifications must be consumed/ignored or logged at the router boundary before ambiguity handling, while thread/turn-scoped messages still route by explicit thread/turn identity and can produce diagnostics if they are genuinely missing required identity.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Running an agent team with Codex selected as runtime while multiple team threads are active.
- UC-002: Receiving Codex app server notifications that are global/runtime-scoped and do not carry thread or turn identity.
- UC-003: Receiving targetable agent/team turn notifications that do carry enough identity and should still route to the correct team thread.

## Out of Scope

- Changing Claude-runtime or AutoByteus-runtime behavior except to preserve non-regression.
- Redesigning all team chat rendering or agent lifecycle status beyond notification routing/filtering needed for this bug.
- Changing external Codex app server notification schemas unless an existing adapter already owns normalization.

## Functional Requirements

- REQ-001: The Codex shared-client router must classify client-global Codex app-server notifications, including `account/rateLimits/updated` and `mcpServer/startupStatus/updated`, as non-thread-routable telemetry before ambiguity handling and skip them by default without emitting runtime errors or chat-visible events.
- REQ-002: The app must continue to route targetable Codex runtime notifications that include explicit team/thread/turn identity to the correct active team thread.
- REQ-003: If a notification/request type is expected to be turn/thread-scoped but arrives without sufficient identity, the app may treat it as an AutoByteus router diagnostic/server-side routing warning, but it must not treat the condition as a Codex business/runtime error by default, must not call per-thread `emitRuntimeError(...)`, and must not add user-visible agent conversation content.
- REQ-004: The fix must be scoped to the authoritative notification ingestion/routing boundary so UI rendering components do not need notification-type-specific workaround logic.
- REQ-005: Same-runtime Codex team routing/cleanup must keep an explicit cohort owner, but that cohort owner must not require changing the underlying Codex app-server client/process reuse boundary unless a concrete Codex contract reason is documented.
- REQ-006: Codex app-server client/process reuse should remain scoped by canonical workspace/worktree `cwd` by default; one-client-per-standalone-run or one-client-per-team should be rejected unless implementation investigation proves it is required for a specific Codex correctness issue.
- REQ-007: The fix must audit Claude for analogous provider-client boundary regressions; if no analogous Claude SDK client/process reuse change exists, implementation must not introduce Claude client isolation or performance-affecting lifecycle changes in this bug fix.
- REQ-008: Client-global Codex notifications are potentially useful application/account/runtime signals, but they belong to an explicit global-event consumer if AutoByteus later needs them; until such a consumer exists, the thread router must skip/log them without labeling them ambiguous thread-routing errors.
- REQ-009: The implementation must remove same-runtime cohort abstractions that have no concrete post-fix owner/responsibility, including Codex cohort key generation and the registry-only Claude cohort coordinator, while preserving Claude SDK client/session behavior.

## Acceptance Criteria

- AC-001: In a seeded agent team with at least two active team threads and Codex selected as runtime, triggering or receiving `account/rateLimits/updated` without thread/turn identity is skipped by the router by default and does not add a red error card, status error, or conversation event to any team member.
- AC-002: In the same setup, triggering or receiving `mcpServer/startupStatus/updated` without thread/turn identity is skipped by the router by default and does not add a red error card, status error, or conversation event to any team member.
- AC-003: Valid Codex turn/team notifications with explicit identity still appear in the intended agent/team thread and do not disappear because global notifications are filtered.
- AC-004: Existing Claude-runtime and AutoByteus-runtime team runs keep their current behavior and do not gain new routing errors.
- AC-005: Focused automated tests cover both observed unscoped global Codex notifications (`mcpServer/startupStatus/updated` and `account/rateLimits/updated`) in a multi-active-thread shared-client scenario and assert no `emitRuntimeError` call occurs.
- AC-006: Focused automated tests cover a route-required/no-identity Codex notification or server request while multiple threads are active and assert that any diagnostic remains server-side/non-user-visible: no broadcast, no per-thread `emitRuntimeError(...)`, no agent status `ERROR`, and no team chat event.
- AC-007: Unit coverage verifies same canonical `cwd` Codex runs reuse the same app-server client/process key by default while the explicit team cohort/routing owner still distinguishes team/run membership above that client boundary.
- AC-008: Investigation/design records whether Claude has an analogous provider-client reuse regression; if not, focused Claude validation remains limited to non-regression and does not change `ClaudeSdkClient` reuse semantics.
- AC-009: The router code/design avoids naming or treating known client-global Codex methods as ambiguous thread errors and leaves a simple future path for an explicit global-event consumer without adding that consumer in this ticket.
- AC-010: No production code imports or instantiates `CodexTeamThreadCohortCoordinator`, `ClaudeTeamSessionCohortCoordinator`, or `TeamRuntimeCohortIdentity`; focused Codex and Claude tests still pass.

## Constraints / Dependencies

- Base-branch clarification: implementation must be based on the ticket branch `codex/mixed-team-manager-simplification-analysis`, per user clarification on 2026-06-08.
- Prior Codex client-boundary constraint: previous Codex runtime work selected one app-server client per canonical `cwd` and rejected one-client-per-session/thread; this ticket should not override that without explicit evidence.
- Claude audit constraint: Claude has a different provider model; do not apply Codex workspace-client rules mechanically to Claude. Preserve existing `ClaudeSdkClient` reuse unless a Claude-specific issue is found.
- Must work in the Electron app/server/frontend flow from the existing branch.
- Must preserve the existing seeded-team development workflow if available.
- Must not require Codex runtime notifications to carry thread identity when their subject is account/MCP-runtime telemetry rather than a turn.

## Assumptions

- The screenshots reflect the branch state or a closely related build from this worktree.
- The visible text `did not include enough thread or turn identity to route among 2 active team threads` is emitted by repository code and can be traced to the notification routing boundary.

## Risks / Open Questions

- The runtime reproduction may require Codex account credentials or an Electron build configuration not available in this shell.
- The correct treatment of global notifications may already exist for Claude/AutoByteus paths but may be bypassed by Codex adapter code.
- Product decision from user on 2026-06-08: unrouteable/global Codex telemetry notifications are not errors; skip them by default or log only diagnostically/debug-level because some app-server notifications are not useful to AutoByteus team chat behavior.

## Requirement-To-Use-Case Coverage

- REQ-001 covers UC-001 and UC-002.
- REQ-002 covers UC-003.
- REQ-003 covers UC-002 and UC-003.
- REQ-004 covers UC-001 through UC-003.
- REQ-005 covers UC-001.
- REQ-006 covers UC-001 and UC-003.
- REQ-007 covers UC-001 through UC-003 as a non-regression/audit constraint.
- REQ-008 covers UC-002.
- REQ-009 covers UC-001 through UC-003 as cleanup required by the simplified ownership design.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates `account/rateLimits/updated` global notification handling.
- AC-002 validates `mcpServer/startupStatus/updated` global notification handling.
- AC-003 validates targetable notification preservation.
- AC-004 validates non-Codex runtime non-regression.
- AC-005 validates durable executable coverage for the two observed global notifications.
- AC-006 validates that missing-identity diagnostics do not become user-visible Codex/runtime errors or broadcasts.
- AC-007 validates client-boundary preservation while allowing explicit cohort routing ownership.
- AC-008 validates the Claude-side audit and prevents unnecessary Claude client lifecycle changes.
- AC-009 validates that global Codex events are classified as global signals, not ambiguous thread errors.
- AC-010 validates removal of empty cohort abstractions without changing runtime behavior.

## Approval Status

Approved/refined by user on 2026-06-08: global/unrouteable Codex telemetry should be skipped or debug-logged, not treated as errors; even route-ambiguous/no-identity app-server messages are AutoByteus router diagnostics rather than Codex business/runtime errors by default; Codex app-server client reuse must preserve the prior canonical-workspace/cwd boundary; empty same-runtime cohort abstractions should be removed in this ticket, including the registry-only Claude cohort, while preserving Claude SDK/session behavior. Ready for architecture review.
