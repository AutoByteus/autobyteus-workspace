# Requirements Document — composer-mention-discoverability

## Document Status
- Status: Approved; current solution revision SR-005; owner Solution Designer; 2026-10-02.
- Package: composer-mention-discoverability.
- Approval: user accepted PDR-005 UI (“i am satisfied with the ui now”, UI-APP-001), explicitly clarified “the duplicate mention should be removed”, and directly authorized requirements (“goood. the requriement is clear now. lets go”).
- Exact basis: SR-003 intended UI baseline and REQ-001–004, captured in SR-004, now consolidated without changing intended behavior in SR-005. User subsequently directs “the prototype already send you the screenshots, that's all you need”; no further Product finalization requested. Product confirms user closed its work (“your job is already done according to your skill no worries”).
- Behavior-defining supplements: accepted PDR-005 source 2802de1fb91cd82498ccfda1edcea43869dc2665, /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-approval-record.md, approved screenshot baseline below, existing native-editing contract described by /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/product-design-proposal.md. No completed Product lifecycle/spec/promotion falsely claimed.

## Problem And Desired Outcome
The existing run composer does not advertise @ and duplicates a selected collaborator as a separate blue chip above the message plus inline @Name. Add the user-selected inside-box placeholder and remove only the separate top mention row; retain a single highlighted inline mention and existing collaboration functionality. This is focused UI work, not a backend or prototype-repository repair.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Evidence-backed current | Approved desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Screenshot 1: generic “Type a message...” with no @ cue; source defaults to skill/custom/generic placeholder | Native empty-editor “Ask anything · @ for an agent or team” inside message area below Context Files; no target-name/slash/outside/bottom helper | Capability gating, New Chat placeholder and actual skill interactions |
| BEH-002 | User | SCN-002,003 | Selected identity stored separately; inline @Name plus separate MentionChipRow | Only the inline @Name quietly highlighted; top duplicate row/icon/× removed | Definition identity, native text editing and undo, unrelated prose/attachments |
| BEH-003 | User/System | SCN-002,004 | Picker/server validation and focused-agent delivery exist | Unchanged | Candidate eligibility, keyboard menu, selected identity on send, failed-send draft retention |

## Stakeholders, Actors, And Outcomes
User composing in live Agent/Team/Org and task-member contexts: discover @ and compose/edit without duplicate selection UI. Solution Designer owns approved requirements and technical design; Implementation Engineer owns source/checks; API/E2E and Delivery retain verification/finalization. Product-owned appearance evidence remains externally owned, Product work user-closed.

## Scope Guardrail
### In-Scope Use Cases
UC-001 / SCN-001: discover @ in mention-capable run composer.
UC-002 / SCN-002: select collaborator and compose/send.
UC-003 / SCN-003: edit/remove mention with native editor.
UC-004 / SCN-004: preserve keyboard/empty/error recovery behavior.
### Out Of Scope
New Chat launch target and placeholder; actual skill availability/routing; collaborator/server lifecycle/settings; tree/Team tab; Context Files or voice redesign; Product fixture rewrite, upload mock repair, baseline promotion or lifecycle completion.
### Non-Goals
No rich-text/atomic token editor, new backend capability, migration or standalone editor framework.
### Preserved Behavior Boundary
BEH-003 and REQ-003/004. Removing top duplicate must not remove inline @Name or selected definition metadata. Run slash discovery text is removed only from this new placeholder; slash skills themselves and skill chips remain supported wherever currently applicable.
### Review Authority
Blocking corrections must cite approved REQ/AC/BEH. Material new behavior or scope requires renewed user approval. Prototype technical limitations remain truthful evidence, not new production requirements.

