# Investigation Notes

## Investigation Meta

- Package identifier: `context-file-large-video-upload` (Project Task `autobyteus-workspace-6`)
- Request / ticket: Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`, Task `autobyteus-workspace-6`
- Workspace root: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`
- Repository mode: `Git`
- Task worktree / branch: the root above, branch `task/context-file-large-video-upload`
- Resolved base remote / branch / revision: `origin/personal` at `3d738de6e68424f3a9ecd9e2cc0d5a7aeeb6236b` (fetched 2026-11-15)
- Finalization target remote / branch: `origin/personal` (no release; the Task says stop at merge-ready)
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile` (pnpm 10.28.2 via `npx`, no global pnpm on this machine) succeeded
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-15): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; also `AGENTS.md`, `TESTING.md` (test layers, phone-bundle rule), `autobyteus-web/docs/localization.md`, `docs/android_mobile_access.md`
- Investigation status: requirements investigation complete; architecture investigation not started (waits for approval)

## Initial Request And Clarifications

- Original request: the Task text (user report 2026-11-16 with a phone screenshot). Three phone videos could not be attached in the chat composer ("无法附加 VID_….mp4。 Uploaded file is too large."). The user wants the agent to help remove private information (phone numbers, company names) visible in the videos; the agent needs the files on disk.
- Clarifications received: none yet. The Task says the manager decides product numbers under the user's delegation and wants the limit recommendation reported first when it changes limits materially.
- User-supplied facts and constraints: configurable limit, larger default for video/audio (manager suggests at least 500 MiB), mobile robustness (progress, cancel, clear failure, no half-written files, TTL cleanup), agent-side safety (no large video inlined into a prompt), one localized message with name and limit, tests, isolated worktree, no release.
- Initial ambiguity: the default number for video/audio; whether the other file types also change; which upload surfaces besides the chat composer are covered.

## Product And Domain Understanding

- Product area: context files (attachments) in the message composer, desktop and phone (`/mobile` shell inside the Android app's WebView); Project Task context files share the same server policy.
- Affected actors or systems: the user (phone and desktop), the node server, agents on every runtime, LLM providers (via the native `autobyteus` runtime).
- Existing purpose: attach a file to a message so the agent can read it; the server stores a draft, finalizes it into the run's folder on send and gives the agent an absolute path.
- Terminology: *draft* (uploaded, not yet sent; 24 h TTL), *final* (moved into the run's `context_files`), *inline media* (a file base64-encoded into a provider request).

## Source Log

| Date | Type | Exact Source / Command | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-11-15 | User | Screenshot `ctx_83a0e86f4bfc__75.jpg` | Report | Android app, mobile run screen, `Context Files (0)` bar, red text: `无法附加 VID_20261115_105517.mp4, VID_20261115_105130.mp4, VID_20261115_104144.mp4。 Uploaded file is too large.` The label `Context Files (0)` is also English in the Chinese UI. |
| 2026-11-15 | Code | `autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts` | Limit owner | `CONTEXT_FILE_MAX_BYTES = 25 MiB` for every type; `allowedMimeTypes` includes video/mp4, quicktime, avi, mkv, webm and 6 audio types; `CONTEXT_FILE_DRAFT_TTL_MS = 24 h`. |
| 2026-11-15 | Code | `src/context-files/services/context-file-upload-writer.ts` | Enforcement | Streams `file.file` → counting `Transform` → `createWriteStream(wx)`; throws `"Uploaded file is too large."` on count > limit or `file.file.truncated`; removes the created file on any failure. |
| 2026-11-15 | Code | `src/compositions/build-studio-server.ts:451` | Plugin limit | `app.register(multipart, { limits: { fileSize: CONTEXT_FILE_MAX_BYTES } })` — one global limit for every multipart route. |
| 2026-11-15 | Code | `src/api/rest/context-files.ts` `POST /context-files/upload` | Composer route | Any error → HTTP 400 `{ detail: error.message }` (no code, no limit). |
| 2026-11-15 | Code | `src/api/rest/upload-file.ts` `POST /upload-file` | Other multipart route | Media-storage upload (avatars via `autobyteus-web/stores/fileUploadStore.ts`), own allowlist, 413 `"Uploaded file is too large."` on truncation. Not the composer path. |
| 2026-11-15 | Code | `src/projects/context/project-task-context-store.ts`, `src/api/rest/project-task-context-files.ts` | Shared policy | Project Task context uploads use the same writer and constant; agent-tool local-path copies check `stat.size > CONTEXT_FILE_MAX_BYTES` → `TASK_CONTEXT_INVALID` "is larger than the 25 MiB limit."; REST maps `ProjectError` → `{error:{code,message}}`. |
| 2026-11-15 | Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts` | Agent-facing text | `create_task` / `update_task` descriptions say "Same file types and 25 MiB limit as the app." |
| 2026-11-15 | Code | `node_modules/@fastify/multipart/index.js` (10.1.6) | Library behavior | Per-request options are deep-merged over plugin options (`handleMultipart(opts)` → `deepmergeAll({headers}, options, opts)`), so a route can pass its own `limits.fileSize`. In the streaming API a size-limit hit only marks `truncated` and ends the stream; the writer turns it into its error. |
| 2026-11-15 | Code | `node_modules/fastify` 5.12.7 config validator | Timeouts | `requestTimeout` and `connectionTimeout` default 0 (no limit); `keepAliveTimeout` 72 s (idle only). Multipart bodies bypass `bodyLimit` (streamed parser). |
| 2026-11-15 | Code | `autobyteus-web/stores/contextFileUploadStore.ts`, `composables/useContextAttachmentComposer.ts`, `components/agentInput/ContextFilePathInputArea.vue` | Web path | axios `POST /context-files/upload` (FormData, no timeout, no progress, no abort); errors collected as `{kind, fileNames, detail}`; message = `t(upload_failed, {name})` + `' '` + raw server `detail`. `ChatComposer.vue` and `AgentUserInputForm.vue` both render this one component (desktop and phone). No client-side size check. |
| 2026-11-15 | Code | `autobyteus-web/localization/messages/{en,zh-CN}/agentInput.generated.ts` | Copy | `upload_failed` = `Couldn't attach {{name}}.` / `无法附加 {{name}}。`; `remove_failed` similar. Generated catalogs are edited in commits directly (no generator script). |
| 2026-11-15 | Doc | `autobyteus-web/docs/localization.md` | Rules | en + zh-CN; `t()` in scripts; numbers formatted with the app's locale (`resolvedLocale`); guards `guard:localization-boundary`, `audit:localization-literals`. |
| 2026-11-15 | Code | `autobyteus-web/services/projects/projectTaskContextClient.ts`, `composables/projects/useProjectTaskDraft.ts` | Second upload surface | Project Task composer shows `body.error.message || body.detail` raw, English fallbacks. |
| 2026-11-15 | Code | `autobyteus-web/electron/local-file-protocol/local-file-protocol.ts` | Desktop chain | Electron intercepts only its local-file scheme; REST goes straight to the embedded node server. |
| 2026-11-15 | Code/Doc | `autobyteus-android/.../WebFileChooserCoordinator.kt`, `docs/android_mobile_access.md` | Phone chain | The app hands content URIs to the WebView's `<input type=file>`; the page uploads to the node over Tailscale/LAN directly (optionally `tailscale serve`). No app-side proxy. |
| 2026-11-15 | Code | `autobyteus-web/Dockerfile`, `autobyteus-server-ts/docker/*` | Proxies | The web image's nginx serves static files only; the server image runs the node under supervisor with no reverse proxy. A company ingress in front of a Docker node is operator-owned. |
| 2026-11-15 | Code | `src/context-files/services/context-file-finalization-service.ts`, `context-file-draft-cleanup-service.ts` | Lifecycle | Finalize = `rename` (copy+unlink across devices); cleanup deletes drafts with `mtime` older than 24 h at each upload. |
| 2026-11-15 | Code | `src/agent-execution/input/agent-run-provider-input-normalizer.ts`; `autobyteus-ts/src/agent/message/context-file-reference-section.ts` | Agent side | Locators resolve to absolute local paths; every context file (video included) is listed under `Reference files:` in the message text. |
| 2026-11-15 | Code | `autobyteus-ts/src/agent/message/multimodal-message-builder.ts`, `src/llm/utils/media-input-sanitizer.ts`, `src/llm/prompt-renderers/*`, `src/llm/utils/media-payload-formatter.ts` | Inline risk | Native runtime puts VIDEO/AUDIO paths into `video_urls`/`audio_urls`; the sanitizer drops them only for models whose capability is `unsupported`; the Gemini renderer base64-inlines every image/audio/video (`fs.readFile` + `toString('base64')`); OpenAI, Anthropic, Mistral renderers skip video. Gemini 3.1 Pro / 3.8 Flash declare video `supported`. Media stays in working-context history, so it is re-rendered on every later request of the run. |
| 2026-11-15 | Code | `src/agent-execution/backends/{claude,codex,antigravity,acp}/…` | Other runtimes | Only images are attached as images (Claude caps local images at 20 MB); video/audio go as reference paths. Safe. |
| 2026-11-15 | Web | Google blog "Increased file size limits and expanded inputs support in Gemini API" (2026-01-12) | Provider limit | Inline payload limit raised from 20 MB to 100 MB (measured base64-encoded); larger inputs need the Files API. |
| 2026-11-15 | Code | `src/memory-sync/source/{local-memory-export-scanner,memory-file-change-planner,memory-sync-service}.ts`, `src/api/rest/memory-sync.ts` | Adjacent effect | Memory Sync scans `memory/agents`, `memory/agent_teams` (final context files live there), reads each file whole, base64s it into JSON batches of up to 25 files with no byte budget; the hub route has `bodyLimit: 50 MiB`; a failed batch fails the whole job. |
| 2026-11-15 | Code | `src/config/*-setting.ts`, `src/services/server-settings-service.ts` | Config mechanism | Typed node settings (`AUTOBYTEUS_*`) with parse/normalize functions, registered as predefined server settings, read at use time via `appConfigProvider.config.get`. |
| 2026-11-15 | Code | `src/api/security/node-route-permissions.ts` | Phone access | REST endpoints not listed are open to owner and phone credentials, so a new context-file route is readable by a paired phone. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pick/drop/paste a file in the composer (desktop or phone) | composer → `POST /rest/context-files/upload` (multipart) → writer → draft file; placeholder spinner until done | Files ≤ 25 MiB of allowed types attach; > 25 MiB fail | Code + P1 | Reproduced (server), Read (UI) |
| BEH-002 | User | Upload fails | Message = localized "Couldn't attach {{names}}." + raw first server `detail` | Mixed zh-CN + English, no limit, no hint | Code; screenshot matches the exact string assembly | Read + user evidence |
| BEH-003 | System | Upload over the limit / aborted | Writer removes the partial file | No half-written file left | P1, P3 | Reproduced |
| BEH-004 | System | Upload streaming | No whole-file buffering in fastify/multipart/writer | Constant memory | P2 (600 MiB, RSS peak 180 MiB) | Measured |
| BEH-005 | System | Unsent draft | Deleted after 24 h by mtime at the next upload | TTL works for any size | Code | Read |
| BEH-006 | System | Send | Draft finalized (rename) into the run; agent gets an absolute path in `Reference files:` | Agent can open the file | Code | Read |
| BEH-007 | System | Native runtime turn with media on a video-capable model (Gemini) | Media base64-inlined into every request of the run | Works ≤ ~75 MB raw; larger fails at the provider or at V8 string length | Code + Google limit | Read |
| BEH-008 | User | Project Task composer upload / agent tool `context_files` | Same policy, 25 MiB; web shows raw server message | Same limit, raw English errors | Code | Read |
| BEH-009 | User | Remove a draft fails | Localized "Couldn't remove" + raw detail | Mixed language | Code | Read |
| BEH-010 | User | Avatar upload `/upload-file` | Own route, plugin 25 MiB limit | Unchanged by this ticket | Code | Read |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Requirement implication | Architecture question |
| --- | --- | --- | --- |
| `context-file-upload-policy.ts` | Allowed types, size, TTL | Becomes the single owner of per-type limits | Where the setting parse lives (`src/config/` pattern) and how routes get the limit |
| `context-file-upload-writer.ts` | Byte enforcement and cleanup | Needs the limit for the part's type and a typed error carrying the limit | Signature change vs. policy lookup inside |
| `build-studio-server.ts` multipart registration | Global plugin limit | Must not raise `/upload-file`'s limit | Per-request `limits.fileSize` on the two context routes (confirmed supported) |
| `context-files.ts` upload route | HTTP mapping | Structured error (code + limit) instead of free English text | Status codes 413 / 415 |
| `useContextAttachmentComposer.ts` + store | Upload orchestration | Pre-check, progress, cancel, reason-coded errors | Where the policy is fetched/cached per node |
| `ContextFilePathInputArea.vue` | Rendering | One localized message per reason, no raw detail | Placeholder progress + cancel control |
| `media-input-sanitizer.ts` | Provider-neutral media filtering | Owner of an inline-size guard | stat-based check for local paths |
| `project-task-context-store.ts`, tool contract, projects web client | Shared policy consumers | Follow the same per-type limits; truthful tool text; localized web errors | Structured error for REST upload |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| Probe P1 (real route, production multipart registration, real HTTP) | 26 MiB `video/mp4` | `400 {"detail":"Uploaded file is too large."}`, no file left | Reproduced | Confirms the reported server text and current cleanup | `probes/probe-results-2026-11-15.txt` |
| Probe P2 (multipart fileSize 1 GiB + counting Transform + file stream) | 600 MiB upload | 200, 600 MiB written, RSS 82 → 180 MiB peak, 436 ms on loopback | Measured | Raising the limit needs no buffering change | same |
| Probe P3 (real route) | Client socket destroyed after 8 of 20 MiB | Request reported aborted; no draft file left | Reproduced | Cancel/connection loss leaves no half-written file today | same |
| Code read of the web message assembly | Over-limit on phone | `${t('upload_failed',{name: names.join(', ')})} ${detail}` → exactly the screenshot text | Read (matches user evidence) | Root cause of the mixed-language message | `ContextFilePathInputArea.vue:274-289` |

