# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Metadata

- Ticket: `voice-input-bilingual-runtime`
- Owner: `Codex`
- Branch: `codex/voice-input-bilingual-runtime`
- Last Updated: `2026-03-09 (reopened for local-bootstrap redesign)`

## Goal / Problem Statement

The current desktop Voice Input implementation is a v1 English-first extension. It installs an English-only `whisper.cpp` runtime, hardcodes English transcription requests, has no explicit enable/disable lifecycle, stores extension assets under Electron `userData` instead of the canonical AutoByteus home-folder data root, and hallucinates text on silence because it lacks no-speech filtering. A first v2 iteration also made the runtime release too heavy by publishing multilingual model archives as GitHub Release assets. The product now needs a mature bilingual Voice Input extension that supports Chinese and English, separates `Install` from `Enable`, uses the same base data root as the Electron-managed server runtime, keeps the dedicated runtime repository for pinned worker bundles only, bootstraps backend dependencies and bilingual model assets locally on the user machine during install, and is validated end-to-end against a real published lightweight runtime release before handoff.

## Scope Classification

- Classification: `Large`
- Rationale:
  - Cross-layer change touching settings UX, renderer stores, preload/main IPC, Electron app-data ownership, runtime request contracts, and runtime repository release assets.
  - Product behavior changes from install-only lifecycle to install plus enable/disable plus language preferences.
  - Runtime architecture changes from English-only one-shot `whisper.cpp` execution to bilingual platform-specific local backends.
  - Stage 7 requires real GitHub release publication and app-consumption proof, plus proof that backend/model setup happens locally instead of from release-hosted model archives.

## In-Scope Use Cases

- `UC-001`: User opens `Settings -> Extensions` and sees `Voice Input` with install state, enable state, version details, and lifecycle actions.
- `UC-002`: User clicks `Install`, and the app downloads the correct platform runtime bundle from the pinned `AutoByteus/autobyteus-voice-runtime` release metadata into the canonical AutoByteus extensions directory, then performs local backend/model bootstrap for that machine.
- `UC-003`: After install, the extension remains installed but disabled until the user explicitly enables it.
- `UC-004`: User enables `Voice Input`, and the app makes dictation available without requiring a re-download.
- `UC-005`: User disables `Voice Input`, and dictation is unavailable while installed assets remain on disk.
- `UC-006`: User chooses language mode `Auto`, `English`, or `Chinese`, and that preference persists while the extension remains installed.
- `UC-007`: User records English speech and receives transcript text inserted into the current draft without auto-send.
- `UC-008`: User records Chinese speech and receives transcript text inserted into the current draft without auto-send.
- `UC-009`: User records mixed Chinese and English speech in `Auto` mode and receives one transcript through the same local runtime flow.
- `UC-010`: User records silence or near-silence and the app suppresses garbage/hallucinated transcript insertion.
- `UC-011`: The shared composer shows the microphone affordance only when Voice Input is installed, enabled, and ready.
- `UC-012`: While recording or transcribing, the shared composer shows visible status feedback.
- `UC-013`: User can `Reinstall` the runtime assets without losing the installed extension concept or being forced to remove first.
- `UC-014`: User can `Remove` Voice Input and the app deletes installed assets and resets extension-specific settings.
- `UC-015`: User can open the managed extension folder from Electron after install.
- `UC-016`: The runtime uses the canonical AutoByteus base data root so extensions live beside `server-data`, not under Electron `userData`.
- `UC-017`: A real published lightweight runtime release can be built, released, downloaded, installed, locally bootstrapped, enabled, and invoked through the app-owned flow before handoff.

## Out Of Scope / Non-Goals

- Supporting languages other than Chinese and English in this ticket.
- Cloud-first or remote-server transcription as the primary product path.
- Reviving the old backend/websocket transcription path.
- Bundling voice runtime assets directly into the base Electron installer.
- Automatic migration of old Voice Input installs from `userData` to the canonical AutoByteus home-folder path.
- Retaining compatibility wrappers or legacy branching for the previous v1 install location and English-only runtime contract.
- Automatic message sending after transcription.

## Constraints / Dependencies

- Voice Input remains a managed desktop extension downloaded from release artifacts, not bundled in the app.
- The extension install root must use the same base data directory that the Electron app uses for `server-data`.
  - Expected canonical layout:
    - base data root: `~/.autobyteus`
    - server data: `~/.autobyteus/server-data`
    - extensions root: `~/.autobyteus/extensions`
    - Voice Input root: `~/.autobyteus/extensions/voice-input`
