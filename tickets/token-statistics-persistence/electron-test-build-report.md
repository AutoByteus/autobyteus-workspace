# Electron Test Build Report

## Scope And Trigger

- Ticket: `token-statistics-persistence`
- Trigger: User requested that delivery read the repository README and build
  Electron for hands-on testing while the DR-001 user-verification hold remains
  active.
- Result: `Pass — personal macOS arm64 package built, integrity-verified, and
  launched successfully with the documented isolated direct adapter.`
- This is a local test package only. It is not a release, publication, version
  bump, tag, notarized distribution, or user acceptance signal.

## Documentation Read

- Root build/test/release guidance:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/README.md`
  (`Build examples`, `Packaged Electron API/E2E testing`, and `Release workflow`).
- Frontend build guidance:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/README.md`
  (`Desktop Application Build`, `macOS Build With Logs`, and integrated backend).
- Canonical flavor selection and packaged-runtime contract:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/docs/electron_packaging.md`.
- Applicable README command: local macOS build with `NO_TIMESTAMP=1`, empty
  `APPLE_TEAM_ID`, and verbose electron-builder logging. Because a `codex/*`
  branch safely falls back to the enterprise artifact name, delivery supplied
  the documented `AUTOBYTEUS_BUILD_FLAVOR=personal` override for the recorded
  `personal` finalization target and recommended user-test package.

## Source And Environment

- Host: macOS `26.5.2` (`25F84`), Apple Silicon `arm64`.
- Frontend/package version: `1.4.52`.
- Ticket branch: `codex/token-statistics-persistence`.
- Integrated source HEAD:
  `f0ddf442569b6bd9eecd590516506bc0bccd9bbc`.
- Latest tracked base rechecked before build:
  `origin/personal` at `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`.
- Base result: unchanged from DR-001; ticket remained 3 ahead / 0 behind, so no
  re-integration or renewed verification was required before packaging.
- Base evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-pre-build-base-refresh.log`.

## Build Execution

### README Build And Flavor Selection

The exact README macOS command completed once with exit 0 and the documented
safe enterprise fallback for an unrecognized `codex/*` branch:

```sh
NO_TIMESTAMP=1 APPLE_TEAM_ID= \
DEBUG='electron-builder,electron-builder:*' \
DEBUG='app-builder-lib*' DEBUG='builder-util*' \
pnpm build:electron:mac
```

Evidence:
`/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-electron-mac-build.log`.

Delivery then ran the same README build with the canonical explicit personal
flavor override:

```sh
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 APPLE_TEAM_ID= \
DEBUG='electron-builder,electron-builder:*' \
DEBUG='app-builder-lib*' DEBUG='builder-util*' \
pnpm build:electron:mac
```

That pipeline passed the web/localization guards, localization audit, shared
and server builds, sanitized built-in-agent bootstrap smoke, mobile/static and
Electron renderer generation, Electron TypeScript transpilation, native module
rebuild, and DMG/ZIP generation. The conversation interruption ended the
wrapper after both personal blockmaps were generated, so it did not retain its
final exit line. Delivery resumed the already-built pipeline at its packaging
entry point with the same flavor/signing environment:

```sh
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 APPLE_TEAM_ID= \
node build/dist/build.js --mac
```

The resumed packaging step completed with exit 0 and regenerated the personal
app, DMG, ZIP, and both blockmaps.

Evidence:

- Full personal pipeline:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-electron-mac-personal-build.log`
- Successful packaging resume:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-electron-mac-personal-package-resume.log`

## Recommended User-Test Artifacts

- DMG:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
  - Size: approximately 442 MiB
  - SHA-256:
    `085292e4b1ff22c57cd84c8c9f3a649cadda3021d5ffc12dc8dd77a2d1b314a6`
- ZIP:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
  - Size: approximately 437 MiB
  - SHA-256:
    `ee3e80d1126e071089f1c40c5a58a0ca55edd5d0ec7bbf1f8a8340a7b5bee059`
- Unpacked app:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Main executable:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus`
  - SHA-256:
    `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`
  - Architecture: Mach-O arm64
  - Bundle ID: `com.autobyteus.app`
  - Version/build: `1.4.52` / `1.4.52`

## Verification

- `hdiutil verify` on the recommended personal DMG: `Pass`.
- `unzip -tq` on the recommended personal ZIP: `Pass`, no compressed-data errors.
- Bundle metadata, executable presence/permissions, version, and arm64
  architecture: `Pass`.
- Exact unpacked executable isolated launch using the root README command form:

```sh
env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron \
  --skip-build \
  --adapter direct \
  --executable /absolute/path/to/AutoByteus
```

  Result: `Pass`, exit 0. The packaged backend became ready on isolated loopback
  port `51299` with an owned temporary data root and was cleaned by the launcher.
- Artifact verification evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-personal-artifact-verification.log`.
- Isolated launch evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-personal-isolated-launch-smoke.log`.
- Final artifact, branch-currentness, hash, command-completion, process cleanup,
  and static checks:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-evidence/dr-002-final-checks.log`
  — `Pass`.

## Signing And User Guidance

- Signing/notarization: Local README test build; timestamping and Apple identity
  signing were disabled. The executable is linker/ad-hoc signed, has no Team ID,
  and is not notarized.
- Recommended test path: Open the DMG, copy `AutoByteus.app` to Applications or
  another test location, and launch it. macOS may require right-click **Open**
  confirmation for this local unnotarized build.
- A normal manual launch uses the production embedded-runtime defaults, including
  port `29695` and the normal application data root. The recorded automated smoke
  did not touch that state; it used the README-isolated temporary profile.

## Non-Blocking Build Notices

The successful build retained existing informational warnings for stale
Browserslist data, large generated chunks, peer/deprecated dependency notices,
electron-builder dependency discovery, and the available Prisma major upgrade.
No source, dependency, schema, or lockfile change was made in response, and none
prevented packaging or isolated startup.

## Final Status

`Pass — personal macOS arm64 Electron test package is ready for hands-on user
verification. Repository finalization remains held.`
