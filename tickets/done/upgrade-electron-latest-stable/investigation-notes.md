# Investigation Notes — Upgrade Electron To Latest Stable

- Ticket: `upgrade-electron-latest-stable`
- Stage: `1 — Investigation + Triage`
- Date: `2026-06-19`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/upgrade-electron-latest-stable`
- Branch: `codex/upgrade-electron-latest-stable`
- Code edit permission during investigation: `Locked`
- User preference: silent mode for ticket work; use text-only updates.

## Investigation Goals / Questions

1. Find the Electron dependency declaration and all package-manager metadata that must be updated.
2. Verify the true latest stable Electron version from authoritative sources before editing.
3. Understand runtime/build-package risk for an Electron `38 -> 42` major upgrade.
4. Identify native module rebuild, packaging, updater, signing-adjacent, and smoke-validation commands that must be covered later.
5. Determine scope size and the minimum design/validation chain required before source/package edits.

## Scope Triage

- Classification: `Medium`.
- Rationale:
  - The likely production metadata touch is small (`autobyteus-web/package.json`, root `pnpm-lock.yaml`, likely legacy/local `autobyteus-web/pnpm-lock.yaml`, and native rebuild dependency metadata).
  - The runtime impact is larger than a normal dependency bump: Electron `38 -> 42` changes Chromium, Node/V8, binary install behavior, native module ABI, and package/update smoke expectations.
  - The project packages a self-contained desktop app with bundled Node backend and native modules (`node-pty`), so package/build validation is required.
  - Existing signing policy should remain untouched except validation; this is not a signing-fix ticket.

## External Sources Consulted

1. Electron release page: `https://releases.electronjs.org/` and `https://releases.electronjs.org/release/v42.4.1`
   - Fact used: `v42.4.1` is marked `Latest Stable`.
   - Fact used: Electron page provides install command `npm install --save-dev electron@42.4.1`.
   - Fact used: Electron `42.4.1` carries Chromium `148.0.7778.265`, Node.js `24.16.0`, and V8 `14.8.178.31`.
2. Electron all releases page: `https://releases.electronjs.org/release`
   - Fact used: stable release list shows `42.4.1` first, released `Jun 16, 2026`, Chromium `148.0.7778.265`, Node.js `24.16.0`.
3. npm registry via `pnpm view electron version dist-tags --json`
   - Fact used: npm `electron` package latest dist-tag is `42.4.1`; `42-x-y` also points to `42.4.1`.
4. Electron breaking changes docs: `https://www.electronjs.org/docs/latest/breaking-changes`
   - Fact used for 42.0: macOS notifications now require code-signing for display; Electron binary no longer downloads in npm `postinstall`; `ELECTRON_SKIP_BINARY_DOWNLOAD` no longer supported; `ELECTRON_INSTALL_ARCH` and `ELECTRON_INSTALL_PLATFORM` are the new cross-platform/arch binary-download controls; `Session.clearStorageData(options).quotas` is removed.
   - Fact used for 41.0: PDF rendering no longer creates a separate `WebContents`; cookie `changed` cause behavior changed; `showHiddenFiles` in Linux dialogs is deprecated.
   - Fact used for 40.0: renderer-process direct Electron `clipboard` API access is deprecated; macOS dSYM files changed to `tar.xz`.
   - Fact used for 39.0: `--host-rules` is deprecated in favor of `--host-resolver-rules`; macOS 11 is not supported in Electron 38+; `plugin-crashed` removed.
5. Electron PR `#51191`: `https://github.com/electron/electron/pull/51191`
   - Fact used: PR title is `fix: trigger ShipIt Mach service after SMJobSubmit to unblock on-demand-only mode`; merged Apr 21, 2026; labels show merged to `40-x-y`, `41-x-y`, and `42-x-y`.
6. Electron release pages for `40.9.3` and `41.3.0`:
   - `https://releases.electronjs.org/release/v40.9.3`
   - `https://releases.electronjs.org/release/v41.3.0`
   - Fact used: both include a macOS update fix describing updates not being applied if another app blocked the macOS system update loop, linked to backport PRs and marked also in `42`.
7. npm registry via `pnpm view electron-rebuild version dist-tags deprecated --json`
   - Fact used: `electron-rebuild@3.2.9` is latest under the old package name but deprecated: use `@electron/rebuild`.
