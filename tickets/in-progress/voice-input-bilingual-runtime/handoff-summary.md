# Handoff Summary

## Status

- Current Status: `Ready For User Handoff`
- Last Updated: `2026-03-09`

## Delivered

- Canonical extension storage now uses `~/.autobyteus/extensions/voice-input` as a sibling of `server-data`.
- Voice Input lifecycle is separated into install, enable, disable, reinstall, remove, and open-folder actions.
- Voice Input now defaults to `Auto` and supports `English` and `Chinese`.
- The desktop runtime contract is now a local managed worker with structured results, not the old English-only one-shot path.
- Runtime release `v0.3.0` was published to [`AutoByteus/autobyteus-voice-runtime`](https://github.com/AutoByteus/autobyteus-voice-runtime/releases/tag/v0.3.0).
- GitHub Release assets are now lightweight:
  - four platform runtime bundles
  - one runtime manifest
  - no model archives
- `Install` now downloads the runtime bundle and performs local bilingual backend/model bootstrap on the user machine instead of downloading model archives from GitHub Releases.
- The real-release smoke test passed against the live release with:
  - install from GitHub Releases
  - local model/bootstrap preparation during install
  - enable
  - English dictation
  - Chinese dictation
  - silence suppression

## Verification

- App-side targeted compile and Electron tests passed.
- Runtime repo packaging and worker tests passed.
- Real release digests were checked against local dist outputs.
- `pnpm -C autobyteus-web test:voice-input-real-release` passed in `101.40s`.

## Residual Risks

- First install remains relatively heavy on fresh machines because the runtime now bootstraps Python dependencies and downloads the bilingual model locally during `Install`.
- Large future model upgrades may require streamed downloads instead of buffering full assets in memory during install.

## Ticket State

- Technical workflow status: complete through Stage 10 handoff.
- Ticket archive state: remain under `tickets/in-progress/voice-input-bilingual-runtime/` until the user explicitly confirms completion.
