# Local Electron Test Build — AGY CLI Runtime

> **Superseded for current verification (DR-004, 2026-09-25):** This successful
> `1.4.79` package was built before IR-008 and before integration of current
> `origin/personal@3e5d6add5`. It remains on disk because the user may still be
> testing it, but it does **not** contain the reviewed large-Org launch fix and
> must not be used as acceptance evidence for the current package. A replacement
> build is held until the post-merge AGY E2E collection failure is corrected
> and revalidated. Current base package version is `1.4.80`.

- Date: 2026-09-25. Purpose: user-requested **testable local macOS build**, not user acceptance, a version bump, a release, or deployment.
- Source: ticket branch `codex/antigravity-cli-runtime-redesign-20260924` at production/test HEAD `706012fe4` (latest integrated base `origin/personal@fdbd07124f0eaaa1310379c1ca8e2449f97b0dcf`, 12 ahead / 0 behind after a fresh fetch). Delivery docs and CRR-012 review updates were uncommitted at build time; no production source changed by this build.
- Instructions read: root `README.md` Setup and desktop release/build sections; `autobyteus-web/README.md` Desktop Application Build, integrated backend and packaged Electron E2E sections; `autobyteus-web/AGENTS.md`; `autobyteus-web/package.json` `build:electron:mac` script. Host is macOS arm64, Node 22.23.1, pnpm 10.28.2.
- Command from repo root: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac` → **exit 0**. `personal` was explicit because a ticket branch otherwise falls back to enterprise flavor. Build guards, localization audit, server preparation/build, Nuxt renderer, Electron main/preload transpilation, native dependency rebuild, and electron-builder arm64 DMG/ZIP completed. Log: `/tmp/agy-electron-test-build-20260925.log`.
- Build output remains at `autobyteus-web/electron-dist/` (gitignored), not committed or published. DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.79.dmg` (**457 MiB**, SHA-256 `f6272f29f1844d922c324de11064e393d137b14601ae55b18f43b6fd32d9bd0b`). ZIP: adjacent `AutoByteus_personal_macos-arm64-1.4.79.zip` (**452 MiB**, SHA-256 `57f7e226cdbd5a24171655cdd2f53637568258db1fb79759539e6c89486950d3`). `1.4.79` is the current package version inherited from the base, **not a newly published AGY release**.
- Package checks: `hdiutil verify` reported the DMG checksum **VALID**; packaged app is arm64 and includes built AGY runtime files under `Contents/Resources/server/dist/agent-execution/backends/antigravity/`. The `electron-builder` log explicitly skipped macOS code signing (`identity` null), so this local artifact is **unsigned/unnotarized**. `codesign -dv` showed only an ad-hoc linker signature, no Team ID; do not represent it as a distributable signed build.
- Isolated packaged smoke: `env -u ELECTRON_RUN_AS_NODE pnpm -C autobyteus-web test:e2e:electron --skip-build --adapter direct` → **exit 0**, health-ready on owned loopback port 54999 with an owned temporary data root; the launcher closed its owned process/root. Log: `/tmp/agy-electron-test-smoke-20260925.log`. This proves packaged startup/health, **not** a manual AGY interaction, user verification, Electron AGY end-to-end, or updater/signing behavior.
- Build warnings: `prepare-server` printed transient workspace-bin ENOENT warnings for the application devkit before completing; no build step failed. Nuxt printed its ordinary >500 kB chunk-size warning. No warning is promoted to a release pass. Build-generated untracked shared SDK `dist` was removed after packaging; DMG/ZIP preserved for user testing.

## Manual test guidance

Open the DMG or the adjacent built `mac-arm64/AutoByteus.app` for a normal desktop test. **An ordinary launch uses the normal local AutoByteus data path** (`~/.autobyteus/server-data` per README) and may conflict with an already-running app; quit any existing AutoByteus instance and use disposable test content if that is not intended. This unsigned local build may prompt macOS security warnings. Do not replace a trusted installed release just to test this ticket.

For a separate test profile, the README documents `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, an existing absolute `AUTOBYTEUS_ELECTRON_DATA_ROOT`, and a non-default `AUTOBYTEUS_ELECTRON_SERVER_PORT` passed to the packaged executable. The host's `agy` is at `/Users/normy/.local/bin/agy`; Finder-launched apps may not inherit that PATH. If AGY appears unavailable, start the packaged executable from Terminal with `ANTIGRAVITY_CLI_COMMAND=/Users/normy/.local/bin/agy` (or configure a suitable PATH). Do not infer a backend regression solely from a GUI PATH omission. The packaged direct smoke used isolated state and passed; the user-facing AGY/Electron interaction still awaits the user's test.

One README-compatible manual **isolated** launch from Terminal is:

```bash
APP="/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus"
DATA_ROOT="$HOME/AutoByteus-AGY-Test-Data"
mkdir -p "$DATA_ROOT"
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
env -u ELECTRON_RUN_AS_NODE \
  AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e \
  AUTOBYTEUS_ELECTRON_DATA_ROOT="$DATA_ROOT" \
  AUTOBYTEUS_ELECTRON_SERVER_PORT="$PORT" \
  ANTIGRAVITY_CLI_COMMAND="$HOME/.local/bin/agy" \
  "$APP"
```

Keep this Terminal process open while testing. The explicit data root is separate from normal `~/.autobyteus/server-data` and is retained across manual restarts; the selected free port is only for this launch. The smoke test has already confirmed that the packaged E2E launch profile reaches backend health, but this manual AGY flow has **not** been executed by Delivery Engineer.

The test artifact is inside the ticket worktree and will be retained while user verification is pending. Before eventual safe worktree cleanup, preserve or deliberately retire the artifact according to the user's result; do not silently delete the only handoff copy.
