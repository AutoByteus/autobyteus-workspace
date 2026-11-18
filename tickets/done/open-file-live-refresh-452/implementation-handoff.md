# Implementation Handoff — autobyteus-452

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452/tickets/in-progress/open-file-live-refresh-452/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452`, branch `codex/open-file-live-refresh-452`, base `origin/personal` `827f1e68dc`.
Commits: `e0bb6399c7` (code and tests); the ticket documents and evidence follow in one docs commit (named in the handoff message).

**State (IR-001): SR-002 is implemented and passes the reproduction on the desktop window and the phone bundle.** The package goes to API/E2E (direct route).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Medium` / `Low`, direct route → API/E2E.
- Requirements doc: `requirements-doc.md` (Approved, SR-001).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md`.
- Design spec: `design-spec.md` (SR-002); `handoff-sr-002.md`.
- Supplemental task artifacts: `evidence/repro/open-viewer-refresh-repro.mjs` (unchanged); `follow-ups.md` (FU-001, unchanged).
- Design review report / architecture review revision record: `N/A — not applicable` (not selected).
- Triggering rework report: N/A (initial round).
- Overlap note from the Solution Designer (2026-11-11, PM relay): autobyteus-471 changes `_reloadOpenFile` (adds `_loadNodeFile` routing for absolute-path node files; a non-text reload replaces `fileState.url`). 471 does not touch the `modify` shape or `fileExplorerTreeActions.ts`. This change keeps 450's call shape, `_reloadOpenFile(file, path, workspaceId, windowNodeContextStore)`, and does not edit `fileExplorerContentActions.ts`. Whichever ticket merges second rebases. 472 keys zoom by path, so a live refresh keeps the zoom. Absolute-path files get no live refresh (FU-001); no absolute-path matching was added.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: N/A

What the change does (DS-001):

1. **The node sends `modify` by path** (`autobyteus-server-ts/src/file-explorer/`):
   - `ModifyChange` is now `{ type: 'modify', path }`. `node_id` and `parent_id` are gone; it's a clean cut, DESIGN.md rule 9.
   - `ModifyNodeSynchronizer` no longer looks in the lazily loaded tree. It always reports the workspace-relative path with POSIX separators, so a change in a folder the client never expanded is sent.
   - `WatchdogHandler`:
     - `handleModify` sends that `modify`;
     - `handleAdd` of a **file** sends its structural `add` (as before, possibly none if the node is already in the tree) plus a `modify` for the path;
     - `handleMove` of a **file** sends its structural rename/move (possibly none) plus a `modify` for the destination. See "Decisions made inside the design" for why the move case is included.
   - `WriteFileOperation` (the window's own save) returns the same path-based `modify`, using the normalized path.
2. **The window reloads an open file with that path** (`autobyteus-web`):
   - the types (`types/fileSystemChangeTypes.ts`, `services/fileExplorerStreaming/types.ts`) carry `path`;
   - `fileUtils.handleFileSystemChange` leaves the tree alone on `modify`. The unknown-node warning and the `handleModifyChange` helper are gone.
   - `fileExplorerTreeActions.handleFileSystemChange`, for each `modify`:
     - if the path is marked as the window's own save, it unmarks it and stops;
     - otherwise, if a file with that path is open, it calls 450's `_reloadOpenFile(file, path, workspaceId, useWindowNodeContextStore())`: text is read again (`editorDraft` untouched) and media bump `contentRevision`;
     - otherwise nothing happens, so there are no reads. The old id lookup and `invalidateFileContent` call are gone.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence: 8 production files, net −6 lines (+41/−47), all inside the existing owners the design names (plus `write-file-operation.ts`, a one-word change). The stream contract changes as the design allows, between the node and web client of one release. No persistence or key-rule change, and no new mechanism.
- Selected route: `Direct API/E2E`.
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`.

## Lightweight Implementation Self-Review

- **Correctness:**
  - the window's only reaction to `modify` is the path match;
  - a burst of changes to files that are not open does nothing on the window (unit: 20 changes, 0 reads);
  - own-save marks are consumed by the save's own mutation result, which now carries the same path the window marked (unit).
- **No polling:** nothing new runs on a timer. Reads happen only for an open file whose path arrives in a `modify`.
- **Unsaved edits:** `_reloadOpenFile` never writes `editorDraft` (unit, and the existing `FileExplorerTabs.draftViewer` / `.unsaved` specs, which now drive the path shape).
- **Phone:** the same store rule (450) and its key-based reads. No URL or credential change.
- **Dead code in touched files:** `handleModifyChange` (a no-op with a warning) and the `ModifyChange` import in `fileUtils.ts` were removed. No other unused code was found.

## Decisions made inside the design (for review)

