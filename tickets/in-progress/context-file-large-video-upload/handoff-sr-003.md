# Handoff SR-003 — revised design for architecture re-review (autobyteus-workspace-6)

- Package: `context-file-large-video-upload`; Project Task `autobyteus-workspace-6`; requested by `/project_task_manager`
- Classification: `Architecture Design Complete` (revised), `task_size = Large`, `architectural_risk = High` (unchanged)
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`, branch `task/context-file-large-video-upload`, base `origin/personal` @ `3d738de6e`; no release (stop at merge-ready); RC-001: ship with or after `autobyteus-workspace-7`
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/tickets/in-progress/context-file-large-video-upload/`
- Approval basis: requirements Approved at SR-002; SR-003 changes terminology only (AR-001) and states the per-limit grouping already implied by REQ-006 (AR-002). No renewed approval needed (reviewer: within approved scope, behavior unchanged).

## What changed for ARCH-REV-001

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 | Limits renamed: **audio/video limit** (`AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB`, `audioVideoMaxBytes`, `audioVideoMimeTypes`, `audioVideoContextFileMimeTypes`) and **other-file limit** (`AUTOBYTEUS_CONTEXT_FILE_OTHER_MAX_MB`, `otherFileMaxBytes`); "media" no longer used for context-file limits; `GLOSSARY.md` "Context Files" section written on the branch; REQ-001/REQ-002/DEC-003 wording updated | design-spec Terminology, naming check, interfaces, file mapping; requirements-doc; `GLOSSARY.md` |
| AR-002 | `too_large` lines keyed by `(reason, maxBytes)` in a composable computed; component renders only; two-limit example | design-spec DS-003 narrative, Ownership Map, file mapping, Examples; REQ-006/AC-005 wording |
| AR-003 | Limits resolved once per operation: the two upload routes and `ProjectTaskService` (`create`/`update` local files); `importLocalFiles(…, limits)`; stores/writer never call the resolver | Dependency Rules, interfaces, file mapping (adds `project-task-service.ts`) |
| AR-004 | Each transport unwraps its envelope; one mapping `contextFileUploadFailureFor({status, code, maxBytes})` | file mapping |
| AR-005 | Size check before image base64 validation; reuse `isValidMediaPath` | file mapping |
| AR-006 | ASM-001 text corrected; P-001, P-002 recorded | Risks |
| AR-007 | Checked by probe before revising: P4 — a writer refusal that errors the stream gives the client its body but leaves the request undrained (connection never idle, `app.close()` > 8 s); P5 — draining the rest of the file gives 413, idle connection, no file. **The writer now drains over-limit files**; the integration test also checks prompt close | Bounded Local Spines, test guidance; `probes/probe-results-2026-11-15.txt` P4/P5 |

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md` (SR-003), `solution-revision-record.md` (SR-003), `follow-ups.md`, `probes/probe-results-2026-11-15.txt`, this file; `GLOSSARY.md` at the repository root of the worktree.

## Expected next action

Architecture re-review of SR-003 (AR-001, AR-002 rechecks; AR-003..AR-007 dispositions).

## Route record

- Handoff rules checked 2026-11-15: revised `Architecture Design Complete`, Large/High → `/software_engineering_team/architecture_reviewer`.
