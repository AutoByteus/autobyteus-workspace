# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/fetch-capability-probe-evidence.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md` (authoritative round 6 pass)
- Current failure/review reports and retained execution context, not post-fix sign-off:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-execution-coverage-report.md`

## What Changed

- Preserved the first implementation's one-owner Electron protocol lifecycle, validation-first full/single-range responses, cancel-safe byte stream, clean removal of `net.fetch(file:)`, localized accessible VideoPlayer failure/Retry state, and package dependencies.
- Added one shared renderer/main local-file URL codec. It builds only `local-file://local/<encoded absolute pathname>` and parses only the normalized fixed-authority current identity for the active platform.
- Resolved source-review `CR-002`: the builder now identifies Windows-drive input before separator normalization, normalizes backslashes only for Windows paths, and preserves legal POSIX backslashes as `%5C` so the decoded path remains byte-for-byte the selected filesystem identity.
- Resolved source-review `CR-003`: the real-response fixture for spaces, Unicode, `%`, and `#` is again platform-neutral, while the real filename containing a literal POSIX backslash is isolated in an explicit `win32`-skipped test. Pure codec and migration `%5C` assertions remain cross-platform.
- Resolved failure-origin finding `CR-004`: the isolated migration now recognizes the exact authored `local-file:///...` POSIX legacy shape before invoking the ambient `URL` implementation. It decodes once, verifies an exact legacy rebuild, and then delegates canonical construction to `buildLocalFileUrl`; malformed or adorned raw legacy input remains unsupported.
- Implemented the reviewed `CR-005` correction as one inseparable protocol-boundary change: pre-ready registration now declares exactly `standard`, `stream`, `supportFetchAPI`, and `corsEnabled`; post-ready installation registers one default-session `local-file://*/*` `onBeforeRequest` gate before the one handler.
- Added `WorkspaceShellWindowRegistry.isOwnedMainFrame` as the sole live identity query. It accepts only a registered, non-destroyed shell whose current non-destroyed `webContents.mainFrame` is the exact requesting frame. The protocol gate rejects missing identity before the query and cancels false/throwing results without reaching the handler.
- Passed the live registry method as a bound predicate from `main.ts`; no shell enumeration, URL/origin comparison, path policy, viewer token, or browser-partition installation was added.
- Replaced both renderer inline serializers with the shared builder and replaced the Electron response-local legacy decoder with the shared strict parser. The protocol owner imports the shared scheme constant.
- Added an isolated context-hydration migration for exact canonical input and valid legacy empty-authority POSIX / drive-authority Windows locators. Wrong, opaque, adorned, malformed, or non-absolute local-file input becomes the specialized current `unsupported_local_file` variant.
- Made current context presentation refuse preview/open for unsupported metadata and render its label in `UserMessage.vue` as a non-interactive chip. Valid attachment presentation remains unchanged.
- Replaced the old type-only streaming partition with one `planContextAttachmentSubmission` owner. Both run stores retain the full current attachment array in the local user message while passing only eligible locators to the existing executable WebSocket arrays.
- Replaced empty-only member-echo preservation with identity-matched merging that refreshes incoming executable attachments and retains/dedupes existing non-executable items for empty and mixed echoes. External-user replacement remains incoming-authoritative.
- No protocol compatibility decoder, metadata-only transport, server/runtime schema change, `file://` producer, Blob transport, server route, fallback, or alternate local-file handler was added.
- Current local-fix commit: `0c9728b4a671526162c97b5a7999836f532aa3c9` (`fix(electron): authorize local files by main frame`).
- Raw legacy migration parent: `b658f16b53e494a5649e3a72cc136fdf039ff8df` (`fix(web): migrate raw legacy POSIX locators`).
- Portable response-test parent: `02ca27faff5b0441488c2e1b1e65cd6cc2443c18` (`test(electron): keep POSIX path fixture portable`).
- POSIX identity source-fix parent: `09fe48665332e83a106853855412a26579f9a710` (`fix(web): preserve POSIX backslashes in local file URLs`).
- Revised implementation parent: `cdeb0aafb3b9b224b9c767552477681adaec7172` (`fix(web): canonicalize local file attachment playback`).
- Preserved first implementation commit: `f60718a63d8551bb31bc26913a3154dc0614bc95` (`fix: enable local video preview playback`).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Supported local video uses a stable standard streaming identity and retains native controls/playback behavior. | `fileExplorerContentActions.ts -> shared/localFileUrl.ts -> VideoPlayer.vue -> default-session main-frame gate -> local-file-protocol handler -> local-file-response.ts -> validateReadableRegularFile -> file-byte-stream.ts` | Implemented. File Explorer emits the fixed authority; a live workspace-shell main frame is required before the preserved response/stream/player owners. Round-3 video evidence passed on the parent commit; rerun on the gated commit remains downstream. |
| BEH-002 | Resource/decode failure remains a localized accessible alert with a fresh Retry attempt and URL-change recovery. | `useAuthorizedObjectUrl -> VideoPlayer.vue -> localization/messages/{en,zh-CN}/tools.ts` | Preserved unchanged apart from canonical URL fixtures. Focused component tests still pass. |
| BEH-003 | Only a live registered workspace-shell main frame may reach one current handler identity, validation, and truthful full/range delivery; unauthorized or invalid identities fail without bytes. | `defaultSession.webRequest.onBeforeRequest -> WorkspaceShellWindowRegistry.isOwnedMainFrame -> protocol.handle -> shared/localFileUrl.parseLocalFileUrl -> local-file-response.ts -> localFileValidation.ts -> fs.open/stat -> file-byte-stream.ts` | Implemented. Absent/unknown/destroyed/subframe identities cancel before the handler; the exact main frame proceeds. Empty/drive/wrong authorities and handler-visible query/fragment remain no-byte `404`; valid current methods/ranges retain existing `200`/`206`/`405`/`416` policy. POSIX backslashes and cross-platform significant characters remain covered. |
| BEH-004 | Existing binary/document/audio and embedded context-thumbnail routes use the same fixed identity; unchanged PDF.js XHR and Excel Fetch can reach it only from the trusted shell main frame; text and unrelated routing remain unchanged. | `fileExplorerContentActions.ts/contextAttachmentPresentation.ts -> buildLocalFileUrl -> unchanged PdfViewer/ExcelViewer/media consumers -> default-session main-frame gate -> existing handler/response`; text remains IPC/GraphQL | Implemented. Exact Fetch/CORS privileges and pre-handler authorization were added only in the protocol lifecycle. `PdfViewer.vue`, `ExcelViewer.vue`, `authorizedTransport.ts`, renderer routing, and browser partition are source-unchanged. Real HTTP/file PDF/Excel plus child-frame denial remains downstream `E2E-REG-001`. |
| BEH-005 | Valid legacy context locators transition before current use; unsupported locator metadata remains visible/removable/current-session-only but cannot preview/open or enter executable agent/team arrays/runtime media. Matching member echoes retain it; fresh reload may omit newly unsupported input. | `ContextFilePathInputArea/projection -> hydrateContextAttachment -> contextLocalFileLocatorMigration.ts -> ContextAttachment union -> contextAttachmentPresentation/UserMessage -> planContextAttachmentSubmission -> agentRunStore/agentTeamRunStore -> memberInputMessageHandler/userMessageProjection` | Implemented. Exact authored legacy POSIX syntax is classified before ambient URL normalization, while canonical input stays idempotent and valid legacy Windows remains supported. Valid legacy becomes canonical `external_url`; malformed/adorned/wrong/opaque input becomes explicit non-executable current state. Mixed agent/team sends retain local metadata while sending valid arrays only. Empty/mixed identity-matched member echoes retain/dedupe unsupported state; external-user projection remains authoritative. No durable invalid-metadata transport was added, matching approved Option 1. |

