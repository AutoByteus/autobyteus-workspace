# Handoff SR-005 — AC-003/QR-002 ruling (memory-sync-large-files)

- Package: `memory-sync-large-files`; Project Task `autobyteus-workspace-7`; requested by `/project_task_manager`
- From: Solution Designer (run `solution_designer_701e101b5b534002b91d94fca7efaad7`)
- To: API/E2E engineer (run `api_e2e_engineer_ee1c6886a1db4f48aa16f454559c72ad`), answering its round-1 question
- Status: requirements `Approved` (SR-005; AC-003/QR-002 restated, DEC-008, Solution Designer within the direction, user informed 2026-11-15); design unchanged (SR-004, ARCH-REV-003 Pass); classification `Large` / `High`.
- Worktree `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`; base `origin/personal` @ `3d738de6e`; no release.

## RELEASE ORDER

Release before or with `autobyteus-workspace-6`.

## Ruling (requirements-doc DEC-008)

- Neither option as offered. A warm-only reading would hide the about 300 MiB first transfer on the desktop's server. Binding Node 22 only would ignore the desktop, which runs Node 24.
- **Binding:** the first transfer of a fresh process is included, on both release runtimes: Node 22 (server image, release workflows) and the desktop's Electron Node 24.
- **Revised AC-003 / QR-002:** the file is imported with an equal SHA-256, and the peak RSS growth over idle of source and hub stays below 400 MiB, both with a 2 GiB file and with a file of at least 4 GiB. A bound far below the file size shows there is no whole-file buffering.
- **Judge on the existing evidence:** API-07 measured maxima are Node 24 source 362.9 MiB (8 GiB) and hub 270 MiB (one 4 GiB run); Node 22 source 171.8 and hub 103.8. Node 26 is not a release runtime and is recorded as information.
- The SR-001 200 MiB figure was my own proxy for REQ-002. REQ-002 (memory independent of file size) is unchanged and met. The fixed first-use cost is follow-up FU-004.

## Other items

- **OBS-1:** this ticket's problem. The change introduced it, and the card row must stay readable (REQ-007, AC-010). Route it as a Local Fix by your normal route: `break-words` on the row and `break-all` on the path span only. Then re-validate the card (en and zh-CN, long path, no word splits).
- **OBS-2:** accepted (REQ-007 is met). Follow-up FU-005.
- **OBS-3:** accepted, no action. The real source never sends a wrong offset, and the sweep removes the partial after 24 h.
- **FU-003:** stays an urgent follow-up, sent by me when the ticket leaves the team. Delivery records the pre-existing typecheck failure with your base-commit evidence. This ticket stops at merge-ready and does not release.

## Documents

`requirements-doc.md` (SR-005), `solution-revision-record.md` (SR-005), `investigation-notes.md`, `design-spec.md`, `follow-ups.md` (FU-004, FU-005 added).

## Route record

- No handoff rule covers answering a downstream question; replied to the asking agent by run id (the rules cover Architecture Design Complete, Release Requested and delivery receipt gaps only).
