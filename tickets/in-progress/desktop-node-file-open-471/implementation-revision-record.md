# Implementation Revision Record — desktop-node-file-open-471 (autobyteus-471)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (SR-002, direct route) | N/A | `Initial Baseline` | SR-002 | Implemented; ready for API/E2E |

## Revision Entries

### IR-001 — Desktop opens node files; remote-run paths name their node; no phone size limit

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/desktop-node-file-open-471/handoff-implementation.md`, initial round (direct route, Medium/Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: REQ-001…REQ-004 implemented on `codex/desktop-node-file-open-471` (commits `12ccdcc116`, `e04b875f78`, `a64f407954`, `7917df2a15`, `c686acfaff`, `2e2b9ed436`); implementation-scoped checks in `implementation-handoff.md`.
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A (direct route)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004, BEH-005; REQ-001…REQ-004; AC-001…AC-005.
- Implementation delta:
  1. `utils/fileExplorer/nodeFileContent.ts` (new): one node-file loader for both clients (URL, fetch with `authorizedFetch`, text or blob, refusal → `not-found` / `folder` / `failed`, message keys, the Files panel's coded error `node-file-preview:<refusal>`). `useMobileNodeFile` uses it.
  2. `stores/fileExplorerContentActions.ts`: one routing rule (`loadRouteOf`): an absolute path is local in the embedded window with the local-file capability and a node file in every other window. `_loadNodeFile` loads it; object URLs are revoked on close, close-all, close-others, deleted-scope close and reload. A file closed mid-load keeps nothing.
  3. `FileExplorerTabs.vue` words the node-file refusals with the 436 messages.
  4. `useEventMonitorFilePreview.ts`: a remote run's path shows `file_on_other_node`; any absolute path outside the run's folder opens as a node file; `file_available_on_host` removed. `mobileFileOpening.ts` / `useMobileAttachmentOpening.ts`: `unavailable` carries `nodeName`. Locales (en, zh-CN) updated.
  5. `MobileFileViewer.vue`: `MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge` and the "too large" line removed.
  6. Probes: MSP-37 (desktop window, node files and reasons), MSP-16 (130,000-character Markdown), MSP-29 (node name), and the event-monitor probe's negative check. Docs: `file_explorer.md`, `content_rendering.md`, `remote_access.md`.
- Changed files or areas: `autobyteus-web` only (see the handoff's Key Files).
- Local validation and result: all pass. IMP-01…IMP-05 ran on `7917df2a15` (typecheck at baseline; 750 web spec files; guards; builds); the later commits change only probe files. IMP-06b (phone and desktop probe cases MSP-16, 28–31, 37) and IMP-07 (removed-text grep) ran on `2e2b9ed436`. See `implementation-handoff.md` § Checks Run. The probe also needed the duplicate MSP-32 renumbered to MSP-38 (handoff assumption 6).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route).
- Remaining limitations or risks: the Electron + test-owned Docker node run (AC-001's stated verification) is left to API/E2E. MSP-37 covers the same Files panel path in a non-embedded browser window with the owner credential attached.
