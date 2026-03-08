# Investigation Notes

## Sources Consulted

### Local Files

- `autobyteus-web/pages/settings.vue`
- `autobyteus-web/pages/__tests__/settings.spec.ts`
- `autobyteus-web/components/settings/AboutSettingsManager.vue`
- `autobyteus-web/components/settings/__tests__/AboutSettingsManager.spec.ts`
- `autobyteus-web/components/agentInput/AgentUserInputForm.vue`
- `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/stores/activeContextStore.ts`
- `autobyteus-web/stores/appUpdateStore.ts`
- `autobyteus-web/stores/__tests__/appUpdateStore.spec.ts`
- `autobyteus-web/tests/integration/workspace-history-draft-send.integration.test.ts`
- `autobyteus-web/electron/preload.ts`
- `autobyteus-web/types/electron.d.ts`
- `autobyteus-web/electron/main.ts`
- `autobyteus-web/electron/updater/appUpdater.ts`
- `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts`
- `autobyteus-web/electron/server/services/AppDataService.ts`
- `autobyteus-web/electron/server/__tests__/BaseServerManager.spec.ts`
- `autobyteus-web/components/AudioRecorder.vue`
- `autobyteus-web/stores/audioStore.ts`
- `autobyteus-web/stores/transcriptionStore.ts`
- `autobyteus-web/workers/audio-processor.worklet.js`
- `autobyteus-web/tests/stores/audioStore.test.ts`
- `autobyteus-web/tickets/multi_node_window_v1_ticket/MULTI_NODE_WINDOW_V1_PROGRESS.md`

### Official External Sources

- `https://github.com/ggml-org/whisper.cpp`
- `https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/README.md`
- `https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/CMakeLists.txt`
- `https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/examples/cli/CMakeLists.txt`
- `https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/examples/cli/README.md`
- `https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/.github/workflows/build.yml`
- `https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest`
- `https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/models/README.md`
- `https://huggingface.co/ggerganov/whisper.cpp`
- `https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/latest`
- `https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/README.md`

## Current-System Findings

1. Settings navigation already has a stable pattern for new managed surfaces.
   - `pages/settings.vue` owns the section navigation and content switch.
   - `Updates` is implemented as a dedicated manager component (`AboutSettingsManager.vue`) rather than inline settings logic.
   - This is the right pattern to copy for `Extensions`.

2. The shared composer has one canonical insertion point for voice input.
   - `AgentUserInputTextArea.vue` owns the textarea and send/stop action.
   - `AgentUserInputForm.vue` wraps the shared composer shell.
   - `TeamWorkspaceView.vue` reuses the same composer for focused team messaging.
   - Implication: one microphone integration can cover both agent and team flows.

3. Draft text mutation is already centralized.
   - `activeContextStore.updateRequirement(text)` is the correct insertion path for transcription results.
   - `activeContextStore.send()` already handles agent and team send behavior.
   - Implication: voice input should append text into the draft and preserve manual send, not introduce a new send path.

4. Existing audio/transcription code is not the right architectural base.
   - `AudioRecorder.vue`, `audioStore.ts`, and `transcriptionStore.ts` are present but not integrated into the shared composer flow.
   - The old implementation streams audio chunks to a websocket endpoint keyed by workspace/step identifiers.
   - `MULTI_NODE_WINDOW_V1_PROGRESS.md` explicitly marks the transcription stack as out of scope due to backend support gap.
   - Implication: reviving that path would add unnecessary backend and streaming complexity.

5. The Electron boundary is already suitable for a managed extension runtime.
   - `electron/preload.ts` exposes typed IPC-backed methods to the renderer.
   - `types/electron.d.ts` documents the renderer bridge shape.
   - `electron/main.ts` already owns app-level concerns such as updater commands, file access, and server lifecycle.
   - `appUpdater.ts` shows a good design pattern: one main-process service + preload bridge + renderer store + settings manager.
   - Implication: voice input extension management should mirror the updater architecture.

6. App data management exists, but only for bundled server data.
   - `AppDataService.ts` currently manages `server-data` under the AutoByteus app-data root.
   - There is no existing general-purpose `extensions/` directory owner.
   - Implication: we need a separate extension-data service or an app-path helper in Electron for `~/.autobyteus/.../extensions`.

7. There is no existing extension system.
   - No store, settings manager, or Electron service currently represents managed optional capabilities.
   - Implication: `Voice Input` should be implemented as the first managed extension, with a minimal but reusable extension manifest/state model.

8. Process execution is feasible in Electron.
   - The Electron side already uses child-process spawning patterns for server lifecycle.
   - Main-process testing already mocks IPC and Electron services cleanly.
   - Implication: invoking a downloaded CLI runtime is a natural fit.

