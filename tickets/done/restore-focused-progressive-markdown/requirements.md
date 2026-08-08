# Requirements Doc — Restore Focused Progressive Rich Markdown

## Status (`Approved — Design-ready`)

The user approved this focused follow-up on 2026-08-08: restore the original progressive rich-Markdown experience for the currently focused conversation, keep the already-merged configurable server WebSocket-egress cadence as the performance control, and investigate renderer-wide background contention in a separate later ticket. The requirements below are a direct, bounded transcription of that direction; no separate intended-behavior supplement applies.

## Goal / Problem Statement

Remove the raw-Markdown-until-completion presentation regression introduced by the merged runtime-streaming performance work. While the selected standalone-agent or focused team-member conversation is streaming, each shaped content update must be presented through the existing rich Markdown renderer instead of remaining escaped source until `SEGMENT_END`. Preserve the merged server-side content coalescer, its configurable 500 ms default, and all existing conversation semantics.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | An identified incomplete text segment is shown through `LiveTextRenderer`, so Markdown syntax remains raw until segment/message completion. | The currently displayed conversation renders every shaped live text revision through the existing `MarkdownRenderer`, so headings, emphasis, lists, code, math, links, and other supported rich presentation update progressively. | Exact accumulated content, streaming order, segment identity, completion state, and final content remain unchanged. | FR-001, FR-003 / AC-001, AC-002, AC-005 |
| BEH-002 | If the user expands an incomplete reasoning segment, it also uses `LiveTextRenderer` until completion. | An expanded reasoning segment in the currently displayed conversation uses `MarkdownRenderer` throughout streaming, matching its completed presentation. | The Thinking disclosure remains collapsed by default and exists only when reasoning is emitted. | FR-001, FR-003 / AC-003, AC-005 |
| BEH-003 | The merged server WebSocket-egress coalescer shapes content at a configurable fixed cadence: 500 ms by default, with the existing 100–2,000 ms setting. The frontend consumes shaped updates immediately without a second cadence timer. | No change. Rich Markdown runs when those already-shaped updates reach the displayed conversation; users may choose 1,000 ms when they prefer lower update frequency. | Server configuration, content coalescing, flush/ordering rules, status/lifecycle behavior, and settings UX remain unchanged. | FR-002, FR-004 / AC-004, AC-006 |
| BEH-004 | Desktop standalone workspace, focused team-member workspace, and mobile chat mount the shared `AgentEventMonitor`/conversation feed only for the selected or focused conversation. | Reuse that existing selection boundary; do not introduce another focus flag or a second presentation policy. | Background-agent renderer contention is not diagnosed or corrected by this ticket and will be investigated separately. | FR-001, FR-005 / AC-001, AC-003, AC-007 |
| BEH-005 | Completed, historical, hydrated, and event-monitor browse content already uses the rich renderer and supports the established Markdown, Mermaid, math, managed-image, link, and Event Monitor file-action behavior. | Preserve those outcomes while removing only the active live/plain presentation branch. | Existing security, authorization, interaction, hydration, history, and accessibility behavior remains unchanged. | FR-003, FR-004 / AC-005, AC-006 |

## Investigation Findings

- `origin/personal` at `647b1119a9dc3ba2ba301243e1b5e752943454db` already contains merge `cacf3c053` for the completed runtime-streaming follow-up.
- `TextSegment.vue` and `ThinkSegment.vue` select `LiveTextRenderer` whenever `presentationComplete` is false; `AIMessage.vue` derives that flag from message/stream-segment completion.
- `LiveTextRenderer.vue` intentionally escapes and whitespace-preserves the full current source, which exactly explains the user-observed raw Markdown until the final switch.
- Before commit `3b5144a0b`, both segment components used `MarkdownRenderer` directly for all revisions. Restoring that existing path is a small clean-cut reversal rather than a new incremental parsing subsystem.
- `AgentWorkspaceView.vue`, `AgentTeamEventMonitor.vue`, and `MobileChat.vue` already select the conversation/member shown through the shared `AgentEventMonitor`; this ticket does not need a new focus contract.
- The backend cadence setting is already merged and is independent of the frontend renderer selection. At 500 ms, ordinary continuous same-identity content is intended to produce at most about two presentation updates per second; 1,000 ms produces about one per second.
- The user's screenshots showing microphone and context-file delays while another agent works are evidence for a separate renderer-wide/background-stream investigation. They do not justify retaining poor focused-conversation Markdown UX in this ticket.

