# Investigation Notes

## Investigation Meta

- Package: `ios-icon-compliance-594`; Task autobyteus-594 (related 592).
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-icon-compliance-594`, `codex/ios-icon-compliance-594`.
- Base: `origin/personal` `9aeaf46aa9`, fetched 2026-11-21. Finalization target: `origin/personal`.
- Current SR: `SR-001`.
- Authorities read (2026-11-21): `references/requirements-engineering.md` (re-read after the skill update), `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rule 12), and the updated `SKILL.md`.
- Status: complete.

## Source Log

| ID | Type | Source / Command | Finding | How |
| --- | --- | --- | --- | --- |
| S-01 | Code | `AppIcon.appiconset/Contents.json` | 18 slots: iPhone 20/29/40/60 @2x/@3x; iPad 20/29/40/76 @1x/@2x and 83.5@2x; ios-marketing 1024@1x | Read |
| S-02 | Image | the current `AppIcon-1024.png` | Placeholder: a hexagon of six nodes on a blue circle over near-black. RGB, no alpha, 1024². Last changed `fbae0246ce` (2026-06-06). | Measured (sips; viewed) |
| S-03 | Code / image | `autobyteus-web/public/autobyteus-icon.svg` (viewBox 24: a #1E3A8A circle of r 11, plus the #34D399 mark); `autobyteus-web/build/scripts/generateIcons.ts` (sharp renders this SVG for the desktop `.icns`/`.ico`/PNGs); the installed `/Applications/AutoByteus.app/Contents/Resources/icon.icns` | The desktop icon is this SVG: the mark in a blue circle on transparent. | Read; Measured (sips render of the installed icon; viewed) |
| S-04 | Code | `autobyteus-android/app/src/main/res/drawable/ic_launcher_background.xml` (#1E3A8A solid), `ic_launcher_foreground.xml` (the same mark path, scaled 0.66 in the 108 dp canvas) | Android: the mark on a full brand-blue background. | Read |
| S-05 | Git / image | `origin/codex/autobyteus-592-ios-product-icon` `7ec960320a` (18 PNGs only, no script); its `AppIcon-1024.png` | The mark on full #1E3A8A, at the desktop render's scale (mark spans about x 85–940 px). RGB, no alpha; the 40 px slot is also RGB. Run 44892450384 is on `personal` `7591aa307f`, not on the branch. | Measured; viewed |
| S-06 | Code | `git grep` in `autobyteus-ios` for CryptoKit, CommonCrypto, Security, SecKey, SecItem, CCCrypt, AES, Curve25519 and similar; `project.yml` dependencies | None. Dependencies are internal targets only. Networking only through `WKWebView` (`AutoByteusWebViewController.swift`, `DemoWebViewController`). | Read |
| S-07 | Code | `autobyteus-web` imports of `crypto-js` and WebCrypto | `crypto-js/sha256` only (`demo/rest/content.ts:7`, `agentOrgReferenceProjection.ts:1`, `toolUtils.ts:1`), which is hashing. No app use of `crypto.subtle`. | Read |
| S-08 | Code | `node_modules/@novnc/novnc` 1.7.0 (`core/rfb.js:59-68,1555-1567`, `core/crypto/{aes,rsa,dh,des}.js`); `composables/useVncSession.ts:2` bundles it | The client's security types are None, VNCAuth (DES), RA2ne (RSA plus AES-EAX for the handshake, "ne" = the session is not encrypted), Tight, VeNCrypt (Plain), XVP, ARD (DH plus AES of the credentials) and MS-Logon II. AES and RSA keys go through `window.crypto.subtle` (OS); RSA/DH modPow runs in JS. **Every use is authentication**, and no type encrypts the session. | Read |
| S-09 | Code | `AutoByteusMobile/Info.plist` | No `ITSAppUsesNonExemptEncryption`. ATS: `NSAllowsArbitraryLoads` false, `NSAllowsArbitraryLoadsInWebContent` true. | Read |
| S-10 | Code | `autobyteus-web/package.json:33-34,209` (`icons:build` / `icons:check` with `scripts/build-icon-bundle.mjs --check`; `sharp` ^0.33.2); `autobyteus-ios/scripts/prepare-demo-web.sh` (iOS uses web tooling through pnpm) | The project's existing "generate, plus `--check`" pattern, and the web package owning sharp and the logo. | Read |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| R-001 | Risk | Rendering differences between machines (sharp/libvips builds) could fail a byte compare | Addressed by a pixel compare with a small tolerance (design D-2) |
| R-002 | Risk | That compliance clears automatically is visible only at the next upload | The release observes it (beta.6, on the founder's word) |

## Temporary diagnostics

`/tmp/sd594` (extracted PNGs), removed.
