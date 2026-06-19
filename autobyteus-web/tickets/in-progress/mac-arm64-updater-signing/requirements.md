# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready / Approved by user on 2026-06-19.

## Goal / Problem Statement

AutoByteus macOS auto-update can download and stage an update but fail during install/apply on Apple Silicon because the already-installed source app launches its embedded Squirrel updater components from an invalid signing layout. The observed blocker is macOS AMFI rejecting `/Applications/AutoByteus.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel` with `has entitlements but is not a main binary`.

The fix must make future signed macOS release artifacts enforce a clear code-signing invariant:

- the top-level `AutoByteus.app` executable keeps the app entitlements it needs;
- Electron helper `.app` executables keep only the narrow helper entitlements they need;
- non-app nested Mach-O code, including Squirrel/ShipIt, framework executables/libraries, dylibs, `.node` native modules, and bundled server native binaries, must be signed with hardened runtime but no entitlement payload unless there is a specific app-bundle-main-executable reason.

The ticket must also explain why the problem became visible recently and document that already-installed apps with a broken Squirrel updater may need one manual fixed-DMG install before future auto-updates can work.

## Investigation Findings

- User-provided failure evidence shows the update to `1.3.63` downloaded/staged but install/apply failed; AMFI logged `Squirrel has entitlements but is not a main binary`.
- Local installed `/Applications/AutoByteus.app` is currently `1.3.63`, but both `Squirrel.framework/Versions/A/Squirrel` and `Squirrel.framework/Versions/A/Resources/ShipIt` still print the full app entitlement payload with `codesign -d --entitlements :-`.
- The staged ShipIt cache for `1.3.63` also contains the same entitlement payload on Squirrel and on bundled server native modules such as `node-pty`'s `pty.node`.
- `log show` on 2026-06-19 shows AMFI constraint violations not only for Squirrel but also for Electron Framework, ReactiveObjC, Mantle, Electron framework dylibs, and bundled server native modules. Squirrel is the update-install-critical symptom; the underlying signing invariant is broader.
- Current repo config sets `mac.entitlements` and `mac.entitlementsInherit` to the same `build/entitlements.mac.plist`. That causes app-level entitlements to be selected for child files in electron-builder's signing path.
- `build/scripts/afterPack.ts` separately signs bundled server Mach-O binaries with the same app entitlement file; this recently broadened the invalid entitlement payload to server native modules.
- Dependency source in `app-builder-lib@25.1.8` and `@electron/osx-sign@1.3.1` confirms child files are recursively discovered and signed with the per-file entitlements selected by electron-builder. The default API does not provide a simple path-specific "no entitlements" override once an entitlement file is selected.
- Official Electron/electron-builder/Apple guidance supports the same direction: macOS distribution builds should use hardened runtime/notarization, entitlements should be explicit exceptions for the executables that need them, and app/child entitlement policy should be separated instead of reusing one broad plist for every nested binary.
- Release/timeline evidence:
  - `b1c89884` (2026-02-26, first tag `v1.1.9`) introduced the mac build config with `entitlementsInherit: 'build/entitlements.mac.plist'` while mac target was still DMG-only.
  - `b6d8f711` (2026-02-27, first tag `v1.1.11`) added `electron-updater`, mac ZIP targets, and GitHub Releases updater metadata. This made Squirrel-based auto-update install/apply reachable.
  - `1e63398d` (2026-03-10, first tag `v1.2.36`) added `audio-input` to the same entitlement file, widening the payload but not creating the root bug.
  - `4e0ea798` (2026-06-18) and related release-workflow changes added/expanded server native signing/verification; these explain newly visible server native AMFI violations, not the original Squirrel inheritance bug.
  - Recent releases `v1.3.61`, `v1.3.62`, and `v1.3.63` were published on 2026-06-19 with macOS ZIP assets and `latest-mac.yml`, so the in-app update path was actively exercised in close succession.