- `Install` and `Enable` are separate actions.
- `Disable` must not delete installed files.
- `Remove` must delete installed Voice Input assets and reset Voice Input settings.
- No migration work is required for previously installed assets in the old location; remove and reinstall is the supported recovery path.
- Runtime assets must be resolved from the dedicated runtime repository release lane:
  - repository: `AutoByteus/autobyteus-voice-runtime`
- The app must consume a pinned runtime version/manifest contract, not a repository-wide “latest release” lookup.
- GitHub Release assets must stay lightweight:
  - publish runtime bundle(s) + manifest
  - do not publish model archive payloads in the release
- Backend dependencies and model assets must be installed locally on the user machine during `Install`, based on platform/backend metadata from the pinned manifest.
- The mature runtime path must stay local to the user’s machine.
- The user requested platform backend policy:
  - macOS Apple Silicon: MLX-based local backend
  - Linux: non-MLX local backend
  - Windows: non-MLX local backend
- Existing desktop-supported x64 targets should remain supported by a non-MLX backend rather than being silently dropped.
- Stage 7 must include real release-based validation and may use `gh` commands/workflows to publish runtime assets needed for the proof.

## Assumptions

- The shared composer remains the single user-facing dictation entry point for both agent and team flows.
- Renderer-side recording continues to produce a final local audio payload that is handed to Electron for transcription.
- `Auto` should be the default language mode.
- `Auto` and `Chinese` require multilingual runtime/model behavior and must not use English-only `.en` model policy.
- The runtime repository can publish distinct platform bundles behind one app-level manifest contract.

## Risks To Track

- MLX packaging and startup behavior on macOS Apple Silicon may differ substantially from the non-MLX backends.
- Bilingual quality depends on multilingual model choice, not only on the app-side selector.
- Replacing the current one-shot runtime path with a local managed worker changes the Electron/runtime contract and test surface.
- Real release-based validation may require coordinated changes in both this workspace and the dedicated runtime repository.

## Requirements (Verifiable)

- `R-001` (Extensions Surface):
  - Expected outcome: `Settings -> Extensions` shows `Voice Input` with install status, enable status, version details, and lifecycle controls.

- `R-002` (Install Lifecycle Separation):
  - Expected outcome: `Install` downloads the pinned runtime bundle, performs local backend/model bootstrap for the current machine, and records the extension as installed without automatically enabling dictation.

- `R-003` (Enable/Disable Lifecycle):
  - Expected outcome: Installed Voice Input can be explicitly enabled or disabled without re-downloading or removing its files.

- `R-003A` (Visible Product States):
  - Expected outcome: The user-visible Voice Input states include at least:
    - `Not Installed`
    - `Installing`
    - `Installed and Disabled`
    - `Installed and Enabled`
    - `Needs Attention`

- `R-003B` (Reinstall Lifecycle):
  - Expected outcome: `Reinstall` refreshes runtime assets while preserving the extension concept; enabled/disabled state and language preference should persist unless install fails.

- `R-003C` (Remove Lifecycle):
  - Expected outcome: `Remove` deletes installed Voice Input runtime/model assets and resets Voice Input-specific enable/language state.

- `R-004` (Canonical Storage Root):
  - Expected outcome: Voice Input assets are stored under the AutoByteus base data root as a sibling of `server-data`, not under Electron `userData`.

- `R-004A` (Base Data Root Reuse):
  - Expected outcome: The Electron extension manager derives the extensions root from the same base data directory contract that produces `<base>/server-data`.

- `R-004B` (Install Folder Access):
  - Expected outcome: After install, the settings UI provides an `Open Folder` action for the managed Voice Input install directory.

- `R-005` (Pinned Runtime Provenance):
  - Expected outcome: Runtime bundle coordinates resolve from the pinned `AutoByteus/autobyteus-voice-runtime` release manifest rather than from “latest release” discovery.

- `R-005A` (Lightweight Release Payload):
  - Expected outcome: The pinned runtime release publishes only the manifest and platform runtime bundle assets needed for install orchestration; it does not publish bilingual model archive payloads.

- `R-005B` (Local Bootstrap Provenance):
  - Expected outcome: The pinned runtime manifest carries the authoritative backend/model metadata needed for local bootstrap, and the installed runtime fetches backend/model dependencies directly on the user machine during `Install`.