- Temporary diagnostics: the probe was a temporary test file under `autobyteus-server-ts/tests/integration/api/rest/`; it was moved out of the test tree into `probes/large-upload-probe.integration.test.ts.txt` (not a product test, not run by any suite).
- Reproduction for implementation to start from: `probes/large-upload-probe.integration.test.ts.txt` (P1 is the failing case to turn into a regression test under the new default).
- Not reproduced: the full UI run on a phone-width browser and on the desktop app. Both use the same component and route (read above); the screenshot is the user's own reproduction. The API/E2E stage proves the fixed journey on the phone bundle (`test:e2e:mobile-shell`) per `TESTING.md`.

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User screenshot and draft text | Attach phone videos so the agent can work on them (remove private info) | Direct | Video limit must fit ordinary phone videos (1080p ≈ 130 MB/min, 4K ≈ 350–400 MB/min on current Android phones) |
| Manager (Task) | Configurable, ≥ 500 MiB for video, localized single message, mobile robustness, agent safety | Direction | Scope of REQs |

## External Contracts, Standards, And Dependencies

| Contract | Version | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| `@fastify/multipart` | 10.1.6 | Per-request limits merge; streaming truncation semantics | source read | Low |
| Fastify | 5.12.7 | No request timeout by default | config validator | A future timeout setting would cut long uploads |
| Gemini API inline data | 2026-01 announcement | ≤ 100 MB base64 per request | Google blog | Large inline media fails the turn |
| V8 string length | Node 26 | ~2^29 chars; base64 of > ~400 MB cannot be built | Node runtime limit | Crash/throw in renderer if inlined |
| Android WebView upload | — | Streams content-URI uploads; `XMLHttpRequest.upload.onprogress` available | platform | Long uploads on mobile networks need visible progress |

