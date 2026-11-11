# autobyteus-472 — Architecture Design Complete (phone viewer: pinch zoom for PDFs and images; Download to the phone)

- Package: `phone-viewer-pinch-zoom-472`, SR-002; task_size `Medium`, architectural_risk `High` (a new page→app shell-bridge action that writes files on the phone; a new Android APK)
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472`, `codex/phone-viewer-pinch-zoom-472`, `origin/personal` @ `ed481ae4ca` (with autobyteus-471); finalization target `origin/personal`. Documents uncommitted; no source changed.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user; Project Task `autobyteus-472`.
- Approval: requirements REQ-001…006 approved by the user (2026-11-11: "You will make the decision for me I will approve your decision"); scope PDF and images only; Download added by the user.
- Coordination: autobyteus-452 (another copy) changes file-change events and reloads through `_reloadOpenFile`; 472 changes none of those; REQ-006 keeps the zoom when the same path reloads. autobyteus-475 (PdfViewer follow-ups) comes after 472.

## Review focus

- DS-001 PDF pinch zoom (re-render at width × zoom, 1–3×, scroll anchor; one finger keeps native page scrolling); DS-002 image zoom through `usePictureZoom` (renamed from `useNodeDesktopZoom`); zoom state keyed to the file path (REQ-006).
- DS-003 Download: bytes from the open file's URL → bridge `saveFile` (main frame, node origin, PDF/image MIME, plain file name) → Android `DownloadsSaver` (MediaStore Downloads on 29+, CREATE_DOCUMENT on 26–28) → toast; browser fallback `<a download>`. No credential in any message, name or log. New APK; no capability negotiation (DESIGN.md rule 9).

## Documents (`/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/`)

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`.

## Route

`get_handoff_rules`: `Architecture Design Complete`, architectural_risk High → `/software_engineering_team/architecture_reviewer`.
