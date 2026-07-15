# Electron macOS Build Report

## Scope

- Ticket: `transient-team-cleanup-bug`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug`
- Branch: `codex/transient-team-cleanup-bug`
- Integrated branch head before build: `a71b9005` (`Merge remote-tracking branch 'origin/personal' into codex/transient-team-cleanup-bug`)
- Latest base integrated before build: `origin/personal` at `0847d2e89b48480f07d19780ebd5c2cb0711e594`
- README consulted: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/autobyteus-web/README.md`

## README Build Guidance Used

The README documents macOS desktop builds with:

```bash
pnpm build:electron:mac
```

It also states that Electron builds include the integrated backend server automatically and place outputs in `autobyteus-web/electron-dist`.

## Command

```bash
pnpm -C autobyteus-web build:electron:mac
```

## Result

- Result: `Pass`
- Completed: `2026-07-04T18:58Z`
- Package version in build output: `1.3.97`
- Platform/target: macOS arm64
- Code signing: skipped by electron-builder because identity was explicitly set to `null`; this is a local unsigned build.
- Notarization: not performed.

## Output Artifacts

- App bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip.blockmap`

## Notable Build Log Notes

- `guard:web-boundary` passed.
- `guard:localization-boundary` passed.
- `audit:localization-literals` passed with zero unresolved findings.
- Server packaging/build completed, including built-in agents bootstrap smoke check.
- Mobile web assets generated during `prepare-server`.
- Electron renderer generated successfully.
- Electron main/preload transpilation/build completed successfully.
- Native Electron modules were rebuilt; terminal native resource execute bits were normalized.
- Non-blocking warnings observed:
  - Nuxt/Vite chunk-size warnings for large chunks.
  - Node `MODULE_TYPELESS_PACKAGE_JSON` warning for localization audit TypeScript module detection.
  - pnpm deploy peer/deprecated dependency warnings.
  - pnpm deploy ignored build script warning for deployed dependency context.
  - electron-builder informational note about `@electron/rebuild` dependency.

## Follow-Up

This is a local unsigned macOS build artifact, suitable for handoff/testing. It is not a signed/notarized release artifact and should not be represented as a production release unless the documented release/signing path is run later.
