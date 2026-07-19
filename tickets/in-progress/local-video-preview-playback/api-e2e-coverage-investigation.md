# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/code-review-report.md`
- Current Investigation Round: `2`
- Trigger: Implementation-source review round 5 passed for implementation/test commit `02ca27faff5b0441488c2e1b1e65cd6cc2443c18`; API/E2E was asked to refresh coverage and realistic execution independently.
- Prior Investigation Reviewed: `Yes — round 1 and its failure evidence were reviewed as historical baseline, not reused as current sign-off.`
- Latest Authoritative Investigation: `Round 2`

## Round History

| Round | Trigger | Result / Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- |
| 1 | First implementation `f60718a63d8551bb31bc26913a3154dc0614bc95` | Broader validation required; execution failed | No | Real Electron 42.4.1 rewrote the old triple-slash URL to a hostname-bearing URL and valid POSIX files returned `404`. |
| 2 | Reviewed fixed-authority implementation/test commit `02ca27faff5b0441488c2e1b1e65cd6cc2443c18` | Repository and realistic validation executed; Fail and reroute | Yes | The round-1 URL-identity failure is resolved and E2E-PROTO-001/E2E-VID-001/E2E-VID-002 pass, but actual scheme-registered Electron renderer hydration loses the first segment of a legacy POSIX locator before migration, failing AC-010. |

## Current Requirement And Design Basis

The approved behavior basis now requires one shared current identity, `local-file://local/<case-preserving encoded absolute pathname>`, under exactly `{ standard: true, stream: true }`. The fixed authority must remain identical at authored renderer attribute, resolved media property/current source, and normalized Electron handler request. The handler must accept only the current normalized authority/path contract, apply method policy, pass the decoded path through the existing readable-regular-file validator, and provide truthful MIME-correct full or single-range responses through a bounded cancel-safe byte stream. The exact reported H.264 MP4 must load approximately `330.533333s`, play, pause, seek to a later time, and continue under Electron 42.4.1; the 607,568,129-byte fixture must cause a later nonzero range during a far seek without whole-file renderer materialization, and cancellation/handle cleanup must be observed.

The preserved real `VideoPlayer` must replace resource/native failures with a localized accessible alert and Retry, create a fresh media element/load on Retry, and recover when its URL changes. Representative local audio, image, PDF, Excel, text routing, an embedded absolute workspace-image thumbnail, and a valid external canonical local-file attachment must not regress.

The revised persisted-state contract is `Migration Required`, but only as an isolated read/ingress transformation: canonical context locators are idempotent; valid legacy empty-authority POSIX and drive-authority Windows locators converge to the current fixed-authority model before presentation/new send. Wrong, opaque, adorned, or malformed local-file locators become current `unsupported_local_file` metadata. That metadata remains visible/removable in the composer and retained in the optimistic/current message and identity-matched empty/mixed member echo, but is non-openable and absent from agent/team `context_file_paths`, `image_urls`, server/runtime media, protocol, and file bytes. Per the user's approved Option 1, newly quarantined metadata is not durably transported and may be absent after fresh reload; historical unsupported rows remain readable. No compatibility decoder or alternate transport is allowed.

