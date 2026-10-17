# API-F007-UNSAVED: focused trace (not independent failure-origin verdict)

Current technical candidate d3c88 / SR025 acceptance. AC-010 / REQ-011 / SCN-006 explicitly require preservation of unsaved edits.

- Actual isolated desktop native-key edit and independent Docker-node write reproduced the loss twice. `ui-unsaved-save-control.json` validates actual model/save boundary; `ui-unsaved-peer-reproduction.json` removes reload/close ambiguity. No close, discard, save or confirmation between unsaved `cd` and visible `API007_PEER_REPRO_FINAL`.
- `fileExplorerTreeActions.ts:handleFileSystemChange` handles stream `modify`, resolves the actual tree node and calls `invalidateFileContent` unless an own-save echo is expected.
- `fileExplorerContentActions.ts:invalidateFileContent` clears open Text content and refetches via network-only GraphQL. This is a real refresh, not stale NFS bytes.
- `FileExplorerTabs.vue` stores editor updates in local `fileContent`; a deep watch on activeFileData unconditionally replaces it from refreshed content. `FileViewer` receives activeFileData. There is no demonstrated dirty/conflict guard along this path.
- New narrow durable `FileExplorerTabs.unsaved.spec.ts` exercises real store/event path and parent editor update/Save, mocks only child editor/network response/persistence. No-peer control passes; peer-modify assertion fails because Save receives peer bytes instead of unsaved draft. It supports, does not replace, the real desktop reproduction.

Preliminary classification: implementation behavior, scope/origin to be independently determined by Code Reviewer. No production change here. Prior API004 synthetic EditContext observation is not sufficient to close this trusted native-input failure. Do not relabel historical API006.
