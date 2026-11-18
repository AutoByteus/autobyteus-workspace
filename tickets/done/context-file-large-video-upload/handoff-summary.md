# Handoff Summary — context-file-large-video-upload (autobyteus-workspace-6)

## What this delivers

A phone (or desktop) user can attach a video far larger than 25 MiB to a message and send it to an agent. The agent gets the absolute path to the whole file under `Reference files:`.

- **Per-type limits.** Audio and video files up to the audio/video limit (default 2048 MiB); every other accepted file up to the other-file limit (default 25 MiB). Both are node settings (`AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB`, 1–10240; `AUTOBYTEUS_CONTEXT_FILE_OTHER_MAX_MB`, 1–1024), read at each operation, so a change applies to the next upload with no restart. The same policy covers the composer, Project Task uploads and the Project Task agent tools' local-file copies.
- **Typed refusals.** The server answers `413 CONTEXT_FILE_TOO_LARGE` (with `maxBytes`) and `415 CONTEXT_FILE_TYPE_UNSUPPORTED`; `GET /rest/context-files/size-limits` publishes the limits.
- **Web composer.** Refuses an over-limit file before sending any byte, shows `NN%` and a cancel control while uploading, and shows one localized line per failure reason (size: one per limit); the raw English server text is gone. Cancel and a dropped connection leave no file on the node.
- **Native runtime.** A local image, audio or video larger than 25 MiB is never base64-inlined into a model request; its path stays in `Reference files:`.

`task_size` `Large`, `architectural_risk` `High`, route `Code Review` (architecture review ARCH-REV-002 Pass; source review CRR-001 Pass; test-code review CRR-002 Pass; API/E2E API-REV-001 Pass, final confidence 95%). Requirements SR-003 (approved).

## Delivery state

- Branch `task/context-file-large-video-upload` (pushed as `codex/context-file-large-video-upload`), reviewed head `82ea64545` plus this delivery's commit. Base `origin/personal` @ `3d738de6e`; the base had not advanced, so the branch was already current and no integration or rerun was needed.
- Verification: from the evidence, `Sufficient` (see the release/deployment report's Verification table). No user check was needed to finalize.
- Docs sync: `Updated` (one correction, F-001 in `autobyteus-web/docs/settings.md`); `DESIGN.md`, `TESTING.md`, `RELEASE.md` no change.
- Release decision: **No release** (the user did not ask for one and `RELEASE.md` defaults to none). A release is available.
- Finalization: `--no-ff` merge into `origin/personal` through `finalize/context-file-large-video-upload` under `RELEASE.md`. Commit, push and merge SHAs are in the terminal message and in git history; a commit cannot hold its own SHA.

## Release order — RC-001

Merge-ready only. Do not release this ticket before, or without, the Memory Sync large-file Task `autobyteus-workspace-7` (FU-001: one large attachment can stop every Memory Sync job). The branch for that Task (`task/memory-sync-large-files`) was not on `origin/personal` when this delivery ran. The Task Manager owns the order; the release guide's checks run at release time.

## Not verified here (only the user can check)

- A real Android phone: the `File.type` of a recorded video (ASM-001: an empty or unlisted type gets the 25 MiB limit in the pre-check, and the server refuses it either way, as before this change), WebView upload progress and abort, and a network that stalls without a reset (the client sets no upload timeout). The phone bundle ran in headless Chrome at 390×844 (MSP-53..55, zh-CN); `TESTING.md` accepts that as the phone proof.
- A real native-runtime turn with a video over 25 MiB: the test vault is not set up (`TEST_VAULT_NOT_FOUND`). The module that builds the request (sanitizer and Gemini renderer) was run on real files (API-05, IMP-05).

## Open items, none blocking

| ID | Item | Owner |
| --- | --- | --- |
| FU-005 (CR-001) | Unreachable `disabled` styles on the remove buttons in `ContextFilePathInputArea.vue` | Solution Designer to route (Local Fix to the implementation engineer, or a Task) |
| FU-006 (TR-001) | `pairPhone` in the built-server e2e test falls back to two response fields that do not exist | Solution Designer to route |
| FU-001 (urgent), FU-002, FU-003, FU-004 | Memory Sync large files (Task `autobyteus-workspace-7`), draft copy between composers, untranslated `Context Files (n)` header, `/upload-file` unsupported-type drain | Solution Designer sends them; see `follow-ups.md` |
| Guide fix proposed | `RELEASE.md` names `codex/<ticket-name>`; worktrees are bootstrapped as `task/<ticket-name>` | The user decides (see the docs sync report) |

## Package

`requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-review-report.md`, `docs-sync-report.md`, this summary, `release-deployment-report.md`, `delivery-revision-record.md`, `follow-ups.md`, `evidence/`, `probes/`. Archived at `tickets/done/context-file-large-video-upload/`. No `release-notes.md`: no release.
