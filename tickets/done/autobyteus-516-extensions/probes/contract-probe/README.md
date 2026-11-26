# Contract probe (autobyteus-516, 2026-11-21)

Throwaway prototype that checks [extension-contract.md](../../extension-contract.md)
works end to end before the Stage 1 design. Not production code.

- `voice-input-extension/`: a Voice Input package written to the contract
  (`extension.json`, `server/index.mjs`, `ui/index.html`), wrapping the existing
  voice runtime 0.3.0.
- `host.mjs`: a mini AutoByteus host (signed catalog, install/update/remove,
  on/off, status, actions, state, log).
- `run-probe.sh` → `run-probe.mjs`: 31 checks. The founder's installed runtime
  and model are only APFS-cloned (`cp -c`) into a temporary folder; nothing
  under `~/.autobyteus` is written (modification times compared before/after).
- `serve-bridge.mjs`: the extension page in a sandboxed iframe with the bridge,
  opened in a browser tab.

Run: `./run-probe.sh` (macOS Apple Silicon with Voice Input installed).

## Result (Measured, 2026-11-21, darwin-arm64)

31/31 passed:

- Signed catalog verifies; tampered catalog, wrong signing key, wrong package
  checksum, package differing from its catalog entry, unsupported contract
  version, unsupported platform: all refused with clear messages.
- `desktop-node` extension not listed on another node.
- Install adopted the existing runtime and model in 12 ms, nothing downloaded.
  The cloned runtime ran from its new location: **the runtime is relocatable**.
- Real transcription through the `transcribe` action: English correct ("Please
  summarize the meeting notes and send them to the team."), first call 30.3 s
  (cold model load from freshly cloned files), next 211 ms; Chinese 235 ms
  ("请把会议记录装语一下…": one word wrong, engine quality); silence → noSpeech.
- Turning off stops the worker; update to 1.0.1 kept data, language setting and
  the on state; `state.json` is exactly `{"voice-input":{"enabled":true}}`;
  remove deletes the folder and state entry, no worker left.

Bridge (browser tab, Chromium): `getLanguage` → `auto`; `setLanguage zh` read
back `zh`; unknown action refused; the page's own `fetch` blocked
(`TypeError`, CSP `connect-src 'none'`); page origin `null`; reading the parent
page blocked (`SecurityError`).

## Findings that change the contract or design

1. The server part's file must be `server/index.mjs`, not `index.js`: a `.js`
   file outside a `package.json` with `"type": "module"` is not reliably an ES
   module.
2. The host must accept bridge messages only from its own frame
   (`event.source === frame.contentWindow`) and reply to that window with
   target `'*'`, because a sandboxed page's origin is `null`.
3. The founder's existing install can be **moved** into the new layout (runtime
   and model into the extension's `data/` folder): no copy, no download; paths
   are derived from the extension's folder, so the old absolute paths in
   `installation.json` are not needed.
4. The first transcription after a fresh move/install can take ~30 s (cold model
   load). Engine behavior, not contract; noted for the voice-engine stage.

## Use-case probe (2026-11-24): `run-usecase-probe.sh`, 12/12

Closes V2, V3, V11, V12 of `use-case-spines.md` (founder's `~/.autobyteus/extensions`
only APFS-cloned; modification times compared before/after: unchanged).

- V3: `move-old-voice-install.mjs` moves today's install by rename into the §7 layout
  (on, English, microphone handed back); first start fetches the small package and
  adopts in 15 ms; dictation works (first call ~30 s).
- V11: the last log lines are readable.
- V12: a corrupt `extension.json` shows that extension as Failed with a message, a
  second extension (`hello-extension`) keeps working, nothing is deleted or rewritten;
  an unreadable `state.json` leaves the list working with everything Off.
- V2: a fresh install with real downloads (runtime from GitHub, model from Hugging
  Face): 75 s, 1.7 GB, then dictation works (first call 29.5 s).

## Warm-up probe (2026-11-26): `run-warmup-probe.mjs`

REQ-012 / contract §4 optional `start`. On a clone of the founder's runtime and model:
- warming with 0.1 s of silence: 392 ms, but the model is **not** loaded (the worker
  answers "no speech" first; 15 MB); the first real dictation still took 30.3 s;
- warming with a 1 s 440 Hz tone: 29.4 s in the background; the first real dictation then
  took **248 ms** (text correct); the warm worker holds **~846 MB**.
So the start step warms with a short non-silent clip, and the worker is unloaded after a
long idle time (30 minutes).
