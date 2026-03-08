# AutoByteus Voice Runtime

This project packages the downloadable `Voice Input` runtime used by the desktop app.

## Responsibilities

- pin the upstream `whisper.cpp` source revision
- build platform-specific `whisper-cli` binaries
- fetch the selected model asset for release
- generate the runtime manifest consumed by `autobyteus-web`
- publish versioned runtime assets under the dedicated `voice-runtime-v*` release lane

## Intended Output

Each runtime release should publish:

- one binary/runtime asset per supported platform and architecture
- one model asset for the selected v1 model
- one `voice-input-runtime-manifest.json` file with checksums, URLs, and entrypoints

## Suggested Directory Shape

```text
autobyteus-voice-runtime/
  scripts/
  dist/
  metadata/
```

## Local Scripts

- `scripts/build-runtime.sh <platform> <arch>`
  - downloads the pinned `whisper.cpp` source tarball
  - builds a static `whisper-cli`
  - writes the normalized runtime binary into `dist/`
- `scripts/download-model.mjs`
  - downloads the configured model asset into `dist/`
- `scripts/generate-manifest.mjs`
  - computes SHA-256 checksums
  - emits the final manifest with GitHub release asset URLs

## Current Status

This project now owns the app-facing runtime release contract. The next hardening steps are automated validation and end-to-end proof that the desktop app can install, discover, and invoke the published runtime artifacts.