8. npm registry via `pnpm view @electron/rebuild version dist-tags engines --json`
   - Fact used: latest `@electron/rebuild` is `4.0.4`; it provides the `electron-rebuild` binary and requires Node `>=22.12.0`.
9. npm registry via `pnpm view electron-builder version dist-tags --json`
   - Fact used: installed project version is `25.1.8`; npm latest tag is `26.15.3` and `v26` tag reports `26.15.5`. This ticket is scoped to Electron runtime upgrade unless packaging validation proves builder changes are required.
10. npm registry via `pnpm view electron-updater version dist-tags --json`
    - Fact used: installed project version is `6.8.3`; latest is `6.8.9`. This ticket is scoped to Electron runtime upgrade unless updater validation proves updater changes are required.

## Local Sources Consulted

1. Root package/workspace metadata:
   - `package.json` — root workspace scripts include release helpers; package manager `pnpm@10.28.2`.
   - `pnpm-workspace.yaml` — workspace includes `autobyteus-web`, server packages, SDK packages, and applications.
   - `pnpm-lock.yaml` — canonical root workspace lockfile.
2. Desktop package metadata:
   - `autobyteus-web/package.json`
     - `name`: `autobyteus`
     - `version`: `1.3.65`
     - `main`: `dist/electron/main.js`
     - `packageManager`: `pnpm@10.28.1`
     - Scripts include `start`, `test:electron`, `prepare-server`, `build:electron`, platform-specific `build:electron:*` scripts.
     - Current direct Electron runtime: `devDependencies.electron = ^38.1.2`.
     - Current builder/updater/native rebuild dependencies: `electron-builder = ^25.1.8`, `electron-updater = ^6.8.3`, `electron-rebuild = 3.2.9`.
3. Lockfiles:
   - `pnpm-lock.yaml`
     - `autobyteus-web` importer currently records `electron` specifier `^38.1.2`, resolved `38.8.2`.
     - `autobyteus-web` importer currently records direct `electron-rebuild` specifier/version `3.2.9`.
   - `autobyteus-web/pnpm-lock.yaml`
     - Local/legacy lockfile records Electron specifier `^38.1.2`, resolved `38.8.0`.
     - It does not include the direct `electron-rebuild` importer entry despite `autobyteus-web/package.json` now having that dependency; root lockfile appears canonical, but this local lockfile is still repository-resident and should not be left stale if dependency metadata is changed.
4. Packaging/build owner:
   - `autobyteus-web/build/scripts/build.ts`
     - Uses `electron-builder` programmatic `build(...)`.
     - mac target: `dmg` and `zip`.
     - mac signing configuration is already custom via `sign: './build/dist/macSign.js'`, `hardenedRuntime: true`, and entitlement files. No signing-policy source changes are required by this ticket.
     - Linux target: AppImage with host/native-architecture guard.
5. Native server/package preparation:
   - `autobyteus-web/scripts/prepare-server.mjs`
     - Reads `autobyteus-web/package.json` `devDependencies.electron` and strips `^`/`~` for the Electron version used by native rebuild.
     - Runs `pnpm -C autobyteus-web exec electron-rebuild -v <electronVersion> -m <targetDir> -w node-pty`.
   - `autobyteus-web/scripts/prepare-server.sh`
     - Legacy shell path also strips only leading `^` and uses `electron-rebuild` for `node-pty`.
6. Runtime Electron entrypoints/owners:
   - `autobyteus-web/electron/main.ts` — main process entrypoint (not directly edited in this investigation).
   - `autobyteus-web/electron/preload.ts` — preload bridge; uses `webUtils.getPathForFile(file)` rather than deprecated File `.path`.
   - `autobyteus-web/electron/updater/appUpdater.ts` — sole `electron-updater` owner; exposes check/download/install actions.
   - `autobyteus-web/electron/browser/*` — Browser tab/session owner using Electron `WebContentsView`/`WebContents` APIs.
7. Docs and CI/reference validation:
   - `autobyteus-web/README.md` documents `pnpm build:electron:*` and local mac no-notarization command.
   - `autobyteus-web/docs/electron_packaging.md` documents packaging, server bundle, native rebuild, signing policy, updater, and smoke commands.
   - `.github/workflows/release-desktop.yml` builds macOS ARM64/x64, Linux x64/ARM64, and Windows, with signing policy and terminal/runtime probes.