- No evidence was found that the user clicked the wrong control, that the update download was missing, or that notarization itself was the primary failure.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Packaging Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: macOS signing currently treats child framework/library/native binaries as if they should inherit the top-level app entitlement payload, and `afterPack.ts` repeats the same policy for server native binaries. AMFI logs show this violates macOS runtime constraints for non-main nested code. The updater failure is caused when the source app's Squirrel updater code is one of the invalidly-entitled nested binaries.
- Requirement or scope impact: The change must not be a one-off Squirrel-only patch if broader non-main nested binaries remain invalidly signed. The fix needs an explicit signing policy boundary plus a verification gate that prevents publishing a macOS artifact with entitlement-bearing non-app nested Mach-O code.

## Recommendations

1. Treat this as a macOS signing-policy bug, not a user error, download error, or primary notarization issue.
2. Anchor the design in current macOS/Electron packaging best practice: distribution signing, hardened runtime, notarization, least-privilege entitlements, app/helper entitlement separation, and no post-notarization signature mutation.
3. Enforce a single signing classifier for macOS packaged code: app main executable, helper app main executable, and non-app nested Mach-O/bundle code must have different entitlement policy.
4. Avoid using `afterSign` as the primary repair point because electron-builder notarization is inside the mac sign path before the global `afterSign` hook; modifying signatures after notarization risks invalidating the artifact.
5. Use a pre-default-signing enforcement path, or an equivalent custom signing path, so no-entitlement nested code is already correctly signed before the top-level app is sealed and notarized.
6. Add a release verifier that scans the signed `.app` and fails on entitlement keys for non-allowlisted nested Mach-O code, with explicit checks for Squirrel and ShipIt.
7. Communicate the recovery limitation: affected installed Apple Silicon apps whose source Squirrel is already blocked may require one manual fixed-DMG install before subsequent auto-updates work.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Rationale: the user-visible failure is narrow, but the correct fix spans macOS signing policy, build hook ownership, release workflow validation, updater recovery guidance, and both arm64/x64 artifact verification.

## In-Scope Use Cases

- `UC-MAC-SIGN-001`: Release builder produces a macOS ARM64 app whose Squirrel updater components have no entitlement payload and can be launched by the update install/apply flow.
- `UC-MAC-SIGN-002`: Release builder produces a macOS x64 app with the same valid signing layout even though Intel previously appeared to tolerate the invalid layout.
- `UC-MAC-SIGN-003`: Release validation fails before upload if any non-app nested Mach-O code receives entitlement keys, including but not limited to Squirrel, ShipIt, Electron framework binaries/dylibs, and bundled server native modules.
- `UC-MAC-SIGN-004`: Top-level app and Electron helper app executables retain the entitlements required for Electron runtime behavior; the fix must not break app launch, renderer/GPU/helper execution, microphone capture, or bundled server runtime.
- `UC-MAC-SIGN-005`: Affected users who already installed a broken source app get a documented recovery path: install a fixed DMG once, verify Squirrel has no entitlements, then use future auto-updates normally.
- `UC-MAC-SIGN-006`: The ticket records the recent-onset explanation with commit/release dates so the team can distinguish the old latent Squirrel bug from recently broadened server-native signing changes.
- `UC-MAC-SIGN-007`: During API/E2E validation, the API/E2E engineer is explicitly allowed to commit and push the ticket branch, then manually trigger the GitHub desktop release workflow with publishing disabled to verify the macOS build and signing verifier succeed in GitHub Actions.

## Out of Scope

- Auto-repairing already-installed apps through the broken source app's own auto-updater.
- Replacing `electron-updater`/Squirrel with another update system.
- Changing Windows, Linux, Android, iOS, or server release behavior except where shared release workflow edits are needed to gate macOS artifacts.
- Re-signing already-published GitHub Release artifacts in place unless a later delivery/release decision explicitly chooses that operational path.
- Final API/E2E coverage decisions; downstream `api_e2e_engineer` owns durable coverage investigation and execution.
- Changing user-facing updater UX beyond any minimal recovery/error copy required by the implementation design.