## Requirements
| ID | Requirement | Behavior | Authority |
| --- | --- | --- | --- |
| REQ-001 | Mention-capable live-run empty composer shows exactly “Ask anything · @ for an agent or team” as native placeholder inside top of message area, below Context Files; no target-name, / cue or external helper; disappears when typing, never draft content | BEH-001 | PDR-005/user direction, UI-APP-001, SR-004/005 user instructions |
| REQ-002 | Chosen mention has one quiet sky-blue inline @Name highlight, no separate top mention chip row/icon/remove button; unselected typed query not highlighted as selected | BEH-002 | Approved appearance and direct duplicate-removal confirmation |
| REQ-003 | Native editing preserves selected identity semantics: delete @ to retain plain name/deactivate mention; delete whole token to remove name; name editing invalidates active selection; restoring exact previously selected token/undo reactivates its selected definition; edits do not lose unrelated prose/attachments; choose leaves caret after trailing space | BEH-002 | Accepted PDR-005 native-editing contract and existing token/metadata semantics; user approved UI then requirements |
| REQ-004 | Preserve candidate rules, menu keyboard/dismissal, focused-agent delivery, actual skill capability, uploads/attachments, failed-send draft recovery, sent/history presentation and target switching; no unsupported hint in no-scope drafts/read-only target | BEH-003 | Existing supported contract, user focused scope |

## Acceptance Criteria
| ID | REQ | BEH/SCN | Trigger | Observable outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001,004 | BEH-001/SCN-001 | Empty live composer with mention support | Exact inside-box placeholder, no name/slash/helper; typing hides cue without inserting it; no-scope/New Chat copy unchanged | Component and browser/reference checks |
| AC-002 | REQ-002 | BEH-002/SCN-002 | Choose candidate, continue sentence | One highlighted inline @Name, no mention chip row; surrounding text/caret correct; typed unselected name no active highlight | DOM/state assertions and screenshot comparison |
| AC-003 | REQ-003 | BEH-002/SCN-003 | Delete @, whole token, edit name, restore/undo; edit unrelated text | Active highlight/metadata submission agree with native text presence, selected definition preserved for exact restoration; unrelated draft/attachments intact | Component + native browser interaction |
| AC-004 | REQ-004 | BEH-003/SCN-002,004 | Keyboard select/Escape/no-match Enter; accepted/rejected send | Existing selection/dismissal works; no-match Enter not sent; send reaches focused agent with correct definition; rejection retains draft/attachments and adds nobody; successful send clears draft | Existing/store tests and browser probe |
| AC-005 | REQ-002,003,004 | BEH-002/SCN-002,003 | Long wrapped/scrolled draft, resize, target switch | Highlight aligns with native glyphs and scroll; editor remains sole input/accessibility surface; no stale highlight from previous context, controls usable | Renderer/browser checks at 1512 and 1024, constrained width, both locales |

## Relevant Scenarios And Journeys
| ID | Actor/goal | Entry/starting condition | Product sequence/outcome | Alternate | Validity/evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User discovers mentions | Empty mention-capable existing Agent/Team/Org composer | Sees native @ cue and invokes picker | Unsupported launch/read-only scope does not advertise live collaborators; New Chat stays distinct | Supported Normal; original image 1/source/approved appearance | REQ-001,004/AC-001 |
| SCN-002 | User asks collaborator help | Supported run and candidate | Type @query, choose, continue sentence, send to focused agent with identity | Escape keeps text; no match Enter does not send | Supported Normal; image 2, existing contract, approved selected capture | REQ-002,004/AC-002,004,005 |
| SCN-003 | User changes selection/message | Selected token in draft | Native deletion/edit/undo; selection projection follows valid token presence | Unrelated edits and target switching preserve correct own-context draft | Supported Normal; PDR-005 and existing textarea/identity logic | REQ-003,004/AC-003,005 |
| SCN-004 | Collaborator addition rejected | Selected token then current validation rejection | No collaborator addition/message, failure notice and draft retained | Correct/remove mention and retry | Supported Explicit Edge; existing cross-scope-agent-mentions REQ-008 | REQ-004/AC-004 |