8. Docker server image:
   - `autobyteus-server-ts/docker/Dockerfile.monorepo` sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1` before workspace install. Electron 42 docs say this variable no longer prevents postinstall because there is no Electron postinstall binary download. This Dockerfile is server-image oriented and does not directly package the desktop app, but the environment variable is now stale/no-op for Electron 42 and should be evaluated during design/docs.

## Commands Run And Results

All commands were read-only investigation or disposable `/tmp` diagnostics; no source-code edits were made outside ticket artifacts.

```bash
git fetch origin --prune
```

- Result: completed before worktree creation; `origin/personal` refreshed to `174f64554fb63c4f702814c8f58b2b917e7904fd`.

```bash
git worktree add -b codex/upgrade-electron-latest-stable /Users/normy/autobyteus_org/autobyteus-worktrees/upgrade-electron-latest-stable origin/personal
```

- Result: dedicated ticket worktree created from latest tracked `origin/personal`.

```bash
find . -maxdepth 3 \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name package-lock.json -o -name npm-shrinkwrap.json -o -name pnpm-workspace.yaml -o -name turbo.json \) -not -path './node_modules/*' -print | sort
```

- Result: project uses pnpm workspace; relevant package metadata found at root and `autobyteus-web/package.json`; lockfiles at root and several package-local locations.

```bash
rg -n '"electron"|electron-builder|electron-forge|@electron|electron-updater|electron-store|autoUpdater|ShipIt|Squirrel' --glob 'package.json' --glob '*.json' --glob '*.yaml' --glob '*.yml' --glob '*.ts' --glob '*.js' --glob '*.mjs' --glob '*.cjs' --glob '*.md'
```

- Result: desktop packaging and runtime ownership is centered under `autobyteus-web`; numerous historical ticket artifacts mention Electron but are not production sources.

```bash
node -e "const p=require('./autobyteus-web/package.json'); console.log(JSON.stringify({scripts:p.scripts,devDependencies:p.devDependencies,dependencies:p.dependencies,packageManager:p.packageManager},null,2))"
```

- Result: current package declares `electron: ^38.1.2`, `electron-builder: ^25.1.8`, `electron-rebuild: 3.2.9`, `electron-updater: ^6.8.3`.

```bash
pnpm view electron version dist-tags --json
```

- Result: npm latest is `42.4.1`; `42-x-y` dist-tag is also `42.4.1`; `38-x-y` is `38.8.6`.

```bash
pnpm view electron-rebuild version dist-tags deprecated --json
pnpm view @electron/rebuild version dist-tags --json
pnpm view @electron/rebuild@4.0.4 bin dependencies engines --json
```

- Result: old `electron-rebuild` package is deprecated; `@electron/rebuild@4.0.4` is the current replacement and still provides `electron-rebuild` CLI; Node engine requires `>=22.12.0`.

```bash
node -v && pnpm -v && uname -a && sw_vers
```

- Result: local environment Node `v22.21.1`, pnpm `10.28.2`, macOS `26.2`, ARM64 — sufficient for `@electron/rebuild@4.0.4` engine requirement.

```bash
tmp=$(mktemp -d /tmp/node-abi-check.XXXXXX)
cd "$tmp"
pnpm add node-abi@3.87.0 --silent >/dev/null
node - <<'NODE'
const abi=require('node-abi')
for (const v of ['38.8.2','42.4.1']) {
  try { console.log(v, abi.getAbi(v,'electron')) } catch (e) { console.log(v, 'ERROR', e.message) }
}
NODE
rm -rf "$tmp"
```

- Result: `node-abi@3.87.0` detects Electron `38.8.2` ABI `139` but cannot detect Electron `42.4.1`; it reports that updating `node-abi` might help.
- Implication: keeping direct `electron-rebuild@3.2.9` would likely break `prepare-server` native `node-pty` rebuild for Electron 42.

```bash
tmp=$(mktemp -d /tmp/node-abi-check-new.XXXXXX)
cd "$tmp"
pnpm add node-abi@4.31.0 --silent >/dev/null
node - <<'NODE'
const abi=require('node-abi')
for (const v of ['42.4.1']) {
  try { console.log(v, abi.getAbi(v,'electron')) } catch (e) { console.log(v, 'ERROR', e.message) }
}
NODE
rm -rf "$tmp"
```

- Result: `node-abi@4.31.0` detects Electron `42.4.1` ABI `146`.
- Implication: Stage 6 should replace direct `electron-rebuild` with `@electron/rebuild@4.0.4` or otherwise ensure the direct rebuild CLI resolves with a `node-abi` version that knows Electron 42.

```bash
rg -n -e '--host-rules|host-rules|hostRules|host-resolver-rules|ELECTRON_SKIP_BINARY_DOWNLOAD|ELECTRON_INSTALL_ARCH|ELECTRON_INSTALL_PLATFORM|install-electron|electron-rebuild|@electron/rebuild' autobyteus-web autobyteus-server-ts autobyteus-ts scripts .github package.json pnpm-lock.yaml --glob '!**/node_modules/**' --glob '!**/.output/**' --glob '!**/electron-dist/**' --glob '!**/dist/**'
```

- Result: no project `--host-rules`/`host-resolver-rules` usage; `electron-rebuild` used in `autobyteus-web/scripts/prepare-server.mjs` and legacy shell script; `ELECTRON_SKIP_BINARY_DOWNLOAD=1` used only in `autobyteus-server-ts/docker/Dockerfile.monorepo`.

```bash
rg -n "clearStorageData|quotas|quota:" autobyteus-web/electron autobyteus-web/components autobyteus-web/composables autobyteus-web/pages autobyteus-web/plugins autobyteus-web/stores autobyteus-web/build autobyteus-web/scripts
rg -n "plugin-crashed|routingId|findFrameByRoutingId" ...
rg -n "session\.loadExtension|session\.removeExtension|session\.getExtension|session\.getAllExtensions|extension-loaded|extension-unloaded|extension-ready" ...
```

- Result: no direct usage of the checked breaking APIs in in-scope desktop code.

```bash
rg -n "webFrame|webUtils.getPathForFile|File\.path" autobyteus-web/electron autobyteus-web/components autobyteus-web/composables autobyteus-web/pages autobyteus-web/plugins autobyteus-web/stores autobyteus-web/build autobyteus-web/scripts
```

- Result: `autobyteus-web/electron/preload.ts` exposes `getPathForFile` via `webUtils.getPathForFile(file)`; no problematic renderer File `.path` pattern found in scoped search.

## Key Findings

### Latest Electron Target

- Authoritative target for this ticket is `electron@42.4.1`.
- Rationale: official Electron release page marks `v42.4.1` as latest stable; npm `latest` also points to `42.4.1`.
- Electron `42.4.1` runtime stack:
  - Chromium `148.0.7778.265`
  - Node.js `24.16.0`
  - V8 `14.8.178.31`
- Current repository root lock resolves Electron `38.8.2`; package spec is `^38.1.2`.

### ShipIt / macOS Update Fix

- PR `electron/electron#51191` was merged Apr 21, 2026 and backported to `40-x-y`, `41-x-y`, and `42-x-y`.
- The fix appears in release notes through backport PRs for `40.9.3` and `41.3.0`, marked as also in `42`.
- Because `42.4.1` is in the `42-x-y` line and newer than the backport, the target contains the ShipIt fix.

