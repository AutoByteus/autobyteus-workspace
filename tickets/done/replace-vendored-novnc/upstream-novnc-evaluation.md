# Upstream noVNC Evaluation

- Status: Complete investigation evidence
- Approval applicability: N/A — this supplement records provenance, package compatibility, and version-selection evidence; intended behavior remains authoritative in `requirements.md`.
- Supports:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/requirements.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/proposed-design.md`
- Related requirements / acceptance criteria: `REQ-001` through `REQ-006`; `AC-001` through `AC-010`.

## Executive Finding

Direct package use is viable. The earlier failed attempt was recorded in AutoByteus commit `26cc3900d8f146230657c1ffbab1aa743958bb43` as “when i use yarn install novnc, i can not make the import work.” The command/name in that message refers to the unscoped `novnc` package, while the noVNC project publishes its maintained package as `@novnc/novnc`. The current official package exposes `RFB` as its root default export, so the supported import is:

```ts
import RFB from '@novnc/novnc';
```

A disposable clone of the current AutoByteus baseline was changed to that import and to the upstream package, then verified with targeted Vitest coverage and a production Nuxt static build. No Vite/Nuxt/Electron-oriented source fork or deep import is required.

## Checked-In Snapshot Provenance

| Evidence | Finding |
| --- | --- |
| AutoByteus history commit `26cc390` (2025-03-24) | Added `lib/novnc/core` and `lib/novnc/vendor/pako`; commit message says an attempted `yarn install novnc` import did not work. No package dependency was committed. |
| AutoByteus history commit `d3b7044` (2025-11-08) | Replaced six upstream core files and added `clipboard.js`; non-vendor behavior changes were limited to VNC viewer resize defaults. |
| Full-tree `diff -qr` against noVNC commit `f5a4eedcea749f82b7cab05cb78a4eb8a92b2c32` | No differences in the checked-in `core/` and `vendor/` trees. The current AutoByteus copy is an exact upstream snapshot, not a locally modified fork. |
| Current repository search | Only `useVncSession.ts` imports the implementation. Two test files mock the same local path. No application source reaches into other noVNC internals. |
| Current size | 57 tracked files, approximately 712 KiB under `autobyteus-web/lib/novnc/`. |

## Upstream Package Facts (Observed 2026-07-18)

- Official repository: <https://github.com/novnc/noVNC>
- Official integration documentation: <https://github.com/novnc/noVNC/blob/master/docs/LIBRARY.md>
- Official package: <https://www.npmjs.com/package/@novnc/novnc>
- `@novnc/novnc@1.7.0` is the current stable tag; its package metadata is ESM (`"type": "module"`) and exports `./core/rfb.js` from the package root.
- `@novnc/novnc@1.7.0-g7c36fab` is the current published `dev` build and maps to upstream commit `7c36fabe599e053c5a81e98e091ac636f6c1e174`.
- noVNC documents a single `RFB` integration object with the connection, credentials, viewport, resize, view-only, clipboard, and disconnect APIs used by AutoByteus: <https://github.com/novnc/noVNC/blob/master/docs/API.md>.
- The package ships no TypeScript declarations. The currently published DefinitelyTyped package still declares obsolete `@novnc/novnc/lib/...` module paths and does not type the package-root export introduced by current packaging; a small application-owned declaration for the used public surface is therefore required.

## Version / Behavior Comparison

The checked-in snapshot exactly matches upstream commit `f5a4eed`, which added permission-aware automatic clipboard synchronization. That commit is on upstream `master` but is not an ancestor of the `v1.7.0` release branch.

| Candidate | Direct maintained dependency? | Preserves current automatic clipboard behavior? | Freshness / stability | Decision |
| --- | --- | --- | --- | --- |
| `@novnc/novnc@1.7.0` | Yes | No. Stable 1.7.0 emits the documented `clipboard` event, but does not include the checked-in snapshot's automatic browser clipboard read/write owner, and AutoByteus has no replacement event handling. | Current stable release | Reject for this change because it silently removes a reachable current behavior. |
| `@novnc/novnc@1.7.0-g7c36fab` | Yes | Yes. It contains `f5a4eed` and the same automatic clipboard path, plus the later current-master fixes. | Current exact upstream development build; prerelease risk is bounded by an exact version pin | Recommended now. Upgrade to the next stable release only after it contains or intentionally replaces the required clipboard behavior. |
| Refresh `autobyteus-web/lib/novnc/` from upstream | No | Yes | Can copy current source, but retains manual provenance, update, licensing, and diff maintenance | Reject because direct package integration is proven viable. |

### Reachability Witness For Clipboard Preservation

- Supported trigger: a user opens a configured VNC host, connects, switches from default view-only mode to interactive mode, and focuses the remote canvas.
- Current path: `VncHostTile.toggleViewOnly()` -> `useVncSession.toggleViewOnly()` -> vendored `RFB.viewOnly = false` -> `AsyncClipboard.grab()` -> canvas focus -> browser clipboard read -> `RFB.clipboardPasteFrom()` -> VNC server.
- Reverse path: VNC server clipboard message -> vendored `RFB._writeClipboard()` -> browser clipboard write when permission-aware async clipboard is available.
- Consequence of stable 1.7.0 without an app-owned replacement: automatic local/remote clipboard synchronization is lost. This is product-reachable even though the UI does not advertise a separate clipboard button.

## Integration Probe

### Disposable Setup

- Detached worktree based on refreshed `origin/personal` (`dbc83fdb51c1e158b5707c219dd8574dc49fa493`).
- Added exact dependency `@novnc/novnc@1.7.0-g7c36fab`.
- Replaced the one production import and two test mock paths with `@novnc/novnc`.
- Tested a small local `types/novnc.d.ts` declaration for the package-root public API.
- Removed constructor properties that both the checked-in and upstream `RFB` constructors ignore; `applyViewportStrategy()` remains the current effective owner of view-only, scale, clip, and remote-resize state.
- Disposable worktree was removed after evidence capture.

### Results

| Command / Probe | Result |
| --- | --- |
| Baseline `pnpm -C autobyteus-web test:nuxt composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts utils/__tests__/vncHosts.spec.ts --run` | Pass: 3 files, 30 tests. |
| Package probe `pnpm -C autobyteus-web test:nuxt composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts --run` | Pass: 2 files, 27 tests. |
| Package probe `pnpm -C autobyteus-web generate` | Pass: Nuxt 3.21.1 / Vite 7.3.1 production client and static generation completed; 3,552 client modules transformed. |
| Baseline `pnpm -C autobyteus-web exec nuxi typecheck` | Existing project-wide failure: 242 TypeScript errors; two pre-existing errors are in `useVncSession.ts`. |
| Package import without a local declaration | Adds a noVNC-specific `TS7016` because upstream ships no declaration. |
| Package import with the small accurate local declaration | Restores the same 242-error baseline; no package-import/noVNC-specific type error remains. |
| `@types/novnc__novnc@1.6.0` probe | Not suitable alone: it types obsolete `@novnc/novnc/lib/...` paths and causes the package-root declaration file to be treated as non-module. |

## Constructor Contract Finding

Both the checked-in snapshot and current upstream `RFB` constructor consume only connection options (`credentials`, `shared`, `repeaterID`, and `wsProtocols`). The current AutoByteus call also passes viewport/display settings into the constructor, but those settings are ignored there.

Current effective behavior is preserved by:

1. passing only supported connection options to `new RFB(...)`;
2. retaining `applyViewportStrategy(sessionRfb)` immediately after construction to set `scaleViewport`, `clipViewport`, `resizeSession`, and `viewOnly` through the public properties;
3. not turning the previously ignored display/compression values into new behavior during this dependency cleanup.

## Recommendation

Replace the checked-in tree with exact `@novnc/novnc@1.7.0-g7c36fab`, use the package-root import, keep `useVncSession` as the application integration owner, add a narrow local declaration for only the public surface used by AutoByteus, update mocks, regenerate `pnpm-lock.yaml`, and delete the entire `autobyteus-web/lib/novnc/` tree. Do not retain a fallback copy, deep import, patch, or compatibility wrapper.
