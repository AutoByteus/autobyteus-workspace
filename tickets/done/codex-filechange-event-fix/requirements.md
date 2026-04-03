# Requirements

- Status: `Refined`
- Ticket: `codex-filechange-event-fix`
- Date: `2026-04-02`

## Problem

Codex `apply_patch` emits raw `fileChange` events, but the current backend conversion leaves the frontend activity item at `parsed` instead of `success` and does not emit clean path-shaped artifact events for this flow.

## In-Scope Requirements

- Convert the real raw Codex `fileChange` spine for `apply_patch` / `edit_file` into normalized runtime events that keep the touched-files and activity spines consistent.
- Preserve a clear authoritative boundary in the Codex backend: raw-event interpretation stays inside the Codex event conversion subsystem.
- Avoid legacy dual-path behavior in the changed scope; remove or replace malformed event mappings instead of keeping them beside the corrected path.

## Acceptance Criteria

1. A Codex `fileChange` start produces a normalized `edit_file` segment start and a tool-execution started signal with the same invocation identity.
2. A Codex `fileChange` completion produces a normalized terminal tool lifecycle event so the frontend activity row can reach `success` or `error` instead of stopping at `parsed`.
3. The Codex conversion emits path-shaped artifact projection events for edited files so the frontend touched-files panel can reconcile the edited path without guessing from malformed payloads.
4. The normalized event payloads use the real raw Codex event names and fields observed in the debug log from `apply_patch`.
5. Focused automated validation covers the corrected raw-event conversion path.
