# Investigation Notes

## Stage

- Understanding Pass: `Completed`
- Last Updated: `2026-03-09 (reopened for local-bootstrap redesign)`

## Sources Consulted

### Current Desktop App Branch

- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/main.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/logger.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensionIpcHandlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/types.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/extensionCatalog.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/managedExtensionService.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeService.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/server/baseServerManager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/server/services/AppDataService.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/preload.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/types/electron.d.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/stores/extensionsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/stores/voiceInputStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/settings/ExtensionsManager.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/settings/VoiceInputExtensionCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/settings/__tests__/VoiceInputExtensionCard.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/stores/__tests__/extensionsStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/stores/__tests__/voiceInputStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/tests/integration/voice-input-extension.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/__tests__/managedExtensionService.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/__tests__/extensionCatalog.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/tickets/in-progress/voice-input-extension/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/tickets/in-progress/voice-input-extension/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/tickets/in-progress/voice-input-extension/api-e2e-testing.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/tickets/in-progress/voice-input-extension/investigation-notes.md`

### Runtime Repository

- `/Users/normy/autobyteus_org/autobyteus-voice-runtime/README.md`
- `/Users/normy/autobyteus_org/autobyteus-voice-runtime/metadata/runtime-assets.json`
- `gh repo view AutoByteus/autobyteus-voice-runtime --json name,defaultBranchRef,url`
- `gh release view v0.1.1 --repo AutoByteus/autobyteus-voice-runtime --json tagName,name,assets,url`

### Reference Implementation

- `/Users/normy/autobyteus_org/phone-av-bridge/voice-codex-bridge/cli.py`
- `/Users/normy/autobyteus_org/phone-av-bridge/voice-codex-bridge/audio_capture.py`
- `/Users/normy/autobyteus_org/phone-av-bridge/voice-codex-bridge/voice-codex`

## Current-System Findings

1. The current branch already ships a full v1 extension flow.
- `Settings -> Extensions` exists and renders a `VoiceInputExtensionCard`.
- Electron already owns a managed extension registry, runtime manifest download, checksum verification, install/remove/reinstall, and IPC-backed transcription.
- The desktop app already points at a dedicated runtime repository, `AutoByteus/autobyteus-voice-runtime`, with a pinned release lane.
- Implication: this ticket is not starting from zero; it is an evolution of an existing English-first v1 implementation.

2. Install currently doubles as enable.
- `ManagedExtensionStatus` only models `not-installed | installing | installed | error`.
- `VoiceInputExtensionCard.vue` exposes `Install`, `Remove`, and `Reinstall`, but no `Enable` or `Disable`.
- `voiceInputStore.isAvailable` is true whenever `extensionsStore.voiceInput?.status === 'installed'`.
- Implication: the current product model does not support `Installed but Disabled`; install immediately makes voice input available.

3. The current transcription contract is too narrow for a mature bilingual feature.
- Renderer bridge shape is `transcribeVoiceInput(audioData, language?) -> { ok, text, error }`.
- `voiceInputStore.stopRecording()` hardcodes `'en'` when invoking Electron.
- There is no persisted language preference, no `auto/en/zh` mode, no structured metadata, and no room for confidence/no-speech reporting.
- Implication: both UX and runtime policy are structurally English-first right now.

4. The current runtime path is a one-shot `whisper.cpp` CLI invocation.
- `VoiceInputRuntimeService.transcribe()` writes a temp WAV file and spawns the installed runtime binary for each request.
- Current invocation arguments are `-m <model> -f <wav> -l <language> -nt -np`.
- There is no long-lived worker/daemon, no JSON protocol, and no warm-model reuse.
- Implication: the current architecture is simple and already shippable, but it is not the mature bilingual local-worker shape discussed with the user.

5. The shipped runtime is structurally English-only.
- `autobyteus-voice-runtime/metadata/runtime-assets.json` still pins model `ggml-tiny.en-q5_1.bin`.
- `autobyteus-web/electron/extensions/extensionCatalog.ts` pins runtime `v0.1.1`, which corresponds to the English-only `whisper.cpp` release.
- `voiceInputStore.stopRecording()` passes `'en'` unconditionally.
- Implication: Chinese cannot be added only by UI changes; runtime packaging, model policy, and Electron request contract must all change.

6. The current runtime lacks the silence/no-speech controls that would prevent `"you"`-style hallucinations.
- The `whisper.cpp` one-shot call does not apply VAD or any explicit no-speech filtering.
- The result contract only returns plain text and cannot report confidence or no-speech probability.
- Implication: even English behavior is weak on silence/noise, not just on Chinese.

7. The extension storage-root bug is still present in this branch.
- `main.ts` constructs `ManagedExtensionService` with `app.getPath('userData')`.
- `ManagedExtensionService` stores under `<userData>/extensions/...`.
- Server runtime data still uses `~/.autobyteus/server-data` through `BaseServerManager` and `AppDataService`.
- `logger.ts` also writes under `~/.autobyteus/logs`.
- Implication: Voice Input currently stores in Electron `userData` on macOS (`~/Library/Application Support/autobyteus/extensions`) instead of in the canonical `~/.autobyteus/extensions` sibling path next to `server-data`.

8. The earlier v1 ticket is useful evidence but no longer matches the desired architecture.
- The existing in-repo `voice-input-extension` ticket intentionally chose:
  - `whisper.cpp`,
  - an English-first model,
  - no always-on local speech server,
  - no separate enable/disable state.
- It also already proved real release publication and app-side consumption against `AutoByteus/autobyteus-voice-runtime` `v0.1.1`.
- Implication: release-lane infrastructure is reusable, but requirements/design must be rewritten for bilingual support and the new product lifecycle.

9. The runtime repository already exists and is operational, but it is still v1-only.
- Local repo exists at `/Users/normy/autobyteus_org/autobyteus-voice-runtime` on branch `main`.
- GitHub repo exists at `https://github.com/AutoByteus/autobyteus-voice-runtime`.
- Release `v0.1.1` exists and publishes:
  - `voice-input-runtime-manifest.json`
  - `ggml-tiny.en-q5_1.bin`
  - `whisper-cli-darwin-arm64`
  - `whisper-cli-darwin-x64`
  - `whisper-cli-linux-x64`
  - `whisper-cli-win32-x64.exe`