### Dependency Metadata Owners

- Primary production owner: `autobyteus-web/package.json`.
- Canonical lock owner: root `pnpm-lock.yaml`.
- Additional repository-resident lockfile: `autobyteus-web/pnpm-lock.yaml`; although it appears stale relative to root workspace lock, it still records Electron `38.8.0` and should be kept consistent or explicitly removed in design if obsolete. Removal would be a broader cleanup; safer scope is to update it if feasible.

### Native Module Rebuild Risk

- `prepare-server.mjs` and legacy `prepare-server.sh` use `electron-rebuild` to rebuild bundled server `node-pty` for the Electron runtime.
- Current direct package `electron-rebuild@3.2.9` depends on old `node-abi`; the locally probed `node-abi@3.87.0` cannot detect Electron `42.4.1`.
- `@electron/rebuild@4.0.4` is the replacement package, provides the same `electron-rebuild` CLI name, and should bring modern `node-abi` support for Electron `42`.
- Design implication: this ticket should update direct native rebuild dependency metadata together with Electron so `prepare-server` can still rebuild `node-pty`.

### Electron 42 Breaking-Change Surface In This Project

- Electron 42 binary download behavior changes: no postinstall binary download; first `electron` CLI run downloads on demand, and `install-electron` can be used explicitly. This may affect build command ordering and CI caching/fetch timing.
- `ELECTRON_SKIP_BINARY_DOWNLOAD` is no longer supported. The project only sets it in `autobyteus-server-ts/docker/Dockerfile.monorepo`, which is a server Docker image path, not the desktop packaging path. It is stale but not necessarily blocking.
- macOS notifications now need code signing to display. Project uses in-app UI notifications heavily; no direct `new Notification`/Electron native notification usage found in scoped search, so no code change identified. Local unsigned package smoke should not claim native notification behavior.
- Removed `Session.clearStorageData(options).quotas`: no scoped usage found.
- Deprecated `--host-rules`: no scoped usage found.
- Renderer direct Electron `clipboard` API deprecation: scoped usage is browser `navigator.clipboard`, not Electron renderer `clipboard` module.
- PDF rendering WebContents behavior change: Browser/session code should be smoke-tested if PDF/browser surfaces are considered critical, but no direct PDF WebContents detection pattern was found in quick search.

