# IMP-002: the fresh-start build and the release job's verify steps (DESIGN.md rule 12)

- Environment: macOS arm64; `env -i PATH="$PATH" HOME=~ TMPDIR=<tmp> USER=…` (no `AUTOBYTEUS_*` from my shell).
- Date: 2026-11-25.
- Result: **Pass**, for both commits that changed the web's dependencies or its PDF worker.

## Steps (the Desktop Release job's macOS ARM64 build, `.github/workflows/release-desktop.yml`)

1. `git clone --no-local <superrepo> <tmp>/fresh && git checkout <commit>`: a clean tree; the SDK packages' `dist/` do not exist yet.
2. `pnpm install --frozen-lockfile`
3. `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm -C autobyteus-web build:electron:mac -- --arm64`
4. The job's verify steps, verbatim from the workflow:
   - Prisma ARM64: `@prisma/engines` has `schema-engine-darwin-arm64`; `.prisma/client` has `libquery_engine-darwin-arm64.dylib.node`.
   - Packaged terminal runtime ARM64: `verify-packaged-terminal-runtime.mjs` on `autobyteus-web/resources/server`, on the app bundle's `Contents/Resources/server`, and with `ELECTRON_RUN_AS_NODE=1 …/AutoByteus.app/Contents/MacOS/AutoByteus … --spawn-probe`.

## Runs

| Commit | Install | Build | Verify | Artifacts |
|---|---|---|---|---|
| `0b88e1e761` (D-5, SR-001) | ok | exit 0 | Prisma ok; terminal runtime ok ×3, spawn probe ok | `AutoByteus.app`, dmg, zip |
| `9072eb89c4` (D-5, SR-002) | ok | exit 0 | Prisma ok; terminal runtime ok ×3, spawn probe ok (`VERIFY_OK`) | `AutoByteus_personal_macos-arm64-1.5.15-beta.1.dmg` (+ blockmap), `.zip` (+ blockmap), `mac-arm64/AutoByteus.app` |

The app of each run is the one IMP-003 and IMP-004 checked. The build-only Desktop Release run on CI is IMP-007.