## Persisted Data And State Facts

- Affected stored subject: draft files under `<appData>/draft_context_files/...` and final files under `memory/agents|agent_teams/.../context_files`.
- Volume: per file up to the new media limit; no aggregate quota exists today.
- Readers/writers: unchanged; no schema or metadata format change needed.
- Required semantics: existing drafts/finals untouched; TTL cleanup unchanged.
- Acceptable loss: none.
- Remaining gap: disk usage grows with large videos (no quota) — accepted by raising the limit; recorded in the decisions.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The UI deltas (progress, cancel, message copy) are small and follow the existing composer; no Product handoff.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/large-upload-probe.integration.test.ts.txt` | Solution Designer | Reproduction and streaming/abort measurement | Server upload route | BEH-001, BEH-003, BEH-004; AC-002, AC-008 | Current | Evidence only, not behavior-defining |
| `probes/probe-results-2026-11-15.txt` | Solution Designer | Probe output | same | same | Current | Evidence only |
| `follow-ups.md` | Solution Designer | Out-of-scope findings | — | FU-001..FU-003 | Current | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why it matters | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | Memory Sync cannot carry a final attachment larger than ~37 MiB (base64 JSON batch > 50 MiB hub body limit) and stops the whole job; it is already fragile today (two 25 MiB files in one batch exceed it) | Nodes that enable Memory Sync (opt-in, off by default) stop syncing after a large video is attached | FU-001 (urgent), raised to the manager | Open |
| R-002 | Risk | No disk quota for drafts/finals | Large videos consume disk | Accepted with the configurable limit; owner can lower it | Accepted |
| R-003 | Risk | Pasting a draft attachment from another composer re-downloads it into browser memory (`cloneDraftAttachmentToTarget`) | A multi-GB video could exhaust a phone WebView | Rare path; recorded as FU-002 | Open |
| U-001 | Unknown | Exact sizes of the user's three videos | Whether 500 MiB would have sufficed | Manager decides the default (DEC-001) | Open |

## Requirement Implications

- The fix is a policy change (per-type, configurable), a structured error contract, a client pre-check with progress/cancel, a localized message model, and a provider-inline guard. Streaming, cleanup on failure/abort, and the absence of proxy/timeout limits are already right (measured/reproduced), so no transport rework is needed.

## Notes For Architecture Design

- Verified: per-request multipart `limits.fileSize` works; writer and multipart stream (P2); abort cleans up (P3); no timeouts in Fastify; no proxies in the default chains.
- To verify in design: how the web reads the policy per bound node (phone credential can read a new REST route by default); axios progress/abort in the WebView; `test:e2e:mobile-shell` coverage for the composer; where the Gemini inline guard belongs (sanitizer is provider-neutral and already the single filter).
