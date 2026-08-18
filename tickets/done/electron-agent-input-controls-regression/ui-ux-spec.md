# UI/UX Specification

## Status

`Requirements-ready — approved by user on 2026-08-18`

## UX Goal

Make the focused AgentTeam member composer truthful and predictable: text, successful voice transcript, attachment tray, pending state, submitted event, and outbound attachment state must all reflect the same exact member context. Restore this behavior without changing the working standalone Agent experience or the visual design.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006`
- Acceptance criteria: `AC-001`, `AC-002`, `AC-003`, `AC-004`, `AC-005`, `AC-006`, `AC-007`

## Users / Personas / Contexts

- An Electron user continuing or starting an AgentTeam run and sending input to its focused member.
- The same user switching between AgentTeam members while each member retains an independent draft.
- A standalone Agent user whose currently working behavior must remain unchanged.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| `UXJ-001` | Focused AgentTeam member | Nonempty text draft; send permitted | Submit once by Enter or Send | One local event exists; focused composer is empty and pending state is current | `REQ-001`, `REQ-005`; `AC-001`, `AC-005` |
| `UXJ-002` | Focused AgentTeam member using voice | Optional existing draft; voice available | Dictate into that exact member's draft | Successful transcript is visibly merged; no send occurs | `REQ-002`, `REQ-005`; `AC-002`, `AC-005` |
| `UXJ-003` | Focused AgentTeam member with staged items | Two completed staged attachments | Remove one, then clear all | Tray and authoritative member collection show one, then zero | `REQ-003`, `REQ-005`; `AC-003`, `AC-005` |
| `UXJ-004` | Focused AgentTeam member sending context | One completed attachment remains staged | Send the attachment with text | Submitted event represents the retained item and wire request carries it | `REQ-004`; `AC-004` |
| `UXJ-005` | User switching Team focus | Member A and B have separate drafts | Continue work without cross-member leakage | Each member shows only its own text/transcript/attachments/pending state | `REQ-002`, `REQ-003`, `REQ-005`; `AC-002`, `AC-003`, `AC-005` |
| `UXJ-006` | Standalone Agent user | Working standalone composer | Continue normal text and voice use | Existing clear/transcript behavior is unchanged | `REQ-005`, `REQ-006`; `AC-006` |

## Journey Details

### `UXJ-001` — Submit focused Team member text

1. The user focuses a sendable AgentTeam member and types text.
2. Enter/Send uses the existing primary-action rules; disabled or interrupt states remain unchanged.
3. When the submission is admitted locally, one user event appears immediately.
4. The exact member's visible draft becomes empty and the current pending state disables repeat submission as it does today.
5. A pre-admission rejection leaves the draft untouched. A later transport failure remains represented by the existing local event plus error state; the already-admitted text is not silently reinserted.

### `UXJ-002` — Insert successful voice transcript

1. The user optionally types a partial draft, then chooses Speak.
2. Recording/Stop and transcribing feedback remain as currently designed.
3. The voice owner retains the exact member context captured at recording start.
4. On a successful nonempty result, the transcript is merged with that captured member's draft and is visible when that member is focused.
5. No message is sent automatically. No-speech, empty, and error results retain the draft and existing feedback.

### `UXJ-003` — Remove staged Team context

1. The user stages two supported attachments for one Team member.
2. On successful individual removal, that item disappears and the other stays.
3. **Clear all** removes every remaining successfully deletable item.
4. If uploaded draft-file deletion fails, that item remains visible and authoritative; the UI must not claim removal.
5. Text and other Team members' attachments do not change.

### `UXJ-004` — Submit retained versus removed context

1. A completed attachment that remains visibly staged is included in the member's existing submission lifecycle.
2. The immediate local event and eventual member-input projection represent the retained attachment using the existing presentation.
3. If the user removes the attachment first, it disappears from the tray and is absent from the send input, wire request, and event.

### `UXJ-005` — Switch Team focus safely

1. The user begins text, voice, or attachment work for member A.
2. Member B can be focused without receiving member A's state.
3. A voice session that began on A resolves back to A even if B is focused when transcription completes.
4. Returning to either member displays its own current state.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Agent user input textarea | Edit focused member text and trigger primary action | Exact AgentTeam member is focusable | empty, draft, pending, running/interrupt, disabled | Send, Speak, switch focus |
| Speak/Stop control | Capture and transcribe voice | Voice available; composer target captured | idle, recording, transcribing, success, no speech, error | Edit inserted text or retry |
| Context-file input area | Stage, preview, remove, and clear context | Exact member/draft owner resolved | empty, uploading, staged, delete failure | Send, remove, clear, open |
| Event monitor user message | Show locally admitted and projected user input | Submission admitted | text-only, context attached, error later | Continue run |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Team draft sendable | Press Enter/Send | Existing local event appears | Exact member draft empty; pending current | One local user message; send lifecycle starts | Wait/interrupt according to existing rules |
| Send rejected before local admission | Press Enter/Send | Existing error path | Draft remains | No local user event | Correct/retry |
| Transport fails after admission | Existing local send later errors | Existing error event/state | Admitted draft stays cleared | Local user + error representation | Recover per existing run controls |
| Voice recording | Press Stop | Transcribing state | Existing draft remains until result | Audio sent to existing transcription service | Wait |
| Voice success | Nonempty transcript returns | Existing completion transition | Captured member draft visibly contains merged transcript | No send | Edit or send |
| Voice no speech/empty/error | Result returns | Existing informational/error feedback | Draft unchanged | No send | Retry/type |
| Attachment staged | Upload completes | Item appears | Tray matches member attachments | Draft upload retained | Remove/clear/send |
| Individual removal succeeds | Click remove | Existing asynchronous delete completes | Only selected item disappears | Exact attachment removed from member | Continue |
| Individual removal fails | Click remove | Existing error handling | Item remains | Authoritative state unchanged | Retry/continue |
| Clear all succeeds | Click Clear all | Existing asynchronous deletes complete | Tray empty | Member attachment collection empty | Continue |
| Retained attachment send | Press Enter/Send | User event appears with existing context presentation | Composer clears | Existing wire/backend/event path carries attachment | Continue |

## Markdown Wireframes / Visual Structure

No visual redesign is required. Existing structure and labels remain:

```text
[ Event monitor: submitted user message + retained context ]

