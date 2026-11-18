# Handoff — autobyteus-450, SR-002: Architecture Design Complete

- Package: `conversation-file-open-450` (Project Task `autobyteus-450`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Result: `Architecture Design Complete`; `task_size: Medium`, `architectural_risk: Low`
- Route (`get_handoff_rules`, 2026-11-09): `/software_engineering_team/implementation_engineer` (Small or Medium with Low risk → direct implementation; implementation checks, API/E2E validation and delivery still apply)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450`, branch `codex/conversation-file-open-450`, base `origin/personal` at `6884309283` (v1.5.13-beta.1); finalization target `origin/personal`. No product code is changed yet. The ticket documents are on disk, not committed. The server and phone bundle are already built.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/tickets/in-progress/conversation-file-open-450/`

## Request

Two bugs in one Task, at the user's word:
1. On the phone, an attached image opens "Pair this phone again". This is a regression since 437, in v1.5.12.
2. A file link opened again after the agent rewrote the file shows old content. This is general: desktop and phone.

Constraints:
- no new Android permission;
- no weaker key rules (nothing in URLs, no cookies or tokens);
- the phone keeps reading what its key allows (436);
- no stored-data change;
- isolated nodes and test files only (never the user's screenshots 44–47 or his data);
- DESIGN.md and TESTING.md;
- release only on the user's word.

## Causes (reproduced; `investigation-notes.md`)

- **Bug 1, page:**
  1. The attachment thumbnail is a plain `<img>`, so it carries no key and the node answers 401 (the chips show as names).
  2. The tap falls back to `window.open(node URL)`, which also gets 401.
- **Bug 1, app:** in the WebView, `window.open` navigates the main frame, and the app maps any main-frame 401 to "Pair this phone again".
- **Bug 2:** `fileExplorerContentActions._openFileWithMode` reuses an already-open file without reloading it, on the desktop and the phone. The phone never closes files.

## What to build (`design-spec.md`)

- **DS-001 (phone):**
  - `UserMessage` loads thumbnails through `useAuthorizedObjectUrl`;
  - a tap goes to the new `useMobileAttachmentOpening`;
  - the Files screen gets an attached-file entry (`openContextFile`, query `contextFile`), loaded by a generalized `useMobileNodeFile`;
  - path attachments use the phone path-open function extracted from `useEventMonitorFilePreview`.
- **DS-002 (bug 2):** an explicit open of an already-open file reloads it. Text: refetch, keeping `editorDraft`. Media: `contentRevision`, which the viewers follow.
- **DS-003 (Android):** `KeepPage` for main-frame same-origin navigations outside the phone page (`/rest/…`, `/graphql`); subframes unchanged.

Note: the page fixes reach users with the node update. The Android `KeepPage` change needs a new APK. With the page fix alone, an old APK no longer navigates on a tap.

## Reproduction to start from

`node /Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/tickets/in-progress/conversation-file-open-450/evidence/repro/file-open-repro.mjs --output-dir=<fresh>`.
- Today: `D2: VERSION-ONE`, `P2: VERSION-TWO`, `bug1.chipKind: name-chip`, tap → `/rest/…` 401.
- After the fix: `D2: VERSION-TWO`, `P2: VERSION-THREE`, thumbnail, viewer open, no navigation.

## Open items

- ASM-001 (the Android screen comes from the main-frame 401): confirm on the emulator.
- FU-001 (live refresh of an open viewer) is in `follow-ups.md`.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/repro/file-open-repro.mjs` (results in `evidence/repro-run-1/`).