## Relevant Supplemental Task Artifacts

None.

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Initial design issue signal: `No`
- Root cause classification: `Local Implementation Defect`
- Refactor posture: `Likely Not Needed`
- Evidence basis: The established conversation renderer owner and selection boundary remain correct. The undesirable UX is caused by one local live/final renderer-selection policy introduced by the prior performance ticket, while the newly merged backend cadence now owns update-frequency control.
- Requirement or scope impact: Remove the obsolete plain-live presentation branch and its plumbing; reuse `MarkdownRenderer` directly. Do not change streaming, identity, lifecycle, settings, persistence, or background-stream architecture.

## Recommendations

- Restore direct `MarkdownRenderer` use for both active text and expanded active reasoning.
- Keep the server-side 500 ms default and existing 100–2,000 ms configuration as the only cadence control.
- Remove `LiveTextRenderer` and completion-aware render-selection plumbing rather than retaining a hidden compatibility path.
- Preserve stream-segment completion metadata where it still serves event-monitor or lifecycle correctness; only remove its presentation dependency.
- Treat renderer-wide background contention as a separate investigation with its own reproduction and performance evidence.

## Scope Classification (`Small`)

The change is confined to the existing conversation presentation boundary and focused component coverage. It requires no new API, persistence, schema, setting, service, or protocol.

## In-Scope Use Cases

- UC-001: Watch a selected standalone agent stream Markdown-rich text on desktop.
- UC-002: Watch a focused team member stream Markdown-rich text on desktop.
- UC-003: Watch a selected agent or focused team member stream Markdown-rich text on mobile.
- UC-004: Expand a live Thinking disclosure and see supported rich Markdown progressively.
- UC-005: Load completed/historical/browse conversation content with unchanged rich presentation.

## Out of Scope

- Investigating or fixing microphone startup, context-file paste/upload, or renderer-wide contention caused by unfocused/background agents.
- Changing, removing, or duplicating the server WebSocket-egress coalescer or its Settings control.
- Adding a frontend timer, adaptive cadence, incremental AST parser, stable-block renderer, worker, virtualization system, or new focus/subscription protocol.
- Changing Markdown syntax/features, sanitization, file actions, managed-image loading, Mermaid, math, syntax highlighting, or link behavior.
- Changing runtime/provider events, WebSocket schemas, segment lifecycle, history/hydration, persistence, traces, or tool presentation.

## Functional Requirements

- **FR-001 — Progressive focused rich presentation:** Text revisions in the currently displayed standalone, focused team-member, or mobile conversation must use the existing rich Markdown presentation while the segment is still active. Expanded active reasoning must follow the same policy.
- **FR-002 — Backend cadence remains authoritative:** The frontend must render each shaped content revision when received and must not add a normal presentation timer. The existing server interval setting, 500 ms default, valid range, live application behavior, and egress ordering policy remain unchanged.
- **FR-003 — Clean-cut live/plain removal:** Remove the active `LiveTextRenderer` branch, component, presentation-only completion prop/function, and obsolete tests. Do not retain a feature flag, compatibility fallback, or dual renderer path.
- **FR-004 — Preserve conversation correctness and rich features:** Preserve exact content/order, stream identity/lifecycle, completion, history/hydration, browse presentation, Thinking disclosure behavior, Markdown sanitization/features, file actions, and accessibility.
- **FR-005 — Existing focus boundary:** Reuse the current selected-agent/focused-member component mount boundary; do not add new focus state or claim to solve background processing.
- **FR-006 — Proportionate verification:** Add or update focused component coverage proving active content takes the rich path and run the relevant frontend unit/type/build checks available to implementation and API/E2E stages.