- `R-006` (Language Selector):
  - Expected outcome: Users can choose `Auto`, `English`, or `Chinese` while the extension is installed.

- `R-006A` (Language Preference Persistence):
  - Expected outcome: The selected language mode persists across app restarts while the extension remains installed.

- `R-006B` (Language Switch Without Reinstall):
  - Expected outcome: Switching between `Auto`, `English`, and `Chinese` in the UI does not require re-downloading or reinstalling the runtime once the bilingual install is complete.

- `R-007` (Bilingual Runtime Behavior):
  - Expected outcome: The runtime supports English dictation, Chinese dictation, and mixed Chinese-English dictation in `Auto`.

- `R-007A` (Multilingual Model Policy):
  - Expected outcome: `Auto` and `Chinese` use multilingual runtime/model policy and must not fall back to an English-only `.en` model.

- `R-007C` (Bilingual Install Baseline):
  - Expected outcome: The installed runtime baseline supports both English and Chinese on the same machine without requiring the user to install separate language-specific extension packages.

- `R-007B` (Silence/No-Speech Suppression):
  - Expected outcome: Silence or near-silence does not append hallucinated transcript text into the draft.

- `R-008` (Local Managed Worker):
  - Expected outcome: Electron uses a local managed runtime worker/service process for Voice Input rather than spawning a fresh remote request or depending on a cloud/server transcription path.

- `R-008A` (Structured Runtime Contract):
  - Expected outcome: The Electron-to-runtime contract returns structured metadata sufficient for transcript insertion decisions, including transcript text and actionable failure/no-speech state.

- `R-008B` (Install-Time Local Bootstrap):
  - Expected outcome: `Install` invokes the local runtime bootstrap path so backend dependencies and the bilingual model are prepared before the user later clicks `Enable`.

- `R-009` (Platform Backend Policy):
  - Expected outcome: The runtime implementation follows this platform policy behind one app contract:
    - macOS arm64 -> MLX-based backend
    - macOS x64 -> `faster-whisper`-based backend
    - Linux x64 -> `faster-whisper`-based backend
    - Windows x64 -> `faster-whisper`-based backend

- `R-010` (Shared Composer Integration):
  - Expected outcome: The shared composer exposes the mic control only when Voice Input is installed, enabled, and not in an error state.

- `R-011` (Draft Safety):
  - Expected outcome: Transcription appends text into the current draft and never auto-sends a message.

- `R-012` (Shared Flow Reuse):
  - Expected outcome: The same shared composer voice control works for direct agent messaging and team-focused-member messaging.

- `R-013` (Activity Visibility):
  - Expected outcome: While Voice Input is recording or transcribing, the composer visibly communicates the active state.

- `R-014` (Failure Visibility):
  - Expected outcome: Install, enable, runtime startup, microphone, transcription, and no-speech outcomes surface actionable UI feedback without breaking text input.

- `R-015` (No Legacy Retention / No Migration):
  - Expected outcome: The implementation removes or replaces in-scope legacy behaviors rather than preserving fallback branches for the old install location or the old English-only runtime contract.

- `R-016` (Mandatory Real Release Validation):
  - Expected outcome: Before handoff, the actual runtime release lane publishes the pinned lightweight runtime assets and the app proves it can download, locally bootstrap, enable, and invoke them through the managed Voice Input flow.

## Acceptance Criteria

- `AC-001` Extensions manager surface:
  - Measurable outcome: `Settings` renders the Voice Input extension card with install and enable state.

- `AC-002` Install does not auto-enable:
  - Measurable outcome: After `Install`, Voice Input has completed local backend/model bootstrap, is present on disk, and is shown as installed, but dictation remains unavailable until the user enables it.

- `AC-003` Enable/disable lifecycle:
  - Measurable outcome: Users can enable and disable installed Voice Input without re-downloading or removing assets.

- `AC-004` Canonical storage root:
  - Measurable outcome: Installed Voice Input assets land under `~/.autobyteus/extensions/voice-input` or the platform-equivalent canonical AutoByteus base-data root, not under Electron `userData`.

- `AC-005` Open-folder support:
  - Measurable outcome: Installed Voice Input exposes an `Open Folder` action that opens the managed install directory.

- `AC-006` Language selector:
  - Measurable outcome: Installed Voice Input exposes `Auto`, `English`, and `Chinese`, with `Auto` as the default.

- `AC-007` English dictation:
  - Measurable outcome: In `English` or `Auto`, English speech produces transcript text inserted into the current draft.

