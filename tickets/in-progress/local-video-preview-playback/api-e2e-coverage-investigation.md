# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/fetch-capability-probe-evidence.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/code-review-report.md`
- Current Investigation Round: `4`
- Trigger: Implementation-source review round 9 passed for implementation/test commit `0c9728b4a671526162c97b5a7999836f532aa3c9`; CR-005 is resolved at source review and API/E2E was asked to execute E2E-REG-001 first, prove the requester gate, adapt the protocol matrix to the authorized shell main frame, and rerun all six scenarios.
- Prior Investigation Reviewed: `Yes — rounds 1 through 3 and their evidence were reviewed as historical baselines, not reused as sign-off for the new requester-gated implementation.`
- Latest Authoritative Investigation: `Round 4`

## Round History

| Round | Trigger | Result / Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- |
| 1 | First implementation `f60718a63d8551bb31bc26913a3154dc0614bc95` | Broader validation required; execution failed | No | Real Electron 42.4.1 rewrote the old triple-slash URL to a hostname-bearing URL and valid POSIX files returned `404`. |
| 2 | Reviewed fixed-authority implementation/test commit `02ca27faff5b0441488c2e1b1e65cd6cc2443c18` | Repository and realistic validation executed; Fail and reroute | No | The round-1 URL-identity failure was resolved and E2E-PROTO-001/E2E-VID-001/E2E-VID-002 passed, but actual scheme-registered Electron renderer hydration lost the first segment of a legacy POSIX locator before migration, failing AC-010. |
| 3 | Reviewed raw legacy POSIX migration fix `b658f16b53e494a5649e3a72cc136fdf039ff8df` | Repository and realistic validation executed; Fail and reroute | No | The round-2 AC-010 failure was resolved and five scenarios passed, but E2E-REG-001 proved the reviewed two-privilege scheme blocked PDF XHR and Excel Fetch. |
| 4 | Reviewed four-capability plus live-main-frame gate `0c9728b4a671526162c97b5a7999836f532aa3c9` | Repository and realistic validation executed; Pass | Yes | E2E-REG-001 ran first; all six scenarios passed through the production gate in Electron 42.4.1. |

## Current Requirement And Design Basis

The approved behavior basis requires one shared current identity, `local-file://local/<case-preserving encoded absolute pathname>`, under exactly `{ standard: true, stream: true, supportFetchAPI: true, corsEnabled: true }`, with no other privilege and no `webSecurity` weakening. One default-session `local-file://*/*` `onBeforeRequest` gate must be installed before the one handler. It may allow only the exact live main frame of a registered `WorkspaceShellWindow`; missing/destroyed/unregistered identities, same-`webContentsId` subframes, foreign-HTTP frames, Blob/actual HTML-preview child frames, and identity-less main-process `net.fetch` must be canceled before the handler with no bytes. The fixed authority must remain identical at authored renderer attribute, resolved media property/current source, gate observation, and normalized handler request.

After authorization, the handler must accept only the current normalized authority/path contract, apply method policy, pass the decoded path through the existing readable-regular-file validator, and provide truthful MIME-correct full or single-range responses through a bounded cancel-safe byte stream. The exact reported H.264 MP4 must load approximately `330.533333s`, play, pause, seek, and continue under Electron 42.4.1; the 607,568,129-byte fixture must cause a later nonzero range without whole-file renderer materialization, and cancellation/handle cleanup must be observed. The realistic method/range matrix must originate from the authorized registered shell main frame rather than main-process `net.fetch` or direct handler invocation.

The preserved real `VideoPlayer` must replace resource/native failures with a localized accessible alert and Retry, create a fresh media element/load on Retry, and recover when its URL changes. From representative HTTP and packaged-representative `file://` registered-shell main-frame origins, unchanged real PDF.js XHR and Excel Fetch must reach the current handler and render/parse fixture content. Representative local audio, image, text routing, an embedded absolute workspace-image thumbnail, and a valid external canonical local-file attachment must also remain healthy; no viewer-specific fallback or second transport is allowed.

The revised persisted-state contract is `Migration Required`, but only as an isolated read/ingress transformation: canonical context locators are idempotent; valid legacy empty-authority POSIX and drive-authority Windows locators converge to the current fixed-authority model before presentation/new send. Wrong, opaque, adorned, or malformed local-file locators become current `unsupported_local_file` metadata. That metadata remains visible/removable in the composer and retained in the optimistic/current message and identity-matched empty/mixed member echo, but is non-openable and absent from agent/team `context_file_paths`, `image_urls`, server/runtime media, protocol, and file bytes. Per the user's approved Option 1, newly quarantined metadata is not durably transported and may be absent after fresh reload; historical unsupported rows remain readable. No compatibility decoder or alternate transport is allowed.

