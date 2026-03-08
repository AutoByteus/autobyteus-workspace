# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| `v1` | Initial draft | Defined managed `Extensions` surface, `Voice Input` extension lifecycle, Electron runtime orchestration, shared-composer integration, and Stage 7 proof strategy | `Pending` |
| `v2` | Deepened investigation on runtime sourcing and monorepo structure | Reframed the solution around a top-level `autobyteus-voice-runtime/` project, dedicated runtime release workflow/tag space, AutoByteus-owned runtime manifest/assets, and app-pinned runtime resolution | `Pending` |
| `v3` | Stage 7 requirement-gap re-entry | Tightened the validation strategy so handoff requires a real published `voice-runtime-v*` release build/download/install/transcribe loop, with fixtures retained only as preflight coverage | `Pending` |
| `v4` | Production release-surface correction | Moved the runtime architecture from a monorepo sibling project to a dedicated repository so voice-runtime releases cannot interfere with workspace desktop-release consumers | `Pending` |

## Artifact Basis

- Investigation Notes: `autobyteus-web/tickets/in-progress/voice-input-extension/investigation-notes.md`
- Requirements: `autobyteus-web/tickets/in-progress/voice-input-extension/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Implement a minimal managed extension system in the Electron app and ship `Voice Input` as the first extension.

- Settings gains an `Extensions` section.
- `Voice Input` can be installed, removed, or reinstalled from that section.
- A dedicated repository, `AutoByteus/autobyteus-voice-runtime`, owns `whisper.cpp` integration, packaging scripts, manifest generation, and runtime-release automation.
- The runtime repository publishes its own versioned AutoByteus-owned assets without sharing a release surface with the workspace repository.
- Installing `Voice Input` downloads two payload types into app data from that AutoByteus-owned runtime release:
  - a platform-specific runtime archive,
  - a speech model file.
- The renderer never talks to a speech server.
- The shared composer records audio locally, sends it to Electron, Electron invokes the installed runtime, and the returned text is inserted into the current draft.
- The initial runtime contract is built around `whisper.cpp`, but the app consumes an AutoByteus-owned manifest/catalog because official upstream release assets do not cover a single clean cross-platform CLI package story.

## Goals

- Keep the base Electron installer unchanged.
- Provide a clean product surface for future optional capabilities under `Extensions`.
- Keep native runtime build/release infrastructure out of `autobyteus-web` source folders.
- Reuse the existing shared composer for both agent and team flows.
- Keep runtime execution in Electron, not in the backend server and not in an always-running local speech service.
- Require an app-level automated Stage 7 proof path for install/discovery/invocation before handoff.
- Require that the final Stage 7 closure consumes a real published runtime release from the AutoByteus GitHub release lane rather than fixture-only assets.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not revive the dormant websocket transcription flow and do not add compatibility wrappers around it.
- Gate rule: design is invalid if it depends on the old chunk-streaming transcription path, dual-path behavior, or a temporary local speech server fallback.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Settings exposes managed `Extensions` | `AC-001`, `AC-002` | Extensions navigation and `Voice Input` card exist | `UC-001`, `UC-002` |
| `R-002` | Install flow downloads runtime + model | `AC-003` | Platform package and model install into managed extension directory | `UC-002`, `UC-003` |
| `R-003` | Extension status is persisted and visible | `AC-002`, `AC-007` | UI reflects install lifecycle and lifecycle actions | `UC-002`, `UC-003`, `UC-007` |
| `R-003A` | Runtime/model live under app-data extensions tree | `AC-003` | Not packaged in app bundle | `UC-003` |
| `R-004` | Composer shows mic only when runtime is ready | `AC-004` | Mic button visibility follows extension readiness | `UC-004` |
| `R-005` | Dictation inserts text and preserves manual send | `AC-005` | Transcript lands in draft only | `UC-005` |
| `R-006` | Shared composer behavior covers agent and team flows | `AC-004`, `AC-005` | One integration covers both flows | `UC-004`, `UC-005` |
| `R-007` | Electron invokes runtime locally without server | `AC-003`, `AC-005` | Local process invocation contract | `UC-003`, `UC-005` |
| `R-008` | User can remove/reinstall extension | `AC-007` | Lifecycle controls stay in Settings | `UC-007` |
| `R-009` | Failures are visible and non-destructive | `AC-006` | Messaging remains usable | `UC-006` |
| `R-010` | Stage 7 includes real published-runtime install-to-invoke proof | `AC-008` | Ticket cannot close without published-release validation or waiver | `UC-008`, `UC-009` |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Settings uses section managers; Electron preload/main already own app-managed IPC surfaces; shared composer lives in one textarea component; repo root already owns release workflows and release helper scripts | `pages/settings.vue`, `electron/preload.ts`, `electron/main.ts`, `components/agentInput/AgentUserInputTextArea.vue`, `.github/workflows/release-desktop.yml`, `scripts/desktop-release.sh` | Final manifest format and whether runtime version is pinned in code or in a bundled catalog file |
| Current Naming Conventions | Settings screens use `*Manager.vue`; Electron services use focused classes like `AppUpdater`; renderer state lives in Pinia stores | `components/settings/AboutSettingsManager.vue`, `electron/updater/appUpdater.ts`, `stores/appUpdateStore.ts` | Whether `ExtensionsManager` should stay generic or be split immediately |
| Impacted Modules / Responsibilities | Shared composer owns send UI; `activeContextStore` owns draft mutation/send; no extension framework exists yet; old audio stack is standalone and backend-coupled; top-level runtime packaging belongs outside the web app package list | `stores/activeContextStore.ts`, `components/AudioRecorder.vue`, `stores/audioStore.ts`, `stores/transcriptionStore.ts`, `pnpm-workspace.yaml` | Whether any part of old WAV capture path should be reused |
| Data / Persistence / External IO | App data exists for server runtime only; main process already owns file access and updater downloads; tests can mock Electron IPC and stores cleanly | `electron/server/services/AppDataService.ts`, `electron/updater/appUpdater.ts`, `stores/__tests__/appUpdateStore.spec.ts` | Whether the published runtime release can be built successfully on all supported CI targets |

## Current State (As-Is)

- Settings has no `Extensions` section.
- There is no extension catalog, lifecycle state, or app-data extension registry.
- The shared composer has only send/stop controls.
- Existing voice-related code is an unused standalone recorder plus a dead backend-coupled transcription path.
- Electron has no IPC surface for extension install/remove/status/transcribe.
- Prior to the repository split, runtime releases still interfered with the workspace repository’s release surface because no dedicated runtime repository existed.

## Target State (To-Be)

- Settings includes `Extensions` as a first-class section.
- Renderer owns a small generic extension state store and a focused voice-input interaction store.
- Electron owns a generic managed-extension lifecycle service plus a voice-input runtime service.
- `Voice Input` is the first extension in the catalog.
- A dedicated repository, `AutoByteus/autobyteus-voice-runtime`, owns native runtime packaging.
- The runtime repository publishes runtime archives, model assets, and a manifest JSON under its own standalone release history.
- Extension files live under AutoByteus app data:
  - `extensions/registry.json`
  - `extensions/voice-input/...`
- Composer shows microphone controls only when the runtime is installed and ready.
- Dictation flow is:
  - record audio,
  - stop,
  - send audio to Electron,
  - invoke local runtime,
  - return transcript,
  - insert into draft.

## Runtime Distribution Strategy

- Runtime source of truth:
  - separate repository `AutoByteus/autobyteus-voice-runtime`
- Runtime implementation base:
  - pinned `whisper.cpp` source revision
- Runtime release workflow:
  - dedicated workflow inside the runtime repository
  - normal repository-local tags, recommended pattern `v*`
- Runtime release assets:
  - one archive per supported platform/arch
  - one model asset for the selected v1 model
  - one generated manifest JSON describing versions, checksums, asset names, and entrypoints
- App consumption strategy:
  - `autobyteus-web` ships a pinned runtime version/catalog reference including the runtime repository name
  - install flow resolves platform-specific assets through the AutoByteus manifest for that pinned version
  - install flow does not query repository-wide “latest release”
- Packaging direction:
  - prefer `BUILD_SHARED_LIBS=OFF` where viable
  - disable tests/server/SDL2/curl/ffmpeg-related extras unless required on a target
  - keep `whisper-cli` as the runtime entrypoint

## Validation Strategy

- Preflight validation:
  - deterministic fixture manifest/runtime assets remain useful for fast local tests of the app-owned orchestration path
- Release-lane validation required for closure:
- commit and push both the workspace branch and the runtime-repository branch as needed
- trigger the dedicated runtime-repository release workflow
  - confirm GitHub release assets exist for the pinned runtime version
  - point the app validation path at the published manifest URL
  - prove runtime download, install, and transcription through the app against the real release assets
- Closure rule:
  - Stage 7 is not complete if only fixture-based proof exists

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review will use the same rules, favoring clear ownership and one-way dependencies.
- SoC cause statement: settings management, extension lifecycle, runtime invocation, and composer interaction each get their own owning boundary.
- Layering result statement: UI depends on renderer stores; renderer stores depend on preload APIs; preload depends on Electron main; Electron main delegates to extension/runtime services.
- Decoupling rule statement: the renderer must not know filesystem layout or process-execution details; Electron services must not depend on Vue components or Pinia.
- Module/file placement rule statement: settings UI stays under `components/settings`, renderer state under `stores`, and runtime/download/process orchestration under `electron/extensions`.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` a minimal managed-extension architecture plus a voice-specific runtime service in the workspace repo, and `Move` runtime packaging/release ownership into a dedicated repository.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - A fully voice-specific one-off path would be slightly smaller today but would create avoidable debt because the user explicitly expects more extensions later.
  - A full plugin framework would be overbuilt.
  - A thin generic extension lifecycle plus voice-specific transcribe action is the smallest shape that still scales.