## Functional Requirements

- `FR-MAC-SIGN-001`: The macOS build must encode an explicit signing policy that differentiates top-level app executable entitlements, Electron helper app executable entitlements, and non-app nested Mach-O/no-entitlement signing.
- `FR-MAC-SIGN-002`: `Squirrel.framework/Versions/A/Squirrel` and `Squirrel.framework/Versions/A/Resources/ShipIt` in signed release apps must be signed with hardened runtime and no entitlement keys.
- `FR-MAC-SIGN-003`: Non-app nested Mach-O code must not inherit the top-level app entitlement payload. This includes framework executables/libraries, `.dylib` files, `.node` native modules, bundled server native binaries, and updater helper binaries.
- `FR-MAC-SIGN-004`: Top-level `AutoByteus.app/Contents/MacOS/AutoByteus` must retain the app entitlement payload needed for Electron runtime, network behavior, bundled server behavior, and microphone capture.
- `FR-MAC-SIGN-005`: Electron helper `.app` main executables must retain only the narrow helper/runtime entitlements they need; they must not blindly inherit full app entitlements unless the design explicitly justifies each key.
- `FR-MAC-SIGN-006`: Existing server-native signing in `afterPack.ts` must stop applying `build/entitlements.mac.plist` to server Mach-O binaries.
- `FR-MAC-SIGN-007`: The release build must include a deterministic macOS signing verifier that scans a packaged `.app`, reports entitlement-bearing non-allowlisted paths, and exits non-zero on violation.
- `FR-MAC-SIGN-008`: GitHub desktop release macOS ARM64 and x64 jobs must run the signing verifier before uploading macOS artifacts.
- `FR-MAC-SIGN-009`: The fix must preserve normal code-signing, strict verification, Gatekeeper assessment expectations, and notarization/stapling behavior for release artifacts.
- `FR-MAC-SIGN-010`: The ticket must document the affected-user recovery limitation and manual fixed-DMG recovery path.
- `FR-MAC-SIGN-011`: The ticket must document the recent-onset timeline and identify which recent commits widened AMFI visibility versus which older commits introduced the updater-critical signing bug.
- `FR-MAC-SIGN-012`: The design must explicitly follow current macOS/Electron packaging best practice: least-privilege entitlements by executable role, hardened runtime, notarization after final signatures, and release-time verification of the signed bundle shape.
- `FR-MAC-SIGN-013`: API/E2E validation must include, when credentials and repository permissions are available, a pushed branch run of the GitHub `Desktop Release` workflow through manual dispatch with `publish_release=false`, so the fix is validated in the same macOS GitHub Actions build environment that produces release artifacts without publishing them.

## Acceptance Criteria