## Key Files Or Areas

- Shared wire contract: `autobyteus-web/shared/localFileUrl.ts`
- Isolated migration: `autobyteus-web/utils/contextFiles/contextLocalFileLocatorMigration.ts`
- Current attachment schema/hydration: `autobyteus-web/types/conversation.ts`, `utils/contextFiles/contextAttachmentModel.ts`
- Presentation/UI: `utils/contextFiles/contextAttachmentPresentation.ts`, `components/conversation/UserMessage.vue`
- Submission planning/coordinators: `utils/contextFiles/contextAttachmentSend.ts`, `stores/agentRunStore.ts`, `stores/agentTeamRunStore.ts`
- Live echo projection: `services/agentStreaming/handlers/userMessageProjection.ts`, `memberInputMessageHandler.ts`
- Renderer producer: `stores/fileExplorerContentActions.ts`
- Electron lifecycle/authorization: `electron/local-file-protocol/local-file-protocol.ts`, `electron/shell/workspace-shell-window-registry.ts`, and bound injection in `electron/main.ts`
- Electron current parser/response: `electron/local-file-protocol/local-file-response.ts`, `electron/tsconfig.json`
- Preserved protocol resources/viewer: `electron/local-file-protocol/file-byte-stream.ts`, `electron/localFileValidation.ts`, `components/fileExplorer/viewers/VideoPlayer.vue`
- Focused new coverage: `electron/shell/__tests__/workspace-shell-window-registry.spec.ts`, expanded `electron/local-file-protocol/__tests__/local-file-protocol.spec.ts`, `shared/__tests__/localFileUrl.spec.ts`, migration/model/submission tests, plus preserved store/projection/presentation/response/viewer suites.