- Layering fitness assessment: `Yes`
- Decoupling assessment: `Yes`
- Module/file placement assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists | Yes | Settings, composer gating, and install/remove flows all need one source of extension truth | Extract a managed extension store/service |
| Responsibility overload exists in one file/module | Yes | `AgentUserInputTextArea.vue` should not own download/install/runtime discovery | Split lifecycle into stores/services and keep composer UI thin |
| Proposed new layer owns concrete coordination policy | Yes | Extension lifecycle service owns install/remove/reinstall/status persistence and runtime discovery | Keep the new Electron extension layer |
| Current layering can remain unchanged without SoC/decoupling degradation | No | No current place owns optional runtime lifecycle generically | Change structure |

### Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| `A` | Voice-input-only feature path with no generic extension lifecycle | Smallest short-term diff | Bakes future extension growth into ad hoc voice-specific files and settings branching | Rejected | User explicitly wants `Extensions` as a reusable product surface |
| `B` | Thin managed extension lifecycle + voice-specific transcribe action | Reusable, still small, clear settings story | Slightly more initial code | Chosen | Best balance between future growth and implementation scope |
| `C` | Full plugin framework with arbitrary extension loading | Future-flexible in theory | Security and lifecycle overkill for this ticket | Rejected | Far beyond scope |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Move` | workspace-local runtime packaging project | dedicated repository `AutoByteus/autobyteus-voice-runtime` | Runtime packaging must not share the desktop app repository release surface | Native runtime packaging | Extract to standalone repo |
| `C-002` | `Modify` | `autobyteus-web/electron/extensions/extensionCatalog.ts` | same | Point the desktop app at the separate runtime repository and pinned runtime release | Electron runtime resolution | No workspace-repo release lookup |
| `C-003` | `Modify` | `autobyteus-web/pages/settings.vue` | same | Add `Extensions` nav section and render new manager | Settings navigation | Keep `Updates` intact |
| `C-004` | `Add` | N/A | `autobyteus-web/components/settings/ExtensionsManager.vue` | Managed extensions landing surface | Settings UI | Mirrors manager pattern |
| `C-005` | `Add` | N/A | `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | Focused card for install/remove/reinstall/status | Settings UI | Optional split if manager stays simple |
| `C-006` | `Add` | N/A | `autobyteus-web/stores/extensionsStore.ts` | Renderer source of truth for extension catalog/status/actions | Renderer state | Generic lifecycle only |
| `C-007` | `Add` | N/A | `autobyteus-web/stores/voiceInputStore.ts` | Composer-facing recording/transcribing/error state and draft insertion | Renderer state | Voice-specific interaction layer |
| `C-008` | `Modify` | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | same | Add mic button + voice state UI + store integration | Shared composer | Covers agent + team flows |
| `C-009` | `Add` | N/A | `autobyteus-web/electron/extensions/extensionCatalog.ts` | App-owned extension manifest definitions and pinned runtime mapping | Electron | Supports future extensions |
| `C-010` | `Add` | N/A | `autobyteus-web/electron/extensions/managedExtensionService.ts` | Generic install/remove/status registry and filesystem ownership | Electron | Owns `registry.json` |
| `C-011` | `Add` | N/A | `autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeService.ts` | Runtime-specific install/discovery/transcribe logic | Electron | Owns process execution |
| `C-012` | `Modify` | `autobyteus-web/electron/preload.ts`, `autobyteus-web/types/electron.d.ts` | same | Expose typed extension lifecycle and voice-transcribe IPC | Electron bridge | Follows updater pattern |
| `C-013` | `Modify` | `autobyteus-web/electron/main.ts` | same | Register extension/voice IPC handlers | Electron main | Delegate to services |
| `C-014` | `Remove` | Legacy voice-path references in current scope | same | Avoid reviving old transcription flow in new UI path | Renderer voice integration | Leave old dormant files untouched unless directly in scope |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Voice runtime packaging project | workspace repository root | separate repository `AutoByteus/autobyteus-voice-runtime` | Native runtime build/release tooling | Yes | Move | Keeps native packaging and runtime releases fully separate from the desktop app repo |
| Settings navigation | `pages/settings.vue` | same | Settings route shell | Yes | Keep | Correct place for section registration |
| Updates manager pattern | `components/settings/AboutSettingsManager.vue` | same | Settings section manager example | Yes | Keep | Reuse pattern only |
| New extensions manager | N/A | `components/settings/ExtensionsManager.vue` | Settings UI | Yes | Add | Canonical owner for extension cards |
| New extensions store | N/A | `stores/extensionsStore.ts` | Renderer extension lifecycle state | Yes | Add | Correct state owner |
| New voice input interaction store | N/A | `stores/voiceInputStore.ts` | Renderer mic/transcription UX | Yes | Add | Keeps composer thin |
| New Electron runtime service | N/A | `electron/extensions/voice-input/voiceInputRuntimeService.ts` | Desktop runtime install and invocation | Yes | Add | Platform-specific concern belongs in Electron |
| Old standalone recorder | `components/AudioRecorder.vue` | same | Legacy standalone UI | No | Keep out of scope | Do not reuse as shared-composer owner |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Runtime packaging repository | Build/package/publish AutoByteus-owned voice runtime assets | `AutoByteus/autobyteus-voice-runtime`, release manifest generation, platform packaging scripts | Renderer/Electron UI behavior | Separate repo, separate concern |
| Settings UI | Extension management presentation | `ExtensionsManager.vue`, extension cards | Filesystem/process logic | Reads renderer store only |
| Shared composer UI | Voice button and local interaction feedback | `AgentUserInputTextArea.vue` | Install lifecycle persistence | Delegates to `voiceInputStore` |
| Renderer extension lifecycle store | Fetch/list/install/remove/reinstall extension state | `extensionsStore.ts` | Process spawning or file writes | Mirrors updater-store pattern |
| Renderer voice interaction store | Mic permission, record/transcribe state, draft insertion | `voiceInputStore.ts` | Package download details | Can use shared audio config |
| Preload bridge | Secure typed IPC surface | `preload.ts`, `types/electron.d.ts` | Business logic | Thin translation only |
| Electron managed extension service | Registry persistence and package/model lifecycle | `managedExtensionService.ts` | Renderer concerns | Generic by extension ID |
| Electron voice runtime service | Package unpack, model presence, process invocation | `voiceInputRuntimeService.ts` | Settings rendering | Voice-specific |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Reuse `audioStore` + `transcriptionStore` websocket path | Existing voice-related code already exists | Rejected | New `voiceInputStore` + Electron local-runtime path |
| Add temporary local speech server for v1 | Could look similar to old architecture | Rejected | One-shot local process invocation from Electron |
| Keep mic hidden behind old recorder component | Lowest short-term UI diff | Rejected | Integrate directly into shared composer |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `AutoByteus/autobyteus-voice-runtime` repository | Add | Runtime packaging repository | Build, package, checksum, and publish voice runtime assets | build/release scripts only | upstream source + model inputs -> AutoByteus release assets | CMake, shell/CI tooling |
| `AutoByteus/autobyteus-voice-runtime/.github/workflows/release-voice-runtime.yml` | Add | Release automation | Build/publish runtime assets under dedicated runtime-repository release history | workflow dispatch/tag entry only | git ref -> release assets | GitHub Actions, runtime packaging repository |
| `pages/settings.vue` | Modify | UI shell | Register `extensions` section and manager mount | section routing only | route query -> section UI | existing settings managers |
| `components/settings/ExtensionsManager.vue` | Add | UI | Render available extensions and actions | N/A | store state -> settings cards | `extensionsStore` |
| `components/settings/VoiceInputExtensionCard.vue` | Add | UI | Render voice-specific copy, status, and controls | props or store-driven | extension state -> action buttons | `extensionsStore` |
| `stores/extensionsStore.ts` | Add | Renderer store | Initialize extension catalog, subscribe to status changes, run lifecycle actions | `initialize`, `installExtension`, `removeExtension`, `reinstallExtension` | Electron payloads -> renderer state | `window.electronAPI` |
| `stores/voiceInputStore.ts` | Add | Renderer store | Handle recording/transcribing state and insert transcript into draft | `startRecording`, `stopRecording`, `cancel`, `applyTranscript` | mic audio -> transcript/draft update | `extensionsStore`, `activeContextStore`, `window.electronAPI` |
| `components/agentInput/AgentUserInputTextArea.vue` | Modify | UI | Mic button placement, state rendering, store wiring | existing UI handlers | user clicks -> store actions | `voiceInputStore` |
| `electron/extensions/extensionCatalog.ts` | Add | Electron service | Static manifest catalog and platform-specific artifact resolution | `getExtensionCatalog()` | process.platform/arch -> artifact descriptors | none |
| `electron/extensions/managedExtensionService.ts` | Add | Electron service | Registry persistence, extension directories, install/remove/reinstall orchestration | `listExtensions`, `install`, `remove`, `reinstall`, `getExtensionRoot` | extension ID -> persisted state | fs, Electron app paths, runtime services |
| `electron/extensions/voice-input/voiceInputRuntimeService.ts` | Add | Electron service | Runtime package download/unpack, model download, transcribe invocation | `installRuntime`, `transcribe`, `removeRuntime`, `getVoiceInputStatus` | audio file -> transcript | fs, child_process, managed extension service |
| `electron/preload.ts` + `types/electron.d.ts` | Modify | Bridge | Typed extension + transcribe methods | `getExtensionsState`, `installExtension`, `removeExtension`, `reinstallExtension`, `onExtensionsState`, `transcribeVoiceInput` | Electron IPC -> renderer | `ipcRenderer` |
| `electron/main.ts` | Modify | Electron main | IPC handler registration and service bootstrapping | IPC handlers only | renderer invoke -> service response | extension services |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: responsibility is clear at settings-manager, composer, and store boundaries.
- Non-UI scope: runtime install/invoke logic stays in dedicated Electron services rather than main.ts.
- Integration/infrastructure scope: extension lifecycle and runtime invocation are separate, so future extensions can reuse install/remove persistence without inheriting voice-specific process logic.
- Layering note: the only generic layer added is the minimal managed-extension lifecycle because multiple callers need the same state and install/remove orchestration.
- Decoupling check: renderer never reaches into filesystem or process execution; Electron never depends on Vue/Pinia.
- Module/file placement check: all new platform-specific logic is placed under `electron/extensions`, not under shared frontend folders.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `ExtensionsManager.vue` | Matches existing settings-manager naming | User-facing section owner |
| File | N/A | `extensionsStore.ts` | Generic managed extension lifecycle store | Future-ready but not overbuilt |
| File | N/A | `voiceInputStore.ts` | Narrowly owns composer voice UX | Keeps voice actions separate from extension lifecycle |
| File | N/A | `managedExtensionService.ts` | Clear Electron lifecycle owner | Generic but not plugin-like |
| File | N/A | `voiceInputRuntimeService.ts` | Makes runtime-specific responsibility explicit | Voice-only service |
| API | N/A | `installExtension(id)` / `removeExtension(id)` / `reinstallExtension(id)` | Generic lifecycle verbs | Mirrors settings actions |
| API | N/A | `transcribeVoiceInput(payload)` | Voice-specific action stays explicit | Avoids fake generic plugin execution API |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `AboutSettingsManager.vue` | Updates manager, not general about page | No | `N/A` for this ticket | N/A |
| `AudioRecorder.vue` | Standalone recorder UI, not shared composer voice feature | No | `N/A` for this ticket | N/A |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Old audio/transcription stores | High | Build new renderer/Electron path aligned to shared composer and managed extension lifecycle | Change | Existing path is backend-coupled and not reused in product flow |
| `main.ts` as all-in-one implementation home | Medium | Keep handlers in `main.ts` but move logic to `electron/extensions/*` services | Change | Preserves maintainability and testability |
| Settings inline implementation in `pages/settings.vue` | Medium | Add a dedicated `ExtensionsManager.vue` | Change | Follows current settings pattern cleanly |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Directly spawn runtime from `AgentUserInputTextArea.vue` through untyped globals | High | Route through `voiceInputStore` + typed preload IPC | Rejected | Would break security boundary |
| Hide install state inside composer-only local state | High | Use `extensionsStore` and Electron-persisted registry | Rejected | Settings and composer both need one source of truth |
| Reuse dormant websocket transcription code with fake backend stubs | High | Replace with local Electron process invocation | Rejected | Wrong architecture for v1 |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `extensionsStore.ts` | `window.electronAPI` | settings manager, voice store | Low | Keep generic lifecycle API small |
| `voiceInputStore.ts` | `extensionsStore`, `activeContextStore`, browser mic APIs | composer | Medium | Keep it ignorant of install directory/process details |
| `managedExtensionService.ts` | extension catalog, fs, app paths | main handlers, runtime service | Medium | Runtime-specific logic delegated out |
| `voiceInputRuntimeService.ts` | managed extension service, fs, child_process | managed extension service, main handlers | Medium | One-way dependency only; no Vue imports |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `UI components -> renderer stores -> preload IPC -> Electron main handlers -> Electron services -> filesystem/process/network`.
- Temporary boundary violations and cleanup deadline: `None planned`.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Dormant transcription reuse in new flow | Do not import `audioStore` or `transcriptionStore` into new settings/composer path | Old files remain dormant but are not part of new behavior | import/reference scan in touched files |
| Composer inline voice lifecycle logic | Keep lifecycle outside component | No fallback to ad hoc component state | component/store tests |