- Implication: we can iterate from a working release lane instead of inventing publication from scratch.

10. `phone-av-bridge` shows the missing bilingual policy pieces.
- Chinese support there comes from `faster-whisper`, not from a special Chinese-only engine.
- It normalizes `zh-cn`, `zh-hans`, and related variants to `zh`.
- It refuses to stay on `.en` models for Chinese and switches to multilingual `small`.
- It enables `vad_filter=True`.
- Implication: the reusable value is the STT policy and multilingual runtime behavior, not the exact current desktop implementation.

11. The checked-in `phone-av-bridge` does not prove a native Windows capture backend.
- `audio_capture.py` only implements Linux PulseAudio and macOS avfoundation backends.
- If Windows support previously existed in practice, it was not in the checked-in `voice-codex-bridge` code inspected for this ticket.
- Implication: the desktop app cannot assume a ready-made Windows recording backend from that reference project; only the STT ideas are directly reusable.

12. Current test coverage is good for API/service flow, but the mature feature will need broader acceptance closure.
- Existing tests already cover extension lifecycle, runtime download, draft insertion, and fixture-backed integration.
- Older Stage 7 proof also included real published-release validation through GitHub Releases and an app-side Node proof against the published manifest.
- However, the current tests do not cover:
  - explicit enable/disable lifecycle,
  - language selection persistence,
  - bilingual runtime behavior for `auto/en/zh`,
  - the corrected `.autobyteus/extensions` storage root.
- Implication: Stage 7 can build on the existing API/E2E pattern, but it must expand to cover the new product and runtime contract.

13. The current v2 implementation made GitHub Releases too heavy because it published model archives as first-class release assets.
- `metadata/runtime-assets.json` in the runtime repository currently declares a model payload under every platform asset.
- `voiceInputRuntimeService.installRuntime()` downloads both the runtime archive and the model archive from the release manifest before writing `installation.json`.
- Implication: the release lane now carries large bilingual model payloads, which matches the previous implementation but conflicts with the user’s clarified product expectation.

