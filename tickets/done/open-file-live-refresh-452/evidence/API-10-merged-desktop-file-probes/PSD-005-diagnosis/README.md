# PSD-005 diagnosis (autobyteus-452 API/E2E, merged state `2da34f6644`…`899839dcae`)

PSD-005 ("AC-003 later input ends equal to the saved content", `file-explorer-pending-save-draft-probe.mjs`) failed once in API-10 with `clean after settle: true !== false`. The editor showed the saved text and "Changes saved", but the store still had a draft (`../pending-save-draft/failed-PSD-005.png`, `evidence.json`).

## Runs

| Run | Change to the probe | PSD-005 | Log |
| --- | --- | --- | --- |
| API-10 | none | Fail (clean after settle) | `../pending-save-draft.log` |
| 1–3 | none | Pass, Pass, Pass | `api452-psd-{1,2,3}.log` |
| d400 1–3 | temporary: `GetFileContent` replies delayed 400 ms in PSD-005 only | Pass, **Fail**, **Fail** (clean after settle) | `api452-psd-d400-{1,2,3}.log` |
| d1500 (not kept) | delay 1500 ms | Fail differently: the editor was unmounted at the check (the loading state while `content` is null) | — |

## Store-level order check (temporary spec, removed after the run)

A Save held pending; the user's later input equals the saved text. Two orders were driven through the real store with one `modify` change carrying both `node_id` (pre-452 shape) and `path` (452 shape): the watcher's `modify` during the held reply and then the reply, and the reply and then the watcher's `modify`. Each was run against the merged store and against `origin/personal`'s pre-452 `fileExplorerTreeActions.ts`.

| Code | Watcher first | Reply first |
| --- | --- | --- |
| merged (452) | `draft: null, content: SAVED, reads: 1` | `draft: null, content: SAVED, reads: 1` |
| pre-452 | `draft: null, content: SAVED, reads: 1` | `draft: null, content: SAVED, reads: 1` |

Both codes read the file once after the window's own Save, and the store alone always ends clean.

## Cause

The one re-read after the window's own Save (`invalidateFileContent`: `content = null`, then a fetch) leaves a short window with no committed content. If an editor value emission lands in it (the last typed input, or the editor remounting around the loading state), `updateEditorDraft` stores `{ content: SAVED }` as a draft, because `SAVED !== null`. When the read returns `SAVED`, nothing clears a draft that now equals the content. A longer window makes the failure frequent (d400).

This re-read and the code on this path are the same before and after autobyteus-452 for files in loaded folders, such as these workspace-root files. autobyteus-452 adds the same re-read for open files in folders never expanded, so the race now also reaches those. Recorded as a follow-up in `follow-ups.md`.
