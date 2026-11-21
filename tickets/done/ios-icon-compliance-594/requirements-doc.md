# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `ios-icon-compliance-594`
- Request / ticket: autobyteus-594 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; related autobyteus-592)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The founder prioritized it: fix it cleanly on `origin/personal` for all future iOS releases.
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Approved by and reference: Solution Designer within the direction (user informed in this conversation, 2026-11-21)
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:** every iOS build has two problems:
  1. it ships a placeholder icon (a hexagon of nodes on a blue circle), not the AutoByteus product logo the desktop app and the Android app use;
  2. it declares nothing about encryption, so App Store Connect marks each upload "Missing Compliance" until the founder answers by hand.
- **Desired outcome:**
  - every iOS build carries the product logo, generated from the one canonical logo source, and a check fails when the icons drift from it;
  - the app declares its export-compliance status accurately, so uploads clear compliance on their own.
- **Observable definition of success:** AC-001…AC-005.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User | Home screen, Settings and the App Store show the placeholder (`AppIcon.appiconset/AppIcon-1024.png`, unchanged since 2026-06-06). The desktop app's icon is generated from `autobyteus-web/public/autobyteus-icon.svg` (`build/scripts/generateIcons.ts`). Android's launcher icon is the same mark on a full #1E3A8A background (`ic_launcher_background.xml`, `ic_launcher_foreground.xml`). | The iOS icon is the product mark on a full #1E3A8A background, like Android, rendered from `autobyteus-icon.svg`, in all 18 slots of `Contents.json`: exact pixel sizes, opaque, no alpha. | The slot list and file names in `Contents.json`. |
| BEH-002 | Operational | The 18 PNGs are hand-made files with no generator and no check. Branch `codex/autobyteus-592-ios-product-icon` (`7ec960320a`) holds 18 re-rendered PNGs, also without a generator. | One generator writes the set from the canonical SVG, and a check fails when the committed set differs from what the generator makes or breaks Apple's slot rules. The check runs locally and in the iOS release workflow. | — |
| BEH-003 | Contract | `AutoByteusMobile/Info.plist` has no `ITSAppUsesNonExemptEncryption`, and App Store Connect asks on every build. | `ITSAppUsesNonExemptEncryption` = `false` in the app's Info.plist (DEC-002). The contract check requires it. | The rest of the Info.plist, including ATS (`NSAllowsArbitraryLoadsInWebContent`). |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case |
| --- | --- |
| UC-001 | The user sees the product logo as the app icon on iPhone and iPad |
| UC-002 | A logo or icon-set change that drifts is caught before release |
| UC-003 | A TestFlight/App Store upload clears export compliance without a manual answer |

### Out Of Scope