The source-review gate is Pass with no open findings. Live Windows remains unavailable on this macOS host, and codec compatibility remains bounded by Electron's shipped Chromium; those are truthful platform/runtime residuals rather than reasons to weaken macOS proof.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / fixed-authority video load and playback | Changed | FR-001–003, FR-007 / AC-001–003, AC-009; design DS-001/DS-004 | Recheck the old realistic failure first, then observe exact authored/resolved/handler URLs, metadata, play, pause, seek, and resumed advancement in Electron 42.4.1. |
| BEH-002 / failure and recovery UI | Preserved from first implementation | FR-004–005 / AC-004–005; implementation handoff | Execute focused component coverage and a real Electron renderer journey for native/resource failure, accessible localized alert, Retry fresh element/load, and URL-change recovery. |
| BEH-003 / trusted fixed-authority request-to-byte contract | Changed | FR-001–002, FR-005, FR-007 / AC-003, AC-006–007, AC-009; design DS-001/DS-004/DS-005 | Run owner suites and exact Electron allow/cancel matrix. Issue full/range/HEAD/method/security requests from the registered shell main frame, prove identity-less main-process cancellation, and preserve byte/status/header/cleanup evidence. |
| BEH-004 / shared viewer routes | Preserved with revised capability/authorization boundary | FR-001, FR-005–006 / AC-007–009; MP-CR-005 | Run E2E-REG-001 first. Prove real PDF.js XHR and Excel Fetch from both representative top-frame origins and deny foreign-HTTP plus Blob/HTML-preview children before the handler; recheck audio/image/text/thumbnails. |
| BEH-005 / context migration, quarantine, submission, and live echo | Added / Changed | FR-005–007 / AC-007–008, AC-010; approved Option 1 | Directly execute the real migration/model/presentation/agent/team/projection owners through focused suites; supplement with a renderer-visible unsupported chip and executable lifecycle witness. |
| Old response-local decoder, inline URL serializers, type-only partition, empty-only echo flag, handler fallback | Removed | Design/implementation clean-cut checks | Search for legacy/duplicate paths and retain no compatibility-only coverage. |
| Existing valid/historical context data | Changed at read boundary only | Persisted Data Outcome; Migration Plan | Prove canonical idempotence, valid legacy convergence, unsupported historical readability, no rewrite, and fresh-reload absence for newly unsupported metadata. |
| User-owned source files | Preserved | FR-002; persisted-data outcome | Read only and hash the two video fixtures before/after. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? (`Yes`/`No`) | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Server/runtime remains executable-only and unchanged | Source trace and client payload assertions | Real backend is not needed if outgoing arrays directly prove absence and no server source changed | None |
| API / transport / contract | Yes | Electron `Request -> Response`; agent/team executable attachment arrays | Direct response, store, submission-plan tests | Chromium normalization/request sequencing and real byte consumption | Project Desktop Validation / executable lifecycle probe |
| Frontend component / state | Yes | Video error/retry; context chip/openability/presentation | Mounted Vue component tests | Real native media events and renderer-resolved URLs | Electron renderer with temporary Nuxt surface |
| Browser integration / user journey | Yes, as renderer behavior | DOM/media/document behavior inside the desktop renderer | Component tests | Standalone browser cannot own `local-file`; Electron Chromium is material | Project Desktop Validation |
| Authentication / session / permissions | Yes | Exact live registered-workspace-main-frame authorization before unchanged filesystem validation | Lifecycle and registry tests | Actual requester `WebFrameMain` identities for top PDF/Excel and child frames; identity-less main-process denial | Electron request-identity matrix |
| Desktop renderer / web-equivalent UI | Yes | Media elements, alert/Retry, image/document fetch, context chip | Unit/component coverage | Native Chromium media/resource pipeline | Electron renderer |
| Desktop shell / Electron-specific integration | Yes | Exact four pre-ready privileges; one post-ready default-session request gate before one handler; live registry identity | Lifecycle/registry tests and transpilation | Real Electron 42.4.1 frame objects, navigation/reload, handler reach/non-reach | Project Desktop Validation |
| Process / lifecycle | Yes | Stream completion/cancellation/file-handle closure | Byte-stream unit coverage | Chromium seek/cancel and process-level handle release | Electron probe plus request/handle evidence |
| Persisted-data transition | Yes | Isolated local-file locator hydration migration; approved new-invalid non-persistence | Migration/model/projection/store tests | Full restart can be represented by discarding local-only state and hydrating only executable projection; no server schema exists | Executable module lifecycle plus repository coverage |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | No backend/account/external service is required for the changed boundary | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback`
- Project type and runtime stack: pnpm workspace; Nuxt 3/Vue 3 renderer; Electron main process; Vitest Nuxt and Node/Electron suites; macOS arm64 host.
- Conflicting, missing, or unclear project instructions: No repository-resident general Electron E2E runner exists. The shell exports `ELECTRON_RUN_AS_NODE=1`, so every desktop launch must use `env -u ELECTRON_RUN_AS_NODE`; the running probe must record `process.versions`. The branch is intentionally not refreshed; delivery owns remote integration.
- Required environment variables or secrets available: `N/A`; selected validation needs no backend, account, permission seed, or secret.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/AGENTS.md` | Closest repository instructions | Colocate durable tests; use `pnpm test:nuxt ... --run`; Electron via `pnpm test:electron`; never stage all files. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/README.md` | Development/test authority | `pnpm dev` serves the renderer (normally port 3000); `pnpm test` runs Nuxt then Electron; focused paths are supported. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/ARCHITECTURE.md` | Test strategy | Colocated Vitest unit/component coverage is the project norm for web and Electron modules. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/docs/electron_packaging.md` | Electron/runtime boundary | `local-file` is the secure local media path; validator remains authoritative; Electron dependency is pinned exactly; focused Electron plus desktop smoke is required when runtime behavior matters. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/docs/file_explorer.md` | Viewer/routing authority | Shared viewers cover text, image, audio, video, PDF, CSV, Excel; embedded Electron absolute media uses `local-file`, browser/remote does not. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/package.json` | Scripts and pinned runtime | Electron `42.4.1`; `test:nuxt`, `test:electron`, `transpile-electron`, guards, and `dev` are executable owners. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/electron/vitest.config.ts` | Electron suite config | Node environment rooted at `electron`; includes colocated JS/TS specs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/electron/tsconfig.json` | Main-process transpilation | Emits exact branch protocol and shared codec to ignored `dist` CommonJS for a temporary Electron harness. |
| Upstream `runtime-probe-evidence.md`, `url-identity-probe-evidence.md`, and `fetch-capability-probe-evidence.md` | Fixture/runtime/security evidence | Exact videos exist; fixed-authority response works; four privileges serve PDF/Excel but require the exact main-frame pre-handler gate. Current implementation still requires independent execution. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository suites | `autobyteus-web` | Focused Vitest, then affected full suites and guards | Existing pnpm install; no service | Exit/result counts | Test processes exit |
| Transpiled production protocol/codec | `autobyteus-web` | `pnpm transpile-electron` | Ignored `dist` from exact source | Expected output modules exist | Remove only probe scratch; build output may remain ignored |
| Generated renderer viewer surface | `autobyteus-web` | Scratch page plus `pnpm generate:electron`; serve generated `dist/renderer` on an owned loopback port and also open the same `index.html` through `file://` | Generated Electron renderer assets; no backend journey | HTTP 200, exact generated asset requests, and page hook | Terminate only owned static server; delete scratch source page; retain the evidence copy and ignored generated output |
| Isolated Electron 42.4.1 process | `autobyteus-web` | `env -u ELECTRON_RUN_AS_NODE <electron> <probe>` with isolated HOME/userData | Hidden real `BrowserWindow`; actual production protocol lifecycle and `WorkspaceShellWindowRegistry`; wrapper records gate/handler outcomes without bypass | Runtime/version, registered main-frame allow, child/main-process cancel, structured result | Unregister/destroy window; close app; remove isolated HOME/userData |
| Fixture tools | host | `ffprobe`/`ffmpeg`, deterministic Node/Python fixture generation, `shasum`, `lsof` | No network or user data mutation | Files validate and manifests match | Remove temporary fixture root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Reported 330.533333s H.264 MP4 | `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4` | Read-only; expected SHA-256 `613f4d1d30ec233044e32eb752619f20a2c211319131cd4030cf3d813b76938c` | Retain and verify unchanged |
| 607,568,129-byte representative MP4 | `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/autobyteus_software_engineering_team_combined_no_audio.mp4` | Read-only; expected SHA-256 `5051a147ae47073072ee9d75092a4f1fd3df0cc510f58cd75b682b505cf549b3` | Retain and verify unchanged |
| Significant-character protocol fixture | Deterministic temp file with case, space, Unicode, `%`, `#`, and on POSIX a literal `\` filename | Probe-owned temp root | Remove after retained structured evidence |
| Audio/image/PDF/Excel/text and invalid inputs | Generate minimal valid WAV/PNG/PDF/XLSX/text plus missing/directory/unreadable/malformed cases | No shared state; permission restoration before cleanup | Remove after evidence |
| Context locator/lifecycle identities | Deterministic canonical, legacy POSIX/Windows, adorned/wrong/opaque, valid and unsupported attachment objects | In-memory only; no backend write | Process exit/discard proves no new durable metadata transport |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: `design-spec.md` -> `Persisted Data / State Transition Decision` and `Migration Plan`; `implementation-handoff.md` -> `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: Hydrate exact canonical, legacy empty-authority POSIX, legacy drive-authority Windows, historical unsupported local-file, and non-local external locators. Canonical stays identical; valid legacy converts once; unsupported remains readable as non-executable metadata; non-local remains unchanged.
- Evidence planned: Direct focused codec/migration/model/projection/store suites plus an executable lifecycle witness showing valid canonical submission, unsupported exclusion, current/echo retention, and fresh-load absence when only executable projection is rehydrated. No persisted record rewrite or protocol compatibility parser may appear.
- Migration-specific completion/recovery scenarios: Idempotent canonical rehydration; significant characters including POSIX `%5C`; agent and team current sends; empty/mixed identity-matched echoes; external-user authoritative replacement; newly unsupported fresh-reload disappearance; historical unsupported hydration.
- Upstream ambiguity or reroute required: None; Option 1 was explicitly approved.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `shared/__tests__/localFileUrl.spec.ts` | Fixed authority; POSIX/Windows build; significant-character and POSIX-backslash round trip; invalid current parser shapes | FR-001–002, FR-007 / AC-007, AC-009 | Still Valid | Matches reviewed codec contract and CR-002 resolution | Execute focused |
| `electron/local-file-protocol/__tests__/local-file-protocol.spec.ts` | Exact four privileges/no extras; one filtered gate before one handler; exact allow; absent/rejected/throwing identity cancel; deterministic owner failure | FR-001, FR-005–007 / AC-007–009; MP-CR-005 | Still Valid | Revised durable lifecycle assertions match architecture round 6 and CR-005 source | Execute focused/full; supplement with actual frame identities and real viewers |
| `electron/shell/__tests__/workspace-shell-window-registry.spec.ts` | Accept exact live registered current main frame; reject same-ID subframe, unknown, destroyed, unregistered, and stale/replaced frame | FR-005, FR-007 / AC-007 | Still Valid | Direct live-identity owner coverage | Execute focused/full; supplement with actual Electron frames |
| `electron/local-file-protocol/__tests__/local-file-response.spec.ts` | Full, closed/open/suffix/clamped, HEAD, 416 cases, method/URL/path rejection, significant paths, POSIX backslash, byte completion/cancel/error closure | FR-002, FR-005–007 / AC-003, AC-006–009 | Still Valid | Updated to shared fixed-authority builder; portable real response plus POSIX-only filename case | Execute focused/full and supplement real Electron bytes/URLs |
| `electron/__tests__/localFileValidation.spec.ts` | Requires readable regular absolute file | FR-005 / AC-007 | Still Valid | Authoritative validator unchanged | Execute focused/full |
| `components/fileExplorer/viewers/__tests__/VideoPlayer.spec.ts` | No-source; controls/no autoplay; accessible native/resource failure; Retry; URL reset | FR-003–004 / AC-001–005 | Still Valid | Direct real component state assertions | Execute focused/full and supplement native Electron media |
| `stores/__tests__/fileExplorerNodeRouting.spec.ts` | Embedded local binary uses fixed authority; remote uses REST; text stays reader route | FR-006–007 / AC-008 | Still Valid | Updated producer assertion and preserved route contract | Execute focused/full |
| `components/fileExplorer/__tests__/FileViewer.spec.ts`, `viewers/__tests__/ExcelViewer.spec.ts`, `composables/__tests__/useAuthorizedObjectUrl.spec.ts` | Viewer selection, Excel fetch, preserved source resolver | FR-004, FR-006 / AC-005, AC-008 | Still Valid | Preserved owners | Execute focused/full and supplement live viewers |
| `utils/contextFiles/__tests__/contextLocalFileLocatorMigration.spec.ts` | Canonical idempotence; valid legacy POSIX/Windows; unsupported adorned/wrong/opaque/malformed; non-local unchanged; raw POSIX recognition before hostile ambient URL normalization | FR-005–007 / AC-007, AC-010 | Still Valid | CR-004 fix recognizes the exact authored raw lower-case empty-authority form before `new URL`; the new regression substitutes Electron's first-segment-as-host interpretation and still proves exact `%5C`, spaces, `%`, and `#` migration | Execute focused, then independently recheck in actual scheme-registered Electron renderer |
| `utils/contextFiles/__tests__/contextAttachmentModel.spec.ts` | Current valid and unsupported variants; non-local unchanged | FR-005–007 / AC-010 | Still Valid | Direct current-model convergence | Execute focused |
| `utils/contextFiles/__tests__/contextAttachmentPresentation.spec.ts` | Fixed embedded thumbnail URL; canonical local-file openability; unsupported never opens | FR-005–007 / AC-007–008, AC-010 | Still Valid | Presentation owner, no raw inference | Execute focused and supplement live renderer |
| `utils/contextFiles/__tests__/contextAttachmentSend.spec.ts` | Retain all current metadata; exclude unsupported/blank; partition valid image/non-image | FR-005, FR-007 / AC-010 | Still Valid | Direct single submission owner | Execute focused |
| `stores/__tests__/agentRunStore.spec.ts`, `agentTeamRunStore.spec.ts` | Optimistic/current attachment retention; only executable arrays sent for agent/team | FR-005, FR-007 / AC-010 | Still Valid | Both coordinators consume plan | Execute focused |
| `services/agentStreaming/handlers/__tests__/memberInputMessageHandler.spec.ts` | Empty/mixed identity echo retain/dedupe unsupported; unrelated/external replacement; historical unsupported hydration | FR-005–007 / AC-010 | Still Valid | Direct projection/merge owner | Execute focused |
| `services/runHydration/__tests__/runProjectionConversation.spec.ts` | Canonical server media hydration into current attachments | FR-005–007 / AC-008, AC-010 | Still Valid | Fresh/history hydration boundary | Execute focused |
| `components/agentInput/__tests__/ContextFilePathInputArea.spec.ts`, `components/conversation/__tests__/UserMessage.spec.ts` | Embedded thumbnail; unsupported local-file message chip is non-interactive | FR-005–007 / AC-008, AC-010 | Still Valid | Mounted current UI | Execute focused and supplement live DOM |
| Unrelated backend, responsive, distributed, authentication, and release suites | Other capabilities | None | Out Of Scope | No changed boundary | Do not run solely for this ticket |

