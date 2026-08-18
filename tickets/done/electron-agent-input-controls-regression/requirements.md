# Requirements Doc

## Status

`Design-ready — approved by user on 2026-08-18`

## Goal / Problem Statement

Restore the released composer behavior for the focused member of an AgentTeam run. On the AgentTeam universal-task-delegation branch, the member message is submitted but the typed draft remains visible, successful voice transcription does not become visible, and context-attachment removal leaves a stale visible item. The correction must restore one coherent AgentTeam composer state without changing the already-working standalone Agent behavior or redesigning the shared composer, voice service, attachment protocol, backend, or event monitor.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | For an AgentTeam member, pressing Enter adds one user event to the event monitor, but the submitted text remains visible in the composer. Standalone Agent submission clears normally. | When an AgentTeam member submission reaches local admission, the submitted draft clears visibly exactly once and the composer reflects the pending state. | The user event is still created once. A failure before local admission leaves the draft intact; an error after local admission remains represented by the existing submitted-event/error flow rather than repopulating the draft. | `REQ-001`, `REQ-005`, `REQ-006`; `AC-001`, `AC-006`, `AC-007`. |
| `BEH-002` | For an AgentTeam member, Speak/Stop records and reaches transcription, but a successful transcript does not become visible in that member's composer. Standalone Agent voice input works. | A successful transcript is merged into the AgentTeam member draft captured when recording began and is visible when that member is focused; it is not auto-submitted. | Existing Speak/recording/Stop, no-speech, empty-transcript, error, and focus-target behavior remain unchanged. | `REQ-002`, `REQ-005`, `REQ-006`; `AC-002`, `AC-005`–`AC-007`. |
| `BEH-003` | A pasted AgentTeam context image can remain visibly present after individual remove or **Clear all**, even though the underlying attachment array can already have changed. | Individual remove and **Clear all** keep the visible tray and the authoritative focused-member attachment collection in immediate agreement. | Pasting/uploading supported items, preserving unrelated text, and retaining an item when its draft-file deletion fails remain unchanged. | `REQ-003`, `REQ-005`, `REQ-006`; `AC-003`, `AC-005`–`AC-007`. |
| `BEH-004` | The user observed a still-visible pasted image missing from the submitted event. Investigation shows the current transport and backend/event-projection path already carries nonremoved attachments; the stale Team tray can instead display an item that removal already excluded from authoritative state. | A visibly staged, completed, nonremoved attachment is sent and shown on the submitted event; a removed attachment is absent from both. Visible Team state and outbound state cannot disagree. | Existing attachment finalization, wire fields, backend `ContextFile` creation, member-input event projection, and event rendering remain the governing contract. | `REQ-004`–`REQ-006`; `AC-004`–`AC-007`. |
| `BEH-005` | Standalone Agent text clearing and voice insertion work in the same delivered Electron build. | They continue to work unchanged. | Standalone Agent state ownership and shared component behavior are not refactored for this AgentTeam-only defect. | `REQ-005`, `REQ-006`; `AC-006`, `AC-007`. |

## Investigation Findings

