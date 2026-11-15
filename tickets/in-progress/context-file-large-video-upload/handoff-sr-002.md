# Handoff SR-002 — Architecture Design Complete (autobyteus-workspace-6)

- Package: `context-file-large-video-upload`; Project Task `autobyteus-workspace-6` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`)
- Requested by: `/project_task_manager` (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`), on the user's phone report
- Classification: `Architecture Design Complete`; `task_size = Large`, `architectural_risk = High` (design-spec "Task Size And Architectural Risk")
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`, branch `task/context-file-large-video-upload`, base `origin/personal` @ `3d738de6e`; finalization target `origin/personal`; **no release** (stop at merge-ready, report to the manager)
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/tickets/in-progress/context-file-large-video-upload/`

## Original request (summary)

The user could not attach three phone videos in the composer on Android ("无法附加 VID_….mp4。 Uploaded file is too large."). Goals: support large video attachments with a configurable limit (larger for video/audio), robust on mobile (progress, cancel, clear failure, no half-written files, TTL cleanup), keep agents safe (no large video inlined into model requests), one localized message with the file name and limit, tests per TESTING.md, isolated worktree, no unrelated changes.

## Approval basis

- Requirements `Approved` at SR-002. DEC-001 (media default 2048 MiB) decided by the manager under the user's delegation (message 2026-11-15); DEC-002..DEC-009 decided by the Solution Designer within the direction, user informed.
- Release-order constraint RC-001: release only with or after the Memory Sync large-file Task `autobyteus-workspace-7` (FU-001, created by the manager).

## Solution in brief

- Server: per-type configurable size policy (`AUTOBYTEUS_CONTEXT_FILE_MAX_MB` 25 default, 1–1024; `AUTOBYTEUS_CONTEXT_FILE_MEDIA_MAX_MB` 2048 default, 1–10240), resolved per upload; each multipart route owns its cap (avatar `/upload-file` stays 25 MiB); typed refusals `413 CONTEXT_FILE_TOO_LARGE {maxBytes}` / `415 CONTEXT_FILE_TYPE_UNSUPPORTED`; new `GET /rest/context-files/size-limits`; Project Task uploads and tool copies share the policy; tool text drops the fixed "25 MiB".
- Web: limits read per pick, over-limit files refused before any bytes, progress and cancel per uploading item, one localized message per failure reason with names and limit, raw server text never shown; Project Task composer gets the pre-check and messages.
- Native runtime: local media above 25 MiB is not inlined into provider requests (path stays in `Reference files:`).

## Evidence

- Reproduction and measurements: `probes/large-upload-probe.integration.test.ts.txt`, `probes/probe-results-2026-11-15.txt` (P1 reproduced the user's message; P2 600 MiB streamed at RSS ≤ 180 MiB; P3 abort leaves no file).
- Architecture evidence: investigation-notes "Architecture Investigation Findings" and design-spec "Architecture Investigation Evidence".

## Open risks

- R-001 / FU-001 Memory Sync (own Task; RC-001). R-003 / FU-002, FU-003 minor follow-ups.
- ASM-001: browser `File.type` vs multipart Content-Type for videos (to confirm on the phone bundle).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, this file.

## Expected next action

Architecture review of `design-spec.md` SR-002 against the approved requirements.

## Route record

- Handoff rules checked 2026-11-15: `Architecture Design Complete` with `task_size=Large` / `architectural_risk=High` → `/software_engineering_team/architecture_reviewer`.