### Build / Validation Owners

- Relevant unit/electron tests:
  - `cd autobyteus-web && pnpm test:electron`
  - likely focused tests for `electron/updater`, `electron/browser`, shell, preload.
- Relevant full desktop build/package smoke:
  - `CI=true AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm -C autobyteus-web build:electron:mac -- --arm64`
  - Existing docs often run the same mac command without explicit `-- --arm64`; on ARM64 host it resolves to ARM64.
- Relevant install/lock validation:
  - `pnpm install --lockfile-only` from workspace root after metadata change.
  - Potential separate lock update for `autobyteus-web/pnpm-lock.yaml` if retained.
- Relevant package/version validation after install:
  - `pnpm -C autobyteus-web exec electron --version` should print `v42.4.1` and may trigger on-demand Electron binary download.
  - `pnpm -C autobyteus-web exec electron-rebuild --version` should resolve from `@electron/rebuild` after dependency replacement.

## File Placement / Ownership Observations

- Electron runtime, build, updater, and preload concerns are correctly under `autobyteus-web/`.
- Packaging script owner is `autobyteus-web/build/scripts/build.ts`.
- Server staging and native rebuild owner is `autobyteus-web/scripts/prepare-server.mjs` (legacy shell path remains for fallback/older workflows).
- Dependency metadata owner is `autobyteus-web/package.json`; lock owner is root `pnpm-lock.yaml` for the pnpm workspace.
- The local `autobyteus-web/pnpm-lock.yaml` is a placement/consistency concern: it is inside the package but stale versus root workspace. This ticket can update it if a package-local lock update is straightforward, but should not introduce a new lockfile policy change unless necessary.

## Unknowns / Risks To Carry Forward

1. Whether Electron 42’s on-demand binary download requires explicit `pnpm -C autobyteus-web exec electron --version`/`install-electron` before electron-builder packaging in CI/local environments. Validation must reveal this.
2. Whether `electron-builder@25.1.8` packages Electron 42 cleanly; do not upgrade builder by default unless packaging fails or metadata requires it.
3. Whether `electron-updater@6.8.3` remains compatible with Electron 42 runtime and current auto-update code; updater tests and packaging metadata validation should cover this.
4. Whether package-local `autobyteus-web/pnpm-lock.yaml` should be updated or retired. For this ticket, prefer updating if possible; avoid broader deletion unless requirements/design explicitly expand.
5. Electron 42 native module ABI is `146`; `node-pty` rebuild must be validated in the packaged server resources.
6. Local macOS build may be unsigned/not notarized when signing env is absent; this is acceptable for local validation but should be recorded separately from release signing.

## Implications For Requirements / Design

- Requirements should explicitly include replacement of deprecated `electron-rebuild` direct dependency with `@electron/rebuild` so native module rebuilding works for Electron 42.
- Requirements should require both package metadata and lockfile consistency.
- Stage 7 validation must include at least:
  - Electron version resolution check (`v42.4.1`).
  - Electron test suite (`pnpm -C autobyteus-web test:electron`).
  - Native rebuild/package smoke through `pnpm -C autobyteus-web build:electron:mac -- --arm64` on this host, unless blocked by environment.
  - Packaged artifact/server resource existence check and existing signing-policy verifier if the mac build emits an app bundle.
- Design should keep signing-policy code unchanged and treat signing as validation-only.