## UI, Interaction, And Experience Requirements
Applicable: Yes. User-selected screenshot reference route; not a completed Product-prototype integration. User expressly ends Product work and selects existing approved screenshots as sufficient UI authority. Do not re-request Product work or author a competing ui-ux-spec.
- Approval provenance: /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-approval-record.md (UI-APP-001); accepted behavior source 2802de1fb91cd82498ccfda1edcea43869dc2665, prototype/composer-mention-discoverability.
- Normative composer appearance: /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-1512.png, composer-selected-1512.png, composer-1024.png. Exact native placeholder, border/focus/context-area treatment and selected inline styling are approved.
- Supporting full context: /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/inside-empty-1512.png, inside-selected-1024.png. Synthetic Agent/Team names, prose/history, sidebar data and shell state are illustrative per UI-APP-001; only scoped composer delta is authorized.
- Normative interaction: REQ-003 and accepted PDR-005. Existing font 15px/24px, inline sky highlight background #f0f9ff, inset #bae6fd outline, 4px corners and no padding that alters caret spacing. Native placeholder 12px horizontal/10px vertical inset; no extra helper.
- Separate Product repository/root/ticket: /Users/normy/autobyteus_org/autobyteus-web-prototype, active worktree /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability, ticket composer-mention-discoverability. Review URL http://127.0.0.1:3292/chat?id=run-research-001 (historical Product-reported runtime, no continuity guarantee).
- Final Product ui-ux-spec/promotion/terminal completion: N/A — not produced, user-closed Product scope; not fabricated as completed. UI-APP-001 + existing approved screenshot supplements, now chosen directly by user, define intended appearance without adopting unfinished fixture architecture.

## Quality And Non-Functional Requirements
REQ-003/004/AC-003–005 preserve native textarea keyboard/accessibility, IME/undo, existing combobox semantics; decorative highlight cannot intercept pointer/focus or be announced twice. Safe escaped text rendering. No new performance SLA. Long wrapping/scroll is ordinary existing composer behavior, not a new editor capability.

## Data Continuity And Acceptable Loss
Preserve draft text/selected definition identity and attachments; no allowed unrelated data loss, resets or history rewrites. Renderer decoration/placeholder do not define new stored schema; architecture verifies. Product mock-state correction is not a production data migration requirement.

## External Contracts And Dependencies
Existing cross-scope-agent-mentions server candidate/send/admission contract retained; New Chat @ is launch-target selection and unchanged. No external service/package change required by intent.

## Supplemental Artifacts
Approval/proposal/ticket/check limitations at /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability; five approved captures and manifest externally owned, linked not duplicated; original images absolute paths in investigation. User screenshot authority/closure approval references indexed by SR-005. No independent review artifacts yet (N/A until route determined).

## Assumptions And Open Decisions
DEC-001/002 resolved (placeholder and single inline appearance). DEC-003 preserved existing native/token metadata semantics in approved PDR-005, now explicit REQ-003/AC-003. DEC-004 scope expansions not approved. DATA-001/BASE-002 unresolved prototype-only limitations; not production blockers after user closes Product deliverable. No material intended-behavior ambiguity remains.

## Traceability
REQ-001 → UC-001/BEH-001/SCN-001/AC-001.
REQ-002 → UC-002/BEH-002/SCN-002/AC-002,005.
REQ-003 → UC-003/BEH-002/SCN-003/AC-003,005.
REQ-004 → UC-002,004/BEH-003/SCN-001,002,004/AC-001,004,005.

## Architecture Phase Input
Realize SCN-001–004 without new metadata model, routing/persistence or Product fixture dependencies. Native editor ownership and token identity must be preserved. Technical decoration/metric/scroll design remains engineering-owned; no automatic copy of prototype's altered APIs or fixture data.

## Readiness Check
Evidence-backed current behavior, scope, desired/preserved behavior, traceable ACs and supported scenarios: Yes. User requirements approval: Yes (direct lets go; unchanged intended basis). Applicable UI appearance confirmation: Yes, UI-APP-001 and direct screenshot-only instruction. Supplements integrated as user-selected evidence, not an unfinished complete Product package. Final Product lifecycle N/A user-closed, limitation preserved. Ready for architecture: Yes. Readiness change does not imply prototype completion or passing production validation.


## Product Review Disposition
/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-review-finalization-record.md (UI-CLOSE-001) confirms explicit user deferral of prototype baseline repair and finalized UI review/screenshot delivery only. Prototype technical ticket remains Blocked, source/preview retained. This does not imply production implementation completion or a final Product specification; production software route uses the explicitly approved screenshot/intended-requirements basis above and validates its own source.
