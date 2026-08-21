# Activity Transparency UX Specification

## Status

`Deferred broader concept — context only; not governing the prompt-first slice`

## Purpose

Preserve the investigated broader concept for how the right-side Activity panel
could explain agent execution without duplicating the center conversation or
exposing unrestricted hidden reasoning. This artifact does not define the
current prompt-first implementation scope and its former requirement IDs are no
longer authoritative. The governing intended behavior is
`system-prompt-activity-ux-spec.md`.

## Recommended Surface Model

Keep the current right-side **Activity** tab. Do not replace the center Event Monitor with an Activity transcript. The two surfaces intentionally share some facts but not the same presentation:

- **Center Event Monitor:** readable interaction/result chronology. It owns full user messages, assistant output, the current Thinking presentation, compact inline tool steps, and compact compaction markers; latest bounded mode; deliberate active-trace browsing; explicit older-history entry point at the archive boundary.
- **Activity:** chronological structured execution/transparency trajectory for the selected run/member. It owns accepted-input metadata, AutoByteus-supplied instruction boundaries, request/context observability, detailed tool lifecycle and payloads, compaction lifecycle, and response status.
- **Memory/Raw Traces:** detailed file-level inspection remains a separate diagnostic surface and is not automatically loaded into Activity.

Duplication is intentional only where it serves both stories. A user message is full text in Event Monitor and a compact source/turn/timestamp record in Activity. A tool is a compact narrative step in Event Monitor and an expandable lifecycle/arguments/result record in Activity. Assistant response text is center-owned and is not copied into Activity.

## Activity Timeline Entries

| Entry | Default presentation | Expandable detail | If unavailable |
| --- | --- | --- | --- |
| Input accepted | Compact user/input icon, content preview, sender/source, turn id, timestamp | Full accepted input and context-file summary, subject to redaction policy | Show “Input recorded in conversation; transparency detail unavailable” |
| AutoByteus instructions applied | Instruction icon, runtime, source labels, character/token estimate, application-constructed status | Exact application-supplied instruction body or a redacted summary; source breakdown such as agent/team/native runtime additions | Show source/size/hash only and explain why content is unavailable; never label it the provider's complete prompt |
| Runtime capabilities prepared | Capability icon, materialized skill/tool counts and runtime | Skill names/locations and tool configuration where permitted, kept separate from prompt text | Show counts and unavailable reason |
| Context assembled | Context icon, message count, context source counts, compaction/recovery marker | Native canonical message list or a bounded context manifest where allowed | For Claude/Codex, show only locally observable context and a “provider-managed/opaque context” label |
| Model request sent | Provider/model icon, provider, request id/turn id, invocation boundary, dispatch status | Native canonical/rendered request and/or Claude SDK/Codex app-server invocation details, each labeled separately | Show “request boundary observed; payload unavailable” |
| Tool activity | Existing tool card and status | Existing Arguments, Logs, Result, Error controls | Preserve current behavior |
| Compaction | Existing compaction card | Existing details and provenance | Preserve current behavior |
| Model response status | Compact response/status/usage marker | Timing, completion status, token usage, provider metadata | Show status only; response text remains center-owned |

## Ordering And Grouping

- Entries are ordered by runtime timestamp and stable sequence/event identity.
- A turn may be visually grouped, but grouping must not destroy chronological order or make an entry disappear.
- The Activity header count should count typed transparency entries consistently; if a filter is added, expose filtered versus total counts accessibly.
- Tool and compaction cards retain their existing visual language. New categories should use distinct but restrained icons/status colors rather than relying on color alone.
- Do not render hidden reasoning as a new transparency category. Existing “Thinking” behavior is outside this supplement’s change unless separately approved.
- Use **AutoByteus instructions**, **application instructions**, or the exact boundary label (`Claude SDK systemPrompt`, `Codex baseInstructions`) rather than the generic claim **complete system prompt**.

## User Interaction States

### Loading

- Activity initially shows the existing panel shell and a non-jumping loading state.
- New transparency details load incrementally; opening one detail must not reload the complete run.
- When the user has scrolled away from the live tail, new entries do not force-scroll. A “new activity” affordance can return to the tail.

### Empty

- For an old run without transparency records, show the existing tool/compaction empty state and a concise explanation that detailed request transparency was not recorded for this run.
- Do not synthesize system prompt or request cards from unrelated raw trace fields.

### Error / Partial Data

- A failed detail fetch leaves the summary card visible and provides retry.
- A provider or historical record that was not observable is shown as “Unavailable” or “Provider-managed,” not as an error unless the runtime actually failed.
- One malformed detail entry must not prevent the remaining timeline from rendering.

### Privacy / Redaction

- Prompt/context cards default to summary metadata, not full text.
- Full content, if permitted, requires explicit expansion and is visually marked as sensitive/internal.
- Copy/export affordances require a separate product decision and should not be added implicitly.
- No prompt/request detail is sent to telemetry by this feature.

### Accessibility

- Every expandable card is a keyboard-operable disclosure with an accessible name containing category and status.
- Loading, unavailable, and redacted states have text labels; color and icon are supplementary.
- The archive-boundary action and jump-to-latest action are keyboard reachable and do not steal focus.
- Long prompt/request content is contained in a scrollable region with an accessible label and does not expand the whole Activity panel without limit.

## Event Monitor Archive Boundary

The current active-trace upward loader remains unchanged until it reaches the beginning of the active trace. At that point:

1. Show an explicit “Older history”/“Open raw trace history” affordance in the boundary state.
2. Explain that older content is archived and will be loaded on demand.
3. Load a bounded page only after the user chooses the action.
4. Preserve the current browse anchor and provide a clear return-to-latest path.
5. Show end-of-history, unavailable-segment, and retry states.

The recommended first implementation is a separate history/diagnostic mode or panel rather than silently mixing archived raw records into the latest central conversation projection. If product later requires in-place archive browsing, it should still use a distinct archive cursor and bounded server/storage paging.

## Responsive Behavior

- The current right-side panel remains independently scrollable.
- Expanding a long prompt/request card must not resize the center conversation or cause horizontal overflow.
- On narrow layouts, detail content may use a full-width overlay/drawer, but the selected run/member identity must remain visible.

## Approval Applicability

This broader concept is deferred. It does not require approval for, and must not
expand, the current prompt-first slice. Its archive placement, additional entry
kinds, and extended retention/redaction choices require a future scope decision.