9. Recording can likely be simplified for this use case.
   - Existing audio worklet code builds chunked WAV payloads for streaming transcription.
   - Composer dictation only needs one short recording -> one transcription request -> one returned text payload.
   - Implication: a simpler recorder path may be sufficient, but the existing mic permission/test patterns are still useful references.

10. Automated validation support exists, but true browser/Electron end-to-end harness is not already established for this exact flow.
   - The repo has strong component tests, store tests, integration tests, and Electron-main unit tests.
   - Some prior tickets treat Stage 7 as targeted frontend acceptance tests when no dedicated browser E2E harness exists.
   - The user explicitly requires a working end-to-end-style validation before handoff.
   - Implication: the design must reserve a real Stage 7 proof path. At minimum, this likely means:
     - Electron-main automated test for install/discovery/invocation service behavior.
     - Renderer integration test for extension status -> composer availability -> transcript insertion.
   - If feasible in this environment, add a stronger app-level automated scenario that exercises the app-owned flow through the shared composer using a fake installed runtime.

## Runtime Distribution Investigation

1. `whisper.cpp` remains the cleanest runtime base, but upstream does not provide the exact downloadable contract this feature needs.
   - Official quick-start documentation shows the expected path is source build via `cmake -B build` and `cmake --build build`, then invoke `./build/bin/whisper-cli`.
   - Official CLI build metadata defines `whisper-cli` as an installable runtime target.
   - Official release assets currently include Windows binary zips, an Apple xcframework archive, and a Java package, but not one clean cross-platform CLI package set for Electron install-on-demand.
   - Conclusion: upstream `whisper.cpp` is a good source dependency, but not a sufficient product distribution channel for AutoByteus.

2. `whisper.cpp` is still preferable to the heavier alternatives for this use case.
   - The official project is plain C/C++ with a small CLI-focused execution model.
   - Model files are available directly from the official Hugging Face repository used by the project.
   - Current official tiny English model sizes are favorable for on-demand install:
     - `ggml-tiny.en-q5_1.bin`: `32,166,155` bytes
     - `ggml-tiny.en-q8_0.bin`: `43,550,795` bytes
     - `ggml-tiny.en.bin`: `77,704,715` bytes
   - This aligns with the product goal of keeping the base installer unchanged and shifting cost to opt-in users only.

3. `sherpa-onnx` has a stronger official prebuilt-release story, but it is not the best fit here.
   - Official latest releases publish a large matrix of platform packages, including:
     - `linux-x64-shared-no-tts`: about `23 MiB`
     - `osx-universal2-shared-no-tts`: about `60 MiB`
     - `win-x64-shared-MT-Release-no-tts`: about `18 MiB`
   - However, the asset matrix and model/runtime surface area are much broader than needed for a simple dictation extension.
   - Conclusion: `sherpa-onnx` is a viable fallback if we want to consume upstream prebuilt packages directly, but it increases runtime-selection and maintenance complexity compared with owning a small `whisper.cpp` distribution contract.

4. The best shippable answer is to own the runtime package feed ourselves.
   - AutoByteus should publish platform-specific runtime archives built from pinned `whisper.cpp` source in a dedicated release workflow or separate repository.
   - The Electron app should download from an AutoByteus-managed manifest, not from hard-coded upstream asset URLs.
   - This keeps the app contract stable even if upstream release assets change shape.
   - It also lets us normalize package layout across platforms and add checksums/signatures under our own control.

5. The runtime payload should be intentionally minimal.
   - Preferred packaging shape:
     - runtime archive containing one entrypoint binary plus any companion libraries only if a fully static build is not viable on that platform
     - model file downloaded separately
     - app-owned manifest with version/checksum/platform metadata
   - `whisper.cpp` exposes `BUILD_SHARED_LIBS`, which means our build pipeline can explicitly choose static packaging where supported to reduce multi-file runtime sprawl.
   - The renderer can avoid ffmpeg by recording or converting to WAV before invoking `whisper-cli`, keeping the runtime payload smaller and simpler.

6. Separate repository support is acceptable and useful for this product.
   - The user explicitly accepts a separate backend/release repository if that is the right engineering answer.
   - That makes a dedicated `voice-runtime` or `extensions-runtime` release pipeline viable without forcing the main app repository to become the artifact publisher.

7. Local environment note.
   - A local validation attempt to compile `whisper.cpp` in this workspace was blocked because `cmake` is not installed in the current environment.
   - This does not block design selection, because the upstream build instructions and CI workflow already confirm the intended build path and supported target platforms.

## Monorepo Runtime-Project Investigation

1. A top-level sibling project is the right structure inside this repository.
   - The root workspace currently enumerates only the four existing application packages in `pnpm-workspace.yaml`.
   - The voice runtime packaging concern does not naturally belong inside `autobyteus-web`, because it is cross-platform native build/release infrastructure rather than frontend or Electron app source.
   - Recommended project location:
     - `autobyteus-voice-runtime/`