## Stale Or Obsolete Coverage Decisions

No current durable coverage is stale. The old triple-slash routing/response assertions were already replaced during implementation, and no coverage protects the removed response-local decoder, inline serializers, type-only partition, echo flag, alternate transport, or fallback.

## Durable Coverage To Add

None planned by API/E2E. The implementation already added boundary-appropriate exact privilege/gate/registry, codec, migration, model, submission, store, projection, presentation, and response tests. Actual Electron frame identities, PDF.js/Excel internals, native media, and external 13 MB/607 MB fixtures are runtime evidence and should remain temporary probes rather than a parallel committed E2E framework.

## Durable Coverage To Update

None planned. The CR-004 hostile-normalization regression remains valid, and the implementation owner has already revised the exact protocol lifecycle test plus added registry tests for CR-005. API/E2E will validate their real-runtime premises independently before deciding whether any durable update is needed.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt --run` with the 16 focused codec/migration/model/submission/presentation/UI/projection/hydration/routing/store/viewer files | `autobyteus-web` | E2E-SEC-001, E2E-UI-001, E2E-REG-001; AC-004–005, AC-007–008, AC-010 | Pass — 16 files / 96 tests | `api-e2e-evidence/round-4-repository-focused-nuxt.log` |
| 2 | `pnpm test:electron --run electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/shell/__tests__/workspace-shell-window-registry.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts electron/__tests__/localFileValidation.spec.ts` | `autobyteus-web` | Exact four-capability/gate/registry plus response/validator; E2E-PROTO-001/SEC-001 | Pass — 4 files / 21 tests | `api-e2e-evidence/round-4-repository-focused-electron.log` |
| 3 | `pnpm transpile-electron`; `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals`; lifecycle/duplicate/legacy searches; `git diff --check` | `autobyteus-web` / worktree | Exact executable output, single request-gate/handler owner, boundary/locale policy, clean-cut removal | Pass — all commands and searches | `api-e2e-evidence/round-4-transpile-guards-searches.log` |
| 4 | `pnpm test:electron --run` | `autobyteus-web` | Broader Electron regression | Pass — 27 files / 118 tests; one opt-in real-release test skipped | `api-e2e-evidence/round-4-repository-full-electron.log` |
| 5 | `pnpm test:nuxt --run` | `autobyteus-web` | Broader Nuxt regression and historical baseline comparison | Changed scope Pass; command exit 1 from the same four unrelated baseline failures — 372 files / 2027 tests passed; 4 failed; 1 skipped | `api-e2e-evidence/round-4-repository-full-nuxt.log` |
| 6 | Focused rerun of the four full-suite failures | `autobyteus-web` | Failure isolation and test-validity decision | Same four unrelated failures reproduced — 11 tests passed / 4 failed | `api-e2e-evidence/round-4-repository-failure-recheck.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 91% | 117 focused changed-boundary tests pass, including exact four-capability/gate/registry and all preserved viewer/model owners | AC-007/008/009 require current real-frame/viewer proof | Execute E2E-REG/security first, then all six |
| Changed-boundary execution directness | 92% | Production protocol lifecycle, registry identity, response, validator, codec, migration, components, stores, and projections execute directly in repository suites | Electron frame object and actual gate/handler sequence remain mocked | Exact Electron 42.4.1 production lifecycle probe |
| Cross-boundary integration realism and mock gap | 86% | Real-file response tests and cross-owner store/projection tests pass | PDF.js/Excel -> Chromium -> webRequest -> registry -> handler and child denial have not run together | Real HTTP/file renderer and child-frame journeys |
| Environment, configuration, identity, and fixture fidelity | 94% | Exact pinned Electron transpiles; real filesystem response fixtures and external video identities remain available | Round-4 runtime, main-frame IDs, hashes, and origins not yet recorded | Preflight plus exact runtime evidence |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Unit coverage now includes missing/rejected/throwing identity cancellation plus prior ranges/invalid paths/cancel/error/recovery | Real child/main-process cancellation and media FD closure are unrefreshed | Execute requester and stream lifecycle matrix |
| User-surface, browser, and desktop-shell confidence | 84% | Real Vue components and preserved routes pass focused tests | No current real PDF/Excel/media DOM under the gate | Project Desktop Validation |
| Durable regression coverage quality and relevance | 99% | Exact four/no-extra privileges, listener-before-handler, predicate failures, registry lifecycle, response, migration, and UI owners pass; full Electron passes | Live Windows absence is not a durable-quality defect | Retain truthful platform residual |

