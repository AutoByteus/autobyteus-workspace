# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code-review pass for AutoByteus macOS updater signing failure fix; API/E2E asked to validate signed release artifacts or record concrete blocker.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The current approved behavior is a macOS release-signing invariant, not a runtime updater workaround:

- The top-level `AutoByteus.app/Contents/MacOS/AutoByteus` executable must keep the app entitlement payload needed for Electron/runtime/network/server/audio behavior.
- Electron helper `.app` main executables may carry only their narrow helper entitlement profiles.
- Non-app nested Mach-O code, including `Squirrel.framework/Versions/A/Squirrel`, `Squirrel.framework/Versions/A/Resources/ShipIt`, framework binaries/libraries, `.dylib` files, `.node` native modules, and bundled server native binaries, must be signed with hardened runtime and no entitlement keys.
- `afterPack.ts` must not apply `build/entitlements.mac.plist` to server Mach-O binaries.
- GitHub `Desktop Release` macOS ARM64 and x64 jobs must run the macOS signing-policy verifier before artifact upload.
- API/E2E validation must use a pushed branch manual `Desktop Release` workflow dispatch with `publish_release=false` when repository permissions and signing credentials are available, or record a concrete permission/credential blocker.
- Already-broken installed apps may need one manual fixed-DMG install; no auto-update self-repair, Squirrel-only re-sign workaround, broad child entitlement inheritance, or post-notarization repair is in scope.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old broad child entitlement inheritance and duplicate server-native app-entitlement signing were removed, and `afterPack.ts` is narrowed to resource mode normalization only. Code review passed with no findings and explicitly left signed/notarized artifact proof to this stage.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Mac signing classifier for root app, Electron helper apps, and non-app nested code | Added | FR-MAC-SIGN-001 through FR-MAC-SIGN-005; design DS-001/DS-004; implementation added `build/scripts/macSigningPolicy.ts` | Execute focused policy tests; use signed artifact verifier for real bundle output. |
| Server native Mach-O signing in `afterPack.ts` with app entitlements | Removed | FR-MAC-SIGN-006; design removal/decommission plan; implementation narrowed `afterPack.ts` | Verify no stale test expects app entitlements on server binaries; prove bundled terminal/server runtime through existing workflow guards. |
| Broad `mac.entitlementsInherit: build/entitlements.mac.plist` | Removed | FR-MAC-SIGN-003; design dependency rules; code-review pass | Verify policy tests and real signed app contain no non-app entitlement payload. |
| Release verifier CLI | Added | FR-MAC-SIGN-007; AC-MAC-SIGN-004/005; implementation added `scripts/verify-macos-signing-policy.mjs` | Run CLI help locally, run it against known-broken installed app as a diagnostic probe, and rely on GitHub workflow run against fixed artifacts for final proof. |
| GitHub release workflow verifier gate before macOS artifact upload | Added | FR-MAC-SIGN-008; AC-MAC-SIGN-011; design DS-003/DS-006 | Manually dispatch `Desktop Release` with `publish_release=false` after branch push; record run URL/result or blocker. |
| Updater runtime code path (`electron/updater/appUpdater.ts`) | Preserved | Requirements out of scope runtime signing repairs; design says runtime updater remains unchanged | Existing updater unit tests remain valid but do not prove signing layout; no durable updates planned. |
| One-time fixed-DMG recovery for already-broken installed apps | Preserved as documentation/delivery responsibility | FR-MAC-SIGN-010; AC-MAC-SIGN-012/013/014; code-review docs-impact verdict | Delivery must sync docs; API/E2E records no runtime compatibility path was added. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/__tests__/macSigningPolicy.spec.ts` | Policy classifies root app and root executable as entitlement-bearing, helper apps by narrow helper profile, and Squirrel/ShipIt/framework/dylib/native modules as `none`; mandatory updater paths include Squirrel and ShipIt. | FR-MAC-SIGN-001/002/003/004/005/007; AC-MAC-SIGN-001/002/004/005/008 | Still Valid | Newly added implementation coverage; code review reran and passed; assertions map directly to approved policy. | Execute in final local validation. |
| `scripts/verify-macos-signing-policy.mjs` | Executable verifier checks structural signature, rejects entitlement keys on non-app nested code, explicitly checks Squirrel/ShipIt, and checks root executable expected keys. | FR-MAC-SIGN-007/009; AC-MAC-SIGN-001/002/003/004/005/006/008 | Still Valid | New release gate reuses compiled policy/discovery; reviewer ran `--help` and known-broken app diagnostic successfully. | Run `--help`; run diagnostic against `/Applications/AutoByteus.app`; run in GitHub workflow for final proof. |
| `.github/workflows/release-desktop.yml` macOS ARM64 and x64 jobs | Build signed/notarized macOS artifacts; verify packaged terminal runtime; now run signing-policy verifier before artifact upload. | FR-MAC-SIGN-008/009/013; AC-MAC-SIGN-003/006/010/011/016 | Still Valid | Workflow is the approved real release environment; implementation inserted verifier steps before upload in both macOS jobs. | Commit/push branch and dispatch `Desktop Release` with `publish_release=false`. |
| `scripts/verify-packaged-terminal-runtime.mjs` as used by macOS workflow jobs | Verifies target `node-pty` native module/helper presence, execute bit, Darwin architecture, and spawn probe on matching host. | AC-MAC-SIGN-010; UC-MAC-SIGN-004 | Still Valid | Existing workflow guard remains relevant because server/native signing behavior changed and helper execute-bit normalization is preserved. | Let workflow execute in both macOS jobs; record result. |
| macOS workflow Prisma engine checks | Verify target Prisma engine/client native artifacts for ARM64 and x64. | AC-MAC-SIGN-010; UC-MAC-SIGN-004 | Still Valid | Existing workflow coverage exercises bundled server native runtime surface affected by no-entitlement signing. | Let workflow execute; record result. |
| `electron/updater/__tests__/appUpdater.spec.ts` | Runtime updater state machine, `quitAndInstall(false, true)` after download, and install error classification. | DS-002 preserved runtime updater path; recovery self-repair is out of scope. | Still Valid | Tests assert existing runtime behavior; implementation did not change runtime updater code and design forbids signing repair in runtime. | Optional/local unchanged-scope check only; not sufficient for signing proof. |
| `electron/updater/__tests__/appUpdateErrorClassifier.spec.ts` | Safe user-facing classification of update check/download/install errors. | AC-MAC-SIGN-013 support context; runtime UX not changed except possible delivery docs. | Still Valid | Test remains current; no implementation changes in error classifier. | No final execution required for signing-specific validation unless broader electron tests are run. |
| `components/app/__tests__/AppUpdateNotice.spec.ts` and `__tests__/app.spec.ts` updater notice coverage | UI rendering and controls for app update states. | Runtime updater UI preserved; user recovery docs belong to delivery. | Out Of Scope | This ticket does not change updater UI behavior. | No action. |
| Existing release metadata checks such as merged `latest-mac.yml` validation in `release-desktop.yml` | Ensure macOS ZIP metadata exists for updater. | Investigation found download/metadata was not the failure; still required for updater releases. | Still Valid | They remain in workflow and complement signing validation. | Let workflow execute where applicable. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `N/A` | `N/A` | No existing durable coverage asserting broad child app entitlements or server-native app-entitlement signing was found. | Code review found old behavior removed without stale tests. | `N/A` | `N/A` |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `N/A` | `N/A` | Existing implementation-added durable coverage and release verifier are adequate after code review. | `N/A` | No new repository-resident durable coverage is planned in API/E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `N/A` | `N/A` | `N/A` | No stale or inadequate durable coverage requiring edits was identified. | `N/A` |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `N/A` | `N/A` | No stale durable coverage found. | `N/A` |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `APIE2E-MAC-SIGN-LOCAL-001` | `pnpm transpile-build`; `pnpm exec vitest run scripts/__tests__/macSigningPolicy.spec.ts --run`; `node scripts/verify-macos-signing-policy.mjs --help`; `git diff --check` | Local policy/test/build-script readiness before CI validation. | These are command executions of existing durable artifacts, not new coverage. |
| `APIE2E-MAC-SIGN-LOCAL-002` | `node scripts/verify-macos-signing-policy.mjs --app /Applications/AutoByteus.app` on currently installed known-broken app | Verifier still detects the documented bad entitlement shape and names violations. | Diagnostic negative probe against local installed app; not the fixed artifact proof. |
| `APIE2E-MAC-SIGN-CI-001` | Commit/push branch and dispatch GitHub `Desktop Release` workflow with `publish_release=false` | Real macOS ARM64/x64 release jobs build signed/notarized artifacts, run terminal/native checks, run signing verifier before upload, and do not publish a release. | CI workflow run is the authoritative environment; no local harness should duplicate release signing secrets. |
| `APIE2E-MAC-SIGN-LOCAL-003` | If downloadable workflow artifacts are available, inspect produced app(s) locally with `codesign -d --entitlements :-`, `codesign --verify --deep --strict`, `spctl -a -vv --type execute`, and smoke where feasible. | Direct local evidence for Squirrel/ShipIt/root/helper and Gatekeeper on generated fixed artifacts. | Artifact download/smoke probes are task evidence; durable guard is the verifier/workflow. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full local Developer ID build/notarization outside GitHub Actions | Release signing secrets and intended build environment are in GitHub workflow; local keychain may not match release environment. | Local-only proof could be misleading. | Use GitHub workflow dispatch or record concrete credential/permission blocker. |
| True Squirrel update apply from broken source app to fixed target app | Already-broken source app may be AMFI-blocked before it can apply the update; requirement accepts one-time fixed-DMG recovery. | Future update apply cannot be fully proven until a fixed installed source app exists and a newer fixed target is available. | Delivery/release should document manual fixed-DMG recovery; future release can validate auto-update from fixed source. |
| Microphone capture UX smoke on packaged app | Requires interactive hardware/privacy permission flow not practical as a deterministic CI check. | Helper/app entitlement narrowing could affect runtime capability. | Use app/helper entitlement inspection and packaged app/CI smoke where possible; record residual if not exercised. |
| Gatekeeper `spctl` on GitHub-hosted artifacts | May not be meaningful inside CI before download/stapling context or may require local artifact retrieval. | Gatekeeper assessment evidence may be partial. | Attempt on downloaded artifacts if workflow artifacts are accessible; otherwise record concrete limitation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `N/A` | `N/A` | No ambiguity or reroute trigger identified before execution. | `N/A` |

## Execution Plan

1. Run implementation-local executable checks that support the coverage inventory: `pnpm transpile-build`, focused `macSigningPolicy` Vitest test, verifier `--help`, and `git diff --check`.
2. Run the verifier against the currently installed `/Applications/AutoByteus.app` as a negative diagnostic, expecting failure on the known broken `1.3.63` entitlement layout.
3. Commit and push the reviewed implementation plus this coverage investigation to `origin/codex/mac-arm64-updater-signing` if the branch is not already pushed.
4. Dispatch GitHub `Desktop Release` on branch `codex/mac-arm64-updater-signing` with `publish_release=false` and no release publishing inputs.
5. Monitor the workflow, collect run URL/conclusion, and inspect logs/artifacts as permissions allow. Confirm macOS ARM64 and x64 verifier steps ran before upload, or record exact failure/blocker.
6. If artifacts are downloadable, perform local fixed-artifact spot checks for Squirrel/ShipIt entitlements, root/helper entitlements, `codesign --verify --deep --strict`, and `spctl` where possible.
7. Write the canonical execution coverage report and hand off to `delivery_engineer` if no repository-resident durable coverage changes are made during API/E2E. If durable coverage changes become necessary, update this investigation and route back to `code_reviewer` after execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Existing durable coverage is valid. The required validation is execution of the reviewed policy tests/verifier and the pushed-branch `Desktop Release` workflow dispatch with `publish_release=false`, or a concrete credentials/permissions blocker.