The source-review gate is Pass with no open findings. Live Windows remains unavailable on this macOS host, and codec compatibility remains bounded by Electron's shipped Chromium; those are truthful platform/runtime residuals rather than reasons to weaken macOS proof.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / fixed-authority video load and playback | Changed | FR-001–003, FR-007 / AC-001–003, AC-009; design DS-001/DS-004 | Recheck the old realistic failure first, then observe exact authored/resolved/handler URLs, metadata, play, pause, seek, and resumed advancement in Electron 42.4.1. |
| BEH-002 / failure and recovery UI | Preserved from first implementation | FR-004–005 / AC-004–005; implementation handoff | Execute focused component coverage and a real Electron renderer journey for native/resource failure, accessible localized alert, Retry fresh element/load, and URL-change recovery. |
| BEH-003 / trusted fixed-authority request-to-byte contract | Changed | FR-001–002, FR-005, FR-007 / AC-003, AC-006–007, AC-009 | Run owner suites and exact Electron full/range/method/security matrix, including byte/status/header evidence, significant path identity, later Range, cancellation, and closure. |
| BEH-004 / shared viewer routes | Preserved, with canonical binary/document URL | FR-006 / AC-008 | Execute route/component coverage plus real Electron audio/image/PDF/Excel/text and thumbnail/external-locator observations. |
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
| Authentication / session / permissions | Preserved | Trusted Electron-only local capability and unchanged validator | Validator and routing tests | Real custom-protocol rejection of filesystem-invalid targets | Electron request matrix |
| Desktop renderer / web-equivalent UI | Yes | Media elements, alert/Retry, image/document fetch, context chip | Unit/component coverage | Native Chromium media/resource pipeline | Electron renderer |
| Desktop shell / Electron-specific integration | Yes | Pre-ready privileges, post-ready default-session handler, normalized custom-scheme URL | Lifecycle tests/transpilation | Real Electron 42.4.1 standard-scheme normalization | Project Desktop Validation |
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
| Upstream `runtime-probe-evidence.md` and `url-identity-probe-evidence.md` | Fixture/runtime evidence | Exact 13 MB and 607 MB videos exist; fixed-authority candidate passed a design probe; current implementation still requires independent rerun. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository suites | `autobyteus-web` | Focused Vitest, then affected full suites and guards | Existing pnpm install; no service | Exit/result counts | Test processes exit |
| Transpiled production protocol/codec | `autobyteus-web` | `pnpm transpile-electron` | Ignored `dist` from exact source | Expected output modules exist | Remove only probe scratch; build output may remain ignored |
| Temporary Nuxt viewer surface | `autobyteus-web` | Scratch page plus `pnpm dev --port <owned-port>` | Unique loopback port; no backend journey | HTTP 200 and page state | Terminate only owned process group; delete scratch page |
| Isolated Electron 42.4.1 process | `autobyteus-web` | `env -u ELECTRON_RUN_AS_NODE <electron> <probe>` with isolated HOME/userData | Hidden window; exact transpiled protocol; wrapper records requests without changing response semantics | Runtime/version and structured result | Close window/app; remove isolated HOME/userData |
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
| `electron/local-file-protocol/__tests__/local-file-protocol.spec.ts` | Exact privileges; one handler delegation; deterministic owner failure | FR-001, FR-005, FR-007 / AC-007, AC-009 | Still Valid | Exact lifecycle owner | Execute focused/full and supplement real Electron |
| `electron/local-file-protocol/__tests__/local-file-response.spec.ts` | Full, closed/open/suffix/clamped, HEAD, 416 cases, method/URL/path rejection, significant paths, POSIX backslash, byte completion/cancel/error closure | FR-002, FR-005–007 / AC-003, AC-006–009 | Still Valid | Updated to shared fixed-authority builder; portable real response plus POSIX-only filename case | Execute focused/full and supplement real Electron bytes/URLs |
| `electron/__tests__/localFileValidation.spec.ts` | Requires readable regular absolute file | FR-005 / AC-007 | Still Valid | Authoritative validator unchanged | Execute focused/full |
| `components/fileExplorer/viewers/__tests__/VideoPlayer.spec.ts` | No-source; controls/no autoplay; accessible native/resource failure; Retry; URL reset | FR-003–004 / AC-001–005 | Still Valid | Direct real component state assertions | Execute focused/full and supplement native Electron media |
| `stores/__tests__/fileExplorerNodeRouting.spec.ts` | Embedded local binary uses fixed authority; remote uses REST; text stays reader route | FR-006–007 / AC-008 | Still Valid | Updated producer assertion and preserved route contract | Execute focused/full |
| `components/fileExplorer/__tests__/FileViewer.spec.ts`, `viewers/__tests__/ExcelViewer.spec.ts`, `composables/__tests__/useAuthorizedObjectUrl.spec.ts` | Viewer selection, Excel fetch, preserved source resolver | FR-004, FR-006 / AC-005, AC-008 | Still Valid | Preserved owners | Execute focused/full and supplement live viewers |
| `utils/contextFiles/__tests__/contextLocalFileLocatorMigration.spec.ts` | Canonical idempotence; valid legacy POSIX/Windows; unsupported adorned/wrong/opaque/malformed; non-local unchanged | FR-005–007 / AC-007, AC-010 | Needs Update | Its Node/Nuxt URL environment does not model the registered `{ standard: true }` renderer parser: actual Electron rewrites `local-file:///tmp/...` to `local-file://tmp/...` before the implementation's `new URL(locator)`-based legacy recognition | After the source correction, add or adapt durable coverage so raw legacy POSIX recognition cannot silently depend on an unregistered custom-scheme `URL` parse; exact test placement belongs to implementation/review rework |
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