- The authoritative base is `origin/codex/agent-team-universal-task-delegation@cc4e0611a03ad5e123fe561c64ed56a4784492ef`; the released comparison is `origin/personal@acb8985930ccce49b632cdca22b92f5b237e35bf`.
- The user's standalone-versus-Team comparison isolates both text clearing and voice insertion to AgentTeams.
- The shared textarea component, voice store, input form, attachment send planner, and user-message renderer are byte-identical to `origin/personal`; the defect is not four separate regressions in those shared modules.
- The refactor introduced `TeamExecutionViewState`. Its context registry is a shallow-reactive `Map`; association makes only `AgentContext.state` reactive and stores the raw top-level `AgentContext`. Composer fields `requirement`, `contextFilePaths`, and `submissionPending` live at that raw top level.
- A focused executable probe using the real Team view showed those three raw values mutate, while Vue computed consumers remain stale; `state.currentStatus` reacts correctly. This reproduces the exact split reported by the user: event-monitor state changes, composer state does not.
- The complete existing attachment wire/backend/event path passed its focused tests. No separate backend contract defect has been found.
- Existing component tests construct reactive mock contexts, while the Team send workflow stubs the send method. They therefore bypass the real Team context association defect.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/ui-ux-spec.md` | Focused AgentTeam composer interaction and observable-state contract | `REQ-001`–`REQ-006` | `AC-001`–`AC-007` | `Approved by user on 2026-08-18` | Defines the intended UI transitions and is part of this requirements basis. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `No`
- Root cause classification: `Local Implementation Defect`
- Refactor posture: `Likely Not Needed`
- Evidence basis: the new `TeamExecutionViewState` is the correct Team aggregate owner, but it stores a raw `AgentContext` while shared consumers require its top-level composer fields to be reactive. The event-monitor state nested under `AgentContext.state` already updates correctly. Standalone Pinia-owned contexts behave correctly.
- Requirement or scope impact: correct the Team context association/reactivity boundary and prove all observed Team journeys. Do not add Team-only composer state, manual revision counters, component workarounds, or backend changes without new contradictory evidence.

## Recommendations

- Fix the single AgentTeam context-association invariant so all `AgentContext` fields used by shared reactive consumers behave consistently.
- Exercise initial and dynamically associated Team member contexts through the same invariant.
- Add behavior-level regression coverage using the real Team view rather than reactive test doubles.
- Retain focused attachment transport/event tests as contract evidence; add only the missing Team-composer-to-payload proof downstream determines is necessary.

## Scope Classification

`Small` — one bounded AgentTeam state-association defect explains all reported symptoms. Validation spans several interactions because they are separate observable consequences of that one defect.

## In-Scope Use Cases

1. Focus an existing AgentTeam member, type a draft, press Enter, observe one submitted event, and observe the Team composer clear after local admission.
2. Focus an AgentTeam member, record with Speak/Stop, receive a successful transcript in that member's draft, and submit manually if desired.
3. Stage two AgentTeam context items, remove one, then clear the rest; observe the visible tray and authoritative member state agree after each action.
4. Submit an AgentTeam message with a completed, nonremoved context attachment and verify the existing outbound request and event-monitor representation; verify a removed item is absent.
5. Switch focused Team members and verify text, transcript, attachments, and pending state remain isolated to their exact member context.
6. Confirm standalone Agent text clearing and voice insertion remain unchanged.

## Out of Scope

- Standalone Agent redesign or changes to its working state owner.
- New voice-recognition features, transcription models, languages, device selection, or media permissions.
- Event-monitor redesign or new attachment presentation.
- Attachment storage/protocol/backend changes unless implementation evidence contradicts the verified current contract.
- Mobile Team-draft attachment workflows, AgentTeam topology, delegation behavior, or run persistence.
- Any data migration, schema change, or production-profile mutation.
- Running automation against or interrupting the user's active Electron process.

## Functional Requirements

### `REQ-001` — Restore focused AgentTeam text-clear and pending-state visibility

When the existing AgentTeam send flow admits a focused member's draft locally, the visible composer must observe the cleared `requirement` and current `submissionPending` value from that same member context. A failure before local admission must leave the draft intact. Existing post-admission error-event behavior is preserved.

### `REQ-002` — Restore focused AgentTeam voice transcript visibility

A successful composer voice result must merge into the exact AgentTeam member context captured when recording began. That draft mutation must become visible whenever that same member is focused and must not auto-submit. Existing no-speech, empty, and error outcomes must remain unchanged.

### `REQ-003` — Restore focused AgentTeam attachment-tray consistency

Individual remove and **Clear all** must keep the visible tray synchronized with the exact focused member's authoritative `contextFilePaths`. Successful deletion removes the item; a draft-file deletion failure retains it. Neither action may alter another member's attachments or unrelated text.

### `REQ-004` — Prove staged-versus-removed attachment submission semantics

A completed, visibly staged, nonremoved Team member attachment must continue through the existing finalization, wire, backend, member-input event, and renderer contract. An attachment removed before send must be absent from the authoritative send input, outbound wire fields, and submitted event.

### `REQ-005` — Preserve member identity and existing shared owners

Text, voice, attachments, and pending state must remain isolated by exact AgentRun/member identity, including focus changes and dynamically discovered Team members. Shared composer/voice/attachment modules and the event monitor remain reusable consumers; the Team execution view remains the Team aggregate owner.

### `REQ-006` — Keep the correction bounded and regression-tested

The change must address the AgentTeam reactive-state invariant rather than patching each component independently. Durable coverage must use actual TeamExecutionViewState-associated contexts for the observed UI transitions, preserve standalone Agent behavior, and retain/prove the existing attachment request and event path using isolated synthetic data.

## Acceptance Criteria

### `AC-001` — AgentTeam Enter submission clears once

Given a focused AgentTeam member with a nonempty draft, Enter causes exactly one local user event and the visible Team composer becomes empty after local admission while pending state is observable. If the flow rejects before local admission, the draft remains and no false local user event is created.

### `AC-002` — AgentTeam voice Stop inserts into the captured member draft

Given a successful isolated transcription, Speak -> Stop merges the transcript with the draft of the Team member captured at recording start, makes it visible when that member is focused, and does not submit it. Switching focus during transcription does not write into a different member.

### `AC-003` — AgentTeam remove and Clear all are visibly authoritative

With two staged items on one Team member, successful individual removal leaves only the other item and **Clear all** leaves none. After each action, visible items equal that member's authoritative attachment collection, and another member's draft remains unchanged. A simulated draft-delete failure retains its item.

### `AC-004` — Attachment staging state matches wire and event state

For one completed, nonremoved image/file, an isolated Team submission proves the existing wire request contains the correct image URL or context-file path and the submitted event represents the retained attachment. After removing the item before send, the request and event omit it.

### `AC-005` — Initial and dynamically associated Team members share the invariant

Both an initially hydrated Team member and a member created through a later execution-tree association expose reactive text, attachments, pending state, and nested runtime state without cross-member leakage.

### `AC-006` — Standalone Agent behavior does not regress

Existing standalone Agent text submission still clears and successful standalone voice transcription still becomes visible; no standalone owner or protocol change is required.

### `AC-007` — Validation is isolated and closes the real coverage gap

Automated validation uses real Team view association with synthetic fixtures, not only manually reactive component mocks or a stubbed Team send action. It runs without the user's production data and without stopping, replacing, or controlling the active Electron process.

## Constraints / Dependencies

- Base: `origin/codex/agent-team-universal-task-delegation@cc4e0611a03ad5e123fe561c64ed56a4784492ef`.
- Released comparison: `origin/personal@acb8985930ccce49b632cdca22b92f5b237e35bf`.
- The shared composer relies on Vue dependency tracking; raw mutations that merely change the object in memory are insufficient.
- Electron audio capture/transcription itself is not implicated by the Agent-versus-AgentTeam comparison; target validation may inject a successful transcript at the result boundary.
- Browser-equivalent/UI tests and isolated server tests are preferred; packaged Electron validation is downstream and only if it can avoid the live profile/process.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: no persisted subject changes; affected values are per-run frontend composer session state.
- Required outcome: `Not Affected`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: none.
- Unacceptable data loss or corruption: cross-member draft mutation, sending an attachment already removed from authoritative state, or omitting a completed attachment that remains authoritatively staged.
- Relevant availability, maintenance-window, or rollout constraints: no production-data validation and no application migration.
- Related requirement and acceptance-criteria IDs: `REQ-001`–`REQ-006`; `AC-001`–`AC-007`.

## Assumptions

- The user's observations were made on the delivered build from the recorded base.
- `origin/personal` defines the released shared-composer behavior unless the current branch has an intentional documented replacement.
- Successful voice transcription is available because standalone Agent voice input works in the same application; the failure is Team result propagation.
- The verified attachment protocol remains valid; the ticket corrects stale Team staging presentation unless new executable evidence shows an independent defect.

## Risks / Open Questions

- The API/E2E coverage investigation must decide whether one real browser integration test can efficiently cover all Team composer consequences or whether focused component/store tests provide the more durable split.
- Actual microphone transcription is environment-dependent and should not be the only proof of Team transcript propagation.
- No material root-cause unknown remains. Any backend change proposal would require new failing evidence because the current contract tests pass.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| `REQ-001` | 1, 5 |
| `REQ-002` | 2, 5 |
| `REQ-003` | 3, 5 |
| `REQ-004` | 4 |
| `REQ-005` | 1–6 |
| `REQ-006` | 1–6 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Real Team context local admission updates textarea and pending state |
| `AC-002` | Voice result targets and updates the exact Team member |
| `AC-003` | Single/all removal produces visible-authoritative agreement and member isolation |
| `AC-004` | Retained versus removed attachment reaches or does not reach wire/event path |
| `AC-005` | Initial and dynamic member association use the same reactive invariant |
| `AC-006` | Working standalone Agent path remains unchanged |
| `AC-007` | Durable tests exercise the actual missing boundary in isolation |

## Approval Status

`Approved explicitly by the user on 2026-08-18 after confirmation of the AgentTeam-versus-standalone root-cause comparison.`
