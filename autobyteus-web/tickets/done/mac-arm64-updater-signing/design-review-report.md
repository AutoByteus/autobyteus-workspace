# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for approved macOS updater signing requirements.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the requirements, investigation notes, design spec, current `autobyteus-web/build/scripts/build.ts`, `autobyteus-web/build/scripts/afterPack.ts`, root `.github/workflows/release-desktop.yml`, current entitlement plist, local `app-builder-lib@25.1.8` / `@electron/osx-sign@1.3.1` sources, and current electron-builder documentation for macOS target/custom signing/notarization options.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of solution-designer package | N/A | None | Pass | Yes | Design is actionable and addresses the full bundle signing invariant rather than the Squirrel symptom only. |

## Reviewed Design Spec

The design introduces a single authoritative macOS signing policy/classifier, a pre-notarization custom signing adapter, role-specific app/helper entitlement profiles, no-entitlement hardened-runtime signing for non-app nested code, removal of duplicate server-native app-entitlement signing from `afterPack.ts`, and a release verifier run in both macOS release jobs before artifact upload. Runtime updater code remains out of signing ownership, and affected-user recovery is handled through documentation/manual fixed-DMG guidance.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as Bug Fix / Packaging Behavior Change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design names Missing Invariant / Boundary Or Ownership Issue and ties it to `entitlementsInherit`, `afterPack.ts` server signing, installed/staged app probes, and AMFI logs. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now and explains why Squirrel-only repair would leave the invariant broken. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, final file mapping, dependency rules, and migration sequence all implement the refactor; published broken artifacts are deferred to recovery documentation. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Release build -> signed/notarized artifacts | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Installed app update install/apply | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | GitHub macOS build -> artifact upload gate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Signing adapter bounded local sequence | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Verifier bounded local sequence | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Manual workflow validation result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| macOS Desktop Build/Signing | Pass | Pass | Pass | Pass | New policy/adapter belongs with build scripts; this is the correct owner for package-time signing invariants. |
| Packaged Resource Preparation | Pass | Pass | Pass | Pass | `afterPack.ts` is correctly narrowed back to resource normalization only. |
| Release Verification Scripts | Pass | Pass | Pass | Pass | A repo script is a suitable verifier boundary for local and CI execution. |
| Desktop Release Workflow | Pass | Pass | Pass | Pass | Workflow remains a caller/gate, not a policy owner. |
| Updater Runtime | Pass | Pass | Pass | Pass | Runtime remains unchanged except possible minimal messaging; no signing repair leakage. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Signing subject classification | Pass | Pass | Pass | Pass | Shared `MacSigningPolicy` is the key architectural control point. |
| Codesign invocation options | Pass | Pass | Pass | Pass | `MacCodeSignCommand` is a focused command adapter, not a policy owner. |
| Entitlement profile IDs | Pass | Pass | Pass | Pass | Policy-owned profile IDs prevent parallel CI allowlists. |
| Verifier violation records | Pass | Pass | Pass | Pass | Shape is narrow and diagnostic without making command output the model. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MacSigningSubject` | Pass | Pass | Pass | Pass | Pass | Proposed fields are narrow enough for signer/verifier classification. |
| `EntitlementProfile` | Pass | Pass | Pass | Pass | Pass | Explicit profile IDs avoid generic boolean-only policy. |
| Verifier violation record | Pass | Pass | Pass | N/A | Pass | Path, observed keys, expected profile, and reason are sufficient. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Broad `mac.entitlementsInherit` using app entitlements | Pass | Pass | Pass | Pass | Replacement is policy-backed helper/no-entitlement classification. |
| Server-native app-entitlement signing in `afterPack.ts` | Pass | Pass | Pass | Pass | Replacement is adapter-managed no-entitlement signing. |
| Squirrel-only or post-notarization repair workaround | Pass | Pass | Pass | Pass | Correctly rejected because it hides the broader invariant and risks seal/notarization validity. |
| Divergent verifier allowlist | Pass | Pass | Pass | Pass | Replacement is role-based allowlist derived from `MacSigningPolicy`. |
| Auto-update self-repair assumption | Pass | Pass | Pass | Pass | Correctly handled as manual fixed-DMG recovery documentation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/macSigningPolicy.ts` | Pass | Pass | Pass | Pass | Authoritative classifier/entitlement profile owner. |
| `autobyteus-web/build/scripts/macSign.ts` | Pass | Pass | Pass | Pass | Signing lifecycle owner; must not duplicate entitlement exceptions outside policy. |
| `autobyteus-web/build/scripts/macCodeSign.ts` | Pass | Pass | Pass | Pass | Command construction/error propagation only. |
| `autobyteus-web/build/scripts/afterPack.ts` | Pass | Pass | Pass | Pass | Demoted to resource normalization; no signing loop. |
| `autobyteus-web/build/scripts/build.ts` | Pass | Pass | Pass | Pass | Build config wrapper only. |
| `autobyteus-web/build/entitlements.mac*.plist` | Pass | Pass | N/A | Pass | Entitlement data files are role-specific resources. |
| `autobyteus-web/scripts/verify-macos-signing-policy.mjs` | Pass | Pass | Pass | Pass | Verifier CLI boundary. |
| `.github/workflows/release-desktop.yml` | Pass | Pass | N/A | Pass | Invokes verifier before upload; does not own policy. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MacSigningPolicy` | Pass | Pass | Pass | Pass | Signer/verifier depend on policy; policy does not depend on shell execution. |
| `MacSignAdapter` | Pass | Pass | Pass | Pass | Depends on policy and command adapter; rejects `afterSign` repair. |
| `MacSigningVerifier` | Pass | Pass | Pass | Pass | Depends on policy; workflow cannot inline its own allowlist. |
| `afterPack.ts` | Pass | Pass | Pass | Pass | Cannot sign or choose entitlements. |
| `AppUpdater` | Pass | Pass | Pass | Pass | Runtime updater cannot bypass signing/recovery boundary. |
| API/E2E validation | Pass | Pass | Pass | Pass | May push/dispatch `publish_release=false`; cannot publish artifacts. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MacSigningPolicy` | Pass | Pass | Pass | Pass | Centralizes entitlement allowance decisions for signer and verifier. |
| `MacSignAdapter` | Pass | Pass | Pass | Pass | Build config uses adapter instead of mixing policy into `build.ts`/`afterPack.ts`. |
| `MacSigningVerifier` CLI | Pass | Pass | Pass | Pass | CI calls CLI; no YAML-coded path allowlist. |
| `AppUpdater` | Pass | Pass | Pass | Pass | Runtime remains outside signing authority. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `macSignAutoByteusApp(signOptions, packager)` | Pass | Pass | Pass | Low | Pass |
| `classifyMacSigningSubject(appRoot, subjectPath)` | Pass | Pass | Pass | Low | Pass |
| `signSubject(subject, signingContext)` | Pass | Pass | Pass | Low | Pass |
| `verifyMacSigningPolicy({ app })` / CLI `--app` | Pass | Pass | Pass | Low | Pass |
| GitHub workflow dispatch | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts` signing files | Pass | Pass | Low | Pass | Build-time signing domain-control is already compiled by build tsconfig. |
| `autobyteus-web/build` entitlement plist files | Pass | Pass | Low | Pass | Existing build-resource location is appropriate. |
| `autobyteus-web/scripts/verify-macos-signing-policy.mjs` | Pass | Pass | Low | Pass | Matches existing executable verification-script placement. |
| Root `.github/workflows/release-desktop.yml` | Pass | Pass | Medium | Pass | Medium only because workflow spans all platforms; design restricts edits to macOS verifier gate/manual validation. |
| Ticket artifact folder | Pass | Pass | Low | Pass | Correctly avoids workflow-state/downstream artifacts. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mac build wiring | Pass | Pass | N/A | Pass | Extend `build.ts` as config handoff only. |
| Pre-sign resource normalization | Pass | Pass | N/A | Pass | Reuse `afterPack.ts` with reduced responsibility. |
| Mac signing policy | Pass | Pass | Pass | Pass | No existing owner enforces role-based entitlement policy. |
| Release verification | Pass | Pass | Pass | Pass | Existing metadata/runtime scripts do not inspect code-signing entitlements. |
| Updater runtime | Pass | Pass | N/A | Pass | Reuse unchanged; source app signing is build-owned. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Child app-entitlement inheritance | No | Pass | Pass | Broad inheritance is removed, not wrapped. |
| Server native signing in `afterPack.ts` | No | Pass | Pass | Duplicate signing policy is removed. |
| Squirrel-only repair | No | Pass | Pass | Explicitly rejected as incomplete. |
| Already-installed broken source apps | No coded compatibility path | Pass | Pass | Manual fixed-DMG recovery is the right operational boundary. |
| API/E2E release validation | No publish path | Pass | Pass | `publish_release=false` is explicitly required. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Policy and fixture introduction | Pass | Pass | Pass | Pass |
| Helper entitlement profile split | Pass | Pass | Pass | Pass |
| Custom signing adapter and command wrapper | Pass | Pass | Pass | Pass |
| `build.ts` / `afterPack.ts` cleanup | Pass | Pass | Pass | Pass |
| Verifier and workflow gate | Pass | Pass | Pass | Pass |
| API/E2E manual workflow validation | Pass | Pass | Pass | Pass |
| Delivery recovery documentation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Entitlement profile by role | Yes | Pass | Pass | Pass | Good and bad examples directly address the root bug. |
| Signing order | Yes | Pass | Pass | Pass | Makes pre-notarization/deepest-first requirement explicit. |
| Verifier policy | Yes | Pass | Pass | Pass | Prevents Squirrel-only tunnel vision. |
| API/E2E GitHub validation | Yes | Pass | Pass | Pass | Explicitly avoids accidental publishing. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact helper entitlement key set | Over-narrowing could break renderer/GPU/plugin runtime; over-broad helper profiles could keep unnecessary permissions. | Implementation should start from Electron/@electron/osx-sign role patterns, justify any app-only key on helpers, and validate packaged smoke checks. | Residual risk, not a design blocker. |
| Verifier normalization for bundle path vs main executable path | `codesign -d` can be run against bundles or Mach-O executables; the allowlist must remain role-based and not accidentally widen. | Implementation should normalize signed subjects so only root app/helper app main executables or their owning app-bundle signing subjects can carry entitlement keys. | Residual risk, not a design blocker. |
| Custom signing adapter parity with electron-builder/@electron/osx-sign behavior | Replacing default signing can lose timestamp/keychain/strict-verify behavior if implemented carelessly. | Implementation must preserve identity, keychain, timestamp, hardened runtime, requirements/provisioning inputs if present, and run strict structural verification. | Residual risk, not a design blocker. |
| Full release proof requires Apple signing/notarization secrets | Local implementation may not be able to prove signed/notarized artifact behavior. | API/E2E must run or record a concrete blocker for GitHub `Desktop Release` workflow dispatch with `publish_release=false`. | Accepted requirement constraint. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

No blocking classification. The design does not require upstream rework.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The implementation must not re-create a divergent path allowlist in the signer, verifier, or workflow; all entitlement allowance must remain policy-owned.
- The custom signing adapter must preserve electron-builder signing inputs and run before electron-builder notarization; an `afterSign` repair or post-notarization mutation would violate the approved design.
- Helper entitlement narrowing needs real packaged app validation, especially renderer/GPU/plugin behavior on Apple Silicon.
- The verifier may reveal additional entitlement-bearing non-app Mach-O paths; those should be fixed under the same policy rather than casually allowlisted.
- Already-published broken artifacts and installed source apps still require operational recovery guidance; this code change should not try to self-repair them through the blocked updater path.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design is spine-led, ownership-led, and concrete enough for implementation. It addresses the underlying macOS signing invariant, signing order, verifier ownership, helper least privilege, CI validation, and manual non-publishing API/E2E workflow validation. Proceed to implementation.