None planned by API/E2E. Current implementation already added boundary-appropriate durable codec, migration, current-model, submission, store, projection, presentation, and response tests. Actual Electron media/normalization and external 13 MB/607 MB fixture journeys are environment-specific release evidence and should remain temporary executable probes rather than commit large fixtures or invent a parallel E2E framework.

## Durable Coverage To Update

The migration coverage needs an update with the bounded implementation rework. Actual Electron 42.4.1 proves the existing valid-legacy-POSIX assertion is environment-incomplete: it passes without privileged-scheme registration but production renderer parsing changes the locator before migration. API/E2E did not edit durable tests in this failed round; the implementation owner should couple the raw-boundary fix to a durable assertion that does not rely on the unregistered-scheme `URL` behavior.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt --run` with 16 focused codec/migration/model/submission/presentation/UI/projection/hydration/routing/store/viewer files | `autobyteus-web` | E2E-SEC-001, E2E-UI-001, E2E-REG-001; AC-004–005, AC-007–008, AC-010 | Pass — 16 files / 95 tests | `api-e2e-evidence/round-2-repository-focused-nuxt.log` |
| 2 | `pnpm test:electron --run electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts electron/__tests__/localFileValidation.spec.ts` | `autobyteus-web` | E2E-PROTO-001/SEC-001; lifecycle, response matrix, validator, stream closure | Pass — 3 files / 15 tests | `api-e2e-evidence/round-2-repository-focused-electron.log` |
| 3 | `pnpm transpile-electron`; `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals`; duplicate/legacy searches; `git diff --check` | `autobyteus-web` / worktree | Executable output, boundary/locale policy, clean-cut removal | Pass — all commands/search assertions | `api-e2e-evidence/round-2-transpile-guards-searches.log` |
| 4 | `pnpm test:electron --run` | `autobyteus-web` | Broader Electron regression | Pass — 26 files / 112 tests; one opt-in real-release test skipped | `api-e2e-evidence/round-2-repository-full-electron.log` |
| 5 | `pnpm test:nuxt --run` | `autobyteus-web` | Broader Nuxt regression and baseline comparison | Affected scope Pass; command exit 1 from four historical unrelated failures — 371 files / 2020 tests passed; 4 failed; 1 skipped | `api-e2e-evidence/round-2-repository-full-nuxt.log` |
| 6 | Focused rerun of the four failing full-suite files | `autobyteus-web` | Failure isolation and validity decision | Same four unrelated failures reproduced — 11 tests passed / 4 failed | `api-e2e-evidence/round-2-repository-failure-recheck.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 110 focused changed-boundary tests pass; durable assertions directly cover AC-004–008/010 policy | AC-001–003/009 and real native recovery/shared viewers remain indirect | Execute all six Electron/lifecycle scenarios |
| Changed-boundary execution directness | 90% | Codec, response, validator, migration, plan, both stores, projection, and real components execute their production owners | Chromium normalization/media/stream is not repository-executed | Exact Electron 42.4.1 probe |
| Cross-boundary integration realism and mock gap | 85% | Store/projection tests cross attachment owners and response tests use real temporary files | Renderer -> Chromium -> handler and native viewer integrations remain absent | Real protocol plus renderer journey |
| Environment, configuration, identity, and fixture fidelity | 92% | Pinned Electron, transpiled exact source, real temp filesystem tests, and exact external fixtures are available | Runtime/version/hash witnesses have not yet been refreshed this round | Record exact runtime/manifests in Electron run |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Ranges/methods/invalid paths/stream cancel/error and component Retry/URL reset all pass directly | Real cancellation/handle release and native failure/recovery remain unobserved | Broader executable journey |
| User-surface, browser, and desktop-shell confidence | 82% | Mounted real Vue components pass semantic state assertions | No current-round Electron renderer/native media/document evidence | Electron renderer with actual components |
| Durable regression coverage quality and relevance | 97% | 16 focused Nuxt files/95 tests and 3 Electron files/15 tests pass; full Electron passes; no stale or compatibility-only scenario identified | No live Windows durable execution; not a test-quality defect | Retain platform residual |

