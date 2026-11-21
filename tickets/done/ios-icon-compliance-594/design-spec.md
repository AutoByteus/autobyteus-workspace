# Design Spec

## Solution And Approval Basis

- Current SR: `SR-001`.
- Approved requirements: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-21).
- User approval of the design: `Not required`.
- Design status: `Ready`.
- Investigation notes: `investigation-notes.md`.
- Authorities read (2026-11-21): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rule 12: a workflow change needs the build-only release run).
- Conflicts: none.

## Current-State Read

- The iOS icon set is 18 hand-made PNGs with no source and no check (S-01, S-02).
- The canonical logo is `autobyteus-web/public/autobyteus-icon.svg`, which the desktop icon generator already renders with sharp (S-03). Android uses the same mark on full brand blue (S-04).
- The iOS Info.plist has no export-compliance key (S-09).
- The iOS contract check (`autobyteus-ios/scripts/ios-release-contract-check.py`) guards the release wiring and runs in the iOS build job.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`.
  - One new generator script with two package scripts.
  - 18 regenerated PNGs.
  - Info.plist (one key).
  - The contract check (icon structure and the compliance key).
  - One workflow step.
  - Docs: TESTING.md rerun-by-impact and the iOS README.
- Architectural risk: `Low`.
  - Build-time assets and one Info.plist declaration, in existing owners.
  - No runtime, contract, persistence or security change.
  - The workflow change is proven by a build-only run (rule 12).
- Escalation trigger: if the pixel check cannot be made stable between local and CI renders within the tolerance, implementation returns a `Design Impact` with the measured differences.

## Intended Change

Generate the iOS app icon set from the canonical logo, guard it with a check in the release workflow, and declare `ITSAppUsesNonExemptEncryption` = false.

## Change Scope (Mandatory)

- **In scope:** UC-001…003.
  - New `autobyteus-web/scripts/build-ios-app-icon.mjs`.
  - `autobyteus-web/package.json`: scripts `ios-icon:build` and `ios-icon:check`.
  - `autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset/*.png` (regenerated; `Contents.json` unchanged).
  - `autobyteus-ios/AutoByteusMobile/Info.plist`.
  - `autobyteus-ios/scripts/ios-release-contract-check.py`.
  - `.github/workflows/release-ios.yml`: one step in `build-ios`.
  - `TESTING.md` (a rerun-by-impact row).
  - `autobyteus-ios/README.md` (how the icon is made; the compliance key).
- **Derived consumers:** the asset catalog compile (unchanged slots).
- **Deliberately left alone:**
  - the desktop and Android icons and `generateIcons.ts`;
  - the share extension's Info.plist: App Store Connect reads the key from the app bundle;
  - icon appearance variants (dark/tinted).
- **Follow-ups:** none so far.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Change | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, 002 / AC-001 | install/update | new PNGs | DS-001 |
| BEH-002 | REQ-003 / AC-002, 003 | logo change, release run | generator and check | DS-001, DS-002 |
| BEH-003 | REQ-004 / AC-004 | upload | Info.plist key | DS-003 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (assets) plus `Cleanup`.
- Current design issue found: `Yes`. Derived assets have no generator, so they drifted to a placeholder.
- **Structural triggers:**
  - **Capability-area reuse (Principle 4):** product-icon generation from the canonical SVG already lives in the web package (`generateIcons.ts`, `build-icon-bundle.mjs --check`, sharp).
    - **Response:** the iOS generator lives beside them in `autobyteus-web/scripts/`, reading the same SVG.
    - **Rejected alternative:** an `autobyteus-ios` script that reaches into web's `node_modules` for sharp. iOS is not a pnpm workspace package, and that is a hidden dependency.
  - **Derived data (Principle 11):** the brand blue is read from the SVG's circle fill, not written again in the script, so the SVG stays the one source of the mark and the color.
  - Ruled out: persisted data, interfaces and runtime owners (none).
- Deviations: none.
- Root cause: `Missing Invariant`. Nothing enforced "the icon set is derived from the logo".
- Refactor needed now: `No`, beyond adding the generator and check.

### Decisions

- **D-1 Generator** (`build-ios-app-icon.mjs`, Node ESM, sharp via the web package):
  - **Source:** `public/autobyteus-icon.svg`. The background color is the `<circle>`'s `fill`; fail if absent.
  - **Render:** at each slot's pixel size (`size × scale` from `Contents.json`), render the SVG to that square with sharp (`density` high enough for crisp output), flatten onto the background color, remove alpha, and write an 8-bit RGB PNG to the slot's `filename`.
    - The circle has the background's own color, so it disappears, and the mark keeps the desktop render's proportions (DEC-001).
    - For the 1024 slot and all others, render from the SVG directly, not by downscaling one PNG.
  - **Default mode:** write all slots, then print each file and size.
  - **`--check` mode:** render in memory and compare. For each slot it fails with the slot named and a reason when:
    - (a) the file is missing;
    - (b) the decoded size differs from size × scale;
    - (c) the file has an alpha channel;
    - (d) the raw RGB pixels differ from the render beyond the tolerance. Default: max channel difference ≤ 8 and mean absolute difference ≤ 0.5. Implementation measures the real local-versus-CI difference and states the final numbers with that evidence.
  - Exit 1 on any failure.
- **D-2 Package scripts:** `ios-icon:build` and `ios-icon:check` in `autobyteus-web/package.json`, the same pattern as `icons:build` / `icons:check`.
- **D-3 Contract check (Python, stdlib)**, so it runs without node:
  - every `Contents.json` image has a `filename` that exists;
  - each PNG's IHDR width and height equal size × scale;
  - color type is 2 (RGB, no alpha) and no `tRNS` chunk is present;
  - `AutoByteusMobile/Info.plist` has `ITSAppUsesNonExemptEncryption` = false (read with `plistlib`);
  - the workflow's `build-ios` job runs `ios-icon:check` before the Xcode build.
- **D-4 Workflow:** in `build-ios`, after "Install workspace dependencies", add a step "Check the app icon against the logo" running `pnpm --dir autobyteus-web ios-icon:check`.
- **D-5 Info.plist:** add `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `AutoByteusMobile/Info.plist` (DEC-002). Place it beside ATS, with no comment in the plist; the reasoning lives in the README, citing these notes.
- **D-6 Docs:**
  - TESTING.md rerun-by-impact: changes to `autobyteus-icon.svg` or `AppIcon.appiconset/` → `pnpm --dir autobyteus-web ios-icon:check`, plus the contract check.
  - The iOS README: "the icon is generated: `ios-icon:build`"; the export-compliance declaration and the condition that would change it (adding non-OS, non-authentication encryption).

## Terminology

- **Product mark:** the green figure in `autobyteus-icon.svg`.
- **Brand blue:** its circle's fill, #1E3A8A.

## Legacy Removal Policy (Mandatory)

- Removed: the placeholder PNGs (replaced by generated ones).
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory / Primary Execution Spine(s)

| Spine | Path |
| --- | --- |
| DS-001 | `autobyteus-icon.svg → build-ios-app-icon.mjs (sharp) → AppIcon.appiconset PNGs → Xcode asset catalog → app bundle icon` |
| DS-002 | `release-ios.yml build-ios → pnpm install → ios-icon:check → contract check → xcodebuild` |
| DS-003 | `Info.plist ITSAppUsesNonExemptEncryption → built app → App Store Connect upload → compliance answered` |

## Spine Narratives (Mandatory)

- **DS-001:** the logo is drawn once, and the iOS icons are made from it.
- **DS-002:** a release refuses to build when the icons no longer come from the logo.
- **DS-003:** the upload carries the compliance answer.

## Ownership Map / Boundaries

- The web package owns the logo and its derived images: desktop, the icon bundle, and now the iOS set.
- The iOS contract check owns the iOS release-structure rules.
- The workflow orders the checks.
- No process-wide bindings.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| 18 placeholder PNGs | Not the product logo | generated PNGs |
| Remote branch `codex/autobyteus-592-ios-product-icon` | Superseded (DEC-003) | this change; deleted by delivery |

## Off-Spine / Interfaces / Naming / Reuse

| Item | Note |
| --- | --- |
| `build-ios-app-icon.mjs` (`--check`) | Owns a rule (render plus compare), not a forwarder; named like `build-icon-bundle.mjs` |
| Reuse | sharp and the generator-plus-check pattern from the web package |

## Shared Structure Tightness

N/A.

## Final File Responsibility Mapping

As Change Scope. One concern per file.

## Folder Boundary Check

`autobyteus-web/scripts/` holds build tooling. The output path crosses into `autobyteus-ios`, the same way `prepare-demo-web.sh` copies web output into iOS. This is documented in the script header.

## Concrete Examples

| Good | Avoided |
| --- | --- |
| `pnpm --dir autobyteus-web ios-icon:check` → "AppIcon-ipad-76x76@2x.png: pixels differ from autobyteus-icon.svg (max 41, mean 3.2); run ios-icon:build" | Hand-edited PNGs; a byte compare that fails on harmless encoder differences |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the placeholder until a "design pass" | Rejected: the Task and the founder want the product logo now |

## Change / Refactor Sequence

1. Write the generator and package scripts; run `ios-icon:build`. Compare the 1024 visually with the desktop icon and the 592 branch's PNG (save both as evidence).
2. Run `ios-icon:check`, then the four negative cases of AC-002 (restore after each).
3. Add the Info.plist key and extend the contract check; run it positive and negative (AC-004).
4. Add the workflow step and the docs.
5. Run the core tests and a local simulator build. Check the asset-catalog warnings and the built product's Info.plist with `plutil -p`.
6. Push the branch and run the build-only `release-ios.yml` dispatch (`publish_app_store_connect=false`); AC-003. Measure the local-versus-CI pixel difference reported by the check.

## Key Tradeoffs

- **Pixel tolerance versus byte equality:** tolerance avoids false failures from encoder or libvips differences while still catching any real drift.
- **The generator lives in `autobyteus-web`, not in iOS:** that is where sharp and the logo already are.

## Risks

R-001, R-002 (investigation notes).

## Guidance For Implementation

- Reproduction: the current `AppIcon-1024.png` shows the placeholder (S-02). After `ios-icon:build` it must show the mark on #1E3A8A.
- No upload, tag or release. Delivery deletes the remote branch `codex/autobyteus-592-ios-product-icon`.