- **A file move also sends `modify` for its destination.** The design covers an atomic write from another folder (UNK-001) through the "file `add` → `modify`" rule. In the watcher (`file-system-watcher.ts` `handleAdd`), an `add` arriving within 200 ms of an `unlink` of the same kind becomes `handler.handleMove(source, destination)`. So a temp file written elsewhere and renamed over the target reaches the handler as a **move**, not an add. `MoveNodeSynchronizer` also sends nothing when the source is not in the tree (an unloaded folder). Without this, UNK-001 would stay open. The extension is the same rule applied to the path the watcher actually uses: one `modify` for a file move's destination, in the same handler. It is unit-tested: "reports the destination of a file moved over a path in an unloaded folder (atomic rewrite)". It does not change behavior or scope (REQ-001 names atomic renames), so it is recorded here rather than routed as a Design Impact.
- **`WriteFileOperation` passes the normalized path.** The old synchronizer looked the node up, so its id stood for the normalized path. The new path-based `modify` uses `path.normalize(filePath)`, the same identity. The window marks the path it saves, which is already normalized for workspace files.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-003 | Unexpanded folder: refresh ≤ 3 s | watcher `change` → `WatchdogHandler.handleModify` → `ModifyNodeSynchronizer` (no tree lookup) → stream → `fileExplorerTreeActions` path match → `_reloadOpenFile` | Fixed: `A` re-read at 463 ms (desktop) / 507 ms (phone), `A-VERSION-2` (IMP-02; none and `A-VERSION-1` in IMP-01) |
| BEH-004/005 | Image/PDF: refresh ≤ 3 s | same path → `_reloadOpenFile` → `contentRevision += 1` → the viewer reads through `fetch` `no-store` (450) | Fixed: `C` 511/513 ms, `D` 513/516 ms (IMP-02; none in IMP-01) |
| BEH-002 | Atomic rewrite, also in unloaded folders | in-folder rename → `change` (measured, case B); rename from elsewhere → watcher move → `handleMove` → `modify` for the destination; a bare add → `handleAdd` → `modify` | `B` (root) 521/518 ms (IMP-02); unloaded-folder and cross-folder cases unit-tested (IMP-03), and the probe goes to API/E2E |
| BEH-001 | Loaded-folder text: unchanged | same path | `E` 521/516 ms (IMP-02) |
| BEH-007 | Unsaved edits kept | `_reloadOpenFile` never writes `editorDraft` | Unit (IMP-04) |
| REQ-002 | No reads for files that are not open; no reload loop on own save | path match only; own-save mark consumed by the mutation result | Unit (IMP-04) |
| BEH-006 | Explicit open (450) unchanged | `fileExplorerContentActions.ts` not edited | `fileExplorerReopen.spec.ts` passes (IMP-04) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/file-explorer/file-system-changes.ts`, `tree-state-synchronizers/modify-node-synchronizer.ts`, `watcher/watchdog-handler.ts`, `operations/write-file-operation.ts`.
- Web: `autobyteus-web/types/fileSystemChangeTypes.ts`, `services/fileExplorerStreaming/types.ts`, `utils/fileExplorer/fileUtils.ts`, `stores/fileExplorerTreeActions.ts`.
- Tests:
  - new: `autobyteus-server-ts/tests/unit/file-explorer/watcher/watchdog-handler.test.ts` and `autobyteus-web/stores/__tests__/fileExplorerLiveRefresh.spec.ts`;
  - updated to the path shape: `tests/unit/file-explorer/file-system-changes.test.ts`, `utils/fileExplorer/__tests__/fileUtils.test.ts`, `components/fileExplorer/__tests__/FileExplorerTabs.{draftViewer,unsaved}.spec.ts`;
  - extended: `tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts`, where a rewrite returns `{ changes: [{ type: 'modify', path }] }`.

## Important Assumptions

- None open.

## Known Risks

- RSK-001 (message volume during a burst): every changed workspace file now sends one small `modify`, batched by the existing event batcher. Not measured here; design step 4 assigns it to validation.
- Merge order with autobyteus-471 (above): no file in common, so a textual conflict is not expected. 471 changes the body of `_reloadOpenFile`, which this change calls.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix.
- Implementation matched the reviewed assessment: `Yes`, with the move case recorded above.
- If challenged, routed as `Design Impact`: N/A.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no `node_id` kept next to `path`).
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes` (`handleModifyChange`).
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`. `ModifyChange` has one meaning, a content change of a path.
- Changed source files within size guardrails: `Yes`. Non-empty lines:
  - `file-system-changes.ts` 218 → 215;
  - `modify-node-synchronizer.ts` 20 → 21;
  - `watchdog-handler.ts` 111 → 119;
  - `write-file-operation.ts` 47 → 47;
  - `fileExplorerTreeActions.ts` 163 → 163;
  - `fileUtils.ts` 203 → 191;
  - types +0 / +2.

## Persisted Data Transition Check

- `Not Affected`. Followed: `Yes`.

## Environment Or Dependency Notes

- macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2.
- The reproduction uses an isolated node from this worktree, with test files only.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build outputs, not part of the change.

## Checks Run

Evidence paths are relative to the ticket folder's `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node evidence/repro/open-viewer-refresh-repro.mjs --output-dir=…` (before any change, after both builds) | `827f1e68dc` | as above, headless Chrome, `nuxt dev` desktop window and the node's `/mobile` bundle | live refresh of A–E on both surfaces | BEH-001…005 (fail expected) | Pass (reproduced) | `IMP-01-repro-baseline/` (`README.md`, `repro-stdout.log`, logs, screenshots) | `A` `"textAfter8s":"A-VERSION-1"`, `"contentReadsAfterChangeMs":[]`; `C`, `D` `[]`; B and E ~0.5 s |
| IMP-02 | same, after the change and IMP-06 | `e0bb6399c7` | as IMP-01 | as IMP-01 | AC-001 (in place; atomic at root), AC-002 (re-read), QR-001 | Pass | `IMP-02-repro-after/` (`README.md`, `repro-summary.json`, `repro-stdout.log`, logs, screenshots) | every case one re-read at 463–521 ms on both surfaces; `A` `"A-VERSION-2"` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/file-explorer tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts`; the new handler test against the base source | `e0bb6399c7`; base source for the red run | as above | `ModifyChange`, `ModifyNodeSynchronizer`, `WatchdogHandler` (change, add, move, ignored), the write mutation's result | REQ-001, AC-004 (own save) | Pass (red on base: 6 failed, 2 passed) | `IMP-03-server-file-explorer-tests.log` | `Test Files  13 passed (13)`, `Tests  81 passed (81)`; `## RED` `Tests  6 failed \| 2 passed (8)` |
| IMP-04 | `vitest run stores/__tests__/fileExplorerLiveRefresh.spec.ts` against the base tree actions (red), then with six neighbouring specs | `e0bb6399c7`; base `fileExplorerTreeActions.ts` for the red run | as above | the path match, text/image/PDF reload, no read for a file that is not open, the draft kept, the own save not read back | REQ-001, REQ-002; AC-002 (unit), AC-003, AC-004 | Pass (red on base: 5 failed, 1 passed) | `IMP-04-web-live-refresh-specs.log` | `## RED` `Tests  5 failed \| 1 passed (6)`; `## GREEN` `Tests  75 passed (75)` |
| IMP-05 | `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-server-ts typecheck`; `guard:web-boundary`; `guard:localization-boundary` | `e0bb6399c7` | as above | type and boundary rules | — | Pass | `IMP-05-typecheck-guards.log` | web `test-file errors: 93 in 40 files (baseline 93 in 40 files)`; server `(baseline 1180 in 364 files)`; `PASS` ×2; `Passed.` ×2 |
| IMP-06 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `e0bb6399c7` | as above | server `dist`, the served phone bundle | — | Pass | `IMP-06-builds.log` | `posixPath` and `contentChangeFor` in `dist` |
| IMP-07 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit` (full), then the one failing file alone ×3 | `e0bb6399c7` | as above | every server unit test | AC-005 | Pass, with one unrelated flake: `pairing-auth-service.test.ts` › "exchanges a single-use code…" failed once under full-suite load and passes 3/3 alone. That test is in remote-access, with no file-explorer path | `IMP-07-server-unit-full.log` | `Tests  1 failed \| 7581 passed`; rerun `Tests  14 passed (14)` ×3 |
| IMP-08 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` (full web suite) | `e0bb6399c7` | as above | every web spec | AC-005 | Pass | `IMP-08-web-unit-full.excerpt.log` | `Test Files  750 passed (750)`, `Tests  5668 passed \| 2 skipped (5670)` |

