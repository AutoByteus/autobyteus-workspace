# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

The desktop app should support optional local bilingual voice dictation in a way that users can actually trust and debug in live use. Voice Input is now installable from `Settings -> Extensions`, and the app downloads a platform-specific runtime bundle from the dedicated `AutoByteus/autobyteus-voice-runtime` release lane before bootstrapping the local backend and model under `~/.autobyteus/extensions/voice-input`. However, live validation has shown two remaining product gaps:

1. the install flow does not expose real phase/progress/error telemetry, so users cannot tell whether the runtime/model download is still active or has stalled; and
2. the dictation flow can collapse to `No speech detected.` even when the installed worker and model are healthy, leaving users without any way to test the microphone path or inspect what failed.

This iteration must therefore preserve the current local worker architecture while adding actionable install progress, a settings-level test surface, and enough capture/transcription diagnostics to resolve the live `No speech detected.` failure.

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
- `UC-010`: Immediately after clicking `Install` or `Reinstall`, the extensions UI shows that installation is actively in progress instead of waiting for the Electron install call to return.
- `UC-011`: After `Voice Input` is installed, the extensions UI lets the user open the managed install folder from Electron.
- `UC-012`: While dictation is active in the shared composer, users see visible recording or transcribing feedback so they know the microphone flow is live.
- `UC-013`: While Voice Input is installing, users can see which phase is in progress and whether the app is still actively downloading/bootstraping runtime assets.
- `UC-014`: After Voice Input is installed, users can test microphone capture directly from the settings page without navigating into a conversation/composer flow.
- `UC-015`: When dictation fails, users can distinguish microphone silence, empty transcript, and runtime/transcription error states instead of seeing the same generic `No speech detected.` result.

## Out Of Scope / Non-Goals

- Bundling any voice runtime or speech model into the base Electron installer.
- Reviving the dormant websocket transcription path.
- Always-on local speech server processes.
- Automatic message sending after transcription.
- Open plugin marketplace or arbitrary third-party code loading.
- Cloud/server speech recognition fallback for this ticket.

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
- The install UX must not pretend to provide byte progress if the backend cannot actually report it; phase-based progress is acceptable, fake percentages are not.
- The settings-level test surface must reuse the same capture/transcription path as the composer rather than introducing a second hidden speech pipeline.

## Assumptions

- macOS Apple Silicon uses an MLX-backed runtime bundle; other desktop targets continue to use the runtime/backend selected by the published manifest.
- The installed worker process remains the single local transcription boundary for the app.
- AutoByteus will publish versioned runtime bundles and a manifest from the dedicated `autobyteus-voice-runtime` repository through its own release workflow.
- Electron has sufficient filesystem/process permissions to install and execute the extension in user app data.
- Live input-level and capture diagnostics can be surfaced from the renderer recorder path without introducing a background speech server.

## Open Questions / Risks

1. Whether the current recorder path is delivering incorrectly described sample-rate data into the worker, causing empty or poor transcripts for real microphone capture.
2. Whether the current `no speech` heuristic threshold (`rms < 120`) is too aggressive for low-volume real microphone input on this machine.
3. Whether the settings-level test surface should persist the last captured WAV for debugging, or only show in-memory metadata and transcript status.
4. Whether install progress should be byte-based where possible, phase-based everywhere, or a hybrid of both.
5. Whether microphone permission prompts and input-device routing behave consistently across all supported desktop targets.

## Requirements (Verifiable)

- `R-001` (Extensions Surface):
  - Expected outcome: Settings includes an `Extensions` section that lists available managed extensions and their current install state.

- `R-002` (Voice Input Install Flow):
  - Expected outcome: Users can install `Voice Input`, and the app downloads the platform-specific runtime package and configured speech model into the managed extensions directory.

- `R-002A` (App-Owned Runtime Feed):
  - Expected outcome: Runtime packages, model assets, and install metadata are resolved from an AutoByteus-owned runtime feed produced by the dedicated `autobyteus-voice-runtime` repository rather than from direct upstream `whisper.cpp` or Hugging Face URLs at install time.

- `R-003` (Managed Extension State):
  - Expected outcome: The app persists enough metadata to show whether `Voice Input` is not installed, installing, installed, failed, or needs reinstall.

- `R-003C` (Immediate Install Feedback):
  - Expected outcome: The `Extensions` UI flips into an `installing` state as soon as the user starts install or reinstall, with visible in-progress feedback before the Electron install promise resolves.

