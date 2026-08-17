# Requirements Doc

## Status (`Approved`)

## Goal / Problem Statement

Correct the supported Agent Team workspace path where a user launches the imported Classroom Simulation Team with the Codex runtime and `gpt-5.6-luna`, sends a message, and receives no live Agent output. The correction must restore the exact provider-to-Team-to-browser event stream, keep status and conversation identity truthful, and prevent a sequence discontinuity from leaving the workspace silently stale.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The real Classroom Simulation Team launches successfully with Codex/`gpt-5.6-luna`; a user message reaches the exact Professor AgentRun and Codex completes the requested response, but the response is absent from the live workspace. | The same supported browser action streams and renders the exact Professor AgentRun response before any refresh. | Team launch, exact AgentRun routing, rooted TeamRun identity, local optimistic user-message presentation, and Codex provider behavior remain unchanged. | R-001–R-004; AC-001–AC-005 |
| BEH-002 | Every live Team `AGENT_STATUS` projection includes snapshot-only `member_address`; the strict live status schema rejects it after the root publisher has assigned a change sequence. Later valid member-input, turn, segment, token, and terminal messages consequently reach the browser with sequence gaps and are rejected. | Snapshot status and live status retain distinct exact contracts: snapshots correlate AgentRun plus logical address; live events correlate the exact AgentRun and status details only. Every supported status event projects successfully and the resulting Team event sequence is contiguous. | Strict shared Team transport validation remains authoritative; no relaxed parser or extra-field tolerance is introduced. | R-002–R-004, R-008; AC-003–AC-006, AC-011 |
| BEH-003 | `TeamExecutionViewState` correctly rejects a non-next sequence and returns `snapshot_refresh_required`, but `TeamStreamingService` returns on `disposition: rejected` before executing that effect. The connection stays stale and all later events are rejected. | A detected sequence discontinuity applies no stale delta and is handled once by the established Team-stream recovery boundary; the product must not silently remain connected while rejecting every later event. | Exact-next-sequence admission and atomic initial structural-snapshot replacement remain unchanged. | R-005–R-006; AC-007–AC-009 |
| BEH-004 | The missing Codex responses are persisted correctly and appear after browser refresh plus Team-run reopen. | Existing persisted Team/Agent history remains directly readable and restored content is identical to the successfully rendered live content, without duplication. | Persistence schemas and migration history remain unchanged. | R-007; AC-002, AC-010 |
| BEH-005 | Realistic reproduction can use the user-authorized env import and Agent package while targeting a disposable server-data root, database, and ports. | Validation continues to use isolated state and records safety evidence without exposing secret values. | Operational `$HOME/.autobyteus` data and protected ports `60004`/`31004` remain untouched. | R-009–R-011; AC-012–AC-015 |

## Investigation Findings

- The failure is reproduced on the exact requested base, `origin/codex/agent-team-universal-task-delegation@37739aa2bd718e3e1a53587c1d8604d353d334cb`, through the real browser UI and imported Classroom Simulation Team.
- Codex is not failing to generate output. The provider/Team wire capture contains the exact requested response and terminal turn events, and the response is later restored from persisted history.
- The first defective boundary is the live Team status projector. It reuses the snapshot status DTO, adding `member_address` to a strict live `AGENT_STATUS` payload that allows only `change_sequence`, `agent_run_id`, and status details.
- The root event publisher assigns the status event a sequence before the stream subscriber projects it. Projection failure is isolated and logged, so the next delivered message skips that number.
- The browser correctly detects the gap, but the connection service does not run the reducer's `snapshot_refresh_required` effect because it returns first on the rejected result.
- The defect is provider-neutral at the Team streaming boundary. Codex is the verified production witness; any Team runtime producing the same live status event reaches the defective mapper.
- The status projection regression was introduced when the universal-delegation checkpoint separated snapshot identity from the new exact live `agent_run_id` contract but reused one status projection function for both contexts.

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related Requirements / ACs | Approval Applicability |
| --- | --- | --- | --- |
| `solution-self-validation.md` | Confirms design-principle, production-path, ownership, recovery-state, persisted-data, and acceptance-coverage completeness for the approved basis | R-001–R-011; AC-001–AC-016 | N/A — validation evidence, not intended behavior |