- The desktop and Android icons. They are already the product logo.
- In-app logos.
- App Store listing artwork.
- Submitting to App Store review or replying to Apple (autobyteus-592, on the founder's word).
- A release (beta.6 waits for the founder's word).

### Non-Goals

- A new logo design.
- Dark or tinted iOS 18+ icon variants. The current set has none, and adding them is a separate design decision.

### Preserved Behavior Boundary

The preserved column of BEH-001…003. The app's behavior is unchanged.

### Prerequisites

None.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | The iOS app icon is the AutoByteus product mark from `autobyteus-web/public/autobyteus-icon.svg`, centered on a full square of the logo's own background color (#1E3A8A), at the desktop render's proportions, in every `Contents.json` slot. | BEH-001 | Must | Task scope 1; DEC-001 |
| REQ-002 | Every icon PNG has the slot's exact pixel size (size × scale) and no alpha channel. | BEH-001 | Must | Apple's App Icon rules (1024 marketing icon opaque, no alpha) |
| REQ-003 | One repeatable command regenerates the whole set from the SVG. One check command fails when a committed PNG differs from the generated one beyond a stated rendering tolerance, when a slot is missing, or on a wrong size or alpha. The check runs in the iOS release workflow, before the build. | BEH-002 | Must | Task scope 1 |
| REQ-004 | The app's Info.plist declares `ITSAppUsesNonExemptEncryption` = `false`, and the iOS contract check fails without it. | BEH-003 | Must | Task scope 2; DEC-002 |
| REQ-005 | The temporary branch `codex/autobyteus-592-ios-product-icon` is deleted once this is merged. | — | Must | Task |

## Acceptance Criteria

| AC ID | REQ | Trigger | Observable Outcome | Verification Intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 002 | The committed set | All 18 files are present with exact sizes and no alpha (`sips -g pixelWidth -g hasAlpha`). The 1024 icon shows the product mark on #1E3A8A, matching the desktop icon's mark. | Contract check; visual comparison with the desktop `icon.icns`, saved as evidence |
| AC-002 | REQ-003 | Generate, then check | The check passes on the committed set. It fails on (a) a changed pixel in one PNG, (b) a deleted slot file, (c) an alpha PNG, (d) a changed SVG without regeneration. | Local runs, logged |
| AC-003 | REQ-003 | Build-only iOS release run (`publish_app_store_connect=false`) | The icon check step passes; build, core tests and smoke pass; asset-catalog compilation is clean (no AppIcon warnings in the log); publish jobs are skipped. | GitHub run (DESIGN.md rule 12) |
| AC-004 | REQ-004 | Contract check; built app | The check passes. It fails when the key is removed. The built `AutoByteus.app/Info.plist` contains `ITSAppUsesNonExemptEncryption` = false. | Local check plus `plutil -p` on the built product |
| AC-005 | REQ-005 | Delivery | `git ls-remote origin refs/heads/codex/autobyteus-592-ios-product-icon` is empty | Delivery cleanup |

Proof feasibility: AC-001…004 run locally (Xcode 26.1.1) and on GitHub's `xcode-27` runner. That App Store Connect no longer shows "Missing Compliance" is visible only after the next founder-approved upload (beta.6). It is not an AC of this ticket; it is the release's observation.

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Trigger | Expected Outcome | Validity |
| --- | --- | --- | --- | --- |
| SCN-001 | User | Install or update the app from TestFlight or the App Store | The product logo on the home screen and in the store | Supported Normal Scenario |
| SCN-002 | Operational | A logo change, or an edited PNG, then a release run | The check fails until the set is regenerated | Supported Normal Scenario |
| SCN-003 | Contract | An upload to App Store Connect | The compliance answer comes from Info.plist | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, for the icon only.
- The normative visual is the desktop app's own icon (`autobyteus-icon.svg`) with Android's full-background composition.
- There is no Product UI/UX package: the logo already exists and is not being redesigned.

## Data Continuity

Persisted data affected: `No`.

## External Contracts

| Contract | Constraint | Evidence |
| --- | --- | --- |
| Apple App Icon (asset catalog) | Exact sizes per slot; the 1024 marketing icon opaque, without alpha | Apple Human Interface Guidelines / asset-catalog rules |
| Apple export compliance (`ITSAppUsesNonExemptEncryption`) | `false` declares that the app has no non-exempt encryption: none, encryption only through Apple's OS, or exempt uses such as authentication | Apple "Complying with Encryption Export Regulations"; U.S. EAR Cat. 5 Pt. 2 |

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | What composition does the iOS icon use? | iOS masks icons to a rounded square, so a circle on a square background would look like a badge. Android, the product's other phone app, already uses the full #1E3A8A background with the mark centered. The 592 branch made the same choice at the desktop render's scale, which keeps the mark inside the rounded corners: about 24 px of inset at the dots' height on a 1024 canvas. **Decided:** the full background, the desktop render's proportions, the mark and color taken from the canonical SVG. | Solution Designer | Decided |
| DEC-002 | Is `false` accurate? | Evidence (investigation notes S-05…S-08):<br>- **Native code:** it uses no crypto API (no CryptoKit, CommonCrypto, Security, SecKey or SecItem) and has no third-party package; it networks only through WKWebView (OS TLS).<br>- **The bundled demo web build:** it uses crypto-js only for SHA-256 hashing. Its noVNC 1.7.0 VNC client uses crypto only to authenticate: DES (VNC password), DH plus AES (Apple Remote Desktop credentials), RSA plus AES (RA2ne, RealVNC's "no encryption" variant), MS-Logon II. AES runs through WebCrypto (the OS). noVNC offers no type that encrypts the session; TLS is the browser's, via the OS.<br>So all encryption is either Apple-OS-provided or limited to authentication, both exempt.<br>**Decided:** `false`. The founder is told; it is a declaration on his account, so he can veto it before the next upload. | Solution Designer | Decided (user informed) |
| DEC-003 | Adopt the 592 branch's PNGs or regenerate? | The branch has no generator, and its CI run 44892450384 ran on `personal`, not on the branch. **Decided:** regenerate with the new generator. The branch's PNGs are only a visual reference; the generated set should match them within the tolerance. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001, 002 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-005 | — | — | AC-005 | — |

## Readiness Check

Content ready: `Yes`. Approved within the direction, with the founder informed (DEC-002 called out). Ready for design: `Yes`.