- Overall post-repository confidence: `89.1%`
- Calculation method: Simple average `(88 + 90 + 85 + 92 + 90 + 82 + 97) / 7`.
- Every critical acceptance criterion directly proven: `No — AC-001–003 and AC-009 require realistic Electron evidence.`
- Any applicable category below `90%`: `Yes — requirement proof; cross-boundary integration realism; user-surface/desktop-shell confidence.`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real fixed-authority normalization, metadata/play/seek, large later-range/cancellation, native recovery, shared viewers, and the executable new-invalid fresh-load lifecycle remain unexecuted in this round. The full Nuxt command continues to have the same four unrelated baseline failures (`workspace-history-draft-send`, `MemoryHome`, `CodexFullAccessCard`, and `zhCnGlossaryConsistency`); each reproduced alone, while all changed-scope focused files passed.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Project Desktop Validation` plus a focused executable lifecycle probe.
- Specific confidence gap or residual risk addressed: The prior defect existed only after Electron standard-scheme normalization; repository URL/response mocks cannot directly prove authored/resolved/handler identity, Chromium media ranges, native media UI, or file-handle cleanup.
- Why the selected mode can materially improve confidence: Electron 42.4.1 can exercise the exact transpiled current codec/protocol/response under real Chromium, while a temporary real-component Nuxt surface can expose semantic UI/document state without starting the full backend.
- Expected confidence after selected validation: `>=95% overall, no category below 90%, provided every critical criterion passes.`
- Browser-specific decision and rationale: Standalone browser validation is insufficient because `local-file` is Electron-shell-specific. The real Nuxt components will run inside an isolated Electron renderer; browser-equivalent DOM evidence is collected there.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron `42.4.1`, Chromium `148.0.7778.265` expected from pinned package.
- Relevant README or development instructions: `autobyteus-web/README.md`, `AGENTS.md`, `docs/electron_packaging.md`, `docs/file_explorer.md`, `package.json`, `electron/tsconfig.json`.
- Web-equivalent behavior: Video alert/Retry/URL reset, shared viewer rendering/fetch, context chip/openability.
- Shell-specific or lifecycle behavior: Privileged scheme normalization, default-session handler request, Range sequence, byte response/cancel/handle closure.
- Chosen validation approach and why it fits the project: Isolated hidden Electron process imports exact transpiled production modules and loads a temporary Nuxt route built from real components. This is narrower and safer than starting or repackaging the user's app, while directly proving the changed shell boundary.
- Server/frontend setup when browser validation is used: Unique loopback Nuxt dev port; no backend because the page is fixture/component-local.
- Effect on any already-running desktop application: `None`; verify first, use isolated HOME/userData, and do not touch user-owned processes/profile.
- Behavior not directly proven and confidence consequence: Live Windows remains untested; deterministic cross-platform codec/migration coverage bounds that residual. Platform codec availability is proven only for the exact two macOS fixtures and remains bounded by Chromium.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: verify no owned/user app collision; generate temp fixtures; hash/probe videos; transpile; create temporary Nuxt page; start on owned port; launch Electron with `ELECTRON_RUN_AS_NODE` removed and isolated HOME/userData.
- Environment choices: Hidden sandboxed/context-isolated BrowserWindow, exact installed Electron, default session, observable wrapper around `protocol.handle` that records URL/Range/status without altering the production response.
- Health / readiness checks: Nuxt HTTP 200; `process.versions.electron === 42.4.1`; structured probe begins; current fixed-authority URL survives authored/resolved/handler observation.
- Seed data / fixtures: Exact reported and 607 MB videos; deterministic 10-byte significant-path file; valid WAV/PNG/PDF/XLSX/text; missing/directory/unreadable/invalid-decode sources.
- Test identities/authentication/permissions/session: None; isolated temp profile and local trusted renderer only.
- Requirement-linked journeys: `E2E-PROTO-001`, `E2E-SEC-001`, `E2E-VID-001`, `E2E-VID-002`, `E2E-UI-001`, `E2E-REG-001`.
- Evidence: Structured JSON and log with exact URLs, request headers/statuses/bytes, media times, DOM roles/text/element identities, viewer fetch/render results, attachment lifecycle results, lsof/process cleanup, source hashes.
- Owned resources to clean: Nuxt process group/port, Electron process/window/profile, temp page, temp fixtures/permissions, temporary logs not promoted.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E2E-PROTO-001 | Exact transpiled protocol in Electron 42.4.1; net.fetch/request matrix | Authored/current handler URL, full/range/HEAD/method/status/header/bytes and no-byte failures | Depends on desktop runtime and temporary real files; owner policy is durably covered |
| E2E-SEC-001 | Electron matrix plus direct current context migration/presentation/submission execution | Raw-ingress vs normalized-handler enforcement, trusted-path rejection, no alternate byte path | Cross-process normalization is runtime evidence; durable pure owners already cover all raw shapes |
| E2E-VID-001 | Real `VideoPlayer` in Electron with exact reported MP4 | Metadata, play, pause, seek, continued playback; exact URL witnesses | External 13 MB user fixture should not enter repository |
| E2E-VID-002 | Real video element with 607 MB fixture, request trace, cancellation, lsof | Later nonzero range, far seek, playback continuation, handle cleanup | External 607 MB fixture and timing-sensitive Chromium behavior are release evidence |
| E2E-UI-001 | Real component page plus executable attachment lifecycle | Native/resource failure, accessible Retry/URL reset; unsupported chip/removal/openability; valid/unsupported submission and live/fresh lifecycle | Current component/owners already have maintainable durable coverage; temporary page is not a product route |
| E2E-REG-001 | Real `FileViewer`/media/component route with generated fixtures | Audio/image/PDF/Excel/text, thumbnail and valid canonical external locator regressions | Temporary binary fixtures and route should not become product surface |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Windows filesystem and Electron execution | Assigned host is macOS arm64 | Windows drive handling has deterministic unit coverage but not live OS/Chromium proof | Record as platform residual; execute on Windows before claiming platform-complete release confidence if release policy requires it |
| Every possible media codec/container | Chromium support is platform/runtime bounded and expansion is out of scope | A different codec may enter the generic error UI | Preserve generic localized failure; do not promise unsupported codecs |

## Ambiguities Or Reroute Triggers

None at initial investigation time. Execution produced a current realistic failure:

| Finding | Affected Scenario / Requirement | Preliminary Classification | Required Workflow Recipient | Evidence |
| --- | --- | --- | --- | --- |
| Scheme-registered Electron renderer parses legacy POSIX `local-file:///tmp/...` as hostname `tmp` before `hydrateContextAttachment`; the intended raw legacy migration returns `unsupported_local_file` instead of the fixed-authority current locator | E2E-SEC-001, E2E-UI-001; FR-005, FR-007; AC-010 | `Local Fix` — likely bounded implementation-owned raw migration-boundary correction plus durable test update | `code_reviewer` for mandatory focused failure-origin review and final owner classification | `api-e2e-evidence/round-2-migration-failure-result.json`, `round-2-migration-failure-probe.log`, full `round-2-electron-result.json` |