- `AC-MAC-SIGN-001`: In a signed fixed macOS ARM64 app, `codesign -d --entitlements :- AutoByteus.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel` produces no `<key>...</key>` entitlement entries.
- `AC-MAC-SIGN-002`: In a signed fixed macOS ARM64 app, `codesign -d --entitlements :- AutoByteus.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt` produces no `<key>...</key>` entitlement entries.
- `AC-MAC-SIGN-003`: The same Squirrel and ShipIt no-entitlement checks pass for the signed macOS x64 app.
- `AC-MAC-SIGN-004`: The verifier fails if a non-app nested Mach-O code path has entitlement keys; the failure output names each violating path and includes Squirrel/ShipIt as explicit checked paths.
- `AC-MAC-SIGN-005`: The verifier allowlist is explicit and limited to top-level `AutoByteus.app/Contents/MacOS/AutoByteus` and main executables inside nested `.app/Contents/MacOS/` helper app bundles that are intentionally entitled.
- `AC-MAC-SIGN-006`: A signed fixed app passes `codesign --verify --deep --strict --verbose=2 AutoByteus.app` on macOS after the signing policy is applied.
- `AC-MAC-SIGN-007`: A signed fixed app passes `spctl -a -vv --type execute AutoByteus.app` or the implementation handoff records a concrete environment reason if Gatekeeper assessment cannot be executed locally.
- `AC-MAC-SIGN-008`: The top-level app executable still shows the expected app entitlement keys, including the keys currently needed for Electron runtime/network/audio behavior.
- `AC-MAC-SIGN-009`: Electron helper app executables launch as part of normal packaged app smoke validation; renderer/GPU/helper execution is not broken by the entitlement split.
- `AC-MAC-SIGN-010`: Bundled server native runtime checks still pass in the macOS release workflow after server Mach-O signing stops using app entitlements.
- `AC-MAC-SIGN-011`: The desktop release workflow runs the macOS signing verifier in both macOS build jobs before artifact upload.
- `AC-MAC-SIGN-012`: Investigation/handoff notes clearly state that already-broken installed Apple Silicon apps may need a one-time manual fixed-DMG install because the old source app's Squirrel helper must run before any auto-update can replace it.
- `AC-MAC-SIGN-013`: Investigation/handoff notes clearly state that the bug is not caused by the user choosing the wrong install action and not by a missing ZIP download.
- `AC-MAC-SIGN-014`: The recent-onset explanation includes the concrete dates and tags for `b1c89884` / `v1.1.9`, `b6d8f711` / `v1.1.11`, `1e63398d` / `v1.2.36`, and the 2026-06-18/2026-06-19 release-signing/release-activity observations.
- `AC-MAC-SIGN-015`: The design spec references the official macOS/Electron packaging baseline and explains any deliberate deviation from that baseline before architecture review.
- `AC-MAC-SIGN-016`: The API/E2E execution handoff records either a successful manual GitHub `Desktop Release` workflow run for the pushed ticket branch with `publish_release=false`, or a concrete environment/permission blocker if the run cannot be triggered.

## Constraints / Dependencies

- Release-signing validation requires macOS and Apple Developer signing identity/secrets for final proof.
- The signing change must work with `electron-builder@25.1.8`, `@electron/osx-sign@1.3.1`, `electron-updater@6.8.3`, and Electron `38.1.2` as currently declared.
- `electron-builder`'s normal `mac.entitlementsInherit` mechanism is too coarse for this policy because it applies to child files broadly; implementation must either avoid that broad inheritance for non-app nested code or override it with a safe custom/pre-signing path.
- The release verifier should rely on local macOS tools (`codesign`, `file`, and normal filesystem traversal) rather than network access.
- Do not create `workflow-state.md` or downstream implementation/test/delivery artifacts from the solution-designer role.
- The API/E2E engineer may commit and push the ticket branch and trigger manual GitHub Actions workflow dispatch for validation; this permission is specific to the downstream validation stage and does not move implementation or release ownership into the solution-designer role.

## Assumptions

- Squirrel/ShipIt should not need app-level entitlements to apply updates; they should be signed and hardened but entitlement-free.
- The top-level app and Electron helper `.app` executables are the only intended entitlement-bearing main executables in the macOS bundle unless implementation discovers a specific additional app-bundle main executable with a justified entitlement need.
- A fixed DMG install replaces the source app with a corrected Squirrel/ShipIt signing layout, enabling future updates from that fixed source app.
- Existing Intel success does not prove the signing layout is valid; x64 must be fixed and verified too.

## Risks / Open Questions