- `AC-008` Chinese dictation:
  - Measurable outcome: In `Chinese` or `Auto`, Chinese speech produces transcript text inserted into the current draft.

- `AC-009` Mixed bilingual dictation:
  - Measurable outcome: In `Auto`, mixed Chinese-English speech is handled through the same local runtime flow.

- `AC-010` Silence suppression:
  - Measurable outcome: Silence/no-speech does not insert hallucinated text such as `"you"` into the draft.

- `AC-011` Shared composer gating:
  - Measurable outcome: The mic button is shown only when Voice Input is installed, enabled, and not in an error state.

- `AC-012` Draft-only insertion:
  - Measurable outcome: Voice transcription updates the draft and preserves manual send behavior.

- `AC-013` Activity feedback:
  - Measurable outcome: Recording and transcribing states are visibly communicated in the shared composer.

- `AC-014` Failure handling:
  - Measurable outcome: Install/runtime/microphone/transcription errors remain actionable and do not break normal typing.

- `AC-015` Reinstall and remove lifecycle:
  - Measurable outcome: `Reinstall` refreshes assets and `Remove` clears assets plus Voice Input settings.

- `AC-016` Platform backend contract:
  - Measurable outcome: macOS Apple Silicon uses the MLX backend and the remaining supported desktop targets use the non-MLX backend behind one app contract.

- `AC-017` Real published-runtime validation:
  - Measurable outcome: Stage 7 proves the dedicated runtime repository published the pinned lightweight runtime assets and the app successfully consumed those real released assets through the managed Voice Input flow.

- `AC-018` No model archives in release assets:
  - Measurable outcome: The published runtime release contains the manifest and platform runtime bundle assets, and does not contain bilingual model archive payloads.

- `AC-019` Local bootstrap proof:
  - Measurable outcome: Stage 7 proves that install-time backend/model preparation happened locally on the test machine rather than by downloading model archives from the runtime release.

## Requirement Coverage Map

- `R-001` -> `UC-001`
- `R-002` -> `UC-002`, `UC-003`
- `R-003` -> `UC-004`, `UC-005`
- `R-003A` -> `UC-001`, `UC-003`, `UC-004`, `UC-005`
- `R-003B` -> `UC-013`
- `R-003C` -> `UC-014`
- `R-004` -> `UC-016`
- `R-004A` -> `UC-016`
- `R-004B` -> `UC-015`
- `R-005` -> `UC-002`, `UC-017`
- `R-005A` -> `UC-002`, `UC-017`
- `R-005B` -> `UC-002`, `UC-017`
- `R-006` -> `UC-006`
- `R-006A` -> `UC-006`
- `R-006B` -> `UC-006`
- `R-007` -> `UC-007`, `UC-008`, `UC-009`
- `R-007A` -> `UC-008`, `UC-009`
- `R-007B` -> `UC-010`
- `R-007C` -> `UC-002`, `UC-006`, `UC-008`, `UC-009`
- `R-008` -> `UC-004`, `UC-007`, `UC-008`, `UC-009`
- `R-008A` -> `UC-010`, `UC-017`
- `R-008B` -> `UC-002`
- `R-009` -> `UC-017`
- `R-010` -> `UC-011`
- `R-011` -> `UC-007`, `UC-008`, `UC-009`
- `R-012` -> `UC-011`
- `R-013` -> `UC-012`
- `R-014` -> `UC-002`, `UC-004`, `UC-010`, `UC-012`
- `R-015` -> `UC-014`, `UC-016`
- `R-016` -> `UC-017`

## Acceptance Criteria Coverage Map (Stage 7)

- `AC-001` -> `S7-001`
- `AC-002` -> `S7-002`
- `AC-003` -> `S7-002`, `S7-003`
- `AC-004` -> `S7-003`, `S7-008`
- `AC-005` -> `S7-002`
- `AC-006` -> `S7-004`
- `AC-007` -> `S7-005`
- `AC-008` -> `S7-006`
- `AC-009` -> `S7-006`
- `AC-010` -> `S7-006`
- `AC-011` -> `S7-007`
- `AC-012` -> `S7-005`, `S7-006`
- `AC-013` -> `S7-007`
- `AC-014` -> `S7-003`, `S7-005`, `S7-006`
- `AC-015` -> `S7-002`, `S7-003`
- `AC-016` -> `S7-008`
- `AC-017` -> `S7-008`
- `AC-018` -> `S7-008`
- `AC-019` -> `S7-008`
