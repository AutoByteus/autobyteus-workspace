# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (pass) | N/A (non-blocking AR-008 taken into the build) | `Initial Baseline` | SR-003, ARCH-REV-002 (CRR/API-REV/DR: N/A) | Implemented per design-spec SR-003; ready for code review |

## Revision Entries

### IR-001 — Per-type context-file size limits, typed refusals, upload progress and cancel

- Triggering role, report path, and round: Architecture reviewer, `design-review-report.md`, round 2 (`ARCH-REV-002`, Pass). The implementation starts from the P1 reproduction.
- Triggering finding IDs: N/A (AR-008, non-blocking: discard the rest of the part before every refusal after `request.file()`, and check the 415 case closes promptly — implemented and tested)
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: the branch at commit `80f958bc5` (development commits `62bda32c4`, `5fad14c5a`, `80f958bc5`) on `task/context-file-large-video-upload`
- Related solution revision IDs: SR-003 (and SR-001/SR-002 behavior it carries)
- Related architecture-review revision IDs: ARCH-REV-002 (ARCH-REV-001 AR-001..AR-007 resolved in the design; AR-008 implemented here)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation of the approved design.
- Approved behavior or requirement IDs affected: REQ-001..REQ-012; AC-001..AC-015 (phone-bundle parts of AC-001/AC-005 left to API/E2E); BEH-001..BEH-010.
- Implementation delta:
  - server: `ContextFileSizeLimits` policy (`contextFileMaxBytesFor`, `contextFileUploadCapBytes`, `audioVideoContextFileMimeTypes`); typed errors; two node settings with normalizers (`context-file-size-limit-settings.ts`, registered in `server-settings-service.ts`); writer takes `limits`, drains an over-limit file; the two upload routes resolve limits once, pass `limits.fileSize` per request, map 413/415, and read the rest of the part before any refusal after `request.file()` (`discardUploadedFile`); `GET /rest/context-files/size-limits`; `/upload-file` gets its own 25 MiB per-request limit; multipart plugin registered without limits; Project Task store/drafts/service take limits resolved once per operation; tool text "Same file types and size limits as the app".
  - autobyteus-ts: `INLINE_MEDIA_MAX_BYTES` (25 MiB) in `media-input-sanitizer.ts`, before the image base64 check, via `isValidMediaPath`; `too_large` diagnostic.
  - web: `contextFileSizeLimits.ts`, `contextFileUploadFailure.ts` (+ `contextFileFailureMessage.ts`, one shared formatter for both composers); `contextFileUploadStore` (`readSizeLimits`, progress/abort, typed errors); `useContextAttachmentComposer` (pre-check, progress, `cancelUpload`, grouped `attachmentErrorLines`); `ContextFilePathInputArea.vue` (progress, cancel, new `ContextFileErrorLines.vue`); en and zh-CN catalogs; Project Task client `sizeLimits()` and typed upload errors, `useProjectTaskDraft` pre-check and localized lines.
  - docs: server pipeline/projects/tools docs, web settings/chat/projects docs. `GLOSSARY.md` "Context Files" was already on the branch.
- Changed files or areas: see the commits; production paths listed in `implementation-handoff.md`.
- Local validation and result: see `implementation-handoff.md` Checks Run (IMP-01..IMP-12); all changed-code checks pass; failures that remain in this environment also fail on the unmodified base.
- Next recipient or routing: Code Reviewer (Large + High).
- Remaining limitations or risks: phone-bundle cases not written (left to API/E2E); ASM-001 (phone `File.type`) unconfirmed; P-001, P-002 as in the design.
