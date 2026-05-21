# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/design-spec.md`
- Current Review Round: 2
- Trigger: Solution-designer addendum after user clarified that stale run-history/mobile status/timestamp assumptions must be removed and delivered Android/mobile artifacts must reflect the corrected source state.
- Prior Review Round Reviewed: Round 1 (`Pass`, no findings)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read updated requirements, investigation notes, design spec, prior review report, current source type/query shapes (`TeamRunHistoryItem`, `ListWorkspaceRunHistory`, `MobileWorkContext`), and the original ADB evidence summaries. Existing implementation files are already in progress in the task worktree, but this review is limited to the design addendum.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review | N/A | 0 | Pass | No | Design was concrete, evidence-backed, and ready for implementation. |
| 2 | User clarification addendum for clean removal and build freshness | No unresolved findings existed; pass decision rechecked against updated requirements/design | 0 | Pass | Yes | Addendum strengthens the same design: remove stale run-history assumptions and validate rebuilt APK plus rebuilt desktop-served `/mobile` assets. |

## Reviewed Design Spec

The updated design still targets the same two reported Android mobile failures:

1. Android **Scan QR** depends on an external ZXing-compatible intent in `AndroidExternalActions`, but the connected Xiaomi device does not resolve `com.google.zxing.client.android.SCAN` and the app has no `CAMERA` permission. The design moves QR scan lifecycle into app-owned `QrScanCoordinator` and keeps decoded text flowing through `ConnectionInputResolver` / `PairingLinkParser`.
2. Android saved-node open reaches desktop-served `/mobile`, where `useMobileWorkCatalog.ts` maps team runs from stale fields `lastActivityAt` / `lastKnownStatus` even though current run-history query/type expose `createdAt` / `status`. The design fixes catalog projection to the current contract and adds query-shaped regression coverage.
3. Round 2 addendum adds an artifact freshness requirement: the delivered/tested Android APK must include scanner changes, and the desktop-served `/mobile` bundle loaded by Android WebView must be rebuilt/repackaged from corrected web source. Release metadata (`versionCode` / `versionName`) must be bumped or explicitly justified if a release artifact is produced.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design explicitly classifies the task as Bug Fix / Behavior Change. Addendum does not alter posture. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Android QR is Boundary / Ownership Issue plus File Responsibility Drift if left in external actions; web crash is Local Implementation Defect from stale DTO field assumptions. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Narrow Android refactor is required now; broad GraphQL/generated-type cleanup remains deferred unless gates require it. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File map, dependency rules, removal plan, and migration sequence reflect `QrScanCoordinator`; web fix remains local to catalog owner; addendum adds build/package freshness evidence. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | N/A | Round 1 had no findings. | No unresolved findings to recheck. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Android QR scan to parsed WebView open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Saved-node app launch to mobile catalog render | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Permission / scanner result return path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Team-run DTO to sorted mobile list | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Android native setup shell | Pass | Pass | Pass | Pass | Extending with `QrScanCoordinator` is justified; `AndroidExternalActions` should not own camera scanning. |
| Android connection policy | Pass | Pass | Pass | Pass | Reuses parser/resolver for scanned, pasted, shared, and manual text. |
| Android WebView containment | Pass | Pass | Pass | Pass | Correctly unchanged; Android still loads desktop-served `/mobile`. |
| Web mobile catalog | Pass | Pass | Pass | Pass | Existing projection owner should map current `createdAt` / `status` fields and avoid stale team-run assumptions. |
| Web/mobile build and validation freshness | Pass | Pass | Pass | Pass | Addendum correctly recognizes that Android WebView will keep seeing the bug unless the desktop-served `/mobile` assets are rebuilt/repackaged/reloaded from corrected source. |
| Release metadata decision | Pass | Pass | Pass | Pass | Correctly conditional: bump version metadata when producing a release artifact, or record no-release rationale for debug validation. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| QR request/permission constants | Pass | Pass | Pass | Pass | Keeping constants inside scanner owner avoids generic request-code sprawl. |
| Activity-time sort normalization | Pass | Pass | Pass | Pass | Local helper inside `useMobileWorkCatalog` is enough; do not add a broad old/new compatibility adapter. |
| QR decoded text | Pass | N/A | Pass | Pass | Raw decoded text remains the shared contract into existing resolver. |
| Build freshness evidence | Pass | N/A | Pass | Pass | Evidence belongs in implementation/validation/delivery handoff artifacts rather than a reusable code structure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MobileWorkContext.lastActivityAt` | Pass | Pass | Pass | N/A | Pass | This remains the mobile catalog context sort/display timestamp; it is populated from the current run-history `createdAt`, not preserved as a run-history field assumption. |
| `TeamRunHistoryItem` | Pass | Pass | Pass | N/A | Pass | Design removes stale `lastActivityAt` / `lastKnownStatus` assumptions and uses current `createdAt` / `status`. |
| Android QR result text | Pass | Pass | Pass | N/A | Pass | Single meaning: decoded input payload/link text. |
| Android release metadata | Pass | Pass | Pass | N/A | Pass | Version metadata decision is explicit and conditional on release artifact production. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AndroidExternalActions.startQrScan()` external intent | Pass | Pass | Pass | Pass | Must be removed or no longer expose QR behavior from external-actions owner. |
| Manifest ZXing scan `<queries>` entry | Pass | Pass | Pass | Pass | Remove unless concrete dependency behavior requires otherwise. |
| Stale mobile team-run mocks using old fields | Pass | Pass | Pass | Pass | Update to query-shaped `createdAt` / `status` data. |
| Stale delivered `/mobile` bundle | Pass | Pass | Pass | Pass | Addendum explicitly requires rebuilt/repackaged desktop-served mobile assets before Android validation/delivery evidence. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/QrScanCoordinator.kt` | Pass | Pass | Pass | Pass | Owns camera permission, scanner launch, and result/cancel diagnostics only. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt` | Pass | Pass | N/A | Pass | Becomes Tailscale/browser external actions only. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Pass | Pass | N/A | Pass | Remains Android lifecycle/orchestration boundary and delegates scanner internals. |
| `autobyteus-android/app/src/main/AndroidManifest.xml` | Pass | Pass | N/A | Pass | Adds camera permission and removes obsolete query. |
| `autobyteus-android/app/build.gradle.kts` | Pass | Pass | N/A | Pass | Dependency declaration and version metadata decision live here. |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Pass | Pass | Pass | Pass | Correct owner for catalog projection and sort safety. |
| `autobyteus-web/composables/mobile/__tests__/useMobileWorkCatalog.spec.ts` | Pass | Pass | N/A | Pass | Focused query-shaped regression near composable. |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` | Pass | Pass | N/A | Pass | Existing higher-level stale mock cleanup if needed. |
| Mobile web build/package command or release pipeline | Pass | Pass | N/A | Pass | Not a new runtime owner; it is validation/delivery evidence that corrected source reached the served `/mobile` bundle. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MainActivity` | Pass | Pass | Pass | Pass | May wire coordinator/resolver/validator/WebView, but not own scanner internals. |
| `QrScanCoordinator` | Pass | Pass | Pass | Pass | Must not parse pairing payloads, persist nodes, or know web catalog fields. |
| `ConnectionInputResolver` | Pass | Pass | Pass | Pass | Stays independent of scanner library. |
| `AndroidExternalActions` | Pass | Pass | Pass | Pass | Must not depend on camera/scanner APIs after change. |
| `useMobileWorkCatalog` | Pass | Pass | Pass | Pass | UI components consume normalized catalog items rather than compensating for raw DTO field mismatches. |
| Build/repackage validation | Pass | Pass | Pass | Pass | Corrected web source must flow into served assets; Android must not duplicate `/mobile` behavior natively. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `QrScanCoordinator` | Pass | Pass | Pass | Pass | Exposes start/result/permission handling; scanner dependency remains internal. |
| `ConnectionInputResolver` | Pass | Pass | Pass | Pass | QR scan emits raw text into existing resolver, avoiding parser duplication. |
| `useMobileWorkCatalog` | Pass | Pass | Pass | Pass | Normalizes current run-history data before mobile components. |
| `AndroidExternalActions` | Pass | Pass | Pass | Pass | External app/browser actions remain separate from in-app scan lifecycle. |
| Desktop-served `/mobile` bundle | Pass | Pass | Pass | Pass | Android WebView remains a consumer; corrected web assets must be served by desktop node/package. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `QrScanCoordinator.startQrScan()` | Pass | Pass | Pass | Low | Pass |
| `QrScanCoordinator.handleActivityResult(requestCode, resultCode, data)` | Pass | Pass | Pass | Low | Pass |
| `QrScanCoordinator.handleRequestPermissionsResult(requestCode, permissions, grantResults)` | Pass | Pass | Pass | Low | Pass |
| `ConnectionInputResolver.resolve(rawText, httpAcknowledged)` | Pass | Pass | Pass | Low | Pass |
| `ListWorkspaceRunHistory` / `TeamRunHistoryItem` | Pass | Pass | Pass | Low | Pass |
| `useMobileWorkCatalog().recentWorkItems` | Pass | Pass | Pass | Low | Pass |
| Mobile web build/package or restart command | Pass | Pass | Pass | Low | Pass |
| Android release metadata decision | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/.../shell` | Pass | Pass | Low | Pass | Appropriate for native setup orchestration and scanner coordinator. |
| `autobyteus-android/.../connection` | Pass | Pass | Low | Pass | Existing parser/validator remains stable. |
| `autobyteus-android/.../web` / `ui` | Pass | Pass | Low | Pass | No scanner behavior introduced. |
| `autobyteus-web/composables/mobile` | Pass | Pass | Low | Pass | Correct location for catalog projection. |
| `autobyteus-web/components/mobile/__tests__` | Pass | Pass | Low | Pass | Higher-level regression tests can be updated without moving production logic. |
| Desktop package/build output serving `/mobile` | Pass | Pass | Low | Pass | Addendum correctly treats this as packaging/validation freshness, not Android product duplication. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| QR decode to text | Pass | Pass | Pass | Pass | New coordinator is justified because existing external-actions owner is wrong for app camera scanning. |
| Pairing/link/manual parsing | Pass | Pass | N/A | Pass | Existing resolver/parser remains authoritative. |
| Tailscale/browser launch | Pass | Pass | N/A | Pass | Existing external actions retained. |
| Saved-node validation/open | Pass | Pass | N/A | Pass | Existing native saved-node spine is not the crash source. |
| Recent-work projection | Pass | Pass | N/A | Pass | Existing composable owner gets local fix. |
| Desktop-served mobile asset delivery | Pass | Pass | N/A | Pass | Existing build/package/desktop node serving path should be used; no new Android-side mobile UI. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| External ZXing scan intent | No steady-state retention in design | Pass | Pass | Old path rejected; failure becomes app-owned diagnostic, not fallback lookup. |
| Team-run old fields | No steady-state retention in design | Pass | Pass | Uses current `createdAt` / `status`; does not introduce `lastActivityAt` / `lastKnownStatus` compatibility for run-history list data. |
| Native duplicate pairing protocol | No | Pass | Pass | QR text uses existing resolver and WebView path. |
| Stale deployed `/mobile` assets | No acceptable stale retention in design | Pass | Pass | Addendum requires rebuilt/repackaged corrected bundle before claiming Android saved-node validation. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Android scanner dependency/manifest/coordinator | Pass | Pass | Pass | Pass |
| MainActivity callback routing | Pass | Pass | Pass | Pass |
| Android tests and ADB validation | Pass | Pass | Pass | Pass |
| Web catalog mapping and tests | Pass | Pass | Pass | Pass |
| Mobile web asset rebuild/repackage and desktop reload | Pass | Pass | Pass | Pass |
| Release metadata bump/no-bump rationale | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| QR scanner ownership | Yes | Pass | Pass | Pass | Good and bad shape make the boundary decision clear. |
| Team-run timestamp mapping | Yes | Pass | Pass | Pass | Example directly addresses `undefined.localeCompare`. |
| Scanner failure handling | Yes | Pass | Pass | Pass | Correctly rejects legacy external scanner fallback. |
| Corrected bundle delivery | Yes | Pass | N/A | Pass | Migration sequence names build/repackage/reload before Android validation. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Scanner dependency manifest/activity details under targetSdk 35 | Dependency may require minor activity/manifest configuration. | Implementation may adjust inside `QrScanCoordinator` boundary and record rationale if deviating from suggested dependency. | Residual implementation risk; not design-blocking. |
| Full live camera scan with visible QR | ADB can validate launch and saved-node open; scan success requires physical QR availability. | API/E2E should capture full scan evidence if practical, otherwise record limitation explicitly. | Residual validation risk; not design-blocking. |
| Generated GraphQL type staleness | Existing generated assumptions could surface during build/test. | Only handle if implementation checks require it; avoid broad schema cleanup by default. | Deferred risk; not design-blocking. |
| Exact mobile web package/restart command | Local debug validation and release packaging may use different commands. | Handoff must record the actual build/repackage/restart path used so reviewers know Android loaded corrected `/mobile` assets. | Residual process risk; not design-blocking. |

## Review Decision

Pass: the updated design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Bundled scanner dependency may require minor manifest/activity tuning; keep all such changes behind `QrScanCoordinator` and do not reintroduce external scanner fallback.
- Full camera scan validation depends on QR availability on a physical device; saved-node `/mobile` Error 500 validation must use a rebuilt/repackaged corrected `/mobile` bundle served by the desktop node.
- Web sort guard should be defensive without becoming an old/new DTO compatibility wrapper; remove stale `lastActivityAt` / `lastKnownStatus` assumptions from run-history team-run list data.
- If producing release artifacts, version metadata must be bumped or the no-bump rationale must be explicit in downstream evidence.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed with implementation in `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error`. Round 2 adds no new design findings. Implementation handoff should now also include evidence that the Android APK was rebuilt/installed from corrected source and that the desktop-served `/mobile` bundle was rebuilt/repackaged/reloaded from corrected web source before Android saved-node validation. Release `versionCode` / `versionName` should be bumped when producing a release artifact, or a no-release-version rationale should be recorded.