- Overall post-repository confidence: `91.1%`
- Calculation method: Simple average `(91 + 92 + 86 + 94 + 92 + 84 + 99) / 7 = 91.1%`.
- Every critical acceptance criterion directly proven: `No — AC-007/AC-008/AC-009 require round-4 real Electron evidence.`
- Any applicable category below `90%`: `Yes — cross-boundary integration realism and user-surface/browser/desktop-shell confidence.`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: Actual PDF.js/Excel requester identity, child-frame and main-process cancellation, authorized-frame method/range behavior, current handler reach/non-reach, and all historical media/UI/migration/cleanup behavior require fresh evidence. Full Nuxt retains the same four unrelated baseline failures (`workspace-history-draft-send`, `MemoryHome`, `CodexFullAccessCard`, `zhCnGlossaryConsistency`), reproduced alone while every focused changed-scope file passes.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Project Desktop Validation` plus a focused executable lifecycle probe.
- Specific confidence gap or residual risk addressed: Repository mocks cannot prove actual `WebFrameMain` identity for PDF.js XHR/Excel Fetch or child frames, identity-less main-process cancellation, frame-gated protocol method/ranges, native media, or file-handle cleanup.
- Why the selected mode can materially improve confidence: Electron 42.4.1 can execute the exact four-capability production lifecycle, actual registry identity, real components/viewers, authorized and unauthorized frames, response/stream owners, and native media without disturbing the user app.
- Expected confidence after selected validation: `>=95% overall, no category below 90%, provided every critical criterion passes.`
- Browser-specific decision and rationale: Standalone browser validation is insufficient because `local-file` is Electron-shell-specific. The real Nuxt components will run inside an isolated Electron renderer; browser-equivalent DOM evidence is collected there.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron `42.4.1`, Chromium `148.0.7778.265`, confirmed by the running process.
- Relevant README or development instructions: `autobyteus-web/README.md`, `AGENTS.md`, `docs/electron_packaging.md`, `docs/file_explorer.md`, `package.json`, `electron/tsconfig.json`.
- Web-equivalent behavior: Video alert/Retry/URL reset, shared viewer rendering/fetch, context chip/openability.
- Shell-specific or lifecycle behavior: Four scheme privileges, default-session pre-handler gate, exact registered-main-frame allow, child/main-process cancel, handler reach/non-reach, Range sequence, and byte/handle lifecycle.
- Chosen validation approach and why it fits the project: Isolated hidden Electron process imports exact transpiled production modules and loads a generated Electron renderer route built from real components. This is narrower and safer than starting the user's app, while exercising packaged-representative renderer assets and directly proving the changed shell boundary.
- Server/frontend setup when browser validation is used: `pnpm generate:electron`; the exact generated renderer is served on a unique loopback port for HTTP-origin coverage and opened directly with `file://.../index.html#/api-e2e-local-preview` for packaged-origin coverage. No backend is needed because the page is fixture/component-local.
- Effect on any already-running desktop application: `None`; verify first, use isolated HOME/userData, and do not touch user-owned processes/profile.
- Behavior not directly proven and confidence consequence: Live Windows remains untested; deterministic cross-platform codec/migration coverage bounds that residual. Platform codec availability is proven only for the exact two macOS fixtures and remains bounded by Chromium.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: verify no owned/user app collision; generate temp fixtures; hash videos; add the temporary real-component page; run `pnpm generate:electron` and post-generate `pnpm transpile-electron`; serve generated `dist/renderer` on owned port `43192`; launch Electron with `ELECTRON_RUN_AS_NODE` removed and isolated HOME/userData.
- Environment choices: Hidden sandboxed/context-isolated actual `BrowserWindow`, exact installed Electron, default session, actual production `WorkspaceShellWindowRegistry`, observable wrappers around `onBeforeRequest`/`protocol.handle` that record identity/decision/status without bypassing either owner.
- Health / readiness checks: generated renderer `index.html` HTTP 200 with exact asset requests; `process.versions.electron === 42.4.1`; structured probe begins; current fixed-authority URL survives authored/resolved/gate/handler observation.
- Seed data / fixtures: Exact reported and 607 MB videos; deterministic 10-byte significant-path file; valid WAV/PNG/PDF/XLSX/text; missing/directory/unreadable/invalid-decode sources.
- Test identities/authentication/permissions/session: One actual window registered in the production registry; its exact live main frame is the sole allow identity. Foreign-HTTP, same-origin Blob/HTML-preview child frames, an unregistered window/frame, and main-process `net.fetch` are deny identities.
- Requirement-linked journeys: `E2E-PROTO-001`, `E2E-SEC-001`, `E2E-VID-001`, `E2E-VID-002`, `E2E-UI-001`, `E2E-REG-001`.
- Evidence: Structured JSON and log with exact URLs, request headers/statuses/bytes, media times, DOM roles/text/element identities, viewer fetch/render results, attachment lifecycle results, lsof/process cleanup, source hashes.
- Owned resources to clean: Static-renderer process/port, Electron process/window/profile, temp page, temp fixtures/permissions, temporary logs not promoted.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E2E-PROTO-001 | Exact transpiled protocol in Electron 42.4.1; request matrix issued inside authorized registered shell main frame | Gate allow identity, authored/current/handler URL, full/range/HEAD/method/status/header/bytes and no-byte failures; separate main-process denial | Depends on desktop runtime and temporary real files; response policy remains durably covered |
| E2E-SEC-001 | Actual registry/gate with foreign HTTP, Blob/HTML-preview child, unregistered and identity-less main-process requests plus attachment lifecycle | Pre-handler fail-closed authorization, zero bytes/no handler, raw-ingress vs normalized-handler enforcement, trusted-path rejection, no alternate byte path | Actual Electron frame identities and cross-process normalization are runtime evidence |
| E2E-VID-001 | Real `VideoPlayer` in Electron with exact reported MP4 | Metadata, play, pause, seek, continued playback; exact URL witnesses | External 13 MB user fixture should not enter repository |
| E2E-VID-002 | Real video element with 607 MB fixture, request trace, cancellation, lsof | Later nonzero range, far seek, playback continuation, handle cleanup | External 607 MB fixture and timing-sensitive Chromium behavior are release evidence |
| E2E-UI-001 | Real component page plus executable attachment lifecycle | Native/resource failure, accessible Retry/URL reset; unsupported chip/removal/openability; valid/unsupported submission and live/fresh lifecycle | Current component/owners already have maintainable durable coverage; temporary page is not a product route |
| E2E-REG-001 | Run first through real `FileViewer` from HTTP origin, then a packaged-representative `file://` real-component page using the same actual registered main frame | PDF.js XHR/Excel Fetch handler reach and rendered/parsed content; audio/image/text/thumbnails; child-frame denial | Temporary binary fixtures/pages and exact Electron identity should not become product surface |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Windows filesystem and Electron execution | Assigned host is macOS arm64 | Windows drive handling has deterministic unit coverage but not live OS/Chromium proof | Record as platform residual; execute on Windows before claiming platform-complete release confidence if release policy requires it |
| Every possible media codec/container | Chromium support is platform/runtime bounded and expansion is out of scope | A different codec may enter the generic error UI | Preserve generic localized failure; do not promise unsupported codecs |

