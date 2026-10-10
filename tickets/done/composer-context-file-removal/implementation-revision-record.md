# Implementation Revision Record — composer-context-file-removal

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation baseline/delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / round 1 (Pass) | N/A (non-blocking AR-001, AR-002 applied) | `Initial Baseline` | SR-003, ARCH-REV-001 | Implemented; ready for code review |

## Revision Entries

### IR-001 — Universal draft delete by locator, composer own-draft rule, visible attach/remove errors

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `tickets/in-progress/composer-context-file-removal/design-review-report.md`, round 1 (Pass).
- Triggering finding IDs: N/A (initial baseline). Non-blocking review guidance AR-001 and AR-002 (1)–(3) applied.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implementation complete for D1–D5; local checks green except one pre-existing base failure unrelated to this change (see handoff).
- Related solution revision IDs: SR-003 (SR-001, SR-002 superseded)
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff for the approved SR-003 package.
- Approved behavior or requirement IDs affected: REQ-001..006; AC-001..008; BEH-001..006; QR-001.
- Implementation delta:
  - D1: `parseDraftContextFileLocator` + `buildDraftContextFileLocator` derive from one `DRAFT_LOCATOR_SHAPES` table (mapped type over every draft owner kind). Per-kind draft routes replaced by `GET /drafts/*` and `DELETE /drafts/*` parsing the raw `request.url` path; one `sendDraftRouteError` mapping.
  - D2: `ContextFileLocalPathResolver` resolves draft locators through the codec (four draft regexes removed).
  - D3: `contextFileUploadStore.deleteDraftAttachment(attachment)` deletes at `attachment.locator` via `authorizedFetch(resolveContextAttachmentUrl(...))`; `buildDraftContextFileEndpoint` and store `error` state removed; `resolveContextAttachmentUrl` moved to `utils/contextFiles/contextAttachmentUrl.ts`.
  - D4: composer deletes on the server only for own drafts (`isOwnDraftAttachment` → exhaustive `sameDraftOwner`); foreign/owner-less drafts are removed locally.
  - D5: composer-local `attachmentError` (scoped to the target key), `canUpload`; disabled `+` with reason; visible error line (`role="alert"`) for upload/clone/remove/Clear All failures and for uploads without an upload owner; new en/zh-CN messages.
- Changed files or areas: see handoff "Key Files Or Areas".
- Local validation and result: server typecheck, server unit (669 files pass), server integration (71 pass; 1 file fails identically on base — `agent-status-websocket.integration.test.ts`, unrelated), web full `test:nuxt` (1 affected spec updated, then all targeted specs pass), web guards, rendered check against real local backend.
- Next recipient or routing: per `get_handoff_rules` (Medium/High → code review).
- Remaining limitations or risks: desktop 19.png verification by the user still required; baseline WebSocket cadence test failure reported separately.
