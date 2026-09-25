# Local Electron Test Build — AGY CLI Runtime

> **Current DR-007 direct-worktree rebuild (SR-024 / IR-009):** At the user's
> request, all prior generated Electron outputs in this ticket worktree were
> removed while the official app continued running from `/Applications`.
> The package was rebuilt into the normal worktree `electron-dist/` path below.
> DR-003/005/006 artifact paths are historical and no longer exist after this
> authorized build-output cleanup. Source/ticket files and the worktree/branch
> were not cleaned. Explicit user verification remains pending.

## DR-007 current direct-worktree artifact

- Before cleanup, `ps` showed the official app and embedded server running
  from `/Applications/AutoByteus.app` (PIDs 20727/21341); no process used the
  ticket worktree's packaged app. `git fetch origin personal` still returned
  `af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`, already merged locally
  as `15149d03e3265bb4d8473f6a84f1447c4332d27c`. No new base merge or
  source change occurred since DR-006.
- Cleanup scope: removed only known **generated/untracked** directories
  `autobyteus-web/electron-dist/` (including old 1.4.79/1.4.80 DMGs, ZIPs,
  archive copies, blockmaps and unpacked app),
  `autobyteus-web/resources/server/`, and the two application SDK generated
  `dist/` directories. Each was an exact worktree-contained non-symlink build
  target; tracked source, ticket evidence/docs, the user's normal data and
  `/Applications` app were not touched. Build regenerated the needed resources
  and current output. This is artifact cleanup, **not** final ticket-worktree
  or branch cleanup.
- README command, run from ticket worktree root:
  `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac`
  → **exit 0**, `/tmp/agy-electron-test-build-dr007-direct.log`. Personal
  flavor, macOS arm64, inherited package version **1.4.80**; signing skipped,
  ad hoc/no Team ID, not notarized or published.
- **Current DMG full path, directly under the worktree output:**
  `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.80.dmg`
  — **457 MiB**, SHA-256
  `18ac473f2414400d5fcecd85fc828310a50b84aa6ae60dff01427dc789f54928`.
  `hdiutil verify` reported checksum **VALID**,
  `/tmp/agy-electron-test-dmg-verify-dr007-direct.log`.
- ZIP alternative, directly beside it:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.80.zip`
  — **452 MiB**, SHA-256
  `3782c834d4222b086532269536680979936809ce4892e398ee161f17b88d160d`.
  No extra dated handoff folder or stale prior DMG remains in `electron-dist`.
- The rebuilt packaged AGY materializer was directly invoked on the read-only
  actual Team-local Solution Designer skill in disposable directories:
  `design-examples.md` and `design-principles.md` became ordinary capsule
  files with exact source SHA-256 and the disposable selected workspace stayed
  empty (`/tmp/agy-electron-packaged-skill-dr007-direct.log`). This checks
  the packaged boundary that failed in the user's previous app; it is not
  a complete Electron Org conversation.
- Isolated packaged launcher checks on the rebuilt unpacked app both passed:
  `env -u ELECTRON_RUN_AS_NODE pnpm -C autobyteus-web test:e2e:electron --skip-build --adapter direct`
  reached health on owned port 50970, and the same command with
  `--adapter playwright` reached health on owned port 51029. Logs:
  `/tmp/agy-electron-test-smoke-dr007-direct.log` and
  `/tmp/agy-electron-test-playwright-dr007-direct.log`. The launcher cleaned
  its owned temporary roots; it did not touch the official running app. These
  are startup/health smokes, not user acceptance or an AGY Org turn.

## DR-006 historical replacement (removed in DR-007 cleanup)

> **Historical DR-006 replacement (SR-024 / IR-009):** The prior DR-005
> `1.4.80` DMG is stale for the user's actual Solution Designer first-prompt
> failure. A fresh unsigned personal macOS arm64 package was built from
> `fe4c0d556` source/review-report HEAD on unchanged integrated
> `origin/personal@af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`.
> The unique `sr024-dr006-20260925/` path below was the handoff path at that
> round; it was removed by DR-007 cleanup and must not be used now. The
> package version was inherited `1.4.80`; this was a local test artifact,
> not a signed/notarized release or user acceptance.

## DR-006 historical replacement artifact (files removed in DR-007)

- README/build basis: Root `README.md`, `autobyteus-web/README.md` desktop
  build and packaged E2E sections, package scripts and web `AGENTS.md`.
  `git fetch origin personal` found no newer base beyond `af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`, already merged as
  `15149d03e3265bb4d8473f6a84f1447c4332d27c`; no base integration was
  required. API-REV-009 Pass/96% and CRR-018 Pass cover IR-009 source and the
  actual-member browser/process test. Delivery reran five affected AGY,
  shared, Codex and Claude skill/capsule unit suites **40/40**
  (`/tmp/agy-delivery-r6-skill-regression.log`).
- Build command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac`
  → **exit 0** (`/tmp/agy-electron-test-build-dr006.log`). The explicit
  personal flavor avoids the ticket-branch enterprise fallback. The build
  prepared the current server and renderer, compiled Electron main/preload,
  and produced arm64 DMG/ZIP. Signing was skipped (`identity` null);
  `codesign` reports `Signature=adhoc`, `TeamIdentifier=not set`.