## Ambiguities Or Reroute Triggers

No ambiguity or reroute trigger is open. The round-3 finding below is historical and is now realistically confirmed resolved.

| Finding | Affected Scenario / Requirement | Preliminary Classification | Required Workflow Recipient | Evidence |
| --- | --- | --- | --- | --- |
| Historical round 3: the two-privilege scheme blocked preserved PDF XHR and Excel Fetch. The revised design requires the exact four capabilities behind an exact-live-main-frame gate. | E2E-REG-001/E2E-SEC-001; FR-001, FR-005–007; AC-007–009 | `Resolved Design Impact; API/E2E confirmed` | None | Round-4 HTTP/file PDF/Excel passes plus five unauthorized cancellations and zero unauthorized handler calls |

## Round-2 Historical Execution Update

- Real Electron 42.4.1 resolved the round-1 current URL-identity defect: the fixed-authority current URL remains stable at authored attribute, renderer property/currentSrc, and handler request.
- E2E-PROTO-001 passed the full/closed/open/suffix/clamped/HEAD/method/invalid-path matrix with exact status, headers, bytes, and deterministic zero-byte failures.
- E2E-VID-001 passed metadata (`330.533333s`), play/pause, seek to `120s`, continued playback, significant-path identity, failure alert/Retry fresh attempt, and URL-change recovery.
- E2E-VID-002 passed duration (`2063.066667s`), seek to `1800s`, later ranges beginning at `525303808`, continued playback, explicit abort, and file-descriptor release to zero.
- E2E-SEC-001 and E2E-UI-001 fail overall because their AC-010 migration/lifecycle scope includes valid legacy POSIX convergence. The preliminary protocol-only and raw-invalid subchecks passed, as did Windows-legacy migration, quarantine, executable exclusion, optimistic/echo retention, historical readability, and fresh-reload absence.
- E2E-REG-001 remains Not Tested live because the probe stopped at the critical migration assertion before the representative real FileViewer audio/image/PDF/Excel/text phase. Its focused repository coverage passed.
- Harness attempts 1 and 2 exposed and corrected probe-only cancellation/release observation weaknesses; attempt 3 is authoritative. No production source or durable test was changed by API/E2E.
- The round-2 result was `Fail`, not `Blocked`: direct expected-versus-observed evidence existed and cleanup completed. It is historical context for round 3.

