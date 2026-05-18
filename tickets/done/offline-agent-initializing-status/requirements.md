# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready (approved by user on 2026-05-17)

## Goal / Problem Statement

When a user sends a message to an offline team/agent processor from the Electron UI, the selected agent currently remains visually `Offline` for a long period and only changes to `Running` almost when the response appears. The expected behavior is that the backend remains the status source of truth, but the user should see an immediate `Initializing` transition after the message is accepted and before the later `Running`/response state.

## Investigation Findings

Investigation confirms the backend contains an intended `initializing` publication path, but it is placed after slow backend command acceptance. This is a runtime-agnostic lifecycle issue that applies to Codex, Claude Agent SDK, native AutoByteus, and future runtimes. Codex provides the measured example: `backend.postUserMessage` waits for Codex app-server `thread/start`/startup readiness before returning; direct probes measured this thread-start interval at ~24.5-29.2s in repeated runs. Probe tests show both `AgentRun` and `TeamRun` currently emit `initializing` only after their backend post promises resolve, so the frontend cannot show `Initializing` during the cold-start wait.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: User-provided Electron screenshots/problem description; code trace of `AgentRun`, `TeamRun`, Codex `CodexThread.sendTurn`, and `CodexThreadManager.startThread`; direct Codex app-server startup probe; timing probe tests for `AgentRun` and `TeamRun`.
- Requirement or scope impact: The fix must preserve backend authority over status while making the pre-run lifecycle observable promptly in the UI.

## Recommendations

Move authoritative command-start status publication ahead of slow backend startup/send waits. The lifecycle owner should publish `initializing` as soon as a message command is accepted for processing at the run boundary, then allow backend events to overwrite it with `running`, `idle`, or `error`. Do not implement this as frontend-only optimism.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User sends a message to an offline focused agent/team member from Electron.
- UC-002: User watches the selected agent/team status while backend starts or resumes processing.
- UC-003: User sees event monitor/team message entries appear while processing status changes continue to stream.

## Out of Scope

- Changing LLM provider behavior or model latency.
- Reworking unrelated agent statuses not involved in message-triggered offline-to-active processing.
- Adding speculative frontend-only statuses that are not backed by authoritative backend lifecycle events.

## Functional Requirements

- REQ-001: When the backend receives a user/inter-agent message command for an offline or idle run/member and determines the command is syntactically valid and targetable, the authoritative status stream must publish an `initializing` status promptly before awaiting slow runtime startup, restore, provider-specific session/thread creation, Codex `thread/start`, Claude session/query startup, native AutoByteus `postMessage`, or first-turn send work.
- REQ-002: The frontend must render the backend-published `initializing` status for the affected agent/team member without waiting for the final response event.
- REQ-003: The status lifecycle must preserve ordered transitions for the affected actor: `offline` -> `initializing` -> `running`/active execution -> terminal status (`idle`/`offline`/error as governed by existing lifecycle).
- REQ-004: The implementation must not introduce frontend-only optimistic status overrides that can diverge from backend source-of-truth state.
- REQ-005: Native AutoByteus team commands must follow the same command-start invariant: when a concrete target member is resolved, emit member-scoped `AGENT_STATUS initializing` before native `team.postMessage`; when a true no-target/root native post remains after default-target resolution, emit root `TEAM_STATUS initializing` before native `team.postMessage` and do not invent a member identity.
- REQ-006: Pending command-start overlays/caches must be cleared or replaced by runtime/native status events, failures, rejection, termination, or disposal so the UI cannot remain stuck in `initializing`.

## Acceptance Criteria

- AC-001: In a reproduction where an offline processor takes noticeable time before producing a response, the status indicator changes from `Offline` to `Initializing` immediately or near-immediately after the user message is accepted.
- AC-002: The status indicator enters `Running` only when backend execution actually starts, not only when the response is already available.
- AC-003: If backend instrumentation/logging captures lifecycle events, the emitted order includes an `initializing` event before the first `running` event for a cold/offline wake-up, and the `initializing` timestamp precedes Codex `thread/start` completion when Codex startup is slow.
- AC-004: Event monitor message delivery and agent status updates remain independently visible; message arrival must not block or coalesce status rendering until response completion.
- AC-005: A native AutoByteus team command with a delayed native `team.postMessage` emits target member `AGENT_STATUS initializing` before the native post promise resolves; member snapshots and aggregate team status reflect `initializing` while pending.
- AC-006: A native AutoByteus true no-target command emits root `TEAM_STATUS initializing` before delayed native `team.postMessage` resolves and does not emit a member-scoped status for an invented target.
- AC-007: When native or provider startup/send fails after command-start `initializing`, the pending status is cleared or replaced with `error`/terminal status.

## Constraints / Dependencies

- Backend is expected to remain the source of truth for status.
- Electron frontend receives status via the existing backend/event transport path.
- Current codebase structure and existing lifecycle owner should be reused unless investigation shows an ownership issue.

## Assumptions

- The observed issue is reproducible with the currently running Electron setup described by the user.
- `Initializing` is an existing status value in the application domain, not a new product state.

## Risks / Open Questions

- Failure recovery semantics after early `initializing` must be implemented carefully so startup/send rejection does not leave UI stuck.
- Manual Electron verification must use the backend build containing this fix, not a stale process from another checkout.

## Requirement-To-Use-Case Coverage

- REQ-001 covers UC-001 and UC-002.
- REQ-002 covers UC-002 and UC-003.
- REQ-003 covers UC-001 and UC-002.
- REQ-004 covers UC-002 and UC-003.
- REQ-005 covers UC-001 and UC-002 for native AutoByteus teams.
- REQ-006 covers UC-002 and failure recovery.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the user-visible offline-to-initializing expectation.
- AC-002 validates that running is not merely a response-arrival artifact.
- AC-003 validates backend source-of-truth ordering.
- AC-004 validates frontend/event-monitor independence from response completion.
- AC-005 validates native AutoByteus targeted command-start status and snapshot/aggregate reflection.
- AC-006 validates true no-target native root status semantics.
- AC-007 validates failure clearing so initializing is not sticky.

## Approval Status

Approved by user on 2026-05-17 via instruction to kick off the ticket and proceed with proper design.