- **Then-new DMG full path (removed by DR-007):**
  `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/sr024-dr006-20260925/AutoByteus_personal_macos-arm64-1.4.80.dmg`
  — **457 MiB**, SHA-256
  `5de1c5232ff22eb9d3b72abca9a39252b8fa7c09b18b2c81d36c0569536debb5`.
  `hdiutil verify` on the source DMG reported checksum **VALID**
  (`/tmp/agy-electron-test-dmg-verify-dr006.log`); the unique handoff copy
  has the identical SHA-256.
- ZIP alternative:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/sr024-dr006-20260925/AutoByteus_personal_macos-arm64-1.4.80.zip`
  — **452 MiB**, SHA-256
  `8041ad6b8f39225d0992f274e9ead0bba8657f23010fd12bbc7d5a119062396e`.
- Package-specific correction check: the bundled AGY configured-skill
  materializer contains the IR-009 checked snapshot implementation. A
  disposable direct invocation of that **packaged JS module** with the
  read-only actual Team-local Solution Designer skill copied both
  `design-examples.md` and `design-principles.md` as ordinary non-symlink
  capsule files with exact source SHA-256, leaving the disposable selected
  workspace empty (`/tmp/agy-electron-packaged-skill-dr006.log`). This
  directly reverses the earlier same-module `AGY_SKILL_SOURCE_SYMLINK`
  reproduction. It is not a full user Org turn in packaged Electron.
- Isolated packaged startup/health: `env -u ELECTRON_RUN_AS_NODE pnpm -C autobyteus-web test:e2e:electron --skip-build --adapter direct`
  **exit 0**, owned port 60166 and temporary data root
  (`/tmp/agy-electron-test-smoke-dr006.log`); the same command with
  `--adapter playwright` **exit 0**, owned port 60208/root
  (`/tmp/agy-electron-test-playwright-dr006.log`). Both launched the current
  packaged app and cleaned up owned state. These prove startup/health, not a
  manual AGY conversation or user acceptance.
- Preservation: the **previous DR-005 DMG/ZIP** were copied before rebuilding
  into `autobyteus-web/electron-dist/superseded-dr005-20260925/` and retain
  their historical SHA-256 (`087703b...` / `0fcc997...`). The build reused
  the default same-version output names; the `sr024-dr006-20260925/` copies
  with the new SHA-256 are the unambiguous handoff artifacts. Both sets are
  gitignored local files, not published. Do not use the old package to judge
  SR-024 or silently delete either while user verification is pending.
- The manual isolated Terminal-launch guidance below still applies to the
  current unpacked app under `electron-dist/mac-arm64/`; it is now the new
  DR-006 build. An ordinary launch uses normal AutoByteus data, so use
  disposable content if needed. Finder may not inherit `agy` from the shell;
  the Terminal example supplies `ANTIGRAVITY_CLI_COMMAND` explicitly.

## DR-005 historical replacement (superseded for SR-024)

> **Historical DR-005 replacement test package (2026-09-25):** Built from the
> latest integrated `origin/personal@af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`
> branch merge `15149d03e3265bb4d8473f6a84f1447c4332d27c`, after the
> real AGY Team/Org E2E passed 2/2. The unsigned personal macOS arm64
> **1.4.80 DMG/ZIP** completed, DMG checksum verified, and isolated packaged
> direct **and** Playwright-adapter startup/health smokes passed. This is the
> artifact formerly offered for user verification, not the older 1.4.79 DMG.
> It is **not** a signed/notarized release or user acceptance.

## DR-005 replacement artifact (historical, archived for SR-024)

- Source/instructions: Root `README.md` and `autobyteus-web/README.md` macOS
  build, integrated backend, and packaged E2E instructions. Reviewed Large /
  High AGY source/test package after API-REV-008 / CRR-015. Delivery safety
  checkpoint `642eb4f87`, latest-base merge `15149d03e`, current-base real
  Team/Org E2E **2/2** (`/tmp/agy-delivery-r5-team-org.log`). Build started
  from that integrated source HEAD; concurrent delivery-only documentation
  edits do not alter packaged source. The `1.4.80` version is inherited from
  the base and is **not** an AGY release bump.
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac` → **exit 0**;
  `/tmp/agy-electron-test-build-dr005.log`. The explicit personal flavor avoids
  the ticket branch's enterprise fallback. Build included server, renderer,
  main/preload and arm64 packaging. Signing was explicitly skipped (identity
  null); `codesign` reports `Signature=adhoc`, `TeamIdentifier=not set`.