## Round-3 Execution-Time Investigation Update

- E2E-PROTO-001 passed again with exact full/closed/open/suffix/clamped/HEAD/method/invalid-path statuses, headers, bytes, no-byte failures, and stable significant-path identity.
- E2E-SEC-001 passed. The exact legacy POSIX source is still parsed by Electron as first-segment hostname `tmp`, yet the corrected raw hydration now produces the canonical openable fixed-authority attachment. Canonical/Windows migration, invalid quarantine, executable exclusion, live echo, historical readability, fresh-reload absence, and no unsupported protocol request all pass.
- E2E-VID-001 and E2E-VID-002 passed again: exact duration/play/pause/seek/recovery, large later ranges, continued playback, explicit cancellation, and descriptor release.
- E2E-UI-001 passed, including missing/decode failure containment, localized accessible Retry, fresh media attempt, URL-change recovery, valid thumbnail, non-interactive unsupported chip, removal identity, and lifecycle state.
- E2E-REG-001 failed only the completed PDF/Excel portion. Image (`8x6`), audio (`3s`, playback advanced), embedded/external thumbnail, and text (`Probe text OK`, zero protocol requests) passed. PDF rendered an error alert with response status `0`; Excel rendered `Failed to fetch`; neither request reached the production handler.
- The production failure is not a fixture or HTTP-dev-only artifact. A packaged-file-origin differential reproduces all three fetch/XHR failures with the reviewed two privileges and passes them when both `supportFetchAPI` and `corsEnabled` are enabled. The HTTP-origin four-mode differential isolates why both flags are necessary for all preserved consumers.
- No product source or durable test was changed by API/E2E. Temporary differential probes changed only privilege declarations inside isolated evidence processes.
- The current result is `Fail`, not `Blocked`; direct expected-versus-observed evidence and a bounded privilege differential exist, and cleanup completed.