## Data Models (If Needed)

- `ManagedExtensionRecord`
  - `id`
  - `name`
  - `status` (`not-installed` / `installing` / `installed` / `error`)
  - `message`
  - `installedAt`
  - `runtimeVersion`
  - `modelVersion`
  - `platform`
  - `arch`
  - `paths` (`root`, `runtimeEntrypoint`, `modelPath`)

- `VoiceInputTranscriptionRequest`
  - temporary audio file path or byte payload metadata
  - language/model selection fields if needed later

- `VoiceInputTranscriptionResult`
  - `text`
  - `durationMs`
  - `error` nullable

## Error Handling And Edge Cases

- Install requested while already installing: no-op with current status returned.
- Runtime missing or corrupted after previous install: status flips to error/reinstall-required.
- Microphone permission denied: renderer shows actionable error and leaves text input usable.
- User stops recording before any usable audio: no transcript inserted; state resets safely.
- Transcription process exits non-zero: renderer gets error state and draft remains unchanged.
- Remove extension while not installed: no-op success.
- Team mode focus changes during dictation: transcript inserts into the currently active draft owner when the result is applied; design should avoid silent retargeting surprises by disabling focus changes only if necessary after runtime review.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `R-001` | Open `Settings -> Extensions` | Yes | N/A | N/A | `UC-001` |
| `UC-002` | `R-001`, `R-002`, `R-003` | View `Voice Input` extension card and action state | Yes | Yes | Yes | `UC-002` |
| `UC-003` | `R-002`, `R-003A`, `R-007` | Install runtime package + model into app data | Yes | Yes | Yes | `UC-003` |
| `UC-004` | `R-004`, `R-006` | Composer shows mic when runtime ready | Yes | N/A | Yes | `UC-004` |
| `UC-005` | `R-005`, `R-006`, `R-007` | Record, transcribe, and insert text into draft | Yes | Yes | Yes | `UC-005` |
| `UC-006` | `R-003`, `R-009` | Show failure states without breaking messaging | Yes | N/A | Yes | `UC-006` |
| `UC-007` | `R-008` | Remove/reinstall extension | Yes | N/A | Yes | `UC-007` |
| `UC-008` | `R-010` | Run Stage 7 proof of install-to-invoke app flow | Yes | N/A | Yes | `UC-008` |