## Important Assumptions

- `hydrateContextAttachment` remains the supported convergence boundary for pasted and projected attachment locators; the external-URL constructor is now module-private so current local-file state cannot bypass that invariant through the public model API.
- `ContextAttachment` objects produced by current application paths are authoritative current variants. Submission planning deliberately checks current kind rather than reparsing historical URL syntax.
- The workspace shell continues to use Electron's default session; the browser runtime remains isolated in `persist:autobyteus-browser`. One main-module scheme registration and one default-session filtered listener/handler own local-file capability.
- `WorkspaceShellWindowRegistry` authorizes only live requester identity. The unchanged `validateReadableRegularFile` remains the only filesystem authorization gate; neither registry nor shared codec grants file access.
- Platform codec support is not expanded. Unsupported media remains contained by the existing generic VideoPlayer failure state.

## Known Risks

- Round-3 Electron 42.4.1 evidence passed protocol/security/video/migration and non-document regressions on the parent commit, then proved the former two-privilege descriptor blocked PDF.js XHR and Excel Fetch. Differential evidence proved the exact four privileges work but expose foreign/same-origin child frames when ungated. The current source implements the reviewed exact-main-frame gate; all round-3 evidence remains pre-fix context rather than sign-off.
- Actual PDF.js and Excel requester identity must be re-proven from representative HTTP and packaged `file://` shell origins. Electron may report a null or destroyed frame during lifecycle transitions; the implementation fails closed.
- Electron `webRequest` retains only the last listener for an event. The local-file lifecycle is now the sole repository `onBeforeRequest` owner; future default-session policy must compose here rather than overwrite it.
- macOS cannot live-execute Windows filesystem semantics; `/C:/...` builder/parser/migration behavior has deterministic unit coverage only.
- Electron may erase authored credential/port distinctions before the handler. Supported raw context ingress rejects them; the normalized handler applies the same exact authority/path parser and filesystem validator to what remains.
- Representative local PDF/Excel must pass first downstream, with explicit foreign-HTTP and same-origin Blob/actual HTML-preview denial; the remaining image/audio/thumbnail/text/protocol/video scenarios then rerun through the gate.
- Newly unsupported metadata is intentionally current-session/live-echo state only and may disappear on fresh durable reload, per the user's approved Option 1. Any durable retention change requires a new product/schema decision.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: Prior ownership corrections remain intact. The round-6 rework extends only the existing protocol lifecycle and live shell registry: capability/allow-cancel/ordering stay in the protocol owner, while exact live frame identity stays in the registry. Document viewers and byte delivery were not duplicated. No implementation finding contradicted the reviewed round-6 design.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` in steady-state runtime; the approved isolated hydration migration is the sole legacy reader boundary.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: The response-local decoder, renderer inline serializers, old partition export, and empty-only echo flag remain removed. No ungated four-privilege path or viewer-specific fallback exists. Changed implementation files remain below 500 effective non-empty lines (`local-file-protocol.ts` 57, registry 71, `main.ts` 454); no changed implementation delta exceeded 220 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Migration Required`
- Design-spec decision reference: `design-spec.md` -> `Persisted Data / State Transition Decision` and `Migration Plan`
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `N/A`
- Migration implementation and focused checks, only when `Migration Required`: `contextLocalFileLocatorMigration.ts` is pure and called only by `hydrateContextAttachment` before ordinary classification. Exact raw legacy POSIX classification now precedes ambient `URL` construction. A focused test replaces the ambient URL constructor with Electron-standard-scheme-style host/path reinterpretation and still proves `%5C`, spaces, `%`, and `#` migrate exactly. Tests also preserve canonical idempotence, legacy Windows conversion, raw legacy/canonical adornment and malformed rejection, wrong/opaque rejection, non-local pass-through, current model construction, run projection, and unsupported historical readability. No store rewrite occurs; original persisted records remain unchanged.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Local implementation environment: macOS arm64; repository worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback`; pnpm workspace dependencies were already installed.
- No package or lockfile change was required during round-6 rework. Existing direct `mime-types` and `@types/mime-types` ownership from the first implementation is preserved.
- `electron/tsconfig.json` now includes `shared/localFileUrl.ts`; `pnpm transpile-electron` emits the process-neutral codec with Electron main code.
- Branch was not refreshed or merged with the newer remote base; delivery owns final branch refresh/integrated-state validation.

## Local Implementation Checks Run

- Focused Nuxt set covering codec, migration, model, submission plan, presentation, UserMessage, ContextFilePathInputArea, member echo/external projection, run hydration, File Explorer routing, and both run stores — passed: 12 files / 79 tests.
- Follow-up codec/migration/model/presentation set after drive-like POSIX-path correction — passed: 4 files / 17 tests.
- `pnpm test:nuxt --run components/fileExplorer/viewers/__tests__/VideoPlayer.spec.ts` — passed: 1 file / 6 tests.
- Focused Electron protocol/response/validator set — passed: 3 files / 14 tests.
- Post-`CR-002` focused codec/migration/model/presentation rerun — passed: 4 files / 17 tests, including exact canonical and legacy POSIX `%5C` identities.
- Post-`CR-002` focused Electron protocol/response/validator rerun — passed: 3 files / 14 tests, including a real macOS file whose filename contains a legal backslash.
- Post-`CR-003` focused codec/migration/model/presentation rerun — passed: 4 files / 17 tests; pure codec and migration `%5C` coverage remains intact.
- Post-`CR-003` focused Electron protocol/response/validator rerun — passed on macOS: 3 files / 15 tests. The cross-platform real-response test covers spaces, Unicode, `%`, and `#`; the literal POSIX-backslash real-file case is explicitly skipped only on `win32`.
- Post-`CR-004` migration/model check — passed: 2 files / 8 tests, including the ambient URL reinterpretation regression.
- Post-`CR-004` codec/migration/model/presentation check — passed: 4 files / 18 tests.
- Post-`CR-004` Electron protocol/response/validator regression check — passed on macOS: 3 files / 15 tests.
- Post-`CR-005` focused protocol/registry lifecycle check — passed: 2 files / 9 tests, covering the exact/no-extra descriptor, filter-before-handler order, main-frame allow, missing identity cancellation, registry rejection, exception fail-closed behavior, and registry lifecycle.
- Post-`CR-005` preserved Nuxt codec/context/submission/projection/store/viewer check — passed: 16 files / 96 tests.
- Post-`CR-005` Electron protocol/response/validator/registry check — passed: 4 files / 21 tests.
- Post-`CR-005` full Electron unit suite — passed: 27 files / 118 tests; 1 optional real-release file/test skipped by its existing opt-in guard.
- `pnpm transpile-electron` — passed after final source changes.
- `pnpm guard:web-boundary` — passed.
- `pnpm guard:localization-boundary` — passed.
- `pnpm audit:localization-literals` — passed with zero unresolved findings.
- `pnpm exec nuxi typecheck` — repository-wide check did not pass because of extensive pre-existing unrelated type errors. A filtered rerun reported no diagnostics in changed implementation files.
- `pnpm test` — repository-wide Nuxt phase completed with 371 files / 2019 tests passed, 4 unrelated failures, and 1 skipped test; the command stopped before its Electron phase. Failures were `MemoryHome.spec.ts`, `CodexFullAccessCard.spec.ts`, `zhCnGlossaryConsistency.spec.ts`, and `workspace-history-draft-send.integration.test.ts`, none in changed paths. The focused Electron set above passed independently.
- `git diff --check` / `git diff --cached --check` — passed before commit.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: supported video source identity; existing VideoPlayer failure/Retry states; context composer/message attachment thumbnail/open behavior; unsupported attachment label/removal and projected non-interactive chip.
- Approved UI/UX, interaction, requirement, or design references: `requirements.md` BEH-002/BEH-004/BEH-005, FR-004/FR-005/FR-006, AC-004/AC-005/AC-008/AC-010; `design-spec.md` current presentation/openability and viewer guidance. No separate behavior-defining UI supplement exists.
- Existing design system, shared components, and adjacent product surfaces reviewed: existing attachment chip/thumbnail styling in `UserMessage.vue`, `ContextFilePathInputArea`, `contextAttachmentPresentation`, File Explorer viewers, and the preserved `VideoPlayer.vue` alert/Retry pattern.
- Project development / preview instructions and rendered surface used: Focused Vue component tests mounted the real `UserMessage.vue`, `ContextFilePathInputArea`, and `VideoPlayer.vue` DOM and exercised click, preview-failure, Retry, URL-change, and unsupported-label states. The earlier implementation's real Nuxt/Chrome inspection of VideoPlayer failure/Retry remains applicable because that component was preserved.
- States, layouts, viewports, and interactions inspected: valid uploaded thumbnail and workspace chip actions; thumbnail failure fallback; unsupported image-typed local-file attachment rendered without image/button/open action; existing VideoPlayer happy/error/Retry/URL-change states.
- Visual or interaction issues found and corrected: Unsupported metadata now uses the adjacent chip visual language but neutral gray styling and no false “Open” title, button, image, or handler. Valid thumbnail/chip actions remain unchanged.
- Supporting evidence and remaining unverified states or limitations: Component DOM/interaction evidence passed for the prior renderer changes. `CR-005` changes Electron capability/authorization and tests only; it makes no renderer DOM/style/interaction source change, so no new visual iteration was applicable. Focused `FileViewer`, `ExcelViewer`, `VideoPlayer`, and related transport tests passed. Real PDF.js render, Excel parse/render, main-frame identity, and child-frame denial cannot be established by unit mocks and remain API/E2E-owned.