2. The runtime project should be repo-local but operationally separate from the pnpm workspace unless a strong reason appears later.
   - Current root scripts and workspace management are Node/pnpm-oriented.
   - The runtime packaging path is fundamentally CMake + shell/CI driven.
   - Conclusion: treat `autobyteus-voice-runtime/` as a top-level project in the same monorepo, but do not add it to the pnpm workspace by default unless helper tooling later requires that.

3. The repository already has a proven cross-platform release pattern we can mirror.
   - `.github/workflows/release-desktop.yml` already fans out by platform:
     - `macos-14`
     - `ubuntu-22.04`
     - `windows-2022`
   - It already uses:
     - `workflow_dispatch`
     - per-platform build jobs
     - `actions/upload-artifact`
     - `actions/download-artifact`
     - `softprops/action-gh-release`
   - Conclusion: the voice runtime should reuse this workflow shape rather than inventing a new release mechanism.

4. The voice runtime should not share the desktop app workflow or tag namespace.
   - The current desktop release workflow is tightly coupled to:
     - `autobyteus-web/package.json`
     - app tag pattern `v*`
     - Electron packaging outputs
   - Reusing that workflow for voice runtime artifacts would couple unrelated versioning and create confusion around release ownership.
   - Recommended release mechanism:
     - dedicated workflow, for example `.github/workflows/release-voice-runtime.yml`
     - dedicated tag prefix, for example `voice-runtime-v*`

5. The runtime release should publish an AutoByteus-owned contract, not raw upstream outputs.
   - Each release should publish:
     - platform-specific runtime archives
     - the selected model asset
     - a generated manifest JSON with artifact URLs, checksums, versions, entrypoints, and platform mapping
   - This allows the app to download everything from the AutoByteus-controlled release rather than depending on `whisper.cpp` or Hugging Face URL stability at install time.

6. The runtime build should target a minimal CLI package.
   - Recommended build direction from official `whisper.cpp` options:
     - `BUILD_SHARED_LIBS=OFF` when viable for the platform
     - `WHISPER_BUILD_TESTS=OFF`
     - `WHISPER_BUILD_SERVER=OFF`
     - `WHISPER_SDL2=OFF`
     - `WHISPER_CURL=OFF`
     - `WHISPER_FFMPEG=OFF` on Linux
   - Keep `WHISPER_BUILD_EXAMPLES=ON` because `whisper-cli` is the required runtime entrypoint.
   - Preferred app contract:
     - one archive per platform/arch
     - one entrypoint binary (`whisper-cli` or `whisper-cli.exe`)
     - companion libs only if a static build is not achievable on that target

7. The app-consumption path should avoid ambiguous “latest release” discovery.
   - Because the main repository already publishes desktop app releases, relying on a global “latest release” lookup would be brittle.
   - Initial recommendation:
     - the app pins the voice runtime version/tag in code or in a bundled extension catalog
     - install uses the runtime manifest associated with that pinned release
   - This keeps install behavior deterministic and lets runtime upgrades happen on app-defined cadence.

## Canonical File / Ownership Observations

- `pages/settings.vue`
  - Correct owner for settings navigation section registration.
- `components/settings/*.vue`
  - Correct owner for a new `ExtensionsManager.vue` and a focused `VoiceInputExtensionCard.vue` if needed.
- `stores/*.ts`
  - Correct owner for renderer-visible extension state, likely `extensionStore` or `voiceInputExtensionStore`.
- `electron/*`
  - Correct owner for extension install/download/process services and IPC handlers.
- `components/agentInput/*.vue`
  - Correct owner for mic-button UI and draft insertion feedback state.
- Existing `AudioRecorder.vue`
  - Misaligned for this feature as-is because it is a standalone recorder UI rather than shared-composer infrastructure.

## Unknowns / Risks

1. Exact hosting location for AutoByteus-owned runtime archives and whether that lives in the main repo releases or a separate runtime repo.
2. Whether the first runtime package should be fully static on every platform or allow a small normalized archive with companion libraries.
3. Whether the app should pin runtime versions purely in code or via a bundled per-extension catalog file.
4. Whether a true browser/Electron E2E harness can be introduced quickly enough for this ticket versus a stronger integration-level automated scenario.
5. Whether the initial implementation should support uninstall cleanup of downloaded temp audio as part of the extension lifecycle.
6. Whether renderer-side recording should use `MediaRecorder` plus WAV conversion or direct PCM/WAV capture.

## Triage Decision

- Scope classification: `Medium`
- Rationale:
  - New managed feature surface in settings.
  - New Electron service and preload contract.
  - New shared-composer interaction.
  - New app-owned runtime distribution contract and multiple test layers, including a mandatory Stage 7 proof path for the installed-runtime flow.
