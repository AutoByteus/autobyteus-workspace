# Electron Build Report — Token Meter Unit-Price Transparency

## Scope

- Trigger: User requested README-guided Electron build for local testing before finalization; refreshed after the Round 8 reviewed neutral hover/press UI local fix.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency`
- Branch: `codex/token-meter-unit-price-transparency`
- README consulted: `autobyteus-web/README.md`
- Documented macOS command used: `pnpm -C autobyteus-web build:electron:mac`
- Latest tracked base checked before renewed build: `origin/personal` at `d5039026af82`; branch ahead `2`, behind `0`.

## Result

- Status: `Passed`
- Build completed: `2026-07-02 14:23:43 CEST`
- Build flavor: `enterprise`
- Platform/arch: `macOS arm64`
- Version: `1.3.92`
- Code signing: skipped by build config (`identity explicitly is set to null`)

## Build Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.92.dmg` (383M, mtime `2026-07-02 14:22:10 CEST`)
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.92.zip` (379M, mtime `2026-07-02 14:23:43 CEST`)
- App bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (mtime `2026-07-02 14:21:19 CEST`)
- Update metadata:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.92.dmg.blockmap`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.92.zip.blockmap`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/latest-mac.yml`

## Checksums

- DMG SHA-256: `4e6e1ba62504ffc65fbed354d4932e4c13a9f2eabc0c14314136c35dea2ae649`
- ZIP SHA-256: `a146843ede402244c9988870dc4e03d1c065d74e3799a30cd42f915cf4db9646`

## Notable Build Output

- `guard:web-boundary` — Passed.
- `guard:localization-boundary` — Passed.
- `audit:localization-literals` — Passed with zero unresolved findings.
- Server package prepared successfully under `autobyteus-web/resources/server`.
- Mobile web assets built and copied into the server package.
- Native modules rebuilt for Electron; node-pty spawn-helper execute bits normalized.
- Electron Builder produced DMG and ZIP artifacts successfully.
- Warnings observed:
  - Large Nuxt chunks warning.
  - Existing package/dependency warnings during server deployment.
  - macOS signing skipped because identity is null.

## Round 8 Renewal Note

- The build above was rerun after the neutral hover/press UI local fix reviewed in Round 8.
- Included UI interaction state:
  - `Calculation details` keeps the leading Activity-style SVG chevron.
  - The row now uses neutral Activity-like mouse feedback: `hover:bg-gray-50` and `active:bg-gray-100`.
  - Heavy/custom blue effects remain absent.
  - Keyboard users retain a neutral `focus-visible` outline (`focus-visible:outline-gray-300`).
- The local fix did not change docs/API/server/GraphQL/generated artifacts, token accounting, pricing semantics, release/deployment logic, or durable API/E2E coverage.

## Testing Notes

For local testing on this Mac, use either:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

or open the DMG:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.92.dmg
```

Because this build is unsigned, macOS Gatekeeper may require right-click → Open or the equivalent security approval if launching from the DMG/ZIP.

## Finalization Note

This build was produced for user testing only. It does not archive the ticket, push the branch, merge into `personal`, release, deploy, or clean up the worktree.
