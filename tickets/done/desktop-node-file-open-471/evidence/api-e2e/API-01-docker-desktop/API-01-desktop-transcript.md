# API-01 / API-02 — packaged desktop app on a test-owned Docker node (autobyteus-471)

- App: `isolated-app start --from-worktree` → `iso-59405-31d0` (control `http://127.0.0.1:59405`, embedded node 59406), the
  packaged build `electron-dist/mac-arm64/AutoByteus.app` made by API-03 run 2 from `08d804cbb9` (code `2e2b9ed436`).
- Node A: container `abtest471-node-a` from `abtest471/autobyteus-server:test` (`API-01-image.log`: `autobyteus/autobyteus-server:beta` +
  this worktree's server package), `127.0.0.1:59343`, `/tmp/abtest471/shared` mounted at `/home/autobyteus/shared`, scripted AGY CLI
  (`API-01-nodes-and-data.mjs`, `API-01-nodes-and-data.log`). Node B (`host-b-471`): `dist/app.js` on `127.0.0.1:59344`, paired with A.
- Steps: `steps/*.js`, each run with `steps/cdp-eval.mjs <control endpoint> <step>` (CDP attach to the instance). Screenshots in
  `shots/`, step results in `results/` (D3–D5) or below (D6–D9, copied verbatim from the step output). The setup code was read
  from a file and never printed; no credential is in this folder (scan: no match).
- macOS 26 arm64, Docker Desktop, 2026-11-11 13:42–14:20 UTC.

## D1 Connect the desktop to node A with a setup code (NA-5) — `steps/d1-connect.js`

before: "docker-a-471 / 127.0.0.1:59343 / Needs connecting. This desktop has no key for docker-a-471 yet. …"  (`shots/d1-before.png`)
after:  "docker-a-471 / 127.0.0.1:59343 / Server 1.5.13-beta.4 / Update automatically …"  (`shots/d1-after.png`)

## D2 Open A's own window; the run and the remote run — `steps/d2-open-window.js`, `steps/inspect*.js`, `steps/d2b-open-run.js`

window: `embedded: false`, `rest: http://127.0.0.1:59343/rest`; run list: "Reporter ECHO_INPUT LINKS-471 …" with "host-b-471 P publisher
Publish the notes. Marker REMOTE-471." under it. The run opened (`#/chat?id=reporter_560d…`): the agent's own message renders the 8
paths as file controls (`shots/d2b.png`). (The first D2 attempt clicked the row before the list had loaded; the click in D2b opened it.)

## D3 Click every path the agent named (AC-001, AC-002, RU-01, RU-04) — `steps/d3-open-node-files.js`, `results/d3.json`

| Path | Shows | Requests | Edit controls / typing |
| --- | --- | --- | --- |
| `/home/autobyteus/shared/notes-471.md` | Markdown "Notes 471 NOTES-MARKER-471 …", 662 ms | node-file 200 | 0 / typed text not shown |
| `/home/autobyteus/shared/picture-471.png` | blob image 120×80 | node-file 200 | 0 |
| `/srv/abtest471/plan-471.pdf` | PDF, 1 drawn canvas | node-file 200 | 0 |
| `/srv/abtest471/tone-471.wav` | blob audio, 1 s, readyState 4 | node-file 200 | 0 |
| `/home/autobyteus/workspace/ws-471/inside-471.md` (run folder) | "Inside 471 INSIDE-MARKER-471 …" | no node-file request (workspace file) | 0 |
| `/srv/abtest471/missing-471.md` | "Error!This file was not found on the computer." | node-file 404 | 0 |
| `/srv/abtest471/reports-471.md` (folder) | "Error!This path is a folder, not a file." | node-file 400 | 0 |
| `/srv/abtest471/device-471.txt` (link to `/dev/null`) | "Error!The file preview could not be opened." | node-file 400 | 0 |

Every tab `readOnly: true`; the status line empty; no "host workspace" text. Console errors: the 404 and 400 answers above only.
Lifecycle: the store's 5 object URLs (picture, PDF, audio; picture and PDF reopened) all revoked when their tabs closed.

## D4 Which component makes each object URL (RU-02, RSK-002) — `steps/d4-object-urls.js`, `results/d4.json`

PNG, PDF and WAV node files (`_loadNodeFile`): revoked on close, including a reload's replacement. Not revoked: 2 × `text/javascript`
1,890,161 bytes from `_createCDNWrapper` (pdf.js's worker, one per PDF view; the PDF viewer is not changed by this ticket) → FU-001.

## D5 The remote run (API-02, AC-003 desktop) — `steps/d5-remote-run.js`, `results/d5.json`

The remote run on host-b-471 opened in A's window ("REMOTE-PATH-471" shown).
- Link `<B-root>/workspace/b-notes-471.txt` in its own message: status line **"That file is on host-b-471: open the run in that
  node's window to see it."** (expected: "This file is on host-b-471, where this run runs."); no Files drawer; no request. (`shots/d5-link.png`)
- Path attachment chip `b-notes-471.txt`: status line unchanged (the same text); no drawer; **a request `GET /rest/node-files/content`**.

## D6 What the attachment click did — `steps/d6-remote-attachment-state.js` (output copied)

```
before/after: panels [{ ws: "agent_ws_94c695753", active: "b-notes-471.txt",
  open: [{ file: "b-notes-471.txt", error: "node-file-preview:not-found", readOnly: null }] }]
activeRun: "publisher_1a34f27934944fbc8c9bb3020fb83726"
responses: [{ host: "127.0.0.1:59343", file: "b-notes-471.txt", status: 404 }]      ← node A asked for node B's path
drawerAfterClick: 0
status: "That file is on host-b-471: open the run in that node's window to see it."
```

## D7 A path attachment outside the run's folder, in A's own run — `API-01-attach-message.mjs`, `steps/d7-local-attachment.js`

A message attaching `/home/autobyteus/shared/notes-471.md` (context_file_paths, as the desktop composer sends a path attachment).
Click on its chip (output copied):

```
{ drawer: 0, fileState: { file: "notes-471.md", type: "Text", mode: "edit", accessIntent: null, error: null, hasContent: true },
  responses: [{ route: "/rest/node-files/content", status: 200 }] }
```

The run view still showed the remote run's "That file is on host-b-471: …" line after switching to A's run (`shots/d7-local-attachment.png`) → FU-002.

## D8, D9 That file in the Files panel: edit and save — `steps/d8-attachment-edit.js`, `steps/d9-attachment-save.js`

Files opened from the tool rail: the node file is in the Monaco editor with the Edit/Preview toggle on Edit (`shots/d8-before-typing.png`).
D9 typed at its last line and pressed Cmd+S (output copied):

```
{ editorFound: 1, typedShown: true, afterSaveShown: true, toast: "", alert: "",
  requests: [ …, { method: "POST", route: "/graphql", op: "WriteFileContent" }, … ] }
```

Node A's log: `GraphQLError "The path must be relative to the workspace root." at WriteFileOp…`. The container's file is unchanged
(`docker exec … cat /home/autobyteus/shared/notes-471.md` = the original six lines); no other file written. The editor keeps the
typed text with no error shown (`shots/d9-after-save.png`).
