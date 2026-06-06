# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/design-spec.md`
- Additional Context: implementation handoff `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-handoff.md`; code review report `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/code-review-report.md`
- Current Review Round: 5
- Trigger: Resubmission after code-review round-4 Design Impact findings `CVR-003`, `CVR-004`, and `CVR-005` against DS-IOS-009 release metadata and bundle-ID authority.
- Prior Review Round Reviewed: 4
- Latest Authoritative Round: 5
- Current-State Evidence Basis: Updated requirements, investigation notes, and design spec; code-review round-4 findings; current implementation evidence cited by code review (`release-ios.yml`, `project.yml`, `verify-appstore-profile.py`); official Apple documentation/search-result excerpts for `CFBundleShortVersionString` and `CFBundleVersion` constraints from Apple Developer pages; existing target-specific release workflow pattern from Android/desktop workflows.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | No | Pass | No | Superseded by later evidence/scope updates. |
| 2 | Corrected Xcode provisioning evidence | No prior findings from round 1 | No blocking findings | Pass | No | Superseded by expanded CI/TestFlight scope. |
| 3 | Expanded iOS GitHub Actions/App Store Connect upload scope | No unresolved prior findings | Yes: AR-IOS-REL-001, AR-IOS-REL-002, AR-IOS-REL-003 | Fail | No | Superseded by round-4 revised design. |
| 4 | Resubmission addressing release-automation findings | AR-IOS-REL-001/002/003 rechecked | No blocking findings | Pass | No | Superseded by code-review Design Impact feedback on DS-IOS-009. |
| 5 | Resubmission addressing code-review DS-IOS-009 findings | CVR-003/004/005 rechecked | No blocking findings | Pass | Yes | DS-IOS-009 now separates release/artifact/prerelease metadata from iOS bundle versions and makes bundle IDs single-authority. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/design-spec.md` after the code-review-driven DS-IOS-009 revision. The native iOS wrapper shape remains healthy, and the release workflow contract is now specific enough for implementation rework before API/E2E resumes.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design now states the runtime wrapper has no design issue, while DS-IOS-009 had a limited release metadata/bundle-ID authority issue found by code review. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Requirements and design classify runtime as healthy and DS-IOS-009 as a `Boundary Or Ownership Issue`, backed by code-review evidence that version metadata and bundle IDs had split authority. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design calls for targeted rework of `.github/workflows/release-ios.yml`, `autobyteus-ios/project.yml`, release metadata checks, docs, and tests; no Android/backend/mobile-web refactor. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-IOS-009 contract, boundary map, shared-structure tightness, examples, migration sequence, risks, and implementation guidance now describe the required release rework. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 3 | AR-IOS-REL-001 | High | Resolved | Round 4 resolved the stale guarded-upload contradiction; still resolved in round 5. | No regression. |
| 3 | AR-IOS-REL-002 | High | Resolved | DS-IOS-009 still defines exact iOS/App Store Connect secrets, trigger/input contract, profile/export/upload handling, and forbidden shortcuts. | Round 5 tightens version/bundle sub-contracts. |
| 3 | AR-IOS-REL-003 | Medium | Resolved | Artifacts still consistently separate local development signing from CI distribution/App Store Connect readiness. | No regression. |
| Code review round 4 | CVR-003 | Design Impact | Resolved at design level | DS-IOS-009 now derives `ios_marketing_version=MAJOR.MINOR.PATCH`, keeps `artifact_version` with prerelease suffix, keeps `prerelease_label` for notes, and uses numeric-only `build_number`; forbidden shortcuts reject prerelease suffixes in `MARKETING_VERSION` / `CFBundleShortVersionString`. | Implementation still needs rework. |
| Code review round 4 | CVR-004 | Design Impact | Resolved at design level | DS-IOS-009 now makes `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` the single app/share bundle-ID authority, and requires `project.yml` target `PRODUCT_BUNDLE_IDENTIFIER` values, profile verification, export mapping, build/test/smoke/archive, summaries, and docs to consume the same values. | Implementation still needs rework. |
| Code review round 4 | CVR-005 | Local Fix after design clarification | Resolved at design level | DS-IOS-009 now requires build-only simulator build/test/smoke to pass the same bundle IDs, `MARKETING_VERSION=${ios_marketing_version}`, and `CURRENT_PROJECT_VERSION=${build_number}` used by archive. | Implementation still needs rework. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-IOS-001 | Setup/input to WebView or diagnostic | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-IOS-002 | WebView navigation containment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-IOS-003 | QR scan to resolver/diagnostic | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-IOS-004 | Simulator E2E/signing readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-IOS-005 | Status validation return path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-IOS-006 | WebView failure return path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-IOS-007 | Share extension pending input | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-IOS-008 | QR capture loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-IOS-009 | GitHub iOS release build/publish | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| iOS Core Wrapper Policy | Pass | Pass | Pass | Pass | Runtime core boundary unchanged and sound. |
| iOS App Shell | Pass | Pass | Pass | Pass | Runtime app sequencing remains independent from release automation. |
| iOS Web Containment | Pass | Pass | Pass | Pass | WebKit policy remains sound. |
| iOS QR Scanner | Pass | Pass | Pass | Pass | QR/camera ownership remains sound. |
| iOS Share Intake | Pass | Pass | Pass | Pass | Extension handoff remains isolated; release profile handling is now explicit. |
| iOS Validation Tooling | Pass | Pass | Pass | Pass | Local readiness scripts inspect/report and do not upload. |
| iOS Release Automation | Pass | Pass | Pass | Pass | DS-IOS-009 now owns release metadata fields, bundle-ID build settings, build-only metadata, secret gates, archive/export/upload. |
| Existing Mobile Web Shell | Pass | Pass | Pass | Pass | Product UI/credential owner remains reused external shell. |
| Existing Backend Remote Access | Pass | Pass | Pass | Pass | Native iOS still calls public status only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Saved node metadata | Pass | Pass | Pass | Pass | No credential fields. |
| Normalized URL parts | Pass | Pass | Pass | Pass | Deterministic URL policy owner remains clear. |
| Pairing payload/input | Pass | Pass | Pass | Pass | Parser remains separate from backend credential exchange. |
| Failure kinds/diagnostics | Pass | Pass | Pass | Pass | Shared diagnostics remain tight. |
| Navigation decision | Pass | Pass | Pass | Pass | WebKit-independent navigation policy remains tight. |
| Pending shared input | Pass | Pass | Pass | Pass | Consume-once app/extension handoff remains tight. |
| DS-IOS-009 release metadata | Pass | Pass | Pass | Pass | `ios_marketing_version`, `artifact_version`, `prerelease_label`, and `build_number` have distinct meanings and consumers. |
| DS-IOS-009 app/share bundle IDs | Pass | Pass | Pass | Pass | `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` are the single source for target IDs, profile checks, export map, build/test/smoke/archive, and summaries. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SavedNodeProfile` | Pass | Pass | Pass | Pass | Pass | Native metadata only. |
| `NormalizedNodeURL` | Pass | Pass | Pass | Pass | Pass | Derived base/mobile/status URLs only. |
| `PairingPayload` / `ParsedPairingInput` | Pass | Pass | Pass | Pass | Pass | Pairing parse result only. |
| `ConnectionDiagnostic` | Pass | Pass | Pass | Pass | Pass | Failure/recovery copy only. |
| `NavigationDecision` | Pass | Pass | Pass | Pass | Pass | Pure allow/external/block decision. |
| `PendingSharedInput` | Pass | Pass | Pass | Pass | Pass | Raw pending input; consume once. |
| DS-IOS-009 release metadata fields | Pass | Pass | Pass | Pass | Pass | Ambiguous `version_name` is explicitly rejected; App Store-compatible and human/artifact metadata are separated. |
| DS-IOS-009 bundle-ID settings | Pass | Pass | Pass | Pass | Pass | Parallel hard-coded target ID vs workflow variable representation is explicitly rejected. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| No pre-task iOS legacy path | Pass | N/A | Pass | Pass | Addition-only baseline. |
| Native iOS credential bridge | Pass | Pass | Pass | Pass | Rejected in favor of `/mobile` credential ownership. |
| Local iOS AutoByteus runtime | Pass | Pass | Pass | Pass | Rejected; remote node plus `/mobile` remains model. |
| Generic unrestricted browser behavior | Pass | Pass | Pass | Pass | Rejected in favor of `TrustedNavigationPolicy`. |
| Unguarded App Store public release / unconditional upload | Pass | Pass | Pass | Pass | Rejected while guarded upload remains in scope. |
| Prerelease suffix in iOS bundle short version | Pass | Pass | Pass | Pass | Rejected; use `artifact_version`/notes for suffix and numeric `ios_marketing_version` for bundle version. |
| Dual bundle-ID authority | Pass | Pass | Pass | Pass | Rejected; use `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` as single authority. |
| Unsupported share-extension launch hack | Pass | Pass | Pass | Pass | Rejected in favor of pending-input handoff. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ios/project.yml` | Pass | Pass | Pass | Pass | XcodeGen source must define default bundle-ID build settings and target identifiers from those settings. |
| `.github/workflows/release-ios.yml` | Pass | Pass | Pass | Pass | Workflow owns metadata resolver, bundle settings, build-only, secret gate, archive/export/upload, artifacts, and checks. |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh` | Pass | Pass | N/A | Pass | Smoke path must accept/forward release bundle/version settings or fail clearly. |
| `autobyteus-ios/scripts/verify-appstore-profile.py` | Pass | Pass | N/A | Pass | Profile verifier consumes the same bundle-ID authority. |
| `autobyteus-ios/README.md` / `docs/ios_mobile_access.md` | Pass | Pass | N/A | Pass | Docs must reflect corrected release metadata and bundle-ID authority. |
| Runtime app/core/share/test files | Pass | Pass | Pass | Pass | Runtime wrapper file responsibilities remain sound. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime iOS core/app/WebView/QR/share boundaries | Pass | Pass | Pass | Pass | No regression. |
| Validation scripts | Pass | Pass | Pass | Pass | Local evidence only; no upload or portal mutation. |
| iOS Release Workflow | Pass | Pass | Pass | Pass | Now explicitly forbids prerelease suffixes in `MARKETING_VERSION`, hard-coded target IDs diverging from workflow settings, local Xcode-session assumptions, desktop `APPLE_*`/Developer ID reuse, development-profile App Store archives, and skipped extension profiles. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConnectionInputResolver` | Pass | Pass | Pass | Pass | Runtime input authority unchanged. |
| `ConnectionValidator` | Pass | Pass | Pass | Pass | Status validation authority unchanged. |
| `SavedNodeStore` | Pass | Pass | Pass | Pass | Profile storage authority unchanged. |
| `TrustedNavigationPolicy` | Pass | Pass | Pass | Pass | Navigation policy authority unchanged. |
| `QRCodeScannerViewController` | Pass | Pass | Pass | Pass | Scanner lifecycle authority unchanged. |
| `PendingSharedInputStore` | Pass | Pass | Pass | Pass | Pending share authority unchanged. |
| `/mobile` Web Shell | Pass | Pass | Pass | Pass | Product UI/credential authority unchanged. |
| iOS Release Workflow | Pass | Pass | Pass | Pass | Release metadata resolver and bundle-ID settings are now authoritative and consumed by build-only, smoke, archive, profile verification, export map, summaries, and docs. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `NodeURLNormalizer.normalize(_:)` | Pass | Pass | Pass | Low | Pass |
| `PairingLinkParser.parse(_:)` | Pass | Pass | Pass | Low | Pass |
| `ConnectionInputResolver.resolve(rawText:httpAcknowledged:)` | Pass | Pass | Pass | Low | Pass |
| `ConnectionValidator.validate(profile:)` | Pass | Pass | Pass | Low | Pass |
| `SavedNodeStore.load/save/select/remove/clear` | Pass | Pass | Pass | Low | Pass |
| `TrustedNavigationPolicy.classify(targetURL:profile:)` | Pass | Pass | Pass | Low | Pass |
| `PendingSharedInputStore.store/consume` | Pass | Pass | Pass | Medium | Pass |
| `ios-simulator-smoke.sh` release settings | Pass | Pass | Pass | Low | Pass |
| `verify-appstore-profile.py` bundle-ID/profile check | Pass | Pass | Pass | Low | Pass |
| `.github/workflows/release-ios.yml` metadata/bundle/settings contract | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ios/` | Pass | Pass | Low | Pass | Sibling native platform root. |
| `autobyteus-ios/AutoByteusMobileCore/` | Pass | Pass | Low | Pass | Core policy owner. |
| `autobyteus-ios/AutoByteusMobile/` | Pass | Pass | Medium | Pass | Platform app target with file-level boundaries. |
| `autobyteus-ios/AutoByteusMobileShareExtension/` | Pass | Pass | Low | Pass | Share intake target. |
| `autobyteus-ios/scripts/` | Pass | Pass | Low | Pass | Validation/build/signing/profile helpers. |
| `.github/workflows/release-ios.yml` | Pass | Pass | Medium | Pass | Correct release automation placement. |
| `docs/ios_mobile_access.md` | Pass | Pass | Low | Pass | Durable docs peer to Android mobile guide. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native wrapper parity | Pass | Pass | Pass | Pass | Android remains behavior reference. |
| Product mobile UI | Pass | Pass | N/A | Pass | Existing `/mobile` shell reused. |
| Phone Access status/pairing | Pass | Pass | N/A | Pass | Existing backend routes reused. |
| URL/pairing/navigation policy | Pass | Pass | Pass | Pass | Swift policy plus mirrored tests remains acceptable. |
| Release workflow shape | Pass | Pass | Pass | Pass | Existing Android/desktop target-specific workflow pattern supports a sibling iOS release owner. |
| Apple bundle-version constraints | Pass | Pass | Pass | Pass | Official Apple docs/glossary support numeric version split reflected in DS-IOS-009. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Existing iOS code baseline | No | Pass | Pass | Rework should not add compatibility wrappers. |
| Ambiguous release `version_name` | Yes in current implementation evidence | Pass | Pass | Design rejects it and requires separate fields. |
| Dual bundle-ID authority | Yes in current implementation evidence | Pass | Pass | Design rejects it and requires a single build-setting authority. |
| Desktop Apple signing fallback | No steady-state | Pass | Pass | Explicitly rejected. |
| Unguarded App Store public release | No steady-state | Pass | Pass | Explicitly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Preserve runtime iOS wrapper | Pass | Pass | Pass | Pass |
| Rework release metadata resolver | Pass | Pass | Pass | Pass |
| Rework `project.yml` bundle-ID settings | Pass | Pass | Pass | Pass |
| Pass bundle/version settings to build-only tests/smoke/archive | Pass | Pass | Pass | Pass |
| Add static/executable checks for prerelease and custom bundle IDs | Pass | Pass | Pass | Pass |
| Update release docs/evidence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Prerelease tag versioning | Yes | Pass | Pass | Pass | `v1.2.7-rc1` example cleanly splits `ios_marketing_version`, `artifact_version`, `prerelease_label`, and build number. |
| Bundle-ID authority | Yes | Pass | Pass | Pass | Custom app/share IDs example proves target IDs/profile/export/summaries share one authority. |
| Build-only release evidence | Yes | Pass | Pass | Pass | Example clarifies build-only artifacts carry resolved version/build metadata even without publish secrets. |
| Signing readiness / CI distribution readiness | Yes | Pass | Pass | Pass | Design distinguishes local development signing from distribution upload readiness. |
| Runtime connection/navigation/share examples | Yes | Pass | Pass | Pass | Prior app-runtime examples remain adequate. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Physical iPhone QR proof | Simulator cannot prove real camera capture. | API/E2E or release-readiness must record physical-device evidence before production-release claims. | Residual risk; no design rework required. |
| WKWebView file input/live attachment proof | Simulator may not prove every picker/photo-library/device path. | API/E2E must validate where feasible or record physical-device/live-node evidence gap. | Residual risk; no design rework required. |
| App Store Guideline 4.2 / ATS review risk | WebView wrapper and private HTTP may be scrutinized. | Docs/review notes and native utility evidence remain required. | Residual risk; no design rework required. |
| GitHub iOS publishing secrets absent | CI publish cannot rely on local Xcode login or desktop Apple secrets. | Build-only passes; publish fails at exact secret gate until configured. | Covered by design. |
| Code implementation still needs rework | Current code-review report found concrete workflow/project gaps. | Implementation engineer must update workflow/project/scripts/docs/tests before API/E2E resumes. | Expected next step. |

## Review Decision

- `Pass`: the revised DS-IOS-009 design is ready for implementation rework.

## Findings

None.

## Classification

N/A. No blocking architecture findings remain.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Current implementation files may still contain the code-review round-4 defects until implementation rework lands; this pass is for the revised design.
- App Store/TestFlight publish will intentionally fail unless exact iOS distribution/App Store Connect secrets and matching app/share profiles are configured.
- Apple review/listing/privacy/public-release work, physical-device QR, and complete file-upload proof remain outside simulator-first implementation readiness.
- `altool` private-key discovery and upload behavior should still be validated on the actual GitHub macOS runner.

## External Sources Consulted

- Apple Developer Documentation: `CFBundleShortVersionString` — https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring
- Apple Developer Documentation: `CFBundleVersion` — https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion
- Apple Developer glossary for version number/build string search excerpts — https://developer.apple.com/help/glossary/version-number/ and https://developer.apple.com/help/glossary/

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 5 accepts the code-review-driven DS-IOS-009 revisions. The design now makes iOS release metadata and app/share bundle IDs authoritative, Apple-compatible, and consistently consumed by build-only, smoke, archive, profile verification, export, summaries, and docs. Route to implementation for rework before API/E2E resumes.
