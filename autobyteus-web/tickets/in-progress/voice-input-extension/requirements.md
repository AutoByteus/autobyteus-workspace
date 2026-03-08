# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

The desktop app should support optional voice dictation in the shared message composer without increasing the base Electron installer size. Users should install Voice Input from a new `Extensions` settings area, and the app should download a platform-specific `whisper.cpp` runtime package plus speech model on demand into AutoByteus app data. Those downloadable assets must come from an AutoByteus-owned runtime feed published from a dedicated standalone repository, recommended as `AutoByteus/autobyteus-voice-runtime`, rather than from direct upstream release URLs or from the Electron app repository releases. After install, users can use a microphone button in the composer to record speech, transcribe it locally, and insert the resulting text into the current draft.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-layer feature touching settings UI, shared composer UI, Electron preload/main process boundaries, runtime download/install management, and automated validation.
  - Requires a managed extension lifecycle and local runtime orchestration, but does not require backend schema changes.

## In-Scope Use Cases

- `UC-001`: User opens `Settings -> Extensions` and sees currently available extensions.
- `UC-002`: User sees `Voice Input` as an installable extension with status details.
- `UC-003`: User installs `Voice Input`, and the app downloads the correct runtime package for the local OS/architecture plus the configured speech model from the AutoByteus-owned runtime feed into the AutoByteus app-data extensions area.
- `UC-004`: After install, user can use a microphone control in the shared composer for agent and team messaging flows.
- `UC-005`: User records speech, stops recording, and receives transcription inserted into the current draft without auto-send.
- `UC-006`: User sees clear states for extension install progress, install failure, runtime not ready, recording, transcribing, and transcription failure.
- `UC-007`: User can remove or reinstall the `Voice Input` extension from Settings.
- `UC-008`: End-to-end validation proves the installed runtime can be invoked successfully through the app-managed flow before handoff.
- `UC-009`: The real published runtime release in `AutoByteus/autobyteus-voice-runtime` can be built, downloaded by the app, and used for transcription from the pinned manifest URL before handoff.

## Out Of Scope / Non-Goals

- Bundling any voice runtime or speech model into the base Electron installer.
- Reviving the dormant websocket transcription path.
- Always-on local speech server processes.
- Automatic message sending after transcription.
- Open plugin marketplace or arbitrary third-party code loading.

## Constraints / Dependencies

- Voice input is desktop-only for this implementation and must respect the existing Electron preload/main boundary.
- Runtime payload must be downloaded into app data, not packaged under `resources/server`.
- The shared composer path must remain the single source of truth for both agent and team sending behavior.
- The feature must not be considered complete without automated API/E2E validation of the installed-runtime flow.
- The workflow enforces no source edits until Stage 6 with `Code Edit Permission = Unlocked`.
- No local speech server, websocket transcription service, or backend dependency may be introduced for v1.
- Runtime packaging and release publication must be owned by a dedicated standalone repository, recommended as `AutoByteus/autobyteus-voice-runtime`.
- Voice runtime releases must not be published from the Electron app repository or coupled to the desktop app `v*` tag workflow.
- The desktop app should consume a pinned AutoByteus runtime version/catalog instead of relying on ambiguous global “latest release” discovery.
- Stage 7 cannot close on fixture-only evidence; it must include validation against actual published runtime assets from the AutoByteus runtime release lane unless the user explicitly waives that requirement.

## Assumptions

- `whisper.cpp` is the initial voice runtime choice for all supported platforms.
- Initial model choice can be English-first if that materially reduces download size and implementation risk.
- AutoByteus will publish versioned runtime packages, model assets, and a manifest from the dedicated `autobyteus-voice-runtime` repository through its own release workflow.
- Electron has sufficient filesystem/process permissions to install and execute the extension in user app data.

## Open Questions / Risks

1. Whether the first runtime package should be fully static on every platform or allow a normalized archive with a small set of companion libraries.
2. Whether the model should be updatable independently from the runtime package in v1.
3. Whether the app should pin runtime version purely in code or via a bundled extension-catalog file.
4. Whether the real runtime release can be built successfully on the currently available CI runners for each supported target.
5. Whether microphone permission prompts behave consistently across all supported desktop targets.

## Requirements (Verifiable)

- `R-001` (Extensions Surface):
  - Expected outcome: Settings includes an `Extensions` section that lists available managed extensions and their current install state.

- `R-002` (Voice Input Install Flow):
  - Expected outcome: Users can install `Voice Input`, and the app downloads the platform-specific runtime package and configured speech model into the managed extensions directory.

- `R-002A` (App-Owned Runtime Feed):
  - Expected outcome: Runtime packages, model assets, and install metadata are resolved from an AutoByteus-owned runtime feed produced by the dedicated `autobyteus-voice-runtime` repository rather than from direct upstream `whisper.cpp` or Hugging Face URLs at install time.