## Downstream Coverage Hints / Suggested Scenarios

The reviewed required scenarios remain authoritative:

1. Run `E2E-REG-001` first: real PDF.js XHR and Excel Fetch from representative HTTP and packaged `file://` workspace-shell main frames; image/audio/thumbnail/text preservation; foreign-HTTP and same-origin Blob/actual HTML-preview child-frame denial before handler with zero bytes.
2. `E2E-PROTO-001`: issue the exact fixed-authority full/single-range method/header/byte matrix from the authorized workspace-shell main frame, preserve invalid authority/query/fragment no-byte outcomes and cleanup, and separately prove identity-less main-process `net.fetch` is canceled without a test bypass.
3. `E2E-SEC-001`: raw context-ingress credential/port/query/fragment/wrong/opaque rejection, normalized-handler observations, unchanged validator, child-frame/identity-less cancellation, and absence of alternate transports.
4. `E2E-VID-001`: exact/small supported video metadata, play, pause, seek, and continued playback through the authorized frame under Electron 42.4.1/package.
5. `E2E-VID-002`: larger video later-range seek, initial body cancellation, bounded memory/resource cleanup through the gate.
6. `E2E-UI-001`: generic accessible failure/Retry plus unsupported attachment label/removal/non-openable chip, valid legacy canonicalization, mixed valid+unsupported submission, empty/mixed echo retention, and fresh-reload disappearance.

## API / E2E / Executable Coverage Investigation And Execution Still Required

`Yes` — source/unit/transpile checks do not sign off AC-001 through AC-010. After source review passes, the `api_e2e_engineer` must run `E2E-REG-001` first and then the full six-scenario set on commit `0c9728b4a671526162c97b5a7999836f532aa3c9`. Evidence must distinguish allowed workspace-shell main-frame requests from canceled identity-less/subframe requests and must not bypass the production gate.