- The exact implementation mechanism must preserve signing order: nested code first, containing bundles/frameworks next, top-level app last, then notarization. Incorrect use of `afterSign` may invalidate notarization or app sealing.
- The verifier may initially expose additional non-app Mach-O files with entitlements beyond Squirrel; these should be fixed under the same signing policy rather than allowlisted casually.
- Electron helper entitlements may need careful narrowing to avoid breaking renderer/GPU/helper runtime on Apple Silicon.
- If published artifacts remain broken, affected users may keep failing auto-update until they manually install a fixed artifact.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Case(s) |
| --- | --- |
| `FR-MAC-SIGN-001` | `UC-MAC-SIGN-001`, `UC-MAC-SIGN-002`, `UC-MAC-SIGN-003`, `UC-MAC-SIGN-004` |
| `FR-MAC-SIGN-002` | `UC-MAC-SIGN-001`, `UC-MAC-SIGN-002` |
| `FR-MAC-SIGN-003` | `UC-MAC-SIGN-001`, `UC-MAC-SIGN-002`, `UC-MAC-SIGN-003` |
| `FR-MAC-SIGN-004` | `UC-MAC-SIGN-004` |
| `FR-MAC-SIGN-005` | `UC-MAC-SIGN-004` |
| `FR-MAC-SIGN-006` | `UC-MAC-SIGN-003`, `UC-MAC-SIGN-004` |
| `FR-MAC-SIGN-007` | `UC-MAC-SIGN-003` |
| `FR-MAC-SIGN-008` | `UC-MAC-SIGN-003` |
| `FR-MAC-SIGN-009` | `UC-MAC-SIGN-001`, `UC-MAC-SIGN-002`, `UC-MAC-SIGN-004` |
| `FR-MAC-SIGN-010` | `UC-MAC-SIGN-005` |
| `FR-MAC-SIGN-011` | `UC-MAC-SIGN-006` |
| `FR-MAC-SIGN-012` | `UC-MAC-SIGN-001`, `UC-MAC-SIGN-002`, `UC-MAC-SIGN-003`, `UC-MAC-SIGN-004` |
| `FR-MAC-SIGN-013` | `UC-MAC-SIGN-007` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-MAC-SIGN-001` | Proves the observed ARM64 Squirrel AMFI blocker is absent in the fixed source app. |
| `AC-MAC-SIGN-002` | Proves the ShipIt updater executable follows the same no-entitlement invariant. |
| `AC-MAC-SIGN-003` | Ensures Intel artifacts are corrected even if previous Intel machines tolerated the bug. |
| `AC-MAC-SIGN-004` | Prevents recurrence on any non-app nested Mach-O path, not only the reported Squirrel path. |
| `AC-MAC-SIGN-005` | Prevents broad allowlists from hiding the same packaging bug. |
| `AC-MAC-SIGN-006` | Ensures the corrected signing layout is still structurally valid. |
| `AC-MAC-SIGN-007` | Ensures Gatekeeper execute assessment remains healthy after the signing change. |
| `AC-MAC-SIGN-008` | Protects top-level app runtime requirements from over-correction. |
| `AC-MAC-SIGN-009` | Protects Electron helper/runtime behavior from over-correction. |
| `AC-MAC-SIGN-010` | Protects bundled server native runtime behavior while removing invalid server-native entitlements. |
| `AC-MAC-SIGN-011` | Makes the release pipeline enforce the invariant before publishing. |
| `AC-MAC-SIGN-012` | Sets correct expectations for already affected Apple Silicon installations. |
| `AC-MAC-SIGN-013` | Captures the root-cause conclusion for support and delivery. |
| `AC-MAC-SIGN-014` | Captures the recent-onset explanation with concrete historical evidence. |
| `AC-MAC-SIGN-015` | Ensures the design is reviewed against current official macOS/Electron packaging practice, not a one-off workaround. |
| `AC-MAC-SIGN-016` | Ensures downstream validation proves the fix in the real GitHub macOS release build environment or records a concrete blocker. |

## Approval Status

Approved by user on 2026-06-19, including the added downstream API/E2E permission to commit/push the ticket branch and manually trigger the GitHub desktop release workflow with publishing disabled for build validation.