- `R-003` (Managed Extension State):
  - Expected outcome: The app persists enough metadata to show whether `Voice Input` is not installed, installing, installed, failed, or needs reinstall.

- `R-003A` (Managed Extension Location):
  - Expected outcome: The extension runtime and model are stored under an AutoByteus-managed app-data `extensions/voice-input/` subtree rather than inside the packaged app.

- `R-003B` (Pinned Runtime Version Contract):
  - Expected outcome: The desktop app resolves Voice Input installation against an app-pinned runtime version/catalog and does not depend on a global “latest release” lookup.

- `R-004` (Composer Integration):
  - Expected outcome: When `Voice Input` is installed and ready, the shared composer exposes a microphone action beside the existing send/stop action.

- `R-005` (Draft Safety):
  - Expected outcome: Voice transcription inserts text into the current draft and does not auto-send messages.

- `R-006` (Shared Flow Reuse):
  - Expected outcome: The same composer voice control works for direct agent messages and team-focused-member messages because it reuses the shared composer path.

- `R-007` (Local Runtime Invocation):
  - Expected outcome: The renderer uses Electron IPC to request transcription, and Electron invokes the installed runtime locally without a local server.

- `R-008` (Lifecycle Management):
  - Expected outcome: Users can remove or reinstall the `Voice Input` extension from Settings.

- `R-009` (Failure Visibility):
  - Expected outcome: Install/runtime/recording/transcription failures surface actionable UI feedback without breaking normal text input.

- `R-010` (Mandatory Automated Validation):
  - Expected outcome: End-to-end validation verifies the real published runtime release from `AutoByteus/autobyteus-voice-runtime` can be built, published, downloaded, installed, and invoked through the app before handoff; fixture-only evidence is insufficient for ticket closure without an explicit user waiver.

## Acceptance Criteria

- `AC-001` Extensions navigation:
  - Measurable outcome: `Settings` shows an `Extensions` entry and renders the extensions manager.

- `AC-002` Voice Input extension card:
  - Measurable outcome: The `Extensions` manager shows `Voice Input` with install status and install/remove/reinstall controls as appropriate.

- `AC-003` Runtime installation:
  - Measurable outcome: Installing `Voice Input` downloads the correct runtime package for the local platform plus the speech model into the managed extensions directory and records installed state.

- `AC-003A` App-owned runtime provenance:
  - Measurable outcome: The install flow resolves runtime assets through AutoByteus-managed release metadata produced by the dedicated runtime repository, not by direct upstream asset discovery.

- `AC-003B` Pinned runtime resolution:
  - Measurable outcome: The app resolves the Voice Input install against a specific runtime version/catalog selected by the app, not against a repository-wide “latest release” query.

- `AC-004` Composer voice button:
  - Measurable outcome: The shared composer shows a microphone control only when `Voice Input` is installed and ready.

- `AC-005` Dictation flow:
  - Measurable outcome: Recording speech and stopping transcription inserts recognized text into the current draft while preserving manual send.

- `AC-006` Error handling:
  - Measurable outcome: Install, permission, and transcription failures show visible error state and leave text messaging usable.

- `AC-007` Extension lifecycle:
  - Measurable outcome: Users can remove or reinstall `Voice Input`, and composer availability updates accordingly.

- `AC-008` Automated app-level validation:
  - Measurable outcome: Stage 7 includes validation against actual published runtime assets from `AutoByteus/autobyteus-voice-runtime`, proving the managed runtime can be downloaded, installed/discovered, and invoked through the app-owned flow; if any criterion is infeasible in this environment, the ticket remains blocked unless explicitly waived by the user.

## Requirement Coverage Map

- `R-001` -> `UC-001`, `UC-002`
- `R-002` -> `UC-002`, `UC-003`
- `R-002A` -> `UC-002`, `UC-003`
- `R-003` -> `UC-002`, `UC-003`, `UC-006`
- `R-003A` -> `UC-003`
- `R-003B` -> `UC-002`, `UC-003`
- `R-004` -> `UC-004`
- `R-005` -> `UC-005`
- `R-006` -> `UC-004`, `UC-005`
- `R-007` -> `UC-003`, `UC-005`
- `R-008` -> `UC-007`
- `R-009` -> `UC-006`
- `R-010` -> `UC-008`, `UC-009`

## Acceptance Criteria Coverage Map (Stage 7)

- `AC-001` -> `S7-001`
- `AC-002` -> `S7-001`, `S7-002`
- `AC-003` -> `S7-002`, `S7-003`
- `AC-003A` -> `S7-002`, `S7-003`
- `AC-003B` -> `S7-002`, `S7-003`
- `AC-004` -> `S7-004`
- `AC-005` -> `S7-005`
- `AC-006` -> `S7-003`, `S7-006`
- `AC-007` -> `S7-002`, `S7-007`
- `AC-008` -> `S7-008`