- Not run, and why:
  - the design's step-3 probe is API/E2E's. Its cases: atomic and cross-folder rewrites in an **unexpanded** folder through the real watcher, a desktop text file with an unsaved edit, 20 rewritten files that are not open with no reads in the network log, a same-window save, and the image's new size / the PDF's new text seen in the viewer;
  - step 4 (RSK-001 message count) is assigned to validation by the design.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the desktop and phone file viewers, which show new content by themselves. There is no visual change.
- Inspected: `IMP-02-repro-after/desktop-A.png` and `phone-A.png` show `A-VERSION-2`. `phone-C.png` shows the viewer, but the test PNG is 1–2 px, so the new image's size is not visible there.
- Not inspected: the image's new size and the PDF's new text in the viewer (AC-002's visual clause). The re-read is proven (IMP-02); seeing it is for the API/E2E probe with larger test files.

## Downstream Coverage Hints / Suggested Scenarios

- Unexpanded folder `deep/inner/a.md`, open on desktop and phone:
  - an in-place rewrite;
  - an atomic rewrite with a temp file in the same folder;
  - an atomic rewrite with a temp file in **another** folder (the watcher's move path).

  Each should be re-read within 3 s.
- `pics/c.png` / `docs/d.pdf` with visibly different versions (size, text) in unexpanded folders, plus a root image.
- 20 files that are not open rewritten: no `GetFileContent` or content GET in the network log, and no folder reads.
- A same-window save of an open file: one write, no reload loop. An unsaved edit in an open tab survives an outside rewrite.
- RSK-001: count the stream messages for 200 file changes in an unexpanded folder.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All of the above.