- `R-003D` (Install Location Access):
  - Expected outcome: After `Voice Input` is installed, the Electron settings UI provides a direct action to open the managed install folder.

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

- `R-009A` (Recording Activity Visibility):
  - Expected outcome: While recording or transcribing, the shared composer visibly communicates that voice capture is active, rather than only changing the mic button affordance.

- `R-003E` (Install Telemetry Visibility):
  - Expected outcome: The install flow surfaces real runtime/model/bootstrap phase progress and terminal error details to the settings UI instead of a single static `Installing...` message.

- `R-009B` (Settings-Level Voice Test Surface):
  - Expected outcome: After Voice Input is installed, the settings UI provides a direct test workflow that exercises the same recorder/transcription path as the composer and shows the resulting transcript or failure state.

- `R-009C` (Capture And Classification Diagnostics):
  - Expected outcome: When dictation produces no transcript, the app surfaces enough diagnostics to distinguish true silence/no-speech from empty-transcript or runtime error conditions.

- `R-010` (Mandatory Automated Validation):
  - Expected outcome: End-to-end validation verifies the real published runtime release from `AutoByteus/autobyteus-voice-runtime` can be built, published, downloaded, installed, and invoked through the app before handoff; fixture-only evidence is insufficient for ticket closure without an explicit user waiver.

## Acceptance Criteria

- `AC-001` Extensions navigation:
  - Measurable outcome: `Settings` shows an `Extensions` entry and renders the extensions manager.

- `AC-002` Voice Input extension card:
  - Measurable outcome: The `Extensions` manager shows `Voice Input` with install status and install/remove/reinstall controls as appropriate.

- `AC-003` Runtime installation:
  - Measurable outcome: Installing `Voice Input` downloads the correct runtime package for the local platform plus the speech model into the managed extensions directory and records installed state.

- `AC-003C` Immediate install UX:
  - Measurable outcome: Clicking `Install` or `Reinstall` immediately updates the extension card into an in-progress state with disabled controls and visible status copy.

- `AC-003D` Install folder access:
  - Measurable outcome: Once `Voice Input` is installed, the settings UI offers an `Open Folder` action that opens the managed install directory in Electron.

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

- `AC-006A` Recording visibility:
  - Measurable outcome: While dictation is recording or transcribing, the shared composer displays a visible status indicator so users know voice capture is in progress.

- `AC-003E` Install telemetry:
  - Measurable outcome: Installing Voice Input shows real phase progress such as runtime download, runtime extraction, backend/model bootstrap, and ready/error, without faking unavailable percentage values.

- `AC-006B` Settings-level test flow:
  - Measurable outcome: After install, the settings UI lets the user run a test recording and see microphone state, live capture activity, and the final transcript or explicit failure reason.

- `AC-006C` No-speech diagnostics:
  - Measurable outcome: A failed test/composer dictation clearly distinguishes at least `no speech`, `empty transcript`, and `runtime/transcription error` outcomes, and shows enough metadata to support debugging.

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
- `R-003E` -> `UC-006`, `UC-013`
- `R-003C` -> `UC-006`, `UC-010`
- `R-003D` -> `UC-002`, `UC-011`
- `R-009A` -> `UC-006`, `UC-012`
- `R-009B` -> `UC-014`
- `R-009C` -> `UC-015`
- `R-010` -> `UC-008`, `UC-009`

## Acceptance Criteria Coverage Map (Stage 7)

- `AC-001` -> `S7-001`
- `AC-002` -> `S7-001`, `S7-002`
- `AC-003` -> `S7-002`, `S7-003`
- `AC-003C` -> `S7-002`
- `AC-003D` -> `S7-002`
- `AC-003A` -> `S7-002`, `S7-003`
- `AC-003B` -> `S7-002`, `S7-003`
- `AC-004` -> `S7-004`
- `AC-005` -> `S7-005`
- `AC-006` -> `S7-003`, `S7-006`
- `AC-006A` -> `S7-004`, `S7-005`
- `AC-003E` -> `S7-002`, `S7-003`
- `AC-006B` -> `S7-006`, `S7-009`
- `AC-006C` -> `S7-006`, `S7-009`
- `AC-007` -> `S7-002`, `S7-007`
- `AC-008` -> `S7-008`
