# Docs Sync

## Scope

- Ticket: `codex-filechange-event-fix`
- Trigger Stage: `9`
- Workflow state source: `tickets/in-progress/codex-filechange-event-fix/workflow-state.md`

## Why Docs Were Updated

- Summary: Added a durable Codex raw-event audit table and updated the Codex integration module doc so future debugging and review can rely on one authoritative raw-to-normalized mapping reference.
- Why this change matters to long-lived project understanding: The fix only makes sense if engineers can distinguish authoritative `fileChange` lifecycle events from supplemental or ignored Codex raw events. That knowledge should not remain buried in ticket artifacts or ad hoc debugging sessions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical module overview for the Codex runtime. | `Updated` | Added the authoritative `fileChange` normalization rules and linked the detailed audit table. |
| `autobyteus-server-ts/docs/design/README.md` | Index for focused design/runtime notes. | `Updated` | Added the new Codex raw-event mapping note. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Checked whether the generic streaming doc also needed to carry Codex protocol details. | `No change` | The Codex-specific raw-event mapping belongs in Codex docs, not the generic streaming overview. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | `New design/runtime note` | Added the canonical raw-event audit table, authoritative-boundary statement, apply-patch/file-change spine, explicit keep/ignore decisions, legacy-name cleanup note, and raw-debug logging procedure. | Future engineers need one durable place to reason about Codex raw protocol changes. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | `Module doc update` | Added the event-normalization rules for `fileChange`, clarified that custom tool completion is not the owner of `edit_file` state, and linked the detailed audit table. | The module overview should describe the current runtime contract, not just list files. |
| `autobyteus-server-ts/docs/design/README.md` | `Index update` | Added the new Codex raw-event mapping note to the design docs index. | Keeps the new durable note discoverable. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Codex `apply_patch` / `edit_file` raw spine | The authoritative lifecycle for `edit_file` comes from raw `fileChange` item events, not from custom tool completion or turn-diff sidecars. | `tickets/in-progress/codex-filechange-event-fix/investigation-notes.md`, `tickets/in-progress/codex-filechange-event-fix/future-state-runtime-call-stack.md` | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Keep vs ignore protocol decisions | `turn/diff/updated` is intentionally ignored for normalized state, and `item/tool/call` stays outside the `AgentRunEvent` spine. | `tickets/in-progress/codex-filechange-event-fix/implementation.md` | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Debug workflow | Raw-event logging should be enabled with `CODEX_THREAD_RAW_EVENT_LOG_DIR` before changing Codex mappings. | `tickets/in-progress/codex-filechange-event-fix/investigation-notes.md` | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Assumed raw names `turn/diffUpdated`, `item/fileChange/delta`, and `item/fileChange/completed` | Real raw names `turn/diff/updated`, `item/fileChange/outputDelta`, and generic `item/started` / `item/completed` with `item.type = fileChange` | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Ad hoc debugging knowledge about which raw Codex event actually owns `apply_patch` completion | Explicit authoritative-boundary and spine documentation | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed: `None for this ticket. Future Codex protocol expansion should update the audit table before adding new converter behavior.`
