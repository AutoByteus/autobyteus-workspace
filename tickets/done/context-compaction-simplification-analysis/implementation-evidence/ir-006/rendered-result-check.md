# IR006 rendered-result limitation

Backend-only source delta; no frontend markup/layout/copy/store changes. It affects the existing Server Settings > Compaction configuration > Effective context override Save interaction (REQ008/AC010), so direct save/reopen feedback remains relevant. Adjacent CompactionConfigCard draft validation/buildChanges/save and store/GraphQL forward path inspected; no UI redesign is approved or needed.

TESTING.md requires a worktree isolated desktop instance for a full product journey. Current CUA `await cua.getState()` returned exactly:
```
{"apps":[],"browsers":[],"errors":["Native apps: Error: Sky Computer Use native pipe startup failed"]}
```
No usable automation surface, no observed fixed desktop save/reopen, no visual/responsive/keyboard Pass. No alternate UI automation bypass, app build/bring-up or user-running app interaction attempted; no new service left running. Existing API005 real desktop/HTTP failure is attributed prior evidence, not a successful current run. Fresh direct service integration proves normal persistence/reload only, not rendered UI. Independent API/E2E must re-exercise the real product save/readback/reopen after source review before continuing recovery/resume gates.