14. The runtime launcher already bootstraps Python dependencies locally, which means the design can shift model/bootstrap work to the user machine without abandoning the managed-extension architecture.
- `runtime/voice-input-worker.sh` and `runtime/voice-input-worker.cmd` already create `.venv` locally and install the backend requirements on first use.
- The missing piece is an explicit local bootstrap step for the bilingual model and any backend cache preparation, preferably during `Install` rather than by embedding model archives in the GitHub release.
- Implication: the app does not need to become a cloud/service client to meet the new requirement; it can keep the runtime repo for small worker bundles while letting the installed runtime fetch the platform model directly from the authoritative source.

## Entry Points And Ownership

- Settings lifecycle UI owner:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/settings/ExtensionsManager.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/settings/VoiceInputExtensionCard.vue`
- Renderer extension state owner:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/stores/extensionsStore.ts`
- Renderer voice interaction owner:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/stores/voiceInputStore.ts`
- Shared composer integration owner:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- Electron lifecycle and runtime boundary:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/preload.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensionIpcHandlers.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/managedExtensionService.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeService.ts`
- Canonical app data owner for server/runtime sibling layout:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/server/baseServerManager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron/server/services/AppDataService.ts`
- Runtime release and packaging owner:
  - `/Users/normy/autobyteus_org/autobyteus-voice-runtime`

## Design-Relevant Gaps To Close

1. Product lifecycle gap
- Add `Enable` and `Disable` without keeping install and active-use coupled.

2. Storage-root gap
- Move extension storage to `~/.autobyteus/extensions` and keep it as a sibling of `server-data`.

3. Runtime-engine gap
- Replace the English-only `whisper.cpp` packaging/runtime strategy with a bilingual strategy that can support `auto/en/zh` and suppress silence hallucinations.

4. Platform-backend gap
- Finalize the platform policy the user requested:
  - macOS Apple Silicon prefers MLX,
  - Linux uses a non-MLX local backend,
  - Windows uses a non-MLX local backend.

5. Runtime-contract gap
- Replace raw text stdout with a structured request/response contract that can carry language mode and runtime metadata.

6. Settings gap
- Add user-facing language selection with `Auto`, `English`, and `Chinese`.

7. Test/validation gap
- Extend API/E2E coverage to lifecycle separation, bilingual behavior, and real release-based validation for the new runtime bundles.

8. Release payload ownership gap
- Move model acquisition out of GitHub Release assets and into local install-time bootstrap.
- Keep the release manifest pinned, but limit it to runtime bundle coordinates plus authoritative upstream model metadata.

9. Install-time bootstrap gap
- Decide whether `Install` itself performs backend/model bootstrap or whether the first `Enable` does.
- The user explicitly prefers install-time local setup, so the design should make `Install` perform the local bootstrap and leave `Enable` as a lightweight state change.

## Open Technical Questions

1. Whether the mature runtime should be a long-lived local worker/daemon or a standardized one-shot executable contract for v2.
- Prior discussion favored a local managed worker for maturity and reuse, but the existing shipped code and runtime repo are built around one-shot binaries.
- This must be resolved explicitly in requirements/design before implementation.

2. What the common cross-platform runtime protocol should be.
- Need one Electron contract above MLX on macOS and non-MLX backends on Linux/Windows.
- Need to decide JSON schema, lifecycle, and error/metadata fields.

3. How model policy should be packaged.
- Options include:
  - one multilingual default model for `auto/en/zh`,
  - one multilingual model plus optional English-fast profile,
  - per-platform backend-specific model bundles.

4. How far Stage 7 should go on accuracy proof.
- Release publication and executable runtime consumption are mandatory.
- Need to define whether acceptance only requires bilingual functional proof with representative fixtures, or also stricter quality thresholds.

5. Which layer should own local model download and verification.
- The current runtime bundle is the natural owner because it already owns Python dependency bootstrap and backend-specific knowledge.
- That should keep Electron limited to orchestrating install/enable state rather than learning MLX versus `faster-whisper` model download details.

## Triage Decision

- Scope classification: `Large`
- Rationale:
  - Product lifecycle changes span settings UI, renderer stores, preload/main IPC, Electron extension registry, and runtime request contracts.
  - The bug fix includes a storage-root correction that crosses Electron app startup and app-data ownership boundaries.
  - The runtime itself must evolve across a separate repository and published release lane.
  - The feature adds bilingual support, explicit language policy, and platform-specific backend strategy.
  - Stage 7 requires real published-release validation, not fixture-only proof.