The retained `investigation-evidence/` files are non-normative reproduction evidence and are indexed in `investigation-notes.md`.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix with bounded boundary cleanup`
- Root cause classification: `Shared Structure Looseness` at the server snapshot/live status DTO boundary, plus a `Local Implementation Defect` in frontend rejection-effect dispatch.
- Refactor needed now: `Yes, bounded`.
- Required posture: give snapshot status projection and live status event projection semantically distinct shapes; keep one strict Team transport contract and one Team stream recovery owner; remove the dead/unreachable effect-dispatch ordering.
- Not justified: provider-specific Team paths, relaxed validation, compatibility aliases, duplicate event readers, guessed data, replay/outbox machinery, or persisted schema changes.

## Recommendations

1. Correct the shared Team status projection boundary rather than patching Codex or the conversation renderer.
2. Preserve strict schemas and make snapshot-versus-live identity differences explicit in names, types, and focused coverage.
3. Make the existing sequence-gap effect reachable through one frontend recovery owner, with one in-flight recovery per root and no stale message mutation.
4. Validate the complete real producer-to-wire-to-browser path, not only a fabricated segment message.

## Scope Classification (`Medium`)

The primary defect is narrow, but the supported path crosses the root Team event publisher, strict shared wire contracts, server projection, browser sequence admission, stream recovery, and rendered conversation. The design must close that boundary without reopening canonical Team identity or provider architecture.

## In-Scope Use Cases

- **UC-001:** Import/select the Classroom Simulation Team, configure its members with Codex and `gpt-5.6-luna` at medium reasoning, launch it, send a user message to the Professor, and observe the exact live response.
- **UC-002:** Carry live Team status, turn, segment, token, and terminal events through one contiguous sequence for the exact AgentRun.
- **UC-003:** Detect a non-next Team sequence without applying stale content and execute one truthful recovery transition instead of silently rejecting all later messages.
- **UC-004:** Refresh/reopen the Team workspace and observe the same persisted response without duplication or identity drift.
- **UC-005:** Preserve equivalent supported Team live-stream behavior for other providers and preserve standalone Agent streaming outside this Team boundary.
- **UC-006:** Validate through isolated browser/server state using the real imported Agent package and user-authorized credentials.

## Out of Scope

- Changing Codex event generation, turn admission, model configuration, or provider lifecycle without new evidence.
- Changing universal task-delegation semantics, absolute AgentTeam addressing, rooted TeamRun execution identity, or message routing.
- Editing `/Users/normy/autobyteus_org/autobyteus-agents`.
- Migrating or rewriting Team execution/history data; the stored responses are already correct and directly usable.
- Adding backward-compatibility, fallback, dual-read, relaxed-validation, guessed-default, retry/replay, or provider-specific Team bypass code.
- Mutating, repairing, resetting, or inspecting the operational production database beyond the already authorized non-secret environment import.

## Functional Requirements

- **R-001:** A valid message sent from the Agent Teams workspace shall render the exercised Codex Agent's streaming response under the exact focused AgentRun before any browser refresh or Team-run reopen.
- **R-002:** Every supported Team Agent status event shall be admitted by the current strict live Team transport contract and shall retain the exact `agent_run_id`, status, trigger, tool, and error details emitted for that AgentRun.
- **R-003:** Snapshot status identity shall continue to include the logical member address needed to validate the complete execution snapshot; live status events shall not carry snapshot-only identity fields.
- **R-004:** For a normal supported Team turn, all accepted member-input, status, turn, segment, token-usage, error, and terminal events shall reach the browser in the root publisher's contiguous order without fabricated, dropped, duplicated, cross-Agent, or reordered content.
- **R-005:** The browser shall reject a non-next Team change sequence before mutating execution or Agent conversation state.
- **R-006:** A sequence-gap rejection shall trigger exactly one owned Team-stream recovery transition for that root, shall prevent a reconnect storm or repeated stale mutations, and shall not leave the workspace silently accepting commands as if the stream were healthy. If recovery cannot complete, the existing user surface shall present a truthful actionable stream error.
- **R-007:** Existing Team and Agent history shall remain directly usable without migration; a response rendered live shall restore identically after refresh/reopen, and a response missed by the current defect shall remain recoverable through the supported reopen path.
- **R-008:** The correction shall preserve strict shared contracts and forward-only runtime code; it shall not add compatibility aliases, relaxed parsers, fallback serializers, duplicate projection paths, provider-specific Team handling, or guessed identity/status data.
- **R-009:** Reproduction and later validation shall use the Classroom Simulation Team imported from `/Users/normy/autobyteus_org/autobyteus-agents` without modifying that repository.
- **R-010:** Codex validation shall use `gpt-5.6-luna` with medium reasoning through the supported Team configuration surface.
- **R-011:** Test setup may import `/Users/normy/.autobyteus/server-data/.env`, but secret values shall not be printed, copied into evidence, or committed; all live testing shall use a disposable database/server-data root and non-protected ports.

## Acceptance Criteria

- **AC-001:** From a clean isolated start, the real imported Classroom Simulation Team can be selected, configured with Codex/`gpt-5.6-luna` at medium reasoning, launched, and messaged through the frontend.
- **AC-002:** The exact requested Codex response becomes visible incrementally or at completion under the focused Professor AgentRun without refresh and remains identical after refresh/reopen.
- **AC-003:** A real Team `AGENT_STATUS` event passes the strict shared live schema and its wire payload contains `change_sequence`, `agent_run_id`, and exact status details but no `member_address`.
- **AC-004:** An initial execution snapshot continues to contain one exact status row per live AgentRun with both `agent_run_id` and `member_address`, and the browser validates that association.
- **AC-005:** One correlated producer-to-browser trace shows the same root TeamRun and AgentRun across member input, running status, turn start, segment lifecycle, terminal state, and final status.
- **AC-006:** The supported live turn has consecutive admitted change-sequence values; no successfully published status event is logged as an unrecognized-key projection failure.
- **AC-007:** A focused sequence-gap test proves the stale delta is not applied, the target `team_stream_recovery_required` effect is acted on despite the rejection disposition, and only one recovery transition is started for the root.
- **AC-008:** While recovery is in progress, later messages from the stale connection do not mutate Team execution or Agent conversation state and do not initiate additional recovery loops.
- **AC-009:** A known Team-stream continuity loss that cannot be truthfully repaired by the structural snapshot is visible as an actionable reopen error rather than an indefinitely silent or falsely ready workspace.
- **AC-010:** The response and existing Team/Agent history remain readable without a migration, compatibility reader, or data rewrite, and no duplicate response appears after reopen.
- **AC-011:** Focused contract tests independently prove the snapshot status DTO and live status event DTO exact shapes, preventing future reuse of a snapshot-only field in live events.
- **AC-012:** The real imported Classroom Simulation package is used without source edits.
- **AC-013:** Evidence proves `gpt-5.6-luna` and the Codex runtime were selected; the model's default medium reasoning or explicit medium setting is preserved.
- **AC-014:** Evidence contains no credential values and source/evidence scans find no introduced secrets.
- **AC-015:** Cleanup evidence proves the disposable server/web ports are closed and protected ports `60004`/`31004` plus the operational database were not targeted or mutated.
- **AC-016:** Existing focused Team stream, execution-state, status-snapshot, restore/hydration, and provider-neutral regression coverage is re-evaluated and updated proportionately by the downstream coverage owner.

## Constraints / Dependencies

- Base and upstream: `origin/codex/agent-team-universal-task-delegation` at `37739aa2bd718e3e1a53587c1d8604d353d334cb`.
- Shared transport package: `@autobyteus/team-stream-contracts` remains the exact server/browser wire authority.
- `TeamRunEventPublisher` remains the non-persisted root sequence/barrier owner.
- `TeamExecutionViewState` remains the exact-next-sequence admission and execution-view mutation owner.
- Codex provider output is verified healthy and must not receive a Team-specific workaround.
- Browser validation must use isolated services and the user-authorized secret import without exposing values.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: existing Team execution package, Agent conversation/history projections, Team task records, and Team communication messages.
- Required outcome: `Directly Usable — No Migration`.
- Evidence: both responses that failed to render live were visible after a normal browser refresh and Team-run reopen from the same disposable store.
- Data to preserve: exact existing Team/Agent history and execution identity.
- Unacceptable data loss or corruption: any operational `$HOME/.autobyteus` mutation, lost response history, duplicate conversation content, or rewritten Team execution packages.
- Related requirement and acceptance-criteria IDs: R-007–R-008, R-011; AC-002, AC-010, AC-014–AC-015.

## Assumptions

- The strict Team contract is authoritative; the target fixes the producer shape rather than weakening admission.
- The supported Team workspace continues to use one WebSocket stream per root TeamRun and exact AgentRun focus.
- A provider-independent fix is required because the defective mapper handles all Team Agent status events.

## Risks / Open Questions

- The detailed design must decide how the existing recovery effect is serialized at the connection boundary without introducing a second recovery owner or pretending that a structural snapshot itself is full conversation history.
- Focused test coverage currently validates snapshot status and other live Agent events separately but does not exercise live status through the strict projection seam; the design must close that test-contract gap.
- A stream projection failure is a programming defect, not ordinary provider behavior. Recovery must remain proportionate and must not add replay/outbox machinery.

## Requirement-To-Use-Case Coverage

| Requirement IDs | Use Cases |
| --- | --- |
| R-001–R-004 | UC-001, UC-002, UC-004, UC-005 |
| R-005–R-006 | UC-003 |
| R-007–R-008 | UC-002–UC-005 |
| R-009–R-011 | UC-001, UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-006 | Real Classroom Simulation Codex launch/message/live-response event spine |
| AC-007–AC-009 | Sequence-gap rejection and single truthful recovery behavior |
| AC-010–AC-011 | Directly usable history and exact snapshot/live status contract seams |
| AC-012–AC-015 | Real package/model configuration, secret safety, isolation, and cleanup |
| AC-016 | Downstream durable-coverage validity decision |

## Approval Status

Approved by the user on 2026-08-17 with the instruction to continue into design. During design, the internal target effect name was tightened from the misleading current `snapshot_refresh_required` to `team_stream_recovery_required`; this does not change the approved recovery behavior. No architecture-review handoff had been sent before approval.