## Performance / Security Considerations

- Do not keep a background speech daemon running.
- Store runtime/model outside the packaged app to avoid modifying signed resources.
- Use preload IPC for all runtime actions; renderer never receives arbitrary filesystem write access.
- Keep recording payload local and short-lived; clean temporary audio files after transcription.

## Migration / Rollout (If Needed)

- Feature is additive and gated by install status.
- No migration of current user data is required.
- Runtime distribution is additive and uses a separate release lane from the desktop app.
- Existing installs simply show `Voice Input` as `Not installed`.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| `C-001` | `T-001` | repository creation + runtime release validation | Planned |
| `C-002`, `C-003`, `C-004` | `T-002`, `T-003` | component/store tests | Planned |
| `C-005`, `C-006` | `T-004`, `T-005` | store/component/integration tests | Planned |
| `C-007`, `C-008`, `C-009`, `C-010`, `C-011` | `T-006`, `T-007`, `T-008` | Electron-main tests + app-level integration proof | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-08 | Initial design draft | N/A | N/A | No | Initial design baseline created | Open |

## Open Questions

1. Whether v1 should use `tiny.en` or `tiny.en-q5_1` by default.
2. Whether the app should ship a hardcoded AutoByteus-hosted runtime manifest, env-overridable runtime manifest URLs, or both.
3. Whether the first extracted runtime repository should be public immediately or staged privately first before the workspace branch merges.