- **DMG (full path):**
  `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/superseded-dr005-20260925/AutoByteus_personal_macos-arm64-1.4.80.dmg`
  — **457 MiB**, SHA-256
  `087703b193753b829cc61ad1819e21a2c7add4723b5cca1914baa8a83fe7074b`.
  `hdiutil verify` reported checksum **VALID**;
  `/tmp/agy-electron-test-dmg-verify-dr005.log`.
- ZIP alternative:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/autobyteus-web/electron-dist/superseded-dr005-20260925/AutoByteus_personal_macos-arm64-1.4.80.zip`
  — **452 MiB**, SHA-256
  `0fcc997a73f34521b5b1e238ef1ec26f17a6aaa0a8e0c605f50c4c5b76444721`.
  At DR-005 build time the adjacent unpacked app contained built AGY runtime
  JavaScript; that unpacked path was replaced by the DR-006 build and is not
  an archived DR-005 executable.
- Isolated packaged smokes: `env -u ELECTRON_RUN_AS_NODE pnpm -C autobyteus-web test:e2e:electron --skip-build --adapter direct` → **exit 0**, owned
  temporary data root and health-ready port 53016;
  `/tmp/agy-electron-test-smoke-dr005.log`. The analogous `--adapter playwright`
  command → **exit 0**, owned temporary root and health-ready port 53105;
  `/tmp/agy-electron-test-playwright-dr005.log`. Both launched the then-current
  DR-005 packaged executable and cleaned up their owned state. These prove package
  startup/health, **not** an Electron-shell AGY Org turn or manual user journey.
- Manual test guidance from below remains applicable to the **DR-006** app,
  not the historical DR-005 archive. Normal launch may use `~/.autobyteus/server-data`;
  the isolated Terminal example uses a separate data root and explicitly
  identifies the host AGY command. Avoid replacing an installed trusted app
  solely for this test. The old `1.4.79` artifact is retained for provenance
  but is superseded and must not be used to judge the SR-023 correction.
- `prepare:shared`/packaging left untracked generated `dist/` output in the two
  application SDK workspaces. It is build output, not source or a ticket
  artifact, and is excluded from any eventual final commit; no user data or
  earlier DMG was removed during this pre-verification hold.

## DR-003 historical artifact (superseded)

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