[ Context tray: attachment A  (remove) ] [ Clear all ]
[ Focused Team member textarea........................ ] [ Speak/Stop ] [ Send ]
```

The only intended visual difference is that state transitions become observable at the correct time.

## Non-Happy-Path States

### Loading

- Attachment upload placeholders and voice transcribing feedback remain unchanged.
- Uploading continues to block send according to existing primary-action behavior.

### Empty

- Successful local submission produces an empty Team draft.
- Successful Clear all produces an empty Team context tray.
- Empty/no-speech voice results do not replace existing text.

### Error And Recovery

- Pre-admission send failure preserves the draft.
- Post-admission send failure uses the existing submitted-event/error representation.
- Voice failure preserves the draft and existing error feedback.
- Failed draft attachment deletion keeps the item visible and authoritative.

### Disabled / Unavailable

- Existing rules for pending submissions, uploads, runtime status, voice availability, and interrupt action remain unchanged.

### Permission / Authentication

- Existing microphone permission and attachment authorization behavior remain unchanged and out of scope.

## Responsive And Platform Behavior

- Primary reported environment: macOS Electron desktop.
- Browser-equivalent Team composer behavior must match Electron for these Vue state transitions.
- No responsive layout or mobile-specific flow changes are intended.

## Accessibility And Keyboard Behavior

- Enter and the Send button must trigger the same existing primary action.
- Existing accessible names for **Remove file**, **Clear all**, Speak/Stop, and Send remain unchanged.
- Button disabled states remain synchronized with upload, pending, and runtime states.
- No focus-management or keyboard-binding redesign is required.

## Content, Labels, And Validation Messages

- Preserve all current labels, translations, toasts, and validation/error messages.
- No new copy is required.

## Data And API Dependencies

- Live `AgentContext` for the exact focused Team AgentRun.
- Existing voice transcription result boundary.
- Existing attachment draft owner, finalization, send planner, Team stream wire contract, backend member-input projection, and `UserMessage` renderer.

## Out Of Scope

- New UI, labels, animations, attachment formats, audio capabilities, backend schema, or event types.
- Standalone Agent or mobile composer redesign.
- Production-profile automation.

## Open Decisions / Risks

- No product decision remains. Downstream coverage may choose the smallest durable combination of real-view unit/integration and browser-equivalent proof.

## Approval Status

`Approved explicitly by the user on 2026-08-18 together with requirements.md.`
