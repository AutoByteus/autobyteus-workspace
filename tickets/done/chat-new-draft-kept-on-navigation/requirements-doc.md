# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `chat-new-draft-kept-on-navigation`
- Request / ticket: User request 2026-10-07 (New chat input lost after navigating away); user refinement 2026-10-07 (Draft rows under the Chat row); Product Design result 2026-10-07 (user-confirmed UI/UX spec)
- Requirements owner: Solution Designer
- Date: 2026-10-07
- Approval state and reference: Approved 2026-10-07. Asked "Your answer is the last missing piece. Reply approved, B (or approved, A)", the user replied: "no do not survide. no need" (= DEC-002 A, approving the SR-003 baseline with session-only drafts).
- Exact approved requirements baseline / solution revision: SR-003 content + DEC-002 = A (recorded as SR-004)
- Behavior-defining supplements and their approved versions: Product-owned UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` @ design revision `21643c2` (ticket closed `5e93a70`), user-confirmed 2026-10-07

## Problem And Desired Outcome

- Problem: While composing a New chat (text, attachments, target, settings), the user opens another run to copy details. Returning through the **Chat** nav item discards the whole draft, so the user must collect everything up front or retype it.
- Affected actors: Any user composing a New chat first message.
- Desired outcome: A New chat with typed text is kept as a one-line **Draft row** directly under the **Chat** row. Clicking the row re-enters that draft exactly as left. **Chat**, the pencil, Run and "+" always start a blank New chat and never destroy a draft with text.
- Observable definition of success: Type text (+ attach a file, pick a Team) → open any other run → a one-line row with the text is under Chat → click it → identical text, attachments, target and settings are shown.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Chat item replaces the single in-memory draft with a fresh one; prior content is lost | Chat item opens a blank New chat; a previous draft with text is kept as a Draft row | Chat = new chat | investigation-notes BEH-001 |
| BEH-002 | User | SCN-002 | Pencil starts a fresh draft | Same as BEH-001 | Pencil = new chat | BEH-002 |
| BEH-003 | User | — | Existing-run composer text stays per run in memory | Unchanged | Yes | BEH-003 |
| BEH-004 | User | SCN-003 | After sending, the New chat draft resets | A successful send removes the sent draft and its row; a failed send keeps both | Sent content belongs to the run | BEH-004 |
| BEH-005 | User | — | Reload/restart loses all drafts | Unchanged: drafts are session-only (DEC-002 A) | Yes | BEH-005 |
| BEH-006 | User | SCN-002 | Run / "+" starts a fresh draft for that definition/run | Same, and any previous draft with text is kept as a row | Run/"+" target and settings rules | BEH-006 |
| BEH-007 | User | SCN-001..005 | No current supported behavior (no Draft rows) | Draft rows under the Chat row: appear, open, discard, empty-draft handling | — | User proposal SR-002; UI/UX spec |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Leave a partially written New chat to look at other runs/pages, then re-enter it from its row and continue | SCN-001 |
| UC-002 | Start another new chat while earlier drafts are kept | SCN-002 |
| UC-003 | Send a draft; its row disappears | SCN-003 |
| UC-004 | Discard a draft | SCN-004 |
| UC-005 | Clear a draft's text; it is dropped on leaving | SCN-005 |

### Out Of Scope

- Server-side or cross-device draft storage.
- Drafts for existing runs (their composers already keep text per run).
- Org launch page drafts.
- Undo after discard; "show more" collapsing of a long list.
- Any indicator on the collapsed left strip; changing the collapsed strip's Chat icon behavior (today it reopens the panel and shows the current New chat).
- Changing Run/"+"/heading-switcher target and settings rules beyond keeping earlier drafts.

### Non-Goals

- No confirmation dialogs (starting a chat or discarding a draft).
- Keeping attachment-only or skill-only New chats (accepted loss, see Data Continuity).

### Preserved Behavior Boundary

BEH-003; the target, settings and model resolution rules of plain New chat, Run, "+" and the heading switcher; launch behavior other than removing the sent draft; the collapsed strip.

### Review Authority

Standard: blocking findings must cite an ID here; scope-changing proposals are Requirement Gaps needing user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A New chat becomes a Draft once it has **typed text**. Attachments, `/` skills, `@` mentions without text, and target/model/workspace choices alone do not make one; a lone `/command` being typed is not text yet. | BEH-007 | Must | People write first; simple rule | User in Product review (round 3); UI/UX spec |
| REQ-002 | Drafts are listed directly under the **Chat** row, newest started first (editing does not reorder). Each row shows only a one-line preview of the draft's text (whitespace collapsed, ellipsis), with no "Draft" marker, target, count, icon or guide line. | BEH-007 | Must | Clean, recognizable | User in Product review (rounds 2–3); UI/UX spec |
| REQ-003 | Clicking a row reopens the New chat surface with that draft exactly as left: text, context files/attachments, `/` skills, `@` mentions, target agent/team, workspace, runtime/model/model config (incl. thinking), Auto-approve and team member customizations. While a draft is open its row is selected and the Chat row is not; a blank New chat selects the Chat row as today. | BEH-007 | Must | Core pain | User; UI/UX spec |
| REQ-004 | Clicking **Chat** or the pencil always opens a blank New chat (today's plain New chat rule). Every draft with text stays listed; a New chat without text is not kept. | BEH-001, BEH-002 | Must | Chat = new chat; nothing written is lost | User proposal; UI/UX spec |
| REQ-005 | Run / "+" on a definition or run start a fresh draft as today; every draft with text stays listed. | BEH-006 | Must | Same no-loss rule | UI/UX spec |
| REQ-006 | A successful send removes that draft and its row; other rows stay. A failed send keeps the draft and its row unchanged. | BEH-004 | Must | Sent content belongs to the run | Code evidence; UI/UX spec |
| REQ-007 | Each row has a discard (×) action without confirmation. Discarding the open draft shows a blank New chat. | BEH-007 | Must | Clean up | UI/UX spec (confirmed as built) |
| REQ-008 | When an open draft's text is fully cleared, its row reads "Empty draft" until the user leaves it; then the draft (including its attachments) and row are gone. | BEH-007 | Must | No empty rows | UI/UX spec |
| REQ-009 | Multiple drafts are supported; the primary nav section scrolls and stays resizable when many exist. | BEH-007 | Must | DEC-005 | UI/UX spec |
| REQ-010 | The visible presentation, states, accessibility, responsive (narrow drawer) and motion behavior follow the user-confirmed UI/UX spec and its final visual references VIS-001..VIS-008. | BEH-007 | Must | Normative UI | UI/UX spec |
| REQ-011 | Drafts last for the current app session only; a reload or restart starts with no drafts. Nothing is persisted. | BEH-005 | Must | User choice | DEC-002 = A (user, 2026-10-07) |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Trigger | Expected Outcome | Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | On a blank New chat, type the first character | A one-line row with the text appears under Chat, selected; Chat row not selected (VIS-002) | Attachment-only, skill-only or settings-only New chat → no row | Component test + browser check |
| AC-002 | REQ-003 | SCN-001 | Team target + image + text + changed model; open a team member run; click the row | Same heading/target, image, text, workspace, model/config, Auto-approve and member customizations; row selected (VIS-004) | Agent target the same | Component test + browser check |
| AC-003 | REQ-004 | SCN-002 | Draft with text open; click Chat (or pencil) | Blank plain New chat; Chat row selected; earlier draft still listed and re-enterable intact | Open New chat without text is not kept | Unit/component test |
| AC-004 | REQ-005 | SCN-002 | Draft with text; Run another agent / "+" on a run | Fresh draft for that definition; earlier draft still listed | — | Unit test |
| AC-005 | REQ-006 | SCN-003 | Send from an open draft | Run opens; that row disappears; other rows stay | Send fails → draft and row unchanged | Unit test |
| AC-006 | REQ-007 | SCN-004 | Click a row's × | Row and draft removed without confirmation; focus moves to next row, else previous, else Chat | Open draft discarded → blank New chat, Chat row selected | Component test |
| AC-007 | REQ-008 | SCN-005 | Clear all text of the open draft; then leave it | Row reads "Empty draft" (VIS-005) while open; gone after leaving | Typing again restores the preview | Unit/component test |
| AC-008 | REQ-002, REQ-009 | — | Create several drafts with long text | Newest first; one line with ellipsis; section scrolls and stays resizable (VIS-006) | — | Component test + browser check |
| AC-009 | REQ-010 | — | Visual/a11y/responsive review against VIS-001..008 | Matches the spec's normative details (row size/alignment/colors, × visibility, aria names, `aria-current`, drawer, collapsed strip unchanged, 150 ms motion / none under reduced motion) | — | Browser check vs. references |
| AC-010 | REQ-011 | — | Create drafts, reload the app | No Draft rows; blank New chat; nothing written to local storage | — | Unit test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Gather details from other runs into a new message | Draft row | Partially written New chat | Write → open another run → copy → click row → paste → send | Draft intact | Visit any other page | Supported Normal Scenario | User report + screenshot; UXJ-001 | REQ-001..003, AC-001/002 |
| SCN-002 | User | Desktop user | Start another chat without losing the first | Chat / pencil / Run / "+" | Draft with text exists | Start new | Blank New chat; drafts listed | — | Supported Normal Scenario | UXJ-002 | REQ-004/005, AC-003/004 |
| SCN-003 | User | Desktop user | Send | Send | Draft open | Send | Run opens; row removed | Send fails → kept | Supported Normal Scenario | UXJ-003 | REQ-006, AC-005 |
| SCN-004 | User | Desktop user | Throw a draft away | Row × | Draft listed | Discard | Row removed | Open one → blank New chat | Supported Normal Scenario | UXJ-004 | REQ-007, AC-006 |
| SCN-005 | User | Desktop user | Clear a draft | Delete all text, leave | Draft open | Clear → leave | "Empty draft", then gone | Retype | Supported Normal Scenario | UXJ-005 | REQ-008, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX specification: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md`
- Runnable UI reference / design repository: `/Users/normy/autobyteus_org/autobyteus-web-design` (`corepack pnpm dev --port 3210`, open `/chat`); reference files `components/chat/ChatDraftRows.vue`, `components/AppLeftPanel.vue`, `stores/chatDraftStore.ts`, `services/chat/chatLaunchService.ts` (traceability only, not prescriptive)
- Product ticket record (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/product-ticket.md`
- Design repository revision: design `21643c2`, ticket closed `5e93a70` (= origin/personal of the design repo); accepted base `eb60aba`; baseline pin `origin/personal@10fb695`, re-checked against source `cfeda548b`
- UI/UX user-confirmation reference: 2026-10-07 "i am satisfied. i confirm now" (plus round 2/3 and post-confirmation statements quoted in the spec)
- Approved visual-reference baseline: `visual-references/VIS-001`..`VIS-008` in the Product ticket folder
- Normative details: every visible detail in VIS-001..008 and the spec's Visual Language, State Behavior, Content, Accessibility, Responsive and Motion sections, except the permitted variations below
- Illustrative / permitted variation: draft texts, names, workspace/tree content, capability-dependent nav items, user-resizable section height, drawer width following the product drawer
- Unresolved product decisions: None

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-010, AC-009 | Accessibility | List named "Drafts"; row/× accessible names and `aria-current="page"` as in the spec; keyboard focus order and focus-after-discard as specified | Docked and drawer | Component test |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` (DEC-002 A: session-only).
- Accepted loss (user-confirmed in Product review): a New chat without typed text is not kept when another chat starts, so its attachments/skills are dropped; a cleared draft is dropped with its attachments on leaving.
- Losing all drafts on reload/restart is acceptable (user, DEC-002 A).

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` (+ `visual-references/`) | Normative UI/UX | REQ-001..010, AC-001..009 | Approved (Product-owned) | User-confirmed 2026-10-07; part of the SR-003 approval basis |
| `product-design-request.md` (this folder) | Request sent to Product | — | Completed | N/A |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | — | — | Superseded by SR-002 | User | Superseded |
| DEC-002 | Should drafts survive app reload/restart? | — | A: session only (chosen). B: persist on device (rejected). | User | Decided: A — "no do not survide. no need" |
| DEC-003 | — | — | Superseded by REQ-005 | User | Superseded |
| DEC-004 | When does a New chat become a Draft? | — | Typed text only (REQ-001) | User | Decided in Product review |
| DEC-005 | Multiple drafts or one? | — | Multiple (REQ-009) | User | Decided in Product review |

## Traceability

| REQ | UC | BEH | AC | SCN | Product evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-007 | AC-001 | SCN-001 | UXJ-001, TR-001, VIS-002 |
| REQ-002 | UC-001 | BEH-007 | AC-001, AC-008 | SCN-001 | VIS-003, VIS-006 |
| REQ-003 | UC-001 | BEH-007 | AC-002 | SCN-001 | TR-002, VIS-004 |
| REQ-004 | UC-002 | BEH-001, BEH-002 | AC-003 | SCN-002 | TR-003 |
| REQ-005 | UC-002 | BEH-006 | AC-004 | SCN-002 | TR-003 |
| REQ-006 | UC-003 | BEH-004 | AC-005 | SCN-003 | TR-004/005 |
| REQ-007 | UC-004 | BEH-007 | AC-006 | SCN-004 | TR-006/007 |
| REQ-008 | UC-005 | BEH-007 | AC-007 | SCN-005 | TR-008/009, VIS-005 |
| REQ-009 | UC-002 | BEH-007 | AC-008 | — | VIS-006 |
| REQ-010 | all | BEH-007 | AC-009 | all | VIS-001..008 |
| REQ-011 | UC-001 | BEH-005 | AC-010 | — | Data boundary table |

## Architecture Phase Input

- Root cause: `useRunStart.newChat()` / `startForDefinition` replace the single `chatDraftStore.draft`.
- Design must address: single draft → collection with one open draft; route identity of the open draft (not prescribed by Product); left-panel selection rule (Draft row vs Chat row); launch removing only the sent draft and keeping it on failure; "has typed text" predicate incl. lone `/command`; no persistence (DEC-002 A).
- Technical facts to verify: real attachment upload/finalize and previews after re-entry; cleanup of uploaded attachments of dropped/discarded drafts.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design evidence integrated consistently: `Yes`
- UI/UX approval and final visual-reference basis recorded: `Yes`
- Material assumptions and open decisions visible: `Yes`
- Content ready for user approval: `Yes`
- User approval received: `Yes` (2026-10-07)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