This section is historical context only. Round 4 is the authoritative investigation for commit `0c9728b4a671526162c97b5a7999836f532aa3c9`.

## Round-4 Execution-Time Investigation Update

- The current durable coverage remained valid. API/E2E made no repository-resident durable test change and found no stale test. The focused Nuxt set passed `16 files / 96 tests`; the focused Electron lifecycle/registry/response/validator set passed `4 files / 21 tests`; full Electron passed `27 files / 118 tests` with one opt-in release test skipped. The full Nuxt command passed `2027` tests and reproduced the same four unrelated baseline failures, which also failed in isolation while `11` neighboring tests passed.
- `E2E-REG-001` ran first against the generated renderer. From the registered shell main frame, HTTP-origin and direct `file://`-origin PDF.js XHR and Excel Fetch each passed, reached `protocol.handle` with `200`, and rendered exact PDF canvas/Excel fixture content. Image `8x6`, 3-second audio playback, text without a protocol request, embedded/external thumbnails, and the exact legacy POSIX hydration lifecycle also passed.
- `E2E-SEC-001` directly proved pre-handler denial. A foreign-HTTP child, the actual `HtmlPreviewer` Blob child, and an unregistered top frame each received `TypeError: Failed to fetch` and zero bytes; identity-less main-process `net.fetch` returned `net::ERR_BLOCKED_BY_CLIENT` and zero bytes. All five denial requests were recorded as `cancel`; none reached `protocol.handle`. The production `WorkspaceShellWindowRegistry` returned true only for the actual registered current main frame.
- `E2E-PROTO-001` originated its full/closed/open/suffix/clamped/HEAD/method/malformed/invalid-path matrix from the authorized registered main frame, not direct handler invocation or main-process fetch. Exact statuses, headers, bytes, no-byte failures, fixed authority, and significant `%5C` path identity passed.
- `E2E-VID-001` and `E2E-VID-002` passed in Electron 42.4.1: reported duration `330.533333`, play/pause, seek to `120`, continued playback, large duration `2063.066667`, seek to `1800`, later nonzero ranges, authorized renderer cancellation after a 65,536-byte first chunk, and descriptor release to zero.
- `E2E-UI-001` passed missing-resource and decode-failure containment, localized accessible alert/Retry, fresh media-attempt identity, URL recovery, attachment chip/thumbnail presentation, and identity-based removal. The exact legacy POSIX locator, canonical locator, Windows legacy locator, invalid quarantine, executable exclusion, live echo, historical reload, and fresh-reload behavior all remained correct.
- Final cleanup removed the isolated Electron profile/HOME, fixture root, temporary source page, and owned loopback server; port `43192` and both video descriptors were zero. The user-owned AutoByteus PID `3405` remained running, and source video hashes remained `613f4d1d...b76938c` and `5051a147...f549b3`.
- Final confidence is `98.1%`; all critical acceptance criteria are directly proven for macOS/Electron 42.4.1. Live Windows and codecs outside shipped Chromium remain truthful residuals, not failing criteria.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `91.1%`
- Broader validation decision: `Required — completed; all six scenarios passed in Electron 42.4.1`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A.
- Notes: Final result `Pass`. The canonical result is `api-e2e-evidence/round-4-electron-result.json`; the focused witness is `api-e2e-evidence/round-4-electron-witness-summary.json`. Live Windows remains residual.
