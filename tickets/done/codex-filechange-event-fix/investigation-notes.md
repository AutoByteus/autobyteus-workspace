# Investigation Notes

- Scope: `Small`
- Date: `2026-04-02`

## Raw evidence

Raw Codex debug file:
- `/tmp/codex-raw-event-investigation/codex-run-run-codex-backend-edit-file.jsonl`

Observed raw sequence for `apply_patch`:
1. `rawResponseItem/completed` with `item.type = custom_tool_call`, `item.name = apply_patch`, `call_id = ...`
2. `item/started` with `item.type = fileChange`, `item.id = same call id`, `status = inProgress`, and `changes[].path` / `changes[].diff`
3. `item/fileChange/outputDelta` with the same `itemId`
4. `item/completed` with `item.type = fileChange`, `status = completed`, and the same `changes[]`

## Root cause

The current generic Codex item conversion treats `item/started(fileChange)` as only `SEGMENT_START(edit_file)` and `item/completed(fileChange)` as only `SEGMENT_END`. That leaves the frontend activity spine without a terminal lifecycle event, so the activity row stops at `parsed`.

The current Codex artifact mappings are also not clean for this raw stream:
- `turn/diffUpdated` does not match the observed raw name `turn/diff/updated`
- the old dedicated file-change artifact mapping shape is not the real raw path used by `apply_patch`
- existing Codex artifact payloads do not provide the path-shaped fields the frontend artifact handler expects

## Constraint

The clean fix should stay inside the Codex event conversion subsystem. The frontend should not guess success from artifact events.