## Acceptance Criteria

- **AC-001 — Active selected text is rich:** Given an incomplete identified text segment in the displayed standalone, focused team-member, or mobile conversation, a shaped update is presented through `MarkdownRenderer` immediately; `LiveTextRenderer` is not mounted.
- **AC-002 — Progressive revisions remain rich:** When a second shaped delta extends the same incomplete text segment, the existing rendered content updates through `MarkdownRenderer` without waiting for `SEGMENT_END` or message completion.
- **AC-003 — Active reasoning is rich when visible:** When an incomplete reasoning segment is expanded, its current content uses `MarkdownRenderer`; the disclosure remains collapsed by default and otherwise behaves as before.
- **AC-004 — Cadence is not duplicated:** No frontend presentation timer or alternate cadence is added. Existing server setting and egress code are unchanged by the implementation diff.
- **AC-005 — Final and historical behavior is preserved:** Completion, interruption/error fallback, historical/hydrated messages, and event-monitor browse presentation retain their existing correct rich output and features.
- **AC-006 — No protocol or data impact:** Runtime/provider events, WebSocket messages, server settings, segment identities, persisted run data, traces, and history schemas are unchanged.
- **AC-007 — Scope boundary is explicit:** Background/unfocused renderer contention is neither claimed fixed nor masked by this change; it remains a separate follow-up investigation.

## Constraints / Dependencies

- Base and finalization branch: refreshed `origin/personal` / `personal`.
- Existing server content shaping must remain the single cadence authority.
- Existing `MarkdownRenderer` is the authoritative rich-conversation presentation component.
- The current selection/focus mount boundaries must remain authoritative; do not add parallel focus state.
- Stream-segment completion metadata may not be deleted merely because presentation no longer consumes it; other event-monitor completion logic still does.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Run history, raw traces, hydrated conversations, and server settings.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing data as-is.
- Unacceptable data loss or corruption: Any content, identity, lifecycle, trace, history, or setting change.
- Relevant availability, maintenance-window, or rollout constraints: None; presentation-only code change.
- Related requirement and acceptance-criteria IDs: FR-002, FR-004 / AC-004, AC-005, AC-006.

## Assumptions

- “Focused conversation” means the conversation already mounted by the selected standalone agent, focused team member, or selected mobile context; no new focus signal is required.
- “Bring progressive rich Markdown back” means restoring the existing pre-`LiveTextRenderer` behavior, not building a new incremental parser.
- The existing backend cadence correction remains merged and separately covered.

## Risks / Open Questions

- Very large or feature-heavy accumulated Markdown can still create an expensive individual render even at 500 or 1,000 ms. This is an accepted, observable tradeoff for restoring UX; do not reintroduce raw-until-complete behavior without new user approval and evidence.
- The separate background-contention issue may share some renderer work but must be profiled independently rather than inferred from this presentation reversal.
- Open requirement questions: None.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| FR-001 | UC-001, UC-002, UC-003, UC-004 |
| FR-002 | UC-001, UC-002, UC-003, UC-004 |
| FR-003 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| FR-004 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| FR-005 | UC-001, UC-002, UC-003 |
| FR-006 | UC-001, UC-002, UC-003, UC-004, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Active identified text takes the rich renderer path before completion. |
| AC-002 | Updating an active segment remains progressive instead of waiting for its terminal event. |
| AC-003 | Expanded active reasoning follows the same rich policy without changing disclosure UX. |
| AC-004 | The merged backend cadence remains the only rate-control mechanism. |
| AC-005 | Completed, interrupted, historical, hydrated, and browse states do not regress. |
| AC-006 | The change remains presentation-only. |
| AC-007 | The later background-contention investigation remains honest and separate. |

## Approval Status

- Requirements basis: `Approved` by the user in conversation on 2026-08-08.
- Approved direction: restore progressive rich Markdown for the focused conversation; keep configurable backend cadence; defer renderer-wide background contention to a separate subsequent ticket.
- Intended-behavior supplements: None.
- Open approval gaps: None.