## Execution-Time Investigation Update

- Real Electron 42.4.1 resolved the round-1 current URL-identity defect: the fixed-authority current URL remains stable at authored attribute, renderer property/currentSrc, and handler request.
- E2E-PROTO-001 passed the full/closed/open/suffix/clamped/HEAD/method/invalid-path matrix with exact status, headers, bytes, and deterministic zero-byte failures.
- E2E-VID-001 passed metadata (`330.533333s`), play/pause, seek to `120s`, continued playback, significant-path identity, failure alert/Retry fresh attempt, and URL-change recovery.
- E2E-VID-002 passed duration (`2063.066667s`), seek to `1800s`, later ranges beginning at `525303808`, continued playback, explicit abort, and file-descriptor release to zero.
- E2E-SEC-001 and E2E-UI-001 fail overall because their AC-010 migration/lifecycle scope includes valid legacy POSIX convergence. The preliminary protocol-only and raw-invalid subchecks passed, as did Windows-legacy migration, quarantine, executable exclusion, optimistic/echo retention, historical readability, and fresh-reload absence.
- E2E-REG-001 remains Not Tested live because the probe stopped at the critical migration assertion before the representative real FileViewer audio/image/PDF/Excel/text phase. Its focused repository coverage passed.
- Harness attempts 1 and 2 exposed and corrected probe-only cancellation/release observation weaknesses; attempt 3 is authoritative. No production source or durable test was changed by API/E2E.
- The current result is `Fail`, not `Blocked`: direct expected-versus-observed evidence exists and cleanup completed.

## Investigation Decision

- Proceed To API/E2E Execution: `No — round-2 execution completed and stopped at a critical implementation failure`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No by API/E2E in this failed round; migration coverage needs update with implementation rework`
- Post-repository confidence: `89.1%`
- Broader validation decision: `Required — executed via Project Desktop Validation plus executable lifecycle probe; Fail`
- Reroute Required Before Further Validation Execution: `Yes`
- Recommended Recipient If Reroute Required: `code_reviewer`
- Notes: Preserve the six scenario IDs on rerun. Recheck E2E-SEC-001/E2E-UI-001 AC-010 first after classified rework, then complete E2E-REG-001 and rerun all currently passed critical scenarios for current sign-off.
